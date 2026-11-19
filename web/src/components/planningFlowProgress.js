const ACTIVE_OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED", "REJECTED", "WITHDRAWN"]);

export const PLANNING_FLOW_STEPS = Object.freeze([
  { key: "location", label: "Konum / hizmet bölgesi", modalStep: 0 },
  { key: "schedule", label: "Çalışma günleri ve saatleri", modalStep: 1 },
  { key: "personnel", label: "Personel listesi", modalStep: 2 },
  { key: "stops", label: "Durakları oluştur / getir", modalStep: 2 },
  { key: "route", label: "Durakları sırala ve OSRM rotasını optimize et", modalStep: 3 },
  { key: "budget", label: "Talep bütçesi", modalStep: 1 },
  { key: "offers", label: "Taşımacılık firmalarını seç ve toplu teklif gönder", modalStep: 3 },
]);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasCoordinate(value) {
  return finiteNumber(value) != null;
}

function hasSchedule(shift) {
  const start = Date.parse(shift?.startAt || "");
  const end = Date.parse(shift?.endAt || "");
  return Number.isFinite(start) && Number.isFinite(end) && start <= end;
}

function hasStops(shift) {
  return Array.isArray(shift?.stops) && shift.stops.length > 0;
}

function hasValidatedRoute(shift) {
  return Boolean(
    shift?.routeSnapshotValidatedAt
      && finiteNumber(shift?.routeSnapshotDistanceM) > 0
      && finiteNumber(shift?.routeSnapshotDurationSec) > 0
  );
}

function hasBudget(shift) {
  return finiteNumber(shift?.companyOfferAmount) > 0;
}

function hasSentOffer(shift) {
  return Array.isArray(shift?.offers)
    && shift.offers.some((offer) => ACTIVE_OFFER_STATUSES.has(String(offer?.status || "").toUpperCase()));
}

export function buildPlanningFlowProgress({ hub = {}, personels = [], shifts = [], summary = {}, companyRegionId = null } = {}) {
  const shiftItems = Array.isArray(shifts) ? shifts : [];
  const personnelItems = Array.isArray(personels) ? personels : [];
  const doneByKey = {
    location: hasCoordinate(hub?.hubLat) && hasCoordinate(hub?.hubLng) && (companyRegionId == null || Number(companyRegionId) > 0),
    schedule: shiftItems.some(hasSchedule),
    personnel: personnelItems.length > 0,
    stops: shiftItems.some(hasStops),
    route: shiftItems.some(hasValidatedRoute),
    budget: shiftItems.some(hasBudget),
    offers: shiftItems.some(hasSentOffer) || Number(summary?.openOffersCount || 0) > 0,
  };
  const steps = PLANNING_FLOW_STEPS.map((step) => ({ ...step, done: Boolean(doneByKey[step.key]) }));
  const nextStepIndex = steps.findIndex((step) => !step.done);
  const allDone = nextStepIndex === -1;

  return {
    steps,
    nextStep: allDone ? null : steps[nextStepIndex],
    nextStepIndex: allDone ? null : nextStepIndex,
    allDone,
    source: {
      hubReady: doneByKey.location,
      personnelCount: personnelItems.length,
      shiftCount: shiftItems.length,
      openOffersCount: Number(summary?.openOffersCount || 0),
    },
  };
}
