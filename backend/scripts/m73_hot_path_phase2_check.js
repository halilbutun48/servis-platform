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
expectAny("web/src/panels/company/WorkflowPanel.jsx", [
  "getCompanyRooms(token, { signal, take: 30",
  "getCompanyRooms(token, { signal, take: 60"
], "WorkflowPanel rooms narrowed");
expectAny("web/src/panels/company/WorkflowPanel.jsx", [
  "getCompanyOffers(token, { status, q: offersModal.q, ttlMs: 25000, take: 30 })",
  "getCompanyOffers(token, { status, q: offersModal.q, ttlMs: 20000, take: 60 })"
], "WorkflowPanel offer list narrowed");
expectAny("web/src/panels/company/GeoReviewPanel.jsx", [
  "getCompanyGeoNeedsReview(token",
  "getCompanyPersonels(token"
], "GeoReviewPanel uses shared geo/personels loaders");
expectAny("backend/src/bootstrap/rateLimits.js", ["readSummaryLimiter"], "server summary read limiter exists");
expectAny("backend/src/bootstrap/rateLimits.js", ["readPreviewLimiter"], "server preview read limiter exists");
expectAny("backend/src/bootstrap/rateLimits.js", ["readDirectoryLimiter"], "server directory read limiter exists");
console.log("=== M73 HOT PATH PHASE 2 CHECK PASS ===");
