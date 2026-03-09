// backend/src/services/routeLearning.js
// ✅ M19: directional hub routing + learned route helpers

import { haversineKm } from "../geo.js";

function round5(n) {
  return Number.isFinite(n) ? Number(n.toFixed(5)) : null;
}
function gridKeyLatLng(lat, lng) {
  const a = round5(lat);
  const b = round5(lng);
  if (a == null || b == null) return null;
  return `${a},${b}`;
}

export function computeRouteKey({ direction, pattern, hub, stops }) {
  const dir = String(direction || "INBOUND").toUpperCase();
  const pat = String(pattern || "ONE_WAY").toUpperCase();

  const hubKey = hub && typeof hub.lat === "number" && typeof hub.lng === "number"
    ? gridKeyLatLng(hub.lat, hub.lng)
    : "_";

  const stopKeys = (stops || [])
    .map((s) => {
      const lat = typeof s.lat === "number" ? s.lat : null;
      const lng = typeof s.lng === "number" ? s.lng : null;
      return gridKeyLatLng(lat, lng);
    })
    .filter(Boolean);

  return `${dir}|${pat}|H:${hubKey}|S:${stopKeys.join("|")}`;
}

export function stringifyPolyline(points) {
  try {
    const clean = (points || [])
      .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
    return JSON.stringify(clean);
  } catch {
    return "[]";
  }
}

export function parsePolyline(str) {
  try {
    const arr = JSON.parse(String(str || "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
  } catch {
    return [];
  }
}

export function sumDistanceKm(points) {
  const pts = (points || []).filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number");
  let km = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    km += haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
  }
  return km;
}

export function downsamplePoints(points, { maxPoints = 100, minDistM = 15, minDtMs = 5000 } = {}) {
  const pts = (points || []).filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number" && p.at);
  if (pts.length <= maxPoints) return pts;

  const out = [];
  let last = null;
  for (const p of pts) {
    if (!last) {
      out.push(p);
      last = p;
      continue;
    }
    const dt = new Date(p.at).getTime() - new Date(last.at).getTime();
    const dKm = haversineKm(last.lat, last.lng, p.lat, p.lng);
    const dM = dKm * 1000;

    if (dM >= minDistM || dt >= minDtMs) {
      out.push(p);
      last = p;
    }
    if (out.length >= maxPoints) break;
  }

  // Ensure last point present
  const lastIn = pts[pts.length - 1];
  const lastOut = out[out.length - 1];
  if (lastIn && lastOut && (lastIn.lat !== lastOut.lat || lastIn.lng !== lastOut.lng)) {
    out[out.length - 1] = lastIn;
  }

  return out;
}

export function median(nums) {
  const arr = (nums || []).filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) return arr[mid];
  return (arr[mid - 1] + arr[mid]) / 2;
}

export function pickCanonicalSample(samples) {
  // Pick the sample closest to median distance (qualityScore prioritized)
  const list = (samples || []).slice();
  if (!list.length) return null;

  const med = median(list.map((s) => s.distanceKm));
  const target = med == null ? null : Number(med);

  // Score: quality first, then closeness to median
  let best = null;
  let bestScore = -Infinity;

  for (const s of list) {
    const q = Number(s.qualityScore || 0);
    const dist = Number(s.distanceKm || 0);
    const closeness = target == null ? 0 : -Math.abs(dist - target); // closer is better (less negative)
    const score = q * 10 + closeness; // weight quality
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  return best;
}
