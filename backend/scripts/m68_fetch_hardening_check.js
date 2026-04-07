import fs from "fs";
import path from "path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
let failed = false;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  failed = true;
  console.error(`FAIL ${msg}`);
}

function expectContains(rel, pattern, msg) {
  const text = read(rel);
  if (includesText(text, pattern)) ok(msg);
  else fail(msg);
}

function expectNotContains(rel, pattern, msg) {
  const text = read(rel);
  if (!includesText(text, pattern)) ok(msg);
  else fail(msg);
}

function expectContainsAny(rel, patterns, msg) {
  const text = read(rel);
  if (patterns.some((p) => includesText(text, p))) ok(msg);
  else fail(msg);
}

console.log("=== M68 FETCH HARDENING CHECK ===");

expectContains("web/src/utils/companyDataHub.js", "export function getCompanyRooms", "companyDataHub rooms loader exists");
expectContains("web/src/utils/companyDataHub.js", "export function getCompanyShifts", "companyDataHub shifts loader exists");
expectContains("web/src/utils/companyDataHub.js", "export function getCompanyOffers", "companyDataHub offers loader exists");
expectContainsAny("web/src/utils/providerScores.js", ["/api/trust-quality/provider-scores?roomIds=", "provider-scores"], "provider score endpoint is used on web");
expectContains("backend/src/routes/trustQuality.js", 'r.get("/provider-scores"', "trust-quality provider score endpoint exists");
expectContains("backend/src/routes/trustQuality.js", "rememberResponse", "trust-quality response cache enabled");
expectContains("backend/src/routes/companyPersonels.js", "const q = qSearchSchema.parse(req.query.q);", "company personels supports q");
expectContains("backend/src/routes/companyPersonels.js", "const take = qTakeSchema.parse(req.query.take)", "company personels supports take");
expectContains("backend/src/ops/trustQualityManifest.js", "buildProviderScoreMapFromEvaluations", "trust-quality provider score aggregation helper exists");

expectContains("web/src/panels/company/WorkflowPanel.jsx", "getCompanyOffers", "workflow panel uses shared company offers loader");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "getCompanyShifts", "shifts panel uses shared company shifts loader");
expectContains("web/src/panels/company/AgreementsPanel.jsx", "getCompanyAgreements", "agreements panel uses shared company agreements loader");
expectContainsAny("web/src/panels/company/CommercialFlowPanel.jsx", ["getCompanyOffers", "getCompanyCommercialFlowSummary", "summary?.cards", "summary?.items"], "commercial flow uses shared offers loader or summary-first commercial flow loader");
expectContains("web/src/panels/company/GeoReviewPanel.jsx", "getCompanyPersonels", "geo review uses shared company personels loader");
expectContains("web/src/panels/company/ServiceEvaluationPanel.jsx", "getCompanyTrustQualityItems", "service evaluation uses shared trust-quality loader");
expectContains("web/src/panels/company/MapPanel.jsx", "getCompanyMapShifts", "map panel uses shared map shifts loader");

expectNotContains("web/src/panels/company/WorkflowPanel.jsx", "/api/offers/company?status=OPEN,COUNTERED&take=800", "workflow panel heavy open offers query removed");
expectNotContains("web/src/panels/company/CommercialFlowPanel.jsx", "/api/shifts?take=300", "commercial flow heavy shifts query removed");
expectNotContains("web/src/panels/company/ShiftsPanel.jsx", "/api/rooms?take=500", "shifts panel heavy rooms query removed");

if (failed) {
  console.error("=== M68 FETCH HARDENING CHECK FAIL ===");
  process.exit(1);
}

console.log("=== M68 FETCH HARDENING CHECK PASS ===");
