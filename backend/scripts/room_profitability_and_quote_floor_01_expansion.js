#!/usr/bin/env node

import { buildOperationalCostModel } from "../src/finance/operationalCostModel.js";
import {
  buildCompanyBudgetAndServiceCostPreview,
  buildFinancialOperationsCompanyKindDeniedPreview,
  buildFinancialOperationsScopePreview,
  buildRoomProfitabilityAndQuoteFloorPreview,
  isFinancialOperationsCompanyKindDenied,
} from "../src/finance/roomProfitabilityAndQuoteFloor.js";
import {
  FINANCIAL_OPERATIONS_BLOCK_NAME,
  FINANCIAL_OPERATIONS_EXCLUDED_SCOPE,
  FINANCIAL_OPERATIONS_MILESTONES,
  FINANCIAL_OPERATIONS_NEXT_MILESTONE,
  FINANCIAL_OPERATIONS_REUSE_MAP,
  FINANCIAL_OPERATIONS_ROLE_ACCESS,
  FINANCIAL_OPERATIONS_SCOPE_BOUNDARY,
  FINANCIAL_OPERATIONS_SURFACES,
  buildFinancialOperationsEmptyState,
  buildFinancialOperationsNextMilestoneSummary,
  buildFinancialOperationsRbacDenial,
  buildFinancialOperationsReuseSummary,
  canViewFinancialSurface,
  describeFinancialSurface,
  getFinancialOperationsAccessForRole,
  isAccountingExecutionBlocked,
  isFinancialOperationReadOnlyAction,
  listFinancialSurfacesForRole,
} from "../src/finance/financialOperationsScope.js";

const ALL_ROLES = [
  "SUPER_ADMIN",
  "ROOM",
  "COMPANY",
  "DRIVER",
  "PERSONEL",
  "PARENT",
  "SCHOOL",
  "ORGANIZATION",
  "DEFAULT",
];

const BLOCKED_ACTIONS = [
  "payment execute",
  "hakediş execute",
  "hakedis execute",
  "invoice create",
  "invoice update",
  "invoice delete",
  "accounting posting",
  "muhasebe posting",
  "erp integration",
  "erp live integration",
  "fatura create",
  "fatura update",
  "fatura delete",
  "db write",
  "backend write route",
  "route apply",
  "dispatch apply",
  "shift create",
  "shift update",
  "driver assign",
  "vehicle assign",
  "provider credential management",
  "message send",
  "email send",
  "sms send",
  "push send",
];

let externalCheck = null;

function setContext(checkFn) {
  externalCheck = checkFn;
}

function check(condition, label, detail = "") {
  if (typeof externalCheck !== "function") {
    throw new Error("Expansion check context not initialized");
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

function component(result, key) {
  return result?.operationalCostModel?.components?.find((item) => item.componentKey === key);
}

function buildFullCostInputs(overrides = {}) {
  return {
    currencyCode: "TRY",
    sourceType: "route_preview",
    sourceRef: "route-1",
    routeRef: "route-1",
    vehicleRef: "vehicle-1",
    driverRef: "driver-1",
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
    vehicleFixedCostAllocationMode: "per_shift",
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
    qualityAdjustmentPreviewMinor: -250,
    includeExternalPreviewAdjustments: true,
    ...overrides,
  };
}

function buildRoomPreviewArgs(overrides = {}) {
  return {
    role: "ROOM",
    companyKind: "COMPANY",
    room: { id: 10, name: "Demo Room", kind: "ROOM" },
    company: { id: 20, name: "Demo Company", kind: "COMPANY" },
    shift: {
      id: 300,
      roomId: 10,
      companyId: 20,
      status: "APPROVED",
      routeSnapshotDistanceM: 12000,
      routeSnapshotDurationSec: 2400,
      requiredPaxOverride: 24,
      roomOfferAmount: 180000,
      companyOfferAmount: 150000,
      _count: { people: 22 },
      vehicle: { capacity: 30 },
    },
    agreement: {
      id: 400,
      roomId: 10,
      companyId: 20,
      roomOfferAmount: 175000,
      companyOfferAmount: 155000,
      status: "ACTIVE",
    },
    roomSummary: {
      cards: {
        approvedOrActiveShifts: 2,
        activeAgreements: 1,
        openOffers: 1,
        counteredOffers: 1,
        requestedAgreements: 1,
      },
    },
    costInputs: buildFullCostInputs(),
    quoteFloorInputs: {
      manualBaselineOperationalCostMinor: 100000,
      targetContributionBps: 1200,
      riskReserveBps: 300,
    },
    ...overrides,
  };
}

function buildCompanyPreviewArgs(overrides = {}) {
  return {
    role: "COMPANY",
    companyKind: "COMPANY",
    company: { id: 21, name: "Company Demo", kind: "COMPANY" },
    shift: {
      id: 301,
      roomId: 11,
      companyId: 21,
      status: "ACTIVE",
      routeSnapshotDistanceM: 9000,
      routeSnapshotDurationSec: 1800,
      requiredPaxOverride: 18,
      roomOfferAmount: 200000,
      companyOfferAmount: 220000,
      _count: { people: 17 },
      vehicle: { capacity: 20 },
    },
    agreement: {
      id: 401,
      roomId: 11,
      companyId: 21,
      roomOfferAmount: 205000,
      companyOfferAmount: 225000,
      status: "ACTIVE",
    },
    companySummary: {
      cards: {
        todayAgreements: 3,
        activeShiftCount: 2,
        activeAgreements: 1,
        openOffersCount: 1,
        counterShiftCount: 1,
        requestedAgreements: 1,
      },
    },
    costInputs: buildFullCostInputs(),
    quoteFloorInputs: {
      manualBaselineOperationalCostMinor: 90000,
      targetContributionBps: 1000,
      riskReserveBps: 200,
    },
    ...overrides,
  };
}

function runBoundaryChecks() {
  checkEqual(FINANCIAL_OPERATIONS_BLOCK_NAME, "FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01", "block name");
  checkEqual(FINANCIAL_OPERATIONS_NEXT_MILESTONE, "OPERATIONAL-COST-MODEL-01", "next milestone");
  checkEqual(FINANCIAL_OPERATIONS_MILESTONES.length, 8, "milestone count");
  checkDeepEqual(FINANCIAL_OPERATIONS_MILESTONES.slice(0, 3), [
    "FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01",
    "OPERATIONAL-COST-MODEL-01",
    "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
  ], "milestone order prefix");
  check(FINANCIAL_OPERATIONS_MILESTONES.includes("ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01"), "milestone tail present");
  check(Object.isFrozen(FINANCIAL_OPERATIONS_SURFACES), "surface registry frozen");
  check(Object.isFrozen(FINANCIAL_OPERATIONS_ROLE_ACCESS), "role access registry frozen");
  check(FINANCIAL_OPERATIONS_SURFACES.length === 13, "surface registry size");
  check(FINANCIAL_OPERATIONS_REUSE_MAP.length >= 13, "reuse map size");
  check(FINANCIAL_OPERATIONS_SCOPE_BOUNDARY.includes("preview surfaces plus company budget lifecycle"), "scope boundary lifecycle");
  check(FINANCIAL_OPERATIONS_SCOPE_BOUNDARY.includes("no write-action"), "scope boundary no write");
  check(FINANCIAL_OPERATIONS_SCOPE_BOUNDARY.includes("tenant isolation preserved"), "scope boundary tenant isolation");
  check(FINANCIAL_OPERATIONS_EXCLUDED_SCOPE.includes("provider credential read/write/use"), "excluded scope provider credential");
  check(FINANCIAL_OPERATIONS_EXCLUDED_SCOPE.includes("dispatch apply"), "excluded scope dispatch apply");
  check(FINANCIAL_OPERATIONS_EXCLUDED_SCOPE.includes("route apply"), "excluded scope route apply");
  check(FINANCIAL_OPERATIONS_EXCLUDED_SCOPE.includes("driver/vehicle assignment"), "excluded scope driver/vehicle assignment");
  check(FINANCIAL_OPERATIONS_EXCLUDED_SCOPE.includes("message/email/SMS/push"), "excluded scope messaging");
}

function runSurfaceRegistryChecks() {
  for (const surface of FINANCIAL_OPERATIONS_SURFACES) {
    check(Object.isFrozen(surface), `surface frozen ${surface.id}`);
    check(surface.title.length > 0, `surface title ${surface.id}`);
    check(surface.nextMilestone.length > 0, `surface next milestone ${surface.id}`);
    check(surface.reuseCapabilities.length > 0, `surface reuse capabilities ${surface.id}`);
    check(surface.excludedScope.length > 0, `surface excluded scope ${surface.id}`);
    check(surface.readOnlyActions.length > 0, `surface read only actions ${surface.id}`);
  }
}

function runRoleAccessChecks() {
  for (const role of ALL_ROLES) {
    const access = getFinancialOperationsAccessForRole(role);
    const expectedIds = FINANCIAL_OPERATIONS_SURFACES
      .filter((surface) => surface.visibleToRoles.includes(role))
      .map((surface) => surface.id);
    const expectedTitles = expectedIds
      .map((id) => FINANCIAL_OPERATIONS_SURFACES.find((surface) => surface.id === id)?.title || id);

    checkEqual(access.role, role, `access role ${role}`);
    checkDeepEqual(access.visibleSurfaceIds, expectedIds, `visible ids ${role}`);
    checkDeepEqual(access.visibleSurfaceTitles, expectedTitles, `visible titles ${role}`);
    checkDeepEqual(listFinancialSurfacesForRole(role).map((surface) => surface.id), expectedIds, `listed ids ${role}`);
    check(access.tenantIsolationText.includes("Tenant isolation"), `tenant isolation text ${role}`);
  }
}

function runSurfaceMatrixChecks() {
  for (const role of ALL_ROLES) {
    for (const surface of FINANCIAL_OPERATIONS_SURFACES) {
      const expectedAllowed = surface.visibleToRoles.includes(role);
      const description = describeFinancialSurface(surface.id, role);
      check(canViewFinancialSurface(role, surface.id) === expectedAllowed, `can view ${role} ${surface.id}`);
      check(description.allowed === expectedAllowed, `describe allowed ${role} ${surface.id}`);
    }
  }
}

function runReuseChecks() {
  const reuseSummary = buildFinancialOperationsReuseSummary();
  const nextSummary = buildFinancialOperationsNextMilestoneSummary();
  checkEqual(reuseSummary.items.length, FINANCIAL_OPERATIONS_REUSE_MAP.length, "reuse summary count");
  check(reuseSummary.nextAction.includes(FINANCIAL_OPERATIONS_NEXT_MILESTONE), "reuse summary next action milestone");
  checkEqual(nextSummary.currentMilestone, FINANCIAL_OPERATIONS_BLOCK_NAME, "next summary current milestone");
  checkEqual(nextSummary.nextMilestone, FINANCIAL_OPERATIONS_NEXT_MILESTONE, "next summary next milestone");
  checkDeepEqual(nextSummary.milestoneOrder, FINANCIAL_OPERATIONS_MILESTONES, "next summary order");
  checkDeepEqual(nextSummary.noWriteBoundary, FINANCIAL_OPERATIONS_SCOPE_BOUNDARY, "next summary boundary");

  for (const item of FINANCIAL_OPERATIONS_REUSE_MAP) {
    check(item.capability.length > 0, `reuse capability ${item.capability}`);
    check(item.milestone.length > 0, `reuse milestone ${item.capability}`);
    check(item.sourceFiles.length > 0, `reuse sources ${item.capability}`);
    check(item.surfaces.length > 0, `reuse surfaces ${item.capability}`);
  }
}

function runActionClassificationChecks() {
  for (const action of BLOCKED_ACTIONS) {
    check(isAccountingExecutionBlocked(action) === true, `blocked action ${action}`);
    check(isFinancialOperationReadOnlyAction(action) === false, `blocked not read-only ${action}`);
  }

  for (const surface of FINANCIAL_OPERATIONS_SURFACES) {
    check(
      isFinancialOperationReadOnlyAction(surface.id) === (surface.id === "company_budget" ? false : true),
      `surface read-only action ${surface.id}`,
    );
    check(isAccountingExecutionBlocked(surface.id) === false, `surface not blocked action ${surface.id}`);
  }

  for (const action of ["overview", "summary", "preview", "compare", "policy", "rbac"]) {
    check(isFinancialOperationReadOnlyAction(action) === true, `generic read-only action ${action}`);
    check(isAccountingExecutionBlocked(action) === false, `generic not blocked action ${action}`);
  }
}

function runPreviewChecks() {
  const roomBase = buildRoomPreviewArgs();
  const companyBase = buildCompanyPreviewArgs();

  const roomPreview = buildRoomProfitabilityAndQuoteFloorPreview(roomBase);
  const roomDirectModel = buildOperationalCostModel(roomPreview.modelInput);
  checkDeepEqual(roomPreview.operationalCostModel, roomDirectModel, "room preview model parity");
  check(roomPreview.allowed === true, "room preview allowed");
  check(roomPreview.readOnly === true, "room preview read-only");
  check(roomPreview.previewOnly === true, "room preview preview-only");
  check(roomPreview.writeAction === false, "room preview no write action");
  check(roomPreview.scope === "ROOM", "room preview scope");
  check(roomPreview.surfaceId === "room_profitability", "room preview surface id");
  checkEqual(roomPreview.operationalCostModel.status, "incomplete", "room model status");
  checkEqual(roomPreview.operationalCostModel.baselineOperationalCostMinor, 63675, "room model baseline");
  checkEqual(roomPreview.operationalCostModel.adjustedPreviewCostMinor, 63425, "room model adjusted preview");
  checkEqual(roomPreview.operationalCostModel.dataQuality.completenessScore, 68, "room model completeness");
  checkEqual(roomPreview.operationalCostModel.confidence.level, "medium", "room model confidence");
  checkEqual(component(roomPreview, "fuel").amountMinor, 50000, "room fuel amount");
  checkEqual(component(roomPreview, "vehicle_fixed_allocated").amountMinor, 0, "room vehicle fixed amount");
  checkEqual(component(roomPreview, "vehicle_fixed_allocated").status, "incomplete", "room vehicle fixed status");
  checkIncludes(component(roomPreview, "vehicle_fixed_allocated").missingFields || [], "vehicleFixedCostAllocationMode", "room vehicle fixed missing mode");
  checkIncludes(component(roomPreview, "vehicle_fixed_allocated").missingFields || [], "allocation basis", "room vehicle fixed missing basis");
  checkEqual(component(roomPreview, "vehicle_variable").amountMinor, 3000, "room vehicle variable amount");
  checkEqual(component(roomPreview, "driver_labor").amountMinor, 2550, "room driver labor amount");
  checkEqual(component(roomPreview, "waiting_and_overtime").amountMinor, 525, "room waiting amount");
  checkEqual(component(roomPreview, "route_fees").amountMinor, 750, "room route fees amount");
  checkEqual(component(roomPreview, "operations_overhead").amountMinor, 6700, "room overhead amount");
  checkEqual(component(roomPreview, "other_direct_cost").amountMinor, 150, "room other direct cost amount");
  checkEqual(component(roomPreview, "external_preview_adjustments").amountMinor, -250, "room preview adjustments amount");
  checkEqual(roomPreview.roomProfitability?.profitMinor, 80000, "room profit amount");
  checkEqual(roomPreview.roomProfitability?.marginBps, 4444, "room margin bps");
  checkEqual(roomPreview.quoteFloor?.quoteFloorMinor, 115000, "room quote floor");
  checkEqual(roomPreview.quoteFloor?.quoteFloorPerPassengerMinor, 5227, "room quote floor per passenger");
  checkEqual(roomPreview.quoteFloor?.marginGapMinor, 65000, "room quote gap");
  check(roomPreview.summaryText.includes("read-only"), "room summary copy");
  check(roomPreview.nextAction.includes("Quote floor"), "room next action copy");
  check(roomPreview.companyBudget === null, "room company budget hidden");

  const companyPreview = buildCompanyBudgetAndServiceCostPreview(companyBase);
  const companyDirectModel = buildOperationalCostModel(companyPreview.modelInput);
  checkDeepEqual(companyPreview.operationalCostModel, companyDirectModel, "company preview model parity");
  check(companyPreview.allowed === true, "company preview allowed");
  check(companyPreview.readOnly === true, "company preview read-only");
  check(companyPreview.previewOnly === true, "company preview preview-only");
  check(companyPreview.writeAction === false, "company preview no write action");
  check(companyPreview.scope === "COMPANY", "company preview scope");
  check(companyPreview.surfaceId === "company_budget", "company preview surface id");
  checkEqual(companyPreview.operationalCostModel.status, "incomplete", "company model status");
  checkEqual(companyPreview.operationalCostModel.baselineOperationalCostMinor, 63675, "company model baseline");
  checkEqual(companyPreview.quoteFloor?.quoteFloorMinor, 100800, "company quote floor");
  checkEqual(companyPreview.quoteFloor?.quoteFloorPerPassengerMinor, 5929, "company quote floor per passenger");
  checkEqual(companyPreview.companyBudget?.budgetGapMinor, 119200, "company budget gap");
  checkEqual(companyPreview.companyBudget?.serviceCostMinor, 100800, "company service cost");
  check(companyPreview.roomProfitability === null, "company room profitability hidden");
  check(companyPreview.summaryText.includes("read-only"), "company summary copy");
  check(companyPreview.nextAction.includes("Bütçe"), "company next action copy");

  for (const companyKind of ["SCHOOL", "ORGANIZATION"]) {
    const deniedPreview = buildFinancialOperationsCompanyKindDeniedPreview({
      role: "COMPANY",
      companyKind,
      scope: "COMPANY",
    });
    check(deniedPreview.allowed === false, `denied preview allowed false ${companyKind}`);
    check(deniedPreview.deniedByCompanyKind === true, `denied preview company kind flag ${companyKind}`);
    check(deniedPreview.readOnly === true, `denied preview read only ${companyKind}`);
    check(deniedPreview.writeAction === false, `denied preview write action ${companyKind}`);
    check(isFinancialOperationsCompanyKindDenied(companyKind) === true, `company kind denied helper ${companyKind}`);
  }
  check(isFinancialOperationsCompanyKindDenied("COMPANY") === false, "company kind allowed helper");

  const roomScopePreview = buildFinancialOperationsScopePreview({
    scope: "ROOM",
    ...roomBase,
  });
  const companyScopePreview = buildFinancialOperationsScopePreview({
    scope: "COMPANY",
    ...companyBase,
  });
  const fallbackScopePreview = buildFinancialOperationsScopePreview({
    scope: "unknown",
    ...roomBase,
  });
  checkEqual(roomScopePreview.surfaceId, "room_profitability", "room scope dispatch");
  checkEqual(companyScopePreview.surfaceId, "company_budget", "company scope dispatch");
  checkEqual(fallbackScopePreview.surfaceId, "room_profitability", "fallback scope dispatch");

  const roomNoBaselinePreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      quoteFloorInputs: {
        targetContributionBps: 1200,
        riskReserveBps: 300,
      },
    }),
  );
  check(roomNoBaselinePreview.quoteFloor?.computed === true, "room missing baseline fallback quote floor");
  checkEqual(roomNoBaselinePreview.quoteFloor?.baselineSource, "incomplete", "room missing baseline source");
  checkEqual(roomNoBaselinePreview.quoteFloor?.baselineOperationalCostMinor, 63425, "room missing baseline fallback amount");
  checkEqual(roomNoBaselinePreview.quoteFloor?.quoteFloorMinor, 72939, "room missing baseline fallback floor");
  check(roomNoBaselinePreview.roomProfitability?.summaryText.includes("read-only"), "room missing baseline profitability summary");

  const roomNoReservePreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      quoteFloorInputs: {
        manualBaselineOperationalCostMinor: 100000,
        targetContributionBps: 1200,
      },
    }),
  );
  check(roomNoReservePreview.quoteFloor?.computed === false, "room missing reserve quote floor");
  checkIncludes(roomNoReservePreview.quoteFloor?.missingFields || [], "riskReserveBps", "room missing reserve field");
  check(roomNoReservePreview.quoteFloor?.summaryText.includes("açık parametreler"), "room missing reserve summary");

  const roomNoTargetPreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      quoteFloorInputs: {
        manualBaselineOperationalCostMinor: 100000,
        riskReserveBps: 300,
      },
    }),
  );
  check(roomNoTargetPreview.quoteFloor?.computed === false, "room missing target quote floor");
  checkIncludes(roomNoTargetPreview.quoteFloor?.missingFields || [], "targetContributionBps", "room missing target field");
  check(roomNoTargetPreview.quoteFloor?.summaryText.includes("açık parametreler"), "room missing target summary");

  const roomLowOfferPreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      shift: {
        ...roomBase.shift,
        roomOfferAmount: 95000,
        companyOfferAmount: 94000,
      },
      agreement: {
        ...roomBase.agreement,
        roomOfferAmount: 94000,
        companyOfferAmount: 93000,
      },
    }),
  );
  checkEqual(roomLowOfferPreview.roomProfitability?.profitMinor, -5000, "room low offer profit");
  checkEqual(roomLowOfferPreview.roomProfitability?.marginBps, -526, "room low offer margin");
  checkEqual(roomLowOfferPreview.quoteFloor?.marginGapMinor, -20000, "room low offer quote gap");

  const roomBreakEvenPreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      shift: {
        ...roomBase.shift,
        roomOfferAmount: 100000,
        companyOfferAmount: 99000,
      },
      agreement: {
        ...roomBase.agreement,
        roomOfferAmount: 100000,
        companyOfferAmount: 99000,
      },
    }),
  );
  checkEqual(roomBreakEvenPreview.roomProfitability?.profitMinor, 0, "room break even profit");
  checkEqual(roomBreakEvenPreview.roomProfitability?.marginBps, 0, "room break even margin");
  checkEqual(roomBreakEvenPreview.quoteFloor?.marginGapMinor, -15000, "room break even quote gap");

  const roomFloorHitPreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      shift: {
        ...roomBase.shift,
        roomOfferAmount: 115000,
        companyOfferAmount: 114000,
      },
      agreement: {
        ...roomBase.agreement,
        roomOfferAmount: 115000,
        companyOfferAmount: 114000,
      },
    }),
  );
  checkEqual(roomFloorHitPreview.roomProfitability?.profitMinor, 15000, "room floor hit profit");
  checkEqual(roomFloorHitPreview.roomProfitability?.marginBps, 1304, "room floor hit margin");
  checkEqual(roomFloorHitPreview.quoteFloor?.marginGapMinor, 0, "room floor hit quote gap");

  const roomHighOfferPreview = buildRoomProfitabilityAndQuoteFloorPreview(
    buildRoomPreviewArgs({
      shift: {
        ...roomBase.shift,
        roomOfferAmount: 130000,
        companyOfferAmount: 125000,
      },
      agreement: {
        ...roomBase.agreement,
        roomOfferAmount: 130000,
        companyOfferAmount: 125000,
      },
    }),
  );
  checkEqual(roomHighOfferPreview.roomProfitability?.profitMinor, 30000, "room high offer profit");
  checkEqual(roomHighOfferPreview.roomProfitability?.marginBps, 2308, "room high offer margin");
  checkEqual(roomHighOfferPreview.quoteFloor?.marginGapMinor, 15000, "room high offer quote gap");

  const roomDeniedState = buildFinancialOperationsRbacDenial("ROOM", "company_budget");
  const roomEmptyState = buildFinancialOperationsEmptyState("ROOM", "room_profitability");
  check(roomDeniedState.allowed === false, "room denied state allowed false");
  check(roomDeniedState.readOnly === true, "room denied state read only");
  check(roomDeniedState.summaryText.includes("read-only/preview"), "room denied state copy");
  check(roomEmptyState.allowed === true, "room empty state allowed");
  check(roomEmptyState.readOnly === true, "room empty state read only");
  check(roomEmptyState.summaryText.includes("henüz veri yok"), "room empty state copy");
  check(roomEmptyState.nextAction.includes(FINANCIAL_OPERATIONS_NEXT_MILESTONE), "room empty state next action");

  const companyDeniedState = buildFinancialOperationsRbacDenial("COMPANY", "room_profitability");
  const companyEmptyState = buildFinancialOperationsEmptyState("COMPANY", "company_budget");
  check(companyDeniedState.allowed === false, "company denied state allowed false");
  check(companyDeniedState.readOnly === true, "company denied state read only");
  check(companyDeniedState.summaryText.includes("read-only/preview"), "company denied state copy");
  check(companyEmptyState.allowed === true, "company empty state allowed");
  check(companyEmptyState.readOnly === false, "company empty state read only");
  check(companyEmptyState.summaryText.includes("henüz veri yok"), "company empty state copy");
  check(companyEmptyState.nextAction.includes(FINANCIAL_OPERATIONS_NEXT_MILESTONE), "company empty state next action");

  const unknownSurface = describeFinancialSurface("unknown-surface", "ROOM");
  check(unknownSurface.exists === false, "unknown surface exists false");
  check(unknownSurface.allowed === false, "unknown surface allowed false");
  check(unknownSurface.previewOnly === true, "unknown surface preview only");
}

export function runRoomProfitabilityAndQuoteFloorExpansionChecks(checkFn) {
  setContext(checkFn);
  runBoundaryChecks();
  runSurfaceRegistryChecks();
  runRoleAccessChecks();
  runSurfaceMatrixChecks();
  runReuseChecks();
  runActionClassificationChecks();
  runPreviewChecks();
}
