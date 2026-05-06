import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import express from "express";
import { fileURLToPath } from "node:url";
import { totpToken } from "../src/auth/totp.js";
import { prisma } from "../src/prisma.js";
import { authRouter } from "../src/routes/auth.js";
import { meRouter } from "../src/routes/me.js";
import { personelAccessRouter, publicPersonelInviteRouter } from "../src/routes/personelAccess.js";
import { getStoredLogin, normalizeUsername } from "../src/auth/usernameDirectory.js";
import { isPasswordChangeRequired } from "../src/auth/passwordChangeRequirementStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const RUN_ID = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let SMOKE_BASE_URL = null;

function isLocalSmokeTarget(url) {
  return ["localhost", "127.0.0.1", "::1"].includes(String(url?.hostname || "").trim().toLowerCase());
}

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL ${message}`);
  console.log(`OK ${message}`);
}

function maskAccessCode(code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return "****";
  if (clean.length <= 4) return `${clean.slice(0, 2)}**`;
  return `${clean.slice(0, 4)}***${clean.slice(-2)}`;
}

function setSmokeBaseUrl(baseUrl) {
  SMOKE_BASE_URL = String(baseUrl || "").replace(/\/$/, "");
}

function assertSmokeBaseUrl() {
  if (!SMOKE_BASE_URL) throw new Error("FAIL smoke base URL not initialized");
}

function requestJson(method, pathName, { token, body } = {}) {
  assertSmokeBaseUrl();
  const url = new URL(pathName, SMOKE_BASE_URL);
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve) => {
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: res.headers ?? {},
            json,
            text,
          });
        });
      }
    );

    req.on("error", (error) => {
      resolve({ ok: false, status: 0, headers: {}, json: null, text: String(error?.message || error) });
    });

    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function reqJson(method, pathName, options = {}) {
  return requestJson(method, pathName, options);
}

async function login(email, password) {
  const body = String(email || "").includes("@")
    ? { email, password }
    : { identifier: email, password };
  const res = await reqJson("POST", "/api/auth/login", { body });
  if (!res.ok || !res.json?.token) {
    throw new Error(`FAIL login ${email} -> ${res.status}`);
  }
  return res.json.token;
}

async function ensureTotpStepUp(token, label) {
  const setup = await reqJson("POST", "/api/auth/totp/setup", {
    token,
    body: {},
  });
  if (!setup.ok || !setup.json?.secretBase32) {
    throw new Error(`FAIL TOTP setup (${label}) -> ${setup.status}`);
  }

  const code = totpToken(setup.json.secretBase32);
  const enable = await reqJson("POST", "/api/auth/totp/enable", {
    token,
    body: { code },
  });
  if (!enable.ok || enable.json?.enabled !== true) {
    throw new Error(`FAIL TOTP enable (${label}) -> ${enable.status}`);
  }

  const verify = await reqJson("POST", "/api/auth/totp/verify", {
    token,
    body: { code },
  });
  if (!verify.ok || !verify.json?.token) {
    throw new Error(`FAIL TOTP verify (${label}) -> ${verify.status}`);
  }

  return verify.json.token;
}

async function startSmokeServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/auth/personel-invite", publicPersonelInviteRouter());
  app.use("/api/company/personel-invites", personelAccessRouter());
  app.use("/api/me", meRouter);

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  if (!port) {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("FAIL smoke server port missing");
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  setSmokeBaseUrl(baseUrl);
  return { server, baseUrl };
}

function safeInviteSummary(invite, label) {
  assert(invite && typeof invite === "object", `${label} exists`);
  assert(!Object.prototype.hasOwnProperty.call(invite, "accessCode"), `${label} hides raw access code`);
  assert(!Object.prototype.hasOwnProperty.call(invite, "pin"), `${label} hides raw PIN`);
  assert(!Object.prototype.hasOwnProperty.call(invite, "tokenHash"), `${label} hides token hash`);
  assert(Object.prototype.hasOwnProperty.call(invite, "accessCodeMasked"), `${label} shows masked code`);
}

function readText(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function assertTextMarkers(relPath, needles, label) {
  const text = readText(relPath);
  for (const needle of needles) {
    assert(text.includes(needle), `${label}: ${needle}`);
  }
}

async function ensureSmokePersonel({ companyId, phone, fullName }) {
  const current = await prisma.personel.findFirst({
    where: { companyId, phone },
    select: { id: true, companyId: true, fullName: true, phone: true, kind: true, userId: true },
  });

  if (current) {
    const updated = await prisma.personel.update({
      where: { id: current.id },
      data: { fullName, kind: "PERSONEL" },
      select: { id: true, companyId: true, fullName: true, phone: true, kind: true, userId: true },
    });
    return updated;
  }

  return prisma.personel.create({
    data: {
      companyId,
      phone,
      fullName,
      kind: "PERSONEL",
      geoStatus: "NEEDS_REVIEW",
      geoManualOverride: false,
    },
    select: { id: true, companyId: true, fullName: true, phone: true, kind: true, userId: true },
  });
}

async function createInvite({ token, personelId, label }) {
  const res = await reqJson("POST", "/api/company/personel-invites", {
    token,
    body: { personelId },
  });
  assert(res.ok, `${label} invite create`);
  assert(res.json?.item?.id, `${label} create returns safe invite item`);
  assert(typeof res.json?.accessCode === "string" && res.json.accessCode.length >= 6, `${label} create returns access code`);
  assert(typeof res.json?.pin === "string" && /^\d{6}$/.test(res.json.pin), `${label} create returns 6-digit PIN`);
  assert(res.json.item.accessCodeMasked, `${label} create response includes masked code`);
  return {
    id: res.json.item.id,
    accessCode: res.json.accessCode,
    pin: res.json.pin,
    item: res.json.item,
  };
}

function findInviteItemById(items, id) {
  return (items || []).find((item) => Number(item?.id) === Number(id)) || null;
}

async function acceptInvite({ accessCode, pin, deviceId, label }) {
  const res = await reqJson("POST", "/api/auth/personel-invite/accept", {
    body: { accessCode, pin, deviceId },
  });
  assert(res.ok, `${label} accept`);
  assert(res.json?.user?.role === "PERSONEL", `${label} returns PERSONEL auth`);
  assert(res.json?.token && res.json?.refreshToken, `${label} returns auth tokens`);
  assert(res.json?.passwordChangeRequired === true || res.json?.requirePasswordChange === true, `${label} sets password change flag`);
  safeInviteSummary(res.json?.invite, `${label} accept invite summary`);
  return res.json;
}

async function assertMeGate({ token, expectedCompanyKind, label }) {
  const res = await reqJson("GET", "/api/me", { token });
  assert(res.ok, `${label} /api/me`);
  assert(res.json?.role === "PERSONEL", `${label} /api/me role`);
  assert(res.json?.requirePasswordChange === true, `${label} /api/me first password change gate`);
  assert(res.json?.companyKind === expectedCompanyKind, `${label} /api/me companyKind`);
  return res.json;
}

async function assertRuntimeSafetyMarkers() {
  assertTextMarkers("backend/src/routes/drivers.js", ["issueDriverCredentials", "pinTemporary"], "driver route markers intact");
  assertTextMarkers("backend/src/routes/schoolParentInvites.js", ["PARENT_INVITE_CREATE", "PARENT_INVITE_REVOKE"], "parent invite markers intact");
  assertTextMarkers("backend/src/routes/passengerLinks.js", ["PASSENGER_LINK_CREATE", "PASSENGER_LINK_REVOKE", "publicPassengerLiveRouter"], "passenger live markers intact");
}

async function exerciseScope({ label, loginEmail, expectedCompanyKind, personelPhone, personelFullName, devicePrefix }) {
  const baseToken = await ensureTotpStepUp(await login(loginEmail, "demo123"), label);
  const me = await reqJson("GET", "/api/me", { token: baseToken });
  assert(me.ok, `${label} base /api/me`);

  const companyId = Number(me.json?.companyId || 0);
  assert(companyId > 0, `${label} companyId resolved`);
  assert(me.json?.companyKind === expectedCompanyKind, `${label} companyKind resolved`);

  const smokePersonel = await ensureSmokePersonel({
    companyId,
    phone: personelPhone,
    fullName: personelFullName,
  });
  assert(smokePersonel?.id, `${label} synthetic personel ready`);

  const create = await createInvite({
    token: baseToken,
    personelId: smokePersonel.id,
    label,
  });
  console.log(`OK ${label} invite created: code=${maskAccessCode(create.accessCode)}`);

  const info = await reqJson("GET", `/api/auth/personel-invite/info?accessCode=${encodeURIComponent(create.accessCode)}&pin=${encodeURIComponent(create.pin)}`);
  assert(info.ok, `${label} invite info`);
  safeInviteSummary(info.json?.invite ?? info.json?.access ?? {}, `${label} info invite summary`);

  const list1 = await reqJson("GET", `/api/company/personel-invites?personelId=${smokePersonel.id}`, { token: baseToken });
  assert(list1.ok, `${label} invite list`);
  const listed1 = findInviteItemById(list1.json?.items, create.id);
  assert(listed1, `${label} list finds created invite`);
  assert(listed1.status === "ACTIVE", `${label} list shows ACTIVE`);
  assert(listed1.accessCodeMasked, `${label} list masks secrets`);
  assert(!Object.prototype.hasOwnProperty.call(listed1, "accessCode"), `${label} list hides raw access code`);
  assert(!Object.prototype.hasOwnProperty.call(listed1, "pin"), `${label} list hides raw PIN`);

  const accepted = await acceptInvite({
    accessCode: create.accessCode,
    pin: create.pin,
    deviceId: `${devicePrefix}-${RUN_ID}`,
    label,
  });

  const meAfter = await assertMeGate({ token: accepted.token, expectedCompanyKind, label });
  assert(Number(meAfter.personelId || 0) > 0, `${label} /api/me personelId`);
  assert(String(meAfter.username || "").trim() === normalizeUsername(create.accessCode), `${label} usernameDirectory stored login code`);

  const storedLogin = getStoredLogin(accepted.user.id);
  assert(String(storedLogin?.username || "") === normalizeUsername(create.accessCode), `${label} runtime usernameDirectory store`);
  assert(await isPasswordChangeRequired(accepted.user.id), `${label} password-change store set`);

  const list2 = await reqJson("GET", `/api/company/personel-invites?personelId=${smokePersonel.id}`, { token: baseToken });
  assert(list2.ok, `${label} post-accept invite list`);
  const acceptedItem = findInviteItemById(list2.json?.items, create.id);
  assert(acceptedItem?.status === "ACCEPTED", `${label} consumed invite becomes ACCEPTED`);
  assert(acceptedItem?.accessCodeMasked, `${label} consumed invite still masks code`);

  const reuse = await reqJson("POST", "/api/auth/personel-invite/accept", {
    body: {
      accessCode: create.accessCode,
      pin: create.pin,
      deviceId: `${devicePrefix}-${RUN_ID}-reuse`,
    },
  });
  assert(!reuse.ok && reuse.status === 410, `${label} consumed invite cannot be reused`);

  const second = await createInvite({
    token: baseToken,
    personelId: smokePersonel.id,
    label: `${label} second`,
  });
  const revoke = await reqJson("POST", `/api/company/personel-invites/${second.id}/revoke`, { token: baseToken });
  assert(revoke.ok, `${label} revoked invite`);
  assert(revoke.json?.item?.status === "REVOKED", `${label} revoked invite status`);
  safeInviteSummary(revoke.json?.item, `${label} revoke invite summary`);

  const list3 = await reqJson("GET", `/api/company/personel-invites?personelId=${smokePersonel.id}`, { token: baseToken });
  assert(list3.ok, `${label} revoked invite list`);
  const revokedItem = findInviteItemById(list3.json?.items, second.id);
  assert(revokedItem?.status === "REVOKED", `${label} revoked invite shows REVOKED`);
  assert(revokedItem?.accessCodeMasked, `${label} revoked invite still masks code`);

  const revokedAccept = await reqJson("POST", "/api/auth/personel-invite/accept", {
    body: {
      accessCode: second.accessCode,
      pin: second.pin,
      deviceId: `${devicePrefix}-${RUN_ID}-revoked`,
    },
  });
  assert(!revokedAccept.ok && revokedAccept.status === 410, `${label} revoked invite cannot be accepted`);

  return {
    companyId,
    smokePersonelId: smokePersonel.id,
    acceptedUserId: accepted.user.id,
    acceptedToken: accepted.token,
  };
}

async function main() {
  console.log("=== M98-E4 CODE PIN RUNTIME SMOKE ===");
  const smokeServer = await startSmokeServer();
  try {
    assert(await reqJson("GET", "/health").then((r) => r.ok && r.json?.ok), "/health responds");

    const companyScope = await exerciseScope({
      label: "company",
      loginEmail: "company@demo.com",
      expectedCompanyKind: "COMPANY",
      personelPhone: "+905559989801",
      personelFullName: "M98-E4 Smoke Company Personel",
      devicePrefix: "m98e4-company",
    });
    console.log("OK company invite list masks secrets");
    console.log("OK company invite accepted and returns PERSONEL auth");
    console.log("OK password change required flag present");
    console.log("OK consumed invite cannot be reused");
    console.log("OK revoked invite cannot be accepted");

    const orgScope = await exerciseScope({
      label: "organization",
      loginEmail: "organization@demo.com",
      expectedCompanyKind: "ORGANIZATION",
      personelPhone: "+905559989802",
      personelFullName: "M98-E4 Smoke Organization Personel",
      devicePrefix: "m98e4-organization",
    });
    console.log("OK organization invite create/list/accept works");

    await assertRuntimeSafetyMarkers();
    console.log("OK no raw secrets in safe surfaces");

    // Keep liveness evidence in the backend runtime only; do not mutate fixtures further.
    assert(Number(companyScope.acceptedUserId) > 0 && Number(orgScope.acceptedUserId) > 0, "accepted users are persisted");

    console.log("=== M98-E4 CODE PIN RUNTIME SMOKE PASS ===");
  } finally {
    await new Promise((resolve) => smokeServer.server.close(resolve));
  }
}

main().catch((error) => {
  const message = String(error?.message || error || "").replace(/\s+/g, " ").trim();
  console.error(message || "M98-E4 smoke failed");
  process.exit(1);
});
