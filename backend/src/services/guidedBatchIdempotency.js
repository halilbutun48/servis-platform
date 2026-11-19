import crypto from "node:crypto";

export const GUIDED_BATCH_IDEMPOTENCY_KEY_MAX = 160;

export function normalizeGuidedBatchIdempotencyKey(value) {
  const key = String(value ?? "").trim();
  if (!key || key.length > GUIDED_BATCH_IDEMPOTENCY_KEY_MAX || /[\u0000-\u001f\u007f]/.test(key)) {
    const error = new Error("Guided plan idempotency key is required.");
    error.code = "GUIDED_BATCH_IDEMPOTENCY_REQUIRED";
    error.status = 400;
    throw error;
  }
  return key;
}

function stableValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stableValue);
  return Object.keys(value)
    .sort()
    .reduce((out, key) => {
      out[key] = stableValue(value[key]);
      return out;
    }, {});
}

export function buildGuidedBatchRequestHash({ actorUserId, actorRole, companyId, items } = {}) {
  const payload = stableValue({
    actorUserId: Number(actorUserId || 0),
    actorRole: String(actorRole || ""),
    companyId: Number(companyId || 0),
    items: Array.isArray(items) ? items : [],
  });
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

export function readGuidedBatchResult(row) {
  if (!row?.resultJson || typeof row.resultJson !== "object") return null;
  return row.resultJson;
}

export function isGuidedBatchUniqueConflict(error) {
  if (String(error?.code || "") !== "P2002") return false;
  const meta = JSON.stringify(error?.meta || {}).toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  return meta.includes("actoruserid")
    || meta.includes("idempotencykey")
    || message.includes("guidedbatchrequest");
}
