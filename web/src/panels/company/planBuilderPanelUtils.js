import { addDaysYmdTR, isoFromTRLocalInput, ymdTR } from "../../utils/time";

const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeGeohash(lat, lng, precision = 6) {
  const p = Math.max(1, Math.min(12, Number(precision) || 6));
  let latitude = [-90.0, 90.0];
  let longitude = [-180.0, 180.0];
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let hash = "";

  while (hash.length < p) {
    if (isEven) {
      const mid = (longitude[0] + longitude[1]) / 2;
      if (lng > mid) {
        ch |= 1 << (4 - bit);
        longitude[0] = mid;
      } else {
        longitude[1] = mid;
      }
    } else {
      const mid = (latitude[0] + latitude[1]) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bit);
        latitude[0] = mid;
      } else {
        latitude[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit += 1;
    } else {
      hash += GEOHASH_BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

export function todayYmdLocal() {
  return ymdTR();
}

function addDaysYmd(ymd, deltaDays) {
  return addDaysYmdTR(ymd, deltaDays);
}

function minutesOf(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (![hh, mm].every(Number.isFinite)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function buildLocalRangeFromItem(baseYmd, item) {
  const baseDate = String(baseYmd || "").match(/^\d{4}-\d{2}-\d{2}$/) ? baseYmd : todayYmdLocal();
  const sMin = minutesOf(item?.startHHMM);
  const eMin = minutesOf(item?.endHHMM);
  if (sMin == null || eMin == null) return { startAtLocal: "", endAtLocal: "" };

  const startAtLocal = `${baseDate}T${item.startHHMM}`;
  const endDate = eMin <= sMin ? addDaysYmd(baseDate, 1) : baseDate;
  const endAtLocal = `${endDate}T${item.endHHMM}`;
  return { startAtLocal, endAtLocal };
}

export function istanbulLocalToUtcIso(dtLocal) {
  return isoFromTRLocalInput(dtLocal) || null;
}

export function avgLatLng(list) {
  if (!list?.length) return null;
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const p of list) {
    const lat = Number(p?.homeLat);
    const lng = Number(p?.homeLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    sumLat += lat;
    sumLng += lng;
    n += 1;
  }
  if (!n) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}
