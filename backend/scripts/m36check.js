// backend/scripts/m36check.js
// M36CHECK: SUPER_ADMIN ops pack
// - Companies/Rooms update/delete
// - Admin Users: create + disable + reset password

import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

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

function randTag() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000));
}

async function main() {
  banner("M36CHECK: SUPER_ADMIN ops (users + crud)");

  const superToken = await loginFirst("super");

  const tag = randTag();
  const coName = `M36 Company ${tag}`;
  const rmName = `M36 Room ${tag}`;

  step("create Company + Room");
  const co = await reqJson("POST", "/api/companies", { token: superToken, body: { name: coName } });
  mustOk(co, "company create");
  const companyId = Number(co.json?.id);
  assertOk(Number.isFinite(companyId) && companyId > 0, "companyId present");

  const rm = await reqJson("POST", "/api/rooms", { token: superToken, body: { name: rmName } });
  mustOk(rm, "room create");
  const roomId = Number(rm.json?.id);
  assertOk(Number.isFinite(roomId) && roomId > 0, "roomId present");

  step("update Company + Room name (PUT)");
  const co2 = await reqJson("PUT", `/api/companies/${companyId}`, { token: superToken, body: { name: coName + " X" } });
  mustOk(co2, "company update");
  assertOk(String(co2.json?.name || "").includes("X"), "company name updated");

  const rm2 = await reqJson("PUT", `/api/rooms/${roomId}`, { token: superToken, body: { name: rmName + " X" } });
  mustOk(rm2, "room update");
  assertOk(String(rm2.json?.name || "").includes("X"), "room name updated");

  step("create a COMPANY login user via /api/admin/users");
  const emailC = `m36_company_${tag}@demo.com`;
  const uC = await reqJson("POST", "/api/admin/users", {
    token: superToken,
    body: { role: "COMPANY", companyId, email: emailC, fullName: "M36 Company User" },
  });
  mustOk(uC, "admin create company user");
  const userCId = Number(uC.json?.user?.id);
  const pwC = String(uC.json?.tempPassword || "");
  assertOk(userCId > 0, "company user id");
  assertOk(pwC.length >= 4, "company temp password returned");

  step("login with created company user");
  const loginC = await reqJson("POST", "/api/auth/login", { body: { email: emailC, password: pwC } });
  mustOk(loginC, "login company user");
  const tokC = String(loginC.json?.token || "");
  assertOk(tokC.length > 10, "company token present");

  const meC = await reqJson("GET", "/api/me", { token: tokC });
  mustOk(meC, "me company user");
  assertOk(Number(meC.json?.companyId) === companyId, "company scope correct");

  step("disable company user (login should be blocked)");
  const dis = await reqJson("POST", `/api/admin/users/${userCId}/disable`, { token: superToken });
  mustOk(dis, "disable user");

  const loginC2 = await reqJson("POST", "/api/auth/login", { body: { email: emailC, password: pwC } });
  assertOk(loginC2.status === 403, "disabled login blocked (403)");

  step("reset password (should re-enable)");
  const reset = await reqJson("POST", `/api/admin/users/${userCId}/reset-password`, { token: superToken });
  mustOk(reset, "reset password");
  const pw2 = String(reset.json?.tempPassword || "");
  assertOk(pw2.length >= 4, "reset password returned");

  const loginC3 = await reqJson("POST", "/api/auth/login", { body: { email: emailC, password: pw2 } });
  mustOk(loginC3, "login after reset");

  step("create a ROOM login user via /api/admin/users");
  const emailR = `m36_room_${tag}@demo.com`;
  const uR = await reqJson("POST", "/api/admin/users", {
    token: superToken,
    body: { role: "ROOM", roomId, email: emailR, fullName: "M36 Room User" },
  });
  mustOk(uR, "admin create room user");
  const pwR = String(uR.json?.tempPassword || "");
  assertOk(pwR.length >= 4, "room temp password returned");

  const loginR = await reqJson("POST", "/api/auth/login", { body: { email: emailR, password: pwR } });
  mustOk(loginR, "login room user");
  const tokR = String(loginR.json?.token || "");
  const meR = await reqJson("GET", "/api/me", { token: tokR });
  mustOk(meR, "me room user");
  assertOk(Number(meR.json?.roomId) === roomId, "room scope correct");

  step("soft delete company + room");
  const delC = await reqJson("DELETE", `/api/companies/${companyId}`, { token: superToken });
  mustOk(delC, "company delete");
  const delR = await reqJson("DELETE", `/api/rooms/${roomId}`, { token: superToken });
  mustOk(delR, "room delete");

  console.log("OK M36CHECK PASS");
}

main().catch((e) => {
  console.error("FAIL M36CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});

