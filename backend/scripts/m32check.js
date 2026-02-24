// backend/scripts/m32check.js
// M32CHECK: UI template refactor (sanity) — marketplace offers still deterministic

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
  banner("M32CHECK: Offer flow sanity (post UI template refactor)");

  const superToken = await loginFirst("SUPER_ADMIN");
  const roomToken = await loginFirst("ROOM");
  const companyToken = await loginFirst("COMPANY");

  const { roomId: room1Id } = await getRoomCompanyIds(roomToken, companyToken);

  step("create room2 (SUPER_ADMIN)");
  const r2 = await reqJson("POST", "/api/rooms", { token: superToken, body: { name: "M32 Room2" } });
  assertOk(r2.ok, "room2 create");
  const room2Id = Number(r2.json?.id || r2.json?.room?.id || 0);
  must("room2Id present", room2Id > 0);

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
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M32" },
  });
  assertOk(offCreate.ok, "offers created");

  step("company lists offers for shift (wait) ");
  const waited = await waitShiftOffers(companyToken, shiftId, { min: 2 });
  assertOk(waited.ok, "offers list ok (after wait)");
  must("shift offers count=2", waited.items.length === 2);

  banner("M32CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
