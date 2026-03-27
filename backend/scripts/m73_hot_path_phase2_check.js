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
function expectContains(rel, needle, label) {
  const text = read(rel);
  if (!text.includes(needle)) fail(label);
  ok(label);
}

console.log("=== M73 HOT PATH PHASE 2 CHECK ===");
expectContains("web/src/utils/companyDataHub.js", "rooms: 60", "company data hub rooms take reduced to 60");
expectContains("web/src/utils/companyDataHub.js", "vehicles: 40", "company data hub vehicles take reduced to 40");
expectContains("web/src/utils/companyDataHub.js", "offers: 60", "company data hub offers take reduced to 60");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "getCompanyShifts(token, { signal, ttlMs: 15000, take: 60 })", "ShiftsPanel primary list narrowed to take=60");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "getCompanyVehicles(token, { signal, force, take: 40, ttlMs: 20000 })", "ShiftsPanel reference vehicles narrowed to take=40");
expectContains("web/src/panels/company/WorkflowPanel.jsx", "take: 60", "WorkflowPanel market modal narrowed to take=60");
expectContains("web/src/panels/company/MapPanel.jsx", "getCompanyVehicles(token, { signal, take: 40, onlyActive: true, ttlMs: 20000 })", "MapPanel vehicle load narrowed to take=40");
expectContains("web/src/panels/company/MapPanel.jsx", "ttlMs: 30000, delayMs: 80", "MapPanel route preview cache extended");
expectContains("backend/src/routes/reports.js", "ttlMs: 20000", "reports summary cache extended to 20s");
expectContains("backend/src/routes/shifts/people.js", "ttlMs: 30000, scope: routePreviewScope(req.user)", "route preview backend cache extended to 30s");
expectContains("backend/src/server.js", "readSummaryLimiter", "server summary read limiter exists");
expectContains("backend/src/server.js", "readPreviewLimiter", "server preview read limiter exists");
expectContains("backend/src/server.js", "readDirectoryLimiter", "server directory read limiter exists");
expectContains("backend/scripts/company_fetch_storm_check.js", "route-based read buckets", "storm check reflects M73 profile");
console.log("=== M73 HOT PATH PHASE 2 CHECK PASS ===");
