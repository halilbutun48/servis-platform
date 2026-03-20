export const TR_LOCALE = "tr-TR";
export const TR_TIME_ZONE = "Europe/Istanbul";
export const TR_OFFSET = "+03:00";

function toDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function merge(defaults, options) {
  return { ...defaults, ...(options || {}), timeZone: TR_TIME_ZONE };
}

export function formatDateTimeTR(value, options = {}) {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleString(TR_LOCALE, merge({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }, options));
}

export function formatDateTR(value, options = {}) {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleDateString(TR_LOCALE, merge({ year: "numeric", month: "2-digit", day: "2-digit" }, options));
}

export function formatTimeTR(value, options = {}) {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleTimeString(TR_LOCALE, merge({ hour: "2-digit", minute: "2-digit" }, options));
}

export function ymdTR(value = new Date()) {
  const d = toDate(value) || new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function addDaysYmdTR(ymd, days) {
  const base = new Date(`${String(ymd).slice(0, 10)}T00:00:00.000${TR_OFFSET}`);
  if (Number.isNaN(base.getTime())) return String(ymd || "").slice(0, 10);
  base.setUTCDate(base.getUTCDate() + Number(days || 0));
  return ymdTR(base);
}

export function weekdayBitFromYmdTR(ymd) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00.000${TR_OFFSET}`);
  if (Number.isNaN(d.getTime())) return 0;
  const wd = d.getUTCDay();
  if (wd === 0) return 64;
  return 1 << (wd - 1);
}


export function toDateInputTR(value) {
  const d = toDate(value);
  if (!d) return "";
  return ymdTR(d);
}

export function toDatetimeLocalTR(value) {
  const d = toDate(value);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}


export function nowIsoTR(value = new Date()) {
  const d = toDate(value) || new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.000${TR_OFFSET}`;
}

export function isoFromTRLocalInput(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/.exec(v);
  if (!m) return "";
  const sec = m[3] || "00";
  return `${m[1]}T${m[2]}:${sec}.000${TR_OFFSET}`;
}


export function isoFromTRDateInput(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  return `${v}T00:00:00.000${TR_OFFSET}`;
}

export function isoFromTRYmdMin(ymd, min) {
  const base = String(ymd || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return "";
  const total = ((Number(min) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${base}T${hh}:${mm}:00.000${TR_OFFSET}`;
}
