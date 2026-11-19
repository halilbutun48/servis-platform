import { adaptLedgerEntriesToOperationalInputs } from "./roomCostPreviewAdapter.js";
import { isVatGrossOnly, isVatNetRollupEligible, normalizedVatClassification } from "./roomCostPolicy.js";
import { adaptForecastLedgerEntriesToOperationalInputs } from "./roomCostPreviewAdapter.js";
import { canonicalEmptyDistanceForRoute } from "./vehicleConsumptionReferences.js";

const TARGET_FIELDS = Object.freeze([
  ["vehicleId", "VEHICLE"],
  ["driverId", "DRIVER"],
  ["agreementId", "AGREEMENT"],
  ["shiftId", "SHIFT"],
]);

const OCCURRENCE_KINDS = new Set(["ONE_OFF", "PERIODIC", "RECURRING", "PER_KM", "PER_TRIP", "PER_SHIFT"]);
const USAGE_UNITS = new Set(["KM", "HOUR", "MINUTE", "SHIFT"]);

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function integer(value) {
  return Number.isSafeInteger(value) ? value : null;
}

function inputInteger(value) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function signedAmount(entry) {
  const amount = integer(entry?.amountMinor);
  if (amount === null) return null;
  return entry?.isReversal ? -amount : amount;
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function allocationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function strictDate(value) {
  if (value == null || String(value).trim() === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value.trim())) {
    const [year, month, day] = value.trim().split("-").map(Number);
    const dateOnly = new Date(Date.UTC(year, month - 1, day));
    if (dateOnly.getUTCFullYear() !== year || dateOnly.getUTCMonth() !== month - 1 || dateOnly.getUTCDate() !== day) return null;
    return dateOnly;
  }
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateAllocationUsageEvidence({ input = {}, entry = {}, allowPlanningForecast = false } = {}) {
  const lineageKind = String(input.lineageKind || "REFERENCE").toUpperCase();
  const targetKind = String(input.targetKind || "").toUpperCase();
  if (lineageKind !== "REFERENCE" || targetKind !== "SHIFT") return Object.freeze({ applicable: false });

  const planningForecast = allowPlanningForecast
    && ["FORECAST", "BUDGET"].includes(String(entry?.recordKind || "").toUpperCase());
  if (String(entry.allocation || "DIRECT").toUpperCase() === "DIRECT" && !planningForecast) {
    throw allocationError("ALLOCATION_DIRECT_SOURCE_NOT_REQUIRED", "Doğrudan vardiyaya bağlı gider yeniden dağıtılamaz.");
  }

  const amount = inputInteger(input.allocatedAmountMinor);
  if (amount === null || amount <= 0) throw allocationError("ALLOCATION_AMOUNT_REQUIRED", "Servis payı 0 TL'den büyük olmalıdır.");

  const quantity = String(input.quantity ?? "").trim();
  if (!quantity) throw allocationError("ALLOCATION_QUANTITY_REQUIRED", "Kullanım miktarı gerekir.");
  if (!/^\d+(?:\.\d{1,4})?$/.test(quantity) || Number(quantity) <= 0) {
    throw allocationError("ALLOCATION_QUANTITY_INVALID", "Kullanım miktarı pozitif ve geçerli olmalıdır.");
  }

  const unit = String(input.unit || "").trim().toUpperCase();
  if (!USAGE_UNITS.has(unit)) throw allocationError("ALLOCATION_UNIT_REQUIRED", "Desteklenen kullanım ölçüm birimi gerekir.");

  const unitRateMinor = inputInteger(input.unitRateMinor);
  if (unitRateMinor === null || unitRateMinor <= 0) {
    throw allocationError("ALLOCATION_UNIT_RATE_REQUIRED", "Kullanım birim payı 0 TL'den büyük olmalıdır.");
  }
  if (Math.round(Number(quantity) * unitRateMinor) !== amount) {
    throw allocationError("ALLOCATION_AMOUNT_MISMATCH", "Kullanım miktarı ve birim payı servis payıyla eşleşmiyor.");
  }

  const sourceRef = String(input.sourceRef ?? "").trim();
  if (!sourceRef) throw allocationError("ALLOCATION_SOURCE_REF_REQUIRED", "Canonical gider kaynak referansı gerekir.");
  if (sourceRef !== String(entry.sourceRef ?? "").trim()) {
    throw allocationError("ALLOCATION_SOURCE_REF_MISMATCH", "Kullanım kanıtı başka bir gider kaynak referansına bağlanamaz.");
  }
  if (!String(input.evidenceRef ?? "").trim()) {
    throw allocationError("ALLOCATION_EVIDENCE_REF_REQUIRED", "Kullanım kanıtı referansı gerekir.");
  }

  const periodStart = strictDate(input.periodStart);
  const periodEnd = strictDate(input.periodEnd);
  if (!periodStart || !periodEnd) throw allocationError("ALLOCATION_PERIOD_INVALID", "Kullanım dönemi geçerli tarihlerden oluşmalıdır.");
  if (periodStart > periodEnd) throw allocationError("ALLOCATION_PERIOD_ORDER_INVALID", "Kullanım dönemi başlangıcı bitişinden sonra olamaz.");
  const sourceStart = strictDate(entry.periodStart);
  const sourceEnd = strictDate(entry.periodEnd);
  if (sourceStart && periodStart < sourceStart) throw allocationError("ALLOCATION_PERIOD_OUTSIDE_SOURCE", "Kullanım dönemi gider kaynağının başlangıcından önce olamaz.");
  if (sourceEnd && periodEnd > sourceEnd) throw allocationError("ALLOCATION_PERIOD_OUTSIDE_SOURCE", "Kullanım dönemi gider kaynağının bitişinden sonra olamaz.");

  return Object.freeze({ applicable: true, quantity, unit, unitRateMinor, amountMinor: amount, periodStart, periodEnd });
}

export function validateAllocationLineBudget({
  sourceAmountMinor,
  existingLines = [],
  nextLineId = null,
  nextAmountMinor,
  lineageKind = "REFERENCE",
} = {}) {
  const source = integer(sourceAmountMinor);
  const amount = integer(nextAmountMinor);
  if (source === null || source <= 0) {
    throw allocationError("ALLOCATION_SOURCE_AMOUNT_INVALID", "Dağıtım kaynağının tutarı geçersiz.");
  }
  if (amount === null || amount < 0) {
    throw allocationError("ALLOCATION_AMOUNT_INVALID", "Dağıtım tutarı geçersiz.");
  }

  const currentId = integer(nextLineId);
  const otherLines = Array.isArray(existingLines)
    ? existingLines.filter((line) => integer(line?.id) !== currentId)
    : [];
  const totalAllocatedMinor = otherLines.reduce((sum, line) => {
    const lineAmount = integer(line?.allocatedAmountMinor);
    return sum + (lineAmount !== null && lineAmount > 0 ? lineAmount : 0);
  }, 0) + amount;
  if (totalAllocatedMinor > source) {
    throw allocationError(
      "ALLOCATION_TOTAL_EXCEEDS_SOURCE",
      "Dağıtım paylarının toplamı kaynak gider tutarını aşamaz.",
    );
  }

  if (String(lineageKind || "REFERENCE").toUpperCase() === "COMPONENT") {
    const componentTotalMinor = otherLines.reduce((sum, line) => {
      if (String(line?.lineageKind || "").toUpperCase() !== "COMPONENT") return sum;
      const lineAmount = integer(line?.allocatedAmountMinor);
      return sum + (lineAmount !== null && lineAmount > 0 ? lineAmount : 0);
    }, 0) + amount;
    if (componentTotalMinor !== source) {
      throw allocationError(
        "COMPONENT_LINEAGE_AMOUNT_MISMATCH",
        "Bileşen satırları ana gider tutarını tam karşılamalıdır.",
      );
    }
  }

  return Object.freeze({
    sourceAmountMinor: source,
    totalAllocatedMinor,
    remainingMinor: source - totalAllocatedMinor,
  });
}

function formatUsageQuantity(value) {
  return Number(value).toFixed(4).replace(/0+$/u, "").replace(/\.$/u, "") || "0";
}

/**
 * Builds one server-owned fuel usage row from the shift's validated route
 * snapshot.  Empty kilometres are included only when the shift carries both
 * an evidence reference and an explanation; otherwise the source remains
 * safely unallocated instead of receiving an invented distance.
 */
export function buildCanonicalFuelUsageRow({ entryId, periodStart, periodEnd, shift = {} } = {}) {
  const shiftId = inputInteger(shift.id);
  const vehicleId = inputInteger(shift.vehicleId);
  const driverId = inputInteger(shift.driverId);
  const agreementId = inputInteger(shift.agreementId);
  const routeDistanceM = Number(shift.routeSnapshotDistanceM);
  if (!shiftId || !vehicleId || !driverId || !agreementId || !Number.isFinite(routeDistanceM) || routeDistanceM <= 0) {
    return Object.freeze({ status: "INCOMPLETE", row: null, missing: ["doğrulanmış rota kilometresi"] });
  }

  const emptyDistanceEvidence = Boolean(text(shift.emptyDistanceEvidenceRef) && text(shift.emptyDistanceReason));
  const emptyDistanceKm = canonicalEmptyDistanceForRoute({
    emptyDistanceKm: shift.emptyDistanceKm,
    emptyDistanceEvidence,
  });
  const routeDistanceKm = routeDistanceM / 1000;
  const quantity = Number((routeDistanceKm + (emptyDistanceKm ?? 0)).toFixed(4));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return Object.freeze({ status: "INCOMPLETE", row: null, missing: ["doğrulanmış rota kilometresi"] });
  }

  const routeEvidence = `CANONICAL_ROUTE_KM:${entryId ?? "PENDING"}:${shiftId}:${Math.round(routeDistanceM)}M`;
  const evidenceRef = emptyDistanceKm === null
    ? routeEvidence
    : `${routeEvidence}:EMPTY_KM:${text(shift.emptyDistanceEvidenceRef)}`;

  return Object.freeze({
    status: "READY",
    row: Object.freeze({
      shiftId,
      vehicleId,
      driverId,
      agreementId,
      quantity,
      unit: "KM",
      periodStart,
      periodEnd,
      evidenceRef,
      routeDistanceKm,
      emptyDistanceKm,
    }),
    missing: [],
  });
}

/**
 * Builds one server-owned driver-cost usage row from a completed shift's
 * actual start/end duration.  Driver compensation is never inferred from
 * distance: without a completed, bounded shift the source remains safely
 * unallocated.
 */
export function buildCanonicalDriverUsageRow({ entryId, periodStart, periodEnd, shift = {} } = {}) {
  const shiftId = inputInteger(shift.id);
  const vehicleId = inputInteger(shift.vehicleId);
  const driverId = inputInteger(shift.driverId);
  const agreementId = inputInteger(shift.agreementId);
  const startAt = strictDate(shift.startAt);
  const endAt = strictDate(shift.endAt);
  const durationHours = startAt && endAt
    ? (endAt.getTime() - startAt.getTime()) / (60 * 60 * 1000)
    : 0;
  const completed = String(shift.status || "").trim().toUpperCase() === "DONE";
  const missing = [];
  if (!shiftId) missing.push("vardiya");
  if (!driverId) missing.push("sürücü");
  if (!agreementId) missing.push("müşteri/sözleşme bağlantısı");
  if (!startAt || !endAt || durationHours <= 0 || !completed) missing.push("tamamlanmış çalışma süresi");

  if (missing.length) {
    return Object.freeze({ status: "INCOMPLETE", row: null, missing: [...new Set(missing)] });
  }

  return Object.freeze({
    status: "READY",
    row: Object.freeze({
      shiftId,
      vehicleId,
      driverId,
      agreementId,
      quantity: Number(durationHours.toFixed(4)),
      unit: "HOUR",
      periodStart,
      periodEnd,
      evidenceRef: `CANONICAL_SHIFT_DURATION:${entryId ?? "PENDING"}:${shiftId}:${startAt.toISOString()}:${endAt.toISOString()}`,
    }),
    missing: [],
  });
}

/**
 * Builds one server-owned vehicle usage row for shared fixed vehicle costs.
 * Fixed costs use verified completed shift duration, not route distance.  A
 * driver relation is retained when present, but it is not required to prove
 * the vehicle's service usage.
 */
export function buildCanonicalVehicleUsageRow({ entryId, periodStart, periodEnd, shift = {} } = {}) {
  const shiftId = inputInteger(shift.id);
  const vehicleId = inputInteger(shift.vehicleId);
  const driverId = inputInteger(shift.driverId);
  const agreementId = inputInteger(shift.agreementId);
  const startAt = strictDate(shift.startAt);
  const endAt = strictDate(shift.endAt);
  const durationHours = startAt && endAt
    ? (endAt.getTime() - startAt.getTime()) / (60 * 60 * 1000)
    : 0;
  const completed = String(shift.status || "").trim().toUpperCase() === "DONE";
  const missing = [];
  if (!shiftId) missing.push("vardiya");
  if (!vehicleId) missing.push("araç");
  if (!agreementId) missing.push("müşteri/sözleşme bağlantısı");
  if (!startAt || !endAt || durationHours <= 0 || !completed) missing.push("tamamlanmış çalışma süresi");

  if (missing.length) {
    return Object.freeze({ status: "INCOMPLETE", row: null, missing: [...new Set(missing)] });
  }

  return Object.freeze({
    status: "READY",
    row: Object.freeze({
      shiftId,
      vehicleId,
      driverId,
      agreementId,
      quantity: Number(durationHours.toFixed(4)),
      unit: "HOUR",
      periodStart,
      periodEnd,
      evidenceRef: `CANONICAL_VEHICLE_SHIFT_DURATION:${entryId ?? "PENDING"}:${shiftId}:${startAt.toISOString()}:${endAt.toISOString()}`,
    }),
    missing: [],
  });
}

/**
 * Paylaşılan dönemsel bir gideri yalnızca sunucunun doğruladığı vardiya
 * kullanım kanıtları üzerinden paylaştırır. Kayıt bulunmadığında kaynak
 * gideri vardiyalara zorla dağıtmaz; tutarı dağıtılmamış bırakır.
 */
export function buildWeightedUsageAllocationPlan({ sourceAmountMinor, usageRows = [] } = {}) {
  const sourceAmount = inputInteger(sourceAmountMinor);
  if (sourceAmount === null || sourceAmount <= 0) {
    return Object.freeze({
      status: "INCOMPLETE",
      shares: [],
      totalUsageQuantity: "0",
      allocatedAmountMinor: 0,
      unallocatedAmountMinor: sourceAmount || 0,
      missing: ["geçerli kaynak gider tutarı"],
    });
  }

  const normalized = (Array.isArray(usageRows) ? usageRows : []).map((row) => {
    const quantity = Number(row?.quantity);
    const shiftId = inputInteger(row?.shiftId);
    const agreementId = inputInteger(row?.agreementId);
    if (!Number.isFinite(quantity) || quantity <= 0 || !shiftId || !agreementId) return null;
    return { ...row, shiftId, agreementId, quantity };
  });
  if (!normalized.length || normalized.some((row) => !row)) {
    return Object.freeze({
      status: "INCOMPLETE",
      shares: [],
      totalUsageQuantity: "0",
      allocatedAmountMinor: 0,
      unallocatedAmountMinor: sourceAmount,
      missing: ["canonical vardiya kullanım kanıtı"],
    });
  }

  const totalUsage = normalized.reduce((sum, row) => sum + row.quantity, 0);
  if (!Number.isFinite(totalUsage) || totalUsage <= 0) {
    return Object.freeze({
      status: "INCOMPLETE",
      shares: [],
      totalUsageQuantity: "0",
      allocatedAmountMinor: 0,
      unallocatedAmountMinor: sourceAmount,
      missing: ["pozitif vardiya kullanım süresi"],
    });
  }

  let allocated = 0;
  const shares = normalized.map((row, index) => {
    const amount = index === normalized.length - 1
      ? sourceAmount - allocated
      : Math.floor((sourceAmount * row.quantity) / totalUsage);
    allocated += amount;
    return Object.freeze({
      ...row,
      quantity: formatUsageQuantity(row.quantity),
      unit: String(row.unit || "HOUR").toUpperCase(),
      allocatedAmountMinor: amount,
      usageShare: row.quantity / totalUsage,
    });
  });

  return Object.freeze({
    status: "READY",
    shares: Object.freeze(shares),
    totalUsageQuantity: formatUsageQuantity(totalUsage),
    allocatedAmountMinor: allocated,
    unallocatedAmountMinor: sourceAmount - allocated,
    missing: [],
  });
}

function targetAllocationForService(line, { targetAgreementId = null, targetShiftId = null } = {}) {
  const agreementId = integer(targetAgreementId);
  const shiftId = integer(targetShiftId);
  const candidates = Array.isArray(line?.allocationLines) ? line.allocationLines : [];
  const matches = candidates.filter((item) => {
    if (!integer(item?.allocatedAmountMinor) || item.allocatedAmountMinor <= 0) return false;
    if (shiftId) return integer(item?.shiftId) === shiftId;
    return Boolean(agreementId) && integer(item?.agreementId) === agreementId;
  });
  const amountMinor = matches.reduce((sum, item) => sum + item.allocatedAmountMinor, 0);
  return { amountMinor: amountMinor || null, lines: matches };
}

function dateKey(value) {
  const result = text(value);
  return result ? result.slice(0, 10) : null;
}

function sourceLineageKey(entry) {
  const sourceRef = text(entry?.sourceRef);
  if (!sourceRef) return null;
  return [
    sourceRef,
    dateKey(entry?.periodStart) || dateKey(entry?.occurredAt) || "NO_DATE",
    dateKey(entry?.periodEnd) || dateKey(entry?.occurredAt) || "NO_DATE",
  ].join("|");
}

function relationTargets(entry) {
  return TARGET_FIELDS
    .map(([field, type]) => {
      const id = integer(entry?.[field]);
      const labelKey = `${type.toLowerCase()}Label`;
      return id ? { type, id, label: text(entry?.display?.[labelKey]) } : null;
    })
    .filter(Boolean);
}

function occurrenceEvidence(entry) {
  const kind = String(entry?.occurrenceKind || "ONE_OFF").toUpperCase();
  const missing = [];
  const blockers = [];
  const evidence = [];

  if (!OCCURRENCE_KINDS.has(kind)) {
    blockers.push("OCCURRENCE_KIND_UNSUPPORTED");
    return { kind, missing, blockers, evidence };
  }

  if (kind === "ONE_OFF") {
    if (!dateKey(entry?.occurredAt) && !(dateKey(entry?.periodStart) && dateKey(entry?.periodEnd))) {
      missing.push("occurredAt or periodStart/periodEnd");
    } else {
      evidence.push("tek seferlik gider için tarih/dönem kanıtı mevcut");
    }
  }

  if (kind === "PERIODIC" || kind === "RECURRING") {
    if (!dateKey(entry?.periodStart) || !dateKey(entry?.periodEnd)) {
      missing.push("periodStart/periodEnd");
    } else {
      evidence.push(`${kind} gider için açık dönem mevcut`);
    }
  }

  if (kind === "PER_KM") {
    if (!integer(entry?.vehicleId)) missing.push("vehicleId");
    if (!entry?.allocationQuantity) missing.push("allocationQuantity");
    if (!integer(entry?.allocationUnitRateMinor)) missing.push("allocationUnitRateMinor");
    if (!text(entry?.allocationUnit)) missing.push("allocationUnit");
  }

  if (kind === "PER_TRIP") {
    if (!integer(entry?.shiftId)) missing.push("shiftId (canonical vardiya/sefer kaydı)");
    if (!entry?.allocationQuantity) missing.push("allocationQuantity");
    if (!integer(entry?.allocationUnitRateMinor)) missing.push("allocationUnitRateMinor");
    if (!text(entry?.allocationUnit)) missing.push("allocationUnit");
  }

  if (kind === "PER_SHIFT") {
    if (!integer(entry?.shiftId)) missing.push("shiftId");
    else evidence.push("vardiya ilişkisi mevcut");
  }

  return { kind, missing, blockers, evidence };
}

function baseLine(entry) {
  const amountMinor = signedAmount(entry);
  const occurrence = occurrenceEvidence(entry);
  const targets = relationTargets(entry);
  const missing = [...occurrence.missing];
  const blockers = [...occurrence.blockers];
  const hasExplicitTemporalScope = occurrence.kind === "ONE_OFF"
    ? Boolean(dateKey(entry?.occurredAt) || (dateKey(entry?.periodStart) && dateKey(entry?.periodEnd)))
    : Boolean(dateKey(entry?.periodStart) && dateKey(entry?.periodEnd));
  if (!targets.length && !(occurrence.kind !== "PER_KM" && occurrence.kind !== "PER_TRIP" && hasExplicitTemporalScope)) {
    missing.push("ilişkili kayıt veya açık dönem");
  }

  const componentLines = Array.isArray(entry?.allocationLines) ? entry.allocationLines.filter((item) => item?.lineageKind === "COMPONENT") : [];
  const componentAmountMinor = componentLines.reduce((sum, item) => sum + (integer(item?.allocatedAmountMinor) || 0), 0);
  if (componentLines.length && componentAmountMinor !== amountMinor) blockers.push("COMPONENT_LINEAGE_AMOUNT_MISMATCH");

  const lineageRole = entry?.allocation === "COUNT_IN_ROLLUP"
    ? "ROLLUP"
    : entry?.allocation === "EXCLUDED_FROM_ROLLUP"
      ? "EXCLUDED"
      : "DIRECT";

  return {
    entryId: entry?.id ?? null,
    roomId: entry?.roomId ?? null,
    categoryKey: text(entry?.categoryKey),
    recordKind: text(entry?.recordKind),
    lifecycle: text(entry?.lifecycle),
    occurrenceKind: occurrence.kind,
    allocation: text(entry?.allocation) || "DIRECT",
    lineageRole,
    sourceRef: text(entry?.sourceRef),
    sourceType: text(entry?.sourceType),
    periodStart: dateKey(entry?.periodStart),
    periodEnd: dateKey(entry?.periodEnd),
    occurredAt: dateKey(entry?.occurredAt),
    currencyCode: text(entry?.currencyCode)?.toUpperCase() || null,
    grossAmountMinor: amountMinor,
    sourceGrossAmountMinor: amountMinor,
    netAmountMinor: isVatGrossOnly(entry) ? null : amountMinor,
    vatMode: text(entry?.vatMode),
    vatClassification: normalizedVatClassification(entry),
    vatDeductibility: text(entry?.vatDeductibility),
    vatAmountMinor: entry?.vatAmountMinor ?? null,
    vatEvidenceRef: text(entry?.vatEvidenceRef),
    vatClassificationReason: text(entry?.vatClassificationReason),
    netRollupEligible: isVatNetRollupEligible(entry),
    targets,
    quantity: entry?.allocationQuantity == null ? null : String(entry.allocationQuantity),
    unit: text(entry?.allocationUnit),
    unitRateMinor: integer(entry?.allocationUnitRateMinor),
    componentLines,
    allocationLines: Array.isArray(entry?.allocationLines) ? entry.allocationLines : [],
    componentAmountMinor: componentLines.length ? componentAmountMinor : null,
    missing,
    blockers,
    evidence: [...occurrence.evidence],
    included: false,
    excludedReason: null,
    operationalMathOwner: "backend/src/finance/operationalCostMath.js",
  };
}

function markLifecycle(line) {
  if (line.lifecycle !== "CONFIRMED") {
    line.excludedReason = "NOT_CONFIRMED";
    return;
  }
  if (line.recordKind !== "ACTUAL") {
    line.excludedReason = `${line.recordKind || "UNKNOWN"}_SEPARATE_BUCKET`;
    return;
  }
  if (line.lineageRole === "EXCLUDED") {
    line.excludedReason = "EXCLUDED_FROM_ROLLUP";
    return;
  }
  if (!Number.isSafeInteger(line.grossAmountMinor) || line.grossAmountMinor <= 0 || !line.currencyCode) {
    line.excludedReason = "INCOMPLETE_AMOUNT_OR_CURRENCY";
    return;
  }
  if (line.missing.length || line.blockers.length) {
    line.excludedReason = "ALLOCATION_EVIDENCE_INCOMPLETE";
    return;
  }
  line.included = true;
}

export function buildCostAllocationProjection(entries = [], options = {}) {
  const requireServiceAllocationEvidence = options?.requireServiceAllocationEvidence === true;
  const lines = entries.map(baseLine);
  const seenRollups = new Map();
  for (const line of lines) {
    if (requireServiceAllocationEvidence && line.lineageRole === "ROLLUP") {
      const target = targetAllocationForService(line, options);
      if (!target.amountMinor) {
        addUnique(line.missing, options?.targetShiftId ? "selected shift allocationLines" : "selected service allocationLines");
        addUnique(line.blockers, "SERVICE_ALLOCATION_EVIDENCE_INCOMPLETE");
      } else if (target.amountMinor > (line.sourceGrossAmountMinor || 0)) {
        addUnique(line.blockers, "SERVICE_ALLOCATION_AMOUNT_EXCEEDS_SOURCE");
      } else {
        line.serviceAllocatedAmountMinor = target.amountMinor;
        line.serviceAllocationLines = target.lines;
        line.grossAmountMinor = target.amountMinor;
        line.netAmountMinor = isVatGrossOnly(line) ? null : target.amountMinor;
        line.serviceAllocationShiftId = options?.targetShiftId || null;
        line.serviceAllocationAgreementId = options?.targetAgreementId || null;
      }
    }
    markLifecycle(line);
    const lineageKey = sourceLineageKey(line);
    if (line.included && line.lineageRole === "ROLLUP" && lineageKey) {
      if (seenRollups.has(lineageKey)) {
        line.included = false;
        line.excludedReason = "DUPLICATE_ROLLUP_LINEAGE";
        addUnique(line.blockers, "DUPLICATE_ROLLUP_LINEAGE");
      } else {
        seenRollups.set(lineageKey, line.entryId);
      }
    }
  }

  let unallocatedAmountMinor = 0;
  for (const line of lines) {
    if (line.lifecycle !== "CONFIRMED" || line.recordKind !== "ACTUAL" || line.lineageRole !== "ROLLUP") {
      line.unallocatedAmountMinor = 0;
      continue;
    }
    const sourceAmountMinor = Number(line.sourceGrossAmountMinor);
    if (!Number.isSafeInteger(sourceAmountMinor) || sourceAmountMinor <= 0) {
      line.unallocatedAmountMinor = 0;
      continue;
    }
    const allocatedAmountMinor = (Array.isArray(line.allocationLines) ? line.allocationLines : []).reduce((sum, allocationLine) => {
      const amount = integer(allocationLine?.allocatedAmountMinor);
      return sum + (amount !== null && amount > 0 ? amount : 0);
    }, 0);
    line.unallocatedAmountMinor = Math.max(0, sourceAmountMinor - allocatedAmountMinor);
    unallocatedAmountMinor += line.unallocatedAmountMinor;
  }

  const currencies = new Set(lines.filter((line) => line.included).map((line) => line.currencyCode));
  const mixedCurrency = currencies.size > 1;
  const blockers = [];
  const missing = [];
  if (mixedCurrency) blockers.push("MIXED_CURRENCIES");
  for (const line of lines) {
    for (const item of line.missing) addUnique(missing, item);
    for (const item of line.blockers) addUnique(blockers, item);
  }

  const includedLines = mixedCurrency ? [] : lines.filter((line) => line.included);
  const grossAmountMinor = includedLines.length ? includedLines.reduce((sum, line) => sum + line.grossAmountMinor, 0) : null;
  const netBlocked = includedLines.some((line) => !line.netRollupEligible);
  const netAmountMinor = !netBlocked && includedLines.length
    ? includedLines.reduce((sum, line) => sum + (line.netAmountMinor ?? 0), 0)
    : null;
  const excludedLines = lines.filter((line) => !line.included);
  const excludedAmountMinor = excludedLines.reduce((sum, line) => sum + (line.grossAmountMinor || 0), 0);
  const directAmountMinor = includedLines.filter((line) => line.lineageRole === "DIRECT").reduce((sum, line) => sum + line.grossAmountMinor, 0);
  const rollupAmountMinor = includedLines.filter((line) => line.lineageRole === "ROLLUP").reduce((sum, line) => sum + line.grossAmountMinor, 0);
  const sourceScopeLines = lines.filter((line) => line.lifecycle === "CONFIRMED"
    && line.recordKind === "ACTUAL"
    && line.lineageRole !== "EXCLUDED"
    && Number.isSafeInteger(line.sourceGrossAmountMinor)
    && line.sourceGrossAmountMinor > 0);
  const sourceScopeAmountMinor = sourceScopeLines.reduce((sum, line) => sum + line.sourceGrossAmountMinor, 0) || null;
  const pendingAmountMinor = sourceScopeAmountMinor == null
    ? null
    : Math.max(0, sourceScopeAmountMinor - (grossAmountMinor || 0));

  const status = blockers.length || mixedCurrency
    ? "BLOCKED"
    : includedLines.length && excludedLines.length
      ? "PARTIAL"
      : includedLines.length
        ? "READY"
        : "INCOMPLETE";

  const operationalPreviewEligible = status === "READY" && !netBlocked && !mixedCurrency && includedLines.length > 0;
  const operationalPreviewReason = operationalPreviewEligible
    ? "confirmed actual allocation has a single currency, complete relation/period evidence and VAT-safe net inputs"
    : netBlocked
      ? "VAT_UNKNOWN blocks confirmed net profitability for the affected allocation"
      : mixedCurrency
        ? "mixed currencies require explicit conversion evidence"
        : status === "BLOCKED"
          ? blockers.join(", ")
          : "allocation evidence is incomplete";

  const operationalInputs = adaptLedgerEntriesToOperationalInputs(
    includedLines.map((line) => ({
      id: line.entryId,
      roomId: line.roomId,
      categoryKey: line.categoryKey,
      amountMinor: line.grossAmountMinor,
      currencyCode: line.currencyCode,
      vatMode: line.vatMode,
      vatClassification: line.vatClassification,
      vatDeductibility: line.vatDeductibility,
      vatAmountMinor: line.vatAmountMinor,
      vatEvidenceRef: line.vatEvidenceRef,
      vatClassificationReason: line.vatClassificationReason,
      recordKind: line.recordKind,
      lifecycle: line.lifecycle,
      allocation: line.allocation,
      isReversal: false,
      sourceRef: line.sourceRef,
      vehicleId: line.targets.find((target) => target.type === "VEHICLE")?.id ?? null,
      driverId: line.targets.find((target) => target.type === "DRIVER")?.id ?? null,
      periodStart: line.periodStart,
      periodEnd: line.periodEnd,
      occurredAt: line.occurredAt,
      agreementId: line.targets.find((target) => target.type === "AGREEMENT")?.id ?? null,
      shiftId: line.serviceAllocationShiftId ?? line.targets.find((target) => target.type === "SHIFT")?.id ?? null,
      allocationQuantity: line.quantity,
      allocationUnit: line.unit,
      allocationUnitRateMinor: line.unitRateMinor,
    })),
    { existingInputs: [] },
  );

  return Object.freeze({
    status,
    currencyCode: mixedCurrency ? null : (currencies.values().next().value || null),
    lineCount: lines.length,
    includedLineCount: includedLines.length,
    excludedLineCount: excludedLines.length,
    grossAmountMinor: mixedCurrency ? null : grossAmountMinor,
    sourceScopeAmountMinor: mixedCurrency ? null : sourceScopeAmountMinor,
    pendingAmountMinor: mixedCurrency ? null : pendingAmountMinor,
    unallocatedAmountMinor: mixedCurrency ? null : (unallocatedAmountMinor || 0),
    netAmountMinor,
    excludedAmountMinor: excludedAmountMinor || null,
    directAmountMinor: directAmountMinor || null,
    rollupAmountMinor: rollupAmountMinor || null,
    componentAmountMinor: lines.reduce((sum, line) => sum + (line.componentAmountMinor || 0), 0) || null,
    componentLineageSupported: lines.some((line) => line.componentLines.length > 0),
    netRollupBlocked: netBlocked,
    mixedCurrency,
    blockers: Object.freeze(blockers),
    missing: Object.freeze(missing),
    lines: Object.freeze(lines.map((line) => Object.freeze(line))),
    operationalInputs: Object.freeze(operationalInputs),
    operationalPreview: Object.freeze({
      eligible: operationalPreviewEligible,
      grossVisible: grossAmountMinor !== null,
      netConfirmed: netAmountMinor !== null,
      reason: operationalPreviewReason,
      formulaOwner: "backend/src/finance/operationalCostMath.js",
      quoteAndProfitabilityFlow: operationalPreviewEligible ? "ALLOWED_BY_ALLOCATION_EVIDENCE" : "BLOCKED_OR_NOT_CONFIRMED",
    }),
    formulaOwner: "backend/src/finance/operationalCostMath.js",
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

/**
 * Projects confirmed FORECAST/BUDGET reference lines for planning only.
 *
 * This intentionally lives beside the ACTUAL projection but never reuses its
 * inclusion path: actual ledger inputs remain ACTUAL-only. A forecast source
 * may be directly owned by a vehicle and still carry measured planning
 * reference lines; those lines are accepted only after the canonical source,
 * period, relation and amount checks performed by the ledger write path.
 */
export function buildForecastCostAllocationProjection(entries = [], options = {}) {
  const requireServiceAllocationEvidence = options?.requireServiceAllocationEvidence !== false;
  const lines = [];
  const inputByEntryId = new Map();
  const blockers = [];
  const missing = [];
  let sourceScopeAmountMinor = 0;
  let allocatedAmountMinor = 0;
  let unallocatedAmountMinor = 0;
  let selectedAmountMinor = 0;
  const currencies = new Set();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const line = baseLine(entry);
    const recordKind = String(entry?.recordKind || "").toUpperCase();
    const sourceAmountMinor = integer(entry?.amountMinor);
    const sourceLines = Array.isArray(entry?.allocationLines) ? entry.allocationLines : [];
    const positiveSourceLines = sourceLines.filter((item) => integer(item?.allocatedAmountMinor) > 0);
    const entryAllocatedAmountMinor = positiveSourceLines.reduce(
      (sum, item) => sum + Number(item.allocatedAmountMinor),
      0,
    );
    const target = targetAllocationForService(line, options);

    line.planningOnly = true;
    line.sourceGrossAmountMinor = sourceAmountMinor;
    line.planningAllocatedAmountMinor = entryAllocatedAmountMinor;
    line.serviceAllocatedAmountMinor = target.amountMinor;
    line.serviceAllocationLines = target.lines;
    line.grossAmountMinor = target.amountMinor || 0;
    line.netAmountMinor = isVatGrossOnly(entry) ? null : line.grossAmountMinor;
    line.included = false;

    if (!['FORECAST', 'BUDGET'].includes(recordKind)) {
      line.excludedReason = 'NON_PLANNING_RECORD_KIND';
      lines.push(line);
      continue;
    }
    if (line.lifecycle !== 'CONFIRMED') {
      line.excludedReason = 'NOT_CONFIRMED';
      addUnique(missing, 'confirmed forecast/budget entries');
      lines.push(line);
      continue;
    }
    if (line.lineageRole === 'EXCLUDED') {
      line.excludedReason = 'EXCLUDED_FROM_ROLLUP';
      lines.push(line);
      continue;
    }
    if (sourceAmountMinor === null || sourceAmountMinor <= 0 || !line.currencyCode) {
      line.excludedReason = 'INCOMPLETE_AMOUNT_OR_CURRENCY';
      addUnique(missing, 'forecast amount and currency');
      lines.push(line);
      continue;
    }
    if (entryAllocatedAmountMinor > sourceAmountMinor) {
      line.excludedReason = 'PLANNING_ALLOCATION_EXCEEDS_SOURCE';
      addUnique(blockers, 'PLANNING_ALLOCATION_EXCEEDS_SOURCE');
      lines.push(line);
      continue;
    }

    currencies.add(line.currencyCode);
    sourceScopeAmountMinor += sourceAmountMinor;
    allocatedAmountMinor += entryAllocatedAmountMinor;
    unallocatedAmountMinor += Math.max(0, sourceAmountMinor - entryAllocatedAmountMinor);
    if (requireServiceAllocationEvidence && !target.amountMinor) {
      line.excludedReason = options?.targetShiftId
        ? 'SELECTED_FORECAST_ALLOCATION_EVIDENCE_INCOMPLETE'
        : 'SELECTED_SERVICE_FORECAST_ALLOCATION_EVIDENCE_INCOMPLETE';
      addUnique(missing, line.excludedReason);
    } else if (target.amountMinor) {
      line.included = true;
      selectedAmountMinor += target.amountMinor;
    }
    if (target.amountMinor) {
      const sourceLineage = sourceLineageKey(line);
      if (sourceLineage) {
        const existing = lines.find((item) => item.included && sourceLineageKey(item) === sourceLineage);
        if (existing) {
          line.included = false;
          line.excludedReason = 'DUPLICATE_PLANNING_LINEAGE';
          addUnique(blockers, 'DUPLICATE_PLANNING_LINEAGE');
        }
      }
    }
    inputByEntryId.set(entry?.id, entry);
    lines.push(line);
  }

  if (currencies.size > 1) addUnique(blockers, 'MIXED_CURRENCIES');
  const includedLines = currencies.size > 1 ? [] : lines.filter((line) => line.included);
  const forecastInputs = [];
  for (const line of includedLines) {
    const entry = inputByEntryId.get(line.entryId);
    const allocationLines = Array.isArray(line.serviceAllocationLines) ? line.serviceAllocationLines : [];
    for (const allocationLine of allocationLines) {
      const amountMinor = integer(allocationLine?.allocatedAmountMinor);
      if (!entry || amountMinor === null || amountMinor <= 0) continue;
      forecastInputs.push({
        ...entry,
        amountMinor,
        vehicleId: allocationLine.vehicleId ?? entry.vehicleId ?? null,
        driverId: allocationLine.driverId ?? entry.driverId ?? null,
        agreementId: allocationLine.agreementId ?? entry.agreementId ?? null,
        shiftId: allocationLine.shiftId ?? entry.shiftId ?? null,
        allocation: 'COUNT_IN_ROLLUP',
        allocationQuantity: allocationLine.quantity ?? null,
        allocationUnit: allocationLine.unit ?? null,
        allocationUnitRateMinor: allocationLine.unitRateMinor ?? null,
        periodStart: allocationLine.periodStart ?? entry.periodStart ?? null,
        periodEnd: allocationLine.periodEnd ?? entry.periodEnd ?? null,
        sourceRef: allocationLine.sourceRef ?? entry.sourceRef ?? null,
        evidenceRef: allocationLine.evidenceRef ?? entry.evidenceRef ?? null,
      });
    }
  }
  const adaptedForecastInputs = adaptForecastLedgerEntriesToOperationalInputs(forecastInputs);
  const grossAmountMinor = includedLines.length ? selectedAmountMinor : null;
  const status = blockers.length || currencies.size > 1
    ? 'BLOCKED'
    : includedLines.length && missing.length
      ? 'PARTIAL'
      : includedLines.length
        ? 'READY'
        : missing.length
          ? 'INCOMPLETE'
          : 'INCOMPLETE';

  return Object.freeze({
    status,
    planningOnly: true,
    currencyCode: currencies.size === 1 ? [...currencies][0] : null,
    lineCount: lines.length,
    includedLineCount: includedLines.length,
    excludedLineCount: lines.length - includedLines.length,
    sourceScopeAmountMinor: currencies.size > 1 ? null : (sourceScopeAmountMinor || null),
    allocatedAmountMinor: currencies.size > 1 ? null : (allocatedAmountMinor || 0),
    grossAmountMinor: currencies.size > 1 ? null : grossAmountMinor,
    pendingAmountMinor: currencies.size > 1 || sourceScopeAmountMinor === 0
      ? null
      : Math.max(0, sourceScopeAmountMinor - (grossAmountMinor || 0)),
    unallocatedAmountMinor: currencies.size > 1 ? null : unallocatedAmountMinor,
    netAmountMinor: currencies.size > 1 || includedLines.some((line) => isVatGrossOnly(inputByEntryId.get(line.entryId)))
      ? null
      : grossAmountMinor,
    blockers: Object.freeze(blockers),
    missing: Object.freeze(missing),
    lines: Object.freeze(lines.map((line) => Object.freeze(line))),
    operationalInputs: Object.freeze(adaptedForecastInputs),
    forecastCostInputs: Object.freeze(adaptedForecastInputs),
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

export { OCCURRENCE_KINDS, TARGET_FIELDS };
