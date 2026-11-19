import { httpError } from "../errors/http.js";

export const TEST_SIMULATED_DATA_CLASS = "TEST_SIMULATED";
export const TEST_SIMULATED_SERVICE_ACTION = "ROOM_TEST_SIMULATED_SERVICE_COMPLETED";

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeUpper(value) {
  return compactText(value).toUpperCase();
}

function positiveId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function runtimeMode(runtime = {}) {
  return normalizeUpper(runtime.mode || process.env.SEFERPAKT_DATABASE_MODE).toLowerCase();
}

function runtimeNodeEnv(runtime = {}) {
  return normalizeUpper(runtime.nodeEnv || process.env.NODE_ENV).toLowerCase();
}

function assertTestSimulationRuntime(runtime) {
  if (runtimeMode(runtime) !== "canonical_demo" || runtimeNodeEnv(runtime) === "production") {
    throw httpError(403, "TEST_SIMULATED_CANONICAL_DEMO_REQUIRED", "Kontrollü DEMO hizmet kanıtı yalnızca güvenli canonical DEMO ortamında kullanılabilir.");
  }
}

function assertSimulationInput(input) {
  if (input?.userApproval !== true) {
    throw httpError(409, "EXPLICIT_CONFIRMATION_REQUIRED", "Kontrollü DEMO hizmet kanıtı için açık kullanıcı onayı gerekir.");
  }
  if (normalizeUpper(input?.dataClass) !== TEST_SIMULATED_DATA_CLASS) {
    throw httpError(422, "TEST_SIMULATED_SOURCE_REQUIRED", "Bu işlem gerçek saha hizmeti değildir; TEST_SIMULATED kaynağı açıkça seçilmelidir.");
  }
  const sourceRef = compactText(input?.sourceRef);
  if (!/^SEFERPAKT_DEMO_[A-Z0-9][A-Z0-9_-]*$/i.test(sourceRef)) {
    throw httpError(422, "TEST_SIMULATED_SOURCE_REQUIRED", "Kontrollü DEMO işlemi SEFERPAKT_DEMO_ ile başlayan izlenebilir bir kaynak gerektirir.");
  }
  return sourceRef;
}

function publicResult({ shift, progress, sourceRef, idempotent }) {
  return {
    idempotent: Boolean(idempotent),
    shiftId: positiveId(shift?.id),
    status: normalizeUpper(shift?.status),
    dataClass: TEST_SIMULATED_DATA_CLASS,
    sourceRef,
    completedAt: progress?.completedAt instanceof Date
      ? progress.completedAt.toISOString()
      : progress?.completedAt || null,
    fieldValidation: "OPEN",
    businessExecution: false,
  };
}

/**
 * Marks one already assigned, elapsed agreement shift as a DEMO-only service
 * completion. It deliberately creates no GPS, boarding, payment or field
 * evidence. The explicit audit marker is the only evidence accepted by the
 * canonical DEMO income chain for TEST_SIMULATED records.
 */
export async function completeRoomTestSimulatedService({
  prisma,
  actor,
  shiftId,
  input = {},
  runtime = {},
  now = new Date(),
} = {}) {
  assertTestSimulationRuntime(runtime);
  const roomId = positiveId(actor?.roomId);
  if (normalizeUpper(actor?.role) !== "ROOM" || !roomId) {
    throw httpError(403, "TEST_SIMULATED_TENANT_SCOPE_REQUIRED", "Kontrollü DEMO hizmet kanıtı yalnızca yetkili ROOM kapsamından oluşturulabilir.");
  }
  const sourceRef = assertSimulationInput(input);
  const id = positiveId(shiftId);
  if (!id) throw httpError(400, "SHIFT_ID_REQUIRED", "Vardiya seçilmelidir.");
  if (!prisma?.$transaction || !prisma?.shift?.findUnique || !prisma?.shift?.update || !prisma?.shiftProgress?.upsert || !prisma?.auditLog?.create) {
    throw httpError(503, "TEST_SIMULATED_SERVICE_NOT_INSTALLED", "Kontrollü DEMO hizmet kanıtı bu çalışma ortamında hazır değil.");
  }

  return prisma.$transaction(async (tx) => {
    // Lock the shift before reading idempotency state or validating the current
    // status. This keeps two concurrent DEMO completion requests from both
    // observing the same APPROVED/ACTIVE shift and creating duplicate effects.
    if (typeof tx.$queryRaw === "function") {
      await tx.$queryRaw`SELECT "id" FROM "Shift" WHERE "id" = ${id} AND "roomId" = ${roomId} FOR UPDATE`;
    }
    const existing = typeof tx.auditLog.findFirst === "function"
      ? await tx.auditLog.findFirst({
        where: {
          action: TEST_SIMULATED_SERVICE_ACTION,
          entity: "Shift",
          entityId: id,
          meta: { path: ["sourceRef"], equals: sourceRef },
        },
        orderBy: { id: "desc" },
      })
      : null;
    const shift = await tx.shift.findUnique({
      where: { id },
      include: { agreement: true, progress: true },
    });
    if (!shift) throw httpError(404, "SHIFT_NOT_FOUND", "Vardiya bulunamadı.");
    if (positiveId(shift.roomId) !== roomId || positiveId(shift.agreement?.roomId) !== roomId) {
      throw httpError(403, "TEST_SIMULATED_TENANT_SCOPE_REQUIRED", "Bu vardiya ROOM kapsamınızda değil.");
    }
    if (existing) {
      return publicResult({ shift, progress: shift.progress, sourceRef, idempotent: true });
    }
    if (!positiveId(shift.agreementId) || !positiveId(shift.vehicleId) || !positiveId(shift.driverId)) {
      throw httpError(409, "TEST_SIMULATED_SHIFT_ASSIGNMENT_REQUIRED", "Kontrollü DEMO hizmet kanıtı için sözleşme, araç ve sürücü ataması gerekir.");
    }
    if (["CANCELLED", "REJECTED"].includes(normalizeUpper(shift.agreement?.status))) {
      throw httpError(409, "TEST_SIMULATED_AGREEMENT_STATE_INVALID", "İptal edilmiş veya reddedilmiş sözleşme için DEMO hizmet kanıtı oluşturulamaz.");
    }
    const endAt = new Date(shift.endAt);
    const nowDate = now instanceof Date ? now : new Date(now);
    if (!Number.isFinite(endAt.getTime()) || endAt > nowDate) {
      throw httpError(409, "TEST_SIMULATED_SHIFT_NOT_ELAPSED", "Vardiyanın planlanan bitiş zamanı henüz gelmedi.");
    }
    if (normalizeUpper(shift.status) === "DONE" || shift.progress?.completedAt) {
      throw httpError(409, "TEST_SIMULATED_SHIFT_ALREADY_COMPLETE", "Bu vardiya zaten tamamlanmış; yeni DEMO hizmet kanıtı oluşturulmadı.");
    }
    if (!["APPROVED", "ACTIVE"].includes(normalizeUpper(shift.status))) {
      throw httpError(409, "TEST_SIMULATED_SHIFT_STATE_INVALID", "Kontrollü DEMO hizmet kanıtı yalnızca onaylı veya aktif vardiyada kullanılabilir.");
    }

    const completedAt = nowDate;
    const progress = await tx.shiftProgress.upsert({
      where: { shiftId: id },
      update: { completedAt, pausedAt: null, startedAt: shift.progress?.startedAt || shift.startAt },
      create: { shiftId: id, lastReachedOrder: 0, startedAt: shift.startAt, pausedAt: null, completedAt },
    });
    const updatedShift = await tx.shift.update({ where: { id }, data: { status: "DONE" } });
    await tx.auditLog.create({
      data: {
        actorUserId: positiveId(actor.id) || null,
        actorRole: "ROOM",
        action: TEST_SIMULATED_SERVICE_ACTION,
        entity: "Shift",
        entityId: id,
        meta: {
          dataClass: TEST_SIMULATED_DATA_CLASS,
          sourceRef,
          roomId,
          agreementId: positiveId(shift.agreementId),
          vehicleId: positiveId(shift.vehicleId),
          driverId: positiveId(shift.driverId),
          businessExecution: false,
          fieldValidation: "OPEN",
          gpsEvent: false,
          checkinEvent: false,
          bankEvent: false,
        },
      },
    });
    return publicResult({ shift: { ...shift, ...updatedShift, status: "DONE" }, progress, sourceRef, idempotent: false });
  });
}
