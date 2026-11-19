const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE_STATUS = "ACTIVE";
const REVERSED_STATUS = "REVERSED";

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function dateKey(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const normalized = text(value).slice(0, 10);
  return DATE_PATTERN.test(normalized) ? normalized : null;
}

function dateValue(value) {
  const normalized = dateKey(value);
  return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null;
}

function errorWith(code, message, status = 400, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  Object.assign(error, details);
  return error;
}

export function validateIncomePeriodCorrection(input = {}) {
  const hakedisId = Number(input.hakedisId || 0);
  const recognizedPeriodStart = dateKey(input.recognizedPeriodStart);
  const recognizedPeriodEnd = dateKey(input.recognizedPeriodEnd);
  const evidenceRef = text(input.evidenceRef);
  const reason = text(input.reason);
  const idempotencyKey = text(input.idempotencyKey);

  if (!Number.isSafeInteger(hakedisId) || hakedisId <= 0) {
    throw errorWith("INCOME_PERIOD_SOURCE_REQUIRED", "Düzeltilecek hakediş kaydı seçilmelidir.");
  }
  if (!recognizedPeriodStart || !recognizedPeriodEnd || recognizedPeriodStart > recognizedPeriodEnd) {
    throw errorWith("INCOME_PERIOD_INVALID", "Yeni gelir dönemi geçerli bir başlangıç ve bitiş içermelidir.");
  }
  if (!evidenceRef || !reason) {
    throw errorWith("INCOME_PERIOD_EVIDENCE_REQUIRED", "Dönem düzeltmesi için kanıt referansı ve gerekçe gereklidir.");
  }
  if (evidenceRef.length > 240 || reason.length > 2000) {
    throw errorWith("INCOME_PERIOD_EVIDENCE_TOO_LONG", "Kanıt veya gerekçe çok uzun.");
  }
  if (!idempotencyKey || idempotencyKey.length > 160) {
    throw errorWith("INCOME_PERIOD_IDEMPOTENCY_REQUIRED", "Dönem düzeltmesi için işlem anahtarı gereklidir.");
  }
  return { hakedisId, recognizedPeriodStart, recognizedPeriodEnd, evidenceRef, reason, idempotencyKey };
}

export function resolveEffectiveIncomePeriod(source, correction = null) {
  const sourcePeriodStart = dateKey(source?.periodStart);
  const sourcePeriodEnd = dateKey(source?.periodEnd);
  const recognizedPeriodStart = dateKey(correction?.recognizedPeriodStart) || sourcePeriodStart;
  const recognizedPeriodEnd = dateKey(correction?.recognizedPeriodEnd) || sourcePeriodEnd;
  return {
    sourcePeriodStart,
    sourcePeriodEnd,
    recognizedPeriodStart,
    recognizedPeriodEnd,
    corrected: Boolean(correction && String(correction.status || ACTIVE_STATUS).toUpperCase() === ACTIVE_STATUS),
  };
}

export function shouldExcludeInvoiceForCorrectedHakedis(invoice, hakedis, correction = null) {
  if (!invoice || !hakedis || !correction) return false;
  if (String(correction.status || ACTIVE_STATUS).toUpperCase() !== ACTIVE_STATUS) return false;
  return Number(invoice.agreementId || 0) === Number(hakedis.agreementId || 0)
    && dateKey(invoice.periodStart) === dateKey(hakedis.periodStart)
    && dateKey(invoice.periodEnd) === dateKey(hakedis.periodEnd);
}

export async function applyIncomePeriodCorrection({ prisma, roomId, actorUserId, input }) {
  const normalized = validateIncomePeriodCorrection(input);
  const requestedRoomId = Number(roomId || 0);
  if (!Number.isSafeInteger(requestedRoomId) || requestedRoomId <= 0) {
    throw errorWith("INCOME_PERIOD_ROOM_REQUIRED", "ROOM kapsamı sunucudan doğrulanamadı.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const existingByKey = await tx.hakedisIncomePeriodCorrection.findUnique({
      where: { idempotencyKey: normalized.idempotencyKey },
    });
    if (existingByKey) {
      if (Number(existingByKey.roomId) !== requestedRoomId || Number(existingByKey.hakedisId) !== normalized.hakedisId) {
        throw errorWith("INCOME_PERIOD_IDEMPOTENCY_CONFLICT", "Bu işlem anahtarı başka bir ROOM veya gelir kaydı için kullanılmış.", 409);
      }
      return { correction: existingByKey, idempotent: true };
    }

    const source = await tx.hakedisRecord.findFirst({
      where: { id: normalized.hakedisId, roomId: requestedRoomId },
      select: { id: true, roomId: true, agreementId: true, periodStart: true, periodEnd: true, status: true, source: true },
    });
    if (!source) throw errorWith("INCOME_PERIOD_SOURCE_NOT_FOUND", "Bu ROOM kapsamında hakediş kaydı bulunamadı.", 404);
    if (!["READY", "FINALIZED"].includes(String(source.status || "").toUpperCase())) {
      throw errorWith("INCOME_PERIOD_SOURCE_NOT_CORRECTABLE", "Bu hakediş kaydı bu aşamada dönem düzeltmesine açık değil.", 409);
    }
    if (String(source.source || "").toUpperCase() !== "INTERNAL_ACTUAL") {
      throw errorWith("INCOME_PERIOD_SOURCE_NOT_AUTHORITATIVE", "Yalnız doğrulanmış gerçekleşmiş gelir kaynağı düzeltilebilir.", 409);
    }

    const active = await tx.hakedisIncomePeriodCorrection.findFirst({
      where: { hakedisId: source.id, roomId: requestedRoomId, status: ACTIVE_STATUS },
      orderBy: [{ version: "desc" }, { id: "desc" }],
    });
    if (active
      && dateKey(active.recognizedPeriodStart) === normalized.recognizedPeriodStart
      && dateKey(active.recognizedPeriodEnd) === normalized.recognizedPeriodEnd
      && active.evidenceRef === normalized.evidenceRef
      && active.reason === normalized.reason) {
      return { correction: active, idempotent: true };
    }

    const previousCorrectionId = active?.id || null;
    if (active) {
      await tx.hakedisIncomePeriodCorrection.update({
        where: { id: active.id },
        data: { status: REVERSED_STATUS },
      });
    }

    const correction = await tx.hakedisIncomePeriodCorrection.create({
      data: {
        hakedisId: source.id,
        roomId: requestedRoomId,
        sourcePeriodStart: source.periodStart,
        sourcePeriodEnd: source.periodEnd,
        recognizedPeriodStart: dateValue(normalized.recognizedPeriodStart),
        recognizedPeriodEnd: dateValue(normalized.recognizedPeriodEnd),
        evidenceRef: normalized.evidenceRef,
        reason: normalized.reason,
        idempotencyKey: normalized.idempotencyKey,
        status: ACTIVE_STATUS,
        version: (active?.version || 0) + 1,
        previousCorrectionId,
        createdByUserId: Number(actorUserId || 0) || null,
      },
    });
    return { correction, idempotent: false };
  });
}

export async function listIncomePeriodCorrections({ prisma, roomId, hakedisId = null } = {}) {
  const normalizedRoomId = Number(roomId || 0);
  if (!Number.isSafeInteger(normalizedRoomId) || normalizedRoomId <= 0) return [];
  return prisma.hakedisIncomePeriodCorrection.findMany({
    where: {
      roomId: normalizedRoomId,
      ...(Number(hakedisId || 0) > 0 ? { hakedisId: Number(hakedisId) } : {}),
    },
    orderBy: [{ hakedisId: "asc" }, { version: "desc" }, { id: "desc" }],
  });
}
