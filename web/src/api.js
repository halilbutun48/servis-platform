//web/src/api.js
import { getApiErrorInfo, getApiErrorMessage } from "./utils/apiContract";
import { makeHttpError } from "./utils/apiContract";
import { cachedGet, clearUiDataCache } from "./utils/uiDataCache";

const DEFAULT_READ_TTL_MS = 10 * 60 * 1000;
const DEFAULT_READ_DELAY_MS = 80;

export function getToken() {
  return (localStorage.getItem("token") || "").trim();
}

export function setToken(t) {
  localStorage.setItem("token", (t || "").trim());
}

export function clearToken() {
  localStorage.removeItem("token");
}

function getOrCreateBrowserDeviceId() {
  try {
    const key = "personel_servis_browser_device_id";
    const existing = String(localStorage.getItem(key) || "").trim();
    if (existing) return existing;
    const fresh = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return `web-fallback-${Date.now().toString(36)}`;
  }
}

function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function api(path, { method = "GET", body, token, signal } = {}) {
  const verb = String(method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json" };

  const t = ((token ?? getToken()) || "").trim();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(path, {
    cache: "no-store",
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    // Try JSON first if advertised
    if (ct.includes("application/json")) {
      const json = await res.json().catch(() => null);
      throw makeHttpError(res.status, json || { message: res.statusText });
    }

    // Fallback: text
    const txt = await res.text().catch(() => "");
    throw makeHttpError(res.status, txt || res.statusText);
  }

  const result = ct.includes("application/json") ? await res.json() : await res.text();
  if (verb !== "GET") {
    clearUiDataCache();
  }
  return result;
}
// ✅ convenience helpers (SuperAdmin panelleri api.get/post/put/del kullanıyor)
api.get = (path, opts = {}) => api(path, { ...opts, method: "GET" });
api.post = (path, body, opts = {}) => api(path, { ...opts, method: "POST", body });
api.put = (path, body, opts = {}) => api(path, { ...opts, method: "PUT", body });
api.del = (path, opts = {}) => api(path, { ...opts, method: "DELETE" });

export async function submitPublicLead(payload = {}) {
  return api("/api/public/leads", {
    method: "POST",
    body: payload,
  });
}

export async function listPublicLeadReviewQueue(params = {}, { token } = {}) {
  const qs = buildQueryString(params);
  return cachedGet(`/api/admin/public-leads${qs}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function updatePublicLeadReviewStatus(leadId, payload = {}, { token } = {}) {
  return api(`/api/admin/public-leads/${encodeURIComponent(String(leadId || ""))}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function reportNoShow({ token, childId = null, reason = "Bugün gelmiyorum", durationDays = null } = {}) {
  return api("/api/penalties/self/no-show", {
    method: "POST",
    token,
    body: {
      ...(childId != null ? { childId: Number(childId) } : {}),
      reason,
      ...(durationDays != null ? { durationDays: Number(durationDays) } : {}),
    },
  });
}

export async function createBoardingChangeRequest(payload = {}, { token } = {}) {
  return api("/api/requests", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function getBoardingChangeRequestContext(params = {}, { token } = {}) {
  const qs = buildQueryString(params);
  return cachedGet(`/api/requests/context${qs}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function listMyBoardingChangeRequests(params = {}, { token } = {}) {
  const qs = buildQueryString(params);
  return cachedGet(`/api/requests/mine${qs}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function login(identifier, password) {
  // login'de token yok, o yüzden Authorization göndermiyoruz
  const body = { identifier, password, deviceId: getOrCreateBrowserDeviceId() };
  const res = await fetch("/api/auth/login", {
    cache: "no-store",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (ct.includes("application/json")) {
      const json = await res.json().catch(() => null);
      throw makeHttpError(res.status, json || { message: res.statusText });
    }
    const txt = await res.text().catch(() => "");
    throw makeHttpError(res.status, txt || res.statusText);
  }

  const data = await res.json(); // { token }
  if (!data?.token) throw new Error("Login response token yok");
  setToken(data.token);
  return data;
}


export async function getTotpStatus(token) {
  return cachedGet("/api/auth/totp/status", { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function setupTotp(token) {
  return api("/api/auth/totp/setup", { method: "POST", token, body: {} });
}

export async function enableTotp(token, code) {
  return api("/api/auth/totp/enable", { method: "POST", token, body: { code } });
}

export async function verifyTotp(token, code) {
  return api("/api/auth/totp/verify", { method: "POST", token, body: { code } });
}

export async function googleLogin(credential, { inviteToken, deviceId, testProfile } = {}) {
  const res = await fetch("/api/auth/google", {
    cache: "no-store",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, inviteToken, deviceId, testProfile }),
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      const json = await res.json().catch(() => null);
      throw makeHttpError(res.status, json || { message: res.statusText });
    }
    const txt = await res.text().catch(() => "");
    throw makeHttpError(res.status, txt || res.statusText);
  }

  const data = await res.json();
  if (!data?.token) throw new Error("Google login response token yok");
  setToken(data.token);
  return data;
}


export async function changeDriverPin(currentPin, newPin, token) {
  return api("/api/auth/driver/change-pin", { method: "POST", token, body: { currentPin, newPin } });
}

export async function changePassword({ currentPassword, newPassword, confirmPassword, token }) {
  return api("/api/auth/change-password", {
    method: "POST",
    token,
    body: { currentPassword, newPassword, confirmPassword },
  });
}

export async function listPersonelAccessInvites(token, take = 100) {
  return cachedGet(`/api/company/personel-invites?take=${encodeURIComponent(String(take || 100))}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function createPersonelAccessInvite({ token, personelId }) {
  return api("/api/company/personel-invites", {
    method: "POST",
    token,
    body: { personelId: Number(personelId) },
  });
}

export async function revokePersonelAccessInvite({ token, id }) {
  return api(`/api/company/personel-invites/${Number(id)}/revoke`, {
    method: "POST",
    token,
    body: {},
  });
}

export async function getPersonelInviteInfo(tokenValue) {
  return cachedGet(`/api/auth/personel-invite/info?token=${encodeURIComponent(String(tokenValue || ""))}`, { ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function acceptPersonelInvite(body) {
  return api("/api/auth/personel-invite/accept", {
    method: "POST",
    body,
  });
}

export async function getOperationProofSummary(params = {}, { token } = {}) {
  return cachedGet(`/api/operation-proof/summary${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function postOperationProofManualNote(payload, { token } = {}) {
  return api("/api/operation-proof/manual-note", {
    method: "POST",
    token,
    body: payload,
  });
}

export function normalizeOperationProofError(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorInfo(error, fallbackMessage);
}

export function normalizeOperationProofErrorMessage(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorMessage(error, fallbackMessage);
}

export async function getQualityProofSignalSummary(params = {}, { token } = {}) {
  return cachedGet(`/api/trust-quality/proof-signals/summary${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export function normalizeQualityProofError(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorInfo(error, fallbackMessage);
}

export function normalizeQualityProofErrorMessage(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorMessage(error, fallbackMessage);
}

export async function getQualityDraftScoreSummary(params = {}, { token } = {}) {
  return cachedGet(`/api/trust-quality/draft-score/summary${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export function normalizeQualityDraftError(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorInfo(error, fallbackMessage);
}

export function normalizeQualityDraftErrorMessage(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorMessage(error, fallbackMessage);
}

export async function getQualityReviewDecisionSummary(params = {}, { token } = {}) {
  return cachedGet(`/api/trust-quality/review-decision/summary${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function postQualityReviewDecision(payload, { token } = {}) {
  return api("/api/trust-quality/review-decision", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function getQualityReviewDecisionHistory(params = {}, { token } = {}) {
  return cachedGet(`/api/trust-quality/review-decision/history${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function getPaymentBackboneReadinessPreview(params = {}, { token } = {}) {
  return cachedGet(`/api/commercial-core/payment-backbone/readiness/preview${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function getPaymentBackboneReadinessPreviewCsv(params = {}, { token } = {}) {
  return cachedGet(`/api/commercial-core/payment-backbone/readiness/preview.csv${buildQueryString(params)}`, { token, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export function getRoomFinancialOperationsPreview(token, params = {}, { signal, force = false, ttlMs = DEFAULT_READ_TTL_MS, delayMs = DEFAULT_READ_DELAY_MS } = {}) {
  return cachedGet(`/api/commercial-core/room/financial-operations/preview${buildQueryString(params)}`, { token, signal, force, ttlMs, delayMs });
}

export function getCompanyFinancialOperationsPreview(token, params = {}, { signal, force = false, ttlMs = DEFAULT_READ_TTL_MS, delayMs = DEFAULT_READ_DELAY_MS } = {}) {
  return cachedGet(`/api/company/overview/financial-operations/preview${buildQueryString(params)}`, { token, signal, force, ttlMs, delayMs });
}

export async function getAgreementQualityPaymentBridgePreview(agreementId, { token, signal } = {}) {
  return cachedGet(`/api/agreements/${Number(agreementId)}/quality-payment-bridge`, { token, signal, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
}

export async function getAgreementSeferScorePreview(agreementId, { token, signal } = {}) {
  const payload = await cachedGet(`/api/agreements/${Number(agreementId)}/sefer-score-preview`, { token, signal, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
  return payload?.seferScorePreview ?? payload;
}

export async function getAgreementPlatformFeePreview(agreementId, { token, signal } = {}) {
  const payload = await cachedGet(`/api/agreements/${Number(agreementId)}/platform-fee-preview`, { token, signal, ttlMs: DEFAULT_READ_TTL_MS, delayMs: DEFAULT_READ_DELAY_MS });
  return payload?.platformFeePreview ?? payload;
}

export function normalizeQualityReviewDecisionError(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorInfo(error, fallbackMessage);
}

export function normalizeQualityReviewDecisionErrorMessage(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorMessage(error, fallbackMessage);
}

export function normalizePaymentPreviewError(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorInfo(error, fallbackMessage);
}

export function normalizePaymentPreviewErrorMessage(error, fallbackMessage = "İşlem başarısız.") {
  return getApiErrorMessage(error, fallbackMessage);
}
