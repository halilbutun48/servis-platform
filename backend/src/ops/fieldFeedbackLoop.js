import { createJsonFileStore } from "../lib/jsonFileStore.js";
import { FIELD_PREP_TEST_SCENARIOS } from "./fieldPrepPacket.js";

const store = createJsonFileStore("field-feedback-records.json", { defaultValue: [] });

export const FIELD_FEEDBACK_STATUSES = [
  { id: "GORULDU", label: "Görüldü", bucket: "OPEN" },
  { id: "TEKRARLANDI", label: "Tekrarlandı", bucket: "OPEN" },
  { id: "COZULDU", label: "Çözüldü", bucket: "RESOLVED" },
  { id: "KAPANDI", label: "Kapandı", bucket: "CLOSED" },
];

export const FIELD_FEEDBACK_SEVERITIES = [
  { id: "LOW", label: "Düşük" },
  { id: "MEDIUM", label: "Orta" },
  { id: "HIGH", label: "Yüksek" },
  { id: "CRITICAL", label: "Kritik" },
];

export const FIELD_FEEDBACK_SURFACES = [
  { id: "MOBILE", label: "Mobil" },
  { id: "WEB", label: "Web" },
  { id: "BACKEND", label: "Backend" },
  { id: "OPS", label: "Operasyon" },
  { id: "DEVICE", label: "Cihaz" },
  { id: "OTHER", label: "Diğer" },
];

export const FIELD_FEEDBACK_ROLES = ["SUPER_ADMIN", "ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"];

const STATUS_IDS = new Set(FIELD_FEEDBACK_STATUSES.map((item) => item.id));
const SEVERITY_IDS = new Set(FIELD_FEEDBACK_SEVERITIES.map((item) => item.id));
const SURFACE_IDS = new Set(FIELD_FEEDBACK_SURFACES.map((item) => item.id));
const ROLE_IDS = new Set(FIELD_FEEDBACK_ROLES);

function cleanText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeRoleId(value, fallback = "SUPER_ADMIN") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return ROLE_IDS.has(normalized) ? normalized : fallback;
}

function normalizeStatus(value, fallback = "GORULDU") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return STATUS_IDS.has(normalized) ? normalized : fallback;
}

function normalizeSeverity(value, fallback = "MEDIUM") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return SEVERITY_IDS.has(normalized) ? normalized : fallback;
}

function normalizeSurface(value, fallback = "OTHER") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return SURFACE_IDS.has(normalized) ? normalized : fallback;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((item) => cleanText(item, 32)).filter(Boolean).slice(0, 6);
}

function sortNewest(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
}

function summarizeRoleCoverage(items) {
  return FIELD_FEEDBACK_ROLES.map((roleId) => {
    const rows = items.filter((item) => normalizeRoleId(item?.reportedByRole) === roleId);
    return {
      roleId,
      count: rows.length,
      lastUpdatedAt: rows[0]?.updatedAt || null,
    };
  });
}

function summarizeSurfaceCoverage(items) {
  return FIELD_FEEDBACK_SURFACES.map((surface) => ({
    surfaceId: surface.id,
    label: surface.label,
    count: items.filter((item) => normalizeSurface(item?.surface) === surface.id).length,
  }));
}

function summarizeScenarioCoverage(items) {
  return FIELD_PREP_TEST_SCENARIOS.map((scenario) => ({
    scenarioId: scenario.id,
    title: scenario.title,
    count: items.filter((item) => String(item?.scenarioId || "") === scenario.id).length,
  }));
}

function bucketSummary(items) {
  const summary = {
    total: items.length,
    openCount: 0,
    repeatedCount: 0,
    resolvedCount: 0,
    closedCount: 0,
    criticalOpenCount: 0,
    lastUpdatedAt: items[0]?.updatedAt || null,
    lastUpdatedByEmail: items[0]?.lastUpdatedByEmail || "",
    bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    byRole: { SUPER_ADMIN: 0, ROOM: 0, COMPANY: 0, DRIVER: 0, PERSONEL: 0, PARENT: 0 },
  };
  for (const item of items) {
    const status = normalizeStatus(item?.status);
    const severity = normalizeSeverity(item?.severity);
    const roleId = normalizeRoleId(item?.reportedByRole);
    if (summary.bySeverity[severity] != null) summary.bySeverity[severity] += 1;
    if (summary.byRole[roleId] != null) summary.byRole[roleId] += 1;
    if (status === "GORULDU") summary.openCount += 1;
    if (status === "TEKRARLANDI") summary.repeatedCount += 1;
    if (status === "COZULDU") summary.resolvedCount += 1;
    if (status === "KAPANDI") summary.closedCount += 1;
    if ((status === "GORULDU" || status === "TEKRARLANDI") && (severity === "HIGH" || severity === "CRITICAL")) summary.criticalOpenCount += 1;
  }
  return summary;
}

export async function readFieldFeedbackRecords() {
  const parsed = await store.readAsync();
  return Array.isArray(parsed) ? parsed : [];
}

export async function listFieldFeedbackRecords(options = {}) {
  const items = sortNewest(await readFieldFeedbackRecords());
  const roleId = cleanUpper(options?.roleId || options?.reportedByRole || "");
  const status = cleanUpper(options?.status || "");
  const severity = cleanUpper(options?.severity || "");
  const surface = cleanUpper(options?.surface || "");
  const query = cleanText(options?.query, 120).toLowerCase();
  return items.filter((item) => {
    if (roleId && roleId !== "ALL" && normalizeRoleId(item?.reportedByRole) !== roleId) return false;
    if (status && status !== "ALL" && normalizeStatus(item?.status) !== status) return false;
    if (severity && severity !== "ALL" && normalizeSeverity(item?.severity) !== severity) return false;
    if (surface && surface !== "ALL" && normalizeSurface(item?.surface) !== surface) return false;
    if (query) {
      const hay = `${item?.title || ""} ${item?.detail || ""} ${item?.relatedPath || ""} ${item?.scenarioId || ""} ${(item?.tags || []).join(" ")}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export async function getFieldFeedbackRecordById(id) {
  const safeId = cleanText(id, 80);
  if (!safeId) return null;
  const items = await readFieldFeedbackRecords();
  return items.find((item) => String(item?.id || "") === safeId) || null;
}

export async function upsertFieldFeedbackRecord(input, actor = null) {
  const title = cleanText(input?.title, 160);
  const detail = cleanText(input?.detail, 1600);
  if (!title) throw new Error("title required");
  if (!detail) throw new Error("detail required");

  const scenarioId = cleanText(input?.scenarioId, 80);
  const relatedPath = cleanText(input?.relatedPath, 160);
  const recordId = cleanText(input?.id, 80);
  const now = new Date().toISOString();
  let saved = null;

  await store.updateAsync((current) => {
    const list = Array.isArray(current) ? current : [];
    const idx = recordId ? list.findIndex((item) => String(item?.id || "") === recordId) : -1;
    const prev = idx >= 0 ? list[idx] : null;
    const nextStatus = normalizeStatus(input?.status, prev?.status || "GORULDU");
    const next = {
      id: prev?.id || recordId || `ff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      detail,
      status: nextStatus,
      severity: normalizeSeverity(input?.severity, prev?.severity || "MEDIUM"),
      surface: normalizeSurface(input?.surface, prev?.surface || "OTHER"),
      reportedByRole: normalizeRoleId(input?.reportedByRole || actor?.role, prev?.reportedByRole || "SUPER_ADMIN"),
      ownerRole: normalizeRoleId(input?.ownerRole || prev?.ownerRole || input?.reportedByRole || actor?.role || "SUPER_ADMIN"),
      scenarioId,
      relatedPath,
      relatedShiftId: Number(input?.relatedShiftId || prev?.relatedShiftId || 0) || null,
      tags: normalizeTags(input?.tags?.length ? input.tags : prev?.tags || []),
      createdAt: prev?.createdAt || now,
      createdByUserId: prev?.createdByUserId || Number(actor?.id || 0) || null,
      createdByEmail: prev?.createdByEmail || cleanText(actor?.email, 160),
      updatedAt: now,
      lastUpdatedByUserId: Number(actor?.id || 0) || prev?.lastUpdatedByUserId || null,
      lastUpdatedByEmail: cleanText(actor?.email, 160) || prev?.lastUpdatedByEmail || "",
      history: Array.isArray(prev?.history) ? [...prev.history] : [],
    };
    const historyEntry = {
      at: now,
      status: nextStatus,
      byRole: next.reportedByRole,
      byEmail: cleanText(actor?.email, 160),
      note: cleanText(input?.historyNote || input?.statusNote || detail, 400),
    };
    if (!prev || prev.status !== nextStatus || historyEntry.note !== (prev?.history?.[prev.history.length - 1]?.note || "")) {
      next.history.push(historyEntry);
    }
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    saved = next;
    return list;
  });

  return saved;
}

export async function updateFieldFeedbackRecordStatus(recordId, status, note, actor = null) {
  const safeId = cleanText(recordId, 80);
  if (!safeId) throw new Error("recordId required");
  let saved = null;
  await store.updateAsync((current) => {
    const list = Array.isArray(current) ? current : [];
    const idx = list.findIndex((item) => String(item?.id || "") === safeId);
    if (idx < 0) throw new Error("record not found");
    const prev = list[idx];
    const now = new Date().toISOString();
    const nextStatus = normalizeStatus(status, prev?.status || "GORULDU");
    const next = {
      ...prev,
      status: nextStatus,
      updatedAt: now,
      lastUpdatedByUserId: Number(actor?.id || 0) || prev?.lastUpdatedByUserId || null,
      lastUpdatedByEmail: cleanText(actor?.email, 160) || prev?.lastUpdatedByEmail || "",
      history: Array.isArray(prev?.history) ? [...prev.history] : [],
    };
    next.history.push({
      at: now,
      status: nextStatus,
      byRole: cleanUpper(actor?.role || prev?.reportedByRole || "SUPER_ADMIN"),
      byEmail: cleanText(actor?.email, 160),
      note: cleanText(note, 400),
    });
    list[idx] = next;
    saved = next;
    return list;
  });
  return saved;
}

export async function buildFieldFeedbackLoopPacket() {
  const items = await listFieldFeedbackRecords();
  const summary = bucketSummary(items);
  const blockers = items
    .filter((item) => (normalizeStatus(item?.status) === "GORULDU" || normalizeStatus(item?.status) === "TEKRARLANDI") && (normalizeSeverity(item?.severity) === "HIGH" || normalizeSeverity(item?.severity) === "CRITICAL"))
    .slice(0, 5)
    .map((item) => `${item.title} (${item.severity})`);
  const warnings = items
    .filter((item) => normalizeStatus(item?.status) === "TEKRARLANDI" || normalizeSeverity(item?.severity) === "MEDIUM")
    .slice(0, 6)
    .map((item) => `${item.title} (${item.status})`);

  return {
    generatedAt: new Date().toISOString(),
    stage: summary.criticalOpenCount > 0 ? "ACTION_REQUIRED" : summary.repeatedCount > 0 || summary.openCount > 0 ? "TRACKING" : items.length ? "STABLE" : "NO_FEEDBACK_YET",
    summary,
    blockers,
    warnings,
    statuses: FIELD_FEEDBACK_STATUSES,
    severities: FIELD_FEEDBACK_SEVERITIES,
    surfaces: FIELD_FEEDBACK_SURFACES,
    records: items.slice(0, 24),
    roleCoverage: summarizeRoleCoverage(items),
    surfaceCoverage: summarizeSurfaceCoverage(items),
    scenarioCoverage: summarizeScenarioCoverage(items),
    notes: [
      "Bu paket saha günü görülen sorunları dağınık not olmaktan çıkarıp tek döngüde izler.",
      "Durum akışı: görüldü → tekrarlandı → çözüldü → kapandı.",
      "Backend tek kaynak gerçekliktir; geri bildirim kaydı web veya mobil local state içinde tutulmaz.",
    ],
  };
}
