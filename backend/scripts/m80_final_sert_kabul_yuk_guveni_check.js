import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

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
  text.includes(needle) ? ok(msg) : fail(msg);
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
  "web/src/components/RoutePreviewModal.jsx",
  "backend/src/routes/shifts/company.js",
  "backend/src/routes/shifts/people.js",
  "backend/src/services/osrmRoute.js",
  "backend/prisma/schema.prisma",
  "backend/prisma/migrations/20260403150000_m81_route_snapshot_preview/migration.sql",
  "tools/_backup/README.md",
]) must(rel);

mustAbsent("scripts", "legacy root scripts folder removed");

const state = readRepoContractState();
if (Number(state.latestMasterPack) === 79) ok("state latest master pack is 79"); else fail("state latest master pack is 79");
if (Number(state.stableTo) === 78) ok("state stable_to remains 78"); else fail("state stable_to remains 78");
if (String(state.nextMilestone || "") === "M80") ok("state next milestone is M80"); else fail("state next milestone is M80");
if (String(state.latestManifestStage || "") === "M79") ok("state latest manifest stage stays M79"); else fail("state latest manifest stage stays M79");
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
textHas("README.md", /pack_m80_final_sert_kabul_yuk_guveni/, "readme exposes M80 command");
textHas("docs/PRIMER_SSOT.md", /M80 ilk tur komutu|resmi green degil/, "primer explains M80 first command");
textHas("docs/STARTPACK_V1.md", /M80 final sert kabul ve yuk guveni kapisi|pack_m80_final_sert_kabul_yuk_guveni/, "startpack defines M80 gate");
textHas("docs/NEXT_BACKLOG_V1.md", /M80 kabul kapisi|M80\.1|hot panel/i, "backlog moves to post-gate work");
textHas("docs/MILESTONE_REGISTRY_V1.md", /M80 — final sert kabul ve yük güveni kapısı|M80 - final sert kabul ve yuk guveni kapisi/i, "registry lists active M80 gate");
textHas(".gitignore", /infra\/osrm-data\//, ".gitignore excludes osrm-data");
textHas(".dockerignore", /infra\/osrm-data\//, ".dockerignore excludes osrm-data");
textHas("docs/RUNBOOK_M34_STEP0.md", /OSRM\/solver opsiyonel|repo.?ya girmez|repo’ya girmez/, "M34 runbook explains OSRM optional profile");
const composeText = read("infra/docker-compose.yml");
if (/profiles:\s*\["osrm"\]/.test(composeText) && /OSRM_URL/.test(composeText) && /PLAN_SOLVER_URL/.test(composeText)) ok("compose keeps osrm profile wiring"); else fail("compose keeps osrm profile wiring");

console.log("INFO running scale readiness baseline");
const scale = spawnSync(process.execPath, [path.join(repoRoot, "backend/scripts/scale_readiness_check.js")], {
  cwd: repoRoot,
  encoding: "utf8"
});
if ((scale.stdout || "").trim()) process.stdout.write(scale.stdout);
if ((scale.stderr || "").trim()) process.stderr.write(scale.stderr);
if (scale.status === 0) ok("scale readiness baseline passed"); else fail("scale readiness baseline passed");

console.log("INFO verifying guided step-4 and route snapshot db-first behavior");
const guidedText = read("web/src/panels/company/GuidedPlanModal.jsx");
const routeModal = read("web/src/components/RoutePreviewModal.jsx");
const companyRoutes = read("backend/src/routes/shifts/company.js");
const peopleRoutes = read("backend/src/routes/shifts/people.js");
const osrmRouteText = read("backend/src/services/osrmRoute.js");
const schemaText = read("backend/prisma/schema.prisma");

textIncludes(guidedText, "const offerOsrmGate = useMemo(", "offerOsrmGate memo present");
if (!guidedText.includes("Sadece hub’lı")) ok("hub-only filter removed"); else fail("hub-only filter removed");
textIncludes(guidedText, "Company planı koordinat olarak hazır", "company wording downgraded");
textIncludes(guidedText, "Hub konumu eksik • teklif engeli değil", "hub warning non-blocking");
textIncludes(guidedText, "Toplam taslak: <b>{offerOsrmGate.total}</b>", "osrm prerequisite summary present");
textIncludes(guidedText, "(!organization && offerOsrmGate.blocking)", "send gate uses offerOsrmGate");
textIncludes(guidedText, "OSRM rota doğrulaması alınamadı.", "osrm wording strengthened");

textIncludes(schemaText, "routeSnapshotPolyline", "shift schema has routeSnapshotPolyline");
textIncludes(schemaText, "routeSnapshotDistanceM", "shift schema has routeSnapshotDistanceM");
textIncludes(schemaText, "routeSnapshotDurationSec", "shift schema has routeSnapshotDurationSec");
textIncludes(schemaText, "routeSnapshotValidatedAt", "shift schema has routeSnapshotValidatedAt");
textIncludes(schemaText, "routeSnapshotInputHash", "shift schema has routeSnapshotInputHash");
textIncludes(companyRoutes, "refreshShiftRouteSnapshot(", "company reorder refreshes route snapshot");
textIncludes(companyRoutes, "routeSnapshotValidatedAt", "company writes validatedAt");
textIncludes(companyRoutes, "osrmRoute(", "company uses osrmRoute for snapshot");
textIncludes(peopleRoutes, 'source === "SNAPSHOT"', "route preview supports SNAPSHOT source");
textIncludes(peopleRoutes, "snapshotHash === routeKey", "route preview checks snapshot hash");
textIncludes(peopleRoutes, "DB_SNAPSHOT", "route preview policy includes DB_SNAPSHOT");
textIncludes(osrmRouteText, "distanceM", "osrmRoute returns distance");
textIncludes(osrmRouteText, "durationSec", "osrmRoute returns duration");
textIncludes(routeModal, "Kaydedilmiş rota snapshot kullanıldı", "route preview modal explains snapshot source");
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
