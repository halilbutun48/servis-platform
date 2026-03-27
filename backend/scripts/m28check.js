// backend/scripts/m28check.js
// M28CHECK: One-Click Flow helpers (Offer directory + status filters)
// Hotfixes:
// 1) Align regionId for company + room1 + room2 to satisfy "region offer gate".
// 2) Schedule the market shift to tomorrow afternoon to avoid AGREEMENT windows created by earlier checks.

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

function isoTomorrowAtLocal(hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function byShift(items, shiftId) {
  const sid = Number(shiftId);
  return (items || []).filter((x) => Number(x?.shiftId) === sid);
}

async function getRoomById(superToken, id) {
  const one = await reqJson("GET", `/api/rooms/${id}`, { token: superToken });
  if (one?.ok && one.json) return one.json;

  // fallback: list
  const list = await reqJson("GET", "/api/rooms?take=500", { token: superToken });
  if (list?.ok && Array.isArray(list.json?.items)) {
    return list.json.items.find((x) => Number(x.id) === Number(id)) || null;
  }
  return null;
}

async function ensureRegion(superToken) {
  const rr = await reqJson("GET", "/api/admin/regions", { token: superToken });
  if (rr?.ok && Array.isArray(rr.json?.items) && rr.json.items.length > 0) {
    return Number(rr.json.items[0].id);
  }
  const created = await reqJson("POST", "/api/admin/regions", {
    token: superToken,
    body: { name: "M28 Test Region" },
  });
  if (created?.ok && created.json?.id) return Number(created.json.id);
  return null;
}

async function main() {
  banner("M28CHECK: Offer directory + status filters");

  const superToken = await loginFirst("SUPER_ADMIN");
  const roomToken = await loginFirst("ROOM");
  const companyToken = await loginFirst("COMPANY");

  const { roomId: room1Id, companyId } = await getRoomCompanyIds(roomToken, companyToken);

  step("create room2 (SUPER_ADMIN)");
  const r2 = await reqJson("POST", "/api/rooms", {
    token: superToken,
    body: { name: "M28 Room2" },
  });
  assertOk(r2.ok, "room2 create");
  const room2Id = Number(r2.json?.id || r2.json?.room?.id || 0);
  must("room2Id present", room2Id > 0);

  // REGION ALIGN
  step("align regionId for company + room1 + room2 (to satisfy region offer gate)");
  const room1 = await getRoomById(superToken, room1Id);
  let targetRegionId = room1?.regionId || room1?.region?.id || null;
  if (!targetRegionId) targetRegionId = await ensureRegion(superToken);

  if (targetRegionId) {
    const uc = await reqJson("PUT", `/api/companies/${companyId}`, { token: superToken, body: { regionId: targetRegionId } });
    assertOk(uc.ok, "company region aligned");

    const ur1 = await reqJson("PUT", `/api/rooms/${room1Id}`, { token: superToken, body: { regionId: targetRegionId } });
    assertOk(ur1.ok, "room1 region aligned");

    const ur2 = await reqJson("PUT", `/api/rooms/${room2Id}`, { token: superToken, body: { regionId: targetRegionId } });
    assertOk(ur2.ok, "room2 region aligned");
  } else {
    console.log("INFO region align skipped (no region available) — continuing");
  }

  step("company creates market shift (no roomId) — tomorrow afternoon (avoid agreements)");
  const startAt = isoTomorrowAtLocal(14, 0);
  const endAt = isoTomorrowAtLocal(17, 0);

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

  // Ensure both offers are created (not filtered)
  const createdRoomIds = (offCreate.json?.items || []).map((x) => Number(x.roomId));
  must("offers include room1", createdRoomIds.includes(Number(room1Id)));
  must("offers include room2", createdRoomIds.includes(Number(room2Id)));

  step("company directory /api/offers/company?status=OPEN,COUNTERED");
  const dir1 = await reqJson("GET", "/api/offers/company?status=OPEN,COUNTERED&take=800&fresh=1", {
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
  const dir2 = await reqJson("GET", "/api/offers/company?status=OPEN,COUNTERED&take=800&fresh=1", {
    token: companyToken,
  });
  assertOk(dir2.ok, "offers company directory 2 ok");
  const dirItems2All = itemsOf(dir2);
  const dirItems2 = byShift(dirItems2All, shiftId);
  must("open offers empty (shift scoped)", dirItems2.length === 0);

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

