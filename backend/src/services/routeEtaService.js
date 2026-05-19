import { haversineKm, etaMinutes } from "../geo.js";
import { osrmRoute } from "./osrmRoute.js";

const DEFAULT_TIMEOUT_MS = 2000;
const MIN_TIMEOUT_MS = 1500;
const MAX_TIMEOUT_MS = 2500;
const DEFAULT_SPEED_KMH = 30;
const SUSPICIOUS_ETA_LIMIT_MIN = 90;

function clampNumber(value, min, max, fallback) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function compactText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickCoordinateCandidate(input) {
  if (Array.isArray(input) && input.length >= 2) {
    return { lat: input[0], lng: input[1] };
  }

  if (!input || typeof input !== "object") return null;

  const nestedSources = [
    input.gpsLast,
    input.last,
    input.from,
    input.to,
    input.point,
    input.coord,
    input.coords,
    input.coordinate,
    input.location,
    input.stop,
    input.vehicle,
  ];
  for (const source of nestedSources) {
    const nested = pickCoordinateCandidate(source);
    if (nested) return nested;
  }

  return input;
}

export function normalizeCoordinate(input) {
  const source = pickCoordinateCandidate(input);
  if (!source) return null;

  const lat = firstFiniteNumber(source.lat, source.latitude, source.y, source[0]);
  const lng = firstFiniteNumber(source.lng, source.lon, source.longitude, source.x, source[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function hasUsableCoordinate(input) {
  return !!normalizeCoordinate(input);
}

function normalizeReliability(input) {
  if (!input) return "unknown";
  if (typeof input === "string") {
    const text = compactText(input).toUpperCase();
    if (!text) return "unknown";
    if (/(OFFLINE|CEVRIM DISI|ÇEVRIM DIŞI|ÇEVRİMDIŞI)/.test(text)) return "offline";
    if (/(STALE|GECIK|GÜNCEL DEGIL|GUNCEL DEGIL|ESKI|LOW SIGNAL|DUSUK SINYAL|DÜŞÜK SİNYAL)/.test(text)) return "stale";
    if (/(LIVE|ACTIVE|CANLI|AKTIF|AKTİF|FRESH|OK)/.test(text)) return "fresh";
    if (/(BEKLEN|UNKNOWN|BILIN|BİLİN|NONE|NULL|N\/A|-)/.test(text)) return "unknown";
    return "unknown";
  }

  if (input?.isOffline || input?.offline) return "offline";
  if (input?.isStale || input?.stale) return "stale";
  if (input?.isFresh || input?.fresh) return "fresh";
  if (input?.status != null) return normalizeReliability(input.status);
  if (input?.reliability != null) return normalizeReliability(input.reliability);

  const rawStatus = compactText(
    input?.gpsStatus ??
    input?.gpsFreshness?.status ??
    input?.gpsState?.lastUiStatus ??
    input?.gpsState?.lastStatus ??
    input?.lastUiStatus ??
    input?.lastStatus ??
    input?.status ??
    input?.freshness ??
    input?.gpsLast?.status ??
    input?.gpsLast?.freshness ??
    "",
  );
  if (rawStatus) return normalizeReliability(rawStatus);

  const ageSec = firstFiniteNumber(
    input?.ageSec,
    input?.gpsAgeSec,
    input?.gpsLastAgeSec,
    input?.gpsFreshness?.ageSec,
  );
  if (ageSec == null) return "unknown";
  if (ageSec >= 15 * 60) return "stale";
  return "fresh";
}

function buildEtaPayload({
  ok,
  source,
  etaMinutes,
  distanceMeters,
  durationSeconds,
  reliability,
  displayMode,
  reason,
}) {
  const minutes = Number.isFinite(Number(etaMinutes)) ? Math.max(0, Math.round(Number(etaMinutes))) : null;
  const distance = Number.isFinite(Number(distanceMeters)) ? Math.max(0, Math.round(Number(distanceMeters))) : null;
  const duration = Number.isFinite(Number(durationSeconds)) ? Math.max(0, Math.round(Number(durationSeconds))) : null;

  return {
    ok: !!ok && minutes != null,
    source,
    etaMinutes: minutes,
    distanceMeters: distance,
    durationSeconds: duration,
    reliability,
    displayMode,
    reason,
  };
}

function isSuspiciousEtaMinutes(etaMinutesValue, reliability) {
  const eta = Number(etaMinutesValue);
  if (!Number.isFinite(eta)) return false;
  if (reliability !== "fresh") return true;
  return eta > SUSPICIOUS_ETA_LIMIT_MIN;
}

function timeoutMsOrDefault(timeoutMs) {
  return clampNumber(timeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
}

export async function safeOsrmRouteDuration({ from, to, requestId = "", timeoutMs } = {}) {
  const fromCoord = normalizeCoordinate(from);
  const toCoord = normalizeCoordinate(to);
  const traceTag = compactText(requestId);
  if (!fromCoord || !toCoord) {
    return buildEtaPayload({
      ok: false,
      source: "UNAVAILABLE",
      etaMinutes: null,
      distanceMeters: null,
      durationSeconds: null,
      reliability: "unknown",
      displayMode: "unavailable",
      reason: "COORDINATE_MISSING",
    });
  }

  const routed = await osrmRoute([fromCoord, toCoord], { timeoutMs: timeoutMsOrDefault(timeoutMs) });
  if (routed?.ok) {
    const etaMinutesValue = Number.isFinite(Number(routed.durationSec))
      ? Math.max(0, Math.round(Number(routed.durationSec) / 60))
      : null;
    return buildEtaPayload({
      ok: etaMinutesValue != null,
      source: "OSRM",
      etaMinutes: etaMinutesValue,
      distanceMeters: Number.isFinite(Number(routed.distanceM)) ? Number(routed.distanceM) : null,
      durationSeconds: Number.isFinite(Number(routed.durationSec)) ? Number(routed.durationSec) : null,
      reliability: "unknown",
      displayMode: etaMinutesValue != null && etaMinutesValue > SUSPICIOUS_ETA_LIMIT_MIN ? "not-current" : "exact",
      reason: "OSRM_OK",
    });
  }

  const errorText = compactText(routed?.error || routed?.detail || "");
  const reason = /missing/i.test(errorText)
    ? "OSRM_URL_MISSING"
    : /abort|timeout/i.test(errorText)
      ? "OSRM_TIMEOUT"
      : "OSRM_UNAVAILABLE";

  return buildEtaPayload({
    ok: false,
    source: "UNAVAILABLE",
    etaMinutes: null,
    distanceMeters: null,
    durationSeconds: null,
    reliability: "unknown",
    displayMode: "unavailable",
    reason: traceTag ? `${reason}:${traceTag}` : reason,
  });
}

export function getFallbackEta({ from, to, speedKmh } = {}) {
  const fromCoord = normalizeCoordinate(from);
  const toCoord = normalizeCoordinate(to);
  if (!fromCoord || !toCoord) {
    return buildEtaPayload({
      ok: false,
      source: "UNAVAILABLE",
      etaMinutes: null,
      distanceMeters: null,
      durationSeconds: null,
      reliability: "unknown",
      displayMode: "unavailable",
      reason: "COORDINATE_MISSING",
    });
  }

  const km = haversineKm(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng);
  const safeSpeed = clampNumber(speedKmh, 5, 120, DEFAULT_SPEED_KMH);
  const etaMin = Math.max(0, Math.round(etaMinutes(km, safeSpeed)));
  return buildEtaPayload({
    ok: true,
    source: "HAVERSINE_FALLBACK",
    etaMinutes: etaMin,
    distanceMeters: Math.max(0, Math.round(km * 1000)),
    durationSeconds: Math.max(0, Math.round(etaMin * 60)),
    reliability: "unknown",
    displayMode: etaMin > SUSPICIOUS_ETA_LIMIT_MIN ? "not-current" : "exact",
    reason: "HAVERSINE_FALLBACK",
  });
}

export async function getLegEta({ from, to, gpsFreshness, speedKmh, requestId = "", timeoutMs } = {}) {
  const reliability = normalizeReliability(gpsFreshness);
  const fromCoord = normalizeCoordinate(from);
  const toCoord = normalizeCoordinate(to);
  if (!fromCoord || !toCoord) {
    return buildEtaPayload({
      ok: false,
      source: "UNAVAILABLE",
      etaMinutes: null,
      distanceMeters: null,
      durationSeconds: null,
      reliability,
      displayMode: "unavailable",
      reason: "COORDINATE_MISSING",
    });
  }

  const fallback = getFallbackEta({ from: fromCoord, to: toCoord, speedKmh });
  if (reliability !== "fresh") {
    return {
      ...fallback,
      reliability,
      displayMode: fallback.ok ? "not-current" : "unavailable",
      source: fallback.ok ? "HAVERSINE_FALLBACK" : "UNAVAILABLE",
      reason: `GPS_${String(reliability || "UNKNOWN").toUpperCase()}`,
    };
  }

  const osrm = await safeOsrmRouteDuration({ from: fromCoord, to: toCoord, requestId, timeoutMs });
  if (osrm.ok && osrm.etaMinutes != null) {
    const displayMode = isSuspiciousEtaMinutes(osrm.etaMinutes, reliability) ? "not-current" : "exact";
    return {
      ...osrm,
      reliability,
      displayMode,
      reason: displayMode === "exact" ? "OSRM_OK" : "ETA_SUSPICIOUS",
    };
  }

  if (!fallback.ok) {
    return {
      ...fallback,
      reliability,
      source: "UNAVAILABLE",
      displayMode: "unavailable",
      reason: osrm.reason || fallback.reason || "UNAVAILABLE",
    };
  }

  const displayMode = isSuspiciousEtaMinutes(fallback.etaMinutes, reliability) ? "not-current" : "exact";
  return {
    ...fallback,
    reliability,
    source: "HAVERSINE_FALLBACK",
    displayMode,
    reason: osrm.reason || "HAVERSINE_FALLBACK",
  };
}

export async function getNextStopEta({ vehicle, nextStop, gpsFreshness, requestId = "", timeoutMs } = {}) {
  const from = vehicle?.gpsLast ?? vehicle?.last ?? vehicle;
  const to = nextStop ?? null;
  const speedKmh = firstFiniteNumber(
    vehicle?.gpsLast?.speed,
    vehicle?.speedKmh,
    vehicle?.speedLimitKmh,
    vehicle?.speed,
    gpsFreshness?.speedKmh,
    DEFAULT_SPEED_KMH,
  ) ?? DEFAULT_SPEED_KMH;

  return getLegEta({
    from,
    to,
    gpsFreshness,
    speedKmh,
    requestId,
    timeoutMs,
  });
}
