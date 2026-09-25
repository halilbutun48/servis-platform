import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const runId = process.argv.find((x) => x.startsWith("--run-id="))?.slice(9) || "";
const runRoot = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs", runId);
const checkpointPath = path.join(runRoot, "ROLE-SUPER_ADMIN", "checkpoint.json");
const checkpoint = JSON.parse(await fs.readFile(checkpointPath, "utf8"));
const actions = checkpoint.actions || [];
const counts = {};
for (const action of actions) counts[action.executionState] = (counts[action.executionState] || 0) + 1;
const iaPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/ia-addendum/addendum-summary.json");
const ia = JSON.parse(await fs.readFile(iaPath, "utf8"));
const report = {
  RUN_ID: runId,
  STATUS: "INCOMPLETE",
  REAL_BROWSER_ENGINE: "Chromium 148.0.7778.96",
  BROWSER_AUTOMATION_LAYER: "Playwright @playwright/test 1.60.0",
  PUBLIC_TUNNEL_ORIGIN: "https://puerto-harry-autos-phd.trycloudflare.com/",
  HEADLESS_INTERACTION_EXECUTION_USED: "YES",
  RENDERED_SCREENSHOT_REVIEW_USED: "YES; 12 fresh contact sheets from frozen first-discovery Chromium evidence",
  CURRENT_RUNTIME_PARITY: { health: 200, dbOk: true, head: "e3bec6177f32263325bd14e876502faacac7a5b0", branch: "m90d1_web_lint_inventory" },
  FIRST_DISCOVERY_SCOPE: { roles: 8, navigation: 71, navigationOpened: 71, unopened: 0, majorSurfaces: 79, desktop: 79, tablet: 79, mobile: 79 },
  INTERACTION_PARTIAL: { ROLE_SHARDS_STARTED: ["SUPER_ADMIN"], ROLE_SHARDS_NOT_STARTED: ["ROOM", "COMPANY", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT"], CURRENT_ACTION_CONTRACTS: actions.length, CURRENT_TERMINAL_CLASSIFIED: actions.filter((x) => ["PROVEN_PASS", "PROVEN_PRODUCT_DEFECT", "ACCESSIBILITY_PRODUCT_DEFECT", "VALIDLY_SKIPPED", "NOT_SAFE_TO_EXECUTE_FULLY"].includes(x.executionState)).length, CURRENT_PROVEN_PASS: counts.PROVEN_PASS || 0, CURRENT_UNSAFE_SAFETY_FLOW_PROVEN: counts.NOT_SAFE_TO_EXECUTE_FULLY || 0, CURRENT_HARNESS_FAILURE: counts.HARNESS_FAILURE || 0, FULL_INVENTORY_TOTAL: "NOT_PROVEN", FULL_SAFE_UNTESTED: "NOT_PROVEN", FULL_UNSAFE_UNTESTED: "NOT_PROVEN", UNSAFE_ACCIDENTAL: 0 },
  VISUAL_AND_IA: { MAJOR_SURFACES_WITH_COMPLETE_VISUAL_JUDGMENT: 79, MAJOR_SURFACES_WITH_INCOMPLETE_VISUAL_JUDGMENT: 0, ROLE_MENU_IA_COMPLETE_COUNT: ia.ROLE_MENU_IA_COMPLETE_COUNT, MENU_ITEM_IA_REVIEW_COUNT: ia.VISIBLE_MENU_ITEM_IA_REVIEW_COUNT, SCREEN_IA_COMPLETE_COUNT: ia.MAJOR_SURFACE_SCREEN_IA_COMPLETE_COUNT, IA_MATRIX_PATH: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/ia-addendum" },
  REMAINING_BLOCKERS: ["Full hybrid action execution did not reach all surface-state/action contracts; public-tunnel route/state transitions remained too slow for this bounded run.", "Seven role-sharded interaction checkpoints were not started in the final run.", "No full-run unsafe-control counter or interaction-family terminal counter can be honestly claimed."],
  GOVERNANCE: { PRODUCT_SOURCE_EDITED_BY_LUNA: "NO", PRODUCT_BEHAVIOR_CHANGED: "NO", BACKEND_BUSINESS_LOGIC_CHANGED: "NO", FROZEN_LEDGER_MUTATED: "NO", SECOND_DISCOVERY_STARTED: "NO", MILESTONE_18_STARTED: "NO", COMMIT_CREATED: "NO", TAG_CREATED: "NO", PUSH_PERFORMED: "NO", FINAL_REPOSITORY_CLOSURE_STARTED: "NO" },
};
await fs.writeFile(path.join(runRoot, "partial-final-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
