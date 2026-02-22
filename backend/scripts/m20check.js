// backend/scripts/m20check.js
// M20CHECK: Availability bulk endpoint (single request for many vehicles)

import { login, reqJson, banner, step, assertOk, sleep } from "./_harness.js";

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
}

function ymdUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function mustOk(r, label) {
  if (r?.ok) {
    console.log(`✅ ${label}`);
    return;
  }
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 800);
  console.error(`❌ ${label} (status=${st})\n${txt}`);
  throw new Error(`ASSERT_FAIL: ${label}`);
}

async function createDriver(roomToken, email, pass) {
  const c = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: {
      fullName: `M20 Driver ${rand(4)}`,
      phone: "5550000000",
      deviceInfo: "m20-test",
      email,
      password: pass,
    },
  });
  mustOk(c, "driver create");
  assertOk(!!c.json?.id, "driver id");
  return Number(c.json.id);
}

async function createVehicle(roomToken, plate) {
  const c = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, type: "MINIBUS" },
  });
  mustOk(c, "vehicle create");
  assertOk(!!c.json?.id, "vehicle id");
  return Number(c.json.id);
}

async function bind(roomToken, vehicleId, driverId) {
  const r = await reqJson("PUT", `/api/vehicles/${vehicleId}/bind-driver`, {
    token: roomToken,
    body: { driverId },
  });
  mustOk(r, "bind-driver");
}

async function createShift(companyToken, roomId, startAt, endAt) {
  const r = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { roomId, startAt, endAt },
  });
  mustOk(r, "shift create");
  const id = r.json?.id;
  assertOk(!!id, "shiftId present");
  return Number(id);
}

async function approveShift(roomToken, shiftId, vehicleId, driverId) {
  const r = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  mustOk(r, "shift approve");
}

async function createAgreement(companyToken, body) {
  const r = await reqJson("POST", "/api/agreements", { token: companyToken, body });
  mustOk(r, "agreement create");
  assertOk(!!r.json?.id, "agreementId present");
  return Number(r.json.id);
}

async function approveAgreement(roomToken, id, { vehicleId, driverId }) {
  const r = await reqJson("PUT", `/api/agreements/${id}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  mustOk(r, "agreement approve");
}

async function callBulk(roomToken, { startAt, endAt, vehicleIds }) {
  const r = await reqJson("POST", "/api/availability/bulk", {
    token: roomToken,
    body: { startAt, endAt, vehicleIds },
  });
  mustOk(r, "availability bulk");
  assertOk(Array.isArray(r.json?.items), "bulk items[]");
  return r.json.items;
}

async function main() {
  banner("M20CHECK: Availability bulk endpoint");

  const companyToken = await login("company@demo.com");
  const roomToken = await login("room@demo.com");

  step("resolve roomId via /api/me (ROOM)");
  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "/api/me (ROOM)");
  const roomId = Number(meRoom.json?.roomId || 0);
  assertOk(!!roomId, "roomId present");

  step("create 2 isolated vehicle+driver pairs (no conflicts)");
  const pass = "demo1234";
  const d1 = await createDriver(roomToken, `m20d1_${rand(6)}@demo.com`, pass);
  const v1 = await createVehicle(roomToken, `M20-A-${rand(6)}`);
  await bind(roomToken, v1, d1);

  const d2 = await createDriver(roomToken, `m20d2_${rand(6)}@demo.com`, pass);
  const v2 = await createVehicle(roomToken, `M20-B-${rand(6)}`);
  await bind(roomToken, v2, d2);

  // blocker shift on v1/d1
  const now = Date.now();
  const start1 = new Date(now + 10 * 60 * 1000).toISOString();
  const end1 = new Date(now + 70 * 60 * 1000).toISOString();

  // query window overlaps blocker
  const qStart = new Date(now + 20 * 60 * 1000).toISOString();
  const qEnd = new Date(now + 50 * 60 * 1000).toISOString();

  step("create+approve blocker shift (v1/d1)");
  const shId = await createShift(companyToken, roomId, start1, end1);
  await approveShift(roomToken, shId, v1, d1);

  step("bulk should report shift conflict for v1 and ok for v2");
  const items1 = await callBulk(roomToken, { startAt: qStart, endAt: qEnd, vehicleIds: [v1, v2] });
  const byVeh1 = new Map(items1.map((x) => [Number(x.vehicleId), x]));
  const a = byVeh1.get(v1);
  const b = byVeh1.get(v2);
  assertOk(!!a && !!b, "both vehicles present");
  assertOk(a.vehicleOk === false, "v1 vehicleOk=false");
  assertOk(String(a.vehicleConflict?.code || "").includes("VEHICLE"), "v1 conflict code vehicle");
  assertOk(b.vehicleOk === true, "v2 vehicleOk=true");
  assertOk(b.driverOk === true, "v2 driverOk=true");

  // Agreement-first test: create agreement on v2/d2 in the same query window
  step("create+approve agreement on v2/d2 covering query window (agreement-first)");
  const s = new Date(qStart);
  const e = new Date(qEnd);
  const startDate = ymdUTC(s);
  const endDate = ymdUTC(s);
  const startMin = s.getUTCHours() * 60 + s.getUTCMinutes();
  const endMin = e.getUTCHours() * 60 + e.getUTCMinutes();
  assertOk(endMin > startMin, "endMin > startMin");

  const agId = await createAgreement(companyToken, {
    roomId,
    startDate,
    endDate,
    weekMask: 127,
    startMin,
    endMin,
    // routing meta (M19)
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    hubLat: 41.0,
    hubLng: 29.0,
  });
  await approveAgreement(roomToken, agId, { vehicleId: v2, driverId: d2 });

  // wait a tick for DB consistency (gate stability)
  await sleep(300);

  step("bulk should now report AGREEMENT conflict for v2 (agreement-first)");
  const items2 = await callBulk(roomToken, { startAt: qStart, endAt: qEnd, vehicleIds: [v2] });
  const row2 = items2.find((x) => Number(x.vehicleId) === v2);
  assertOk(!!row2, "v2 row present");
  assertOk(row2.vehicleOk === false || row2.driverOk === false, "v2 has conflict");
  const code2 = String(row2.vehicleConflict?.code || row2.driverConflict?.code || "");
  assertOk(code2.startsWith("AGREEMENT_"), "agreement conflict code");

  banner("M20CHECK PASS");
}

main().catch((e) => {
  console.error("M20CHECK FAIL:", e?.message || e);
  process.exit(1);
});
