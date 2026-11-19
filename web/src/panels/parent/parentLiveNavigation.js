import { formatRegionOwnership } from "../../utils/regionOwnership.js";

export function formatParentRegionLabel(value) {
  const formatted = String(formatRegionOwnership(value) || "")
    .replace(/^Bölge:\s*/i, "")
    .trim();
  if (!formatted) return "—";
  if (/^Bölge ID\s+\d+$/iu.test(formatted)) return "Bölge bilgisi mevcut";
  return formatted;
}

function toCoordinateNumber(value) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function usableCoordinate(value) {
  return Boolean(
    value
      && Number.isFinite(value.lat)
      && Number.isFinite(value.lng)
      && Math.abs(value.lat) <= 90
      && Math.abs(value.lng) <= 180
      && !(value.lat === 0 && value.lng === 0),
  );
}

function readCoordinate(point) {
  const lat = toCoordinateNumber(point?.lat ?? point?.location?.lat);
  const lng = toCoordinateNumber(point?.lng ?? point?.location?.lng);
  return usableCoordinate({ lat, lng }) ? { lat, lng } : null;
}

export function buildWalkNavigationUrl(stop, myPos) {
  const destination = readCoordinate(stop);
  if (!destination) return "";
  const origin = readCoordinate(myPos);
  const originPart = origin ? `&origin=${origin.lat},${origin.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1${originPart}&destination=${destination.lat},${destination.lng}&travelmode=walking`;
}
