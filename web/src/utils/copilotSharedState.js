const SHARED_COPILOT_STATE_KEY = "psv1:copilot:shared-state:v1";
const SHARED_COPILOT_STATE_EVENT = "psv1:copilot:shared-state";
const MAX_PERSISTED_MESSAGES = 12;
const MAX_MESSAGE_TEXT = 900;
const MAX_SHARED_STATE_BYTES = 128 * 1024;
let memoryState = null;

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function copilotAuthScopeKey(token, me) {
  const identity = [
    me?.id || "pending",
    me?.role || "",
    me?.companyKind || "",
    me?.companyId || "",
    me?.roomId || "",
    stableHash(token),
  ].join("|");
  return `auth:${stableHash(identity)}`;
}

function compactMessage(message) {
  if (!message || typeof message !== "object") return null;
  const text = String(message.text || "").trim().slice(0, MAX_MESSAGE_TEXT);
  if (!text && message.role !== "system") return null;
  return {
    role: String(message.role || "assistant").slice(0, 16),
    text,
    ...(message.system ? { system: true } : {}),
    ...(message.contextSummary ? { contextSummary: String(message.contextSummary).slice(0, 300) } : {}),
    ...(message.replyMode ? { replyMode: String(message.replyMode).slice(0, 40) } : {}),
    ...(message.followUpPrompt ? { followUpPrompt: String(message.followUpPrompt).slice(0, 240) } : {}),
  };
}

export function compactCopilotMessages(messages, limit = MAX_PERSISTED_MESSAGES) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-Math.max(1, Math.min(Number(limit) || MAX_PERSISTED_MESSAGES, MAX_PERSISTED_MESSAGES)))
    .map(compactMessage)
    .filter(Boolean);
}

function compactSelection(selection) {
  if (!selection || typeof selection !== "object") return null;
  const entityType = String(selection.entityType || selection.selectedRecordType || "").trim();
  const rawEntityId = selection.entityId ?? selection.selectedRecordId;
  const entityId = Number(rawEntityId || 0);
  const isPublicLead = entityType.toLowerCase() === "public-lead";
  const publicLeadId = isPublicLead
    && /^[A-Za-z0-9_-]{1,64}$/u.test(String(rawEntityId || "").trim())
    ? String(rawEntityId).trim()
    : "";
  if (!entityType || (!publicLeadId && (!Number.isInteger(entityId) || entityId <= 0))) return null;
  return {
    scopeKey: String(selection.scopeKey || "").slice(0, 120),
    entityType: entityType.slice(0, 60),
    entityId: publicLeadId || entityId,
    ...(selection.label ? { label: String(selection.label).slice(0, 180) } : {}),
    ...(publicLeadId ? { facts: { screenType: "PUBLIC_LEAD_REVIEW", leadId: publicLeadId } } : {}),
  };
}

function hasOwn(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function nextOrPrevious(next, previous, key) {
  return hasOwn(next, key) ? next[key] : previous[key];
}

function compactText(value, limit) {
  return value == null ? null : String(value).slice(0, limit);
}

function normalizedRouteContextStatus(value, routeDenied) {
  const status = String(value || "").toUpperCase();
  if (["ALLOW", "DENY", "UNKNOWN", "UNAVAILABLE"].includes(status)) return status;
  return routeDenied === true ? "DENY" : "ALLOW";
}

function compactSharedState(next = {}, previous = {}) {
  const routeContextStatus = normalizedRouteContextStatus(
    nextOrPrevious(next, previous, "routeContextStatus"),
    nextOrPrevious(next, previous, "routeDenied"),
  );
  const metadataStatus = String(nextOrPrevious(next, previous, "metadataStatus") || "").toUpperCase();
  const clearsRouteBoundState = routeContextStatus !== "ALLOW" || metadataStatus === "METADATA_MISSING";
  const rawSelection = nextOrPrevious(next, previous, "selection");
  const rawSelectedContext = nextOrPrevious(next, previous, "selectedContext");
  const selection = clearsRouteBoundState ? null : compactSelection(rawSelection ?? rawSelectedContext);
  const screenPath = clearsRouteBoundState ? null : compactText(nextOrPrevious(next, previous, "screenPath"), 240);
  const sourceScreenPath = clearsRouteBoundState ? null : compactText(nextOrPrevious(next, previous, "sourceScreenPath"), 240);
  const screenLabel = clearsRouteBoundState ? null : compactText(nextOrPrevious(next, previous, "screenLabel"), 180);
  const messages = hasOwn(next, "messages") ? next.messages : previous.messages;
  return {
    ...(nextOrPrevious(next, previous, "scopeKey") ? { scopeKey: String(nextOrPrevious(next, previous, "scopeKey")).slice(0, 160) } : {}),
    screenPath,
    sourceScreenPath,
    screenLabel,
    ...(nextOrPrevious(next, previous, "role") ? { role: String(nextOrPrevious(next, previous, "role")).slice(0, 40) } : {}),
    ...(nextOrPrevious(next, previous, "companyKind") ? { companyKind: String(nextOrPrevious(next, previous, "companyKind")).slice(0, 40) } : {}),
    chatContextKey: compactText(nextOrPrevious(next, previous, "chatContextKey"), 240) || null,
    routeContextStatus,
    routeDenied: routeContextStatus !== "ALLOW",
    metadataStatus: metadataStatus || null,
    selection,
    selectedContext: selection,
    routeHandoff: clearsRouteBoundState ? null : (nextOrPrevious(next, previous, "routeHandoff") ?? null),
    routeBoundEntryHint: clearsRouteBoundState ? null : (nextOrPrevious(next, previous, "routeBoundEntryHint") ?? null),
    routeBoundResult: clearsRouteBoundState ? null : (nextOrPrevious(next, previous, "routeBoundResult") ?? null),
    draft: compactText(nextOrPrevious(next, previous, "draft"), 4000) || "",
    messages: compactCopilotMessages(messages),
  };
}

export function readCopilotSharedState(scopeKey = "") {
  const expectedScope = String(scopeKey || "").trim();
  if (memoryState && (!expectedScope || memoryState.scopeKey === expectedScope)) return memoryState;
  try {
    const raw = localStorage.getItem(SHARED_COPILOT_STATE_KEY);
    if (raw && raw.length > MAX_SHARED_STATE_BYTES) {
      localStorage.removeItem(SHARED_COPILOT_STATE_KEY);
      memoryState = null;
      return null;
    }
    const value = raw ? JSON.parse(raw) : null;
    memoryState = value && typeof value === "object" && (!expectedScope || value.scopeKey === expectedScope)
      ? compactSharedState(value, {})
      : null;
    return memoryState;
  } catch {
    return null;
  }
}

export function writeCopilotSharedState(next = {}) {
  const scopeKey = String(next.scopeKey || "").trim();
  const previous = readCopilotSharedState(scopeKey) || {};
  const value = {
    ...compactSharedState({ ...next, ...(scopeKey ? { scopeKey } : {}) }, previous),
    updatedAt: new Date().toISOString(),
  };
  memoryState = value;
  try { localStorage.setItem(SHARED_COPILOT_STATE_KEY, JSON.stringify(value)); } catch { /* best effort */ }
  try { window.dispatchEvent(new CustomEvent(SHARED_COPILOT_STATE_EVENT, { detail: value })); } catch { /* best effort */ }
  return value;
}

export function copilotSharedStateEventName() {
  return SHARED_COPILOT_STATE_EVENT;
}
