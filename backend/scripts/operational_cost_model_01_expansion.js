import * as model from '../src/finance/operationalCostModel.js';
import * as math from '../src/finance/operationalCostMath.js';

const RECOGNIZED_CURRENCY_CODES = math.RECOGNIZED_CURRENCY_CODES;

let externalCheck = null;
let externalComponent = null;

function setContext(checkFn, componentFn) {
  externalCheck = checkFn;
  externalComponent = componentFn;
}

function check(condition, label, detail = '') {
  if (typeof externalCheck !== 'function') {
    throw new Error('Expansion check context not initialized');
  }
  externalCheck(condition, label, detail);
}

function checkEqual(actual, expected, label) {
  check(Object.is(actual, expected), label, `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function checkDeepEqual(actual, expected, label) {
  check(JSON.stringify(actual) === JSON.stringify(expected), label, `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function checkIncludes(list, value, label) {
  check(Array.isArray(list) && list.includes(value), label, `expected ${JSON.stringify(value)} in ${JSON.stringify(list)}`);
}

function assertFrozen(value, label) {
  check(Object.isFrozen(value), label);
}

function component(result, key) {
  if (typeof externalComponent !== 'function') {
    throw new Error('Expansion component context not initialized');
  }
  return externalComponent(result, key);
}

function buildCompleteInput() {
  return {
    currencyCode: 'TRY',
    sourceType: 'route_preview',
    sourceRef: 'route-1',
    routeRef: 'route-1',
    vehicleRef: 'vehicle-1',
    driverRef: 'driver-1',
    serviceDistanceKm: 150,
    emptyDistanceKm: 50,
    totalDistanceKm: 200,
    routeDurationMinutes: 120,
    waitingMinutes: 30,
    overtimeMinutes: 15,
    shiftCount: 2,
    serviceDayCount: 4,
    tripCount: 3,
    passengerCount: 20,
    vehicleCapacity: 40,
    fuelConsumptionLitersPer100Km: 5,
    fuelUnitPriceMinor: 5000,
    vehicleLeaseMonthlyMinor: 20000,
    vehicleDepreciationMonthlyMinor: 10000,
    insuranceMonthlyMinor: 5000,
    taxAndLicenseMonthlyMinor: 5000,
    allocationShiftsPerMonth: 20,
    vehicleFixedCostAllocationMode: 'per_shift',
    maintenancePerKmMinor: 10,
    tirePerKmMinor: 5,
    driverBasePerShiftMinor: 1000,
    mealAllowancePerShiftMinor: 200,
    socialCostAllocationMinor: 150,
    driverWaitingHourlyCostMinor: 600,
    driverOvertimeHourlyCostMinor: 900,
    tollMinor: 300,
    bridgeMinor: 200,
    highwayMinor: 100,
    parkingMinor: 50,
    terminalMinor: 75,
    otherDirectRouteFeeMinor: 25,
    operationsOverheadFixedMinor: 4000,
    operationsOverheadPerShiftMinor: 100,
    operationsOverheadRateBps: 500,
    operationsOverheadRateBaseMinor: 50000,
    otherDirectCostMinor: 150,
  };
}

function buildPreviewInput() {
  return {
    ...buildCompleteInput(),
    qualityAdjustmentPreviewMinor: -250,
    includeExternalPreviewAdjustments: true,
  };
}

function withCompleteInput(overrides = {}) {
  return {
    ...buildCompleteInput(),
    ...overrides,
  };
}

function withPreviewInput(overrides = {}) {
  return {
    ...buildPreviewInput(),
    ...overrides,
  };
}

function runMathBoundaryChecks() {
  for (const [value, expected, label] of [
    ['  Sefer   Abi  ', 'Sefer Abi', 'compactText collapses whitespace'],
    [null, 'fallback', 'compactText null fallback'],
    [undefined, 'fallback', 'compactText undefined fallback'],
    ['“Maliyet”', '“Maliyet”', 'compactText preserves non-space content'],
  ]) {
    checkEqual(math.compactText(value, 'fallback'), expected, label);
  }

  for (const [value, expected, label] of [
    [' try ', 'TRY', 'normalizeCurrencyCode uppercases TRY'],
    ['usd', 'USD', 'normalizeCurrencyCode uppercases USD'],
    ['   ', '', 'normalizeCurrencyCode blank input'],
    [null, '', 'normalizeCurrencyCode null input'],
  ]) {
    checkEqual(math.normalizeCurrencyCode(value), expected, label);
  }

  for (const [value, allowed, expected, label] of [
    ['Per Shift', ['per_shift', 'hourly'], 'per_shift', 'normalizeMode per_shift'],
    ['hourly', ['per_shift', 'hourly'], 'hourly', 'normalizeMode hourly'],
    ['per-month fraction', ['per_month_fraction'], 'per_month_fraction', 'normalizeMode hyphenated input'],
    ['something else', ['per_shift', 'hourly'], '', 'normalizeMode rejects unknown value'],
  ]) {
    checkEqual(math.normalizeMode(value, allowed), expected, label);
  }

  for (const [value, expected, label] of [
    [0, true, 'hasValue accepts zero'],
    [12.5, true, 'hasValue accepts finite decimal'],
    [' 7 ', true, 'hasValue accepts numeric string'],
    ['', false, 'hasValue rejects empty string'],
    ['   ', false, 'hasValue rejects whitespace string'],
    [Infinity, false, 'hasValue rejects infinity'],
    [NaN, false, 'hasValue rejects NaN'],
  ]) {
    checkEqual(math.hasValue(value), expected, label);
  }

  for (const [value, expected, label] of [
    [0, true, 'isSafeMinor accepts zero'],
    [Number.MAX_SAFE_INTEGER, true, 'isSafeMinor accepts max safe integer'],
    [Number.MAX_SAFE_INTEGER + 1, false, 'isSafeMinor rejects unsafe integer'],
    [1.5, false, 'isSafeMinor rejects decimal'],
  ]) {
    checkEqual(math.isSafeMinor(value), expected, label);
  }

  for (const [value, expected, label] of [
    [1.4, 1, 'roundMinor rounds down'],
    [1.5, 2, 'roundMinor rounds half up'],
    [-1.5, -1, 'roundMinor rounds negative half toward zero'],
    [Number.NaN, null, 'roundMinor rejects NaN'],
  ]) {
    checkEqual(math.roundMinor(value), expected, label);
  }

  for (const [value, expected, label] of [
    ['42.5', 42.5, 'safeNumber parses decimal string'],
    [' 42 ', 42, 'safeNumber parses trimmed string'],
    ['abc', null, 'safeNumber rejects text'],
    [Infinity, null, 'safeNumber rejects infinity'],
  ]) {
    checkEqual(math.safeNumber(value), expected, label);
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseMinor(12.4, 'minorRound', issues), 12, 'parseMinor rounds minor values');
    checkEqual(issues.warnings.length, 1, 'parseMinor rounds warning count');
    checkIncludes(issues.warnings, "minorRound minor-unit'e yuvarlandı", 'parseMinor rounds warning text');
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseMinor(-1, 'minorNegative', issues), null, 'parseMinor blocks negative minor values');
    checkIncludes(issues.blockers, 'minorNegative negatif olamaz', 'parseMinor negative blocker');
    checkIncludes(issues.invalidFields, 'minorNegative', 'parseMinor negative invalid field');
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseMinor(Number.MAX_SAFE_INTEGER + 1, 'minorOverflow', issues), null, 'parseMinor blocks unsafe minor values');
    checkIncludes(issues.blockers, 'minorOverflow safe integer sınırını aşıyor', 'parseMinor overflow blocker');
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseMinor(-2.6, 'minorPreview', issues, { allowNegative: true }), -3, 'parseMinor preserves negative preview values');
    checkIncludes(issues.warnings, "minorPreview minor-unit'e yuvarlandı", 'parseMinor negative preview warning');
    checkEqual(issues.blockers.length, 0, 'parseMinor negative preview blockers empty');
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseWholeNumber(7.2, 'wholeRound', issues), 7, 'parseWholeNumber rounds whole numbers');
    checkIncludes(issues.warnings, 'wholeRound tam sayıya yuvarlandı', 'parseWholeNumber rounding warning');
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseWholeNumber(-1, 'wholeNegative', issues), null, 'parseWholeNumber blocks negative values');
    checkIncludes(issues.blockers, 'wholeNegative negatif olamaz', 'parseWholeNumber negative blocker');
  }

  {
    const issues = math.buildIssues();
    checkEqual(math.parseWholeNumber(Number.MAX_SAFE_INTEGER + 1, 'wholeOverflow', issues), null, 'parseWholeNumber blocks unsafe integers');
    checkIncludes(issues.blockers, 'wholeOverflow safe integer sınırını aşıyor', 'parseWholeNumber overflow blocker');
  }

  for (const [value, expected, label] of [
    [0.25, 0.25, 'parseRatio accepts decimal ratio'],
    [1, 1, 'parseRatio accepts ratio one'],
  ]) {
    const issues = math.buildIssues();
    checkEqual(math.parseRatio(value, label, issues), expected, label);
    checkEqual(issues.blockers.length, 0, `${label} blockers empty`);
  }
  for (const [value, label] of [
    [0, 'parseRatio blocks zero'],
    [-0.1, 'parseRatio blocks negative'],
  ]) {
    const issues = math.buildIssues();
    checkEqual(math.parseRatio(value, label, issues), null, label);
    checkIncludes(issues.blockers, `${label} pozitif oran olmalıdır`, `${label} blocker`);
  }

  for (const [input, expected, label] of [
    [{ zeroFuelVehicle: true }, true, 'isZeroFuelMetadata zeroFuelVehicle'],
    [{ fuelType: 'electric van' }, true, 'isZeroFuelMetadata electric fuel type'],
    [{ fuelType: 'hydrogen' }, true, 'isZeroFuelMetadata hydrogen fuel type'],
    [{ fuelType: 'diesel' }, false, 'isZeroFuelMetadata diesel fuel type'],
  ]) {
    checkEqual(math.isZeroFuelMetadata(input), expected, label);
  }

  for (const [input, expected, label] of [
    [{ serviceDistanceKm: 60, emptyDistanceKm: 40, totalDistanceKm: null }, { serviceDistanceKm: 60, emptyDistanceKm: 40, totalDistanceKm: 100, derived: true }, 'normalizeDistanceTriplet derives total distance'],
    [{ serviceDistanceKm: null, emptyDistanceKm: 40, totalDistanceKm: 100 }, { serviceDistanceKm: 60, emptyDistanceKm: 40, totalDistanceKm: 100, derived: true }, 'normalizeDistanceTriplet derives service distance'],
    [{ serviceDistanceKm: 60, emptyDistanceKm: null, totalDistanceKm: 100 }, { serviceDistanceKm: 60, emptyDistanceKm: 40, totalDistanceKm: 100, derived: true }, 'normalizeDistanceTriplet derives empty distance'],
    [{ serviceDistanceKm: 60, emptyDistanceKm: 40, totalDistanceKm: 100 }, { serviceDistanceKm: 60, emptyDistanceKm: 40, totalDistanceKm: 100, derived: false }, 'normalizeDistanceTriplet keeps full triplet'],
  ]) {
    checkDeepEqual(math.normalizeDistanceTriplet(input), expected, label);
  }

  for (const [values, expected, label] of [
    [[1, 2, 3], 6, 'moneySum adds integers'],
    [[1.2, 2.6], 4, 'moneySum rounds each number'],
    [[null, undefined, NaN], 0, 'moneySum ignores non-numeric values'],
    [[10, '5', 0], 15, 'moneySum accepts numeric strings'],
  ]) {
    checkEqual(math.moneySum(...values), expected, label);
  }

  for (const [input, expected, label] of [
    [{ relevant: false, included: false, warnings: [], blockers: [], missing: [] }, 'excluded', 'componentStatus excluded'],
    [{ relevant: true, included: false, warnings: [], blockers: [], missing: ['x'] }, 'incomplete', 'componentStatus incomplete'],
    [{ relevant: true, included: false, warnings: [], blockers: [], missing: [] }, 'excluded', 'componentStatus excluded when missing empty'],
    [{ relevant: true, included: true, warnings: ['warn'], blockers: [], missing: [] }, 'partial', 'componentStatus partial'],
    [{ relevant: true, included: true, warnings: [], blockers: ['block'], missing: [] }, 'blocked', 'componentStatus blocked'],
    [{ relevant: true, included: true, warnings: [], blockers: [], missing: [] }, 'complete', 'componentStatus complete'],
  ]) {
    checkEqual(math.componentStatus(input), expected, label);
  }

  {
    const previewComponent = math.finalizeComponent({
      componentKey: 'external_preview_adjustments',
      labelTr: 'Harici önizleme düzeltmeleri',
      currencyCode: 'TRY',
      sourceFields: ['a', 'a'],
      amountMinor: -25,
      relevant: true,
      includedInBaseline: false,
      formula: 'preview only',
      calculationEvidence: ['evidence', 'evidence'],
      warnings: ['preview warning'],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: 'preview-only adjustments never touch baseline',
    });
    checkEqual(previewComponent.amountMinor, -25, 'finalizeComponent preserves preview negativity');
    checkEqual(previewComponent.status, 'excluded', 'finalizeComponent preview status');
    checkDeepEqual(previewComponent.sourceFields, ['a'], 'finalizeComponent deduplicates source fields');
    checkDeepEqual(previewComponent.calculationEvidence, ['evidence'], 'finalizeComponent deduplicates evidence');
    assertFrozen(previewComponent, 'finalizeComponent preview object frozen');
  }

  {
    const fuelComponent = math.finalizeComponent({
      componentKey: 'fuel',
      labelTr: 'Yakıt',
      currencyCode: 'TRY',
      sourceFields: ['fuelUnitPriceMinor'],
      amountMinor: -25,
      relevant: true,
      includedInBaseline: true,
      formula: 'fuel',
      calculationEvidence: ['evidence'],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: 'fuel costs are isolated from other per-km buckets',
    });
    checkEqual(fuelComponent.amountMinor, 0, 'finalizeComponent clamps non-preview negative amounts');
    checkEqual(fuelComponent.status, 'complete', 'finalizeComponent non-preview status');
    assertFrozen(fuelComponent, 'finalizeComponent non-preview object frozen');
  }

  const hashA = math.safeHashId({ id: 1, currencyCode: 'TRY' });
  const hashB = math.safeHashId({ id: 1, currencyCode: 'TRY' });
  const hashC = math.safeHashId({ id: 2, currencyCode: 'TRY' });
  checkEqual(hashA.startsWith('ocm_'), true, 'safeHashId prefix');
  checkEqual(hashA, hashB, 'safeHashId deterministic');
  checkEqual(hashA !== hashC, true, 'safeHashId changes with input');

  const issuesA = math.buildIssues();
  const issuesB = math.buildIssues();
  issuesA.warnings.push('x');
  checkEqual(issuesA.warnings.length, 1, 'buildIssues warning sink mutable');
  checkEqual(issuesB.warnings.length, 0, 'buildIssues returns independent warning sinks');

  const normalized = math.baseNormalizedInput({
    currencyCode: ' usd ',
    serviceDistanceKm: 60,
    emptyDistanceKm: 40,
  });
  checkEqual(normalized.currencyCode, 'USD', 'baseNormalizedInput currency normalization');
  checkDeepEqual(normalized._currencyCandidates, ['USD'], 'baseNormalizedInput currency candidates');
  checkEqual(normalized.totalDistanceKm, 100, 'baseNormalizedInput distance derivation');
  checkEqual(normalized._distanceTripletDerived, true, 'baseNormalizedInput derived distance flag');
}

function runOperationalBoundaryChecks() {
  const normalized = model.normalizeOperationalCostInput({
    currencyCode: ' usd ',
    serviceDistanceKm: 60,
    emptyDistanceKm: 40,
  });
  assertFrozen(normalized, 'normalized operational input frozen');
  checkEqual(normalized.currencyCode, 'USD', 'normalized operational input currency');
  checkEqual(normalized.totalDistanceKm, 100, 'normalized operational input total distance');
  checkEqual(normalized._distanceTripletDerived, true, 'normalized operational input derived distance flag');
  checkDeepEqual(normalized._currencyCandidates, ['USD'], 'normalized operational input currency candidates');

  const scenarios = [
    {
      input: withCompleteInput({
        fuelConsumptionLitersPer100Km: 0,
        zeroFuelVehicle: true,
        fuelType: 'electric',
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'zero fuel metadata status');
        checkEqual(component(result, 'fuel').status, 'complete', 'zero fuel metadata fuel status');
        checkEqual(component(result, 'fuel').amountMinor, 0, 'zero fuel metadata fuel amount');
        checkEqual(component(result, 'fuel').warnings.length, 0, 'zero fuel metadata fuel warnings');
        checkEqual(result.baselineOperationalCostMinor, 17675, 'zero fuel metadata baseline');
        checkEqual(result.includedComponentTotalMinor, 17675, 'zero fuel metadata included total');
        checkEqual(result.warnings.length, 0, 'zero fuel metadata warnings empty');
        checkEqual(result.dataQuality.warningCount, 0, 'zero fuel metadata warning count');
      },
    },
    {
      input: withCompleteInput({
        fuelConsumptionLitersPer100Km: 0,
      }),
      verify(result) {
        checkEqual(result.status, 'partial', 'zero fuel warning status');
        checkEqual(component(result, 'fuel').status, 'partial', 'zero fuel warning component status');
        checkIncludes(component(result, 'fuel').warnings, 'fuelConsumptionLitersPer100Km=0 fakat zero-fuel metadata yok', 'zero fuel warning component message');
        checkIncludes(result.warnings, 'Fuel component suspicious zero consumption', 'zero fuel warning top-level message');
        checkEqual(result.baselineOperationalCostMinor, 17675, 'zero fuel warning baseline');
        checkEqual(result.dataQuality.completenessScore, 68, 'zero fuel warning completeness score');
        checkEqual(result.dataQuality.warningCount, 1, 'zero fuel warning data quality warnings');
      },
    },
    {
      input: withCompleteInput({
        fuelCurrencyCode: 'USD',
      }),
      verify(result) {
        checkEqual(result.status, 'blocked', 'mixed currency status');
        checkIncludes(result.blockers, 'mixed currency not allowed', 'mixed currency blocker');
        checkIncludes(result.currencyWarnings, 'Mixed currency not allowed: TRY, USD', 'mixed currency warning');
        checkEqual(result.dataQuality.mixedCurrency, true, 'mixed currency data quality flag');
        checkDeepEqual(result.normalizedInput._currencyCandidates, ['TRY', 'USD'], 'mixed currency candidates');
        checkEqual(result.currencyCode, 'TRY', 'mixed currency selected code');
      },
    },
    {
      input: withCompleteInput({
        idleFuelLiters: 2,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'idle fuel status');
        checkEqual(component(result, 'fuel').amountMinor, 60000, 'idle fuel amount');
        checkIncludes(component(result, 'fuel').calculationEvidence, 'idleFuelLiters açıkça eklendi: 2', 'idle fuel evidence');
        checkEqual(result.baselineOperationalCostMinor, 77675, 'idle fuel baseline');
        checkEqual(result.warnings.length, 0, 'idle fuel warnings empty');
      },
    },
    {
      input: withCompleteInput({
        serviceDistanceKm: 130,
        emptyDistanceKm: 80,
        totalDistanceKm: 200,
      }),
      verify(result) {
        checkEqual(result.status, 'partial', 'distance contradiction status');
        checkEqual(result.normalizedInput._distanceTripletDerived, false, 'distance contradiction derived flag');
        checkIncludes(result.warnings, 'serviceDistanceKm + emptyDistanceKm ile totalDistanceKm çelişiyor', 'distance contradiction warning');
        checkEqual(component(result, 'fuel').amountMinor, 50000, 'distance contradiction fuel amount');
      },
    },
    {
      input: withCompleteInput({
        vehicleFixedCostAllocationMode: 'explicit_allocation',
        explicitVehicleFixedCostAllocatedMinor: 12345,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'vehicle fixed explicit status');
        checkEqual(component(result, 'vehicle_fixed_allocated').status, 'complete', 'vehicle fixed explicit component status');
        checkEqual(component(result, 'vehicle_fixed_allocated').amountMinor, 12345, 'vehicle fixed explicit amount');
        checkEqual(component(result, 'vehicle_fixed_allocated').doubleCountGuard, 'explicit allocation used instead of monthly re-sum', 'vehicle fixed explicit guard');
        checkEqual(result.baselineOperationalCostMinor, 76020, 'vehicle fixed explicit baseline');
      },
    },
    {
      input: withCompleteInput({
        vehicleFixedCostAllocationMode: 'per_service_day',
        allocationServiceDaysPerMonth: 20,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'vehicle fixed per service day status');
        checkEqual(component(result, 'vehicle_fixed_allocated').amountMinor, 8000, 'vehicle fixed per service day amount');
        checkEqual(component(result, 'vehicle_fixed_allocated').doubleCountGuard, 'per_service_day allocation only', 'vehicle fixed per service day guard');
        checkEqual(result.baselineOperationalCostMinor, 71675, 'vehicle fixed per service day baseline');
      },
    },
    {
      input: withCompleteInput({
        vehicleFixedCostAllocationMode: 'per_month_fraction',
        allocationMonthFraction: 0.25,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'vehicle fixed per month fraction status');
        checkEqual(component(result, 'vehicle_fixed_allocated').amountMinor, 10000, 'vehicle fixed per month fraction amount');
        checkEqual(component(result, 'vehicle_fixed_allocated').doubleCountGuard, 'per_month_fraction allocation only', 'vehicle fixed per month fraction guard');
        checkEqual(result.baselineOperationalCostMinor, 73675, 'vehicle fixed per month fraction baseline');
      },
    },
    {
      input: {
        currencyCode: 'TRY',
        vehicleLeaseMonthlyMinor: 20000,
        vehicleDepreciationMonthlyMinor: 10000,
        insuranceMonthlyMinor: 5000,
        taxAndLicenseMonthlyMinor: 5000,
      },
      verify(result) {
        checkEqual(result.status, 'incomplete', 'vehicle fixed missing basis status');
        checkEqual(component(result, 'vehicle_fixed_allocated').status, 'incomplete', 'vehicle fixed missing basis component status');
        checkIncludes(component(result, 'vehicle_fixed_allocated').missingFields, 'vehicleFixedCostAllocationMode', 'vehicle fixed missing basis mode field');
        checkIncludes(component(result, 'vehicle_fixed_allocated').missingFields, 'allocation basis', 'vehicle fixed missing basis basis field');
        checkEqual(result.baselineOperationalCostMinor, 0, 'vehicle fixed missing basis baseline');
      },
    },
    {
      input: withCompleteInput({
        depreciationPerKmMinor: 7,
        vehicleWearPerKmMinor: 2,
      }),
      verify(result) {
        checkEqual(result.status, 'partial', 'vehicle variable overlap status');
        checkEqual(component(result, 'vehicle_variable').status, 'partial', 'vehicle variable overlap component status');
        checkEqual(component(result, 'vehicle_variable').amountMinor, 3000, 'vehicle variable overlap amount');
        checkEqual(component(result, 'vehicle_variable').doubleCountGuard, 'vehicle_wear_excluded_due_to_granular_per_km_costs', 'vehicle variable overlap guard');
        checkEqual(result.doubleCountWarnings.length, 2, 'vehicle variable overlap double count warnings');
        checkEqual(result.baselineOperationalCostMinor, 67675, 'vehicle variable overlap baseline');
      },
    },
    {
      input: withCompleteInput({
        driverBasePerShiftMinor: null,
        driverHourlyCostMinor: 300,
        driverCompensationMode: 'hourly',
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'driver hourly status');
        checkEqual(component(result, 'driver_labor').status, 'complete', 'driver hourly component status');
        checkEqual(component(result, 'driver_labor').amountMinor, 1150, 'driver hourly amount');
        checkEqual(component(result, 'driver_labor').doubleCountGuard, 'hourly base used', 'driver hourly guard');
        checkEqual(result.baselineOperationalCostMinor, 66275, 'driver hourly baseline');
      },
    },
    {
      input: withCompleteInput({
        driverHourlyCostMinor: 300,
        mealAllowancePerShiftMinor: null,
        socialCostAllocationMinor: null,
      }),
      verify(result) {
        checkEqual(result.status, 'blocked', 'driver conflict status');
        checkEqual(component(result, 'driver_labor').status, 'blocked', 'driver conflict component status');
        checkIncludes(component(result, 'driver_labor').blockers, 'driverCompensationMode gerekli; per_shift ve hourly base birlikte verildi', 'driver conflict blocker');
        checkEqual(component(result, 'driver_labor').includedInBaseline, false, 'driver conflict excluded from baseline');
        checkEqual(result.dataQuality.confidenceLevel, 'blocked', 'driver conflict confidence level');
        checkEqual(result.baselineOperationalCostMinor, 65125, 'driver conflict baseline');
      },
    },
    {
      input: withCompleteInput({
        overtimeMinutes: null,
        driverOvertimeHourlyCostMinor: null,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'waiting only status');
        checkEqual(component(result, 'waiting_and_overtime').status, 'complete', 'waiting only component status');
        checkEqual(component(result, 'waiting_and_overtime').amountMinor, 300, 'waiting only amount');
        checkEqual(component(result, 'waiting_and_overtime').doubleCountGuard, 'waiting and overtime kept separate from base labor', 'waiting only guard');
        checkEqual(result.baselineOperationalCostMinor, 67450, 'waiting only baseline');
      },
    },
    {
      input: withCompleteInput({
        routeFeeMinor: 999,
        tollMinor: 10,
        bridgeMinor: 20,
        highwayMinor: null,
        parkingMinor: null,
        terminalMinor: null,
        otherDirectRouteFeeMinor: null,
      }),
      verify(result) {
        checkEqual(result.status, 'partial', 'route fees overlap status');
        checkEqual(component(result, 'route_fees').status, 'partial', 'route fees overlap component status');
        checkEqual(component(result, 'route_fees').amountMinor, 30, 'route fees overlap amount');
        checkEqual(component(result, 'route_fees').doubleCountGuard, 'aggregate_route_fee_excluded_due_to_detail_overlap', 'route fees overlap guard');
        checkEqual(result.doubleCountWarnings.length, 1, 'route fees overlap double count warnings');
        checkEqual(result.baselineOperationalCostMinor, 66955, 'route fees overlap baseline');
      },
    },
    {
      input: withCompleteInput({
        dispatchControlCostMinor: 40,
        trackingTechnologyCostMinor: 30,
        otherOverheadMinor: 10,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'operations overhead controls status');
        checkEqual(component(result, 'operations_overhead').status, 'complete', 'operations overhead controls component status');
        checkEqual(component(result, 'operations_overhead').amountMinor, 6780, 'operations overhead controls amount');
        checkIncludes(component(result, 'operations_overhead').calculationEvidence, 'dispatchControlCostMinor doğrudan toplandı', 'operations overhead dispatch evidence');
        checkIncludes(component(result, 'operations_overhead').calculationEvidence, 'trackingTechnologyCostMinor doğrudan toplandı', 'operations overhead tracking evidence');
        checkIncludes(component(result, 'operations_overhead').calculationEvidence, 'otherOverheadMinor doğrudan toplandı', 'operations overhead other evidence');
      },
    },
    {
      input: {
        currencyCode: 'TRY',
        operationsOverheadRateBps: 500,
      },
      verify(result) {
        checkEqual(result.status, 'incomplete', 'operations overhead missing base status');
        checkEqual(component(result, 'operations_overhead').status, 'incomplete', 'operations overhead missing base component status');
        checkIncludes(component(result, 'operations_overhead').missingFields, 'operationsOverheadRateBaseMinor', 'operations overhead missing base field');
        checkEqual(component(result, 'operations_overhead').amountMinor, 0, 'operations overhead missing base amount');
      },
    },
    {
      input: withPreviewInput({
        hakedisAdjustmentPreviewMinor: -100,
        contractualAdjustmentPreviewMinor: 50,
      }),
      verify(result) {
        checkEqual(result.status, 'partial', 'preview adjustments status');
        checkEqual(component(result, 'external_preview_adjustments').status, 'excluded', 'preview adjustments component status');
        checkEqual(component(result, 'external_preview_adjustments').amountMinor, -300, 'preview adjustments amount');
        checkIncludes(component(result, 'external_preview_adjustments').sourceFields, 'includeExternalPreviewAdjustments', 'preview adjustments source field');
        checkEqual(result.adjustedPreviewCostMinor, 67375, 'preview adjustments adjusted preview');
        checkEqual(result.readOnly, true, 'preview adjustments readOnly');
        checkEqual(result.previewOnly, true, 'preview adjustments previewOnly');
        checkEqual(result.writeAction, false, 'preview adjustments writeAction');
      },
    },
    {
      input: withCompleteInput({
        passengerCount: 50,
        vehicleCapacity: 40,
      }),
      verify(result) {
        checkEqual(result.status, 'blocked', 'passenger capacity status');
        checkIncludes(result.blockers, 'passengerCount vehicleCapacity değerini aşıyor', 'passenger capacity blocker');
        checkEqual(result.dataQuality.blockerCount, 1, 'passenger capacity blocker count');
        checkEqual(result.confidence.level, 'blocked', 'passenger capacity confidence level');
      },
    },
    {
      input: withCompleteInput({
        vehicleRef: '',
        serviceDistanceKm: 0,
        emptyDistanceKm: 0,
        totalDistanceKm: 0,
        routeDurationMinutes: 0,
        shiftCount: 0,
        serviceDayCount: 0,
        tripCount: 0,
        passengerCount: null,
        vehicleCapacity: null,
      }),
      verify(result) {
        checkEqual(result.status, 'complete', 'zero denominator status');
        checkEqual(result.warnings.length, 8, 'zero denominator warnings count');
        checkIncludes(result.warnings, 'costPerServiceKmMinor için payda eksik veya sıfır', 'zero denominator service km warning');
        checkIncludes(result.warnings, 'costPerMinuteMinor için payda eksik veya sıfır', 'zero denominator minute warning');
        checkEqual(result.unitCosts.costPerServiceKmMinor, null, 'zero denominator costPerServiceKmMinor');
        checkEqual(result.unitCosts.costPerTotalKmMinor, null, 'zero denominator costPerTotalKmMinor');
        checkEqual(result.unitCosts.costPerShiftMinor, null, 'zero denominator costPerShiftMinor');
        checkEqual(result.unitCosts.costPerTripMinor, null, 'zero denominator costPerTripMinor');
        checkEqual(result.unitCosts.costPerServiceDayMinor, null, 'zero denominator costPerServiceDayMinor');
        checkEqual(result.unitCosts.costPerPassengerMinor, null, 'zero denominator costPerPassengerMinor');
        checkEqual(result.unitCosts.costPerPassengerKmMinor, null, 'zero denominator costPerPassengerKmMinor');
        checkEqual(result.unitCosts.costPerVehicleMinor, null, 'zero denominator costPerVehicleMinor');
        checkEqual(result.unitCosts.costPerMinuteMinor, null, 'zero denominator costPerMinuteMinor');
      },
    },
  ];

  for (const scenario of scenarios) {
    const result = model.buildOperationalCostModel(scenario.input);
    scenario.verify(result);
  }
}

export function runOperationalCostModelExpansionChecks(checkFn, componentFn) {
  setContext(checkFn, componentFn);
  runMathBoundaryChecks();
  runOperationalBoundaryChecks();
  check(RECOGNIZED_CURRENCY_CODES.has('TRY'), 'currency set includes TRY');
  check(RECOGNIZED_CURRENCY_CODES.has('USD'), 'currency set includes USD');
  check(RECOGNIZED_CURRENCY_CODES.has('EUR'), 'currency set includes EUR');
}
