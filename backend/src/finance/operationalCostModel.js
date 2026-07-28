import {
  OPERATIONAL_COST_MODEL_VERSION,
  OPERATIONAL_COST_COMPONENT_REGISTRY,
  OPERATIONAL_COST_UNIT_COST_KEYS,
  RECOGNIZED_CURRENCY_CODES,
  compactText,
  hasValue,
  addUnique,
  roundMinor,
  safeHashId,
  buildIssues,
  baseNormalizedInput,
  moneySum,
  finalizeComponent,
  buildFuelComponent,
  buildVehicleFixedComponent,
  buildVehicleVariableComponent,
  buildDriverLaborComponent,
} from "./operationalCostMath.js";

function buildWaitingOvertimeComponent(normalized) {
  const relevant = [
    normalized.waitingMinutes,
    normalized.overtimeMinutes,
    normalized.driverWaitingHourlyCostMinor,
    normalized.driverOvertimeHourlyCostMinor,
  ].some((value) => value !== null && value !== undefined);
  if (!relevant) {
    return finalizeComponent({
      componentKey: "waiting_and_overtime",
      labelTr: "Bekleme / fazla süre maliyeti",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  let amountMinor = 0;
  let includedInBaseline = false;

  if (normalized.waitingMinutes !== null) sourceFields.push("waitingMinutes");
  if (normalized.overtimeMinutes !== null) sourceFields.push("overtimeMinutes");
  if (normalized.driverWaitingHourlyCostMinor !== null) sourceFields.push("driverWaitingHourlyCostMinor");
  if (normalized.driverOvertimeHourlyCostMinor !== null) sourceFields.push("driverOvertimeHourlyCostMinor");

  if (normalized.waitingMinutes !== null) {
    if (normalized.driverWaitingHourlyCostMinor === null) {
      missingFields.push("driverWaitingHourlyCostMinor");
    } else {
      amountMinor += roundMinor((normalized.waitingMinutes * normalized.driverWaitingHourlyCostMinor) / 60);
      includedInBaseline = true;
      evidence.push(`waitingMinutes × driverWaitingHourlyCostMinor / 60 = ${normalized.waitingMinutes} × ${normalized.driverWaitingHourlyCostMinor}`);
    }
  }
  if (normalized.overtimeMinutes !== null) {
    if (normalized.driverOvertimeHourlyCostMinor === null) {
      missingFields.push("driverOvertimeHourlyCostMinor");
    } else {
      amountMinor += roundMinor((normalized.overtimeMinutes * normalized.driverOvertimeHourlyCostMinor) / 60);
      includedInBaseline = true;
      evidence.push(`overtimeMinutes × driverOvertimeHourlyCostMinor / 60 = ${normalized.overtimeMinutes} × ${normalized.driverOvertimeHourlyCostMinor}`);
    }
  }

  return finalizeComponent({
    componentKey: "waiting_and_overtime",
    labelTr: "Bekleme / fazla süre maliyeti",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: "waitingMinutes × waitingRate / 60 + overtimeMinutes × overtimeRate / 60",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard: "waiting and overtime kept separate from base labor",
  });
}

function buildRouteFeesComponent(normalized, issues) {
  const specificFields = [
    ["tollMinor", normalized.tollMinor],
    ["bridgeMinor", normalized.bridgeMinor],
    ["highwayMinor", normalized.highwayMinor],
    ["parkingMinor", normalized.parkingMinor],
    ["terminalMinor", normalized.terminalMinor],
    ["otherDirectRouteFeeMinor", normalized.otherDirectRouteFeeMinor],
  ];
  const specificPresent = specificFields.some(([, value]) => value !== null);
  const aggregatePresent = normalized.routeFeeMinor !== null;
  if (!specificPresent && !aggregatePresent) {
    return finalizeComponent({
      componentKey: "route_fees",
      labelTr: "Rota ücretleri",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  let amountMinor = 0;
  let includedInBaseline = false;
  let doubleCountGuard = "none";

  if (aggregatePresent) sourceFields.push("routeFeeMinor");
  for (const [field, value] of specificFields) {
    if (value !== null) sourceFields.push(field);
  }

  if (aggregatePresent && specificPresent) {
    warnings.push("routeFeeMinor aggregate değeri detay ücretlerle çakışıyor; aggregate baseline dışında bırakıldı");
    issues.doubleCountWarnings.push("routeFeeMinor aggregate değeri detay ücretlerle çakışıyor");
    doubleCountGuard = "aggregate_route_fee_excluded_due_to_detail_overlap";
  }

  if (specificPresent) {
    for (const [field, value] of specificFields) {
      if (value !== null) {
        amountMinor += value;
        evidence.push(`${field} doğrudan toplandı: ${value}`);
      }
    }
    includedInBaseline = true;
  } else if (aggregatePresent) {
    amountMinor = normalized.routeFeeMinor;
    includedInBaseline = true;
    evidence.push(`routeFeeMinor doğrudan toplandı: ${normalized.routeFeeMinor}`);
  }

  return finalizeComponent({
    componentKey: "route_fees",
    labelTr: "Rota ücretleri",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: specificPresent ? "toll + bridge + highway + parking + terminal + otherDirectRouteFee" : "routeFeeMinor",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard,
  });
}

function buildOperationsOverheadComponent(normalized) {
  const relevant = [
    normalized.operationsOverheadFixedMinor,
    normalized.operationsOverheadPerShiftMinor,
    normalized.operationsOverheadRateBps,
    normalized.operationsOverheadRateBaseMinor,
    normalized.dispatchControlCostMinor,
    normalized.trackingTechnologyCostMinor,
    normalized.otherOverheadMinor,
  ].some((value) => value !== null && value !== undefined);
  if (!relevant) {
    return finalizeComponent({
      componentKey: "operations_overhead",
      labelTr: "Operasyonel genel gider",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  let amountMinor = 0;
  let includedInBaseline = false;

  if (normalized.operationsOverheadFixedMinor !== null) sourceFields.push("operationsOverheadFixedMinor");
  if (normalized.operationsOverheadPerShiftMinor !== null) sourceFields.push("operationsOverheadPerShiftMinor");
  if (normalized.operationsOverheadRateBps !== null) sourceFields.push("operationsOverheadRateBps");
  if (normalized.operationsOverheadRateBaseMinor !== null) sourceFields.push("operationsOverheadRateBaseMinor");
  if (normalized.dispatchControlCostMinor !== null) sourceFields.push("dispatchControlCostMinor");
  if (normalized.trackingTechnologyCostMinor !== null) sourceFields.push("trackingTechnologyCostMinor");
  if (normalized.otherOverheadMinor !== null) sourceFields.push("otherOverheadMinor");

  if (normalized.operationsOverheadFixedMinor !== null) {
    amountMinor += normalized.operationsOverheadFixedMinor;
    includedInBaseline = true;
    evidence.push("operationsOverheadFixedMinor doğrudan toplandı");
  }
  if (normalized.operationsOverheadPerShiftMinor !== null) {
    if (normalized.shiftCount === null) {
      missingFields.push("shiftCount");
    } else {
      amountMinor += normalized.operationsOverheadPerShiftMinor * normalized.shiftCount;
      includedInBaseline = true;
      evidence.push(`operationsOverheadPerShiftMinor × shiftCount = ${normalized.operationsOverheadPerShiftMinor} × ${normalized.shiftCount}`);
    }
  }
  if (normalized.operationsOverheadRateBps !== null) {
    if (normalized.operationsOverheadRateBaseMinor === null) {
      missingFields.push("operationsOverheadRateBaseMinor");
    } else {
      amountMinor += roundMinor((normalized.operationsOverheadRateBaseMinor * normalized.operationsOverheadRateBps) / 10000);
      includedInBaseline = true;
      evidence.push(`operationsOverheadRateBaseMinor × rateBps / 10000 = ${normalized.operationsOverheadRateBaseMinor} × ${normalized.operationsOverheadRateBps}`);
    }
  }
  if (normalized.dispatchControlCostMinor !== null) {
    amountMinor += normalized.dispatchControlCostMinor;
    includedInBaseline = true;
    evidence.push("dispatchControlCostMinor doğrudan toplandı");
  }
  if (normalized.trackingTechnologyCostMinor !== null) {
    amountMinor += normalized.trackingTechnologyCostMinor;
    includedInBaseline = true;
    evidence.push("trackingTechnologyCostMinor doğrudan toplandı");
  }
  if (normalized.otherOverheadMinor !== null) {
    amountMinor += normalized.otherOverheadMinor;
    includedInBaseline = true;
    evidence.push("otherOverheadMinor doğrudan toplandı");
  }

  return finalizeComponent({
    componentKey: "operations_overhead",
    labelTr: "Operasyonel genel gider",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: "fixed + per_shift + rate_bps(base explicit) + dispatch control + tracking tech + other",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard: "rate base must be explicit and not recursive",
  });
}

function buildOtherDirectCostComponent(normalized) {
  if (normalized.otherDirectCostMinor === null) {
    return finalizeComponent({
      componentKey: "other_direct_cost",
      labelTr: "Diğer doğrudan maliyet",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }
  return finalizeComponent({
    componentKey: "other_direct_cost",
    labelTr: "Diğer doğrudan maliyet",
    currencyCode: normalized.currencyCode,
    sourceFields: ["otherDirectCostMinor"],
    amountMinor: normalized.otherDirectCostMinor,
    relevant: true,
    includedInBaseline: true,
    formula: "otherDirectCostMinor",
    calculationEvidence: ["otherDirectCostMinor doğrudan toplandı"],
    warnings: [],
    blockers: [],
    missingFields: [],
    invalidFields: [],
    doubleCountGuard: "none",
  });
}

function buildExternalPreviewAdjustmentsComponent(normalized) {
  const fields = [
    ["qualityAdjustmentPreviewMinor", normalized.qualityAdjustmentPreviewMinor],
    ["hakedisAdjustmentPreviewMinor", normalized.hakedisAdjustmentPreviewMinor],
    ["contractualAdjustmentPreviewMinor", normalized.contractualAdjustmentPreviewMinor],
  ];
  const relevant = fields.some(([, value]) => value !== null);
  if (!relevant) {
    return finalizeComponent({
      componentKey: "external_preview_adjustments",
      labelTr: "Harici önizleme düzeltmeleri",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }
  const amountMinor = fields.reduce((sum, [, value]) => sum + (value ?? 0), 0);
  const evidence = fields
    .filter(([, value]) => value !== null)
    .map(([field, value]) => `${field} = ${value}`);
  return finalizeComponent({
    componentKey: "external_preview_adjustments",
    labelTr: "Harici önizleme düzeltmeleri",
    currencyCode: normalized.currencyCode,
    sourceFields: fields.filter(([, value]) => value !== null).map(([field]) => field).concat(normalized.includeExternalPreviewAdjustments ? ["includeExternalPreviewAdjustments"] : []),
    amountMinor,
    relevant: true,
    includedInBaseline: false,
    formula: "qualityAdjustmentPreviewMinor + hakedisAdjustmentPreviewMinor + contractualAdjustmentPreviewMinor",
    calculationEvidence: evidence,
    warnings: [],
    blockers: [],
    missingFields: [],
    invalidFields: [],
    doubleCountGuard: "preview-only adjustments never touch baseline",
  });
}

function summarizeComponent(component) {
  return {
    key: component.componentKey,
    labelTr: component.labelTr,
    amountMinor: component.amountMinor,
    includedInBaseline: component.includedInBaseline,
    status: component.status,
  };
}

function computeUnitCost(amountMinor, denominator, label, issues) {
  if (!Number.isFinite(Number(denominator)) || Number(denominator) <= 0) {
    addUnique(issues.warnings, `${label} için payda eksik veya sıfır`);
    return null;
  }
  return roundMinor(amountMinor / Number(denominator));
}

function buildSummaryText(result) {
  if (result.status === "blocked") {
    return "Operasyonel maliyet önizlemesi kilitlendi; geçersiz veya karışık veri nedeniyle güvenli çıktı üretilemedi. Herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.";
  }
  if (result.status === "incomplete") {
    return "Operasyonel maliyet önizlemesi kısmen hazırlandı; eksik veri nedeniyle bazı bileşenler dahil edilmedi. Herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.";
  }
  if (result.status === "partial") {
    return "Operasyonel maliyet önizlemesi hazırlandı; bazı uyarılar var ama herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.";
  }
  return "Operasyonel maliyet önizlemesi hazırlandı; herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.";
}

function buildNextSafeStepText() {
  return "Sıradaki güvenli aşama: ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01.";
}

export function normalizeOperationalCostInput(input = {}) {
  return Object.freeze(baseNormalizedInput(input));
}

export function buildOperationalCostModel(input = {}) {
  const issues = buildIssues();
  const normalized = baseNormalizedInput(input, issues);

  if (normalized._currencyCandidates.length === 0) {
    issues.currencyWarnings.push("currencyCode eksik; TRY varsayıldı");
    issues.warnings.push("currencyCode eksik; TRY varsayıldı");
  } else if (!RECOGNIZED_CURRENCY_CODES.has(normalized.currencyCode)) {
    issues.currencyWarnings.push(`Tanımsız para birimi: ${normalized.currencyCode}`);
    issues.warnings.push(`Tanımsız para birimi: ${normalized.currencyCode}`);
  }
  if (normalized._currencyCandidates.length > 1) {
    issues.currencyWarnings.push(`Mixed currency not allowed: ${normalized._currencyCandidates.join(", ")}`);
    issues.blockers.push("mixed currency not allowed");
  }

  if (normalized._distanceTripletDerived) {
    issues.formulaTrace.push("Distance triplet normalized from available service/empty/total values");
  }
  if (hasValue(input.serviceDistanceKm) && hasValue(input.emptyDistanceKm) && hasValue(input.totalDistanceKm)) {
    const service = Number(input.serviceDistanceKm);
    const empty = Number(input.emptyDistanceKm);
    const total = Number(input.totalDistanceKm);
    if (Number.isFinite(service) && Number.isFinite(empty) && Number.isFinite(total) && Math.abs((service + empty) - total) > 0.001) {
      issues.warnings.push("serviceDistanceKm + emptyDistanceKm ile totalDistanceKm çelişiyor");
    }
  }
  if (normalized.serviceDistanceKm === null && normalized.totalDistanceKm === null && normalized.emptyDistanceKm === null) {
    issues.missingFields.push("distance inputs");
  }

  const components = [
    buildFuelComponent(normalized),
    buildVehicleFixedComponent(normalized),
    buildVehicleVariableComponent(normalized, issues),
    buildDriverLaborComponent(normalized, issues),
    buildWaitingOvertimeComponent(normalized),
    buildRouteFeesComponent(normalized, issues),
    buildOperationsOverheadComponent(normalized),
    buildOtherDirectCostComponent(normalized),
    buildExternalPreviewAdjustmentsComponent(normalized),
  ];

  const includedComponentTotalMinor = moneySum(
    ...components.filter((component) => component.includedInBaseline).map((component) => component.amountMinor),
  );
  const externalPreviewAdjustmentsMinor = components.find((component) => component.componentKey === "external_preview_adjustments")?.amountMinor || 0;
  const baselineOperationalCostMinor = includedComponentTotalMinor;
  const adjustedPreviewCostMinor = normalized.includeExternalPreviewAdjustments ? baselineOperationalCostMinor + externalPreviewAdjustmentsMinor : null;

  const relevantComponents = components.filter((component) => component.status !== "excluded" && component.componentKey !== "external_preview_adjustments");
  const hasBlockedComponent = relevantComponents.some((component) => component.status === "blocked") || issues.blockers.length > 0;
  const hasIncompleteComponent = relevantComponents.some((component) => component.status === "incomplete");
  const hasPartialComponent = relevantComponents.some((component) => component.status === "partial");
  const hasWarnings = issues.warnings.length > 0 || issues.currencyWarnings.length > 0 || issues.doubleCountWarnings.length > 0;
  const anyRelevant = relevantComponents.length > 0;

  let status = "complete";
  if (hasBlockedComponent) status = "blocked";
  else if (!anyRelevant || hasIncompleteComponent || issues.missingFields.length > 0) status = "incomplete";
  else if (hasPartialComponent || hasWarnings || externalPreviewAdjustmentsMinor !== 0) status = "partial";

  if (components.some((component) => component.componentKey === "fuel" && component.warnings.some((warning) => warning.includes("zero")))) {
    addUnique(issues.warnings, "Fuel component suspicious zero consumption");
  }
  if (normalized.passengerCount !== null && normalized.vehicleCapacity !== null && normalized.passengerCount > normalized.vehicleCapacity) {
    issues.blockers.push("passengerCount vehicleCapacity değerini aşıyor");
  }
  if (normalized.passengerCount === 0 && hasValue(input.passengerCount)) {
    issues.warnings.push("passengerCount 0 olarak verildi");
  }
  if (normalized.routeDurationMinutes !== null && normalized.routeDurationMinutes < 0) {
    issues.blockers.push("routeDurationMinutes negatif olamaz");
  }
  if (normalized.waitingMinutes !== null && normalized.waitingMinutes < 0) {
    issues.blockers.push("waitingMinutes negatif olamaz");
  }
  if (normalized.overtimeMinutes !== null && normalized.overtimeMinutes < 0) {
    issues.blockers.push("overtimeMinutes negatif olamaz");
  }

  if (issues.blockers.length > 0) status = "blocked";
  else if (status !== "blocked" && (issues.missingFields.length > 0 || hasIncompleteComponent)) status = "incomplete";
  else if (status === "complete" && (hasWarnings || externalPreviewAdjustmentsMinor !== 0)) status = "partial";

  const unitIssues = buildIssues();
  const unitCosts = Object.freeze({
    costPerServiceKmMinor: computeUnitCost(baselineOperationalCostMinor, normalized.serviceDistanceKm, "costPerServiceKmMinor", unitIssues),
    costPerTotalKmMinor: computeUnitCost(baselineOperationalCostMinor, normalized.totalDistanceKm, "costPerTotalKmMinor", unitIssues),
    costPerShiftMinor: computeUnitCost(baselineOperationalCostMinor, normalized.shiftCount, "costPerShiftMinor", unitIssues),
    costPerTripMinor: computeUnitCost(baselineOperationalCostMinor, normalized.tripCount, "costPerTripMinor", unitIssues),
    costPerServiceDayMinor: computeUnitCost(baselineOperationalCostMinor, normalized.serviceDayCount, "costPerServiceDayMinor", unitIssues),
    costPerPassengerMinor: computeUnitCost(baselineOperationalCostMinor, normalized.passengerCount, "costPerPassengerMinor", unitIssues),
    costPerPassengerKmMinor: computeUnitCost(baselineOperationalCostMinor, normalized.passengerCount && normalized.totalDistanceKm ? normalized.passengerCount * normalized.totalDistanceKm : null, "costPerPassengerKmMinor", unitIssues),
    costPerVehicleMinor: normalized.vehicleRef ? baselineOperationalCostMinor : null,
    costPerMinuteMinor: computeUnitCost(baselineOperationalCostMinor, normalized.routeDurationMinutes, "costPerMinuteMinor", unitIssues),
  });

  const componentSummaries = components.map(summarizeComponent);
  const formulaTrace = [
    ...issues.formulaTrace,
    `baselineOperationalCostMinor = includedComponentTotalMinor = ${baselineOperationalCostMinor}`,
    `externalPreviewAdjustmentsMinor = ${externalPreviewAdjustmentsMinor}`,
    normalized.includeExternalPreviewAdjustments
      ? `adjustedPreviewCostMinor = baselineOperationalCostMinor + externalPreviewAdjustmentsMinor = ${adjustedPreviewCostMinor}`
      : "adjustedPreviewCostMinor not included because includeExternalPreviewAdjustments=false",
  ];
  for (const component of components) {
    if (component.status !== "excluded" || component.componentKey === "external_preview_adjustments") {
      formulaTrace.push(`${component.componentKey}: ${component.formula || "n/a"}`);
    }
  }

  const evidence = [
    ...components.flatMap((component) => component.calculationEvidence.map((line) => `${component.componentKey}: ${line}`)),
    ...issues.currencyWarnings.map((line) => `currency: ${line}`),
    ...issues.doubleCountWarnings.map((line) => `double-count: ${line}`),
  ];

  const completenessPenalty = issues.missingFields.length * 6 + issues.invalidFields.length * 15 + issues.blockers.length * 25;
  const bonus = components.filter((component) => component.status === "complete").length * 4;
  const completenessScore = Math.max(0, Math.min(100, 40 + bonus - completenessPenalty));
  const confidenceLevel = status === "blocked" ? "blocked" : completenessScore >= 85 ? "high" : completenessScore >= 65 ? "medium" : "low";

  const stableIdSource = {
    sourceType: normalized.sourceType,
    sourceRef: normalized.sourceRef,
    routeRef: normalized.routeRef,
    shiftRef: normalized.shiftRef,
    vehicleRef: normalized.vehicleRef,
    driverRef: normalized.driverRef,
    currencyCode: normalized.currencyCode,
    serviceDistanceKm: normalized.serviceDistanceKm,
    emptyDistanceKm: normalized.emptyDistanceKm,
    totalDistanceKm: normalized.totalDistanceKm,
    routeDurationMinutes: normalized.routeDurationMinutes,
    waitingMinutes: normalized.waitingMinutes,
    overtimeMinutes: normalized.overtimeMinutes,
    shiftCount: normalized.shiftCount,
    serviceDayCount: normalized.serviceDayCount,
    passengerCount: normalized.passengerCount,
    vehicleCapacity: normalized.vehicleCapacity,
    tripCount: normalized.tripCount,
    baselineOperationalCostMinor,
    externalPreviewAdjustmentsMinor,
  };

  const calculationId = compactText(normalized.calculationId, "") || safeHashId(stableIdSource);
  const nextSafeStepText = buildNextSafeStepText();
  const summaryText = buildSummaryText({ status });

  return Object.freeze({
    modelVersion: OPERATIONAL_COST_MODEL_VERSION,
    calculationId,
    status,
    currencyCode: normalized.currencyCode || "TRY",
    baselineOperationalCostMinor,
    includedComponentTotalMinor,
    externalPreviewAdjustmentsMinor,
    adjustedPreviewCostMinor,
    components: Object.freeze([...components]),
    componentSummaries: Object.freeze(componentSummaries),
    unitCosts,
    normalizedInput: Object.freeze({
      ...normalized,
      calculationId,
    }),
    missingFields: Object.freeze([...new Set([...issues.missingFields, ...issues.invalidFields.map((field) => `${field}:invalid`)] )]),
    invalidFields: Object.freeze([...new Set(issues.invalidFields)]),
    warnings: Object.freeze([...new Set([...issues.warnings, ...unitIssues.warnings])]),
    blockers: Object.freeze([...new Set(issues.blockers)]),
    doubleCountWarnings: Object.freeze([...new Set(issues.doubleCountWarnings)]),
    currencyWarnings: Object.freeze([...new Set(issues.currencyWarnings)]),
    dataQuality: Object.freeze({
      completenessScore,
      confidenceLevel,
      includedComponentCount: components.filter((component) => component.includedInBaseline).length,
      totalComponentCount: components.length,
      missingFieldCount: issues.missingFields.length,
      invalidFieldCount: issues.invalidFields.length,
      warningCount: issues.warnings.length,
      blockerCount: issues.blockers.length,
      mixedCurrency: issues.currencyWarnings.some((line) => /mixed currency/i.test(line)),
    }),
    confidence: Object.freeze({
      score: completenessScore,
      level: confidenceLevel,
      reason: status === "blocked"
        ? "geçersiz veya karışık girişler"
        : status === "incomplete"
        ? "eksik baseline verisi"
        : status === "partial"
        ? "uyarı içeren ama okunabilir önizleme"
        : "tam ve deterministic önizleme",
    }),
    evidence: Object.freeze(evidence),
    formulaTrace: Object.freeze(formulaTrace),
    summaryText,
    nextSafeStepText,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
    notPersisted: true,
    notInvoiced: true,
    notPaid: true,
    notPostedToAccounting: true,
    noQuoteFloor: true,
    noProfitabilityDecision: true,
  });
}

export function getOperationalCostModelRegistrySummary() {
  return Object.freeze({
    modelVersion: OPERATIONAL_COST_MODEL_VERSION,
    componentCount: OPERATIONAL_COST_COMPONENT_REGISTRY.length,
    componentKeys: Object.freeze(OPERATIONAL_COST_COMPONENT_REGISTRY.map((item) => item.componentKey)),
    unitCostKeys: OPERATIONAL_COST_UNIT_COST_KEYS,
  });
}
