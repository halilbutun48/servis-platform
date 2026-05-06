import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("=== M98-E2C WEB PERSONEL ACCESS CHECK ===");

const rootPkg = read("package.json");
const webPkg = read("web/package.json");
const app = read("web/src/App.jsx");
const apiJs = read("web/src/api.js");
const navDock = read("web/src/layout/NavDock.jsx");
const workflowPanel = read("web/src/panels/company/WorkflowPanel.jsx");
const personelPanel = read("web/src/panels/company/PersonelAccessPanel.jsx");
const parentPanel = read("web/src/panels/school/ParentInvitePanel.jsx");
const acceptPanel = read("web/src/panels/public/AcceptParentInvitePanel.jsx");
const passengerLinksPanel = read("web/src/panels/company/PassengerLinksPanel.jsx");
const webMobileCheck = read("web/scripts/web_mobile_responsive_check.js");

const oneTimeBlock = sectionBetween(personelPanel, "Tek seferlik bilgi kartı", "Personel erişimi oluştur");
const listBlock = sectionBetween(personelPanel, "Erişim listesi", "Henüz personel erişimi yok.");

must(rootPkg, "check:m98e2c", "root package exposes check:m98e2c");
must(webPkg, "check:m98e2c", "web package exposes check:m98e2c");
must(rootPkg, "check:web-mobile", "root package keeps web mobile responsive check");
must(webPkg, "check:web-mobile", "web package keeps web mobile responsive check");

must(apiJs, "/api/company/personel-invites", "web api helper exposes company personel invite path");
must(apiJs, "/api/auth/personel-invite/info", "web api helper exposes personel invite info path");
must(apiJs, "/api/auth/personel-invite/accept", "web api helper exposes personel invite accept path");

must(app, 'const PersonelAccessPanel = lazy(() => import("./panels/company/PersonelAccessPanel"));', "app loads personel access panel");
must(app, 'if (path === "/company/personel-access") return { layout: true, node: <PersonelAccessPanel /> };', "app routes company personel access");
must(app, 'if (path === "/organization/personel-access") return { layout: true, node: <PersonelAccessPanel /> };', "app routes organization personel access");

must(navDock, "Personel Erişimi", "nav dock exposes personel access label");
must(navDock, 'path: base + "/personel-access"', "nav dock routes personel access under company base");

must(workflowPanel, "Personel erişimi", "company/organization landing shows personel access card");
must(workflowPanel, "Personele 7 gün geçerli kullanıcı kodu ve geçici PIN verin.", "company/organization landing explains 7-day code pin access");
must(workflowPanel, 'companyPath(me, "/personel-access")', "company/organization landing links to personel access panel");

must(personelPanel, "Personel erişimi", "personel access panel title exists");
must(personelPanel, "Personel erişimi oluştur", "personel access panel create action exists");
must(personelPanel, "Bu kod ve PIN yalnızca şimdi gösterilir.", "personel access panel one-time disclosure exists");
must(personelPanel, "Kullanıcı kodu", "personel access panel shows user code label");
must(personelPanel, "Geçici PIN", "personel access panel shows temp PIN label");
must(personelPanel, "7 gün geçerli", "personel access panel shows seven day validity");
must(personelPanel, "accessCodeMasked", "personel access panel keeps masked code logic");
must(personelPanel, "statusLabel", "personel access panel keeps status labels");
must(personelPanel, "İptal et", "personel access panel revoke action exists");
must(personelPanel, "companyKind === \"ORGANIZATION\"", "personel access panel supports organization scope");
must(oneTimeBlock, "Kullanıcı kodu", "one-time block shows user code");
must(oneTimeBlock, "Geçici PIN", "one-time block shows temp PIN");
must(oneTimeBlock, "7 gün geçerli", "one-time block shows validity");
mustNot(listBlock, "Geçici PIN", "list block does not show raw PIN");
mustNot(listBlock, "Kullanıcı kodu", "list block does not repeat raw user code");
must(listBlock, "codeMasked", "list block uses masked code display");
must(listBlock, "statusLabel", "list block shows masked status text");
must(listBlock, "İptal et", "list block exposes revoke action");

must(parentPanel, "Veli kodu + PIN", "parent invite panel uses simplified product language");
must(parentPanel, "Yeni veli kodu üret", "parent invite panel create copy is simplified");
must(parentPanel, "7 gün geçerli veli kodu ve geçici PIN üretilir", "parent invite panel explains seven day code pin");
must(parentPanel, "Veli kodu", "parent invite panel labels the code as veli code");

must(acceptPanel, "Veli kodu + PIN ile giriş", "accept parent panel uses simplified product language");
must(acceptPanel, "Okulun verdiği veli kodu ve PIN ile giriş yapabilirsin.", "accept parent panel explains simplified login");
must(acceptPanel, "Açtığın veli kodu linki doğrulanıyor.", "accept parent panel explains link verification");
must(acceptPanel, "Veli Kodu", "accept parent panel labels code as veli code");

must(passengerLinksPanel, "Bu akış hesap aktivasyonu değildir.", "passenger links panel is explicitly not activation");
must(passengerLinksPanel, "tek kişiye özel süreli canlı takip linki", "passenger links panel keeps live-link wording");

must(webMobileCheck, "global CSS turns nav dock into chip strip", "web mobile responsive check still covers nav dock mobile behavior");

console.log("=== M98-E2C WEB PERSONEL ACCESS CHECK PASS ===");
