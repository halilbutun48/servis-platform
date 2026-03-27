import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function expectContains(rel, needle, label) {
  const text = read(rel);
  if (!text.includes(needle)) fail(label);
  ok(label);
}

console.log("=== M74 HOT PATH PHASE 3 CHECK ===");
expectContains("web/src/utils/companyDataHub.js", "rooms: 40", "company data hub rooms take reduced to 40");
expectContains("web/src/utils/companyDataHub.js", "vehicles: 24", "company data hub vehicles take reduced to 24");
expectContains("web/src/utils/companyDataHub.js", "offers: 40", "company data hub offers take reduced to 40");
expectContains("web/src/utils/companyDataHub.js", "geoNeedsReview: 12", "company data hub geo review take reduced to 12");
expectContains("web/src/panels/company/GeoReviewPanel.jsx", "getCompanyGeoNeedsReview", "GeoReviewPanel uses focused geo review helper");
expectContains("web/src/panels/company/GeoReviewPanel.jsx", 'useState("NEEDS_REVIEW")', "GeoReviewPanel defaults to NEEDS_REVIEW filter");
expectContains("web/src/panels/company/WorkflowPanel.jsx", "take: 40", "WorkflowPanel market modal narrowed to take=40");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "getCompanyShifts(token, { signal, ttlMs: 20000, take: 40 })", "ShiftsPanel primary list narrowed to take=40");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "getCompanyVehicles(token, { signal, force, take: 24, ttlMs: 30000 })", "ShiftsPanel reference vehicles narrowed to take=24");
expectContains("web/src/panels/company/MapPanel.jsx", "getCompanyVehicles(token, { signal, take: 24, onlyActive: true, ttlMs: 30000 })", "MapPanel vehicle load narrowed to take=24");
expectContains("web/src/panels/company/MapPanel.jsx", "ttlMs: 45000, delayMs: 120", "MapPanel route preview cache extended to 45s");
expectContains("web/src/panels/shared/ReportsPanel.jsx", "ttlMs: 25000", "ReportsPanel frontend cache extended to 25s");
expectContains("web/src/utils/providerScores.js", "10 * 60 * 1000", "provider score client cache extended to 10m");
expectContains("backend/src/routes/companyPersonels.js", "rememberResponse(cacheKey", "company personels route uses response cache");
expectContains("backend/src/routes/offers.js", "offers-company:", "company offers route uses response cache");
expectContains("backend/src/routes/reports.js", "ttlMs: 30000", "reports summary cache extended to 30s");
expectContains("backend/src/routes/trustQuality.js", "ttlMs: 45000", "provider score cache extended to 45s");
expectContains("backend/src/server.js", "readReportLimiter", "server report read limiter exists");
expectContains("backend/src/server.js", "readScoreLimiter", "server score read limiter exists");
expectContains("backend/scripts/company_fetch_storm_check.js", "report/score read buckets", "storm check reflects M74 profile");
console.log("=== M74 HOT PATH PHASE 3 CHECK PASS ===");
