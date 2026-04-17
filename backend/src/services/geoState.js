const VALID_STATUSES = new Set(["OK", "NEEDS_REVIEW", "FAILED"]);
const VALID_REASONS = new Set(["MANUAL_OVERRIDE", "HAS_COORDS", "ADDRESS_ONLY", "INVALID_COORD", "MISSING_ADDRESS"]);

export const GEO_REASON_LABELS = {
  MANUAL_OVERRIDE: "Elle doğrulandı",
  HAS_COORDS: "Geçerli koordinat var",
  ADDRESS_ONLY: "Adres var, koordinat yok",
  INVALID_COORD: "Koordinat eksik veya geçersiz",
  MISSING_ADDRESS: "Adres ve koordinat yok",
};

function normalizeText(v) {
  const s = String(v ?? "").trim();
  return s || "";
}

function normalizeCoord(v, kind) {
  if (v == null || v === "") return null;
  const n0 = Number(v);
  if (!Number.isFinite(n0)) return null;
  const n = Object.is(n0, -0) ? 0 : n0;
  if (n === 0) return null;
  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

export function normalizeGeoReason(v) {
  const code = String(v ?? "").trim().toUpperCase();
  return VALID_REASONS.has(code) ? code : null;
}

export function geoReasonLabel(code) {
  return GEO_REASON_LABELS[code] || code || "Bilinmiyor";
}

export function inferGeoState(input = {}) {
  const address = normalizeText(input.homeAddress ?? input.address);
  const lat = normalizeCoord(input.homeLat ?? input.lat, "lat");
  const lng = normalizeCoord(input.homeLng ?? input.lng, "lng");
  const manualOverride = Boolean(input.geoManualOverride);
  const explicitStatus = VALID_STATUSES.has(input.geoStatus) ? input.geoStatus : null;
  const noteReason = normalizeGeoReason(input.geoNote ?? input.geoReason);
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const hasPartialCoords = (lat == null) !== (lng == null);

  let status = "FAILED";
  let reason = noteReason || "MISSING_ADDRESS";

  if (manualOverride && hasCoords) {
    status = "OK";
    reason = "MANUAL_OVERRIDE";
  } else if (hasCoords) {
    status = "OK";
    reason = noteReason === "MANUAL_OVERRIDE" ? "MANUAL_OVERRIDE" : "HAS_COORDS";
  } else if (hasPartialCoords) {
    status = "NEEDS_REVIEW";
    reason = "INVALID_COORD";
  } else if (address) {
    status = explicitStatus === "FAILED" ? "FAILED" : "NEEDS_REVIEW";
    reason = noteReason === "INVALID_COORD" ? "INVALID_COORD" : "ADDRESS_ONLY";
  } else {
    status = "FAILED";
    reason = noteReason || "MISSING_ADDRESS";
  }

  return {
    geoStatus: status,
    geoReason: reason,
    geoReasonText: geoReasonLabel(reason),
  };
}

export function decorateGeoItem(item) {
  if (!item) return item;
  const meta = inferGeoState(item);
  return { ...item, ...meta };
}
