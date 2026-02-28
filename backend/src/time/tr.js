// backend/src/time/tr.js
// Turkey is permanently UTC+03:00 (no DST). We treat Agreement schedules as TR-local.

export const TR_OFFSET_MIN = 180;
export const TR_OFFSET_MS = TR_OFFSET_MIN * 60_000;

// YYYY-MM-DD from a Date interpreted in TR.
export function ymdTR(d = new Date()) {
  const tr = new Date(d.getTime() + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tr.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Date at 00:00Z for the given YMD (useful for DB @db.Date comparisons)
export function dateOnlyUTCFromYmd(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

// Add days to a TR-local YYYY-MM-DD.
export function addDaysTR(ymd, days) {
  // Use TR midnight anchor to avoid host timezone.
  const base = new Date(`${ymd}T00:00:00.000+03:00`);
  base.setUTCDate(base.getUTCDate() + Number(days || 0));
  return ymdTR(base);
}

// Week mask bit for a TR-local date.
// Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64
export function dayBitTRFromYmd(ymd) {
  // Use TR noon so UTC day doesn't drift to previous day.
  const d = new Date(`${ymd}T12:00:00.000+03:00`);
  const wd = d.getUTCDay(); // 0=Sun
  if (wd === 0) return 64;
  return 1 << (wd - 1);
}

// Convert TR-local (YMD + minutes from midnight) into an absolute UTC Date.
export function atTR(ymd, min) {
  const base = new Date(`${ymd}T00:00:00.000+03:00`);
  const m = ((Number(min) % 1440) + 1440) % 1440;
  return new Date(base.getTime() + m * 60_000);
}

// Date-only (00:00Z) of the TR day that contains the given Date.
// Useful when a timestamp is before 03:00TR (falls on previous UTC day).
export function dateOnlyTR(d) {
  const tr = new Date(new Date(d).getTime() + TR_OFFSET_MS);
  return new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()));
}
