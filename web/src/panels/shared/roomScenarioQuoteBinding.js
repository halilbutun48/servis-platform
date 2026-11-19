const QUOTE_DECISION_KEYS = [
  "passengerCount",
  "vehicleType",
  "vehicleCount",
  "vehicleCapacity",
  "serviceDistanceKm",
  "totalDistanceKm",
  "routeDurationMinutes",
  "serviceDayCount",
  "shiftCount",
  "tripCount",
];

function normalizeScenarioOverride(key, value) {
  if (value === "" || value === null || value === undefined) return null;
  if (key === "vehicleType") {
    const normalized = String(value).trim().toUpperCase();
    return normalized || null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeRoomScenarioQuoteBinding(selection = null) {
  const scenarioId = String(selection?.scenarioId || "").trim();
  const periodPlanningCostMinor = Number(selection?.periodPlanning?.periodPlanningCostMinor);
  const periodPlanningCostIsUsable = selection?.periodPlanning?.periodCostReady === true
    && Number.isSafeInteger(periodPlanningCostMinor)
    && periodPlanningCostMinor > 0;
  const costMinor = periodPlanningCostIsUsable
    ? periodPlanningCostMinor
    : Number(selection?.costMinor);
  if (!scenarioId || !Number.isSafeInteger(costMinor) || costMinor < 0) return null;

  const overrides = Object.fromEntries(
    QUOTE_DECISION_KEYS
      .map((key) => [key, normalizeScenarioOverride(key, selection?.overrides?.[key])])
      .filter(([, value]) => value !== null),
  );

  const hasQuoteCostEvidence = Object.prototype.hasOwnProperty.call(selection || {}, "quoteCostMinor")
    || Object.prototype.hasOwnProperty.call(selection || {}, "quoteCostPartialMinor")
    || Object.prototype.hasOwnProperty.call(selection || {}, "quoteCostComplete")
    || Object.prototype.hasOwnProperty.call(selection || {}, "quoteCostMissingLabels");
  const quoteCostMinor = safeMinor(selection?.quoteCostMinor);
  const quoteCostPartialMinor = safeMinor(selection?.quoteCostPartialMinor);
  const quoteCostComplete = hasQuoteCostEvidence
    ? selection?.quoteCostComplete === true && quoteCostMinor !== null
    : true;
  const quoteCostMissingLabels = [...new Set((Array.isArray(selection?.quoteCostMissingLabels) ? selection.quoteCostMissingLabels : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
  return {
    scenarioId,
    costMinor,
    ...(Number(selection?.vehicleId || selection?.availability?.vehicleId || 0) > 0
      ? { vehicleId: Number(selection.vehicleId || selection.availability?.vehicleId) }
      : {}),
    costBasis: selection?.costBasis ? String(selection.costBasis) : null,
    status: selection?.status ? String(selection.status) : null,
    modelVersion: selection?.modelVersion ? String(selection.modelVersion) : null,
    ...(hasQuoteCostEvidence ? {
      quoteCostMinor,
      ...(Object.prototype.hasOwnProperty.call(selection || {}, "quoteCostPartialMinor") ? { quoteCostPartialMinor } : {}),
      quoteCostComplete,
      quoteCostMissingLabels,
    } : {}),
    overrides,
    ...(selection?.periodPlanning && typeof selection.periodPlanning === "object" ? {
      periodPlanning: Object.fromEntries(
        [
          "periodStart",
          "periodEnd",
          "weekMask",
          "startMin",
          "endMin",
          "movementsPerDay",
          "direction",
          "pattern",
          "scheduleSource",
          "scopeStatus",
          "status",
          "comparisonAllowed",
          "periodCostReady",
          "scheduledServiceDayCount",
          "plannedMovementCount",
          "observedLinkedShiftCount",
          "knownRoutePlanningCostMinor",
          "periodPlanningCostMinor",
          "periodQuoteFloorMinor",
          "periodExpectedGainMinor",
          "missing",
          "assumptions",
        ]
          .filter((key) => Object.prototype.hasOwnProperty.call(selection.periodPlanning, key))
          .map((key) => [key, selection.periodPlanning[key]]),
      ),
    } : {}),
  };
}

function safeMinor(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function buildRoomScenarioExpectedProfit({ offerAmountMinor, quoteCostMinor, missingCostLabels = [] } = {}) {
  const offer = safeMinor(offerAmountMinor);
  const cost = safeMinor(quoteCostMinor);
  const missing = [...new Set((Array.isArray(missingCostLabels) ? missingCostLabels : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
  if (offer === null || offer <= 0 || cost === null || missing.length) {
    return {
      status: "NOT_PROVEN",
      profitMinor: null,
      marginBps: null,
      missingCostLabels: missing,
    };
  }
  return {
    status: "READY",
    profitMinor: offer - cost,
    marginBps: Math.round(((offer - cost) / offer) * 10_000),
    missingCostLabels: [],
  };
}

export function roomScenarioCostForSelection(nextResult = null, selectedPlan = null) {
  const candidates = [
    selectedPlan?.planningCostMinor,
    selectedPlan?.comparisonCostMinor,
    nextResult?.scenario?.planningCostMinor,
    nextResult?.scenario?.comparisonCostMinor,
    nextResult?.scenario?.costMinor,
  ];
  return candidates
    .filter((value) => value !== null && value !== undefined && value !== "")
    .find((value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0) ?? null;
}

export function roomQuoteFormForSelectedScenario(form = {}, binding = null) {
  if (!binding) return form;
  const {
    roomQuoteFloorDraftId: _roomQuoteFloorDraftId,
    roomQuoteFloorDraftVersion: _roomQuoteFloorDraftVersion,
    quoteFloorMinor: _quoteFloorMinor,
    quoteFloorPerPassengerMinor: _quoteFloorPerPassengerMinor,
    baselineSource: _baselineSource,
    calculationVersion: _calculationVersion,
    ...previewForm
  } = form;
  const scenarioFields = Object.fromEntries(
    Object.entries(binding.overrides || {}).map(([key, value]) => [key, String(value)]),
  );
  const quoteCostComplete = binding.quoteCostComplete !== false;
  return {
    ...previewForm,
    manualBaselineOperationalCostMinor: quoteCostComplete ? String(binding.costMinor) : "",
    ...scenarioFields,
    ...(binding.periodPlanning ? {
      planningPeriodStart: binding.periodPlanning.periodStart || "",
      planningPeriodEnd: binding.periodPlanning.periodEnd || "",
      planningWeekMask: binding.periodPlanning.weekMask ?? "",
      planningStartMin: binding.periodPlanning.startMin ?? "",
      planningEndMin: binding.periodPlanning.endMin ?? "",
      planningMovementsPerDay: binding.periodPlanning.movementsPerDay ?? "",
      planningDirection: binding.periodPlanning.direction || "",
      planningPattern: binding.periodPlanning.pattern || "",
    } : {}),
  };
}
