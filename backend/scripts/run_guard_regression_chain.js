#!/usr/bin/env node

import { runScriptChain } from "./lib/guardRunnerContracts.js";
import {
  coreRegressionScripts,
  extendedRegressionScripts,
  releaseRegressionScripts,
} from "./lib/guardRegressionTiers.js";

function usage() {
  console.log(`
Usage:
  node backend/scripts/run_guard_regression_chain.js --tier core
  node backend/scripts/run_guard_regression_chain.js --tier extended
  node backend/scripts/run_guard_regression_chain.js --tier release
  node backend/scripts/run_guard_regression_chain.js --list
`);
}

function parseArgs(argv) {
  const out = { tier: "core", list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--list") {
      out.list = true;
    } else if (arg === "--tier") {
      out.tier = String(argv[++i] || "").trim().toLowerCase();
    }
  }
  if (!["core", "extended", "release"].includes(out.tier)) {
    console.error(`ERROR unknown tier: ${out.tier}`);
    usage();
    process.exit(2);
  }
  return out;
}

function tierScripts(tier) {
  if (tier === "extended") return extendedRegressionScripts;
  if (tier === "release") return releaseRegressionScripts;
  return coreRegressionScripts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scripts = tierScripts(args.tier);

  if (args.list) {
    console.log(scripts.join("\n"));
    return;
  }

  const code = await runScriptChain(scripts, { label: `GUARD-V2 ${args.tier.toUpperCase()} REGRESSION` });
  process.exit(code);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
