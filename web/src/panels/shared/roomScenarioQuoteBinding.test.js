import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRoomScenarioQuoteBinding,
  roomScenarioCostForSelection,
  roomQuoteFormForSelectedScenario,
  buildRoomScenarioExpectedProfit,
} from "./roomScenarioQuoteBinding.js";

test("invalid selected scenario bindings are rejected", () => {
  assert.equal(normalizeRoomScenarioQuoteBinding(null), null);
  assert.equal(normalizeRoomScenarioQuoteBinding({ scenarioId: "scenario-1", costMinor: -1 }), null);
  assert.equal(normalizeRoomScenarioQuoteBinding({ scenarioId: "", costMinor: 100 }), null);
});

test("selected vehicle plan prefers the displayed equivalent planning cost", () => {
  assert.equal(roomScenarioCostForSelection({ scenario: { costMinor: 4450761 } }, { planningCostMinor: 3467125, comparisonCostMinor: 3467125 }), 3467125);
  assert.equal(roomScenarioCostForSelection({ scenario: { costMinor: 4450761 } }, { planningCostMinor: null, comparisonCostMinor: 3467125 }), 3467125);
  assert.equal(roomScenarioCostForSelection({ scenario: { costMinor: 4450761 } }, null), 4450761);
});

test("expected profit uses the selected quote cost and stays unknown while evidence is missing", () => {
  assert.deepEqual(buildRoomScenarioExpectedProfit({
    offerAmountMinor: 1_000_000,
    quoteCostMinor: 56_414,
    missingCostLabels: ["Sürücü maliyeti", "Bakım maliyeti"],
  }), {
    status: "NOT_PROVEN",
    profitMinor: null,
    marginBps: null,
    missingCostLabels: ["Sürücü maliyeti", "Bakım maliyeti"],
  });

  assert.deepEqual(buildRoomScenarioExpectedProfit({
    offerAmountMinor: 1_000_000,
    quoteCostMinor: 250_000,
    missingCostLabels: [],
  }), {
    status: "READY",
    profitMinor: 750_000,
    marginBps: 7_500,
    missingCostLabels: [],
  });
});

test("selected scenario binding supplies canonical quote cost and decision dimensions", () => {
  const binding = normalizeRoomScenarioQuoteBinding({
    scenarioId: "scenario-25-minibus",
    costMinor: 3460950,
    vehicleId: 42,
    costBasis: "OPERATIONAL_COST_MODEL",
    status: "READY",
    modelVersion: "room-cost-v3",
    quoteCostMinor: 3460950,
    quoteCostComplete: true,
    quoteCostMissingLabels: [],
    overrides: {
      passengerCount: 25,
      vehicleType: "MINIBUS",
      vehicleCount: 2,
      vehicleCapacity: 16,
    },
  });

  assert.deepEqual(binding, {
    scenarioId: "scenario-25-minibus",
    costMinor: 3460950,
    vehicleId: 42,
    costBasis: "OPERATIONAL_COST_MODEL",
    status: "READY",
    modelVersion: "room-cost-v3",
    quoteCostMinor: 3460950,
    quoteCostComplete: true,
    quoteCostMissingLabels: [],
    overrides: {
      passengerCount: 25,
      vehicleType: "MINIBUS",
      vehicleCount: 2,
      vehicleCapacity: 16,
    },
  });

  const form = roomQuoteFormForSelectedScenario({
    quoteScenarioAmountMinor: "14000000",
    manualBaselineOperationalCostMinor: "",
    roomQuoteFloorDraftId: "7",
    roomQuoteFloorDraftVersion: "1",
    quoteFloorMinor: "2987500",
    quoteFloorPerPassengerMinor: "149375",
    baselineSource: "SEFERPAKT_DEMO_2026_CANONICAL_V1:COST_BASELINE_FULL",
    calculationVersion: "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
    passengerCount: "20",
    vehicleType: "MIDIBUS",
    vehicleCount: "1",
    vehicleCapacity: "29",
    unrelatedField: "preserve",
  }, binding);

  assert.equal(form.manualBaselineOperationalCostMinor, "3460950");
  assert.equal(form.passengerCount, "25");
  assert.equal(form.vehicleType, "MINIBUS");
  assert.equal(form.vehicleCount, "2");
  assert.equal(form.vehicleCapacity, "16");
  assert.equal(form.quoteScenarioAmountMinor, "14000000");
  assert.equal(form.unrelatedField, "preserve");
  assert.equal(form.roomQuoteFloorDraftId, undefined);
  assert.equal(form.quoteFloorMinor, undefined);
  assert.equal(form.baselineSource, undefined);
});

test("quote form stays unchanged when no scenario is selected", () => {
  const form = { manualBaselineOperationalCostMinor: "", passengerCount: "20" };
  assert.deepEqual(roomQuoteFormForSelectedScenario(form, null), form);
});

test("contractless period planning stays attached to the selected scenario for the quote request", () => {
  const binding = normalizeRoomScenarioQuoteBinding({
    scenarioId: "scenario-412-minibus-3",
    costMinor: 2046501,
    periodPlanning: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      weekMask: 31,
      startMin: 360,
      endMin: 480,
      movementsPerDay: 1,
      direction: "INBOUND",
      pattern: "ONE_WAY",
    },
  });

  const form = roomQuoteFormForSelectedScenario({}, binding);
  assert.equal(form.planningPeriodStart, "2026-09-01");
  assert.equal(form.planningPeriodEnd, "2026-09-30");
  assert.equal(form.planningWeekMask, 31);
  assert.equal(form.planningStartMin, 360);
  assert.equal(form.planningEndMin, 480);
  assert.equal(form.planningMovementsPerDay, 1);
  assert.equal(binding.periodPlanning.direction, "INBOUND");
});

test("selected scenario keeps period evidence for the next finance tab", () => {
  const binding = normalizeRoomScenarioQuoteBinding({
    scenarioId: "scenario-413-otobus-1",
    costMinor: 2333803,
    periodPlanning: {
      periodStart: "2026-11-17",
      periodEnd: "2026-11-21",
      weekMask: 31,
      startMin: 390,
      endMin: 1080,
      movementsPerDay: 1,
      direction: "INBOUND",
      pattern: "ONE_WAY",
      scheduleSource: "USER_ENTERED_PLANNING",
      scopeStatus: "READY_WITH_PLANNING_ASSUMPTION",
      scheduledServiceDayCount: 4,
      plannedMovementCount: 4,
      observedLinkedShiftCount: 0,
      knownRoutePlanningCostMinor: 0,
      missing: [],
      assumptions: ["Planlama önizlemesi; gerçekleşmiş gider değil."],
    },
  });

  assert.equal(binding.periodPlanning.scheduledServiceDayCount, 4);
  assert.equal(binding.periodPlanning.plannedMovementCount, 4);
  assert.equal(binding.periodPlanning.scopeStatus, "READY_WITH_PLANNING_ASSUMPTION");
  assert.deepEqual(binding.periodPlanning.missing, []);
  assert.deepEqual(binding.periodPlanning.assumptions, ["Planlama önizlemesi; gerçekleşmiş gider değil."]);
});

test("period planning total remains the quote cost when the selected card also has a daily cost", () => {
  const binding = normalizeRoomScenarioQuoteBinding({
    scenarioId: "scenario-413-otobus-1",
    costMinor: 583451,
    periodPlanning: {
      periodPlanningCostMinor: 2333901,
      periodCostReady: true,
      scheduledServiceDayCount: 4,
      plannedMovementCount: 4,
    },
  });

  assert.equal(binding.costMinor, 2333901);
  assert.equal(roomQuoteFormForSelectedScenario({}, binding).manualBaselineOperationalCostMinor, "2333901");
});

test("an incomplete zero period total cannot replace the selected scenario cost", () => {
  const binding = normalizeRoomScenarioQuoteBinding({
    scenarioId: "scenario-414-minibus-1",
    costMinor: 736587,
    periodPlanning: {
      periodPlanningCostMinor: 0,
      periodCostReady: false,
      missing: ["Araç dönem maliyeti"],
    },
  });

  assert.equal(binding.costMinor, 736587);
  assert.equal(roomQuoteFormForSelectedScenario({}, binding).manualBaselineOperationalCostMinor, "736587");
});
