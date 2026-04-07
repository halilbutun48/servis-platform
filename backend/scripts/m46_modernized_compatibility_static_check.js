import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function must(msg, cond) { cond ? ok(msg) : fail(msg); }

const files = [
  "scripts/m46_1_ai_copilot_enrichment_check.js",
  "scripts/m46_2_ai_copilot_intent_expansion_check.js",
  "scripts/m46_3_ai_copilot_quality_evidence_check.js",
  "scripts/m46_4_ai_copilot_decision_consistency_check.js",
  "scripts/m46_5_ai_copilot_action_prioritization_check.js",
  "scripts/m46_6_a_ai_job_guide_check.js",
  "scripts/m46_6_b_ai_job_guide_precheck_check.js",
  "scripts/m46_6_c_ai_screen_help_check.js",
  "scripts/m46_6_c2_screen_coverage_terminology_check.js",
  "scripts/m46_6_t_ai_location_source_guide_check.js",
];
for (const rel of files) {
  const t = read(rel);
  must(`${path.basename(rel)} avoids exact legacy copilotVersion equality`, !/copilotVersion\s*===\s*['"]M46/i.test(t));
}
const c2 = read("scripts/m46_6_c2_screen_coverage_terminology_check.js");
must("terminology check accepts plain-language georeview explanation", /route estimate basics|rota|mesafe|süre|sure|hesap/.test(c2));
const runbook = fs.readFileSync(path.join(root, "..", "docs", "RUNBOOK_M46_AI_COPILOT.md"), "utf8");
must("M46 runbook includes M79 compatibility note", /Uyumluluk notu \(M79\+\)/.test(runbook));
if (process.exitCode) process.exit(process.exitCode);

const repoContracts = [
  "../tools/check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1",
  "../tools/check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1",
  "../tools/check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1",
];
for (const rel of repoContracts) {
  const t = fs.readFileSync(path.join(root, rel), "utf8");
  must(
    `${path.basename(rel)} uses structural forward-version markers`,
    /typeof .*copilotVersion.*===.*["']string["']/.test(t) || /accepts forward versions/i.test(t) || /forward-version markers/i.test(t),
  );
}
