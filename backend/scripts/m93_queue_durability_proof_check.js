#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repo = process.argv.includes("--repo-root")
  ? process.argv[process.argv.indexOf("--repo-root") + 1]
  : process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(repo, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(repo, rel));
}

let failed = false;
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { failed = true; console.error(`FAIL ${msg}`); }
function must(cond, msg) { cond ? ok(msg) : fail(msg); }
function includes(text, needle, msg) { must(text.includes(needle), msg); }

console.log("=== M93 QUEUE DURABILITY PROOF CHECK ===");

const files = [
  "backend/src/jobs/autoReachedQueue.js",
  "backend/src/routes/admin.js",
  "backend/scripts/m93_queue_durability_proof_check.js",
  "backend/scripts/m93_queue_durability_runtime_probe.js",
  "tools/pack_m93_queue_durability_proof.ps1",
  "docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md",
  "docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md",
];
for (const f of files) must(exists(f), `${f} exists`);

const queue = read("backend/src/jobs/autoReachedQueue.js");
const admin = exists("backend/src/routes/admin.js") ? read("backend/src/routes/admin.js") : "";

includes(queue, "AUTO_REACHED_DEAD_LETTER_KEY", "dead-letter key is defined");
includes(queue, "AUTO_REACHED_CLAIMS_HASH", "claim hash is defined");
includes(queue, "AUTO_REACHED_CLAIMS_INDEX", "claim index is defined");
includes(queue, "BRPOPLPUSH", "worker uses reliable pop-to-processing pattern");
includes(queue, "reclaimStaleClaims", "worker restart reclaim path exists");
includes(queue, "moveToDeadLetter", "dead-letter movement exists");
includes(queue, "requeueFromProcessing", "retry/requeue from processing exists");
includes(queue, "maxAttempts", "max attempts guard exists");
includes(queue, "getAutoReachedQueueHealthSnapshot", "queue health snapshot exists");
includes(queue, "evaluateAutoReachedQueueHealthThresholds", "queue threshold evaluator exists");
includes(queue, "getAutoReachedDeadLetterSnapshot", "dead-letter inspect helper exists");
includes(queue, "getAutoReachedQueueProofSnapshot", "combined proof snapshot helper exists");
includes(queue, "REDIS_NOT_CONNECTED", "redis down threshold warning exists");
includes(queue, "DEAD_LETTER_DEPTH_HIGH", "dead-letter threshold warning exists");
includes(queue, "OLDEST_CLAIM_STALE", "stale claim threshold warning exists");

includes(admin, "/queues/auto-reached", "admin auto-reached queue surface exists");
includes(admin, "/queues/auto-reached/dead-letter", "admin dead-letter read-only endpoint exists");
includes(admin, "/queues/auto-reached/proof", "admin proof endpoint exists");
includes(admin, "/queues/auto-reached/thresholds", "admin threshold endpoint exists");
must(admin.includes('requireRole("SUPER_ADMIN")') || admin.includes("requireSuperAdmin"), "admin endpoints require super admin guard");

const runbook = read("docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md");
includes(runbook, "Redis kesildi", "runbook covers Redis down/up drill");
includes(runbook, "Worker restart reclaim", "runbook covers worker restart reclaim drill");
includes(runbook, "Dead-letter", "runbook covers dead-letter visibility");
includes(runbook, "Queue health threshold", "runbook covers threshold check");

if (failed) {
  console.error("M93 QUEUE DURABILITY PROOF CHECK FAIL");
  process.exit(1);
}
console.log("M93 QUEUE DURABILITY PROOF CHECK PASS");
