import { createJsonFileStore } from "../lib/jsonFileStore.js";
import { buildFieldAcceptanceSkeletonSession, getFieldAcceptanceManifest } from "./fieldAcceptanceManifest.js";

const DECISION_IDS = new Set(getFieldAcceptanceManifest().decisions || ["GO", "LIMITED_GO", "NO_GO"]);
const CHECKLIST_STATUS_IDS = new Set(["PASS", "PENDING", "BLOCKED", "DONE"]);

const store = createJsonFileStore("field-acceptance-session.json", {
  defaultValue: () => ({
    currentSession: buildFieldAcceptanceSkeletonSession(),
  }),
});

function cleanText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDecision(value, fallback = "LIMITED_GO") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return DECISION_IDS.has(normalized) ? normalized : fallback;
}

function normalizeChecklistStatus(value, fallback = "PENDING") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return CHECKLIST_STATUS_IDS.has(normalized) ? normalized : fallback;
}

function makeSessionId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `M60-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeChecklistItems(items, fallbackItems = []) {
  const fallback = Array.isArray(fallbackItems) ? fallbackItems : [];
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source.map((item, idx) => ({
    id: cleanText(item?.id, 80) || cleanText(fallback[idx]?.id, 80) || `check-${idx + 1}`,
    label: cleanText(item?.label, 160) || cleanText(fallback[idx]?.label, 160) || `Madde ${idx + 1}`,
    area: cleanText(item?.area, 80) || cleanText(fallback[idx]?.area, 80) || "genel",
    status: normalizeChecklistStatus(item?.status, normalizeChecklistStatus(fallback[idx]?.status, "PENDING")),
    note: cleanText(item?.note, 240) || cleanText(fallback[idx]?.note, 240),
    updatedAt: item?.updatedAt || fallback[idx]?.updatedAt || null,
  }));
}

function normalizeSession(session = {}) {
  const skeleton = buildFieldAcceptanceSkeletonSession();
  return {
    sessionId: cleanText(session?.sessionId, 80) || skeleton.sessionId || makeSessionId(),
    decision: normalizeDecision(session?.decision, skeleton.decision || "LIMITED_GO"),
    decisionReason: cleanText(session?.decisionReason, 240) || cleanText(session?.note, 240) || cleanText(skeleton.note, 240),
    driverLabel: cleanText(session?.driverLabel, 120) || cleanText(skeleton.driverLabel, 120),
    deviceModel: cleanText(session?.deviceModel, 120) || cleanText(skeleton.deviceModel, 120),
    osVersion: cleanText(session?.osVersion, 80) || cleanText(skeleton.osVersion, 80),
    buildProfile: cleanText(session?.buildProfile, 120) || cleanText(skeleton.buildProfile, 120),
    testerLabel: cleanText(session?.testerLabel, 120) || cleanText(skeleton.testerLabel, 120),
    note: cleanText(session?.note, 240) || cleanText(skeleton.note, 240),
    evidenceCount: Number.isFinite(Number(session?.evidenceCount)) ? Number(session.evidenceCount) : Number(skeleton.evidenceCount || 0),
    checklist: normalizeChecklistItems(session?.checklist, skeleton.checklist),
    createdAt: session?.createdAt || null,
    updatedAt: session?.updatedAt || null,
  };
}

function buildSessionFromInput(input = {}, baseSession = null) {
  const now = new Date().toISOString();
  const prev = normalizeSession(baseSession || {});
  return normalizeSession({
    ...prev,
    ...input,
    sessionId: prev.sessionId || makeSessionId(),
    checklist: Array.isArray(input?.checklist) ? input.checklist : prev.checklist,
    createdAt: prev.createdAt || now,
    updatedAt: now,
  });
}

export async function readFieldAcceptanceState() {
  const parsed = await store.readAsync();
  const session = normalizeSession(parsed?.currentSession || {});
  return { currentSession: session };
}

export async function getCurrentFieldAcceptanceSession() {
  return (await readFieldAcceptanceState()).currentSession;
}

export async function createFieldAcceptanceSession(input = {}, actor = null) {
  const now = new Date().toISOString();
  let saved = null;
  await store.updateAsync((current) => {
    const next = buildSessionFromInput(input, {
      ...buildFieldAcceptanceSkeletonSession(),
      sessionId: makeSessionId(),
      createdAt: now,
      updatedAt: now,
    });
    saved = {
      ...next,
      createdAt: next.createdAt || now,
      updatedAt: now,
      createdByEmail: cleanText(actor?.email, 160),
      updatedByEmail: cleanText(actor?.email, 160),
    };
    return { ...current, currentSession: saved };
  });
  return saved;
}

export async function saveFieldAcceptanceSession(input = {}, actor = null) {
  let saved = null;
  const now = new Date().toISOString();
  await store.updateAsync((current) => {
    const prev = normalizeSession(current?.currentSession || {});
    const next = buildSessionFromInput(input, prev);
    saved = {
      ...prev,
      ...next,
      sessionId: prev.sessionId || next.sessionId || makeSessionId(),
      createdAt: prev.createdAt || next.createdAt || now,
      updatedAt: now,
      createdByEmail: cleanText(current?.currentSession?.createdByEmail, 160),
      updatedByEmail: cleanText(actor?.email, 160),
    };
    return { ...current, currentSession: saved };
  });
  return saved;
}

export async function persistFieldAcceptanceDecision(input = {}, actor = null) {
  return saveFieldAcceptanceSession(
    {
      decision: input?.decision,
      decisionReason: input?.decisionReason || input?.reason,
    },
    actor
  );
}

export async function updateFieldAcceptanceChecklistItemStatus(itemId, status, note = "", actor = null) {
  const safeId = cleanText(itemId, 80);
  if (!safeId) throw new Error("checklist item id required");
  let saved = null;
  const now = new Date().toISOString();
  await store.updateAsync((current) => {
    const prev = normalizeSession(current?.currentSession || {});
    const checklist = prev.checklist.map((item) => {
      if (cleanText(item?.id, 80) !== safeId) return item;
      return {
        ...item,
        status: normalizeChecklistStatus(status, item.status),
        note: cleanText(note, 240) || item.note || "",
        updatedAt: now,
        updatedByEmail: cleanText(actor?.email, 160),
      };
    });
    if (!checklist.some((item) => cleanText(item?.id, 80) === safeId)) {
      throw new Error("checklist item not found");
    }
    saved = {
      ...prev,
      checklist,
      updatedAt: now,
      updatedByEmail: cleanText(actor?.email, 160),
    };
    return { ...current, currentSession: saved };
  });
  return saved;
}
