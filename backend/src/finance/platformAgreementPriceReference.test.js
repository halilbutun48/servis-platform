import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePlatformAgreementReferenceGate } from "./platformAgreementPriceReference.js";

const comparableDimensions = {
  vehicleType: "MINIBUS",
  vehicleCapacity: 27,
  routeKey: "route-a",
  totalDistanceKm: 40,
  dailyMovementCount: 2,
  serviceDayCount: 22,
  serviceType: "PERSONNEL",
  agreementMonth: "2026-09",
};

function observation(id, amountMinor, extra = {}) {
  return {
    amountMinor,
    isDemo: false,
    roomHash: `room-${id}`,
    commercialReference: { status: "READY", amountMinor, currencyCode: "TRY", source: "COMPANY_ACCEPT_AUDIT" },
    dimensions: comparableDimensions,
    ...extra,
  };
}

const approvedFixturePolicy = Object.freeze({
  enabled: true,
  excludeDemoData: true,
  minComparableSampleCount: 3,
  minDistinctRoomCount: 3,
  privacySafe: true,
  competitionApproved: true,
  reidentificationRisk: "LOW",
});

const controlledDemoFixturePolicy = Object.freeze({
  ...approvedFixturePolicy,
  datasetMode: "CONTROLLED_DEMO",
  demoOnly: true,
  policyAuthority: "USER_APPROVED_BOUNDED_DEMO_ACCEPTANCE_20261030",
});

test("platform tarihsel referansı açık uygunluk politikası yokken kapalıdır", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    observations: [observation(1, 10_000), observation(2, 11_000), observation(3, 12_000)],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.match(result.missing.join(" "), /politika/i);
});

test("politika koşullarından biri eksikse gate fail-closed kalır", () => {
  const cases = [
    ["minComparableSampleCount", 0, /örneklem/i],
    ["minDistinctRoomCount", 0, /farklı ROOM/i],
    ["excludeDemoData", false, /DEMO\/test/i],
    ["privacySafe", false, /anonim/i],
    ["competitionApproved", false, /rekabet/i],
    ["reidentificationRisk", "HIGH", /yeniden kimliklendirme/i],
  ];

  for (const [field, value, expectedMissing] of cases) {
    const result = evaluatePlatformAgreementReferenceGate({
      policy: { ...approvedFixturePolicy, [field]: value },
      observations: [observation(1, 10_000), observation(2, 11_000), observation(3, 12_000)],
    });

    assert.equal(result.status, "NOT_PROVEN", field);
    assert.equal(result.value, null, field);
    assert.match(result.missing.join(" "), expectedMissing, field);
  }
});

test("DEMO gözlemi veya boyut eksikliği ortalama yayınlamaz", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: approvedFixturePolicy,
    observations: [
      observation(1, 10_000),
      observation(2, 11_000),
      observation(3, 12_000),
      observation(4, 13_000, { isDemo: true }),
    ],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.match(result.missing.join(" "), /DEMO|karşılaştırma boyutları/i);
});

test("DEMO ve test gözlemleri toplulaştırılmış referansa alınmaz", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: approvedFixturePolicy,
    observations: [
      observation(1, 10_000),
      observation(2, 11_000),
      observation(3, 12_000),
      observation(4, 13_000, { isTest: true }),
    ],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.equal(result.excludedCounts.demoOrTest, 1);
  assert.match(result.missing.join(" "), /DEMO\/test/i);
});

test("minimum karşılaştırılabilir örneklem sağlanmazsa referans yayınlanmaz", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: approvedFixturePolicy,
    observations: [observation(1, 10_000), observation(2, 11_000)],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.equal(result.sampleCount, 2);
  assert.match(result.missing.join(" "), /yeterli karşılaştırılabilir örneklem/i);
});

test("tam karşılaştırma boyutları yoksa referans yayınlanmaz", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: { ...approvedFixturePolicy, minComparableSampleCount: 1, minDistinctRoomCount: 1 },
    observations: [observation(1, 10_000, {
      dimensions: { ...comparableDimensions, totalDistanceKm: null },
    })],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.match(result.missing.join(" "), /karşılaştırılabilir|boyut/i);
});

test("farklı karşılaştırma boyutları tek bir platform referansında birleştirilmez", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: approvedFixturePolicy,
    observations: [
      observation(1, 10_000),
      observation(2, 11_000, { dimensions: { ...comparableDimensions, routeKey: "route-b" } }),
      observation(3, 12_000),
    ],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.match(result.missing.join(" "), /karşılaştırma boyutları/i);
});

test("minimum farklı ROOM eşiği sağlanmazsa referans yayınlanmaz", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: { ...approvedFixturePolicy, minDistinctRoomCount: 2 },
    observations: [
      observation(1, 10_000, { roomHash: "same-room" }),
      observation(2, 11_000, { roomHash: "same-room" }),
      observation(3, 12_000, { roomHash: "same-room" }),
    ],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.equal(result.sampleCount, 3);
  assert.equal(result.distinctRoomCount, 1);
  assert.match(result.missing.join(" "), /farklı ROOM/i);
});

test("yeterli ve uygun politika açıkça sağlanırsa yalnız toplulaştırılmış değer döner", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: approvedFixturePolicy,
    observations: [observation(1, 10_000), observation(2, 11_000), observation(3, 12_000)],
  });

  assert.equal(result.status, "READY");
  assert.equal(result.value.medianAmountMinor, 11_000);
  assert.equal(result.value.sampleCount, 3);
  assert.equal(result.value.distinctRoomCount, 3);
  assert.equal(Object.hasOwn(result.value, "roomHashes"), false);
  assert.equal(Object.hasOwn(result.value, "roomIds"), false);
  assert.equal(Object.hasOwn(result.value, "agreementIds"), false);
});

test("kabul kanıtı hazır olmayan gözlem platform ortalamasına giremez", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: { ...approvedFixturePolicy, minComparableSampleCount: 1, minDistinctRoomCount: 1 },
    observations: [observation(1, 10_000, {
      commercialReference: { status: "NOT_PROVEN", currencyCode: null },
    })],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.match(result.missing.join(" "), /kabul|ticari/i);
});

test("platform referansı yalnız canonical kabul fiyatını toplulaştırır", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: { ...approvedFixturePolicy, minComparableSampleCount: 2, minDistinctRoomCount: 2 },
    observations: [
      observation(1, 999_000, { commercialReference: { status: "READY", amountMinor: 10_000, currencyCode: "TRY" } }),
      observation(2, 888_000, { commercialReference: { status: "READY", amountMinor: 12_000, currencyCode: "TRY" } }),
    ],
  });

  assert.equal(result.status, "READY");
  assert.equal(result.value.medianAmountMinor, 11_000);
});

test("yalnız işaretli kontrollü DEMO protokolü ortalama ve aralık yayımlar", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: controlledDemoFixturePolicy,
    observations: [
      observation(1, 10_000, { isDemo: true }),
      observation(2, 11_000, { isDemo: true }),
      observation(3, 12_000, { isDemo: true }),
    ],
  });

  assert.equal(result.status, "READY");
  assert.equal(result.value.averageAmountMinor, 11_000);
  assert.equal(result.value.medianAmountMinor, 11_000);
  assert.deepEqual(result.value.range, { minMinor: 10_000, maxMinor: 12_000 });
  assert.equal(result.value.controlledDemoOnly, true);
});

test("kontrollü DEMO gate'i gerçek ve DEMO gözlemlerini karıştırmaz", () => {
  const result = evaluatePlatformAgreementReferenceGate({
    policy: controlledDemoFixturePolicy,
    observations: [
      observation(1, 10_000, { isDemo: true }),
      observation(2, 11_000, { isDemo: true }),
      observation(3, 12_000, { isDemo: false }),
    ],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.value, null);
  assert.match(result.missing.join(" "), /kontrollü DEMO|DEMO/i);
});
