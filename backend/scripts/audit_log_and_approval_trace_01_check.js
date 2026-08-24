#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsCheckScripts } from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import {
  BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET,
  isBatch14DocArchitectureConsolidationPath,
  BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET,
  isBatch13AppJsxMigrationConsumerPath,
  isBatch13FoundationCommandSurfacePath,
  isBatch13FoundationOwnerPath,
  isBatch13FoundationSupportPath,
  isAppJsxRoleTenantScopePath,
  isBatch11IndexWorktreeScopePath,
  isCommercialPaymentSecurityCheckerPath,
  isM80M89ContractSweepRepoContractPath,
  mustDiffEmptyOrExactlyWithIdentity,
  mustStatusEmptyOrExactlyWithIdentity,
} from "./lib/guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "AUDIT_LOG_AND_APPROVAL_TRACE_01.md"),
  securityDoc: path.join(repoRoot, "docs", "SECURITY_KVKK_FINAL_01.md"),
  dataIntegrityDoc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  debugLog: path.join(repoRoot, "debug.log"),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizePath(text) {
  return String(text || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContains(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) {
      throw new Error(`FAIL ${label}: missing ${needle}`);
    }
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitStatusNames() {
  const out = execFileSync("git", ["status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*../, "").trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) {
    throw new Error(`FAIL ${label}: ${unexpected.join(", ")}`);
  }
  console.log(`OK ${label}`);
}

function fileSha256(relPath) {
  return createHash("sha256")
    .update(fs.readFileSync(path.join(repoRoot, normalizePath(relPath))))
    .digest("hex")
    .toUpperCase();
}

function buildRegistryOwnedCheckerPaths(packageScripts, registryScripts) {
  const paths = new Set();

  for (const script of registryScripts) {
    const command = packageScripts?.[script];
    if (typeof command !== "string") {
      continue;
    }
    const match = command.match(/^\s*node\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    const resolved = normalizePath(match[1].replace(/^["']|["']$/g, ""));
    if (resolved.startsWith("backend/scripts/")) {
      paths.add(resolved);
    }
  }

  return paths;
}

function buildPackageWiredScriptPaths(packageScripts, scriptPrefix) {
  const paths = new Set();

  for (const [script, command] of Object.entries(packageScripts || {})) {
    if (!script.startsWith(scriptPrefix) || typeof command !== "string") {
      continue;
    }
    const match = command.match(/^\s*node\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    const resolved = normalizePath(match[1].replace(/^["']|["']$/g, ""));
    if (resolved.startsWith("backend/scripts/")) {
      paths.add(resolved);
    }
  }

  return paths;
}

function buildExpectedShaMap(entries) {
  return new Map(entries.map(({ path: entryPath, sha256 }) => [normalizePath(entryPath), String(sha256).toUpperCase()]));
}

const batch09ApprovedConcurrentWorktreeEntries = [
  { path: "backend/README.md", sha256: "0E5C4A471BB7CD0B361C7EC6FB33899CABD810D8CB3892913F66FE26BE8F8AE7" },
  { path: "backend/scripts/canonical_provenance_registry_01_check.js", sha256: "8EC706598066C9754923F3FD064F69F046892AA1B0BFF1473EACE29172113994" },
  { path: "backend/scripts/lib/canonicalProvenanceRegistry.js", sha256: "8FA5851B4CC686E82127B51ACD2969960BB988337A1435F925D94DD6B3010876" },
  { path: "backend/scripts/ux_all_panels_reality_audit_01_check.js", sha256: "F4F9BE905D1908ED9FB632225404968F36080F7B30785A20534D5D7C65380567" },
  { path: "backend/src/bootstrap/rateLimits.js", sha256: "D493701282D68ABA6F1DAFCAD4F01F9A65A432ECCA91F6A168A1058F119D3A2C" },
  { path: "backend/src/middleware/apiRequestLog.js", sha256: "5F27CA48608B10C6DDCD35F9D1C1E146D6AD432EAD63C90CF117F0EA3A051EE3" },
  { path: "backend/src/middleware/asyncHandler.js", sha256: "F206378CE995B6B15A3C340F81E8F8B16EDA65638558EF46F1F373ABBF166F0C" },
  { path: "infra/docker-compose.yml", sha256: "020E0CDFC9745991CB349FED12CEB741BFB973540116FD4664F8ACEFB7A09B22" },
];
const batch09ApprovedConcurrentWorktreeShas = buildExpectedShaMap(batch09ApprovedConcurrentWorktreeEntries);

const batch09CommercialSplitRouteEntries = [
  { path: "backend/src/routes/commercialCoreRoutes.js", sha256: "11A5136CDA54B1467757BF9422EB6B63B0B00F9633CD1A8AF3303A5BA2A06E41" },
  { path: "backend/src/routes/commercialCorePaymentRoutes.js", sha256: "9BB53FE97B17F28892AF3B8C8E91373D7276183873E0258E694AD694F5E1B552" },
  { path: "backend/src/routes/commercialCorePaymentReportsRoutes.js", sha256: "02A327CB70645AA8652E542F5825B271B143AE7A741FC8FBD1CB0C157093FD36" },
  { path: "backend/src/routes/commercialCoreRoomRoutes.js", sha256: "284B22FE4FD332430111A5BB8497D1B4226BB2E117965EEBE77D7544C9652196" },
  { path: "backend/src/routes/commercialCoreRouteData.js", sha256: "5EB28DD6ABEC1AD63CA236AB567BB14B0CEEF35D54DF75343D5EC746F5A6FCD2" },
];
const batch09CommercialSplitRouteShas = buildExpectedShaMap(batch09CommercialSplitRouteEntries);

const batch09ProvenanceClosureEntries = [
  { path: "backend/src/lib/requestUrl.js", sha256: "629D6C894B91551AB14518F36E2BF4C5CEF48DC60ADBB01A17EFE7755C30063E" },
  { path: "backend/src/server.js", sha256: "1FD7A545B43FA265A15737759CBE5DE1887C7CA3A3846170E3F9D0EFFEEABF77" },
];
const batch09ProvenanceClosureShas = buildExpectedShaMap(batch09ProvenanceClosureEntries);

function classifyDirtyPath(file, context) {
  const normalized = normalizePath(file);

  if (normalized === context.selfPath) {
    return { category: "SELF_AUDIT_APPROVAL_GUARD" };
  }

  if (isBatch13FoundationOwnerPath(normalized)) {
    return { category: "BATCH13_FOUNDATION_OWNER" };
  }

  if (isBatch13FoundationSupportPath(normalized)) {
    return { category: "BATCH13_FOUNDATION_SUPPORT" };
  }

  if (isBatch13FoundationCommandSurfacePath(normalized)) {
    return { category: "BATCH13_FOUNDATION_COMMAND_SURFACE" };
  }

  if (isBatch13AppJsxMigrationConsumerPath(normalized)) {
    return { category: "BATCH13_APP_JSX_MIGRATION_CONSUMER" };
  }

  if (context.coreGuardShas.has(normalized)) {
    const expected = context.coreGuardShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "CORE_GUARD_INFRA" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.registryCheckerPaths.has(normalized)) {
    return { category: "ACTIVE_PRODUCT_EXTENSION_CHECKER_INFRA" };
  }

  if (context.batch09ApprovedConcurrentWorktreeShas.has(normalized)) {
    const expected = context.batch09ApprovedConcurrentWorktreeShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "APPROVED_CONCURRENT_CANONICAL_WORKTREE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.batch09CommercialSplitRouteShas.has(normalized)) {
    const expected = context.batch09CommercialSplitRouteShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "APPROVED_CONCURRENT_CANONICAL_ROUTE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.batch09ProvenanceClosureShas.has(normalized)) {
    const expected = context.batch09ProvenanceClosureShas.get(normalized);
    const actual = fileSha256(normalized);
    if (actual !== expected) {
      return { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
    }
    if (normalized === "backend/src/lib/requestUrl.js") {
      return { category: "LEGITIMATE_CANONICAL_NEW_FILE" };
    }
    if (normalized === "backend/src/server.js") {
      return { category: "PROVEN_BATCH09_CHANGE" };
    }
    return { category: "APPROVED_CONCURRENT_CANONICAL_WORKTREE" };
  }

  if (isBatch13FoundationSupportPath(normalized)) {
    return { category: "BATCH13_FOUNDATION_SUPPORT" };
  }

  if (isBatch13FoundationCommandSurfacePath(normalized)) {
    return { category: "BATCH13_FOUNDATION_COMMAND_SURFACE" };
  }

  if (isCommercialPaymentSecurityCheckerPath(normalized)) {
    return { category: "COMMERCIAL_PAYMENT_SECURITY_CHECKER_INFRA" };
  }

  if (isM80M89ContractSweepRepoContractPath(normalized)) {
    return { category: "M80_M89_CONTRACT_SWEEP_REPO_CONTRACT" };
  }

  if (context.approvedCurrentHeadShas.has(normalized)) {
    const expected = context.approvedCurrentHeadShas.get(normalized);
    const actual = fileSha256(normalized);
    if (actual === expected) {
      return { category: "APPROVED_CURRENT_HEAD_PRODUCT" };
    }
    if (normalized.startsWith("backend/src/routes/")) {
      return { category: "ROUTE", detail: `${normalized} expected ${expected} got ${actual}` };
    }
    if (normalized.startsWith("backend/src/services/")) {
      return { category: "SERVICE", detail: `${normalized} expected ${expected} got ${actual}` };
    }
    return { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.runtimeDataPaths.has(normalized)) {
    return { category: "RUNTIME_DATA" };
  }

  if (context.outOfScopeCurrentHeadHelperPaths.has(normalized)) {
    return { category: "OUT_OF_SCOPE_CURRENT_HEAD_HELPER" };
  }

  if (isAppJsxRoleTenantScopePath(normalized)) {
    return { category: "ROLE_TENANT_AUTH_OWNED_PRODUCT" };
  }

  if (context.batch10DocWorktreePaths.has(normalized)) {
    return { category: "DOC_WORKTREE_SCOPE" };
  }

  if (isBatch14DocArchitectureConsolidationPath(normalized)) {
    return { category: "DOC_WORKTREE_SCOPE" };
  }

  if (isBatch11IndexWorktreeScopePath(normalized) || BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET.has(normalized)) {
    return { category: "INDEX_WORKTREE_SCOPE" };
  }

  if (context.testInfraPaths.has(normalized)) {
    return { category: "TEST_INFRA" };
  }

  if (normalized.startsWith("backend/src/routes/")) {
    return { category: "ROUTE" };
  }

  if (normalized.startsWith("backend/src/services/")) {
    return { category: "SERVICE" };
  }

  if (normalized === "backend/prisma/schema.prisma" || normalized.startsWith("backend/prisma/")) {
    return { category: "PRISMA_SCHEMA" };
  }

  if (normalized.startsWith("backend/src/")) {
    return { category: "UNKNOWN" };
  }

  if (normalized.startsWith("backend/scripts/")) {
    return { category: "UNKNOWN" };
  }

  return { category: "UNKNOWN" };
}

function main() {
  console.log("=== AUDIT-LOG-AND-APPROVAL-TRACE-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const packageScripts = JSON.parse(pkg).scripts || {};
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const securityDoc = readFile(paths.securityDoc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);
  const activeRegistryCheckerPaths = buildRegistryOwnedCheckerPaths(packageScripts, productExtensionsCheckScripts);
  const coreGuardEntries = [
    { path: "backend/scripts/current_head_scope_policy_01_check.js", sha256: "0F56180FD86135B5742E8D473E61975A1BEB1F57CDA61F2DC4C362575086951F" },
  { path: "backend/scripts/lib/currentHeadScopePolicy.js", sha256: "1EDAF2C4458361567427493E0EA90487867D13D06DB0CB11F7553E8B14DAC5C8" },
  { path: "backend/scripts/lib/productExtensionsRegistry.js", sha256: "6C0FA82E0B7024D4DADF5AA588E33509A5D91866CF39D8D875A0BFEF94064D8F" },
  { path: "backend/scripts/lib/guardGitScope.js", sha256: "7BAA65107857A0A64EF236A130B0E618AD08FC72453928C0A46F243287044EE5" },
  { path: "backend/scripts/lib/guardRunnerContracts.js", sha256: "1B180E2E1C901041734CCE494774865C9644CA02917B1326B6FEF8EB713E239A" },
    { path: "backend/scripts/lib/guardSmokeEvidence.js", sha256: "6992AC173A900820A62F5EC3228F3279E29F0E2C42261EBE3A96CD9B36055141" },
    { path: "backend/scripts/lib/guardValidationEnvironment.js", sha256: "5F909C62C9E376D5FCA38A3E28D30646D4C61CDABB537FE2A5DFDA9C0D8A42DE" },
    { path: "backend/scripts/run_product_extensions_check_chain.js", sha256: "0147598C4FB8076959907447F4125F3923CC86B8FAA8CFD34C2FA3CF60FFAB03" },
    { path: "backend/scripts/verify_chain_01_product_extensions_check.js", sha256: "F96EF91D2FE5601222C3EFFE6CA172101D252E635BC604BF1CC8DC703C43C54B" },
  ];
  const coreGuardShas = buildExpectedShaMap(coreGuardEntries);
  const approvedCurrentHeadShas = buildExpectedShaMap(CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF);
  const packageWiredSmokeInfraPaths = buildPackageWiredScriptPaths(packageScripts, "smoke:");
  const batch10DocWorktreePaths = BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET;
  const batch14DocArchitectureConsolidationPaths = new Set([
    "docs/architecture/README.md",
    "docs/architecture/workflows/README.md",
    "docs/architecture/workflows/roles/README.md",
  ]);
  const outOfScopeCurrentHeadHelperPaths = new Set([
    "backend/scripts/m82_9_dormant_payment_backbone_check.js",
    "backend/src/ops/trustQualityManifest.js",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "backend/scripts/pay_01a_readonly_payment_readiness_check.js",
    "backend/scripts/pay_01b_payment_preview_readonly_check.js",
    "backend/scripts/pay_01c_payment_preview_detail_filter_check.js",
    "backend/scripts/pay_01d_payment_preview_csv_export_check.js",
  ]);
  const runtimeDataPaths = new Set([
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
  ]);
  const testInfraPaths = new Set([...batch10DocWorktreePaths, ...batch14DocArchitectureConsolidationPaths, ...packageWiredSmokeInfraPaths]);
  const selfPath = "backend/scripts/audit_log_and_approval_trace_01_check.js";

  const wiringNeedles = [
    [pkg, '"check:auditlogandapprovaltrace01": "node backend/scripts/audit_log_and_approval_trace_01_check.js"'],
    [pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"'],
    [pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"'],
    [harnessCheck, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [harnessCheck, "check:auditlogandapprovaltrace01"],
    [harnessCheck, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [harnessCheck, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [harnessDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [harnessDoc, "check:auditlogandapprovaltrace01"],
    [harnessDoc, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [harnessDoc, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [guide, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [guide, "check:auditlogandapprovaltrace01"],
    [guide, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [guide, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [primer, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [primer, "check:auditlogandapprovaltrace01"],
    [primer, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [primer, "backend/scripts/audit_log_and_approval_trace_01_check.js"],
    [securityDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [dataIntegrityDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
  ];
  for (const [text, needle] of wiringNeedles) {
    addContains(cases, `wiring contains ${needle}`, text, needle);
  }

  const headings = [
    "# AUDIT-LOG-AND-APPROVAL-TRACE-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Auditability principles",
    "## 4) Event taxonomy",
    "## 5) Approval trace lifecycle",
    "## 6) Action-prep vs execution boundary",
    "## 7) Approval-required action matrix",
    "## 8) KVKK-safe audit payload policy",
    "## 9) Never-log / never-store matrix",
    "## 10) Role / tenant / scope audit policy",
    "## 11) Rejection / cancel / timeout / stale approval policy",
    "## 12) Runtime-data / generated artifact / commit-external boundary",
    "## 13) AI / Copilot recommendation trace policy",
    "## 14) No write-action / human approval boundary",
    "## 15) Release gate checklist",
    "## 16) What is not changed",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of headings) {
    addContains(cases, `doc heading ${heading}`, doc, heading);
  }
  addCase(cases, "doc heading order", () => {
    ordered(doc, headings, "audit trace doc heading order");
  });

  const principleNeedles = [
    "static policy / doc / code inventory",
    "Probe gerekli değildir",
    "append-only",
    "deterministic",
    "Action-prep",
    "execution boundary",
    "correlationId",
    "requestId",
    "Companion references",
    "raw secret",
  ];
  for (const needle of principleNeedles) {
    addContains(cases, `principle ${needle}`, doc, needle);
  }

  assertProductExtensionsIncludes(
    "check:auditlogandapprovaltrace01",
    "product extensions registry includes check:auditlogandapprovaltrace01",
    productExtensionsCheckScripts,
  );

  const eventTaxonomy = [
    "recommendation_prepared",
    "approval_requested",
    "approval_granted",
    "approval_rejected",
    "approval_cancelled",
    "approval_expired",
    "action_blocked",
    "action_not_executed",
    "human_override",
    "safety_policy_blocked",
    "stale_context_blocked",
    "scope_mismatch_blocked",
  ];
  for (const needle of eventTaxonomy) {
    addContains(cases, `event taxonomy ${needle}`, doc, needle);
  }

  addCase(cases, "event lifecycle order", () => {
    ordered(doc, [
      "recommendation_prepared",
      "approval_requested",
      "approval_granted",
      "approval_rejected",
      "approval_cancelled",
      "approval_expired",
      "action_blocked",
      "action_not_executed",
      "human_override",
      "safety_policy_blocked",
      "stale_context_blocked",
      "scope_mismatch_blocked",
    ], "audit trace lifecycle order");
  });

  const boundaryNeedles = [
    "PREPARE",
    "DRAFT",
    "EXECUTE",
    "Hidden background action",
    "Silent write-action",
    "Write-action dispatcher",
  ];
  for (const needle of boundaryNeedles) {
    addContains(cases, `action boundary ${needle}`, doc, needle);
  }

  const approvalMatrixNeedles = [
    "RFQ send",
    "offer accept/reject",
    "agreement execute",
    "dispatch apply",
    "driver/vehicle assign",
    "route apply",
    "payment/hakediş execute",
    "messaging/SMS/email/push",
    "provider credential read/write/use",
    "user/admin write",
    "public lead conversion",
    "quality decision apply",
    "agreement route refresh apply",
  ];
  for (const needle of approvalMatrixNeedles) {
    addContains(cases, `approval matrix ${needle}`, doc, needle);
  }

  const payloadFields = [
    "eventType",
    "actorRole",
    "actorScopeType",
    "actorScopeIdHashOrOpaqueRef",
    "targetType",
    "targetScopeType",
    "targetScopeIdHashOrOpaqueRef",
    "actionType",
    "approvalState",
    "policyVersion",
    "reasonCode",
    "timestamp",
    "correlationId",
    "requestId",
    "sourceSurface",
  ];
  for (const needle of payloadFields) {
    addContains(cases, `payload field ${needle}`, doc, needle);
  }

  const neverLogNeedles = [
    "full name",
    "phone",
    "address",
    "email",
    "TCKN",
    "token",
    "refresh token",
    "cookie",
    "password",
    "provider credential",
    "raw GPS",
    "debug payload",
    "secret header",
    "raw access token",
    "raw session token",
  ];
  for (const needle of neverLogNeedles) {
    addContains(cases, `never-log ${needle}`, doc, needle);
  }

  const scopeNeedles = [
    "SUPER_ADMIN",
    "COMPANY",
    "ROOM",
    "DRIVER",
    "PERSONEL",
    "PARENT",
    "SCHOOL",
    "ORGANIZATION",
    "actorScopeType",
    "targetScopeType",
    "actorScopeIdHashOrOpaqueRef",
    "targetScopeIdHashOrOpaqueRef",
    "cross-tenant",
    "cross-org",
    "Scope mismatch blocked",
  ];
  for (const needle of scopeNeedles) {
    addContains(cases, `scope policy ${needle}`, doc, needle);
  }

  const rejectionNeedles = [
    "approval_rejected",
    "approval_cancelled",
    "approval_expired",
    "stale_context_blocked",
    "scope_mismatch_blocked",
    "safety_policy_blocked",
    "action_not_executed",
    "Silent fallback to execution yoktur",
  ];
  for (const needle of rejectionNeedles) {
    addContains(cases, `rejection policy ${needle}`, doc, needle);
  }

  const runtimeBoundaryNeedles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
    "backend/artifacts/browser-smoke/",
    "backend/artifacts/load-test/",
    "backend/artifacts/db-scaling/",
    "backend/artifacts/observability/",
    "backend/artifacts/data-integrity/",
    "backend/artifacts/role-redteam/",
    "backend/artifacts/security-kvkk/",
    "backend/artifacts/audit-trace/",
    "debug.log",
    "No stage/commit/tag/push",
  ];
  for (const needle of runtimeBoundaryNeedles) {
    addContains(cases, `runtime boundary ${needle}`, doc, needle);
  }

  const aiTraceNeedles = [
    "Copilot öneri, hazırlık ve risk özeti üretebilir",
    "recommendation_prepared",
    "approval_requested",
    "COPILOT-HUMAN-APPROVAL-01",
    "COPILOT-AI-ACTION-ROADMAP-01",
    "COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01",
    "Runtime AI/model execution açılmaz",
    "Tool execution açılmaz",
    "Write-action açılmaz",
    "Human approval explicit ve auditable kalır",
  ];
  for (const needle of aiTraceNeedles) {
    addContains(cases, `ai trace ${needle}`, doc, needle);
  }

  const noWriteNeedles = [
    "No production DB",
    "No public URL",
    "No real token/credential generation",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "No runtime AI/model execution",
    "No stage/commit/tag/push",
    "No smoke threshold loosening",
    "No 429 allowlist",
    "No hidden auto-execute",
    "No admin/user write",
  ];
  for (const needle of noWriteNeedles) {
    addContains(cases, `write boundary ${needle}`, doc, needle);
  }

  const releaseGateNeedles = [
    "check:auditlogandapprovaltrace01",
    "check:securitykvkkfinal01",
    "check:roledataisolationredteam01",
    "check:dataintegrityandrecovery01",
    "check:backendlintwarningburndown01",
    "check:observabilitymonitoringalerting01",
    "check:dbpoolandapiscaling01",
    "check:loadtest2000users01",
    "check:cachecoalescingandbackoff01",
    "check:dashboardbulkendpoint01",
    "check:productionratelimitpolicy01",
    "check:requeststormresilience01",
    "check:airesponsesemanticqualitygate01",
    "check:testqualityandflakeaudit01",
    "check:hotfilesplitwebpanels01",
    "check:hotfilesplitaichatcomposers01",
    "check:copilotnextbestactionengine01",
    "check:copilotoperationhealthengine01",
    "check:copilotplanreviewengine01",
    "check:copilotworkflowreasoningengine01",
    "check:seferabiturkishterminology01",
    "check:seferabiturkishuserfacinglanguage01",
    "check:copilotriskscoringengine01",
    "check:copilotrootcauseengine01",
    "check:copilotsmartdiagnosticengine01",
    "check:copilotdynamicquestionengine01",
    "check:copilotclarifyingquestionengine01",
    "check:copilotroutereviewhumanapproval01",
    "check:exceltoroutereadinessredteam01",
    "check:product-extensions",
    "verify:repo",
    "verify:final",
    "npm --prefix backend run lint",
    "npm --prefix web run lint",
    "18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
  ];
  for (const needle of releaseGateNeedles) {
    addContains(cases, `release gate ${needle}`, doc, needle);
  }
  addCase(cases, "release gate checklist order", () => {
    ordered(doc, [
      "check:auditlogandapprovaltrace01",
      "check:securitykvkkfinal01",
      "check:roledataisolationredteam01",
      "check:dataintegrityandrecovery01",
      "check:backendlintwarningburndown01",
      "check:observabilitymonitoringalerting01",
      "check:dbpoolandapiscaling01",
      "check:loadtest2000users01",
      "check:cachecoalescingandbackoff01",
      "check:dashboardbulkendpoint01",
      "check:productionratelimitpolicy01",
      "check:requeststormresilience01",
      "check:airesponsesemanticqualitygate01",
      "check:testqualityandflakeaudit01",
      "check:hotfilesplitwebpanels01",
      "check:hotfilesplitaichatcomposers01",
      "check:copilotnextbestactionengine01",
      "check:copilotoperationhealthengine01",
      "check:copilotplanreviewengine01",
      "check:copilotworkflowreasoningengine01",
      "check:seferabiturkishterminology01",
      "check:seferabiturkishuserfacinglanguage01",
      "check:copilotriskscoringengine01",
      "check:copilotrootcauseengine01",
      "check:copilotsmartdiagnosticengine01",
      "check:copilotdynamicquestionengine01",
      "check:copilotclarifyingquestionengine01",
      "check:copilotroutereviewhumanapproval01",
      "check:exceltoroutereadinessredteam01",
      "check:product-extensions",
      "verify:repo",
      "verify:final",
      "npm --prefix backend run lint",
      "npm --prefix web run lint",
    ], "audit trace release gate order");
  });

  const companionNeedles = [
    "SECURITY-KVKK-FINAL-01",
    "ROLE-DATA-ISOLATION-REDTEAM-01",
    "DATA-INTEGRITY-AND-RECOVERY-01",
    "OBSERVABILITY-MONITORING-ALERTING-01",
    "DB-POOL-AND-API-SCALING-01",
    "LOAD-TEST-2000-USERS-01",
    "CACHE-COALESCING-AND-BACKOFF-01",
    "REQUEST-STORM-RESILIENCE-01",
    "PRODUCTION-RATE-LIMIT-POLICY-01",
  ];
  for (const needle of companionNeedles) {
    addContains(cases, `companion ${needle}`, doc, needle);
  }

  const validationTokens = [
    "auditabilitySummary",
    "approvalMatrixSummary",
    "eventTaxonomySummary",
    "traceLifecycleSummary",
    "kvkkSafeAuditPayloadSummary",
    "runtimeGeneratedArtifactSummary",
    "humanApprovalBoundarySummary",
    "compatibilitySummary",
    "smokeThresholdSummary",
    "chainWiringSummary",
    "commitExternalSummary",
    "prismaSummary",
  ];
  for (const needle of validationTokens) {
    addContains(cases, `validation token ${needle}`, doc, needle);
  }

  const validationSummaryNeedles = [
    "append-only audit and approval trace stays visible",
    "approval-required action matrix stays blocked until explicit human approval",
    "recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked",
    "trace moves from recommendation to request to approval or block, then stops without silent execution",
    "eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS",
    "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external",
    "no write-action / human approval boundary stays visible",
    "SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01",
    "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none",
    "package.json + runner + verify chain + harness check/doc + guide + primer",
    "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty",
    "No route/service/prisma diff; no production DB; no schema/migration; read-only only",
  ];
  for (const needle of validationSummaryNeedles) {
    addContains(cases, `validation summary ${needle}`, doc, needle);
  }

  const summaryPairs = [
    ["auditabilitySummary", "append-only audit and approval trace stays visible"],
    ["approvalMatrixSummary", "approval-required action matrix stays blocked until explicit human approval"],
    ["eventTaxonomySummary", "recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked"],
    ["traceLifecycleSummary", "trace moves from recommendation to request to approval or block, then stops without silent execution"],
    ["kvkkSafeAuditPayloadSummary", "eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS"],
    ["runtimeGeneratedArtifactSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external"],
    ["humanApprovalBoundarySummary", "no write-action / human approval boundary stays visible"],
    ["compatibilitySummary", "SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01"],
    ["smokeThresholdSummary", "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none"],
    ["chainWiringSummary", "package.json + runner + verify chain + harness check/doc + guide + primer"],
    ["commitExternalSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty"],
    ["prismaSummary", "No route/service/prisma diff; no production DB; no schema/migration; read-only only"],
  ];
  for (const [key, value] of summaryPairs) {
    addContains(cases, `summary ${key}`, doc, `${key}=${value}`);
  }

  const files = gitStatusNames();
  const stageEmpty = gitLines(["diff", "--cached", "--name-only"]).length === 0;
  const diffCheckClean = gitLines(["diff", "--check"]).length === 0;
  const cachedDiffCheckClean = gitLines(["diff", "--cached", "--check"]).length === 0;
  const prismaDiffEmpty = gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0;
  const gitShowCheckClean = gitLines(["show", "--check", "--stat", "HEAD"]).length > 0;
  const debugLogAbsent = !fs.existsSync(paths.debugLog);

  addCase(cases, "working tree hygiene", () => {
    const failures = [];

    for (const file of files) {
      const classification = classifyDirtyPath(file, {
        selfPath,
        registryCheckerPaths: activeRegistryCheckerPaths,
        coreGuardShas,
        approvedCurrentHeadShas,
        batch09ApprovedConcurrentWorktreeShas,
        batch09CommercialSplitRouteShas,
        batch09ProvenanceClosureShas,
        runtimeDataPaths,
        outOfScopeCurrentHeadHelperPaths,
        batch10DocWorktreePaths,
        testInfraPaths,
      });

      if (classification.detail) {
        failures.push(`${file} => ${classification.category} (${classification.detail})`);
        continue;
      }

      switch (classification.category) {
        case "SELF_AUDIT_APPROVAL_GUARD":
        case "ACTIVE_PRODUCT_EXTENSION_CHECKER_INFRA":
        case "BATCH13_FOUNDATION_OWNER":
        case "BATCH13_FOUNDATION_SUPPORT":
        case "BATCH13_FOUNDATION_COMMAND_SURFACE":
        case "BATCH13_APP_JSX_MIGRATION_CONSUMER":
        case "COMMERCIAL_PAYMENT_SECURITY_CHECKER_INFRA":
        case "CORE_GUARD_INFRA":
        case "APPROVED_CURRENT_HEAD_PRODUCT":
        case "APPROVED_CONCURRENT_CANONICAL_WORKTREE":
        case "APPROVED_CONCURRENT_CANONICAL_ROUTE":
        case "LEGITIMATE_CANONICAL_NEW_FILE":
        case "PROVEN_BATCH09_CHANGE":
        case "M80_M89_CONTRACT_SWEEP_REPO_CONTRACT":
        case "DOC_WORKTREE_SCOPE":
        case "OUT_OF_SCOPE_CURRENT_HEAD_HELPER":
        case "INDEX_WORKTREE_SCOPE":
        case "TEST_INFRA":
        case "RUNTIME_DATA":
        case "ROLE_TENANT_AUTH_OWNED_PRODUCT":
          break;
        case "ROUTE":
        case "SERVICE":
        case "PRISMA_SCHEMA":
        case "AUDIT_APPROVAL_OWNED_PRODUCT":
        case "SECURITY_KVKK_OWNED_PRODUCT":
        case "UNKNOWN":
        default:
          failures.push(`${file} => ${classification.category}`);
          break;
      }
    }

    must(failures.length === 0, `working tree hygiene: ${failures.join(", ") || "(none)"}`);
  });
  addCase(cases, "stage remains empty", () => must(stageEmpty, "staged files present"));
  addCase(cases, "git diff --check stays clean", () => must(diffCheckClean, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(cachedDiffCheckClean, "git diff --cached --check findings"));
  addCase(cases, "route diff stays compatible", () => {
    mustStatusEmptyOrExactlyWithIdentity(
      ["backend/src/routes"],
      [
        ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) => entryPath.startsWith("backend/src/routes/")),
        ...batch09CommercialSplitRouteEntries,
      ],
      "route diff stays compatible",
    );
  });
  addCase(cases, "service diff stays compatible", () => {
    mustDiffEmptyOrExactlyWithIdentity(
      ["backend/src/services"],
      CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) => entryPath.startsWith("backend/src/services/")),
      "service diff stays compatible",
    );
  });
  addCase(cases, "prisma diff stays empty", () => must(prismaDiffEmpty, "prisma diff not empty"));
  addCase(cases, "git show --check --stat HEAD succeeds", () => must(gitShowCheckClean, "git show --check --stat HEAD produced no output"));
  addCase(cases, "debug.log stays absent", () => must(debugLogAbsent, "debug.log exists"));

  const results = [];
  for (const entry of cases) {
    try {
      entry.fn();
      results.push({ label: entry.label, ok: true });
    } catch (error) {
      results.push({ label: entry.label, ok: false, error: error?.message || String(error) });
      console.log(`FAIL ${entry.label}`);
    }
  }

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const guardCases = results.length;

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    console.log(`guardCases=${guardCases}`);
    console.log(`passCount=${passCount}`);
    console.log(`failCount=${failCount}`);
    process.exit(1);
  }

  const summaryLines = summaryPairs.map(([key, value]) => `${key}=${value}`);

  console.log("PASS AUDIT-LOG-AND-APPROVAL-TRACE-01");
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  for (const line of summaryLines) {
    console.log(line);
  }
}

main();
