import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRoomQuoteFloorDraftPreviewInputs,
  buildRoomQuoteFloorDraftScopeHash,
  removeStaleRoomQuoteFloorDraftInputs,
  resolveRoomQuoteFloorDraftScope,
  scopeRoomQuoteFloorDraftOverview,
} from "../services/financialOperationsLifecycle.js";

const agreementOnlyDraft = {
  id: 12,
  roomId: 1,
  quoteFloorMinor: 1250000,
  inputSnapshot: {
    serviceContext: {
      roomId: 1,
      agreementId: 207,
      sourceShiftId: 356,
      periodStart: "2026-11-03",
      periodEnd: "2026-11-09",
      scopeHash: buildRoomQuoteFloorDraftScopeHash({
        roomId: 1,
        agreementId: 207,
        sourceShiftId: 356,
        periodStart: "2026-11-03",
        periodEnd: "2026-11-09",
        agreementUpdatedAt: "2026-10-28T12:00:00.000Z",
        sourceShiftUpdatedAt: "2026-10-28T11:00:00.000Z",
      }),
    },
  },
};

const companyDraft = {
  id: 7,
  roomId: 1,
  manualBaselineOperationalCostMinor: 2390000,
  quoteFloorMinor: 2987500,
  baselineSource: "SEFERPAKT_DEMO_2026_CANONICAL_V1:COST_BASELINE_FULL",
  inputSnapshot: {
    shiftId: 257,
    agreementId: 195,
    serviceKey: "SEPTEMBER_COMPLETED",
  },
};

test("a quote-floor draft is rejected when its saved service snapshot is stale", () => {
  const result = resolveRoomQuoteFloorDraftScope(companyDraft, {
    agreementId: 198,
    shiftId: 276,
  });

  assert.equal(result.compatible, false);
  assert.equal(result.reason, "DRAFT_SERVICE_CONTEXT_MISMATCH");
  assert.equal(result.draft, null);
  assert.equal(result.inputs.manualBaselineOperationalCostMinor, undefined);
});

test("a quote-floor draft remains available for the service it was saved from", () => {
  const result = resolveRoomQuoteFloorDraftScope(companyDraft, {
    agreementId: 195,
    shiftId: 257,
  });

  assert.equal(result.compatible, true);
  assert.equal(result.reason, "DRAFT_SERVICE_CONTEXT_MATCH");
  assert.equal(result.draft.id, 7);
  assert.equal(result.inputs.manualBaselineOperationalCostMinor, 2390000);
});

test("an unfocused financial view cannot inherit a service-bound quote-floor draft", () => {
  const result = resolveRoomQuoteFloorDraftScope(companyDraft, {});

  assert.equal(result.compatible, false);
  assert.equal(result.reason, "DRAFT_SERVICE_CONTEXT_REQUIRED");
  assert.equal(result.draft, null);
  assert.equal(result.inputs.manualBaselineOperationalCostMinor, undefined);
});

test("a focused service cannot inherit an unscoped legacy draft", () => {
  const result = resolveRoomQuoteFloorDraftScope({
    ...companyDraft,
    inputSnapshot: { targetContributionBps: 2000 },
  }, {
    agreementId: 198,
    shiftId: 276,
  });

  assert.equal(result.compatible, false);
  assert.equal(result.reason, "DRAFT_SERVICE_CONTEXT_UNKNOWN");
  assert.equal(result.draft, null);
});

test("a saved service context in the audit snapshot scopes the draft after refresh", () => {
  const result = resolveRoomQuoteFloorDraftScope({
    ...companyDraft,
    inputSnapshot: {
      serviceContext: {
        shiftId: 301,
        agreementId: 196,
        vehicleId: 1,
      },
    },
  }, {
    agreementId: 196,
    shiftId: 301,
    vehicleId: 1,
  });

  assert.equal(result.compatible, true);
  assert.equal(result.reason, "DRAFT_SERVICE_CONTEXT_MATCH");
  assert.equal(result.context.shiftId, 301);
});

test("a compatible saved draft restores only its planning inputs after refresh", () => {
  const inputs = buildRoomQuoteFloorDraftPreviewInputs({
    targetContributionBps: 2000,
    inputSnapshot: {
      computed: {
        planningInputs: {
          driverBasePerShiftMinor: "120000",
          fixedVehicleCostMonthlyMinor: "3000000",
          allocationServiceDaysPerMonth: "25",
        },
      },
    },
  });

  assert.equal(inputs.driverBasePerShiftMinor, "120000");
  assert.equal(inputs.fixedVehicleCostMonthlyMinor, "3000000");
  assert.equal(inputs.allocationServiceDaysPerMonth, "25");
});

test("a saved draft restores its computed baseline when the editable field is empty", () => {
  const inputs = buildRoomQuoteFloorDraftPreviewInputs({
    manualBaselineOperationalCostMinor: null,
    inputSnapshot: {
      computed: {
        baselineOperationalCostMinor: 5741,
        planningInputs: { fuelType: "DIESEL" },
      },
    },
  });

  assert.equal(inputs.manualBaselineOperationalCostMinor, 5741);
});

test("an agreement-only draft remains available before operational shifts exist", () => {
  const result = resolveRoomQuoteFloorDraftScope(agreementOnlyDraft, {
    agreementId: 207,
  });

  assert.equal(result.compatible, true);
  assert.equal(result.reason, "DRAFT_SERVICE_CONTEXT_MATCH");
  assert.equal(result.context.agreementId, 207);
  assert.equal(result.context.shiftId, null);
  assert.equal(result.context.sourceShiftId, 356);
});

test("scope hash changes when the server-owned agreement context changes", () => {
  const base = {
    roomId: 1,
    agreementId: 207,
    sourceShiftId: 356,
    periodStart: "2026-11-03",
    periodEnd: "2026-11-09",
    agreementUpdatedAt: "2026-10-28T12:00:00.000Z",
    sourceShiftUpdatedAt: "2026-10-28T11:00:00.000Z",
  };

  assert.notEqual(
    buildRoomQuoteFloorDraftScopeHash(base),
    buildRoomQuoteFloorDraftScopeHash({ ...base, periodEnd: "2026-11-10" }),
  );
});

test("stale draft identity and baseline inputs are removed before a focused preview", () => {
  const scope = resolveRoomQuoteFloorDraftScope(companyDraft, {
    agreementId: 198,
    shiftId: 276,
  });
  const query = removeStaleRoomQuoteFloorDraftInputs({
    roomQuoteFloorDraftId: "7",
    roomQuoteFloorDraftVersion: "1",
    manualBaselineOperationalCostMinor: "2390000",
    quoteFloorMinor: "2987500",
    quoteFloorPerPassengerMinor: "149375",
    baselineSource: "SEFERPAKT_DEMO_2026_CANONICAL_V1:COST_BASELINE_FULL",
    targetContributionBps: "2000",
  }, scope);

  assert.deepEqual(query, { targetContributionBps: "2000" });
});

test("focused overview exposes only drafts compatible with the selected service", () => {
  const overview = {
    current: companyDraft,
    draft: companyDraft,
    applied: null,
    items: [companyDraft],
  };

  const scoped = scopeRoomQuoteFloorDraftOverview(overview, {
    agreementId: 198,
    shiftId: 276,
  });

  assert.equal(scoped.current, null);
  assert.equal(scoped.draft, null);
  assert.deepEqual(scoped.items, []);
});
