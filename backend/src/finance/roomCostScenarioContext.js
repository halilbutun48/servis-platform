import { buildCostAllocationProjection, buildForecastCostAllocationProjection } from "./roomCostAllocation.js";
import {
  adaptForecastLedgerEntriesToOperationalInputs,
  adaptLedgerEntriesToOperationalInputs,
  buildRoomPlanningEvidence,
} from "./roomCostPreviewAdapter.js";
import { filterServiceCostEntriesForContext } from "./roomServiceCostContext.js";

/**
 * Build the actual-cost context for a ROOM cost scenario from the same
 * selected-service allocation projection used by financial operations.
 *
 * An unselected ROOM preview deliberately remains whole-tenant and may be
 * incomplete. Once a user selected a shift/agreement, mixing other periods or
 * services into the comparison would produce a misleading vehicle result.
 */
export function selectRoomCostScenarioEvidence({
  planningInputs = null,
  selection = {},
  targetShift = null,
  roomId = null,
} = {}) {
  const scopedEntries = filterServiceCostEntriesForContext(
    planningInputs?.entries || [],
    selection,
    { includePending: true, targetShift, roomId },
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
  const adaptedSourceEntries = adaptLedgerEntriesToOperationalInputs(scopedEntries).inputs || [];
  const forecastEntries = scopedEntries.filter((entry) => ["FORECAST", "BUDGET"].includes(String(entry?.recordKind || "").toUpperCase()));
  const sharedForecastEntries = forecastEntries.filter((entry) => !(
    String(entry?.sourceType || "").toUpperCase() === "ROOM_QUOTE_FORECAST"
    && String(entry?.sourceRef || "").startsWith("ROOM-QUOTE-FORECAST-OFFER-")
  ));
  const offerForecastInputs = adaptForecastLedgerEntriesToOperationalInputs(
    forecastEntries.filter((entry) => !sharedForecastEntries.includes(entry)),
  );
  const forecastAllocation = buildForecastCostAllocationProjection(
    sharedForecastEntries,
    {
      requireServiceAllocationEvidence: true,
      targetAgreementId: selection?.agreementId || null,
      targetShiftId: selection?.shiftId || null,
    },
  );
  const forecastCostInputs = Object.freeze([
    ...offerForecastInputs,
    ...(forecastAllocation.forecastCostInputs || []),
  ]);
  const planningEvidenceWithForecast = Object.freeze({
    ...planningEvidence,
    forecastAllocation,
    forecastCostInputs: Object.freeze(forecastCostInputs),
  });

  return Object.freeze({
    sourceEntries: Object.freeze(scopedEntries),
    adaptedSourceEntries: Object.freeze(adaptedSourceEntries),
    allocation,
    planningEvidence: planningEvidenceWithForecast,
    forecastAllocation,
    forecastCostInputs,
  });
}
