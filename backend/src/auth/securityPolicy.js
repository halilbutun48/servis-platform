import { ENV } from "../env.js";

const LOCAL_DEV_MODES = new Set(["development", "local", "test"]);

function runtimeMode() {
  return String(process.env.NODE_ENV || ENV.NODE_ENV || ENV.APP_ENV || "development").toLowerCase();
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function isProductionLike() {
  return runtimeMode() === "production";
}

export function isLocalDevMode() {
  return LOCAL_DEV_MODES.has(runtimeMode());
}

function normalizeStepUpProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "totp" || raw === "sms" || raw === "none") return raw;
  return "";
}

export function getStepUpProvider() {
  const explicit = normalizeStepUpProvider(ENV.STEP_UP_PROVIDER);
  if (explicit) return explicit;
  if (isProductionLike()) return "totp";
  return "none";
}

export function isGreenpackBypassAllowed(req) {
  const hdr = String(req?.headers?.["x-greenpack"] || "").trim();
  return hdr === "1" && isLocalDevMode() && ENV.GREENPACK_BYPASS_ENABLED === true && isTotpStepUpEnabled();
}

export function isStepUpEnabled() {
  const raw = String(ENV.STEP_UP_ENABLED ?? "").trim();
  const provider = getStepUpProvider();
  if (raw === "0") return false;
  if (provider === "none") return false;
  if (raw === "1") return true;
  if (isLocalDevMode()) return false;
  return true;
}

export function getStepUpRequiredRoles() {
  if (!isStepUpEnabled()) return new Set();
  const roles = String(ENV.STEP_UP_REQUIRED_ROLES || "SUPER_ADMIN,ROOM,COMPANY")
    .split(",")
    .map((x) => normalizeRole(x))
    .filter(Boolean);
  roles.push("COMPANY");
  return new Set(roles);
}

export function isStepUpRole(role) {
  if (!isStepUpEnabled()) return false;
  return getStepUpRequiredRoles().has(normalizeRole(role));
}

export function isTotpStepUpEnabled() {
  return isStepUpEnabled() && getStepUpProvider() === "totp" && ENV.STEP_UP_TOTP_ENABLED === true;
}

export function isSmsStepUpEnabled() {
  return isStepUpEnabled() && getStepUpProvider() === "sms";
}

export function isStepUpProviderReady() {
  const provider = getStepUpProvider();
  if (!isStepUpEnabled()) return false;
  if (provider === "totp") return isTotpStepUpEnabled();
  if (provider === "sms") return false;
  return false;
}

export function getAccessTokenExpiresInForUser(user) {
  const role = normalizeRole(user?.role);
  if (role === "DRIVER") {
    const driverTtl = String(ENV.DRIVER_ACCESS_TOKEN_EXPIRES_IN || "").trim();
    if (driverTtl) return driverTtl;
  }

  if (isStepUpRole(role)) {
    const privilegedTtl = String(ENV.PRIVILEGED_ACCESS_TOKEN_EXPIRES_IN || "").trim();
    if (privilegedTtl) return privilegedTtl;
  }

  return null;
}
