import { gpsSourceLabelFromKey } from "./gpsSource";

function normalizeSourceKey(source) {
  const key = String(source || "").trim().toUpperCase();
  if (!key) return "";
  return key.startsWith("CACHED_") ? key.slice("CACHED_".length) : key;
}

function pickSourceVisibility(vehicle) {
  return (
    vehicle?.sourceVisibility ||
    vehicle?.liveLocation?.sourceVisibility ||
    vehicle?.liveLocation?.backendVehicleGps?.sourceVisibility ||
    vehicle?.backendVehicleGps?.sourceVisibility ||
    null
  );
}

export function gpsSourceVisibilityTextFromVehicle(vehicle) {
  const sourceVisibility = pickSourceVisibility(vehicle);
  const officialSource = normalizeSourceKey(
    vehicle?.liveLocation?.officialSource ||
      vehicle?.gpsState?.lastSource ||
      vehicle?.liveLocation?.backendVehicleGps?.source ||
      vehicle?.gpsLast?.source ||
      vehicle?.source ||
      ""
  );
  const fallbackLabel = gpsSourceLabelFromKey(officialSource);
  const label = String(sourceVisibility?.label || fallbackLabel || "").trim() || fallbackLabel;
  const text = String(sourceVisibility?.text || sourceVisibility?.label || fallbackLabel || "").trim() || fallbackLabel;

  return {
    label,
    text,
    officialSource,
    sourceVisibility,
    hasSourceVisibility: Boolean(sourceVisibility && (sourceVisibility.text || sourceVisibility.label)),
  };
}
