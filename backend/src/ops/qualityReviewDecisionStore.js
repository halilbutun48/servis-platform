import { createJsonFileStore } from "../lib/jsonFileStore.js";
import { maskEmail } from "../kvkk/enforcement.js";
import { QUALITY_REVIEW_STATUSES, normalizeQualityReviewDecision } from "./qualityReviewDecision.js";

const store = createJsonFileStore("quality-review-decisions.json", { defaultValue: [] });

const ALLOWED_SCOPE_TYPES = new Set([
  "SHIFT",
  "SERVICE",
  "AGREEMENT",
  "ROUTE",
  "QUALITY_DRAFT_SCORE",
]);

function cleanText(value, max = 500) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanUpper(value) {
  return cleanText(value).toUpperCase();
}

function buildActorLabel(actor = {}) {
  const role = cleanText(actor?.role, 40).toUpperCase();
  const emailMasked = maskEmail(actor?.email);
  if (role && emailMasked) return `${role} / ${emailMasked}`;
  if (role) return role;
  if (emailMasked) return emailMasked;
  const userId = Number(actor?.id || 0) || 0;
  if (userId > 0) return `Kullanıcı #${userId}`;
  return "Yetkili kullanıcı";
}

function normalizeScopeType(value) {
  const normalized = cleanUpper(value);
  return ALLOWED_SCOPE_TYPES.has(normalized) ? normalized : "";
}

function normalizeScopeId(value) {
  return cleanText(value, 180);
}

export function buildQualityReviewDecisionScopeKey(scopeType, scopeId) {
  const type = normalizeScopeType(scopeType);
  const id = normalizeScopeId(scopeId);
  return type && id ? `${type}:${id}` : "";
}

function sortNewest(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) =>
    String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || ""))
  );
}

export async function readQualityReviewDecisionRecords() {
  const parsed = await store.readAsync();
  return Array.isArray(parsed) ? parsed : [];
}

export async function findLatestQualityReviewDecisionRecord(scopeType, scopeId) {
  const scopeKey = buildQualityReviewDecisionScopeKey(scopeType, scopeId);
  if (!scopeKey) return null;
  const items = await readQualityReviewDecisionRecords();
  return sortNewest(items).find((item) => buildQualityReviewDecisionScopeKey(item?.scopeType, item?.scopeId) === scopeKey) || null;
}

export async function upsertQualityReviewDecisionRecord(input, actor = null) {
  const scopeType = normalizeScopeType(input?.scopeType);
  const scopeId = normalizeScopeId(input?.scopeId);
  const reviewStatus = normalizeQualityReviewDecision(input?.reviewStatus || input?.decision);
  const note = cleanText(input?.note, 500);

  if (!scopeType) throw new Error("Kapsam türü gerekli.");
  if (!scopeId) throw new Error("Kapsam bilgisi gerekli.");
  if (!reviewStatus || reviewStatus === QUALITY_REVIEW_STATUSES.REVIEW_PENDING) {
    throw new Error("Geçersiz kalite inceleme kararı.");
  }

  const now = new Date().toISOString();
  let saved = null;

  await store.updateAsync((current) => {
    const list = Array.isArray(current) ? current : [];
    const scopeKey = buildQualityReviewDecisionScopeKey(scopeType, scopeId);
    const next = {
      id: `QUALITY_REVIEW_DECISION:${scopeKey}:${now}:${list.length + 1}`,
      scopeType,
      scopeId,
      scopeKey,
      reviewStatus,
      note,
      updatedByUserId: Number(actor?.id || 0) || null,
      updatedByEmail: cleanText(actor?.email, 160),
      updatedByRole: cleanText(actor?.role, 40).toUpperCase(),
      updatedByLabel: buildActorLabel(actor),
      createdAt: now,
      updatedAt: now,
    };
    list.push(next);
    saved = next;
    return list;
  });

  return saved;
}
