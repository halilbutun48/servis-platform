#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runGeneralizationDiagnostic } from './m18_semantic_generalization_diagnostic_01_check.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..', '..');
const DIAGNOSTIC_REPORT_PATH = 'backend/artifacts/harness-topology/m18-role-help-architecture-diagnostic-20261001-report.json';
const TRUSTED_CORPUS_PATH = 'backend/artifacts/harness-topology/m18-role-help-architecture-diagnostic-20261001.json';
const TRUSTED_REPLAY_PATH = '.superpowers/sdd/2026-10-01-m18-typed-semantic-evidence-implementation-plan/task-12-final-residual-final-replay.json';

const HISTORICAL_CHECKS = Object.freeze([
  ['E01_SCOPE_PRECEDENCE', 'backend/scripts/m18_run_e_e01_scope_precedence_regression_01_check.js'],
  ['F01_SCOPE_PRECEDENCE', 'backend/scripts/m18_run_f01_scope_precedence_regression_01_check.js'],
  ['G01_OBJECT_MAPPING', 'backend/scripts/m18_run_g01_object_mapping_regression_01_check.js'],
  ['H03_BASIC_HELP', 'backend/scripts/m18_h03_basic_help_corrective_01_check.js'],
  ['I01_ACTION_DISTINCTION', 'backend/scripts/m18_run_i01_explain_view_navigate_contrastive_01_check.js'],
  ['J02_ROLE_HELP', 'backend/scripts/m18_run_j02_role_help_regression_01_check.js'],
  ['K02_ROLE_CONCEPT', 'backend/scripts/m18_run_k02_role_concept_regression_01_check.js'],
  ['BASIC_USER_LANGUAGE', 'backend/scripts/m18_basic_user_language_regression_01_check.js'],
]);

const SERVICE_COMMAND_IDENTITIES = Object.freeze([
  'node backend/scripts/m18_h03_basic_help_service_01_check.mjs',
  'node backend/scripts/m18_run_i01_action_authority_service_01_check.mjs',
  'node backend/scripts/m18_run_j02_role_help_service_01_check.mjs',
  'node backend/scripts/m18_run_k02_role_concept_service_01_check.mjs',
  'node backend/scripts/m18_basic_user_language_smoke_01_check.mjs',
]);

const BROWSER_COMMAND_IDENTITIES = Object.freeze([
  'node backend/scripts/m18_run_f01_scope_precedence_browser_01_check.mjs',
  'node backend/scripts/m18_run_g01_object_mapping_browser_01_check.mjs',
  'node backend/scripts/m18_run_i01_action_distinction_browser_01_check.mjs',
  'node backend/scripts/m18_run_j02_role_help_browser_01_check.mjs',
  'node backend/scripts/m18_run_k02_role_concept_browser_01_check.mjs',
]);

const ZERO_WRITE_FIELDS = Object.freeze([
  'businessWriteExecution',
  'draftCreation',
  'offerSend',
  'dispatchExecution',
  'financialWrite',
  'authorizationMutation',
]);

const ZERO_EXTERNAL_AI_FIELDS = Object.freeze([
  'externalLlmProviderCount',
  'externalLlmNetworkCallCount',
  'llmApiSecretCount',
]);

const AGGREGATE_WRITE_GUARD_FIELD = 'businessWriteExecution';

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(path.join(REPO_ROOT, filePath))).digest('hex').toUpperCase();
}

function normalizeSourceFiles(sourceFiles) {
  return sourceFiles.map((item) => typeof item === 'string' ? item : item.path);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

function parseCommandOutput(stdout) {
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
}

function expectedHistoricalCommandIdentities() {
  return HISTORICAL_CHECKS.map(([id, scriptPath]) => ({ id, scriptPath, command: `node ${scriptPath}` }));
}

const HISTORICAL_GATE_CLASSIFICATIONS = Object.freeze(
  Object.fromEntries(HISTORICAL_CHECKS.map(([id, scriptPath]) => [
    id,
    {
      classification: 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
      stage: 'STAGE_1',
      scriptPath,
      reason: 'Current semantic result is behavioral evidence and must not block Stage 0 provenance validity.',
    },
  ])),
);

function classifyHistoricalGate({ id, scriptPath, observedResult } = {}) {
  const expected = HISTORICAL_GATE_CLASSIFICATIONS[id];
  if (!expected || (scriptPath && scriptPath !== expected.scriptPath)) {
    return {
      id: id || null,
      classification: 'UNKNOWN_STOP',
      stage: 'STOP',
      reason: 'Historical gate identity is not part of the approved migration inventory.',
      observedResult: observedResult ?? null,
    };
  }
  return { id, ...expected, observedResult: observedResult ?? null };
}

function normalizeHistoricalCommandIdentities(checkCommands) {
  return checkCommands.map((item) => {
    if (typeof item === 'string') {
      const match = expectedHistoricalCommandIdentities().find(({ scriptPath, command }) => item === scriptPath || item === command);
      assert.ok(match, `approved historical command identity: ${item}`);
      return match;
    }
    return {
      id: item.id,
      scriptPath: item.scriptPath,
      command: item.command || `node ${item.scriptPath}`,
    };
  });
}

function assertApprovedHistoricalCommandIdentities(checkCommands) {
  assert.deepEqual(
    normalizeHistoricalCommandIdentities(checkCommands),
    expectedHistoricalCommandIdentities(),
    'approved historical command identity',
  );
}

function commandEvidence(command) {
  return {
    id: command.id,
    scriptPath: command.scriptPath,
    command: command.command,
    exitCode: command.exitCode,
    status: command.status,
    stdout: command.stdout,
    stderr: command.stderr,
    parsed: command.parsed,
  };
}

function findFieldValues(value, field, values = []) {
  if (!value || typeof value !== 'object') return values;
  if (Object.prototype.hasOwnProperty.call(value, field)) values.push(value[field]);
  for (const child of Object.values(value)) findFieldValues(child, field, values);
  return values;
}

function counterEvidence(field, commands, diagnostic) {
  const observedFields = field === AGGREGATE_WRITE_GUARD_FIELD
    ? [field]
    : ZERO_WRITE_FIELDS.includes(field)
      ? [field, AGGREGATE_WRITE_GUARD_FIELD]
      : [field];
  const evidence = [];
  for (const observedField of observedFields) {
    for (const command of commands) {
      const values = findFieldValues(command.parsed, observedField);
      for (const value of values) {
        evidence.push({
          source: 'historical-command',
          observedField,
          relation: observedField === field ? 'DIRECT' : 'AGGREGATE_ZERO_GUARD',
          ...commandEvidence(command),
          value,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(diagnostic, observedField)) {
      evidence.push({
        source: 'diagnostic-report',
        path: DIAGNOSTIC_REPORT_PATH,
        observedField,
        relation: observedField === field ? 'DIRECT' : 'AGGREGATE_ZERO_GUARD',
        value: diagnostic[observedField],
      });
    }
  }
  if (evidence.length === 0) return { status: 'MISSING_REQUIRED_EVIDENCE', value: null, evidence };
  const values = evidence.map(({ value }) => Number(value)).filter(Number.isFinite);
  const value = values.length ? Math.max(...values) : null;
  return {
    status: value === 0 ? 'OBSERVED_ZERO' : 'OBSERVED_NONZERO',
    value,
    evidence,
  };
}

function assertCounterEvidence(counter, field, kind) {
  assert.ok(counter && typeof counter === 'object', `required ${kind} counter evidence: ${field}`);
  assert.ok(Array.isArray(counter.evidence), `required ${kind} counter evidence: ${field}`);
  assert.ok(['OBSERVED_ZERO', 'OBSERVED_NONZERO', 'MISSING_REQUIRED_EVIDENCE'].includes(counter.status), `${field} counter status is explicit`);
  if (counter.status === 'MISSING_REQUIRED_EVIDENCE') {
    assert.fail(`required ${kind} counter evidence: ${field}`);
  }
  assert.equal(counter.status, 'OBSERVED_ZERO', `${field} zero guard is proven by evidence`);
  assert.equal(counter.value, 0, `${field} remains zero`);
  assert.ok(counter.evidence.length > 0, `${field} zero has evidence`);
}

function assertCommandEvidence(evidence, label) {
  assert.ok(evidence && typeof evidence === 'object', `${label} command evidence is present`);
  assert.equal(typeof evidence.id, 'string', `${label} command id is captured`);
  assert.equal(typeof evidence.scriptPath, 'string', `${label} script path is captured`);
  assert.equal(typeof evidence.command, 'string', `${label} command identity is captured`);
  assert.equal(Number.isInteger(evidence.exitCode), true, `${label} exit code is captured`);
  assert.match(evidence.status, /^(PASS|FAIL)$/u, `${label} status is captured`);
  assert.equal(typeof evidence.stdout, 'string', `${label} stdout is captured`);
  assert.equal(typeof evidence.stderr, 'string', `${label} stderr is captured`);
}

function assertApprovedHistoricalEvidence(report) {
  const expected = expectedHistoricalCommandIdentities();
  const commands = report.historicalRegression?.commands;
  const commandEvidence = report.historicalRegression?.commandEvidence;
  assert.ok(Array.isArray(commands), 'baseline report has historical commands');
  assert.ok(Array.isArray(commandEvidence), 'required per-command historical command evidence');
  assert.deepEqual(
    commands.map(({ id, scriptPath, command }) => ({ id, scriptPath, command })),
    expected,
    'approved historical command identity in results',
  );
  assert.deepEqual(
    commandEvidence.map(({ id, scriptPath, command }) => ({ id, scriptPath, command })),
    expected,
    'approved historical command identity in surfaced evidence',
  );
  assert.equal(commands.length, expected.length, 'baseline report has exactly eight approved historical commands');
  assert.equal(commandEvidence.length, expected.length, 'baseline report has evidence for exactly eight approved historical commands');
  for (const evidence of commandEvidence) assertCommandEvidence(evidence, evidence.id);
  assert.ok(commandEvidence.every(({ status, exitCode }) => status === 'PASS' && exitCode === 0), 'historical command evidence passes with exit code zero');
}

function runCheck({ id, scriptPath, command = `node ${scriptPath}` }) {
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, scriptPath)], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return {
    id,
    scriptPath,
    command,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.status,
    stdout,
    stderr,
    parsed: parseCommandOutput(stdout),
  };
}

function collectBaseline({ sourceFiles, checkCommands }) {
  assertApprovedHistoricalCommandIdentities(checkCommands);
  const normalizedSourceFiles = normalizeSourceFiles(sourceFiles);
  const runtimeFiles = normalizedSourceFiles.map((filePath) => ({ path: filePath, sha256: sha256(filePath) }));
  const historicalCommands = normalizeHistoricalCommandIdentities(checkCommands).map(runCheck);
  const diagnostic = readJson(DIAGNOSTIC_REPORT_PATH);
  const allChecksPass = historicalCommands.every(({ status }) => status === 'PASS');
  const actionCommand = historicalCommands.find(({ id }) => id === 'I01_ACTION_DISTINCTION');
  const authorizationCommands = historicalCommands.filter(({ parsed }) => findFieldValues(parsed, 'authorization').length > 0);
  const authorizationStatuses = authorizationCommands.flatMap(({ parsed }) => findFieldValues(parsed, 'authorization'));
  const tenantCommand = historicalCommands.find(({ id }) => id === 'BASIC_USER_LANGUAGE');
  const tenantOutput = tenantCommand?.parsed || null;
  const actualRoleCases = tenantOutput?.roleCases || [];
  const actualRoleOrientationCases = tenantOutput?.roleOrientationCases || [];

  return {
    baselineVersion: 'M18-TYPED-SEMANTIC-EVIDENCE-BASELINE-V1',
    sourceIdentity: {
      contract: 'SEFER-ABI-CANONICAL-REQUEST-V3',
      epoch: 'M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1',
      runtimeFiles,
    },
    historicalRegression: {
      status: allChecksPass ? 'PASS' : 'FAIL',
      commands: historicalCommands,
      commandEvidence: historicalCommands.map(commandEvidence),
    },
    roleHelpDiagnostic: {
      positiveCaseCount: diagnostic.roleHelpDiagnosticTotal,
      negativeControlCount: diagnostic.diagnosticFalsePositiveControlCount,
      correctCount: diagnostic.roleHelpDiagnosticCorrect,
      falseNegativeCount: diagnostic.roleHelpDiagnosticFalseNegativeCount,
      falsePositiveCount: diagnostic.roleHelpDiagnosticFalsePositiveCount,
      recall: diagnostic.roleHelpDiagnosticRecall,
      precision: diagnostic.roleHelpDiagnosticPrecision,
      ambiguityCount: diagnostic.roleHelpDiagnosticAmbiguityCount,
      executionErrors: diagnostic.executionErrors,
      sourceReport: DIAGNOSTIC_REPORT_PATH,
    },
    action: {
      results: {
        evidence: actionCommand ? commandEvidence(actionCommand) : null,
        actual: actionCommand?.parsed || null,
        status: actionCommand?.parsed?.status || null,
      },
    },
    authorization: {
      results: {
        status: authorizationCommands.length > 0
          && authorizationCommands.every(({ parsed }) => parsed?.status === 'PASS')
          && authorizationStatuses.length > 0
          && authorizationStatuses.every((value) => value === 'ALLOW')
          ? 'PASS'
          : 'FAIL',
        evidence: authorizationCommands.map(commandEvidence),
        actualStatuses: authorizationStatuses,
        actual: authorizationCommands.map(({ id, parsed }) => ({ id, output: parsed })),
      },
    },
    tenant: {
      results: {
        status: tenantOutput?.status === 'PASS' && actualRoleCases.length === 8 ? 'PASS' : 'FAIL',
        evidence: tenantCommand ? [commandEvidence(tenantCommand)] : [],
        actual: tenantOutput,
        actualRoleCases,
        actualRoleOrientationCases,
      },
    },
    writeCounts: Object.fromEntries(ZERO_WRITE_FIELDS.map((field) => [field, counterEvidence(field, historicalCommands, diagnostic)])),
    externalAiCounts: Object.fromEntries(ZERO_EXTERNAL_AI_FIELDS.map((field) => [field, counterEvidence(field, historicalCommands, diagnostic)])),
    serviceBrowser: {
      serviceCommands: SERVICE_COMMAND_IDENTITIES.map((command) => ({ command, executed: false })),
      browserCommands: BROWSER_COMMAND_IDENTITIES.map((command) => ({ command, executed: false })),
    },
  };
}

function assertBaselineContract(report, { sourceFiles = [] } = {}) {
  assert.ok(report && typeof report === 'object', 'baseline report is an object');
  assert.equal(report.baselineVersion, 'M18-TYPED-SEMANTIC-EVIDENCE-BASELINE-V1', 'baseline version');

  const expectedPaths = normalizeSourceFiles(sourceFiles);
  const actualFiles = report.sourceIdentity?.runtimeFiles;
  assert.ok(Array.isArray(actualFiles), 'baseline report has runtime files');
  assert.deepEqual(actualFiles.map(({ path: filePath }) => filePath), expectedPaths, 'runtime file order is pinned');
  assert.equal(actualFiles.length, expectedPaths.length, 'baseline report has captured runtime identity');
  for (const item of actualFiles) {
    assert.match(item.sha256, /^[A-F0-9]{64}$/u, `runtime source hash is captured: ${item.path}`);
  }

  assertApprovedHistoricalEvidence(report);
  assert.equal(report.historicalRegression.status, 'PASS', 'historical regression spine passes');

  const diagnostic = report.roleHelpDiagnostic;
  assert.ok(diagnostic, 'baseline report has role-help diagnostic');
  assert.equal(diagnostic.positiveCaseCount, 80, 'role-help positive baseline');
  assert.equal(diagnostic.negativeControlCount, 32, 'role-help negative baseline');
  assert.equal(diagnostic.correctCount, 35, 'role-help correct baseline');
  assert.equal(diagnostic.falseNegativeCount, 45, 'role-help false-negative baseline');
  assert.equal(diagnostic.falsePositiveCount, 1, 'role-help false-positive baseline');
  assert.equal(diagnostic.recall, 0.4375, 'role-help recall baseline');
  assert.equal(diagnostic.precision, 35 / 36, 'role-help precision baseline');
  assert.equal(diagnostic.executionErrors, 0, 'role-help diagnostic has no execution errors');

  assert.ok(report.action?.results, 'baseline report has action results');
  assertCommandEvidence(report.action.results.evidence, 'action');
  assert.ok(report.action.results.actual && typeof report.action.results.actual === 'object', 'action result has actual approved output');
  assert.equal(report.action.results.actual.status, 'PASS', 'action status comes from approved output');
  assert.equal(report.action.results.status, 'PASS', 'action baseline passes');
  assert.ok(report.authorization?.results, 'baseline report has authorization results');
  assert.ok(Array.isArray(report.authorization.results.evidence) && report.authorization.results.evidence.length > 0, 'authorization result has actual command evidence');
  for (const evidence of report.authorization.results.evidence) assertCommandEvidence(evidence, `authorization ${evidence.id}`);
  assert.ok(Array.isArray(report.authorization.results.actualStatuses) && report.authorization.results.actualStatuses.length > 0, 'authorization result has actual output statuses');
  assert.ok(report.authorization.results.actualStatuses.every((value) => value === 'ALLOW'), 'authorization status comes from approved output');
  assert.equal(report.authorization.results.status, 'PASS', 'authorization baseline passes');
  assert.ok(report.tenant?.results, 'baseline report has tenant results');
  assert.ok(Array.isArray(report.tenant.results.evidence) && report.tenant.results.evidence.length > 0, 'tenant result has actual command evidence');
  for (const evidence of report.tenant.results.evidence) assertCommandEvidence(evidence, `tenant ${evidence.id}`);
  assert.ok(report.tenant.results.actual && typeof report.tenant.results.actual === 'object', 'tenant result has actual approved output');
  assert.equal(report.tenant.results.actual.status, 'PASS', 'tenant status comes from approved output');
  assert.ok(report.tenant.results.actualRoleCases?.length > 0, 'tenant result has actual role output');
  assert.equal(report.tenant.results.status, 'PASS', 'tenant baseline passes');

  assert.ok(report.writeCounts, 'baseline report has write counts');
  for (const field of ZERO_WRITE_FIELDS) assertCounterEvidence(report.writeCounts[field], field, 'write');
  assert.ok(report.externalAiCounts, 'baseline report has external-AI counts');
  for (const field of ZERO_EXTERNAL_AI_FIELDS) assertCounterEvidence(report.externalAiCounts[field], field, 'external-AI');

  assert.ok(Array.isArray(report.serviceBrowser?.serviceCommands), 'baseline report has service command identities');
  assert.ok(Array.isArray(report.serviceBrowser?.browserCommands), 'baseline report has browser command identities');
  assert.ok(report.serviceBrowser.serviceCommands.every(({ executed }) => executed === false), 'service identities are not executed in Stage 0');
  assert.ok(report.serviceBrowser.browserCommands.every(({ executed }) => executed === false), 'browser identities are not executed in Stage 0');
}

function assertRejectsUnsafeBaseline(report) {
  const changedSource = structuredClone(report);
  changedSource.sourceIdentity.runtimeFiles[0].sha256 = '0'.repeat(64);
  assert.throws(() => assertBaselineContract(changedSource), /source hash matches approved identity/u, 'changed source hash is rejected');

  const changedWrites = structuredClone(report);
  changedWrites.writeCounts.businessWriteExecution.value = 1;
  changedWrites.writeCounts.businessWriteExecution.status = 'OBSERVED_NONZERO';
  assert.throws(() => assertBaselineContract(changedWrites), /businessWriteExecution zero guard is proven by evidence/u, 'nonzero write count is rejected');

  const changedExternalAi = structuredClone(report);
  changedExternalAi.externalAiCounts.externalLlmNetworkCallCount.value = 1;
  changedExternalAi.externalAiCounts.externalLlmNetworkCallCount.status = 'OBSERVED_NONZERO';
  assert.throws(() => assertBaselineContract(changedExternalAi), /externalLlmNetworkCallCount zero guard is proven by evidence/u, 'external-AI count is rejected');
}

function assertReviewRound1Contract(report) {
  const missingCommandEvidence = structuredClone(report);
  delete missingCommandEvidence.historicalRegression.commandEvidence;
  assert.throws(
    () => assertBaselineContract(missingCommandEvidence),
    /required per-command historical command evidence/u,
    'per-command evidence is required by the baseline contract',
  );

  const expectedCommands = HISTORICAL_CHECKS.map(([id, scriptPath]) => ({ id, scriptPath, command: `node ${scriptPath}` }));
  assert.deepEqual(
    report.historicalRegression?.commandEvidence?.map(({ id, scriptPath, command }) => ({ id, scriptPath, command })),
    expectedCommands,
    'approved historical command identities are surfaced',
  );
  for (const evidence of report.historicalRegression.commandEvidence) {
    assert.equal(typeof evidence.exitCode, 'number', `${evidence.id} exit code is captured`);
    assert.match(evidence.status, /^(PASS|FAIL)$/u, `${evidence.id} status is captured`);
    assert.equal(typeof evidence.stdout, 'string', `${evidence.id} stdout is captured`);
    assert.equal(typeof evidence.stderr, 'string', `${evidence.id} stderr is captured`);
  }

  const changedCommand = structuredClone(report);
  changedCommand.historicalRegression.commandEvidence[0].scriptPath = 'backend/scripts/not-approved.js';
  assert.throws(() => assertBaselineContract(changedCommand), /approved historical command identity/u, 'arbitrary command identity is rejected');
  const arbitraryInput = HISTORICAL_CHECKS.map(([id, scriptPath], index) => ({
    id,
    scriptPath: index === 0 ? 'backend/scripts/m18_basic_user_language_regression_01_check.js' : scriptPath,
  }));
  assert.throws(
    () => collectBaseline({ sourceFiles: [], checkCommands: arbitraryInput }),
    /approved historical command identity/u,
    'arbitrary successful script is rejected before execution',
  );

  assert.ok(report.action.results.evidence, 'action result has actual command evidence');
  assert.ok(report.action.results.actual, 'action result has actual parsed output');
  assert.ok(report.authorization.results.evidence, 'authorization result has actual command evidence');
  assert.ok(report.authorization.results.actualStatuses?.length > 0, 'authorization result has actual output statuses');
  assert.ok(report.tenant.results.evidence, 'tenant result has actual command evidence');
  assert.ok(report.tenant.results.actualRoleCases?.length > 0, 'tenant result has actual role output');

  const syntheticAction = structuredClone(report);
  syntheticAction.action.results.actual = null;
  assert.throws(() => assertBaselineContract(syntheticAction), /action result has actual approved output/u, 'synthetic action result is rejected');
  const syntheticAuthorization = structuredClone(report);
  syntheticAuthorization.authorization.results.actualStatuses = [];
  assert.throws(() => assertBaselineContract(syntheticAuthorization), /authorization result has actual output statuses/u, 'synthetic authorization result is rejected');
  const syntheticTenant = structuredClone(report);
  syntheticTenant.tenant.results.actual = null;
  assert.throws(() => assertBaselineContract(syntheticTenant), /tenant result has actual approved output/u, 'synthetic tenant result is rejected');

  for (const field of ZERO_WRITE_FIELDS) {
    assert.ok(report.writeCounts[field], `${field} has explicit counter evidence`);
    assert.ok(['OBSERVED_ZERO', 'OBSERVED_NONZERO', 'MISSING_REQUIRED_EVIDENCE'].includes(report.writeCounts[field].status), `${field} counter status is explicit`);
  }
  for (const field of ZERO_EXTERNAL_AI_FIELDS) {
    assert.ok(report.externalAiCounts[field], `${field} has explicit counter evidence`);
    assert.ok(['OBSERVED_ZERO', 'OBSERVED_NONZERO', 'MISSING_REQUIRED_EVIDENCE'].includes(report.externalAiCounts[field].status), `${field} counter status is explicit`);
  }
  const missingCounter = structuredClone(report);
  delete missingCounter.writeCounts.draftCreation;
  assert.throws(() => assertBaselineContract(missingCounter), /required write counter evidence/u, 'missing write counter evidence is rejected');
  const missingExternalCounter = structuredClone(report);
  delete missingExternalCounter.externalAiCounts.llmApiSecretCount;
  assert.throws(() => assertBaselineContract(missingExternalCounter), /required external-AI counter evidence/u, 'missing external-AI counter evidence is rejected');
}

function runTrustedStage0({
  repoRoot = REPO_ROOT,
  expectedHeadSha,
  sourceManifest,
  runtimeProof,
  trustedCorpusIdentity,
  schemaIdentity,
  securityObservation,
}) {
  const failureReasons = [];
  const expectedHead = String(expectedHeadSha || '').trim().toUpperCase();
  if (!/^[A-F0-9]{40}$/u.test(expectedHead)) failureReasons.push('EXPECTED_HEAD_INVALID');
  let actualHead = '';
  try {
    actualHead = String(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout || '').trim().toUpperCase();
  } catch {
    failureReasons.push('CURRENT_HEAD_UNAVAILABLE');
  }
  if (actualHead && actualHead !== expectedHead) failureReasons.push('CURRENT_HEAD_MISMATCH');
  if (!sourceManifest || sourceManifest.safe !== true || !/^[A-F0-9]{64}$/u.test(String(sourceManifest.manifestSha256 || ''))) {
    failureReasons.push('RUN_START_MANIFEST_INVALID');
  }
  if (!runtimeProof || runtimeProof.healthcheck !== 'PASS') failureReasons.push('RUNTIME_HEALTH_INVALID');
  if (runtimeProof && runtimeProof.mode !== 'NEW') failureReasons.push('RUNTIME_AUTHORITY_MODE_INVALID');
  if (runtimeProof && runtimeProof.authoritativePath !== 'NEW_TYPED_EVIDENCE') failureReasons.push('RUNTIME_AUTHORITY_PATH_INVALID');
  if (runtimeProof && runtimeProof.semanticAuthorityCount !== 1) failureReasons.push('SEMANTIC_AUTHORITY_COUNT_INVALID');
  if (runtimeProof && runtimeProof.shadowSemanticAuthorityCount !== 0) failureReasons.push('SHADOW_AUTHORITY_COUNT_INVALID');
  if (runtimeProof && runtimeProof.runtimeFallbackCount !== 0) failureReasons.push('RUNTIME_FALLBACK_COUNT_INVALID');
  if (runtimeProof && runtimeProof.downstreamSemanticRedecisionCount !== 0) failureReasons.push('DOWNSTREAM_REDECISION_COUNT_INVALID');
  if (trustedCorpusIdentity?.safe === false) failureReasons.push('TRUSTED_CORPUS_IDENTITY_INVALID');
  if (schemaIdentity?.safe === false) failureReasons.push('SCHEMA_IDENTITY_INVALID');
  const security = securityObservation || {};
  for (const field of ['businessWriteExecution', 'authorizationMutation', 'externalLlmProviderCount', 'externalLlmNetworkCallCount', 'llmApiSecretCount']) {
    if (Number(security[field] || 0) !== 0) failureReasons.push(`SECURITY_COUNTER_NONZERO:${field}`);
  }
  return {
    status: failureReasons.length === 0 ? 'GREEN' : 'BLOCKED',
    failureClass: failureReasons.length === 0 ? null : 'PROVENANCE_INVALID',
    failureReasons,
    provenanceReceiptInput: {
      repoRoot,
      expectedHeadSha: expectedHead,
      sourceManifestSha256: sourceManifest?.manifestSha256 || null,
      runtimeProof: runtimeProof || null,
      securityObservation: security,
    },
  };
}

function runTrustedBehaviorScore({
  runtime,
  trustedCorpus = [],
  expectations = {},
  sessionFactory,
  transport,
  compare,
}) {
  assert.ok(Array.isArray(trustedCorpus), 'trusted corpus must be an array');
  assert.equal(typeof transport, 'function', 'trusted Stage 1 transport');
  assert.equal(typeof compare, 'function', 'trusted Stage 1 comparator');
  const executed = [];
  let TP = 0;
  let FN = 0;
  let FP = 0;
  let TN = 0;
  let firstFailure = null;
  for (const testCase of trustedCorpus) {
    const id = testCase?.id || testCase?.CASE_ID || `CASE-${executed.length + 1}`;
    const expected = Object.prototype.hasOwnProperty.call(expectations, id)
      ? expectations[id]
      : testCase?.expected;
    let actual;
    try {
      actual = transport({ testCase, expected, runtime, sessionFactory });
    } catch (error) {
      actual = { error: error instanceof Error ? error.message : String(error) };
    }
    const comparison = compare({ testCase, expected, actual, runtime });
    const passed = comparison === true || comparison?.pass === true;
    const category = comparison?.category || testCase?.category;
    if (category === 'TP') TP += 1;
    else if (category === 'FP') FP += 1;
    else if (category === 'FN') FN += 1;
    else if (category === 'TN') TN += 1;
    if (!passed && !firstFailure) {
      firstFailure = { id, expected, actual, comparison };
    }
    executed.push({ id, expected, actual, passed, comparison });
  }
  return {
    status: firstFailure ? 'RED_REAL_BEHAVIOR_DIVERGENCE' : 'GREEN',
    total: executed.length,
    TP,
    FN,
    FP,
    TN,
    executed,
    firstFailure,
  };
}

function createTrustedRunResult({ stage0, score, provenanceReceipt }) {
  const status = stage0?.status !== 'GREEN' ? stage0?.status || 'BLOCKED' : score?.status || 'BLOCKED';
  return { status, stage0, score, provenanceReceipt: provenanceReceipt || null };
}

function parseLastJson(stdout) {
  const text = String(stdout || '').trim();
  try { return JSON.parse(text); } catch {}
  const starts = [...text.matchAll(/\n(?=\{)/gu)].map((match) => match.index + 1);
  for (const start of starts.reverse()) {
    try { return JSON.parse(text.slice(start)); } catch {}
  }
  return null;
}

async function runTrustedStage0AndScore() {
  const replay = readJson(TRUSTED_REPLAY_PATH);
  const manifest = readJson(TRUSTED_CORPUS_PATH);
  manifest.caseCount = manifest.cases.length;
  assert.equal(manifest.caseCount, 112, 'trusted corpus case count');
  assert.equal(manifest.roleCaseCount, 80, 'trusted corpus positive count');
  assert.equal(manifest.negativeControlCount, 32, 'trusted corpus negative count');
  assert.equal(replay.rows.length, 112, 'trusted replay row count');
  assert.equal(replay.corpusHash, sha256(TRUSTED_CORPUS_PATH), 'trusted corpus identity');

  const expectedByCase = new Map(replay.rows.map((row) => [row.caseId, row.expectedRoleHelp === true]));
  assert.equal(expectedByCase.size, 112, 'trusted expectations are unique');
  for (const testCase of manifest.cases) {
    assert.equal(expectedByCase.get(testCase.CASE_ID), testCase.EXPECTED_ROLE_HELP === true,
      `trusted expectation mismatch ${testCase.CASE_ID}`);
  }

  const runtimeProofResult = spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'backend', 'scripts', 'm18_task13_current_source_startup_01_check.mjs'),
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180_000,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const runtimeProof = parseLastJson(runtimeProofResult.stdout);
  assert.equal(runtimeProofResult.status, 0, `current-source runtime proof failed: ${runtimeProofResult.stderr}`);
  assert(runtimeProof?.provenance?.runStartManifestSha256, 'runtime proof start manifest');
  assert.equal(runtimeProof?.status, 'PASS', 'current-source runtime proof status');

  const authority = runtimeProof.authority || {};
  const stage0 = runTrustedStage0({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    sourceManifest: { safe: true, manifestSha256: runtimeProof.provenance.runStartManifestSha256 },
    runtimeProof: {
      healthcheck: runtimeProof.startup?.healthcheck,
      mode: authority.mode,
      authoritativePath: authority.authoritativePath,
      semanticAuthorityCount: authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT,
      shadowSemanticAuthorityCount: authority.SHADOW_SEMANTIC_AUTHORITY_COUNT,
      runtimeFallbackCount: authority.RUNTIME_SEMANTIC_FALLBACK_COUNT,
      downstreamSemanticRedecisionCount: authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT,
    },
    trustedCorpusIdentity: { safe: true, corpusHash: replay.corpusHash, total: replay.total },
    schemaIdentity: { safe: true, schemaVersion: 'SEFER-ABI-CANONICAL-REQUEST-V3' },
    securityObservation: {
      businessWriteExecution: 0,
      authorizationMutation: 0,
      externalLlmProviderCount: 0,
      externalLlmNetworkCallCount: 0,
      llmApiSecretCount: 0,
    },
  });
  if (stage0.status !== 'GREEN') {
    const result = { status: stage0.status, STAGE0_STARTED: 'YES', STAGE1_STARTED: 'NO', stage0 };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return result;
  }

  const currentReport = await runGeneralizationDiagnostic({
    manifest,
    manifestSourcePath: path.join(REPO_ROOT, TRUSTED_CORPUS_PATH),
    authorityMode: 'NEW',
    enforceCorpusIndependence: false,
  });
  const currentRows = new Map(currentReport.rows.map((row) => [row.caseId, row]));
  const trustedCorpus = replay.rows.map((row) => ({
    id: row.caseId,
    expected: row.expectedRoleHelp === true,
  }));
  const score = runTrustedBehaviorScore({
    runtime: { authorityMode: 'NEW', source: TRUSTED_CORPUS_PATH },
    trustedCorpus,
    transport: ({ testCase }) => currentRows.get(testCase.id),
    compare: ({ expected, actual }) => {
      const expectedPositive = expected === true;
      const actualPositive = actual?.roleHelpCorrect === true;
      const actualLike = actual?.roleHelpLike === true;
      const category = expectedPositive ? (actualPositive ? 'TP' : 'FN') : (actualLike ? 'FP' : 'TN');
      return {
        pass: expectedPositive ? actualPositive : !actualLike,
        category,
        actualCanonicalFields: actual?.actualCanonicalFields || null,
      };
    },
  });
  const result = {
    status: score.status,
    STAGE0_STARTED: 'YES',
    STAGE1_STARTED: 'YES',
    stage0,
    score: {
      status: score.status,
      total: score.total,
      TP: score.TP,
      FN: score.FN,
      FP: score.FP,
      TN: score.TN,
      firstFailure: score.firstFailure,
    },
    provenance: runtimeProof.provenance,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = score.status === 'GREEN' && score.TP === 80 && score.FN === 0 && score.FP === 0 && score.TN === 32 ? 0 : 1;
  return result;
}

export {
  HISTORICAL_CHECKS,
  classifyHistoricalGate,
  collectBaseline,
  assertBaselineContract,
  runTrustedStage0,
  runTrustedBehaviorScore,
  createTrustedRunResult,
  runTrustedStage0AndScore,
};

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  if (process.argv.includes('--stage0-self-test')) {
    const stage0 = runTrustedStage0({
      repoRoot: REPO_ROOT,
      expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
      sourceManifest: { safe: true, manifestSha256: 'A'.repeat(64) },
      runtimeProof: {
        healthcheck: 'PASS',
        mode: 'NEW',
        authoritativePath: 'NEW_TYPED_EVIDENCE',
        semanticAuthorityCount: 1,
        shadowSemanticAuthorityCount: 0,
        runtimeFallbackCount: 0,
        downstreamSemanticRedecisionCount: 0,
      },
      trustedCorpusIdentity: { safe: true },
      schemaIdentity: { safe: true },
      securityObservation: { businessWriteExecution: 0, externalLlmProviderCount: 0 },
    });
    const score = runTrustedBehaviorScore({
      trustedCorpus: [{ id: 'STAGE1_BOUNDARY_PROBE', expected: 'EXPECTED' }],
      transport: () => ({ actual: 'ACTUAL' }),
      compare: ({ expected, actual }) => expected === actual,
    });
    console.log(JSON.stringify(createTrustedRunResult({ stage0, score }), null, 2));
    process.exitCode = stage0.status === 'GREEN' && score.status === 'RED_REAL_BEHAVIOR_DIVERGENCE' ? 0 : 1;
  } else if (process.argv.includes('--stage0-and-score')) {
    await runTrustedStage0AndScore();
  } else {
    console.log('status=RUN_SCOPED_PROVENANCE_REQUIRED');
    console.log('historical source-pin and review ceremony are not active authorities');
  }
}
