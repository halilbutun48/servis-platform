// backend/scripts/m29check.js
// M29CHECK: Onboarding helpers + offers UX contract (company directory + room inbox include shift.status)

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
  banner("M29CHECK: Company onboarding + offers quick flow");

  const superToken = await loginFirst("SUPER_ADMIN");
  const roomToken = await loginFirst("ROOM");
  const companyToken = await loginFirst("COMPANY");

  const { roomId: room1Id } = await getRoomCompanyIds(roomToken, companyToken);

  step("create room2 (SUPER_ADMIN)");
  const r2 = await reqJson("POST", "/api/rooms", { token: superToken, body: { name: "M29 Room2" } });
  assertOk(r2.ok, "room2 create");
  const room2Id = Number(r2.json?.id || 0);
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
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M29" },
  });
  assertOk(offCreate.ok, "offers created");

  step("company directory includes offers and shift.status");
  const dir = await reqJson("GET", "/api/offers/company?status=OPEN,COUNTERED&take=800&fresh=1", { token: companyToken });
  assertOk(dir.ok, "offers company directory ok");
  const dirItemsAll = itemsOf(dir);
  const dirItems = byShift(dirItemsAll, shiftId);
  must("directory has >=2 for shift", dirItems.length >= 2);
  must(
    "directory items include shift.status",
    dirItems.every((x) => x.shift && String(x.shift.status || ""))
  );

  step("room2 inbox includes offer + shift.status (SUPER_ADMIN roomId filter)");
  const inbox2 = await reqJson(
    "GET",
    `/api/offers/inbox?roomId=${room2Id}&status=OPEN,COUNTERED&take=200`,
    { token: superToken }
  );
  assertOk(inbox2.ok, "room2 inbox ok");
  const inItems = itemsOf(inbox2);
  must("room2 inbox includes our shift", inItems.some((x) => Number(x.shiftId) === shiftId));
  must(
    "room2 inbox items include shift.status",
    inItems.filter((x) => Number(x.shiftId) === shiftId).every((x) => x.shift && String(x.shift.status || ""))
  );

  banner("M29CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
