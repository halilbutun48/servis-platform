import test from "node:test";
import assert from "node:assert/strict";
import { buildPlatformObservedReference } from "./referenceLayers.js";
import { CONTROLLED_DEMO_PLATFORM_REFERENCE_POLICY } from "../finance/platformAgreementReferenceData.js";

const comparableDimensions = {
  vehicleType: "MINIBUS",
  vehicleCapacity: 27,
  routeKey: "istanbul-route-a",
  totalDistanceKm: 40,
  dailyMovementCount: 2,
  serviceDayCount: 22,
  serviceType: "PERSONNEL",
  agreementMonth: "2026-10",
};

const approvedPolicy = Object.freeze({
  enabled: true,
  excludeDemoData: true,
  minComparableSampleCount: 3,
  minDistinctRoomCount: 3,
  privacySafe: true,
  competitionApproved: true,
  reidentificationRisk: "LOW",
});

function observation(roomHash, amountMinor, extra = {}) {
  return {
    amountMinor,
    observedAt: "2026-10-20T12:00:00.000Z",
    roomHash,
    isDemo: false,
    isTest: false,
    commercialReference: { status: "READY", amountMinor, currencyCode: "TRY", source: "COMPANY_ACCEPT_AUDIT" },
    dimensions: comparableDimensions,
    ...extra,
  };
}

const region = {
  scopeType: "CITY",
  scopeKey: "34",
  regionCode: "34",
  regionName: "İstanbul",
};

test("platform katmanı politika yokken aynı ROOM tekliflerinden değer yayınlamaz", () => {
  const result = buildPlatformObservedReference({
    region,
    observations: Array.from({ length: 7 }, () => observation("room-1", 11_000_000)),
  });

  assert.equal(result.available, false);
  assert.equal(result.state, "NOT_PROVEN");
  assert.equal(result.valueMinor, null);
  assert.equal(result.range, null);
});

test("canonical kabul ticari kanıtı yoksa platform değeri yayınlamaz", () => {
  const result = buildPlatformObservedReference({
    region,
    policy: { ...approvedPolicy, minComparableSampleCount: 1, minDistinctRoomCount: 1 },
    observations: [observation("room-1", 11_000_000, {
      commercialReference: { status: "NOT_PROVEN", amountMinor: null, currencyCode: null },
    })],
  });

  assert.equal(result.available, false);
  assert.equal(result.state, "NOT_PROVEN");
  assert.equal(result.valueMinor, null);
});

test("DEMO/test veya karşılaştırma boyutu farkı platform değerini kapalı tutar", () => {
  const demoResult = buildPlatformObservedReference({
    region,
    policy: approvedPolicy,
    observations: [
      observation("room-1", 10_000),
      observation("room-2", 11_000),
      observation("room-3", 12_000),
      observation("room-4", 13_000, { isDemo: true }),
    ],
  });
  const dimensionResult = buildPlatformObservedReference({
    region,
    policy: approvedPolicy,
    observations: [
      observation("room-1", 10_000),
      observation("room-2", 11_000, { dimensions: { ...comparableDimensions, routeKey: "istanbul-route-b" } }),
      observation("room-3", 12_000),
    ],
  });

  assert.equal(demoResult.available, false);
  assert.equal(dimensionResult.available, false);
  assert.equal(demoResult.valueMinor, null);
  assert.equal(dimensionResult.valueMinor, null);
});

test("onaylı politika ve üç bağımsız ROOM ile yalnız toplulaştırılmış medyan yayınlanır", () => {
  const result = buildPlatformObservedReference({
    region,
    policy: approvedPolicy,
    observations: [
      observation("room-1", 10_000),
      observation("room-2", 11_000),
      observation("room-3", 12_000),
    ],
  });

  assert.equal(result.available, true);
  assert.equal(result.state, "AVAILABLE");
  assert.equal(result.valueMinor, 11_000);
  assert.equal(result.sampleCount, 3);
  assert.equal(result.distinctRoomCount, 3);
  assert.equal(result.range, null);
  assert.equal(Object.hasOwn(result, "roomHashes"), false);
  assert.equal(Object.hasOwn(result, "roomIds"), false);
  assert.equal(Object.hasOwn(result, "agreementIds"), false);
});

test("kontrollü DEMO platform katmanı ortalamayı ve fiyat aralığını açıkça etiketler", () => {
  const result = buildPlatformObservedReference({
    region,
    policy: {
      ...CONTROLLED_DEMO_PLATFORM_REFERENCE_POLICY,
      minComparableSampleCount: 3,
      minDistinctRoomCount: 3,
    },
    observations: [
      observation("room-1", 10_000_000, { isDemo: true }),
      observation("room-2", 11_000_000, { isDemo: true }),
      observation("room-3", 12_000_000, { isDemo: true }),
    ],
  });

  assert.equal(result.available, true);
  assert.equal(result.valueMinor, 11_000_000);
  assert.equal(result.averageAmountMinor, 11_000_000);
  assert.deepEqual(result.range, { minMinor: 10_000_000, maxMinor: 12_000_000 });
  assert.equal(result.controlledDemoOnly, true);
  assert.match(result.selectionReason, /DEMO/i);
});
