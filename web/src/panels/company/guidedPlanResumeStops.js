function finiteCoordinate(value) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeDestination(destination) {
  const lat = finiteCoordinate(destination?.lat);
  const lng = finiteCoordinate(destination?.lng);
  const name = String(destination?.title || destination?.address || "").trim();
  if (!name || lat == null || lng == null) return null;
  return { name, lat, lng };
}

function sameStop(current, desired) {
  return String(current?.name || "").trim() === desired.name
    && Number(current?.lat) === desired.lat
    && Number(current?.lng) === desired.lng
    && Number(current?.order) === desired.order
    && String(current?.type || "MANUAL").toUpperCase() === desired.type;
}

/**
 * Build the minimal, non-destructive stop changes for a server-resumed DRAFT.
 * Existing shifts are never recreated and extra existing stops are preserved.
 */
export function buildGuidedResumeStopSyncPlan({ shiftId, currentStops = [], destinations = [] } = {}) {
  const id = Number(shiftId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const updates = [];
  const additions = [];
  const existing = Array.isArray(currentStops) ? currentStops : [];

  (Array.isArray(destinations) ? destinations : [])
    .map(normalizeDestination)
    .filter(Boolean)
    .forEach((destination, index) => {
      const desired = {
        ...destination,
        order: index + 1,
        type: "MANUAL",
      };
      const current = existing[index];
      if (current?.id != null) {
        if (!sameStop(current, desired)) updates.push({ stopId: Number(current.id), ...desired });
      } else {
        additions.push(desired);
      }
    });

  return { shiftId: id, updates, additions };
}
