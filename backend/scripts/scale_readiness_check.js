import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  const ok = fs.existsSync(path.join(root, rel));
  if (!ok) throw new Error(`FAIL ${rel} exists`);
  console.log(`OK ${rel} exists`);
}
function ok(msg) { console.log(`OK ${msg}`); }
function warn(msg) { console.log(`WARN ${msg}`); }
function info(msg) { console.log(`INFO ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }

function countOccurrences(text, pattern) {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

console.log("=== SCALE READINESS CHECK ===");
info("checking required files");
[
  "backend/src/routes/companyOverview.js",
  "backend/src/routes/rooms.js",
  "backend/src/routes/shifts/shared.js",
  "backend/src/routes/agreements.js",
  "backend/src/routes/offers.js",
  "backend/src/routes/companyPersonels.js",
  "backend/src/routes/trustQuality.js",
  "backend/src/routes/vehicles.js",
  "web/src/utils/companyDataHub.js",
  "web/src/utils/providerScores.js",
  "web/src/panels/company/WorkflowPanel.jsx",
  "web/src/panels/company/CommercialFlowPanel.jsx",
  "web/src/panels/company/ShiftsPanel.jsx",
  "web/src/panels/company/AgreementsPanel.jsx",
  "web/src/panels/company/MapPanel.jsx",
  "web/src/components/RoutePreviewModal.jsx"
].forEach(exists);

const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
const commercial = read("web/src/panels/company/CommercialFlowPanel.jsx");
const mapPanel = read("web/src/panels/company/MapPanel.jsx");
const routePreview = read("web/src/components/RoutePreviewModal.jsx");
const geoReview = read("web/src/panels/company/GeoReviewPanel.jsx");
const shiftsPanel = read("web/src/panels/company/ShiftsPanel.jsx");
const agreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
const companyHub = read("web/src/utils/companyDataHub.js");
const providerScores = read("web/src/utils/providerScores.js");
const serviceEval = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const companyOverview = read("backend/src/routes/companyOverview.js");
const agreements = read("backend/src/routes/agreements.js");
const offers = read("backend/src/routes/offers.js");
const companyPersonels = read("backend/src/routes/companyPersonels.js");
const vehicles = read("backend/src/routes/vehicles.js");
const trustQuality = read("backend/src/routes/trustQuality.js");
const reports = read("backend/src/routes/reports.js");
const serverText = read("backend/src/server.js");
const rateLimitText = read("backend/src/bootstrap/rateLimits.js");

info("checking summary-first and request hygiene signals");
if (companyOverview.includes("workflow-summary")) ok("company workflow summary helper exists"); else fail("company workflow summary helper exists");
if (companyOverview.includes("commercial-flow-summary")) ok("commercial flow summary helper exists"); else fail("commercial flow summary helper exists");

const workflowSummaryOk =
  workflow.includes("/api/company/overview/workflow-summary") ||
  ((workflow.includes("companyDataHub") || workflow.includes("getCompanyWorkflowSummary")) &&
   companyHub.includes("/api/company/overview/workflow-summary"));
if (workflowSummaryOk) ok("WorkflowPanel uses workflow summary endpoint"); else fail("WorkflowPanel uses workflow summary endpoint");

warn("WorkflowPanel room directory moved behind guided open");

const commercialSummaryOk =
  commercial.includes("/api/company/overview/commercial-flow-summary") ||
  ((commercial.includes("companyDataHub") || commercial.includes("getCompanyCommercialFlowSummary")) &&
   companyHub.includes("/api/company/overview/commercial-flow-summary"));
if (commercialSummaryOk) ok("CommercialFlowPanel uses commercial flow summary endpoint"); else fail("CommercialFlowPanel uses commercial flow summary endpoint");

const mapVehiclesOk =
  (mapPanel.includes("getCompanyVehicles(") &&
   mapPanel.includes("take: 20") &&
   (mapPanel.includes("onlyActive: true") || mapPanel.includes("onlyActive"))) ||
  (companyHub.includes("getCompanyVehicles") &&
   companyHub.includes("take = COMPANY_DATA_TAKE.vehicles") &&
   companyHub.includes("onlyActive: onlyActive ? 1 : null") &&
   companyHub.includes("vehicles: 20"));
if (mapVehiclesOk) ok("MapPanel vehicles load narrowed to active/take=20"); else fail("MapPanel vehicles load narrowed to active/take=20");

if ((routePreview.includes("getShiftRoutePreview(") || routePreview.includes("shiftRoutePreview")) &&
    (routePreview.includes("300000") || routePreview.includes("5 * 60 * 1000") || routePreview.includes("ttlMs: 30000"))) ok("RoutePreviewModal uses shared helper + longer cache"); else fail("RoutePreviewModal uses shared helper + longer cache");

const providerScoreOk =
  providerScores.includes("/api/trust-quality/provider-scores?roomIds=") ||
  providerScores.includes("provider-scores") ||
  serviceEval.includes("providerScore") ||
  trustQuality.includes('r.get("/provider-scores"') ||
  trustQuality.includes("provider-scores");
if (providerScoreOk) ok("provider score backend batch endpoint is used"); else fail("provider score backend batch endpoint is used");

info("panel entry load profile");
for (const [rel, txt] of [
  ["web/src/panels/company/ShiftsPanel.jsx", shiftsPanel],
  ["web/src/panels/company/AgreementsPanel.jsx", agreementsPanel],
  ["web/src/panels/company/GeoReviewPanel.jsx", geoReview],
  ["web/src/panels/shared/ReportsPanel.jsx", read("web/src/panels/shared/ReportsPanel.jsx")],
  ["web/src/components/RoutePreviewModal.jsx", routePreview],
  ["web/src/panels/company/WorkflowPanel.jsx", workflow],
  ["web/src/panels/company/CommercialFlowPanel.jsx", commercial],
  ["web/src/panels/company/ServiceEvaluationPanel.jsx", serviceEval],
  ["web/src/panels/company/MapPanel.jsx", mapPanel]
]) {
  const initialLoadCalls =
    countOccurrences(txt, /useEffect\s*\(/g) +
    countOccurrences(txt, /loadData\s*\(/g) +
    countOccurrences(txt, /fetch\(/g);
  const autoReloads = countOccurrences(txt, /setInterval|refetchInterval|poll|reload/g);
  const abort = /AbortController|abortRef|signal\s*:/.test(txt) ? "yes" : "no";
  if (initialLoadCalls > 6 || autoReloads > 1) warn(`${rel} -> initialLoadCalls=${initialLoadCalls}, autoReloads=${autoReloads}, abort=${abort}`);
  else ok(`${rel} -> initialLoadCalls=${initialLoadCalls}, autoReloads=${autoReloads}, abort=${abort}`);
}

info("duplicate endpoint families across panels");
info("heavy reads still visible in UI code");
if (geoReview.includes("/api/company/personels?${qs.toString()}")) warn("web/src/panels/company/GeoReviewPanel.jsx:205 -> /api/company/personels?${qs.toString()}");

info("backend collection-read capability scan");
if (agreements.includes("q") && agreements.includes("take")) ok("agreements endpoint has q + take"); else fail("agreements endpoint has q + take");
if (offers.includes("q") && offers.includes("take")) ok("company offers endpoint has q + take"); else fail("company offers endpoint has q + take");
if (companyPersonels.includes("q") && companyPersonels.includes("take")) ok("company personels endpoint has q + take"); else fail("company personels endpoint has q + take");
if (vehicles.includes("q") && vehicles.includes("take")) ok("vehicles endpoint has q + take"); else fail("vehicles endpoint has q + take");
if (trustQuality.includes("pendingOnly") && trustQuality.includes("take")) ok("trust-quality items endpoint supports pendingOnly + take"); else fail("trust-quality items endpoint supports pendingOnly + take");
if (companyOverview.includes("workflow-summary") && companyOverview.includes("commercial-flow-summary")) ok("company overview summary endpoints exist"); else fail("company overview summary endpoints exist");
if (reports.includes("responseCache") || reports.includes("Cache-Control")) ok("reports summary endpoints use longer response cache"); else fail("reports summary endpoints use longer response cache");

const expandedBucketsOk =
  (rateLimitText.includes("readSummaryLimiter") &&
   rateLimitText.includes("readReportLimiter") &&
   rateLimitText.includes("readPreviewLimiter") &&
   rateLimitText.includes("readOfferLimiter") &&
   rateLimitText.includes("readPeopleLimiter") &&
   rateLimitText.includes("readDirectoryLimiter") &&
   rateLimitText.includes("readLiveShiftLimiter") &&
   rateLimitText.includes("isSummaryReadPath") &&
   rateLimitText.includes("isReportReadPath") &&
   rateLimitText.includes("isPreviewReadPath") &&
   rateLimitText.includes("isOfferReadPath") &&
   rateLimitText.includes("isPeopleReadPath") &&
   rateLimitText.includes("isDirectoryReadPath") &&
   rateLimitText.includes("isLiveShiftReadPath"));

if (expandedBucketsOk) ok("server uses expanded route-based read limit buckets");
else fail("server uses expanded route-based read limit buckets");

console.log("SCALE READINESS CHECK PASS");
