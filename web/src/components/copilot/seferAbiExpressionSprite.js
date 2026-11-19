import { getSeferAbiLiveExpressionFrames } from "./seferAbiExpressionFrameCatalog.js";

export const SEFER_ABI_EXPRESSION_ASSETS = Object.freeze({
  listening: new URL("../../assets/sefer-abi-expressions/listening.png", import.meta.url).href,
  thinking: new URL("../../assets/sefer-abi-expressions/thinking.png", import.meta.url).href,
  speaking: new URL("../../assets/sefer-abi-expressions/speaking.png", import.meta.url).href,
  success: new URL("../../assets/sefer-abi-expressions/success.png", import.meta.url).href,
  warning: new URL("../../assets/sefer-abi-expressions/warning.png", import.meta.url).href,
});

export function getSeferAbiExpressionPreloadAssets() {
  return Object.values(SEFER_ABI_EXPRESSION_ASSETS);
}

const EXPRESSION_STATE_KEYS = Object.freeze({
  listening: "listening",
  thinking: "thinking",
  responding: "speaking",
  speaking: "speaking",
  "result-ready": "success",
  success: "success",
  attention: "warning",
  warning: "warning",
  "approval-required": "warning",
});

const LIVE_FRAME_BY_STATE = Object.freeze({
  listening: "frame-05",
  thinking: "frame-07",
  "result-ready": "frame-13",
  attention: "frame-08",
  "approval-required": "frame-15",
});

const LIVE_FRAME_ROLE_BY_STATE = Object.freeze({
  listening: "LISTENING",
  thinking: "THINKING",
  "result-ready": "SUCCESS",
  attention: "WARNING",
  "approval-required": "WARNING",
});

export function getSeferAbiExpressionKey(state) {
  const normalized = String(state || "").trim().toLowerCase();
  return EXPRESSION_STATE_KEYS[normalized] || null;
}

export function getSeferAbiExpressionAsset(state) {
  const key = SEFER_ABI_EXPRESSION_ASSETS[getSeferAbiExpressionKey(state)];
  return key || null;
}

export function getSeferAbiExpressionVariant(state) {
  const normalized = String(state || "").trim().toLowerCase();
  const frameId = LIVE_FRAME_BY_STATE[normalized];
  if (frameId && getSeferAbiLiveExpressionFrames(LIVE_FRAME_ROLE_BY_STATE[normalized]).some((frame) => frame.id === frameId)) {
    return { kind: "frame", frameId };
  }
  return { kind: "asset", asset: getSeferAbiExpressionAsset(state) };
}
