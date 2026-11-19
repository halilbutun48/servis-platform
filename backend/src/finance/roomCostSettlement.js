const STATUS_VALUES = new Set(["CONFIRMED", "CANCELLED"]);

export const SETTLEMENT_STATUS = Object.freeze({
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
});

function errorWith(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw errorWith(`${field.toUpperCase()}_REQUIRED`, `${field} geçerli olmalıdır.`);
  return id;
}

function positiveMinor(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw errorWith("SETTLEMENT_AMOUNT_REQUIRED", "Mahsup tutarı 0 TL'den büyük olmalıdır.");
  return amount;
}

function text(value, field, { required = false, max = 240, code = null } = {}) {
  const result = String(value ?? "").trim();
  if (required && !result) throw errorWith(code || `${field.toUpperCase()}_REQUIRED`, `${field} gereklidir.`);
  if (result.length > max) throw errorWith(`${field.toUpperCase()}_TOO_LONG`, `${field} çok uzun.`);
  return result;
}

function upper(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function normalizeSettlementRequest(input = {}) {
  const confirmed = input.confirmed === true || String(input.confirmed ?? "").toLowerCase() === "true";
  const confirmationToken = upper(input.confirmationToken);
  if (!confirmed || confirmationToken !== "MAHSUPLA") {
    throw errorWith("SETTLEMENT_CONFIRMATION_REQUIRED", "Mahsup kaydı için açık MAHSUPLA onayı gerekir.", 400);
  }
  const currencyCode = upper(input.currencyCode || "TRY");
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw errorWith("SETTLEMENT_CURRENCY_INVALID", "Para birimi geçerli olmalıdır.");
  const result = {
    accrualEntryId: positiveId(input.accrualEntryId, "accrualEntryId"),
    actualEntryId: positiveId(input.actualEntryId, "actualEntryId"),
    settledAmountMinor: positiveMinor(input.settledAmountMinor),
    currencyCode,
    settlementRef: text(input.settlementRef, "settlementRef", { required: true, max: 160, code: "SETTLEMENT_REF_REQUIRED" }),
    idempotencyKey: text(input.idempotencyKey, "idempotencyKey", { required: true, max: 160, code: "SETTLEMENT_IDEMPOTENCY_REQUIRED" }),
    evidenceRef: text(input.evidenceRef, "evidenceRef", { required: true, max: 240, code: "SETTLEMENT_EVIDENCE_REQUIRED" }),
    reason: text(input.reason, "reason", { required: true, max: 500, code: "SETTLEMENT_REASON_REQUIRED" }),
    confirmed: true,
    confirmationToken,
  };
  if (result.accrualEntryId === result.actualEntryId) throw errorWith("SETTLEMENT_SAME_ENTRY", "Tahakkuk ve gerçekleşen kayıt aynı olamaz.");
  return result;
}

function assertEntryShape(entry, expectedKind, code) {
  if (!entry || String(entry.recordKind || "").toUpperCase() !== expectedKind) throw errorWith(code, `${expectedKind === "ACCRUAL" ? "Karşılık" : "Gerçekleşen"} kaydı bulunamadı.`, 422);
  if (String(entry.lifecycle || "").toUpperCase() !== "CONFIRMED" || entry.isReversal === true) {
    throw errorWith("SETTLEMENT_SOURCE_NOT_CONFIRMED", "Mahsup yalnız onaylı ve ters kayıt olmayan kaynaklarla yapılabilir.", 422);
  }
}

export function assessSettlementRequest({ accrual, actual, input, existingSettlements = [] } = {}) {
  assertEntryShape(accrual, "ACCRUAL", "SETTLEMENT_ACCRUAL_REQUIRED");
  assertEntryShape(actual, "ACTUAL", "SETTLEMENT_ACTUAL_REQUIRED");
  if (Number(accrual.roomId) !== Number(actual.roomId)) throw errorWith("SETTLEMENT_TENANT_MISMATCH", "Tahakkuk ve gerçekleşen kayıt aynı ROOM kapsamına ait değil.", 403);
  if (upper(accrual.currencyCode || "TRY") !== upper(actual.currencyCode || "TRY") || upper(accrual.currencyCode || "TRY") !== input.currencyCode) {
    throw errorWith("SETTLEMENT_CURRENCY_MISMATCH", "Tahakkuk ve gerçekleşen kayıt aynı para biriminde olmalıdır.", 422);
  }
  const confirmedSettled = existingSettlements
    .filter((row) => STATUS_VALUES.has(upper(row?.status)) && upper(row?.status) === SETTLEMENT_STATUS.CONFIRMED)
    .reduce((total, row) => total + Number(row?.settledAmountMinor || 0), 0);
  const settledBeforeMinor = Number.isSafeInteger(confirmedSettled) ? confirmedSettled : 0;
  const remainingAccrualMinor = Number(accrual.amountMinor || 0) - settledBeforeMinor;
  const remainingActualMinor = Number(actual.amountMinor || 0) - settledBeforeMinor;
  if (remainingAccrualMinor < input.settledAmountMinor || remainingActualMinor < input.settledAmountMinor) {
    throw errorWith("SETTLEMENT_AMOUNT_EXCEEDS_REMAINING", "Mahsup tutarı kalan tahakkuk veya gerçekleşen tutarı aşamaz.", 409);
  }
  return {
    settledBeforeMinor,
    remainingAccrualMinor,
    remainingActualMinor,
    settledAmountMinor: input.settledAmountMinor,
    remainingAfterMinor: {
      accrual: remainingAccrualMinor - input.settledAmountMinor,
      actual: remainingActualMinor - input.settledAmountMinor,
    },
    noDoubleCount: true,
  };
}

export function buildSettlementLineage({ settlement, accrual, actual } = {}) {
  return {
    settlementId: settlement?.id ?? null,
    accrualEntryId: accrual?.id ?? settlement?.accrualEntryId ?? null,
    actualEntryId: actual?.id ?? settlement?.actualEntryId ?? null,
    sourceRefs: {
      accrual: accrual?.sourceRef || null,
      actual: actual?.sourceRef || null,
      settlement: settlement?.settlementRef || null,
    },
    periods: {
      accrual: {
        start: accrual?.periodStart || accrual?.occurredAt || null,
        end: accrual?.periodEnd || accrual?.occurredAt || null,
      },
      actual: {
        start: actual?.periodStart || actual?.occurredAt || null,
        end: actual?.periodEnd || actual?.occurredAt || null,
      },
    },
    noDoubleCount: true,
  };
}

function serializeEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    roomId: entry.roomId,
    categoryKey: entry.category?.key || null,
    categoryLabel: entry.category?.label || null,
    amountMinor: entry.amountMinor,
    currencyCode: entry.currencyCode,
    recordKind: entry.recordKind,
    lifecycle: entry.lifecycle,
    isReversal: Boolean(entry.isReversal),
    periodStart: entry.periodStart || null,
    periodEnd: entry.periodEnd || null,
    occurredAt: entry.occurredAt || null,
    vehicleId: entry.vehicleId || null,
    driverId: entry.driverId || null,
    agreementId: entry.agreementId || null,
    shiftId: entry.shiftId || null,
    sourceRef: entry.sourceRef || null,
    evidenceRef: entry.evidenceRef || null,
  };
}

function relationInclude() {
  return {
    category: { select: { key: true, label: true } },
  };
}

function settlementInclude() {
  return {
    accrualEntry: { include: relationInclude() },
    actualEntry: { include: relationInclude() },
  };
}

function serializeSettlement(row) {
  const accrual = serializeEntry(row.accrualEntry);
  const actual = serializeEntry(row.actualEntry);
  return {
    id: row.id,
    roomId: row.roomId,
    status: row.status,
    settledAmountMinor: row.settledAmountMinor,
    currencyCode: row.currencyCode,
    settlementRef: row.settlementRef,
    idempotencyKey: row.idempotencyKey,
    evidenceRef: row.evidenceRef,
    reason: row.reason,
    confirmedAt: row.confirmedAt || null,
    createdAt: row.createdAt || null,
    accrual,
    actual,
    lineage: buildSettlementLineage({ settlement: row, accrual, actual }),
  };
}

function candidateView(entry, settledMinor) {
  const amountMinor = Number(entry.amountMinor || 0);
  return {
    id: entry.id,
    categoryKey: entry.category?.key || null,
    categoryLabel: entry.category?.label || "Gider",
    amountMinor,
    settledMinor,
    outstandingMinor: Math.max(0, amountMinor - settledMinor),
    currencyCode: entry.currencyCode || "TRY",
    periodStart: entry.periodStart || entry.occurredAt || null,
    periodEnd: entry.periodEnd || entry.occurredAt || null,
    vehicleId: entry.vehicleId || null,
    driverId: entry.driverId || null,
    agreementId: entry.agreementId || null,
    shiftId: entry.shiftId || null,
    sourceRef: entry.sourceRef || null,
  };
}

async function findEntries(tx, roomId, { accrualEntryId, actualEntryId }) {
  const [accrual, actual] = await Promise.all([
    tx.roomCostEntry.findFirst({ where: { roomId, id: accrualEntryId }, include: relationInclude() }),
    tx.roomCostEntry.findFirst({ where: { roomId, id: actualEntryId }, include: relationInclude() }),
  ]);
  return { accrual, actual };
}

async function existingForPair(tx, roomId, { accrualEntryId, actualEntryId }) {
  return tx.roomCostSettlement.findMany({
    where: { roomId, OR: [{ accrualEntryId }, { actualEntryId }] },
    orderBy: { id: "asc" },
  });
}

async function recordAudit(tx, actor, action, entityId, meta) {
  if (!tx?.auditLog?.create) throw errorWith("AUDIT_REQUIRED", "Mahsup işlemi audit kaydı olmadan tamamlanamaz.", 500);
  await tx.auditLog.create({
    data: {
      actorUserId: Number(actor?.id) || null,
      actorRole: String(actor?.role || "").trim().toUpperCase() || null,
      action,
      entity: "RoomCostSettlement",
      entityId: entityId ?? null,
      meta,
    },
  });
}

export async function listCostSettlements({ roomId, prisma: providedPrisma, db } = {}) {
  const prisma = providedPrisma || db;
  if (!prisma?.roomCostSettlement?.findMany || !prisma?.roomCostEntry?.findMany) throw errorWith("SETTLEMENT_STORE_UNAVAILABLE", "Mahsup defteri kullanılamıyor.", 500);
  const requestedRoomId = positiveId(roomId, "roomId");
  const [items, entries] = await Promise.all([
    prisma.roomCostSettlement.findMany({ where: { roomId: requestedRoomId }, include: settlementInclude(), orderBy: { id: "desc" } }),
    prisma.roomCostEntry.findMany({ where: { roomId: requestedRoomId, lifecycle: "CONFIRMED", isReversal: false, recordKind: { in: ["ACCRUAL", "ACTUAL"] } }, include: relationInclude(), orderBy: { id: "desc" } }),
  ]);
  const settledByEntry = new Map();
  for (const row of items) {
    if (row.status !== SETTLEMENT_STATUS.CONFIRMED) continue;
    for (const id of [row.accrualEntryId, row.actualEntryId]) settledByEntry.set(id, (settledByEntry.get(id) || 0) + Number(row.settledAmountMinor || 0));
  }
  return {
    items: items.map(serializeSettlement),
    candidates: {
      accruals: entries.filter((entry) => entry.recordKind === "ACCRUAL").map((entry) => candidateView(entry, settledByEntry.get(entry.id) || 0)).filter((entry) => entry.outstandingMinor > 0),
      actuals: entries.filter((entry) => entry.recordKind === "ACTUAL").map((entry) => candidateView(entry, settledByEntry.get(entry.id) || 0)).filter((entry) => entry.outstandingMinor > 0),
    },
  };
}

export async function createCostSettlement({ actor, roomId, input = {}, prisma: providedPrisma, db } = {}) {
  const prisma = providedPrisma || db;
  if (!prisma?.$transaction) throw errorWith("SETTLEMENT_STORE_UNAVAILABLE", "Mahsup defteri kullanılamıyor.", 500);
  const requestedRoomId = positiveId(roomId, "roomId");
  const normalized = normalizeSettlementRequest(input);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.roomCostSettlement.findUnique({ where: { roomId_idempotencyKey: { roomId: requestedRoomId, idempotencyKey: normalized.idempotencyKey } }, include: settlementInclude() });
    if (existing) {
      const same = existing.accrualEntryId === normalized.accrualEntryId
        && existing.actualEntryId === normalized.actualEntryId
        && existing.settledAmountMinor === normalized.settledAmountMinor
        && existing.settlementRef === normalized.settlementRef;
      if (!same) throw errorWith("SETTLEMENT_IDEMPOTENCY_CONFLICT", "Aynı idempotency anahtarı farklı bir mahsup için kullanılamaz.", 409);
      return { settlement: serializeSettlement(existing), idempotent: true };
    }
    const { accrual, actual } = await findEntries(tx, requestedRoomId, normalized);
    const existingForSources = await existingForPair(tx, requestedRoomId, normalized);
    const assessment = assessSettlementRequest({ accrual, actual, input: normalized, existingSettlements: existingForSources });
    const settlement = await tx.roomCostSettlement.create({
      data: {
        roomId: requestedRoomId,
        accrualEntryId: normalized.accrualEntryId,
        actualEntryId: normalized.actualEntryId,
        settledAmountMinor: normalized.settledAmountMinor,
        currencyCode: normalized.currencyCode,
        settlementRef: normalized.settlementRef,
        idempotencyKey: normalized.idempotencyKey,
        evidenceRef: normalized.evidenceRef,
        reason: normalized.reason,
        status: SETTLEMENT_STATUS.CONFIRMED,
        createdByUserId: Number(actor?.id) || null,
        confirmedByUserId: Number(actor?.id) || null,
        confirmedAt: new Date(),
      },
      include: settlementInclude(),
    });
    await recordAudit(tx, actor, "ROOM_COST_ACCRUAL_SETTLED", settlement.id, {
      roomId: requestedRoomId,
      settlementId: settlement.id,
      accrualEntryId: normalized.accrualEntryId,
      actualEntryId: normalized.actualEntryId,
      settledAmountMinor: normalized.settledAmountMinor,
      currencyCode: normalized.currencyCode,
      settlementRef: normalized.settlementRef,
      evidenceRef: normalized.evidenceRef,
      reason: normalized.reason,
      remainingAfter: assessment.remainingAfterMinor,
    });
    return { settlement: serializeSettlement(settlement), assessment, idempotent: false };
  });
}
