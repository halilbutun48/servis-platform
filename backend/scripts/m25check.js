// backend/scripts/m25check.js
// M25CHECK: Offer list status filter works (inbox + shift offers)

import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

function isoPlusMin(min) {
  return new Date(Date.now() + min * 60_000).toISOString();
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

  step("company creates market shift");
  const shift = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { startAt: isoPlusMin(60), endAt: isoPlusMin(180), status: "REQUESTED" },
  });
  mustOk(shift, "market shift created");
  const shiftId = Number(shift.json.id);

  step("company sends offers to room1+room2");
  const offersCreate = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: { roomIds: [room1Id, room2Id], amountCompany: 25000, noteCompany: "M25 teklif" },
  });
  mustOk(offersCreate, "offers created");

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
  const inboxRoom2Cancelled = await reqJson(
    "GET",
    `/api/offers/inbox?roomId=${room2Id}&status=CANCELLED`,
    { token: superToken }
  );
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

  console.log("✅ M25CHECK PASS");
}

main().catch((e) => {
  console.error("❌ M25CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});