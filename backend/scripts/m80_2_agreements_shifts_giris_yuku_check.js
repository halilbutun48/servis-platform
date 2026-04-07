import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
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

console.log("=== M80.2 AGREEMENTS + SHIFTS GIRIS YUKU CHECK ===");
for (const rel of [
  "backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js",
  "backend/scripts/scale_readiness_check.js",
  "tools/pack_m80_2_agreements_shifts_giris_yuku.ps1",
  "tools/check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1",
  "docs/RUNBOOK_M80_2_AGREEMENTS_SHIFTS_GIRIS_YUKU.md",
  "docs/MILESTONE_M80_2_AGREEMENTS_SHIFTS_GIRIS_YUKU.md",
  "web/src/panels/company/AgreementsPanel.jsx",
  "web/src/panels/company/ShiftsPanel.jsx",
  "tools/milestone_pack_manifest.json",
  "tools/repo_contract_state.json"
]) must(rel);

const state = readRepoContractState();
if (Number(state.latestMasterPack) === 79) ok("state latest master pack is 79"); else fail("state latest master pack is 79");
if (Number(state.stableTo) === 78) ok("state stable_to remains 78"); else fail("state stable_to remains 78");
if (String(state.nextMilestone || "") === "M80") ok("state next milestone stays M80 main gate"); else fail("state next milestone stays M80 main gate");
if (Array.isArray(state.activeMilestones) && state.activeMilestones.includes("M80.2")) ok("state marks M80.2 active"); else fail("state marks M80.2 active");

const manifest = JSON.parse(read("tools/milestone_pack_manifest.json"));
const stage = Array.isArray(manifest.stages) ? manifest.stages.find((s) => s.id === "M80.2") : null;
if (stage) ok("manifest contains M80.2 stage"); else fail("manifest contains M80.2 stage");
if (stage?.script === "tools/pack_m80_2_agreements_shifts_giris_yuku.ps1") ok("manifest points to M80.2 pack script"); else fail("manifest points to M80.2 pack script");
if (stage?.check === "tools/check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1") ok("manifest points to M80.2 repo contract check"); else fail("manifest points to M80.2 repo contract check");
if (stage?.runtime === "backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js") ok("manifest points to M80.2 runtime check"); else fail("manifest points to M80.2 runtime check");

const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
const shifts = read("web/src/panels/company/ShiftsPanel.jsx");

if (includesText(agreements, "shiftStatsCacheRef")) ok("AgreementsPanel keeps shift stats cache ref"); else fail("AgreementsPanel keeps shift stats cache ref");
if (includesText(agreements, "ttlMs: 30000")) ok("AgreementsPanel widens agreement list ttl"); else fail("AgreementsPanel widens agreement list ttl");
if (includesText(agreements, "shiftStatsCacheRef.current.has(statsKey)")) ok("AgreementsPanel reuses cached shift stats"); else fail("AgreementsPanel reuses cached shift stats");
if (includesText(agreements, "}, [token, take, statusFilter]);")) ok("AgreementsPanel load effect is unified"); else fail("AgreementsPanel load effect is unified");
const agreementUseEffects = count(agreements, /useEffect\s*\(/g);
if (agreementUseEffects <= 6) ok(`AgreementsPanel useEffect count reduced to ${agreementUseEffects}`); else fail(`AgreementsPanel useEffect count reduced to <=6 (actual ${agreementUseEffects})`);

if (includesText(shifts, "commercialSummaryCacheRef") && includesText(shifts, "commercialSummaryPromiseRef")) ok("ShiftsPanel keeps summary cache refs"); else fail("ShiftsPanel keeps summary cache refs");
if (includesText(shifts, "async function loadCommercialSummary")) ok("ShiftsPanel uses dedicated commercial summary loader"); else fail("ShiftsPanel uses dedicated commercial summary loader");
if (includesText(shifts, "company:autoOfferShiftId") && includesText(shifts, "company:autoOffersListShiftId")) ok("ShiftsPanel keeps unified post-wizard offer intents"); else fail("ShiftsPanel keeps unified post-wizard offer intents");
if (includesText(shifts, "localStorage.setItem(LS_LAST_ROOM")) ok("ShiftsPanel keeps merged room persist flow"); else fail("ShiftsPanel keeps merged room persist flow");
const shiftsUseEffects = count(shifts, /useEffect\s*\(/g);
if (shiftsUseEffects <= 14) ok(`ShiftsPanel useEffect count reduced to ${shiftsUseEffects}`); else fail(`ShiftsPanel useEffect count reduced to <=14 (actual ${shiftsUseEffects})`);

console.log("INFO running scale readiness baseline");
const scale = spawnSync(process.execPath, [path.join(repoRoot, "backend/scripts/scale_readiness_check.js")], { cwd: repoRoot, encoding: "utf8" });
if ((scale.stdout || "").trim()) process.stdout.write(scale.stdout);
if ((scale.stderr || "").trim()) process.stderr.write(scale.stderr);
const scaleText = `${scale.stdout || ""}\n${scale.stderr || ""}`;
if (scale.status === 0) ok("scale readiness baseline passed"); else fail("scale readiness baseline passed");
if (!scaleText.includes("WARN web/src/panels/company/AgreementsPanel.jsx ->")) ok("scale readiness no longer warns for AgreementsPanel"); else fail("scale readiness no longer warns for AgreementsPanel");
if (scaleText.includes("WARN web/src/panels/company/ShiftsPanel.jsx -> initialLoadCalls=12") || scaleText.includes("WARN web/src/panels/company/ShiftsPanel.jsx -> initialLoadCalls=13") || scaleText.includes("WARN web/src/panels/company/ShiftsPanel.jsx -> initialLoadCalls=14")) ok("scale readiness reflects lower ShiftsPanel entry load"); else fail("scale readiness reflects lower ShiftsPanel entry load");

if (process.exitCode) process.exit(process.exitCode);
console.log("M80.2 AGREEMENTS + SHIFTS GIRIS YUKU CHECK PASS");
