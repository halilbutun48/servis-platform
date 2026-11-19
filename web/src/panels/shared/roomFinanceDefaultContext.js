function positiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validDateValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? text.slice(0, 10) : "";
}

function timestampOf(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function hasPositiveMeasurement(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function isComputableDoneShift(shift) {
  const status = String(shift?.status || "").trim().toUpperCase();
  return (status === "DONE" || status === "COMPLETED")
    && positiveId(shift?.agreementId)
    && positiveId(shift?.vehicleId || shift?.vehicle?.id)
    && positiveId(shift?.driverId || shift?.driver?.id)
    && hasPositiveMeasurement(shift?.routeSnapshotDistanceM)
    && hasPositiveMeasurement(shift?.routeSnapshotDurationSec);
}

function isSelectableAgreement(agreement) {
  const status = String(agreement?.status || "").trim().toUpperCase();
  return status === "ACTIVE" || status === "APPROVED" || status === "COMPLETED" || status === "DONE";
}

/**
 * Selects the first normal-menu ROOM context that can be sent to the
 * canonical preview without inventing a cost. The directory is tenant-scoped
 * by the API, and only a completed, routed service is eligible here.
 */
export function selectDefaultComputableRoomService({
  agreements = [],
  shifts = [],
  referenceDate = new Date(),
  preferHistorical = false,
  preferredVehicleId = null,
  preferredPeriodStart = null,
  preferredPeriodEnd = null,
} = {}) {
  const referenceTimestamp = timestampOf(referenceDate);
  const candidates = listComputableRoomServiceCandidates({
    agreements,
    shifts,
    preferredVehicleId,
    preferredPeriodStart,
    preferredPeriodEnd,
  }).sort((left, right) => (
      periodPriority(left, referenceTimestamp) - periodPriority(right, referenceTimestamp)
      || periodDistance(left, referenceTimestamp) - periodDistance(right, referenceTimestamp)
      || right.agreementEndAt - left.agreementEndAt
      || right.agreementStartAt - left.agreementStartAt
      || right.shiftStartAt - left.shiftStartAt
      || right.agreementId - left.agreementId
      || right.shiftId - left.shiftId
    ));

  if (!candidates.length) return null;
  const historicalCandidates = preferHistorical && referenceTimestamp
    ? candidates.filter((candidate) => candidate.agreementEndAt <= referenceTimestamp)
    : candidates;
  const candidate = (historicalCandidates.length ? historicalCandidates : candidates)[0];
  return {
    agreementId: candidate.agreementId,
    shiftId: candidate.shiftId,
    vehicleId: candidate.vehicleId,
    driverId: candidate.driverId,
    periodStart: candidate.periodStart,
    periodEnd: candidate.periodEnd,
  };
}

/**
 * Lists completed, routed services that belong to the selected operational
 * vehicle and period. The UI can use this list as one service picker while
 * resolving customer, agreement and shift relationships canonically.
 */
export function listComputableRoomServiceCandidates({
  agreements = [],
  shifts = [],
  preferredVehicleId = null,
  preferredPeriodStart = null,
  preferredPeriodEnd = null,
} = {}) {
  const agreementById = new Map(
    (Array.isArray(agreements) ? agreements : [])
      .map((agreement) => [positiveId(agreement?.id), agreement])
      .filter(([id]) => id != null),
  );
  return (Array.isArray(shifts) ? shifts : [])
    .filter(isComputableDoneShift)
    .map((shift) => {
      const agreementId = positiveId(shift?.agreementId);
      const agreement = agreementById.get(agreementId);
      if (!agreement || !isSelectableAgreement(agreement)) return null;
      const vehicleId = positiveId(shift?.vehicleId || shift?.vehicle?.id);
      const driverId = positiveId(shift?.driverId || shift?.driver?.id);
      const periodStart = validDateValue(agreement?.startDate || agreement?.startAt);
      const periodEnd = validDateValue(agreement?.endDate || agreement?.endAt);
      if (!periodStart || !periodEnd) return null;
      return {
        agreementId,
        shiftId: positiveId(shift?.id),
        vehicleId,
        driverId,
        periodStart,
        periodEnd,
        agreementEndAt: timestampOf(agreement?.endDate || agreement?.endAt),
        agreementStartAt: timestampOf(agreement?.startDate || agreement?.startAt),
        shiftStartAt: timestampOf(shift?.startAt || shift?.createdAt),
      };
    })
    .filter(Boolean)
    .filter((candidate) => matchesPreferredOperationalScope(candidate, {
      preferredVehicleId,
      preferredPeriodStart,
      preferredPeriodEnd,
    }))
    .sort((left, right) => (
      left.periodStart.localeCompare(right.periodStart)
      || left.periodEnd.localeCompare(right.periodEnd)
      || left.agreementId - right.agreementId
      || left.shiftId - right.shiftId
    ));
}

function matchesPreferredOperationalScope(candidate, { preferredVehicleId, preferredPeriodStart, preferredPeriodEnd } = {}) {
  const vehicleId = positiveId(preferredVehicleId);
  const periodStart = validDateValue(preferredPeriodStart);
  const periodEnd = validDateValue(preferredPeriodEnd);
  if (vehicleId && candidate.vehicleId !== vehicleId) return false;
  if (periodStart && candidate.periodStart !== periodStart) return false;
  if (periodEnd && candidate.periodEnd !== periodEnd) return false;
  return true;
}

function periodPriority(candidate, referenceTimestamp) {
  if (!referenceTimestamp) return 1;
  const nextMonthStart = nextMonthStartTimestamp(referenceTimestamp);
  const containsReference = candidate.agreementStartAt <= referenceTimestamp && candidate.agreementEndAt >= referenceTimestamp;
  const continuesIntoNextMonth = containsReference && candidate.agreementEndAt >= nextMonthStart;
  if (candidate.agreementStartAt >= nextMonthStart || continuesIntoNextMonth) return 0;
  if (containsReference) return 1;
  if (candidate.agreementStartAt > referenceTimestamp) return 2;
  return 3;
}

function periodDistance(candidate, referenceTimestamp) {
  if (!referenceTimestamp) return 0;
  const priority = periodPriority(candidate, referenceTimestamp);
  if (priority === 0 && candidate.agreementStartAt > referenceTimestamp) return candidate.agreementStartAt - referenceTimestamp;
  if (priority >= 2) return priority === 2
    ? candidate.agreementStartAt - referenceTimestamp
    : referenceTimestamp - candidate.agreementEndAt;
  return 0;
}

function nextMonthStartTimestamp(referenceTimestamp) {
  const reference = new Date(referenceTimestamp);
  return Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1);
}
