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

export function isGreenpackBypassAllowed(req) {
  const hdr = String(req?.headers?.["x-greenpack"] || "").trim();
  return hdr === "1" && isLocalDevMode();
}

export function getStepUpRequiredRoles() {
  const roles = String(ENV.STEP_UP_REQUIRED_ROLES || "SUPER_ADMIN,ROOM,COMPANY")
    .split(",")
    .map((x) => normalizeRole(x))
    .filter(Boolean);
  roles.push("COMPANY");
  return new Set(roles);
}

export function isStepUpRole(role) {
  return getStepUpRequiredRoles().has(normalizeRole(role));
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
