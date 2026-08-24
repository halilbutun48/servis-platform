import {
  clearShiftRoutePreviewCache,
  rebuildShiftRouteStateBestEffort,
} from "./shiftRouteState.js";
import { upsertShiftSeriesCommercialBackboneByShiftId } from "./paymentBackbone.js";

export async function refreshCompanyShiftRouteStateAfterMutation(shiftId, routeShapeChanged) {
  if (routeShapeChanged === true) {
    await rebuildShiftRouteStateBestEffort(shiftId);
    return;
  }

  if (routeShapeChanged === false) {
    clearShiftRoutePreviewCache(shiftId);
  }
}

export async function syncCompanyShiftCommercialBackbone(shiftId) {
  await upsertShiftSeriesCommercialBackboneByShiftId(shiftId).catch(() => null);
}

export function publishCompanyShiftMutation(io, emitShift, shift, eventName = "shift:list") {
  emitShift(io, shift, eventName);
}
