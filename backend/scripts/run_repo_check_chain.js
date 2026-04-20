#!/usr/bin/env node

/*
  Canonical repo verification chain.

  This is the single orchestration entry for day-to-day repo health:
    npm run verify:repo

  It intentionally keeps the older milestone/check scripts as evidence, but
  removes the need to remember their historical order by hand.
*/

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function nodeStep(id, relPath, args = []) {
  return {
    id,
    command: process.execPath,
    args: [path.join(repoRoot, relPath), ...args],
  };
}

const phaseDefinitions = {
  lint: [
    nodeStep("backend-lint", "backend/scripts/run_backend_lint.js"),
    nodeStep("web-lint-with-evidence", "backend/scripts/run_web_lint_with_evidence.js"),
  ],
  docs: [
    nodeStep("docs-ssot-pack", "backend/scripts/docs_ssot_pack_check.js"),
    nodeStep("m61-ssot-milestone-alignment", "backend/scripts/m61_ssot_milestone_alignment_check.js"),
  ],
  hot: [
    nodeStep("m58-final-pilot-readiness", "backend/scripts/m58_final_pilot_readiness_check.js"),
    nodeStep("m76b-living-matrix-tools-consolidation", "backend/scripts/m76b_living_matrix_tools_consolidation_check.js"),
    nodeStep("m76a2-final-normalization-archiving", "backend/scripts/m76a_2_final_normalization_archiving_check.js"),
    nodeStep("m77-kvkk-uyum-katmani", "backend/scripts/m77_kvkk_uyum_katmani_check.js"),
    nodeStep("m78-checklist-operasyon-dogrulama", "backend/scripts/m78_checklist_operasyon_dogrulama_check.js"),
    nodeStep("m79d1-copilot-acceptance-pack", "backend/scripts/m79_d1_copilot_acceptance_pack.js"),
    nodeStep("m82-1-correctness-guard", "backend/scripts/m82_1_correctness_guard_check.js"),
    nodeStep("m82-1-acceptance-contract", "backend/scripts/m82_1_acceptance_contract_check.js"),
  ],
  "web-contract": [
    nodeStep("m82-2-web-contract-cache", "backend/scripts/m82_2_web_contract_cache_check.js"),
  ],
  closure: [
    nodeStep("m90b1-canonical-closure-gate", "backend/scripts/m90_b1_canonical_closure_gate_check.js"),
    nodeStep("repo-audit", "backend/scripts/repo_audit.js"),
    nodeStep("m90c6-hot-file-queue-policy", "backend/scripts/m90_c6_hot_file_queue_policy_check.js"),
    nodeStep("m90c7-export-package-hygiene", "backend/scripts/m90_c7_export_package_hygiene_check.js"),
    nodeStep("m90c8-ci-verification-visibility", "backend/scripts/m90_c8_ci_verification_visibility_check.js"),
    nodeStep("m90c9-safe-closure-final-hygiene", "backend/scripts/m90_c9_safe_closure_final_hygiene_check.js"),
  ],
  milestones: [
    nodeStep("m0-latest-static-milestones", "backend/scripts/run_m0_latest.js", [
      "--static-only",
      "--to",
      "latest",
      "--continue",
    ]),
  ],
};

const defaultPhaseOrder = ["lint", "docs", "hot", "web-contract", "closure", "milestones"];

function usage() {
  console.log(`
Usage:
  node backend/scripts/run_repo_check_chain.js --phase all
  node backend/scripts/run_repo_check_chain.js --phase lint,docs
  node backend/scripts/run_repo_check_chain.js --list

Phases:
  ${defaultPhaseOrder.join(", ")}

Options:
  --phase <name|all|static>   Phase or comma-separated phases. Default: all.
  --continue                  Continue after a failed step.
  --list                      Print the ordered chain without running it.
`);
}

function parseArgs(argv) {
  const selected = [];
  const out = { phases: [], cont: false, list: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--continue") {
      out.cont = true;
    } else if (arg === "--list") {
      out.list = true;
    } else if (arg === "--phase") {
      selected.push(...String(argv[++i] || "").split(","));
    }
  }

  const rawPhases = selected.length ? selected : ["all"];
  for (const raw of rawPhases) {
    const phase = String(raw || "").trim().toLowerCase();
    if (!phase) continue;
    if (phase === "all" || phase === "static") {
      out.phases.push(...defaultPhaseOrder);
    } else if (phaseDefinitions[phase]) {
      out.phases.push(phase);
    } else {
      console.error(`ERROR unknown phase: ${raw}`);
      usage();
      process.exit(2);
    }
  }

  out.phases = [...new Set(out.phases)];
  return out;
}

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        REPO_ROOT: repoRoot,
        PROJECT_ROOT: repoRoot,
      },
      stdio: "inherit",
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function selectedSteps(phases) {
  return phases.flatMap((phase) =>
    phaseDefinitions[phase].map((step) => ({
      ...step,
      phase,
    }))
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const steps = selectedSteps(args.phases);

  console.log("\n=== REPO CHECK CHAIN ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Phases: ${args.phases.join(", ")}`);
  console.log(`Continue on fail: ${args.cont ? "YES" : "NO"}`);

  if (args.list) {
    for (const [index, step] of steps.entries()) {
      console.log(`${String(index + 1).padStart(2, "0")}. [${step.phase}] ${step.id}`);
    }
    return;
  }

  const results = [];
  for (const [index, step] of steps.entries()) {
    console.log(`\n--- ${index + 1}/${steps.length} [${step.phase}] ${step.id} ---`);
    const code = await runStep(step);
    const status = code === 0 ? "PASS" : `FAIL(${code})`;
    results.push({ phase: step.phase, id: step.id, status });

    if (code !== 0 && !args.cont) break;
  }

  const pass = results.filter((item) => item.status === "PASS").length;
  const fail = results.filter((item) => item.status.startsWith("FAIL")).length;

  console.log("\n=== REPO CHECK SUMMARY ===");
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  for (const result of results) {
    console.log(` - ${result.status.padEnd(8)} [${result.phase}] ${result.id}`);
  }

  if (fail > 0) process.exit(1);
  console.log("REPO CHECK CHAIN PASS");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
