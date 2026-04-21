import { companyPath } from "./paths";

export function canUseEntityChat(role) {
  return ["ROOM", "COMPANY", "SUPER_ADMIN"].includes(String(role || ""));
}

export function defaultChatEntityType(role) {
  return canUseEntityChat(role) ? "shift" : "screen";
}

function normalizeScopePath(path) {
  return String(path || "").split("?")[0];
}

function scopeFamily(path) {
  return normalizeScopePath(path).split("/").filter(Boolean)[0] || "";
}

export function selectionApplies(selection, path) {
  if (!selection) return false;
  const scope = normalizeScopePath(selection.scopeKey || "");
  const current = normalizeScopePath(path);
  if (!scope || scope === current) return true;
  const sameFamily = scopeFamily(scope) && scopeFamily(scope) === scopeFamily(current);
  if (!sameFamily) return false;
  if (/\/copilot$/.test(current)) return true;
  const entityType = String(selection?.entityType || "");
  return ["shift", "vehicle"].includes(entityType);
}

export function screenOptionLabel(item) {
  if (!item) return "";
  return `${item.label || "Ekran"} • ${item.path || ""}`;
}

export function firstList(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}

export function safeHistoryLoad() {
  try {
    const raw = localStorage.getItem("copilot.history.m46_6_a");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(entry) {
  try {
    const prev = safeHistoryLoad();
    const dedupeKey = `${entry.panelMode}:${entry.intent || "-"}:${entry.jobType || "-"}:${entry.entityType}:${entry.entityId}`;
    const next = [entry, ...prev.filter((x) => `${x.panelMode}:${x.intent || "-"}:${x.jobType || "-"}:${x.entityType}:${x.entityId}` !== dedupeKey)].slice(0, 5);
    localStorage.setItem("copilot.history.m46_6_a", JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function severityStyle(severity) {
  const map = {
    CRITICAL: { color: "#fff", background: "#b42318" },
    WARN: { color: "#fff", background: "#b54708" },
    INFO: { color: "#fff", background: "#175cd3" },
    OK: { color: "#fff", background: "#027a48" },
  };
  return map[severity] || { color: "#fff", background: "#667085" };
}

export function signalStyle(state) {
  const map = {
    GOOD: { color: "#027a48", border: "1px solid #12b76a", background: "#ecfdf3" },
    WARN: { color: "#b54708", border: "1px solid #f79009", background: "#fffaeb" },
    BLOCKED: { color: "#b42318", border: "1px solid #f04438", background: "#fef3f2" },
    INFO: { color: "#175cd3", border: "1px solid #53b1fd", background: "#eff8ff" },
  };
  return map[state] || { color: "#344054", border: "1px solid #d0d5dd", background: "#f8fafc" };
}

export function decisionTone(value) {
  if (["OK", "READY", "FRESH", "SUFFICIENT"].includes(String(value || ""))) return signalStyle("GOOD");
  if (["ATTENTION", "REVIEW_NEEDED", "STALE", "PARTIAL"].includes(String(value || ""))) return signalStyle("WARN");
  if (["BLOCKED", "NOT_READY", "WEAK"].includes(String(value || ""))) return signalStyle("BLOCKED");
  return signalStyle("INFO");
}

export function confidencePct(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

export function optionLabel(entityType, item) {
  if (!item) return "";
  if (entityType === "screen") return screenOptionLabel(item);
  if (entityType === "vehicle") {
    return `#${item.id} • ${item.plate || "plaka?"} • ${item.status || "-"}`;
  }
  return `#${item.id} • ${item.status || "-"} • ${item.company?.name || item.room?.name || "vardiya"}`;
}

export function filterItems(entityType, list, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return list;
  return (Array.isArray(list) ? list : []).filter((item) => optionLabel(entityType, item).toLowerCase().includes(q));
}

export function priorityTone(score) {
  if (Number(score || 0) >= 85) return signalStyle("BLOCKED");
  if (Number(score || 0) >= 60) return signalStyle("WARN");
  return signalStyle("GOOD");
}

export function actionPriorityLabel(action) {
  const score = Number(action?.priorityScore || 0);
  return `${action?.priority || "-"} • ${score || 0}`;
}

export function resolveGuideRoute(me, routeKey) {
  const role = String(me?.role || "");
  const key = String(routeKey || "");
  if (key.startsWith("/")) return key;
  if (role === "ROOM") {
    if (key === "ROOM_OFFERS") return "/room/offers";
    if (key === "ROOM_SHIFTS") return "/room/shifts";
    if (key === "ROOM_VEHICLES") return "/room/vehicles";
    if (key === "ROOM_DRIVERS") return "/room/drivers";
    if (key === "ROOM_AGREEMENTS") return "/room/agreements";
    if (key === "ROOM_MAP") return "/room/map";
    if (key === "ROOM_OPERATION_HEALTH") return "/room/operation-health";
    if (key === "ROOM_COPILOT") return "/room/copilot";
  }
  if (role === "COMPANY") {
    if (key === "COMPANY_SHIFTS") return companyPath(me, "/shifts");
    if (key === "COMPANY_AGREEMENTS") return companyPath(me, "/agreements");
    if (key === "COMPANY_COPILOT") return companyPath(me, "/copilot");
  }
  if (role === "SUPER_ADMIN") {
    if (key === "SUPERADMIN_OVERVIEW") return "/superadmin";
    if (key === "SUPERADMIN_COPILOT") return "/superadmin/copilot";
  }
  return "";
}
