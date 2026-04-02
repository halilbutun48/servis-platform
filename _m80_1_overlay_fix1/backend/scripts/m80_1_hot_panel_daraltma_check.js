import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function must(rel) { exists(rel) ? ok(`${rel} exists`) : fail(`${rel} exists`); }
function textHas(rel, pattern, msg) { pattern.test(read(rel)) ? ok(msg) : fail(msg); }

console.log("=== M80.1 HOT PANEL DARALTMA CHECK ===");
for (const rel of [
  "backend/scripts/m80_1_hot_panel_daraltma_check.js",
  "backend/scripts/scale_readiness_check.js",
  "tools/pack_m80_1_hot_panel_daraltma.ps1",
  "tools/check_m80_1_hot_panel_daraltma_repo_contract.ps1",
  "docs/RUNBOOK_M80_1_HOT_PANEL_DARALTMA.md",
  "docs/MILESTONE_M80_1_HOT_PANEL_DARALTMA.md",
  "web/src/panels/company/GeoReviewPanel.jsx",
  "web/src/panels/company/MapPanel.jsx",
  "web/src/panels/company/ShiftsPanel.jsx",
  "tools/milestone_pack_manifest.json",
  "tools/repo_contract_state.json"
]) must(rel);

const state = readRepoContractState();
if (Number(state.latestMasterPack) === 79) ok("state latest master pack is 79"); else fail("state latest master pack is 79");
if (Number(state.stableTo) === 78) ok("state stable_to remains 78"); else fail("state stable_to remains 78");
if (String(state.nextMilestone || "") === "M80") ok("state next milestone stays M80 main gate"); else fail("state next milestone stays M80 main gate");
if (Array.isArray(state.activeMilestones) && state.activeMilestones.includes("M80.1")) ok("state marks M80.1 active"); else fail("state marks M80.1 active");

const manifest = JSON.parse(read("tools/milestone_pack_manifest.json"));
const stage = Array.isArray(manifest.stages) ? manifest.stages.find((s) => s.id === "M80.1") : null;
if (stage) ok("manifest contains M80.1 stage"); else fail("manifest contains M80.1 stage");
if (stage?.script === "tools/pack_m80_1_hot_panel_daraltma.ps1") ok("manifest points to M80.1 pack script"); else fail("manifest points to M80.1 pack script");
if (stage?.check === "tools/check_m80_1_hot_panel_daraltma_repo_contract.ps1") ok("manifest points to M80.1 repo contract check"); else fail("manifest points to M80.1 repo contract check");
if (stage?.runtime === "backend/scripts/m80_1_hot_panel_daraltma_check.js") ok("manifest points to M80.1 runtime check"); else fail("manifest points to M80.1 runtime check");

const geo = read("web/src/panels/company/GeoReviewPanel.jsx");
const map = read("web/src/panels/company/MapPanel.jsx");
const shifts = read("web/src/panels/company/ShiftsPanel.jsx");

if (!geo.includes("/api/company/personels?${qs.toString()}")) ok("GeoReviewPanel raw personels query removed"); else fail("GeoReviewPanel raw personels query removed");
if (geo.includes("needsExpandedDataset")) ok("GeoReviewPanel keeps expanded dataset guard"); else fail("GeoReviewPanel keeps expanded dataset guard");
if (geo.includes("force: !!openIntent?.forceRefresh")) ok("GeoReviewPanel only force refreshes from explicit open intent"); else fail("GeoReviewPanel only force refreshes from explicit open intent");
if (geo.includes("getCompanyGeoNeedsReview(") && geo.includes("getCompanyPersonels(")) ok("GeoReviewPanel uses companyDataHub helpers for list loading"); else fail("GeoReviewPanel uses companyDataHub helpers for list loading");

if (map.includes("const scheduleRefresh = useCallback")) ok("MapPanel keeps coalesced refresh helper"); else fail("MapPanel keeps coalesced refresh helper");
if (map.includes("refreshTimersRef")) ok("MapPanel stores refresh timers in shared ref"); else fail("MapPanel stores refresh timers in shared ref");
if (!map.includes("reloadVehiclesTimer") && !map.includes("reloadShiftsTimer")) ok("MapPanel legacy reload timer names removed"); else fail("MapPanel legacy reload timer names removed");

if (shifts.includes('useAutoReload("rooms", () => (needsReferenceData() ? ensureReferenceData(undefined, { force: false }) : Promise.resolve()), true, 650);')) ok("ShiftsPanel rooms auto reload no longer forces reference refresh"); else fail("ShiftsPanel rooms auto reload no longer forces reference refresh");
if (shifts.includes("ttlMs: 15000")) ok("ShiftsPanel commercial summary TTL slightly widened"); else fail("ShiftsPanel commercial summary TTL slightly widened");

console.log("INFO running scale readiness baseline");
const scale = spawnSync(process.execPath, [path.join(repoRoot, "backend/scripts/scale_readiness_check.js")], { cwd: repoRoot, encoding: "utf8" });
if ((scale.stdout || "").trim()) process.stdout.write(scale.stdout);
if ((scale.stderr || "").trim()) process.stderr.write(scale.stderr);
const scaleText = `${scale.stdout || ""}
${scale.stderr || ""}`;
if (scale.status === 0) ok("scale readiness baseline passed"); else fail("scale readiness baseline passed");
if (!scaleText.includes("GeoReviewPanel.jsx:205 -> /api/company/personels?${qs.toString()}")) ok("scale readiness no longer reports raw GeoReview heavy read"); else fail("scale readiness no longer reports raw GeoReview heavy read");

if (process.exitCode) process.exit(process.exitCode);
console.log("M80.1 HOT PANEL DARALTMA CHECK PASS");
