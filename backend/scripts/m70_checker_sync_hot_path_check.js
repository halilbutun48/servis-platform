import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function ok(cond, msg) { if (!cond) { console.error(`FAIL ${msg}`); process.exit(1); } console.log(`OK ${msg}`); }

console.log("=== M70 CHECKER SYNC + HOT PATH CHECK ===");

const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
ok(workflow.includes("const needRoomDirectory = guidedOpen;"), "workflow room directory is gated by guided modal");
ok(!workflow.includes("loadRooms(controller.signal);\n      loadStats(controller.signal);"), "workflow initial effect no longer broad-loads rooms");
ok(workflow.includes("fetchProviderScoreMap(roomScoreIds, token)"), "workflow provider scores load from visible offers only");

const serviceEval = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
ok(serviceEval.includes("async function loadBase(signal)"), "service evaluation split base loader exists");
ok(serviceEval.includes("async function ensureTemplate(signal)"), "service evaluation lazy template loader exists");
ok(serviceEval.includes("await loadBase(controller.signal);"), "service evaluation first frame uses base loader only");

const agreements = read("backend/src/routes/agreements.js");
ok(agreements.includes("const q = String(req.query.q || \"\").trim();"), "agreements endpoint supports q");

const offers = read("backend/src/routes/offers.js");
ok(offers.includes("const q = String(req.query.q || '').trim();"), "offers company endpoint supports q");

const hub = read("web/src/utils/companyDataHub.js");
ok(hub.includes("status, q, ttlMs"), "companyDataHub agreements/offers supports q passthrough");

const scale = read("backend/scripts/scale_readiness_check.js");
ok(scale.includes("provider score backend batch endpoint exists and is used on web"), "scale readiness checker recognizes provider-score batch usage");
ok(scale.includes("vehicles endpoint has q + take"), "scale readiness checker recognizes vehicles q/take");

const storm = read("backend/scripts/company_fetch_storm_check.js");
ok(storm.includes("virtualUsers"), "storm check supports multi-user pressure profile");
ok(storm.includes("/api/trust-quality/provider-scores?roomIds="), "storm check covers provider-score batch path");
ok(storm.includes("/api/service-evaluation") === false, "storm check not coupled to wrong paths");

console.log("=== M70 CHECKER SYNC + HOT PATH CHECK PASS ===");
