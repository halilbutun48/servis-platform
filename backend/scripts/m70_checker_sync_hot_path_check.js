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

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function ok(cond, msg) { if (!cond) { console.error(`FAIL ${msg}`); process.exit(1); } console.log(`OK ${msg}`); }

console.log("=== M70 CHECKER SYNC + HOT PATH CHECK ===");

const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
ok(
  includesText(workflow, "if (!token || !guidedOpen) return;") && includesText(workflow, "getCompanyRooms(token"),
  "workflow room directory is gated by guided modal"
);
ok(
  !includesText(workflow, "loadRooms(controller.signal);\n      loadStats(controller.signal);"),
  "workflow initial effect no longer broad-loads rooms"
);
ok(
  includesText(workflow, "fetchProviderScoreMap(visibleOfferRoomIds, token)") ||
    includesText(workflow, "fetchProviderScoreMap(roomScoreIds, token)"),
  "workflow provider scores load from visible offers only"
);

const serviceEval = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
ok(includesText(serviceEval, "const loadBase = useCallback(async (signal)") || includesText(serviceEval, "async function loadBase(signal)"), "service evaluation split base loader exists");
ok(includesText(serviceEval, "const ensureTemplate = useCallback(async (signal)") || includesText(serviceEval, "async function ensureTemplate(signal)"), "service evaluation lazy template loader exists");
ok(includesText(serviceEval, "await loadBase(controller.signal);"), "service evaluation first frame uses base loader only");

const agreements = read("backend/src/routes/agreements.js");
ok(
  includesText(agreements, 'const q = String(req.query.q || "").trim();') ||
    includesText(agreements, "const q = String(req.query.q || '').trim();"),
  "agreements endpoint supports q"
);

const offers = read("backend/src/routes/offers.js");
ok(
  includesText(offers, 'const q = String(req.query.q || "").trim();') ||
    includesText(offers, "const q = String(req.query.q || '').trim();"),
  "offers company endpoint supports q"
);

const hub = read("web/src/utils/companyDataHub.js");
ok(
  (
    includesText(hub, "getCompanyAgreements(token, { signal, force = false, q, take = COMPANY_DATA_TAKE.agreements, status, ttlMs = COMPANY_DATA_TTL.agreements") &&
    includesText(hub, "getCompanyOffers(token, { signal, force = false, q, take = COMPANY_DATA_TAKE.offers, status, ttlMs = COMPANY_DATA_TTL.offers")
  ) ||
  (
    includesText(hub, "q, take = COMPANY_DATA_TAKE.agreements, status, ttlMs") &&
    includesText(hub, "q, take = COMPANY_DATA_TAKE.offers, status, ttlMs")
  ),
  "companyDataHub agreements/offers supports q passthrough"
);

const scale = read("backend/scripts/scale_readiness_check.js");
ok(
  includesText(scale, "provider score backend batch endpoint exists and is used on web") ||
    includesText(scale, "provider score backend batch endpoint is used"),
  "scale readiness checker recognizes provider-score batch usage"
);
ok(includesText(scale, "vehicles endpoint has q + take"), "scale readiness checker recognizes vehicles q/take");

const storm = read("backend/scripts/company_fetch_storm_check.js");
ok(includesText(storm, "virtualUsers"), "storm check supports multi-user pressure profile");
ok(
  includesText(storm, "/api/trust-quality/provider-scores?roomIds=") || includesText(storm, "lazy provider scores") || includesText(storm, "M75 profile uses lighter first-load takes + offer/people/live-shift read buckets + lazy provider scores"),
  "storm check covers provider-score batch path"
);
ok(includesText(storm, "/api/service-evaluation") === false, "storm check not coupled to wrong paths");

console.log("=== M70 CHECKER SYNC + HOT PATH CHECK PASS ===");
