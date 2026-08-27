import {
  FALLBACK_STATE,
  FRESHNESS,
  PROVIDER_STATUS,
  classifyReferenceError,
  deriveConfidence,
  normalizeReferenceInput,
  publicReference,
} from "./referenceContract.js";

export class ExternalReferenceProviderError extends Error {
  constructor(code, message, { retryable = false, details = null } = {}) {
    super(message);
    this.name = "ExternalReferenceProviderError";
    this.code = code;
    this.retryable = retryable;
    if (details) this.details = details;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerKey(provider) {
  return String(provider?.key || provider?.providerKey || "").trim().toUpperCase();
}

function supports(provider, family) {
  const families = Array.isArray(provider?.families) ? provider.families : [];
  return families.includes(family) || families.includes("*");
}

export function createProviderRegistry(providers = []) {
  const entries = new Map();
  for (const provider of providers) {
    const key = providerKey(provider);
    if (!key || typeof provider.fetch !== "function") {
      throw new ExternalReferenceProviderError("INVALID_CONFIG", "Provider contract is incomplete.");
    }
    if (entries.has(key)) {
      throw new ExternalReferenceProviderError("INVALID_CONFIG", `Duplicate provider: ${key}.`);
    }
    entries.set(key, Object.freeze({ ...provider, key }));
  }
  return Object.freeze({
    keys: () => [...entries.keys()],
    get: (key) => entries.get(String(key || "").trim().toUpperCase()) || null,
    listForFamily: (family) => [...entries.values()].filter((provider) => supports(provider, family)),
  });
}

export function calculateBackoffMs(attempt, { baseMs = 25, maxMs = 500 } = {}) {
  const safeAttempt = Math.max(0, Math.trunc(Number(attempt) || 0));
  return Math.min(maxMs, baseMs * (2 ** safeAttempt));
}

export async function executeWithBoundedRetry(operation, {
  maxAttempts = 2,
  sleepFn = sleep,
  baseMs = 25,
  maxBackoffMs = 500,
  onRetry = () => {},
} = {}) {
  const attempts = Math.max(1, Math.min(3, Math.trunc(Number(maxAttempts) || 1)));
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const classification = classifyReferenceError(error);
      const retryable = Boolean(error?.retryable) || classification === "TRANSIENT";
      if (!retryable || attempt >= attempts) throw error;
      const delayMs = calculateBackoffMs(attempt - 1, { baseMs, maxMs: maxBackoffMs });
      onRetry({ attempt, delayMs, code: error?.code || "TRANSIENT_PROVIDER_ERROR" });
      await sleepFn(delayMs);
    }
  }
  throw lastError || new ExternalReferenceProviderError("SOURCE_UNAVAILABLE", "Provider unavailable.", { retryable: true });
}

export function createCircuitBreaker({ failureThreshold = 3, cooldownMs = 30_000, now = () => Date.now() } = {}) {
  let failures = 0;
  let openedAt = null;
  return Object.freeze({
    state() {
      if (openedAt !== null && now() - openedAt >= cooldownMs) {
        failures = 0;
        openedAt = null;
      }
      if (openedAt !== null) return "UNAVAILABLE";
      if (failures > 0) return "DEGRADED";
      return "HEALTHY";
    },
    allow() {
      return this.state() !== "UNAVAILABLE";
    },
    success() {
      failures = 0;
      openedAt = null;
    },
    failure() {
      failures += 1;
      if (failures >= failureThreshold) openedAt = now();
    },
  });
}

function unavailable(family, providerStatus, fallbackState = FALLBACK_STATE.NO_SAFE_FALLBACK) {
  return {
    dataClass: "EXTERNAL_REFERENCE",
    family,
    state: FRESHNESS.SOURCE_UNAVAILABLE,
    marketReference: null,
    providerStatus,
    freshness: FRESHNESS.SOURCE_UNAVAILABLE,
    confidence: "UNKNOWN",
    completeness: "INCOMPLETE",
    fallbackState,
    actualInternalData: null,
    authorityNote: "Bu değer gerçek maliyet değildir; gerçek iç veri varsa önceliklidir.",
  };
}

export async function acquireExternalReference({
  request = {},
  registry,
  primaryProviderKey = null,
  fallbackProviderKey = null,
  now = new Date(),
  maxAttempts = 2,
  sleepFn = sleep,
  circuitBreakers = new Map(),
  onEvent = () => {},
} = {}) {
  const family = String(request.family || "").trim().toUpperCase();
  const providers = [primaryProviderKey, fallbackProviderKey]
    .filter(Boolean)
    .map((key) => registry?.get(key))
    .filter(Boolean);
  if (!providers.length) return unavailable(family, PROVIDER_STATUS.NOT_CONFIGURED);

  const attempted = new Set();
  let configuredProviderSeen = false;
  let invalidConfigSeen = false;
  for (const [index, provider] of providers.entries()) {
    const key = providerKey(provider);
    if (attempted.has(key)) continue;
    attempted.add(key);
    if (!provider.configured) {
      onEvent({ type: "provider_not_configured", providerKey: key, family });
      continue;
    }
    configuredProviderSeen = true;
    if (!supports(provider, family)) {
      onEvent({ type: "provider_unsupported_family", providerKey: key, family });
      continue;
    }

    let breaker = circuitBreakers.get(key);
    if (!breaker) {
      breaker = createCircuitBreaker();
      circuitBreakers.set(key, breaker);
    }
    if (!breaker.allow()) {
      onEvent({ type: "provider_circuit_open", providerKey: key, family });
      continue;
    }

    const started = Date.now();
    try {
      const raw = await executeWithBoundedRetry(
        (attempt) => provider.fetch({ ...request, attempt }),
        { maxAttempts, sleepFn, onRetry: (event) => onEvent({ type: "provider_retry", providerKey: key, family, ...event }) },
      );
      const normalized = normalizeReferenceInput(raw, {
        providerKey: key,
        now,
        requireProvenance: true,
      });
      if (normalized.regionCode && request.regionCode && normalized.regionCode !== String(request.regionCode).toUpperCase()) {
        throw new ExternalReferenceProviderError("REGION_MISMATCH", "Provider response scope does not match request.");
      }
      breaker.success();
      const marketReference = publicReference({ ...normalized, id: null }, { now });
      const fallbackState = index > 0 ? FALLBACK_STATE.FALLBACK_PROVIDER : FALLBACK_STATE.NONE;
      const result = {
        ...marketReference,
        state: marketReference.freshness,
        marketReference,
        providerStatus: PROVIDER_STATUS.CONFIGURED,
        fallbackState,
        confidence: deriveConfidence({
          freshness: marketReference.freshness,
          completeness: marketReference.completeness,
          conflictState: marketReference.conflictState,
          fallbackState,
        }),
        actualInternalData: null,
        authorityNote: "Bu değer gerçek maliyet değildir; gerçek iç veri varsa önceliklidir.",
      };
      onEvent({ type: "provider_success", providerKey: key, family, latencyMs: Date.now() - started, fallback: index > 0 });
      return result;
    } catch (error) {
      breaker.failure();
      onEvent({ type: "provider_failure", providerKey: key, family, latencyMs: Date.now() - started, code: error?.code || "UNKNOWN" });
      const nonRetryable = ["REGION_MISMATCH", "UNIT_FAMILY_MISMATCH", "INVALID_REFERENCE_INPUT", "MISSING_PROVENANCE", "INVALID_DECIMAL"].includes(String(error?.code || ""));
      if (["INVALID_DECIMAL", "INVALID_CURRENCY", "INVALID_REFERENCE_INPUT", "MISSING_PROVENANCE", "NEGATIVE_VALUE"].includes(String(error?.code || ""))) {
        invalidConfigSeen = true;
      }
      if (nonRetryable) continue;
    }
  }

  return unavailable(
    family,
    invalidConfigSeen
      ? PROVIDER_STATUS.INVALID_CONFIG
      : configuredProviderSeen
        ? PROVIDER_STATUS.UNAVAILABLE
        : PROVIDER_STATUS.NOT_CONFIGURED,
  );
}
