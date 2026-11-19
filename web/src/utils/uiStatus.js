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
  const canonical = String(v?.gpsCanonicalStatus || "").toUpperCase();
  if (canonical === "LIVE" || canonical === "STALE" || canonical === "OFFLINE") return canonical;

  // Freshness is determined from the timestamp when it exists. A cached
  // gpsState can outlive its last GPS sample and must not make old telemetry
  // appear LIVE on the map or in the selected-record context.
  const atIso =
    v?.gpsLast?.at ||
    v?.gpsLast?.ts ||
    v?.gpsLast?.createdAt ||
    v?.gpsLast?.updatedAt ||
    null;

  const byAt = uiStatusFromAt(atIso);
  if (byAt) return byAt;

  // With no timestamp, retain a bounded provider state if one exists; never
  // synthesize LIVE from the presence of a vehicle record alone.
  const gs = String(v?.gpsState?.lastUiStatus || "").toUpperCase();
  if (gs === "LIVE" || gs === "STALE" || gs === "OFFLINE") return gs;

  return "OFFLINE";
}

// marker css class (vehicleMarkerC online|stale|offline bekliyor)
export function markerStatusFromUi(ui) {
  if (ui === "OFFLINE") return "offline";
  if (ui === "STALE") return "stale";
  return "online";
}

// mevcut .pill CSS success/warning/critical/info/passive bekliyor
export function pillKeyFromUi(ui) {
  if (ui === "LIVE") return "SUCCESS";
  if (ui === "STALE") return "WARNING";
  return "CRITICAL"; // OFFLINE
}

// Notifications gibi yerlerde GPS_STALE / GPS_OFFLINE / LIVE / OFFLINE vs. gelirse
// mevcut pill CSS (success|warning|critical|info|passive) ile uyumlu hale getirir.
export function pillKeyFromAny(x) {
  const t = String(x || "").toUpperCase();

  // LIVE / recovery / ACTIVE -> success (yeşil)
  if (t === "LIVE" || t === "ACTIVE" || t.includes("LIVE") || t.includes("RECOVERY")) return "SUCCESS";

  // STALE / GPS_STALE -> warning (sarı)
  if (t === "STALE" || t.includes("STALE") || t === "REQUESTED" || t === "PENDING") return "WARNING";

  // OFFLINE / FAIL / ERROR -> critical (kırmızı)
  if (t === "OFFLINE" || t.includes("OFFLINE") || t === "FAIL" || t === "ERROR") return "CRITICAL";

  // PASSIVE / DRAFT / ARCHIVED -> passive (gri)
  if (t === "PASSIVE" || t === "DRAFT" || t === "ARCHIVED" || t === "SKIPPED" || t === "NONE") return "PASSIVE";

  if (t === "COUNT" || t === "ROLE" || t === "INFO" || t === "UNKNOWN") return "INFO";

  return "PASSIVE";
}
