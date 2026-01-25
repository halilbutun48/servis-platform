// backend/src/notifications/service.js
import { prisma } from "../prisma.js";

/**
 * Notification payloadJson standardı (v1) — JSONB/Object
 *
 * DB kuralı: payloadJson alanına DAİMA v1 object yazılır (jsonb).
 * UI kuralı: UI sadece bu v1 alanları render eder.
 *
 * V1 payload (sabit):
 * {
 *   v: 1,
 *   title: string,
 *   message: string,
 *   vehicleId: number|null,
 *   at: string(ISO),
 *   ageSec: number|null,
 *   status: "LIVE"|"STALE"|"OFFLINE"|null,
 *   kind: string|null
 * }
 */

function ensurePayloadObject({ payload, payloadJson }) {
  const v = payload ?? payloadJson;

  if (v == null) {
    throw new Error("createNotification: payload/payloadJson gerekli.");
  }

  // object gelirse direkt kullan
  if (typeof v === "object") return v;

  // string gelirse JSON parse etmeyi dene
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") return parsed;
      throw new Error("payloadJson string parse edildi ama object değil.");
    } catch {
      throw new Error(
        "createNotification: payloadJson string ise geçerli JSON object olmalı."
      );
    }
  }

  throw new Error("createNotification: payloadJson payload tipi geçersiz.");
}

function normalizeToV1({ type, payloadObj, vehicleIdFallback = null }) {
  const vehicleId =
    (payloadObj && typeof payloadObj.vehicleId === "number"
      ? payloadObj.vehicleId
      : null) ??
    (typeof vehicleIdFallback === "number" ? vehicleIdFallback : null);

  const at =
    typeof payloadObj?.at === "string"
      ? payloadObj.at
      : payloadObj?.at?.toISOString
        ? payloadObj.at.toISOString()
        : new Date().toISOString();

  const ageSec = typeof payloadObj?.ageSec === "number" ? payloadObj.ageSec : null;

  const status = typeof payloadObj?.status === "string" ? payloadObj.status : null;

  const kind =
    typeof payloadObj?.kind === "string"
      ? payloadObj.kind
      : typeof type === "string"
        ? type
        : null;

  const title =
    typeof payloadObj?.title === "string" && payloadObj.title.trim()
      ? payloadObj.title
      : typeof type === "string"
        ? type
        : "Notification";

  const message = typeof payloadObj?.message === "string" ? payloadObj.message : "";

  return {
    v: 1,
    title,
    message,
    vehicleId,
    at,
    ageSec,
    status,
    kind,
  };
}

// scope: ROOM | COMPANY | DRIVER
export async function createNotification({
  type,
  scope,

  // yeni standart kullanım: payload object (v1 şema)
  payload = null,
  // geri uyum: payloadJson (string/object) kabul eder
  payloadJson = null,

  companyId = null,
  roomId = null,
  driverId = null,
  vehicleId = null,
  shiftId = null,
} = {}) {
  if (!type) throw new Error("createNotification: type gerekli.");
  if (!scope) throw new Error("createNotification: scope gerekli.");

  const obj = ensurePayloadObject({ payload, payloadJson });
  const v1 = normalizeToV1({ type, payloadObj: obj, vehicleIdFallback: vehicleId });

  return prisma.notification.create({
    data: {
      type,
      scope,
      payloadJson: v1, // ✅ JSONB object
      companyId,
      roomId,
      driverId,
      vehicleId,
      shiftId,
    },
  });
}

/**
 * WS emit
 * Odalar:
 * - vehicle:{vehicleId}
 * - room:{roomId}
 * - company:{companyId}
 * - shift:{shiftId}
 * - user:{userId}  (opsiyonel)
 *
 * Event:
 * - notif:new { scope, type, payload }
 */
export function emitNotification({
  io,
  type,
  scope,

  payload = null,
  payloadJson = null,

  companyId = null,
  roomId = null,
  vehicleId = null,
  shiftId = null,
  userId = null,
} = {}) {
  if (!io) throw new Error("emitNotification: io gerekli.");
  if (!type) throw new Error("emitNotification: type gerekli.");
  if (!scope) throw new Error("emitNotification: scope gerekli.");

  const obj = ensurePayloadObject({ payload, payloadJson });
  const v1 = normalizeToV1({ type, payloadObj: obj, vehicleIdFallback: vehicleId });

  const evt = { scope, type, payload: v1 };

  if (vehicleId) io.to(`vehicle:${vehicleId}`).emit("notif:new", evt);
  if (roomId) io.to(`room:${roomId}`).emit("notif:new", evt);
  if (companyId) io.to(`company:${companyId}`).emit("notif:new", evt);
  if (shiftId) io.to(`shift:${shiftId}`).emit("notif:new", evt);
  if (userId) io.to(`user:${userId}`).emit("notif:new", evt);
}

/**
 * Tek çağrıda DB + WS
 */
export async function createAndEmitNotification({
  io,
  type,
  scope,

  payload = null,
  payloadJson = null,

  companyId = null,
  roomId = null,
  driverId = null,
  vehicleId = null,
  shiftId = null,
  userId = null, // opsiyonel
} = {}) {
  const created = await createNotification({
    type,
    scope,
    payload,
    payloadJson,
    companyId,
    roomId,
    driverId,
    vehicleId,
    shiftId,
  });

  emitNotification({
    io,
    type,
    scope,
    payload,
    payloadJson,
    companyId,
    roomId,
    vehicleId,
    shiftId,
    userId,
  });

  return created;
}