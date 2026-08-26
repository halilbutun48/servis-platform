import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../../..");

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

export function gitExec(args) {
  return execFileSync("git", ["-c", `safe.directory=${repoRoot.replace(/\\/g, "/")}`, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function gitLines(args) {
  const out = gitExec(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function gitCachedNames() {
  return gitLines(["diff", "--cached", "--name-only"]);
}

export function gitStatusNames() {
  return String(gitExec(["status", "--porcelain=v1", "--untracked-files=all"]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

export function gitDiffNames(paths) {
  return gitLines(["diff", "--name-only", "--", ...paths]);
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

export function gitStatusEntries(paths) {
  return String(
    gitExec(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || ""
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

export function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  must(files.length === 0, `${label}: ${files.join(", ") || "(none)"}`);
}

export function mustNoDiffExcept(paths, allowedFiles, label) {
  const files = gitDiffNames(paths).filter((file) => !allowedFiles.includes(file));
  must(files.length === 0, `${label}: ${files.join(", ") || "(none)"}`);
}

function normalizeAllowedDiffEntry(entry) {
  if (typeof entry === "string") {
    return { path: normalizePath(entry), sha256: null };
  }
  if (entry && typeof entry === "object") {
    const pathText = normalizePath(entry.path || entry.file || entry.relPath || "");
    must(Boolean(pathText), `normalized diff allowlist entry: ${JSON.stringify(entry)}`);
    return {
      path: pathText,
      sha256: entry.sha256 ? String(entry.sha256).trim().toUpperCase() : null,
    };
  }
  must(false, `invalid diff allowlist entry: ${String(entry)}`);
  return { path: "", sha256: null };
}

function fileSha256(relPath) {
  return createHash("sha256")
    .update(fs.readFileSync(path.join(repoRoot, normalizePath(relPath))))
    .digest("hex")
    .toUpperCase();
}

function allowedDiffMap(allowedEntries) {
  return new Map(
    allowedEntries.map((entry) => {
      const normalized = normalizeAllowedDiffEntry(entry);
      return [normalized.path, normalized.sha256];
    })
  );
}

export function mustNoDiffExceptWithIdentity(paths, allowedEntries, label) {
  const allowed = allowedDiffMap(allowedEntries);
  const files = gitDiffNames(paths);
  const unexpected = files.filter((file) => !allowed.has(file));
  const identityMismatches = [];

  for (const file of files) {
    const expectedSha = allowed.get(file);
    if (!expectedSha) {
      continue;
    }
    const actualSha = fileSha256(file);
    if (actualSha !== expectedSha) {
      identityMismatches.push(`${file} expected ${expectedSha} got ${actualSha}`);
    }
  }

  const failures = [...unexpected, ...identityMismatches];
  must(failures.length === 0, `${label}: ${failures.join(", ") || "(none)"}`);
}

export function mustDiffEmptyOrExactlyWithIdentity(paths, allowedEntries, label) {
  const allowed = allowedDiffMap(allowedEntries);
  const files = gitDiffNames(paths);
  if (files.length === 0) {
    must(true, label);
    return;
  }

  const unexpected = files.filter((file) => !allowed.has(file));
  const missing = [...allowed.keys()].filter((file) => !files.includes(file));
  const identityMismatches = [];

  for (const file of files) {
    const expectedSha = allowed.get(file);
    if (!expectedSha) {
      continue;
    }
    const actualSha = fileSha256(file);
    if (actualSha !== expectedSha) {
      identityMismatches.push(`${file} expected ${expectedSha} got ${actualSha}`);
    }
  }

  const failures = [...unexpected, ...missing.map((file) => `missing ${file}`), ...identityMismatches];
  must(failures.length === 0, `${label}: ${failures.join(", ") || "(none)"}`);
}

export function mustStatusEmptyOrExactlyWithIdentity(paths, allowedEntries, label) {
  const allowed = allowedDiffMap(allowedEntries);
  const entries = gitStatusEntries(paths);
  if (entries.length === 0) {
    must(true, label);
    return;
  }

  const actualPaths = sortedUniquePaths(entries.map((entry) => entry.path));
  const unexpected = actualPaths.filter((file) => !allowed.has(file));
  const missing = [...allowed.keys()].filter((file) => !actualPaths.includes(file));
  const statusViolations = [];
  const identityMismatches = [];

  for (const entry of entries) {
    const expectedSha = allowed.get(entry.path);
    if (!expectedSha) {
      continue;
    }

    const status = String(entry.raw || "").slice(0, 2);
    if (status.includes("D")) {
      statusViolations.push(`${entry.path} deletion not allowed (${entry.raw})`);
      continue;
    }
    if (status.includes("R")) {
      statusViolations.push(`${entry.path} rename not allowed (${entry.raw})`);
      continue;
    }

    const actualSha = fileSha256(entry.path);
    if (actualSha !== expectedSha) {
      identityMismatches.push(`${entry.path} expected ${expectedSha} got ${actualSha}`);
    }
  }

  const failures = [...unexpected, ...missing.map((file) => `missing ${file}`), ...statusViolations, ...identityMismatches];
  must(failures.length === 0, `${label}: ${failures.join(", ") || "(none)"}`);
}

export function mustStatusSubsetWithIdentity(paths, allowedEntries, label) {
  const allowed = allowedDiffMap(allowedEntries);
  const entries = gitStatusEntries(paths);
  if (entries.length === 0) {
    must(true, label);
    return;
  }

  const actualPaths = sortedUniquePaths(entries.map((entry) => entry.path));
  const unexpected = actualPaths.filter((file) => !allowed.has(file));
  const statusViolations = [];
  const identityMismatches = [];

  for (const entry of entries) {
    const expectedSha = allowed.get(entry.path);
    if (!expectedSha) {
      continue;
    }

    const status = String(entry.raw || "").slice(0, 2);
    if (status.includes("D")) {
      statusViolations.push(`${entry.path} deletion not allowed (${entry.raw})`);
      continue;
    }
    if (status.includes("R")) {
      statusViolations.push(`${entry.path} rename not allowed (${entry.raw})`);
      continue;
    }

    const actualSha = fileSha256(entry.path);
    if (actualSha !== expectedSha) {
      identityMismatches.push(`${entry.path} expected ${expectedSha} got ${actualSha}`);
    }
  }

  const failures = [...unexpected, ...statusViolations, ...identityMismatches];
  must(failures.length === 0, `${label}: ${failures.join(", ") || "(none)"}`);
}

export function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalizePath(name).startsWith(normalizePath(prefix))));
  must(hits.length === 0, `${label}: ${hits.join(", ") || "(none)"}`);
}

export function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  must(
    unexpected.length === 0 && missing.length === 0,
    `${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`
  );
}

const BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID = "NEW01_BATCH10_DOC_RUNBOOK_CLOSURE";

const BATCH10_DOC_WORKTREE_CLOSURE_RECORDS = Object.freeze([
  Object.freeze({
    path: "docs/PRIMER_SSOT.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
  Object.freeze({
    path: "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
  Object.freeze({
    path: "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
  Object.freeze({
    path: "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
  Object.freeze({
    path: "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
  Object.freeze({
    path: "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
  Object.freeze({
    path: "web/README.md",
    scopeId: BATCH10_DOC_WORKTREE_CLOSURE_SCOPE_ID,
    type: "DOCUMENTATION",
    ownership: "DOC_WORKTREE_SCOPE",
    semanticOwner: "DOC_WORKTREE_CONSUMERS",
  }),
]);

export const BATCH10_DOC_WORKTREE_CLOSURE_PATHS = Object.freeze(
  BATCH10_DOC_WORKTREE_CLOSURE_RECORDS.map(({ path }) => path),
);

export const BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET = new Set(BATCH10_DOC_WORKTREE_CLOSURE_PATHS);

export function isBatch10DocWorktreeClosurePath(file) {
  return BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET.has(normalizePath(file));
}

export const BATCH14_DOC_ARCHITECTURE_CONSOLIDATION_PATHS = Object.freeze([
  "docs/architecture/README.md",
  "docs/architecture/workflows/README.md",
  "docs/architecture/workflows/roles/README.md",
]);

export const BATCH14_DOC_ARCHITECTURE_CONSOLIDATION_PATH_SET = new Set(BATCH14_DOC_ARCHITECTURE_CONSOLIDATION_PATHS);

export function isBatch14DocArchitectureConsolidationPath(file) {
  return BATCH14_DOC_ARCHITECTURE_CONSOLIDATION_PATH_SET.has(normalizePath(file));
}

export const BATCH11_INDEX_WORKTREE_SCOPE_PATHS = Object.freeze([
  "backend/indexes/documentation_registry_v1.json",
  "backend/scripts/lib/documentationRegistryV1.js",
  "backend/scripts/generate_documentation_registry_v1.js",
  "backend/scripts/documentation_registry_v1_check.js",
]);

export const BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET = new Set(BATCH11_INDEX_WORKTREE_SCOPE_PATHS);

export function isBatch11IndexWorktreeScopePath(file) {
  return BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET.has(normalizePath(file));
}

export const BATCH13_FOUNDATION_OWNER_PATHS = Object.freeze([
  "backend/scripts/lib/guardGitScope.js",
]);

export const BATCH13_FOUNDATION_OWNER_PATH_SET = new Set(BATCH13_FOUNDATION_OWNER_PATHS);

export function isBatch13FoundationOwnerPath(file) {
  return BATCH13_FOUNDATION_OWNER_PATH_SET.has(normalizePath(file));
}

export const BATCH13_FOUNDATION_SUPPORT_PATHS = Object.freeze([
  "tools/repo_contract_state.json",
  "backend/scripts/change_impact_registry_v1_check.js",
  "backend/scripts/check_ownership_registry_v1_check.js",
  "backend/scripts/lib/changeImpactRegistryV1.js",
  "backend/scripts/lib/checkOwnershipRegistryV1.js",
  "backend/scripts/lib/impactAwareValidationPlannerV1.js",
  "backend/scripts/impact_aware_validation_planner_v1_check.js",
  "backend/scripts/lib/impactAwareValidationExecutorV1.js",
  "backend/scripts/run_impact_aware_validation_v1.js",
  "backend/scripts/impact_aware_validation_v1_check.js",
]);

export const BATCH13_FOUNDATION_SUPPORT_PATH_SET = new Set(BATCH13_FOUNDATION_SUPPORT_PATHS);

export function isBatch13FoundationSupportPath(file) {
  return BATCH13_FOUNDATION_SUPPORT_PATH_SET.has(normalizePath(file));
}

export const BATCH13_FOUNDATION_COMMAND_SURFACE_PATHS = Object.freeze([
  "backend/package.json",
]);

export const BATCH13_FOUNDATION_COMMAND_SURFACE_PATH_SET = new Set(BATCH13_FOUNDATION_COMMAND_SURFACE_PATHS);

export function isBatch13FoundationCommandSurfacePath(file) {
  return BATCH13_FOUNDATION_COMMAND_SURFACE_PATH_SET.has(normalizePath(file));
}

export const M80_M89_CONTRACT_SWEEP_REPO_CONTRACT_PATHS = Object.freeze([
  "tools/check_m62_commercial_core_strengthening_repo_contract.ps1",
  "tools/check_m82_10_super_admin_commercial_settings_repo_contract.ps1",
  "tools/check_m85_optional_payment_pilot_repo_contract.ps1",
  "tools/check_m86_required_payment_rollout_repo_contract.ps1",
  "tools/check_m87_payment_account_readiness_repo_contract.ps1",
  "tools/check_m88_settlement_operations_console_repo_contract.ps1",
]);

export const M80_M89_CONTRACT_SWEEP_REPO_CONTRACT_PATH_SET = new Set(M80_M89_CONTRACT_SWEEP_REPO_CONTRACT_PATHS);

export function isM80M89ContractSweepRepoContractPath(file) {
  return M80_M89_CONTRACT_SWEEP_REPO_CONTRACT_PATH_SET.has(normalizePath(file));
}

export const COMMERCIAL_PAYMENT_SECURITY_CHECKER_PATHS = Object.freeze([
  "backend/scripts/m62_commercial_core_strengthening_check.js",
  "backend/scripts/m82_10_super_admin_commercial_settings_check.js",
  "backend/scripts/m85_optional_payment_pilot_check.js",
  "backend/scripts/m86_required_payment_rollout_check.js",
  "backend/scripts/m87_payment_account_readiness_check.js",
  "backend/scripts/m88_settlement_operations_console_check.js",
  "backend/scripts/m89_settlement_reconciliation_desk_check.js",
  "backend/scripts/m94d_admin_payment_security_export_check.js",
]);

export const COMMERCIAL_PAYMENT_SECURITY_CHECKER_PATH_SET = new Set(COMMERCIAL_PAYMENT_SECURITY_CHECKER_PATHS);

export function isCommercialPaymentSecurityCheckerPath(file) {
  return COMMERCIAL_PAYMENT_SECURITY_CHECKER_PATH_SET.has(normalizePath(file));
}

export const BATCH13_APP_JSX_MIGRATION_CONSUMER_PATHS = Object.freeze([
  "backend/scripts/password_force_change_check.js",
  "backend/scripts/ui_route_resilience_hotfix_check.js",
  "backend/scripts/username_first_login_hotfix_check.js",
]);

export const BATCH13_APP_JSX_MIGRATION_CONSUMER_PATH_SET = new Set(BATCH13_APP_JSX_MIGRATION_CONSUMER_PATHS);

export function isBatch13AppJsxMigrationConsumerPath(file) {
  return BATCH13_APP_JSX_MIGRATION_CONSUMER_PATH_SET.has(normalizePath(file));
}

const APP_JSX_ROLE_TENANT_SCOPE_ENTRIES = Object.freeze([
  Object.freeze({
    path: "web/src/App.jsx",
    sha256: "7540C37A8C78807BB32B3D6C4595D7A42D483788CDC97C747E693A914D5D707F",
  }),
]);

const APP_JSX_ROLE_TENANT_SCOPE_SHA_MAP = new Map(
  APP_JSX_ROLE_TENANT_SCOPE_ENTRIES.map(({ path, sha256 }) => [normalizePath(path), String(sha256).toUpperCase()]),
);

export const APP_JSX_ROLE_TENANT_SCOPE_PATHS = Object.freeze(
  APP_JSX_ROLE_TENANT_SCOPE_ENTRIES.map(({ path }) => path),
);

export const APP_JSX_ROLE_TENANT_SCOPE_PATH_SET = new Set(APP_JSX_ROLE_TENANT_SCOPE_PATHS);

export function isAppJsxRoleTenantScopePath(file) {
  const normalized = normalizePath(file);
  const expectedSha = APP_JSX_ROLE_TENANT_SCOPE_SHA_MAP.get(normalized);
  if (!expectedSha) return false;
  const actualSha = fileSha256(normalized);
  must(actualSha === expectedSha, `App.jsx role-tenant identity mismatch: ${normalized}`);
  return true;
}
