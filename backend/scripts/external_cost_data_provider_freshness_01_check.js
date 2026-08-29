#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPLETENESS,
  CONFIDENCE,
  CONFLICT_STATE,
  FALLBACK_STATE,
  FRESHNESS,
  PROVIDER_STATUS,
  REFERENCE_DATA_CLASS,
  REFERENCE_FAMILIES,
  deriveConfidence,
  evaluateFreshness,
  normalizeDecimal,
  normalizeReferenceInput,
} from "../src/externalCost/referenceContract.js";
import {
  ExternalReferenceProviderError,
  acquireExternalReference,
  calculateBackoffMs,
  createCircuitBreaker,
  createProviderRegistry,
} from "../src/externalCost/providerRegistry.js";
import { rememberResponse, clearResponseCache } from "../src/utils/responseCache.js";
import { createEpdkPetrolProvider, parseEpdkFuelResponse } from "../src/externalCost/epdkProvider.js";
import { buildPlatformObservedReference, buildPricingGuidance, resolveRegionScope, resolveThreeReferenceLayers } from "../src/externalCost/referenceLayers.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const fixedNow = new Date("2026-08-27T12:00:00.000Z");
const freshAsOf = new Date("2026-08-27T08:00:00.000Z");
const staleAsOf = new Date("2026-08-25T12:00:00.000Z");
const expiredAsOf = new Date("2026-07-01T12:00:00.000Z");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function expectFailure(fn, code, label) {
  try {
    fn();
  } catch (error) {
    must(String(error?.code || "") === code, `${label} code`);
    return;
  }
  throw new Error(`FAIL ${label} accepted invalid input`);
}

function referenceInput(overrides = {}) {
  return {
    family: "FUEL_DIESEL",
    valueDecimal: "42.37",
    unit: "CURRENCY_PER_L",
    currencyCode: "TRY",
    sourceName: "Controlled source",
    asOf: freshAsOf.toISOString(),
    regionCode: "TR",
    scopeType: "GLOBAL",
    scopeKey: "GLOBAL",
    ...overrides,
  };
}

async function main() {
  console.log("=== #2 EXTERNAL COST DATA PROVIDER / FRESHNESS CHECK ===");

  const packageText = read("package.json");
  const schemaText = read("backend/prisma/schema.prisma");
  const migrationText = read("backend/prisma/migrations/20260827120000_external_cost_reference_foundation_01/migration.sql");
  const routerText = read("backend/src/externalCost/router.js");
  const serviceText = read("backend/src/externalCost/externalCostReferenceService.js");
  const envText = read("backend/src/env.js");
  const docText = read("docs/EXTERNAL_COST_DATA_PROVIDER_AND_FRESHNESS_01.md");
  const epdkText = read("backend/src/externalCost/epdkProvider.js");
  const layersText = read("backend/src/externalCost/referenceLayers.js");

  must(packageText.includes('"check:externalcostdataproviderfreshness01": "node backend/scripts/external_cost_data_provider_freshness_01_check.js"'), "canonical #2 check is exposed");
  must(schemaText.includes("model ExternalCostReference"), "Prisma external reference owner exists");
  must(schemaText.includes("enum ExternalReferenceFamily"), "data family enum exists");
  must(schemaText.includes("ExternalReferenceDataClass"), "classification enum exists");
  must(migrationText.includes('CHECK ("dataClass" = \'EXTERNAL_REFERENCE\')'), "database rejects non-external classifications");
  must(migrationText.includes('CREATE TABLE "ExternalCostReference"'), "migration creates external reference table");
  must(routerText.includes("externalCostReferenceRouter"), "external reference route owner is explicit");
  must(routerText.includes('requireRole("SUPER_ADMIN")'), "reference import is admin-only");
  must(serviceText.includes("rememberResponse"), "reference reads reuse canonical cache");
  must(serviceText.includes("actualInternalData: null"), "reference response cannot silently become actual cost");
  must(envText.includes("EXTERNAL_REFERENCE_PROVIDER"), "provider configuration is environment-owned");
  must(!envText.includes("42.37") && !serviceText.includes("42.37"), "runtime has no fabricated market value");
  must(docText.includes("#2 EXTERNAL-COST-DATA-PROVIDER-AND-FRESHNESS-01"), "#2 architecture document exists");
  must(docText.includes("DEMO_FIXTURE") && docText.includes("INTERNAL_ACTUAL") && docText.includes("EXTERNAL_REFERENCE"), "document keeps three data classes distinct");
  must(epdkText.includes("EPDK_PETROL") && epdkText.includes("SOAPAction") && epdkText.includes("rawPayloadHash"), "EPDK provider keeps protocol, provenance and payload identity");
  must(layersText.includes("EXTERNAL_MARKET_REFERENCE") && layersText.includes("SEFERPAKT_PLATFORM_REFERENCE") && layersText.includes("USER_COMPANY_ROOM_ACTUAL"), "three value layers have separate owners");

  must(REFERENCE_DATA_CLASS.INTERNAL_ACTUAL !== REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE, "actual and external classifications differ");
  must(REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE !== REFERENCE_DATA_CLASS.DEMO_FIXTURE, "external and demo classifications differ");
  must(REFERENCE_FAMILIES.includes("FUEL_DIESEL") && REFERENCE_FAMILIES.includes("FUEL_GASOLINE_95") && REFERENCE_FAMILIES.includes("FX"), "initial family contract includes diesel, gasoline 95 and FX");

  must(normalizeDecimal("42.3700") === "42.37", "decimal normalization is exact string based");
  expectFailure(() => normalizeDecimal(42.37), "INVALID_DECIMAL", "floating-point decimal input is rejected");
  const normalized = normalizeReferenceInput(referenceInput(), { now: fixedNow });
  must(normalized.dataClass === REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE, "normalized provider data is external reference");
  must(normalized.valueDecimal === "42.37" && normalized.valueMinor === null, "decimal value remains exact and uncoerced");
  const minor = normalizeReferenceInput(referenceInput({ valueDecimal: undefined, valueMinor: 4237 }), { now: fixedNow });
  must(minor.valueDecimal === "42.37" && minor.valueMinor === 4237, "minor value is converted without floating point");

  expectFailure(() => normalizeReferenceInput(referenceInput({ dataClass: "INTERNAL_ACTUAL" }), { now: fixedNow }), "REFERENCE_CLASSIFICATION_FORBIDDEN", "actual promotion is rejected");
  expectFailure(() => normalizeReferenceInput(referenceInput({ dataClass: "DEMO_FIXTURE" }), { now: fixedNow }), "REFERENCE_CLASSIFICATION_FORBIDDEN", "demo promotion is rejected");
  expectFailure(() => normalizeReferenceInput(referenceInput({ unit: "CURRENCY_PER_KM" }), { now: fixedNow }), "UNIT_FAMILY_MISMATCH", "unit mismatch is rejected");
  expectFailure(() => normalizeReferenceInput(referenceInput({ sourceName: "", asOf: null }), { now: fixedNow }), "MISSING_PROVENANCE", "missing provenance is rejected");
  expectFailure(() => normalizeReferenceInput(referenceInput({ valueDecimal: "42.375" }), { now: fixedNow }), "MONEY_PRECISION_INVALID", "unsafe money precision is rejected");
  expectFailure(() => normalizeReferenceInput(referenceInput({ valueDecimal: "42.37", valueMinor: 4238 }), { now: fixedNow }), "MONEY_VALUE_MISMATCH", "tampered duplicate money values are rejected");
  expectFailure(() => normalizeReferenceInput(referenceInput({ family: "FX", unit: "RATE", currencyCode: "" }), { now: fixedNow }), "INVALID_CURRENCY", "FX currency is required");

  must(evaluateFreshness({ asOf: freshAsOf, family: "FUEL_DIESEL", now: fixedNow }) === FRESHNESS.FRESH, "fresh value state");
  must(evaluateFreshness({ asOf: staleAsOf, family: "FUEL_DIESEL", now: fixedNow }) === FRESHNESS.STALE, "stale value state");
  must(evaluateFreshness({ asOf: expiredAsOf, family: "FUEL_DIESEL", now: fixedNow }) === FRESHNESS.EXPIRED, "expired value state");
  must(evaluateFreshness({ asOf: null, family: "FUEL_DIESEL", now: fixedNow }) === FRESHNESS.UNKNOWN, "unknown as-of state");
  must(deriveConfidence({ freshness: FRESHNESS.FRESH, completeness: COMPLETENESS.COMPLETE, conflictState: CONFLICT_STATE.NO_CONFLICT, fallbackState: FALLBACK_STATE.NONE }) === CONFIDENCE.HIGH, "fresh complete confidence is high");
  must(deriveConfidence({ freshness: FRESHNESS.STALE, completeness: COMPLETENESS.COMPLETE, conflictState: CONFLICT_STATE.NO_CONFLICT, fallbackState: FALLBACK_STATE.NONE }) === CONFIDENCE.MEDIUM, "stale confidence degrades");
  must(deriveConfidence({ freshness: FRESHNESS.FRESH, completeness: COMPLETENESS.COMPLETE, conflictState: CONFLICT_STATE.CONFLICT, fallbackState: FALLBACK_STATE.NONE }) === CONFIDENCE.LOW, "conflict confidence degrades");
  must(deriveConfidence({ freshness: FRESHNESS.UNKNOWN, completeness: COMPLETENESS.INCOMPLETE }) === CONFIDENCE.UNKNOWN, "incomplete confidence is unknown");

  let providerCalls = 0;
  const configuredProvider = {
    key: "TEST_PROVIDER",
    families: ["FUEL_DIESEL"],
    configured: true,
    fetch: async () => {
      providerCalls += 1;
      return referenceInput({ sourceName: "Test provider", asOf: freshAsOf.toISOString() });
    },
  };
  const registry = createProviderRegistry([configuredProvider]);
  const success = await acquireExternalReference({
    request: { family: "FUEL_DIESEL", regionCode: "TR" },
    registry,
    primaryProviderKey: "TEST_PROVIDER",
    now: fixedNow,
    sleepFn: async () => {},
  });
  must(success.providerStatus === PROVIDER_STATUS.CONFIGURED, "configured provider success");
  must(success.marketReference?.dataClass === REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE, "provider output is normalized before exposure");
  must(success.marketReference?.providerKey === "TEST_PROVIDER", "provider identity is retained");
  must(providerCalls === 1, "configured provider called once");

  const notConfigured = await acquireExternalReference({
    request: { family: "FUEL_DIESEL" },
    registry: createProviderRegistry([{ ...configuredProvider, key: "OFF_PROVIDER", configured: false }]),
    primaryProviderKey: "OFF_PROVIDER",
  });
  must(notConfigured.providerStatus === PROVIDER_STATUS.NOT_CONFIGURED, "not-configured provider is explicit");

  const unsupported = await acquireExternalReference({
    request: { family: "FX" },
    registry,
    primaryProviderKey: "TEST_PROVIDER",
  });
  must(unsupported.providerStatus === PROVIDER_STATUS.UNAVAILABLE, "unsupported family does not fabricate a value");

  const invalidResponse = await acquireExternalReference({
    request: { family: "FUEL_DIESEL" },
    registry: createProviderRegistry([{
      key: "BAD_PROVIDER",
      families: ["FUEL_DIESEL"],
      configured: true,
      fetch: async () => ({ valueDecimal: "not-a-number" }),
    }]),
    primaryProviderKey: "BAD_PROVIDER",
  });
  must(invalidResponse.marketReference === null && invalidResponse.providerStatus === PROVIDER_STATUS.INVALID_CONFIG, "invalid provider response is rejected");

  const retryEvents = [];
  let transientCalls = 0;
  const fallback = await acquireExternalReference({
    request: { family: "FUEL_DIESEL", regionCode: "TR" },
    registry: createProviderRegistry([
      {
        key: "PRIMARY_PROVIDER",
        families: ["FUEL_DIESEL"],
        configured: true,
        fetch: async () => {
          transientCalls += 1;
          throw new ExternalReferenceProviderError("TIMEOUT", "temporary", { retryable: true });
        },
      },
      {
        key: "FALLBACK_PROVIDER",
        families: ["FUEL_DIESEL"],
        configured: true,
        fetch: async () => referenceInput({ sourceName: "Fallback provider" }),
      },
    ]),
    primaryProviderKey: "PRIMARY_PROVIDER",
    fallbackProviderKey: "FALLBACK_PROVIDER",
    now: fixedNow,
    maxAttempts: 2,
    sleepFn: async () => {},
    onEvent: (event) => retryEvents.push(event),
  });
  must(transientCalls === 2, "transient provider retry is bounded");
  must(retryEvents.filter((event) => event.type === "provider_retry").length === 1, "retry emits one bounded backoff event");
  must(fallback.fallbackState === FALLBACK_STATE.FALLBACK_PROVIDER, "fallback provider is explicit");
  must(fallback.marketReference?.providerKey === "FALLBACK_PROVIDER", "fallback provider identity is retained");
  must(calculateBackoffMs(0) < calculateBackoffMs(1) && calculateBackoffMs(10) <= 500, "backoff is increasing and capped");

  const allUnavailable = await acquireExternalReference({
    request: { family: "FUEL_DIESEL" },
    registry: createProviderRegistry([{ key: "DOWN_PROVIDER", families: ["FUEL_DIESEL"], configured: true, fetch: async () => { throw new ExternalReferenceProviderError("SOURCE_UNAVAILABLE", "down", { retryable: false }); } }]),
    primaryProviderKey: "DOWN_PROVIDER",
    maxAttempts: 3,
  });
  must(allUnavailable.marketReference === null && allUnavailable.fallbackState === FALLBACK_STATE.NO_SAFE_FALLBACK, "all providers unavailable returns no-safe-fallback");

  let circuitNow = 1;
  const breaker = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 100, now: () => circuitNow });
  breaker.failure();
  must(breaker.state() === "DEGRADED", "provider health degrades after failure");
  breaker.failure();
  must(breaker.state() === "UNAVAILABLE" && breaker.allow() === false, "provider circuit opens after threshold");
  circuitNow = 101;
  must(breaker.allow() === true && breaker.state() === "HEALTHY", "provider circuit recovers after cooldown");

  clearResponseCache("external-reference-check");
  let cacheProducerCalls = 0;
  const cacheProducer = () => {
    cacheProducerCalls += 1;
    return Promise.resolve({ dataClass: REFERENCE_DATA_CLASS.EXTERNAL_REFERENCE, freshness: FRESHNESS.FRESH });
  };
  const [cachedA, cachedB] = await Promise.all([
    rememberResponse("external-reference-check|TEST_PROVIDER|FUEL_DIESEL|TR|GLOBAL|GLOBAL", cacheProducer, { ttlMs: 1000, scope: { role: "reference", userId: 0 } }),
    rememberResponse("external-reference-check|TEST_PROVIDER|FUEL_DIESEL|TR|GLOBAL|GLOBAL", cacheProducer, { ttlMs: 1000, scope: { role: "reference", userId: 0 } }),
  ]);
  must(cacheProducerCalls === 1 && cachedA.dataClass === cachedB.dataClass, "same-key cache coalesces");
  const [cacheA, cacheB] = await Promise.all([
    rememberResponse("external-reference-check|TEST_PROVIDER|FUEL_DIESEL|TR|GLOBAL|GLOBAL", cacheProducer, { ttlMs: 1000, scope: { role: "reference", userId: 1 } }),
    rememberResponse("external-reference-check|TEST_PROVIDER|FUEL_DIESEL|TR|GLOBAL|GLOBAL", cacheProducer, { ttlMs: 1000, scope: { role: "reference", userId: 2 } }),
  ]);
  must(cacheProducerCalls === 3 && cacheA.dataClass === cacheB.dataClass, "different user scopes do not collide");
  clearResponseCache("external-reference-check");

  const epdkFixture = "<S:Envelope><S:Body><genelSorguResponse><return>&lt;Result&gt;&lt;PetrolPiyasasiIllereGoreAkaryakitFiyatlari&gt;&lt;Tarih&gt;2026-08-27 00:00:00.0&lt;/Tarih&gt;&lt;YakitTipi&gt;Motorin&lt;/YakitTipi&gt;&lt;Il&gt;BURSA&lt;/Il&gt;&lt;FirmaMarkasi&gt;Fixture A&lt;/FirmaMarkasi&gt;&lt;Fiyat&gt;55.1234&lt;/Fiyat&gt;&lt;/PetrolPiyasasiIllereGoreAkaryakitFiyatlari&gt;&lt;PetrolPiyasasiIllereGoreAkaryakitFiyatlari&gt;&lt;Tarih&gt;2026-08-27 00:00:00.0&lt;/Tarih&gt;&lt;YakitTipi&gt;Motorin&lt;/YakitTipi&gt;&lt;Il&gt;BURSA&lt;/Il&gt;&lt;FirmaMarkasi&gt;Fixture B&lt;/FirmaMarkasi&gt;&lt;Fiyat&gt;55.5678&lt;/Fiyat&gt;&lt;/PetrolPiyasasiIllereGoreAkaryakitFiyatlari&gt;&lt;/Result&gt;</return></genelSorguResponse></S:Body></S:Envelope>";
  const epdkProvider = createEpdkPetrolProvider({
    endpoint: "https://epdk.test/petrol",
    fetchImpl: async () => ({ ok: true, text: async () => epdkFixture }),
  });
  const epdkReference = await epdkProvider.fetch({ family: "FUEL_DIESEL", regionCode: "16", now: fixedNow });
  must(epdkProvider.key === "EPDK_PETROL" && epdkReference.family === "FUEL_DIESEL", "EPDK fixture provider family contract");
  must(epdkReference.valueMinor === 5535 && epdkReference.sourceMetadata.recordCount === 2, "EPDK fixture parser uses rounded median without fabricated value");
  must(epdkReference.sourceMetadata.provinceCode === "16" && epdkReference.rawPayloadHash.length === 64, "EPDK fixture preserves province and payload identity");
  expectFailure(() => parseEpdkFuelResponse(epdkFixture, { family: "FUEL_LPG", regionCode: "16", now: fixedNow }), "NO_DATA", "fuel type mismatch returns no data");
  expectFailure(() => parseEpdkFuelResponse(epdkFixture.replaceAll("BURSA", "ANKARA"), { family: "FUEL_DIESEL", regionCode: "16", now: fixedNow }), "REGION_MISMATCH", "provider province mismatch is rejected");

  const bursa = resolveRegionScope({ provinceName: "Bursa" });
  const unknownRegion = resolveRegionScope({ provinceName: "Unknown province" });
  must(bursa.regionCode === "16" && bursa.selection === "EXACT_PROVINCE", "region resolver chooses exact known province");
  must(unknownRegion.regionCode === null && unknownRegion.selection === "NO_GEOGRAPHY", "unknown region does not silently fall back to Istanbul");
  const insufficient = buildPlatformObservedReference({ region: bursa, observations: [{ valueMinor: 1000, observedAt: fixedNow }], minSampleCount: 2 });
  must(insufficient.available === false && insufficient.state === "INSUFFICIENT_SAMPLE", "platform reference hides below-threshold sample");
  const sufficient = buildPlatformObservedReference({ region: bursa, observations: [1000, 1100, 1200, 1300, 1400, 9000].map((valueMinor) => ({ valueMinor, observedAt: fixedNow })), minSampleCount: 5 });
  must(sufficient.available === true && sufficient.valueMinor === 1250 && sufficient.range.minMinor === 1100 && sufficient.range.maxMinor === 1400, "platform reference uses robust median and quantile range");
  const externalLayer = { marketReference: { valueMinor: 646, valueDecimal: "6.46", unit: "CURRENCY_PER_L", currencyCode: "TRY", freshness: "FRESH", confidence: "HIGH", regionCode: "16" } };
  const actualFirst = resolveThreeReferenceLayers({ external: externalLayer, platform: sufficient, actual: { valueMinor: 2000, unit: "CURRENCY_PER_TRIP" }, region: bursa, family: "FUEL_DIESEL" });
  must(actualFirst.selected.authority === "USER_ACTUAL" && actualFirst.layers.length === 3 && actualFirst.separation.unlabeledMergedValue === false, "user actual wins without merging the other two layers");
  const guidanceConflict = buildPricingGuidance({ operationalCostMinor: 4000, quoteFloorMinor: 5000, observedQuoteBand: { minMinor: 8000, maxMinor: 9000 } });
  must(guidanceConflict.conflict === true && guidanceConflict.automaticOfferAction === false && guidanceConflict.costBased.minMinor === 5000, "quote guidance preserves canonical floor and exposes conflict");

  must(!layersText.includes("Istanbul") || layersText.includes("ISTANBUL"), "region resolver does not encode a silent Istanbul fallback");
  must(!layersText.includes("sendOffer") && !layersText.includes("acceptOffer"), "reference layers cannot send or accept offers");

  must(!serviceText.includes("prisma.companyBudgetPlan.update") && !serviceText.includes("prisma.roomQuoteFloorDraft.update"), "#1 actual financial owners are not rewritten");
  must(!routerText.includes("/api/payments") && !routerText.includes("offer/accept"), "reference route does not open payment or offer execution");
  console.log("=== #2 EXTERNAL COST DATA PROVIDER / FRESHNESS CHECK PASS ===");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
