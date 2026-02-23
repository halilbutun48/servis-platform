// backend/scripts/m28check.js
// M28CHECK: One-Click Flow helpers (Offer directory + status filters)

import {
  banner,
  step,
  ok,
  must,
  assertOk,
  reqJson,
  itemsOf,
  loginFirst,
  getRoomCompanyIds,
} from "./_harness.js";

function addMinutesIso(baseIso, minutes) {
  const d = new Date(baseIso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function byShift(items, shiftId) {
  const sid = Number(shiftId);
  return (items || []).filter((x) => Number(x?.shiftId) === sid);
}

async function main() {
  banner("M28CHECK: Offer directory + status filters");

  const superToken = await loginFirst("SUPER_ADMIN");
  const roomToken = await loginFirst("ROOM");
  const companyToken = await loginFirst("COMPANY");

  const { roomId: room1Id } = await getRoomCompanyIds(roomToken, companyToken);

  step("create room2 (SUPER_ADMIN)");
  const r2 = await reqJson("POST", "/api/rooms", {
    token: superToken,
    body: { name: "M28 Room2" },
  });
  assertOk(r2.ok, "room2 create");
  const room2Id = Number(r2.json?.id || r2.json?.room?.id || 0);
  must("room2Id present", room2Id > 0);

  step("company creates market shift (no roomId)");
  const base = new Date().toISOString();
  const startAt = addMinutesIso(base, 60);
  const endAt = addMinutesIso(base, 120);

  const sh = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { startAt, endAt },
  });
  assertOk(sh.ok, "market shift created");
  const shiftId = Number(sh.json?.id || 0);
  must("shiftId present", shiftId > 0);
  ok("market shift roomId null", sh.json?.roomId == null);

  step("company sends offers to room1+room2");
  const offCreate = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M28" },
  });
  assertOk(offCreate.ok, "offers created");

  step("company directory /api/offers/company?status=OPEN,COUNTERED");
  const dir1 = await reqJson("GET", "/api/offers/company?status=OPEN,COUNTERED&take=800", {
    token: companyToken,
  });
  assertOk(dir1.ok, "offers company directory ok");
  const dirItems1All = itemsOf(dir1);
  const dirItems1 = byShift(dirItems1All, shiftId);
  must(`directory has >=2 for shift#${shiftId}`, dirItems1.length >= 2);

  step("company list offers for shift and accept one");
  const list = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
  assertOk(list.ok, "offers list ok");
  const items = itemsOf(list);
  must("shift offers count=2", items.length === 2);

  const offer1 = items.find((x) => Number(x.roomId) === Number(room1Id)) || items[0];
  must("offer1 id", Number(offer1?.id) > 0);

  const acc = await reqJson("PUT", `/api/offers/${offer1.id}/accept`, { token: companyToken, body: {} });
  assertOk(acc.ok, "accept ok");
  ok("shift bound", Number(acc.json?.shift?.roomId) === Number(offer1.roomId));

  step("company directory OPEN+COUNTERED should be empty for this shift now");
  const dir2 = await reqJson("GET", "/api/offers/company?status=OPEN,COUNTERED&take=800", {
    token: companyToken,
  });
  assertOk(dir2.ok, "offers company directory 2 ok");
  const dirItems2All = itemsOf(dir2);
  const dirItems2 = byShift(dirItems2All, shiftId);
  ok("open offers empty (shift scoped)", dirItems2.length === 0);

  step("room2 inbox CANCELLED should include 1 item (SUPER_ADMIN + roomId)");
  const inbox2 = await reqJson(
    "GET",
    `/api/offers/inbox?roomId=${room2Id}&status=CANCELLED&take=50`,
    { token: superToken }
  );
  assertOk(inbox2.ok, "room2 inbox ok");
  const inItems = itemsOf(inbox2);
  must(
    "cancelled exists for room2",
    inItems.some((x) => Number(x.shiftId) === shiftId && String(x.status) === "CANCELLED")
  );

  banner("M28CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
