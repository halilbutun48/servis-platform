// web/src/utils/uiStatus.js
export const GPS_STALE_SEC = 20;
export const GPS_OFFLINE_SEC = 300;

export function ageSecFromAt(atIso) {
  if (!atIso) return null;
  const t = Date.parse(atIso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

export function uiStatusFromAt(atIso) {
  const age = ageSecFromAt(atIso);
  if (age === null) return null; // invalid/missing
  if (age >= GPS_OFFLINE_SEC) return "OFFLINE";
  if (age >= GPS_STALE_SEC) return "STALE";
  return "LIVE";
}

// UI standard: LIVE | STALE | OFFLINE
export function uiStatusFromVehicle(v) {
  const atIso =
    v?.gpsLast?.at ||
    v?.gpsLast?.ts ||
    v?.gpsLast?.createdAt ||
    v?.gpsLast?.updatedAt ||
    null;

  const byAt = uiStatusFromAt(atIso);
  if (byAt) return byAt;

  // fallback (at yoksa)
  const vs = String(v?.status || "").toUpperCase(); // ACTIVE|STALE|...
  if (vs === "ACTIVE") return "LIVE";
  if (vs === "STALE") return "STALE";
  return "OFFLINE";
}

// marker css class (vehicleMarkerC online|stale|offline bekliyor)
export function markerStatusFromUi(ui) {
  if (ui === "OFFLINE") return "offline";
  if (ui === "STALE") return "stale";
  return "online";
}

// mevcut .pill CSS ACTIVE/STALE/PASSIVE bekliyor
export function pillKeyFromUi(ui) {
  if (ui === "LIVE") return "ACTIVE";
  if (ui === "STALE") return "STALE";
  return "PASSIVE"; // OFFLINE
}
// Notifications gibi yerlerde GPS_STALE / GPS_OFFLINE / LIVE / OFFLINE vs. gelirse
// mevcut pill CSS (ACTIVE|STALE|PASSIVE) ile uyumlu hale getirir.
export function pillKeyFromAny(x) {
  const t = String(x || "").toUpperCase();

  // LIVE / recovery / ACTIVE -> ACTIVE (yeşil)
  if (t === "LIVE" || t === "ACTIVE" || t.includes("LIVE") || t.includes("RECOVERY")) return "ACTIVE";

  // STALE / GPS_STALE -> STALE (amber)
  if (t === "STALE" || t.includes("STALE")) return "STALE";

  // OFFLINE / PASSIVE / GPS_OFFLINE -> PASSIVE (gri)
  if (t === "OFFLINE" || t === "PASSIVE" || t.includes("OFFLINE")) return "PASSIVE";

  return "PASSIVE";
}