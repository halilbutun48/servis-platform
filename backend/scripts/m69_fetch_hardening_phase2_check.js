import fs from "fs";
import path from "path";

const root = process.cwd();
let failed = false;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function ok(msg) {
  console.log(`OK ${msg}`);
}
function fail(msg) {
  failed = true;
  console.error(`FAIL ${msg}`);
}
function expectContains(rel, pattern, msg) {
  const text = read(rel);
  if (text.includes(pattern)) ok(msg);
  else fail(msg);
}
function expectNotContains(rel, pattern, msg) {
  const text = read(rel);
  if (!text.includes(pattern)) ok(msg);
  else fail(msg);
}

console.log("=== M69 FETCH HARDENING PHASE-2 CHECK ===");

expectContains("web/src/panels/company/ShiftsPanel.jsx", "function needsReferenceData()", "shifts panel reference-data gate exists");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "async function ensureReferenceData", "shifts panel lazy reference loader exists");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "await getCompanyShifts(token, { signal", "shifts panel primary load reads shifts first");
expectNotContains("web/src/panels/company/ShiftsPanel.jsx", "const [sh, veh, rm] = await Promise.all([", "shifts panel no longer loads shifts+vehicles+rooms together on entry");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "useAutoReload(\"rooms\", () => (needsReferenceData() ? ensureReferenceData(undefined, { force: true }) : Promise.resolve())", "rooms autoreload gated by active need");
expectContains("web/src/panels/company/ShiftsPanel.jsx", "fetchProviderScoreMap(roomScoreIds, token)", "room score fetch now derives from visible shift rooms");

expectContains("web/src/panels/company/AgreementsPanel.jsx", "rooms={null}", "agreement wizard self-loads rooms lazily");
expectContains("web/src/panels/company/AgreementsPanel.jsx", "if (!token || !advancedOpen) return;", "agreements panel lazy room effect exists");
expectNotContains("web/src/panels/company/AgreementsPanel.jsx", "loadRooms(controller.signal);\n      load(controller.signal);", "agreements initial mount no longer loads rooms together with list");

expectContains("web/src/components/RoutePreviewModal.jsx", "getShiftRoutePreview(token, shiftId", "route preview modal uses cached route-preview fetch");
expectContains("web/src/panels/company/ServiceEvaluationPanel.jsx", "getCompanyTrustQualityItems(token, { signal, take:", "service evaluation defaults to pending-only lightweight items query");
expectContains("web/src/panels/company/ServiceEvaluationPanel.jsx", "pendingOnly: true", "service evaluation keeps pending-only lightweight items query");

expectContains("web/src/utils/companyDataHub.js", "export function getCompanyVehicles", "companyDataHub vehicles loader exists");
expectContains("web/src/utils/companyDataHub.js", "onlyActive: onlyActive ? 1 : null", "companyDataHub vehicles loader supports onlyActive gate");
expectContains("web/src/utils/companyDataHub.js", "pendingOnly: pendingOnly ? 1 : null", "companyDataHub trust-quality items loader supports pendingOnly gate");

expectContains("backend/src/routes/vehicles.js", "const take = Math.min(200, Math.max(1, Number(req.query?.take || 120) || 120));", "vehicles endpoint supports take");
expectContains("backend/src/routes/vehicles.js", "const qWhere = q", "vehicles endpoint supports search filter");
expectContains("backend/src/routes/trustQuality.js", "const pendingOnly =", "trust-quality items endpoint supports pendingOnly");
expectContains("backend/src/routes/trustQuality.js", "return list.slice(0, take);", "trust-quality items endpoint applies take limit");

if (failed) {
  console.error("=== M69 FETCH HARDENING PHASE-2 CHECK FAIL ===");
  process.exit(1);
}

console.log("=== M69 FETCH HARDENING PHASE-2 CHECK PASS ===");
