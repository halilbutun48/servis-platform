// backend/src/services/osrmRoute.js
// ✅ M33.4: OSRM route client (optional)
// Purpose: turn a list of (lat,lng) into a dense polyline using OSRM /route.
// Env:
// - OSRM_URL: e.g. http://osrm:5000 (no trailing slash)

import { ENV } from "../env.js";

export async function osrmRoute(points, { profile = "driving", timeoutMs = 12000 } = {}) {
  const base = String(ENV.OSRM_URL || "").trim().replace(/\/+$/g, "");
  if (!base) return { ok: false, error: "OSRM_URL missing" };

  const inPts = (points || [])
    .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));

  if (inPts.length < 2) return { ok: false, error: "notEnoughPoints" };

  const coords = inPts
    .map((p) => `${Number(p.lng).toFixed(5)},${Number(p.lat).toFixed(5)}`)
    .join(";");

  const url = `${base}/route/v1/${encodeURIComponent(profile)}/${coords}?geometries=geojson&overview=full&steps=false`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, { method: "GET", signal: ctrl.signal });
    const text = await r.text();
    if (!r.ok) return { ok: false, error: `osrm:${r.status}`, detail: text.slice(0, 200) };

    const json = text ? JSON.parse(text) : null;
    const route = json?.routes?.[0] || null;
    const coordsOut = route?.geometry?.coordinates;
    if (!Array.isArray(coordsOut) || coordsOut.length < 2) return { ok: false, error: "osrm:noGeometry" };

    const outPts = coordsOut
      .map((c) => ({ lng: Number(c?.[0]), lat: Number(c?.[1]) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({ lat: p.lat, lng: p.lng }));

    return {
      ok: true,
      points: outPts,
      profile,
      distanceM: Number.isFinite(Number(route?.distance)) ? Number(route.distance) : null,
      durationSec: Number.isFinite(Number(route?.duration)) ? Number(route.duration) : null,
    };
  } catch (e) {
    return { ok: false, error: "osrm:fetchFailed", detail: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}
