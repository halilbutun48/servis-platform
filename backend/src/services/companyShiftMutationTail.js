import { audit } from "../audit.js";
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

export async function auditCompanyShiftMutation(req, { action, entityId, meta }) {
  await audit(req, {
    action,
    entity: "Shift",
    entityId,
    ...(meta === undefined ? {} : { meta }),
  });
}

export function publishCompanyShiftMutation(io, emitShift, shift, eventName = "shift:list") {
  emitShift(io, shift, eventName);
}
