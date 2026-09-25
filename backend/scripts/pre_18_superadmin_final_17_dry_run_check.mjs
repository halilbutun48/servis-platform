/* No-browser accounting gate for the single authorized Super Admin replay. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildSuperAdmin26Migration } from "./lib/pre_18_superadmin_26_contract_migration_v1.mjs";

const root = process.cwd();
const checkpointPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/canonical-resume-checkpoints/ROLE-SUPER_ADMIN/canonical-checkpoint.json");
const historicalSummaryPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-superadmin-final-semantic-2026-09-12-terra-b/superadmin-final-residual-canary/summary.json");
const slots = ["C00", "C09", "C10", "C16", "C19", "C20", "C22", "C23", "C24", "C25", "C29", "C30", "C31", "C32", "C33", "C35", "C36"];
const historical = JSON.parse(fs.readFileSync(historicalSummaryPath, "utf8")).results;
const migration = buildSuperAdmin26Migration(historical);
const rows = migration.rows.filter((row) => slots.includes(row.SLOT));
const terminalPath = (row) => row.TERMINAL_POLICY === "SAFE_DETERMINISTIC_EXECUTION"
  ? "SAFE_DETERMINISTIC_EXECUTION"
  : row.TERMINAL_POLICY === "SAFE_BOUNDARY"
    ? "SAFE_BOUNDARY"
    : row.TERMINAL_POLICY === "COMPATIBLE_EFFECT_EQUIVALENCE"
      ? "COMPATIBLE_EFFECT_EQUIVALENCE"
      : "CONDITIONAL_HISTORICAL_STATE";

assert.deepEqual(rows.map((row) => row.SLOT), slots, "replay scope must be exactly the authorized 17 contracts");
const paths = Object.fromEntries(rows.map((row) => [row.SLOT, terminalPath(row)]));
const safe = rows.filter((row) => terminalPath(row) === "SAFE_DETERMINISTIC_EXECUTION");
const equivalenceOrBoundary = rows.filter((row) => ["SAFE_BOUNDARY", "COMPATIBLE_EFFECT_EQUIVALENCE"].includes(terminalPath(row)));
const conditional = rows.filter((row) => terminalPath(row) === "CONDITIONAL_HISTORICAL_STATE");
assert.equal(safe.length, 10);
assert.equal(equivalenceOrBoundary.length, 6);
assert.equal(conditional.length, 1);
assert.equal(new Set(rows.map((row) => row.SLOT)).size, 17);
assert.equal(new Set([...safe, ...equivalenceOrBoundary, ...conditional].map((row) => row.SLOT)).size, 17);
const checkpointHash = crypto.createHash("sha256").update(fs.readFileSync(checkpointPath)).digest("hex").toUpperCase();
assert.equal(checkpointHash, "50EE714A13D7CE4C466E2B49C57E4A3E3BD7544BDFCB3D32A88BC84C089C8129");

console.log(JSON.stringify({
  REPLAY_TARGET_COUNT: rows.length,
  SAFE_DETERMINISTIC_EXECUTION: safe.length,
  EQUIVALENCE_OR_BOUNDARY_TERMINALIZABLE: equivalenceOrBoundary.length,
  NONDETERMINISTIC_HISTORICAL_STATE: conditional.length,
  INTENDED_TERMINAL_PATH_BY_ID: paths,
  FROZEN_CHECKPOINT_SHA256: checkpointHash,
  DRY_RUN_ACCOUNTING_BALANCED: "YES",
}, null, 2));
