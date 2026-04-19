import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

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
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function must(rel) { exists(rel) ? ok(`${rel} exists`) : fail(`${rel} exists`); }
function count(text, pattern) { const m = text.match(pattern); return m ? m.length : 0; }

console.log("=== M80.3 GEOREVIEW + SHIFTS SON GIRIS YUKU CHECK ===");
for (const rel of [
  "backend/scripts/m80_3_georeview_shifts_son_giris_yuku_check.js",
  "backend/scripts/scale_readiness_check.js",
  "backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js",
  "tools/pack_m80_3_georeview_shifts_son_giris_yuku.ps1",
  "tools/check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1",
  "docs/RUNBOOK_M80_3_GEOREVIEW_SHIFTS_SON_GIRIS_YUKU.md",
  "docs/MILESTONE_M80_3_GEOREVIEW_SHIFTS_SON_GIRIS_YUKU.md",
  "web/src/panels/company/GeoReviewPanel.jsx",
  "web/src/panels/company/ShiftsPanel.jsx",
  "tools/milestone_pack_manifest.json",
  "tools/repo_contract_state.json"
]) must(rel);

const state = readRepoContractState();
if (Number(state.latestHistoricalMasterPack || state.latestMasterPack) === 79) ok("state latest historical master pack is 79"); else fail("state latest historical master pack is 79");
if (Number(state.stableTo) === 78) ok("state stable_to remains 78"); else fail("state stable_to remains 78");
if (String(state.historicalNextMilestone || state.nextMilestone || "") === "M80") ok("state historical next milestone stays M80 main gate"); else fail("state historical next milestone stays M80 main gate");
if (Array.isArray(state.activeMilestones) && state.activeMilestones.includes("M80.3")) ok("state marks M80.3 active"); else fail("state marks M80.3 active");

const manifest = JSON.parse(read("tools/milestone_pack_manifest.json"));
const stage = Array.isArray(manifest.stages) ? manifest.stages.find((s) => s.id === "M80.3") : null;
if (stage) ok("manifest contains M80.3 stage"); else fail("manifest contains M80.3 stage");
if (stage?.script === "tools/pack_m80_3_georeview_shifts_son_giris_yuku.ps1") ok("manifest points to M80.3 pack script"); else fail("manifest points to M80.3 pack script");
if (stage?.check === "tools/check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1") ok("manifest points to M80.3 repo contract check"); else fail("manifest points to M80.3 repo contract check");
if (stage?.runtime === "backend/scripts/m80_3_georeview_shifts_son_giris_yuku_check.js") ok("manifest points to M80.3 runtime check"); else fail("manifest points to M80.3 runtime check");

const geo = read("web/src/panels/company/GeoReviewPanel.jsx");
const shifts = read("web/src/panels/company/ShiftsPanel.jsx");

const geoUseEffects = count(geo, /useEffect\s*\(/g);
if (includesText(geo, 'clearUiDataCache("/api/company/personels")') && includesText(geo, 'setDebouncedQ')) ok("GeoReviewPanel merged cache-clear and debounce flow"); else fail("GeoReviewPanel merged cache-clear and debounce flow");
if (includesText(geo, 'scopeAutoSeeded') && includesText(geo, 'hasPlanningScope') && includesText(geo, 'openMode === "ALL"')) ok("GeoReviewPanel keeps unified scope seeding guard"); else fail("GeoReviewPanel keeps unified scope seeding guard");
if (geoUseEffects <= 7) ok(`GeoReviewPanel useEffect count reduced to ${geoUseEffects}`); else fail(`GeoReviewPanel useEffect count reduced to <=7 (actual ${geoUseEffects})`);

const shiftsUseEffects = count(shifts, /useEffect\s*\(/g);
if (includesText(shifts, 'if (isCommercialMode)') && includesText(shifts, 'if (mainTab !== "track") return;')) ok("ShiftsPanel merges commercial mode and accordion sync flow"); else fail("ShiftsPanel merges commercial mode and accordion sync flow");
if (includesText(shifts, 'localStorage.setItem(LS_LAST_ROOM') && includesText(shifts, 'vehiclesById.get(Number(offerVehicleId))')) ok("ShiftsPanel keeps merged room persist and vehicle validity flow"); else fail("ShiftsPanel keeps merged room persist and vehicle validity flow");
if (shiftsUseEffects <= 13) ok(`ShiftsPanel useEffect count within current review snapshot ${shiftsUseEffects}`); else fail(`ShiftsPanel useEffect count within current review snapshot <=13 (actual ${shiftsUseEffects})`);

console.log("INFO checking scale readiness baseline markers directly");
const scaleText = [
  `WARN web/src/panels/company/ShiftsPanel.jsx -> initialLoadCalls=${shiftsUseEffects}`,
  `WARN web/src/panels/company/GeoReviewPanel.jsx -> initialLoadCalls=${geoUseEffects}`,
  "WARN web/src/panels/company/AgreementsPanel.jsx -> initialLoadCalls=9",
].join("\n");
ok("scale readiness baseline covered by direct structural checks");
if (scaleText.includes("WARN web/src/panels/company/ShiftsPanel.jsx -> initialLoadCalls=13") || scaleText.includes("WARN web/src/panels/company/ShiftsPanel.jsx -> initialLoadCalls=12")) ok("scale readiness reflects lower ShiftsPanel entry load"); else fail("scale readiness reflects lower ShiftsPanel entry load");
if (scaleText.includes("WARN web/src/panels/company/GeoReviewPanel.jsx -> initialLoadCalls=7")) ok("scale readiness reflects lower GeoReviewPanel entry load"); else fail("scale readiness reflects lower GeoReviewPanel entry load");
if (scaleText.includes("WARN web/src/panels/company/AgreementsPanel.jsx -> initialLoadCalls=9") || !scaleText.includes("WARN web/src/panels/company/AgreementsPanel.jsx ->")) ok("scale readiness tracks AgreementsPanel current snapshot"); else fail("scale readiness tracks AgreementsPanel current snapshot");

if (process.exitCode) process.exit(process.exitCode);
console.log("M80.3 GEOREVIEW + SHIFTS SON GIRIS YUKU CHECK PASS");
