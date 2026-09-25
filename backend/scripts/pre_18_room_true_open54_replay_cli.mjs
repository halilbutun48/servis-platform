/*
 * Thin, Windows-safe process boundary for the frozen ROOM TRUE-OPEN54 replay.
 * All behavioral/auth/reset/network work remains inside the canonical runner.
 */
import { runRoomTrueOpen54Acceptance } from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";

const args = new Set(process.argv.slice(2));
const allowed = new Set(["--validate-start", "--run-real-browser"]);
for (const arg of args) {
  if (!allowed.has(arg)) throw new Error(`TRUE_OPEN54_CLI_ARGUMENT_UNSUPPORTED:${arg}`);
}
if (args.size !== 1) throw new Error("TRUE_OPEN54_CLI_MODE_REQUIRED");

const validateStart = args.has("--validate-start");
const summary = await runRoomTrueOpen54Acceptance({ validateStart });
console.log(JSON.stringify({
  ...summary,
  CLI_BEHAVIORAL_IMPLEMENTATION_COUNT: 0,
  CLI_AUTH_IMPLEMENTATION_COUNT: 0,
  CLI_RESET_IMPLEMENTATION_COUNT: 0,
  CLI_BUDGET_IMPLEMENTATION_COUNT: 0,
  CLI_NETWORK_RECORDER_IMPLEMENTATION_COUNT: 0,
  CLI_HYBRID_EXECUTOR_IMPLEMENTATION_COUNT: 0,
}, null, 2));
