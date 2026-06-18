const PLAN_CENTER_OVERLAY_LAYER_EVENT = "plan-center-overlay-layer";
const PLAN_CENTER_OVERLAY_LAYER_KEY = "__seferPaktPlanCenterOverlayLayer";

function normalizeLayer(value) {
  return String(value || "").toLowerCase() === "copilot" ? "copilot" : "guide";
}

function getOverlayStore() {
  if (typeof globalThis === "undefined") return null;
  return globalThis;
}

export function planCenterOverlayLayerEventName() {
  return PLAN_CENTER_OVERLAY_LAYER_EVENT;
}

export function readPlanCenterOverlayLayer() {
  const store = getOverlayStore();
  if (!store) return "guide";
  return normalizeLayer(store[PLAN_CENTER_OVERLAY_LAYER_KEY] || "guide");
}

export function setPlanCenterOverlayLayer(layer) {
  const next = normalizeLayer(layer);
  const store = getOverlayStore();
  if (!store) return next;

  if (store[PLAN_CENTER_OVERLAY_LAYER_KEY] !== next) {
    store[PLAN_CENTER_OVERLAY_LAYER_KEY] = next;
    const target = typeof window !== "undefined" ? window : store;
    if (typeof target?.dispatchEvent === "function" && typeof target?.CustomEvent === "function") {
      target.dispatchEvent(new CustomEvent(PLAN_CENTER_OVERLAY_LAYER_EVENT, { detail: next }));
    }
  }

  return next;
}
