import { banner, step, must, reqJson } from "./_harness.js";
import { prisma } from "../src/prisma.js";

async function loginRaw(email, password) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
  must(`login ok ${email}`, r.ok && !!r.json?.token);
  return r.json;
}

async function resolveSchoolStudent(schoolToken) {
  const personels = await reqJson("GET", "/api/company/personels?kind=STUDENT&take=50", { token: schoolToken });
  must("school student list ok", personels.ok && Array.isArray(personels.json?.items));
  const items = Array.isArray(personels.json?.items) ? personels.json.items : [];
  const student = items.find((x) => String(x?.kind || "").toUpperCase() === "STUDENT") || null;
  must("student found", !!student?.id);
  return student;
}

async function main() {
  banner("M43 PARENT ACCESS CLEANUP CHECK");

  step("login school");
  const school = await loginRaw("school@demo.com", "demo123");

  step("resolve school student");
  const student = await resolveSchoolStudent(school.token);

  step("create parent access");
  const access = await reqJson("POST", "/api/school/parent-invites", {
    token: school.token,
    body: { childPersonelId: student.id, expiresInDays: 7 },
  });
  must("parent access create ok", access.ok && access.json?.ok === true);
  must("parent access token present", !!access.json?.token);
  must("parent access code present", !!access.json?.accessCode);
  must("parent access pin present", !!access.json?.pin);

  const rawToken = String(access.json.token || "");
  const accessCode = String(access.json.accessCode || "");
  const pin = String(access.json.pin || "");
  const accessId = Number(access.json?.item?.id || 0);
  must("parent access id present", accessId > 0);

  step("token info resolves");
  const info = await reqJson("GET", `/api/auth/parent-invite/info?token=${encodeURIComponent(rawToken)}`);
  must("parent access info ok", info.ok && info.json?.ok === true);
  must("parent access info child matches", Number(info.json?.access?.child?.id || 0) === Number(student.id));

  step("direct token login works and is reusable");
  const firstLogin = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { token: rawToken } });
  must("first token login ok", firstLogin.ok && firstLogin.json?.user?.role === "PARENT");

  const secondLogin = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { token: rawToken } });
  must("second token login ok", secondLogin.ok && secondLogin.json?.user?.role === "PARENT");

  step("code + pin fallback works");
  const codePinLogin = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { accessCode, pin } });
  must("code pin login ok", codePinLogin.ok && codePinLogin.json?.user?.role === "PARENT");

  step("legacy auth invite routes are removed");
  const legacyList = await reqJson("GET", "/api/auth/invites", { token: school.token });
  must("legacy list removed", legacyList.status === 410);
  const legacyInfo = await reqJson("GET", "/api/auth/invite/info?token=test");
  must("legacy info removed", legacyInfo.status === 410);

  step("revoke stops access");
  const revoke = await reqJson("POST", `/api/school/parent-invites/${accessId}/revoke`, { token: school.token, body: {} });
  must("revoke ok", revoke.ok && revoke.json?.ok === true);

  const revokedLogin = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { token: rawToken } });
  must("revoked access blocked", revokedLogin.status === 410);

  const parentUser = await prisma.user.findFirst({ where: { email: `parent-access-${accessId}@vardis.local` }, select: { id: true, role: true } });
  must("synthetic parent user exists", !!parentUser?.id && String(parentUser?.role || "") === "PARENT");

  banner("M43 PARENT ACCESS CLEANUP CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
