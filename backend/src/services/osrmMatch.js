// backend/src/services/osrmMatch.js
// ✅ M19: OSRM map-matching client (optional)
// ✅ Robust distanceKm: OSRM distance -> geometry haversine -> input haversine fallback
//
// Env:
// - OSRM_URL: e.g. http://osrm:5000 (no trailing slash)

import { ENV } from "../env.js";

function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function polylineDistanceKm(points) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) sum += haversineKm(pts[i], pts[i + 1]);
  return sum;
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function sumLegs(legs, key) {
  if (!Array.isArray(legs)) return 0;
  let s = 0;
  for (const l of legs) {
    const v = num(l?.[key]);
    if (v) s += v;
  }
  return s;
}

export async function osrmMatch(points) {
  const base = String(ENV.OSRM_URL || "").trim().replace(/\/+$/g, "");
  if (!base) return { ok: false, error: "OSRM_URL missing" };

  // input points (for fallback distance)
  const inPts = (points || [])
    .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));

  const coords = inPts
    .map((p) => `${Number(p.lng).toFixed(5)},${Number(p.lat).toFixed(5)}`)
    .join(";");

  if (!coords || coords.split(";").length < 2) return { ok: false, error: "notEnoughPoints" };

  // gaps/tidy -> daha stabil
  const url = `${base}/match/v1/driving/${coords}?geometries=geojson&overview=full&gaps=ignore&tidy=true`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);

  try {
    const r = await fetch(url, { method: "GET", signal: ctrl.signal });
    const text = await r.text();
    if (!r.ok) return { ok: false, error: `osrm:${r.status}`, detail: text.slice(0, 200) };

    const json = text ? JSON.parse(text) : null;
    const m = json?.matchings?.[0];

    const coordsOut = m?.geometry?.coordinates;
    if (!Array.isArray(coordsOut) || coordsOut.length < 2) return { ok: false, error: "osrm:noGeometry" };

    const outPts = coordsOut
      .map((c) => ({ lng: Number(c[0]), lat: Number(c[1]) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({ lat: p.lat, lng: p.lng }));

    // 1) OSRM distance/duration (varsa)
    const distM = num(m?.distance) ?? sumLegs(m?.legs, "distance");
    const durS = num(m?.duration) ?? sumLegs(m?.legs, "duration");

    let distanceKm = distM ? distM / 1000 : 0;
    let durationMin = durS ? Math.round(durS / 60) : 0;

    // 2) matched geometry’den haversine
    if (!distanceKm || distanceKm <= 0) distanceKm = polylineDistanceKm(outPts);

    // 3) input GPS’den haversine (geometry çökmüşse)
    if (!distanceKm || distanceKm <= 0) distanceKm = polylineDistanceKm(inPts);

    if (!durationMin || durationMin <= 0) durationMin = Math.max(1, Math.round((distanceKm / 30) * 60));

    let confidence = num(m?.confidence);
    if (confidence === null) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));

    return { ok: true, points: outPts.length ? outPts : inPts, distanceKm, durationMin, confidence };
  } catch (e) {
    return { ok: false, error: "osrm:fetchFailed", detail: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}
