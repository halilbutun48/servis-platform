export const SEFER_ABI_WIDGET_STATES = Object.freeze([
  "idle",
  "hover-focus",
  "listening",
  "thinking",
  "responding",
  "result-ready",
  "attention",
  "approval-required",
]);

const AVATAR_STATES = new Set(SEFER_ABI_WIDGET_STATES);

export const SEFER_ABI_WIDGET_STATE_LABELS = Object.freeze({
  idle: "Hazır",
  "hover-focus": "Buradayım",
  listening: "Seni dinliyorum",
  thinking: "İnceliyorum...",
  responding: "Yanıtı hazırlıyorum...",
  "result-ready": "Hazır",
  attention: "Bir sorun var",
  "approval-required": "Onayınız gerekli",
});

export function normalizeSeferAbiWidgetState(value) {
  const state = String(value || "idle").toLowerCase();
  if (state === "hover") return "hover-focus";
  if (state === "success") return "result-ready";
  return AVATAR_STATES.has(state) ? state : "idle";
}

export function resolveSeferAbiWidgetState({
  busy = false,
  listening = false,
  error = false,
  approvalRequired = false,
  responding = false,
  resultReady = false,
  interaction = "idle",
} = {}) {
  if (busy) return "thinking";
  if (listening) return "listening";
  if (error) return "attention";
  if (approvalRequired) return "approval-required";
  if (responding) return "responding";
  if (resultReady) return "result-ready";
  return normalizeSeferAbiWidgetState(interaction);
}
