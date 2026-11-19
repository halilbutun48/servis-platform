import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { httpError } from "../errors/http.js";
import { prisma } from "../prisma.js";
import {
  buildRoomCommercialSummary,
  buildRoomCommercialItems,
} from "../ops/commercialCoreManifest.js";
import {
  buildContractMonthDecisionSummary,
  buildNewOfferDecisionSummary,
  buildRoomProfitabilityAndQuoteFloorPreview,
  selectContractShiftIds,
} from "../finance/roomProfitabilityAndQuoteFloor.js";
import {
  buildPeriodCostInputOverrides,
  buildPeriodPlanningSummary,
  buildContractlessServicePeriodPlanningScope,
  buildServicePeriodPlanningScope,
} from "../finance/servicePeriodPlanning.js";
import { buildRealizedIncomeEvidence } from "../finance/accountingExportContract.js";
import {
  applyRoomQuoteFloorDraft,
  buildRoomQuoteFloorDraftScopeHash,
  archiveRoomQuoteFloorDraft,
  createRoomIncomeChain,
  getRoomQuoteFloorDraftOverview,
  removeStaleRoomQuoteFloorDraftInputs,
  resolveRoomQuoteFloorDraftScope,
  saveRoomQuoteFloorDraft,
  scopeRoomQuoteFloorDraftOverview,
} from "../services/financialOperationsLifecycle.js";
import { completeRoomTestSimulatedService } from "../services/roomTestSimulatedService.js";
import { resolveAgreementSourceShiftPayload } from "../services/agreementSourceShift.js";
import { buildOperationalCostInputs } from "../finance/roomCostLedger.js";
import { buildCostAllocationProjection, buildForecastCostAllocationProjection } from "../finance/roomCostAllocation.js";
import {
  adaptLedgerEntriesToOperationalInputs,
  buildRoomPlanningEvidence,
} from "../finance/roomCostPreviewAdapter.js";
import {
  filterServiceCostEntriesForContext,
  buildVehicleMonthDecisionSummary,
  resolveServiceCostContext,
  operationalFilterFromQuery,
  operationalFilterScopeViolation,
  requiresExplicitServiceSelection,
  selectedRoomMarketOffer,
  serviceCostSelectionFromPayload,
  serviceCostSelectionFromQuery,
  serviceCostShiftWhere,
} from "../finance/roomServiceCostContext.js";
import { buildAccountingPeriodReadinessFromSources } from "../finance/roomAccountingPeriod.js";
import { getAccountingPeriod } from "../finance/roomAccountingPeriodLedger.js";
import {
  canonicalEmptyDistanceForRoute,
  canonicalFuelTypeForVehicle,
} from "../finance/vehicleConsumptionReferences.js";
import { resolveReusableVehiclePlanningProfile } from "../finance/roomVehiclePlanningEvidence.js";
import { getReferenceLayers } from "../externalCost/externalCostReferenceService.js";
import {
  applyIncomePeriodCorrection,
  listIncomePeriodCorrections,
} from "../finance/incomePeriodCorrection.js";
import { buildRoomMonthlyPriceReference } from "../finance/roomMonthlyPriceReference.js";
import { loadControlledDemoPlatformReference } from "../finance/platformAgreementReferenceData.js";

function fuelFamilyForVehicle(shift) {
  const fuelType = String(shift?.vehicle?.fuelType || "").trim().toUpperCase();
  if (["GASOLINE", "GASOLINE_95", "BENZIN", "BENZIN_95"].includes(fuelType)) return "FUEL_GASOLINE_95";
  if (["LPG", "OTOGAZ"].includes(fuelType)) return "FUEL_LPG";
  // Current fleet metadata has a diesel class reference but does not claim
  // that the vehicle fuel type is verified. The resolver keeps that gap
  // visible; this family selection only lets the sourced price be shown as a
  // guarded estimate.
  return "FUEL_DIESEL";
}

async function loadCanonicalFuelReference({ shift, room, actor } = {}) {
  if (!shift?.vehicle?.type) return null;
  const regionName = room?.region?.name || shift?.room?.region?.name || shift?.company?.region?.name || null;
  return getReferenceLayers({
    family: fuelFamilyForVehicle(shift),
    unit: "CURRENCY_PER_L",
    currencyCode: "TRY",
    regionName,
    scopeType: regionName ? "CITY" : "GLOBAL",
    scope: "ROOM",
  }, actor);
}

function canonicalFuelContext(shift, fuelReference = null, planningInputs = {}) {
  const distanceKm = Number(shift?.routeSnapshotDistanceM) > 0
    ? Number((Number(shift.routeSnapshotDistanceM) / 1000).toFixed(2))
    : null;
  const vehicleType = shift?.vehicle?.type || null;
  const explicitFuelType = planningInputs?.fuelType || shift?.vehicle?.fuelType || null;
  return {
    canonicalFuelProfile: {
      vehicleType,
      // The fleet schema has no fuelType column. For a recognized vehicle
      // class, use the versioned technical class reference as a guarded
      // planning profile; this is not a claim about measured vehicle/GPS
      // consumption and remains visible through the reference layer.
      fuelType: explicitFuelType || canonicalFuelTypeForVehicle(vehicleType),
      fuelTypeSource: planningInputs?.fuelType ? "SCENARIO_INPUT" : explicitFuelType ? "FLEET_PROFILE" : "TECHNICAL_CLASS_REFERENCE",
      actualConsumptionLitersPer100Km: shift?.vehicle?.fuelConsumptionLitersPer100Km ?? null,
      actualConsumptionReference: shift?.vehicle?.fuelConsumptionReference || null,
    },
    canonicalFuelReference: fuelReference,
    canonicalRoute: {
      serviceDistanceKm: distanceKm,
      totalDistanceKm: shift?.emptyDistanceKm != null && distanceKm != null
        ? Number((distanceKm + Number(shift.emptyDistanceKm)).toFixed(2))
        : distanceKm,
      emptyDistanceKm: canonicalEmptyDistanceForRoute({
        pattern: shift?.pattern,
        routeSnapshotDistanceM: shift?.routeSnapshotDistanceM,
        emptyDistanceKm: shift?.emptyDistanceKm,
        emptyDistanceEvidence: Boolean(shift?.emptyDistanceEvidenceRef && shift?.emptyDistanceReason),
      }),
      source: "DB_ROUTE_SNAPSHOT",
    },
  };
}

function planningInputsFromPayload(payload = {}) {
  const fields = [
    "emptyDistanceKm",
    "fuelType",
    "fuelConsumptionLitersPer100Km",
    "fuelUnitPriceMinor",
    "driverBasePerShiftMinor",
    "driverCompensationMode",
    "maintenancePerKmMinor",
    "vehicleLeaseMonthlyMinor",
    "fixedVehicleCostMonthlyMinor",
    "vehicleFixedCostAllocationMode",
    "allocationServiceDaysPerMonth",
    "targetContributionBps",
    "riskReserveBps",
    "quoteScenarioAmountMinor",
  ];
  return Object.fromEntries(fields
    .filter((field) => payload?.[field] !== undefined && payload?.[field] !== null && String(payload[field]).trim() !== "")
    .map((field) => [field, payload[field]]));
}

export function buildRoomQuoteDraftServiceContext({ room, agreement, latestShift = null, planningSourceShift = null } = {}) {
  const selectedShift = latestShift || planningSourceShift || null;
  const hasAgreement = Number(agreement?.id || 0) > 0;
  const hasSelectedShift = Number(selectedShift?.id || 0) > 0
    && Number(selectedShift?.roomId || room?.id || 0) === Number(room?.id || 0);
  if (!room?.id || (!hasAgreement && !hasSelectedShift)) return null;
  const sourceShift = planningSourceShift || latestShift || null;
  const context = {
    roomId: Number(room.id),
    companyId: Number(agreement?.companyId || 0) || null,
    agreementId: hasAgreement ? Number(agreement.id) : null,
    shiftId: Number(latestShift?.id || 0) || null,
    sourceShiftId: Number(planningSourceShift?.id || 0) || null,
    vehicleId: Number(latestShift?.vehicle?.id || latestShift?.vehicleId || agreement?.vehicleId || 0) || null,
    periodStart: hasAgreement ? agreement.startDate : dateOnlyForPeriod(selectedShift.startAt),
    periodEnd: hasAgreement ? agreement.endDate : dateOnlyForPeriod(selectedShift.endAt || selectedShift.startAt),
    agreementUpdatedAt: hasAgreement ? agreement.updatedAt || null : null,
    sourceShiftUpdatedAt: sourceShift?.updatedAt || null,
  };
  if (!context.shiftId && hasSelectedShift) context.shiftId = Number(selectedShift.id);
  if (!context.sourceShiftId && hasSelectedShift) context.sourceShiftId = Number(selectedShift.id);
  if (!context.companyId && hasSelectedShift) context.companyId = Number(selectedShift.companyId || 0) || null;
  return {
    ...context,
    scopeHash: buildRoomQuoteFloorDraftScopeHash(context),
  };
}

function assertRoomQuoteDraftContextFresh(body = {}, currentContext = null, { requireHash = false } = {}) {
  const supplied = String(body?.quoteContextHash || body?.serviceContext?.scopeHash || "").trim();
  if ((requireHash || supplied) && supplied !== String(currentContext?.scopeHash || "")) {
    throw httpError(409, "ROOM_QUOTE_FLOOR_DRAFT_STALE_CONTEXT", "Teklif taslağı güncel hizmet bağlamıyla eşleşmiyor; sayfayı yenileyip tekrar deneyin.");
  }
}

function resolveRoomQuoteDraftPlanningContext(context, selection = {}) {
  const selected = resolveServiceCostContext({
    agreement: context.latestAgreement,
    shift: context.latestShift,
    requestedVehicleId: selection.vehicleId,
  });
  if (selected.coherent) return selected;
  const source = context.planningSourceShift;
  if (context.latestAgreement
    && source
    && Number(source.roomId || 0) === Number(context.room?.id || 0)
    && Number(source.companyId || 0) === Number(context.latestAgreement.companyId || 0)
    && !selection.shiftId
    && !selection.vehicleId) {
    return {
      coherent: true,
      reason: null,
      agreement: context.latestAgreement,
      shift: source,
      planningOnly: true,
    };
  }
  return selected;
}

function hasPlanningInput(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function quotePlanningTargetPeriod(shift, agreement) {
  const periodStart = dateOnlyForPeriod(shift?.startAt || agreement?.startDate);
  const periodEnd = dateOnlyForPeriod(shift?.endAt || agreement?.endDate || shift?.startAt || agreement?.startDate);
  if (!validDecisionPeriod(periodStart) || !validDecisionPeriod(periodEnd) || periodStart > periodEnd) return null;
  return { periodStart, periodEnd };
}

function applyReusableVehiclePlanningProfile({ requestInputs = {}, context, selection = {}, shift = null, agreement = null } = {}) {
  const targetPeriod = quotePlanningTargetPeriod(shift, agreement);
  const vehicleId = selection.vehicleId || shift?.vehicleId || shift?.vehicle?.id || agreement?.vehicleId || null;
  const vehicleType = shift?.vehicle?.type || null;
  if (!targetPeriod || !context?.planningInputs || !context?.vehicleFleet?.length) {
    return { inputs: { ...requestInputs }, profile: null, targetPeriod };
  }

  const profile = resolveReusableVehiclePlanningProfile({
    entries: context.planningInputs.entries || [],
    vehicleFleet: context.vehicleFleet,
    vehicleId,
    vehicleType,
    targetPeriod,
  });
  if (!profile || profile.status !== "APPLICABLE") {
    return { inputs: { ...requestInputs }, profile, targetPeriod };
  }

  const inputs = { ...requestInputs };
  const ownershipFields = [
    "vehicleLeaseMonthlyMinor",
    "vehicleDepreciationMonthlyMinor",
    "insuranceMonthlyMinor",
    "taxAndLicenseMonthlyMinor",
    "fixedVehicleCostMonthlyMinor",
  ];
  const hasExplicitOwnership = ownershipFields.some((field) => hasPlanningInput(inputs[field]));
  const appliedFields = [];
  if (!hasExplicitOwnership) {
    inputs.fixedVehicleCostMonthlyMinor = profile.input.fixedVehicleCostMonthlyMinor;
    appliedFields.push("fixedVehicleCostMonthlyMinor");
  }
  if (!hasPlanningInput(inputs.allocationServiceDaysPerMonth)) {
    inputs.allocationServiceDaysPerMonth = profile.input.allocationServiceDaysPerMonth;
    appliedFields.push("allocationServiceDaysPerMonth");
  }
  if (!hasPlanningInput(inputs.vehicleFixedCostAllocationMode)) {
    inputs.vehicleFixedCostAllocationMode = profile.input.vehicleFixedCostAllocationMode;
    appliedFields.push("vehicleFixedCostAllocationMode");
  }
  // A single selected service day is a directly observed scope. Do not infer
  // movement count or a multi-day calendar from a date range.
  if (!hasPlanningInput(inputs.serviceDayCount) && targetPeriod.periodStart === targetPeriod.periodEnd) {
    inputs.serviceDayCount = 1;
    appliedFields.push("serviceDayCount");
  }
  // A focused contractless quote belongs to the selected shift, not to the
  // ROOM-wide count of active shifts. Without an explicit schedule/movement
  // count, one selected shift is one planned movement; never multiply its
  // driver cost by unrelated services in the tenant.
  if (selection.shiftId && !hasPlanningInput(inputs.shiftCount)) {
    inputs.shiftCount = 1;
    appliedFields.push("shiftCount");
  }
  if (selection.shiftId && !hasPlanningInput(inputs.tripCount)) {
    inputs.tripCount = 1;
    appliedFields.push("tripCount");
  }
  return {
    inputs,
    targetPeriod,
    profile: {
      ...profile,
      selectedVehicleId: Number(vehicleId) || null,
      selectedVehicleType: vehicleType || null,
      appliedFields,
      ownershipInputPreserved: hasExplicitOwnership,
    },
  };
}

export function rebaseStaleRoomQuoteFloorDraftInputs(draftScope, inputs = {}, _reusableProfile = null) {
  const draft = draftScope?.draft;
  const hasExplicitManualBaseline = draft?.manualBaselineOperationalCostMinor !== null
    && draft?.manualBaselineOperationalCostMinor !== undefined;
  if (!draft || hasExplicitManualBaseline) return inputs;

  // A saved draft snapshot contains computed totals for display/audit, but
  // those totals are not user-entered inputs. Re-reading them as
  // baselineOperationalCostMinor would turn a prior preview into a manual
  // override and make the live canonical model drift from the draft. Keep
  // only explicit planning inputs and contribution/risk parameters.
  const rebased = { ...(inputs || {}) };
  delete rebased.manualBaselineOperationalCostMinor;
  delete rebased.baselineOperationalCostMinor;
  delete rebased.quoteFloorMinor;
  delete rebased.quoteFloorPerPassengerMinor;
  delete rebased.baselineSource;
  return rebased;
}

function validDecisionPeriod(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function dateOnlyForPeriod(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})/u);
  return match ? match[1] : null;
}

function decisionPeriodBounds(query = {}, prefix = "focus") {
  const keyPrefix = prefix === "filter" ? "filter" : "focus";
  const periodStart = String(query?.[`${keyPrefix}PeriodStart`] || "").trim();
  const periodEnd = String(query?.[`${keyPrefix}PeriodEnd`] || "").trim();
  if (!validDecisionPeriod(periodStart) || !validDecisionPeriod(periodEnd) || periodStart > periodEnd) return null;
  return {
    periodStart,
    periodEnd,
    startAt: new Date(`${periodStart}T00:00:00.000Z`),
    endAt: new Date(`${periodEnd}T23:59:59.999Z`),
  };
}

function firstPositiveMinor(...values) {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") continue;
    const amountMinor = Number(value);
    if (Number.isSafeInteger(amountMinor) && amountMinor > 0) return amountMinor;
  }
  return null;
}

function buildSelectedServiceCostInputs(planningInputs, selection, serviceCostContext = null) {
  if (serviceCostContext && serviceCostContext.coherent === false) {
    return {
      roomCostLedgerInputs: [],
      roomCostSourceEntries: [],
      roomCostPlanningEvidence: buildRoomPlanningEvidence({ entries: [], allocation: null }),
      serviceCostScope: {
        selectedAgreementId: selection?.agreementId || null,
        selectedShiftId: selection?.shiftId || null,
        sourceEntryCount: 0,
        includedLineCount: 0,
        grossAmountMinor: null,
        provenDistributedAmountMinor: null,
        pendingAmountMinor: null,
        unallocatedAmountMinor: null,
        allocationStatus: "CONTEXT_MISMATCH",
        contextStatus: serviceCostContext.reason || "SERVICE_CONTEXT_MISMATCH",
        readOnly: true,
        previewOnly: true,
        writeAction: false,
      },
    };
  }
  // Keep agreement-scoped costs visible when their shift allocation is still
  // pending. The canonical projection remains responsible for whether a line
  // can contribute to the calculated preview; hiding the source row here made
  // a real September cost look absent instead of pending.
  const scopedEntries = filterServiceCostEntriesForContext(
    planningInputs?.entries || [],
    selection,
    { includePending: true, targetShift: serviceCostContext?.shift || null },
  );
  const allocation = buildCostAllocationProjection(scopedEntries, {
    requireServiceAllocationEvidence: true,
    targetAgreementId: selection?.agreementId || null,
    targetShiftId: selection?.shiftId || null,
  });
  const provenEntryIds = new Set(
    allocation.lines.filter((line) => line.included).map((line) => line.entryId),
  );
  const provenEntries = scopedEntries.filter((entry) => provenEntryIds.has(entry?.id));
  const planningEvidence = buildRoomPlanningEvidence({
    entries: scopedEntries,
    allocation,
    actualEntries: provenEntries,
  });
  const forecastAllocation = buildForecastCostAllocationProjection(
    scopedEntries.filter((entry) => ["FORECAST", "BUDGET"].includes(String(entry?.recordKind || "").toUpperCase())),
    {
      requireServiceAllocationEvidence: true,
      targetAgreementId: selection?.agreementId || null,
      targetShiftId: selection?.shiftId || null,
    },
  );
  const planningEvidenceWithForecast = Object.freeze({
    ...planningEvidence,
    forecastAllocation,
    forecastCostInputs: forecastAllocation.forecastCostInputs,
  });
  const adaptedSourceEntries = adaptLedgerEntriesToOperationalInputs(scopedEntries).inputs || [];
  const allocationByEntryId = new Map(
    allocation.lines.map((line) => [line.entryId, line]),
  );
  const sourceEntries = scopedEntries.map((entry) => {
    const adapted = adaptedSourceEntries.find((item) => item.entryId === entry.id) || {
      entryId: entry.id,
      categoryKey: entry.categoryKey,
      amountMinor: entry.amountMinor,
      currencyCode: entry.currencyCode,
      recordKind: entry.recordKind,
      lifecycle: entry.lifecycle,
    };
    const allocationLine = allocationByEntryId.get(entry.id);
    return {
      ...adapted,
      allocationLines: Array.isArray(entry.allocationLines) ? entry.allocationLines : [],
      serviceAllocatedAmountMinor: allocationLine?.serviceAllocatedAmountMinor ?? null,
      serviceAllocationLines: Array.isArray(allocationLine?.serviceAllocationLines)
        ? allocationLine.serviceAllocationLines
        : [],
    };
  });
  return {
    roomCostLedgerInputs: allocation.operationalInputs?.inputs || [],
    roomCostSourceEntries: sourceEntries,
    roomCostPlanningEvidence: planningEvidenceWithForecast,
    roomCostForecastInputs: forecastAllocation.forecastCostInputs,
    roomCostForecastAllocation: forecastAllocation,
    serviceCostScope: {
      selectedAgreementId: selection?.agreementId || null,
      selectedShiftId: selection?.shiftId || null,
      sourceEntryCount: scopedEntries.length,
      includedLineCount: allocation.includedLineCount,
      grossAmountMinor: allocation.sourceScopeAmountMinor,
      provenDistributedAmountMinor: allocation.grossAmountMinor,
      pendingAmountMinor: allocation.pendingAmountMinor,
      unallocatedAmountMinor: allocation.unallocatedAmountMinor,
      allocationStatus: allocation.status,
      plannedAmountMinor: forecastAllocation.grossAmountMinor,
      plannedSourceAmountMinor: forecastAllocation.sourceScopeAmountMinor,
      plannedAllocatedAmountMinor: forecastAllocation.allocatedAmountMinor,
      plannedPendingAmountMinor: forecastAllocation.pendingAmountMinor,
      plannedUnallocatedAmountMinor: forecastAllocation.unallocatedAmountMinor,
      plannedAllocationStatus: forecastAllocation.status,
      readOnly: true,
      previewOnly: true,
      writeAction: false,
    },
  };
}

async function resolveTargetRoom(req) {
  const role = String(req.user?.role || "").toUpperCase();
  const rawRoomId =
    role === "ROOM"
      ? req.user?.roomId
      : Number(req.body?.roomId || req.query?.roomId || 0);

  const roomId = Number(rawRoomId || 0) || 0;

  if (!roomId) {
    return null;
  }

  return prisma.room.findUnique({
    where: {
      id: roomId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      regionId: true,
      region: { select: { id: true, name: true } },
    },
  });
}

export async function loadRoomFinancialContext(roomId, previewUser, selection = {}) {
  const [
    room,
    roomSummary,
    latestShift,
    latestAgreement,
    planningInputs,
    agreementLinkedShifts,
    vehicleFleet,
    driverFleet,
  ] = await Promise.all([
    prisma.room.findUnique({
      where: {
        id: roomId,
      },
      select: {
        id: true,
        name: true,
      },
    }),

    buildRoomCommercialSummary(previewUser),

    prisma.shift.findFirst({
      where: serviceCostShiftWhere(roomId, selection),
      orderBy: [
        {
          routeSnapshotValidatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        status: true,
        roomId: true,
        companyId: true,
        vehicleId: true,
        driverId: true,
        agreementId: true,
        routeSnapshotDistanceM: true,
        routeSnapshotDurationSec: true,
        routeSnapshotValidatedAt: true,
        routeSnapshotInputHash: true,
        emptyDistanceKm: true,
        emptyDistanceEvidenceRef: true,
        emptyDistanceReason: true,
        pattern: true,
        requiredPaxOverride: true,
        companyOfferAmount: true,
        roomOfferAmount: true,
        companyOfferNote: true,
        roomOfferNote: true,
        startAt: true,
        endAt: true,

        room: {
          select: {
            id: true,
            name: true,
        status: true,
        notes: true,
            regionId: true,
            region: { select: { id: true, name: true } },
          },
        },

        company: {
          select: {
            id: true,
            name: true,
            kind: true,
            regionId: true,
            region: { select: { id: true, name: true } },
          },
        },

        vehicle: {
          select: {
            id: true,
            plate: true,
            capacity: true,
            type: true,
          },
        },

        driver: {
          select: {
            id: true,
            fullName: true,
          },
        },

        offers: {
          where: {
            roomId,
            status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] },
          },
          select: {
            id: true,
            roomId: true,
            status: true,
            amountCompany: true,
            amountRoom: true,
            noteCompany: true,
            noteRoom: true,
          },
        },

        _count: {
          select: {
            people: true,
            stops: true,
          },
        },
      },
    }),

    prisma.agreement.findFirst({
      where: {
        roomId,
        ...(selection.agreementId
          ? { id: selection.agreementId }
          : selection.shiftId
            ? { shifts: { some: { id: selection.shiftId } } }
            : {}),
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        status: true,
        companyId: true,
        roomId: true,
              vehicleId: true,
              driverId: true,
        startDate: true,
        endDate: true,
        weekMask: true,
        startMin: true,
        endMin: true,
        pattern: true,
        direction: true,
        companyOfferAmount: true,
        roomOfferAmount: true,
        updatedAt: true,

        driver: {
          select: {
            id: true,
            fullName: true,
          },
        },

        room: {
          select: {
            id: true,
            name: true,
          },
        },

        company: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    }),
    buildOperationalCostInputs({ actor: previewUser, roomId, prisma }),
    selection.agreementId
      ? prisma.shift.findMany({
        where: {
          roomId,
          agreementId: selection.agreementId,
          status: { not: "DRAFT" },
        },
        orderBy: [{ startAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          agreementId: true,
          status: true,
          startAt: true,
          routeSnapshotDistanceM: true,
          routeSnapshotDurationSec: true,
          routeSnapshotInputHash: true,
          vehicleId: true,
          driverId: true,
        },
      })
      : Promise.resolve([]),
    prisma.vehicle.findMany({
      where: { roomId, type: { in: ["MINIBUS", "MIDIBUS", "OTOBUS"] } },
      orderBy: [{ type: "asc" }, { id: "asc" }],
      select: { id: true, plate: true, capacity: true, type: true, status: true, driverId: true },
    }),
    prisma.driver.findMany({
      where: { roomId },
      orderBy: { id: "asc" },
      select: { id: true, roomId: true },
    }),
  ]);

  const planningSourcePayload = latestAgreement
    ? await resolveAgreementSourceShiftPayload(latestAgreement.id)
    : null;
  const planningSourceShift = planningSourcePayload?.shift || null;
  const canonicalFuelReference = await loadCanonicalFuelReference({ shift: latestShift || planningSourceShift, room });
  return {
    room,
    roomSummary,
    latestShift,
    latestAgreement,
    planningSourcePayload,
    planningSourceShift,
    planningInputs,
    agreementLinkedShifts,
    vehicleFleet,
    driverFleet,
    canonicalFuelReference,
  };
}

export function buildRoomQuoteDraftPreview({ room, context, selection, requestInputs = {}, role, companyKind } = {}) {
  const planningShift = context.latestShift || context.planningSourceShift;
  const selectedServiceContext = resolveRoomQuoteDraftPlanningContext(context, selection);
  const reusableVehiclePlanning = applyReusableVehiclePlanningProfile({
    requestInputs,
    context,
    selection,
    shift: planningShift,
    agreement: selectedServiceContext.agreement || context.latestAgreement,
  });
  const effectiveRequestInputs = reusableVehiclePlanning.inputs;
  const selectedServiceCostInputs = buildSelectedServiceCostInputs(
    context.planningInputs,
    selection,
    selectedServiceContext,
  );
  const canonicalInputs = {
    ...(effectiveRequestInputs || {}),
    roomCostLedgerInputs: selectedServiceCostInputs.roomCostLedgerInputs,
    roomCostPlanningEvidence: selectedServiceCostInputs.roomCostPlanningEvidence,
    roomCostForecastInputs: selectedServiceCostInputs.roomCostForecastInputs,
    roomCostForecastAllocation: selectedServiceCostInputs.roomCostForecastAllocation,
    ...(reusableVehiclePlanning.profile
      ? { roomPlanningProfileEvidence: reusableVehiclePlanning.profile }
      : {}),
    ...canonicalFuelContext(planningShift, context.canonicalFuelReference, effectiveRequestInputs || {}),
  };
  const basePreview = buildRoomProfitabilityAndQuoteFloorPreview({
    role,
    companyKind,
    room,
    shift: planningShift,
    agreement: selectedServiceContext.agreement || context.latestAgreement,
    roomSummary: context.roomSummary,
    costInputs: canonicalInputs,
    quoteFloorInputs: canonicalInputs,
  });
  const agreement = selectedServiceContext.agreement || context.latestAgreement;
  if (!agreement) return { preview: basePreview, periodPlanning: null, periodFinancialPreview: null };

  const periodPlanningScope = buildServicePeriodPlanningScope({
    agreement,
    shifts: context.agreementLinkedShifts || [],
    planningTemplateShifts: context.planningSourceShift ? [context.planningSourceShift] : [],
    planningAssumptions: effectiveRequestInputs || {},
    periodStart: agreement.startDate,
    periodEnd: agreement.endDate,
  });
  if (periodPlanningScope.scopeStatus !== "READY_WITH_PLANNING_ASSUMPTION") {
    return { preview: basePreview, periodPlanning: buildPeriodPlanningSummary({ scope: periodPlanningScope, preview: null }), periodFinancialPreview: null };
  }

  const periodCostInputs = buildPeriodCostInputOverrides({
    scope: periodPlanningScope,
    costInputs: canonicalInputs,
  });
  const periodQuoteFloorInputs = {
    ...canonicalInputs,
    ...periodCostInputs,
    manualBaselineOperationalCostMinor: null,
    baselineOperationalCostMinor: null,
  };
  const periodFinancialPreview = buildRoomProfitabilityAndQuoteFloorPreview({
    role,
    companyKind,
    room,
    shift: planningShift,
    agreement,
    roomSummary: context.roomSummary,
    costInputs: periodCostInputs,
    quoteFloorInputs: periodQuoteFloorInputs,
  });
  const periodPlanning = buildPeriodPlanningSummary({
    scope: periodPlanningScope,
    preview: periodFinancialPreview,
  });
  return {
    preview: {
      ...basePreview,
      periodPlanning,
      periodFinancialPreview,
    },
    periodPlanning,
    periodFinancialPreview,
  };
}
export function attachCommercialCoreRoomRoutes(r) {
  r.get(
    "/room/summary",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      return res.json(
        await buildRoomCommercialSummary(req.user)
      );
    }
  );

  r.get(
    "/room/financial-operations/preview",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const roomId =
        Number(
          req.user?.roomId ||
          req.query?.roomId ||
          0
        ) || 0;

      if (roomId <= 0) {
        return res.status(400).json({
          allowed: false,
          readOnly: true,
          previewOnly: true,
          writeAction: false,
          error: "ROOM_ID_REQUIRED",
          message:
            "Room financial operations preview için roomId gerekli.",
        });
      }

      const previewUser = {
        ...req.user,
        roomId,
      };
      const serviceCostSelection = serviceCostSelectionFromQuery(req.query);
      const explicitServiceSelectionRequired = requiresExplicitServiceSelection(serviceCostSelection);
      const operationalSelection = operationalFilterFromQuery(req.query);
      const operationalPeriod = decisionPeriodBounds(req.query, "filter");
      const operationalFilterActive = String(req.query?.operationalScope || "").trim().toLowerCase() === "realized"
        || Boolean(operationalPeriod)
        || Boolean(operationalSelection.vehicleId || operationalSelection.driverId);
      const operationalMonthScope = operationalFilterActive && operationalPeriod
        ? {
          vehicleId: operationalSelection.vehicleId,
          driverId: operationalSelection.driverId,
          period: operationalPeriod,
        }
        : null;
      const vehicleMonthPeriod = decisionPeriodBounds(req.query);
      const legacyVehicleMonthScope = (serviceCostSelection.vehicleId || serviceCostSelection.driverId) && vehicleMonthPeriod
        ? {
          vehicleId: serviceCostSelection.vehicleId,
          driverId: serviceCostSelection.driverId,
          period: vehicleMonthPeriod,
        }
        : null;
      const contractMonthScope = serviceCostSelection.agreementId && vehicleMonthPeriod
        ? { agreementId: serviceCostSelection.agreementId, period: vehicleMonthPeriod }
        : null;
      const vehicleMonthScope = operationalMonthScope || legacyVehicleMonthScope;
      const decisionPeriodScope = vehicleMonthScope || contractMonthScope;

      const [
        room,
        operationalVehicle,
        operationalDriver,
        roomSummary,
        quoteFloorDraftOverview,
        latestShift,
        latestAgreement,
        planningInputs,
        vehicleMonthShifts,
        driverCoverageShifts,
        vehicleMonthIncomeEvidence,
        agreementLinkedShifts,
        roomHistoricalAgreements,
        vehicleFleet,
        driverFleet,
      ] = await Promise.all([
        prisma.room.findUnique({
          where: {
            id: roomId,
          },
          select: {
            id: true,
            name: true,
            status: true,
            notes: true,
            regionId: true,
            region: { select: { id: true, name: true } },
          },
        }),

        operationalSelection.vehicleId
          ? prisma.vehicle.findFirst({
            where: { id: operationalSelection.vehicleId, roomId },
            select: { id: true, roomId: true },
          })
          : Promise.resolve(null),

        operationalSelection.driverId
          ? prisma.driver.findFirst({
            where: { id: operationalSelection.driverId, roomId },
            select: { id: true, roomId: true },
          })
          : Promise.resolve(null),

        buildRoomCommercialSummary(previewUser),

        getRoomQuoteFloorDraftOverview(roomId),

        explicitServiceSelectionRequired
          ? Promise.resolve(null)
          : prisma.shift.findFirst({
          where: serviceCostShiftWhere(roomId, serviceCostSelection),
          orderBy: [
            {
              routeSnapshotValidatedAt: "desc",
            },
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],
          select: {
            id: true,
            status: true,
            roomId: true,
            companyId: true,
            vehicleId: true,
            driverId: true,
            agreementId: true,
            routeSnapshotDistanceM: true,
            routeSnapshotDurationSec: true,
            routeSnapshotValidatedAt: true,
            routeSnapshotInputHash: true,
            emptyDistanceKm: true,
            emptyDistanceEvidenceRef: true,
            emptyDistanceReason: true,
            pattern: true,
            requiredPaxOverride: true,
            companyOfferAmount: true,
            roomOfferAmount: true,
            companyOfferNote: true,
            roomOfferNote: true,
            startAt: true,
            endAt: true,

            room: {
              select: {
                id: true,
                name: true,
                regionId: true,
                region: { select: { id: true, name: true } },
              },
            },

            company: {
              select: {
                id: true,
                name: true,
                kind: true,
                regionId: true,
                region: { select: { id: true, name: true } },
              },
            },

            vehicle: {
              select: {
                id: true,
                plate: true,
                capacity: true,
                type: true,
              },
            },

            driver: {
              select: {
                id: true,
                fullName: true,
              },
            },

            offers: {
              where: {
                roomId,
                status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] },
              },
              select: {
                id: true,
                roomId: true,
                status: true,
                amountCompany: true,
                amountRoom: true,
                noteCompany: true,
                noteRoom: true,
              },
            },

            agreement: {
              select: {
                id: true,
                status: true,
                companyId: true,
                roomId: true,
                vehicleId: true,
                driverId: true,
                startDate: true,
                endDate: true,
                weekMask: true,
                startMin: true,
                endMin: true,
                pattern: true,
                direction: true,
                companyOfferAmount: true,
                roomOfferAmount: true,
                updatedAt: true,
                driver: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
                room: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                company: {
                  select: {
                    id: true,
                    name: true,
                    kind: true,
                    regionId: true,
                    region: { select: { id: true, name: true } },
                  },
                },

                vehicle: {
                  select: {
                    id: true,
                    type: true,
                    capacity: true,
                    plate: true,
                  },
                },
              },
            },

            _count: {
              select: {
                people: true,
                stops: true,
              },
            },
          },
        }),

        explicitServiceSelectionRequired
          ? Promise.resolve(null)
          : prisma.agreement.findFirst({
          where: {
            roomId,
            ...(serviceCostSelection.agreementId ? { id: serviceCostSelection.agreementId } : {}),
          },
          orderBy: [
            {
              updatedAt: "desc",
            },
            {
              id: "desc",
            },
          ],
          select: {
            id: true,
            status: true,
            companyId: true,
            roomId: true,
            vehicleId: true,
            driverId: true,
                startDate: true,
                endDate: true,
                weekMask: true,
                startMin: true,
                endMin: true,
                pattern: true,
                direction: true,
            companyOfferAmount: true,
            roomOfferAmount: true,
            updatedAt: true,
            roomCostEntries: {
              where: { recordKind: "ACTUAL", lifecycle: "CONFIRMED" },
              select: { amountMinor: true, currencyCode: true, recordKind: true, lifecycle: true },
            },
            shifts: {
              where: { status: { not: "DRAFT" } },
              select: { id: true, status: true },
            },

            driver: {
              select: {
                id: true,
                fullName: true,
              },
            },

            room: {
              select: {
                id: true,
                name: true,
                regionId: true,
                region: { select: { id: true, name: true } },
              },
            },

            company: {
              select: {
                id: true,
                name: true,
                kind: true,
                regionId: true,
                region: { select: { id: true, name: true } },
              },
            },

            vehicle: {
              select: {
                id: true,
                type: true,
                capacity: true,
                plate: true,
              },
            },
          },
        }),
        buildOperationalCostInputs({ actor: previewUser, roomId, prisma }),

        decisionPeriodScope
          ? prisma.shift.findMany({
            where: {
              roomId,
              ...(contractMonthScope && !operationalMonthScope ? { agreementId: contractMonthScope.agreementId } : {}),
              startAt: { lt: decisionPeriodScope.period.endAt },
              endAt: { gt: decisionPeriodScope.period.startAt },
            },
            orderBy: [{ startAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              roomId: true,
              vehicleId: true,
              driverId: true,
              agreementId: true,
              status: true,
              startAt: true,
              endAt: true,
              routeSnapshotDistanceM: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
          : Promise.resolve([]),

        decisionPeriodScope
          ? prisma.shift.findMany({
            where: {
              roomId,
              startAt: { lt: decisionPeriodScope.period.endAt },
              endAt: { gt: decisionPeriodScope.period.startAt },
            },
            orderBy: [{ startAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              roomId: true,
              vehicleId: true,
              driverId: true,
              agreementId: true,
              status: true,
              startAt: true,
              endAt: true,
            },
          })
          : Promise.resolve([]),

        decisionPeriodScope
          ? buildRealizedIncomeEvidence({
            roomId,
            periodStart: decisionPeriodScope.period.periodStart,
            periodEnd: decisionPeriodScope.period.periodEnd,
            periodScope: "RANGE",
            prisma,
          })
          : Promise.resolve(null),

        serviceCostSelection.agreementId
          ? prisma.shift.findMany({
            where: {
              roomId,
              agreementId: serviceCostSelection.agreementId,
              status: { not: "DRAFT" },
            },
            orderBy: [{ startAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              agreementId: true,
              status: true,
              startAt: true,
              routeSnapshotDistanceM: true,
              routeSnapshotDurationSec: true,
              routeSnapshotInputHash: true,
            },
          })
          : Promise.resolve([]),

        prisma.agreement.findMany({
          where: { roomId },
          orderBy: [{ endDate: "desc" }, { id: "desc" }],
          select: {
            id: true,
            roomId: true,
            status: true,
            startDate: true,
            endDate: true,
            weekMask: true,
            pattern: true,
            direction: true,
            companyOfferAmount: true,
            roomOfferAmount: true,
            roomCostEntries: {
              where: { recordKind: "ACTUAL", lifecycle: "CONFIRMED" },
              select: { amountMinor: true, currencyCode: true, recordKind: true, lifecycle: true },
            },
            vehicle: { select: { id: true, type: true, capacity: true } },
            shifts: {
              where: { status: { not: "DRAFT" } },
              orderBy: [{ startAt: "asc" }, { id: "asc" }],
              select: {
                id: true,
              startAt: true,
              endAt: true,
              routeSnapshotInputHash: true,
                routeSnapshotDistanceM: true,
                routeSnapshotDurationSec: true,
              },
            },
          },
        }),

        prisma.vehicle.findMany({
          where: { roomId, type: { in: ["MINIBUS", "MIDIBUS", "OTOBUS"] } },
          orderBy: [{ type: "asc" }, { id: "asc" }],
          select: { id: true, plate: true, capacity: true, type: true, status: true, driverId: true },
        }),

        prisma.driver.findMany({
          where: { roomId },
          orderBy: { id: "asc" },
          select: { id: true, roomId: true },
        }),
      ]);

      if (!room) {
        return res.status(404).json({
          allowed: false,
          readOnly: true,
          previewOnly: true,
          writeAction: false,
          error: "ROOM_NOT_FOUND",
          message:
            "Room financial operations preview için oda bulunamadı.",
        });
      }

      const historicalAgreementIds = roomHistoricalAgreements
        .map((agreement) => Number(agreement?.id))
        .filter((id) => Number.isSafeInteger(id) && id > 0);
      const historicalAgreementAuditLogs = historicalAgreementIds.length
        ? await prisma.auditLog.findMany({
          where: {
            entity: "Agreement",
            entityId: { in: historicalAgreementIds },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, entityId: true, action: true, meta: true, createdAt: true },
        })
        : [];
      const auditLogsByAgreementId = new Map();
      for (const log of historicalAgreementAuditLogs) {
        const id = Number(log.entityId);
        if (!auditLogsByAgreementId.has(id)) auditLogsByAgreementId.set(id, []);
        auditLogsByAgreementId.get(id).push(log);
      }
      const attachCommercialEvidenceInputs = (agreement) => agreement
        ? {
          ...agreement,
          auditLogs: auditLogsByAgreementId.get(Number(agreement.id)) || [],
          actualCostEntries: Array.isArray(agreement.roomCostEntries) ? agreement.roomCostEntries : [],
        }
        : null;
      const latestAgreementWithEvidence = attachCommercialEvidenceInputs(latestAgreement);
      const latestShiftAgreementWithEvidence = attachCommercialEvidenceInputs(latestShift?.agreement);
      const roomHistoricalAgreementsWithEvidence = roomHistoricalAgreements.map(attachCommercialEvidenceInputs);
      const selectedMarketOffer = selectedRoomMarketOffer(latestShift, roomId);

      const operationalScopeViolation = operationalFilterScopeViolation({
        selection: operationalSelection,
        vehicle: operationalVehicle,
        driver: operationalDriver,
      });
      if (operationalScopeViolation) {
        return res.status(403).json({
          allowed: false,
          readOnly: true,
          previewOnly: true,
          writeAction: false,
          error: operationalScopeViolation.code,
          message: "Seçilen araç veya sürücü bu ROOM kapsamındaki gerçekleşen operasyonlarda kullanılamaz.",
        });
      }

      const requestedAgreement = explicitServiceSelectionRequired
        ? null
        : serviceCostSelection.agreementId
          ? latestAgreementWithEvidence
          : latestShiftAgreementWithEvidence;
      const planningSourcePayload = requestedAgreement
        ? await resolveAgreementSourceShiftPayload(requestedAgreement.id)
        : null;
      const planningSourceShift = planningSourcePayload?.shift || null;
      const planningShift = selectedMarketOffer
        ? {
          ...latestShift,
          roomOfferAmount: selectedMarketOffer.amountRoom ?? latestShift.roomOfferAmount ?? null,
          companyOfferAmount: selectedMarketOffer.amountCompany ?? latestShift.companyOfferAmount ?? null,
          roomOfferNote: selectedMarketOffer.noteRoom ?? latestShift.roomOfferNote ?? null,
          companyOfferNote: selectedMarketOffer.noteCompany ?? latestShift.companyOfferNote ?? null,
        }
        : latestShift || planningSourceShift;
      const serviceCostContext = resolveServiceCostContext({
        agreement: requestedAgreement,
        shift: latestShift,
        requestedVehicleId: serviceCostSelection.vehicleId,
      });
      const planningServiceCostContext = !serviceCostContext.coherent
        && requestedAgreement
        && planningSourceShift
        && Number(planningSourceShift.roomId || 0) === roomId
        && Number(planningSourceShift.companyId || 0) === Number(requestedAgreement.companyId || 0)
        && !serviceCostSelection.shiftId
        && !serviceCostSelection.vehicleId
        ? {
          coherent: true,
          reason: null,
          agreement: requestedAgreement,
          shift: planningSourceShift,
          planningOnly: true,
        }
        : null;
      const effectiveServiceCostContext = serviceCostContext.coherent
        ? serviceCostContext
        : selectedMarketOffer
          ? {
            coherent: true,
            reason: null,
            agreement: null,
            shift: latestShift,
            planningOnly: true,
            contractless: true,
            offer: selectedMarketOffer,
          }
          : planningServiceCostContext || serviceCostContext;
      const canonicalFuelReference = await loadCanonicalFuelReference({ shift: planningShift, room, actor: req.user });
      const controlledDemoPlatformContext = await loadControlledDemoPlatformReference({
        prismaClient: prisma,
        actor: req.user,
        region: {
          regionCode: room?.region?.id ? String(room.region.id) : null,
          regionName: room?.region?.name || null,
          scopeType: room?.region?.name ? "CITY" : "GLOBAL",
          scopeKey: room?.region?.name || room?.region?.id ? String(room?.region?.name || room?.region?.id) : "GLOBAL",
        },
      });
      const selectedServiceCostSelection = explicitServiceSelectionRequired
        ? { offerId: serviceCostSelection.offerId || null, agreementId: null, shiftId: null }
        : {
          offerId: serviceCostSelection.offerId || null,
          agreementId: serviceCostSelection.agreementId || effectiveServiceCostContext.agreement?.id || requestedAgreement?.id || null,
          shiftId: serviceCostSelection.shiftId || latestShift?.id || null,
        };
      const selectedServiceCostInputs = buildSelectedServiceCostInputs(
        planningInputs,
        selectedServiceCostSelection,
        effectiveServiceCostContext,
      );
      const serviceContextInputs = {
        serviceContextCoherent: effectiveServiceCostContext.coherent,
        serviceContextReason: effectiveServiceCostContext.reason,
      };
      const contractlessPlanningSchedule = selectedMarketOffer
        ? {
          periodStart: req.query?.planningPeriodStart || req.query?.focusPeriodStart || null,
          periodEnd: req.query?.planningPeriodEnd || req.query?.focusPeriodEnd || null,
          weekMask: req.query?.planningWeekMask,
          startMin: req.query?.planningStartMin,
          endMin: req.query?.planningEndMin,
          movementsPerDay: req.query?.planningMovementsPerDay,
          direction: req.query?.planningDirection,
          pattern: req.query?.planningPattern,
        }
        : null;
      const periodPlanningScope = serviceCostSelection.agreementId && requestedAgreement
        ? buildServicePeriodPlanningScope({
          agreement: requestedAgreement,
          shifts: agreementLinkedShifts,
          planningTemplateShifts: planningSourceShift ? [planningSourceShift] : [],
          planningAssumptions: req.query || {},
          periodStart: vehicleMonthPeriod?.periodStart || requestedAgreement.startDate,
          periodEnd: vehicleMonthPeriod?.periodEnd || requestedAgreement.endDate,
        })
        : selectedMarketOffer
          ? buildContractlessServicePeriodPlanningScope({
            planningSchedule: contractlessPlanningSchedule,
            planningTemplateShifts: latestShift ? [latestShift] : [],
            planningAssumptions: req.query || {},
          })
          : null;
      const selectedOfferAmountMinor = effectiveServiceCostContext.coherent
        ? (effectiveServiceCostContext.offer?.amountRoom
          ?? effectiveServiceCostContext.agreement?.roomOfferAmount
          ?? latestShift?.roomOfferAmount
          ?? planningSourceShift?.roomOfferAmount
          ?? null)
        : null;
      const selectedOfferSource = effectiveServiceCostContext.coherent
        ? (effectiveServiceCostContext.offer?.amountRoom != null
          ? "SHIFT_MARKET_ROOM_OFFER"
          : effectiveServiceCostContext.agreement?.roomOfferAmount != null
          ? "AGREEMENT_ROOM_OFFER"
          : latestShift?.roomOfferAmount != null
            ? "SHIFT_ROOM_OFFER"
            : null)
        : null;
      const accountingPeriodReadiness = decisionPeriodScope
        ? buildAccountingPeriodReadinessFromSources({
          costSummary: planningInputs?.summary || null,
          incomeEvidence: vehicleMonthIncomeEvidence,
        })
        : null;
      const accountingPeriod = decisionPeriodScope
        ? await getAccountingPeriod({
          prisma,
          actor: previewUser,
          roomId,
          periodStart: decisionPeriodScope.period.periodStart,
          periodEnd: decisionPeriodScope.period.periodEnd,
          readiness: accountingPeriodReadiness,
        })
        : null;
      const accountingPeriodClosed = accountingPeriod?.status === "CLOSED"
        && accountingPeriodReadiness?.readyForClose === true;
      const quoteFloorDraftScope = resolveRoomQuoteFloorDraftScope(
        quoteFloorDraftOverview?.current,
        serviceCostSelection,
      );
      const scopedQuoteFloorDraftOverview = scopeRoomQuoteFloorDraftOverview(
        quoteFloorDraftOverview,
        serviceCostSelection,
      );
      const scopedRequestInputs = removeStaleRoomQuoteFloorDraftInputs(
        req.query || {},
        quoteFloorDraftScope,
      );
      const savedDraftPlanningInputs = quoteFloorDraftScope.compatible
        ? planningInputsFromPayload(quoteFloorDraftScope.inputs)
        : {};
      const effectivePlanningInputs = {
        ...savedDraftPlanningInputs,
        ...planningInputsFromPayload(scopedRequestInputs),
      };
      const reusableVehiclePlanning = applyReusableVehiclePlanningProfile({
        requestInputs: effectivePlanningInputs,
        context: { planningInputs, vehicleFleet, driverFleet },
        selection: serviceCostSelection,
        shift: planningShift,
        agreement: effectiveServiceCostContext.agreement,
      });
      const effectiveQuotePlanningInputs = reusableVehiclePlanning.inputs;
      const reusableProfileInputs = reusableVehiclePlanning.profile
        ? { roomPlanningProfileEvidence: reusableVehiclePlanning.profile }
        : {};
      const effectiveQuoteFloorDraftInputs = rebaseStaleRoomQuoteFloorDraftInputs(
        quoteFloorDraftScope,
        quoteFloorDraftScope.inputs,
        reusableVehiclePlanning.profile,
      );
      const vehicleMonthDecision = vehicleMonthScope
        ? buildVehicleMonthDecisionSummary({
          vehicleId: vehicleMonthScope.vehicleId,
          driverId: vehicleMonthScope.driverId,
          periodStart: vehicleMonthScope.period.periodStart,
          periodEnd: vehicleMonthScope.period.periodEnd,
          shifts: vehicleMonthShifts,
          coverageShifts: driverCoverageShifts,
          incomeLines: vehicleMonthIncomeEvidence?.lines || [],
          costEntries: planningInputs?.entries || [],
          realizedOnly: Boolean(operationalMonthScope),
          asOfDate: new Date(),
          accountingPeriodClosed,
        })
        : {
          status: "PERIOD_REQUIRED",
          vehicleId: serviceCostSelection.vehicleId || null,
          periodStart: null,
          periodEnd: null,
          earnedIncomeMinor: null,
          grossActualCostMinor: null,
          activityResultMinor: null,
          confirmedNetProfitMinor: null,
          missing: serviceCostSelection.vehicleId
            ? ["focusPeriodStart", "focusPeriodEnd"]
            : ["focusVehicleId", "focusPeriodStart", "focusPeriodEnd"],
          blockers: [],
          costComponents: [],
          incomeEvidence: [],
          unallocatedCostEntries: [],
          pendingAllocationEntryIds: [],
          lineage: [],
          readOnly: true,
          previewOnly: true,
          writeAction: false,
        };
      const financialPreview = buildRoomProfitabilityAndQuoteFloorPreview({
        role: req.user?.role,
        companyKind: req.user?.companyKind,
        room,
        shift: planningShift,
        agreement: effectiveServiceCostContext.agreement,
        roomSummary,
        costInputs: {
          ...scopedRequestInputs,
          ...effectiveQuotePlanningInputs,
          ...selectedServiceCostInputs,
          ...canonicalFuelContext(planningShift, canonicalFuelReference, effectivePlanningInputs),
          ...reusableProfileInputs,
          ...serviceContextInputs,
        },
        quoteFloorInputs: {
          ...effectiveQuoteFloorDraftInputs,
          ...scopedRequestInputs,
          ...effectiveQuotePlanningInputs,
          ...selectedServiceCostInputs,
          ...canonicalFuelContext(planningShift, canonicalFuelReference, effectiveQuotePlanningInputs),
          ...reusableProfileInputs,
          ...serviceContextInputs,
        },
      });
      const periodCostInputs = periodPlanningScope
        ? buildPeriodCostInputOverrides({
          scope: periodPlanningScope,
          costInputs: {
            ...effectivePlanningInputs,
            ...effectiveQuotePlanningInputs,
            ...selectedServiceCostInputs,
            ...canonicalFuelContext(planningShift, canonicalFuelReference, effectivePlanningInputs),
            ...reusableProfileInputs,
            ...serviceContextInputs,
          },
        })
        : null;
      // A full-period comparison must use the canonical period model total.
      // A selected-shift/manual baseline is not allowed to replace that total
      // and make a single known component look like the whole service period.
      const periodQuoteFloorInputs = periodCostInputs
        ? {
          ...effectiveQuoteFloorDraftInputs,
          ...scopedRequestInputs,
          ...periodCostInputs,
          manualBaselineOperationalCostMinor: null,
          baselineOperationalCostMinor: null,
        }
        : null;
      const periodFinancialPreview = periodPlanningScope?.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION"
        ? buildRoomProfitabilityAndQuoteFloorPreview({
          role: req.user?.role,
          companyKind: req.user?.companyKind,
          room,
          shift: planningShift,
          agreement: effectiveServiceCostContext.agreement,
          roomSummary,
          costInputs: periodCostInputs,
          quoteFloorInputs: periodQuoteFloorInputs,
        })
        : null;
      const periodPlanning = periodPlanningScope
        ? buildPeriodPlanningSummary({
          scope: periodPlanningScope,
          preview: periodFinancialPreview,
        })
        : null;
      const monthlyReferenceAgreement = effectiveServiceCostContext.agreement
        || requestedAgreement
        || (serviceCostSelection.shiftId ? null : latestAgreement);
      const selectedShiftPeriodStart = dateOnlyForPeriod(planningShift?.startAt);
      const selectedShiftPeriodEnd = dateOnlyForPeriod(planningShift?.endAt || planningShift?.startAt);
      const monthlyPriceReference = buildRoomMonthlyPriceReference({
        roomId,
        selectedAgreement: monthlyReferenceAgreement,
        historicalAgreements: roomHistoricalAgreementsWithEvidence,
        periodPlanning,
        periodPreview: periodFinancialPreview,
        singleShiftPreview: financialPreview,
        selectedPeriodStart: decisionPeriodScope?.period?.periodStart || selectedShiftPeriodStart,
        selectedPeriodEnd: decisionPeriodScope?.period?.periodEnd || selectedShiftPeriodEnd,
        savedPlanningDraft: scopedQuoteFloorDraftOverview?.current,
        platformObservations: controlledDemoPlatformContext.observations,
        platformPolicy: controlledDemoPlatformContext.policy,
      });
      const contractMonthDecision = contractMonthScope
        ? buildContractMonthDecisionSummary({
          agreementId: contractMonthScope.agreementId,
          periodStart: contractMonthScope.period.periodStart,
          periodEnd: contractMonthScope.period.periodEnd,
          contractTotalMinor: firstPositiveMinor(
            requestedAgreement?.roomOfferAmount,
            requestedAgreement?.companyOfferAmount,
            latestShift?.agreement?.roomOfferAmount,
            latestShift?.agreement?.companyOfferAmount,
            latestShift?.roomOfferAmount,
            latestShift?.companyOfferAmount,
          ),
          realizedIncomeEvidence: vehicleMonthIncomeEvidence,
          plannedCostMinor: null,
          shiftIds: selectContractShiftIds({
            agreementId: contractMonthScope.agreementId,
            shifts: vehicleMonthShifts,
          }),
          costEntries: planningInputs?.entries || [],
          accountingPeriodClosed,
        })
        : {
          status: "PERIOD_REQUIRED",
          agreementId: serviceCostSelection.agreementId || null,
          periodStart: null,
          periodEnd: null,
          contractTotalMinor: null,
          earnedRevenueMinor: null,
          collectedCashMinor: null,
          receivableMinor: null,
          realizedActualCostMinor: null,
          plannedCostMinor: null,
          activityResultMinor: null,
          confirmedNetProfitMinor: null,
          costComponents: [],
          costLineage: [],
          blockers: [],
          missing: serviceCostSelection.agreementId
            ? ["focusPeriodStart", "focusPeriodEnd"]
            : ["focusAgreementId", "focusPeriodStart", "focusPeriodEnd"],
          readOnly: true,
          previewOnly: true,
          writeAction: false,
        };
      const selectedShiftNewOfferDecision = buildNewOfferDecisionSummary({
        baselineOperationalCostMinor: financialPreview?.quoteFloor?.baselineOperationalCostMinor ?? null,
        targetContributionBps: financialPreview?.quoteFloor?.targetContributionBps ?? null,
        riskReserveBps: financialPreview?.quoteFloor?.riskReserveBps ?? null,
        currentOfferMinor: financialPreview?.snapshot?.currentCommercialAmountMinor ?? null,
        scenarioOfferMinor: req.query?.quoteScenarioAmountMinor ?? null,
        passengerCount: financialPreview?.snapshot?.passengerCount ?? null,
        baselineSource: financialPreview?.quoteFloor?.baselineSource || "CANONICAL_PLAN_OR_ACTUAL",
      });
      const newOfferDecision = periodPlanning && !periodPlanning.comparisonAllowed
        ? buildNewOfferDecisionSummary({
          baselineOperationalCostMinor: null,
          targetContributionBps: periodFinancialPreview?.quoteFloor?.targetContributionBps ?? financialPreview?.quoteFloor?.targetContributionBps ?? null,
          riskReserveBps: periodFinancialPreview?.quoteFloor?.riskReserveBps ?? financialPreview?.quoteFloor?.riskReserveBps ?? null,
          currentOfferMinor: financialPreview?.snapshot?.currentCommercialAmountMinor ?? null,
          scenarioOfferMinor: req.query?.quoteScenarioAmountMinor ?? null,
          passengerCount: financialPreview?.snapshot?.passengerCount ?? null,
          baselineSource: "PERIOD_SCOPE_NOT_PROVEN",
        })
        : periodPlanning?.comparisonAllowed && periodFinancialPreview
          ? buildNewOfferDecisionSummary({
            baselineOperationalCostMinor: periodFinancialPreview.quoteFloor?.baselineOperationalCostMinor ?? null,
            targetContributionBps: periodFinancialPreview.quoteFloor?.targetContributionBps ?? null,
            riskReserveBps: periodFinancialPreview.quoteFloor?.riskReserveBps ?? null,
            currentOfferMinor: periodFinancialPreview.snapshot?.currentCommercialAmountMinor ?? null,
            scenarioOfferMinor: req.query?.quoteScenarioAmountMinor ?? null,
            passengerCount: periodFinancialPreview.snapshot?.passengerCount ?? null,
            baselineSource: periodFinancialPreview.quoteFloor?.baselineSource || "CANONICAL_PERIOD_PLAN",
          })
          : selectedShiftNewOfferDecision;

      return res.json(
        {
          ...financialPreview,
          periodPlanning,
          periodFinancialPreview,
          monthlyPriceReference,
          selectedShiftNewOfferDecision,
          serviceCostContext: {
            coherent: effectiveServiceCostContext.coherent,
            reason: effectiveServiceCostContext.reason,
            agreementId: explicitServiceSelectionRequired ? null : requestedAgreement?.id || null,
            shiftId: explicitServiceSelectionRequired ? null : latestShift?.id || null,
            planningSourceShiftId: planningSourceShift?.id || null,
            planningOnly: effectiveServiceCostContext.planningOnly === true,
            contractless: effectiveServiceCostContext.contractless === true,
          },
          serviceCostSourceEntries: selectedServiceCostInputs.roomCostSourceEntries,
          serviceCostScope: selectedServiceCostInputs.serviceCostScope,
          vehicleMonthDecision,
          contractMonthDecision,
          newOfferDecision,
          accountingPeriod,
          accountingPeriodReadiness,
          commercialOffer: {
            status: selectedOfferAmountMinor != null ? "AVAILABLE" : effectiveServiceCostContext.coherent ? "MISSING" : "BLOCKED",
            marketOfferStatus: selectedMarketOffer?.status || null,
            amountMinor: selectedOfferAmountMinor,
            source: selectedOfferSource,
            agreementId: effectiveServiceCostContext.agreement?.id || null,
            shiftId: effectiveServiceCostContext.shift?.id || null,
            reason: selectedOfferAmountMinor != null
              ? null
              : effectiveServiceCostContext.coherent
                ? "Seçili hizmet için doğrulanmış taşımacılık firması teklifi bulunamadı."
                : effectiveServiceCostContext.reason,
          },
          quoteFloorDraft: scopedQuoteFloorDraftOverview,
        }
      );
    })
  );

  r.get(
    "/room/financial-operations/income-period-corrections",
    authRequired(),
    requireRole("ROOM"),
    asyncHandler(async (req, res) => {
      const roomId = Number(req.user?.roomId || 0) || 0;
      if (roomId <= 0) {
        return res.status(400).json({ ok: false, error: "ROOM_ID_REQUIRED" });
      }
      const items = await listIncomePeriodCorrections({
        prisma,
        roomId,
        hakedisId: req.query?.hakedisId,
      });
      return res.json({ ok: true, items });
    }),
  );

  r.post(
    "/room/financial-operations/shifts/:shiftId/test-simulated-completion",
    authRequired(),
    requireRole("ROOM"),
    asyncHandler(async (req, res) => {
      const result = await completeRoomTestSimulatedService({
        prisma,
        actor: req.user,
        shiftId: Number(req.params.shiftId || 0),
        input: req.body || {},
        runtime: {
          mode: process.env.SEFERPAKT_DATABASE_MODE,
          nodeEnv: process.env.NODE_ENV,
        },
      });
      return res.status(result.idempotent ? 200 : 201).json({ ok: true, ...result });
    }),
  );

  r.post(
    "/room/financial-operations/agreements/:agreementId/income-chain",
    authRequired(),
    requireRole("ROOM"),
    asyncHandler(async (req, res) => {
      const result = await createRoomIncomeChain({
        prisma,
        actor: req.user,
        runtime: {
          mode: process.env.SEFERPAKT_DATABASE_MODE,
          nodeEnv: process.env.NODE_ENV,
        },
        input: {
          ...(req.body || {}),
          agreementId: Number(req.params.agreementId || 0),
        },
      });
      return res.status(result.idempotent ? 200 : 201).json({ ok: true, ...result });
    }),
  );

  r.post(
    "/room/financial-operations/income-period-corrections",
    authRequired(),
    requireRole("ROOM"),
    asyncHandler(async (req, res) => {
      if (req.body?.userApproval !== true) {
        return res.status(409).json({
          ok: false,
          error: "EXPLICIT_CONFIRMATION_REQUIRED",
          message: "Gelir dönemi düzeltmesi için açık kullanıcı onayı gerekir.",
        });
      }
      const roomId = Number(req.user?.roomId || 0) || 0;
      if (roomId <= 0) {
        return res.status(400).json({ ok: false, error: "ROOM_ID_REQUIRED" });
      }
      const result = await applyIncomePeriodCorrection({
        prisma,
        roomId,
        actorUserId: req.user?.id || null,
        input: req.body,
      });
      await audit(req, {
        action: result.idempotent ? "ROOM_INCOME_PERIOD_CORRECTION_REPLAYED" : "ROOM_INCOME_PERIOD_CORRECTION_APPLIED",
        entity: "HakedisIncomePeriodCorrection",
        entityId: result.correction.id,
        meta: {
          roomId,
          hakedisId: result.correction.hakedisId,
          sourcePeriodStart: result.correction.sourcePeriodStart,
          sourcePeriodEnd: result.correction.sourcePeriodEnd,
          recognizedPeriodStart: result.correction.recognizedPeriodStart,
          recognizedPeriodEnd: result.correction.recognizedPeriodEnd,
          evidenceRef: result.correction.evidenceRef,
          reason: result.correction.reason,
          idempotent: result.idempotent,
        },
      });
      return res.status(result.idempotent ? 200 : 201).json({
        ok: true,
        idempotent: result.idempotent,
        item: result.correction,
      });
    }),
  );

  r.get(
    "/room/financial-operations/quote-floor-drafts/current",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const roomId =
        Number(
          req.user?.roomId ||
          req.query?.roomId ||
          0
        ) || 0;

      if (roomId <= 0) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const overview = await getRoomQuoteFloorDraftOverview(roomId);
      const serviceCostSelection = serviceCostSelectionFromQuery(req.query);
      const scopedOverview = scopeRoomQuoteFloorDraftOverview(
        overview,
        serviceCostSelection,
      );

      return res.json({
        ok: true,
        roomId,
        current: scopedOverview?.current || null,
        draft: scopedOverview?.draft || null,
        applied: scopedOverview?.applied || null,
        items: scopedOverview?.items || [],
      });
    })
  );

  r.post(
    "/room/financial-operations/quote-floor-drafts",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const previewUser = {
        ...req.user,
        roomId: room.id,
      };

      const selection = serviceCostSelectionFromPayload(req.body);
      const context =
        await loadRoomFinancialContext(
          room.id,
          previewUser,
          selection,
        );
      const selectedServiceContext = resolveRoomQuoteDraftPlanningContext(context, selection);
      if ((selection.shiftId || selection.agreementId || selection.vehicleId) && !selectedServiceContext.coherent) {
        return res.status(409).json({
          ok: false,
          error: "ROOM_QUOTE_FLOOR_SERVICE_CONTEXT_MISMATCH",
          message: "Teklif tabanı için seçili vardiya, sözleşme ve araç aynı yetkili hizmet bağlamında olmalıdır.",
        });
      }
      const serviceContext = selectedServiceContext.coherent
        ? buildRoomQuoteDraftServiceContext({
          room,
          agreement: context.latestAgreement,
          latestShift: context.latestShift,
          planningSourceShift: context.planningSourceShift,
        })
        : null;
      assertRoomQuoteDraftContextFresh(req.body, serviceContext);
      const draftPreview = buildRoomQuoteDraftPreview({
        room,
        context,
        selection,
        requestInputs: req.body || {},
        role: req.user?.role,
        companyKind: req.user?.companyKind,
      });
      const preview = draftPreview.preview;

      const saved =
        await saveRoomQuoteFloorDraft({
          roomId: room.id,
          actorUserId: req.user?.id || null,
          payload: req.body || {},
          computed: {
            ...(draftPreview.periodFinancialPreview?.quoteFloor || preview?.quoteFloor || {}),
            periodPlanning: draftPreview.periodPlanning || null,
            planningInputs: planningInputsFromPayload(req.body || {}),
          },
          context: serviceContext,
        });

      await audit(req, {
        action: saved.idempotent ? "ROOM_QUOTE_FLOOR_DRAFT_REPLAYED" : "ROOM_QUOTE_FLOOR_DRAFT_CREATED",
        entity: "RoomQuoteFloorDraft",
        entityId: saved.id,
        meta: {
          roomId: room.id,
          agreementId: serviceContext?.agreementId || null,
          sourceShiftId: serviceContext?.sourceShiftId || null,
          scopeHash: serviceContext?.scopeHash || null,
          idempotent: saved.idempotent === true,
        },
      });

      return res.status(saved.idempotent ? 200 : 201).json({
        ok: true,
        item: saved,
        preview,
      });
    })
  );

  r.patch(
    "/room/financial-operations/quote-floor-drafts/:id",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const previewUser = {
        ...req.user,
        roomId: room.id,
      };

      const selection = serviceCostSelectionFromPayload(req.body);
      const context =
        await loadRoomFinancialContext(
          room.id,
          previewUser,
          selection,
        );
      const selectedServiceContext = resolveRoomQuoteDraftPlanningContext(context, selection);
      if ((selection.shiftId || selection.agreementId || selection.vehicleId) && !selectedServiceContext.coherent) {
        return res.status(409).json({
          ok: false,
          error: "ROOM_QUOTE_FLOOR_SERVICE_CONTEXT_MISMATCH",
          message: "Teklif tabanı için seçili vardiya, sözleşme ve araç aynı yetkili hizmet bağlamında olmalıdır.",
        });
      }
      const serviceContext = selectedServiceContext.coherent
        ? buildRoomQuoteDraftServiceContext({
          room,
          agreement: context.latestAgreement,
          latestShift: context.latestShift,
          planningSourceShift: context.planningSourceShift,
        })
        : null;
      assertRoomQuoteDraftContextFresh(req.body, serviceContext, { requireHash: true });
      const draftPreview = buildRoomQuoteDraftPreview({
        room,
        context,
        selection,
        requestInputs: req.body || {},
        role: req.user?.role,
        companyKind: req.user?.companyKind,
      });
      const preview = draftPreview.preview;

      const saved =
        await saveRoomQuoteFloorDraft({
          roomId: room.id,
          draftId: Number(req.params.id || 0),
          expectedVersion: req.body?.version,
          actorUserId: req.user?.id || null,
          payload: req.body || {},
          computed: {
            ...(draftPreview.periodFinancialPreview?.quoteFloor || preview?.quoteFloor || {}),
            periodPlanning: draftPreview.periodPlanning || null,
            planningInputs: planningInputsFromPayload(req.body || {}),
          },
          context: serviceContext,
        });

      await audit(req, {
        action: "ROOM_QUOTE_FLOOR_DRAFT_UPDATED",
        entity: "RoomQuoteFloorDraft",
        entityId: saved.id,
        meta: {
          roomId: room.id,
          agreementId: serviceContext?.agreementId || null,
          sourceShiftId: serviceContext?.sourceShiftId || null,
          scopeHash: serviceContext?.scopeHash || null,
          idempotent: saved.idempotent === true,
        },
      });

      return res.json({
        ok: true,
        item: saved,
        preview,
      });
    })
  );

  r.post(
    "/room/financial-operations/quote-floor-drafts/:id/apply",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const saved =
        await applyRoomQuoteFloorDraft({
          roomId: room.id,
          draftId: Number(req.params.id || 0),
          expectedVersion: req.body?.version,
          actorUserId: req.user?.id || null,
          payload: req.body || {},
        });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.post(
    "/room/financial-operations/quote-floor-drafts/:id/archive",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const saved =
        await archiveRoomQuoteFloorDraft({
          roomId: room.id,
          draftId: Number(req.params.id || 0),
          expectedVersion: req.body?.version,
          actorUserId: req.user?.id || null,
        });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.get(
    "/room/items",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      return res.json({
        items: await buildRoomCommercialItems(req.user),
      });
    })
  );

  return r;
}
