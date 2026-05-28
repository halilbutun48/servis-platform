const SUCCESS_STATUSES = new Set([
  "ACTIVE",
  "APPROVED",
  "ACCEPTED",
  "DONE",
  "READY",
  "GO",
  "STABLE",
  "LIVE",
  "SPLIT",
  "BOARD",
  "ALIGHT",
  "SUCCESS",
  "OK",
  "APPROVED_FOR_INVITE",
]);

const WARNING_STATUSES = new Set([
  "OPEN",
  "REQUESTED",
  "PENDING",
  "COUNTERED",
  "NEGOTIATION",
  "PAZARLIK",
  "STALE",
  "REVIEW_NEEDED",
  "REFRESH_NEEDED",
  "NEXT",
  "LIMITED_GO",
  "WARN",
  "WARNING",
  "TRACKING",
  "IN_REVIEW",
  "NEEDS_INFO",
]);

const CRITICAL_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "NO_GO",
  "BLOCK",
  "ACTION_REQUIRED",
  "DISABLED",
  "REJECTED",
  "OFFLINE",
  "FAIL",
  "ERROR",
  "CRITICAL",
  "DANGER",
]);

const INFO_STATUSES = new Set([
  "CHECK",
  "COUNT",
  "ROLE",
  "INFO",
  "UNKNOWN",
  "RECEIVED",
]);

const PASSIVE_STATUSES = new Set([
  "DRAFT",
  "PASSIVE",
  "ARCHIVED",
  "SKIPPED",
  "NONE",
]);

const STATUS_TONE_STYLE = {
  success: {
    color: "#bbf7d0",
    background: "rgba(34, 197, 94, 0.16)",
    border: "1px solid rgba(34, 197, 94, 0.45)",
  },
  warning: {
    color: "#fde68a",
    background: "rgba(245, 158, 11, 0.18)",
    border: "1px solid rgba(245, 158, 11, 0.45)",
  },
  critical: {
    color: "#fecaca",
    background: "rgba(239, 68, 68, 0.18)",
    border: "1px solid rgba(239, 68, 68, 0.45)",
  },
  info: {
    color: "#bfdbfe",
    background: "rgba(59, 130, 246, 0.16)",
    border: "1px solid rgba(59, 130, 246, 0.45)",
  },
  passive: {
    color: "#e2e8f0",
    background: "rgba(148, 163, 184, 0.10)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
  },
};

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

export function statusToneKey(value) {
  const key = normalize(value);
  if (SUCCESS_STATUSES.has(key)) return "success";
  if (WARNING_STATUSES.has(key)) return "warning";
  if (CRITICAL_STATUSES.has(key)) return "critical";
  if (INFO_STATUSES.has(key)) return "info";
  if (PASSIVE_STATUSES.has(key)) return "passive";
  return "passive";
}

export function statusToneStyle(value) {
  return STATUS_TONE_STYLE[statusToneKey(value)];
}
