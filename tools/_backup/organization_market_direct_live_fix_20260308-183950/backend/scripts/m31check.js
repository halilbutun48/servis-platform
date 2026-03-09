// backend/scripts/m31check.js
// M31CHECK: Room approve+start + driver reached + usage docs presence

import {
  banner,
  step,
  ok,
  must,
  assertOk,
  reqJson,
  loginFirst,
  getRoomCompanyIds,
} from "./_harness.js";

function addMinutesIso(baseIso, minutes) {
  const d = new Date(baseIso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function itemsFrom(resp) {
  const j = resp?.json;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j)) return j;
  return [];
}

async function waitShiftOffers(companyToken, shiftId, { min = 2, tries = 12, delayMs = 250 } = {}) {
  for (let i = 0; i < tries; i++) {
    const r = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
    if (r?.ok) {
      const items = itemsFrom(r);
      if (items.length >= min) return { ok: true, items, resp: r };
    }
    await sleep(delayMs);
  }
  const last = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
  return { ok: false, items: itemsFrom(last), resp: last };
}

async function main() {
  banner("M31CHECK: Approve+Start + Driver reached");

  const superToken = await loginFirst("SUPER_ADMIN");
  const roomToken = await loginFirst("ROOM");
  const companyToken = await loginFirst("COMPANY");

  const { roomId: room1Id } = await getRoomCompanyIds(roomToken, companyToken);

  step("create room2 (SUPER_ADMIN)");
  const r2 = await reqJson("POST", "/api/rooms", { token: superToken, body: { name: "M31 Room2" } });
  assertOk(r2.ok, "room2 create");
  const room2Id = Number(r2.json?.id || r2.json?.room?.id || 0);
  must("room2Id present", room2Id > 0);

  step("room creates driver with login (for driver panel)");
  const email = `m31_driver_${Math.random().toString(16).slice(2, 8)}@demo.com`;
  const password = "demo1234";

  const d1 = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: {
      fullName: "M31 Driver",
      phone: "5550003311",
      deviceInfo: "m31",
      email,
      password,
    },
  });
  assertOk(d1.ok, "driver create");
  const driverId = Number(d1.json?.id || 0);
  must("driverId present", driverId > 0);

  step("driver login");
  const dLogin = await reqJson("POST", "/api/auth/login", {
    body: { email, password },
  });
  assertOk(dLogin.ok, "driver login ok");
  const driverToken = String(dLogin.json?.token || "");
  must("driverToken present", driverToken.length > 20);

  step("room creates vehicle");
  const v1 = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate: `M31-${Math.random().toString(16).slice(2, 8).toUpperCase()}`, capacity: 16 },
  });
  assertOk(v1.ok, "vehicle create");
  const vehicleId = Number(v1.json?.id || 0);
  must("vehicleId present", vehicleId > 0);

  step("company creates market shift (REQUESTED) and sends offers to room1+room2");
  const base = new Date().toISOString();
  const startAt = addMinutesIso(base, 60);
  const endAt = addMinutesIso(base, 120);

  const sh = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { startAt, endAt, status: "REQUESTED" },
  });
  assertOk(sh.ok, "market shift created");
  const shiftId = Number(sh.json?.id || 0);
  must("shiftId present", shiftId > 0);
  ok("market shift roomId null", sh.json?.roomId == null);

  const offCreate = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M31" },
  });
  assertOk(offCreate.ok, "offers created");

  step("company lists offers for shift and accepts room1");
  const waited = await waitShiftOffers(companyToken, shiftId, { min: 2 });
  assertOk(waited.ok, "offers list ok (after wait)");
  const items = waited.items;
  must("shift offers count=2", items.length === 2);

  const offer1 = items.find((x) => Number(x.roomId) === Number(room1Id)) || items[0];
  must("offer1 id", Number(offer1?.id) > 0);

  const acc = await reqJson("PUT", `/api/offers/${offer1.id}/accept`, { token: companyToken, body: {} });
  assertOk(acc.ok, "accept ok");
  ok("shift bound", Number(acc.json?.shift?.roomId) === Number(offer1.roomId));

  step("company adds a stop (so driver can reached)");
  const st = await reqJson("POST", `/api/shifts/${shiftId}/stops`, {
    token: companyToken,
    body: { name: "M31 Stop", lat: 41.015, lng: 28.979, type: "MANUAL" },
  });
  assertOk(st.ok, "stop add ok");
  const stopId = Number(st.json?.stop?.id || 0);
  must("stopId present", stopId > 0);

  step("room approves shift (vehicle+driver)");
  const appr = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  assertOk(appr.ok, "approve ok");

  step("room starts shift (ACTIVE)");
  const started = await reqJson("POST", `/api/shifts/${shiftId}/start`, { token: roomToken });
  assertOk(started.ok, "start ok");
  ok("status ACTIVE", String(started.json?.status || started.json?.shift?.status || "") === "ACTIVE");

  step("driver route/active shows shift");
  const route = await reqJson("GET", "/api/driver/route/active", { token: driverToken });
  assertOk(route.ok, "driver route ok");
  ok("driver sees shift", Number(route.json?.shift?.id || 0) === shiftId);

  // nextStop should exist since we added one stop
  const next = route.json?.nextStop;
  must("nextStop present", Number(next?.id || 0) > 0);

  step("driver reached next stop");
  const reached = await reqJson(
    "POST",
    `/api/driver/shifts/${shiftId}/stops/${next.id}/reached`,
    { token: driverToken }
  );
  assertOk(reached.ok, "reached ok");

  banner("M31CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
