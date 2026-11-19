import assert from "node:assert/strict";
import test from "node:test";
import { buildRoomQuoteContextFocus, buildRoomQuotePreviewParams, buildRoomQuoteRequestContext } from "./roomQuoteRequestContext.js";

test("#204 request context preserves the real request and refuses a cost preview", () => {
  const context = buildRoomQuoteRequestContext({
    agreement: {
      id: 204,
      company: { name: "DemoOkul" },
      status: "REQUESTED",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      companyOfferAmount: 1000000,
      roomOfferAmount: null,
      hubLat: null,
      hubLng: null,
      vehicleId: null,
      driverId: null,
    },
  });

  assert.equal(context.customerLabel, "DemoOkul");
  assert.equal(context.hasQuote, true);
  assert.equal(context.canPreviewCost, false);
  assert.deepEqual(context.missing.map((item) => item.key), ["route", "vehicle", "driver", "service"]);
  assert.equal(context.hasAuthorizedCompletionPath, true);
});

test("a linked service with vehicle, driver and route is preview-ready", () => {
  const context = buildRoomQuoteRequestContext({
    agreement: {
      id: 195,
      company: { name: "DemoCompany" },
      status: "APPROVED",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      hubLat: 41.1,
      hubLng: 29.0,
      vehicleId: 1,
      driverId: 1,
    },
    shift: {
      id: 257,
      vehicleId: 1,
      driverId: 1,
      stops: [{ id: 1 }],
    },
  });

  assert.equal(context.canPreviewCost, true);
  assert.deepEqual(context.missing, []);
});

test("a market request with an authorized ROOM offer is planning-ready without a contract", () => {
  const context = buildRoomQuoteRequestContext({
    agreement: null,
    shift: {
      id: 412,
      status: "REQUESTED",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-10-01T00:00:00.000Z",
      company: { name: "DemoCompany" },
      routeSnapshotDistanceM: 5829,
      routeSnapshotDurationSec: 638,
      requiredPaxOverride: 35,
      roomOfferAmount: 3500000,
      offers: [{ id: 272, roomId: 21, status: "COUNTERED" }],
    },
  });

  assert.equal(context.contractless, true);
  assert.equal(context.agreementId, null);
  assert.equal(context.shiftId, 412);
  assert.equal(context.customerLabel, "DemoCompany");
  assert.equal(context.periodLabel, "2026-09-01 – 2026-10-01");
  assert.equal(context.canPreviewCost, true);
  assert.deepEqual(context.missing, []);
});

test("a market request without a validated route stays blocked", () => {
  const context = buildRoomQuoteRequestContext({
    agreement: null,
    shift: { id: 413, status: "REQUESTED", startAt: "2026-09-01T00:00:00.000Z", endAt: "2026-10-01T00:00:00.000Z", offers: [{ id: 273, roomId: 21, status: "COUNTERED" }] },
  });

  assert.equal(context.contractless, true);
  assert.equal(context.canPreviewCost, false);
  assert.deepEqual(context.missing.map((item) => item.key), ["route"]);
});

test("an unlinked shift without an active ROOM offer is not treated as a market request", () => {
  assert.equal(buildRoomQuoteRequestContext({
    agreement: null,
    shift: { id: 414, status: "REQUESTED", routeSnapshotDistanceM: 1000, routeSnapshotDurationSec: 60, offers: [] },
  }), null);
});

test("preview params carry only the authorized agreement and optional linked shift", () => {
  assert.deepEqual(buildRoomQuotePreviewParams({ id: 204, startDate: "2026-11-01" }), {
    view: "quote-profitability",
    focusAgreementId: 204,
    period: "2026-11",
    contextSource: "customer-request",
  });
  assert.equal(buildRoomQuotePreviewParams(null).view, undefined);
  assert.equal(buildRoomQuotePreviewParams({ id: 195, startDate: "2026-09-01" }, { shiftId: 257 }).focusShiftId, 257);
});

test("accepted agreement quote preview stays on the agreement draft scope", () => {
  const params = buildRoomQuotePreviewParams(
    { id: 207, status: "APPROVED", startDate: "2026-11-03" },
    { shiftId: 357 },
  );

  assert.equal(params.focusAgreementId, 207);
  assert.equal(Object.prototype.hasOwnProperty.call(params, "focusShiftId"), false);
});

test("quote context carries the selected agreement period into the financial decision request", () => {
  assert.deepEqual(buildRoomQuoteContextFocus({
    agreement: { id: 196, startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-31T23:59:59.000Z" },
    shift: { id: 305, vehicleId: 1 },
  }), {
    agreementId: 196,
    shiftId: 305,
    vehicleId: 1,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
  });
});

test("an unlinked historical service cannot inherit another agreement's period", () => {
  assert.deepEqual(buildRoomQuoteContextFocus({
    agreement: null,
    shift: {
      id: 261,
      vehicleId: 1,
      startAt: "2026-09-04T04:00:00.000Z",
      endAt: "2026-09-04T06:00:00.000Z",
    },
  }), {
    agreementId: null,
    shiftId: 261,
    vehicleId: 1,
    periodStart: "2026-09-04",
    periodEnd: "2026-09-04",
  });
});
