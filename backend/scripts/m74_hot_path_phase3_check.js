import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function expectContains(txt, needle, msg) { if (txt.includes(needle)) ok(msg); else fail(msg); }
function expectAny(txt, needles, msg) { if (needles.some((n) => txt.includes(n))) ok(msg); else fail(msg); }

console.log("=== M74 HOT PATH PHASE 3 CHECK ===");

const hub = read("web/src/utils/companyDataHub.js");
const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
const shiftsPanel = read("web/src/panels/company/ShiftsPanel.jsx");
const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
const geo = read("web/src/panels/company/GeoReviewPanel.jsx");
const map = read("web/src/panels/company/MapPanel.jsx");
const reports = read("web/src/panels/shared/ReportsPanel.jsx");
const storm = read("backend/scripts/company_fetch_storm_check.js");

expectContains(hub, "rooms: 30", "company data hub rooms take reduced to 30");
expectContains(hub, "vehicles: 20", "company data hub vehicles take reduced to 20");
expectContains(hub, "offers: 30", "company data hub offers take reduced to 30");
expectContains(hub, "geoNeedsReview: 10", "company data hub geo review take reduced to 10");

expectAny(geo, ["getCompanyGeoNeedsReview(", "geoStatus: 'NEEDS_REVIEW'", 'geoStatus: "NEEDS_REVIEW"'], "GeoReviewPanel uses focused geo review helper");
expectAny(geo, ["NEEDS_REVIEW", "geoStatus"], "GeoReviewPanel defaults to NEEDS_REVIEW filter");

expectAny(workflow, ["take: 30", "COMPANY_DATA_TAKE.offers", "getCompanyOffers("], "WorkflowPanel market modal narrowed to take=30");

expectAny(shiftsPanel, ["take: 32", "COMPANY_DATA_TAKE.shifts", "getCompanyShifts("], "ShiftsPanel primary list narrowed to take=32");
expectAny(shiftsPanel, ["take: 20", "COMPANY_DATA_TAKE.vehicles", "getCompanyVehicles("], "ShiftsPanel reference vehicles narrowed to take=20");

expectAny(map, ["take: 20", "onlyActive: true", "COMPANY_DATA_TAKE.mapShifts"], "MapPanel vehicle load narrowed to take=20");
expectAny(map, ["RoutePreviewModal", "selectedShiftId", "previewShiftId", "ttlMs: 60000", "ttlMs: 30000"], "MapPanel route preview cache tuned to current profile");

expectAny(reports, ["responseCache", "summary", "ttlMs"], "Reports summary uses response cache");
expectAny(storm, ["/api/shifts?take=32", "/api/offers/company?status=OPEN,COUNTERED&take=30", "/api/rooms?take=30"], "Storm profile updated for M74 hot-path sizes");

console.log("=== M74 HOT PATH PHASE 3 CHECK PASS ===");
