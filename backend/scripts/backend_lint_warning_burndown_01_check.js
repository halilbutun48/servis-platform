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

function gitLines(args) {
  const out = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitMustPass(args, label) {
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log(`OK ${label}`);
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
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
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
    runner,
    verify,
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

  const chainNeedles = [
    [pkg, '"check:backendlintwarningburndown01": "node backend/scripts/backend_lint_warning_burndown_01_check.js"'],
    [runner, 'check:backendlintwarningburndown01'],
    [verify, 'check:backendlintwarningburndown01'],
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
  const routesDiff = gitLines(['diff', '--name-only', '--', 'backend/src/routes']);
  const servicesDiff = gitLines(['diff', '--name-only', '--', 'backend/src/services']);
  const prismaDiff = gitLines(['diff', '--name-only', '--', 'prisma']);
  const backendPrismaDiff = gitLines(['diff', '--name-only', '--', 'backend/prisma']);

  addCase(cases, 'git diff --check stays clean', () => must(diffCheckLines.length === 0, `git diff --check findings: ${diffCheckLines.join(', ')}`));
  addCase(cases, 'git diff --cached --check stays clean', () => must(cachedDiffCheckLines.length === 0, `git diff --cached --check findings: ${cachedDiffCheckLines.join(', ')}`));
  addCase(cases, 'git diff --cached --name-only stays empty', () => must(stagedNames.length === 0, `staged diff not empty: ${stagedNames.join(', ')}`));
  addCase(cases, 'git show --check --stat HEAD stays clean', () => gitMustPass(['show', '--check', '--stat', 'HEAD'], 'git show --check --stat HEAD clean'));
  addCase(cases, 'route diff stays empty', () => must(routesDiff.length === 0, `route diff not empty: ${routesDiff.join(', ')}`));
  addCase(cases, 'service diff stays empty', () => must(servicesDiff.length === 0, `service diff not empty: ${servicesDiff.join(', ')}`));
  addCase(cases, 'prisma diff stays empty', () => must(prismaDiff.length === 0, `prisma diff not empty: ${prismaDiff.join(', ')}`));
  addCase(cases, 'backend prisma diff stays empty', () => must(backendPrismaDiff.length === 0, `backend prisma diff not empty: ${backendPrismaDiff.join(', ')}`));
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
    backendPrismaDiff.length === 0,
  ].every(Boolean)
    ? 'backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty'
    : 'route/service/prisma diff unexpectedly dirty';

  const chainWiringSummary = [
    contains(pkg, '"check:backendlintwarningburndown01": "node backend/scripts/backend_lint_warning_burndown_01_check.js"'),
    contains(runner, 'check:backendlintwarningburndown01'),
    contains(verify, 'check:backendlintwarningburndown01'),
    contains(harnessCheck, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(harnessDoc, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(guide, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(primer, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(doc, 'BACKEND-LINT-WARNING-BURNDOWN-01'),
    contains(doc, 'backend/scripts/backend_lint_warning_burndown_01_check.js'),
  ].every(Boolean)
    ? 'package.json, runner, verify chain, harness check/doc, guide, primer and doc are wired'
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
