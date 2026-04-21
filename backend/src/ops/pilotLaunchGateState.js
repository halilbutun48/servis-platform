import { createJsonFileStore } from "../lib/jsonFileStore.js";

const DECISION_IDS = new Set(["GO", "LIMITED_GO", "NO_GO"]);
const RISK_STATUS_IDS = new Set(["OPEN", "TRACKING", "MITIGATED", "CLOSED"]);
const RISK_SEVERITY_IDS = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const store = createJsonFileStore("pilot-launch-gate-state.json", {
  defaultValue: () => ({
    decision: {
      status: "LIMITED_GO",
      reason: "Checklist tamamlanmadi",
      blockingItems: [],
      notes: [],
      updatedAt: null,
      updatedByEmail: "",
    },
    risks: [],
  }),
});

function cleanText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDecisionStatus(value, fallback = "LIMITED_GO") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return DECISION_IDS.has(normalized) ? normalized : fallback;
}

function normalizeRiskSeverity(value, fallback = "MEDIUM") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return RISK_SEVERITY_IDS.has(normalized) ? normalized : fallback;
}

function normalizeRiskStatus(value, fallback = "OPEN") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return RISK_STATUS_IDS.has(normalized) ? normalized : fallback;
}

function normalizeTextList(items, maxItemLength = 240, maxItems = 8) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => cleanText(item, maxItemLength)).filter(Boolean).slice(0, maxItems);
}

function sortRiskItems(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) =>
    String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || ""))
  );
}

export async function readPilotLaunchGateState() {
  const parsed = await store.readAsync();
  const decision = parsed?.decision || {};
  const risks = Array.isArray(parsed?.risks) ? parsed.risks : [];
  return {
    decision: {
      status: normalizeDecisionStatus(decision?.status),
      reason: cleanText(decision?.reason, 240),
      blockingItems: normalizeTextList(decision?.blockingItems, 240, 10),
      notes: normalizeTextList(decision?.notes, 240, 10),
      updatedAt: decision?.updatedAt || null,
      updatedByEmail: cleanText(decision?.updatedByEmail, 160),
    },
    risks: sortRiskItems(risks).map((item) => ({
      id: cleanText(item?.id, 80),
      title: cleanText(item?.title, 160),
      detail: cleanText(item?.detail, 800),
      severity: normalizeRiskSeverity(item?.severity),
      status: normalizeRiskStatus(item?.status),
      owner: cleanText(item?.owner, 120),
      createdAt: item?.createdAt || null,
      createdByEmail: cleanText(item?.createdByEmail, 160),
      updatedAt: item?.updatedAt || null,
      updatedByEmail: cleanText(item?.updatedByEmail, 160),
    })),
  };
}

export async function getPilotLaunchGateDecision() {
  return (await readPilotLaunchGateState()).decision;
}

export async function listPilotLaunchGateRisks() {
  return (await readPilotLaunchGateState()).risks;
}

export async function savePilotLaunchGateDecision(input, actor = null) {
  let saved = null;
  const now = new Date().toISOString();
  await store.updateAsync((current) => {
    const prev = current?.decision || {};
    saved = {
      status: normalizeDecisionStatus(input?.status, prev?.status || "LIMITED_GO"),
      reason: cleanText(input?.reason, 240) || cleanText(prev?.reason, 240) || "Checklist tamamlanmadi",
      blockingItems: normalizeTextList(
        Array.isArray(input?.blockingItems) ? input.blockingItems : prev?.blockingItems || [],
        240,
        10
      ),
      notes: normalizeTextList(Array.isArray(input?.notes) ? input.notes : prev?.notes || [], 240, 10),
      updatedAt: now,
      updatedByEmail: cleanText(actor?.email, 160) || cleanText(prev?.updatedByEmail, 160),
    };
    return { ...current, decision: saved };
  });
  return saved;
}

export async function upsertPilotLaunchGateRisk(input, actor = null) {
  const title = cleanText(input?.title, 160);
  if (!title) throw new Error("title required");
  let saved = null;
  const now = new Date().toISOString();
  const recordId = cleanText(input?.id, 80);
  await store.updateAsync((current) => {
    const list = Array.isArray(current?.risks) ? [...current.risks] : [];
    const idx = recordId ? list.findIndex((item) => cleanText(item?.id, 80) === recordId) : -1;
    const prev = idx >= 0 ? list[idx] : null;
    const next = {
      id: prev?.id || recordId || `plg-risk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      detail: cleanText(input?.detail, 800) || cleanText(prev?.detail, 800),
      severity: normalizeRiskSeverity(input?.severity, prev?.severity || "MEDIUM"),
      status: normalizeRiskStatus(input?.status, prev?.status || "OPEN"),
      owner: cleanText(input?.owner, 120) || cleanText(prev?.owner, 120) || "SUPER_ADMIN",
      createdAt: prev?.createdAt || now,
      createdByEmail: cleanText(prev?.createdByEmail, 160) || cleanText(actor?.email, 160),
      updatedAt: now,
      updatedByEmail: cleanText(actor?.email, 160) || cleanText(prev?.updatedByEmail, 160),
    };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    saved = next;
    return { ...current, risks: list };
  });
  return saved;
}

export async function deletePilotLaunchGateRisk(recordId) {
  const safeId = cleanText(recordId, 80);
  if (!safeId) throw new Error("risk id required");
  let removed = false;
  await store.updateAsync((current) => {
    const list = Array.isArray(current?.risks) ? current.risks : [];
    const next = list.filter((item) => cleanText(item?.id, 80) !== safeId);
    removed = next.length !== list.length;
    return { ...current, risks: next };
  });
  return removed;
}
