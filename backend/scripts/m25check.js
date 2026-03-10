// backend/scripts/m25check.js
// M25CHECK: Offer list status filter works (inbox + shift offers)
// Hotfixes:
// 1) align regionId for company + room1 + room2 so "region offer gate" doesn't filter room1 out.
// 2) schedule the market shift to "tomorrow afternoon" to avoid AGREEMENT windows created by earlier checks.

import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

function isoTomorrowAtLocal(hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function mustOk(r, label) {
  if (r?.ok) {
    console.log(`OK ${label}`);
    return;
  }
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 800);
  console.error(`FAIL ${label} (status=${st})\n${txt}`);
  throw new Error(`ASSERT_FAIL: ${label}`);
}

async function getRoomById(superToken, id) {
  const one = await reqJson("GET", `/api/rooms/${id}`, { token: superToken });
  if (one?.ok && one.json) return one.json;
  // fallback: list
  const list = await reqJson("GET", "/api/rooms", { token: superToken });
  if (list?.ok && Array.isArray(list.json?.items)) {
    return list.json.items.find((x) => Number(x.id) === Number(id)) || null;
  }
  return null;
}

async function ensureRegionForM25(superToken) {
  const rr = await reqJson("GET", "/api/admin/regions", { token: superToken });
  if (rr?.ok && Array.isArray(rr.json?.items) && rr.json.items.length > 0) {
    return Number(rr.json.items[0].id);
  }
  const created = await reqJson("POST", "/api/admin/regions", {
    token: superToken,
    body: { name: "M25 Test Region" },
  });
  if (created?.ok && created.json?.id) return Number(created.json.id);
  return null;
}

async function main() {
  banner("M25CHECK: Offers status filter (inbox + shift offers)");

  const superToken = await loginFirst("super");
  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");

  step("resolve room1Id via /api/me (ROOM)");
  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "me (room)");
  assertOk(!!meRoom.json?.roomId, "roomId present");
  const room1Id = Number(meRoom.json.roomId);

  step("create room2 (SUPER_ADMIN)");
  const room2 = await reqJson("POST", "/api/rooms", {
    token: superToken,
    body: { name: "M25 Room 2" },
  });
  mustOk(room2, "room2 create");
  const room2Id = Number(room2.json.id);

  // REGION_ALIGN_FOR_M25
  step("align regionId for company + room1 + room2 (to satisfy region offer gate)");
  const meCompany = await reqJson("GET", "/api/me", { token: companyToken });
  mustOk(meCompany, "me (company)");
  assertOk(!!meCompany.json?.companyId, "companyId present");
  const companyId = Number(meCompany.json.companyId);

  const room1 = await getRoomById(superToken, room1Id);
  let targetRegionId = room1?.regionId || room1?.region?.id || null;
  if (!targetRegionId) {
    targetRegionId = await ensureRegionForM25(superToken);
  }

  if (targetRegionId) {
    const uCompany = await reqJson("PUT", `/api/companies/${companyId}`, {
      token: superToken,
      body: { regionId: targetRegionId },
    });
    mustOk(uCompany, "company region aligned");

    const uRoom1 = await reqJson("PUT", `/api/rooms/${room1Id}`, {
      token: superToken,
      body: { regionId: targetRegionId },
    });
    mustOk(uRoom1, "room1 region aligned");

    const uRoom2 = await reqJson("PUT", `/api/rooms/${room2Id}`, {
      token: superToken,
      body: { regionId: targetRegionId },
    });
    mustOk(uRoom2, "room2 region aligned");
  } else {
    console.log("INFO region align skipped (no regions available) — continuing");
  }

  step("company creates market shift (tomorrow afternoon to avoid agreements)");
  const startAt = isoTomorrowAtLocal(14, 0);
  const endAt = isoTomorrowAtLocal(17, 0);

  const shift = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { startAt, endAt, status: "REQUESTED" },
  });
  mustOk(shift, "market shift created");
  const shiftId = Number(shift.json.id);

  step("company sends offers to room1+room2");
  const offersCreate = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M25 teklif" },
  });
  mustOk(offersCreate, "offers created");

  // Ensure room1 offer was actually created (not filtered)
  const createdIds = (offersCreate.json?.items || []).map((x) => Number(x.roomId));
  assertOk(createdIds.includes(room1Id), "room1 offer created (not filtered)");

  step("room1 inbox finds offer (no filter)");
  const inboxNo = await reqJson("GET", "/api/offers/inbox", { token: roomToken });
  mustOk(inboxNo, "inbox list");
  const offer1 = (inboxNo.json.items || []).find((o) => Number(o.shiftId) === shiftId);
  assertOk(!!offer1?.id, "room1 offer found");
  const offer1Id = Number(offer1.id);

  step("room1 inbox filter: status=OPEN,COUNTERED includes it");
  const inboxActive = await reqJson("GET", "/api/offers/inbox?status=OPEN,COUNTERED", { token: roomToken });
  mustOk(inboxActive, "inbox list (filtered)");
  const offerActive = (inboxActive.json.items || []).find((o) => Number(o.shiftId) === shiftId);
  assertOk(!!offerActive?.id, "filtered inbox contains offer");

  step("company accepts room1 offer -> cancels others");
  const accept = await reqJson("PUT", `/api/offers/${offer1Id}/accept`, { token: companyToken, body: {} });
  mustOk(accept, "accept ok");
  assertOk(Number(accept.json?.shift?.roomId) === room1Id, "shift bound to room1");

  step("SUPER_ADMIN inbox(room2) filter: status=CANCELLED contains offer");
  const inboxRoom2Cancelled = await reqJson("GET", `/api/offers/inbox?roomId=${room2Id}&status=CANCELLED`, { token: superToken });
  mustOk(inboxRoom2Cancelled, "inbox room2 cancelled");
  const cancelled = (inboxRoom2Cancelled.json.items || []).find((o) => Number(o.shiftId) === shiftId);
  assertOk(!!cancelled?.id, "room2 CANCELLED offer found");
  assertOk(String(cancelled.status) === "CANCELLED", "status is CANCELLED");

  step("company shift offers filter works: status=CANCELLED returns only room2");
  const listCancelled = await reqJson("GET", `/api/offers/shift/${shiftId}?status=CANCELLED`, { token: companyToken });
  mustOk(listCancelled, "company offers list cancelled");
  const cancelledOnly = listCancelled.json.items || [];
  assertOk(cancelledOnly.length >= 1, "cancelled list non-empty");
  assertOk(cancelledOnly.every((o) => String(o.status) === "CANCELLED"), "all are CANCELLED");

  console.log("OK M25CHECK PASS");
}

main().catch((e) => {
  console.error("FAIL M25CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});

