// backend/src/services/osrmTable.js
// ✅ M33.1: OSRM table client (duration + distance matrix)
// Optional: requires ENV.OSRM_URL
//
// Env:
// - OSRM_URL: e.g. http://osrm:5000 (no trailing slash)

import { ENV } from "../env.js";

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function osrmTable(points, { profile = "driving", timeoutMs = 12000 } = {}) {
  const base = String(ENV.OSRM_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  if (!base) return { ok: false, error: "OSRM_URL missing" };

  const pts = (points || [])
    .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
    .map((p) => ({
      id: p.id ?? null,
      lat: Number(p.lat),
      lng: Number(p.lng),
    }));

  if (pts.length < 2) return { ok: false, error: "notEnoughPoints" };

  // OSRM table has practical limits; keep Stage-1 safe.
  if (pts.length > 80) return { ok: false, error: "tooManyPoints", limit: 80 };

  const coords = pts.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  const url = `${base}/table/v1/${encodeURIComponent(profile)}/${coords}?annotations=duration,distance`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, { method: "GET", signal: ctrl.signal });
    const text = await r.text();
    if (!r.ok) return { ok: false, error: `osrm:${r.status}`, detail: text.slice(0, 200) };

    const json = text ? JSON.parse(text) : null;
    const durations = json?.durations;
    const distances = json?.distances;

    if (!Array.isArray(durations) || !Array.isArray(distances)) {
      return { ok: false, error: "osrm:invalidPayload" };
    }

    // sanitize matrices (OSRM uses null for unreachable)
    const dur = durations.map((row) =>
      Array.isArray(row) ? row.map((v) => (v == null ? null : num(v))) : []
    );
    const dist = distances.map((row) =>
      Array.isArray(row) ? row.map((v) => (v == null ? null : num(v))) : []
    );

    return { ok: true, points: pts, durationsSec: dur, distancesM: dist };
  } catch (e) {
    return { ok: false, error: "osrm:fetchFailed", detail: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}
