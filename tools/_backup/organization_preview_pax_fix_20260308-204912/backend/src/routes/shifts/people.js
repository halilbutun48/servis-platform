import { Router } from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { prisma } from "../../prisma.js";
import { audit } from "../../audit.js";
import { clusterStops } from "../../services/clusterStops.js";
import { etaMinutes } from "../../geo.js";
import { computeRouteKey, parsePolyline, sumDistanceKm } from "../../services/routeLearning.js";
import { getShiftAndCheckScopeOrThrow } from "./helpers.js";

const qModeSchema = z
  .enum(["REPLACE", "MERGE"])
  .optional()
  .transform((v) => v ?? "REPLACE");

const qMaxWalkSchema = z
  .preprocess((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    return Number(s);
  }, z.number().int().min(50).max(2000))
  .optional()
  .transform((v) => v ?? 250);

const personelItemSchema = z.object({
  personelId: z.preprocess((v) => (v == null ? undefined : Number(v)), z.number().int().positive()).optional(),
  fullName: z.string().min(1).max(120),
  phone: z.string().trim().min(3).max(32).optional().nullable(),
  address: z.string().trim().min(2).max(240).optional().nullable(),
  lat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  lng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  geoManualOverride: z.boolean().optional(),
  kind: z.enum(["PERSONEL", "STUDENT"]).optional(),
});

function sanitizePhone(p) {
  const s = (p ?? "").trim();
  if (!s) return null;
  return s;
}

function normalizeGeoStatus({ lat, lng, geoManualOverride }) {
  if (geoManualOverride) return "OK";
  if (typeof lat === "number" && typeof lng === "number") return "OK";
  return "NEEDS_REVIEW";
}

async function upsertCompanyPersonel(companyId, item, defaultKind) {
  const phone = sanitizePhone(item.phone);
  const data = {
    fullName: item.fullName,
    kind: item.kind ?? defaultKind,
    phone,
    homeAddress: item.address ?? null,
    homeLat: typeof item.lat === "number" ? item.lat : null,
    homeLng: typeof item.lng === "number" ? item.lng : null,
    geoManualOverride: Boolean(item.geoManualOverride),
    geoStatus: normalizeGeoStatus(item),
    geoUpdatedAt:
      typeof item.lat === "number" && typeof item.lng === "number" ? new Date() : null,
  };

  // If explicit personelId provided, update it (must belong to company)
  if (item.personelId) {
    const existing = await prisma.personel.findFirst({
      where: { id: item.personelId, companyId },
      select: { id: true },
    });
    if (!existing) {
      throw Object.assign(new Error("personelId does not belong to this company"), { status: 400 });
    }
    return prisma.personel.update({ where: { id: item.personelId }, data });
  }

  // If phone present, upsert by (companyId, phone)
  if (phone) {
    return prisma.personel.upsert({
      where: { companyId_phone: { companyId, phone } },
      create: { companyId, ...data },
      update: data,
    });
  }

  // Otherwise create a new record (no stable key)
  return prisma.personel.create({ data: { companyId, ...data } });
}

async function getShiftPeople(shiftId) {
  const rows = await prisma.shiftPersonel.findMany({
    where: { shiftId },
    include: {
      personel: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          homeAddress: true,
          homeLat: true,
          homeLng: true,
          geoStatus: true,
          geoManualOverride: true,
          geoNote: true,
          geoUpdatedAt: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return rows
    .map((r) => r.personel)
    .filter(Boolean);
}

function pickEligiblePoints(personels) {
  const ok = [];
  const skipped = [];

  for (const p of personels) {
    const lat = p.homeLat;
    const lng = p.homeLng;
    const eligible =
      (p.geoStatus === "OK" || p.geoManualOverride) &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    if (eligible) ok.push({ personelId: p.id, lat, lng });
    else skipped.push(p);
  }

  return { ok, skipped };
}

function parseItemArray(req) {
  const items = req.body?.items ?? req.body?.rows ?? [];
  const parsed = z.array(personelItemSchema).max(500).parse(items);
  return parsed;
}

export function attachShiftPeopleRoutes(router, _io) {
  const r = Router();

  // COMPANY: get shift people
  r.get("/:id/people", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    const items = await getShiftPeople(shift.id);
    res.json({ ok: true, items });
  });

  // COMPANY: replace/merge shift people
  r.put("/:id/people", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const mode = qModeSchema.parse(req.query.mode);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId }, select: { kind: true } });
    const defaultKind = company?.kind === "SCHOOL" ? "STUDENT" : "PERSONEL";

    const items = parseItemArray(req);

    const createdOrUpdated = [];
    for (const it of items) {
      const p = await upsertCompanyPersonel(req.user.companyId, it, defaultKind);
      createdOrUpdated.push(p);
    }

    // Deduplicate by personelId
    const uniq = new Map(createdOrUpdated.map((p) => [p.id, p]));
    const personelIds = [...uniq.keys()];

    if (mode === "REPLACE") {
      await prisma.shiftPersonel.deleteMany({ where: { shiftId: shift.id } });
    }

    // For MERGE, we only create missing links
    const existingLinks = mode === "MERGE"
      ? await prisma.shiftPersonel.findMany({
          where: { shiftId: shift.id, personelId: { in: personelIds } },
          select: { personelId: true },
        })
      : [];

    const existingSet = new Set(existingLinks.map((x) => x.personelId));
    const toCreate = personelIds
      .filter((pid) => !existingSet.has(pid))
      .map((pid) => ({ shiftId: shift.id, personelId: pid }));

    if (toCreate.length > 0) {
      await prisma.shiftPersonel.createMany({ data: toCreate, skipDuplicates: true });
    }

    audit(req, "SHIFT_PEOPLE_UPSERT", {
      shiftId: shift.id,
      mode,
      count: items.length,
      linked: toCreate.length,
    });

    res.json({ ok: true, shiftId: shift.id, mode, inputCount: items.length, linkedCount: toCreate.length });
  });

  // COMPANY: import people + write import trail
  r.post("/:id/people/import", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const mode = qModeSchema.parse(req.query.mode);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId }, select: { kind: true } });
    const defaultKind = company?.kind === "SCHOOL" ? "STUDENT" : "PERSONEL";

    const bodySchema = z.object({
      fileName: z.string().max(200).optional(),
      rows: z.array(personelItemSchema).max(2000).optional(),
      items: z.array(personelItemSchema).max(2000).optional(),
    });

    const body = bodySchema.parse(req.body ?? {});
    const rows = body.rows ?? body.items ?? [];
    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: "rows/items required" });
    }

    const imp = await prisma.shiftImport.create({
      data: {
        shiftId: shift.id,
        createdByUserId: req.user.id,
        fileName: body.fileName ?? null,
        rows: {
          create: rows.map((row, idx) => ({
            rowNo: idx + 1,
            rawJson: row,
            fullName: row.fullName,
            phone: sanitizePhone(row.phone),
            address: row.address ?? null,
            lat: typeof row.lat === "number" ? row.lat : null,
            lng: typeof row.lng === "number" ? row.lng : null,
            geoStatus: normalizeGeoStatus(row),
          })),
        },
      },
      select: { id: true },
    });

    const createdOrUpdated = [];
    for (const row of rows) {
      const p = await upsertCompanyPersonel(req.user.companyId, row, defaultKind);
      createdOrUpdated.push(p);

      // back-link import row -> personelId for trace
      await prisma.shiftImportRow.updateMany({
        where: {
          importId: imp.id,
          phone: sanitizePhone(row.phone),
          rowNo: { gt: 0 },
        },
        data: { personelId: p.id },
      });
    }

    const uniq = new Map(createdOrUpdated.map((p) => [p.id, p]));
    const personelIds = [...uniq.keys()];

    if (mode === "REPLACE") {
      await prisma.shiftPersonel.deleteMany({ where: { shiftId: shift.id } });
    }

    const existingLinks = mode === "MERGE"
      ? await prisma.shiftPersonel.findMany({
          where: { shiftId: shift.id, personelId: { in: personelIds } },
          select: { personelId: true },
        })
      : [];

    const existingSet = new Set(existingLinks.map((x) => x.personelId));
    const toCreate = personelIds
      .filter((pid) => !existingSet.has(pid))
      .map((pid) => ({ shiftId: shift.id, personelId: pid }));

    if (toCreate.length > 0) {
      await prisma.shiftPersonel.createMany({ data: toCreate, skipDuplicates: true });
    }

    audit(req, "SHIFT_PEOPLE_IMPORT", {
      shiftId: shift.id,
      importId: imp.id,
      mode,
      rows: rows.length,
      linked: toCreate.length,
    });

    res.json({ ok: true, shiftId: shift.id, importId: imp.id, mode, inputCount: rows.length, linkedCount: toCreate.length });
  });

  // COMPANY: generate stops from shift people
  r.post("/:id/stops/generate", authRequired(), requireRole("COMPANY"), async (req, res) => {
    try {

    const id = Number(req.params.id);
    const mode = qModeSchema.parse(req.query.mode);
    const maxWalkM = qMaxWalkSchema.parse(req.query.maxWalkM);

    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    // ✅ Hub auto-fill: shift.hub yoksa Company Hub'dan kopyala (rota önizleme başlangıç/bitiş ankrajı)
    let hubApplied = false;
    if (shift.hubLat == null || shift.hubLng == null) {
      const c = await prisma.company.findUnique({
        where: { id: shift.companyId },
        select: { hubLat: true, hubLng: true },
      });
      if (c?.hubLat != null && c?.hubLng != null) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: { hubLat: c.hubLat, hubLng: c.hubLng },
        });
        hubApplied = true;
      }
    }

    const people = await getShiftPeople(shift.id);
    const { ok: points, skipped } = pickEligiblePoints(people);

    if (points.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No eligible personel points (need geoStatus OK or manual override + lat/lng)",
        skippedCount: skipped.length,
        hubApplied,
      });
    }

    if (mode === "REPLACE") {
      // Remove old route artifacts
      await prisma.stopAssignment.deleteMany({ where: { shiftId: shift.id } });
      await prisma.shiftProgress.deleteMany({ where: { shiftId: shift.id } });
      await prisma.stop.deleteMany({ where: { shiftId: shift.id } });
    }

    const clusters = clusterStops(points, maxWalkM);

    const namePrefix = String(shift?.direction || "INBOUND").toUpperCase() === "OUTBOUND" ? "Dropoff" : "Pickup";

    // Create stops in order
    const createdStops = [];
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      const stop = await prisma.stop.create({
        data: {
          shiftId: shift.id,
          name: `${namePrefix} ${i + 1}`,
          order: i + 1,
          lat: c.center.lat,
          lng: c.center.lng,
          type: "COMMON",
          state: "PENDING",
        },
      });
      createdStops.push(stop);

      // Assign members to the stop
      const assignments = c.members.map((m) => ({
        shiftId: shift.id,
        stopId: stop.id,
        personelId: m.personelId,
        walkM: c.walkMByPersonelId.get(m.personelId) ?? 0,
      }));

      await prisma.stopAssignment.createMany({ data: assignments, skipDuplicates: true });
    }

    const assignmentCount = await prisma.stopAssignment.count({ where: { shiftId: shift.id } });

    audit(req, "SHIFT_STOPS_GENERATE", {
      shiftId: shift.id,
      mode,
      maxWalkM,
      stops: createdStops.length,
      assignments: assignmentCount,
      skipped: skipped.length,
      hubApplied,
    });

    res.json({
      ok: true,
      shiftId: shift.id,
      maxWalkM,
      stopCount: createdStops.length,
      assignmentCount,
      skippedCount: skipped.length,
      hubApplied,
    });
  

} catch (e) {
  // Never crash the server on bad query params (e.g., maxWalkM=)
  const msg = String(e?.message ?? e);
  return res.status(400).json({ ok: false, error: msg });
}
});

  
  // COMPANY + ROOM: list stops (used by Shift Tools "Shift’ten Durakları Çek")
  r.get("/:id/stops", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);

    await getShiftAndCheckScopeOrThrow(id, req.user, { include: { room: true, agreement: true }, allowRoomOfferScope: true });

    const stops = await prisma.stop.findMany({
      where: { shiftId: id },
      orderBy: { order: "asc" },
    });

    const assignments = await prisma.stopAssignment.findMany({
      where: { shiftId: id },
      select: { stopId: true },
    });

    const countByStopId = new Map();
    for (const a of assignments) {
      countByStopId.set(a.stopId, (countByStopId.get(a.stopId) || 0) + 1);
    }

    const items = stops.map((s) => ({
      ...s,
      assignmentCount: countByStopId.get(s.id) || 0,
    }));

    return res.json({ ok: true, stops: items });
  });

  // COMPANY + ROOM: route preview (M19: summary + directional hub path + learned overlay)
  r.get("/:id/route-preview", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);

    // include room + agreement for hub fallback, progress for time window hints
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user, {
      include: { room: true, agreement: true, progress: true },
      allowRoomOfferScope: true,
    });

    const people = await getShiftPeople(shift.id);
    const stops = await prisma.stop.findMany({
      where: { shiftId: shift.id },
      orderBy: { order: "asc" },
    });
    const assignments = await prisma.stopAssignment.findMany({
      where: { shiftId: shift.id },
      select: { stopId: true, personelId: true, walkM: true },
    });

    const { skipped } = pickEligiblePoints(people);

    // stopId -> kişi sayısı
    const countByStopId = new Map();
    for (const a of assignments) {
      countByStopId.set(a.stopId, (countByStopId.get(a.stopId) || 0) + 1);
    }

    // stops’a assignmentCount ekle
    const stopsWithCounts = stops.map((s) => ({
      ...s,
      assignmentCount: countByStopId.get(s.id) || 0,
    }));

    // ✅ M19: hub resolution (shift -> agreement -> room)
    const hubLat =
      typeof shift.hubLat === "number"
        ? shift.hubLat
        : typeof shift.agreement?.hubLat === "number"
          ? shift.agreement.hubLat
          : typeof shift.room?.hubLat === "number"
            ? shift.room.hubLat
            : null;

    const hubLng =
      typeof shift.hubLng === "number"
        ? shift.hubLng
        : typeof shift.agreement?.hubLng === "number"
          ? shift.agreement.hubLng
          : typeof shift.room?.hubLng === "number"
            ? shift.room.hubLng
            : null;

    const hub = typeof hubLat === "number" && typeof hubLng === "number" ? { lat: hubLat, lng: hubLng } : null;

    const direction = String(shift.direction || shift.agreement?.direction || "INBOUND").toUpperCase();
    const pattern = String(shift.pattern || shift.agreement?.pattern || "ONE_WAY").toUpperCase();

    const stopPoints = stopsWithCounts
      .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
      .map((s) => ({ lat: s.lat, lng: s.lng }));

    // ✅ M19: build service path points (driver home/depot is out of scope)
    let estPoints = [];
    let startLabel = "";
    let endLabel = "";
    let warning = null;

    if (!hub) {
      warning = "hubMissing";
      estPoints = stopPoints.slice();
      startLabel = stopPoints.length ? "FIRST_STOP" : "";
      endLabel = stopPoints.length ? "LAST_STOP" : "";
    } else if (pattern === "LOOP") {
      estPoints = [hub, ...stopPoints, hub];
      startLabel = "HUB";
      endLabel = "HUB";
    } else if (direction === "OUTBOUND") {
      estPoints = [hub, ...stopPoints];
      startLabel = "HUB";
      endLabel = stopPoints.length ? "LAST_STOP" : "HUB";
    } else {
      // INBOUND default
      estPoints = [...stopPoints, hub];
      startLabel = stopPoints.length ? "FIRST_STOP" : "HUB";
      endLabel = "HUB";
    }

    // estimated km/süre (haversine)
    const distanceKmEstimated = Number(sumDistanceKm(estPoints).toFixed(2));
    const durationMinEstimated = Math.round(Number(etaMinutes(distanceKmEstimated, 30)));

    // learned overlay (if exists and stable)
    const routeKey = computeRouteKey({ direction, pattern, hub, stops: stopPoints });
    const learned = await prisma.routeLearned.findUnique({ where: { routeKey } });

    const learnedPoints =
      learned && Number(learned.sampleCount || 0) >= 3
        ? parsePolyline(learned.polylineCanonical)
        : null;

    const source = learnedPoints && learnedPoints.length >= 2 ? "LEARNED" : "ESTIMATED";
    const pathPoints = source === "LEARNED" ? learnedPoints : estPoints;

    const summary = {
      stopCount: stopPoints.length,
      direction,
      pattern,
      isLoop: pattern === "LOOP",
      startLabel,
      endLabel,
      distanceKmEstimated,
      durationMinEstimated,
      warning,
    };

    if (learned) {
      summary.distanceKmLearned = Number(Number(learned.distanceKmLearned || 0).toFixed(2));
      summary.durationMinLearned = Number(learned.durationMinLearned || 0);
      summary.learnedSampleCount = Number(learned.sampleCount || 0);
    }

    res.json({
      ok: true,
      shift: {
        id: shift.id,
        status: shift.status,
        startAt: shift.startAt,
        endAt: shift.endAt,
        roomId: shift.roomId,
        companyId: shift.companyId,
        agreementId: shift.agreementId ?? null,
        hubLat,
        hubLng,
        direction,
        pattern,
      },
      people,
      stops: stopsWithCounts,
      assignments,
      skipped: skipped.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        geoStatus: p.geoStatus,
        geoManualOverride: p.geoManualOverride,
        homeLat: p.homeLat,
        homeLng: p.homeLng,
      })),
      summary,
      path: { source, points: pathPoints, routeKey },
    });
  });

  router.use(r);
}
