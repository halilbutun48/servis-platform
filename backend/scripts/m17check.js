// backend/scripts/m17check.js
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

async function createVehicle(roomToken, plate) {
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, speedLimitKmh: 90 },
  });
  mustOk(r, `vehicle create (${plate})`);
  assertOk(!!r.json?.id, "vehicleId present");
  return Number(r.json.id);
}

async function createDriver(roomToken, fullName) {
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName, phone: "0000000000", deviceInfo: "m17-check" },
  });
  mustOk(r, `driver create (${fullName})`);
  assertOk(!!r.json?.id, "driverId present");
  return Number(r.json.id);
}

async function createAgreement(companyToken, body) {
  const r = await reqJson("POST", "/api/agreements", { token: companyToken, body });
  mustOk(r, "agreement create");
  assertOk(!!r.json?.id, "agreementId present");
  return Number(r.json.id);
}

async function approveAgreement(roomToken, id, body) {
  const r = await reqJson("PUT", `/api/agreements/${id}/approve`, { token: roomToken, body });
  return r;
}

async function getAgreement(anyToken, id) {
  const r = await reqJson("GET", `/api/agreements/${id}`, { token: anyToken });
  mustOk(r, "agreement get");
  return r.json;
}

async function main() {
  banner("M17CHECK: Agreements (request/approve/conflict/monitor)");

  // IMPORTANT: login() token string döner
  const roomToken = await login("room@demo.com");
  const companyToken = await login("company@demo.com");

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "/api/me (ROOM)");
  const roomId = Number(meRoom.json?.roomId || 0);
  assertOk(!!roomId, "roomId present");

  const vId = await createVehicle(roomToken, `M17-${rand(6)}`);
  const dId = await createDriver(roomToken, `M17 Driver ${rand(4)}`);

  const today = new Date();
  const startDate = ymdUTC(today);
  const endDate = ymdUTC(new Date(today.getTime() + 7 * 86400_000));

  step("create agreement A (08:00-10:00)");
  const a1id = await createAgreement(companyToken, {
    roomId,
    startDate,
    endDate,
    weekMask: 127,
    startMin: 8 * 60,
    endMin: 10 * 60,
    companyOfferAmount: 1000,
    companyOfferNote: "A",
  });

  step("approve agreement A (room assigns vehicle+driver)");
  const a1ap = await approveAgreement(roomToken, a1id, { vehicleId: vId, driverId: dId });
  mustOk(a1ap, "approve A ok");

  step("create agreement B same window (should conflict on approve)");
  const a2id = await createAgreement(companyToken, {
    roomId,
    startDate,
    endDate,
    weekMask: 127,
    startMin: 8 * 60,
    endMin: 10 * 60,
    companyOfferNote: "B",
  });

  const a2ap = await approveAgreement(roomToken, a2id, { vehicleId: vId, driverId: dId });
  // Expect 409
  assertOk(a2ap.status === 409, "approve B conflict 409");
  assertOk(
    a2ap.json?.code === "AGREEMENT_VEHICLE_CONFLICT" || a2ap.json?.code === "AGREEMENT_DRIVER_CONFLICT",
    "approve B conflict code"
  );

  step("create agreement C different time (10:00-12:00) should pass");
  const a3id = await createAgreement(companyToken, {
    roomId,
    startDate,
    endDate,
    weekMask: 127,
    startMin: 10 * 60,
    endMin: 12 * 60,
    companyOfferNote: "C",
  });
  const a3ap = await approveAgreement(roomToken, a3id, { vehicleId: vId, driverId: dId });
  mustOk(a3ap, "approve C ok");

  step("availability must see agreement reservation (vehicle conflict at 09:00-09:30)");
  const qStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 9, 0, 0)).toISOString();
  const qEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 9, 30, 0)).toISOString();

  const av = await reqJson(
    "GET",
    `/api/availability?vehicleId=${vId}&startAt=${encodeURIComponent(qStart)}&endAt=${encodeURIComponent(qEnd)}`,
    { token: roomToken }
  );

  assertOk(av.status === 409, "availability 409 due to agreement");
  assertOk(
    av.json?.code === "AGREEMENT_VEHICLE_CONFLICT" || av.json?.code === "AGREEMENT_DRIVER_CONFLICT",
    "availability conflict code"
  );

  step("monitor DONE: create past agreement and wait tick");
  const pastEnd = ymdUTC(new Date(today.getTime() - 1 * 86400_000));
  const pastStart = ymdUTC(new Date(today.getTime() - 2 * 86400_000));

  const a4id = await createAgreement(companyToken, {
    roomId,
    startDate: pastStart,
    endDate: pastEnd,
    weekMask: 127,
    startMin: 0,
    endMin: 1,
    companyOfferNote: "PAST",
  });

  const a4ap = await approveAgreement(roomToken, a4id, { vehicleId: vId, driverId: dId });
  mustOk(a4ap, "approve PAST ok");

  // agreementMonitor default ~5s => bir tık fazla bekle
  await sleep(6500);

  const a4 = await getAgreement(roomToken, a4id);
  assertOk(a4.status === "DONE", "agreement auto DONE");

  banner("M17CHECK PASS");
}

main().catch((e) => {
  console.error("M17CHECK FAIL:", e?.message || e);
  process.exit(1);
});