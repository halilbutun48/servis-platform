// backend/scripts/m19check.js
import { login, reqJson, banner, step, assertOk } from "./_harness.js";

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
}
function mustOk(r, label) {
  if (r?.ok) return;
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 600);
  throw new Error(`ASSERT_FAIL: ${label} (status=${st})\n${txt}`);
}
function nearEq(a, b, eps = 1e-6) {
  return Math.abs(Number(a) - Number(b)) <= eps;
}
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = (Number(bLat) - Number(aLat)) * Math.PI / 180;
  const dLng = (Number(bLng) - Number(aLng)) * Math.PI / 180;
  const lat1 = Number(aLat) * Math.PI / 180;
  const lat2 = Number(bLat) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function minDistanceKmToHub(points, hubLat, hubLng) {
  const pts = Array.isArray(points) ? points : [];
  if (!pts.length) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const p of pts) {
    if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) continue;
    const km = haversineKm(hubLat, hubLng, Number(p.lat), Number(p.lng));
    if (km < best) best = km;
  }
  return best;
}

async function main() {
  banner("M19CHECK: Hub + Direction/Pattern + Route Preview summary/path");

  const companyToken = await login("company@demo.com");
  const roomToken = await login("room@demo.com");

  step("resolve roomId via /api/me (ROOM)");
  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "/api/me (ROOM)");
  const roomId = Number(meRoom.json?.roomId || 0);
  assertOk(!!roomId, "roomId present");

  step("create shift (COMPANY) with hub + direction/pattern");
  const now = new Date();
  const startAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const hubLat = 37.0001;
  const hubLng = 29.0001;

  const sh = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: {
      roomId,
      startAt,
      endAt,
      direction: "OUTBOUND",
      pattern: "LOOP",
      hubLat,
      hubLng,
    },
  });
  mustOk(sh, "shift create");
  const shiftId = Number(sh.json?.id || 0);
  assertOk(!!shiftId, "shiftId present");

  step("add 2 stops (COMPANY)");
  const s1 = await reqJson("POST", `/api/shifts/${shiftId}/stops`, {
    token: companyToken,
    body: { name: `S1-${rand(4)}`, lat: 37.0101, lng: 29.0101, order: 1, type: "MANUAL" },
  });
  mustOk(s1, "add stop1");
  const s2 = await reqJson("POST", `/api/shifts/${shiftId}/stops`, {
    token: companyToken,
    body: { name: `S2-${rand(4)}`, lat: 37.0201, lng: 29.0201, order: 2, type: "MANUAL" },
  });
  mustOk(s2, "add stop2");

  step("route-preview should return summary + path points");
  const pv = await reqJson("GET", `/api/shifts/${shiftId}/route-preview`, { token: companyToken });
  mustOk(pv, "route-preview ok");

  const summary = pv.json?.summary;
  const path = pv.json?.path;

  assertOk(!!summary, "summary present");
  assertOk(!!path, "path present");
  assertOk(Array.isArray(path.points), "path.points array");
  assertOk((summary.stopCount ?? 0) === 2, "stopCount=2");
  assertOk(String(summary.direction) === "OUTBOUND", "direction OUTBOUND");
  assertOk(String(summary.pattern) === "LOOP", "pattern LOOP");
  assertOk(String(summary.startLabel || "") === "HUB", "summary startLabel HUB");
  assertOk(String(summary.endLabel || "") === "HUB", "summary endLabel HUB");

  const pts = path.points;
  assertOk(pts.length >= 4, "loop path has >= 4 points");

  const source = String(path.source || "ESTIMATED").toUpperCase();
  if (source === "ESTIMATED") {
    const first = pts[0];
    const last = pts[pts.length - 1];
    assertOk(nearEq(first.lat, hubLat, 1e-3) && nearEq(first.lng, hubLng, 1e-3), "estimated path starts near hub");
    assertOk(nearEq(last.lat, hubLat, 1e-3) && nearEq(last.lng, hubLng, 1e-3), "estimated path ends near hub");
  } else {
    const windowSize = Math.min(25, Math.max(4, Math.ceil(pts.length * 0.2)));
    const firstWindow = pts.slice(0, windowSize);
    const lastWindow = pts.slice(Math.max(0, pts.length - windowSize));
    const firstMinKm = minDistanceKmToHub(firstWindow, hubLat, hubLng);
    const lastMinKm = minDistanceKmToHub(lastWindow, hubLat, hubLng);
    assertOk(Number.isFinite(firstMinKm), `${source} path first window finite`);
    assertOk(Number.isFinite(lastMinKm), `${source} path last window finite`);
    // OSRM / learned routes may snap to the road network and not include the exact hub coordinate.
    // We keep a broader corridor check instead of exact point equality.
    assertOk(firstMinKm <= 5, `${source} path starts within broader hub corridor`);
    assertOk(lastMinKm <= 5, `${source} path ends within broader hub corridor`);
  }

  assertOk(Number(summary.distanceKmEstimated || 0) >= 0, "distanceKmEstimated numeric");
  assertOk(Number(summary.durationMinEstimated || 0) >= 0, "durationMinEstimated numeric");

  banner("M19CHECK PASS");
}

main().catch((e) => {
  console.error("M19CHECK FAIL:", e?.message || e);
  process.exit(1);
});
