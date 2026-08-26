import { normalizeNotifV1, notificationKindLabel, notificationTitleLabel } from "../../utils/notificationV1";
import { formatDateTimeTR } from "../../utils/time";

export function fmtTR(value) {
  if (!value) return "-";
  try {
    return formatDateTimeTR(value);
  } catch {
    return String(value || "-");
  }
}

export function normalizeNotificationDigest(items = []) {
  return (Array.isArray(items) ? items : []).map((n, idx) => {
    const p = normalizeNotifV1(n?.payloadJson ?? n?.payload ?? n);
    return {
      key: n?.id ?? idx,
      id: n?.id ?? "",
      scope: String(n?.scope ?? "-"),
      type: notificationKindLabel(n?.type ?? p.kind) || "-",
      kind: notificationKindLabel(p.kind ?? n?.kind ?? n?.type),
      status: String(p.status ?? n?.status ?? ""),
      title: notificationTitleLabel(p.title || n?.type || "-", p.kind ?? n?.kind ?? n?.type) || "-",
      message: String(p.message || ""),
      at: p.at || n?.createdAt || "",
      payload: p,
      raw: n,
    };
  });
}

export function includesNeedles(text, needles = []) {
  const hay = String(text || "").toLowerCase();
  return (Array.isArray(needles) ? needles : []).some((needle) => hay.includes(String(needle || "").toLowerCase()));
}

export function filterNotificationDigest(rows = [], needles = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) => includesNeedles([row?.title, row?.message, row?.kind, row?.type, row?.status].filter(Boolean).join(" • "), needles));
}

export function countBy(items = [], getKey = (value) => value) {
  const out = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = String(getKey(item) ?? "").trim();
    if (!key) continue;
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}

export function topRepeatedValues(items = [], getKey, limit = 5) {
  return Array.from(countBy(items, getKey).entries())
    .map(([key, count]) => ({ key, count }))
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "tr"))
    .slice(0, limit);
}
