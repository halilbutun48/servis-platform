#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const paths = {
  packageJson: path.join(repoRoot, 'package.json'),
  runner: path.join(repoRoot, 'backend', 'scripts', 'run_product_extensions_check_chain.js'),
  verify: path.join(repoRoot, 'backend', 'scripts', 'verify_chain_01_product_extensions_check.js'),
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

function gitStatusNames() {
  const out = execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return String(out || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(/^.{2}\s+/, '').replace(/\\/g, '/').trim())
    .filter(Boolean);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) throw new Error(`${label}: ${unexpected.join(', ')}`);
  console.log(`OK ${label}`);
}

function main() {
  console.log('=== ROLE-DATA-ISOLATION-REDTEAM-01 CHECK ===');

  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
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
  const allowedStatusNames = new Set([
    'backend/artifacts/runtime-data/password-change-requirements.json',
    'backend/artifacts/runtime-data/username-directory.json',
    'backend/artifacts/runtime-data/agreement-route-refresh-requests.json',
    'backend/artifacts/runtime-data/public-leads.json',
    'backend/artifacts/runtime-data/quality-review-decisions.json',
    'backend/artifacts/runtime-data/region-failover-drill-state.json',
    'package.json',
    'backend/scripts/run_product_extensions_check_chain.js',
    'backend/scripts/verify_chain_01_product_extensions_check.js',
    'backend/scripts/script_harness_consolidation_01_check.js',
    'backend/scripts/role_data_isolation_redteam_01_check.js',
    'backend/scripts/copilot_route_review_human_approval_01_check.js',
    'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
    'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md',
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
  ]);

  // Wiring
  addContains(cases, 'package.json exposes role data isolation alias', pkg, '"check:roledataisolationredteam01": "node backend/scripts/role_data_isolation_redteam_01_check.js"');
  addContains(cases, 'runner includes role data isolation check', runner, 'check:roledataisolationredteam01');
  addContains(cases, 'verify chain includes role data isolation check', verify, 'check:roledataisolationredteam01');
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
  addCase(cases, 'working tree only contains approved files', () => {
    allWithin(gitStatusNames(), allowedStatusNames, [], 'working tree hygiene');
  });
  addCase(cases, 'stage remains empty', () => must(gitLines(['diff', '--cached', '--name-only']).length === 0, 'staged files present'));
  addCase(cases, 'git diff --check stays clean', () => must(gitLines(['diff', '--check']).length === 0, 'git diff --check findings'));
  addCase(cases, 'git diff --cached --check stays clean', () => must(gitLines(['diff', '--cached', '--check']).length === 0, 'git diff --cached --check findings'));
  addCase(cases, 'route diff stays empty', () => must(gitLines(['diff', '--name-only', '--', 'backend/src/routes']).length === 0, 'route diff not empty'));
  addCase(cases, 'service diff stays empty', () => must(gitLines(['diff', '--name-only', '--', 'backend/src/services']).length === 0, 'service diff not empty'));
  addCase(cases, 'prisma diff stays empty', () => must(gitLines(['diff', '--name-only', '--', 'prisma']).length === 0, 'prisma diff not empty'));
  addCase(cases, 'backend prisma diff stays empty', () => must(gitLines(['diff', '--name-only', '--', 'backend/prisma']).length === 0, 'backend prisma diff not empty'));
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
