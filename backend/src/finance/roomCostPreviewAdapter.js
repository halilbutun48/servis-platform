import { isVatGrossOnly, isVatNetRollupEligible, normalizedVatClassification } from './roomCostPolicy.js';

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

const OPERATIONAL_COMPONENT_BY_CATEGORY = Object.freeze({
  FUEL: 'fuel',
  ADBLUE: 'fuel',
  MAINTENANCE: 'vehicle_variable',
  REPAIR: 'vehicle_variable',
  TIRE_RIM: 'vehicle_variable',
  DEPRECIATION: 'vehicle_fixed_allocated',
  MTV_TAX: 'vehicle_fixed_allocated',
  TRAFFIC_INSURANCE: 'vehicle_fixed_allocated',
  CASCO: 'vehicle_fixed_allocated',
  INSPECTION: 'vehicle_fixed_allocated',
  EMISSION_TEST: 'vehicle_fixed_allocated',
  MANDATORY_DOCUMENT: 'vehicle_fixed_allocated',
  LOAN_PRINCIPAL: 'vehicle_fixed_allocated',
  FINANCE_CHARGE: 'vehicle_fixed_allocated',
  LEASING: 'vehicle_fixed_allocated',
  RENT: 'vehicle_fixed_allocated',
  HGS_TOLL: 'route_fees',
  PARKING: 'route_fees',
  CLEANING: 'vehicle_variable',
  ROADSIDE_ASSISTANCE: 'vehicle_variable',
  GPS: 'vehicle_fixed_allocated',
  CAMERA: 'vehicle_fixed_allocated',
  VEHICLE_EQUIPMENT: 'vehicle_fixed_allocated',
  OTHER_VEHICLE: 'other_direct_cost',
  EMPLOYER_MONTHLY_COST: 'driver_labor',
  BASE_SALARY: 'driver_labor',
  BENEFIT: 'driver_labor',
  OVERTIME: 'driver_labor',
  PER_DIEM: 'driver_labor',
  MEAL_ALLOWANCE: 'driver_labor',
  SOCIAL_COST: 'driver_labor',
  OTHER_DRIVER: 'driver_labor',
  SERVICE_DIRECT: 'other_direct_cost',
  ROUTE_FEE: 'route_fees',
  OPERATIONS_OVERHEAD: 'operations_overhead',
  OTHER_OPERATION: 'other_direct_cost',
});

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

const PLANNING_RECORD_KINDS = Object.freeze(["ACTUAL", "BUDGET", "FORECAST", "ACCRUAL"]);

function emptyPlanningBucket(recordKind) {
  return {
    recordKind,
    entryCount: 0,
    currencyCode: null,
    grossAmountMinor: null,
    netAmountMinor: null,
    netRollupBlocked: false,
    blockers: [],
    known: [],
    missing: ["confirmed cost entries"],
    source: "ROOM_COST_LEDGER",
  };
}

function buildPlanningBuckets(entries = [], { allocation = null } = {}) {
  const buckets = Object.fromEntries(PLANNING_RECORD_KINDS.map((kind) => [kind, emptyPlanningBucket(kind)]));
  const excluded = [];
  const lineage = [];
  const blockers = [];
  const missing = [];

  for (const entry of entries) {
    const recordKind = String(entry?.recordKind || "").toUpperCase();
    const bucket = buckets[recordKind];
    if (!bucket) {
      excluded.push({ entryId: entry?.id ?? null, reason: "RECORD_KIND_INVALID" });
      continue;
    }

    const line = {
      entryId: entry?.id ?? null,
      recordKind,
      sourceRef: entry?.sourceRef ?? null,
      periodStart: entry?.periodStart ?? null,
      periodEnd: entry?.periodEnd ?? null,
      counted: false,
    };
    lineage.push(line);

    if (entry?.lifecycle !== "CONFIRMED") {
      line.excludedReason = "NOT_CONFIRMED";
      excluded.push({ entryId: entry?.id ?? null, reason: "NOT_CONFIRMED" });
      continue;
    }

    const allocationLine = recordKind === "ACTUAL"
      ? allocation?.lines?.find((item) => item.entryId === entry?.id)
      : null;
    if (allocationLine && !allocationLine.included) {
      line.excludedReason = allocationLine.excludedReason || "ALLOCATION_EVIDENCE_INCOMPLETE";
      excluded.push({ entryId: entry?.id ?? null, reason: line.excludedReason });
      continue;
    }
    if (String(entry?.allocation || "DIRECT").toUpperCase() === "EXCLUDED_FROM_ROLLUP") {
      line.excludedReason = "EXCLUDED_FROM_ROLLUP";
      excluded.push({ entryId: entry?.id ?? null, reason: line.excludedReason });
      continue;
    }

    const sourceAmountMinor = Number.isSafeInteger(entry?.amountMinor) ? entry.amountMinor : null;
    const amountMinor = allocationLine?.included && Number.isSafeInteger(allocationLine?.grossAmountMinor)
      ? Math.abs(allocationLine.grossAmountMinor)
      : sourceAmountMinor;
    const currencyCode = String(entry?.currencyCode || "").trim().toUpperCase() || null;
    if (amountMinor == null || amountMinor <= 0 || !currencyCode) {
      line.excludedReason = "INCOMPLETE";
      excluded.push({ entryId: entry?.id ?? null, reason: "INCOMPLETE" });
      const fields = [];
      if (amountMinor == null || amountMinor <= 0) fields.push("amountMinor");
      if (!currencyCode) fields.push("currencyCode");
      bucket.missing = [...new Set([...bucket.missing.filter((item) => item !== "confirmed cost entries"), ...fields])];
      missing.push({ entryId: entry?.id ?? null, fields });
      continue;
    }

    if (bucket.currencyCode && bucket.currencyCode !== currencyCode) {
      bucket.currencyCode = null;
      bucket.grossAmountMinor = null;
      bucket.netAmountMinor = null;
      addUnique(bucket.blockers, "MIXED_CURRENCIES");
      addUnique(blockers, "MIXED_CURRENCIES");
      line.excludedReason = "MIXED_CURRENCIES";
      excluded.push({ entryId: entry?.id ?? null, reason: "MIXED_CURRENCIES" });
      continue;
    }

    bucket.missing = [];
    bucket.currencyCode = currencyCode;
    const signedAmountMinor = entry?.isReversal ? -amountMinor : amountMinor;
    bucket.entryCount += 1;
    bucket.grossAmountMinor = (bucket.grossAmountMinor ?? 0) + signedAmountMinor;
    const known = {
      entryId: entry?.id ?? null,
      recordKind,
      categoryKey: entry?.categoryKey ?? null,
      amountMinor: signedAmountMinor,
      currencyCode,
      sourceRef: entry?.sourceRef ?? null,
      periodStart: entry?.periodStart ?? null,
      periodEnd: entry?.periodEnd ?? null,
    };
    bucket.known.push(known);
    if (isVatGrossOnly(entry)) {
      bucket.netRollupBlocked = true;
      bucket.netAmountMinor = null;
      addUnique(bucket.blockers, "VAT_UNKNOWN_NET_ROLLUP");
      addUnique(blockers, "VAT_UNKNOWN_NET_ROLLUP");
    } else if (!bucket.netRollupBlocked) {
      bucket.netAmountMinor = (bucket.netAmountMinor ?? 0) + signedAmountMinor;
    }
    line.counted = true;
  }

  return {
    buckets,
    excluded,
    lineage,
    missing,
    blockers,
  };
}

function signedAmount(entry) {
  return entry.isReversal ? -entry.amountMinor : entry.amountMinor;
}

function adaptConfirmedActualEntries(entries = [], { existingInputs = [], acceptedRecordKinds = ["ACTUAL"] } = {}) {
  const inputs = [];
  const known = [];
  const missing = [];
  const excluded = [];
  const lineage = [];
  const blockers = [];
  const currencies = new Set();

  for (const entry of entries) {
    const categoryKey = String(entry.categoryKey || '').trim().toUpperCase();
    const entryLineage = {
      entryId: entry.id,
      sourceRef: entry.sourceRef ?? null,
      recordKind: entry.recordKind,
      allocation: entry.allocation,
      isReversal: Boolean(entry.isReversal),
      reversalOfEntryId: entry.reversalOfEntryId ?? null,
      counted: false,
    };
    lineage.push(entryLineage);

    if (entry.lifecycle !== 'CONFIRMED') {
      excluded.push({ entryId: entry.id, reason: 'NOT_CONFIRMED' });
      entryLineage.excludedReason = 'NOT_CONFIRMED';
      continue;
    }
    if (!acceptedRecordKinds.includes(entry.recordKind)) {
      excluded.push({ entryId: entry.id, reason: `${entry.recordKind}_SEPARATE_BUCKET` });
      entryLineage.excludedReason = `${entry.recordKind}_SEPARATE_BUCKET`;
      continue;
    }
    if (entry.allocation === 'EXCLUDED_FROM_ROLLUP') {
      excluded.push({ entryId: entry.id, reason: 'EXCLUDED_FROM_ROLLUP' });
      entryLineage.excludedReason = 'EXCLUDED_FROM_ROLLUP';
      continue;
    }
    if (!Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0 || !entry.currencyCode) {
      missing.push({ entryId: entry.id, fields: ['amountMinor', 'currencyCode'] });
      entryLineage.excludedReason = 'INCOMPLETE';
      continue;
    }

    currencies.add(entry.currencyCode);
    const input = {
      entryId: entry.id,
      componentKey: OPERATIONAL_COMPONENT_BY_CATEGORY[categoryKey] || 'other_direct_cost',
      categoryKey,
      amountMinor: signedAmount(entry),
      grossAmountMinor: signedAmount(entry),
      currencyCode: entry.currencyCode,
      vatMode: entry.vatMode,
      vatClassification: normalizedVatClassification(entry),
      vatDeductibility: entry.vatDeductibility ?? null,
      vatAmountMinor: entry.vatAmountMinor ?? null,
      vatEvidenceRef: entry.vatEvidenceRef ?? null,
      vatClassificationReason: entry.vatClassificationReason ?? null,
      netEligible: isVatNetRollupEligible(entry),
      recordKind: entry.recordKind,
      sourceRef: entry.sourceRef ?? null,
      sourceType: entry.sourceType ?? null,
      vehicleId: entry.vehicleId ?? null,
      driverId: entry.driverId ?? null,
      shiftId: entry.shiftId ?? null,
      agreementId: entry.agreementId ?? null,
      occurrenceKind: entry.occurrenceKind ?? null,
      allocation: entry.allocation ?? null,
      allocationQuantity: entry.allocationQuantity ?? null,
      allocationUnit: entry.allocationUnit ?? null,
      allocationUnitRateMinor: entry.allocationUnitRateMinor ?? null,
      occurredAt: entry.occurredAt ?? null,
      periodStart: entry.periodStart ?? null,
      periodEnd: entry.periodEnd ?? null,
    };
    inputs.push(input);
    known.push(input);
    entryLineage.counted = true;
    if (isVatGrossOnly(entry)) {
      addUnique(blockers, 'NET_ROLLUP_BLOCKED');
      excluded.push({ entryId: entry.id, reason: 'VAT_UNKNOWN_NET_ROLLUP' });
    }
  }

  if (currencies.size > 1) {
    addUnique(blockers, 'MIXED_CURRENCIES');
    missing.push({ fields: ['currencyConversionEvidence'], reason: 'MIXED_CURRENCIES' });
  }

  return Object.freeze({
    inputs: Object.freeze(currencies.size > 1 ? [] : inputs),
    existingInputs: Object.freeze(existingInputs ?? []),
    known: Object.freeze(known),
    missing: Object.freeze(missing),
    excluded: Object.freeze(excluded),
    blockers: Object.freeze(blockers),
    lineage: Object.freeze(lineage),
  });
}

export function adaptLedgerEntriesToOperationalInputs(entries = [], options = {}) {
  const adapted = adaptConfirmedActualEntries(entries, options);
  const planning = buildPlanningBuckets(entries, options);
  return Object.freeze({
    ...adapted,
    buckets: Object.freeze(planning.buckets),
    recordKindBuckets: Object.freeze(planning.buckets),
    planningExcluded: Object.freeze(planning.excluded),
    planningMissing: Object.freeze(planning.missing),
    planningBlockers: Object.freeze(planning.blockers),
    planningLineage: Object.freeze(planning.lineage),
  });
}

export function adaptForecastLedgerEntriesToOperationalInputs(entries = []) {
  const adapted = adaptConfirmedActualEntries(entries, {
    acceptedRecordKinds: ["FORECAST", "BUDGET"],
  });
  return Object.freeze(adapted.inputs);
}

export function buildRoomPlanningEvidence({ entries = [], allocation = null, summary = null, actualEntries = null } = {}) {
  const adapted = adaptConfirmedActualEntries(Array.isArray(actualEntries) ? actualEntries : entries);
  const planning = buildPlanningBuckets(entries, { allocation });
  const summaryBuckets = summary?.buckets && typeof summary.buckets === "object" ? summary.buckets : null;
  const buckets = summaryBuckets
    ? Object.fromEntries(PLANNING_RECORD_KINDS.map((kind) => [kind, summaryBuckets[kind] || planning.buckets[kind]]))
    : planning.buckets;
  const allBlockers = [...new Set([...(adapted.blockers || []), ...planning.blockers])];
  const allMissing = [...(adapted.missing || []), ...planning.missing];
  const allExcluded = [...(adapted.excluded || []), ...planning.excluded];
  return Object.freeze({
    actual: Object.freeze(buckets.ACTUAL),
    budget: Object.freeze(buckets.BUDGET),
    forecast: Object.freeze(buckets.FORECAST),
    accrual: Object.freeze(buckets.ACCRUAL),
    buckets: Object.freeze(buckets),
    actualInputs: Object.freeze(adapted.inputs),
    known: Object.freeze(adapted.known),
    missing: Object.freeze(allMissing),
    excluded: Object.freeze(allExcluded),
    blockers: Object.freeze(allBlockers),
    lineage: Object.freeze(planning.lineage),
    netRollupEligible: allBlockers.every((item) => item !== "NET_ROLLUP_BLOCKED" && item !== "VAT_UNKNOWN_NET_ROLLUP" && item !== "MIXED_CURRENCIES"),
    formulaOwner: "backend/src/finance/operationalCostMath.js",
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

export function mergeOperationalCostInputs(existingInput = {}, adapted = {}) {
  const ledgerInputs = Array.isArray(adapted.inputs) ? adapted.inputs : [];
  if (ledgerInputs.length === 0 && (!adapted.known || adapted.known.length === 0)) return existingInput;
  return { ...existingInput, roomCostLedgerInputs: ledgerInputs };
}

export { OPERATIONAL_COMPONENT_BY_CATEGORY, PLANNING_RECORD_KINDS, SALARY_CATEGORY_KEYS };
