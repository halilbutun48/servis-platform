import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const command = path.join(repoRoot, "backend", "scripts", "run_repo_check_chain.js");
const result = spawnSync(process.execPath, [command, "--adoption-proof"], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr || "adoption proof command failed");
const proof = JSON.parse(result.stdout);
const holdout = proof.subrules?.AI_HOLDOUT_REQUIRED_WHERE_APPLICABLE;

assert.equal(proof.schemaVersion, "EXECUTION_GOVERNANCE_BOUNDED_PROGRESS_PROOF_V1");
assert.equal(proof.invariantId, "EXECUTION-GOVERNANCE-BOUNDED-PROGRESS");
assert.equal(holdout?.proofState, "PROVEN_PASS", holdout?.evidence || "AI holdout proof was not consumed");
assert.match(holdout?.evidence || "", /56\/56/);
assert.match(holdout?.evidence || "", /S1/);
assert.match(holdout?.evidence || "", /S2/);
assert.match(holdout?.evidence || "", /zero business writes/i);

console.log(JSON.stringify({
  status: "PASS",
  proofResult: proof.result,
  holdoutProofState: holdout.proofState,
}));
