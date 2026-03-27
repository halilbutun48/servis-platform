import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }

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

  if (hub.includes("rooms: 80") && hub.includes("vehicles: 60") && hub.includes("offers: 80")) ok("companyDataHub lower first-load takes exist"); else fail("companyDataHub lower first-load takes exist");
  if (workflow.includes("take: 80")) ok("WorkflowPanel offers modal take reduced to 80"); else fail("WorkflowPanel offers modal take reduced to 80");
  if (agreements.includes("take: 80")) ok("AgreementsPanel room directory take reduced to 80"); else fail("AgreementsPanel room directory take reduced to 80");
  if (shifts.includes("take: 60") && shifts.includes("take: 80")) ok("ShiftsPanel reference loads reduced"); else fail("ShiftsPanel reference loads reduced");
  if (map.includes("take: 60, onlyActive: true") && map.includes("ttlMs: 15000")) ok("MapPanel hot endpoints reduced + route preview cache extended"); else fail("MapPanel hot endpoints reduced + route preview cache extended");
  if (serviceEval.includes("take: 40")) ok("ServiceEvaluationPanel items first-load take reduced"); else fail("ServiceEvaluationPanel items first-load take reduced");
  if (reports.includes("rememberResponse") && reports.includes("reportCacheKey")) ok("Reports summary uses response cache"); else fail("Reports summary uses response cache");
  if (routePreview.includes("shift-route-preview:") && routePreview.includes("ttlMs: 12000")) ok("Route preview backend response cache exists"); else fail("Route preview backend response cache exists");
  if (overview.includes("take: 12")) ok("Company overview list payloads narrowed to 12"); else fail("Company overview list payloads narrowed to 12");
  if (storm.includes("/api/shifts?take=80") && storm.includes("/api/vehicles?onlyActive=1&take=60") && storm.includes("/api/offers/company?status=OPEN,COUNTERED&take=80")) ok("Storm profile updated for M72 hot-path sizes"); else fail("Storm profile updated for M72 hot-path sizes");
  if (scale.includes("reports summary endpoints use response cache")) ok("Scale readiness check knows reports cache signal"); else fail("Scale readiness check knows reports cache signal");

  console.log("=== M72 HOT ENDPOINT REDUCTION CHECK PASS ===");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
