import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTROLLED_DEMO_PLATFORM_REFERENCE_MARKER,
  CONTROLLED_DEMO_PLATFORM_REFERENCE_CONSUMER_MARKER,
  CONTROLLED_DEMO_PLATFORM_REFERENCE_POLICY,
  buildControlledDemoPlatformObservation,
  isControlledDemoRoom,
  isControlledDemoConsumerRoom,
  isControlledDemoCompany,
} from "./platformAgreementReferenceData.js";
import { evaluatePlatformAgreementReferenceGate } from "./platformAgreementPriceReference.js";

function fixtureRoom(id = 1) {
  return {
    id,
    status: "ACTIVE",
    notes: `${CONTROLLED_DEMO_PLATFORM_REFERENCE_MARKER}:ROOM_${id}`,
    region: { name: "İstanbul" },
  };
}

function fixtureAgreement(amountMinor = 11_000_000) {
  return {
    id: 9001,
    roomId: 1,
    status: "ACTIVE",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    weekMask: 31,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    companyOfferAmount: amountMinor + 500_000,
    roomOfferAmount: amountMinor,
    vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
    shifts: Array.from({ length: 22 }, (_, index) => ({
      id: index + 1,
      status: "ACTIVE",
      startAt: `2026-10-${String(index + 1).padStart(2, "0")}T06:00:00.000Z`,
      routeSnapshotDistanceM: 40_000,
      routeSnapshotInputHash: "same-route-hash",
    })),
  };
}

test("işaretli DEMO oda üretim ortamında etkinleşmez", () => {
  assert.equal(isControlledDemoRoom(fixtureRoom(), { nodeEnv: "development" }), true);
  assert.equal(isControlledDemoRoom(fixtureRoom(), { nodeEnv: "production" }), false);
  assert.equal(isControlledDemoRoom({ ...fixtureRoom(), notes: "normal" }), false);
});

test("kontrollü DEMO tüketicisi kaynak ROOM örneklemine eklenmeden referansı okuyabilir", () => {
  const consumerRoom = {
    id: 1,
    status: "ACTIVE",
    notes: `${CONTROLLED_DEMO_PLATFORM_REFERENCE_CONSUMER_MARKER}:ROOM_1_NORMAL_ACCOUNT`,
  };

  assert.equal(isControlledDemoConsumerRoom(consumerRoom, { nodeEnv: "development" }), true);
  assert.equal(isControlledDemoConsumerRoom(consumerRoom, { nodeEnv: "production" }), false);
  assert.equal(isControlledDemoConsumerRoom(fixtureRoom(), { nodeEnv: "development" }), false);
  assert.equal(isControlledDemoRoom(consumerRoom, { nodeEnv: "development" }), false);
});

test("aktif DEMO COMPANY kontrollü referansı üretimde açmadan okuyabilir", () => {
  const company = { id: 1, kind: "COMPANY", status: "ACTIVE" };

  assert.equal(isControlledDemoCompany(company, { nodeEnv: "development" }), true);
  assert.equal(isControlledDemoCompany(company, { nodeEnv: "production" }), false);
  assert.equal(isControlledDemoCompany({ ...company, kind: "SCHOOL" }, { nodeEnv: "development" }), false);
  assert.equal(isControlledDemoCompany({ ...company, status: "ARCHIVED" }, { nodeEnv: "development" }), false);
});

test("DEMO gözlemi yalnız canonical kabul audit fiyatını ve gerçek rota boyutlarını taşır", () => {
  const observation = buildControlledDemoPlatformObservation({
    room: fixtureRoom(),
    agreement: fixtureAgreement(11_000_000),
    auditLogs: [{
      id: 7001,
      entityId: 9001,
      action: "COMPANY_AGREEMENT_DECISION",
      meta: { decision: "ACCEPT", roomOfferAmountMinor: 11_000_000 },
      createdAt: "2026-10-01T10:00:00.000Z",
    }],
  });

  assert.equal(observation.isDemo, true);
  assert.equal(observation.isTest, false);
  assert.equal(observation.commercialReference.amountMinor, 11_000_000);
  assert.equal(observation.commercialReference.source, "COMPANY_ACCEPT_AUDIT");
  assert.equal(observation.dimensions.vehicleType, "MINIBUS");
  assert.equal(observation.dimensions.vehicleCapacity, 27);
  assert.equal(observation.dimensions.routeKey, "same-route-hash");
  assert.equal(observation.dimensions.totalDistanceKm, 40);
  assert.equal(observation.dimensions.dailyMovementCount, 1);
  assert.equal(observation.dimensions.serviceDayCount, 22);
  assert.equal(observation.dimensions.serviceType, "INBOUND:ONE_WAY");
  assert.equal(observation.dimensions.agreementMonth, "2026-10");
  assert.equal(Object.hasOwn(observation, "roomId"), false);
});

test("canonical kabul audit yoksa DEMO gözlemi platform gate'ine hazır görünmez", () => {
  const observation = buildControlledDemoPlatformObservation({
    room: fixtureRoom(),
    agreement: fixtureAgreement(11_000_000),
    auditLogs: [],
  });

  const result = evaluatePlatformAgreementReferenceGate({
    policy: { ...CONTROLLED_DEMO_PLATFORM_REFERENCE_POLICY, minComparableSampleCount: 1, minDistinctRoomCount: 1 },
    observations: [observation],
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.match(result.missing.join(" "), /audit/i);
});
