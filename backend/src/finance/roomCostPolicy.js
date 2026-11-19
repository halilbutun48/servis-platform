import {
  ROOM_COST_CATEGORIES as CANONICAL_ROOM_COST_CATEGORIES,
  ROOM_COST_CATEGORY_LABELS,
} from './roomCostCategoryCatalog.js';

function freezeList(values) {
  return Object.freeze(Array.from(values));
}
export const ROOM_COST_CATEGORIES = CANONICAL_ROOM_COST_CATEGORIES;
export { ROOM_COST_CATEGORY_LABELS };

export const ROOM_COST_RECORD_KINDS = freezeList([
  'ACTUAL',
  'BUDGET',
  'FORECAST',
  'ACCRUAL',
]);

export const ROOM_COST_OCCURRENCE_KINDS = freezeList([
  'ONE_OFF',
  'PERIODIC',
  'RECURRING',
  'PER_KM',
  'PER_TRIP',
  'PER_SHIFT',
]);

export const ROOM_COST_VAT_MODES = freezeList([
  'INCLUDED',
  'EXCLUDED',
  'NOT_APPLICABLE',
  'UNKNOWN',
]);

// VAT classification is an accounting-evidence status, not a tax-rate guess.
// Existing vatMode remains the gross/net presentation mode; old rows without
// this field are deliberately treated as UNKNOWN until a user supplies proof.
export const ROOM_COST_VAT_CLASSIFICATIONS = freezeList([
  'UNKNOWN',
  'DOCUMENTED_VAT',
  'OUT_OF_SCOPE',
  'DOCUMENTED_EXEMPT',
  'VERIFIED_ZERO_RATE',
]);

export const ROOM_COST_VAT_DEDUCTIBILITIES = freezeList([
  'UNKNOWN',
  'DEDUCTIBLE',
  'NON_DEDUCTIBLE',
  'NOT_APPLICABLE',
]);

export const ROOM_COST_LIFECYCLE_STATES = freezeList([
  'DRAFT',
  'CONFIRMED',
  'CANCELLED',
]);

export const ROOM_FINANCE_SALARY = 'ROOM_FINANCE_SALARY';

export function normalizedVatClassification(entry = {}) {
  const value = enumValue(entry.vatClassification);
  return ROOM_COST_VAT_CLASSIFICATIONS.includes(value) ? value : 'UNKNOWN';
}

export function isVatNetRollupEligible(entry = {}) {
  const classification = normalizedVatClassification(entry);
  const vatMode = enumValue(entry.vatMode);
  if (classification === 'UNKNOWN'
    || vatMode === 'UNKNOWN'
    || !ROOM_COST_VAT_MODES.includes(vatMode)
    || !String(entry.vatEvidenceRef || '').trim()
    || !String(entry.vatClassificationReason || '').trim()) return false;

  if (classification !== 'DOCUMENTED_VAT') return true;

  const vatAmountMinor = Number(entry.vatAmountMinor);
  const deductibility = enumValue(entry.vatDeductibility);
  return entry.vatAmountMinor != null
    && Number.isSafeInteger(vatAmountMinor)
    && vatAmountMinor >= 0
    && ['DEDUCTIBLE', 'NON_DEDUCTIBLE'].includes(deductibility);
}

export function isVatGrossOnly(entry = {}) {
  return !isVatNetRollupEligible(entry);
}

const NET_ROLLUP_MODES = new Set(['NET', 'NET_ROLLUP']);
const PERIODIC_OCCURRENCE_KINDS = new Set(['PERIODIC', 'RECURRING']);

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function enumValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function hasSuppliedValue(value) {
  return value !== undefined
    && value !== null
    && !(typeof value === 'string' && value.trim() === '');
}

function safeIntegerScalar(value, minimum) {
  let number;
  if (typeof value === 'number') {
    number = value;
  } else if (typeof value === 'string') {
    const candidate = value.trim();
    if (!/^\d+$/.test(candidate)) return null;
    number = Number(candidate);
  } else {
    return null;
  }
  return Number.isSafeInteger(number) && number >= minimum ? number : null;
}

function positiveInteger(value) {
  return safeIntegerScalar(value, 1);
}

function nonNegativeInteger(value) {
  return safeIntegerScalar(value, 0);
}

function positiveDecimal(value) {
  const candidate = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,4})?$/.test(candidate)) return null;
  const number = Number(candidate);
  return Number.isFinite(number) && number > 0 ? candidate : null;
}

function normalizedDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  const calendarMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(candidate);
  if (!calendarMatch) return null;
  const year = Number(calendarMatch[1]);
  const month = Number(calendarMatch[2]);
  const day = Number(calendarMatch[3]);
  const daysInMonth = [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePeriod(source, occurrenceKind, normalized, missing, blockers) {
  const occurredAt = normalizedDate(source.occurredAt);
  const periodStart = normalizedDate(source.periodStart);
  const periodEnd = normalizedDate(source.periodEnd);
  const hasOccurredAt = hasSuppliedValue(source.occurredAt);
  const hasStart = hasSuppliedValue(source.periodStart);
  const hasEnd = hasSuppliedValue(source.periodEnd);
  const requiresRange = PERIODIC_OCCURRENCE_KINDS.has(occurrenceKind);

  if (hasOccurredAt && !occurredAt) addUnique(blockers, 'OCCURRED_AT_INVALID');
  if (hasStart && !periodStart) addUnique(blockers, 'PERIOD_START_INVALID');
  if (hasEnd && !periodEnd) addUnique(blockers, 'PERIOD_END_INVALID');

  if (requiresRange) {
    if (!periodStart || !periodEnd) addUnique(missing, 'period');
    if (periodStart && periodEnd && periodStart > periodEnd) addUnique(blockers, 'PERIOD_RANGE_INVALID');
    if (periodStart && periodEnd) {
      normalized.periodStart = periodStart;
      normalized.periodEnd = periodEnd;
    }
    return;
  }

  if (occurredAt) {
    normalized.occurredAt = occurredAt;
    return;
  }
  if (hasStart || hasEnd) {
    if (!periodStart || !periodEnd) addUnique(missing, 'period');
    if (periodStart && periodEnd && periodStart > periodEnd) addUnique(blockers, 'PERIOD_RANGE_INVALID');
    if (periodStart && periodEnd) {
      normalized.periodStart = periodStart;
      normalized.periodEnd = periodEnd;
    }
    return;
  }
  addUnique(missing, 'period');
}

export function validateCostInput(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const normalized = {};
  const missing = [];
  const blockers = [];

  const categoryKey = enumValue(source.categoryKey ?? source.category);
  if (!categoryKey) {
    if (hasSuppliedValue(source.categoryKey ?? source.category)) addUnique(blockers, 'CATEGORY_INVALID');
    else addUnique(missing, 'categoryKey');
  } else if (!ROOM_COST_CATEGORIES.includes(categoryKey)) {
    addUnique(blockers, 'CATEGORY_INVALID');
  } else {
    normalized.categoryKey = categoryKey;
  }

  const amountMinor = positiveInteger(source.amountMinor);
  if (source.amountMinor == null || (typeof source.amountMinor === 'string' && !source.amountMinor.trim())) {
    addUnique(missing, 'amountMinor');
  } else if (!amountMinor) {
    addUnique(blockers, 'AMOUNT_MUST_BE_POSITIVE_INTEGER');
  } else {
    normalized.amountMinor = amountMinor;
  }

  const currencyCode = text(source.currencyCode).toUpperCase();
  if (!currencyCode) {
    addUnique(missing, 'currencyCode');
  } else if (!/^[A-Z]{3}$/.test(currencyCode)) {
    addUnique(blockers, 'CURRENCY_CODE_INVALID');
  } else {
    normalized.currencyCode = currencyCode;
  }

  const vatMode = enumValue(source.vatMode) || 'UNKNOWN';
  if (!ROOM_COST_VAT_MODES.includes(vatMode)) {
    addUnique(blockers, 'VAT_MODE_INVALID');
  } else {
    normalized.vatMode = vatMode;
    if (hasSuppliedValue(source.vatAmountMinor)) {
      const vatAmountMinor = nonNegativeInteger(source.vatAmountMinor);
      if (vatAmountMinor == null) addUnique(blockers, 'VAT_AMOUNT_MUST_BE_NON_NEGATIVE_INTEGER');
      else normalized.vatAmountMinor = vatAmountMinor;
    } else normalized.vatAmountMinor = null;
  }

  const vatClassification = enumValue(source.vatClassification) || 'UNKNOWN';
  if (!ROOM_COST_VAT_CLASSIFICATIONS.includes(vatClassification)) {
    addUnique(blockers, 'VAT_CLASSIFICATION_INVALID');
  } else {
    const vatEvidenceRef = text(source.vatEvidenceRef);
    const vatClassificationReason = text(source.vatClassificationReason);
    normalized.vatClassification = vatClassification;
    normalized.vatEvidenceRef = vatEvidenceRef || null;
    normalized.vatClassificationReason = vatClassificationReason || null;
    if (vatClassification !== 'UNKNOWN' && (!vatEvidenceRef || !vatClassificationReason)) {
      addUnique(blockers, 'VAT_CLASSIFICATION_EVIDENCE_REQUIRED');
    }
    if (vatClassification !== 'UNKNOWN' && vatMode === 'UNKNOWN') {
      addUnique(blockers, 'VAT_CLASSIFICATION_MODE_REQUIRED');
    }
    if (vatClassification === 'UNKNOWN') normalized.vatAmountMinor = null;

    const suppliedDeductibility = enumValue(source.vatDeductibility);
    const vatDeductibility = suppliedDeductibility
      || (vatClassification === 'DOCUMENTED_VAT' ? 'UNKNOWN' : 'NOT_APPLICABLE');
    if (!ROOM_COST_VAT_DEDUCTIBILITIES.includes(vatDeductibility)) {
      addUnique(blockers, 'VAT_DEDUCTIBILITY_INVALID');
    } else {
      normalized.vatDeductibility = vatDeductibility;
    }

    normalized.netRollupEligible = isVatNetRollupEligible(normalized);
    normalized.grossVisible = !normalized.netRollupEligible;
  }

  const recordKind = Object.prototype.hasOwnProperty.call(source, 'recordKind')
    ? enumValue(source.recordKind)
    : 'ACTUAL';
  if (!recordKind || !ROOM_COST_RECORD_KINDS.includes(recordKind)) addUnique(blockers, 'RECORD_KIND_INVALID');
  else normalized.recordKind = recordKind;

  const occurrenceKind = Object.prototype.hasOwnProperty.call(source, 'occurrenceKind')
    ? enumValue(source.occurrenceKind)
    : 'ONE_OFF';
  if (!occurrenceKind || !ROOM_COST_OCCURRENCE_KINDS.includes(occurrenceKind)) addUnique(blockers, 'OCCURRENCE_KIND_INVALID');
  else normalized.occurrenceKind = occurrenceKind;

  const allocationQuantity = hasSuppliedValue(source.allocationQuantity)
    ? positiveDecimal(source.allocationQuantity)
    : null;
  const allocationUnitRateMinor = hasSuppliedValue(source.allocationUnitRateMinor)
    ? positiveInteger(source.allocationUnitRateMinor)
    : null;
  const allocationUnit = text(source.allocationUnit).toUpperCase() || null;
  if (hasSuppliedValue(source.allocationQuantity) && !allocationQuantity) addUnique(blockers, 'ALLOCATION_QUANTITY_INVALID');
  if (hasSuppliedValue(source.allocationUnitRateMinor) && !allocationUnitRateMinor) addUnique(blockers, 'ALLOCATION_UNIT_RATE_INVALID');
  if (hasSuppliedValue(source.allocationUnit) && !allocationUnit) addUnique(blockers, 'ALLOCATION_UNIT_INVALID');
  if (occurrenceKind === 'PER_KM' || occurrenceKind === 'PER_TRIP') {
    if (!allocationQuantity) addUnique(missing, 'allocationQuantity');
    if (!allocationUnitRateMinor) addUnique(missing, 'allocationUnitRateMinor');
    if (!allocationUnit) addUnique(missing, 'allocationUnit');
    if (allocationQuantity && allocationUnitRateMinor && amountMinor
      && Math.round(Number(allocationQuantity) * allocationUnitRateMinor) !== amountMinor) {
      addUnique(blockers, 'ALLOCATION_AMOUNT_MISMATCH');
    }
  }
  if (allocationQuantity) normalized.allocationQuantity = allocationQuantity;
  if (allocationUnit) normalized.allocationUnit = allocationUnit;
  if (allocationUnitRateMinor) normalized.allocationUnitRateMinor = allocationUnitRateMinor;

  const lifecycleState = Object.prototype.hasOwnProperty.call(source, 'lifecycleState')
    ? enumValue(source.lifecycleState)
    : 'DRAFT';
  if (!lifecycleState || !ROOM_COST_LIFECYCLE_STATES.includes(lifecycleState)) addUnique(blockers, 'LIFECYCLE_STATE_INVALID');
  else normalized.lifecycleState = lifecycleState;

  if (ROOM_COST_VAT_MODES.includes(vatMode)) {
    const rollupMode = enumValue(source.rollupMode ?? source.viewMode ?? source.costView);
    if (NET_ROLLUP_MODES.has(rollupMode) && vatMode === 'UNKNOWN') {
      addUnique(blockers, 'VAT_UNKNOWN_NET_ROLLUP');
    }
    if (rollupMode === 'GROSS') normalized.grossVisible = true;
  }

  normalizePeriod(source, occurrenceKind, normalized, missing, blockers);

  const isReversal = source.isReversal === true || enumValue(source.entryKind) === 'REVERSAL';
  if (isReversal) {
    const reversalOfEntryId = positiveInteger(source.reversalOfEntryId ?? source.reversalOfId);
    if (!reversalOfEntryId) addUnique(blockers, 'REVERSAL_LINEAGE_REQUIRED');
    else normalized.reversalOfEntryId = reversalOfEntryId;
    normalized.isReversal = true;
  }

  return {
    ok: missing.length === 0 && blockers.length === 0,
    normalized,
    missing,
    blockers,
  };
}
