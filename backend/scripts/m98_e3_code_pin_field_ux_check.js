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

console.log("=== M98-E3 CODE PIN FIELD UX CHECK ===");

const rootPkg = read("package.json");
const docsPrimer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const runbook = read("docs/RUNBOOK_M98E3_CODE_PIN_FIELD_UX.md");
const schema = readCanonicalPrismaSchemaSource(repoRoot);
const e2eCheck = read("backend/scripts/m98_e2e_code_pin_access_acceptance_check.js");
const backendRoute = read("backend/src/routes/personelAccess.js");
const webPanel = read("web/src/panels/company/PersonelAccessPanel.jsx");
const parentPanel = read("web/src/panels/school/ParentInvitePanel.jsx");
const acceptPanel = read("web/src/panels/public/AcceptParentInvitePanel.jsx");
const passengerPanel = read("web/src/panels/company/PassengerLinksPanel.jsx");
const mobileLogin = read("mobile/src/screens/LoginScreen.js");
const forcePassword = read("mobile/src/screens/ForcePasswordChangeScreen.js");
const pinChange = read("mobile/src/screens/PinChangeScreen.js");
const mobileContent = read("mobile/src/app/MobileAppContent.js");
const mobileHandlers = read("mobile/src/app/mobileAppHandlers.js");
const mobileApi = read("mobile/src/lib/api.js");
const mobilePkg = read("mobile/package.json");
const backendDrivers = read("backend/src/routes/drivers.js");
const backendPassLinks = read("backend/src/routes/passengerLinks.js");
const backendAdmin = read("backend/src/routes/admin.js");
const migrationsDir = path.join(repoRoot, "backend", "prisma", "migrations");
const migrationNames = exists("backend/prisma/migrations") ? fs.readdirSync(migrationsDir) : [];

must(rootPkg, "check:m98e3", "root package exposes check:m98e3");
must(rootPkg, "check:m98e2e", "root package keeps M98-E2E acceptance gate");
must(e2eCheck, "M98-E2E CODE PIN ACCESS ACCEPTANCE CHECK", "M98-E2E acceptance check exists");

must(runbook, "M98-E3 Kod + PIN Saha Kullanım Kanıtı", "runbook title exists");
must(runbook, "Kullanıcı kodu", "runbook mentions user code");
must(runbook, "PIN veya şifre", "runbook mentions pin or password");
must(runbook, "Personel kodu", "runbook mentions personel code");
must(runbook, "Veli kodu + PIN", "runbook mentions veli code plus pin");
must(runbook, "İlk şifreni değiştir", "runbook mentions first password change");
must(runbook, "PassengerLiveLink", "runbook mentions PassengerLiveLink");
must(runbook, "ROOM | sürücü kodu + PIN, zaten mevcut", "runbook explains room driver code pin");
must(runbook, "COMPANY | personel kodu + geçici PIN", "runbook explains company personel access");
must(runbook, "ORGANIZATION | personel kodu + geçici PIN", "runbook explains organization personel access");
must(runbook, "SCHOOL | veli kodu + geçici PIN", "runbook explains school veli access");
must(runbook, "SUPER_ADMIN | yönetici hesapları", "runbook explains super admin account flow");
must(runbook, "Bu kod ve PIN yalnızca bir kez gösterilir.", "runbook explains one-time raw display");
must(runbook, "npm run check:m98e2b", "runbook includes m98e2b command");
must(runbook, "npm run check:m98e2c", "runbook includes m98e2c command");
must(runbook, "npm --prefix mobile run check:m98e2d", "runbook includes mobile m98e2d command");
must(runbook, "npm run check:m98e2e", "runbook includes m98e2e command");
must(runbook, "npm run check:m98e3", "runbook includes m98e3 command");
must(runbook, "npm run verify:final", "runbook includes final verify command");
must(runbook, "Sorun çıkarsa ilk bakılacak yerler", "runbook includes troubleshooting section");

must(docsPrimer, "M98-E2E` code + PIN acceptance gate green", "primer marks M98-E2E acceptance gate green");
must(docsPrimer, "M98-E3` code + PIN saha / UX kanıt paketi active", "primer marks M98-E3 as active");
must(registry, "M98 kod + PIN kanıt bandı", "registry exposes M98 evidence band");
must(registry, "M98-E2E - code + PIN acceptance gate - green", "registry marks M98-E2E green");
must(registry, "M98-E3 - code + PIN saha / UX kanıt paketi - active", "registry marks M98-E3 active");
must(scriptGuide, "m98_e2e_code_pin_access_acceptance_check.js", "script guide references m98e2e acceptance check");
must(scriptGuide, "m98_e3_code_pin_field_ux_check.js", "script guide references m98e3 check");

must(backendRoute, "personelAccessRouter", "backend personel access route exists");
must(webPanel, "Personel erişimi", "web personel access panel exists");
must(webPanel, "Personel erişimi oluştur", "web personel access create action exists");
must(parentPanel, "Veli kodu + PIN", "parent invite panel uses simplified veli code language");
must(acceptPanel, "Veli kodu + PIN ile giriş", "accept parent panel uses simplified veli code language");
must(passengerPanel, "Bu akış hesap aktivasyonu değildir.", "passenger link panel is not activation");
must(passengerPanel, "tek kişiye özel süreli canlı takip linki", "passenger link panel keeps live-link wording");
must(mobileLogin, "Kullanıcı kodu", "mobile login keeps user code label");
must(mobileLogin, "Size verilen sürücü, personel veya veli kodunu girin.", "mobile login keeps helper copy");
must(mobileLogin, "PIN veya şifre", "mobile login keeps pin or password label");
must(mobilePkg, "check:m98e2d", "mobile package exposes check:m98e2d");
must(mobilePkg, "check:m98e1", "mobile package exposes check:m98e1");
must(forcePassword, "İlk şifreni değiştir", "force password screen exists");
must(pinChange, "PIN değiştir", "driver pin change screen exists");
must(mobileContent, "ForcePasswordChangeScreen", "mobile content keeps force password screen");
must(mobileContent, "PinChangeScreen", "mobile content keeps driver pin screen");
must(mobileHandlers, "acceptPersonelInvite", "mobile handlers keep personel invite accept fallback");
must(mobileApi, "acceptPersonelInvite", "mobile api exports personel invite accept helper");
must(backendDrivers, "issueDriverCredentials", "driver route still exists");
must(backendDrivers, "pinTemporary", "driver PIN flow stays intact");
must(backendPassLinks, "passengerLinksRouter", "passenger live link router stays intact");
must(backendPassLinks, "PASSENGER_LINK_CREATE", "passenger live link create action stays intact");
must(backendAdmin, "tempPassword", "super admin account create flow stays intact");
must(backendAdmin, "passwordChangeRequired", "admin user create flow still sets password change flag");

must(schema, "model Invite", "schema still keeps Invite model");
must(schema, "PERSONEL_INVITE", "schema still keeps personel invite enum");
mustNot(schema, "model PersonelAccess", "backend schema does not add personel access model");
if (migrationNames.some((name) => /m98.*e3|personel.*access/i.test(name))) {
  throw new Error(`FAIL unexpected migration for M98-E3: ${migrationNames.filter((name) => /m98.*e3|personel.*access/i.test(name)).join(", ")}`);
}
console.log("OK no new M98-E3 migration folder detected");

console.log("=== M98-E3 CODE PIN FIELD UX CHECK PASS ===");
