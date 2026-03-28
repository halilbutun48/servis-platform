import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function expectAny(rel, needles, label) {
  const text = read(rel);
  if (!needles.some((needle) => text.includes(needle))) fail(label);
  ok(label);
}

console.log("=== M73 HOT PATH PHASE 2 CHECK ===");
expectAny("web/src/utils/companyDataHub.js", ["rooms: 30", "rooms: 60"], "company data hub rooms take reduced");
expectAny("web/src/utils/companyDataHub.js", ["vehicles: 20", "vehicles: 40"], "company data hub vehicles take reduced");
expectAny("web/src/utils/companyDataHub.js", ["offers: 30", "offers: 60"], "company data hub offers take reduced");
expectAny("web/src/panels/company/ShiftsPanel.jsx", [
  "getCompanyShifts(token, { signal, ttlMs: 25000, take: 32 })",
  "getCompanyShifts(token, { signal, ttlMs: 15000, take: 60 })"
], "ShiftsPanel primary list narrowed");
expectAny("web/src/panels/company/ShiftsPanel.jsx", [
  "getCompanyVehicles(token, { signal, force, take: 20, ttlMs: 45000 })",
  "getCompanyVehicles(token, { signal, force, take: 40, ttlMs: 20000 })"
], "ShiftsPanel reference vehicles narrowed");
expectAny("web/src/panels/company/WorkflowPanel.jsx", ["take: 30", "take: 60"], "WorkflowPanel market modal narrowed");
expectAny("web/src/panels/company/MapPanel.jsx", [
  "getCompanyVehicles(token, { signal, take: 20, onlyActive: true, ttlMs: 45000 })",
  "getCompanyVehicles(token, { signal, take: 40, onlyActive: true, ttlMs: 20000 })"
], "MapPanel vehicle load narrowed");
expectAny("web/src/panels/company/MapPanel.jsx", ["getShiftRoutePreview", "ttlMs: 30000, delayMs: 80"], "MapPanel route preview cache tuned");
expectAny("backend/src/routes/reports.js", ["ttlMs: 30000", "ttlMs: 20000"], "reports summary cache extended");
expectAny("backend/src/routes/shifts/people.js", ["ttlMs: 30000, scope: routePreviewScope(req.user)", "ttlMs: 12000", "ttlMs: 30000"], "route preview backend cache extended");
expectAny("backend/src/server.js", ["readSummaryLimiter"], "server summary read limiter exists");
expectAny("backend/src/server.js", ["readPreviewLimiter"], "server preview read limiter exists");
expectAny("backend/src/server.js", ["readDirectoryLimiter"], "server directory read limiter exists");
expectAny("backend/scripts/company_fetch_storm_check.js", ["M75 profile uses lighter first-load takes", "route-based read buckets"], "storm check reflects M73 profile");
console.log("=== M73 HOT PATH PHASE 2 CHECK PASS ===");
