// backend/scripts/m24check.js
// M24CHECK: Shift marketplace offers (multi-room) + accept cancels others

import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

function isoPlusMin(min) {
  return new Date(Date.now() + min * 60_000).toISOString();
}

// Avoid overlap with agreements created in earlier checks (M17) by scheduling this check on tomorrow.
function isoTomorrowAt(h, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
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
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: {
      fullName: `M24 Driver ${rand(4)}`,
      phone: "5550000000",
      deviceInfo: "m24-test",
      email,
      password: pass,
    },
  });
  mustOk(r, "driver create");
  assertOk(!!r.json?.id, "driver id");
  return Number(r.json.id);
}

async function createVehicle(roomToken, plate) {
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, type: "MINIBUS" },
  });
  mustOk(r, "vehicle create");
  assertOk(!!r.json?.id, "vehicle id");
  return Number(r.json.id);
}

async function main() {
  banner("M24CHECK: Marketplace offers (multi-room) + accept cancels others");

  const superToken = await loginFirst("super");
  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");

  // room1Id
  step("resolve roomId via /api/me (ROOM)");
  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "me (room)");
  assertOk(!!meRoom.json?.roomId, "roomId present");
  const room1Id = Number(meRoom.json.roomId);

  // create room2
  step("create room2 (SUPER_ADMIN)");
  const room2 = await reqJson("POST", "/api/rooms", {
    token: superToken,
    body: { name: "M24 Room 2" },
  });
  mustOk(room2, "room2 create");
  const room2Id = Number(room2.json.id);

  // create MARKET shift (roomId omitted)
  step("company creates market shift (no roomId)");
  const shift = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: {
      startAt: isoTomorrowAt(14, 0),
      endAt: isoTomorrowAt(17, 0),
      status: "REQUESTED",
    },
  });
  mustOk(shift, "market shift created");
  const shiftId = Number(shift.json.id);
  assertOk(shift.json.roomId == null, "market shift roomId null");

  // create offers to room1 and room2
  step("company sends offers to room1+room2");
  const offersCreate = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M24 teklif" },
  });
  mustOk(offersCreate, "offers created");
  assertOk(Array.isArray(offersCreate.json?.items), "offers items[]");

  // room1 inbox should contain offer
  step("room inbox includes offer (room1)");
  const inbox1 = await reqJson("GET", "/api/offers/inbox", { token: roomToken });
  mustOk(inbox1, "inbox list");
  assertOk(Array.isArray(inbox1.json?.items), "inbox items[]");
  const offer1 = (inbox1.json.items || []).find((o) => Number(o.shiftId) === shiftId);
  assertOk(!!offer1?.id, "room1 offer found");
  const offer1Id = Number(offer1.id);

  // room1 counter
  step("room1 counter offer");
  const counter = await reqJson("PUT", `/api/offers/${offer1Id}/counter`, {
    token: roomToken,
    body: { amountRoom: 22000, noteRoom: "counter" },
  });
  mustOk(counter, "counter ok");

  // company list offers
  step("company lists offers for shift");
  const list1 = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
  mustOk(list1, "company offers list");
  assertOk(Array.isArray(list1.json?.items), "company offers items[]");
  const byRoom = new Map((list1.json.items || []).map((o) => [Number(o.roomId), o]));
  assertOk(byRoom.has(room1Id) && byRoom.has(room2Id), "both room offers exist");
  assertOk(String(byRoom.get(room1Id).status) === "COUNTERED", "room1 is COUNTERED");
  assertOk(String(byRoom.get(room2Id).status) === "OPEN", "room2 is OPEN");

  // company accept room1 offer
  step("company accepts room1 offer -> cancels others + binds shift.roomId");
  const accept = await reqJson("PUT", `/api/offers/${offer1Id}/accept`, { token: companyToken, body: {} });
  mustOk(accept, "accept ok");
  assertOk(accept.json?.ok === true, "accept json ok");
  assertOk(Number(accept.json?.shift?.roomId) === room1Id, "shift bound to room1");

  // verify other cancelled
  step("verify offer statuses after accept");
  const list2 = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
  mustOk(list2, "offers list after accept");
  const byRoom2 = new Map((list2.json.items || []).map((o) => [Number(o.roomId), o]));
  assertOk(String(byRoom2.get(room1Id).status) === "ACCEPTED", "room1 ACCEPTED");
  assertOk(String(byRoom2.get(room2Id).status) === "CANCELLED", "room2 CANCELLED");

  // ✅ create isolated vehicle+driver to avoid conflict with other checks
  step("create isolated vehicle+driver for approve (avoid conflicts)");
  const pass = "demo1234";
  const driverId = await createDriver(roomToken, `m24d_${rand(6).toLowerCase()}@demo.com`, pass);
  const vehicleId = await createVehicle(roomToken, `M24-${rand(6)}`);
  assertOk(vehicleId > 0 && driverId > 0, "isolated ids ok");

  // room approves shift now
  step("room approves accepted shift (vehicle+driver)");
  const approve = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  mustOk(approve, "approve ok");

  console.log("✅ M24CHECK PASS");
}

main().catch((e) => {
  console.error("❌ M24CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});