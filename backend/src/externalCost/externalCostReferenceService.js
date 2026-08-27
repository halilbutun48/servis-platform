import { rememberResponse, clearResponseCache } from "../utils/responseCache.js";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { httpError } from "../errors/http.js";
import { acquireExternalReference } from "../externalCost/providerRegistry.js";
import {
  COMPLETENESS,
  FALLBACK_STATE,
  FRESHNESS,
  MANUAL_PROVIDER_KEY,
  PROVIDER_STATUS,
  REFERENCE_FAMILIES,
  REFERENCE_UNITS,
  SCOPE_TYPES,
  buildReferenceKey,
  evaluateFreshness,
  normalizeReferenceInput,
  publicReference,
  unavailableReference,
} from "../externalCost/referenceContract.js";

const CACHE_PREFIX = "external-reference:v1";
const DEFAULT_CACHE_TTL_MS = 30 * 1000;

const REFERENCE_SELECT = {
  id: true,
  referenceKey: true,
  dataClass: true,
  family: true,
  valueDecimal: true,
  valueMinor: true,
  unit: true,
  currencyCode: true,
  sourceName: true,
  sourceUrl: true,
  providerKey: true,
  providerVersion: true,
  asOf: true,
  regionCode: true,
  scopeType: true,
  scopeKey: true,
  freshness: true,
  confidence: true,
  completeness: true,
  conflictState: true,
  providerStatus: true,
  fallbackState: true,
  retrievedAt: true,
  freshUntil: true,
  staleUntil: true,
};

function normalizedFamily(value) {
  const family = String(value || "").trim().toUpperCase();
  if (!REFERENCE_FAMILIES.includes(family)) throw httpError(400, "UNSUPPORTED_FAMILY", "Bu dış referans veri ailesi desteklenmiyor.");
  return family;
}

function normalizedUnit(value) {
  const unit = String(value || "").trim().toUpperCase();
  if (!REFERENCE_UNITS.includes(unit)) throw httpError(400, "UNSUPPORTED_UNIT", "Bu dış referans birimi desteklenmiyor.");
  return unit;
}

function normalizedScope(value) {
  const scopeType = String(value || "GLOBAL").trim().toUpperCase();
  if (!SCOPE_TYPES.includes(scopeType)) throw httpError(400, "INVALID_SCOPE", "Dış referans kapsamı desteklenmiyor.");
  return scopeType;
}

function cacheKey({ providerKey, family, unit, currencyCode, regionCode, scopeType, scopeKey }) {
  return [
    CACHE_PREFIX,
    providerKey || MANUAL_PROVIDER_KEY,
    family,
    unit,
    currencyCode || "NONE",
    regionCode || "GLOBAL",
    scopeType || "GLOBAL",
    scopeKey || "GLOBAL",
  ].map((part) => encodeURIComponent(String(part))).join("|");
}

function safeMetadata(value) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, "INVALID_SOURCE_METADATA", "sourceMetadata must be an object.");
  }
  const serialized = JSON.stringify(value);
  if (serialized.length > 4000) throw httpError(400, "INVALID_SOURCE_METADATA", "sourceMetadata is too large.");
  if (/(password|secret|token|authorization|cookie|credential)/i.test(serialized)) {
    throw httpError(400, "SENSITIVE_SOURCE_METADATA", "Credentials and secrets cannot be stored as source metadata.");
  }
  return value;
}

function publicResult(row, { now = new Date(), staleFallback = false } = {}) {
  const fallbackState = staleFallback ? FALLBACK_STATE.STALE_CACHE : row?.fallbackState || FALLBACK_STATE.NONE;
  const marketReference = publicReference(row, { now, fallbackState });
  return {
    ok: true,
    dataClass: "EXTERNAL_REFERENCE",
    state: marketReference.freshness,
    marketReference,
    providerStatus: marketReference.providerStatus,
    freshness: marketReference.freshness,
    confidence: marketReference.confidence,
    completeness: marketReference.completeness,
    conflictState: marketReference.conflictState,
    fallbackState: marketReference.fallbackState,
    actualInternalData: null,
    authorityNote: "Bu değer gerçek maliyet değildir; gerçek iç veri varsa önceliklidir.",
  };
}

function expiredResult(row, now) {
  return {
    ok: true,
    dataClass: "EXTERNAL_REFERENCE",
    state: FRESHNESS.EXPIRED,
    marketReference: null,
    lastKnownReference: publicReference(row, { now }),
    providerStatus: row?.providerStatus || PROVIDER_STATUS.UNAVAILABLE,
    freshness: FRESHNESS.EXPIRED,
    confidence: "LOW",
    completeness: row?.completeness || COMPLETENESS.INCOMPLETE,
    conflictState: row?.conflictState || "UNKNOWN",
    fallbackState: FALLBACK_STATE.NO_SAFE_FALLBACK,
    actualInternalData: null,
    authorityNote: "Bu referansın geçerlilik süresi doldu; gerçek maliyet yerine kullanılamaz.",
  };
}

async function findLatestStoredReference({ providerKey, family, unit, currencyCode = null, regionCode = null, scopeType = "GLOBAL", scopeKey = "GLOBAL" }) {
  const rows = await prisma.externalCostReference.findMany({
    where: {
      family,
      unit,
      providerKey,
      ...(currencyCode ? { currencyCode } : {}),
      OR: [{ regionCode }, { regionCode: null }],
      AND: [
        { OR: [{ scopeType, scopeKey }, { scopeType: "GLOBAL", scopeKey: "GLOBAL" }] },
        { dataClass: "EXTERNAL_REFERENCE" },
      ],
    },
    orderBy: [{ asOf: "desc" }, { retrievedAt: "desc" }, { id: "desc" }],
    take: 25,
    select: REFERENCE_SELECT,
  });

  const requestedRegion = regionCode || null;
  const requestedScopeType = scopeType || "GLOBAL";
  const requestedScopeKey = scopeKey || "GLOBAL";
  return rows.sort((left, right) => {
    const score = (row) => (
      (row.scopeType === requestedScopeType && row.scopeKey === requestedScopeKey ? 8 : 0) +
      (row.scopeType === "GLOBAL" && row.scopeKey === "GLOBAL" ? 4 : 0) +
      (requestedRegion && row.regionCode === requestedRegion ? 2 : 0) +
      (!row.regionCode ? 1 : 0)
    );
    return score(right) - score(left);
  })[0] || null;
}

export async function createExternalCostReference(input, actor, { providerKey = MANUAL_PROVIDER_KEY } = {}) {
  if (!ENV.EXTERNAL_REFERENCE_MANUAL_IMPORT_ENABLED) {
    throw httpError(503, "REFERENCE_IMPORT_DISABLED", "Kontrollü dış referans girişi bu ortamda etkin değil.");
  }
  const normalized = normalizeReferenceInput(input, {
    providerKey,
    requireProvenance: true,
  });
  const created = await prisma.externalCostReference.create({
    data: {
      ...normalized,
      sourceName: normalized.sourceName,
      sourceMetadata: safeMetadata(normalized.sourceMetadata),
      createdByUserId: actor?.id || null,
    },
    select: REFERENCE_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: actor?.id || null,
      actorRole: actor?.role || null,
      action: "EXTERNAL_REFERENCE_IMPORTED",
      entity: "ExternalCostReference",
      entityId: created.id,
      meta: {
        family: created.family,
        unit: created.unit,
        providerKey: created.providerKey,
        sourceName: created.sourceName,
        asOf: created.asOf?.toISOString?.() || null,
        regionCode: created.regionCode,
        scopeType: created.scopeType,
        scopeKey: created.scopeKey,
        dataClass: created.dataClass,
      },
    },
  });

  clearResponseCache(CACHE_PREFIX);
  return publicReference(created);
}

export async function getExternalCostReference(query = {}) {
  const providerKey = String(query.providerKey || MANUAL_PROVIDER_KEY).trim().toUpperCase();
  const family = normalizedFamily(query.family);
  const unit = normalizedUnit(query.unit);
  const currencyCode = query.currencyCode ? String(query.currencyCode).trim().toUpperCase() : null;
  const regionCode = query.regionCode ? String(query.regionCode).trim().toUpperCase() : null;
  const scopeType = normalizedScope(query.scopeType);
  const scopeKey = String(query.scopeKey || (scopeType === "GLOBAL" ? "GLOBAL" : "")).trim().toUpperCase() || "GLOBAL";
  const key = cacheKey({ providerKey, family, unit, currencyCode, regionCode, scopeType, scopeKey });

  return rememberResponse(
    key,
    async () => {
      const row = await findLatestStoredReference({ providerKey, family, unit, currencyCode, regionCode, scopeType, scopeKey });
      if (!row) return { ...unavailableReference({ family, reason: "NO_DATA" }), ok: true };
      const freshness = evaluateFreshness({ asOf: row.asOf, family, now: new Date() });
      if (freshness === FRESHNESS.EXPIRED) return expiredResult(row, new Date());
      return publicResult(row, { now: new Date(), staleFallback: freshness === FRESHNESS.STALE });
    },
    { ttlMs: Math.max(250, Number(ENV.EXTERNAL_REFERENCE_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS)) },
  );
}

export async function listExternalReferenceFamilies() {
  return REFERENCE_FAMILIES.map((family) => ({
    family,
    units: family === "FX" ? ["RATE"] : family.startsWith("FUEL_") ? ["CURRENCY_PER_L"] : REFERENCE_UNITS,
    configuredProvider: String(ENV.EXTERNAL_REFERENCE_PROVIDER || "none").trim().toUpperCase() || "NONE",
  }));
}

export async function acquireAndPersistExternalReference({ request, registry, primaryProviderKey, fallbackProviderKey, actor, now = new Date(), onEvent } = {}) {
  const result = await acquireExternalReference({
    request,
    registry,
    primaryProviderKey,
    fallbackProviderKey,
    now,
    maxAttempts: ENV.EXTERNAL_REFERENCE_RETRY_MAX_ATTEMPTS,
    onEvent,
  });
  if (!result?.marketReference) return result;
  const stored = await createExternalCostReference({
    ...result.marketReference,
    dataClass: "EXTERNAL_REFERENCE",
    sourceName: result.marketReference.sourceName,
    asOf: result.marketReference.asOf,
    regionCode: result.marketReference.regionCode,
    scopeType: result.marketReference.scopeType,
    scopeKey: result.marketReference.scopeKey,
    fallbackState: result.fallbackState,
  }, actor, { providerKey: result.marketReference.providerKey });
  return { ...result, marketReference: stored };
}

export function externalReferenceKeyFor(input) {
  return buildReferenceKey(input);
}
