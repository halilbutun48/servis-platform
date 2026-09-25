/*
 * Thin Windows-safe process boundary for the frozen ROOM ROOT-HIT190 replay.
 * Selection validation and all runtime behavior stay in the canonical runner.
 */
import { runRoomCanonicalReplayAcceptance } from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";

const args = process.argv.slice(2);
const modes = args.filter((arg) => arg === "--validate-start" || arg === "--run-real-browser");
const profileArgs = args.filter((arg) => arg.startsWith("--profile="));
if (args.some((arg) => /^(--selection-file=|--ids=|--count=)/u.test(arg))) {
  throw new Error("ROOT_HIT190_ARBITRARY_SELECTION_REJECTED");
}
if (modes.length !== 1 || profileArgs.length > 1 || args.length !== modes.length + profileArgs.length) {
  throw new Error("ROOT_HIT190_CLI_ARGUMENTS_INVALID");
}
const profileId = profileArgs.length
  ? profileArgs[0].slice("--profile=".length)
  : "ROOM_ROOT_HIT190";
if (!["ROOM_ROOT_HIT190", "ROOM_ROOT_HIT190_REMAINING7_CANARY", "ROOM_ROOT_HIT190_REMAINING4_CANARY", "ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY", "ROOM_OTHER423_BATCH01_SHARED_CORE_CANARY"].includes(profileId)) {
  throw new Error(`ROOT_HIT190_APPROVED_PROFILE_REQUIRED:${profileId || "MISSING"}`);
}

const summary = await runRoomCanonicalReplayAcceptance({
  profileId,
  validateStart: modes[0] === "--validate-start",
});
console.log(JSON.stringify({
  ...summary,
  CLI_BEHAVIORAL_IMPLEMENTATION_COUNT: 0,
  CLI_EXECUTOR_IMPLEMENTATION_COUNT: 0,
  CLI_AUTH_IMPLEMENTATION_COUNT: 0,
  CLI_RESET_IMPLEMENTATION_COUNT: 0,
  CLI_BUDGET_IMPLEMENTATION_COUNT: 0,
  CLI_RECORDER_IMPLEMENTATION_COUNT: 0,
}, null, 2));
