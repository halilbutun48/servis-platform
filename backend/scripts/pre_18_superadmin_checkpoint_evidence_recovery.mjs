import fs from "node:fs/promises";
import path from "node:path";
import {
  atomicWriteJson,
  isTerminalActionEvidence,
  mergeActionCheckpoints,
  writeImmutableJson,
} from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const root = process.cwd();
const runId = process.argv.find((value) => value.startsWith("--run-id="))?.slice("--run-id=".length) || "pre18-superadmin-root-owner-checkpoint-2026-09-11-a";
const completionRoot = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion");
const legacyCheckpointPath = path.join(completionRoot, "runs", "pre18-luna-full-2026-09-11-final7", "ROLE-SUPER_ADMIN", "checkpoint.json");
const partialReportPath = path.join(completionRoot, "runs", "pre18-luna-full-2026-09-11-final7", "partial-final-report.json");
const canonicalPath = path.join(completionRoot, "canonical-resume-checkpoints", "ROLE-SUPER_ADMIN", "canonical-checkpoint.json");
const artifactDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-superadmin-root-owner-checkpoint-harness-corrective", "runs", runId);

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function evidenceResolves(reference) {
  if (typeof reference !== "string") return true;
  return fs.access(path.resolve(root, reference)).then(() => true).catch(() => false);
}

async function main() {
  const [legacy, partial, canonical] = await Promise.all([
    readJson(legacyCheckpointPath),
    readJson(partialReportPath),
    readJson(canonicalPath).catch(() => null),
  ]);
  const expected = Number(partial?.INTERACTION_PARTIAL?.CURRENT_ACTION_CONTRACTS || 0);
  const current = legacy.actions || [];
  if (expected !== 73) throw new Error(`expected historical contract count is not authoritative: ${expected}`);
  if (current.length !== 46) throw new Error(`current checkpoint count changed unexpectedly: ${current.length}`);
  const present = await Promise.all(current.map(async (action) => ({
    ACTION_CONTRACT_ID: action.ACTION_CONTRACT_ID,
    ACTION_NAME: action.ACTION_NAME,
    ROLE: action.ROLE,
    ROUTE: action.ROUTE,
    VIEWPORT: action.VIEWPORT,
    SURFACE: action.SURFACE_ID,
    EXECUTION_STATE: action.executionState || action.EXECUTION_STATE,
    RECOVERY_CLASSIFICATION: "CURRENT_CHECKPOINT_PRESENT",
    TERMINAL_EVIDENCE: isTerminalActionEvidence(action),
    EVIDENCE_REFS_RESOLVE: (await Promise.all((action.evidence || []).map(evidenceResolves))).every(Boolean),
  })));
  const reportOnly = Array.from({ length: expected - current.length }, (_, index) => ({
    RECOVERY_SLOT: `SUPERADMIN_REPORT_ONLY_HISTORICAL_SLOT_${String(index + 1).padStart(2, "0")}`,
    ACTION_CONTRACT_ID: null,
    RECOVERY_CLASSIFICATION: "REPORT_ONLY_NO_RAW_PROOF",
    REASON: "The immutable partial report proves a count, but the overwritten checkpoint retained no action-contract identity or raw per-action evidence for this slot.",
  }));
  const merged = mergeActionCheckpoints(canonical || { actions: [] }, current, { runId, runKind: "SELF_CHECK" });
  merged.recovery = {
    ...(merged.recovery || {}),
    EXPECTED_HISTORICAL_CONTRACT_COUNT: expected,
    CURRENT_CHECKPOINT_CONTRACT_COUNT: current.length,
    RECOVERABLE_FROM_RAW_TERMINAL_EVIDENCE_COUNT: 0,
    RECOVERABLE_FROM_RAW_NONTERMINAL_EVIDENCE_COUNT: 0,
    REPORT_ONLY_NO_RAW_PROOF_COUNT: reportOnly.length,
    MISSING_UNPROVEN_COUNT: 0,
    CANONICAL_RECOVERED_CHECKPOINT_COUNT: merged.actions.length,
    source: path.relative(root, legacyCheckpointPath).replace(/\\/gu, "/"),
  };
  await atomicWriteJson(canonicalPath, merged);
  const report = {
    SUPERADMIN_EVIDENCE_RECOVERY_MAP: [...present, ...reportOnly],
    EXPECTED_HISTORICAL_CONTRACT_COUNT: expected,
    CURRENT_CHECKPOINT_CONTRACT_COUNT: current.length,
    CURRENT_CHECKPOINT_PRESENT_COUNT: present.length,
    CURRENT_RAW_TERMINAL_EVIDENCE_COUNT: present.filter((item) => item.TERMINAL_EVIDENCE && item.EVIDENCE_REFS_RESOLVE).length,
    RECOVERABLE_FROM_RAW_TERMINAL_EVIDENCE_COUNT: 0,
    RECOVERABLE_FROM_RAW_NONTERMINAL_EVIDENCE_COUNT: 0,
    REPORT_ONLY_NO_RAW_PROOF_COUNT: reportOnly.length,
    MISSING_UNPROVEN_COUNT: 0,
    CANONICAL_RECOVERED_CHECKPOINT_COUNT: merged.actions.length,
    KNOWN_ACTION_CONTRACT_LOSS_COUNT: merged.checkpointMerge.knownActionContractLossCount,
    canonicalCheckpoint: path.relative(root, canonicalPath).replace(/\\/gu, "/"),
  };
  await fs.mkdir(artifactDir, { recursive: true });
  const reportPath = path.join(artifactDir, "evidence-recovery-map.json");
  try { await writeImmutableJson(reportPath, report); } catch (error) { if (!String(error?.message || "").startsWith("immutable artifact already exists:")) throw error; }
  console.log(JSON.stringify({ ...report, artifact: path.relative(root, reportPath).replace(/\\/gu, "/") }, null, 2));
}

await main();
