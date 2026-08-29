export const REFERENCE_DATA_CLASS = Object.freeze({
  INTERNAL_ACTUAL: "INTERNAL_ACTUAL",
  EXTERNAL_REFERENCE: "EXTERNAL_REFERENCE",
  DEMO_FIXTURE: "DEMO_FIXTURE",
});

export const REFERENCE_FAMILIES = Object.freeze([
  "FUEL_DIESEL",
  "FUEL_GASOLINE",
  "FUEL_GASOLINE_95",
  "FUEL_LPG",
  "FX",
  "INFLATION_INDEX",
  "COST_INDEX",
  "TOLL",
  "BRIDGE",
  "TUNNEL",
  "FERRY",
  "MAINTENANCE_REFERENCE",
  "TYRE_REFERENCE",
  "VEHICLE_CLASS_REFERENCE",
  "REGIONAL_COST_REFERENCE",
]);

export const REFERENCE_UNITS = Object.freeze([
  "CURRENCY",
  "CURRENCY_PER_L",
  "CURRENCY_PER_KM",
  "CURRENCY_PER_MONTH",
  "CURRENCY_PER_TRIP",
  "CURRENCY_PER_UNIT",
  "RATE",
  "INDEX_POINT",
]);

export const FRESHNESS = Object.freeze({
  FRESH: "FRESH",
  STALE: "STALE",
  EXPIRED: "EXPIRED",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
  FALLBACK: "FALLBACK",
  UNKNOWN: "UNKNOWN",
});

export const CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN",
});

export const COMPLETENESS = Object.freeze({
  COMPLETE: "COMPLETE",
  INCOMPLETE: "INCOMPLETE",
});

export const CONFLICT_STATE = Object.freeze({
  NO_CONFLICT: "NO_CONFLICT",
  CONFLICT: "CONFLICT",
  UNKNOWN: "UNKNOWN",
});

export const PROVIDER_STATUS = Object.freeze({
  CONFIGURED: "CONFIGURED",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  INVALID_CONFIG: "INVALID_CONFIG",
  UNAVAILABLE: "UNAVAILABLE",
});

export const FALLBACK_STATE = Object.freeze({
  NONE: "NONE",
  FALLBACK_PROVIDER: "FALLBACK_PROVIDER",
  STALE_CACHE: "STALE_CACHE",
  NO_SAFE_FALLBACK: "NO_SAFE_FALLBACK",
});

export const SCOPE_TYPES = Object.freeze(["GLOBAL", "REGION", "CITY", "CUSTOM"]);

export const MANUAL_PROVIDER_KEY = "MANUAL_CONTROLLED_REFERENCE";
export const CONTRACT_VERSION = "EXTERNAL-COST-REFERENCE-V1";

const CURRENCY_UNITS = new Set([
  "CURRENCY",
  "CURRENCY_PER_L",
  "CURRENCY_PER_KM",
  "CURRENCY_PER_MONTH",
  "CURRENCY_PER_TRIP",
  "CURRENCY_PER_UNIT",
]);

const FAMILY_UNIT_RULES = Object.freeze({
  FUEL_DIESEL: ["CURRENCY_PER_L"],
  FUEL_GASOLINE: ["CURRENCY_PER_L"],
  FUEL_GASOLINE_95: ["CURRENCY_PER_L"],
  FUEL_LPG: ["CURRENCY_PER_L"],
  FX: ["RATE"],
  INFLATION_INDEX: ["INDEX_POINT"],
  COST_INDEX: ["INDEX_POINT"],
  TOLL: ["CURRENCY_PER_TRIP"],
  BRIDGE: ["CURRENCY_PER_TRIP"],
  TUNNEL: ["CURRENCY_PER_TRIP"],
  FERRY: ["CURRENCY_PER_TRIP"],
  MAINTENANCE_REFERENCE: ["CURRENCY_PER_KM", "CURRENCY_PER_MONTH"],
  TYRE_REFERENCE: ["CURRENCY_PER_UNIT"],
  VEHICLE_CLASS_REFERENCE: ["CURRENCY_PER_MONTH"],
  REGIONAL_COST_REFERENCE: ["CURRENCY_PER_KM", "CURRENCY_PER_MONTH", "CURRENCY_PER_TRIP"],
});

const FAMILY_TTL = Object.freeze({
  FUEL_DIESEL: { freshMs: 24 * 60 * 60 * 1000, staleMs: 3 * 24 * 60 * 60 * 1000 },
  FUEL_GASOLINE: { freshMs: 24 * 60 * 60 * 1000, staleMs: 3 * 24 * 60 * 60 * 1000 },
  FUEL_GASOLINE_95: { freshMs: 24 * 60 * 60 * 1000, staleMs: 3 * 24 * 60 * 60 * 1000 },
  FUEL_LPG: { freshMs: 24 * 60 * 60 * 1000, staleMs: 3 * 24 * 60 * 60 * 1000 },
  FX: { freshMs: 6 * 60 * 60 * 1000, staleMs: 24 * 60 * 60 * 1000 },
  INFLATION_INDEX: { freshMs: 30 * 24 * 60 * 60 * 1000, staleMs: 90 * 24 * 60 * 60 * 1000 },
  COST_INDEX: { freshMs: 30 * 24 * 60 * 60 * 1000, staleMs: 90 * 24 * 60 * 60 * 1000 },
  TOLL: { freshMs: 7 * 24 * 60 * 60 * 1000, staleMs: 30 * 24 * 60 * 60 * 1000 },
  BRIDGE: { freshMs: 7 * 24 * 60 * 60 * 1000, staleMs: 30 * 24 * 60 * 60 * 1000 },
  TUNNEL: { freshMs: 7 * 24 * 60 * 60 * 1000, staleMs: 30 * 24 * 60 * 60 * 1000 },
  FERRY: { freshMs: 7 * 24 * 60 * 60 * 1000, staleMs: 30 * 24 * 60 * 60 * 1000 },
  MAINTENANCE_REFERENCE: { freshMs: 30 * 24 * 60 * 60 * 1000, staleMs: 180 * 24 * 60 * 60 * 1000 },
  TYRE_REFERENCE: { freshMs: 30 * 24 * 60 * 60 * 1000, staleMs: 180 * 24 * 60 * 60 * 1000 },
  VEHICLE_CLASS_REFERENCE: { freshMs: 30 * 24 * 60 * 60 * 1000, staleMs: 180 * 24 * 60 * 60 * 1000 },
  REGIONAL_COST_REFERENCE: { freshMs: 7 * 24 * 60 * 60 * 1000, staleMs: 30 * 24 * 60 * 60 * 1000 },
});

const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;
const MAX_FUTURE_AS_OF_MS = 5 * 60 * 1000;

function fail(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  if (details !== undefined) error.details = details;
  throw error;
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function enumValue(value, values, field) {
  const normalized = compact(value).toUpperCase();
  if (!values.includes(normalized)) fail("INVALID_REFERENCE_INPUT", `${field} is not supported.`);
  return normalized;
}

export function normalizeDecimal(value, field = "valueDecimal") {
  if (typeof value !== "string") fail("INVALID_DECIMAL", `${field} must be a decimal string.`);
  const raw = value.trim();
  if (!DECIMAL_PATTERN.test(raw)) fail("INVALID_DECIMAL", `${field} must use a plain decimal string.`);
  if (raw.startsWith("-")) fail("NEGATIVE_VALUE", `${field} must not be negative.`);
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ""] = unsigned.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
  const normalizedFraction = fraction.replace(/0+$/, "");
  const normalized = normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
  if (normalized === "0") return "0";
  return `${negative ? "-" : ""}${normalized}`;
}

function decimalFromMinor(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail("INVALID_MINOR_VALUE", "valueMinor must be a non-negative safe integer.");
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function normalizeCurrency(value, unit, family) {
  if (!CURRENCY_UNITS.has(unit) && family !== "FX") return null;
  const currency = compact(value).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) fail("INVALID_CURRENCY", "currencyCode must be an ISO-4217 style code.");
  return currency;
}

function normalizeCode(value, field, { required = false } = {}) {
  const code = compact(value).toUpperCase();
  if (!code && !required) return null;
  if (!CODE_PATTERN.test(code)) fail("INVALID_SCOPE", `${field} must be a short uppercase code.`);
  return code;
}

function normalizeDate(value, field, { required = false } = {}) {
  if (value === null || value === undefined || value === "") {
    if (required) fail("MISSING_PROVENANCE", `${field} is required.`);
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail("INVALID_DATE", `${field} must be a valid ISO date.`);
  return date;
}

export function familyPolicy(family) {
  return FAMILY_TTL[family] || { freshMs: 24 * 60 * 60 * 1000, staleMs: 3 * 24 * 60 * 60 * 1000 };
}

export function evaluateFreshness({ asOf, family, now = new Date() } = {}) {
  const asOfDate = asOf ? new Date(asOf) : null;
  const nowDate = new Date(now);
  if (!asOfDate || Number.isNaN(asOfDate.getTime())) return FRESHNESS.UNKNOWN;
  if (asOfDate.getTime() > nowDate.getTime() + MAX_FUTURE_AS_OF_MS) return FRESHNESS.UNKNOWN;
  const policy = familyPolicy(family);
  const ageMs = Math.max(0, nowDate.getTime() - asOfDate.getTime());
  if (ageMs <= policy.freshMs) return FRESHNESS.FRESH;
  if (ageMs <= policy.staleMs) return FRESHNESS.STALE;
  return FRESHNESS.EXPIRED;
}

export function freshnessWindows({ asOf, family } = {}) {
  if (!asOf) return { freshUntil: null, staleUntil: null };
  const policy = familyPolicy(family);
  const timestamp = new Date(asOf).getTime();
  if (!Number.isFinite(timestamp)) return { freshUntil: null, staleUntil: null };
  return {
    freshUntil: new Date(timestamp + policy.freshMs),
    staleUntil: new Date(timestamp + policy.staleMs),
  };
}

export function deriveCompleteness({ family, sourceName, asOf, regionCode, scopeType, scopeKey, providerKey, unit, currencyCode } = {}) {
  const complete = Boolean(
    compact(sourceName) && asOf && regionCode && scopeType && scopeKey && providerKey && unit &&
    (!CURRENCY_UNITS.has(unit) && family !== "FX" || currencyCode),
  );
  return complete ? COMPLETENESS.COMPLETE : COMPLETENESS.INCOMPLETE;
}

export function deriveConfidence({ freshness, completeness, conflictState, fallbackState, scopeMatch = true } = {}) {
  if (!scopeMatch || completeness === COMPLETENESS.INCOMPLETE || freshness === FRESHNESS.UNKNOWN) return CONFIDENCE.UNKNOWN;
  if (conflictState === CONFLICT_STATE.CONFLICT) return CONFIDENCE.LOW;
  if (freshness === FRESHNESS.EXPIRED || freshness === FRESHNESS.SOURCE_UNAVAILABLE) return CONFIDENCE.LOW;
  if (fallbackState === FALLBACK_STATE.FALLBACK_PROVIDER || fallbackState === FALLBACK_STATE.STALE_CACHE) return CONFIDENCE.MEDIUM;
  if (freshness === FRESHNESS.STALE) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.HIGH;
}

export function isFamilyUnitCompatible(family, unit) {
  return Boolean(FAMILY_UNIT_RULES[family]?.includes(unit));
}

export function buildReferenceKey({ providerKey, family, unit, currencyCode, regionCode, scopeType, scopeKey, asOf } = {}) {
  return [
    CONTRACT_VERSION,
    providerKey,
    family,
    unit,
    currencyCode || "NONE",
    regionCode || "GLOBAL",
    scopeType || "GLOBAL",
    scopeKey || "GLOBAL",
    asOf ? new Date(asOf).toISOString() : "UNKNOWN",
  ].map((part) => encodeURIComponent(String(part))).join("|");
}

export function normalizeReferenceInput(input = {}, { providerKey = MANUAL_PROVIDER_KEY, now = new Date(), requireProvenance = true } = {}) {
  const dataClass = compact(input.dataClass).toUpperCase();
  if (dataClass && dataClass !== REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE) {
    fail("REFERENCE_CLASSIFICATION_FORBIDDEN", "Only EXTERNAL_REFERENCE data may enter this boundary.");
  }

  const normalizedProviderKey = compact(providerKey).toUpperCase();
  if (!normalizedProviderKey || !CODE_PATTERN.test(normalizedProviderKey)) fail("INVALID_PROVIDER", "providerKey must be a short uppercase code.");
  const family = enumValue(input.family, REFERENCE_FAMILIES, "family");
  const unit = enumValue(input.unit, REFERENCE_UNITS, "unit");
  if (!isFamilyUnitCompatible(family, unit)) fail("UNIT_FAMILY_MISMATCH", `${unit} is not valid for ${family}.`);

  let valueDecimal = null;
  if (input.valueDecimal !== undefined && input.valueDecimal !== null && input.valueDecimal !== "") {
    valueDecimal = normalizeDecimal(input.valueDecimal);
  } else if (input.valueMinor !== undefined && input.valueMinor !== null && input.valueMinor !== "") {
    const valueMinor = Number(input.valueMinor);
    if (!Number.isSafeInteger(valueMinor)) fail("INVALID_MINOR_VALUE", "valueMinor must be a safe integer.");
    valueDecimal = decimalFromMinor(valueMinor);
  } else {
    fail("MISSING_VALUE", "valueDecimal or valueMinor is required.");
  }

  if (CURRENCY_UNITS.has(unit) && valueDecimal.split(".")[1]?.length > 2) {
    fail("MONEY_PRECISION_INVALID", "Currency references must use at most two decimal places.");
  }

  const currencyCode = normalizeCurrency(input.currencyCode, unit, family);
  if (family === "FX" && !currencyCode) fail("INVALID_CURRENCY", "FX references require a quote currency code.");
  const sourceName = compact(input.sourceName || input.source);
  if (!sourceName && requireProvenance) fail("MISSING_PROVENANCE", "sourceName is required.");
  if (sourceName.length > 160) fail("INVALID_PROVENANCE", "sourceName is too long.");

  const asOf = normalizeDate(input.asOf, "asOf", { required: requireProvenance });
  const scopeType = enumValue(input.scopeType || "GLOBAL", SCOPE_TYPES, "scopeType");
  const scopeKey = normalizeCode(input.scopeKey || (scopeType === "GLOBAL" ? "GLOBAL" : ""), "scopeKey", { required: true });
  const regionCode = normalizeCode(input.regionCode, "regionCode", { required: false });
  if (scopeType !== "GLOBAL" && !regionCode) fail("MISSING_SCOPE", "regionCode is required for scoped references.");
  if (asOf && asOf.getTime() > new Date(now).getTime() + MAX_FUTURE_AS_OF_MS) fail("INVALID_DATE", "asOf cannot be materially in the future.");

  const freshness = evaluateFreshness({ asOf, family, now });
  const windows = freshnessWindows({ asOf, family });
  const completeness = deriveCompleteness({ family, sourceName, asOf, regionCode: regionCode || "GLOBAL", scopeType, scopeKey, providerKey: normalizedProviderKey, unit, currencyCode });
  const conflictState = enumValue(input.conflictState || CONFLICT_STATE.NO_CONFLICT, Object.values(CONFLICT_STATE), "conflictState");
  const fallbackState = enumValue(input.fallbackState || FALLBACK_STATE.NONE, Object.values(FALLBACK_STATE), "fallbackState");
  const providerStatus = enumValue(input.providerStatus || PROVIDER_STATUS.CONFIGURED, Object.values(PROVIDER_STATUS), "providerStatus");
  const confidence = deriveConfidence({ freshness, completeness, conflictState, fallbackState });
  const valueMinor = input.valueMinor === undefined || input.valueMinor === null || input.valueMinor === ""
    ? null
    : Number(input.valueMinor);
  if (valueMinor !== null && !Number.isSafeInteger(valueMinor)) fail("INVALID_MINOR_VALUE", "valueMinor must be a safe integer.");
  if (valueMinor !== null && !CURRENCY_UNITS.has(unit)) fail("INVALID_MINOR_VALUE", "valueMinor is only valid for currency units.");
  if (valueMinor !== null && input.valueDecimal !== undefined && input.valueDecimal !== null && input.valueDecimal !== "") {
    if (normalizeDecimal(input.valueDecimal) !== decimalFromMinor(valueMinor)) {
      fail("MONEY_VALUE_MISMATCH", "valueDecimal and valueMinor must describe the same amount.");
    }
  }

  return {
    referenceKey: buildReferenceKey({ providerKey: normalizedProviderKey, family, unit, currencyCode, regionCode, scopeType, scopeKey, asOf }),
    dataClass: REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE,
    family,
    valueDecimal,
    valueMinor,
    unit,
    currencyCode,
    sourceName: sourceName || null,
    sourceUrl: compact(input.sourceUrl) || null,
    providerKey: normalizedProviderKey,
    providerVersion: compact(input.providerVersion) || null,
    asOf,
    regionCode,
    scopeType,
    scopeKey,
    freshness,
    confidence,
    completeness,
    conflictState,
    providerStatus,
    fallbackState,
    retrievedAt: input.retrievedAt ? normalizeDate(input.retrievedAt, "retrievedAt") : new Date(now),
    freshUntil: windows.freshUntil,
    staleUntil: windows.staleUntil,
    sourceMetadata: input.sourceMetadata && typeof input.sourceMetadata === "object" && !Array.isArray(input.sourceMetadata)
      ? input.sourceMetadata
      : null,
    rawPayloadHash: compact(input.rawPayloadHash) || null,
  };
}

export function publicReference(reference, { now = new Date(), fallbackState = null } = {}) {
  const freshness = evaluateFreshness({ asOf: reference?.asOf, family: reference?.family, now });
  const resolvedFallbackState = fallbackState || reference?.fallbackState || FALLBACK_STATE.NONE;
  const confidence = deriveConfidence({
    freshness,
    completeness: reference?.completeness,
    conflictState: reference?.conflictState,
    fallbackState: resolvedFallbackState,
  });
  return {
    id: reference?.id ?? null,
    referenceKey: reference?.referenceKey ?? null,
    dataClass: REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE,
    family: reference?.family ?? null,
    valueDecimal: reference?.valueDecimal ?? null,
    valueMinor: reference?.valueMinor ?? null,
    unit: reference?.unit ?? null,
    currencyCode: reference?.currencyCode ?? null,
    sourceName: reference?.sourceName ?? null,
    sourceUrl: reference?.sourceUrl ?? null,
    providerKey: reference?.providerKey ?? null,
    providerVersion: reference?.providerVersion ?? null,
    asOf: reference?.asOf ?? null,
    regionCode: reference?.regionCode ?? null,
    scopeType: reference?.scopeType ?? null,
    scopeKey: reference?.scopeKey ?? null,
    freshness,
    confidence,
    completeness: reference?.completeness ?? COMPLETENESS.INCOMPLETE,
    conflictState: reference?.conflictState ?? CONFLICT_STATE.UNKNOWN,
    providerStatus: reference?.providerStatus ?? PROVIDER_STATUS.NOT_CONFIGURED,
    fallbackState: resolvedFallbackState,
    retrievedAt: reference?.retrievedAt ?? null,
    sourceMetadata: reference?.sourceMetadata ?? null,
    rawPayloadHash: reference?.rawPayloadHash ?? null,
  };
}

export function unavailableReference({ family = null, reason = "SOURCE_UNAVAILABLE", providerStatus = PROVIDER_STATUS.NOT_CONFIGURED } = {}) {
  return {
    dataClass: REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE,
    family,
    state: reason,
    marketReference: null,
    providerStatus,
    freshness: reason === "NO_DATA" ? FRESHNESS.UNKNOWN : FRESHNESS.SOURCE_UNAVAILABLE,
    confidence: CONFIDENCE.UNKNOWN,
    completeness: COMPLETENESS.INCOMPLETE,
    fallbackState: FALLBACK_STATE.NO_SAFE_FALLBACK,
    actualInternalData: null,
    authorityNote: "Bu değer gerçek maliyet değildir; gerçek iç veri varsa önceliklidir.",
  };
}

export function classifyReferenceError(error) {
  const code = String(error?.code || "").toUpperCase();
  if (["INVALID_REFERENCE_INPUT", "INVALID_DECIMAL", "INVALID_CURRENCY", "INVALID_SCOPE", "MISSING_PROVENANCE", "MISSING_SCOPE", "UNIT_FAMILY_MISMATCH", "UNSUPPORTED_FAMILY", "UNSUPPORTED_UNIT", "INVALID_CONFIG", "UNAUTHORIZED", "NO_DATA", "INVALID_PROVIDER_RESPONSE"].includes(code)) return "NON_RETRYABLE";
  if (["SOURCE_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED", "TRANSIENT_PROVIDER_ERROR"].includes(code)) return "TRANSIENT";
  return "UNKNOWN";
}
