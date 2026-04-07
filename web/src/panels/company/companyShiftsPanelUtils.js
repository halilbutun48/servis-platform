import { isoFromTRLocalInput, toDatetimeLocalTR, ymdTR, addDaysYmdTR } from "../../utils/time";
import { DEFAULT_DURATION_KEY, DEFAULT_WEEKMASK } from "./ShiftTemplatesPanel";

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function minutesOf(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (![hh, mm].every(Number.isFinite)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function todayYmdLocal() {
  return ymdTR();
}

export function addDaysYmd(ymd, deltaDays) {
  return addDaysYmdTR(ymd, deltaDays);
}

export function pickCount(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function istanbulLocalToUtcIso(dtLocal) {
  return isoFromTRLocalInput(dtLocal) || null;
}

export function utcIsoToIstanbulLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!d || Number.isNaN(d.getTime())) return "";
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${ymd}T${hm}`;
}

export function normalizeTemplate(x) {
  if (!x) return null;
  const id = String(x?.id || "").trim();
  const name = String(x?.name || "").trim();
  const packKey = String(x?.packKey || "CUSTOM").trim();
  const weekMask = Number.isFinite(Number(x?.weekMask)) ? Number(x.weekMask) : DEFAULT_WEEKMASK;
  const durationKey = String(x?.durationKey || DEFAULT_DURATION_KEY);
  const people = x?.people == null || x?.people === "" ? null : Number(x.people);

  let items = [];
  if (Array.isArray(x?.items) && x.items.length) {
    items = x.items
      .map((it) => ({
        label: String(it?.label || "Vardiya").trim() || "Vardiya",
        startHHMM: String(it?.startHHMM || "").trim(),
        endHHMM: String(it?.endHHMM || "").trim(),
        direction: String(it?.direction || "INBOUND"),
        pattern: String(it?.pattern || "ONE_WAY"),
      }))
      .filter((it) => minutesOf(it.startHHMM) != null && minutesOf(it.endHHMM) != null);
  } else if (x?.startHHMM && x?.endHHMM) {
    const s = String(x.startHHMM).trim();
    const e = String(x.endHHMM).trim();
    if (minutesOf(s) != null && minutesOf(e) != null) {
      items = [{ label: name || "Vardiya", startHHMM: s, endHHMM: e, direction: "INBOUND", pattern: "ONE_WAY" }];
    }
  }

  if (!id || !name || !items.length) return null;

  return {
    id,
    name,
    packKey,
    weekMask,
    durationKey,
    items,
    people: Number.isFinite(people) && people > 0 ? people : null,
    kind: "CUSTOM",
  };
}

export function loadCustomTemplatesFromStorage(templatesStorageKey, templatesStorageKeyLegacy) {
  const candidates = [];
  for (const key of [templatesStorageKey, templatesStorageKeyLegacy]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) candidates.push(...parsed);
    } catch {
      // ignore
    }
  }

  const seen = new Set();
  const out = [];
  for (const x of candidates) {
    const nx = normalizeTemplate(x);
    if (!nx) continue;
    if (seen.has(nx.id)) continue;
    seen.add(nx.id);
    out.push(nx);
  }

  try {
    localStorage.setItem(templatesStorageKey, JSON.stringify(out));
  } catch {
    // ignore
  }

  return out;
}

export function buildLocalRangeFromItem(baseDate, it) {
  if (!baseDate || !it?.startHHMM || !it?.endHHMM) return { startAtLocal: "", endAtLocal: "" };
  const sMin = minutesOf(it.startHHMM);
  const eMin = minutesOf(it.endHHMM);
  if (sMin == null || eMin == null) return { startAtLocal: "", endAtLocal: "" };

  const startAtLocal = `${baseDate}T${it.startHHMM}`;
  const endDate = eMin <= sMin ? addDaysYmd(baseDate, 1) : baseDate;
  const endAtLocal = `${endDate}T${it.endHHMM}`;
  return { startAtLocal, endAtLocal };
}

export function pkgMinuteKey(shift) {
  const ca = shift?.createdAt || shift?.created_at || shift?.createdAtUtc || null;
  if (!ca) return null;
  const d = new Date(ca);
  if (Number.isNaN(d.getTime())) return null;
  return toDatetimeLocalTR(d);
}

export function computePackageShiftIds(items, seedShift) {
  if (!seedShift) return [];
  const key = pkgMinuteKey(seedShift);
  const cid = Number(seedShift.companyId || seedShift.company?.id || 0);
  if (!key || !cid) return [];
  const ids = (items || [])
    .filter((x) => Number(x.companyId || x.company?.id || 0) === cid && pkgMinuteKey(x) === key)
    .map((x) => Number(x.id))
    .filter((x) => Number.isFinite(x) && x > 0);
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

export function shiftStartYmdIstanbul(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  } catch {
    return "";
  }
}

export function isSameDayIstanbul(iso, ymd) {
  if (!ymd) return true;
  const d = shiftStartYmdIstanbul(iso);
  return d && d === ymd;
}
