import crypto from 'node:crypto';
import {
  ROOM_COST_CATEGORIES,
  ROOM_COST_CATEGORY_LABELS,
  isVatGrossOnly,
  isVatNetRollupEligible,
  normalizedVatClassification,
  validateCostInput,
} from './roomCostPolicy.js';
import { assertDriverCompensationAccess } from './roomCostAccess.js';
import { assertEconomicOwner } from './roomCostOwnership.js';
import { adaptLedgerEntriesToOperationalInputs, buildRoomPlanningEvidence } from './roomCostPreviewAdapter.js';
import { buildCanonicalDriverUsageRow, buildCanonicalFuelUsageRow, buildCanonicalVehicleUsageRow, buildCostAllocationProjection, buildWeightedUsageAllocationPlan, validateAllocationLineBudget, validateAllocationUsageEvidence } from './roomCostAllocation.js';
import { inspectCorrectionAuditIntegrity } from './roomCostIntegrity.js';

const ALLOCATION_MODES = ['DIRECT', 'COUNT_IN_ROLLUP', 'EXCLUDED_FROM_ROLLUP'];
const SALARY_CATEGORY_KEYS = new Set([
  'EMPLOYER_MONTHLY_COST',
  'BASE_SALARY',
  'BENEFIT',
  'OVERTIME',
  'PER_DIEM',
  'MEAL_ALLOWANCE',
  'SOCIAL_COST',
  'OTHER_DRIVER',
]);
const RECORD_KINDS = new Set(['ACTUAL', 'BUDGET', 'FORECAST', 'ACCRUAL']);
const AUTOMATIC_FUEL_CATEGORY = 'FUEL';
const AUTOMATIC_VEHICLE_KILOMETER_CATEGORIES = new Set(['FUEL', 'MAINTENANCE', 'TIRE_RIM']);
const AUTOMATIC_VEHICLE_FIXED_CATEGORIES = new Set([
  'DEPRECIATION',
  'MTV_TAX',
  'TRAFFIC_INSURANCE',
  'CASCO',
  'INSPECTION',
  'EMISSION_TEST',
  'MANDATORY_DOCUMENT',
  'FINANCE_CHARGE',
  'LEASING',
  'RENT',
  'GPS',
  'CAMERA',
  'VEHICLE_EQUIPMENT',
]);

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function errorWith(code, message, extras = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extras);
  return error;
}

function positiveId(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function entryDateValue(entry = {}) {
  return entry?.periodStart || entry?.occurredAt || entry?.periodEnd || null;
}

function isFutureDate(value, asOfDate = new Date()) {
  const candidate = toDate(value);
  const current = toDate(asOfDate);
  if (!candidate || !current) return false;
  candidate.setUTCHours(0, 0, 0, 0);
  current.setUTCHours(0, 0, 0, 0);
  return candidate.getTime() > current.getTime();
}

/**
 * A confirmed accounting row cannot be treated as realized merely because a
 * user or an old demo fixture labelled it ACTUAL. Future-dated rows remain
 * visible for planning, but are separated from realized totals without
 * changing the stored record or its audit trail.
 */
export function classifyFutureActualEntries(entries = [], { asOfDate = new Date() } = {}) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    if (
      String(entry?.recordKind || '').trim().toUpperCase() !== 'ACTUAL'
      || String(entry?.lifecycle || '').trim().toUpperCase() !== 'CONFIRMED'
      || !isFutureDate(entryDateValue(entry), asOfDate)
    ) return entry;
    return {
      ...entry,
      originalRecordKind: 'ACTUAL',
      recordKind: 'FORECAST',
      classificationReason: 'FUTURE_DATED_ACTUAL',
    };
  });
}

// Older DEMO ROOM tenants may predate the room-cost category catalog. Keep the
// catalog owned by the canonical ledger and provision only missing built-ins
// for the authenticated tenant; this never creates a financial entry.
async function ensureBuiltinCostCategories(prisma, roomId) {
  if (!prisma?.roomCostCategory?.findMany || !prisma?.roomCostCategory?.createMany) return;
  const existing = await prisma.roomCostCategory.findMany({
    where: { roomId: Number(roomId) },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((item) => String(item.key || '').trim().toUpperCase()));
  const missing = ROOM_COST_CATEGORIES
    .filter((key) => !existingKeys.has(key))
    .map((key) => ({
      roomId: Number(roomId),
      key,
      label: ROOM_COST_CATEGORY_LABELS[key] || key,
      kind: 'BUILT_IN',
      isActive: true,
    }));
  if (missing.length) await prisma.roomCostCategory.createMany({ data: missing, skipDuplicates: true });
}

function isPeriodicVehicleFuelEntry(entry = {}, category = entry.category) {
  return String(category?.key || entry?.categoryKey || '').trim().toUpperCase() === AUTOMATIC_FUEL_CATEGORY
    && String(entry?.recordKind || '').trim().toUpperCase() === 'ACTUAL'
    && String(entry?.occurrenceKind || '').trim().toUpperCase() === 'PERIODIC'
    && positiveId(entry?.vehicleId) !== null
    && positiveId(entry?.shiftId) === null;
}

function isPeriodicVehicleKilometerCostEntry(entry = {}, category = entry.category) {
  return AUTOMATIC_VEHICLE_KILOMETER_CATEGORIES.has(String(category?.key || entry?.categoryKey || '').trim().toUpperCase())
    && String(entry?.recordKind || '').trim().toUpperCase() === 'ACTUAL'
    && String(entry?.occurrenceKind || '').trim().toUpperCase() === 'PERIODIC'
    && positiveId(entry?.vehicleId) !== null
    && positiveId(entry?.shiftId) === null;
}

function isPeriodicVehicleFixedCostEntry(entry = {}, category = entry.category) {
  return AUTOMATIC_VEHICLE_FIXED_CATEGORIES.has(String(category?.key || entry?.categoryKey || '').trim().toUpperCase())
    && String(entry?.recordKind || '').trim().toUpperCase() === 'ACTUAL'
    && String(entry?.occurrenceKind || '').trim().toUpperCase() === 'PERIODIC'
    && positiveId(entry?.vehicleId) !== null
    && positiveId(entry?.shiftId) === null;
}

function isPeriodicDriverCostEntry(entry = {}, category = entry.category) {
  return SALARY_CATEGORY_KEYS.has(String(category?.key || entry?.categoryKey || '').trim().toUpperCase())
    && String(entry?.recordKind || '').trim().toUpperCase() === 'ACTUAL'
    && String(entry?.occurrenceKind || '').trim().toUpperCase() === 'PERIODIC'
    && positiveId(entry?.driverId) !== null
    && positiveId(entry?.shiftId) === null;
}

export function validateShiftAllocationRelations({ entry = {}, input = {}, shift = {} } = {}) {
  const inputVehicleId = positiveId(input.vehicleId);
  const inputDriverId = positiveId(input.driverId);
  const inputAgreementId = positiveId(input.agreementId);
  const shiftVehicleId = positiveId(shift.vehicleId);
  const shiftDriverId = positiveId(shift.driverId);
  const shiftAgreementId = positiveId(shift.agreementId);

  if (!inputVehicleId || !inputDriverId || !shiftVehicleId || !shiftDriverId) {
    throw errorWith(
      'ALLOCATION_TARGET_RELATIONS_REQUIRED',
      'Vardiya kullanım kanıtı araç ve sürücü ilişkilerini birlikte taşımalıdır.',
      { status: 400 },
    );
  }
  if (inputVehicleId !== shiftVehicleId || inputDriverId !== shiftDriverId) {
    throw errorWith(
      'ALLOCATION_TARGET_MISMATCH',
      'Dağıtım hedefi seçili vardiyanın araç veya sürücü ilişkisiyle eşleşmiyor.',
      { status: 409 },
    );
  }
  if (inputAgreementId !== shiftAgreementId) {
    throw errorWith(
      'ALLOCATION_TARGET_MISMATCH',
      'Dağıtım hedefi seçili vardiyanın sözleşme ilişkisiyle eşleşmiyor.',
      { status: 409 },
    );
  }

  const sourceAgreementId = positiveId(entry.agreementId);
  if (sourceAgreementId && sourceAgreementId !== shiftAgreementId) {
    throw errorWith(
      'ALLOCATION_SOURCE_AGREEMENT_SCOPE_MISMATCH',
      'Sözleşmeye özel gider, sözleşmesiz veya farklı sözleşmeli vardiyaya dağıtılamaz.',
      { status: 409 },
    );
  }
  for (const [entryKey, targetValue] of [['vehicleId', inputVehicleId], ['driverId', inputDriverId]]) {
    const sourceRelation = positiveId(entry?.[entryKey]);
    if (sourceRelation && sourceRelation !== targetValue) {
      throw errorWith(
        'ALLOCATION_SOURCE_TARGET_MISMATCH',
        'Dağıtım hedefi kaynak giderin araç veya sürücü ilişkisiyle eşleşmiyor.',
        { status: 409 },
      );
    }
  }
  return true;
}

function text(value) {
  const result = String(value ?? '').replace(/\s+/g, ' ').trim();
  return result || null;
}

const DRAFT_BATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertDraftBatchId(value) {
  const batchId = text(value);
  if (!batchId || !DRAFT_BATCH_ID_PATTERN.test(batchId)) {
    throw errorWith('BATCH_ID_INVALID', 'Toplu taslak kimliği geçersiz.', { status: 400 });
  }
  return batchId;
}

function assertBatchRoomActor(actor, roomId) {
  const requestedRoomId = assertRoomActor(actor, roomId);
  if (String(actor?.role || '').trim().toUpperCase() !== 'ROOM' || !positiveId(actor?.id)) {
    throw errorWith('BATCH_ROOM_USER_REQUIRED', 'Toplu gider taslağı yalnız doğrulanmış ROOM kullanıcısı için kullanılabilir.', { status: 403 });
  }
  return requestedRoomId;
}

function resolvePrisma(options = {}) {
  const prisma = options.prisma || options.db || options.tx;
  if (!prisma) throw errorWith('PRISMA_REQUIRED', 'ROOM maliyet servisi için veri erişim sahibi gerekir.', { status: 500 });
  return prisma;
}

function assertRoomActor(actor, roomId) {
  const requestedRoomId = positiveId(roomId);
  if (!requestedRoomId) throw errorWith('ROOM_REQUIRED', 'Geçerli ROOM kapsamı gerekir.', { status: 400 });
  const role = String(actor?.role || '').toUpperCase();
  const actorRoomId = positiveId(actor?.roomId);
  if (!['ROOM', 'SUPER_ADMIN'].includes(role) || (role === 'ROOM' && actorRoomId !== requestedRoomId)) {
    throw errorWith('ROOM_ACCESS_DENIED', 'Bu ROOM maliyet kapsamına erişim yetkiniz yok.', { status: 403 });
  }
  return requestedRoomId;
}

function salaryCategory(categoryKey) {
  return SALARY_CATEGORY_KEYS.has(String(categoryKey || '').toUpperCase());
}

async function assertSalaryIfNeeded({ actor, roomId, prisma, categoryKey, includeSalary = false }) {
  if (salaryCategory(categoryKey) || includeSalary) {
    await assertDriverCompensationAccess({ user: actor, roomId, prisma });
  }
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function displayDateTime(value) {
  const date = toDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(date);
}

function relationDisplay(entry) {
  return {
    vehicleLabel: entry?.vehicle?.plate ? `Araç • ${entry.vehicle.plate}` : null,
    driverLabel: entry?.driver?.fullName ? `Sürücü • ${entry.driver.fullName}` : null,
    agreementLabel: entry?.agreement
      ? `Sözleşme • ${displayDateTime(entry.agreement.startDate)?.split(' ')[0] || 'tarih yok'} – ${displayDateTime(entry.agreement.endDate)?.split(' ')[0] || 'tarih yok'}`
      : null,
    shiftLabel: entry?.shift
      ? `Vardiya • ${displayDateTime(entry.shift.startAt) || 'tarih yok'} – ${displayDateTime(entry.shift.endAt) || 'saat yok'}`
      : null,
  };
}

function serializeAllocationLine(line) {
  if (!line) return null;
  return {
    id: line.id,
    roomId: line.roomId,
    entryId: line.entryId,
    lineageKind: line.lineageKind,
    targetKind: line.targetKind,
    lineageKey: line.lineageKey,
    vehicleId: line.vehicleId ?? null,
    driverId: line.driverId ?? null,
    agreementId: line.agreementId ?? null,
    shiftId: line.shiftId ?? null,
    periodStart: toIso(line.periodStart),
    periodEnd: toIso(line.periodEnd),
    quantity: line.quantity == null ? null : String(line.quantity),
    unit: line.unit ?? null,
    unitRateMinor: line.unitRateMinor ?? null,
    allocatedAmountMinor: line.allocatedAmountMinor,
    currencyCode: line.currencyCode,
    sourceRef: line.sourceRef ?? null,
    evidenceRef: line.evidenceRef ?? null,
    display: relationDisplay(line),
  };
}

function safeAuditMeta({ roomId, entryId, version, recordKind }) {
  return { roomId, entryId: entryId ?? null, version: version ?? null, recordKind: recordKind ?? null };
}

async function recordAuditInTransaction(tx, { actor, action, entity = 'RoomCostEntry', entityId = null, meta = {} }) {
  if (!tx?.auditLog?.create) throw errorWith('AUDIT_REQUIRED', 'Toplu gider işlemi denetim kaydı olmadan tamamlanamaz.', { status: 500 });
  await tx.auditLog.create({
    data: {
      actorUserId: positiveId(actor?.id),
      actorRole: String(actor?.role || '').trim().toUpperCase() || null,
      action,
      entity,
      entityId: entityId ?? null,
      meta,
    },
  });
}

async function recordAudit({ audit, req, action, entryId, roomId, version, recordKind }) {
  if (typeof audit !== 'function') return;
  const payload = { action, entity: 'RoomCostEntry', entityId: entryId ?? null, meta: safeAuditMeta({ roomId, entryId, version, recordKind }) };
  try {
    if (req) await audit(req, payload);
    else await audit(payload);
  } catch {
    // Audit failures never turn a successful cost write into an implicit retry.
  }
}

async function findCategory(tx, roomId, input) {
  const categoryId = positiveId(input.categoryId);
  const categoryKey = text(input.categoryKey ?? input.category)?.toUpperCase();
  const category = categoryId
    ? await tx.roomCostCategory.findFirst({ where: { roomId, id: categoryId } })
    : categoryKey
      ? await tx.roomCostCategory.findFirst({ where: { roomId, key: categoryKey } })
      : null;
  if (!category || (categoryKey && String(category.key).toUpperCase() !== categoryKey)) {
    throw errorWith('ROOM_COST_RELATION_NOT_FOUND', 'ROOM maliyet ilişkisi bulunamadı.', { status: 404 });
  }
  if (!ROOM_COST_CATEGORIES.includes(String(category.key).toUpperCase())) {
    throw errorWith('CATEGORY_INVALID', 'ROOM maliyet kategorisi geçersiz.', { status: 400 });
  }
  return category;
}

async function findSameRoom(tx, model, roomId, id) {
  if (id == null) return null;
  const numericId = positiveId(id);
  if (!numericId) throw errorWith('ROOM_COST_RELATION_NOT_FOUND', 'ROOM maliyet ilişkisi bulunamadı.', { status: 404 });
  return tx[model].findFirst({
    where: { roomId, id: numericId },
    ...(model === 'vehicle' ? { select: roomCostVehicleSelectDb66() } : {}),
  });
}

async function resolveRelations(tx, roomId, input, { requireCategory = true } = {}) {
  const category = requireCategory ? await findCategory(tx, roomId, input) : null;
  const vehicle = await findSameRoom(tx, 'vehicle', roomId, input.vehicleId);
  if (input.vehicleId != null && !vehicle) throw errorWith('ROOM_COST_RELATION_NOT_FOUND', 'ROOM maliyet ilişkisi bulunamadı.', { status: 404 });
  const driver = await findSameRoom(tx, 'driver', roomId, input.driverId);
  if (input.driverId != null && !driver) throw errorWith('ROOM_COST_RELATION_NOT_FOUND', 'ROOM maliyet ilişkisi bulunamadı.', { status: 404 });
  const agreement = await findSameRoom(tx, 'agreement', roomId, input.agreementId);
  if (input.agreementId != null && !agreement) throw errorWith('ROOM_COST_RELATION_NOT_FOUND', 'ROOM maliyet ilişkisi bulunamadı.', { status: 404 });
  const shift = await findSameRoom(tx, 'shift', roomId, input.shiftId);
  if (input.shiftId != null && !shift) throw errorWith('ROOM_COST_RELATION_NOT_FOUND', 'ROOM maliyet ilişkisi bulunamadı.', { status: 404 });
  return { category, vehicle, driver, agreement, shift };
}

function readRelationMissing({ relation, entry, relationId = null }) {
  return errorWith(
    'ROOM_COST_READ_RELATION_MISSING',
    'ROOM maliyet kaydının ilişkili verisi doğrulanamadı; kayıt güvenli biçimde gösterilmedi.',
    { status: 409, relation, entryId: entry?.id ?? null, relationId },
  );
}

async function resolveReadRelations(tx, roomId, entry) {
  if (positiveId(entry?.roomId) !== roomId) throw readRelationMissing({ relation: 'room', entry, relationId: entry?.roomId });

  const categoryId = positiveId(entry?.categoryId);
  const category = categoryId ? await tx.roomCostCategory.findFirst({ where: { roomId, id: categoryId } }) : null;
  if (!category || positiveId(category.roomId) !== roomId || positiveId(category.id) !== categoryId) {
    throw readRelationMissing({ relation: 'category', entry, relationId: entry?.categoryId });
  }

  const relations = { category, vehicle: null, driver: null, agreement: null, shift: null };
  for (const [relation, model] of [['vehicle', 'vehicle'], ['driver', 'driver'], ['agreement', 'agreement'], ['shift', 'shift']]) {
    const relationId = entry?.[`${relation}Id`];
    const numericId = relationId == null ? null : positiveId(relationId);
    const value = numericId
      ? await tx[model].findFirst({
        where: { roomId, id: numericId },
        ...(model === 'vehicle' ? { select: roomCostVehicleSelectDb66() } : {}),
      })
      : null;
    if (relationId != null && !numericId) throw readRelationMissing({ relation, entry, relationId });
    if (relationId != null && (!value || positiveId(value.roomId) !== roomId || positiveId(value.id) !== numericId)) {
      throw readRelationMissing({ relation, entry, relationId });
    }
    relations[relation] = value;
  }

  const allocationLines = Array.isArray(entry?.allocationLines) ? entry.allocationLines : [];
  for (const allocationLine of allocationLines) {
    if (positiveId(allocationLine?.roomId) !== roomId || positiveId(allocationLine?.entryId) !== positiveId(entry?.id)) {
      throw readRelationMissing({ relation: 'allocationLine', entry, relationId: allocationLine?.id });
    }
  }
  relations.allocationLines = allocationLines;

  if (entry?.reversalOfEntryId != null) {
    const reversalId = positiveId(entry.reversalOfEntryId);
    const source = reversalId ? await tx.roomCostEntry.findFirst({ where: { roomId, id: reversalId } }) : null;
    if (!source || positiveId(source.roomId) !== roomId || positiveId(source.id) !== reversalId || source.lifecycle !== 'CONFIRMED') {
      throw readRelationMissing({ relation: 'reversalSource', entry, relationId: entry.reversalOfEntryId });
    }
    relations.reversalSource = source;
  }
  return relations;
}

export function inferDefaultAllocation(input = {}, recordKind = input.recordKind) {
  const normalizedRecordKind = String(recordKind || '').trim().toUpperCase();
  const explicitAllocation = String(input.allocation || '').trim().toUpperCase();
  if (explicitAllocation) return explicitAllocation;
  const hasOwnerScope = positiveId(input.vehicleId) || positiveId(input.driverId);
  const hasDirectShift = positiveId(input.shiftId);
  return normalizedRecordKind === 'ACTUAL' && hasOwnerScope && !hasDirectShift
    ? 'COUNT_IN_ROLLUP'
    : 'DIRECT';
}

function validateEntryInput(input, { allowIncomplete = false } = {}) {
  const source = { ...input, lifecycleState: 'DRAFT' };
  const result = validateCostInput(source);
  const missing = [...result.missing];
  const blockers = [...result.blockers];
  const recordKind = result.normalized.recordKind;
  const allocation = inferDefaultAllocation(input, recordKind);
  if (!ALLOCATION_MODES.includes(allocation)) blockers.push('ALLOCATION_INVALID');
  if (allocation === 'COUNT_IN_ROLLUP' && !text(input.sourceRef)) missing.push('sourceRef');
  if (!allowIncomplete && (missing.length || blockers.length)) {
    throw errorWith('COST_INPUT_INCOMPLETE', 'ROOM maliyet kaydı eksik veya geçersiz.', { status: 400, missing, blockers });
  }
  return { ...result, missing, blockers, allocation };
}

export function roomCostInputMissingFields(input = {}) {
  const recordKind = String(input?.recordKind || 'ACTUAL').trim().toUpperCase();
  const allocation = inferDefaultAllocation(input, recordKind);
  return allocation === 'COUNT_IN_ROLLUP' && !text(input?.sourceRef) ? ['sourceRef'] : [];
}

function inputFromEntry(entry) {
  return {
    categoryId: entry.categoryId,
    categoryKey: entry.category?.key,
    vehicleId: entry.vehicleId,
    driverId: entry.driverId,
    agreementId: entry.agreementId,
    shiftId: entry.shiftId,
    occurredAt: entry.occurredAt,
    periodStart: entry.periodStart,
    periodEnd: entry.periodEnd,
    amountMinor: entry.amountMinor,
    currencyCode: entry.currencyCode,
    vatMode: entry.vatMode,
    vatAmountMinor: entry.vatAmountMinor,
    vatClassification: entry.vatClassification,
    vatDeductibility: entry.vatDeductibility,
    vatEvidenceRef: entry.vatEvidenceRef,
    vatClassificationReason: entry.vatClassificationReason,
    recordKind: entry.recordKind,
    occurrenceKind: entry.occurrenceKind,
    allocation: entry.allocation,
    allocationQuantity: entry.allocationQuantity,
    allocationUnit: entry.allocationUnit,
    allocationUnitRateMinor: entry.allocationUnitRateMinor,
    evidenceRef: entry.evidenceRef,
    sourceRef: entry.sourceRef,
    sourceType: entry.sourceType,
    description: entry.description,
    isReversal: entry.isReversal,
    reversalOfEntryId: entry.reversalOfEntryId,
  };
}

async function assertNoDuplicateRollup(tx, roomId, input, excludeId = null, allowedReversalSourceId = null, allowedLineageIds = []) {
  if (String(input.allocation || 'DIRECT').toUpperCase() !== 'COUNT_IN_ROLLUP' || !text(input.sourceRef)) return;
  const rows = await tx.roomCostEntry.findMany({
    where: {
      roomId,
      sourceRef: text(input.sourceRef),
      periodStart: input.periodStart ? toDate(input.periodStart) : null,
      periodEnd: input.periodEnd ? toDate(input.periodEnd) : null,
      allocation: 'COUNT_IN_ROLLUP',
      lifecycle: { not: 'CANCELLED' },
    },
  });
  const allowedIds = new Set([
    excludeId,
    allowedReversalSourceId,
    ...(Array.isArray(allowedLineageIds) ? allowedLineageIds : [...(allowedLineageIds || [])]),
  ].map((value) => positiveId(value)).filter(Boolean));
  if (rows.some((row) => !allowedIds.has(row.id))) {
    throw errorWith('DUPLICATE_ROLLUP_SOURCE', 'Aynı kaynak dönemi ikinci kez toplam maliyete eklenemez.', { status: 409 });
  }
}

async function assertNoDuplicateSourceRef(tx, roomId, input, categoryId, excludeId = null) {
  const sourceRef = text(input.sourceRef);
  if (!sourceRef || input.isReversal || String(input.allocation || 'DIRECT').toUpperCase() === 'COUNT_IN_ROLLUP') return;
  const rows = await tx.roomCostEntry.findMany({
    where: {
      roomId,
      categoryId,
      recordKind: String(input.recordKind || 'ACTUAL').toUpperCase(),
      sourceRef,
      lifecycle: { not: 'CANCELLED' },
    },
  });
  if (rows.some((row) => row.id !== excludeId)) {
    throw errorWith('DUPLICATE_SOURCE_REF', 'Aynı kaynak referansı bu gider türünde ikinci kez kullanılamaz.', { status: 409 });
  }
}

function sameDateValue(left, right) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  return (leftDate?.getTime() ?? null) === (rightDate?.getTime() ?? null);
}

async function resolveReversal(tx, roomId, normalized, categoryId = null) {
  if (!normalized.isReversal) return null;
  const source = await findSameRoom(tx, 'roomCostEntry', roomId, normalized.reversalOfEntryId);
  if (!source || source.lifecycle !== 'CONFIRMED') throw errorWith('REVERSAL_LINEAGE_INVALID', 'Düzeltme kaynağı aynı ROOM içinde doğrulanmış olmalıdır.', { status: 409 });
  const requiresRollupLineage = source.allocation === 'COUNT_IN_ROLLUP' || String(normalized.allocation || 'DIRECT').toUpperCase() === 'COUNT_IN_ROLLUP';
  const sameRollupLineage = source.allocation === String(normalized.allocation || 'DIRECT').toUpperCase()
    && source.sourceRef === text(normalized.sourceRef)
    && sameDateValue(source.periodStart, normalized.periodStart)
    && sameDateValue(source.periodEnd, normalized.periodEnd);
  if (requiresRollupLineage && ((categoryId != null && source.categoryId !== categoryId) || !sameRollupLineage)) {
    throw errorWith('REVERSAL_LINEAGE_INVALID', 'Düzeltme kaynağı aynı kategori ve kaynak dönemine ait olmalıdır.', { status: 409 });
  }
  return source;
}

function serializeCategory(category) {
  return { id: category.id, roomId: category.roomId, key: category.key, label: category.label, kind: category.kind, isActive: category.isActive };
}

function serializeEntry(entry, category, { salaryAuthorized = false } = {}) {
  const categoryKey = String(category?.key || entry.categoryKey || '').toUpperCase();
  if (salaryCategory(categoryKey) && !salaryAuthorized) throw errorWith('ROOM_FINANCE_SALARY_REQUIRED', 'Bu sürücü maliyeti ayrıntısını görme yetkiniz yok.', { status: 403 });
  return {
    id: entry.id,
    roomId: entry.roomId,
    categoryId: entry.categoryId,
    categoryKey,
    vehicleId: entry.vehicleId ?? null,
    driverId: entry.driverId ?? null,
    agreementId: entry.agreementId ?? null,
    shiftId: entry.shiftId ?? null,
    occurredAt: toIso(entry.occurredAt),
    periodStart: toIso(entry.periodStart),
    periodEnd: toIso(entry.periodEnd),
    amountMinor: entry.amountMinor,
    currencyCode: entry.currencyCode,
    vatMode: entry.vatMode,
    vatAmountMinor: isVatGrossOnly(entry) ? null : (entry.vatAmountMinor ?? null),
    vatClassification: normalizedVatClassification(entry),
    vatDeductibility: entry.vatDeductibility || "UNKNOWN",
    vatEvidenceRef: entry.vatEvidenceRef ?? null,
    vatClassificationReason: entry.vatClassificationReason ?? null,
    grossVisible: isVatGrossOnly(entry),
    netRollupEligible: isVatNetRollupEligible(entry),
    recordKind: entry.recordKind,
    occurrenceKind: entry.occurrenceKind,
    allocation: entry.allocation,
    allocationQuantity: entry.allocationQuantity == null ? null : String(entry.allocationQuantity),
    allocationUnit: entry.allocationUnit ?? null,
    allocationUnitRateMinor: entry.allocationUnitRateMinor ?? null,
    evidenceRef: entry.evidenceRef ?? null,
    sourceRef: entry.sourceRef ?? null,
    sourceType: entry.sourceType ?? null,
    draftBatchId: entry.draftBatchId ?? null,
    description: entry.description ?? null,
    lifecycle: entry.lifecycle,
    version: entry.version,
    isReversal: Boolean(entry.isReversal),
    reversalOfEntryId: entry.reversalOfEntryId ?? null,
    confirmedAt: toIso(entry.confirmedAt),
    createdAt: toIso(entry.createdAt),
    updatedAt: toIso(entry.updatedAt),
    categoryLabel: category?.label || categoryKey,
    display: relationDisplay(entry),
    allocationLines: Array.isArray(entry.allocationLines) ? entry.allocationLines.map(serializeAllocationLine).filter(Boolean) : [],
    correctionHistory: entry.correctionHistory || null,
    salaryRedacted: false,
  };
}

function roomCostVehicleSelectDb66() {
  return {
    id: true,
    roomId: true,
    plate: true,
    capacity: true,
    status: true,
    speedLimitKmh: true,
    driverId: true,
    type: true,
    brand: true,
    model: true,
    modelYear: true,
    color: true,
    vin: true,
    note: true,
    inspectionDueAt: true,
    insuranceDueAt: true,
    cascoDueAt: true,
    lastServiceAt: true,
    lastServiceKm: true,
    serviceIntervalKm: true,
    serviceIntervalDays: true,
    odometerKm: true,
    odometerUpdatedAt: true,
    odometerSource: true,
    nextMaintenanceAt: true,
    archivedAt: true,
    archivedReason: true,
    createdAt: true,
  };
}

function relationInclude() {
  return {
    category: true,
    vehicle: { select: roomCostVehicleSelectDb66() },
    driver: true,
    agreement: true,
    shift: true,
    allocationLines: {
      include: { vehicle: { select: roomCostVehicleSelectDb66() }, driver: true, agreement: true, shift: true },
    },
    reversals: {
      select: { id: true, amountMinor: true, lifecycle: true, isReversal: true, reversalOfEntryId: true, createdAt: true },
    },
  };
}

function correctionSnapshot(row, salaryAuthorized) {
  if (!row) return null;
  const serialized = serializeEntry(row, row.category, { salaryAuthorized });
  return {
    id: serialized.id,
    categoryKey: serialized.categoryKey,
    categoryLabel: serialized.categoryLabel,
    amountMinor: serialized.amountMinor,
    currencyCode: serialized.currencyCode,
    vatMode: serialized.vatMode,
    vatClassification: serialized.vatClassification,
    vatDeductibility: serialized.vatDeductibility,
    vatEvidenceRef: serialized.vatEvidenceRef,
    vatClassificationReason: serialized.vatClassificationReason,
    recordKind: serialized.recordKind,
    occurredAt: serialized.occurredAt,
    periodStart: serialized.periodStart,
    periodEnd: serialized.periodEnd,
    vehicleId: serialized.vehicleId,
    driverId: serialized.driverId,
    description: serialized.description,
    sourceRef: serialized.sourceRef,
    version: serialized.version,
  };
}

async function loadCorrectionHistory(prisma, roomId, salaryAuthorized) {
  const historyByReplacementId = new Map();
  if (!prisma?.auditLog?.findMany) return historyByReplacementId;

  const roomEntries = await prisma.roomCostEntry.findMany({ where: { roomId }, select: { id: true } });
  const roomEntryIds = roomEntries.map((entry) => entry.id).filter((id) => positiveId(id));
  if (!roomEntryIds.length) return historyByReplacementId;

  const audits = await prisma.auditLog.findMany({
    where: {
      entity: 'RoomCostEntryCorrection',
      action: 'ROOM_COST_CORRECTION_APPLIED',
      entityId: { in: roomEntryIds },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!audits.length) return historyByReplacementId;

  const relatedIds = new Set();
  for (const audit of audits) {
    const meta = audit?.meta && typeof audit.meta === 'object' ? audit.meta : {};
    for (const value of [meta.originalEntryId, meta.reversalEntryId, meta.replacementEntryId, audit.entityId]) {
      const id = positiveId(value);
      if (id) relatedIds.add(id);
    }
  }
  const relatedRows = relatedIds.size
    ? await prisma.roomCostEntry.findMany({ where: { roomId, id: { in: [...relatedIds] } }, include: relationInclude() })
    : [];
  const rowsById = new Map(relatedRows.map((row) => [row.id, row]));
  const actorIds = [...new Set(audits.map((audit) => positiveId(audit?.actorUserId)).filter(Boolean))];
  const actors = prisma.user?.findMany && actorIds.length
    ? await prisma.user.findMany({ where: { roomId, id: { in: actorIds } }, select: { id: true, fullName: true, email: true } })
    : [];
  const actorNames = new Map(actors.map((actor) => [actor.id, actor.fullName || actor.email || 'Yetkili ROOM kullanıcısı']));

  for (const audit of audits) {
    const meta = audit?.meta && typeof audit.meta === 'object' ? audit.meta : {};
    const originalEntryId = positiveId(meta.originalEntryId ?? audit.entityId);
    const reversalEntryId = positiveId(meta.reversalEntryId);
    const replacementEntryId = positiveId(meta.replacementEntryId);
    const original = rowsById.get(originalEntryId);
    const reversal = rowsById.get(reversalEntryId);
    const replacement = rowsById.get(replacementEntryId);
    if (!original || !reversal || !replacement || !reversal.isReversal || replacement.isReversal) continue;

    historyByReplacementId.set(replacementEntryId, {
      status: 'CORRECTED',
      originalEntryId,
      reversalEntryId,
      replacementEntryId,
      correctionRef: meta.correctionRef || null,
      previousVersion: meta.previousVersion ?? null,
      nextVersion: meta.nextVersion ?? null,
      changedFields: Array.isArray(meta.changedFields) ? meta.changedFields : [],
      correctedAt: toIso(audit.createdAt),
      correctedByUserId: positiveId(audit.actorUserId),
      correctedByName: actorNames.get(positiveId(audit.actorUserId)) || 'Yetkili ROOM kullanıcısı',
      original: correctionSnapshot(original, salaryAuthorized),
      current: correctionSnapshot(replacement, salaryAuthorized),
    });
  }
  return historyByReplacementId;
}

export function buildCorrectionListView(rows = [], correctionHistoryByReplacementId = new Map()) {
  const hiddenIds = new Set();
  for (const row of rows) {
    if (row?.isReversal) hiddenIds.add(row.id);
    if (Array.isArray(row?.reversals) && row.reversals.length) {
      hiddenIds.add(row.id);
      for (const reversal of row.reversals) hiddenIds.add(reversal.id);
    }
  }
  return rows
    .filter((row) => !hiddenIds.has(row?.id))
    .map((row) => {
      const correctionHistory = correctionHistoryByReplacementId.get(row?.id);
      return correctionHistory ? { ...row, correctionHistory } : row;
    });
}

export function buildCorrectionAccountingView(rows = [], correctionHistoryByReplacementId = new Map()) {
  const hiddenIds = new Set();
  for (const history of correctionHistoryByReplacementId.values()) {
    const originalId = positiveId(history?.originalEntryId);
    const reversalId = positiveId(history?.reversalEntryId);
    if (originalId) hiddenIds.add(originalId);
    if (reversalId) hiddenIds.add(reversalId);
  }
  return rows.filter((row) => !hiddenIds.has(row?.id));
}

export function buildRoomCostEntryWhere(roomId, filters = {}, { includeSalary = false, lifecycle = null } = {}) {
  const where = { roomId };
  if (lifecycle) where.lifecycle = lifecycle;
  else if (!filters.includeCancelled) where.lifecycle = { not: 'CANCELLED' };
  const ownerScopeClauses = [];
  if (filters.vehicleId != null) {
    const vehicleId = positiveId(filters.vehicleId);
    ownerScopeClauses.push({
      OR: [
        { vehicleId },
        {
          allocationLines: {
            some: {
              OR: [
                { vehicleId },
                { shift: { vehicleId } },
              ],
            },
          },
        },
      ],
    });
  }
  if (filters.driverId != null) {
    const driverId = positiveId(filters.driverId);
    ownerScopeClauses.push({
      OR: [
        { driverId },
        {
          allocationLines: {
            some: {
              OR: [
                { driverId },
                { shift: { driverId } },
              ],
            },
          },
        },
      ],
    });
  }
  if (ownerScopeClauses.length) where.AND = ownerScopeClauses;
  if (filters.categoryKey) where.category = { key: { equals: String(filters.categoryKey).toUpperCase() } };
  const periodStart = filters.periodStart ? toDate(filters.periodStart) : null;
  const periodEnd = filters.periodEnd ? toDate(filters.periodEnd) : null;
  if (periodStart || periodEnd) {
    const oneOff = {
      occurredAt: {
        ...(periodStart ? { gte: periodStart } : {}),
        ...(periodEnd ? { lte: periodEnd } : {}),
      },
      periodStart: null,
      periodEnd: null,
    };
    const periodic = {
      ...(periodStart ? { periodEnd: { gte: periodStart } } : {}),
      ...(periodEnd ? { periodStart: { lte: periodEnd } } : {}),
    };
    where.OR = [oneOff, periodic];
  }
  if (filters.recordKind) where.recordKind = String(filters.recordKind).toUpperCase();
  if (filters.sourceRef) where.sourceRef = text(filters.sourceRef);
  if (!includeSalary) {
    const category = where.category || {};
    where.category = { ...category, key: { ...(category.key || {}), notIn: [...SALARY_CATEGORY_KEYS] } };
  }
  return where;
}

async function listRawEntries({ actor, roomId, filters = {}, prisma, lifecycle = null }) {
  const requestedRoomId = assertRoomActor(actor, roomId);
  const includeSalary = filters.includeSalary === true;
  await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma, categoryKey: filters.categoryKey, includeSalary });
  const rows = await prisma.roomCostEntry.findMany({
    where: buildRoomCostEntryWhere(requestedRoomId, filters, { includeSalary, lifecycle }),
    include: relationInclude(),
    orderBy: { occurredAt: 'desc' },
  });
  const verifiedRows = [];
  for (const row of rows) {
    const relations = await resolveReadRelations(prisma, requestedRoomId, row);
    verifiedRows.push({ ...row, ...relations });
  }
  return { rows: verifiedRows, roomId: requestedRoomId, salaryAuthorized: includeSalary };
}

async function updateEntryWithVersion(tx, roomId, id, version, data) {
  try {
    return await tx.roomCostEntry.update({
      where: { roomId_id: { roomId, id }, version },
      data,
    });
  } catch (error) {
    if (error?.code === 'P2025') throw errorWith('VERSION_CONFLICT', 'ROOM maliyet taslağı güncel değil.', { status: 409 });
    throw error;
  }
}

export async function listCostCategories({ actor, roomId, includeInactive = false, includeSalary = false, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma, includeSalary });
  await ensureBuiltinCostCategories(prisma, requestedRoomId);
  const where = { roomId: requestedRoomId, ...(includeInactive ? {} : { isActive: true }) };
  if (!includeSalary) where.key = { notIn: [...SALARY_CATEGORY_KEYS] };
  const categories = await prisma.roomCostCategory.findMany({ where, orderBy: { key: 'asc' } });
  return categories.map(serializeCategory);
}

export async function createCostDraft({ actor, roomId, input = {}, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  await ensureBuiltinCostCategories(prisma, requestedRoomId);
  const validation = validateEntryInput(input);
  const categoryKey = validation.normalized.categoryKey || text(input.categoryKey)?.toUpperCase();
  await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma, categoryKey });
  const result = await prisma.$transaction(async (tx) => {
    const relations = await resolveRelations(tx, requestedRoomId, { ...input, categoryKey });
    assertEconomicOwner({ categoryKey: relations.category.key, vehicleId: input.vehicleId, driverId: input.driverId, shiftId: input.shiftId });
    if (salaryCategory(relations.category.key) && !input.driverId) throw errorWith('DRIVER_REQUIRED', 'Sürücü maliyeti aynı ROOM içindeki sürücüye bağlanmalıdır.', { status: 400 });
    await assertNoDuplicateSourceRef(tx, requestedRoomId, { ...input, recordKind: validation.normalized.recordKind }, relations.category.id);
    const reversal = await resolveReversal(tx, requestedRoomId, {
      ...validation.normalized,
      allocation: validation.allocation,
      sourceRef: text(input.sourceRef),
    }, relations.category.id);
    await assertNoDuplicateRollup(tx, requestedRoomId, { ...input, allocation: validation.allocation }, null, reversal?.id ?? null);
    const row = await tx.roomCostEntry.create({ data: {
      roomId: requestedRoomId,
      categoryId: relations.category.id,
      vehicleId: positiveId(input.vehicleId),
      driverId: positiveId(input.driverId),
      agreementId: positiveId(input.agreementId),
      shiftId: positiveId(input.shiftId),
      occurredAt: validation.normalized.occurredAt ? toDate(validation.normalized.occurredAt) : null,
      periodStart: validation.normalized.periodStart ? toDate(validation.normalized.periodStart) : null,
      periodEnd: validation.normalized.periodEnd ? toDate(validation.normalized.periodEnd) : null,
      amountMinor: validation.normalized.amountMinor,
      currencyCode: validation.normalized.currencyCode,
      vatMode: validation.normalized.vatMode,
      vatAmountMinor: validation.normalized.vatAmountMinor ?? null,
      vatClassification: validation.normalized.vatClassification,
      vatDeductibility: validation.normalized.vatDeductibility,
      vatEvidenceRef: validation.normalized.vatEvidenceRef ?? null,
      vatClassificationReason: validation.normalized.vatClassificationReason ?? null,
      recordKind: validation.normalized.recordKind,
      occurrenceKind: validation.normalized.occurrenceKind,
      allocation: validation.allocation,
      allocationQuantity: validation.normalized.allocationQuantity ?? null,
      allocationUnit: validation.normalized.allocationUnit ?? null,
      allocationUnitRateMinor: validation.normalized.allocationUnitRateMinor ?? null,
      evidenceRef: text(input.evidenceRef),
      sourceRef: text(input.sourceRef),
      sourceType: text(input.sourceType),
      description: text(input.description),
      lifecycle: 'DRAFT',
      version: 1,
      isReversal: Boolean(validation.normalized.isReversal),
      reversalOfEntryId: reversal?.id ?? null,
      createdByUserId: positiveId(actor?.id),
      updatedByUserId: positiveId(actor?.id),
    } });
    return { row, category: relations.category };
  });
  const serialized = serializeEntry(result.row, result.category, { salaryAuthorized: salaryCategory(result.category.key) });
  await recordAudit({ audit, req, action: 'ROOM_COST_DRAFT_CREATED', entryId: serialized.id, roomId: requestedRoomId, version: serialized.version, recordKind: serialized.recordKind });
  return serialized;
}

export async function updateCostDraft({ actor, roomId, draftId, version, input = {}, expectedDraftBatchId = null, expectedCreatedByUserId = null, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(draftId);
  if (!id || !Number.isSafeInteger(Number(version))) throw errorWith('VERSION_REQUIRED', 'Taslak sürümü gerekir.', { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.roomCostEntry.findFirst({ where: { roomId: requestedRoomId, id } });
    if (!existing) throw errorWith('ROOM_COST_NOT_FOUND', 'ROOM maliyet kaydı bulunamadı.', { status: 404 });
    if (expectedDraftBatchId != null && existing.draftBatchId !== assertDraftBatchId(expectedDraftBatchId)) throw errorWith('BATCH_ROW_NOT_FOUND', 'Toplu taslak satırı bulunamadı.', { status: 404 });
    if (expectedCreatedByUserId != null && existing.createdByUserId !== positiveId(expectedCreatedByUserId)) throw errorWith('BATCH_ROW_NOT_FOUND', 'Toplu taslak satırı bu kullanıcıya ait değil.', { status: 404 });
    if (existing.lifecycle !== 'DRAFT') throw errorWith('CONFIRMED_ENTRY_IMMUTABLE', 'Doğrulanmış maliyet kaydı değiştirilemez.', { status: 409 });
    if (existing.version !== Number(version)) throw errorWith('VERSION_CONFLICT', 'ROOM maliyet taslağı güncel değil.', { status: 409 });
    const existingCategory = await findCategory(tx, requestedRoomId, { categoryId: existing.categoryId });
    const mergedInput = { ...inputFromEntry({ ...existing, category: existingCategory }), ...input, categoryKey: input.categoryKey || existingCategory.key };
    const validation = validateEntryInput(mergedInput);
    const relations = await resolveRelations(tx, requestedRoomId, mergedInput);
    assertEconomicOwner({ categoryKey: relations.category.key, vehicleId: mergedInput.vehicleId, driverId: mergedInput.driverId, shiftId: mergedInput.shiftId });
    await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: relations.category.key });
    await assertNoDuplicateSourceRef(tx, requestedRoomId, mergedInput, relations.category.id, id);
    const reversal = await resolveReversal(tx, requestedRoomId, {
      ...validation.normalized,
      allocation: validation.allocation,
      sourceRef: text(mergedInput.sourceRef),
    }, relations.category.id);
    await assertNoDuplicateRollup(tx, requestedRoomId, { ...mergedInput, allocation: validation.allocation }, id, reversal?.id ?? null);
    const row = await updateEntryWithVersion(tx, requestedRoomId, id, Number(version), {
      categoryId: relations.category.id,
      vehicleId: positiveId(mergedInput.vehicleId),
      driverId: positiveId(mergedInput.driverId),
      agreementId: positiveId(mergedInput.agreementId),
      shiftId: positiveId(mergedInput.shiftId),
      occurredAt: validation.normalized.occurredAt ? toDate(validation.normalized.occurredAt) : null,
      periodStart: validation.normalized.periodStart ? toDate(validation.normalized.periodStart) : null,
      periodEnd: validation.normalized.periodEnd ? toDate(validation.normalized.periodEnd) : null,
      amountMinor: validation.normalized.amountMinor,
      currencyCode: validation.normalized.currencyCode,
      vatMode: validation.normalized.vatMode,
      vatAmountMinor: validation.normalized.vatAmountMinor ?? null,
      vatClassification: validation.normalized.vatClassification,
      vatDeductibility: validation.normalized.vatDeductibility,
      vatEvidenceRef: validation.normalized.vatEvidenceRef ?? null,
      vatClassificationReason: validation.normalized.vatClassificationReason ?? null,
      recordKind: validation.normalized.recordKind,
      occurrenceKind: validation.normalized.occurrenceKind,
      allocation: validation.allocation,
      allocationQuantity: validation.normalized.allocationQuantity ?? null,
      allocationUnit: validation.normalized.allocationUnit ?? null,
      allocationUnitRateMinor: validation.normalized.allocationUnitRateMinor ?? null,
      evidenceRef: text(mergedInput.evidenceRef),
      sourceRef: text(mergedInput.sourceRef),
      sourceType: text(mergedInput.sourceType),
      description: text(mergedInput.description),
      version: Number(version) + 1,
      isReversal: Boolean(validation.normalized.isReversal),
      reversalOfEntryId: reversal?.id ?? null,
      updatedByUserId: positiveId(actor?.id),
    });
    return { row, category: relations.category };
  });
  const serialized = serializeEntry(result.row, result.category, { salaryAuthorized: salaryCategory(result.category.key) });
  await recordAudit({ audit, req, action: 'ROOM_COST_DRAFT_UPDATED', entryId: serialized.id, roomId: requestedRoomId, version: serialized.version, recordKind: serialized.recordKind });
  return serialized;
}

export async function createBatchDraftRowInTransaction(tx, { actor, roomId, draftBatchId, input = {} } = {}) {
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const validation = validateEntryInput(input);
  const categoryKey = validation.normalized.categoryKey || text(input.categoryKey)?.toUpperCase();
  await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey });
  const relations = await resolveRelations(tx, requestedRoomId, { ...input, categoryKey });
  assertEconomicOwner({ categoryKey: relations.category.key, vehicleId: input.vehicleId, driverId: input.driverId, shiftId: input.shiftId });
  if (salaryCategory(relations.category.key) && !input.driverId) {
    throw errorWith('DRIVER_REQUIRED', 'Sürücü maliyeti aynı ROOM içindeki sürücüye bağlanmalıdır.', { status: 400 });
  }
  await assertNoDuplicateSourceRef(tx, requestedRoomId, { ...input, recordKind: validation.normalized.recordKind }, relations.category.id);
  const reversal = await resolveReversal(tx, requestedRoomId, {
    ...validation.normalized,
    allocation: validation.allocation,
    sourceRef: text(input.sourceRef),
  }, relations.category.id);
  await assertNoDuplicateRollup(tx, requestedRoomId, { ...input, allocation: validation.allocation }, null, reversal?.id ?? null);
  const row = await tx.roomCostEntry.create({ data: {
    roomId: requestedRoomId,
    categoryId: relations.category.id,
    vehicleId: positiveId(input.vehicleId),
    driverId: positiveId(input.driverId),
    agreementId: positiveId(input.agreementId),
    shiftId: positiveId(input.shiftId),
    occurredAt: validation.normalized.occurredAt ? toDate(validation.normalized.occurredAt) : null,
    periodStart: validation.normalized.periodStart ? toDate(validation.normalized.periodStart) : null,
    periodEnd: validation.normalized.periodEnd ? toDate(validation.normalized.periodEnd) : null,
    amountMinor: validation.normalized.amountMinor,
    currencyCode: validation.normalized.currencyCode,
    vatMode: validation.normalized.vatMode,
    vatAmountMinor: validation.normalized.vatAmountMinor ?? null,
    vatClassification: validation.normalized.vatClassification,
    vatDeductibility: validation.normalized.vatDeductibility,
    vatEvidenceRef: validation.normalized.vatEvidenceRef ?? null,
    vatClassificationReason: validation.normalized.vatClassificationReason ?? null,
    recordKind: validation.normalized.recordKind,
    occurrenceKind: validation.normalized.occurrenceKind,
    allocation: validation.allocation,
    allocationQuantity: validation.normalized.allocationQuantity ?? null,
    allocationUnit: validation.normalized.allocationUnit ?? null,
    allocationUnitRateMinor: validation.normalized.allocationUnitRateMinor ?? null,
    evidenceRef: text(input.evidenceRef),
    sourceRef: text(input.sourceRef),
    sourceType: text(input.sourceType),
    description: text(input.description),
    lifecycle: 'DRAFT',
    version: 1,
    isReversal: Boolean(validation.normalized.isReversal),
    reversalOfEntryId: reversal?.id ?? null,
    createdByUserId: positiveId(actor?.id),
    updatedByUserId: positiveId(actor?.id),
    draftBatchId: batchId,
  } });
  return { row, category: relations.category };
}

export async function createCostBatchDraftRowInTransaction(tx, { actor, roomId, draftBatchId, input = {} } = {}) {
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const existing = await tx.roomCostEntry.findFirst({
    where: {
      roomId: requestedRoomId,
      createdByUserId: positiveId(actor?.id),
      draftBatchId: batchId,
      lifecycle: 'DRAFT',
    },
    select: { id: true },
  });
  if (!existing) throw errorWith('BATCH_NOT_FOUND', 'Toplu gider taslağı bulunamadı.', { status: 404 });
  return createBatchDraftRowInTransaction(tx, { actor, roomId: requestedRoomId, draftBatchId: batchId, input });
}

async function loadBatchRowsInTransaction(tx, { actor, roomId, draftBatchId, includeCancelled = false } = {}) {
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const rows = await tx.roomCostEntry.findMany({
    where: {
      roomId: requestedRoomId,
      createdByUserId: positiveId(actor.id),
      draftBatchId: batchId,
      ...(includeCancelled ? {} : { lifecycle: { not: 'CANCELLED' } }),
    },
    include: relationInclude(),
    orderBy: { id: 'asc' },
  });
  const verified = [];
  for (const row of rows) {
    const relations = await resolveReadRelations(tx, requestedRoomId, row);
    await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: relations.category.key });
    verified.push({ ...row, ...relations });
  }
  return { roomId: requestedRoomId, batchId, rows: verified };
}

async function serializeBatchRows(prisma, roomId, rows) {
  const result = [];
  for (const row of rows) {
    const hydrated = row.category ? row : await prisma.roomCostEntry.findFirst({ where: { roomId, id: row.id }, include: relationInclude() });
    const relations = hydrated ? await resolveReadRelations(prisma, roomId, hydrated) : null;
    if (!hydrated || !relations?.category) throw errorWith('ROOM_COST_NOT_FOUND', 'Toplu gider satırı bulunamadı.', { status: 404 });
    result.push(serializeEntry({ ...hydrated, ...relations }, relations.category, { salaryAuthorized: salaryCategory(relations.category.key) }));
  }
  return result;
}

export async function createCostBatchDraft({ actor, roomId, input = {}, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  await ensureBuiltinCostCategories(prisma, requestedRoomId);
  const draftBatchId = crypto.randomUUID();
  const result = await prisma.$transaction((tx) => createBatchDraftRowInTransaction(tx, {
    actor,
    roomId: requestedRoomId,
    draftBatchId,
    input,
  }));
  const [item] = await serializeBatchRows(prisma, requestedRoomId, [result.row]);
  await recordAudit({ audit, req, action: 'ROOM_COST_BATCH_DRAFT_ROW_CREATED', entryId: item.id, roomId: requestedRoomId, version: item.version, recordKind: item.recordKind });
  return { draftBatchId, item };
}

export async function createCostBatchDraftRow({ actor, roomId, draftBatchId, input = {}, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const result = await prisma.$transaction((tx) => createCostBatchDraftRowInTransaction(tx, {
    actor,
    roomId: requestedRoomId,
    draftBatchId: batchId,
    input,
  }));
  const [item] = await serializeBatchRows(prisma, requestedRoomId, [result.row]);
  await recordAudit({ audit, req, action: 'ROOM_COST_BATCH_DRAFT_ROW_CREATED', entryId: item.id, roomId: requestedRoomId, version: item.version, recordKind: item.recordKind });
  return { draftBatchId: batchId, item };
}

export async function getCurrentCostBatchDraft({ actor, roomId, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const latest = await prisma.roomCostEntry.findFirst({
    where: { roomId: requestedRoomId, createdByUserId: positiveId(actor.id), draftBatchId: { not: null }, lifecycle: 'DRAFT' },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: { draftBatchId: true },
  });
  if (!latest?.draftBatchId) return { draftBatchId: null, items: [] };
  const result = await prisma.$transaction((tx) => loadBatchRowsInTransaction(tx, {
    actor,
    roomId: requestedRoomId,
    draftBatchId: latest.draftBatchId,
  }));
  return { draftBatchId: result.batchId, items: await serializeBatchRows(prisma, requestedRoomId, result.rows) };
}

export async function updateCostBatchDraftRow({ actor, roomId, draftBatchId, draftId, version, input = {}, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const item = await updateCostDraft({
    actor,
    roomId: requestedRoomId,
    draftId,
    version,
    input,
    expectedDraftBatchId: batchId,
    expectedCreatedByUserId: actor.id,
    prisma,
    audit,
    req,
  });
  const hydrated = await prisma.roomCostEntry.findFirst({
    where: { roomId: requestedRoomId, id: item.id, createdByUserId: positiveId(actor.id), draftBatchId: batchId },
    include: relationInclude(),
  });
  if (!hydrated) throw errorWith('BATCH_ROW_NOT_FOUND', 'Güncellenen toplu taslak satırı bulunamadı.', { status: 404 });
  const [serializedItem] = await serializeBatchRows(prisma, requestedRoomId, [hydrated]);
  return { draftBatchId: batchId, item: serializedItem };
}

export async function removeCostBatchDraftRow({ actor, roomId, draftBatchId, draftId, version, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const id = positiveId(draftId);
  if (!id || !Number.isSafeInteger(Number(version))) throw errorWith('VERSION_REQUIRED', 'Taslak sürümü gerekir.', { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.roomCostEntry.findFirst({ where: { roomId: requestedRoomId, id, createdByUserId: positiveId(actor.id), draftBatchId: batchId } });
    if (!existing) throw errorWith('BATCH_ROW_NOT_FOUND', 'Toplu taslak satırı bulunamadı.', { status: 404 });
    if (existing.lifecycle !== 'DRAFT') throw errorWith('CONFIRMED_ENTRY_IMMUTABLE', 'Uygulanmış gider satırı çıkarılamaz.', { status: 409 });
    const row = await updateEntryWithVersion(tx, requestedRoomId, id, Number(version), {
      lifecycle: 'CANCELLED',
      version: Number(version) + 1,
      cancelledByUserId: positiveId(actor.id),
      cancelledAt: new Date(),
      updatedByUserId: positiveId(actor.id),
    });
    const relations = await resolveReadRelations(tx, requestedRoomId, { ...row, category: await findCategory(tx, requestedRoomId, { categoryId: row.categoryId }) });
    await recordAuditInTransaction(tx, {
      actor,
      action: 'ROOM_COST_BATCH_DRAFT_ROW_CANCELLED',
      entityId: row.id,
      meta: { roomId: requestedRoomId, entryId: row.id, draftBatchId: batchId, version: row.version, recordKind: row.recordKind },
    });
    return { row: { ...row, ...relations }, category: relations.category };
  });
  const item = serializeEntry(result.row, result.category, { salaryAuthorized: salaryCategory(result.category.key) });
  await recordAudit({ audit, req, action: 'ROOM_COST_BATCH_DRAFT_ROW_CANCELLED', entryId: item.id, roomId: requestedRoomId, version: item.version, recordKind: item.recordKind });
  return { draftBatchId: batchId, item };
}

export async function applyCostBatchDraftInTransaction({ tx, actor, roomId, draftBatchId } = {}) {
  if (!tx) throw errorWith('PRISMA_REQUIRED', 'Toplu gider işlemi için transaction gerekir.', { status: 500 });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  const loaded = await loadBatchRowsInTransaction(tx, { actor, roomId: requestedRoomId, draftBatchId: batchId });
  if (!loaded.rows.length) throw errorWith('BATCH_EMPTY', 'Uygulanacak gider satırı bulunamadı.', { status: 400 });
  if (loaded.rows.every((row) => row.lifecycle === 'CONFIRMED')) {
    return { draftBatchId: batchId, idempotent: true, items: loaded.rows.map((row) => serializeEntry(row, row.category, { salaryAuthorized: salaryCategory(row.category.key) })) };
  }
  if (loaded.rows.some((row) => row.lifecycle !== 'DRAFT')) throw errorWith('BATCH_PARTIAL_STATE', 'Toplu taslak satırları aynı durumda değil.', { status: 409 });

  const validations = [];
  for (const row of loaded.rows) {
    const input = inputFromEntry(row);
    const validation = validateEntryInput(input);
    if (validation.missing.length || validation.blockers.length) {
      throw errorWith('COST_INPUT_INCOMPLETE', 'Toplu gider taslağındaki bir satır eksik veya geçersiz.', { status: 400, missing: validation.missing, blockers: validation.blockers, entryId: row.id });
    }
    assertEconomicOwner({ categoryKey: row.category.key, vehicleId: input.vehicleId, driverId: input.driverId, shiftId: input.shiftId });
    await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: row.category.key });
    await assertNoDuplicateSourceRef(tx, requestedRoomId, input, row.category.id, row.id);
    const reversal = await resolveReversal(tx, requestedRoomId, { ...validation.normalized, allocation: validation.allocation, sourceRef: text(input.sourceRef) }, row.category.id);
    await assertNoDuplicateRollup(tx, requestedRoomId, { ...input, allocation: validation.allocation }, row.id, reversal?.id ?? null);
    validations.push({ row, reversal });
  }

  const confirmedRows = [];
  for (const { row, reversal } of validations) {
    const confirmed = await updateEntryWithVersion(tx, requestedRoomId, row.id, row.version, {
      lifecycle: 'CONFIRMED',
      version: row.version + 1,
      confirmedByUserId: positiveId(actor.id),
      confirmedAt: new Date(),
      updatedByUserId: positiveId(actor.id),
      reversalOfEntryId: reversal?.id ?? row.reversalOfEntryId ?? null,
    });
    const hydrated = { ...confirmed, category: row.category, vehicle: row.vehicle, driver: row.driver, agreement: row.agreement, shift: row.shift, allocationLines: row.allocationLines };
    confirmedRows.push(hydrated);
    await recordAuditInTransaction(tx, {
      actor,
      action: 'ROOM_COST_CONFIRMED',
      entityId: confirmed.id,
      meta: { roomId: requestedRoomId, entryId: confirmed.id, draftBatchId: batchId, version: confirmed.version, recordKind: confirmed.recordKind },
    });
  }
  await recordAuditInTransaction(tx, {
    actor,
    action: 'ROOM_COST_BATCH_APPLIED',
    entity: 'RoomCostEntryBatch',
    entityId: null,
    meta: { roomId: requestedRoomId, draftBatchId: batchId, entryCount: confirmedRows.length },
  });
  return { draftBatchId: batchId, idempotent: false, items: confirmedRows.map((row) => serializeEntry(row, row.category, { salaryAuthorized: salaryCategory(row.category.key) })) };
}

export async function applyCostBatchDraft({ actor, roomId, draftBatchId, confirmation = {}, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertBatchRoomActor(actor, roomId);
  const batchId = assertDraftBatchId(draftBatchId);
  if (confirmation.confirmed !== true && confirmation.confirm !== true) throw errorWith('EXPLICIT_CONFIRMATION_REQUIRED', 'Toplu gider işlemi için açık onay gerekir.', { status: 400 });
  if (!text(confirmation.token ?? confirmation.confirmationToken)) throw errorWith('CONFIRMATION_TOKEN_REQUIRED', 'Toplu gider işlemi için açık onay belirteci gerekir.', { status: 400 });
  return prisma.$transaction((tx) => applyCostBatchDraftInTransaction({ tx, actor, roomId: requestedRoomId, draftBatchId: batchId }));
}

export async function confirmCostDraft({ actor, roomId, draftId, version, confirmation = {}, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(draftId);
  if (!id || !Number.isSafeInteger(Number(version))) throw errorWith('VERSION_REQUIRED', 'Taslak sürümü gerekir.', { status: 400 });
  if (confirmation.confirmed !== true && confirmation.confirm !== true) throw errorWith('EXPLICIT_CONFIRMATION_REQUIRED', 'Maliyet kaydı için açık onay gerekir.', { status: 400 });
  if (!text(confirmation.token ?? confirmation.confirmationToken)) throw errorWith('CONFIRMATION_TOKEN_REQUIRED', 'Açık onay belirteci gerekir.', { status: 400 });
  const routineRoomActor = String(actor?.role || '').trim().toUpperCase() === 'ROOM';
  if (!routineRoomActor && confirmation.stepUpVerified !== true) {
    throw errorWith('STEP_UP_REQUIRED', 'Maliyet onayı için güncel step-up doğrulaması gerekir.', { status: 403 });
  }
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.roomCostEntry.findFirst({ where: { roomId: requestedRoomId, id } });
    if (!existing) throw errorWith('ROOM_COST_NOT_FOUND', 'ROOM maliyet kaydı bulunamadı.', { status: 404 });
    if (existing.lifecycle !== 'DRAFT') throw errorWith('CONFIRMED_ENTRY_IMMUTABLE', 'ROOM maliyet kaydı zaten doğrulanmış veya iptal edilmiştir.', { status: 409 });
    if (existing.version !== Number(version)) throw errorWith('VERSION_CONFLICT', 'ROOM maliyet taslağı güncel değil.', { status: 409 });
    const category = await findCategory(tx, requestedRoomId, { categoryId: existing.categoryId });
    assertEconomicOwner({ categoryKey: category.key, vehicleId: existing.vehicleId, driverId: existing.driverId, shiftId: existing.shiftId });
    await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: category.key });
    const finalInput = inputFromEntry({ ...existing, category });
    const finalValidation = validateEntryInput(finalInput);
    await assertNoDuplicateSourceRef(tx, requestedRoomId, finalInput, category.id, id);
    const reversal = await resolveReversal(tx, requestedRoomId, {
      ...finalValidation.normalized,
      allocation: finalValidation.allocation,
      sourceRef: text(finalInput.sourceRef),
    }, category.id);
    await assertNoDuplicateRollup(tx, requestedRoomId, finalInput, id, reversal?.id ?? null);
    const row = await updateEntryWithVersion(tx, requestedRoomId, id, Number(version), {
      lifecycle: 'CONFIRMED',
      version: Number(version) + 1,
      confirmedByUserId: positiveId(actor?.id),
      confirmedAt: new Date(),
      updatedByUserId: positiveId(actor?.id),
      reversalOfEntryId: reversal?.id ?? null,
    });
    return { row, category };
  });
  const serialized = serializeEntry(result.row, result.category, { salaryAuthorized: salaryCategory(result.category.key) });
  await recordAudit({ audit, req, action: 'ROOM_COST_CONFIRMED', entryId: serialized.id, roomId: requestedRoomId, version: serialized.version, recordKind: serialized.recordKind });
  const automaticAllocation = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor,
    roomId: requestedRoomId,
    entryId: serialized.id,
    prisma,
    audit,
    req,
  });
  const driverAutomaticAllocation = await automaticallyAllocatePeriodicDriverAfterConfirmation({
    actor,
    roomId: requestedRoomId,
    entryId: serialized.id,
    prisma,
    audit,
    req,
  });
  return {
    ...serialized,
    automaticAllocation: driverAutomaticAllocation.status === 'NOT_APPLICABLE'
      ? automaticAllocation
      : driverAutomaticAllocation,
  };
}

function assertCorrectionRef(value) {
  const correctionRef = text(value);
  if (!correctionRef || correctionRef.length > 160) {
    throw errorWith('CORRECTION_REF_REQUIRED', 'Gider düzeltmesi için geçerli bir işlem referansı gerekir.', { status: 400 });
  }
  return correctionRef;
}

function correctionAuditMeta({ original, reversal, replacement, correctionRef, previousVersion, nextVersion, replacementAllocationLineIds = [] }) {
  return {
    originalEntryId: original.id,
    reversalEntryId: reversal.id,
    replacementEntryId: replacement.id,
    replacementAllocationLineIds,
    correctionRef,
    previousVersion,
    nextVersion,
    changedFields: ['category', 'amount', 'currency', 'vat', 'period', 'relations', 'source', 'description'],
  };
}

async function findCorrectionReplay(tx, roomId, entryId, correctionRef) {
  if (!tx?.auditLog?.findMany) return null;
  const audits = await tx.auditLog.findMany({
    where: { entity: 'RoomCostEntryCorrection', entityId: entryId, action: 'ROOM_COST_CORRECTION_APPLIED' },
    orderBy: { id: 'asc' },
  });
  const match = audits.find((item) => item?.meta && item.meta.correctionRef === correctionRef);
  if (!match) return null;
  const reversalId = positiveId(match.meta.reversalEntryId);
  const replacementId = positiveId(match.meta.replacementEntryId);
  if (!reversalId || !replacementId) throw errorWith('CORRECTION_AUDIT_INCOMPLETE', 'Gider düzeltme geçmişi eksik olduğu için işlem tekrarlanamadı.', { status: 409 });
  const [reversal, replacement] = await Promise.all([
    tx.roomCostEntry.findFirst({ where: { roomId, id: reversalId }, include: relationInclude() }),
    tx.roomCostEntry.findFirst({ where: { roomId, id: replacementId }, include: relationInclude() }),
  ]);
  if (!reversal || !replacement) throw errorWith('CORRECTION_LINEAGE_INCOMPLETE', 'Gider düzeltme kayıt zinciri eksik olduğu için işlem tekrarlanamadı.', { status: 409 });
  return { idempotent: true, reversal, replacement };
}

async function loadCorrectionLineageIds(tx, roomId, entryId) {
  const lineageIds = new Set([positiveId(entryId)].filter(Boolean));
  if (!tx?.auditLog?.findMany || !tx?.roomCostEntry?.findMany || !lineageIds.size) return lineageIds;

  const roomEntries = await tx.roomCostEntry.findMany({ where: { roomId }, select: { id: true } });
  const roomEntryIds = roomEntries.map((entry) => positiveId(entry.id)).filter(Boolean);
  if (!roomEntryIds.length) return lineageIds;

  const audits = await tx.auditLog.findMany({
    where: {
      entity: 'RoomCostEntryCorrection',
      action: 'ROOM_COST_CORRECTION_APPLIED',
      entityId: { in: roomEntryIds },
    },
  });
  let changed = true;
  while (changed) {
    changed = false;
    for (const audit of audits) {
      const meta = audit?.meta && typeof audit.meta === 'object' ? audit.meta : {};
      const ids = [audit.entityId, meta.originalEntryId, meta.reversalEntryId, meta.replacementEntryId]
        .map((value) => positiveId(value))
        .filter(Boolean);
      if (!ids.some((id) => lineageIds.has(id))) continue;
      for (const id of ids) {
        if (!lineageIds.has(id)) {
          lineageIds.add(id);
          changed = true;
        }
      }
    }
  }
  return lineageIds;
}

function correctionReplacementData({ actor, roomId, relations, validation, input, now }) {
  return {
    roomId,
    categoryId: relations.category.id,
    vehicleId: positiveId(input.vehicleId),
    driverId: positiveId(input.driverId),
    agreementId: positiveId(input.agreementId),
    shiftId: positiveId(input.shiftId),
    occurredAt: validation.normalized.occurredAt ? toDate(validation.normalized.occurredAt) : null,
    periodStart: validation.normalized.periodStart ? toDate(validation.normalized.periodStart) : null,
    periodEnd: validation.normalized.periodEnd ? toDate(validation.normalized.periodEnd) : null,
    amountMinor: validation.normalized.amountMinor,
    currencyCode: validation.normalized.currencyCode,
    vatMode: validation.normalized.vatMode,
    vatAmountMinor: validation.normalized.vatAmountMinor ?? null,
    vatClassification: validation.normalized.vatClassification,
    vatDeductibility: validation.normalized.vatDeductibility,
    vatEvidenceRef: validation.normalized.vatEvidenceRef ?? null,
    vatClassificationReason: validation.normalized.vatClassificationReason ?? null,
    recordKind: validation.normalized.recordKind,
    occurrenceKind: validation.normalized.occurrenceKind,
    allocation: validation.allocation,
    allocationQuantity: validation.normalized.allocationQuantity ?? null,
    allocationUnit: validation.normalized.allocationUnit ?? null,
    allocationUnitRateMinor: validation.normalized.allocationUnitRateMinor ?? null,
    evidenceRef: text(input.evidenceRef),
    sourceRef: text(input.sourceRef),
    sourceType: text(input.sourceType),
    description: text(input.description),
    lifecycle: 'CONFIRMED',
    version: 1,
    isReversal: false,
    reversalOfEntryId: null,
    createdByUserId: positiveId(actor?.id),
    updatedByUserId: positiveId(actor?.id),
    confirmedByUserId: positiveId(actor?.id),
    confirmedAt: now,
    draftBatchId: null,
  };
}

export async function correctConfirmedCostInTransaction({ tx, actor, roomId, entryId, version, input = {}, correctionRef } = {}) {
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(entryId);
  const expectedVersion = Number(version);
  const normalizedCorrectionRef = assertCorrectionRef(correctionRef);
  if (!id) throw errorWith('ROOM_COST_ENTRY_REQUIRED', 'Düzeltme için geçerli bir gider kaydı gerekir.', { status: 400 });
  if (!Number.isSafeInteger(expectedVersion)) throw errorWith('VERSION_REQUIRED', 'Gider düzeltmesi için güncel kayıt sürümü gerekir.', { status: 400 });

  const source = await tx.roomCostEntry.findFirst({ where: { roomId: requestedRoomId, id }, include: relationInclude() });
  if (!source) throw errorWith('ROOM_COST_NOT_FOUND', 'ROOM maliyet kaydı bulunamadı.', { status: 404 });
  if (source.lifecycle !== 'CONFIRMED' || source.isReversal) throw errorWith('CONFIRMED_ENTRY_REQUIRED', 'Yalnızca onaylı ana gider kaydı düzeltilebilir.', { status: 409 });
  await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: source.category?.key });

  const replay = await findCorrectionReplay(tx, requestedRoomId, source.id, normalizedCorrectionRef);
  if (replay) return { idempotent: true, original: source, ...replay };

  const existingCategory = source.category || await findCategory(tx, requestedRoomId, { categoryId: source.categoryId });
  const mergedInput = { ...inputFromEntry({ ...source, category: existingCategory }), ...input };
  if (!mergedInput.categoryKey) mergedInput.categoryKey = existingCategory.key;
  const validation = validateEntryInput(mergedInput);
  const relations = await resolveRelations(tx, requestedRoomId, mergedInput);
  assertEconomicOwner({ categoryKey: relations.category.key, vehicleId: mergedInput.vehicleId, driverId: mergedInput.driverId, shiftId: mergedInput.shiftId });
  await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: relations.category.key });
  const replacementInput = { ...mergedInput, ...validation.normalized, categoryKey: relations.category.key, allocation: validation.allocation };
  const correctionLineageIds = await loadCorrectionLineageIds(tx, requestedRoomId, source.id);
  const duplicateSourceRows = text(replacementInput.sourceRef)
    ? await tx.roomCostEntry.findMany({
      where: {
        roomId: requestedRoomId,
        categoryId: relations.category.id,
        recordKind: validation.normalized.recordKind,
        sourceRef: text(replacementInput.sourceRef),
        lifecycle: { not: 'CANCELLED' },
      },
    })
    : [];
  if (duplicateSourceRows.some((row) => !correctionLineageIds.has(row.id))) {
    throw errorWith('DUPLICATE_SOURCE_REF', 'Aynı kaynak referansı bu gider türünde ikinci kez kullanılamaz.', { status: 409 });
  }
  await assertNoDuplicateRollup(tx, requestedRoomId, replacementInput, source.id, null, correctionLineageIds);

  const bumped = await tx.roomCostEntry.updateMany({
    where: { roomId: requestedRoomId, id: source.id, version: expectedVersion, lifecycle: 'CONFIRMED', isReversal: false },
    data: { version: expectedVersion + 1, updatedByUserId: positiveId(actor?.id) },
  });
  if (bumped.count !== 1) {
    const lateReplay = await findCorrectionReplay(tx, requestedRoomId, source.id, normalizedCorrectionRef);
    if (lateReplay) return { idempotent: true, original: source, ...lateReplay };
    throw errorWith('VERSION_CONFLICT', 'ROOM maliyet kaydı güncel değil.', { status: 409 });
  }

  const now = new Date();
  const reversal = await tx.roomCostEntry.create({
    data: {
      roomId: requestedRoomId,
      categoryId: source.categoryId,
      vehicleId: source.vehicleId,
      driverId: source.driverId,
      agreementId: source.agreementId,
      shiftId: source.shiftId,
      occurredAt: source.occurredAt,
      periodStart: source.periodStart,
      periodEnd: source.periodEnd,
      amountMinor: source.amountMinor,
      currencyCode: source.currencyCode,
      vatMode: source.vatMode,
      vatAmountMinor: source.vatAmountMinor,
      vatClassification: source.vatClassification || 'UNKNOWN',
      vatDeductibility: source.vatDeductibility || 'UNKNOWN',
      vatEvidenceRef: source.vatEvidenceRef ?? null,
      vatClassificationReason: source.vatClassificationReason ?? null,
      recordKind: source.recordKind,
      occurrenceKind: source.occurrenceKind,
      allocation: source.allocation,
      allocationQuantity: source.allocationQuantity,
      allocationUnit: source.allocationUnit,
      allocationUnitRateMinor: source.allocationUnitRateMinor,
      evidenceRef: source.evidenceRef,
      sourceRef: source.sourceRef,
      sourceType: source.sourceType,
      description: source.description,
      lifecycle: 'CONFIRMED',
      version: 1,
      isReversal: true,
      reversalOfEntryId: source.id,
      createdByUserId: positiveId(actor?.id),
      updatedByUserId: positiveId(actor?.id),
      confirmedByUserId: positiveId(actor?.id),
      confirmedAt: now,
      draftBatchId: null,
    },
  });
  const replacement = await tx.roomCostEntry.create({ data: correctionReplacementData({ actor, roomId: requestedRoomId, relations, validation, input: mergedInput, now }) });
  const automaticLineagePrefix = `AUTO_USAGE:${source.id}:`;
  const preservedAllocationLines = Array.isArray(source.allocationLines)
    ? source.allocationLines.filter((line) => !String(line.lineageKey || '').startsWith(automaticLineagePrefix))
    : [];
  if (preservedAllocationLines.length > 0) {
    await tx.roomCostAllocationLine.createMany({
      data: preservedAllocationLines.map((line) => ({
        roomId: requestedRoomId,
        entryId: replacement.id,
        lineageKind: line.lineageKind,
        targetKind: line.targetKind,
        lineageKey: line.lineageKey,
        vehicleId: line.vehicleId,
        driverId: line.driverId,
        agreementId: line.agreementId,
        shiftId: line.shiftId,
        periodStart: line.periodStart,
        periodEnd: line.periodEnd,
        quantity: line.quantity,
        unit: line.unit,
        unitRateMinor: line.unitRateMinor,
        allocatedAmountMinor: line.allocatedAmountMinor,
        currencyCode: line.currencyCode,
        sourceRef: line.sourceRef,
        evidenceRef: line.evidenceRef,
      })),
    });
  }
  const replacementAllocationLines = await tx.roomCostAllocationLine.findMany({
    where: { roomId: requestedRoomId, entryId: replacement.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const updatedOriginal = { ...source, version: expectedVersion + 1, updatedByUserId: positiveId(actor?.id) };
  await tx.auditLog.create({
    data: {
      actorUserId: positiveId(actor?.id),
      actorRole: String(actor?.role || '').trim().toUpperCase() || null,
      action: 'ROOM_COST_CORRECTION_APPLIED',
      entity: 'RoomCostEntryCorrection',
      entityId: source.id,
      meta: correctionAuditMeta({
        original: source,
        reversal,
        replacement,
        correctionRef: normalizedCorrectionRef,
        previousVersion: expectedVersion,
        nextVersion: expectedVersion + 1,
        replacementAllocationLineIds: replacementAllocationLines.map((line) => line.id),
      }),
    },
  });
  return { idempotent: false, original: updatedOriginal, reversal, replacement, replacementAllocationLines };
}

export async function correctConfirmedCost({ actor, roomId, entryId, version, input = {}, correctionRef, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const result = await prisma.$transaction((tx) => correctConfirmedCostInTransaction({
    tx,
    actor,
    roomId: requestedRoomId,
    entryId,
    version,
    input,
    correctionRef,
  }));
  const ids = [result.original?.id, result.reversal?.id, result.replacement?.id].filter(Boolean);
  const rows = await prisma.roomCostEntry.findMany({ where: { roomId: requestedRoomId, id: { in: ids } }, include: relationInclude() });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const serialize = (row) => row ? serializeEntry(row, row.category, { salaryAuthorized: salaryCategory(row.category?.key) }) : null;
  return {
    idempotent: result.idempotent,
    correctionRef: text(correctionRef),
    original: serialize(byId.get(result.original?.id)),
    reversal: serialize(byId.get(result.reversal?.id)),
    replacement: serialize(byId.get(result.replacement?.id)),
  };
}

export async function listCostEntries({ actor, roomId, filters = {}, includeHistoricalCorrectionRows = false, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const result = await listRawEntries({ actor, roomId, filters, prisma });
  const correctionHistory = includeHistoricalCorrectionRows
    ? new Map()
    : await loadCorrectionHistory(prisma, result.roomId, result.salaryAuthorized);
  const rows = includeHistoricalCorrectionRows
    ? result.rows
    : buildCorrectionListView(result.rows, correctionHistory);
  return {
    entries: classifyFutureActualEntries(rows.map((row) => serializeEntry(row, row.category, { salaryAuthorized: result.salaryAuthorized }))),
    salaryRedacted: !result.salaryAuthorized,
    readOnly: true,
  };
}

function emptyBucket() {
  return { entryCount: 0, currencyCode: null, grossAmountMinor: null, netAmountMinor: null, netRollupBlocked: false, blockers: [], known: [], missing: ['confirmed cost entries'] };
}

function summarizeEntries(entries, allocation = null) {
  const buckets = Object.fromEntries(['ACTUAL', 'BUDGET', 'FORECAST', 'ACCRUAL'].map((kind) => [kind, emptyBucket()]));
  const excluded = [];
  const lineage = [];
  const known = [];
  const missing = [];
  const blockers = [];
  for (const entry of entries) {
    const bucket = buckets[entry.recordKind];
    if (!bucket) continue;
    if (entry.lifecycle !== 'CONFIRMED') {
      excluded.push({ entryId: entry.id, reason: 'NOT_CONFIRMED' });
      continue;
    }
    const allocationLine = entry.recordKind === 'ACTUAL'
      ? allocation?.lines?.find((item) => item.entryId === entry.id)
      : null;
    const line = { entryId: entry.id, sourceRef: entry.sourceRef, recordKind: entry.recordKind, allocation: entry.allocation, isReversal: entry.isReversal, reversalOfEntryId: entry.reversalOfEntryId, counted: false };
    lineage.push(line);
    if (allocationLine && !allocationLine.included) {
      const reason = allocationLine.excludedReason || 'ALLOCATION_EVIDENCE_INCOMPLETE';
      excluded.push({ entryId: entry.id, reason });
      line.excludedReason = reason;
      continue;
    }
    if (entry.allocation === 'EXCLUDED_FROM_ROLLUP') {
      excluded.push({ entryId: entry.id, reason: 'EXCLUDED_FROM_ROLLUP' });
      line.excludedReason = 'EXCLUDED_FROM_ROLLUP';
      continue;
    }
    bucket.missing = [];
    bucket.entryCount += 1;
    if (!bucket.currencyCode) bucket.currencyCode = entry.currencyCode;
    if (bucket.currencyCode !== entry.currencyCode) {
      bucket.currencyCode = null;
      bucket.grossAmountMinor = null;
      bucket.netAmountMinor = null;
      addUnique(bucket.blockers, 'MIXED_CURRENCIES');
      addUnique(blockers, 'MIXED_CURRENCIES');
      line.excludedReason = 'MIXED_CURRENCIES';
      continue;
    }
    const amount = entry.isReversal ? -entry.amountMinor : entry.amountMinor;
    bucket.grossAmountMinor = (bucket.grossAmountMinor ?? 0) + amount;
    if (isVatGrossOnly(entry)) {
      bucket.netRollupBlocked = true;
      addUnique(bucket.blockers, 'VAT_UNKNOWN_NET_ROLLUP');
      addUnique(blockers, 'VAT_UNKNOWN_NET_ROLLUP');
      excluded.push({ entryId: entry.id, reason: 'VAT_UNKNOWN_NET_ROLLUP' });
    } else {
      bucket.netAmountMinor = (bucket.netAmountMinor ?? 0) + amount;
    }
    line.counted = true;
    known.push({ entryId: entry.id, recordKind: entry.recordKind, amountMinor: amount, currencyCode: entry.currencyCode, categoryKey: entry.categoryKey });
    bucket.known.push(known.at(-1));
  }
  for (const bucket of Object.values(buckets)) {
    if (bucket.entryCount > 0 && bucket.grossAmountMinor == null) addUnique(bucket.blockers, 'MIXED_CURRENCIES');
    if (bucket.netRollupBlocked) bucket.netAmountMinor = null;
  }
  if (!known.length) missing.push('confirmed cost entries');
  return { buckets, known, missing, excluded, lineage, blockers };
}

export async function summarizeRoomCosts({ actor, roomId, filters = {}, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const result = await listRawEntries({ actor, roomId, filters, prisma, lifecycle: 'CONFIRMED' });
  const correctionHistory = await loadCorrectionHistory(prisma, result.roomId, result.salaryAuthorized);
  const accountingRows = buildCorrectionAccountingView(result.rows, correctionHistory);
  const entries = classifyFutureActualEntries(accountingRows.map((row) => serializeEntry(row, row.category, { salaryAuthorized: result.salaryAuthorized })));
  const allocation = buildCostAllocationProjection(entries);
  const summary = summarizeEntries(entries, allocation);
  const actualBucket = summary.buckets.ACTUAL;
  const integrity = await inspectCorrectionAuditIntegrity({
    roomId: result.roomId,
    prisma,
    currentEconomicEffect: {
      activeConfirmedActualCount: actualBucket?.entryCount ?? 0,
      activeConfirmedActualAmountMinor: actualBucket?.grossAmountMinor ?? null,
      currencyCode: actualBucket?.currencyCode ?? null,
      scope: filters?.periodStart || filters?.periodEnd ? "FILTERED_SCOPE" : "ROOM_TOTAL",
    },
  });
  const futureActualCount = entries.filter((entry) => entry.originalRecordKind === 'ACTUAL').length;
  return {
    ...summary,
    allocation,
    integrity,
    futureActualCount,
    buckets: Object.freeze(summary.buckets),
    readOnly: true,
    salaryRedacted: !result.salaryAuthorized,
  };
}

export async function buildOperationalCostInputs({ actor, roomId, filters = {}, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const operationalFilters = { ...filters, includeCancelled: true };
  if (operationalFilters.includeSalary === undefined && String(actor?.role || '').trim().toUpperCase() === 'ROOM') {
    operationalFilters.includeSalary = true;
  }
  const [entryList, summary] = await Promise.all([
    listCostEntries({ actor, roomId, filters: operationalFilters, prisma }),
    summarizeRoomCosts({ actor, roomId, filters: operationalFilters, prisma }),
  ]);
  const adapted = adaptLedgerEntriesToOperationalInputs(entryList.entries);
  const planningEvidence = buildRoomPlanningEvidence({
    entries: entryList.entries,
    allocation: summary.allocation,
    summary,
  });
  return {
    ...adapted,
    entries: Object.freeze(entryList.entries),
    planningEvidence,
    allocation: summary.allocation,
    buckets: summary.buckets,
    summary,
    salaryRedacted: entryList.salaryRedacted,
    readOnly: true,
  };
}

export async function upsertAllocationLine({ actor, roomId, entryId, input = {}, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(entryId);
  if (!id) throw errorWith('ROOM_COST_ENTRY_REQUIRED', 'Dağıtım için geçerli bir gider kaydı gerekir.', { status: 400 });
  let sourceRecordKind = 'ACTUAL';
  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.roomCostEntry.findFirst({
      where: { roomId: requestedRoomId, id },
      include: { category: true, allocationLines: true },
    });
    if (!entry) throw errorWith('ROOM_COST_NOT_FOUND', 'ROOM maliyet kaydı bulunamadı.', { status: 404 });
    const lineageKind = String(input.lineageKind || 'COMPONENT').toUpperCase();
    const targetKind = String(input.targetKind || '').toUpperCase();
    if (!['COMPONENT', 'REFERENCE'].includes(lineageKind)) throw errorWith('ALLOCATION_LINEAGE_INVALID', 'Dağıtım satırı türü geçersiz.', { status: 400 });
    if (!['VEHICLE', 'DRIVER', 'AGREEMENT', 'SHIFT', 'PERIOD'].includes(targetKind)) throw errorWith('ALLOCATION_TARGET_INVALID', 'Dağıtım hedefi geçersiz.', { status: 400 });
    const recordKind = String(entry.recordKind || '').toUpperCase();
    const planningSource = ['FORECAST', 'BUDGET'].includes(recordKind);
    sourceRecordKind = recordKind;
    if (entry.lifecycle !== 'CONFIRMED') {
      throw errorWith('ALLOCATION_SOURCE_NOT_CONFIRMED', 'Dağıtım kaynağı onaylı gerçekleşen veya açıkça planlama amaçlı tahmin/bütçe kaydı olmalıdır.', { status: 409 });
    }
    if (planningSource && lineageKind !== 'REFERENCE') {
      throw errorWith('PLANNING_REFERENCE_REQUIRED', 'Tahmini/bütçe gider yalnızca planlama referans payı olarak dağıtılabilir.', { status: 409 });
    }
    if (entry.recordKind !== 'ACTUAL' && !planningSource) {
      throw errorWith('ALLOCATION_SOURCE_NOT_CONFIRMED', 'Dağıtım kaynağı onaylı gerçekleşen veya açıkça planlama amaçlı tahmin/bütçe kaydı olmalıdır.', { status: 409 });
    }
    await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: entry.category?.key });
    const lineageKey = text(input.lineageKey);
    if (!lineageKey) throw errorWith('ALLOCATION_LINEAGE_KEY_REQUIRED', 'Dağıtım satırı kaynağı gerekir.', { status: 400 });
    const amount = positiveId(input.allocatedAmountMinor);
    if (!amount && lineageKind === 'COMPONENT') throw errorWith('ALLOCATION_AMOUNT_REQUIRED', 'Bileşen dağıtım tutarı gerekir.', { status: 400 });
    const quantity = input.quantity == null || String(input.quantity).trim() === '' ? null : String(input.quantity).trim();
    const unitRateMinor = input.unitRateMinor == null || String(input.unitRateMinor).trim() === '' ? null : positiveId(input.unitRateMinor);
    if (quantity && !/^\d+(?:\.\d{1,4})?$/.test(quantity)) throw errorWith('ALLOCATION_QUANTITY_INVALID', 'Dağıtım miktarı geçersiz.', { status: 400 });
    if (input.unitRateMinor != null && !unitRateMinor) throw errorWith('ALLOCATION_UNIT_RATE_INVALID', 'Dağıtım birim tutarı geçersiz.', { status: 400 });
    if (quantity && unitRateMinor && amount && Math.round(Number(quantity) * unitRateMinor) !== amount) {
      throw errorWith('ALLOCATION_AMOUNT_MISMATCH', 'Miktar ve birim tutarı dağıtım tutarıyla eşleşmiyor.', { status: 400 });
    }
    const relationInput = {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      agreementId: input.agreementId,
      shiftId: input.shiftId,
    };
    const relations = await resolveRelations(tx, requestedRoomId, { ...relationInput, categoryId: entry.categoryId }, { requireCategory: true });
    if (targetKind === 'VEHICLE' && !relations.vehicle) throw errorWith('ALLOCATION_TARGET_REQUIRED', 'Araç hedefi aynı ROOM içinden seçilmelidir.', { status: 400 });
    if (targetKind === 'DRIVER' && !relations.driver) throw errorWith('ALLOCATION_TARGET_REQUIRED', 'Sürücü hedefi aynı ROOM içinden seçilmelidir.', { status: 400 });
    if (targetKind === 'AGREEMENT' && !relations.agreement) throw errorWith('ALLOCATION_TARGET_REQUIRED', 'Sözleşme hedefi aynı ROOM içinden seçilmelidir.', { status: 400 });
    if (targetKind === 'SHIFT' && !relations.shift) throw errorWith('ALLOCATION_TARGET_REQUIRED', 'Vardiya/sefer hedefi aynı ROOM içinden seçilmelidir.', { status: 400 });
    if (targetKind === 'PERIOD' && (!input.periodStart || !input.periodEnd)) throw errorWith('ALLOCATION_PERIOD_REQUIRED', 'Dönem hedefinde başlangıç ve bitiş gerekir.', { status: 400 });
    if (targetKind === 'SHIFT') {
      validateShiftAllocationRelations({ entry, input, shift: relations.shift });
    }
    validateAllocationUsageEvidence({ input, entry, allowPlanningForecast: planningSource && lineageKind === 'REFERENCE' });
    const existing = await tx.roomCostAllocationLine.findUnique({ where: { roomId_entryId_lineageKey: { roomId: requestedRoomId, entryId: id, lineageKey } } });
    validateAllocationLineBudget({
      sourceAmountMinor: entry.amountMinor,
      existingLines: entry.allocationLines || [],
      nextLineId: existing?.id || null,
      nextAmountMinor: amount || 0,
      lineageKind,
    });
    const row = await tx.roomCostAllocationLine.upsert({
      where: { roomId_entryId_lineageKey: { roomId: requestedRoomId, entryId: id, lineageKey } },
      create: {
        roomId: requestedRoomId,
        entryId: id,
        lineageKind,
        targetKind,
        lineageKey,
        vehicleId: positiveId(input.vehicleId),
        driverId: positiveId(input.driverId),
        agreementId: positiveId(input.agreementId),
        shiftId: positiveId(input.shiftId),
        periodStart: input.periodStart ? toDate(input.periodStart) : null,
        periodEnd: input.periodEnd ? toDate(input.periodEnd) : null,
        quantity,
        unit: text(input.unit)?.toUpperCase() || null,
        unitRateMinor,
        allocatedAmountMinor: amount || 0,
        currencyCode: entry.currencyCode,
        sourceRef: text(input.sourceRef),
        evidenceRef: text(input.evidenceRef),
      },
      update: {
        lineageKind,
        targetKind,
        vehicleId: positiveId(input.vehicleId),
        driverId: positiveId(input.driverId),
        agreementId: positiveId(input.agreementId),
        shiftId: positiveId(input.shiftId),
        periodStart: input.periodStart ? toDate(input.periodStart) : null,
        periodEnd: input.periodEnd ? toDate(input.periodEnd) : null,
        quantity,
        unit: text(input.unit)?.toUpperCase() || null,
        unitRateMinor,
        allocatedAmountMinor: amount || 0,
        sourceRef: text(input.sourceRef),
        evidenceRef: text(input.evidenceRef),
      },
    });
    return row;
  }, { isolationLevel: 'Serializable' });
  await recordAudit({ audit, req, action: 'ROOM_COST_ALLOCATION_LINE_UPSERTED', entryId: id, roomId: requestedRoomId, version: null, recordKind: sourceRecordKind });
  return result;
}

export async function invalidateAutomaticAllocationsForShiftReassignment({
  tx: providedTx,
  actor,
  roomId,
  shiftId,
  from = {},
  to = {},
} = {}) {
  const tx = resolvePrisma({ tx: providedTx });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const requestedShiftId = positiveId(shiftId);
  if (!requestedShiftId) {
    throw errorWith('SHIFT_REQUIRED', 'Dağıtım geçersiz vardiya olmadan etkisizleştirilemez.', { status: 400 });
  }

  const invalidatedLines = await tx.roomCostAllocationLine.findMany({
    where: {
      roomId: requestedRoomId,
      shiftId: requestedShiftId,
      lineageKey: { startsWith: 'AUTO_USAGE:' },
    },
    select: {
      id: true,
      entryId: true,
      vehicleId: true,
      driverId: true,
      allocatedAmountMinor: true,
      lineageKey: true,
      sourceRef: true,
    },
    orderBy: { id: 'asc' },
  });

  if (!invalidatedLines.length) {
    return { invalidatedCount: 0, invalidatedLines: [] };
  }

  await tx.roomCostAllocationLine.deleteMany({
    where: {
      roomId: requestedRoomId,
      shiftId: requestedShiftId,
      lineageKey: { startsWith: 'AUTO_USAGE:' },
    },
  });

  await recordAuditInTransaction(tx, {
    actor,
    action: 'ROOM_COST_ALLOCATION_INVALIDATED_BY_SHIFT_REASSIGN',
    entity: 'Shift',
    entityId: requestedShiftId,
    meta: {
      roomId: requestedRoomId,
      shiftId: requestedShiftId,
      from: {
        vehicleId: positiveId(from.vehicleId),
        driverId: positiveId(from.driverId),
      },
      to: {
        vehicleId: positiveId(to.vehicleId),
        driverId: positiveId(to.driverId),
      },
      invalidatedLines: invalidatedLines.map((line) => ({
        id: line.id,
        entryId: line.entryId,
        vehicleId: positiveId(line.vehicleId),
        driverId: positiveId(line.driverId),
        allocatedAmountMinor: line.allocatedAmountMinor,
        lineageKey: line.lineageKey,
        sourceRef: line.sourceRef ?? null,
      })),
    },
  });

  return {
    invalidatedCount: invalidatedLines.length,
    invalidatedLines,
  };
}

export async function autoAllocateCostByCanonicalUsage({ actor, roomId, entryId, prisma: providedPrisma, db } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(entryId);
  if (!id) throw errorWith('ROOM_COST_ENTRY_REQUIRED', 'Dağıtım için geçerli bir gider kaydı gerekir.', { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.roomCostEntry.findFirst({
      where: { roomId: requestedRoomId, id },
      include: { category: true, allocationLines: true },
    });
    if (!entry) throw errorWith('ROOM_COST_NOT_FOUND', 'ROOM maliyet kaydı bulunamadı.', { status: 404 });
    if (entry.lifecycle !== 'CONFIRMED' || entry.recordKind !== 'ACTUAL' || entry.allocation !== 'COUNT_IN_ROLLUP') {
      throw errorWith('AUTO_ALLOCATION_SOURCE_INVALID', 'Otomatik dağıtım yalnız onaylı gerçekleşen dönemsel giderlerde kullanılabilir.', { status: 409 });
    }
    await assertSalaryIfNeeded({ actor, roomId: requestedRoomId, prisma: tx, categoryKey: entry.category?.key });
    const sourceStart = toDate(entry.periodStart);
    const sourceEnd = toDate(entry.periodEnd);
    if (!sourceStart || !sourceEnd || sourceStart > sourceEnd) {
      throw errorWith('AUTO_ALLOCATION_PERIOD_REQUIRED', 'Otomatik dağıtım için açık bir gider dönemi gerekir.', { status: 409, missing: ['periodStart/periodEnd'] });
    }

    const ownerWhere = {};
    if (positiveId(entry.vehicleId)) ownerWhere.vehicleId = positiveId(entry.vehicleId);
    if (positiveId(entry.driverId)) ownerWhere.driverId = positiveId(entry.driverId);
    if (!Object.keys(ownerWhere).length) {
      throw errorWith('AUTO_ALLOCATION_OWNER_REQUIRED', 'Otomatik dağıtım için araç veya sürücü sahibi gerekir.', { status: 409, missing: ['vehicleId or driverId'] });
    }
    if (positiveId(entry.agreementId)) ownerWhere.agreementId = positiveId(entry.agreementId);

    const endExclusive = new Date(sourceEnd.getTime() + 24 * 60 * 60 * 1000);
    const driverCost = isPeriodicDriverCostEntry(entry);
    const vehicleKilometerCost = isPeriodicVehicleKilometerCostEntry(entry);
    const vehicleFixedCost = isPeriodicVehicleFixedCostEntry(entry);
    const completedVehicleCost = vehicleKilometerCost && !isPeriodicVehicleFuelEntry(entry);
    const shifts = await tx.shift.findMany({
      where: {
        roomId: requestedRoomId,
        ...ownerWhere,
        ...(driverCost ? {} : { agreementId: { not: null } }),
        startAt: { gte: sourceStart, lt: endExclusive },
        endAt: { gt: sourceStart, lte: endExclusive },
        status: { in: driverCost || completedVehicleCost || vehicleFixedCost ? ['DONE'] : ['APPROVED', 'ACTIVE', 'DONE'] },
      },
      select: {
        id: true,
        roomId: true,
        vehicleId: true,
        driverId: true,
        agreementId: true,
        status: true,
        startAt: true,
        endAt: true,
        routeSnapshotDistanceM: true,
        routeSnapshotValidatedAt: true,
        emptyDistanceKm: true,
        emptyDistanceEvidenceRef: true,
        emptyDistanceReason: true,
      },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    });
    const driverShifts = driverCost
      ? shifts.filter((shift) => String(shift.status || '').trim().toUpperCase() === 'DONE')
      : [];
    const driverUsageRows = driverCost
      ? driverShifts.map((shift) => buildCanonicalDriverUsageRow({
        entryId: entry.id,
        periodStart: sourceStart,
        periodEnd: sourceEnd,
        shift,
      }))
      : [];
    const fuelUsageRows = vehicleKilometerCost
      ? shifts.map((shift) => buildCanonicalFuelUsageRow({
        entryId: entry.id,
        periodStart: sourceStart,
        periodEnd: sourceEnd,
        shift,
      }))
      : [];
    const fixedUsageRows = vehicleFixedCost
      ? shifts.map((shift) => buildCanonicalVehicleUsageRow({
        entryId: entry.id,
        periodStart: sourceStart,
        periodEnd: sourceEnd,
        shift,
      }))
      : [];
    const incompleteFuelRows = fuelUsageRows.filter((result) => result.status !== 'READY');
    const incompleteFixedRows = fixedUsageRows.filter((result) => result.status !== 'READY');
    const incompleteDriverRows = driverUsageRows.filter((result) => result.status !== 'READY');
    const usageRows = driverCost
      ? driverUsageRows.map((result) => result.row)
      : vehicleKilometerCost
        ? fuelUsageRows.map((result) => result.row)
        : vehicleFixedCost
          ? fixedUsageRows.map((result) => result.row)
      : shifts.map((shift) => ({
        shiftId: shift.id,
        vehicleId: shift.vehicleId,
        driverId: shift.driverId,
        agreementId: shift.agreementId,
        quantity: (shift.endAt.getTime() - shift.startAt.getTime()) / (60 * 60 * 1000),
        unit: 'HOUR',
        periodStart: sourceStart,
        periodEnd: sourceEnd,
        evidenceRef: `CANONICAL_SHIFT_USAGE:${entry.id}:${shift.id}`,
      }));
    const automaticPrefix = `AUTO_USAGE:${entry.id}:`;
    const previousAutomaticLines = (entry.allocationLines || []).filter((line) => String(line.lineageKey || '').startsWith(automaticPrefix));
    const existingManualLines = (entry.allocationLines || []).filter((line) => !String(line.lineageKey || '').startsWith(automaticPrefix));
    const manuallyAllocatedMinor = existingManualLines.reduce((sum, line) => sum + (positiveId(line.allocatedAmountMinor) || 0), 0);
    const remainingSourceMinor = entry.amountMinor - manuallyAllocatedMinor;
    if (remainingSourceMinor <= 0) {
      throw errorWith('AUTO_ALLOCATION_SOURCE_ALREADY_ASSIGNED', 'Bu giderin tamamı zaten doğrulanmış dağıtım paylarına ayrılmış.', { status: 409 });
    }
    if (vehicleKilometerCost && incompleteFuelRows.length) {
      const categoryLabel = isPeriodicVehicleFuelEntry(entry)
        ? 'Yakıt'
        : (String(entry.category?.key || '').toUpperCase() === 'TIRE_RIM' ? 'Lastik / Jant' : 'Bakım');
      throw errorWith('AUTO_ALLOCATION_USAGE_INCOMPLETE', `${categoryLabel} gideri yalnız doğrulanmış rota kilometreleri bulunan tamamlanmış seferlere otomatik dağıtılabilir; gider araç üzerinde korunuyor.`, {
        status: 409,
        missing: [...new Set(incompleteFuelRows.flatMap((result) => result.missing || []))],
        unallocatedAmountMinor: remainingSourceMinor,
      });
    }
    if (vehicleFixedCost && incompleteFixedRows.length) {
      const categoryLabel = String(entry.category?.key || '').toUpperCase() === 'RENT'
        ? 'Kira'
        : (String(entry.category?.key || '').toUpperCase() === 'CASCO' ? 'Kasko' : 'Sabit araç');
      throw errorWith('AUTO_ALLOCATION_USAGE_INCOMPLETE', `${categoryLabel} gideri yalnız doğrulanmış çalışma süresi ve müşteri/sözleşme bağlantısı bulunan tamamlanmış seferlere otomatik dağıtılabilir; gider araç üzerinde korunuyor.`, {
        status: 409,
        missing: [...new Set(incompleteFixedRows.flatMap((result) => result.missing || []))],
        unallocatedAmountMinor: remainingSourceMinor,
      });
    }
    if (driverCost && incompleteDriverRows.length) {
      if (previousAutomaticLines.length) {
        await tx.roomCostAllocationLine.deleteMany({
          where: { roomId: requestedRoomId, entryId: id, lineageKey: { startsWith: automaticPrefix } },
        });
        await recordAuditInTransaction(tx, {
          actor,
          action: 'ROOM_COST_ALLOCATION_AUTO_INVALIDATED_INCOMPLETE_USAGE',
          entity: 'RoomCostAllocationLine',
          entityId: id,
          meta: {
            roomId: requestedRoomId,
            entryId: id,
            sourceRef: entry.sourceRef,
            invalidatedAutomaticLineIds: previousAutomaticLines.map((line) => positiveId(line.id)).filter(Boolean),
            invalidatedAutomaticShiftIds: previousAutomaticLines.map((line) => positiveId(line.shiftId)).filter(Boolean),
            missing: [...new Set(incompleteDriverRows.flatMap((result) => result.missing || []))],
          },
        });
      }
      return {
        status: 'INCOMPLETE',
        entryId: id,
        missing: [...new Set(incompleteDriverRows.flatMap((result) => result.missing || []))],
        unallocatedAmountMinor: remainingSourceMinor,
      };
    }
    const plan = buildWeightedUsageAllocationPlan({ sourceAmountMinor: remainingSourceMinor, usageRows });
    if (plan.status !== 'READY') {
      throw errorWith('AUTO_ALLOCATION_USAGE_INCOMPLETE', 'Dönemde dağıtılabilecek doğrulanmış vardiya kullanım kanıtı bulunamadı; gider dağıtılmamış bırakıldı.', {
        status: 409,
        missing: plan.missing,
        unallocatedAmountMinor: plan.unallocatedAmountMinor,
      });
    }

    await tx.roomCostAllocationLine.deleteMany({
      where: { roomId: requestedRoomId, entryId: id, lineageKey: { startsWith: automaticPrefix } },
    });
    const averageRateMinor = Number.isInteger(remainingSourceMinor / Number(plan.totalUsageQuantity))
      ? remainingSourceMinor / Number(plan.totalUsageQuantity)
      : null;
    const data = plan.shares.map((share) => ({
      roomId: requestedRoomId,
      entryId: id,
      lineageKind: 'REFERENCE',
      targetKind: 'SHIFT',
      lineageKey: `${automaticPrefix}SHIFT:${share.shiftId}`,
      vehicleId: positiveId(share.vehicleId),
      driverId: positiveId(share.driverId),
      agreementId: positiveId(share.agreementId),
      shiftId: positiveId(share.shiftId),
      periodStart: sourceStart,
      periodEnd: sourceEnd,
      quantity: String(share.quantity),
      unit: share.unit,
      unitRateMinor: averageRateMinor,
      allocatedAmountMinor: share.allocatedAmountMinor,
      currencyCode: entry.currencyCode,
      sourceRef: text(entry.sourceRef),
      evidenceRef: text(share.evidenceRef) || `CANONICAL_SHIFT_USAGE:${entry.id}:${share.shiftId}`,
    }));
    await tx.roomCostAllocationLine.createMany({ data });
    await recordAuditInTransaction(tx, {
      actor,
      action: 'ROOM_COST_ALLOCATION_AUTO_REBUILT',
      entity: 'RoomCostAllocationLine',
      entityId: id,
      meta: {
        roomId: requestedRoomId,
        entryId: id,
        sourceRef: entry.sourceRef,
        usageUnit: vehicleKilometerCost ? 'KM' : 'HOUR',
        totalUsageQuantity: plan.totalUsageQuantity,
        allocatedAmountMinor: plan.allocatedAmountMinor,
        unallocatedAmountMinor: plan.unallocatedAmountMinor,
        shiftIds: plan.shares.map((share) => share.shiftId),
        previousAutomaticShiftIds: previousAutomaticLines.map((line) => positiveId(line.shiftId)).filter(Boolean),
        previousAutomaticOwners: previousAutomaticLines.map((line) => ({
          vehicleId: positiveId(line.vehicleId),
          driverId: positiveId(line.driverId),
        })),
      },
    });
    return { entryId: id, plan, lines: data };
  }, { isolationLevel: 'Serializable' });

  if (result?.status === 'INCOMPLETE') {
    throw errorWith('AUTO_ALLOCATION_USAGE_INCOMPLETE', 'Sürücü maliyeti yalnız tamamlanmış çalışma süresi ve doğrulanmış müşteri/sözleşme bağlantısı bulunan vardiyalara otomatik dağıtılabilir; gider sürücü üzerinde korunuyor.', {
      status: 409,
      missing: result.missing,
      unallocatedAmountMinor: result.unallocatedAmountMinor,
    });
  }

  return result;
}

/**
 * Confirmation is the only user action needed for a monthly vehicle fuel
 * expense.  Route evidence is optional for saving the expense, but required
 * before any automatic cost share is created; an incomplete route therefore
 * leaves the confirmed source intact and reports the safe pending state.
 */
export async function automaticallyAllocatePeriodicVehicleCostAfterConfirmation({ actor, roomId, entryId, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(entryId);
  if (!id) return Object.freeze({ status: 'NOT_APPLICABLE' });

  const entry = await prisma.roomCostEntry.findFirst({
    where: { roomId: requestedRoomId, id },
    include: { category: true },
  });
  if (!entry || (!isPeriodicVehicleKilometerCostEntry(entry) && !isPeriodicVehicleFixedCostEntry(entry))) return Object.freeze({ status: 'NOT_APPLICABLE' });

  try {
    const result = await autoAllocateCostByCanonicalUsage({
      actor,
      roomId: requestedRoomId,
      entryId: id,
      prisma,
      req,
    });
    return Object.freeze({ status: 'READY', entryId: id, plan: result.plan, lines: result.lines });
  } catch (error) {
    if (error?.code !== 'AUTO_ALLOCATION_USAGE_INCOMPLETE') throw error;
    await recordAudit({
      audit,
      req,
      action: 'ROOM_COST_ALLOCATION_AUTO_SKIPPED',
      entryId: id,
      roomId: requestedRoomId,
      version: entry.version,
      recordKind: entry.recordKind,
    });
    return Object.freeze({
      status: 'INCOMPLETE',
      entryId: id,
      missing: Array.isArray(error.missing) ? error.missing : ['doğrulanmış rota kilometresi'],
      unallocatedAmountMinor: error.unallocatedAmountMinor ?? entry.amountMinor,
    });
  }
}

export async function automaticallyAllocatePeriodicFuelAfterConfirmation(options = {}) {
  return automaticallyAllocatePeriodicVehicleCostAfterConfirmation(options);
}

/**
 * Confirmation is the only user action needed for a periodic driver cost.
 * Only DONE shifts with a valid start/end duration are eligible; planned or
 * in-progress work is never treated as completed compensation evidence.
 */
export async function automaticallyAllocatePeriodicDriverAfterConfirmation({ actor, roomId, entryId, prisma: providedPrisma, db, audit, req } = {}) {
  const prisma = resolvePrisma({ prisma: providedPrisma, db });
  const requestedRoomId = assertRoomActor(actor, roomId);
  const id = positiveId(entryId);
  if (!id) return Object.freeze({ status: 'NOT_APPLICABLE' });

  const entry = await prisma.roomCostEntry.findFirst({
    where: { roomId: requestedRoomId, id },
    include: { category: true },
  });
  if (!entry || !isPeriodicDriverCostEntry(entry)) return Object.freeze({ status: 'NOT_APPLICABLE' });

  try {
    const result = await autoAllocateCostByCanonicalUsage({
      actor,
      roomId: requestedRoomId,
      entryId: id,
      prisma,
      req,
    });
    return Object.freeze({ status: 'READY', entryId: id, plan: result.plan, lines: result.lines });
  } catch (error) {
    if (error?.code !== 'AUTO_ALLOCATION_USAGE_INCOMPLETE') throw error;
    await recordAudit({
      audit,
      req,
      action: 'ROOM_COST_ALLOCATION_AUTO_SKIPPED',
      entryId: id,
      roomId: requestedRoomId,
      version: entry.version,
      recordKind: entry.recordKind,
    });
    return Object.freeze({
      status: 'INCOMPLETE',
      entryId: id,
      missing: Array.isArray(error.missing) ? error.missing : ['tamamlanmış çalışma süresi'],
      unallocatedAmountMinor: error.unallocatedAmountMinor ?? entry.amountMinor,
    });
  }
}

export {
  ALLOCATION_MODES,
  SALARY_CATEGORY_KEYS,
  RECORD_KINDS,
  assertNoDuplicateSourceRef,
};
