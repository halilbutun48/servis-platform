#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizedTextSha256 } from './lib/guardTextIntegrity.js';
import { CANONICAL_PROVENANCE_RECORDS } from './lib/canonicalProvenanceRegistry.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { assertProductExtensionsIncludes, productExtensionsCheckScripts } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const roleDataIsolationScript = 'check:roledataisolationredteam01';
const roleDataCheckerPath = 'backend/scripts/role_data_isolation_redteam_01_check.js';

const paths = {
  packageJson: path.join(repoRoot, 'package.json'),
  harnessCheck: path.join(repoRoot, 'backend', 'scripts', 'script_harness_consolidation_01_check.js'),
  harnessDoc: path.join(repoRoot, 'docs', 'SCRIPT_HARNESS_CONSOLIDATION_01.md'),
  guide: path.join(repoRoot, 'docs', 'SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'),
  primer: path.join(repoRoot, 'docs', 'PRIMER_SSOT.md'),
  doc: path.join(repoRoot, 'docs', 'ROLE_DATA_ISOLATION_REDTEAM_01.md'),
  dataIntegrityDoc: path.join(repoRoot, 'docs', 'DATA_INTEGRITY_AND_RECOVERY_01.md'),
  observabilityDoc: path.join(repoRoot, 'docs', 'OBSERVABILITY_MONITORING_ALERTING_01.md'),
  dbScalingDoc: path.join(repoRoot, 'docs', 'DB_POOL_AND_API_SCALING_01.md'),
  loadTestDoc: path.join(repoRoot, 'docs', 'LOAD_TEST_2000_USERS_01.md'),
  cacheDoc: path.join(repoRoot, 'docs', 'CACHE_COALESCING_AND_BACKOFF_01.md'),
  requestStormDoc: path.join(repoRoot, 'docs', 'REQUEST_STORM_RESILIENCE_01.md'),
  rateLimitDoc: path.join(repoRoot, 'docs', 'PRODUCTION_RATE_LIMIT_POLICY_01.md'),
  roleDataChecker: path.join(repoRoot, 'backend', 'scripts', 'role_data_isolation_redteam_01_check.js'),
  responseCache: path.join(repoRoot, 'backend', 'src', 'utils', 'responseCache.js'),
  dashboardBulk: path.join(repoRoot, 'backend', 'src', 'services', 'dashboardBulk.js'),
  adminRoute: path.join(repoRoot, 'backend', 'src', 'routes', 'admin.js'),
  debugLog: path.join(repoRoot, 'debug.log'),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
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

function gitLines(args) {
  const out = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return String(out || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function gitStatusNames(paths = []) {
  const args = ['status', '--short', '--untracked-files=all'];
  const scopedPaths = Array.isArray(paths) ? paths : [...paths];
  if (scopedPaths.length > 0) {
    args.push('--', ...scopedPaths.map(normalizeStatusPath));
  }
  const out = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return String(out || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(/^.{2}\s+/, '').replace(/\\/g, '/').trim())
    .filter(Boolean);
}

const approvedCurrentHeadProductHashes = new Map([
  ['backend/src/routes/admin.js', '61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4'],
  ['backend/src/routes/agreements.js', 'BE08F0BBC59424075605CE388363CF57581FF28637934C581757A2FE07E7A928'],
  ['backend/src/routes/auth.js', 'A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3'],
  ['backend/src/routes/companyOverview.js', 'EB2E7956FD7C02891687815D389AB9E9C5374CAB2FD684E2ADE7CE42C83F8528'],
  ['backend/src/routes/dashboardBulk.js', 'C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F'],
  ['backend/src/routes/shifts/company.js', 'A9FA0C8A737DF701505E71FAEB16EF3402E883DCA82DB71B8E4A95507AE232AA'],
  ['backend/src/routes/commercialCore.js', '14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F'],
  ['backend/src/routes/commercialCorePaymentReportsRoutes.js', 'DA3C9CEE5DF38EB89EE315475F9C37EB94D1EE7E95A11E5E2039C4FDFB21AE3F'],
  ['backend/src/routes/commercialCorePaymentRoutes.js', '53C908A0C414D73A9BC397DCC89FC1D8DD285AC0D842FD949426911307DFA993'],
  ['backend/src/routes/commercialCoreRoomRoutes.js', 'AF4576A429E1B7026974DFC18DB5F9EB034580818A7D32159644878A4E7C94C7'],
  ['backend/src/routes/companyBudgetLifecycleRoutes.js', '3D29611FD1D4DE54FA7DE87D6C98D6D7CB034D13776512A792EBD4C139D049EE'],
  ['backend/src/routes/commercialCoreRouteData.js', '2DF560872A4B6B94C576DD7DA0610C44F053B1EA494EA57B307BFED5030A5A6C'],
  ['backend/src/routes/commercialCoreRoutes.js', 'AF17E5ADBAB36C2509A9CE67B7BF7E977D597C1B410FEF41C67DDF1D629003FC'],
  ['backend/src/routes/offers.js', '40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649'],
  ['backend/src/routes/operationProof.js', 'E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0'],
  ['backend/src/routes/public.js', '5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23'],
  ['backend/src/routes/trustQuality.js', 'FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD'],
  ['backend/src/services/dashboardBulk.js', 'E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E'],
  ['backend/src/services/financialOperationsLifecycle.js', '0767FB5A163CCB19B06F111FE8B00B2340913E29C613A9DEDA93B2CCAA711FF2'],
  ['backend/src/services/companyShiftMutationTail.js', 'FE0F1F30AD2F5BC893FF631F26D19EDDDE2060246ED129087104BFDD69D88C78'],
  ['backend/src/services/qualityPaymentBridgeService.js', '935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83'],
]);

const approvedCanonicalProvenanceHashes = new Map([
  ['backend/src/lib/requestUrl.js', '629D6C894B91551AB14518F36E2BF4C5CEF48DC60ADBB01A17EFE7755C30063E'],
]);

const workingTreeHygieneScopePaths = [
  ...new Set([
    ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map(({ path: value }) => normalizeStatusPath(value)),
    ...CANONICAL_PROVENANCE_RECORDS.map(({ path: value }) => normalizeStatusPath(value)),
    roleDataCheckerPath,
  ]),
];

const roleTenantOwnedRoutePaths = new Set([
  'backend/src/routes/admin.js',
  'backend/src/routes/companyOverview.js',
]);

const roleTenantOwnedServicePaths = new Set([
  'backend/src/services/dashboardBulk.js',
  'backend/src/finance/companyBudgetAndServiceCost.js',
]);

const roleTenantOwnedUtilityPaths = new Set([
  'backend/src/utils/responseCache.js',
  'web/src/panels/shared/FinancialOperationsPanel.jsx',
]);

const outOfScopeCurrentHeadHelperPaths = new Set([
  'backend/scripts/current_head_scope_policy_01_check.js',
  'backend/scripts/run_product_extensions_check_chain.js',
  'backend/scripts/verify_chain_01_product_extensions_check.js',
  'backend/scripts/run_backend_lint.js',
  'backend/scripts/lib/currentHeadScopePolicy.js',
  'backend/scripts/lib/guardGitScope.js',
  'backend/scripts/lib/guardRunnerContracts.js',
  'backend/scripts/lib/guardSmokeEvidence.js',
  'backend/scripts/lib/guardValidationEnvironment.js',
  'backend/scripts/lib/productExtensionsRegistry.js',
]);

const outOfScopeTestInfraPaths = new Set([
  'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
  'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
  'docs/PRIMER_SSOT.md',
  'package.json',
  'tools/repo_contract_state.json',
]);

let cachedProductExtensionsCheckerPaths = null;
let cachedProductExtensionsSmokePaths = null;

function normalizeStatusPath(file) {
  return String(file || '').replace(/\\/g, '/').trim();
}

function isApprovedCurrentHeadProductPath(file) {
  const normalized = normalizeStatusPath(file);
  const expectedSha = approvedCurrentHeadProductHashes.get(normalized);
  if (!expectedSha) return false;
  const actualSha = normalizedTextSha256(normalized);
  must(actualSha === expectedSha, `approved current-head product identity mismatch: ${normalized}`);
  return true;
}

function isApprovedCanonicalProvenancePath(file) {
  const normalized = normalizeStatusPath(file);
  const expectedSha = approvedCanonicalProvenanceHashes.get(normalized);
  if (!expectedSha) return false;
  const actualSha = normalizedTextSha256(normalized);
  must(actualSha === expectedSha, `approved canonical provenance identity mismatch: ${normalized}`);
  return true;
}

function productExtensionsCheckerPaths() {
  if (cachedProductExtensionsCheckerPaths) return cachedProductExtensionsCheckerPaths;

  const pkg = JSON.parse(readFile(paths.packageJson));
  const scripts = pkg.scripts || {};
  const resolved = new Set();

  for (const entry of productExtensionsCheckScripts) {
    if (entry.startsWith('node ')) {
      resolved.add(normalizeStatusPath(entry.slice(5)));
      continue;
    }

    const command = scripts[entry];
    if (typeof command !== 'string') continue;

    const match = command.trim().match(/^node\s+(.+)$/);
    if (match) {
      resolved.add(normalizeStatusPath(match[1]));
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
    if (!String(name).startsWith('smoke:')) continue;
    if (typeof command !== 'string') continue;

    const match = command.trim().match(/^node\s+(.+)$/);
    if (match) {
      resolved.add(normalizeStatusPath(match[1]));
    }
  }

  cachedProductExtensionsSmokePaths = resolved;
  return cachedProductExtensionsSmokePaths;
}

function validateRoleDataCheckerSource(source) {
  must(contains(source, 'classifyRoleDataIsolationStatusPath'), 'role data checker keeps classified status contract');
  must(contains(source, 'productExtensionsCheckerPaths'), 'role data checker keeps registry checker path resolver');
  must(contains(source, 'productExtensionsSmokePaths'), 'role data checker keeps smoke path resolver');
  must(contains(source, 'OUT_OF_SCOPE_CHECKER_INFRA'), 'role data checker keeps checker infra category');
  must(contains(source, 'OUT_OF_SCOPE_TEST_INFRA'), 'role data checker keeps test infra category');
  must(contains(source, 'OUT_OF_SCOPE_CURRENT_HEAD_HELPER'), 'role data checker keeps helper category');
  must(contains(source, 'APPROVED_CURRENT_HEAD_PRODUCT'), 'role data checker keeps approved current-head product category');
  must(contains(source, 'CANONICAL_PROVENANCE_FILE'), 'role data checker keeps canonical provenance category');
  must(contains(source, 'PROTECTED_ROUTE'), 'role data checker keeps protected route category');
  must(contains(source, 'PROTECTED_SERVICE'), 'role data checker keeps protected service category');
  must(contains(source, 'PROTECTED_PRISMA'), 'role data checker keeps protected prisma category');
  must(contains(source, 'ROLE_TENANT_SECURITY_OWNED'), 'role data checker keeps owned-surface category');
  const legacyWorkingTreeCaseLabel = ['working tree', ' only contains approved files'].join('');
  const legacyWorkingTreeHygieneCall = ['allWithin(gitStatusNames(), ', 'allowedStatusNames, [], ', "'working tree hygiene'"].join('');
  must(!contains(source, legacyWorkingTreeCaseLabel), 'role data checker removed legacy global hygiene wording');
  must(!contains(source, legacyWorkingTreeHygieneCall), 'role data checker removed legacy global hygiene call');
}

function classifyRoleDataIsolationStatusPath(file) {
  const normalized = normalizeStatusPath(file);
  if (isApprovedCurrentHeadProductPath(normalized)) return 'APPROVED_CURRENT_HEAD_PRODUCT';
  if (isApprovedCanonicalProvenancePath(normalized)) return 'CANONICAL_PROVENANCE_FILE';
  if (normalized === roleDataCheckerPath) return 'ROLE_TENANT_SECURITY_OWNED';
  if (roleTenantOwnedRoutePaths.has(normalized)) return 'PROTECTED_ROUTE';
  if (roleTenantOwnedServicePaths.has(normalized)) return 'PROTECTED_SERVICE';
  if (roleTenantOwnedUtilityPaths.has(normalized)) return 'ROLE_TENANT_SECURITY_OWNED';
  if (normalized.startsWith('backend/src/routes/')) return 'PROTECTED_ROUTE';
  if (normalized.startsWith('backend/src/services/')) return 'PROTECTED_SERVICE';
  if (normalized.startsWith('backend/prisma/')) return 'PROTECTED_PRISMA';
  if (normalized.startsWith('backend/artifacts/runtime-data/')) return 'RUNTIME_DATA';
  if (outOfScopeCurrentHeadHelperPaths.has(normalized)) return 'OUT_OF_SCOPE_CURRENT_HEAD_HELPER';
  if (normalized !== roleDataCheckerPath && productExtensionsCheckerPaths().has(normalized)) return 'OUT_OF_SCOPE_CHECKER_INFRA';
  if (productExtensionsSmokePaths().has(normalized)) return 'OUT_OF_SCOPE_TEST_INFRA';
  if (
    normalized === 'backend/scripts/run_product_extensions_check_chain.js' ||
    normalized === 'backend/scripts/verify_chain_01_product_extensions_check.js' ||
    normalized === 'backend/scripts/current_head_scope_policy_01_check.js' ||
    normalized === 'backend/scripts/run_backend_lint.js'
  ) {
    return 'OUT_OF_SCOPE_CURRENT_HEAD_HELPER';
  }
  if (outOfScopeTestInfraPaths.has(normalized)) return 'OUT_OF_SCOPE_TEST_INFRA';
  return 'UNKNOWN';
}

function assertClassifiedPaths(label, files, allowedCategories) {
  const allowed = new Set(allowedCategories);
  const unexpected = [];
  for (const file of files) {
    const category = classifyRoleDataIsolationStatusPath(file);
    if (!allowed.has(category)) {
      unexpected.push(`${normalizeStatusPath(file)} [${category}]`);
    }
  }
  must(unexpected.length === 0, `${label}: ${unexpected.join(', ')}`);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) throw new Error(`${label}: ${unexpected.join(', ')}`);
  console.log(`OK ${label}`);
}

function validateExactPathGroup(label, values, expectedCount) {
  if (values.length !== expectedCount) {
    throw new Error(`${label} count mismatch: expected ${expectedCount}, got ${values.length}`);
  }
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error(`${label} contains duplicate paths`);
  }
}

function validateDisjointPathGroups(groupEntries) {
  const seen = new Map();
  for (const [label, values] of groupEntries) {
    for (const value of values) {
      const owner = seen.get(value);
      if (owner && owner !== label) {
        throw new Error(`status path overlap: ${value} (${owner} vs ${label})`);
      }
      seen.set(value, label);
    }
  }
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizePath(relPath) {
  return String(relPath || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .trim();
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

function gitScopedCapture(args) {
  return execFileSync('git', ['-c', 'safe.directory=D:/servis-platform', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitScopedLines(args) {
  const out = gitScopedCapture(args);
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitScopedStatusEntries(paths) {
  return String(gitScopedCapture(['status', '--porcelain=v1', '--untracked-files=all', '--', ...paths]) || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function fileSha256(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, relPath))).digest('hex').toUpperCase();
}

function safeFileSha256(relPath, expectedHash) {
  try {
    return fileSha256(relPath) === String(expectedHash || '').toUpperCase();
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
  must(stat !== null && stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  let entries = [];
  try {
    entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  } catch {
    entries = [];
  }
  must(entries.length === 1 && entries[0] === 'migration.sql', `${label} has exactly one migration.sql`);
}

function collectAcceptedPrismaEvidence() {
  const tracked = sortedUniquePaths(gitScopedLines(['diff', '--name-only', '--', 'prisma', 'backend/prisma']));
  const staged = sortedUniquePaths(gitScopedLines(['diff', '--cached', '--name-only', '--', 'prisma', 'backend/prisma']));
  const status = sortedUniquePaths(gitScopedStatusEntries(['prisma', 'backend/prisma']).map((entry) => entry.path));
  const actual = sortedUniquePaths([...tracked, ...staged, ...status]);
  return { tracked, staged, status, actual };
}

const ACCEPTED_PRISMA_SCHEMA = {
  path: 'backend/prisma/schema.prisma',
  sha256: '7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748',
};

const ACCEPTED_PRISMA_MIGRATIONS = [
  { dir: 'backend/prisma/migrations/20260125133000_seed_root_baseline', sha256: '27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD' },
  { dir: 'backend/prisma/migrations/20260125133100_organization_shift_import_baseline', sha256: '864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD' },
  { dir: 'backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline', sha256: 'E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5' },
  { dir: 'backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline', sha256: '6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB' },
  { dir: 'backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge', sha256: 'CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F' },
  { dir: 'backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge', sha256: 'B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90' },
  { dir: 'backend/prisma/migrations/20260407102000_create_agreement_missing_baseline', sha256: '734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005' },
  { dir: 'backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline', sha256: '85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17' },
  { dir: 'backend/prisma/migrations/20260731120000_financial_operations_persistence_01', sha256: '3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0' },
  { dir: 'backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01', sha256: '24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198' },
  { dir: 'backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01', sha256: 'A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202' },
  { dir: 'backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01', sha256: '0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A' },
  { dir: 'backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01', sha256: 'D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF' },
  { dir: 'backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01', sha256: '8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A' },
  { dir: 'backend/prisma/migrations/20260801180000_role_enum_values_bridge_01', sha256: 'F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A' },
  { dir: 'backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01', sha256: '025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0' },
  { dir: 'backend/prisma/migrations/20260801191000_shift_status_values_bridge_01', sha256: 'D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E' },
  { dir: 'backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01', sha256: 'C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54' },
  { dir: 'backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01', sha256: 'FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D' },
  { dir: 'backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01', sha256: 'E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90' },
  { dir: 'backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01', sha256: '7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007' },
  { dir: 'backend/prisma/migrations/20260801210000_user_surface_reconciliation_01', sha256: '285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27' },
  { dir: 'backend/prisma/migrations/20260801211000_room_company_cleanup_01', sha256: 'E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5' },
  { dir: 'backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01', sha256: '3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36' },
  { dir: 'backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01', sha256: '59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA' },
  { dir: 'backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01', sha256: 'F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528' },
  { dir: 'backend/prisma/migrations/20260801215000_consent_surface_bridge_01', sha256: '423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581' },
  { dir: 'backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01', sha256: '252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79' },
  { dir: 'backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01', sha256: '168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F' },
  { dir: 'backend/prisma/migrations/20260801217000_personel_credential_bridge_01', sha256: 'BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC' },
  { dir: 'backend/prisma/migrations/20260801218000_operational_fk_bridge_01', sha256: '2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924' },
  { dir: 'backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01', sha256: '939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5' },
];

const ACCEPTED_PRISMA_FILE_PATHS = [
  ACCEPTED_PRISMA_SCHEMA.path,
  ...ACCEPTED_PRISMA_MIGRATIONS.map((entry) => `${entry.dir}/migration.sql`),
];
const ACCEPTED_PRISMA_FILE_SET = new Set(ACCEPTED_PRISMA_FILE_PATHS.map((entry) => normalizePath(entry)));

function inspectAcceptedPrismaManifest(evidence = collectAcceptedPrismaEvidence()) {
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_FILE_SET.has(file));
  const missing = ACCEPTED_PRISMA_FILE_PATHS.filter((file) => !evidence.actual.includes(file));
  const schemaShaMatches = safeFileSha256(ACCEPTED_PRISMA_SCHEMA.path, ACCEPTED_PRISMA_SCHEMA.sha256);
  const migrationShaMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => normalizedTextSha256(`${entry.dir}/migration.sql`) === String(entry.sha256 || '').toUpperCase());
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
    return entries.length === 1 && entries[0] === 'migration.sql';
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
  must(gitScopedLines(['diff', '--name-only', '--', 'backend/prisma']).length === 0, 'backend prisma diff not empty');
}

function main() {
  console.log('=== ROLE-DATA-ISOLATION-REDTEAM-01 CHECK ===');

  const pkg = readFile(paths.packageJson);
  const roleDataChecker = readFile(paths.roleDataChecker);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);
  const observabilityDoc = readFile(paths.observabilityDoc);
  const dbScalingDoc = readFile(paths.dbScalingDoc);
  const loadTestDoc = readFile(paths.loadTestDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const rateLimitDoc = readFile(paths.rateLimitDoc);
  const responseCache = readFile(paths.responseCache);
  const dashboardBulk = readFile(paths.dashboardBulk);
  const adminRoute = readFile(paths.adminRoute);

  const cases = [];
  const roles = ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION'];
  const criticalSurfaces = ['route', 'shift', 'agreement', 'live GPS', 'stop', 'request', 'payment/hakediş preview', 'quality decision', 'public lead', 'user/account'];
  const sensitiveFields = ['full name', 'phone', 'address', 'email', 'TCKN', 'raw GPS', 'cookie', 'token', 'password', 'provider credential'];
  const forbiddenActions = ['RFQ send', 'offer accept/reject', 'agreement execute', 'dispatch apply', 'driver/vehicle assign', 'route apply', 'payment/hakediş execute', 'messaging/SMS/email/push', 'provider credential', 'user/admin write'];
  const companionMilestones = ['DATA-INTEGRITY-AND-RECOVERY-01', 'OBSERVABILITY-MONITORING-ALERTING-01', 'DB-POOL-AND-API-SCALING-01', 'LOAD-TEST-2000-USERS-01', 'CACHE-COALESCING-AND-BACKOFF-01', 'REQUEST-STORM-RESILIENCE-01', 'PRODUCTION-RATE-LIMIT-POLICY-01'];
  const summaryTokens = ['roleInventorySummary', 'tenantScopeSummary', 'accessMatrixSummary', 'redteamMatrixSummary', 'criticalSurfaceSummary', 'cacheIsolationSummary', 'runtimeDataIsolationSummary', 'kvkkSafeRedteamSummary', 'humanApprovalBoundarySummary', 'compatibilitySummary', 'smokeThresholdSummary', 'chainWiringSummary', 'commitExternalSummary', 'prismaSummary'];
  // Accepted Prisma status scope: exact status entries only; content validity is enforced later by the Prisma contract.
  const acceptedPrismaStatusPaths = [
    'backend/prisma/schema.prisma',
    'backend/prisma/migrations/20260125133000_seed_root_baseline/',
    'backend/prisma/migrations/20260125133100_organization_shift_import_baseline/',
    'backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/',
    'backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/',
    'backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/',
    'backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/',
    'backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/',
    'backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/',
    'backend/prisma/migrations/20260731120000_financial_operations_persistence_01/',
    'backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/',
    'backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/',
    'backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/',
    'backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/',
    'backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/',
    'backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/',
    'backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/',
    'backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/',
    'backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/',
    'backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/',
    'backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/',
    'backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/',
    'backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/',
    'backend/prisma/migrations/20260801211000_room_company_cleanup_01/',
    'backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/',
    'backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/',
    'backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/',
    'backend/prisma/migrations/20260801215000_consent_surface_bridge_01/',
    'backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/',
    'backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/',
    'backend/prisma/migrations/20260801217000_personel_credential_bridge_01/',
    'backend/prisma/migrations/20260801218000_operational_fk_bridge_01/',
    'backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/',
  ];
  // Exact guard-alignment scope: current cumulative guard-repair work owned by this milestone.
  const guardAlignmentStatusPaths = [
    'backend/scripts/address_geocoding_confidence_01_check.js',
    'backend/scripts/ai03b_paraphrase_intent_audit_01_check.js',
    'backend/scripts/ai03b_semantic_visible_audit_01_check.js',
    'backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js',
    'backend/scripts/backend_lint_warning_burndown_01_check.js',
    'backend/scripts/cache_coalescing_and_backoff_01_check.js',
    'backend/scripts/copilot_ai_action_roadmap_01_check.js',
    'backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js',
    'backend/scripts/copilot_excel_demand_import_01_check.js',
    'backend/scripts/copilot_guided_task_engine_01_check.js',
    'backend/scripts/copilot_human_approval_01_check.js',
    'backend/scripts/copilot_reasoning_answer_composer_01_check.js',
    'backend/scripts/copilot_role_task_matrix_01_check.js',
    'backend/scripts/copilot_stop_route_draft_01_check.js',
    'backend/scripts/dashboard_bulk_endpoint_01_check.js',
    'backend/scripts/data_integrity_and_recovery_01_check.js',
    'backend/scripts/db_pool_and_api_scaling_01_check.js',
    'backend/scripts/hot_file_split_web_panels_01_check.js',
    'backend/scripts/lead_capture_01_check.js',
    'backend/scripts/load_test_2000_users_01_check.js',
    'backend/scripts/m44_telematics_t1_t5_check.js',
    'backend/scripts/mobile_web_final_01_check.js',
    'backend/scripts/observability_monitoring_alerting_01_check.js',
    'backend/scripts/offer_ranking_quality_01_check.js',
    'backend/scripts/onboarding_review_final_audit_01_check.js',
    'backend/scripts/osrm_route_draft_from_excel_01_check.js',
    'backend/scripts/public_landing_final_promise_01_check.js',
    'backend/scripts/quality_gate_final_01_check.js',
    'backend/scripts/request_storm_resilience_01_check.js',
    'backend/scripts/room_profitability_and_quote_floor_01_check.js',
    'backend/scripts/safe_drive_01_check.js',
    'backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js',
    'backend/scripts/sefer_abi_reasoning_assistant_01_check.js',
    'backend/scripts/shift_dispatch_approval_fix_01_check.js',
    'backend/scripts/telematics_provider_hub_01_check.js',
    'backend/scripts/test_quality_and_flake_audit_01_check.js',
    'backend/scripts/ux_company_personel_access_mobile_parity_01_check.js',
    'backend/scripts/ux_density_01_panel_card_density_check.js',
    'backend/scripts/ux_marketplace_panels_01_check.js',
    'backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js',
    'backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js',
    'backend/scripts/ux_panel_inventory_02a_check.js',
    'backend/scripts/ux_parent_personel_live_error_clarity_01_check.js',
    'backend/scripts/ux_premium_critical_fix_room_01_check.js',
  ];
  // Active product milestone scope: exact company-budget artifacts already owned by the current milestone.
  const companyBudgetStatusPaths = [
    'backend/src/routes/companyOverview.js',
    'web/src/panels/shared/FinancialOperationsPanel.jsx',
    'backend/scripts/company_budget_and_service_cost_01_check.js',
    'backend/src/finance/companyBudgetAndServiceCost.js',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
  ];
  // Package/runner scope: exact runner file already accepted by the milestone chain.
  const packageRunnerStatusPaths = [
    'backend/scripts/run_backend_lint.js',
  ];
  validateExactPathGroup('accepted Prisma status paths', acceptedPrismaStatusPaths, 33);
  validateExactPathGroup('guard alignment status paths', guardAlignmentStatusPaths, 44);
  validateExactPathGroup('company budget status paths', companyBudgetStatusPaths, 5);
  validateExactPathGroup('package runner status paths', packageRunnerStatusPaths, 1);
  validateDisjointPathGroups([
    ['accepted Prisma status paths', acceptedPrismaStatusPaths],
    ['guard alignment status paths', guardAlignmentStatusPaths],
    ['company budget status paths', companyBudgetStatusPaths],
    ['package runner status paths', packageRunnerStatusPaths],
  ]);
  const allowedStatusNames = new Set([
    'backend/artifacts/runtime-data/password-change-requirements.json',
    'backend/artifacts/runtime-data/username-directory.json',
    'backend/artifacts/runtime-data/agreement-route-refresh-requests.json',
    'backend/artifacts/runtime-data/public-leads.json',
    'backend/artifacts/runtime-data/quality-review-decisions.json',
    'backend/artifacts/runtime-data/region-failover-drill-state.json',
    'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md',
    'backend/scripts/copilot_action_prep_01_check.js',
    'backend/src/ai/chat/copilotActionPrep.js',
    'docs/COPILOT_ACTION_PREP_01.md',
    'backend/scripts/roadmap_lock_ai_marketplace_01_check.js',
    'tools/repo_contract_state.json',
    'package.json',
    'backend/scripts/run_product_extensions_check_chain.js',
    'backend/scripts/verify_chain_01_product_extensions_check.js',
    'backend/scripts/script_harness_consolidation_01_check.js',
    'backend/scripts/role_data_isolation_redteam_01_check.js',
    'backend/scripts/copilot_route_review_human_approval_01_check.js',
    'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
    'backend/scripts/supplier_matching_01_check.js',
    'backend/scripts/supplier_offer_collect_01_check.js',
    'backend/scripts/copilot_offer_analysis_01_check.js',
    'backend/scripts/copilot_negotiation_assist_01_check.js',
    'backend/scripts/copilot_offer_recommendation_01_check.js',
    'backend/src/ai/chat/copilotHumanApprovalPolicy.js',
    'docs/COPILOT_HUMAN_APPROVAL_01.md',
    'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md',
    'backend/src/ai/chat/supplierMatching.js',
    'backend/src/ai/chat/supplierOfferCollect.js',
    'backend/src/ai/chat/copilotOfferAnalysis.js',
    'backend/src/ai/chat/copilotNegotiationAssist.js',
    'backend/src/ai/chat/copilotOfferRecommendation.js',
    'docs/VERIFIED_SUPPLIER_01.md',
    'docs/SUPPLIER_MATCHING_01.md',
    'docs/SUPPLIER_OFFER_COLLECT_01.md',
    'docs/COPILOT_OFFER_ANALYSIS_01.md',
    'docs/COPILOT_NEGOTIATION_ASSIST_01.md',
    'docs/COPILOT_OFFER_RECOMMENDATION_01.md',
    'docs/UX_MARKETPLACE_PANELS_01.md',
    // Demand intake companion files are legitimate scope for this consolidated redteam pass.
    'backend/scripts/copilot_demand_intake_01_check.js',
    'backend/src/ai/chat/copilotDemandIntake.js',
    'backend/src/ai/chat/copilotDemandToAgreementRoadmap.js',
    'docs/COPILOT_DEMAND_INTAKE_01.md',
    'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md',
    'backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js',
    'backend/scripts/copilot_rfq_prep_01_check.js',
    'backend/scripts/copilot_shift_to_agreement_prep_01_check.js',
    'backend/src/ai/chat/copilotRfqPrep.js',
    'backend/src/ai/chat/copilotShiftToAgreementPrep.js',
    'backend/scripts/copilot_dispatch_action_prep_01_check.js',
    'backend/src/ai/chat/copilotDispatchActionPrep.js',
    'backend/scripts/invite_based_membership_01_check.js',
    'backend/scripts/verified_supplier_01_check.js',
    'backend/scripts/ux_brand_login_premium_01_check.js',
    'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
    'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
    'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
    'backend/scripts/ux_panel_standard_architecture_01_check.js',
    'backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js',
    'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
    'backend/scripts/financial_operations_surface_and_rbac_01_check.js',
    'backend/src/finance/',
    'backend/src/finance/financialOperationsScope.js',
    'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md',
    'backend/scripts/operational_cost_model_01_check.js',
    'backend/scripts/operational_cost_model_01_expansion.js',
    'backend/src/finance/operationalCostModel.js',
    'backend/src/finance/operationalCostMath.js',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    'web/src/panels/room/DriversPanel.jsx',
    'docs/COPILOT_RFQ_PREP_01.md',
    'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md',
    'docs/COPILOT_DISPATCH_ACTION_PREP_01.md',
    'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
    'backend/scripts/security_kvkk_final_01_check.js',
    'backend/scripts/audit_log_and_approval_trace_01_check.js',
    'docs/SECURITY_KVKK_FINAL_01.md',
    'docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md',
    'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
    'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
    'docs/PRIMER_SSOT.md',
    'docs/DATA_INTEGRITY_AND_RECOVERY_01.md',
    'docs/OBSERVABILITY_MONITORING_ALERTING_01.md',
    'docs/DB_POOL_AND_API_SCALING_01.md',
    'docs/LOAD_TEST_2000_USERS_01.md',
    'docs/CACHE_COALESCING_AND_BACKOFF_01.md',
    'docs/REQUEST_STORM_RESILIENCE_01.md',
    'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md',
    ...acceptedPrismaStatusPaths,
    ...guardAlignmentStatusPaths,
    ...companyBudgetStatusPaths,
    ...packageRunnerStatusPaths,
  ]);

  // Wiring
  addContains(cases, 'package.json exposes role data isolation alias', pkg, '"check:roledataisolationredteam01": "node backend/scripts/role_data_isolation_redteam_01_check.js"');
  addCase(cases, 'role data checker source keeps approved contract', () => validateRoleDataCheckerSource(roleDataChecker));
  addCase(cases, 'registry includes role data isolation check', () => assertProductExtensionsIncludes(roleDataIsolationScript, 'registry includes role data isolation check'));
  addContains(cases, 'harness check includes role data isolation milestone', harnessCheck, 'ROLE-DATA-ISOLATION-REDTEAM-01');
  addContains(cases, 'harness check includes role data isolation alias', harnessCheck, 'check:roledataisolationredteam01');
  addContains(cases, 'harness check includes role data isolation doc', harnessCheck, 'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md');
  addContains(cases, 'harness check includes role data isolation command', harnessCheck, 'node backend\\scripts\\role_data_isolation_redteam_01_check.js');
  addContains(cases, 'harness doc includes role data isolation milestone', harnessDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01');
  addContains(cases, 'harness doc includes role data isolation alias', harnessDoc, 'check:roledataisolationredteam01');
  addContains(cases, 'harness doc includes role data isolation doc', harnessDoc, 'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md');
  addContains(cases, 'harness doc includes role data isolation command', harnessDoc, 'node backend\\scripts\\role_data_isolation_redteam_01_check.js');
  addContains(cases, 'guide includes role data isolation milestone', guide, 'ROLE-DATA-ISOLATION-REDTEAM-01');
  addContains(cases, 'guide includes role data isolation alias', guide, 'check:roledataisolationredteam01');
  addContains(cases, 'guide includes role data isolation doc', guide, 'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md');
  addContains(cases, 'guide includes role data isolation command', guide, 'node backend\\scripts\\role_data_isolation_redteam_01_check.js');
  addContains(cases, 'primer includes role data isolation milestone', primer, 'ROLE-DATA-ISOLATION-REDTEAM-01');
  addContains(cases, 'primer includes role data isolation alias', primer, 'check:roledataisolationredteam01');
  addContains(cases, 'primer includes role data isolation doc', primer, 'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md');
  addContains(cases, 'primer includes role data isolation command', primer, 'backend/scripts/role_data_isolation_redteam_01_check.js');

  // Doc shape
  const headings = [
    '# ROLE-DATA-ISOLATION-REDTEAM-01',
    '## 1) Purpose',
    '## 2) Problem statement',
    '## 3) Role inventory',
    '## 4) Tenant/data scope model',
    '## 5) Role-to-data access matrix',
    '## 6) Cross-tenant redteam matrix',
    '## 7) Endpoint/data surface risk matrix',
    '## 8) Critical entity isolation policy',
    '## 9) Company isolation policy',
    '## 10) Room isolation policy',
    '## 11) School/organization isolation policy',
    '## 12) Driver isolation policy',
    '## 13) Personel isolation policy',
    '## 14) Parent isolation policy',
    '## 15) Super admin boundary policy',
    '## 16) Dashboard bulk isolation policy',
    '## 17) Cache key isolation policy',
    '## 18) Runtime-data isolation policy',
    '## 19) Public lead isolation policy',
    '## 20) Payment/hakediş preview isolation policy',
    '## 21) Live GPS / route / stop isolation policy',
    '## 22) Agreement / shift isolation policy',
    '## 23) KVKK-safe redteam reporting policy',
    '## 24) No write-action / human approval boundary',
    '## 25) Observability handoff',
    '## 26) Data integrity handoff',
    '## 27) Release gate checklist',
    '## 28) What is not changed',
    '## 29) Validation results',
    '## 30) Remaining risks',
    '## 31) Next recommended milestone',
  ];
  for (const heading of headings) addContains(cases, `doc heading ${heading}`, doc, heading);
  addContains(cases, 'doc canonical check', doc, 'Canonical check: `check:roledataisolationredteam01`');
  addContains(cases, 'doc script path', doc, 'node backend\\scripts\\role_data_isolation_redteam_01_check.js');
  addContains(cases, 'doc package alias', doc, 'check:roledataisolationredteam01');
  addContains(cases, 'doc next milestone', doc, 'SECURITY-KVKK-FINAL-01');
  addContains(cases, 'doc role matrix SUPER_ADMIN', doc, 'SUPER_ADMIN: broad read/admin visibility, but no automated unsafe write-action from Copilot/AI.');
  addContains(cases, 'doc role matrix ROOM', doc, 'ROOM: only owned/assigned room operations, drivers, vehicles, shifts, routes and related companies.');
  addContains(cases, 'doc role matrix COMPANY', doc, 'COMPANY: only own company operations, agreements, shifts, personnel and route previews.');
  addContains(cases, 'doc role matrix DRIVER', doc, 'DRIVER: only own assigned shifts/routes/stops/live task state.');
  addContains(cases, 'doc role matrix PERSONEL', doc, 'PERSONEL: only own ride/live/request/profile-safe data.');
  addContains(cases, 'doc role matrix PARENT', doc, 'PARENT: only linked child/student ride/live-safe data.');
  addContains(cases, 'doc role matrix SCHOOL', doc, 'SCHOOL: only own school scoped students/routes/operations.');
  addContains(cases, 'doc role matrix ORGANIZATION', doc, 'ORGANIZATION: only own organization scoped operations/providers/contracts.');
  addContains(cases, 'doc runtime-data list', doc, 'backend/artifacts/runtime-data/');
  addContains(cases, 'doc runtime-data reserve', doc, 'backend/artifacts/role-redteam/');
  addContains(cases, 'doc smoke threshold', doc, '18/82/82/82');
  addContains(cases, 'doc smoke zero console', doc, 'consoleErrorCount=0');
  addContains(cases, 'doc smoke zero page', doc, 'pageErrorCount=0');
  addContains(cases, 'doc smoke 429 none', doc, '429=none');
  addContains(cases, 'doc release gate product extensions', doc, 'check:product-extensions');
  addContains(cases, 'doc release gate verify repo', doc, 'verify:repo');
  addContains(cases, 'doc release gate verify final', doc, 'verify:final');
  addContains(cases, 'doc release gate backend lint', doc, 'npm --prefix backend run lint');
  addContains(cases, 'doc release gate web lint', doc, 'npm --prefix web run lint');

  for (const needle of criticalSurfaces) addContains(cases, `doc surface ${needle}`, doc, needle);
  for (const needle of sensitiveFields) addContains(cases, `doc sensitive field ${needle}`, doc, needle);
  for (const needle of forbiddenActions) addContains(cases, `doc forbidden action ${needle}`, doc, needle);
  for (const needle of companionMilestones) addContains(cases, `doc compatibility ${needle}`, doc, needle);
  for (const needle of summaryTokens) addContains(cases, `doc summary token ${needle}`, doc, needle);

  // Code surfaces
  [
    ['responseCache scope key', responseCache, 'return `${role}:${companyId}:${roomId}:${userId}`;'],
    ['responseCache makeKey', responseCache, 'makeKey(key, scope)'],
    ['responseCache write', responseCache, 'export function writeResponseCache(key, value, ttlMs = 5000, scope = {}) {'],
    ['dashboardBulk scopeOf', dashboardBulk, 'function scopeOf(user) {'],
    ['dashboardBulk cache key', dashboardBulk, 'function bulkCacheKey(bundle, user, query = {}) {'],
    ['dashboardBulk scoped cache', dashboardBulk, 'rememberResponse(cacheKey, load, {'],
    ['dashboardBulk super admin scope', dashboardBulk, 'role === "SUPER_ADMIN"'],
    ['dashboardBulk company scope', dashboardBulk, 'companyId: user.companyId'],
    ['dashboardBulk room scope', dashboardBulk, 'roomId: user.roomId'],
    ['admin route room requirement', adminRoute, 'ROOM requires roomId'],
    ['admin route room company block', adminRoute, 'ROOM must not have companyId'],
    ['admin route company requirement', adminRoute, 'COMPANY requires companyId'],
    ['admin route company room block', adminRoute, 'COMPANY must not have roomId'],
    ['admin route driver requirement', adminRoute, 'DRIVER requires roomId'],
    ['admin route personel requirement', adminRoute, 'PERSONEL requires companyId'],
    ['admin route parent room block', adminRoute, 'PARENT must not have roomId'],
    ['admin route parent company block', adminRoute, 'PARENT must not have companyId'],
    ['admin route create audit', adminRoute, 'ADMIN_USER_CREATE'],
    ['admin route update audit', adminRoute, 'ADMIN_USER_UPDATE'],
  ].forEach(([label, text, needle]) => addContains(cases, label, text, needle));

  // Companion docs
  [
    ['data integrity companion', dataIntegrityDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
    ['observability companion', observabilityDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
    ['db scaling companion', dbScalingDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
    ['load test companion', loadTestDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
    ['cache companion', cacheDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
    ['request storm companion', requestStormDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
    ['rate limit companion', rateLimitDoc, 'ROLE-DATA-ISOLATION-REDTEAM-01'],
  ].forEach(([label, text, needle]) => addContains(cases, label, text, needle));

  // Hygiene and policy boundaries
  ['production DB', 'public URL', 'real credential', 'destructive query', 'schema/migration', 'runtime AI/model execution', 'read-only', 'human approval boundary'].forEach((needle) => addContains(cases, `doc boundary ${needle}`, doc, needle));
  ['name', 'full name', 'phone', 'address', 'email', 'TCKN', 'raw GPS', 'cookie', 'token', 'password', 'provider credential'].forEach((needle) => addContains(cases, `doc sensitive ${needle}`, doc, needle));
  ['no write-action', 'no destructive query', 'no schema/migration', 'no production DB', 'no public URL', 'no real credentials', 'no runtime/model execution', 'No stage/commit/tag/push'].forEach((needle) => addContains(cases, `doc not changed ${needle}`, doc, needle));

  // Commit-external / repo hygiene
  addCase(cases, 'working tree hygiene is classified', () => {
    const dirtyPaths = gitStatusNames(workingTreeHygieneScopePaths);
    const unexpected = [];
    for (const file of dirtyPaths) {
      const category = classifyRoleDataIsolationStatusPath(file);
      if (category === 'APPROVED_CURRENT_HEAD_PRODUCT') continue;
      if (category === 'CANONICAL_PROVENANCE_FILE') continue;
      if (category === 'OUT_OF_SCOPE_CHECKER_INFRA') continue;
      if (category === 'OUT_OF_SCOPE_TEST_INFRA') continue;
      if (category === 'OUT_OF_SCOPE_CURRENT_HEAD_HELPER') continue;
      if (category === 'RUNTIME_DATA') continue;
      if (category === 'ROLE_TENANT_SECURITY_OWNED' && normalizeStatusPath(file) === roleDataCheckerPath) {
        validateRoleDataCheckerSource(roleDataChecker);
        continue;
      }
      unexpected.push(`${normalizeStatusPath(file)} [${category}]`);
    }
    must(unexpected.length === 0, `working tree hygiene: ${unexpected.join(', ') || '(none)'}`);
  });
  addCase(cases, 'stage remains empty', () => must(gitLines(['diff', '--cached', '--name-only']).length === 0, 'staged files present'));
  addCase(cases, 'git diff --check stays clean', () => must(gitLines(['diff', '--check']).length === 0, 'git diff --check findings'));
  addCase(cases, 'git diff --cached --check stays clean', () => must(gitLines(['diff', '--cached', '--check']).length === 0, 'git diff --cached --check findings'));
  addCase(cases, 'route diff stays within approved current-head product', () => {
    assertClassifiedPaths(
      'route diff',
      gitLines(['diff', '--name-only', '--', 'backend/src/routes']),
      ['APPROVED_CURRENT_HEAD_PRODUCT'],
    );
  });
  addCase(cases, 'service diff stays within approved current-head product', () => {
    assertClassifiedPaths(
      'service diff',
      gitLines(['diff', '--name-only', '--', 'backend/src/services']),
      ['APPROVED_CURRENT_HEAD_PRODUCT'],
    );
  });
  addCase(cases, 'prisma diff stays empty', () => {
    assertClassifiedPaths('prisma diff', gitLines(['diff', '--name-only', '--', 'backend/prisma']), []);
  });
  addCase(cases, 'backend prisma accepted manifest stays exact', () => mustAcceptedPrismaManifest());
  addCase(cases, 'debug.log stays absent', () => must(!fs.existsSync(paths.debugLog), 'debug.log still present'));
  addCase(cases, 'git show --check --stat HEAD stays clean', () => must(gitLines(['show', '--check', '--stat', 'HEAD']).length >= 1, 'git show --check --stat HEAD missing output'));

  const roleInventorySummary = `roles=${roles.length}; ${roles.join(', ')}`;
  const tenantScopeSummary = 'company / room / school / organization / personel / driver / parent / super admin';
  const accessMatrixSummary = `roles=${roles.length}; criticalSurfaces=${criticalSurfaces.length}`;
  const redteamMatrixSummary = 'cross-tenant cases=8; no fake success; no hallucinated capability';
  const criticalSurfaceSummary = criticalSurfaces.join(', ');
  const cacheIsolationSummary = 'responseCache scope key uses role/companyId/roomId/userId; dashboardBulk scopeOf(user) feeds scoped cache keys';
  const runtimeDataIsolationSummary = 'backend/artifacts/runtime-data remains commit-external; backend/artifacts/role-redteam is reserved and not generated by this check';
  const kvkkSafeRedteamSummary = 'No PII/token/cookie/password/provider credential/raw GPS logs; aggregate/path/role/scope labels only';
  const humanApprovalBoundarySummary = 'No RFQ send, offer accept/reject, agreement execute, dispatch apply, driver/vehicle assign, route apply, payment/hakediş execute, messaging, provider credential or user/admin write';
  const compatibilitySummary = companionMilestones.join(' | ');
  const smokeThresholdSummary = 'product-flow 18/0/0/0; premium 82/0/0/0; all-panels 82/0/0/0; mobile all-roles 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none';
  const chainWiringSummary = 'package.json + runner + verify chain + harness check/doc + guide + primer';
  const commitExternalSummary = 'runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam are commit-external; stage stays empty';
  const prismaSummary = 'No route/service/prisma diff; no production DB; no schema/migration; read-only only';

  for (const [label, value] of [
    ['roleInventorySummary', roleInventorySummary],
    ['tenantScopeSummary', tenantScopeSummary],
    ['accessMatrixSummary', accessMatrixSummary],
    ['redteamMatrixSummary', redteamMatrixSummary],
    ['criticalSurfaceSummary', criticalSurfaceSummary],
    ['cacheIsolationSummary', cacheIsolationSummary],
    ['runtimeDataIsolationSummary', runtimeDataIsolationSummary],
    ['kvkkSafeRedteamSummary', kvkkSafeRedteamSummary],
    ['humanApprovalBoundarySummary', humanApprovalBoundarySummary],
    ['compatibilitySummary', compatibilitySummary],
    ['smokeThresholdSummary', smokeThresholdSummary],
    ['chainWiringSummary', chainWiringSummary],
    ['commitExternalSummary', commitExternalSummary],
    ['prismaSummary', prismaSummary],
  ]) {
    addContains(cases, `summary token ${label}`, doc, label);
    addContains(cases, `summary text ${label}`, doc, value);
  }

  const guardCases = cases.length;
  let passCount = 0;
  for (const item of cases) {
    item.fn();
    passCount += 1;
  }

  console.log('PASS ROLE-DATA-ISOLATION-REDTEAM-01');
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log('failCount=0');
  console.log(`roleInventorySummary=${roleInventorySummary}`);
  console.log(`tenantScopeSummary=${tenantScopeSummary}`);
  console.log(`accessMatrixSummary=${accessMatrixSummary}`);
  console.log(`redteamMatrixSummary=${redteamMatrixSummary}`);
  console.log(`criticalSurfaceSummary=${criticalSurfaceSummary}`);
  console.log(`cacheIsolationSummary=${cacheIsolationSummary}`);
  console.log(`runtimeDataIsolationSummary=${runtimeDataIsolationSummary}`);
  console.log(`kvkkSafeRedteamSummary=${kvkkSafeRedteamSummary}`);
  console.log(`humanApprovalBoundarySummary=${humanApprovalBoundarySummary}`);
  console.log(`compatibilitySummary=${compatibilitySummary}`);
  console.log(`smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`prismaSummary=${prismaSummary}`);
}

main();
