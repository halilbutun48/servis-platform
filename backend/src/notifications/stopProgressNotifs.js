// backend/src/notifications/stopProgressNotifs.js
// Stop progress -> multi-scope notifications (Room/Company/User)

import { prisma } from "../prisma.js";
import { haversineKm } from "../geo.js";
import { createAndEmitNotification } from "./service.js";

function fmtKm(km) {
  if (typeof km !== "number" || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function vehLabel(vehicle) {
  const p = String(vehicle?.plate ?? "").trim();
  return p ? `${p} ` : "";
}

function asInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function isProgressState(state) {
  return state === "REACHED" || state === "SKIPPED";
}

async function safeFindVehicle(vehicleId) {
  if (!vehicleId) return null;
  try {
    return await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, plate: true } });
  } catch {
    return null;
  }
}

async function safeFindGpsLast(vehicleId) {
  if (!vehicleId) return null;
  try {
    return await prisma.gpsLast.findUnique({ where: { vehicleId }, select: { lat: true, lng: true, speed: true, at: true } });
  } catch {
    return null;
  }
}

async function safeFindAssignments(shiftId) {
  try {
    return await prisma.stopAssignment.findMany({
      where: { shiftId },
      include: {
        stop: { select: { id: true, order: true, name: true, lat: true, lng: true } },
        personel: { select: { id: true, fullName: true, userId: true } },
      },
    });
  } catch {
    return [];
  }
}

async function safeFindParentLinks(personelIds) {
  try {
    const d = prisma.parentChild;
    if (!d?.findMany) return [];

    return await d.findMany({
      where: { personelId: { in: personelIds } },
      select: { parentUserId: true, personelId: true },
    });
  } catch {
    return [];
  }
}

/**
 * Call this when a stop becomes REACHED/SKIPPED.
 * Creates DB notifications + emits WS notif:new.
 */
export async function emitStopProgressNotifs({
  io,
  shiftId,
  stop,
  stopId,
  state,
  source = "",
} = {}) {
  try {
    const sid = asInt(shiftId);
    const sId = asInt(stop?.id ?? stopId);
    if (!sid || !sId) return;

    const st = String(state ?? stop?.state ?? "");
    if (!isProgressState(st)) return;

    const shift = await prisma.shift.findUnique({
      where: { id: sid },
      select: { id: true, companyId: true, roomId: true, vehicleId: true, startAt: true },
    });
    if (!shift) return;

    const stops = await prisma.stop.findMany({
      where: { shiftId: sid },
      orderBy: { order: "asc" },
      select: { id: true, order: true, name: true, state: true, lat: true, lng: true },
    });

    const cur = stop?.order ? { ...stop } : stops.find((x) => x.id === sId);
    if (!cur) return;

    const total = stops.length;
    const remaining = stops.filter((x) => x.state === "PENDING").length;
    const nextPending = stops.find((x) => x.state === "PENDING") ?? null;

    const vehicle = await safeFindVehicle(shift.vehicleId);
    const last = await safeFindGpsLast(shift.vehicleId);

    const kmToNext =
      last && nextPending ? haversineKm(last.lat, last.lng, nextPending.lat, nextPending.lng) : null;

    const nextTxt = kmToNext != null ? ` (sonraki ~${fmtKm(kmToNext)})` : "";

    // --------- Room / Company: every reached stop ---------
    const baseTitle = "Durak Ulaşıldı";
    const baseMsg = `${vehLabel(vehicle)}${cur.order}/${total} durağa ulaşıldı. Kalan: ${remaining}${nextTxt}.`;

    if (shift.roomId) {
      await createAndEmitNotification({
        io,
        type: "STOP_REACHED",
        scope: "ROOM",
        roomId: shift.roomId,
        companyId: shift.companyId,
        vehicleId: shift.vehicleId,
        shiftId: shift.id,
        payloadJson: { title: baseTitle, message: baseMsg, vehicleId: shift.vehicleId, kind: "STOP_REACHED" },
        dedupeKey: `STOP_REACHED:ROOM:${shift.roomId}:SHIFT:${shift.id}:O:${cur.order}`,
      });
    }

    if (shift.companyId) {
      await createAndEmitNotification({
        io,
        type: "STOP_REACHED",
        scope: "COMPANY",
        companyId: shift.companyId,
        roomId: shift.roomId,
        vehicleId: shift.vehicleId,
        shiftId: shift.id,
        payloadJson: { title: baseTitle, message: baseMsg, vehicleId: shift.vehicleId, kind: "STOP_REACHED" },
        dedupeKey: `STOP_REACHED:COMPANY:${shift.companyId}:SHIFT:${shift.id}:O:${cur.order}`,
      });
    }

    // --------- Personel / Parent: per-assignment proximity ---------
    const assigns = await safeFindAssignments(shift.id);
    if (!assigns.length) return;

    const personelIds = Array.from(new Set(assigns.map((a) => a.personelId).filter(Boolean)));
    const parentLinks = await safeFindParentLinks(personelIds);

    // Map personelId -> [parentUserId]
    const parentsByPersonel = new Map();
    for (const l of parentLinks) {
      const pid = l.personelId;
      const uid = l.parentUserId;
      if (!pid || !uid) continue;
      if (!parentsByPersonel.has(pid)) parentsByPersonel.set(pid, []);
      parentsByPersonel.get(pid).push(uid);
    }

    function kmToStop(aStop) {
      if (!last || !aStop) return null;
      return haversineKm(last.lat, last.lng, aStop.lat, aStop.lng);
    }

    for (const a of assigns) {
      const aStop = a.stop;
      const p = a.personel;
      if (!aStop || !p) continue;

      // only if assigned stop is ahead/at current
      const rem = aStop.order - cur.order;
      if (rem < 0) continue;

      const km = kmToStop(aStop);
      const kmTxt = km != null ? ` (~${fmtKm(km)})` : "";

      // 0 => reached their stop
      if (rem === 0 && st === "REACHED") {
        const title = "Servis Geldi";
        const msgBase = `${p.fullName}: durağına ulaşıldı.`;

        if (p.userId) {
          await createAndEmitNotification({
            io,
            type: "STOP_REACHED_USER",
            scope: "USER",
            userId: p.userId,
            companyId: shift.companyId,
            vehicleId: shift.vehicleId,
            shiftId: shift.id,
            payloadJson: { title, message: msgBase, vehicleId: shift.vehicleId, kind: "STOP_REACHED_USER" },
            dedupeKey: `STOP_REACHED:USER:${p.userId}:SHIFT:${shift.id}:P:${p.id}`,
          });
        }

        const parentUids = parentsByPersonel.get(p.id) ?? [];
        for (const puid of parentUids) {
          await createAndEmitNotification({
            io,
            type: "STOP_REACHED_PARENT",
            scope: "USER",
            userId: puid,
            companyId: shift.companyId,
            vehicleId: shift.vehicleId,
            shiftId: shift.id,
            payloadJson: { title, message: msgBase, vehicleId: shift.vehicleId, kind: "STOP_REACHED_PARENT" },
            dedupeKey: `STOP_REACHED:PARENT:${puid}:SHIFT:${shift.id}:CHILD:${p.id}`,
          });
        }

        continue;
      }

      if (st !== "REACHED") continue; // proximity notifs only on reached (skip shouldn't spam)

      if (rem === 2 || rem === 1) {
        const title = "Servis Yaklaşıyor";
        const msg = `${p.fullName} için: ${rem} durak kaldı${kmTxt}.`;
        const type = rem === 2 ? "ETA_2_STOPS" : "ETA_1_STOP";

        if (p.userId) {
          await createAndEmitNotification({
            io,
            type,
            scope: "USER",
            userId: p.userId,
            companyId: shift.companyId,
            vehicleId: shift.vehicleId,
            shiftId: shift.id,
            payloadJson: { title, message: msg, vehicleId: shift.vehicleId, kind: type },
            dedupeKey: `${type}:USER:${p.userId}:SHIFT:${shift.id}:P:${p.id}`,
          });
        }

        const parentUids = parentsByPersonel.get(p.id) ?? [];
        for (const puid of parentUids) {
          await createAndEmitNotification({
            io,
            type,
            scope: "USER",
            userId: puid,
            companyId: shift.companyId,
            vehicleId: shift.vehicleId,
            shiftId: shift.id,
            payloadJson: { title, message: msg, vehicleId: shift.vehicleId, kind: type },
            dedupeKey: `${type}:PARENT:${puid}:SHIFT:${shift.id}:CHILD:${p.id}`,
          });
        }
      }
    }
  } catch (e) {
    // never crash the request pipeline
    console.error("emitStopProgressNotifs error:", e);
  }
}
