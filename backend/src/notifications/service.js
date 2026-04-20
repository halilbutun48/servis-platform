// backend/src/notifications/service.js
import { prisma } from "../prisma.js";
import { isoOffsetTR } from "../time/tr.js";

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

  if (typeof v === "object") return v;

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") return parsed;
      throw new Error("payloadJson string parse edildi ama object değil.");
    } catch {
      throw new Error("createNotification: payloadJson string ise geçerli JSON object olmalı.");
    }
  }

  throw new Error("createNotification: payloadJson payload tipi geçersiz.");
}

function normalizeToV1({ type, payloadObj, vehicleIdFallback = null }) {
  const vehicleId =
    (payloadObj && typeof payloadObj.vehicleId === "number" ? payloadObj.vehicleId : null) ??
    (typeof vehicleIdFallback === "number" ? vehicleIdFallback : null);

  const at =
    typeof payloadObj?.at === "string"
      ? payloadObj.at
      : payloadObj?.at?.toISOString
        ? isoOffsetTR(payloadObj.at)
        : isoOffsetTR();

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

function isUnknownArgError(err, argName) {
  const msg = String(err?.message ?? "");
  return (
    msg.includes(`Unknown argument \`${argName}\``) ||
    msg.includes(`Unknown argument '${argName}'`) ||
    (msg.includes(`data.${argName}`) && msg.includes("Unknown"))
  );
}

function isWhereNotUniqueError(err) {
  const msg = String(err?.message ?? "");
  return (
    msg.includes("needs at least one of") ||
    msg.includes("Argument `where`") ||
    msg.includes("must contain at least one unique field") ||
    msg.includes("Unique constraint")
  );
}

function isPrismaUniqueViolation(err, field) {
  const code = err?.code;
  const target = err?.meta?.target;
  const msg = String(err?.message ?? "");
  const targetHit =
    Array.isArray(target) ? target.includes(field) : typeof target === "string" ? target.includes(field) : false;

  return (
    code === "P2002" &&
    (targetHit || msg.includes(`(${field})`) || msg.includes(`\`${field}\``) || msg.includes(`'${field}'`))
  );
}

// Şema scalar id bekliyorsa relation alanları (company/room/...) "Unknown argument" verir.
function needsScalarFallback(err) {
  return (
    isUnknownArgError(err, "company") ||
    isUnknownArgError(err, "room") ||
    isUnknownArgError(err, "driver") ||
    isUnknownArgError(err, "vehicle") ||
    isUnknownArgError(err, "shift")
  );
}

// Şema relation connect bekliyorsa scalar alanlar (companyId/roomId/...) "Unknown argument" verir.
function needsRelationConnectFallback(err) {
  return (
    isUnknownArgError(err, "companyId") ||
    isUnknownArgError(err, "roomId") ||
    isUnknownArgError(err, "driverId") ||
    isUnknownArgError(err, "vehicleId") ||
    isUnknownArgError(err, "shiftId")
  );
}

function buildAutoDedupeKey({
  type,
  scope,
  vehicleId,
  companyId,
  roomId,
  driverId,
  userId,
  shiftId,
}) {
  // Varsayılan otomatik dedupe sadece overspeed için (10sn bucket).
  if (type !== "OVERSPEED") return null;
  if (!vehicleId) return null;

  const bucket10s = Math.floor(Date.now() / 10_000);

  let actor = "X";
  if (scope === "DRIVER") actor = userId ?? driverId ?? "X";
  else if (scope === "ROOM") actor = roomId ?? "X";
  else if (scope === "COMPANY") actor = companyId ?? "X";
  else if (scope === "SHIFT") actor = shiftId ?? "X";

  return `OVERSPEED:${vehicleId}:${scope}:${actor}:${bucket10s}`;
}

function buildScalarData({
  type,
  scope,
  v1,
  companyId,
  roomId,
  driverId,
  vehicleId,
  shiftId,
  userId,
  dedupeKey,
}) {
  const data = {
    type,
    scope,
    payloadJson: v1,
    companyId,
    roomId,
    driverId,
    vehicleId,
    shiftId,
  };

  // şemada yoksa "Unknown argument" ile yakalayıp kırpıyoruz
  if (dedupeKey) data.dedupeKey = dedupeKey;
  if (userId != null) data.userId = userId;

  return data;
}

function buildConnectData({
  type,
  scope,
  v1,
  companyId,
  roomId,
  driverId,
  vehicleId,
  shiftId,
  userId,
  dedupeKey,
}) {
  const data = {
    type,
    scope,
    payloadJson: v1,
  };

  if (dedupeKey) data.dedupeKey = dedupeKey;
  if (userId != null) data.userId = userId;

  if (companyId) data.company = { connect: { id: companyId } };
  if (roomId) data.room = { connect: { id: roomId } };
  if (driverId) data.driver = { connect: { id: driverId } };
  if (vehicleId) data.vehicle = { connect: { id: vehicleId } };
  if (shiftId) data.shift = { connect: { id: shiftId } };

  return data;
}

async function safeUpdateByDedupeKey({ dedupeKey, data, useConnect: _useConnect }) {
  try {
    // dedupeKey unique ise update çalışır
    return await prisma.notification.update({
      where: { dedupeKey },
      data,
    });
  } catch (e) {
    // userId/dedupeKey unknown gibi durumlarda bir kez kırpıp tekrar dene
    const userUnknown = isUnknownArgError(e, "userId");
    const dkUnknown = isUnknownArgError(e, "dedupeKey");
    if (!userUnknown && !dkUnknown) throw e;

    const data2 = { ...data };
    if (userUnknown) delete data2.userId;
    if (dkUnknown) {
      // dedupeKey alanı yoksa update de anlamsız; findUnique da çalışmayabilir
      throw e;
    }

    return await prisma.notification.update({
      where: { dedupeKey },
      data: data2,
    });
  }
}

async function safeFindByDedupeKey(dedupeKey) {
  try {
    return await prisma.notification.findUnique({ where: { dedupeKey } });
  } catch {
    return null;
  }
}

// scope: ROOM | COMPANY | DRIVER | SHIFT | USER (projende ne varsa)
export async function createNotification({
  type,
  scope,

  payload = null,
  payloadJson = null,

  companyId = null,
  roomId = null,
  driverId = null,
  vehicleId = null,
  shiftId = null,

  // modelde yoksa otomatik kırpılıyor
  userId = null,

  // opsiyonel
  dedupeKey = null,
} = {}) {
  if (!type) throw new Error("createNotification: type gerekli.");
  if (!scope) throw new Error("createNotification: scope gerekli.");

  const obj = ensurePayloadObject({ payload, payloadJson });
  const v1 = normalizeToV1({ type, payloadObj: obj, vehicleIdFallback: vehicleId });
  const finalVehicleId = vehicleId ?? v1.vehicleId ?? null;

  const autoDk = buildAutoDedupeKey({
    type,
    scope,
    vehicleId: finalVehicleId,
    companyId,
    roomId,
    driverId,
    userId,
    shiftId,
  });

  // NOTE: dedupeKey=="" => dedupe kapalı (unique ihlali olmasın diye null yazıyoruz)
  const dedupeDisabled = dedupeKey === "";
  const finalDedupeKey = dedupeDisabled ? null : (dedupeKey ?? autoDk);

  async function tryUpsertOrCreate({ useConnect }) {
    const mkData = useConnect ? buildConnectData : buildScalarData;

    // Öncelik: dedupeKey varsa UPSERT
    if (finalDedupeKey) {
      const createData = mkData({
        type,
        scope,
        v1,
        companyId,
        roomId,
        driverId,
        vehicleId: finalVehicleId,
        shiftId,
        userId,
        dedupeKey: finalDedupeKey,
      });

      const updateData = mkData({
        type,
        scope,
        v1,
        companyId,
        roomId,
        driverId,
        vehicleId: finalVehicleId,
        shiftId,
        userId,
        dedupeKey: null, // update'de dedupeKey set etmeyelim
      });

      try {
        return await prisma.notification.upsert({
          where: { dedupeKey: finalDedupeKey },
          update: updateData,
          create: createData,
        });
      } catch (e) {
        // yanlış moddaysak üst seviyeye fırlat (mode switch)
        if (useConnect && needsScalarFallback(e)) throw e;
        if (!useConnect && needsRelationConnectFallback(e)) throw e;

        // Şema dedupeKey/userId tanımı yoksa kırpıp tekrar dene
        const dkUnknown = isUnknownArgError(e, "dedupeKey");
        const userUnknown = isUnknownArgError(e, "userId");

        if (dkUnknown || userUnknown) {
          const createData2 = mkData({
            type,
            scope,
            v1,
            companyId,
            roomId,
            driverId,
            vehicleId: finalVehicleId,
            shiftId,
            userId: userUnknown ? null : userId,
            dedupeKey: dkUnknown ? null : finalDedupeKey,
          });

          const updateData2 = mkData({
            type,
            scope,
            v1,
            companyId,
            roomId,
            driverId,
            vehicleId: finalVehicleId,
            shiftId,
            userId: userUnknown ? null : userId,
            dedupeKey: null,
          });

          // dedupeKey alanı yoksa upsert anlamsız; create'a düşecek
          if (dkUnknown) {
            return await prisma.notification.create({ data: createData2 });
          }

          try {
            return await prisma.notification.upsert({
              where: { dedupeKey: finalDedupeKey },
              update: updateData2,
              create: createData2,
            });
          } catch (e2) {
            // Çok nadir: yarış / edge durumda create'a düşerse P2002 yakalayacağız.
            // Burada aşağıya devam ediyoruz.
            e = e2;
          }
        }

        // Şema where unique değilse create fallback
        if (isWhereNotUniqueError(e)) {
          // devam: create'a düş
        } else {
          // beklenmedik hata
          throw e;
        }
      }
    }

    // CREATE (dedupeKey yoksa veya upsert mümkün değilse)
    const createData = mkData({
      type,
      scope,
      v1,
      companyId,
      roomId,
      driverId,
      vehicleId: finalVehicleId,
      shiftId,
      userId,
      dedupeKey: finalDedupeKey,
    });

    try {
      return await prisma.notification.create({ data: createData });
    } catch (e) {
      // yanlış moddaysak üst seviyeye fırlat
      if (useConnect && needsScalarFallback(e)) throw e;
      if (!useConnect && needsRelationConnectFallback(e)) throw e;

      // ✅ KRİTİK FIX: dedupeKey unique çakışması (P2002) => var olanı update et / bul ve dön
      if (finalDedupeKey && isPrismaUniqueViolation(e, "dedupeKey")) {
        const updateData = mkData({
          type,
          scope,
          v1,
          companyId,
          roomId,
          driverId,
          vehicleId: finalVehicleId,
          shiftId,
          userId,
          dedupeKey: null,
        });

        try {
          return await safeUpdateByDedupeKey({
            dedupeKey: finalDedupeKey,
            data: updateData,
            useConnect,
          });
        } catch {
          const existing = await safeFindByDedupeKey(finalDedupeKey);
          if (existing) return existing;
          // bulamazsa orijinal hatayı fırlat
          throw e;
        }
      }

      // dedupeKey/userId bilinmiyorsa kırp ve tekrar dene
      const dkUnknown = isUnknownArgError(e, "dedupeKey");
      const userUnknown = isUnknownArgError(e, "userId");
      if (!dkUnknown && !userUnknown) throw e;

      const createData2 = mkData({
        type,
        scope,
        v1,
        companyId,
        roomId,
        driverId,
        vehicleId: finalVehicleId,
        shiftId,
        userId: userUnknown ? null : userId,
        dedupeKey: dkUnknown ? null : finalDedupeKey,
      });

      try {
        return await prisma.notification.create({ data: createData2 });
      } catch (e2) {
        // yine dedupeKey çakışırsa aynı fix
        if (finalDedupeKey && isPrismaUniqueViolation(e2, "dedupeKey")) {
          const updateData2 = mkData({
            type,
            scope,
            v1,
            companyId,
            roomId,
            driverId,
            vehicleId: finalVehicleId,
            shiftId,
            userId: userUnknown ? null : userId,
            dedupeKey: null,
          });

          try {
            return await safeUpdateByDedupeKey({
              dedupeKey: finalDedupeKey,
              data: updateData2,
              useConnect,
            });
          } catch {
            const existing = await safeFindByDedupeKey(finalDedupeKey);
            if (existing) return existing;
            throw e2;
          }
        }

        throw e2;
      }
    }
  }

  // 1) önce scalar dene (senin şemanda bu çalışır)
  try {
    return await tryUpsertOrCreate({ useConnect: false });
  } catch (e1) {
    if (!needsRelationConnectFallback(e1)) throw e1;
  }

  // 2) relation connect dene (fallback)
  return await tryUpsertOrCreate({ useConnect: true });
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

  userId = null,
  dedupeKey = null,
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
    userId,
    dedupeKey,
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
