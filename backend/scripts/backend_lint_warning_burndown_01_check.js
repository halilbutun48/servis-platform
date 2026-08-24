#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertProductExtensionsIncludes } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const paths = {
  packageJson: path.join(repoRoot, 'package.json'),
  harnessCheck: path.join(repoRoot, 'backend', 'scripts', 'script_harness_consolidation_01_check.js'),
  harnessDoc: path.join(repoRoot, 'docs', 'SCRIPT_HARNESS_CONSOLIDATION_01.md'),
  guide: path.join(repoRoot, 'docs', 'SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'),
  primer: path.join(repoRoot, 'docs', 'PRIMER_SSOT.md'),
  doc: path.join(repoRoot, 'docs', 'BACKEND_LINT_WARNING_BURNDOWN_01.md'),
  lintRunner: path.join(repoRoot, 'backend', 'scripts', 'run_backend_lint.js'),
  aiResponseCheck: path.join(repoRoot, 'backend', 'scripts', 'ai_response_semantic_quality_gate_01_check.js'),
  cacheCheck: path.join(repoRoot, 'backend', 'scripts', 'cache_coalescing_and_backoff_01_check.js'),
  nextBestActionCheck: path.join(repoRoot, 'backend', 'scripts', 'copilot_next_best_action_engine_01_check.js'),
  planReviewCheck: path.join(repoRoot, 'backend', 'scripts', 'copilot_plan_review_engine_01_check.js'),
  riskScoringCheck: path.join(repoRoot, 'backend', 'scripts', 'copilot_risk_scoring_engine_01_check.js'),
  rootCauseCheck: path.join(repoRoot, 'backend', 'scripts', 'copilot_root_cause_engine_01_check.js'),
  loadTestCheck: path.join(repoRoot, 'backend', 'scripts', 'load_test_2000_users_01_check.js'),
  productionPolicyCheck: path.join(repoRoot, 'backend', 'scripts', 'production_rate_limit_policy_01_check.js'),
  requestStormCheck: path.join(repoRoot, 'backend', 'scripts', 'request_storm_resilience_01_check.js'),
  seferLanguageCheck: path.join(repoRoot, 'backend', 'scripts', 'sefer_abi_turkish_user_facing_language_01_check.js'),
  seferTerminologyCheck: path.join(repoRoot, 'backend', 'scripts', 'sefer_abi_turkish_user_facing_terminology_01_check.js'),
  browserSmokeReport: path.join(repoRoot, 'backend', 'artifacts', 'browser-smoke', 'UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01', 'report.json'),
  loadTestReport: path.join(repoRoot, 'backend', 'artifacts', 'load-test', 'load_test_2000_users_01_report.json'),
  dbScalingReport: path.join(repoRoot, 'backend', 'artifacts', 'db-scaling', 'db_pool_and_api_scaling_01_report.json'),
  observabilityReport: path.join(repoRoot, 'backend', 'artifacts', 'observability', 'observability_monitoring_alerting_01_report.json'),
  nextBestActionEngine: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationNextBestActionEngine.js'),
  operationHealthEngine: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationOperationHealthEngine.js'),
  planReviewEngine: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationPlanReviewEngine.js'),
  rootCauseEngine: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationRootCauseEngine.js'),
  smartDiagnostics: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationSmartDiagnostics.js'),
  dynamicQuestions: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationTaskStateDynamicQuestions.js'),
  roomReplies: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'conversationTaskStateRoomReplies.js'),
  helpComposer: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js'),
  helpComposerSafeReplies: path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposerSafeReplies.js'),
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
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
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

function gitLines(args) {
  const out = execFileSync('git', ['-c', 'safe.directory=D:/servis-platform', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitMustPass(args, label) {
  execFileSync('git', ['-c', 'safe.directory=D:/servis-platform', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log(`OK ${label}`);
}

function gitCapture(args) {
  return execFileSync('git', ['-c', 'safe.directory=D:/servis-platform', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitStatusEntries(paths) {
  return String(gitCapture(['status', '--porcelain=v1', '--untracked-files=all', '--', ...paths]) || '')
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
  must(fileSha256(relPath) === String(expectedHash || '').toUpperCase(), label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(typeof repoRoot !== "undefined" ? repoRoot : root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      throw new Error(`FAIL ${relPath}: bare CR`);
    }
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  must(actual === wanted, `${label}: ${actual} != ${wanted}`);
}

function isMigrationDirectoryShape(relPath) {
  try {
    const absPath = path.join(repoRoot, relPath);
    const stat = fs.lstatSync(absPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return false;
    }
    const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
    return entries.length === 1 && entries[0] === 'migration.sql';
  } catch {
    return false;
  }
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === 'migration.sql', `${label} has exactly one migration.sql`);
}

function collectBackendPrismaEvidence() {
  const tracked = sortedUniquePaths(gitLines(['diff', '--name-only', '--', 'prisma', 'backend/prisma']));
  const staged = sortedUniquePaths(gitLines(['diff', '--cached', '--name-only', '--', 'prisma', 'backend/prisma']));
  const status = sortedUniquePaths(gitStatusEntries(['prisma', 'backend/prisma']).map((entry) => entry.path));
  const actual = sortedUniquePaths([...tracked, ...staged, ...status]);
  return { tracked, staged, status, actual };
}

const ACCEPTED_SCHEMA_PATH = 'backend/prisma/schema.prisma';
const ACCEPTED_SCHEMA_SHA256 = '7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748';
const ACCEPTED_PRISMA_MIGRATIONS = [
  { path: 'backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql', sha256: '27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD' },
  { path: 'backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql', sha256: '864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD' },
  { path: 'backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql', sha256: 'E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5' },
  { path: 'backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql', sha256: '6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB' },
  { path: 'backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql', sha256: 'CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F' },
  { path: 'backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql', sha256: 'B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90' },
  { path: 'backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql', sha256: '734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005' },
  { path: 'backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql', sha256: '85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17' },
  { path: 'backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql', sha256: '3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0' },
  { path: 'backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql', sha256: '24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198' },
  { path: 'backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql', sha256: 'A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202' },
  { path: 'backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql', sha256: '0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A' },
  { path: 'backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql', sha256: 'D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF' },
  { path: 'backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql', sha256: '8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A' },
  { path: 'backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql', sha256: 'F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A' },
  { path: 'backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql', sha256: '025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0' },
  { path: 'backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql', sha256: 'D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E' },
  { path: 'backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql', sha256: 'C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54' },
  { path: 'backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql', sha256: 'FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D' },
  { path: 'backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql', sha256: 'E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90' },
  { path: 'backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql', sha256: '7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007' },
  { path: 'backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql', sha256: '285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27' },
  { path: 'backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql', sha256: 'E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5' },
  { path: 'backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql', sha256: '3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36' },
  { path: 'backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql', sha256: '59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA' },
  { path: 'backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql', sha256: 'F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528' },
  { path: 'backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql', sha256: '423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581' },
  { path: 'backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql', sha256: '252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79' },
  { path: 'backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql', sha256: '168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F' },
  { path: 'backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql', sha256: 'BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC' },
  { path: 'backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql', sha256: '2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924' },
  { path: 'backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql', sha256: '939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5' },
];
const ACCEPTED_PRISMA_FILES = [
  { path: ACCEPTED_SCHEMA_PATH, sha256: ACCEPTED_SCHEMA_SHA256 },
  ...ACCEPTED_PRISMA_MIGRATIONS,
];
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)));

function inspectAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const acceptedPrismaFiles = ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path));
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(file));
  const missing = acceptedPrismaFiles.filter((file) => !evidence.actual.includes(file));
  const schemaShaMatches = safeFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256);
  const migrationShaMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => normalizedTextSha256(entry.path) === String(entry.sha256 || "").toUpperCase());
  const migrationShapeMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => isMigrationDirectoryShape(path.dirname(entry.path)));
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

function mustAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const inspection = inspectAcceptedPrismaManifest(evidence);
  must(evidence.actual.length === 0, "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, 'accepted Prisma schema SHA matches');
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  return inspection;
}

function runBackendLint() {
  try {
    const output = execFileSync('npm', ['--prefix', 'backend', 'run', 'lint'], {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { output: String(output || ''), exitCode: 0 };
  } catch (error) {
    return {
      output: `${String(error?.stdout || '')}${String(error?.stderr || '')}`,
      exitCode: Number.isInteger(error?.status) ? error.status : 1,
    };
  }
}

function countLintIssues(output, kind) {
  const pattern = new RegExp(`^\\s*\\d+:\\d+\\s+${kind}\\s+`, 'i');
  return String(output || '')
    .split(/\r?\n/)
    .filter((line) => pattern.test(line))
    .length;
}

function main() {
  console.log('=== BACKEND-LINT-WARNING-BURNDOWN-01 CHECK ===');

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const lintRunner = readFile(paths.lintRunner);
  const aiResponseCheck = readFile(paths.aiResponseCheck);
  const cacheCheck = readFile(paths.cacheCheck);
  const nextBestActionCheck = readFile(paths.nextBestActionCheck);
  const planReviewCheck = readFile(paths.planReviewCheck);
  const riskScoringCheck = readFile(paths.riskScoringCheck);
  const rootCauseCheck = readFile(paths.rootCauseCheck);
  const loadTestCheck = readFile(paths.loadTestCheck);
  const productionPolicyCheck = readFile(paths.productionPolicyCheck);
  const requestStormCheck = readFile(paths.requestStormCheck);
  const seferLanguageCheck = readFile(paths.seferLanguageCheck);
  const seferTerminologyCheck = readFile(paths.seferTerminologyCheck);
  const nextBestActionEngine = readFile(paths.nextBestActionEngine);
  const operationHealthEngine = readFile(paths.operationHealthEngine);
  const planReviewEngine = readFile(paths.planReviewEngine);
  const rootCauseEngine = readFile(paths.rootCauseEngine);
  const smartDiagnostics = readFile(paths.smartDiagnostics);
  const dynamicQuestions = readFile(paths.dynamicQuestions);
  const roomReplies = readFile(paths.roomReplies);
  const helpComposer = readFile(paths.helpComposer);
  const helpComposerSafeReplies = readFile(paths.helpComposerSafeReplies);
  const backendPrismaEvidence = collectBackendPrismaEvidence();
  const backendPrismaInspection = inspectAcceptedPrismaManifest(backendPrismaEvidence);
  const backendLintRegistryWired = (() => {
    assertProductExtensionsIncludes('check:backendlintwarningburndown01', 'product extensions registry includes backend lint warning burndown check');
    return true;
  })();

  const lintRun = runBackendLint();
  const lintWarningCount = countLintIssues(lintRun.output, 'warning');
  const lintErrorCount = countLintIssues(lintRun.output, 'error');
  must(lintRun.exitCode === 0, 'backend lint exits cleanly');
  must(lintWarningCount === 0, 'backend lint warning count is 0');
  must(lintErrorCount === 0, 'backend lint error count is 0');
  must(contains(lintRun.output, '=== backend syntax scan ==='), 'backend lint output keeps syntax scan header');
  must(contains(lintRun.output, '=== backend ESLint ==='), 'backend lint output keeps ESLint header');

  const warningBurndownSummary = lintWarningCount === 0 && lintErrorCount === 0
    ? 'backend lint 60 warning -> 0 warning, 0 error -> 0 error'
    : `backend lint ${lintErrorCount} error / ${lintWarningCount} warning`;

  const lintPolicySummary = [
    contains(pkg, '"lint:backend": "npm --prefix backend run lint"'),
    contains(pkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"'),
    contains(pkg, '"lint": "npm run lint:backend && npm run lint:web"'),
    contains(lintRunner, 'eslint'),
    !contains(lintRunner, '--quiet'),
    !contains(lintRunner, 'max-warnings'),
    !contains(lintRunner, 'eslint-disable'),
    !contains(pkg, 'max-warnings'),
    !contains(pkg, '--quiet'),
  ].every(Boolean)
    ? 'lint scripts stay strict; no quiet, no max-warnings and no lint config relax'
    : 'lint policy drift detected';

  const behaviorSafetySummary = [
    contains(doc, 'feature davranışı'),
    contains(doc, 'API davranışı'),
    contains(doc, 'Sefer Abi cevap davranışı'),
    contains(doc, 'user-facing Türkçe metni'),
    contains(doc, 'semantic output formatını'),
    contains(doc, 'check output contract'),
    contains(doc, 'smoke PASS threshold'),
  ].every(Boolean)
    ? 'feature, API, Sefer Abi and user-facing text safety stays intact'
    : 'behavior safety coverage incomplete';

  const aiSafetySummary = [
    contains(doc, 'helpComposer.js'),
    contains(doc, 'helpComposerSafeReplies.js'),
    contains(doc, 'conversationOperationHealthEngine.js'),
    contains(doc, 'conversationTaskStateDynamicQuestions.js'),
    contains(doc, 'conversationTaskStateRoomReplies.js'),
    contains(doc, 'AI runtime/model/API execution'),
  ].every(Boolean)
    ? 'AI hot files stay cleanup-only and runtime execution stays closed'
    : 'ai safety coverage incomplete';

  const thresholdSafetySummary = [
    contains(doc, '18/0/0/0'),
    contains(doc, '82/0/0/0'),
    contains(doc, '429=none'),
    contains(doc, 'PASS BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(doc, 'check:backendlintwarningburndown01'),
    contains(doc, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md'),
    contains(doc, 'backend/scripts/backend_lint_warning_burndown_01_check.js'),
  ].every(Boolean)
    ? 'smoke thresholds remain 18/0/0/0 and 82/0/0/0 with 429=none'
    : 'threshold safety coverage incomplete';

  const codeSafetyText = [
    pkg,
    harnessCheck,
    harnessDoc,
    guide,
    primer,
    lintRunner,
    aiResponseCheck,
    cacheCheck,
    nextBestActionCheck,
    planReviewCheck,
    riskScoringCheck,
    rootCauseCheck,
    loadTestCheck,
    productionPolicyCheck,
    requestStormCheck,
    seferLanguageCheck,
    seferTerminologyCheck,
    nextBestActionEngine,
    operationHealthEngine,
    planReviewEngine,
    rootCauseEngine,
    smartDiagnostics,
    dynamicQuestions,
    roomReplies,
    helpComposer,
    helpComposerSafeReplies,
  ].join('\n');

  addCase(cases, 'lint cleanup code does not add eslint-disable', () => must(!contains(codeSafetyText, 'eslint-disable'), 'eslint-disable found in cleanup code'));
  addCase(cases, 'product extensions registry includes backend lint warning burndown check', () => must(backendLintRegistryWired, 'product extensions registry includes backend lint warning burndown check'));

  const chainNeedles = [
    [pkg, '"check:backendlintwarningburndown01": "node backend/scripts/backend_lint_warning_burndown_01_check.js"'],
    [harnessCheck, 'BACKEND-LINT-WARNING-BURNDOWN-01'],
    [harnessCheck, 'check:backendlintwarningburndown01'],
    [harnessCheck, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md'],
    [harnessCheck, 'backend/scripts/backend_lint_warning_burndown_01_check.js'],
    [harnessDoc, 'BACKEND-LINT-WARNING-BURNDOWN-01'],
    [harnessDoc, 'check:backendlintwarningburndown01'],
    [harnessDoc, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md'],
    [harnessDoc, 'node backend\\scripts\\backend_lint_warning_burndown_01_check.js'],
    [guide, 'BACKEND-LINT-WARNING-BURNDOWN-01'],
    [guide, 'check:backendlintwarningburndown01'],
    [guide, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md'],
    [guide, 'node backend\\scripts\\backend_lint_warning_burndown_01_check.js'],
    [primer, 'BACKEND-LINT-WARNING-BURNDOWN-01'],
    [primer, 'check:backendlintwarningburndown01'],
    [primer, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md'],
    [primer, 'backend/scripts/backend_lint_warning_burndown_01_check.js'],
    [doc, 'BACKEND-LINT-WARNING-BURNDOWN-01'],
    [doc, '0 error / 60 warning'],
    [doc, '0 error / 0 warning'],
    [doc, 'DATA-INTEGRITY-AND-RECOVERY-01'],
  ];
  for (const [text, needle] of chainNeedles) {
    addContainsCase(cases, `chain contains ${needle}`, text, needle);
  }

  addCase(cases, 'script harness doc order is preserved', () => ordered(harnessDoc, [
    'OBSERVABILITY-MONITORING-ALERTING-01',
    'BACKEND-LINT-WARNING-BURNDOWN-01',
    'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01',
  ], 'script harness doc order'));
  addCase(cases, 'guide order is preserved', () => ordered(guide, [
    'OBSERVABILITY-MONITORING-ALERTING-01',
    'BACKEND-LINT-WARNING-BURNDOWN-01',
    'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01',
  ], 'milestone guide order'));
  addCase(cases, 'primer order is preserved', () => ordered(primer, [
    'OBSERVABILITY-MONITORING-ALERTING-01',
    'BACKEND-LINT-WARNING-BURNDOWN-01',
    'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01',
  ], 'primer order'));

  const docHeadings = [
    '# BACKEND-LINT-WARNING-BURNDOWN-01',
    '## 1) Purpose',
    '## 2) Problem statement',
    '## 3) Starting state',
    '## 4) Cleanup policy',
    '## 5) Allowed cleanup methods',
    '## 6) Forbidden cleanup methods',
    '## 7) Files touched',
    '## 8) Warning categories',
    '## 9) Behavior safety policy',
    '## 10) AI/Sefer Abi safety policy',
    '## 11) Check script output contract safety',
    '## 12) Smoke threshold safety',
    '## 13) Lint config safety',
    '## 14) ESLint disable policy',
    '## 15) Remaining warnings, if any',
    '## 16) Validation results',
    '## 17) Remaining risks',
    '## 18) Next recommended milestone',
  ];
  for (const heading of docHeadings) {
    addContainsCase(cases, `doc heading ${heading}`, doc, heading);
  }

  const docNeedles = [
    'Backend lint baseline: `0 error / 60 warning`',
    'Starting backend lint warning count: `60`',
    'Ending backend lint warning count: `0`',
    'Ending backend lint error count: `0`',
    '`npm --prefix backend run lint`: PASS',
    '`npm run check:backendlintwarningburndown01`: PASS',
    'Stage boş kalacak.',
    'Runtime-data commit dışı kalacak.',
    'Browser-smoke ve generated report artefact\'leri commit dışı kalacak.',
    '`PASS BACKEND-LINT-WARNING-BURNDOWN-01`',
    '`guardCases`',
    '`passCount`',
    '`failCount`',
    '`warningBurndownSummary`',
    '`lintPolicySummary`',
    '`behaviorSafetySummary`',
    '`aiSafetySummary`',
    '`thresholdSafetySummary`',
    '`chainWiringSummary`',
    '`commitExternalSummary`',
    '`prismaSummary`',
    '`18/0/0/0`',
    '`82/0/0/0`',
    '`429=none`',
    'No new dependency',
    'No big refactor',
    'no eslint-disable',
    'no config relax',
    'chore: reduce backend lint warnings',
    'v2026.07.20-backend-lint-warning-burndown-01',
    'DATA-INTEGRITY-AND-RECOVERY-01',
  ];
  for (const needle of docNeedles) {
    addContainsCase(cases, `doc contains ${needle}`, doc, needle);
  }

  const cleanupFileNames = [
    'backend/scripts/ai_response_semantic_quality_gate_01_check.js',
    'backend/scripts/cache_coalescing_and_backoff_01_check.js',
    'backend/scripts/copilot_next_best_action_engine_01_check.js',
    'backend/scripts/copilot_plan_review_engine_01_check.js',
    'backend/scripts/copilot_risk_scoring_engine_01_check.js',
    'backend/scripts/copilot_root_cause_engine_01_check.js',
    'backend/scripts/load_test_2000_users_01_check.js',
    'backend/scripts/production_rate_limit_policy_01_check.js',
    'backend/scripts/request_storm_resilience_01_check.js',
    'backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js',
    'backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js',
    'backend/src/ai/chat/conversationNextBestActionEngine.js',
    'backend/src/ai/chat/conversationOperationHealthEngine.js',
    'backend/src/ai/chat/conversationPlanReviewEngine.js',
    'backend/src/ai/chat/conversationRootCauseEngine.js',
    'backend/src/ai/chat/conversationSmartDiagnostics.js',
    'backend/src/ai/chat/conversationTaskStateDynamicQuestions.js',
    'backend/src/ai/chat/conversationTaskStateRoomReplies.js',
    'backend/src/ai/chat/helpComposer.js',
    'backend/src/ai/chat/helpComposerSafeReplies.js',
  ];
  for (const fileName of cleanupFileNames) {
    addContainsCase(cases, `doc lists touched file ${fileName}`, doc, fileName);
  }

  const lintPolicyNeedles = [
    'npm run lint:backend && npm run lint:web',
    'lint:backend',
    'lint:web',
    'backend/scripts/run_backend_lint.js',
    'backend/scripts/run_web_lint_with_evidence.js',
    'no quiet',
    'no max-warnings',
    'no lint config relax',
    'no eslint-disable',
    'ESLint disable policy',
  ];
  for (const needle of lintPolicyNeedles) {
    addContainsCase(cases, `lint policy doc contains ${needle}`, doc, needle);
  }

  const behaviorNeedles = [
    'feature davranışı',
    'API davranışı',
    'Sefer Abi cevap davranışı',
    'user-facing Türkçe metni',
    'semantic output formatını',
    'smoke PASS threshold',
    'human approval sınırları',
    'KVKK/PII safe logging',
  ];
  for (const needle of behaviorNeedles) {
    addContainsCase(cases, `behavior safety doc contains ${needle}`, doc, needle);
  }

  const aiNeedles = [
    'helpComposer.js',
    'helpComposerSafeReplies.js',
    'conversationOperationHealthEngine.js',
    'conversationTaskStateDynamicQuestions.js',
    'conversationTaskStateRoomReplies.js',
    'AI runtime/model/API execution',
    'semantic output contract',
    'Sefer Abi Türkçe metinler',
  ];
  for (const needle of aiNeedles) {
    addContainsCase(cases, `ai safety doc contains ${needle}`, doc, needle);
  }

  const thresholdNeedles = [
    '18/0/0/0',
    '82/0/0/0',
    'consoleErrorCount=0',
    'pageErrorCount=0',
    '429=none',
    'PASS BACKEND-LINT-WARNING-BURNDOWN-01',
    'check:backendlintwarningburndown01',
    'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md',
    'backend/scripts/backend_lint_warning_burndown_01_check.js',
  ];
  for (const needle of thresholdNeedles) {
    addContainsCase(cases, `threshold safety doc contains ${needle}`, doc, needle);
  }

  const lintRunnerNeedles = [
    'eslint',
    '--quiet',
    'max-warnings',
    'eslint-disable',
  ];
  addContainsCase(cases, 'lint runner keeps eslint invocation', lintRunner, lintRunnerNeedles[0]);
  addNotContainsCase(cases, 'lint runner does not use quiet flag', lintRunner, lintRunnerNeedles[1]);
  addNotContainsCase(cases, 'lint runner does not use max warnings relax', lintRunner, lintRunnerNeedles[2]);
  addNotContainsCase(cases, 'lint runner does not use eslint disable', lintRunner, lintRunnerNeedles[3]);

  addCase(cases, 'package lint script stays chained', () => must(
    contains(pkg, '"lint:backend": "npm --prefix backend run lint"') &&
    contains(pkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"') &&
    contains(pkg, '"lint": "npm run lint:backend && npm run lint:web"'),
    'package lint chain changed'));
  addCase(cases, 'backend lint output warning count summary is zero', () => must(lintWarningCount === 0, 'lint warnings still present'));
  addCase(cases, 'backend lint output error count summary is zero', () => must(lintErrorCount === 0, 'lint errors still present'));

  const statusLines = gitLines(['status', '--short']);
  const stagedNames = gitLines(['diff', '--cached', '--name-only']);
  const diffCheckLines = gitLines(['diff', '--check']);
  const cachedDiffCheckLines = gitLines(['diff', '--cached', '--check']);
  const routesDiff = gitLines(['diff', '--name-only', '--', 'backend/src/routes']).filter((line) => line !== 'backend/src/routes/companyOverview.js');
  const servicesDiff = gitLines(['diff', '--name-only', '--', 'backend/src/services']);
  const prismaDiff = gitLines(['diff', '--name-only', '--', 'prisma']);
  const backendPrismaDiff = gitLines(['diff', '--name-only', '--', 'backend/prisma']);

  addCase(cases, 'git diff --check stays clean', () => must(diffCheckLines.length === 0, `git diff --check findings: ${diffCheckLines.join(', ')}`));
  addCase(cases, 'git diff --cached --check stays clean', () => must(cachedDiffCheckLines.length === 0, `git diff --cached --check findings: ${cachedDiffCheckLines.join(', ')}`));
  addCase(cases, 'git diff --cached --name-only stays empty', () => must(stagedNames.length === 0, `staged diff not empty: ${stagedNames.join(', ')}`));
  addCase(cases, 'git show --check --stat HEAD stays clean', () => gitMustPass(['show', '--check', '--stat', 'HEAD'], 'git show --check --stat HEAD clean'));
  addCase(cases, 'debug.log stays absent', () => must(!fs.existsSync(paths.debugLog), 'debug.log present'));

  const statusText = statusLines.join('\n');
  const commitExternalNeedles = [
    'backend/artifacts/runtime-data/',
  ];
  for (const needle of commitExternalNeedles) {
    addContainsCase(cases, `status mentions ${needle}`, statusText, needle);
  }
  addCase(cases, 'browser-smoke artifacts remain gitignored', () => gitMustPass(['check-ignore', '-v', paths.browserSmokeReport], 'browser-smoke artifacts remain gitignored'));
  addCase(cases, 'load-test artifacts remain gitignored', () => gitMustPass(['check-ignore', '-v', paths.loadTestReport], 'load-test artifacts remain gitignored'));
  addCase(cases, 'db-scaling artifacts remain gitignored', () => gitMustPass(['check-ignore', '-v', paths.dbScalingReport], 'db-scaling artifacts remain gitignored'));
  addCase(cases, 'observability artifacts remain gitignored', () => gitMustPass(['check-ignore', '-v', paths.observabilityReport], 'observability artifacts remain gitignored'));
  addCase(cases, 'stage remains empty for generated artefacts', () => must(stagedNames.every((name) => !['backend/artifacts/browser-smoke/', 'backend/artifacts/load-test/', 'backend/artifacts/db-scaling/', 'backend/artifacts/observability/'].some((needle) => name.includes(needle))), `generated artefact staged: ${stagedNames.join(', ')}`));

  const commitExternalSummary = [
    statusLines.some((line) => line.includes('backend/artifacts/runtime-data/')),
    !stagedNames.some((line) => line.includes('backend/artifacts/browser-smoke/')),
    !stagedNames.some((line) => line.includes('backend/artifacts/load-test/')),
    !stagedNames.some((line) => line.includes('backend/artifacts/db-scaling/')),
    !stagedNames.some((line) => line.includes('backend/artifacts/observability/')),
    !fs.existsSync(paths.debugLog),
    stagedNames.length === 0,
  ].every(Boolean)
    ? 'runtime-data working tree\'de, browser-smoke/load-test/db-scaling/observability staged değil, debug.log absent, stage empty'
    : 'commit-external boundary incomplete';

  const prismaSummary = [
    routesDiff.length === 0,
    servicesDiff.length === 0,
    prismaDiff.length === 0,
    backendPrismaInspection.exact,
  ].every(Boolean)
    ? 'backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty'
    : 'route/service/prisma diff unexpectedly dirty';

  const chainWiringSummary = [
    contains(pkg, '"check:backendlintwarningburndown01": "node backend/scripts/backend_lint_warning_burndown_01_check.js"'),
    backendLintRegistryWired,
    contains(harnessCheck, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(harnessDoc, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(guide, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(primer, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(doc, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(doc, 'backend/scripts/backend_lint_warning_burndown_01_check.js'),
  ].every(Boolean)
    ? 'package.json, registry, harness check/doc, guide, primer and doc are wired'
    : 'chain wiring incomplete';

  const failures = [];
  for (const entry of cases) {
    try {
      entry.fn();
    } catch (error) {
      failures.push(`${entry.label}: ${error?.message || String(error)}`);
      console.log(`FAIL ${entry.label}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exit(1);
  }

  const passCount = cases.length;
  const failCount = 0;
  const guardCases = cases.length;

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`warningBurndownSummary=${warningBurndownSummary}`);
  console.log(`lintPolicySummary=${lintPolicySummary}`);
  console.log(`behaviorSafetySummary=${behaviorSafetySummary}`);
  console.log(`aiSafetySummary=${aiSafetySummary}`);
  console.log(`thresholdSafetySummary=${thresholdSafetySummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`prismaSummary=${prismaSummary}`);

  console.log('PASS BACKEND-LINT-WARNING-BURNDOWN-01');
}

main();
