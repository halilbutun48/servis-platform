// backend/scripts/m35check.js
// M35CHECK: ROOM offered shift visibility + offer-scoped preview authorization
// Goal: validate the exact "next step" contract:
// - ROOM Shifts list can include offered market shifts (roomId null) via includeOffered=1
// - ROOM can open route-preview for an offered shift via active offer scope

import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

function isoPlusMin(min) {
  return new Date(Date.now() + Number(min) * 60_000).toISOString();
}

function mustOk(r, label) {
  if (r?.ok) {
    console.log(`OK ${label}`);
    return;
  }
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 900);
  console.error(`FAIL ${label} (status=${st})\n${txt}`);
  throw new Error(`ASSERT_FAIL: ${label}`);
}

async function main() {
  banner("M35CHECK: offered shifts + preview scope");

  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");

  step("resolve companyId + roomId via /api/me");
  const meC = await reqJson("GET", "/api/me", { token: companyToken });
  mustOk(meC, "me company");
  const companyId = Number(meC.json?.companyId);
  assertOk(Number.isFinite(companyId) && companyId > 0, "companyId present");

  const meR = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meR, "me room");
  const roomId = Number(meR.json?.roomId);
  assertOk(Number.isFinite(roomId) && roomId > 0, "roomId present");

  step("plan-builder precheck (Guided Flow contract)");
  const pre = await reqJson("GET", "/api/plan-builder/precheck", { token: companyToken });
  mustOk(pre, "precheck");
  assertOk(pre.json?.ok === true, "precheck ok");

  step("create a market shift (roomId null)");
  const sh = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: {
      startAt: isoPlusMin(70),
      endAt: isoPlusMin(150),
      status: "REQUESTED",
      // NOTE: route-preview hub may be missing for market shifts; still OK.
    },
  });
  mustOk(sh, "shift create");
  const shiftId = Number(sh.json?.id);
  assertOk(Number.isFinite(shiftId) && shiftId > 0, "shiftId present");
  assertOk(sh.json?.roomId == null, "market shift roomId null");

  step("send offer to the ROOM");
  const send = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: {
      roomIds: [roomId],
      amountCompany: 11111,
      noteCompany: "M35CHECK",
    },
  });
  mustOk(send, "offer send");
  assertOk(send.json?.ok === true, "offer send ok");

  step("ROOM shifts list should include offered market shifts (includeOffered=1)");
  const list = await reqJson("GET", "/api/shifts?includeOffered=1&take=250", { token: roomToken });
  mustOk(list, "room shifts list");
  const items = Array.isArray(list.json?.items) ? list.json.items : [];
  const found = items.some((x) => Number(x?.id) === shiftId);
  assertOk(found, "offered shift visible in /api/shifts?includeOffered=1");

  step("ROOM can open route-preview for offered shift (offer-scoped auth)");
  const pv = await reqJson("GET", `/api/shifts/${shiftId}/route-preview`, { token: roomToken });
  mustOk(pv, "route-preview");
  assertOk(pv.json?.ok === true, "route-preview ok");

  console.log("OK M35CHECK PASS");
}

main().catch((e) => {
  console.error("FAIL M35CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});

