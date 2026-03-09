// backend/scripts/m30check.js
// M30CHECK: Market flow + quick approve + personel request (robust)

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
  banner("M30CHECK: Market flow + quick approve + personel request");

  const superToken = await loginFirst("SUPER_ADMIN");
  const roomToken = await loginFirst("ROOM");
  const companyToken = await loginFirst("COMPANY");
  const personelToken = await loginFirst("PERSONEL");

  const { roomId: room1Id } = await getRoomCompanyIds(roomToken, companyToken);

  step("create room2 (SUPER_ADMIN)");
  const r2 = await reqJson("POST", "/api/rooms", { token: superToken, body: { name: "M30 Room2" } });
  assertOk(r2.ok, "room2 create");
  const room2Id = Number(r2.json?.id || r2.json?.room?.id || 0);
  must("room2Id present", room2Id > 0);

  step("room creates vehicle+driver (for approve)");
  const d1 = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: "M30 Driver", phone: "5550001122", deviceInfo: "m30" },
  });
  assertOk(d1.ok, "driver create");
  const driverId = Number(d1.json?.id || 0);
  must("driverId present", driverId > 0);

  const v1 = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate: `M30-${Math.random().toString(16).slice(2, 8).toUpperCase()}`, capacity: 16 },
  });
  assertOk(v1.ok, "vehicle create");
  const vehicleId = Number(v1.json?.id || 0);
  must("vehicleId present", vehicleId > 0);

  step("company creates market shift (no roomId) and sends offers to room1+room2");
  const base = new Date().toISOString();
  const startAt = addMinutesIso(base, 60);
  const endAt = addMinutesIso(base, 120);

  // ✅ kritik: status REQUESTED (market flow ile hizalı)
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
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M30" },
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

  step("room quick approve accepted shift (vehicle+driver)");
  const appr = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  assertOk(appr.ok, "approve ok");

  step("personel sees shifts and can create request");
  // new endpoint in M30: /api/personel/shifts (if present)
  const psh = await reqJson("GET", "/api/personel/shifts", { token: personelToken });
  assertOk(psh.ok, "personel shifts ok");

  // request create (existing flow)
  const req1 = await reqJson("POST", "/api/requests", {
    token: personelToken,
    body: { shiftId, lat: 41.015, lng: 28.979 },
  });
  assertOk(req1.ok, "personel request create ok");

  banner("M30CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});