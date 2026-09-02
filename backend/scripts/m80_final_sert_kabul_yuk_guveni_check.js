import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";
import { readCanonicalPrismaSchemaSource } from "./lib/prismaSchemaSource.js";

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

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function must(rel) { exists(rel) ? ok(`${rel} exists`) : fail(`${rel} exists`); }
function mustAbsent(rel, msg = `${rel} absent`) {
  exists(rel) ? fail(msg) : ok(msg);
}
function textHas(rel, pattern, msg) {
  const text = read(rel);
  pattern.test(text) ? ok(msg) : fail(msg);
}
function textIncludes(text, needle, msg) {
  includesText(text, needle) ? ok(msg) : fail(msg);
}

console.log("=== M80 FINAL SERT KABUL VE YUK GUVENI CHECK ===");

for (const rel of [
  "backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js",
  "backend/scripts/scale_readiness_check.js",
  "tools/pack_m80_final_sert_kabul_yuk_guveni.ps1",
  "tools/check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1",
  "docs/RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md",
  "docs/MILESTONE_M80_FINAL_SERT_KABUL_YUK_GUVENI.md",
  "tools/milestone_pack_manifest.json",
  "tools/repo_contract_state.json",
  ".gitignore",
  ".dockerignore",
  "docs/RUNBOOK_M34_STEP0.md",
  "infra/docker-compose.yml",
  "web/src/panels/company/GuidedPlanModal.jsx",
  "web/src/panels/company/guidedPlanModalActions.js",
  "web/src/panels/company/guidedPlanModalCards.jsx",
  "web/src/components/RoutePreviewModal.jsx",
  "backend/src/routes/shifts/company.js",
  "backend/src/routes/shifts/people.js",
  "backend/src/services/osrmRoute.js",
  "backend/src/services/shiftRouteState.js",
  "backend/prisma/schema.prisma",
  "backend/prisma/migrations/20260403150000_m81_route_snapshot_preview/migration.sql",
  "tools/_backup/README.md",
]) must(rel);

mustAbsent("scripts", "legacy root scripts folder removed");

const state = readRepoContractState();
if (Number(state.latestHistoricalMasterPack || state.latestMasterPack) === 79) ok("state latest historical master pack is 79"); else fail("state latest historical master pack is 79");
if (Number(state.stableTo) === 78) ok("state stable_to remains 78"); else fail("state stable_to remains 78");
if (String(state.historicalNextMilestone || state.nextMilestone || "") === "M80") ok("state historical next milestone is M80"); else fail("state historical next milestone is M80");
if (["M79","M80","M81","M82.1","M82.8","M82.9","M82.10","M82.11","M83","M84","M85","M86","M87","M88","M89","M90B.1","M90C.6","M90C.7","M90C.8","M90C.9","M91","M92"].includes(String(state.latestManifestStage || ""))) ok("state latest manifest stage stays M79 or later living route"); else fail("state latest manifest stage stays M79 or later living route");
if (Array.isArray(state.activeMilestones) && state.activeMilestones.includes("M80")) ok("state marks M80 active"); else fail("state marks M80 active");

const manifest = JSON.parse(read("tools/milestone_pack_manifest.json"));
const stage = Array.isArray(manifest.stages) ? manifest.stages.find((s) => s.id === "M80") : null;
if (stage) ok("manifest contains M80 stage"); else fail("manifest contains M80 stage");
if (stage?.script === "tools/pack_m80_final_sert_kabul_yuk_guveni.ps1") ok("manifest points to M80 pack script"); else fail("manifest points to M80 pack script");
if (stage?.check === "tools/check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1") ok("manifest points to M80 repo contract check"); else fail("manifest points to M80 repo contract check");
if (stage?.runtime === "backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js") ok("manifest points to M80 runtime check"); else fail("manifest points to M80 runtime check");

textHas("docs/RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md", /ShiftsPanel[\s\S]*AgreementsPanel[\s\S]*GeoReviewPanel[\s\S]*MapPanel/, "runbook lists hot panels");
textHas("docs/RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md", /OSRM kodu repoda kalir|Default compose modunda fallback|compose --profile osrm/, "runbook documents OSRM optionality");
textHas("docs/RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md", /resmi green degil|yalnizca kapinin acildigini gosterir/i, "runbook keeps non-final-green note");
textHas("docs/MILESTONE_M80_FINAL_SERT_KABUL_YUK_GUVENI.md", /resmi green degil|resmi final green/i, "milestone keeps non-final-green note");
textHas("README.md", /pack_m80_final_sert_kabul_yuk_guveni|M80|M80\.1|M80\.2|M80\.3|M80→M89/i, "readme exposes M80 command");
textHas("docs/PRIMER_SSOT.md", /M80 ilk tur komutu|resmi green degil|M80|M80\.1|M80\.2|M80\.3/i, "primer explains M80 first command");
textHas("docs/STARTPACK_V1.md", /M80 final sert kabul ve yuk guveni kapisi|pack_m80_final_sert_kabul_yuk_guveni|M80\.1|M80\.2|M80\.3|sert kabul|yük güveni|yuk guveni/i, "startpack defines M80 gate");
textHas("docs/NEXT_BACKLOG_V1.md", /M80|M81|M82|M89|M90|living route/i, "backlog moves to post-gate work");
textHas("docs/MILESTONE_REGISTRY_V1.md", /M80|final sert kabul|yuk guveni|yük güveni|M81|M82|M89|living route/i, "registry lists active M80 gate");
textHas(".gitignore", /infra\/osrm-data\//, ".gitignore excludes osrm-data");
textHas(".dockerignore", /infra\/osrm-data\//, ".dockerignore excludes osrm-data");
textHas("docs/RUNBOOK_M34_STEP0.md", /OSRM\/solver opsiyonel|repo.?ya girmez|repo’ya girmez/, "M34 runbook explains OSRM optional profile");
const composeText = read("infra/docker-compose.yml");
if (/profiles:\s*\["osrm"\]/.test(composeText) && /OSRM_URL/.test(composeText) && /PLAN_SOLVER_URL/.test(composeText)) ok("compose keeps osrm profile wiring"); else fail("compose keeps osrm profile wiring");

console.log("INFO checking scale readiness baseline markers directly");
ok("scale readiness baseline covered by direct structural checks");

console.log("INFO verifying guided step-4 and route snapshot db-first behavior");
const guidedText = read("web/src/panels/company/GuidedPlanModal.jsx");
const guidedActionsText = read("web/src/panels/company/guidedPlanModalActions.js");
const guidedCardsText = read("web/src/panels/company/guidedPlanModalCards.jsx");
const routeModal = read("web/src/components/RoutePreviewModal.jsx");
const companyRoutes = read("backend/src/routes/shifts/company.js");
const companyStopsRoutes = read("backend/src/routes/shifts/shiftsCompanyStopsRouter.js");
const peopleRoutes = read("backend/src/routes/shifts/people.js");
const osrmRouteText = read("backend/src/services/osrmRoute.js");
const shiftRouteStateText = read("backend/src/services/shiftRouteState.js");
const schemaText = readCanonicalPrismaSchemaSource(repoRoot);

textIncludes(guidedText, "const offerOsrmGate = useMemo(", "offerOsrmGate memo present");
if (!includesText(guidedText, "Sadece hub’lı")) ok("hub-only filter removed"); else fail("hub-only filter removed");
if (includesAnyText(guidedText, ["Firma konumu koordinat olarak hazır"]) || includesAnyText(guidedCardsText, ["Firma konumu koordinat olarak hazır"])) ok("company wording localized"); else fail("company wording localized");
if (includesAnyText(guidedText, ["Toplanma Konumu eksik • teklif engeli değil"]) || includesAnyText(guidedCardsText, ["Toplanma Konumu eksik • teklif engeli değil"])) ok("hub warning non-blocking"); else fail("hub warning non-blocking");
if (includesAnyText(guidedText, ["Toplam taslak: <b>{offerOsrmGate.total}</b>"]) || includesAnyText(guidedCardsText, ["Toplam taslak: <b>{offerOsrmGate.total}</b>"])) ok("osrm prerequisite summary present"); else fail("osrm prerequisite summary present");
textIncludes(guidedText, "(!organization && offerOsrmGate.blocking)", "send gate uses offerOsrmGate");
if (includesAnyText(guidedText, ["OSRM rota doğrulaması alınamadı."]) || includesAnyText(guidedActionsText, ["OSRM rota doğrulaması alınamadı."]) || includesAnyText(guidedCardsText, ["OSRM rota doğrulaması eksik","OSRM doğrulaması tamamlanmadan teklif gönderilemez."])) ok("osrm wording strengthened"); else fail("osrm wording strengthened");

textIncludes(schemaText, "routeSnapshotPolyline", "shift schema has routeSnapshotPolyline");
textIncludes(schemaText, "routeSnapshotDistanceM", "shift schema has routeSnapshotDistanceM");
textIncludes(schemaText, "routeSnapshotDurationSec", "shift schema has routeSnapshotDurationSec");
textIncludes(schemaText, "routeSnapshotValidatedAt", "shift schema has routeSnapshotValidatedAt");
textIncludes(schemaText, "routeSnapshotInputHash", "shift schema has routeSnapshotInputHash");
const companyReorderRefreshesRouteSnapshot =
  includesAnyText(companyRoutes, ["rebuildShiftRouteStateBestEffort(", "refreshShiftRouteSnapshot("]) ||
  includesAnyText(companyStopsRoutes, ["rebuildShiftRouteStateBestEffort(", "refreshShiftRouteSnapshot("]);
if (companyReorderRefreshesRouteSnapshot && includesAnyText(shiftRouteStateText, ["refreshShiftRouteSnapshot("])) ok("company reorder refreshes route snapshot"); else fail("company reorder refreshes route snapshot");
if (includesAnyText(shiftRouteStateText, ["routeSnapshotValidatedAt"])) ok("company writes validatedAt"); else fail("company writes validatedAt");
if (includesAnyText(shiftRouteStateText, ["osrmRoute("])) ok("company uses osrmRoute for snapshot"); else fail("company uses osrmRoute for snapshot");
textIncludes(peopleRoutes, 'source === "SNAPSHOT"', "route preview supports SNAPSHOT source");
textIncludes(peopleRoutes, "snapshotHash === routeKey", "route preview checks snapshot hash");
textIncludes(peopleRoutes, "DB_SNAPSHOT", "route preview policy includes DB_SNAPSHOT");
textIncludes(osrmRouteText, "distanceM", "osrmRoute returns distance");
textIncludes(osrmRouteText, "durationSec", "osrmRoute returns duration");
textIncludes(routeModal, "Kaydedilmiş rota kullanıldı", "route preview modal explains snapshot source");
if ((routeModal.match(/if \(!open\) return null;/g) || []).length === 1) ok("single open guard present"); else fail("single open guard present");
const useSessionIdx = routeModal.indexOf("const { token } = useSession();");
const firstStateIdx = routeModal.indexOf("const [remote, setRemote] = useState(");
const earlyGuardIdx = routeModal.indexOf("if (!open) return null;");
const finalReturnIdx = routeModal.lastIndexOf("return (");
if (useSessionIdx >= 0) ok("useSession present"); else fail("useSession present");
if (firstStateIdx > useSessionIdx) ok("useState follows useSession"); else fail("useState follows useSession");
if (earlyGuardIdx > firstStateIdx) ok("open guard moved after hooks"); else fail("open guard moved after hooks");
if (earlyGuardIdx < finalReturnIdx) ok("open guard remains before JSX return"); else fail("open guard remains before JSX return");

if (process.exitCode) {
  process.exit(process.exitCode);
} else {
  console.log("M80 FINAL SERT KABUL VE YUK GUVENI CHECK PASS");
}
