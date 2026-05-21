import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");


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

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function hasAny(txt, needles) { return needles.some((n) => txt.includes(n)); }

function main() {
  console.log("=== M72 HOT ENDPOINT REDUCTION CHECK ===");

  const hub = read("web/src/utils/companyDataHub.js");
  const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
  const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
  const shifts = read("web/src/panels/company/ShiftsPanel.jsx");
  const map = read("web/src/panels/company/MapPanel.jsx");
  const serviceEval = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
  const reports = read("backend/src/routes/reports.js");
  const routePreview = read("backend/src/routes/shifts/people.js");
  const storm = read("backend/scripts/company_fetch_storm_check.js");
  const scale = read("backend/scripts/scale_readiness_check.js");
  const overview = read("backend/src/routes/companyOverview.js");

  if (includesText(hub, "rooms: 30") && includesText(hub, "vehicles: 20") && includesText(hub, "offers: 30")) ok("companyDataHub lower first-load takes exist"); else fail("companyDataHub lower first-load takes exist");
  if (includesText(workflow, "take: 30")) ok("WorkflowPanel offers modal take reduced to 30"); else fail("WorkflowPanel offers modal take reduced to 30");
  if (includesText(agreements, "take: 30")) ok("AgreementsPanel room directory take reduced to 30"); else fail("AgreementsPanel room directory take reduced to 30");
  if (includesText(shifts, "take: 20") && includesText(shifts, "take: 30") && includesText(shifts, "take: 32")) ok("ShiftsPanel reference loads reduced"); else fail("ShiftsPanel reference loads reduced");
  if (includesText(map, "take: 20, onlyActive: true") && hasAny(map, ["ttlMs: 45000", "ttlMs: 15000"])) ok("MapPanel hot endpoints reduced + cache tuned"); else fail("MapPanel hot endpoints reduced + cache tuned");
  if (hasAny(serviceEval, ["take: 12", "take: 24", "take: 40"])) ok("ServiceEvaluationPanel items first-load take reduced"); else fail("ServiceEvaluationPanel items first-load take reduced");
  if (includesText(reports, "rememberResponse") && includesText(reports, "reportCacheKey")) ok("Reports summary uses response cache"); else fail("Reports summary uses response cache");
  if (includesText(routePreview, "shift-route-preview:") && hasAny(routePreview, ["ttlMs: 30000", "ttlMs: 12000"])) ok("Route preview backend response cache exists"); else fail("Route preview backend response cache exists");
  if (hasAny(overview, ["take: 8", "take: 12"])) ok("Company overview list payloads narrowed"); else fail("Company overview list payloads narrowed");
  if (includesText(storm, "/api/shifts?take=32") && includesText(storm, "/api/vehicles?onlyActive=1&take=20") && includesText(storm, "/api/offers/company?status=OPEN,COUNTERED&take=30")) ok("Storm profile updated for M72 hot-path sizes"); else fail("Storm profile updated for M72 hot-path sizes");
  if (hasAny(scale, ["reports summary endpoints use response cache", "reports summary endpoints use longer response cache"])) ok("Scale readiness check knows reports cache signal"); else fail("Scale readiness check knows reports cache signal");

  console.log("=== M72 HOT ENDPOINT REDUCTION CHECK PASS ===");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
