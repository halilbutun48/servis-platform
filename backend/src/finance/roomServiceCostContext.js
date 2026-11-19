
import { isVatNetRollupEligible } from './roomCostPolicy.js';
import { buildVatAdjustedProfitabilitySummary } from './roomProfitabilityAndQuoteFloor.js';

function vatScopedEntry(entry = {}, countedAmountMinor) {
  const counted = Number(countedAmountMinor);
  if (!Number.isSafeInteger(counted) || counted === 0) return null;
  const original = Math.abs(Number(entry?.amountMinor));
  const suppliedVat = entry?.vatAmountMinor == null || entry?.vatAmountMinor === ""
    ? null
    : Number(entry.vatAmountMinor);
  return {
    ...entry,
    amountMinor: Math.abs(counted),
    isReversal: counted < 0,
    vatAmountMinor: suppliedVat != null && Number.isSafeInteger(original) && original > 0
      ? Math.round(suppliedVat * Math.abs(counted) / original)
      : suppliedVat,
  };
}

export function positiveInteger(value) {
  const parsed = Number(value || 0);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function serviceCostSelectionFromQuery(query = {}) {
  return {
    offerId: positiveInteger(query.focusOfferId),
    vehicleId: positiveInteger(query.focusVehicleId),
    driverId: positiveInteger(query.focusDriverId),
    shiftId: positiveInteger(query.focusShiftId),
    agreementId: positiveInteger(query.focusAgreementId),
    ...(String(query.serviceCostContextRequired || "").trim().toLowerCase() === "true"
      ? { contextRequired: true }
      : {}),
  };
}

export function requiresExplicitServiceSelection(selection = {}) {
  return selection?.contextRequired === true
    && !selection?.shiftId
    && !selection?.agreementId
    && !selection?.offerId;
}

export function serviceCostSelectionFromPayload(payload = {}) {
  const context = payload?.serviceContext || payload?.context || {};
  return {
    offerId: positiveInteger(context.offerId),
    vehicleId: positiveInteger(context.vehicleId),
    driverId: positiveInteger(context.driverId),
    shiftId: positiveInteger(context.shiftId),
    agreementId: positiveInteger(context.agreementId),
  };
}

export function operationalFilterFromQuery(query = {}) {
  return {
    vehicleId: positiveInteger(query.filterVehicleId),
    driverId: positiveInteger(query.filterDriverId),
  };
}

export function operationalFilterScopeViolation({ selection = {}, vehicle = null, driver = null } = {}) {
  if (selection.vehicleId && !vehicle) {
    return { code: "ROOM_OPERATIONAL_FILTER_SCOPE_FORBIDDEN", field: "vehicle" };
  }
  if (selection.driverId && !driver) {
    return { code: "ROOM_OPERATIONAL_FILTER_SCOPE_FORBIDDEN", field: "driver" };
  }
  return null;
}

function parseFocusShiftId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

/**
 * A ROOM may preview a contractless market shift only through its own active
 * offer. The shift itself remains unassigned until the commercial flow
 * accepts it; the offer relation is the tenant-scoped authorization.
 */
export function roomFocusShiftWhere({ roomId, focusShiftId } = {}) {
  const scopedRoomId = parseFocusShiftId(roomId);
  const scopedShiftId = parseFocusShiftId(focusShiftId);
  return {
    id: scopedShiftId,
    status: { not: "DRAFT" },
    OR: [
      { roomId: scopedRoomId },
      {
        roomId: null,
        offers: {
          some: {
            roomId: scopedRoomId,
            status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] },
          },
        },
      },
    ],
  };
}

export function serviceCostShiftWhere(roomId, selection = {}) {
  const base = { roomId: Number(roomId) };
  if (selection.shiftId) return roomFocusShiftWhere({ roomId, focusShiftId: selection.shiftId });
  const context = {};
  if (selection.agreementId) context.agreementId = selection.agreementId;
  if (selection.vehicleId) context.vehicleId = selection.vehicleId;
  if (selection.driverId) context.driverId = selection.driverId;
  const routeEvidenceGuard = !selection.shiftId
    && !selection.agreementId
    && (!selection.vehicleId || !selection.driverId)
    ? {
      routeSnapshotValidatedAt: { not: null },
      routeSnapshotDistanceM: { gt: 0 },
      routeSnapshotDurationSec: { gt: 0 },
    }
    : {};
  return {
    ...base,
    ...context,
    ...routeEvidenceGuard,
    status: {
      in: ["APPROVED", "ACTIVE", "SPLIT"],
    },
  };
}

function matchesId(value, expected) {
  return positiveInteger(value) != null && positiveInteger(expected) != null
    && Number(value) === Number(expected);
}

function dateBoundary(value, endOfDay = false) {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) {
    return new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`).getTime();
  }
  return new Date(value).getTime();
}

function dateOnlyValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/u);
  return match ? match[1] : value;
}

function dateOnlyAtOrBefore(value, asOfDate) {
  if (asOfDate == null) return true;
  const candidate = dateOnlyValue(value);
  const cutoff = dateOnlyValue(asOfDate);
  return /^\d{4}-\d{2}-\d{2}$/u.test(String(candidate))
    && /^\d{4}-\d{2}-\d{2}$/u.test(String(cutoff))
    && candidate <= cutoff;
}

function allocationLineMatchesSelection(line, selection = {}) {
  // A selected shift is the narrowest economic scope.  An agreement-scoped
  // shared line may intentionally have no shift yet; it still belongs to the
  // selected service while a line explicitly allocated to another shift must
  // stay out of the preview.
  if (selection.shiftId) {
    if (matchesId(line?.shiftId, selection.shiftId)) return true;
    return !positiveInteger(line?.shiftId)
      && Boolean(selection.agreementId && matchesId(line?.agreementId, selection.agreementId));
  }
  return Boolean(selection.agreementId && matchesId(line?.agreementId, selection.agreementId));
}

function datesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const leftFrom = leftStart ? dateBoundary(leftStart) : null;
  const leftTo = leftEnd ? dateBoundary(leftEnd, true) : null;
  const rightFrom = rightStart ? dateBoundary(rightStart) : null;
  const rightTo = rightEnd ? dateBoundary(rightEnd, true) : null;
  if ([leftFrom, leftTo, rightFrom, rightTo].some((value) => !Number.isFinite(value))) return true;
  return leftFrom <= rightTo && rightFrom <= leftTo;
}

function dateRangeValid(start, end) {
  const startTime = new Date(start || "").getTime();
  const endTime = new Date(end || "").getTime();
  return Number.isFinite(startTime) && Number.isFinite(endTime) && startTime <= endTime;
}

function overlapMinutes(start, end, periodStart, periodEnd) {
  const startTime = Math.max(dateBoundary(start), dateBoundary(periodStart));
  const endTime = Math.min(dateBoundary(end, true), dateBoundary(periodEnd, true));
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return 0;
  return Math.round((endTime - startTime) / 60000);
}

function signedEntryAmount(entry) {
  const amountMinor = Number(entry?.amountMinor);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return entry?.isReversal ? -amountMinor : amountMinor;
}

function normalizedToken(value) {
  return String(value || "").trim().toUpperCase();
}

function serviceShiftForDecision(shift, periodStart, periodEnd) {
  const status = normalizedToken(shift?.status);
  if (["DRAFT", "REQUESTED"].includes(status)) return false;
  return positiveInteger(shift?.id)
    && positiveInteger(shift?.vehicleId)
    && dateRangeValid(shift?.startAt, shift?.endAt)
    && datesOverlap(shift.startAt, shift.endAt, periodStart, periodEnd);
}

function realizedShiftForDecision(shift, asOfDate = null) {
  if (normalizedToken(shift?.status) !== "DONE") return false;
  if (!dateOnlyAtOrBefore(shift?.startAt, asOfDate)) return false;
  return !shift?.progress?.completedAt || dateOnlyAtOrBefore(shift.progress.completedAt, asOfDate);
}

function entryMatchesDecisionPeriod(entry, periodStart, periodEnd) {
  return datesOverlap(
    entry?.periodStart || entry?.occurredAt,
    entry?.periodEnd || entry?.occurredAt,
    periodStart,
    periodEnd,
  );
}

function addDecisionBlocker(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function coverageSubjectMatches(shift, subjectKind, subjectId) {
  if (subjectKind === "DRIVER") return Number(shift?.driverId || 0) === Number(subjectId);
  if (subjectKind === "VEHICLE") return Number(shift?.vehicleId || 0) === Number(subjectId);
  return false;
}

function verifiedCoverageEvidence(evidence = {}) {
  const status = normalizedToken(evidence?.status);
  const sourceRef = String(evidence?.sourceRef || "").trim();
  const verifiedByUserId = positiveInteger(evidence?.verifiedByUserId);
  const verifiedUsageMinutes = Number(evidence?.verifiedUsageMinutes);
  const verifiedIdleMinutes = Number(evidence?.verifiedIdleMinutes);
  const unknownMinutes = Number(evidence?.unknownMinutes);
  const validMinutes = [verifiedUsageMinutes, verifiedIdleMinutes, unknownMinutes]
    .every((value) => Number.isSafeInteger(value) && value >= 0);
  if (!sourceRef || !verifiedByUserId || !validMinutes || !["PARTIAL", "COMPLETE"].includes(status)) return null;
  return {
    status,
    sourceRef,
    verifiedByUserId,
    verifiedUsageMinutes,
    verifiedIdleMinutes,
    unknownMinutes,
    unknownScope: unknownMinutes > 0,
    coverageComplete: status === "COMPLETE" && unknownMinutes === 0,
    verifiedUsageShiftIds: [],
    verifiedIdleSourceIds: [],
  };
}

/**
 * Separates proven completed usage from idle capacity and unknown period scope.
 * Existing DONE shifts are evidence of usage only; they do not prove that the
 * rest of the period was idle or that the listed shifts cover the full month.
 * A future canonical coverage record may supply the optional evidence object;
 * until then the safe status is UNKNOWN and no monthly capacity is invented.
 */
export function buildOperationalCoverageSummary({
  subjectKind = "VEHICLE",
  subjectId,
  periodStart,
  periodEnd,
  shifts = [],
  evidence = null,
  asOfDate = null,
} = {}) {
  const kind = normalizedToken(subjectKind);
  const selectedId = positiveInteger(subjectId);
  const observedRows = (Array.isArray(shifts) ? shifts : []).filter((shift) => (
    selectedId
    && coverageSubjectMatches(shift, kind, selectedId)
    && realizedShiftForDecision(shift, asOfDate)
    && dateRangeValid(shift?.startAt, shift?.endAt)
    && datesOverlap(shift.startAt, shift.endAt, periodStart, periodEnd)
  ));
  const verifiedUsageMinutes = observedRows.reduce(
    (sum, shift) => sum + overlapMinutes(shift.startAt, shift.endAt, periodStart, periodEnd),
    0,
  );
  const suppliedEvidence = verifiedCoverageEvidence(evidence);
  if (suppliedEvidence) {
    return Object.freeze({
      subjectKind: kind,
      subjectId: selectedId,
      ...suppliedEvidence,
      verifiedUsageShiftIds: observedRows.map((shift) => Number(shift.id)).filter(Boolean),
    });
  }
  return Object.freeze({
    subjectKind: kind,
    subjectId: selectedId,
    status: "UNKNOWN",
    verifiedUsageMinutes,
    verifiedUsageShiftIds: observedRows.map((shift) => Number(shift.id)).filter(Boolean),
    verifiedIdleMinutes: null,
    verifiedIdleSourceIds: [],
    unknownMinutes: null,
    unknownScope: true,
    coverageComplete: false,
    sourceRef: null,
    verifiedByUserId: null,
    reason: "PERIOD_COVERAGE_SOURCE_MISSING",
  });
}

/**
 * Builds the read-only vehicle/month decision layer from existing canonical
 * shift, realized-income and ROOM cost records. It deliberately refuses to
 * turn an agreement/offer amount into vehicle income when the earned-income
 * relation is not unique. It also never adds allocation-line amounts on top
 * of their source entry, so the same economic cost is counted once.
 */
export function buildVehicleMonthDecisionSummary({
  vehicleId,
  driverId,
  realizedOnly = false,
  periodStart,
  periodEnd,
  accountingPeriodClosed = false,
  asOfDate = null,
  shifts = [],
  coverageShifts = null,
  incomeLines = [],
  costEntries = [],
} = {}) {
  const selectedVehicleId = positiveInteger(vehicleId);
  const selectedDriverId = positiveInteger(driverId);
  const blockers = [];
  const missing = [];
  const lineage = [];
  const incomeCurrencies = new Set();
  const costCurrencies = new Set();
  const effectiveAsOfDate = asOfDate ?? (realizedOnly ? new Date() : null);
  const targetShifts = (Array.isArray(shifts) ? shifts : [])
    .filter((shift) => serviceShiftForDecision(shift, periodStart, periodEnd));
  const decisionShifts = realizedOnly
    ? targetShifts.filter((shift) => realizedShiftForDecision(shift, effectiveAsOfDate))
    : targetShifts;
  const operationalCoverageShifts = Array.isArray(coverageShifts) ? coverageShifts : shifts;
  const selectedShifts = decisionShifts.filter((shift) => (
    (!selectedVehicleId || Number(shift.vehicleId) === Number(selectedVehicleId))
      && (!selectedDriverId || Number(shift.driverId) === Number(selectedDriverId))
      && (!realizedOnly || realizedShiftForDecision(shift, effectiveAsOfDate))
  ));
  const realizedDecisionShifts = decisionShifts.filter((shift) => realizedShiftForDecision(shift, effectiveAsOfDate));
  const realizedSelectedShifts = selectedShifts.filter((shift) => realizedShiftForDecision(shift, effectiveAsOfDate));
  const incomeDecisionShifts = effectiveAsOfDate == null ? decisionShifts : realizedDecisionShifts;
  const incomeSelectedShifts = effectiveAsOfDate == null ? selectedShifts : realizedSelectedShifts;
  const selectedShiftIds = new Set(selectedShifts.map((shift) => Number(shift.id)));
  const selectedVehicleIds = new Set([
    ...(selectedVehicleId ? [selectedVehicleId] : []),
    ...selectedShifts.map((shift) => Number(shift.vehicleId || 0)).filter(Boolean),
  ]);
  const selectedAgreementIds = new Set(selectedShifts.map((shift) => Number(shift.agreementId || 0)).filter(Boolean));
  const selectedDriverIds = new Set([
    ...(selectedDriverId ? [selectedDriverId] : []),
    ...selectedShifts.map((shift) => Number(shift.driverId || 0)).filter(Boolean),
  ]);
  const matchesScope = (item = {}) => {
    const itemVehicleId = Number(item?.vehicleId || 0);
    const itemDriverId = Number(item?.driverId || 0);
    if (selectedVehicleId && selectedDriverId) {
      return itemVehicleId === Number(selectedVehicleId)
        && itemDriverId === Number(selectedDriverId);
    }
    if (selectedVehicleId) {
      return itemVehicleId === Number(selectedVehicleId)
        || selectedDriverIds.has(itemDriverId);
    }
    if (selectedDriverId) return itemDriverId === Number(selectedDriverId);
    return selectedVehicleIds.has(itemVehicleId) || selectedDriverIds.has(itemDriverId);
  };
  const operationalCoverage = {
    vehicle: buildOperationalCoverageSummary({
      subjectKind: "VEHICLE",
      subjectId: selectedVehicleId,
      periodStart,
      periodEnd,
      shifts: operationalCoverageShifts,
      asOfDate: effectiveAsOfDate,
    }),
    drivers: [...selectedDriverIds].map((driverId) => buildOperationalCoverageSummary({
      subjectKind: "DRIVER",
      subjectId: driverId,
      periodStart,
      periodEnd,
      shifts: operationalCoverageShifts,
      asOfDate: effectiveAsOfDate,
    })),
  };
  operationalCoverage.primary = selectedVehicleId
    ? operationalCoverage.vehicle
    : operationalCoverage.drivers.find((item) => Number(item?.subjectId) === Number(selectedDriverId))
      || operationalCoverage.drivers[0]
      || null;

  if (!selectedVehicleId && !selectedDriverId && !realizedOnly) missing.push("vehicleId/driverId");
  if (!dateRangeValid(periodStart, periodEnd)) missing.push("periodStart/periodEnd");
  if (!selectedShifts.length) missing.push("vehicleMonthServiceEvidence");

  const includedIncomeKeys = new Set();
  let earnedIncomeMinor = 0;
  const incomeEvidence = [];
  for (const line of Array.isArray(incomeLines) ? incomeLines : []) {
    const amountMinor = Number(line?.amountMinor);
    const currencyCode = normalizedToken(line?.currencyCode);
    const agreementId = positiveInteger(line?.agreementId);
    const directShiftId = positiveInteger(line?.shiftId);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || !currencyCode) {
      addDecisionBlocker(blockers, "REALIZED_INCOME_LINE_INVALID");
      continue;
    }
    const key = `${line?.hakedisId || "H"}|${line?.invoiceId || "I"}|${agreementId || "A"}|${line?.periodStart || ""}|${line?.periodEnd || ""}`;
    if (includedIncomeKeys.has(key)) continue;

    let relationStatus = "UNRELATED";
    let relatedShifts = [];
    if (directShiftId) {
      relatedShifts = incomeSelectedShifts.filter((shift) => Number(shift.id) === Number(directShiftId));
      relationStatus = relatedShifts.length ? "DIRECT_SHIFT" : "SHIFT_NOT_SELECTED";
    } else if (agreementId) {
      relatedShifts = incomeDecisionShifts.filter((shift) => Number(shift.agreementId) === Number(agreementId));
      const relatedVehicleIds = new Set(relatedShifts.map((shift) => Number(shift.vehicleId)).filter(Boolean));
      const relatedDriverIds = new Set(relatedShifts.map((shift) => Number(shift.driverId)).filter(Boolean));
      const driverMatches = !selectedDriverId
        || (relatedDriverIds.size === 1 && relatedDriverIds.has(Number(selectedDriverId)));
      const explicitVehicleIds = [
        line?.vehicleId,
        line?.assignedVehicleId,
        line?.vehicle?.id,
        line?.assignment?.vehicleId,
      ].map(positiveInteger).filter(Boolean);
      const explicitVehicleMatches = Boolean(
        selectedVehicleId
          && explicitVehicleIds.includes(Number(selectedVehicleId))
          && relatedShifts.some((shift) => (
            Number(shift.vehicleId) === Number(selectedVehicleId)
              && (!selectedDriverId || Number(shift.driverId) === Number(selectedDriverId))
          )),
      );
      // An agreement's single operational vehicle is not proof that the
      // agreement-level revenue belongs to that vehicle.  Vehicle economics
      // require a direct shift or an explicit vehicle attribution on the
      // income line; driver-only scope may still use a unique agreement
      // driver because it is a different, intentionally narrower subject.
      if (explicitVehicleMatches && relatedShifts.length) {
        relationStatus = "EXPLICIT_VEHICLE";
      } else if (!selectedVehicleId && selectedDriverId && driverMatches && relatedShifts.length) {
        relationStatus = "UNIQUE_AGREEMENT_DRIVER";
      } else if (!selectedVehicleId && !selectedDriverId && relatedShifts.length) {
        relationStatus = "PERIOD_SCOPE";
      } else if (relatedVehicleIds.size > 1) {
        relationStatus = "AMBIGUOUS_AGREEMENT_VEHICLE";
      } else if (selectedDriverId && relatedDriverIds.size > 1) {
        relationStatus = "AMBIGUOUS_AGREEMENT_DRIVER";
      } else if (selectedVehicleId) {
        relationStatus = "AGREEMENT_VEHICLE_RELATION_NOT_PROVEN";
      } else {
        relationStatus = "AGREEMENT_NOT_SELECTED";
      }
    }

    if (!["DIRECT_SHIFT", "EXPLICIT_VEHICLE", "UNIQUE_AGREEMENT_DRIVER", "PERIOD_SCOPE"].includes(relationStatus)) {
      incomeEvidence.push({ ...line, amountMinor, currencyCode, relationStatus, counted: false });
      addDecisionBlocker(blockers, relationStatus === "AMBIGUOUS_AGREEMENT_VEHICLE"
        ? "EARNED_INCOME_VEHICLE_RELATION_AMBIGUOUS"
        : "EARNED_INCOME_VEHICLE_RELATION_MISSING");
      continue;
    }

    incomeCurrencies.add(currencyCode);
    includedIncomeKeys.add(key);
    earnedIncomeMinor += amountMinor;
    incomeEvidence.push({ ...line, amountMinor, currencyCode, relationStatus, counted: true });
    lineage.push({
      kind: "REALIZED_INCOME",
      agreementId,
      shiftIds: relatedShifts.map((shift) => Number(shift.id)),
      hakedisId: positiveInteger(line?.hakedisId),
      invoiceId: positiveInteger(line?.invoiceId),
      amountMinor,
      currencyCode,
      counted: true,
    });
  }

  if (!incomeEvidence.some((line) => line.counted)) {
    earnedIncomeMinor = null;
    missing.push("earnedIncomeEvidence");
  }

  const costComponents = new Map();
  const vatCostEntries = [];
  const unallocatedCostEntries = [];
  const pendingAllocationEntryIds = [];
  let grossActualCostMinor = null;
  let distributedActualCostMinor = null;
  let pendingAllocationAmountMinor = 0;
  for (const entry of Array.isArray(costEntries) ? costEntries : []) {
    const amountMinor = signedEntryAmount(entry);
    if (amountMinor == null) continue;
    if (normalizedToken(entry?.lifecycle) !== "CONFIRMED" || normalizedToken(entry?.recordKind) !== "ACTUAL") continue;
    if (normalizedToken(entry?.allocation) === "EXCLUDED_FROM_ROLLUP") continue;
    if (!entryMatchesDecisionPeriod(entry, periodStart, periodEnd)) continue;

    const allocationLines = Array.isArray(entry?.allocationLines) ? entry.allocationLines : [];
    const directOwner = (
      (selectedVehicleId || selectedDriverId)
        ? matchesScope(entry)
        : false
    )
      || selectedShiftIds.has(Number(entry?.shiftId || 0))
      || selectedAgreementIds.has(Number(entry?.agreementId || 0));
    const directShiftOwner = positiveInteger(entry?.shiftId)
      && selectedShiftIds.has(Number(entry.shiftId));
    const matchingLines = allocationLines.filter((line) => (
      ((selectedVehicleId || selectedDriverId) && matchesScope(line))
      || selectedShiftIds.has(Number(line?.shiftId || 0))
      || selectedAgreementIds.has(Number(line?.agreementId || 0))
    ));
    const matchingLineAmountMinor = matchingLines.reduce((sum, line) => {
      const lineAmount = Number(line?.allocatedAmountMinor);
      return Number.isSafeInteger(lineAmount) && lineAmount > 0 ? sum + lineAmount : sum;
    }, 0);
    let includedAmountMinor = 0;
    let distributedAmountMinor = 0;
    if (allocationLines.length > 0) {
      if (matchingLineAmountMinor > 0) {
        includedAmountMinor = directOwner ? amountMinor : (entry?.isReversal ? -matchingLineAmountMinor : matchingLineAmountMinor);
        distributedAmountMinor = entry?.isReversal ? -matchingLineAmountMinor : matchingLineAmountMinor;
      } else if (!directOwner) {
        unallocatedCostEntries.push({ entryId: entry.id, reason: "OTHER_OWNER_OR_UNRELATED_ALLOCATION" });
        continue;
      } else {
        addDecisionBlocker(blockers, "SOURCE_OWNER_ALLOCATION_MISMATCH");
        continue;
      }
    } else if (directOwner) {
      includedAmountMinor = amountMinor;
      if (directShiftOwner) {
        // An exact shift-owned direct expense already has a canonical service
        // target. It must not wait for a second allocation line or inflate the
        // pending bucket; period-only vehicle/driver costs still do.
        distributedAmountMinor = amountMinor;
      } else {
        pendingAllocationEntryIds.push(entry.id);
        pendingAllocationAmountMinor += Math.abs(amountMinor);
      }
    } else {
      unallocatedCostEntries.push({ entryId: entry.id, reason: "UNASSIGNED_OR_GENERAL_OVERHEAD" });
      continue;
    }

    const categoryKey = normalizedToken(entry?.categoryKey) || "OTHER_OPERATION";
    const current = costComponents.get(categoryKey) || {
      categoryKey,
      amountMinor: 0,
      distributedAmountMinor: 0,
      pendingAmountMinor: 0,
      currencyCode: null,
      sourceEntryIds: [],
    };
    current.amountMinor += includedAmountMinor;
    current.distributedAmountMinor += distributedAmountMinor;
    current.pendingAmountMinor += Math.max(0, Math.abs(includedAmountMinor) - Math.abs(distributedAmountMinor));
    const costCurrencyCode = normalizedToken(entry?.currencyCode) || null;
    current.currencyCode = costCurrencyCode || current.currencyCode;
    if (!current.sourceEntryIds.includes(entry.id)) current.sourceEntryIds.push(entry.id);
    costComponents.set(categoryKey, current);
    if (costCurrencyCode) {
      costCurrencies.add(costCurrencyCode);
    } else {
      missing.push("actualCostCurrency");
      addDecisionBlocker(blockers, "ACTUAL_COST_CURRENCY_MISSING");
    }
    grossActualCostMinor = (grossActualCostMinor ?? 0) + includedAmountMinor;
    distributedActualCostMinor = (distributedActualCostMinor ?? 0) + distributedAmountMinor;
    const vatEntry = vatScopedEntry(entry, includedAmountMinor);
    if (vatEntry) vatCostEntries.push(vatEntry);
    lineage.push({
      kind: "ACTUAL_COST",
      entryId: entry.id,
      sourceRef: entry?.sourceRef || null,
      categoryKey,
      amountMinor: includedAmountMinor,
      distributedAmountMinor,
      shiftIds: matchingLines.map((line) => positiveInteger(line?.shiftId)).filter(Boolean),
      counted: true,
    });
    if (!isVatNetRollupEligible(entry)) {
      addDecisionBlocker(blockers, "VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN");
    }
  }

  const hasPeriodicOwnerCost = (Array.isArray(costEntries) ? costEntries : []).some((entry) => {
    if (normalizedToken(entry?.lifecycle) !== "CONFIRMED" || normalizedToken(entry?.recordKind) !== "ACTUAL") return false;
    if (!entryMatchesDecisionPeriod(entry, periodStart, periodEnd)) return false;
    if (!["PERIODIC", "RECURRING"].includes(normalizedToken(entry?.occurrenceKind))) return false;
    return Number(entry?.vehicleId || 0) === Number(selectedVehicleId)
      || selectedDriverIds.has(Number(entry?.driverId || 0));
  });
  const coverageIncomplete = operationalCoverage.vehicle?.coverageComplete !== true
    || operationalCoverage.drivers.some((item) => item.coverageComplete !== true);
  if (hasPeriodicOwnerCost && coverageIncomplete) {
    missing.push("operationalCoverage");
    addDecisionBlocker(blockers, "OPERATIONAL_COVERAGE_NOT_PROVEN");
  }

  const currencies = new Set([...incomeCurrencies, ...costCurrencies]);
  if (currencies.size > 1) addDecisionBlocker(blockers, "MIXED_CURRENCIES");
  if (pendingAllocationEntryIds.length) addDecisionBlocker(blockers, "COST_ALLOCATION_EVIDENCE_PENDING");
  if (accountingPeriodClosed !== true) addDecisionBlocker(blockers, "ACCOUNTING_PERIOD_NOT_CLOSED");
  if (grossActualCostMinor == null || grossActualCostMinor < 0) missing.push("actualCostEvidence");

  const activityResultMinor = earnedIncomeMinor != null
    && grossActualCostMinor != null
    && !blockers.includes("MIXED_CURRENCIES")
    ? earnedIncomeMinor - grossActualCostMinor
    : null;
  const confirmedNetProfitMinor = earnedIncomeMinor != null
    && accountingPeriodClosed === true
    && !blockers.some((item) => ["MIXED_CURRENCIES", "VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN", "COST_ALLOCATION_EVIDENCE_PENDING", "ACCOUNTING_PERIOD_NOT_CLOSED", "OPERATIONAL_COVERAGE_NOT_PROVEN"].includes(item))
    ? activityResultMinor
    : null;
  const vatAdjustedProfitability = buildVatAdjustedProfitabilitySummary({
    periodStart,
    periodEnd,
    earnedIncomeLines: incomeEvidence.filter((line) => line.counted),
    costEntries: vatCostEntries,
  });
  return Object.freeze({
    vehicleId: selectedVehicleId,
    driverId: selectedDriverId,
    vehicleIds: [...new Set(selectedShifts.map((shift) => Number(shift.vehicleId || 0)).filter(Boolean))],
    driverIds: [...selectedDriverIds],
    realizedOnly: realizedOnly === true,
    realizedShiftCount: realizedSelectedShifts.length,
    verifiedUsageMinutes: realizedSelectedShifts.reduce(
      (sum, shift) => sum + overlapMinutes(shift.startAt, shift.endAt, periodStart, periodEnd),
      0,
    ),
    verifiedDistanceM: realizedSelectedShifts.reduce((sum, shift) => {
      const distanceM = Number(shift?.routeSnapshotDistanceM);
      return Number.isSafeInteger(distanceM) && distanceM > 0 ? sum + distanceM : sum;
    }, 0),
    customerIds: [...new Set(selectedShifts.map((shift) => Number(shift.companyId || shift?.company?.id || 0)).filter(Boolean))],
    customerLabels: [...new Map(selectedShifts
      .map((shift) => [Number(shift.companyId || shift?.company?.id || 0), shift?.company?.name || null])
      .filter(([id, name]) => id > 0 && name)
      .map(([id, name]) => [id, name]))].map(([id, name]) => ({ id, name })),
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    shiftIds: selectedShifts.map((shift) => Number(shift.id)),
    agreementIds: [...selectedAgreementIds],
    status: activityResultMinor != null ? "PROVISIONAL_ACTIVITY_RESULT" : "NOT_PROVEN",
    earnedIncomeMinor,
    earnedIncomeCurrencyCode: incomeCurrencies.size === 1 ? [...incomeCurrencies][0] : null,
    grossActualCostMinor,
    distributedActualCostMinor,
    pendingAllocationAmountMinor,
    activityResultMinor,
    confirmedNetProfitMinor,
    vatAdjustedProfitability,
    operationalCoverage,
    costComponents: [...costComponents.values()],
    incomeEvidence,
    unallocatedCostEntries,
    pendingAllocationEntryIds,
    missing: [...new Set(missing)],
    blockers: [...new Set(blockers)],
    lineage,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

function ownerBasedPeriodicEntryMatchesSelection(entry, targetShift) {
  // A periodic owner cost is intentionally not agreement-scoped.  A selected
  // shift may still belong to an agreement, and that agreement must not hide a
  // pending vehicle/driver cost from the service-cost preview.
  if (!targetShift || positiveInteger(entry?.agreementId)) return false;
  if (positiveInteger(entry?.shiftId) || String(entry?.allocation || "DIRECT").toUpperCase() !== "COUNT_IN_ROLLUP") return false;
  const occurrenceKind = normalizedToken(entry?.occurrenceKind);
  if (!["PERIODIC", "RECURRING"].includes(occurrenceKind)) return false;
  if (!dateRangeValid(entry?.periodStart, entry?.periodEnd)) return false;
  if (positiveInteger(entry?.roomId) && positiveInteger(targetShift?.roomId)
    && Number(entry.roomId) !== Number(targetShift.roomId)) return false;
  const sameOwner = (positiveInteger(entry?.vehicleId) && matchesId(entry.vehicleId, targetShift.vehicleId))
    || (positiveInteger(entry?.driverId) && matchesId(entry.driverId, targetShift.driverId));
  if (!sameOwner) return false;
  return datesOverlap(
    dateOnlyValue(entry?.periodStart),
    dateOnlyValue(entry?.periodEnd),
    targetShift?.startAt,
    targetShift?.endAt,
  );
}

function hasPositiveAllocationAmount(line) {
  return Number.isSafeInteger(Number(line?.allocatedAmountMinor))
    && Number(line.allocatedAmountMinor) > 0;
}

export function filterServiceCostEntriesForContext(entries = [], selection = {}, options = {}) {
  const selectedAgreementId = positiveInteger(selection.agreementId);
  const selectedShiftId = positiveInteger(selection.shiftId);
  const selectedOfferId = positiveInteger(selection.offerId);
  const scopedRoomId = positiveInteger(options.roomId);
  const includePending = options?.includePending === true;
  if (!selectedAgreementId && !selectedShiftId && !selectedOfferId) return [];

  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    if (scopedRoomId && positiveInteger(entry?.roomId) !== scopedRoomId) return false;
    const targetShiftAgreementId = positiveInteger(options?.targetShift?.agreementId);
    const scopedAgreementId = selectedAgreementId || targetShiftAgreementId;
    const entryAgreementId = positiveInteger(entry?.agreementId);
    if (scopedAgreementId && entryAgreementId && entryAgreementId !== scopedAgreementId) return false;
    const recordKind = normalizedToken(entry?.recordKind);
    const sourceType = normalizedToken(entry?.sourceType);
    const sourceRef = String(entry?.sourceRef || "").trim();
    const offerForecastMatch = selectedOfferId
      && ["FORECAST", "BUDGET"].includes(recordKind)
      && sourceType === "ROOM_QUOTE_FORECAST"
      && sourceRef.startsWith(`ROOM-QUOTE-FORECAST-OFFER-${selectedOfferId}-`);
    if (offerForecastMatch) return true;
    const directMatch = selectedShiftId
      ? matchesId(entry?.shiftId, selectedShiftId)
      : Boolean(selectedAgreementId && matchesId(entry?.agreementId, selectedAgreementId));
    const allocation = String(entry?.allocation || "DIRECT").toUpperCase();
    const allocationMatch = Array.isArray(entry?.allocationLines)
      && entry.allocationLines.some((line) => allocationLineMatchesSelection(line, {
        agreementId: selectedAgreementId,
        shiftId: selectedShiftId,
      }) && hasPositiveAllocationAmount(line));
    const ownerBasedPendingMatch = options?.includePending === true
      && ownerBasedPeriodicEntryMatchesSelection(entry, options?.targetShift);
    const hasExistingAllocationLines = Array.isArray(entry?.allocationLines) && entry.allocationLines.length > 0;
    const agreementOwnedPendingMatch = includePending
      && selectedAgreementId
      && matchesId(entryAgreementId, selectedAgreementId)
      && !hasExistingAllocationLines;
    if (allocation === "EXCLUDED_FROM_ROLLUP") return false;
    if (allocation === "COUNT_IN_ROLLUP") {
      // An already allocated roll-up entry belongs to its recorded target;
      // owner-based pending fallback is only for a genuinely unallocated
      // periodic source, never for a line allocated to another shift.
      return allocationMatch || (includePending && directMatch)
        || (includePending && !hasExistingAllocationLines && ownerBasedPendingMatch)
        || agreementOwnedPendingMatch;
    }
    return directMatch || allocationMatch;
  });
}

export function resolveServiceCostContext({
  agreement = null,
  shift = null,
  requestedVehicleId = null,
} = {}) {
  const sameRoom = Boolean(
    shift
      && Number(shift.roomId) > 0
      && (!agreement || (Number(agreement.roomId) > 0 && Number(agreement.roomId) === Number(shift.roomId))),
  );
  const shiftAgreementId = positiveInteger(shift?.agreementId);
  const selectedAgreementId = positiveInteger(agreement?.id);
  const sameAgreement = Boolean(
    sameRoom
      && ((selectedAgreementId && shiftAgreementId && shiftAgreementId === selectedAgreementId)
        || (!selectedAgreementId && !shiftAgreementId)),
  );
  // An agreement vehicle is the planned/commercial vehicle.  A ROOM
  // reassignment may legitimately change the operational vehicle on the
  // selected shift; service-cost scope must follow that current shift while
  // retaining the same-room and same-agreement guards above.
  const sameVehicle = Boolean(
    sameAgreement
      && Number(shift.vehicleId) > 0,
  );
  const requestedVehicleMatches = !requestedVehicleId
    || Number(requestedVehicleId) === Number(shift?.vehicleId || 0);
  const coherent = sameVehicle && requestedVehicleMatches;

  return {
    coherent,
    agreement: coherent ? agreement : null,
    shift,
    reason: coherent
      ? null
      : !sameRoom
        ? "SERVIS_VARDIYA_TENANT_OR_CONTEXT_MISMATCH"
        : !sameAgreement
          ? selectedAgreementId && !shiftAgreementId
            ? "SERVIS_VARDIYA_AGREEMENT_REQUIRED"
            : "SERVIS_VARDIYA_AGREEMENT_MISMATCH"
          : "SERVIS_VARDIYA_VEHICLE_MISMATCH",
  };
}

export function selectedRoomMarketOffer(shift = null, roomId = null) {
  if (!shift || shift.roomId != null || shift.agreementId != null) return null;
  const targetRoomId = positiveInteger(roomId);
  if (!targetRoomId || !Array.isArray(shift.offers)) return null;
  return shift.offers.find((offer) => Number(offer?.roomId) === targetRoomId) || null;
}
