import { addDaysTR, dayBitTRFromYmd, ymdTR } from "../time/tr.js";

function normalizeYmd(value) {
  if (value == null || value === "") return null;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return ymdTR(date);
}

function maxYmd(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function minYmd(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function routeTemplateFromShift(shift) {
  const distanceM = Number(shift?.routeSnapshotDistanceM);
  const durationSec = Number(shift?.routeSnapshotDurationSec);
  if (!Number.isFinite(distanceM) || distanceM <= 0 || !Number.isFinite(durationSec) || durationSec <= 0) return null;
  return {
    distanceM,
    durationSec,
    inputHash: String(shift?.routeSnapshotInputHash || "").trim() || null,
    sourceShiftId: Number(shift?.id || 0) || null,
  };
}

function routeTemplateKey(template) {
  return [template.distanceM, template.durationSec, template.inputHash || ""].join("|");
}

function scaleNumber(value, count) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number((numeric * count).toFixed(4));
}

export function buildServicePeriodPlanningScope({
  agreement = null,
  shifts = [],
  planningTemplateShifts = [],
  planningAssumptions = {},
  periodStart = null,
  periodEnd = null,
} = {}) {
  const agreementStart = normalizeYmd(agreement?.startDate);
  const agreementEnd = normalizeYmd(agreement?.endDate);
  const requestedStart = normalizeYmd(periodStart) || agreementStart;
  const requestedEnd = normalizeYmd(periodEnd) || agreementEnd;
  const scopedStart = maxYmd(agreementStart, requestedStart);
  const scopedEnd = minYmd(agreementEnd, requestedEnd);
  const weekMask = Number(agreement?.weekMask);
  const missing = [];
  const assumptions = [];

  if (!agreementStart || !agreementEnd || !scopedStart || !scopedEnd || scopedStart > scopedEnd) {
    missing.push("Hizmet dönemi ve sıklığı");
  }
  if (!Number.isInteger(weekMask) || weekMask <= 0) missing.push("Hizmet dönemi ve sıklığı");
  if (!Number.isFinite(Number(agreement?.startMin)) || !Number.isFinite(Number(agreement?.endMin))) {
    missing.push("Günlük hizmet saati");
  }

  const scheduledServiceDates = [];
  if (!missing.includes("Hizmet dönemi ve sıklığı") && scopedStart && scopedEnd) {
    for (let cursor = scopedStart; cursor <= scopedEnd; cursor = addDaysTR(cursor, 1)) {
      if ((weekMask & dayBitTRFromYmd(cursor)) !== 0) scheduledServiceDates.push(cursor);
    }
  }

  const eligibleDateSet = new Set(scheduledServiceDates);
  const observedByDate = new Map();
  for (const shift of Array.isArray(shifts) ? shifts : []) {
    if (Number(shift?.agreementId || 0) !== Number(agreement?.id || 0)) continue;
    if (String(shift?.status || "").toUpperCase() === "DRAFT") continue;
    const date = normalizeYmd(shift?.startAt);
    if (!date || !eligibleDateSet.has(date) || observedByDate.has(date)) continue;
    observedByDate.set(date, shift);
  }

  const observedRows = [...observedByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, shift]) => ({ date, shift }));
  const templates = observedRows.map(({ shift }) => routeTemplateFromShift(shift)).filter(Boolean);
  const templateKeys = [...new Set(templates.map(routeTemplateKey))];
  const planningTemplates = (Array.isArray(planningTemplateShifts) ? planningTemplateShifts : [])
    .map((shift) => routeTemplateFromShift(shift))
    .filter(Boolean);
  const planningTemplateKeys = [...new Set(planningTemplates.map(routeTemplateKey))];
  const planningTemplateSourceShiftIds = templateKeys.length === 0 && planningTemplateKeys.length === 1
    ? [...new Set((Array.isArray(planningTemplateShifts) ? planningTemplateShifts : [])
      .filter((shift) => routeTemplateFromShift(shift) && routeTemplateKey(routeTemplateFromShift(shift)) === planningTemplateKeys[0])
      .map((shift) => Number(shift?.id || 0)).filter(Boolean))]
    : [];
  const routeTemplate = templateKeys.length === 1
    ? templates[0]
    : templateKeys.length === 0 && planningTemplateKeys.length === 1
      ? { ...planningTemplates[0], sourceKind: "PLANNING_TEMPLATE" }
      : null;

  if (!scheduledServiceDates.length && !missing.includes("Hizmet dönemi ve sıklığı")) {
    missing.push("Hizmet dönemi ve sıklığı");
  }
  if (!routeTemplate) {
    missing.push(templateKeys.length > 1 ? "Tekrarlanan hizmet günleri için tek rota şablonu" : "Doğrulanmış rota şablonu");
  }
  const hasVehiclePlanningAssumption = [
    planningAssumptions?.fixedVehicleCostMonthlyMinor,
    planningAssumptions?.vehicleLeaseMonthlyMinor,
    planningAssumptions?.maintenancePerKmMinor,
  ].some((value) => value !== null && value !== undefined && String(value).trim() !== "");
  const hasDriverPlanningAssumption = [
    planningAssumptions?.driverBasePerShiftMinor,
    planningAssumptions?.driverHourlyCostMinor,
  ].some((value) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!Number(agreement?.vehicleId || 0) && !hasVehiclePlanningAssumption) missing.push("Planlanan araç");
  if (!Number(agreement?.driverId || 0) && !hasDriverPlanningAssumption) missing.push("Planlanan sürücü");

  if (scheduledServiceDates.length && Number(agreement?.startMin) >= 0 && Number(agreement?.endMin) >= 0) {
    assumptions.push("Her planlı günde bir sözleşme vardiyası planlandı; gözlenen vardiyalar gerçekleşmiş hizmet sayılmaz.");
  }
  if (routeTemplate && observedRows.length < scheduledServiceDates.length) {
    if (planningTemplateSourceShiftIds.length) {
      assumptions.push(`Kaynak vardiya #${planningTemplateSourceShiftIds.join(", #")} yalnız planlama şablonudur; gerçekleşmiş operasyon sayılmaz.`);
    } else {
      assumptions.push(`${observedRows.length} bağlı vardiyanın aynı rota kaydı kalan planlı günler için planlama şablonu olarak kullanıldı.`);
    }
  }
  if (!observedRows.length && !planningTemplateSourceShiftIds.length) assumptions.push("Bağlı rota kaydı bulunmadığı için tam dönem maliyeti hesaplanmadı.");
  if (!Number(agreement?.vehicleId || 0) && hasVehiclePlanningAssumption) {
    assumptions.push("Araç ataması yapılmadan, dönem araç maliyeti açık planlama varsayımıyla hesaplanıyor; bu gerçek tahsis kanıtı değildir.");
  }
  if (!Number(agreement?.driverId || 0) && hasDriverPlanningAssumption) {
    assumptions.push("Sürücü ataması yapılmadan, sürücü planlama maliyeti açık varsayımla hesaplanıyor; bu gerçekleşmiş çalışma kanıtı değildir.");
  }

  const uniqueMissing = [...new Set(missing)];
  const scopeStatus = !uniqueMissing.includes("Doğrulanmış rota şablonu")
    && !uniqueMissing.includes("Tekrarlanan hizmet günleri için tek rota şablonu")
    && scheduledServiceDates.length > 0
    && routeTemplate
    ? "READY_WITH_PLANNING_ASSUMPTION"
    : "NOT_PROVEN";

  return Object.freeze({
    agreementId: Number(agreement?.id || 0) || null,
    periodStart: scopedStart,
    periodEnd: scopedEnd,
    weekMask: Number.isInteger(weekMask) ? weekMask : null,
    startMin: Number.isFinite(Number(agreement?.startMin)) ? Number(agreement.startMin) : null,
    endMin: Number.isFinite(Number(agreement?.endMin)) ? Number(agreement.endMin) : null,
    scheduledServiceDates: Object.freeze(scheduledServiceDates),
    scheduledServiceDayCount: scheduledServiceDates.length,
    plannedMovementCount: scheduledServiceDates.length || null,
    observedLinkedShiftCount: observedRows.length,
    observedShiftIds: Object.freeze(observedRows.map(({ shift }) => Number(shift?.id || 0)).filter(Boolean)),
    planningTemplateSourceShiftIds: Object.freeze(planningTemplateSourceShiftIds),
    routeTemplate: routeTemplate ? Object.freeze(routeTemplate) : null,
    scopeStatus,
    missing: Object.freeze(uniqueMissing),
    assumptions: Object.freeze([...new Set(assumptions)]),
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

/**
 * Builds the same read-only period scope for a contractless quote preview.
 * The calendar is never inferred from a Shift: the caller must provide the
 * period, weekday mask, daily times and movement frequency explicitly.
 * The route template remains server-owned and must come from a validated
 * planning shift; this helper creates no operation or financial record.
 */
export function buildContractlessServicePeriodPlanningScope({
  planningSchedule = null,
  planningTemplateShifts = [],
  planningAssumptions = {},
} = {}) {
  const schedule = planningSchedule && typeof planningSchedule === "object" ? planningSchedule : {};
  const periodStart = normalizeYmd(schedule.periodStart);
  const periodEnd = normalizeYmd(schedule.periodEnd);
  const weekMask = Number(schedule.weekMask);
  const startMin = Number(schedule.startMin);
  const endMin = Number(schedule.endMin);
  const movementsPerDay = Number(schedule.movementsPerDay);
  const missing = [];

  if (!periodStart || !periodEnd || periodStart > periodEnd || !Number.isInteger(weekMask) || weekMask < 1 || weekMask > 127) {
    missing.push("Hizmet dönemi ve sıklığı");
  }
  if (!Number.isInteger(startMin) || startMin < 0 || startMin > 1439 || !Number.isInteger(endMin) || endMin < 0 || endMin > 1439) {
    missing.push("Günlük hizmet saati");
  }
  if (!Number.isSafeInteger(movementsPerDay) || movementsPerDay < 1 || movementsPerDay > 8) {
    missing.push("Günlük sefer sıklığı");
  }

  const routeTemplateAvailable = (Array.isArray(planningTemplateShifts) ? planningTemplateShifts : [])
    .some((shift) => Number(shift?.routeSnapshotDistanceM) > 0 && Number(shift?.routeSnapshotDurationSec) > 0);
  if (!routeTemplateAvailable) missing.push("Doğrulanmış rota şablonu");

  if (missing.length) {
    return Object.freeze({
      agreementId: null,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      weekMask: Number.isInteger(weekMask) && weekMask >= 1 && weekMask <= 127 ? weekMask : null,
      startMin: Number.isInteger(startMin) && startMin >= 0 && startMin <= 1439 ? startMin : null,
      endMin: Number.isInteger(endMin) && endMin >= 0 && endMin <= 1439 ? endMin : null,
      scheduledServiceDates: Object.freeze([]),
      scheduledServiceDayCount: 0,
      movementsPerDay: Number.isSafeInteger(movementsPerDay) && movementsPerDay > 0 ? movementsPerDay : null,
      plannedMovementCount: null,
      observedLinkedShiftCount: 0,
      observedShiftIds: Object.freeze([]),
      planningTemplateSourceShiftIds: Object.freeze([]),
      routeTemplate: null,
      scopeStatus: "NOT_PROVEN",
      scheduleSource: "USER_ENTERED_PLANNING",
      missing: Object.freeze([...new Set(missing)]),
      assumptions: Object.freeze([]),
      readOnly: true,
      previewOnly: true,
      writeAction: false,
    });
  }

  const baseScope = buildServicePeriodPlanningScope({
    agreement: {
      id: null,
      startDate: periodStart,
      endDate: periodEnd,
      weekMask,
      startMin,
      endMin,
      vehicleId: null,
      driverId: null,
      direction: schedule.direction || null,
      pattern: schedule.pattern || null,
    },
    shifts: [],
    planningTemplateShifts,
    planningAssumptions,
    periodStart,
    periodEnd,
  });
  const plannedMovementCount = baseScope.scheduledServiceDayCount * movementsPerDay;
  const assumptions = [
    ...baseScope.assumptions,
    "Takvim ve günlük sefer sıklığı kullanıcı tarafından teklif öncesi planlama olarak girildi; gerçekleşmiş vardiya oluşturulmadı.",
    ...(movementsPerDay > 1 ? [`Her planlı günde ${movementsPerDay} sefer planlama varsayımı kullanıldı.`] : []),
  ];

  return Object.freeze({
    ...baseScope,
    movementsPerDay,
    plannedMovementCount,
    scheduleSource: "USER_ENTERED_PLANNING",
    direction: String(schedule.direction || "").trim().toUpperCase() || null,
    pattern: String(schedule.pattern || "").trim().toUpperCase() || null,
    assumptions: Object.freeze([...new Set(assumptions)]),
  });
}

export function buildPeriodCostInputOverrides({ scope = null, costInputs = {} } = {}) {
  const movementCount = Number(scope?.plannedMovementCount || 0);
  if (!Number.isSafeInteger(movementCount) || movementCount <= 0) return { ...costInputs };

  const baseRoute = costInputs?.canonicalRoute || {};
  const baseServiceDistanceKm = Number(costInputs?.serviceDistanceKm ?? baseRoute.serviceDistanceKm ?? (Number(scope?.routeTemplate?.distanceM || 0) / 1000));
  const baseEmptyDistanceKm = costInputs?.emptyDistanceKm ?? baseRoute.emptyDistanceKm ?? null;
  const explicitTotalDistanceKm = Number(costInputs?.totalDistanceKm);
  const routeTotalDistanceKm = Number(baseRoute.totalDistanceKm);
  const derivedTotalDistanceKm = Number.isFinite(baseServiceDistanceKm) && baseEmptyDistanceKm != null
    ? baseServiceDistanceKm + Number(baseEmptyDistanceKm)
    : null;
  const baseTotalDistanceKm = Number.isFinite(explicitTotalDistanceKm)
    ? explicitTotalDistanceKm
    : derivedTotalDistanceKm ?? (Number.isFinite(routeTotalDistanceKm) ? routeTotalDistanceKm : baseServiceDistanceKm);
  const baseDurationMinutes = Number(costInputs?.routeDurationMinutes ?? (Number(scope?.routeTemplate?.durationSec || 0) / 60));

  const scaledServiceDistanceKm = scaleNumber(baseServiceDistanceKm, movementCount);
  const scaledTotalDistanceKm = scaleNumber(baseTotalDistanceKm, movementCount);
  const scaledEmptyDistanceKm = baseEmptyDistanceKm == null ? null : scaleNumber(baseEmptyDistanceKm, movementCount);
  const scaledDurationMinutes = scaleNumber(baseDurationMinutes, movementCount);

  return {
    ...costInputs,
    sourceRef: scope?.agreementId && scope?.periodStart && scope?.periodEnd
      ? `agreement-${scope.agreementId}-period-${scope.periodStart}-${scope.periodEnd}`
      : costInputs.sourceRef,
    routeRef: scope?.agreementId ? `agreement-${scope.agreementId}-period-route` : costInputs.routeRef,
    shiftRef: null,
    serviceDistanceKm: scaledServiceDistanceKm,
    totalDistanceKm: scaledTotalDistanceKm,
    emptyDistanceKm: scaledEmptyDistanceKm,
    routeDurationMinutes: scaledDurationMinutes,
    shiftCount: movementCount,
    serviceDayCount: movementCount,
    tripCount: movementCount,
    canonicalRoute: {
      ...baseRoute,
      serviceDistanceKm: scaledServiceDistanceKm,
      totalDistanceKm: scaledTotalDistanceKm,
      emptyDistanceKm: scaledEmptyDistanceKm,
    },
  };
}

export function buildPeriodPlanningSummary({ scope = null, preview = null } = {}) {
  const model = preview?.operationalCostModel || {};
  const components = new Map(
    (Array.isArray(model.components) ? model.components : [])
      .map((component) => [String(component?.componentKey || ""), component]),
  );
  const missing = [...(Array.isArray(scope?.missing) ? scope.missing : [])];
  const fuelStatus = String(preview?.fuelCalculation?.status || "").toUpperCase();
  if (fuelStatus === "INCOMPLETE_REFERENCE") missing.push("Doğrulanmış boş kilometre bilgisi");
  if (!components.get("fuel")?.includedInBaseline) missing.push("Yakıt planlama girdileri");
  if (!components.get("driver_labor")?.includedInBaseline) missing.push("Sürücü planlama maliyeti");
  const vehicleFixedReady = components.get("vehicle_fixed_allocated")?.includedInBaseline === true;
  const vehicleVariableReady = components.get("vehicle_variable")?.includedInBaseline === true;
  if (!vehicleFixedReady && !vehicleVariableReady) missing.push("Araç dönem maliyeti");
  if (preview?.roomProfitability?.contextBlocked) missing.push("Seçili hizmet bağlamı");

  const uniqueMissing = [...new Set(missing.filter(Boolean))];
  const periodPlanningCostMinor = Number.isSafeInteger(Number(model?.baselineOperationalCostMinor))
    ? Number(model.baselineOperationalCostMinor)
    : null;
  const knownRoutePlanningCostMinor = Number.isSafeInteger(Number(
    preview?.fuelCalculation?.countedAmountMinor
      ?? preview?.fuelCalculation?.estimatedAmountMinor,
  ))
    ? Number(preview.fuelCalculation.countedAmountMinor ?? preview.fuelCalculation.estimatedAmountMinor)
    : null;
  const periodCostReady = uniqueMissing.length === 0
    && periodPlanningCostMinor != null
    && preview?.operationalCostModel?.status === "complete";
  const baseQuoteFloorMinor = Number.isSafeInteger(Number(preview?.quoteFloor?.quoteFloorMinor))
    ? Number(preview.quoteFloor.quoteFloorMinor)
    : null;
  const scenarioOfferMinor = Number.isSafeInteger(Number(preview?.roomProfitability?.scenarioOfferMinor))
    ? Number(preview.roomProfitability.scenarioOfferMinor)
    : null;
  const quoteFloorMissing = Array.isArray(preview?.quoteFloor?.missingFields)
    ? preview.quoteFloor.missingFields
    : [];
  const comparisonAllowed = scope?.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION"
    && periodCostReady
    && preview?.quoteFloor?.computed === true;

  return Object.freeze({
    status: comparisonAllowed ? "READY" : periodCostReady ? "READY_COST_ONLY" : "NOT_PROVEN",
    statusLabel: comparisonAllowed
      ? "Dönem planı hesaplanabilir"
      : periodCostReady
        ? "Dönem maliyeti hesaplandı; teklif varsayımları bekleniyor"
        : "Hizmet döneminin tamamı için maliyet henüz hesaplanamadı",
    comparisonAllowed,
    periodCostReady,
    periodPlanningCostMinor: periodCostReady ? periodPlanningCostMinor : null,
    periodQuoteFloorMinor: comparisonAllowed ? baseQuoteFloorMinor : null,
    periodExpectedGainMinor: comparisonAllowed && scenarioOfferMinor != null && baseQuoteFloorMinor != null
      ? scenarioOfferMinor - baseQuoteFloorMinor
      : null,
    knownRoutePlanningCostMinor,
    scheduledServiceDayCount: Number(scope?.scheduledServiceDayCount || 0) || 0,
    plannedMovementCount: Number(scope?.plannedMovementCount || 0) || 0,
    observedLinkedShiftCount: Number(scope?.observedLinkedShiftCount || 0) || 0,
    observedShiftIds: Array.isArray(scope?.observedShiftIds) ? scope.observedShiftIds : [],
    periodStart: scope?.periodStart || null,
    periodEnd: scope?.periodEnd || null,
    routeTemplate: scope?.routeTemplate || null,
    missing: Object.freeze([...new Set([...uniqueMissing, ...quoteFloorMissing])]),
    assumptions: Object.freeze([
      ...(Array.isArray(scope?.assumptions) ? scope.assumptions : []),
      ...(periodCostReady ? ["Boş kilometre, sürücü ve araç girdileri açık planlama varsayımlarıyla aynı dönem hesabına dahil edildi."] : []),
      ...(knownRoutePlanningCostMinor != null ? ["Bilinen rota ve boş kilometre yakıtı dönem toplamı değildir; diğer maliyetler ayrı hesaplanır."] : []),
    ]),
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}
