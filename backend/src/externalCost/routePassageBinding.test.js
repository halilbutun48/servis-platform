import assert from "node:assert/strict";
import test from "node:test";
import {
  bindPassageRequestsToRoute,
  buildCanonicalRoutePassageContext,
  resolveCanonicalPassageEvidence,
  resolvePerVehiclePassageEvidence,
} from "./routePassageBinding.js";
import { computeRouteKey } from "../services/routeLearning.js";

const shift = {
  id: 42,
  startAt: new Date("2026-10-31T05:00:00.000Z"),
  direction: "OUTBOUND",
  pattern: "ONE_WAY",
  hubLat: 40.1,
  hubLng: 29.1,
  stops: [{ order: 1, lat: 40.2, lng: 29.2 }],
  routeSnapshotPolyline: "encoded-osrm-polyline",
  routeSnapshotDistanceM: 103350,
  routeSnapshotDurationSec: 3720,
  routeSnapshotValidatedAt: new Date("2026-10-30T12:00:00.000Z"),
};

shift.routeSnapshotInputHash = computeRouteKey({
  direction: shift.direction,
  pattern: shift.pattern,
  hub: { lat: shift.hubLat, lng: shift.hubLng },
  stops: shift.stops,
});

const routeContext = buildCanonicalRoutePassageContext({
  shift,
  routeId: "route_demo_42",
});

const basePassage = {
  providerKey: "KGM_TOLL",
  family: "TOLL",
  routeId: "route_demo_42",
  routeSnapshotInputHash: shift.routeSnapshotInputHash,
  segmentId: "segment_demo_1",
  paidSegment: "KGM-05-ANADOLU",
  entryStation: "GEBZE",
  exitStation: "AKYAZI",
  direction: "OUTBOUND",
  hgsClass: 2,
  serviceDate: "2026-10-31",
  tariffDate: "2026-01-01",
  currencyCode: "TRY",
};

test("typed passage request binds only to the selected canonical route snapshot", () => {
  const result = bindPassageRequestsToRoute({
    routeContext,
    requests: [basePassage],
  });

  assert.equal(result.status, "PROVEN_ROUTE_CONTEXT");
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].hgsClass, 2);
  assert.equal(result.requests[0].routeSnapshotInputHash, shift.routeSnapshotInputHash);
  assert.deepEqual(result.missingReasons, []);
});

test("missing route snapshot is fail-closed even when the passage fields look valid", () => {
  const result = bindPassageRequestsToRoute({
    routeContext: buildCanonicalRoutePassageContext({
      shift: { ...shift, routeSnapshotPolyline: null, routeSnapshotDistanceM: null },
      routeId: "route_demo_42",
    }),
    requests: [basePassage],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.deepEqual(result.requests, []);
  assert.match(result.missingReasons.join(" "), /route snapshot/i);
});

test("route snapshot hash must match the current canonical hub and stop metadata", () => {
  const routeShift = {
    ...shift,
    hubLat: 40.1,
    hubLng: 29.1,
    pattern: "ONE_WAY",
    stops: [{ order: 1, lat: 40.2, lng: 29.2 }],
    routeSnapshotInputHash: "stale-route-input-hash",
  };
  const expectedHash = computeRouteKey({
    direction: routeShift.direction,
    pattern: routeShift.pattern,
    hub: { lat: routeShift.hubLat, lng: routeShift.hubLng },
    stops: routeShift.stops,
  });
  assert.notEqual(expectedHash, routeShift.routeSnapshotInputHash);

  const result = bindPassageRequestsToRoute({
    routeContext: buildCanonicalRoutePassageContext({ shift: routeShift, routeId: "route_demo_42" }),
    requests: [{ ...basePassage, routeSnapshotInputHash: routeShift.routeSnapshotInputHash }],
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.match(result.missingReasons.join(" "), /current route metadata|snapshot input hash/i);
});

test("route identity and snapshot hash mismatches never pass to a provider", () => {
  for (const [field, value, pattern] of [
    ["routeId", "route_other", /route identity/i],
    ["routeSnapshotInputHash", "route-input-other", /snapshot input hash/i],
  ]) {
    const result = bindPassageRequestsToRoute({
      routeContext,
      requests: [{ ...basePassage, [field]: value }],
    });
    assert.equal(result.status, "NOT_PROVEN");
    assert.deepEqual(result.requests, []);
    assert.match(result.missingReasons.join(" "), pattern);
  }
});

test("service date and direction must match the selected shift", () => {
  for (const [field, value, pattern] of [
    ["serviceDate", "2026-11-01", /service date/i],
    ["direction", "INBOUND", /direction/i],
  ]) {
    const result = bindPassageRequestsToRoute({
      routeContext,
      requests: [{ ...basePassage, [field]: value }],
    });
    assert.equal(result.status, "NOT_PROVEN");
    assert.deepEqual(result.requests, []);
    assert.match(result.missingReasons.join(" "), pattern);
  }
});

test("HGS class cannot be inferred from vehicle metadata", () => {
  assert.throws(
    () => bindPassageRequestsToRoute({
      routeContext,
      requests: [{ ...basePassage, hgsClass: undefined, vehicleType: "MINIBUS" }],
    }),
    (error) => error.code === "INVALID_PASSAGE_CONTEXT",
  );
});

test("missing explicit gate or paid-segment fields remain invalid", () => {
  for (const field of ["paidSegment", "entryStation", "exitStation"]) {
    assert.throws(
      () => bindPassageRequestsToRoute({ routeContext, requests: [{ ...basePassage, [field]: "" }] }),
      (error) => error.code === "INVALID_PASSAGE_CONTEXT",
    );
  }
});

test("canonical evidence resolves a verified fee once after route binding", async () => {
  let referenceCalls = 0;
  const result = await resolveCanonicalPassageEvidence({
    routeContext,
    requests: [basePassage],
    getReference: async (request) => {
      referenceCalls += 1;
      return {
        marketReference: {
          valueMinor: 12000,
          currencyCode: "TRY",
          sourceMetadata: {
            routeId: request.routeId,
            routeSnapshotInputHash: request.routeSnapshotInputHash,
            segmentId: request.segmentId,
            paidSegment: request.paidSegment,
            entryStation: request.entryStation,
            exitStation: request.exitStation,
            direction: request.direction,
            hgsClass: request.hgsClass,
            serviceDate: request.serviceDate,
            tariffRequestedDate: request.tariffDate,
            tariffEffectiveDateStatus: "VERIFIED",
            passageContextStatus: "OFFICIAL_VERIFIED",
          },
        },
      };
    },
  });

  assert.equal(referenceCalls, 1);
  assert.equal(result.status, "PROVEN");
  assert.equal(result.totalMinor, 12000);
  assert.equal(result.passageBasis, "PLANNED_ROUTE_TARIFF");
  assert.equal(result.actualHgsEventStatus, "SEPARATE_RECORD_REQUIRED");
  assert.equal(result.routeBinding.status, "PROVEN_ROUTE_CONTEXT");
});

test("unbound passage evidence never calls the provider", async () => {
  let referenceCalls = 0;
  const result = await resolveCanonicalPassageEvidence({
    routeContext: buildCanonicalRoutePassageContext({
      shift: { ...shift, routeSnapshotPolyline: null },
      routeId: "route_demo_42",
    }),
    requests: [basePassage],
    getReference: async () => {
      referenceCalls += 1;
      return { marketReference: { valueMinor: 12000 } };
    },
  });

  assert.equal(referenceCalls, 0);
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.totalMinor, null);
  assert.equal(result.passageBasis, "PLANNED_ROUTE_TARIFF");
  assert.equal(result.actualHgsEventStatus, "SEPARATE_RECORD_REQUIRED");
  assert.match(result.missingReasons.join(" "), /route snapshot/i);
});

test("per-vehicle passage evidence aggregates only each vehicle's own proven route fee", async () => {
  const secondShift = {
    ...shift,
    id: 43,
    stops: [{ order: 1, lat: 40.25, lng: 29.25 }],
  };
  secondShift.routeSnapshotInputHash = computeRouteKey({
    direction: secondShift.direction,
    pattern: secondShift.pattern,
    hub: { lat: secondShift.hubLat, lng: secondShift.hubLng },
    stops: secondShift.stops,
  });
  const secondRouteContext = buildCanonicalRoutePassageContext({
    shift: secondShift,
    routeId: "route_demo_43",
  });
  const secondPassage = {
    ...basePassage,
    routeId: "route_demo_43",
    routeSnapshotInputHash: secondShift.routeSnapshotInputHash,
    segmentId: "segment_demo_2",
  };

  const result = await resolvePerVehiclePassageEvidence({
    vehicleRoutes: [
      { vehicleIndex: 0, routeContext },
      { vehicleIndex: 1, routeContext: secondRouteContext },
    ],
    requestsByVehicle: {
      0: [basePassage],
      1: [secondPassage],
    },
    getReference: async (request) => ({
      marketReference: {
        valueMinor: request.routeId === "route_demo_42" ? 12000 : 18000,
        currencyCode: "TRY",
        sourceMetadata: {
          routeId: request.routeId,
          routeSnapshotInputHash: request.routeSnapshotInputHash,
          segmentId: request.segmentId,
          paidSegment: request.paidSegment,
          entryStation: request.entryStation,
          exitStation: request.exitStation,
          direction: request.direction,
          hgsClass: request.hgsClass,
          serviceDate: request.serviceDate,
          tariffRequestedDate: request.tariffDate,
          tariffEffectiveDateStatus: "VERIFIED",
          passageContextStatus: "OFFICIAL_VERIFIED",
        },
      },
    }),
  });

  assert.equal(result.status, "PROVEN");
  assert.equal(result.totalMinor, 30000);
  assert.deepEqual(result.vehicleTotalsMinor, [12000, 18000]);
  assert.deepEqual(result.vehicles.map((item) => item.status), ["PROVEN", "PROVEN"]);
});

test("one missing vehicle tariff keeps the multi-vehicle total fail-closed", async () => {
  const result = await resolvePerVehiclePassageEvidence({
    vehicleRoutes: [
      { vehicleIndex: 0, routeContext },
      { vehicleIndex: 1, routeContext: { ...routeContext, routeId: "route_demo_43" } },
    ],
    requestsByVehicle: {
      0: [basePassage],
      1: [{ ...basePassage, routeId: "route_demo_43", segmentId: "segment_demo_2" }],
    },
    getReference: async (request) => request.routeId === "route_demo_42"
      ? {
        marketReference: {
          valueMinor: 12000,
          currencyCode: "TRY",
          sourceMetadata: {
            routeId: request.routeId,
            routeSnapshotInputHash: request.routeSnapshotInputHash,
            segmentId: request.segmentId,
            paidSegment: request.paidSegment,
            entryStation: request.entryStation,
            exitStation: request.exitStation,
            direction: request.direction,
            hgsClass: request.hgsClass,
            serviceDate: request.serviceDate,
            tariffRequestedDate: request.tariffDate,
            tariffEffectiveDateStatus: "VERIFIED",
            passageContextStatus: "OFFICIAL_VERIFIED",
          },
        },
      }
      : { marketReference: { valueMinor: 18000, currencyCode: "TRY", sourceMetadata: {} } },
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.totalMinor, null);
  assert.deepEqual(result.vehicleTotalsMinor, [12000, null]);
  assert.match(result.missingReasons.join(" "), /rota\/kesim bağlamı|tarife geçerliliği|resmi kaynak/i);
});
