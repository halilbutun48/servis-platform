import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function banner(title) { console.log(`\n=== ${title} ===`); }
function ok(label) { console.log(`OK ${label}`); }
function info(label) { console.log(`INFO ${label}`); }
function warn(label) { console.log(`WARN ${label}`); }
function fail(label) { throw new Error(`FAIL ${label}`); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }

function normalizeEndpoint(raw) {
  return String(raw || "")
    .replace(/\$\{[^}]+\}/g, "{var}")
    .replace(/\/\d+(?=\/|$)/g, "/{id}")
    .replace(/\/\{var\}(?=\/|$)/g, "/{var}");
}
function familyOf(raw) { return normalizeEndpoint(String(raw || "").split("?")[0]); }
function parseTake(raw) { const m = String(raw || "").match(/[?&]take=(\d+)/); return m ? Number(m[1]) : null; }

function parseCalls(text) {
  const out = [];
  const re = /(cachedGet|api)\(\s*([`"])(.+?)\2/gms;
  for (const m of text.matchAll(re)) {
    const rawUrl = m[3];
    if (!rawUrl.startsWith("/api/")) continue;
    const start = m.index ?? 0;
    const tail = text.slice(start, Math.min(text.length, start + 260));
    const methodMatch = tail.match(/method\s*:\s*["'`]([A-Z]+)["'`]/);
    const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
    if (method !== "GET") continue;
    const line = text.slice(0, start).split(/\r?\n/).length;
    out.push({ rawUrl, family: familyOf(rawUrl), take: parseTake(rawUrl), line });
  }
  return out;
}

function initialLoadCallCount(text) {
  let total = 0;
  const initBlocks = [
    ...text.matchAll(/useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[[^\]]*\]\s*\)/g),
    ...text.matchAll(/async function load\w*\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g),
  ];
  for (const m of initBlocks) total += ((m[1] || "").match(/(?:cachedGet|api)\(\s*[`"]\/api\//g) || []).length;
  return total;
}

const targetFiles = [
  "backend/src/routes/companyOverview.js",
  "backend/src/routes/rooms.js",
  "backend/src/routes/shifts/shared.js",
  "backend/src/routes/agreements.js",
  "backend/src/routes/offers.js",
  "backend/src/routes/companyPersonels.js",
  "backend/src/routes/trustQuality.js",
  "backend/src/routes/vehicles.js",
  "web/src/utils/companyDataHub.js",
  "web/src/panels/company/WorkflowPanel.jsx",
  "web/src/panels/company/CommercialFlowPanel.jsx",
  "web/src/panels/company/ShiftsPanel.jsx",
  "web/src/panels/company/AgreementsPanel.jsx",
  "web/src/panels/company/MapPanel.jsx",
  "web/src/components/RoutePreviewModal.jsx",
];

const panelFiles = [
  "web/src/panels/company/WorkflowPanel.jsx",
  "web/src/panels/company/CommercialFlowPanel.jsx",
  "web/src/panels/company/ShiftsPanel.jsx",
  "web/src/panels/company/AgreementsPanel.jsx",
  "web/src/panels/company/ServiceEvaluationPanel.jsx",
  "web/src/panels/company/GeoReviewPanel.jsx",
  "web/src/panels/company/MapPanel.jsx",
  "web/src/panels/shared/ReportsPanel.jsx",
  "web/src/components/RoutePreviewModal.jsx",
];

function main() {
  banner("SCALE READINESS CHECK");
  info("checking required files");
  targetFiles.forEach((rel) => { if (!exists(rel)) fail(`${rel} exists`); ok(`${rel} exists`); });

  const panelReports = [];
  const familyToFiles = new Map();
  const heavyCalls = [];
  for (const rel of panelFiles) {
    const text = read(rel);
    const calls = parseCalls(text);
    const report = { rel, calls, initialLoadCalls: initialLoadCallCount(text), abortController: text.includes("new AbortController()") || text.includes("controller.abort()"), autoReloads: (text.match(/useAutoReload\(/g) || []).length };
    panelReports.push(report);
    for (const call of calls) {
      const files = familyToFiles.get(call.family) || new Set();
      files.add(rel);
      familyToFiles.set(call.family, files);
      if ((call.take || 0) >= 120 || ["/api/company/personels", "/api/vehicles", "/api/trust-quality/company/items", "/api/shifts/{id}/route-preview"].includes(call.family)) heavyCalls.push({ rel, ...call });
    }
  }

  info("checking summary-first and request hygiene signals");
  const dataHub = read("web/src/utils/companyDataHub.js");
  if (dataHub.includes("/api/company/overview/workflow-summary")) ok("company workflow summary helper exists"); else fail("company workflow summary helper exists");
  if (dataHub.includes("/api/company/overview/commercial-flow-summary")) ok("commercial flow summary helper exists"); else fail("commercial flow summary helper exists");

  const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
  if (workflow.includes("getCompanyWorkflowSummary")) ok("WorkflowPanel uses workflow summary endpoint"); else fail("WorkflowPanel uses workflow summary endpoint");
  if (!workflow.includes("loadRooms(controller.signal);\n      loadSummary") && workflow.includes("guidedOpen")) ok("WorkflowPanel room directory moved behind guided open"); else fail("WorkflowPanel room directory moved behind guided open");

  const commercial = read("web/src/panels/company/CommercialFlowPanel.jsx");
  if (commercial.includes("getCompanyCommercialFlowSummary")) ok("CommercialFlowPanel uses commercial flow summary endpoint"); else fail("CommercialFlowPanel uses commercial flow summary endpoint");

  const mapPanel = read("web/src/panels/company/MapPanel.jsx");
  if (mapPanel.includes("take: 20") && mapPanel.includes("onlyActive: true")) ok("MapPanel vehicles load narrowed to active/take=20"); else warn("MapPanel vehicles load narrowing not detected");

  const routePreviewModal = read("web/src/components/RoutePreviewModal.jsx");
  if (routePreviewModal.includes("getShiftRoutePreview") && routePreviewModal.includes("ttlMs: 30000") && routePreviewModal.includes("setTimeout(() =>")) ok("RoutePreviewModal uses shared helper + longer cache"); else fail("RoutePreviewModal uses shared helper + longer cache");

  const providerScores = read("web/src/utils/providerScores.js");
  if (providerScores.includes("/api/trust-quality/provider-scores")) ok("provider score backend batch endpoint is used"); else fail("provider score backend batch endpoint is used");

  info("panel entry load profile");
  panelReports.sort((a,b) => b.initialLoadCalls - a.initialLoadCalls).forEach((r) => {
    const label = `${r.rel} -> initialLoadCalls=${r.initialLoadCalls}, autoReloads=${r.autoReloads}, abort=${r.abortController ? "yes" : "no"}`;
    if (r.initialLoadCalls >= 5) warn(label); else ok(label);
  });

  info("duplicate endpoint families across panels");
  const duplicated = Array.from(familyToFiles.entries()).map(([family, files]) => ({ family, files: Array.from(files).sort() })).filter((x) => x.files.length >= 2).sort((a,b) => b.files.length - a.files.length || a.family.localeCompare(b.family));
  duplicated.slice(0, 12).forEach((row) => warn(`${row.family} reused by ${row.files.length} files`));

  info("heavy reads still visible in UI code");
  heavyCalls.sort((a,b) => (b.take || 0) - (a.take || 0) || a.family.localeCompare(b.family)).slice(0, 20).forEach((row) => warn(`${row.rel}:${row.line} -> ${row.rawUrl}`));

  info("backend collection-read capability scan");
  const agreementsRoute = read("backend/src/routes/agreements.js");
  const offersRoute = read("backend/src/routes/offers.js");
  const companyPersonelsRoute = read("backend/src/routes/companyPersonels.js");
  const trustRoute = read("backend/src/routes/trustQuality.js");
  const vehiclesRoute = read("backend/src/routes/vehicles.js");
  const overviewRoute = read("backend/src/routes/companyOverview.js");
  const reportsRoute = read("backend/src/routes/reports.js");

  if (agreementsRoute.includes("req.query.q") && agreementsRoute.includes("req.query.take")) ok("agreements endpoint has q + take"); else fail("agreements endpoint has q + take");
  if (offersRoute.includes("req.query.q") && offersRoute.includes("req.query.take")) ok("company offers endpoint has q + take"); else fail("company offers endpoint has q + take");
  if (companyPersonelsRoute.includes("req.query.q") && companyPersonelsRoute.includes("req.query.take")) ok("company personels endpoint has q + take"); else fail("company personels endpoint has q + take");
  if (vehiclesRoute.includes("req.query?.q") && vehiclesRoute.includes("req.query?.take")) ok("vehicles endpoint has q + take"); else fail("vehicles endpoint has q + take");
  if (trustRoute.includes("pendingOnly") && (trustRoute.includes("req.query.take") || trustRoute.includes("req.query?.take")) && (trustRoute.includes("req.query.pendingOnly") || trustRoute.includes("req.query?.pendingOnly"))) ok("trust-quality items endpoint supports pendingOnly + take"); else fail("trust-quality items endpoint supports pendingOnly + take");
  if (overviewRoute.includes("workflow-summary") && overviewRoute.includes("commercial-flow-summary")) ok("company overview summary endpoints exist"); else fail("company overview summary endpoints exist");
  if (reportsRoute.includes("rememberResponse") && reportsRoute.includes("reportCacheKey") && reportsRoute.includes("ttlMs: 30000")) ok("reports summary endpoints use longer response cache"); else fail("reports summary endpoints use longer response cache");
  const serverText = read("backend/src/server.js");
  if (serverText.includes("readSummaryLimiter") && serverText.includes("readPreviewLimiter") && serverText.includes("readDirectoryLimiter") && serverText.includes("readReportLimiter") && serverText.includes("readScoreLimiter") && serverText.includes("readOfferLimiter") && serverText.includes("readPeopleLimiter") && serverText.includes("readLiveShiftLimiter")) ok("server uses expanded route-based read limit buckets"); else fail("server uses expanded route-based read limit buckets");

  console.log("\nOK SCALE READINESS CHECK PASS");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
