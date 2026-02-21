// web/src/utils/agreementUi.js
export const WEEKDAYS = [
  { k: "Mon", label: "Pzt", bit: 1 },
  { k: "Tue", label: "Sal", bit: 2 },
  { k: "Wed", label: "Çar", bit: 4 },
  { k: "Thu", label: "Per", bit: 8 },
  { k: "Fri", label: "Cum", bit: 16 },
  { k: "Sat", label: "Cmt", bit: 32 },
  { k: "Sun", label: "Paz", bit: 64 },
];

export function maskFromSelected(sel) {
  return WEEKDAYS.reduce((m, d) => (sel?.[d.k] ? (m | d.bit) : m), 0);
}

export function selectedFromMask(mask) {
  const m = Number(mask || 0);
  const sel = {};
  for (const d of WEEKDAYS) sel[d.k] = (m & d.bit) !== 0;
  return sel;
}

// ✅ weekMask -> "Pzt Sal ..." / preset kısa adlar
export function weekMaskToText(mask) {
  const m = Number(mask || 0);
  if (!m) return "-";
  if (m === 127) return "Her gün";
  if (m === (1 + 2 + 4 + 8 + 16)) return "Hafta içi";
  if (m === (1 + 2 + 4 + 8 + 16 + 32)) return "6 gün";

  const sel = selectedFromMask(m);
  const labels = WEEKDAYS.filter((d) => sel[d.k]).map((d) => d.label);
  return labels.length ? labels.join(" ") : "-";
}

export function toHHMM(min) {
  const m = Math.max(0, Math.min(1439, Number(min || 0)));
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function parseHHMM(s) {
  const t = String(s || "").trim();
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export const DAY_PRESETS = [
  { key: "5", label: "Hafta içi (5)", mask: 1 + 2 + 4 + 8 + 16 },
  { key: "6", label: "6 gün", mask: 1 + 2 + 4 + 8 + 16 + 32 },
  { key: "7", label: "Her gün (7)", mask: 127 },
];

export const TIME_PRESETS = [
  { key: "morning", label: "Sabah (08:00–10:00)", startMin: 8 * 60, endMin: 10 * 60 },
  { key: "evening", label: "Akşam (17:00–19:00)", startMin: 17 * 60, endMin: 19 * 60 },
  { key: "night", label: "Gece (22:00–02:00)", startMin: 22 * 60, endMin: 2 * 60 }, // midnight-cross
];

export const DURATION_PRESETS = [
  { key: "1w", label: "1 hafta", days: 7 },
  { key: "1m", label: "1 ay", days: 30 },
  { key: "3m", label: "3 ay", days: 90 },
  { key: "6m", label: "6 ay", days: 180 },
  { key: "1y", label: "1 yıl", days: 365 },
];

export function addDaysISO(isoDateYmd, days) {
  const d = new Date(`${isoDateYmd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}