function runtimeMode() {
  return String(import.meta.env.MODE || (import.meta.env.PROD ? "production" : "development")).toLowerCase();
}

function isLocalDevMode() {
  return ["development", "local", "test"].includes(runtimeMode());
}

function normalizeProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "totp" || raw === "sms" || raw === "none") return raw;
  return "";
}

export function getStepUpProvider() {
  const explicit = normalizeProvider(import.meta.env.VITE_STEP_UP_PROVIDER);
  if (explicit) return explicit;
  if (String(import.meta.env.VITE_STEP_UP_TOTP_ENABLED ?? (import.meta.env.PROD ? "1" : "0")).trim() === "1") return "totp";
  return isLocalDevMode() ? "none" : "totp";
}

export function isStepUpEnabled() {
  const raw = String(import.meta.env.VITE_STEP_UP_ENABLED ?? "").trim();
  const provider = getStepUpProvider();
  if (raw === "0") return false;
  if (provider === "none") return false;
  if (raw === "1") return true;
  if (isLocalDevMode()) return false;
  return true;
}

export function isTotpStepUpEnabled() {
  return isStepUpEnabled() && getStepUpProvider() === "totp" && String(import.meta.env.VITE_STEP_UP_TOTP_ENABLED ?? (import.meta.env.PROD ? "1" : "0")).trim() === "1";
}

export function isSmsStepUpEnabled() {
  return isStepUpEnabled() && getStepUpProvider() === "sms";
}

