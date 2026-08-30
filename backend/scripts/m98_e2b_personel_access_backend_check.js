import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCanonicalPrismaSchemaSource } from "./lib/prismaSchemaSource.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function normalize(text) {
  return String(text || "")
    .replace(/[’']/g, "'")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function must(text, needle, message) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

function mustNot(text, needle, message) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

function sectionBetween(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return "";
  const end = endNeedle ? text.indexOf(endNeedle, start + startNeedle.length) : -1;
  return end >= 0 ? text.slice(start, end) : text.slice(start);
}

console.log("=== M98-E2B PERSONEL ACCESS BACKEND CHECK ===");

const rootPkg = read("package.json");
const routeMounts = read("backend/src/bootstrap/routeMounts.js");
const server = read("backend/src/server.js");
const route = read("backend/src/routes/personelAccess.js");
const auth = read("backend/src/routes/auth.js");
const drivers = read("backend/src/routes/drivers.js");
const passengerLinks = read("backend/src/routes/passengerLinks.js");
const schoolParentInvites = read("backend/src/routes/schoolParentInvites.js");
const schema = readCanonicalPrismaSchemaSource(repoRoot);
const migrationsDir = path.join(repoRoot, "backend", "prisma", "migrations");
const migrationNames = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir) : [];

const createBlock = sectionBetween(route, 'r.post("/",', 'r.post("/:id/revoke",');
const listBlock = sectionBetween(route, 'r.get("/",', 'r.post("/",');
const revokeBlock = sectionBetween(route, 'r.post("/:id/revoke",', 'export function publicPersonelInviteRouter()');
const publicBlock = sectionBetween(route, 'export function publicPersonelInviteRouter()', 'return r;');
const acceptBlock = sectionBetween(route, 'r.post("/accept",', 'return r;');

must(rootPkg, "check:m98e2b", "root package exposes check:m98e2b");
must(routeMounts, "/api/auth/personel-invite", "route mounts public personel invite endpoint");
must(routeMounts, "/api/company/personel-invites", "route mounts company personel invite endpoint");
must(server, 'app.use("/api/auth/personel-invite", authLimiter);', "server rate-limits personel invite auth path");
must(server, "personelAccessRouter", "server wires personel access router");
must(server, "publicPersonelInviteRouter", "server wires public personel invite router");

must(route, "PERSONEL_INVITE_TYPE", "route uses a dedicated personel invite type constant");
must(route, "InviteType.PERSONEL_INVITE", "route keeps InviteType marker for static validation");
must(route, "PERSONEL_ACCESS_CREATE", "route audits personel access creation");
must(route, "PERSONEL_ACCESS_ACCEPT", "route audits personel access acceptance");
must(route, "PERSONEL_ACCESS_REVOKE", "route audits personel access revocation");
must(route, "buildInternalLoginEmail", "route prepares internal login email for first access");
must(route, "setStoredLogin", "route connects usernameDirectory storage");
must(route, "isUsernameTaken", "route checks username uniqueness against existing users");
must(route, "markPasswordChangeRequired", "route forces M98-E1 first password change");
must(route, "getEffectiveUsername", "route reuses usernameDirectory login surface");
must(route, "passwordChangeRequired: true", "route returns passwordChangeRequired for activation auth payload");
must(route, "requirePasswordChange: true", "route keeps alternate password-change flag for compatibility");
must(route, "accessCodeMasked", "route masks access code in list/info surfaces");
must(route, "tokenHash", "route stores invite token hash");
must(route, "expiresAt", "route stores 7-day expiry");
must(route, "consumedAt", "route uses consumed lifecycle state");
must(route, "revokedAt", "route supports revoke lifecycle state");

must(createBlock, "accessCode,", "create response returns raw access code");
must(createBlock, "pin,", "create response returns raw PIN");
must(createBlock, "item: buildInviteView(created)", "create response includes safe invite summary");
must(createBlock, "PERSONEL_ACCESS_CREATE", "create block keeps audit action");
mustNot(listBlock, "pin,", "list block does not expose raw PIN");
mustNot(listBlock, "accessCode,", "list block does not expose raw access code");
must(listBlock, "buildInviteView(item)", "list block maps invite rows through safe view helper");
must(listBlock, "personel:", "list block includes personel summary");
must(revokeBlock, "PERSONEL_ACCESS_REVOKE", "revoke block keeps audit action");
must(revokeBlock, "consumedAt || existing.revokedAt", "revoke block performs safe no-op on consumed/revoked invites");
must(publicBlock, "publicPersonelInviteRouter", "public router export exists");
must(acceptBlock, "token or accessCode+pin required", "accept block validates login payload");
must(acceptBlock, "PERSONEL_ACCESS_ACCEPT", "accept block keeps audit action");
must(acceptBlock, "passwordChangeRequired: true", "accept block returns forced password-change auth payload");
must(acceptBlock, "invite: buildInviteView", "accept block returns safe invite summary");

must(schema, "model Invite", "schema still uses existing Invite model");
must(schema, "PERSONEL_INVITE", "schema still exposes PERSONEL_INVITE enum value");
must(schema, "model ParentInvite", "schema still contains parent invite model");
must(schema, "model PassengerLiveLink", "schema still contains passenger live link model");
must(schema, "model Personel", "schema still contains personel model");
mustNot(schema, "model PersonelAccess", "schema does not add a new personel access model");

must(auth, "resolveUserIdByUsername", "login route still resolves usernameDirectory usernames");
must(auth, "passwordChangeRequired:", "login route still returns passwordChangeRequired");
must(auth, "/parent-invite/accept", "parent invite accept route remains in auth.js");

must(drivers, "issueDriverCredentials", "driver route marker remains intact");
must(drivers, "pinTemporary", "driver PIN lifecycle marker remains intact");
must(passengerLinks, "PASSENGER_LINK_CREATE", "passenger live link route marker remains intact");
must(passengerLinks, "publicPassengerLiveRouter", "public passenger live route remains intact");
must(schoolParentInvites, "PARENT_INVITE_CREATE", "parent invite create marker remains intact");
must(schoolParentInvites, "PARENT_INVITE_REVOKE", "parent invite revoke marker remains intact");

if (migrationNames.some((name) => /m98.*e2b|personel.*access/i.test(name))) {
  throw new Error(`FAIL unexpected migration for M98-E2B: ${migrationNames.filter((name) => /m98.*e2b|personel.*access/i.test(name)).join(", ")}`);
}
console.log("OK no new M98-E2B migration folder detected");

console.log("=== M98-E2B PERSONEL ACCESS BACKEND CHECK PASS ===");
