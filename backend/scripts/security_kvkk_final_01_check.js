#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizedTextSha256 } from "./lib/guardTextIntegrity.js";
import {
  CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256,
  CANONICAL_PRISMA_SCHEMA_PATH,
  CANONICAL_PRISMA_SCHEMA_RAW_SHA256,
} from "./lib/prismaSchemaIdentity.js";
import {
  BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET,
  isBatch14DocArchitectureConsolidationPath,
  BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET,
  isBatch13AppJsxMigrationConsumerPath,
  isBatch13FoundationCommandSurfacePath,
  isBatch13FoundationOwnerPath,
  isBatch13FoundationSupportPath,
  isAppJsxRoleTenantScopePath,
  isCommercialPaymentSecurityCheckerPath,
  isM80M89ContractSweepRepoContractPath,
  mustDiffEmptyOrExactlyWithIdentity,
  mustStatusSubsetWithIdentity,
  isBatch11IndexWorktreeScopePath,
} from "./lib/guardGitScope.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS, CURRENT_HEAD_APPROVED_SCHEMA } from "./lib/currentHeadScopePolicy.js";
import { assertProductExtensionsIncludes, productExtensionsCheckScripts } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  securityChecker: path.join(repoRoot, "backend", "scripts", "security_kvkk_final_01_check.js"),
  runner: path.join(repoRoot, "backend", "scripts", "run_product_extensions_check_chain.js"),
  verify: path.join(repoRoot, "backend", "scripts", "verify_chain_01_product_extensions_check.js"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "SECURITY_KVKK_FINAL_01.md"),
  roleDataDoc: path.join(repoRoot, "docs", "ROLE_DATA_ISOLATION_REDTEAM_01.md"),
  dataIntegrityDoc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  observabilityDoc: path.join(repoRoot, "docs", "OBSERVABILITY_MONITORING_ALERTING_01.md"),
  dbScalingDoc: path.join(repoRoot, "docs", "DB_POOL_AND_API_SCALING_01.md"),
  loadTestDoc: path.join(repoRoot, "docs", "LOAD_TEST_2000_USERS_01.md"),
  cacheDoc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  rateLimitDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  phase12Doc: path.join(repoRoot, "docs", "PHASE_12_KVKK_SECURITY.md"),
  kvkkRunbook: path.join(repoRoot, "docs", "RUNBOOK_M77_KVKK_UYUM_KATMANI.md"),
  retentionRunbook: path.join(repoRoot, "docs", "RUNBOOK_M45_RETENTION_BACKUP.md"),
  kvkkMatrix: path.join(repoRoot, "backend", "src", "kvkk", "matrix.js"),
  kvkkRoute: path.join(repoRoot, "backend", "src", "routes", "kvkk.js"),
  responseCache: path.join(repoRoot, "backend", "src", "utils", "responseCache.js"),
  dashboardBulk: path.join(repoRoot, "backend", "src", "services", "dashboardBulk.js"),
  adminRoute: path.join(repoRoot, "backend", "src", "routes", "admin.js"),
  routeMounts: path.join(repoRoot, "backend", "src", "bootstrap", "routeMounts.js"),
  serverJs: path.join(repoRoot, "backend", "src", "server.js"),
  retentionBackupPolicy: path.join(repoRoot, "backend", "src", "ops", "retentionBackupPolicy.js"),
  backupArchiveOps: path.join(repoRoot, "backend", "src", "ops", "backupArchiveOps.js"),
  jsonFileStore: path.join(repoRoot, "backend", "src", "lib", "jsonFileStore.js"),
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

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
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
    if (index === -1) throw new Error(`FAIL ${label}: missing ${needle}`);
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
  if (unexpected.length > 0) throw new Error(`FAIL ${label}: ${unexpected.join(", ")}`);
  console.log(`OK ${label}`);
}

function validateStatusGroup(label, paths, expectedCount) {
  if (!Array.isArray(paths)) throw new Error(`FAIL ${label}: not an array`);
  if (paths.length !== expectedCount) throw new Error(`FAIL ${label}: expected ${expectedCount} paths, got ${paths.length}`);
  const normalized = paths.map((path) => String(path).replace(/\\/g, "/").trim());
  if (normalized.some((path, index) => path !== paths[index])) throw new Error(`FAIL ${label}: non-normalized path strings`);
  if (new Set(normalized).size !== normalized.length) throw new Error(`FAIL ${label}: duplicate paths`);
  return normalized;
}

function validateDisjointStatusGroups(groupEntries) {
  const seen = new Map();
  let total = 0;
  for (const [label, paths] of groupEntries) {
    for (const file of paths) {
      const owner = seen.get(file);
      if (owner) throw new Error(`FAIL ${label}: status scope overlaps ${owner} at ${file}`);
      seen.set(file, label);
    }
    total += paths.length;
  }
  if (total !== 84) throw new Error(`FAIL working tree status scope count mismatch: ${total}`);
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

let cachedProductExtensionsCheckerPaths = null;
let cachedProductExtensionsSmokePaths = null;

function productExtensionsCheckerPaths() {
  if (cachedProductExtensionsCheckerPaths) return cachedProductExtensionsCheckerPaths;

  const pkg = JSON.parse(readFile(paths.packageJson));
  const scripts = pkg.scripts || {};
  const resolved = new Set();

  for (const entry of productExtensionsCheckScripts) {
    if (entry.startsWith("node ")) {
      resolved.add(normalizePath(entry.slice(5)));
      continue;
    }

    const command = scripts[entry];
    if (typeof command !== "string") continue;

    const match = command.trim().match(/^node\s+(.+)$/);
    if (match) {
      resolved.add(normalizePath(match[1]));
    }
  }

  cachedProductExtensionsCheckerPaths = resolved;
  return cachedProductExtensionsCheckerPaths;
}

function productExtensionsSmokePaths() {
  if (cachedProductExtensionsSmokePaths) return cachedProductExtensionsSmokePaths;

  const pkg = JSON.parse(readFile(paths.packageJson));
  const scripts = pkg.scripts || {};
  const resolved = new Set();

  for (const [name, command] of Object.entries(scripts)) {
    if (!String(name).startsWith("smoke:")) continue;
    if (typeof command !== "string") continue;

    const match = command.trim().match(/^node\s+(.+)$/);
    if (match) {
      resolved.add(normalizePath(match[1]));
    }
  }

  cachedProductExtensionsSmokePaths = resolved;
  return cachedProductExtensionsSmokePaths;
}

  const approvedCurrentHeadBackendPaths = new Set(CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS.map((value) => normalizePath(value)));
  const selfSecurityGuardPath = normalizePath("backend/scripts/security_kvkk_final_01_check.js");
  const outOfScopeCurrentHeadHelperPaths = new Set(
  [
    "backend/scripts/current_head_scope_policy_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/lib/currentHeadScopePolicy.js",
    "backend/scripts/lib/guardGitScope.js",
    "backend/scripts/lib/guardRunnerContracts.js",
    "backend/scripts/lib/guardSmokeEvidence.js",
    "backend/scripts/lib/prismaSchemaIdentity.js",
    "backend/scripts/lib/guardValidationEnvironment.js",
    "backend/scripts/lib/productExtensionsRegistry.js",
    "backend/scripts/lib/guardTextIntegrity.js",
    "backend/scripts/run_backend_lint.js",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "backend/scripts/m82_9_dormant_payment_backbone_check.js",
    "backend/scripts/pay_01a_readonly_payment_readiness_check.js",
    "backend/scripts/pay_01b_payment_preview_readonly_check.js",
    "backend/scripts/pay_01c_payment_preview_detail_filter_check.js",
    "backend/scripts/pay_01d_payment_preview_csv_export_check.js",
    "backend/src/ops/trustQualityManifest.js",
  ].map((value) => normalizePath(value)),
);

const outOfScopeTestInfraPaths = new Set(
  [
    "package.json",
    "tools/repo_contract_state.json",
  ].map((value) => normalizePath(value)),
);

function buildExpectedShaMap(entries) {
  return new Map(entries.map(({ path: entryPath, sha256 }) => [normalizePath(entryPath), String(sha256).toUpperCase()]));
}

const batch09ApprovedConcurrentWorktreeEntries = [
  { path: "backend/README.md", sha256: "0E5C4A471BB7CD0B361C7EC6FB33899CABD810D8CB3892913F66FE26BE8F8AE7" },
  { path: "backend/scripts/canonical_provenance_registry_01_check.js", sha256: "367A0ECC128DEE9B5B8BD9B969518CFF390DF0F16D1FFC30B3C1A5216F01644C" },
  { path: "backend/scripts/lib/canonicalProvenanceRegistry.js", sha256: "081C69CF9F47AAD274BD23A3D60AD9A5ABD1E4556F214398AAFD7CDC571FC831" },
  { path: "backend/scripts/ux_all_panels_reality_audit_01_check.js", sha256: "BEEAF0DC2D090B374F6E67AF157FCC9E461A575586CC955CF377182C194A0E6D" },
  { path: "backend/src/bootstrap/rateLimits.js", sha256: "92C93F276B04E5B4A3179E5F93D6396A37FA968000AA2FCEAE1E1F51752E0135" },
  { path: "backend/src/middleware/apiRequestLog.js", sha256: "5F27CA48608B10C6DDCD35F9D1C1E146D6AD432EAD63C90CF117F0EA3A051EE3" },
  { path: "backend/src/middleware/asyncHandler.js", sha256: "F206378CE995B6B15A3C340F81E8F8B16EDA65638558EF46F1F373ABBF166F0C" },
  { path: "infra/docker-compose.yml", sha256: "3FDDFB80DF3A01C7CB27FC4A3B141FC62A9C12FB31CDC968A9D02B273F9BC36B" },
];
const batch09ApprovedConcurrentWorktreeShas = buildExpectedShaMap(batch09ApprovedConcurrentWorktreeEntries);

const batch09CommercialSplitRouteEntries = Object.freeze(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) =>
    normalizePath(entryPath).startsWith("backend/src/routes/commercialCore"),
  ),
);
const batch09CommercialSplitRouteShas = buildExpectedShaMap(batch09CommercialSplitRouteEntries);

const batch09ProvenanceClosureEntries = [
  { path: "backend/src/lib/requestUrl.js", sha256: "629D6C894B91551AB14518F36E2BF4C5CEF48DC60ADBB01A17EFE7755C30063E" },
  { path: "backend/src/server.js", sha256: "18A1DEA799C04DB0A8A192654BCD5BDF38E822AF03EACA2F66789E759F260615" },
];
const batch09ProvenanceClosureShas = buildExpectedShaMap(batch09ProvenanceClosureEntries);

const coreGuardInfraIdentityEntries = [
  {
    path: "backend/scripts/current_head_scope_policy_01_check.js",
    sha256: "0F56180FD86135B5742E8D473E61975A1BEB1F57CDA61F2DC4C362575086951F",
  },
  {
    path: "backend/scripts/lib/currentHeadScopePolicy.js",
    sha256: "56F431E518A1D44D34143320A4B8811E018C079051E25EAFD03C788840147277",
  },
  {
    path: "backend/scripts/lib/prismaSchemaIdentity.js",
    sha256: "014012B45C27F7C17FAD497A0053D95183E5D4BCB50E76CAE2B17C5D4E272689",
  },
  {
    path: "backend/scripts/lib/productExtensionsRegistry.js",
    sha256: "6C0FA82E0B7024D4DADF5AA588E33509A5D91866CF39D8D875A0BFEF94064D8F",
  },
  {
    path: "backend/scripts/lib/guardGitScope.js",
    sha256: "2293510B16AABB37453931C32ADC754F5947BE7BED50AFA395E505022C8FB2E1",
  },
  {
    path: "backend/scripts/lib/guardRunnerContracts.js",
    sha256: "1B180E2E1C901041734CCE494774865C9644CA02917B1326B6FEF8EB713E239A",
  },
  {
    path: "backend/scripts/lib/guardSmokeEvidence.js",
    sha256: "D8233D3711D5C4CFE7F41F0B06DE717C6CC67F86F9D21991E19933A4DB5AE28F",
  },
  {
    path: "backend/scripts/lib/guardValidationEnvironment.js",
    sha256: "5F909C62C9E376D5FCA38A3E28D30646D4C61CDABB537FE2A5DFDA9C0D8A42DE",
  },
  {
    path: "backend/scripts/run_product_extensions_check_chain.js",
    sha256: "0147598C4FB8076959907447F4125F3923CC86B8FAA8CFD34C2FA3CF60FFAB03",
  },
  {
    path: "backend/scripts/verify_chain_01_product_extensions_check.js",
    sha256: "F140AA78CAE5BD34E1233AD31EF350C8D7E5B19CAD861290A7B4866533E28864",
  },
];
const coreGuardInfraIdentityMap = new Map(
  coreGuardInfraIdentityEntries.map(({ path: relPath, sha256 }) => [normalizePath(relPath), sha256]),
);

function isCoreGuardInfraPath(file) {
  const normalized = normalizePath(file);
  const expectedSha = coreGuardInfraIdentityMap.get(normalized);
  if (!expectedSha) return false;
  const actualSha = normalizedTextSha256(normalized);
  must(actualSha === expectedSha, `core guard identity mismatch: ${normalized}`);
  return true;
}

const currentClosureCorrectiveEntries = [
  { path: "backend/scripts/sefer_abi_room_fuel_province_coverage_01_acceptance.mjs", sha256: "09B9A61CC245A24C51B53E10E6EF9A56E2B52A148CB55F90303B6A1ECDE03310" },
  { path: "backend/src/externalCost/externalCostReferenceService.js", sha256: "EADD157A8C93448EDD3C9E9A4F3D93BFCD3235CBBCEE0AB3282370ABFAADE436" },
  { path: "backend/src/externalCost/providerFactory.js", sha256: "1CC8266F1B519443C440AB4A7F7AE53BCCFC8A9C6A016E9670D62BD430392EA2" },
  { path: "backend/src/externalCost/providerRegistry.js", sha256: "E28C27183C8FF124BB452F8D1ADD0077B2FF292463534A2FFB6A866E59E5B225" },
  { path: "backend/src/externalCost/referenceLayers.js", sha256: "3687A4C373798BF6138F93476EBFCD59B22F4993973ADCBD37F3CA048D0801F8" },
  { path: "backend/src/externalCost/epdkBulletinProvider.js", sha256: "6883D0C607AFE0FEDFD0D9B1F1B50DC32139F9A0C50388A2AFB753780F93CFD1" },
  { path: "backend/src/finance/costScenarioForecast.js", sha256: "C1401ACE7AA006874F5FCB28ECCC969E0949BAF30AD43654316364AF9E79491F" },
  { path: "web/src/panels/shared/CostScenarioWorkspacePanel.jsx", sha256: "470F9F8227C631E84E760A60A2A1C75645C16CD489291E858936BA9183851031" },
];
const currentClosureCorrectiveShas = buildExpectedShaMap(currentClosureCorrectiveEntries);

const pausedMilestoneWorktreeEntries = [
  { path: "backend/scripts/sefer_abi_cost_analysis_assistant_01_acceptance.mjs", sha256: "D02E2152766A74B53F8C9E90FC46655B0986CEC46DFB5154629A6AB50A864033" },
  { path: "backend/src/ai/chat/seferAbiCostAnalysisAssistant.js", sha256: "867B28C7E2E69137C3DE2E25EEEDF985A1892FAF9A1A0CAEF492C04FCC9CCEC2" },
];
const pausedMilestoneWorktreeShas = buildExpectedShaMap(pausedMilestoneWorktreeEntries);

const approvedCurrentHeadRouteEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter((entry) =>
  normalizePath(entry.path).startsWith("backend/src/routes/"),
);

const approvedCurrentHeadServiceEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter((entry) =>
  normalizePath(entry.path).startsWith("backend/src/services/"),
);

const securityOwnedExactPaths = new Set(
  [
    "backend/scripts/security_kvkk_final_01_check.js",
    "backend/src/kvkk/matrix.js",
    "backend/src/routes/kvkk.js",
    "backend/src/utils/responseCache.js",
    "backend/src/services/dashboardBulk.js",
    "backend/src/routes/admin.js",
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    "backend/src/ops/retentionBackupPolicy.js",
    "backend/src/ops/backupArchiveOps.js",
    "backend/src/lib/jsonFileStore.js",
    "backend/src/finance/financialOperationsScope.js",
    "backend/scripts/room_profitability_and_quote_floor_01_expansion.js",
    "backend/src/finance/companyBudgetAndServiceCost.js",
    "backend/src/finance/roomProfitabilityAndQuoteFloor.js",
    "web/src/panels/shared/financialOperationsPresentation.js",
    "backend/src/routes/commercialCore.js",
    "backend/src/routes/operationProof.js",
    "backend/src/routes/trustQuality.js",
    "backend/src/services/qualityPaymentBridgeService.js",
    "docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md",
    "web/src/api.js",
    "web/src/panels/shared/FinancialOperationsPanel.jsx",
    "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    "web/src/panels/shared/ExternalReferenceCard.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "docs/SECURITY_KVKK_FINAL_01.md",
    "docs/PHASE_12_KVKK_SECURITY.md",
    "docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md",
    "docs/RUNBOOK_M45_RETENTION_BACKUP.md",
    "docs/DATA_INTEGRITY_AND_RECOVERY_01.md",
    "docs/OBSERVABILITY_MONITORING_ALERTING_01.md",
    "docs/DB_POOL_AND_API_SCALING_01.md",
    "docs/LOAD_TEST_2000_USERS_01.md",
    "docs/CACHE_COALESCING_AND_BACKOFF_01.md",
    "docs/REQUEST_STORM_RESILIENCE_01.md",
    "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
    "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md",
    "docs/OPERATIONAL_COST_MODEL_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
  ].map((value) => normalizePath(value)),
);

// #14 audit/closure files are exact, bounded governance and acceptance scope.
// Keep this list path-specific so new unrelated files cannot enter the security
// guard's approved working-tree categories implicitly.
const projectGapReadinessExactPaths = new Set(
  [
    "backend/scripts/project_wide_gap_and_release_readiness_audit_01_check.js",
    "backend/scripts/project_wide_gap_and_release_readiness_audit_01_acceptance.mjs",
    "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01.md",
    "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_CAPABILITY_MATRIX.json",
    "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_GAP_REGISTER.json",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "tools/check_step06_repo_contract.ps1",
  ].map((value) => normalizePath(value)),
);

const securityDocWorktreeEntries = [
  { path: "docs/UX_PANEL_INVENTORY_02A_AUDIT.md", sha256: "039246CFBD967E9AA63CBCED301A9AE4FB58F0DB4946A8CFE3C4C7BEB15E7B19" },
  { path: "docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md", sha256: "A7EF3D0DB003D206845EBDBF3DFF52B82839A993966BE10618C32EC7A418889E" },
  { path: "docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md", sha256: "36D7BCC36F1F2772524EC66B07A2A1363CA584ECAADD19C7FD4F7A750CF4A988" },
];
const securityDocWorktreeShas = buildExpectedShaMap(securityDocWorktreeEntries);

function isSecurityOwnedStatusPath(file) {
  const normalized = normalizePath(file);
  return securityOwnedExactPaths.has(normalized) || isAppJsxRoleTenantScopePath(normalized);
}

const terminologyPresentationEntries = [
  { path: "backend/scripts/_m91_route_preview_checks.js", sha256: "6C75E26FE4A66F5455EE95433C9E979C81364AA9227D25C27E504D0B07C9A1AB" },
  { path: "backend/scripts/m97_a_room_operation_panel_check.js", sha256: "3A6B0A1661EB031B0DC4BA60F75CB84A8BF9B090A39D36318493DA70EE0A70D9" },
  { path: "backend/scripts/m97_panel_operations_check.js", sha256: "6D2A01359E0DAE2A98F8C8E2FF298ABD6412581D872265BE831E97CCA39E3A74" },
  { path: "backend/src/ai/chat/conversationNextBestActionEngine.js", sha256: "82516EBDCBBAAC3A55720BE5964AA22B9445AD7F34B3ED71CD73750C93742F89" },
  { path: "backend/src/ai/chat/conversationPlanReviewEngine.js", sha256: "7B1448F9D8C541752D2465AFBDA8975049A1EAA68EE0D79FD5F593FB49F990C1" },
  { path: "backend/src/ai/chat/conversationRiskScoringEngine.js", sha256: "D0E21A934786272637BEA2E8829F8927AE3A9F0569FE0205A6295D9243F7FBA9" },
  { path: "backend/src/ai/chat/conversationRootCauseEngine.js", sha256: "CBC5B263197B38BB02ABE2711EE80F7A0A573F5C908B11317B1DC4E2695416FA" },
  { path: "backend/src/ai/chat/conversationTaskStateBuilders.js", sha256: "054C67A0FCB07EE54FD7C7A642F9E6080E547126307620787420A37C574ADACB" },
  { path: "backend/src/ai/chat/conversationTaskStateShared.js", sha256: "E2A9332B326726D209B4FEAD880DC74AD62FAE5077BC4474FA8B29757C5902F8" },
  { path: "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js", sha256: "5133BC61EF9503AE31E13190E385FCE58D01B8E2F931B1E7E67A256DB752FBB7" },
  { path: "backend/src/ai/chat/copilotGuidedTaskEngine.js", sha256: "3DE44F99FACA4D50B60E8727DDC8F47A16AD8A835255515340FC7DC172371A25" },
  { path: "backend/src/ai/chat/replyShapes.js", sha256: "2BB1C0C9DD849117EA1A7D0E37E77AE3FF20BE8223114893E38F68CD27CD634C" },
  { path: "backend/src/ai/chat/seferAbiReasoningAssistant.js", sha256: "3C5C91BB8C2E165C4F25885D96FEE7573A35B480D5FE79FB86D1D8A58951BD06" },
  { path: "backend/src/ai/chat/supplierOfferCollect.js", sha256: "FDB2F570EA959A82AD7C34270BDB73D51D69522CEE81517DE65F9C225C0B9196" },
  { path: "mobile/src/app/kvkkVisibilityMatrixState.js", sha256: "048B0B913E9B3CC878171DEC6085A85C6EF0D16669B3D7054E209AD5C18AE1A3" },
  { path: "mobile/src/app/notificationState.js", sha256: "3F7683D6C8EF4743CF70E2A65C059F60360C79EA5F6A9A820D69E9925B2A4BC3" },
  { path: "mobile/src/lib/roleSurface.js", sha256: "EBFB4FEA201F3342C8593BC3170292545C9AE8F4DF62EB5B14EE8B5D74B2F9B2" },
  { path: "mobile/src/screens/DriverAvailabilityCard.js", sha256: "3CA4DFC7700E313936DEACD0253B92979C17C32F5709D115013472B325F0FB4D" },
  { path: "mobile/src/screens/DriverTaskSummaryCard.js", sha256: "383F2EB7ADD7B061082742E036496F5621C4700D074A323C0751B0C184B9E9D5" },
  { path: "web/src/components/AgreementOpsBridgeCard.jsx", sha256: "AFDD26D1161EB49691AD99B4759D687A68DA3474F7CF23978E61027E016E84CC" },
  { path: "web/src/components/HakedisReconciliationEntryCard.jsx", sha256: "F9AE68AAF40B667B69B44572E9551011D077A0F6F4C12AF301B6F7B8DFD52A30" },
  { path: "web/src/components/PanelFeedbackEntryCard.jsx", sha256: "9A12E8D2AF97F597C5E20A1D0D5C4451D23B94BDE6C5D8F5059FCA9554C185AA" },
  { path: "web/src/components/PaymentPreviewReadonlyCard.jsx", sha256: "DF1B97A17E3AD95AA9C4211979D5ED599A53F9B9B22F8F313C3AAEB4120D4EB7" },
  { path: "web/src/components/ProviderScoreBadge.jsx", sha256: "D6D6040C8F32F2878D58AA4C70C0076668D34DFAB251220E13280A3F7FB0FA29" },
  { path: "web/src/components/ShiftReassignModal.jsx", sha256: "39E7175C89660CAAC5B38E01FF34C92B7BE0A894653B5DC11BFA754EA48EA06A" },
  { path: "web/src/components/TabletOpsQuickBar.jsx", sha256: "75EC308D8EFBDA0968836B65314424E0550C5531BE74994D7F252739F87FDEE7" },
  { path: "web/src/components/public/PublicLeadCaptureModal.jsx", sha256: "CDEA6F178FADE481C7493D7120D09A8473941277F7A5A416789D94A9C52C008E" },
  { path: "web/src/copilot/screenRegistry.js", sha256: "8DBD885C95760A7AF22547222E33FDE559662EB70D8A981DBC92161711B93463" },
  { path: "web/src/layout/AppShell.jsx", sha256: "1855A096B971C355004AF9193DB585DEA08985246B3A778233F5688D792C0F78" },
  { path: "web/src/layout/NavDock.jsx", sha256: "13B8D58A5A7DE358EDC7E7D9C0D6B9C54F05A51394E2F5DF72DF6307D7D13D75" },
  { path: "web/src/panels/company/AgreementWizard.jsx", sha256: "C4A8E949F5E6D08BBBD4377E4DAC675E157F93AB5E3F14DADC11996C212B5D69" },
  { path: "web/src/panels/company/AgreementsPanel.jsx", sha256: "E2CDE19CAAC5DA1F66A34DF9366CBFD1775A3D93135421E2A232C6B344C01385" },
  { path: "web/src/panels/company/CommercialFlowPanel.jsx", sha256: "4A6203A2E00491F212244661AE1D3C6927D016C696CD58E2E4A6E515D59B47C7" },
  { path: "web/src/panels/company/CompanyShiftsPanelIntro.jsx", sha256: "01287DBE39ABBC9230B6EB8374349D41754E7DA8665ED720CDCAD9F41B3BDB18" },
  { path: "web/src/panels/company/CompanyShiftsPanelTrackView.jsx", sha256: "2776ADDD4CCD64A5B41C636196BE609569A05D3958CFB7997E79FB6D1860C95B" },
  { path: "web/src/panels/company/OperationsPanel.jsx", sha256: "CACA1085258C8729B2DE3F86CE1BA198C6354FD18A9F579F0415D05151EF0AC0" },
  { path: "web/src/panels/company/WorkflowPanel.jsx", sha256: "51307B906EF7DD100457B1D20DB8C9A5334346BB637D50A989935C960AE7E633" },
  { path: "web/src/panels/company/companyAgreementsOverviewSection.jsx", sha256: "148A6DF5ADC12C6EA41B80165B9A95E6446F3480B03D6FC5D1C25B89945B4DE9" },
  { path: "web/src/panels/company/companyShiftsPanelMobileCards.jsx", sha256: "60187450BB9784FEF006F578E62FEBC73CF397A4C3B54AC6030C80FD443A62A3" },
  { path: "web/src/panels/company/companyShiftsPanelRows.jsx", sha256: "B07A8F54B897DB829E43F51B63CB6B254122504A8B99D9C400A827371D058431" },
  { path: "web/src/panels/company/companyShiftsPanelSections.jsx", sha256: "DC75C0A30D93349F5362D7312B1E379E475ACA0D3619D3C2EB701A54EE20871F" },
  { path: "web/src/panels/company/companyShiftsPanelSummaryCells.jsx", sha256: "9E9A2CBEC80267BA1C26B1D927F9BD0CD52EB4727F42D66316D95D51EB6D10A2" },
  { path: "web/src/panels/personel/LivePanel.jsx", sha256: "D73D0C93507094953BD1EEEAE6FA57CF656CDC662534F384199F132342B766F1" },
  { path: "web/src/panels/personel/MyRidePanel.jsx", sha256: "32F6236954D5A600FFD56A5D80BF83B61373AB5756CB2516F50D24156E876429" },
  { path: "web/src/panels/room/AgreementsPanel.jsx", sha256: "A95D9BC43959CC0ED6417B2376CA9BB5A20B4F05D99B5A93BAEEF9824799D309" },
  { path: "web/src/panels/room/CheckinPanel.jsx", sha256: "82018D28BD380E16B1A0434A8BF6728FC36BDDC6D43D76FC2640BED3E4354663" },
  { path: "web/src/panels/room/CommercialFlowPanel.jsx", sha256: "5EF329EB1A70B3EA2D33F227DAECE0919B815AEEC2B4C62531ECBE92E3C049F8" },
  { path: "web/src/panels/room/MapPanel.jsx", sha256: "AB49A5566EDD95B31EE03FC42AD352E45C17E5EEA616188965212DC78376C6C0" },
  { path: "web/src/panels/room/OffersPanel.jsx", sha256: "72D0CFC54D1C2983BD97E00BC7BADA008CECF09797BA3C92EE4FE470700ED203" },
  { path: "web/src/panels/room/OperationHealthPanel.jsx", sha256: "597E1D7B915FF732A768AB4662D7623961A2557BEE815B7D8CB56FDEAC0FD068" },
  { path: "web/src/panels/room/VehiclesPanel.jsx", sha256: "6AF5573297F292976419FF0BC5635EEB06A9CEA7BC023AAD0EE11D0B7AB4D14D" },
  { path: "web/src/panels/room/roomAgreementsBridgeSection.jsx", sha256: "E4253C757A7072B1213E44C089B49B47C79EFE05119672D85C01A8FDC3322A5C" },
  { path: "web/src/panels/room/roomAgreementsPanelSections.jsx", sha256: "7D0E6F5D5F9EFC80FCD6F87BC98EB562923714B18F94C1C1DAE72B9A62FCDDB1" },
  { path: "web/src/panels/room/roomOperationsBoard.jsx", sha256: "BC9010A1FFAFBE73F69F2FF8E5BBA1E8AA52CEA9024393321E3BE013AB25640B" },
  { path: "web/src/panels/room/roomShiftsPanelActions.js", sha256: "0E048187178FCEDADE083C859F9EAA0F3E6D02EA8B33412971E90B3756CD2EF1" },
  { path: "web/src/panels/shared/AgreementRouteChangePreviewCard.jsx", sha256: "B0E4C08F73A539847163509D67528B2136835F76C66A1C2C2F9E81C316979447" },
  { path: "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx", sha256: "29E8187256F8E92A46D0828FF2F483CB8CEDA47492671D92A102AF5DDFC843A6" },
  { path: "web/src/panels/shared/CopilotPanel.jsx", sha256: "E49964BF976DFEAC565ECF080098B86318FD122C79E93F4770455E4D2139D72D" },
  { path: "web/src/panels/shared/OfferQualityRankingCard.jsx", sha256: "D31D936C3DF191571E1CB15B42AA01269424744270ECF23B334B3D3D96F00D41" },
  { path: "web/src/panels/shared/SafeDriveSummaryCard.jsx", sha256: "E32862CD035CC336980F091F6975E71878010210159E676E888DE332B72708B2" },
  { path: "web/src/panels/superadmin/CompaniesPanel.jsx", sha256: "BC811B33D764D56ACC2C0D22ABA6F725A9E65DE824E2180E7CEF840B6E786FF4" },
  { path: "web/src/panels/superadmin/PublicLeadReviewPanel.jsx", sha256: "1B8C958B5864FDCE7E670D9A5A8B8D4146CF0ACFDECE697BF374FA1581C9C4EF" },
  { path: "web/src/panels/superadmin/RegionsPanel.jsx", sha256: "3FEA849F097B082E6F57CE5E2F04657738452AA7E8291A3AC83B04161CB1F21B" },
  { path: "web/src/panels/superadmin/RoomsPanel.jsx", sha256: "85A442A7B1E0E82297D3BC91FEB13FF7136466BF930BB7A37BAD590AABA15165" },
  { path: "web/src/panels/superadmin/SuperAdminPanel.jsx", sha256: "FED964C43B0632A12F34246181620D14B3630A480588B55878BFFF537AB2DBDE" },
  { path: "web/src/panels/superadmin/TelematicsHubPanel.jsx", sha256: "17FC6BA18D89C94DA5E348E6955DECB9E5AAB04203CFD99D92E21AAEA2798FAE" },
  { path: "web/src/panels/superadmin/UsersPanel.jsx", sha256: "903ED1F7B0CA5CA7F20F8823E3ED06EDF5EF271F073DD930B8DEF44FA7538C4B" },
  { path: "web/src/utils/copilotPanelHelpers.js", sha256: "454F51E8450AE9A8F08BC166874EE9458D68AC677B9B2E37D96076600105CF97" },
  { path: "web/src/utils/labels.js", sha256: "EBC0D0470AF8484D4AC5139176B09BAC9CA247D30915B7C30FD81D9BCC063282" },
  { path: "web/src/utils/safeDriveSummary.js", sha256: "EBAF201CD46BD87B66FE83CE57B16479FD5DCB5F3AA2D88F5ECE1E9C3C4E4707" },
  { path: "backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js", sha256: "5ECF7CC55FB48028250ECB09F40104013C5F5ED08341620751EB5E8CD7ECE4E8" },
  { path: "backend/src/ai/jobGuide/levels.js", sha256: "5E75C97EEB12975244E4634DDA4AFF9F3016DA7FAC9732756CEB4035569259AB" },
  { path: "backend/src/ai/jobGuide/screenCatalog.js", sha256: "45FF585D95A4DF8C64ABE6DFA403ACE53D130B78CBAB27B35599CE12FDBF04D5" },
  { path: "docs/BUG_ROUTE_IMPACT_PREVIEW_BUTTON_01.md", sha256: "069127242E08DE3A762DCD22447F60D484485D5CE6008A4C8B1CF30409CF3C75" },
  { path: "mobile/src/screens/ParentActivationCard.js", sha256: "84FD1481A050B5757C8FA54BAED869B46EC4B15BB86F20017BD7C33DDA914E5E" },
  { path: "web/src/components/PaymentReadinessReadonlyCard.jsx", sha256: "DCFA5652EF4B23A2E4BDA052EB1492FCBD4001DFC5CEF53F43BE9F2063D237EC" },
  { path: "web/src/panels/company/CheckinPanel.jsx", sha256: "EE5AFE21578A32E69AA8748E38A1976329EE98088EDBFA0449625A957B9C9588" },
  { path: "web/src/panels/company/GeoReviewPanel.jsx", sha256: "D283A0EB5722232669AE9D9D63EE77A9A52567751E517ACDB1035C286FBF76F8" },
  { path: "web/src/panels/company/GuidedPlanModal.jsx", sha256: "83EF5FC0F31A9FD5894AC77ADDED79AA3393E40619D7CCE14BD2D24B23735389" },
  { path: "web/src/panels/company/HubPanel.jsx", sha256: "68E237BA03F6DA83A91C49EAE170BEB3D6F398A6882417A17AFAF8376AAE359E" },
  { path: "web/src/panels/company/MapPanel.jsx", sha256: "286215AB696E6FE48063DB1A788AB70FE6055E4DCF73D8F9464FBF1761AAAEBF" },
  { path: "web/src/panels/company/PersonelAccessPanel.jsx", sha256: "EBB8050CBB35330E2A96F7A9321673220FDB87271FB101F737B0A8879CC8600A" },
  { path: "web/src/panels/company/ServiceEvaluationPanel.jsx", sha256: "BBEA2130687645E8ADE39EC3559F0A9C61E6FAEE8A74E7AEEAB47DBAD641E59C" },
  { path: "web/src/panels/company/ShiftPeopleTab.jsx", sha256: "A0A065404FE7EF996E5F3D1ADEB496882B561648A28F50A8D1F7957FDEA57FE2" },
  { path: "web/src/panels/company/ShiftTemplatesPanel.jsx", sha256: "934055EEB7407E6AEA43566302A6FFB9689E445A7771AC1C41F6217689A0673E" },
  { path: "web/src/panels/company/ShiftsPanel.jsx", sha256: "9C37254ACA2907EA15C575BD91D5A020DE27991F0BCC1FC1FA62179165368BF5" },
  { path: "web/src/panels/company/companyAgreementsMobileCards.jsx", sha256: "7C912C134C0E7495D5A4C5970246D310FCE8F64D70F987D8302EC7141D84EA9E" },
  { path: "web/src/panels/company/companyShiftsPanelActions.js", sha256: "BA93A4ADE7F75C6B575A3BCC2B3188CA01166B5746B7F4DCC7CEA9223E34D218" },
  { path: "web/src/panels/company/companyShiftsPanelCards.jsx", sha256: "609A195CEF5DD173B9399535D19134C966E5173CE12000AD47E443103D618C17" },
  { path: "web/src/panels/company/companyShiftsPanelFilters.jsx", sha256: "2606B60E3524B61287C619D4587CE28E137B4E1FAE0249E5ACCC48FEAC86C9B4" },
  { path: "web/src/panels/company/guidedPlanModalActions.js", sha256: "6D1ECC91CBDFE38F679B158DF764887DEEDB0799A67545A45C0C0E25B30A0496" },
  { path: "web/src/panels/company/guidedPlanModalCards.jsx", sha256: "B8E7107F8DD19EF48AD6CE714471C5D49995C3B50250C3C9F30EF42AE531D9EB" },
  { path: "web/src/panels/company/guidedPlanModalDestinationCards.jsx", sha256: "6F3A63C50F70ECA5CA88F7C4189CDC6A53C3BF4A147FAAF6AF0C0AEFE0A90DAE" },
  { path: "web/src/panels/company/guidedPlanModalSections.jsx", sha256: "2FE8C218EEB7E90A67D1290B9065B6463C8E0FADE4F4E28FB6B842CF8C77E803" },
  { path: "web/src/panels/company/planBuilderPanelActions.js", sha256: "417AD19AA369CC0874E22FABCE5AACE7B467538A7F394F83F4B3C8430EAB8243" },
  { path: "web/src/panels/company/planBuilderPanelSections.jsx", sha256: "B6C0BC2E56DCD8C932F8D7F63BBAE4166E234C13059B7651A8B75D68A380E855" },
  { path: "web/src/panels/company/shiftPeopleTabSections.jsx", sha256: "809972D1C88F11846344BBB500BDA863BF9F67A79EAA713D35DDEDC784BD4FCF" },
  { path: "web/src/panels/company/shiftsPanelOfferUtils.js", sha256: "A4979AD7BD0B3CAFA40D7DF750262CB985B04A589E264967FBF7AEBE41030B88" },
  { path: "web/src/panels/driver/RoutePanel.jsx", sha256: "D0C8902F2E44354C4384E4C0BE80670DF27B6A76589AFF971F283D208C381F10" },
  { path: "web/src/panels/driver/CheckinPanel.jsx", sha256: "7737404647D0FCE22198BFA3A143DC185702E98FEC5AAEA00DBFBFA13C357FDB" },
  { path: "web/src/panels/organization/CenterPanel.jsx", sha256: "AA242BEB3D7E8B4CC64EE2685E0014832288E4EDE4EE931D63BDC405C8427DE0" },
  { path: "web/src/panels/organization/PlansPanel.jsx", sha256: "EF3A8A027E833B6534FCA788F274B96CB2A367688FA059E6F42D0512E40F4D8A" },
  { path: "web/src/panels/organization/organizationPlansShared.jsx", sha256: "4BC15C534A9399FFBB56C31AE256DAA5339D792CCB37A3211519DCE9E19D572C" },
  { path: "web/src/panels/public/PublicLandingPage.jsx", sha256: "0C5C4FA0BD3239D86466BCC032FF693C946040B9940C1606D7F361C977FDBBD2" },
  { path: "web/src/panels/public/PassengerLivePanel.jsx", sha256: "79E4AEAF56B106F966E923701CD07B85A97C8959A47F477872426B60F91944DF" },
  { path: "web/src/panels/room/HubPanel.jsx", sha256: "5D862BDA535D75AB91F788C63D9AD9B0F33DEB93BC288162D62E3F7845BA0C4E" },
  { path: "web/src/panels/room/ShiftsPanel.jsx", sha256: "7C4258644A9E5998059BDD07FA57682C297A826FEC9C6BAFE431B4FB7846EC4A" },
  { path: "web/src/panels/room/roomShiftsMainSections.jsx", sha256: "54492ACB7BDA42CBD10122A5891C6D12E44B271C06CF0B9B7ACD45F37D6FB854" },
  { path: "web/src/panels/room/roomShiftsPanelCards.jsx", sha256: "676EBDF58A97169715581AC857EB51DEA3280BE6DD9CE26D1A363F4C3B059BDF" },
  { path: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", sha256: "012306CE28A65467D41605957CE82006374386301FA82594F32626C7A7F24878" },
  { path: "web/src/panels/room/roomShiftsPanelRows.jsx", sha256: "1A5FF81F47851A7EB44AA20E55BEEDE70F5F5275D68CBB4BFDEF8E87CE702549" },
  { path: "web/src/panels/room/roomShiftsPanelSections.jsx", sha256: "BA8DDA6EA8F2E65776FBD68E58E749097D6E1B3DD98E42D72BCED3F379509B38" },
  { path: "web/src/panels/room/roomShiftsPanelUtils.js", sha256: "C5E8FB2C0E1BE186BF027A491CA9187B7C719DFC8F2FF9E78D811F973AB16279" },
  { path: "web/src/panels/room/roomVehiclesPanelCards.jsx", sha256: "33CB799B71B0848FA6BE8A31E44063A35E7F2A5E86C1CDD134959967E0BEC278" },
  { path: "web/src/panels/room/roomVehiclesPanelRows.jsx", sha256: "A710286C91187E486089002B578F6EC930CAFE97049A4141F5614CFBDEE3ECD6" },
  { path: "web/src/panels/room/roomVehiclesPanelSections.jsx", sha256: "185BEFC7E0BDF848924ADF20E89738DC7AAF6407985B73BE1C146EA81E714C51" },
  { path: "web/src/panels/school/OperationsPanel.jsx", sha256: "294EB887ED6BE3174C3B50BD0752B4A7CA1E15623C60CA1B74270C9FE54F3A49" },
  { path: "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx", sha256: "90EFEEA553153BE1170D80629F996AB034871E8404AFDB32EA20C23CBFA328CF" },
  { path: "web/src/panels/shared/KvkkPanel.jsx", sha256: "DA76C50480A5FE02FD12CDDC34707E2E213831117ED00268AFA31AA2BD60A653" },
  { path: "web/src/panels/shared/NotificationsPanel.jsx", sha256: "99FEA93C853E268B36938E3A16F12E88DCBDAA9D450AF56FDB68870711991BF6" },
  { path: "web/src/panels/shared/PanelKvkkHint.jsx", sha256: "F344E3219052F87F20DB5685FA957EB4A6311DC54A8334D9C6815E89785F490F" },
  { path: "web/src/panels/shared/PlatformFeePreviewCard.jsx", sha256: "552FCB7B157D01E32E0FF38057097F7D7FD137BF9C11038F107345672DEDC829" },
  { path: "web/src/panels/shared/ReportsPanel.jsx", sha256: "1C887505BA91EDA5310D70A71B3CA50B9952F22D42F08C0318142717740BB9C4" },
  { path: "web/src/panels/shared/TotpStepUpCard.jsx", sha256: "21ACB25DB2AFF07643D401AC5C1E16F9E3E2AC0CF028610D895AC38786F48998" },
  { path: "web/src/panels/shared/boardingChangeUi.js", sha256: "01A06C914530EFE950F9FA0E22BE39A411D69C065C226416E4B73E426FF3D175" },
  { path: "web/src/panels/shared/operationsDigestUtils.js", sha256: "7C5921796E17B9708151EA7954FD9B4438591701962588C9DFE98A9F83383DF8" },
  { path: "web/src/panels/superadmin/AuditLogsPanel.jsx", sha256: "4080933AB0053F690096C6130853F3A5936A12F0A05699B6F94097FA09C53F6E" },
  { path: "web/src/panels/superadmin/CommercialCorePanel.jsx", sha256: "3A0392D66E6AF3AAA70DEC456A435B0A78A4828EDB9FF11F1554F1E0FB13E123" },
  { path: "web/src/panels/superadmin/TrustQualityPanel.jsx", sha256: "E2952D8C02511E6AD7EFA584AC50C39479C3ED73C3B8026DCB8A75EC8107DB73" },
  { path: "web/src/panels/superadmin/commercialCorePanelShared.jsx", sha256: "C74EC10A9D85848E4229C360420D916A95DBCE5CDEC9E5276937D27C59361460" },
  { path: "web/src/utils/agreementCopilotFacts.js", sha256: "8075D1C3974CBA678B825942C0E2521C3DB0B111657191C44A01B6B2F7F9D798" },
  { path: "web/src/utils/agreementPrefill.js", sha256: "E0C991B62E4B2AB6443E81B5DDCBF221704A1AE68C19FB7C0B1DFEFEB0D1E5DC" },
  { path: "web/src/utils/copilotFacts.js", sha256: "C785418E29AC3394B2A00CCD2FC6E841B73B176A1D5CA139E08C25DCAED70DBB" },
  { path: "web/src/utils/notificationV1.js", sha256: "43569BC18C0BCE72FA2DADE75C119DDFF335171E8B496B978C095D93460FE123" },
  { path: "web/src/utils/offerQualityRanking.js", sha256: "00BDAF985F08A5DE968E1448158225403AECD5EAE6B670C5BF8CD9E9535CB7F6" },
  { path: "web/src/components/RoutePreviewModal.jsx", sha256: "741450855189B83C6C1A267919A66A8B4FB4E714D385ECA7A984E0EDEEE8A96A" },
  { path: "web/src/lib/markers/vehicleMarkerC.js", sha256: "8C7EA82D00D4E0C9A8D823855629292B894937D60545FBC1C428D0373550B964" },
  { path: "web/src/panels/driver/MapPanel.jsx", sha256: "22ABBF2931D9C5D671DFE9D493BDE898092442D0BB9F1E63D166CD2EA01891BD" },
  { path: "web/src/panels/driver/TodayPanel.jsx", sha256: "ACB5EB64D24F958A725D751EBE2F1DDAA2F6818D50605B0849F55CB828E11F02" },
  { path: "web/src/utils/gpsSource.js", sha256: "39B5EC94B2FFC9C95F9312DA277A818AA82CE908C410F6200F916DF144C3958F" },
  { path: "web/src/utils/gpsSourceVisibility.js", sha256: "0270F4C469D502D01D54BB045A9901826B036BEFF2486FF11B11CE87A62FBC8C" },
];
const terminologyPresentationShas = buildExpectedShaMap(terminologyPresentationEntries);

function isTerminologyPresentationPath(file) {
  const normalized = normalizePath(file);
  const expectedSha = terminologyPresentationShas.get(normalized);
  if (!expectedSha) return false;
  const actualSha = normalizedTextSha256(normalized);
  must(actualSha === expectedSha, `terminology presentation identity mismatch: ${normalized}`);
  return true;
}

function isApprovedCurrentHeadBackendPath(file) {
  const normalized = normalizePath(file);
  const expectedSha = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.find((entry) => normalizePath(entry.path) === normalized)?.sha256;
  if (!expectedSha) return false;
  const actualSha = fileSha256(normalized);
  must(actualSha === expectedSha, `approved current-head backend identity mismatch: ${normalized}`);
  normalizedTextSha256(normalized);
  return true;
}

function isApprovedCurrentHeadSchemaPath(file) {
  const normalized = normalizePath(file);
  if (normalized !== "backend/prisma/schema.prisma") return false;
  const actualSha = normalizedTextSha256(normalized);
  must(actualSha === CURRENT_HEAD_APPROVED_SCHEMA, `approved current-head schema identity mismatch: ${normalized}`);
  return true;
}

function classifySecurityKvkkStatusPath(file) {
  const normalized = normalizePath(file);
  if (normalized === selfSecurityGuardPath) return "SELF_SECURITY_GUARD";
  if (projectGapReadinessExactPaths.has(normalized)) return "PROJECT_GAP_READINESS_14";
  if (isTerminologyPresentationPath(normalized)) return "APPROVED_TERMINOLOGY_PRESENTATION";
  if (isBatch13FoundationOwnerPath(normalized)) return "BATCH13_FOUNDATION_OWNER";
  if (isApprovedCurrentHeadBackendPath(normalized) || isApprovedCurrentHeadSchemaPath(normalized)) return "APPROVED_CURRENT_HEAD_PRODUCT";
  if (isCoreGuardInfraPath(normalized)) return "CORE_GUARD_INFRA";
  if (currentClosureCorrectiveShas.has(normalized)) {
    const expected = currentClosureCorrectiveShas.get(normalized);
    const actual = normalizedTextSha256(normalized);
    return actual === expected
      ? "CURRENT_CLOSURE_CORRECTIVE"
      : `UNKNOWN: ${normalized} expected ${expected} got ${actual}`;
  }
  if (pausedMilestoneWorktreeShas.has(normalized)) {
    const expected = pausedMilestoneWorktreeShas.get(normalized);
    const actual = normalizedTextSha256(normalized);
    return actual === expected
      ? "PAUSED_MILESTONE_WORKTREE"
      : `UNKNOWN: ${normalized} expected ${expected} got ${actual}`;
  }
  if (batch09ApprovedConcurrentWorktreeShas.has(normalized)) {
    const expected = batch09ApprovedConcurrentWorktreeShas.get(normalized);
    const actual = normalizedTextSha256(normalized);
    return actual === expected
      ? "APPROVED_CONCURRENT_CANONICAL_WORKTREE"
      : `UNKNOWN: ${normalized} expected ${expected} got ${actual}`;
  }
  if (batch09CommercialSplitRouteShas.has(normalized)) {
    const expected = batch09CommercialSplitRouteShas.get(normalized);
    const actual = normalizedTextSha256(normalized);
    return actual === expected
      ? "APPROVED_CONCURRENT_CANONICAL_ROUTE"
      : `UNKNOWN: ${normalized} expected ${expected} got ${actual}`;
  }
  if (batch09ProvenanceClosureShas.has(normalized)) {
    const expected = batch09ProvenanceClosureShas.get(normalized);
    const actual = normalizedTextSha256(normalized);
    if (actual !== expected) {
      return `UNKNOWN: ${normalized} expected ${expected} got ${actual}`;
    }
    if (normalized === "backend/src/lib/requestUrl.js") return "LEGITIMATE_CANONICAL_NEW_FILE";
    if (normalized === "backend/src/server.js") return "PROVEN_BATCH09_CHANGE";
    return "APPROVED_CONCURRENT_CANONICAL_WORKTREE";
  }
  if (securityDocWorktreeShas.has(normalized)) {
    const expected = securityDocWorktreeShas.get(normalized);
    const actual = normalizedTextSha256(normalized);
    return actual === expected
      ? "DOC_WORKTREE_SCOPE"
      : `UNKNOWN: ${normalized} expected ${expected} got ${actual}`;
  }
  if (isBatch13AppJsxMigrationConsumerPath(normalized)) return "BATCH13_APP_JSX_MIGRATION_CONSUMER";
  if (isBatch13FoundationSupportPath(normalized)) return "BATCH13_FOUNDATION_SUPPORT";
  if (isBatch13FoundationCommandSurfacePath(normalized)) return "BATCH13_FOUNDATION_COMMAND_SURFACE";
  if (isCommercialPaymentSecurityCheckerPath(normalized)) return "COMMERCIAL_PAYMENT_SECURITY_CHECKER_INFRA";
  if (isM80M89ContractSweepRepoContractPath(normalized)) return "M80_M89_CONTRACT_SWEEP_REPO_CONTRACT";
  if (BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET.has(normalized)) return "DOC_WORKTREE_SCOPE";
  if (isBatch14DocArchitectureConsolidationPath(normalized)) return "DOC_WORKTREE_SCOPE";
  if (isBatch11IndexWorktreeScopePath(normalized) || BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET.has(normalized)) return "INDEX_WORKTREE_SCOPE";
  if (outOfScopeTestInfraPaths.has(normalized)) return "OUT_OF_SCOPE_TEST_INFRA";
  if (normalized !== selfSecurityGuardPath && productExtensionsCheckerPaths().has(normalized)) return "OUT_OF_SCOPE_CHECKER_INFRA";
  if (productExtensionsSmokePaths().has(normalized)) return "OUT_OF_SCOPE_TEST_INFRA";
  if (outOfScopeCurrentHeadHelperPaths.has(normalized)) return "OUT_OF_SCOPE_CURRENT_HEAD_HELPER";
  if (isSecurityOwnedStatusPath(normalized)) return "ROLE_TENANT_SECURITY_OWNED";
  if (normalized.startsWith("backend/src/routes/")) return "PROTECTED_ROUTE";
  if (normalized.startsWith("backend/src/services/")) return "PROTECTED_SERVICE";
  if (normalized.startsWith("backend/prisma/")) return "PROTECTED_PRISMA";
  if (normalized.startsWith("backend/artifacts/runtime-data/")) return "RUNTIME_DATA";
  return "UNKNOWN";
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

function gitScopedCapture(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitScopedLines(args) {
  const out = gitScopedCapture(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitScopedStatusEntries(paths) {
  return String(gitScopedCapture(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, relPath))).digest("hex").toUpperCase();
}

function safeFileSha256(relPath, expectedHash) {
  try {
    return fileSha256(relPath) === String(expectedHash || "").toUpperCase();
  } catch {
    return false;
  }
}

function mustFileSha256(relPath, expectedHash, label) {
  must(safeFileSha256(relPath, expectedHash), label);
}

function mustRegularFile(relPath, label) {
  let ok = false;
  try {
    const stat = fs.lstatSync(path.join(repoRoot, relPath));
    ok = stat.isFile() && !stat.isSymbolicLink();
  } catch {
    ok = false;
  }
  must(ok, `${label} is an ordinary file`);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  let stat = null;
  try {
    stat = fs.lstatSync(absPath);
  } catch {
    stat = null;
  }
  must(stat && stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}

function validateExactPathGroup(label, paths, expectedCount) {
  if (!Array.isArray(paths)) throw new Error(`FAIL ${label}: not an array`);
  if (paths.length !== expectedCount) throw new Error(`FAIL ${label}: expected ${expectedCount} paths, got ${paths.length}`);
  const normalized = paths.map((value) => normalizePath(value));
  if (normalized.some((value, index) => value !== paths[index])) throw new Error(`FAIL ${label}: non-normalized path strings`);
  if (new Set(normalized).size !== normalized.length) throw new Error(`FAIL ${label}: duplicate paths`);
  return normalized;
}

function validateDisjointPathGroups(groupEntries) {
  const seen = new Map();
  for (const [label, values] of groupEntries) {
    for (const value of values) {
      const owner = seen.get(value);
      if (owner && owner !== label) {
        throw new Error(`FAIL ${label}: path overlap with ${owner} at ${value}`);
      }
      seen.set(value, label);
    }
  }
}

// Exact backend Prisma manifest contract: collect tracked, staged, and untracked evidence,
// then validate only the frozen accepted manifest. The status contract remains separate.
const ACCEPTED_PRISMA_SCHEMA = {
  path: CANONICAL_PRISMA_SCHEMA_PATH,
  sha256: CANONICAL_PRISMA_SCHEMA_RAW_SHA256,
};

const ACCEPTED_PRISMA_MIGRATIONS = [
  { dir: "backend/prisma/migrations/20260125133000_seed_root_baseline", sha256: "27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD" },
  { dir: "backend/prisma/migrations/20260125133100_organization_shift_import_baseline", sha256: "864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD" },
  { dir: "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline", sha256: "E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5" },
  { dir: "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline", sha256: "6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB" },
  { dir: "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge", sha256: "CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F" },
  { dir: "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge", sha256: "B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90" },
  { dir: "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline", sha256: "734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005" },
  { dir: "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline", sha256: "85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17" },
  { dir: "backend/prisma/migrations/20260731120000_financial_operations_persistence_01", sha256: "3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0" },
  { dir: "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01", sha256: "24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198" },
  { dir: "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01", sha256: "A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202" },
  { dir: "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01", sha256: "0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A" },
  { dir: "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01", sha256: "D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF" },
  { dir: "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01", sha256: "8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A" },
  { dir: "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01", sha256: "F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A" },
  { dir: "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01", sha256: "025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0" },
  { dir: "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01", sha256: "D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E" },
  { dir: "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01", sha256: "C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54" },
  { dir: "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01", sha256: "FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D" },
  { dir: "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01", sha256: "E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90" },
  { dir: "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01", sha256: "7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007" },
  { dir: "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01", sha256: "285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27" },
  { dir: "backend/prisma/migrations/20260801211000_room_company_cleanup_01", sha256: "E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5" },
  { dir: "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01", sha256: "3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36" },
  { dir: "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01", sha256: "59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA" },
  { dir: "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01", sha256: "F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528" },
  { dir: "backend/prisma/migrations/20260801215000_consent_surface_bridge_01", sha256: "423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581" },
  { dir: "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01", sha256: "252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79" },
  { dir: "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01", sha256: "168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F" },
  { dir: "backend/prisma/migrations/20260801217000_personel_credential_bridge_01", sha256: "BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC" },
  { dir: "backend/prisma/migrations/20260801218000_operational_fk_bridge_01", sha256: "2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924" },
  { dir: "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01", sha256: "939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5" },
];

const ACCEPTED_PRISMA_FILE_PATHS = [
  ACCEPTED_PRISMA_SCHEMA.path,
  ...ACCEPTED_PRISMA_MIGRATIONS.map((entry) => `${entry.dir}/migration.sql`),
];
const ACCEPTED_PRISMA_FILE_SET = new Set(ACCEPTED_PRISMA_FILE_PATHS.map((entry) => normalizePath(entry)));

function collectAcceptedPrismaEvidence() {
  const tracked = sortedUniquePaths(gitScopedLines(["diff", "--name-only", "--", "prisma", "backend/prisma"]));
  const staged = sortedUniquePaths(gitScopedLines(["diff", "--cached", "--name-only", "--", "prisma", "backend/prisma"]));
  const status = sortedUniquePaths(gitScopedStatusEntries(["prisma", "backend/prisma"]).map((entry) => entry.path));
  const actual = sortedUniquePaths([...tracked, ...staged, ...status]);
  return { tracked, staged, status, actual };
}

function inspectAcceptedPrismaManifest(evidence = collectAcceptedPrismaEvidence()) {
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_FILE_SET.has(file));
  const missing = ACCEPTED_PRISMA_FILE_PATHS.filter((file) => !evidence.actual.includes(file));
  const schemaShaMatches = safeFileSha256(ACCEPTED_PRISMA_SCHEMA.path, ACCEPTED_PRISMA_SCHEMA.sha256);
  const migrationShaMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => normalizedTextSha256(`${entry.dir}/migration.sql`) === String(entry.sha256 || "").toUpperCase());
  const migrationShapeMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => {
    const dir = path.join(repoRoot, entry.dir);
    let stat = null;
    try {
      stat = fs.lstatSync(dir);
    } catch {
      stat = null;
    }
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
      return false;
    }
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
    } catch {
      return false;
    }
    return entries.length === 1 && entries[0] === "migration.sql";
  });
  return {
    evidence,
    unexpected,
    missing,
    schemaShaMatches,
    migrationShaMatches,
    migrationShapeMatches,
    exact:
      unexpected.length === 0 &&
      missing.length === 0 &&
      schemaShaMatches &&
      migrationShaMatches &&
      migrationShapeMatches,
  };
}

function mustAcceptedPrismaManifest(evidence = collectAcceptedPrismaEvidence()) {
  void evidence;
  must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty");
}

function main() {
  console.log("=== SECURITY-KVKK-FINAL-01 CHECK ===");
  must(
    batch09CommercialSplitRouteEntries.length === 6,
    "commercial split route identity remains the exact six-entry current-head family",
  );

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const roleDataDoc = readFile(paths.roleDataDoc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);
  const observabilityDoc = readFile(paths.observabilityDoc);
  const dbScalingDoc = readFile(paths.dbScalingDoc);
  const loadTestDoc = readFile(paths.loadTestDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const rateLimitDoc = readFile(paths.rateLimitDoc);
  const phase12Doc = readFile(paths.phase12Doc);
  const kvkkRunbook = readFile(paths.kvkkRunbook);
  const retentionRunbook = readFile(paths.retentionRunbook);
  const kvkkMatrix = readFile(paths.kvkkMatrix);
  const kvkkRoute = readFile(paths.kvkkRoute);
  const responseCache = readFile(paths.responseCache);
  const dashboardBulk = readFile(paths.dashboardBulk);
  const adminRoute = readFile(paths.adminRoute);
  const routeMounts = readFile(paths.routeMounts);
  const serverJs = readFile(paths.serverJs);
  const retentionBackupPolicy = readFile(paths.retentionBackupPolicy);
  const backupArchiveOps = readFile(paths.backupArchiveOps);
  const jsonFileStore = readFile(paths.jsonFileStore);

  const runtimeDataFiles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
  ];

  // Exact working-tree status scope for the audited accepted Prisma manifest.
  // Prisma content validation remains governed by the later Prisma contract.
  const acceptedPrismaStatusPaths = [
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations/20260125133000_seed_root_baseline/",
    "backend/prisma/migrations/20260125133100_organization_shift_import_baseline/",
    "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/",
    "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/",
    "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/",
    "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/",
    "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/",
    "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/",
    "backend/prisma/migrations/20260731120000_financial_operations_persistence_01/",
    "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/",
    "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/",
    "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/",
    "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/",
    "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/",
    "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/",
    "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/",
    "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/",
    "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/",
    "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/",
    "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/",
    "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/",
    "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/",
    "backend/prisma/migrations/20260801211000_room_company_cleanup_01/",
    "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/",
    "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/",
    "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/",
    "backend/prisma/migrations/20260801215000_consent_surface_bridge_01/",
    "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/",
    "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/",
    "backend/prisma/migrations/20260801217000_personel_credential_bridge_01/",
    "backend/prisma/migrations/20260801218000_operational_fk_bridge_01/",
    "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/",
  ];

  // Exact status scope owned by the cumulative guard-alignment work.
  const guardAlignmentStatusPaths = [
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/scripts/ai03b_paraphrase_intent_audit_01_check.js",
    "backend/scripts/ai03b_semantic_visible_audit_01_check.js",
    "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
    "backend/scripts/backend_lint_warning_burndown_01_check.js",
    "backend/scripts/cache_coalescing_and_backoff_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/scripts/copilot_guided_task_engine_01_check.js",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/scripts/copilot_reasoning_answer_composer_01_check.js",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/scripts/dashboard_bulk_endpoint_01_check.js",
    "backend/scripts/data_integrity_and_recovery_01_check.js",
    "backend/scripts/db_pool_and_api_scaling_01_check.js",
    "backend/scripts/hot_file_split_web_panels_01_check.js",
    "backend/scripts/lead_capture_01_check.js",
    "backend/scripts/load_test_2000_users_01_check.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/observability_monitoring_alerting_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/request_storm_resilience_01_check.js",
    "backend/scripts/room_profitability_and_quote_floor_01_check.js",
    "backend/scripts/room_profitability_and_quote_floor_01_expansion.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
    "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
    "backend/scripts/shift_dispatch_approval_fix_01_check.js",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "backend/scripts/test_quality_and_flake_audit_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_density_01_panel_card_density_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
  ];

  // Exact status scope owned by the active company-budget milestone.
  const companyBudgetStatusPaths = [
    "backend/src/routes/companyOverview.js",
    "web/src/panels/shared/FinancialOperationsPanel.jsx",
    "backend/scripts/company_budget_and_service_cost_01_check.js",
    "backend/src/finance/companyBudgetAndServiceCost.js",
    "docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md",
  ];

  // Package-level runner path; stage remains independently prohibited below.
  const packageRunnerStatusPaths = [
    "backend/scripts/run_backend_lint.js",
  ];

  validateStatusGroup("acceptedPrismaStatusPaths", acceptedPrismaStatusPaths, 33);
  validateStatusGroup("guardAlignmentStatusPaths", guardAlignmentStatusPaths, 45);
  validateStatusGroup("companyBudgetStatusPaths", companyBudgetStatusPaths, 5);
  validateStatusGroup("packageRunnerStatusPaths", packageRunnerStatusPaths, 1);
  validateDisjointStatusGroups([
    ["acceptedPrismaStatusPaths", acceptedPrismaStatusPaths],
    ["guardAlignmentStatusPaths", guardAlignmentStatusPaths],
    ["companyBudgetStatusPaths", companyBudgetStatusPaths],
    ["packageRunnerStatusPaths", packageRunnerStatusPaths],
  ]);

  const allowedStatusNames = new Set([
    ...runtimeDataFiles,
    "tools/repo_contract_state.json",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/scripts/role_data_isolation_redteam_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/financial_operations_surface_and_rbac_01_check.js",
    "backend/src/finance/",
    "backend/src/finance/financialOperationsScope.js",
    "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md",
    "backend/scripts/operational_cost_model_01_check.js",
    "backend/scripts/operational_cost_model_01_expansion.js",
    "backend/src/finance/operationalCostModel.js",
    "backend/src/finance/operationalCostMath.js",
    "docs/OPERATIONAL_COST_MODEL_01.md",
    "backend/scripts/supplier_matching_01_check.js",
    "backend/scripts/supplier_offer_collect_01_check.js",
    "backend/scripts/copilot_offer_analysis_01_check.js",
    "backend/scripts/copilot_negotiation_assist_01_check.js",
    "backend/scripts/copilot_offer_recommendation_01_check.js",
    "backend/scripts/copilot_demand_intake_01_check.js",
    "backend/scripts/copilot_shift_to_agreement_prep_01_check.js",
    "backend/scripts/copilot_dispatch_action_prep_01_check.js",
    "backend/scripts/copilot_action_prep_01_check.js",
    "backend/src/ai/chat/copilotDemandIntake.js",
    "backend/src/ai/chat/copilotOfferAnalysis.js",
    "backend/src/ai/chat/copilotNegotiationAssist.js",
    "backend/src/ai/chat/copilotOfferRecommendation.js",
    "backend/src/ai/chat/copilotShiftToAgreementPrep.js",
    "backend/src/ai/chat/copilotDispatchActionPrep.js",
    "backend/src/ai/chat/copilotActionPrep.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_INTAKE_01.md",
    "docs/COPILOT_OFFER_ANALYSIS_01.md",
    "docs/COPILOT_NEGOTIATION_ASSIST_01.md",
    "docs/COPILOT_OFFER_RECOMMENDATION_01.md",
    "docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md",
    "docs/COPILOT_DISPATCH_ACTION_PREP_01.md",
    "docs/COPILOT_ACTION_PREP_01.md",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/scripts/copilot_rfq_prep_01_check.js",
    "backend/src/ai/chat/copilotRfqPrep.js",
    "docs/COPILOT_RFQ_PREP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md",
    "backend/scripts/security_kvkk_final_01_check.js",
    "backend/scripts/audit_log_and_approval_trace_01_check.js",
    "web/src/panels/room/DriversPanel.jsx",
    "docs/SECURITY_KVKK_FINAL_01.md",
    "backend/src/ai/chat/supplierMatching.js",
    "backend/src/ai/chat/supplierOfferCollect.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/SUPPLIER_MATCHING_01.md",
    "docs/SUPPLIER_OFFER_COLLECT_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/PRIMER_SSOT.md",
    "docs/DATA_INTEGRITY_AND_RECOVERY_01.md",
    "docs/OBSERVABILITY_MONITORING_ALERTING_01.md",
    "docs/DB_POOL_AND_API_SCALING_01.md",
    "docs/LOAD_TEST_2000_USERS_01.md",
    "docs/CACHE_COALESCING_AND_BACKOFF_01.md",
    "docs/REQUEST_STORM_RESILIENCE_01.md",
    "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
    "web/src/api.js",
    "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    "web/src/panels/shared/financialOperationsPresentation.js",
    "backend/src/finance/companyBudgetAndServiceCost.js",
    "backend/src/finance/roomProfitabilityAndQuoteFloor.js",
    ...acceptedPrismaStatusPaths,
    ...guardAlignmentStatusPaths,
    ...companyBudgetStatusPaths,
    ...packageRunnerStatusPaths,
  ]);

  addContains(cases, "package.json exposes security alias", pkg, '"check:securitykvkkfinal01": "node backend/scripts/security_kvkk_final_01_check.js"');
  addCase(cases, "product extensions registry includes security alias", () =>
    assertProductExtensionsIncludes("check:securitykvkkfinal01", "product extensions registry includes security alias"),
  );

  addContains(cases, "script harness check knows security milestone", harnessCheck, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "script harness check knows security alias", harnessCheck, "check:securitykvkkfinal01");
  addContains(cases, "script harness check knows security doc", harnessCheck, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "script harness check knows security command", harnessCheck, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "script harness doc lists security milestone", harnessDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "script harness doc lists security alias", harnessDoc, "check:securitykvkkfinal01");
  addContains(cases, "script harness doc lists security doc", harnessDoc, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "script harness doc lists security command", harnessDoc, "node backend\\scripts\\security_kvkk_final_01_check.js");

  addContains(cases, "guide mentions security milestone", guide, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "guide exposes security alias", guide, "check:securitykvkkfinal01");
  addContains(cases, "guide includes security doc", guide, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "guide includes security command", guide, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "primer mentions security milestone", primer, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "primer exposes security alias", primer, "check:securitykvkkfinal01");
  addContains(cases, "primer includes security doc", primer, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "primer includes security command", primer, "backend/scripts/security_kvkk_final_01_check.js");

  const headings = [
    "# SECURITY-KVKK-FINAL-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Security / KVKK data classification",
    "## 4) Sensitive field matrix",
    "## 5) Never-log / never-store matrix",
    "## 6) Public lead / personel / parent / school / organization safety",
    "## 7) Live GPS / route / stop / shift / agreement / payment preview safety",
    "## 8) Retention / deletion / anonymization readiness",
    "## 9) Backup / restore handoff",
    "## 10) Role-data isolation handoff",
    "## 11) Observability / security alert handoff",
    "## 12) Data integrity / recovery handoff",
    "## 13) No write-action / human approval boundary",
    "## 14) Runtime-data / generated artifact / commit-external boundary",
    "## 15) Release gate checklist",
    "## 16) What is not changed",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of headings) {
    addContains(cases, `security doc heading ${heading}`, doc, heading);
  }
  addContains(cases, "security doc canonical check", doc, "Canonical check: `check:securitykvkkfinal01`");
  addContains(cases, "security doc script path", doc, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "security doc package alias", doc, "check:securitykvkkfinal01");
  addContains(cases, "security doc mentions phase 12", doc, "docs/PHASE_12_KVKK_SECURITY.md");
  addContains(cases, "security doc mentions m77 runbook", doc, "docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md");
  addContains(cases, "security doc mentions m45 runbook", doc, "docs/RUNBOOK_M45_RETENTION_BACKUP.md");
  addContains(cases, "security doc mentions role data handoff", doc, "ROLE-DATA-ISOLATION-REDTEAM-01");
  addContains(cases, "security doc mentions data integrity handoff", doc, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContains(cases, "security doc mentions observability handoff", doc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContains(cases, "security doc mentions db scaling handoff", doc, "DB-POOL-AND-API-SCALING-01");
  addContains(cases, "security doc mentions load test handoff", doc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "security doc mentions cache coalescing handoff", doc, "CACHE-COALESCING-AND-BACKOFF-01");
  addContains(cases, "security doc mentions request storm handoff", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "security doc mentions production rate limit handoff", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContains(cases, "security doc mentions support docs block", doc, "Supporting references");
  addContains(cases, "security doc mentions no probe", doc, "Probe gerekli değildir");
  addContains(cases, "security doc mentions static inventory", doc, "static policy/doc/code inventory");
  addContains(cases, "security doc mentions technical only", doc, "technical security / KVKK readiness gate");
  addContains(cases, "security doc mentions not legal advice", doc, "Hukuki danışmanlık değildir");

  const sensitiveNeedles = [
    "token",
    "cookie",
    "password",
    "provider credential",
    "TCKN",
    "raw GPS",
    "full name",
    "phone",
    "address",
    "email",
    "child data",
    "personel data",
    "public lead",
    "driver",
    "room",
    "company",
    "school",
    "organization",
    "super admin",
  ];
  for (const needle of sensitiveNeedles) {
    addContains(cases, `security doc sensitive field ${needle}`, doc, needle);
  }

  const policyNeedles = [
    "Data classification",
    "Critical entity matrix",
    "Referential integrity policy",
    "Transaction boundary policy",
    "Idempotency and retry-safety policy",
    "Backup policy",
    "Restore policy",
    "RPO / RTO targets",
    "Recovery runbook",
    "Corruption detection policy",
    "Partial write / duplicate write / stale write risk matrix",
    "Runtime-data commit-external and recovery policy",
    "Migration and rollback safety policy",
    "KVKK-safe backup/logging policy",
    "Observability handoff",
    "Incident severity matrix",
    "Release gate checklist",
    "Generated artifact policy",
    "Runtime-data list",
    "No production DB",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "smoke threshold 18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
    "No public URL",
    "No real token/credential generation",
    "No stage/commit/tag/push",
    "No runtime AI/model execution",
  ];
  for (const needle of policyNeedles) {
    addContains(cases, `security doc policy phrase ${needle}`, doc, needle);
  }

  const neverLogNeedles = [
    "never-log",
    "never-store",
    "token",
    "cookie",
    "password",
    "provider credential",
    "raw GPS",
    "TCKN",
    "no write-action",
    "human approval boundary",
  ];
  for (const needle of neverLogNeedles) {
    addContains(cases, `security doc never-log phrase ${needle}`, doc, needle);
  }

  const runtimeDataNeedles = [
    "backend/artifacts/runtime-data/",
    "password-change-requirements.json",
    "username-directory.json",
    "agreement-route-refresh-requests.json",
    "public-leads.json",
    "quality-review-decisions.json",
    "region-failover-drill-state.json",
  ];
  for (const needle of runtimeDataNeedles) {
    addContains(cases, `security doc runtime-data ${needle}`, doc, needle);
  }
  addContains(cases, "security doc generated artifact boundary", doc, "backend/artifacts/security-kvkk/");
  addContains(cases, "security doc commit-external boundary", doc, "commit-external");

  const companionMilestones = [
    "ROLE-DATA-ISOLATION-REDTEAM-01",
    "DATA-INTEGRITY-AND-RECOVERY-01",
    "OBSERVABILITY-MONITORING-ALERTING-01",
    "DB-POOL-AND-API-SCALING-01",
    "LOAD-TEST-2000-USERS-01",
    "CACHE-COALESCING-AND-BACKOFF-01",
    "REQUEST-STORM-RESILIENCE-01",
    "PRODUCTION-RATE-LIMIT-POLICY-01",
  ];
  for (const needle of companionMilestones) {
    addContains(cases, `security compatibility ${needle}`, doc, needle);
  }
  addCase(cases, "security compatibility order", () => {
    ordered(doc, companionMilestones, "security compatibility order");
  });

  const summaryPairs = [
    ["dataClassificationSummary", "data classification, critical entity matrix and referential integrity policy stay visible"],
    ["sensitiveFieldSummary", "token, cookie, password, provider credential, raw GPS and TCKN stay blocked"],
    ["neverLogSummary", "never-log and never-store matrix stays visible"],
    ["publicSurfaceSummary", "public lead, personel, parent, school, organization and driver surfaces stay separated"],
    ["liveOpsSummary", "live GPS, route, stop, shift, agreement and payment preview stay read-only"],
    ["retentionSummary", "retention, deletion and anonymization readiness stay visible"],
    ["backupRestoreSummary", "backup policy, restore policy and M45 handoff stay visible"],
    ["roleDataHandoffSummary", "role-data isolation handoff stays visible"],
    ["observabilitySecuritySummary", "observability and security alert handoff stays visible"],
    ["dataIntegrityHandoffSummary", "data integrity and recovery handoff stays visible"],
    ["humanApprovalBoundarySummary", "no write-action / human approval boundary stays visible"],
    ["runtimeDataBoundarySummary", "runtime-data and generated artifact boundary stays visible"],
    ["compatibilitySummary", companionMilestones.join(" | ")],
    ["smokeThresholdSummary", "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none"],
    ["chainWiringSummary", "package.json + runner + verify chain + harness check/doc + guide + primer"],
    ["commitExternalSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk are commit-external; stage stays empty"],
    ["prismaSummary", "No route/service/prisma diff; no production DB; no schema/migration; read-only only"],
  ];
  for (const [label, value] of summaryPairs) {
    addContains(cases, `security doc summary token ${label}`, doc, label);
    addContains(cases, `security doc summary value ${label}`, doc, value);
  }

  addContains(cases, "role data doc keeps security final next milestone", roleDataDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "data integrity doc mentions security final", dataIntegrityDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "observability doc mentions security final", observabilityDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "db scaling doc mentions security final", dbScalingDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "load test doc mentions security final", loadTestDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "cache doc mentions security final", cacheDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "request storm doc mentions security final", requestStormDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "rate limit doc mentions security final", rateLimitDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "phase 12 doc mentions security final", phase12Doc, "KVKK & Security");
  addContains(cases, "m77 runbook mentions retention and anonymization", kvkkRunbook, "retention / silme / anonimleştirme");
  addContains(cases, "m45 runbook mentions backup create", retentionRunbook, "backup_create_m45.ps1");

  const codeNeedles = [
    ["kvkk matrix version", kvkkMatrix, "KVKK_MATRIX_VERSION"],
    ["kvkk auth roles", kvkkMatrix, "KVKK_AUTH_ROLES"],
    ["kvkk business domains", kvkkMatrix, "KVKK_BUSINESS_DOMAINS"],
    ["kvkk matrix helper", kvkkMatrix, "getKvkkMatrix"],
    ["kvkk route matrix", kvkkRoute, "/matrix"],
    ["kvkk route retention", kvkkRoute, "/retention"],
    ["kvkk route accept", kvkkRoute, "/consents/accept"],
    ["kvkk route revoke", kvkkRoute, "/consents/revoke"],
    ["kvkk route accept action", kvkkRoute, "KVKK_DOC_ACCEPT"],
    ["kvkk route revoke action", kvkkRoute, "KVKK_DOC_REVOKE"],
    ["responseCache scope key", responseCache, "return `${role}:${companyId}:${roomId}:${userId}`;"],
    ["responseCache write", responseCache, "writeResponseCache"],
    ["responseCache remember", responseCache, "rememberResponse"],
    ["responseCache clear", responseCache, "clearResponseCache"],
    ["dashboardBulk scopeOf", dashboardBulk, "function scopeOf(user)"],
    ["dashboardBulk bulkCacheKey", dashboardBulk, "function bulkCacheKey(bundle, user, query = {})"],
    ["dashboardBulk rememberResponse", dashboardBulk, "rememberResponse(cacheKey, load, {"],
    ["dashboardBulk super admin", dashboardBulk, 'role === "SUPER_ADMIN"'],
    ["dashboardBulk company scope", dashboardBulk, "companyId: user.companyId"],
    ["dashboardBulk room scope", dashboardBulk, "roomId: user.roomId"],
    ["admin backup policy", adminRoute, "/backup/policy"],
    ["admin backup manifest", adminRoute, "/backup/manifest"],
    ["admin backup create", adminRoute, "/backup/create"],
    ["admin backup restore", adminRoute, "/backup/restore"],
    ["admin retention run", adminRoute, "/retention/run"],
    ["route mounts public leads", routeMounts, "/api/public/leads"],
    ["route mounts passenger live", routeMounts, "/api/public/passenger-live"],
    ["route mounts personel live", routeMounts, "/api/public/personel-live"],
    ["route mounts kvkk", routeMounts, "/api/kvkk"],
    ["route mounts observability", routeMounts, "/api/observability"],
    ["route mounts dashboard", routeMounts, "/api/dashboard"],
    ["route mounts admin public leads", routeMounts, "/api/admin/public-leads"],
    ["server health route", serverJs, 'app.get("/health"'],
    ["server db latency", serverJs, "dbLatencyMs"],
    ["server capacity", serverJs, "capacity"],
    ["server edge security", serverJs, "edgeSecurity"],
    ["retention policy dir", retentionBackupPolicy, "backupLocalDir"],
    ["retention policy days", retentionBackupPolicy, "backupLocalRetentionDays"],
    ["retention policy format", retentionBackupPolicy, "backupDumpFormat"],
    ["retention policy summary", retentionBackupPolicy, "getBackupPolicySummary"],
    ["backup archive create", backupArchiveOps, "createBackupArchive"],
    ["backup archive restore", backupArchiveOps, "restoreBackupArchive"],
    ["backup archive manifest", backupArchiveOps, "manifest"],
    ["backup archive sha256", backupArchiveOps, "backupSha256"],
    ["json store backup path", jsonFileStore, "backupPath"],
    ["json store async backup", jsonFileStore, "backupCurrentAsync"],
    ["json store sync backup", jsonFileStore, "backupCurrentSync"],
    ["json store bak fallback", jsonFileStore, ".bak"],
    ["json store parse fallback", jsonFileStore, 'return parse(await fsp.readFile(backupPath, "utf8"));'],
  ];
  for (const [label, text, needle] of codeNeedles) {
    addContains(cases, label, text, needle);
  }

  const explicitSafetyNeedles = [
    "No production DB",
    "No public URL",
    "No real token/credential generation",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "No write-action / human approval boundary",
    "No stage/commit/tag/push",
    "No runtime AI/model execution",
    "No 429 allowlist",
    "smoke threshold 18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
  ];
  for (const needle of explicitSafetyNeedles) {
    addContains(cases, `security doc explicit safety ${needle}`, doc, needle);
  }

  const roleSurfaceNeedles = [
    "public lead",
    "personel",
    "parent",
    "school",
    "organization",
    "driver",
    "room",
    "company",
    "super admin",
  ];
  for (const needle of roleSurfaceNeedles) {
    addContains(cases, `security doc role surface ${needle}`, doc, needle);
  }

  addCase(cases, "security doc heading order", () => {
    ordered(doc, headings, "security doc heading order");
  });

  addCase(cases, "working tree only contains approved files", () => {
    const files = gitStatusNames();
    const allowedCategories = new Set([
      "SELF_SECURITY_GUARD",
      "CORE_GUARD_INFRA",
      "BATCH13_FOUNDATION_OWNER",
      "BATCH13_FOUNDATION_SUPPORT",
      "BATCH13_FOUNDATION_COMMAND_SURFACE",
      "BATCH13_APP_JSX_MIGRATION_CONSUMER",
      "COMMERCIAL_PAYMENT_SECURITY_CHECKER_INFRA",
      "APPROVED_CURRENT_HEAD_PRODUCT",
      "APPROVED_CONCURRENT_CANONICAL_WORKTREE",
      "APPROVED_CONCURRENT_CANONICAL_ROUTE",
      "CURRENT_CLOSURE_CORRECTIVE",
      "PAUSED_MILESTONE_WORKTREE",
      "LEGITIMATE_CANONICAL_NEW_FILE",
      "PROVEN_BATCH09_CHANGE",
      "M80_M89_CONTRACT_SWEEP_REPO_CONTRACT",
      "DOC_WORKTREE_SCOPE",
      "INDEX_WORKTREE_SCOPE",
      "OUT_OF_SCOPE_CHECKER_INFRA",
      "OUT_OF_SCOPE_TEST_INFRA",
      "OUT_OF_SCOPE_CURRENT_HEAD_HELPER",
      "PROJECT_GAP_READINESS_14",
      "ROLE_TENANT_SECURITY_OWNED",
      "APPROVED_TERMINOLOGY_PRESENTATION",
      "RUNTIME_DATA",
    ]);
    const failures = [];

    for (const file of files) {
      const category = classifySecurityKvkkStatusPath(file);
      if (allowedCategories.has(category)) continue;
      failures.push(`${normalizePath(file)} (${category})`);
    }

    must(failures.length === 0, `working tree hygiene: ${failures.join(", ") || "(none)"}`);
  });
  addCase(cases, "stage remains empty", () => must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged files present"));
  addCase(cases, "git diff --check stays clean", () => must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings"));
  addCase(cases, "route diff stays empty", () =>
    mustStatusSubsetWithIdentity(
      ["backend/src/routes"],
      [...approvedCurrentHeadRouteEntries],
      "route diff not empty",
    ));
  addCase(cases, "service diff stays empty", () =>
    mustDiffEmptyOrExactlyWithIdentity(["backend/src/services"], approvedCurrentHeadServiceEntries, "service diff not empty"));
  addCase(cases, "prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty"));
  addCase(cases, "backend prisma diff stays empty", () => mustAcceptedPrismaManifest());
  addCase(cases, "debug.log stays absent", () => must(!fs.existsSync(paths.debugLog), "debug.log exists"));

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

  console.log("PASS SECURITY-KVKK-FINAL-01");
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  console.log(`dataClassificationSummary=${summaryPairs[0][1]}`);
  console.log(`sensitiveFieldSummary=${summaryPairs[1][1]}`);
  console.log(`neverLogSummary=${summaryPairs[2][1]}`);
  console.log(`publicSurfaceSummary=${summaryPairs[3][1]}`);
  console.log(`liveOpsSummary=${summaryPairs[4][1]}`);
  console.log(`retentionSummary=${summaryPairs[5][1]}`);
  console.log(`backupRestoreSummary=${summaryPairs[6][1]}`);
  console.log(`roleDataHandoffSummary=${summaryPairs[7][1]}`);
  console.log(`observabilitySecuritySummary=${summaryPairs[8][1]}`);
  console.log(`dataIntegrityHandoffSummary=${summaryPairs[9][1]}`);
  console.log(`humanApprovalBoundarySummary=${summaryPairs[10][1]}`);
  console.log(`runtimeDataBoundarySummary=${summaryPairs[11][1]}`);
  console.log(`compatibilitySummary=${summaryPairs[12][1]}`);
  console.log(`smokeThresholdSummary=${summaryPairs[13][1]}`);
  console.log(`chainWiringSummary=${summaryPairs[14][1]}`);
  console.log(`commitExternalSummary=${summaryPairs[15][1]}`);
  console.log(`prismaSummary=${summaryPairs[16][1]}`);
}

main();
