import { rememberResponse, clearResponseCache } from "../utils/responseCache.js";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { httpError } from "../errors/http.js";
import { acquireExternalReference } from "../externalCost/providerRegistry.js";
import { createConfiguredExternalReferenceRegistry, providerKeyForFamily } from "./providerFactory.js";
import { buildPlatformObservedReference, buildPricingGuidance, resolveRegionScope, resolveThreeReferenceLayers } from "./referenceLayers.js";
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
  sourceMetadata: true,
  rawPayloadHash: true,
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

function fallbackProviderKeyForFamily(family, primaryProviderKey) {
  const primary = String(primaryProviderKey || "").trim().toUpperCase();
  if (primary === "EPDK_PETROL" && ["FUEL_DIESEL", "FUEL_GASOLINE_95"].includes(String(family || "").toUpperCase())) {
    return "EPDK_PETROL_BULLETIN";
  }
  return null;
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
        { OR: [{ scopeType, scopeKey }, { scopeType: "GLOBAL" }] },
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

async function persistProviderReference(input, { actor = null, now = new Date() } = {}) {
  const normalized = normalizeReferenceInput(input, {
    providerKey: input.providerKey,
    now,
    requireProvenance: true,
  });
  const data = {
    ...normalized,
    sourceMetadata: safeMetadata(normalized.sourceMetadata),
    createdByUserId: null,
  };
  const existing = await prisma.externalCostReference.findUnique({
    where: { referenceKey: normalized.referenceKey },
    select: { id: true },
  });
  const stored = existing
    ? await prisma.externalCostReference.update({ where: { id: existing.id }, data, select: REFERENCE_SELECT })
    : await prisma.externalCostReference.create({ data, select: REFERENCE_SELECT });

  await prisma.auditLog.create({
    data: {
      actorUserId: actor?.id || null,
      actorRole: actor?.role || "SYSTEM",
      action: "EXTERNAL_REFERENCE_REFRESHED",
      entity: "ExternalCostReference",
      entityId: stored.id,
      meta: {
        family: stored.family,
        unit: stored.unit,
        providerKey: stored.providerKey,
        sourceName: stored.sourceName,
        asOf: stored.asOf?.toISOString?.() || null,
        regionCode: stored.regionCode,
        scopeType: stored.scopeType,
        scopeKey: stored.scopeKey,
        dataClass: stored.dataClass,
        rawPayloadHash: stored.rawPayloadHash || null,
      },
    },
  });
  clearResponseCache(CACHE_PREFIX);
  return publicReference(stored, { now });
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

export async function refreshExternalCostReference(query = {}, actor = null) {
  const family = normalizedFamily(query.family);
  const unit = normalizedUnit(query.unit);
  const currencyCode = query.currencyCode ? String(query.currencyCode).trim().toUpperCase() : "TRY";
  const regionCode = query.regionCode ? String(query.regionCode).trim().toUpperCase() : null;
  const scopeType = normalizedScope(query.scopeType || (regionCode ? "CITY" : "GLOBAL"));
  const scopeKey = String(query.scopeKey || regionCode || (scopeType === "GLOBAL" ? "GLOBAL" : "")).trim().toUpperCase() || "GLOBAL";
  const requestedProvider = String(query.providerKey || providerKeyForFamily(family) || "").trim().toUpperCase();
  const fallbackProvider = String(query.fallbackProviderKey || fallbackProviderKeyForFamily(family, requestedProvider) || "").trim().toUpperCase() || null;
  if (!requestedProvider) return { ...unavailableReference({ family, reason: "SOURCE_UNAVAILABLE" }), ok: true };
  const registry = createConfiguredExternalReferenceRegistry({ providerKey: requestedProvider });
  const result = await acquireExternalReference({
    request: { family, unit, currencyCode, regionCode, scopeType, scopeKey },
    registry,
    primaryProviderKey: requestedProvider,
    fallbackProviderKey: fallbackProvider,
    now: new Date(),
    maxAttempts: ENV.EXTERNAL_REFERENCE_RETRY_MAX_ATTEMPTS,
  });
  if (!result?.marketReference) return { ...result, ok: true };
  const stored = await persistProviderReference({
    ...result.marketReference,
    providerKey: result.marketReference.providerKey,
    fallbackState: result.fallbackState,
  }, { actor });
  return { ...result, ok: true, marketReference: stored };
}

function parseNonNegativeMinor(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

async function loadPlatformQuoteObservations({ regionCode, windowDays, scope = "ROOM" } = {}) {
  if (String(scope).toUpperCase() !== "ROOM" || !regionCode) return [];
  const since = new Date(Date.now() - Math.max(1, Number(windowDays) || 90) * 24 * 60 * 60 * 1000);
  const rows = await prisma.shiftOffer.findMany({
    where: { status: "ACCEPTED", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      amountRoom: true,
      createdAt: true,
      shift: {
        select: {
          company: { select: { region: { select: { name: true } } } },
          room: { select: { region: { select: { name: true } } } },
        },
      },
    },
  });
  return rows
    .map((row) => ({
      valueMinor: row.amountRoom,
      observedAt: row.createdAt,
      regionCode: row.shift?.company?.region?.name || row.shift?.room?.region?.name || null,
      eligible: Boolean(row.amountRoom),
    }))
    .filter((row) => {
      const name = row.regionCode ? resolveRegionScope({ provinceName: row.regionCode }).regionCode : null;
      return name === regionCode;
    });
}

export async function getReferenceLayers(query = {}, actor = null) {
  const family = normalizedFamily(query.family || "FUEL_DIESEL");
  const unit = normalizedUnit(query.unit || "CURRENCY_PER_L");
  const region = resolveRegionScope({ provinceCode: query.regionCode, provinceName: query.regionName, requestedScope: query.scopeType || "CITY" });
  const providerKey = String(query.providerKey || providerKeyForFamily(family) || "EPDK_PETROL").trim().toUpperCase();
  const fallbackProvider = fallbackProviderKeyForFamily(family, providerKey);
  let external = await getExternalCostReference({
    family,
    unit,
    currencyCode: query.currencyCode || "TRY",
    providerKey,
    regionCode: region.regionCode,
    scopeType: region.scopeType,
    scopeKey: region.scopeKey,
  });
  if (!external?.marketReference && fallbackProvider) {
    const storedFallback = await getExternalCostReference({
      family,
      unit,
      currencyCode: query.currencyCode || "TRY",
      providerKey: fallbackProvider,
      regionCode: region.regionCode,
      scopeType: region.scopeType,
      scopeKey: region.scopeKey,
    });
    if (storedFallback?.marketReference) external = storedFallback;
  }
  const hasFreshStoredReference = Boolean(
    external?.marketReference && String(external.freshness || external.marketReference.freshness || "").toUpperCase() === FRESHNESS.FRESH,
  );
  if (String(query.refresh || "").toLowerCase() === "true" && region.regionCode && !hasFreshStoredReference) {
    const refreshed = await refreshExternalCostReference({
      family,
      unit,
      currencyCode: query.currencyCode || "TRY",
      providerKey,
      regionCode: region.regionCode,
      scopeType: region.scopeType,
      scopeKey: region.scopeKey,
      fallbackProviderKey: fallbackProvider,
    }, actor);
    // A provider outage must not erase a still-valid stored reference for the
    // already-resolved province. Keep the canonical stored value unless the
    // refresh actually returns a new market reference.
    if (refreshed?.marketReference) external = refreshed;
  }
  const windowDays = Math.max(1, Math.min(365, Number(query.windowDays || ENV.PLATFORM_REFERENCE_WINDOW_DAYS || 90)));
  const observations = await loadPlatformQuoteObservations({ regionCode: region.regionCode, windowDays, scope: query.scope || actor?.role });
  const platform = buildPlatformObservedReference({
    observations,
    region,
    minSampleCount: ENV.PLATFORM_REFERENCE_MIN_SAMPLE_COUNT,
    windowDays,
    family: "REGIONAL_COST_REFERENCE",
    unit: "CURRENCY_PER_TRIP",
  });
  const actual = {
    valueMinor: parseNonNegativeMinor(query.actualValueMinor),
    unit: query.actualUnit || "CURRENCY_PER_TRIP",
    currencyCode: query.currencyCode || "TRY",
    asOf: query.actualAsOf || null,
    window: query.actualWindow || null,
    geography: query.actualGeography || region.regionName || null,
  };
  const layers = resolveThreeReferenceLayers({ external, platform, actual, region, family });
  return {
    ok: true,
    scope: String(query.scope || actor?.role || "UNKNOWN").toUpperCase(),
    ...layers,
    pricingGuidance: buildPricingGuidance({
      operationalCostMinor: parseNonNegativeMinor(query.operationalCostMinor),
      quoteFloorMinor: parseNonNegativeMinor(query.quoteFloorMinor),
      observedQuoteBand: String(query.scope || actor?.role).toUpperCase() === "ROOM" && platform.available ? platform.range : null,
      currencyCode: query.currencyCode || "TRY",
    }),
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  };
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
  const stored = await persistProviderReference({
    ...result.marketReference,
    dataClass: "EXTERNAL_REFERENCE",
    sourceName: result.marketReference.sourceName,
    asOf: result.marketReference.asOf,
    regionCode: result.marketReference.regionCode,
    scopeType: result.marketReference.scopeType,
    scopeKey: result.marketReference.scopeKey,
    fallbackState: result.fallbackState,
  }, { actor, now });
  return { ...result, marketReference: stored };
}

export function externalReferenceKeyFor(input) {
  return buildReferenceKey(input);
}
