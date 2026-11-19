import test from "node:test";
import assert from "node:assert/strict";
import {
  COSTED_QUOTE_CONFIRMATION_TOKEN,
  classifyCostedQuoteOffer,
  validateCostedQuoteSendSnapshot,
} from "./roomCostedQuoteSend.js";

const baseInput = () => ({
  agreement: { id: 207, roomId: 1, status: "REQUESTED", startDate: "2026-11-03", endDate: "2026-11-09" },
  draft: {
    id: 10,
    roomId: 1,
    status: "DRAFT",
    version: 4,
    quoteFloorMinor: 2348487,
    inputSnapshot: {
      serviceContext: { roomId: 1, agreementId: 207, scopeHash: "scope-v4" },
      computed: {
        periodPlanning: {
          status: "READY",
          periodCostReady: true,
          comparisonAllowed: true,
          plannedMovementCount: 5,
          periodPlanningCostMinor: 1789322,
          periodQuoteFloorMinor: 2348487,
        },
      },
    },
  },
  currentScopeHash: "scope-v4",
  expectedVersion: 4,
  expectedContextHash: "scope-v4",
  currentPeriodPlanning: {
    status: "READY",
    periodCostReady: true,
    comparisonAllowed: true,
    plannedMovementCount: 5,
    periodPlanningCostMinor: 1789322,
    periodQuoteFloorMinor: 2348487,
  },
  currentPeriodQuoteFloorMinor: 2348487,
  requestedAmountMinor: 1500000,
  confirmed: true,
  confirmationToken: COSTED_QUOTE_CONFIRMATION_TOKEN,
});

test("costed quote classification distinguishes below cost from below recommended floor", () => {
  assert.deepEqual(
    classifyCostedQuoteOffer({ offerAmountMinor: 1500000, periodCostMinor: 1789322, quoteFloorMinor: 2348487 }),
    {
      ready: true,
      classification: "BELOW_ESTIMATED_COST",
      belowEstimatedCost: true,
      belowRecommendedFloor: true,
      differenceToCostMinor: -289322,
      differenceToFloorMinor: -848487,
      warningText: "Bu teklif, hesaplanan tahmini maliyetin altında.",
    },
  );

  assert.equal(
    classifyCostedQuoteOffer({ offerAmountMinor: 2000000, periodCostMinor: 1789322, quoteFloorMinor: 2348487 }).classification,
    "BELOW_RECOMMENDED_FLOOR",
  );
});

test("costed quote send validates current draft, period scope, and explicit confirmation", () => {
  const result = validateCostedQuoteSendSnapshot(baseInput());
  assert.equal(result.ok, true);
  assert.equal(result.plannedMovementCount, 5);
  assert.equal(result.periodPlanningCostMinor, 1789322);
  assert.equal(result.differenceToCostMinor, -289322);
  assert.equal(result.differenceToFloorMinor, -848487);

  assert.equal(
    validateCostedQuoteSendSnapshot({ ...baseInput(), confirmationToken: "" }).code,
    "ROOM_QUOTE_SEND_CONFIRMATION_REQUIRED",
  );
  assert.equal(
    validateCostedQuoteSendSnapshot({ ...baseInput(), expectedVersion: 3 }).code,
    "ROOM_QUOTE_SEND_STALE_DRAFT",
  );
  assert.equal(
    validateCostedQuoteSendSnapshot({ ...baseInput(), currentScopeHash: "scope-old" }).code,
    "ROOM_QUOTE_SEND_STALE_CONTEXT",
  );
  assert.equal(
    validateCostedQuoteSendSnapshot({
      ...baseInput(),
      currentPeriodPlanning: { ...baseInput().currentPeriodPlanning, plannedMovementCount: 90 },
    }).code,
    "ROOM_QUOTE_SEND_SCOPE_CHANGED",
  );
});

test("costed quote send rejects missing period economics instead of treating them as zero", () => {
  const input = baseInput();
  input.currentPeriodPlanning = { ...input.currentPeriodPlanning, periodPlanningCostMinor: null };
  assert.equal(validateCostedQuoteSendSnapshot(input).code, "ROOM_QUOTE_SEND_PERIOD_NOT_READY");
});

test("verified replay may recover an existing matching counter without accepting a new amount", () => {
  const input = baseInput();
  input.agreement = {
    ...input.agreement,
    status: "COUNTERED",
    roomOfferAmount: 1500000,
    roomOfferNote: null,
  };
  assert.equal(validateCostedQuoteSendSnapshot({ ...input, allowAlreadyCountered: true }).ok, true);
  assert.equal(
    validateCostedQuoteSendSnapshot({
      ...input,
      requestedAmountMinor: 1600000,
      allowAlreadyCountered: true,
    }).code,
    "ROOM_QUOTE_SEND_AGREEMENT_NOT_READY",
  );
});
