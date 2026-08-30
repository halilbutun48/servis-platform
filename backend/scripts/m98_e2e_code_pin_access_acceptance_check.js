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

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
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

function responseSection(block, startNeedle = "res.json({") {
  return sectionBetween(block, startNeedle, "});");
}

console.log("=== M98-E2E CODE PIN ACCESS ACCEPTANCE CHECK ===");

const rootPkg = read("package.json");
const backendPersonelAccess = read("backend/src/routes/personelAccess.js");
const backendDrivers = read("backend/src/routes/drivers.js");
const backendAuth = read("backend/src/routes/auth.js");
const backendPassengerLinks = read("backend/src/routes/passengerLinks.js");
const backendParentInvites = read("backend/src/routes/schoolParentInvites.js");
const schema = readCanonicalPrismaSchemaSource(repoRoot);
const webApi = read("web/src/api.js");
const webWorkflow = read("web/src/panels/company/WorkflowPanel.jsx");
const webPersonelPanel = read("web/src/panels/company/PersonelAccessPanel.jsx");
const webParentPanel = read("web/src/panels/school/ParentInvitePanel.jsx");
const webAcceptPanel = read("web/src/panels/public/AcceptParentInvitePanel.jsx");
const webPassengerLinksPanel = read("web/src/panels/company/PassengerLinksPanel.jsx");
const mobileLogin = read("mobile/src/screens/LoginScreen.js");
const mobileApi = read("mobile/src/lib/api.js");
const mobileHandlers = read("mobile/src/app/mobileAppHandlers.js");
const mobileContent = read("mobile/src/app/MobileAppContent.js");
const migrationsDir = path.join(repoRoot, "backend", "prisma", "migrations");
const migrationNames = exists("backend/prisma/migrations") ? fs.readdirSync(migrationsDir) : [];

const createBlock = sectionBetween(backendPersonelAccess, 'r.post("/",', 'r.post("/:id/revoke",');
const listBlock = sectionBetween(backendPersonelAccess, 'r.get("/",', 'r.post("/",');
const revokeBlock = sectionBetween(backendPersonelAccess, 'r.post("/:id/revoke",', 'export function publicPersonelInviteRouter()');
const infoBlock = sectionBetween(backendPersonelAccess, 'r.get("/info",', 'r.post("/accept",');
const acceptBlock = sectionBetween(backendPersonelAccess, 'r.post("/accept",', 'return r;');
const createResponse = responseSection(createBlock, "res.json({");
const listResponse = responseSection(listBlock, "res.json({");
const infoResponse = responseSection(infoBlock, "return res.json({");
const acceptResponse = responseSection(acceptBlock, "return res.json({");

must(rootPkg, "check:m98e2e", "root package exposes check:m98e2e");
must(backendPersonelAccess, "personelAccessRouter", "backend personel access router exists");
must(backendPersonelAccess, "publicPersonelInviteRouter", "backend public personel invite router exists");
must(backendPersonelAccess, 'r.post("/",', "backend create endpoint marker exists");
must(backendPersonelAccess, 'r.get("/",', "backend list endpoint marker exists");
must(backendPersonelAccess, 'r.get("/info",', "backend public info endpoint marker exists");
must(backendPersonelAccess, 'r.post("/accept",', "backend public accept endpoint marker exists");
must(backendPersonelAccess, "Invite", "backend uses Invite model");
must(backendPersonelAccess, "PERSONEL_INVITE_TYPE", "backend uses personel invite type constant");
must(backendPersonelAccess, "INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000", "backend uses seven day expiry");
must(backendPersonelAccess, "tokenHash", "backend stores tokenHash");
must(backendPersonelAccess, "bcrypt.hash(pin, 10)", "backend hashes PIN with bcrypt");
must(backendPersonelAccess, "consumedAt", "backend keeps consumed lifecycle state");
must(backendPersonelAccess, "revokedAt", "backend keeps revoked lifecycle state");
must(backendPersonelAccess, "setStoredLogin", "backend connects usernameDirectory storage");
must(backendPersonelAccess, "buildInternalLoginEmail", "backend prepares internal login email");
must(backendPersonelAccess, "markPasswordChangeRequired", "backend connects passwordChangeRequired flow");
must(backendPersonelAccess, "passwordChangeRequired: true", "backend returns passwordChangeRequired");
must(backendPersonelAccess, "requirePasswordChange: true", "backend returns legacy password-change flag");
must(backendPersonelAccess, "PERSONEL_ACCESS_CREATE", "backend audit create action exists");
must(backendPersonelAccess, "PERSONEL_ACCESS_ACCEPT", "backend audit accept action exists");
must(backendPersonelAccess, "PERSONEL_ACCESS_REVOKE", "backend audit revoke action exists");
must(backendPersonelAccess, "buildInviteView", "backend safe invite view helper exists");
must(backendPersonelAccess, "accessCodeMasked", "backend masks access code");
must(backendPersonelAccess, "company.kind !== \"COMPANY\" && company.kind !== \"ORGANIZATION\"", "backend limits scope to company or organization");
must(backendPersonelAccess, "tx.invite.create", "backend creates invite rows");
must(backendPersonelAccess, "prisma.invite.findMany", "backend lists invite rows");
must(listBlock, "buildInviteView(item)", "backend list block maps invite rows through safe view helper");
must(backendPersonelAccess, "prisma.invite.update", "backend revokes invite rows");
must(backendPersonelAccess, "prisma.invite.findUnique", "backend resolves invite by token hash");

must(createResponse, "accessCode,", "create response returns raw access code");
must(createResponse, "pin,", "create response returns raw PIN");
must(createResponse, "item: buildInviteView(created)", "create response includes safe invite summary");
must(listResponse, "items: out", "list response returns invite collection");
mustNot(listResponse, "accessCode,", "list response does not expose raw access code");
mustNot(listResponse, "pin,", "list response does not expose raw PIN");
must(infoResponse, "access: buildInviteView(invite)", "info response returns safe access summary");
must(infoResponse, "invite: buildInviteView(invite)", "info response returns safe invite summary");
mustNot(infoResponse, "accessCode,", "info response does not expose raw access code");
mustNot(infoResponse, "pin,", "info response does not expose raw PIN");
must(acceptResponse, "...authPayload", "accept response preserves auth payload");
must(acceptResponse, "invite: buildInviteView(", "accept response returns safe invite summary");
mustNot(acceptResponse, "accessCode,", "accept response does not expose raw access code");
mustNot(acceptResponse, "pin,", "accept response does not expose raw PIN");
must(revokeBlock, "item: buildInviteView(existing)", "revoke block keeps safe invite summary for no-op");
must(revokeBlock, "item: buildInviteView(updated)", "revoke block keeps safe invite summary after revoke");
mustNot(revokeBlock, "accessCode,", "revoke block does not expose raw access code");
mustNot(revokeBlock, "pin,", "revoke block does not expose raw PIN");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "PERSONEL_INVITE", "schema keeps personel invite enum");
must(schema, "model ParentInvite", "schema keeps parent invite model");
must(schema, "model PassengerLiveLink", "schema keeps passenger live link model");
mustNot(schema, "model PersonelAccess", "schema does not add a personel access model");
mustNot(schema, "model PersonelInvite", "schema does not add a personel invite model");

if (migrationNames.some((name) => /m98.*e2e|personel.*access/i.test(name))) {
  throw new Error(`FAIL unexpected migration for M98-E2E: ${migrationNames.filter((name) => /m98.*e2e|personel.*access/i.test(name)).join(", ")}`);
}
console.log("OK no new M98-E2E migration folder detected");

must(backendAuth, "/parent-invite/accept", "parent invite accept route remains intact");
must(backendPassengerLinks, "passengerLinksRouter", "passenger live link router remains intact");
must(backendPassengerLinks, "PASSENGER_LINK_CREATE", "passenger live link create marker remains intact");
must(backendPassengerLinks, "PASSENGER_LINK_REVOKE", "passenger live link revoke marker remains intact");
must(backendParentInvites, "PARENT_INVITE_CREATE", "parent invite create marker remains intact");
must(backendParentInvites, "PARENT_INVITE_REVOKE", "parent invite revoke marker remains intact");
must(backendDrivers, "issueDriverCredentials", "driver route marker remains intact");
must(backendDrivers, "pinTemporary", "driver PIN lifecycle marker remains intact");

must(webApi, "createPersonelAccessInvite", "web api has create personel access helper");
must(webApi, "listPersonelAccessInvites", "web api has list personel access helper");
must(webApi, "revokePersonelAccessInvite", "web api has revoke personel access helper");
must(webApi, "acceptPersonelInvite", "web api has personel invite accept helper");
must(webWorkflow, "Personel erişimi", "company workflow exposes personel access card");
must(webWorkflow, "Personele 7 gün geçerli kullanıcı kodu ve geçici PIN verin", "company workflow explains personel access");
must(webWorkflow, 'companyPath(me, "/personel-access")', "company workflow routes to personel access panel");
must(webPersonelPanel, "Personel erişimi", "personel access panel title exists");
must(webPersonelPanel, "Personel erişimi oluştur", "personel access panel create action exists");
must(webPersonelPanel, "Bu kod ve PIN yalnızca şimdi gösterilir.", "personel access panel one-time disclosure exists");
must(webPersonelPanel, "Kullanıcı kodu", "personel access panel shows user code label");
must(webPersonelPanel, "Geçici PIN", "personel access panel shows temp PIN label");
must(webPersonelPanel, "7 gün geçerli", "personel access panel shows seven day validity");
must(webPersonelPanel, "accessCodeMasked", "personel access panel keeps masked code logic");
must(webPersonelPanel, "statusLabel", "personel access panel keeps status labels");
must(webPersonelPanel, "İptal et", "personel access panel revoke action exists");
must(webPersonelPanel, 'companyKind === "ORGANIZATION"', "personel access panel supports organization scope");
must(webParentPanel, "Veli kodu + PIN", "parent invite panel uses simplified product language");
must(webParentPanel, "7 gün geçerli veli kodu ve geçici PIN üretilir", "parent invite panel explains seven day code pin");
must(webAcceptPanel, "Veli kodu + PIN ile giriş", "accept parent panel uses simplified product language");
must(webAcceptPanel, "Okulun verdiği veli kodu ve PIN ile giriş yapabilirsin.", "accept parent panel explains simplified login");
must(webPassengerLinksPanel, "Bu akış hesap aktivasyonu değildir.", "passenger links panel is not activation");
must(webPassengerLinksPanel, "tek kişiye özel süreli canlı takip linki", "passenger links panel keeps live-link wording");

must(mobileLogin, "Kullanıcı kodu", "login screen uses user code label");
must(mobileLogin, "Size verilen sürücü, personel veya veli kodunu girin.", "login screen uses new helper subtitle");
must(mobileLogin, "PIN veya şifre", "login screen keeps pin or password label");
must(mobileApi, "export async function acceptPersonelInvite", "mobile api exports personel invite accept helper");
must(mobileApi, "/api/auth/personel-invite/accept", "mobile api calls personel invite accept endpoint");
must(mobileApi, "export function isCredentialLoginError", "mobile api exports credential error helper");
must(mobileHandlers, "acceptPersonelInvite", "mobile handlers import acceptPersonelInvite");
must(mobileHandlers, "isCredentialLoginError", "mobile handlers import credential error helper");
must(mobileHandlers, '^[A-Z0-9]{8}$', "mobile handlers detect personel access code format");
must(mobileHandlers, '^\\d{6}$', "mobile handlers detect personel access pin format");
must(mobileHandlers, "saveSession(", "mobile handlers save session after login or activation");
must(mobileHandlers, "passwordChangeRequired", "mobile handlers persist password change flag");
must(mobileHandlers, "changeDriverPin", "mobile handlers keep driver pin change flow");
must(mobileContent, "ForcePasswordChangeScreen", "mobile content keeps force password screen");
must(mobileContent, "requiresPasswordChange", "mobile content checks password change requirement");
must(mobileContent, "PinChangeScreen", "mobile content keeps driver pin screen");
must(mobileContent, "role === 'DRIVER' && Boolean(state?.me?.requirePinChange)", "mobile content keeps driver pin gate");

mustNot(mobileLogin, "Sürücü Kodu veya e-posta", "login screen removes old driver-email label");
mustNot(mobileLogin, "Telefon / e-posta", "login screen removes old phone-email copy");
mustNot(mobileLogin, "Token:", "login debug does not print token");
mustNot(mobileLogin, "PIN:", "login debug does not print PIN");
mustNot(mobileLogin, "Password:", "login debug does not print password");
mustNot(mobileHandlers, "console.log", "mobile handlers do not log secrets");
mustNot(mobileApi, "console.log", "mobile api does not log secrets");

console.log("=== M98-E2E CODE PIN ACCESS ACCEPTANCE CHECK PASS ===");
