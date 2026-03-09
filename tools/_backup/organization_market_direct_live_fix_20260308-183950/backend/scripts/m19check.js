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

  // LOOP should start/end at hub (approx)
  const pts = path.points;
  assertOk(pts.length >= 4, "loop points length >= 4 (hub + 2 stops + hub)");
  const first = pts[0];
  const last = pts[pts.length - 1];
  assertOk(nearEq(first.lat, hubLat, 1e-3) && nearEq(first.lng, hubLng, 1e-3), "start near hub");
  assertOk(nearEq(last.lat, hubLat, 1e-3) && nearEq(last.lng, hubLng, 1e-3), "end near hub");

  assertOk(Number(summary.distanceKmEstimated || 0) >= 0, "distanceKmEstimated numeric");
  assertOk(Number(summary.durationMinEstimated || 0) >= 0, "durationMinEstimated numeric");

  banner("M19CHECK PASS");
}

main().catch((e) => {
  console.error("M19CHECK FAIL:", e?.message || e);
  process.exit(1);
});
