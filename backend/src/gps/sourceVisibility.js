import { gpsSourceLabelFromKey } from "./sourceLabel.js";

const FRESHNESS_TEXT = {
  LIVE: "GPS canlı",
  STALE: "GPS eski",
  OFFLINE: "GPS bekleniyor",
};

function normalizeSourceKey(source) {
  const key = String(source || "").trim().toUpperCase();
  if (!key) return "BACKEND_VEHICLE_GPS";
  return key.startsWith("CACHED_") ? key.slice("CACHED_".length) : key;
}

function normalizeFreshness(freshness) {
  const key = String(freshness || "").trim().toUpperCase();
  if (key === "OK" || key === "LIVE" || key === "ONLINE") return "LIVE";
  if (key === "STALE") return "STALE";
  return "OFFLINE";
}

export function resolveGpsSourceVisibility({
  officialSourceKey = "BACKEND_VEHICLE_GPS",
  freshness = "OFFLINE",
  hasActiveShift = true,
} = {}) {
  const key = normalizeSourceKey(officialSourceKey);
  const normalizedFreshness = normalizeFreshness(freshness);
  const isDriverPhone = key === "DRIVER_PHONE";
  const label = isDriverPhone
    ? gpsSourceLabelFromKey("DRIVER_PHONE")
    : gpsSourceLabelFromKey("BACKEND_VEHICLE_GPS");
  const mode = isDriverPhone ? "official" : "vehicle_official";

  const text = normalizedFreshness === "LIVE"
    ? (isDriverPhone ? `${label} devrede` : `${label} canlı`)
    : normalizedFreshness === "STALE"
      ? "GPS eski"
      : "GPS bekleniyor";

  const phoneGpsText = !hasActiveShift
    ? "Telefon GPS'i beklemede — görev yok"
    : isDriverPhone
      ? `${label} devrede`
      : "Sürücünün telefon GPS'i beklemede";

  return {
    label,
    mode,
    text,
    phoneGpsText,
    freshnessText: FRESHNESS_TEXT[normalizedFreshness],
    isDriverPhone,
    isVehicleOfficial: !isDriverPhone,
    isLive: normalizedFreshness === "LIVE",
    isStale: normalizedFreshness === "STALE",
    isOffline: normalizedFreshness === "OFFLINE",
  };
}
