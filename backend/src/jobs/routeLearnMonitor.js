// backend/src/jobs/routeLearnMonitor.js
// ✅ M19: Learn route polyline from completed shifts (OSRM match -> canonical polyline)

import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { computeRouteKey, stringifyPolyline, median, pickCanonicalSample, downsamplePoints } from "../services/routeLearning.js";
import { osrmMatch } from "../services/osrmMatch.js";

function hubFrom({ shift, agreement, room }) {
  const lat =
    typeof shift?.hubLat === "number" ? shift.hubLat :
    typeof agreement?.hubLat === "number" ? agreement.hubLat :
    typeof room?.hubLat === "number" ? room.hubLat :
    null;
  const lng =
    typeof shift?.hubLng === "number" ? shift.hubLng :
    typeof agreement?.hubLng === "number" ? agreement.hubLng :
    typeof room?.hubLng === "number" ? room.hubLng :
    null;

  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  return null;
}

/**
 * @param {import('socket.io').Server} io
 * @param {{ intervalMs?: number, maxPerTick?: number }} opts
 */
export function startRouteLearnMonitor(_io, opts = {}) {
  const intervalMs = Number(opts.intervalMs || ENV.ROUTE_LEARN_INTERVAL_MS || 30000);
  const maxPerTick = Number(opts.maxPerTick || 10);

  const osrmBase = String(ENV.OSRM_URL || "").trim();
  const enabled = Boolean(ENV.ROUTE_LEARN_ENABLED && osrmBase);
  if (!enabled) {
    // disabled => no-op
    return () => {};
  }

  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;

    try {
      // Find recently completed shifts without a learn sample yet
      const shifts = await prisma.shift.findMany({
        where: {
          status: "DONE",
          vehicleId: { not: null },
          progress: { isNot: null },
          routeLearnSample: { is: null },
        },
        include: {
          progress: true,
          stops: { orderBy: { order: "asc" } },
          room: true,
          agreement: true,
        },
        orderBy: { id: "desc" },
        take: maxPerTick,
      });

      for (const s of shifts) {
        const completedAt = s.progress?.completedAt ?? s.endAt;
        if (!completedAt) continue;

        const hub = hubFrom({ shift: s, agreement: s.agreement, room: s.room });
        const direction = String(s.direction || s.agreement?.direction || "INBOUND");
        const pattern = String(s.pattern || s.agreement?.pattern || "ONE_WAY");

        const routeKey = computeRouteKey({
          direction,
          pattern,
          hub,
          stops: (s.stops || []).map((x) => ({ lat: x.lat, lng: x.lng })),
        });

        // GPS points for this shift
        const gps = await prisma.gpsPoint.findMany({
          where: {
            vehicleId: s.vehicleId,
            at: { gte: s.startAt, lte: completedAt },
          },
          orderBy: { at: "asc" },
          take: 4000,
        });

        if (!gps || gps.length < 2) {
          // create a low-quality sample? skip for now
          continue;
        }

        // Downsample aggressively for OSRM match limits
        const ds = downsamplePoints(gps.map((p) => ({ lat: p.lat, lng: p.lng, at: p.at })), { maxPoints: 100 });

        const match = await osrmMatch(ds);
        if (!match.ok) {
          // skip if OSRM unavailable or failed
          continue;
        }

        const polyMatched = stringifyPolyline(match.points);
        const distanceKm = Number(match.distanceKm || 0);
        const durationMin = Number(match.durationMin || 0);
        const qualityScore = Number(match.confidence || 0.5);

        // Persist sample (unique by shiftId)
        await prisma.routeLearnSample.create({
          data: {
            routeKey,
            shiftId: s.id,
            vehicleId: s.vehicleId,
            startAt: s.startAt,
            polylineMatched: polyMatched,
            distanceKm,
            durationMin,
            qualityScore,
          },
        });

        // Update learned aggregate (keep last N)
        const maxN = Math.max(5, Number(ENV.ROUTE_LEARN_MAX_SAMPLES || 20));
        const samples = await prisma.routeLearnSample.findMany({
          where: { routeKey },
          orderBy: { createdAt: "desc" },
          take: maxN + 20, // fetch extra for cleanup
        });

        // retention: keep newest maxN
        if (samples.length > maxN) {
          const delIds = samples.slice(maxN).map((x) => x.id);
          if (delIds.length) {
            await prisma.routeLearnSample.deleteMany({ where: { id: { in: delIds } } });
          }
          // rebuild samples list
          const kept = samples.slice(0, maxN);
          samples.length = 0;
          samples.push(...kept);
        }

        const distMed = median(samples.map((x) => x.distanceKm));
        const durMed = median(samples.map((x) => x.durationMin));
        const canonical = pickCanonicalSample(samples);

        if (canonical) {
          await prisma.routeLearned.upsert({
            where: { routeKey },
            create: {
              routeKey,
              polylineCanonical: canonical.polylineMatched,
              distanceKmLearned: Number(distMed ?? canonical.distanceKm ?? 0),
              durationMinLearned: Math.round(Number(durMed ?? canonical.durationMin ?? 0)),
              sampleCount: samples.length,
            },
            update: {
              polylineCanonical: canonical.polylineMatched,
              distanceKmLearned: Number(distMed ?? canonical.distanceKm ?? 0),
              durationMinLearned: Math.round(Number(durMed ?? canonical.durationMin ?? 0)),
              sampleCount: samples.length,
            },
          });
        }
      }
    } catch (e) {
       
      console.error("[routeLearnMonitor] tick failed:", e?.message || e);
    } finally {
      running = false;
    }
  }

  timer = setInterval(() => tick().catch(() => {}), intervalMs);
  setTimeout(() => tick().catch(() => {}), Math.min(2000, intervalMs));

  return () => {
    try { clearInterval(timer); } catch {}
  };
}
