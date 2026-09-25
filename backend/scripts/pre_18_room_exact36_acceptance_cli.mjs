/*
 * Canonical executable bootstrap for the bounded ROOM Exact36 runtime.
 * All browser, auth, reset, shared-budget, and recorder behavior remains in
 * the durable runner; this file only resolves bounded configuration and
 * delegates to its high-level entrypoint.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

function optionValue(argv, name) {
  return argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

function parseConfiguration(argv = []) {
  const validateStart = argv.includes("--validate-start");
  const runRealBrowser = argv.includes("--run-real-browser");
  const runResetCanary = argv.includes("--run-reset-canary");
  if ([validateStart, runRealBrowser, runResetCanary].filter(Boolean).length !== 1) throw new Error("EXACT36_CLI_MODE_REQUIRED");
  const webBaseUrl = optionValue(argv, "--web-base-url") || process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
  const apiBaseUrl = optionValue(argv, "--api-base-url") || process.env.API_BASE_URL || "http://127.0.0.1:3000";
  const runId = optionValue(argv, "--run-id") || process.env.PRE18_LUNA_RUN_ID || "";
  return { validateStart, runRealBrowser, runResetCanary, webBaseUrl, apiBaseUrl, runId };
}

export async function runRoomExact36Cli(argv = process.argv.slice(2)) {
  const config = parseConfiguration(argv);
  process.env.WEB_BASE_URL = config.webBaseUrl;
  process.env.API_BASE_URL = config.apiBaseUrl;
  if (config.runId) process.env.PRE18_LUNA_RUN_ID = config.runId;
  const { runRoomExact36Acceptance } = await import("./pre_18_luna_full_hybrid_surface_state_completion.mjs");
  return runRoomExact36Acceptance({ validateStart: config.validateStart, resetCanary: config.runResetCanary });
}

const currentScriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentScriptPath && currentScriptPath === fileURLToPath(import.meta.url)) {
  runRoomExact36Cli().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
