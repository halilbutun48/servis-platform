#!/usr/bin/env node

import {
  runImpactAwareValidationV1,
} from "./lib/impactAwareValidationExecutorV1.js";

function usage() {
  console.log(`
Usage:
  node backend/scripts/run_impact_aware_validation_v1.js --mode focused --path backend/src/routes/companyOverview.js
  node backend/scripts/run_impact_aware_validation_v1.js --mode plan_only --path web/src/App.jsx
  node backend/scripts/run_impact_aware_validation_v1.js --mode full_chain_required --path web/src/App.jsx

Options:
  --mode <PLAN_ONLY|FOCUSED|FULL_CHAIN_REQUIRED>
  --path <relative-path>    May be repeated.
  --json                    Print the execution plan as JSON before execution.
`);
}

function normalizeMode(value) {
  const normalized = String(value || "FOCUSED")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "PLAN" || normalized === "PLAN_ONLY") {
    return "PLAN_ONLY";
  }
  if (normalized === "FOCUSED" || normalized === "FOCUSED_DRY_RUN") {
    return "FOCUSED";
  }
  if (normalized === "FULL_CHAIN" || normalized === "FULL_CHAIN_REQUIRED") {
    return "FULL_CHAIN_REQUIRED";
  }

  throw new Error(`FAIL invalid mode ${String(value)}`);
}

function parseArgs(argv) {
  const out = {
    mode: "FOCUSED",
    paths: [],
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--json") {
      out.json = true;
    } else if (arg === "--mode") {
      out.mode = argv[++index];
    } else if (arg.startsWith("--mode=")) {
      out.mode = arg.slice("--mode=".length);
    } else if (arg === "--path") {
      out.paths.push(argv[++index]);
    } else if (arg.startsWith("--path=")) {
      out.paths.push(arg.slice("--path=".length));
    } else if (arg.startsWith("--")) {
      throw new Error(`FAIL unknown option ${arg}`);
    } else {
      out.paths.push(arg);
    }
  }

  out.mode = normalizeMode(out.mode);
  out.paths = out.paths.map((value) => String(value || "").replace(/\\/g, "/").trim()).filter(Boolean);
  if (out.paths.length === 0) {
    throw new Error("FAIL at least one changed path is required");
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runImpactAwareValidationV1(args.paths, { mode: args.mode });

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          version: result.version,
          requestedMode: result.requestedMode,
          executionMode: result.executionMode,
          selectedStepCount: result.selection.selectedStepCount,
          fallbackReasons: result.selection.fallbackReasons,
          unresolvedCandidateCheckIds: result.selection.unresolvedCandidateCheckIds,
          exitCode: result.exitCode,
          executed: result.executed,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`RESULT requestedMode=${result.requestedMode} executionMode=${result.executionMode} executed=${result.executed ? "YES" : "NO"} exitCode=${result.exitCode}`);
    console.log(`SELECTED steps=${result.selection.selectedStepCount} focused=${result.selection.focusedSelectedCount} release=${result.selection.releaseChainCount}`);
    if (result.selection.fallbackReasons.length > 0) {
      console.log(`FALLBACK ${result.selection.fallbackReasons.join(", ")}`);
    }
  }

  process.exit(result.exitCode);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
