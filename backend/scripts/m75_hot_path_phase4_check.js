import fs from "fs";
import path from "path";

const cwd = process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


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
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function banner(t) { console.log(`=== ${t} ===`); }

function main() {
  banner("M75 HOT PATH PHASE 4 CHECK");
  const required = [
    "web/src/utils/companyDataHub.js",
    "web/src/utils/shiftRoutePreview.js",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/GeoReviewPanel.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/components/RoutePreviewModal.jsx",
    "web/src/panels/company/ShiftsPanel.jsx",
    "backend/src/routes/offers.js",
    "backend/src/routes/trustQuality.js",
    "backend/src/bootstrap/rateLimits.js",
    "backend/scripts/company_fetch_storm_check.js",
    "backend/scripts/scale_readiness_check.js",
  ];
  required.forEach((rel) => exists(rel) ? ok(`${rel} exists`) : fail(`${rel} exists`));

  const hub = read("web/src/utils/companyDataHub.js");
  if (includesText(hub, "rooms: 30") && includesText(hub, "vehicles: 20") && includesText(hub, "shifts: 32") && includesText(hub, "offers: 30") && includesText(hub, "personels: 24")) ok("company data hub uses lighter first-load takes"); else fail("company data hub uses lighter first-load takes");
  if (includesText(hub, "mapShifts: 20") && includesText(hub, "geoNeedsReview: 10")) ok("map and geo defaults are narrowed"); else fail("map and geo defaults are narrowed");

  const shifts = read("web/src/panels/company/ShiftsPanel.jsx");
  if (includesText(shifts, "take: 32") && includesText(shifts, "take: 20") && includesText(shifts, "take: 30")) ok("ShiftsPanel uses narrower shift and reference loads"); else fail("ShiftsPanel uses narrower shift and reference loads");
  if (includesText(shifts, "shouldLoadRoomScores") && includesText(shifts, "offersModal?.items")) ok("ShiftsPanel limits provider-score hot path to offer contexts"); else fail("ShiftsPanel limits provider-score hot path to offer contexts");

  const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
  if (includesText(agreements, "take: 30") && includesText(agreements, "const [take, setTake] = useState(20);") && includesText(agreements, "slice(0, 12)")) ok("AgreementsPanel narrows rooms, list take and shift stats payload"); else fail("AgreementsPanel narrows rooms, list take and shift stats payload");

  const mapPanel = read("web/src/panels/company/MapPanel.jsx");
  const routePreview = read("web/src/components/RoutePreviewModal.jsx");
  if (includesText(mapPanel, "getCompanyVehicles(") && includesText(mapPanel, "take: 20") && includesText(mapPanel, "ttlMs: 45000")) ok("MapPanel uses lighter vehicle load"); else fail("MapPanel uses lighter vehicle load");
  if (includesText(routePreview, "getShiftRoutePreview") && (includesText(routePreview, "ttlMs: 30000") || includesText(routePreview, "300000"))) ok("RoutePreviewModal uses shared helper with longer cache"); else fail("RoutePreviewModal uses shared helper with longer cache");

  const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
  if (includesText(workflow, "getCompanyRooms(token, { signal, take: 30") && includesText(workflow, "getCompanyOffers(token, { status, q: offersModal.q, ttlMs: 25000, take: 30 })")) ok("WorkflowPanel uses narrower room and offer loads"); else fail("WorkflowPanel uses narrower room and offer loads");

  const geo = read("web/src/panels/company/GeoReviewPanel.jsx");
  if (includesText(geo, "take: mustHonorSessionScope ? scopedTake : (debouncedQ ? 30 : 120)") || includesText(geo, "take: debouncedQ ? 30 : 16")) ok("GeoReviewPanel narrows fallback personel query"); else fail("GeoReviewPanel narrows fallback personel query");

  const offers = read("backend/src/routes/offers.js");
  if (includesText(offers, "Math.min(400") && includesText(offers, "req.query.take || 240")) ok("offers directory endpoint uses lower hard cap"); else fail("offers directory endpoint uses lower hard cap");

  const trust = read("backend/src/routes/trustQuality.js");
  if (includesText(trust, "ttlMs: 45000")) ok("provider score responses keep longer cache"); else fail("provider score responses keep longer cache");

  const rateLimits = read("backend/src/bootstrap/rateLimits.js");
  if (includesText(rateLimits, "readOfferLimiter") && includesText(rateLimits, "readPeopleLimiter") && includesText(rateLimits, "readLiveShiftLimiter")) ok("server defines dedicated offer/people/live-shift limiters"); else fail("server defines dedicated offer/people/live-shift limiters");
  if (includesText(rateLimits, "isOfferReadPath") && includesText(rateLimits, "isPeopleReadPath") && includesText(rateLimits, "isLiveShiftReadPath")) ok("server detects dedicated hot path classes"); else fail("server detects dedicated hot path classes");

  const storm = read("backend/scripts/company_fetch_storm_check.js");
  if (includesText(storm, "/api/shifts?take=32") && includesText(storm, "/api/rooms?take=30") && includesText(storm, "/api/vehicles?onlyActive=1&take=20")) ok("storm profile updated to M75 values"); else fail("storm profile updated to M75 values");
  if (!includesText(storm, "provider-scores?roomIds")) ok("storm profile no longer treats provider-scores as hot initial path"); else fail("storm profile no longer treats provider-scores as hot initial path");

  console.log("=== M75 HOT PATH PHASE 4 CHECK PASS ===");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
