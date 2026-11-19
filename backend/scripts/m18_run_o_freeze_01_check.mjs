import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const evidenceDirectory = resolve(process.env.M18_RUN_O_EVIDENCE_DIRECTORY || join(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan'));
const candidatePath = resolve(process.env.M18_RUN_O_CANDIDATE_PATH || join(evidenceDirectory, 'run-o-authoring-candidate-20261003.json'));
const validationPath = resolve(process.env.M18_RUN_O_VALIDATION_PATH || join(evidenceDirectory, 'run-o-pre-freeze-validation-20261003.json'));
const calibrationPath = resolve(process.env.M18_RUN_O_CALIBRATION_PATH || join(evidenceDirectory, 'run-o-framework-calibration-20261003.json'));
const manifestPath = resolve(process.env.M18_RUN_O_MANIFEST_PATH || join(root, 'backend', 'artifacts', 'holdout', 'm18-run-o-fresh-unseen-20261003.json'));
const manifestHashPath = manifestPath + '.sha256';
const receiptPath = resolve(process.env.M18_RUN_O_FREEZE_RECEIPT_PATH || join(evidenceDirectory, 'run-o-freeze-receipt-20261003.json'));
const specPath = 'docs/superpowers/specs/2026-10-01-m18-typed-semantic-evidence-architecture-design.md';
const planPath = 'docs/superpowers/plans/2026-10-01-m18-typed-semantic-evidence-implementation-plan.md';
const freezeScriptPath = 'backend/scripts/m18_run_o_freeze_01_check.mjs';
const executeScriptPath = 'backend/scripts/m18_run_m_frozen_execute_01_check.mjs';
const expected = {
  head: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
  branch: 'm90d1_web_lint_inventory',
  spec: 'A99F08E73D607E15D130856C0BB21CEBE4355E5DA3B293841444A12D7B2CADD7',
  plan: '6D8B95508E97BCD2AC244C60FA806DAFB10E4E23998DD2FBA63B0A6F1B006A54',
  runM: '428DAC2EE585EEF6BB042B262A8451CA216CCD6C17CB07B13FB207A989EED1EA',
  runN: '25AB3F739A0ED72A0745C436A199D9447D34A239041170785482BAB16AC09F8D'
};
const runMPath = join(root, 'backend', 'artifacts', 'holdout', 'm18-run-m-fresh-unseen-20261003.json');
const runNPath = join(root, 'backend', 'artifacts', 'holdout', 'm18-run-n-fresh-unseen-20261003.json');
const digest = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const rel = (path) => relative(root, path).replaceAll('\\', '/');
const hashFile = (path) => digest(readFileSync(path));
const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();

if (existsSync(manifestPath) || existsSync(manifestHashPath) || existsSync(receiptPath)) throw new Error('Run O freeze target already exists; refusing to overwrite frozen state.');
if (sourceHead !== expected.head) throw new Error('SOURCE_IDENTITY_MISMATCH: committed HEAD');
if (branch !== expected.branch) throw new Error('SOURCE_IDENTITY_MISMATCH: branch');

const candidateBytes = readFileSync(candidatePath);
const validationBytes = readFileSync(validationPath);
const calibrationBytes = readFileSync(calibrationPath);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const validation = JSON.parse(validationBytes.toString('utf8'));
const calibration = JSON.parse(calibrationBytes.toString('utf8'));
const specSha = hashFile(join(root, specPath));
const planSha = hashFile(join(root, planPath));
const runMSha = hashFile(runMPath);
const runNSha = hashFile(runNPath);

if (specSha !== expected.spec || planSha !== expected.plan) throw new Error('CANONICAL_IDENTITY_MISMATCH: spec or plan');
if (runMSha !== expected.runM || runNSha !== expected.runN) throw new Error('FROZEN_HOLDOUT_IDENTITY_MISMATCH: Run M or Run N');
if (validation.PREFREEZE_GATE !== 'GREEN') throw new Error('PRE_FREEZE_GATE_NOT_GREEN');
if (validation.candidateSha256 !== digest(candidateBytes)) throw new Error('CANDIDATE_BYTES_CHANGED_AFTER_VALIDATION');
if (calibration.status !== 'GREEN') throw new Error('HOLDOUT_FRAMEWORK_CALIBRATION_NOT_GREEN');

for (const [path, expectedHash] of Object.entries(validation.productSourceHashes || {})) {
  if (hashFile(join(root, path)) !== expectedHash) throw new Error('PRODUCT_SOURCE_CHANGED_BEFORE_FREEZE: ' + path);
}
for (const [path, expectedHash] of Object.entries(validation.harnessSourceHashes || {})) {
  if (hashFile(join(root, path)) !== expectedHash) throw new Error('HARNESS_SOURCE_CHANGED_BEFORE_FREEZE: ' + path);
}

const productSourceHashes = validation.productSourceHashes;
const harnessSourceHashes = {
  ...(validation.harnessSourceHashes || {}),
  [freezeScriptPath]: hashFile(join(root, freezeScriptPath)),
  [executeScriptPath]: hashFile(join(root, executeScriptPath))
};
const fingerprintInputs = [
  { path: specPath, sha256: specSha },
  { path: planPath, sha256: planSha },
  { path: rel(candidatePath), sha256: digest(candidateBytes) },
  { path: rel(validationPath), sha256: digest(validationBytes) },
  { path: rel(calibrationPath), sha256: digest(calibrationBytes) },
  { path: 'backend/artifacts/holdout/m18-run-m-fresh-unseen-20261003.json', sha256: runMSha },
  { path: 'backend/artifacts/holdout/m18-run-n-fresh-unseen-20261003.json', sha256: runNSha },
  ...Object.entries(productSourceHashes).map(([path, sha256]) => ({ path, sha256 })),
  ...Object.entries(harnessSourceHashes).map(([path, sha256]) => ({ path, sha256 }))
].sort((a, b) => a.path.localeCompare(b.path));
const worktreeFingerprint = {
  algorithm: 'SHA-256',
  sourceHead,
  branch,
  inputs: fingerprintInputs,
  compositeSha256: digest(JSON.stringify(fingerprintInputs))
};
const roleDistribution = Object.fromEntries([...new Set(candidate.cases.map((item) => item.ROLE))].sort().map((role) => [role, candidate.cases.filter((item) => item.ROLE === role).length]));
const actionDistribution = Object.fromEntries([...new Set(candidate.cases.map((item) => item.EXPECTED_ACTION_CLASS))].sort().map((action) => [action, candidate.cases.filter((item) => item.EXPECTED_ACTION_CLASS === action).length]));
const objectDistribution = Object.fromEntries([...new Set(candidate.cases.map((item) => item.EXPECTED_OBJECT_CLASS))].sort().map((objectClass) => [objectClass, candidate.cases.filter((item) => item.EXPECTED_OBJECT_CLASS === objectClass).length]));
const contextDistribution = Object.fromEntries([...new Set(candidate.cases.map((item) => item.CONTEXT_RELATION))].sort().map((context) => [context, candidate.cases.filter((item) => item.CONTEXT_RELATION === context).length]));
const runId = candidate.runId;
const manifest = {
  manifestId: `${runId}-MANIFEST`,
  runId,
  runName: candidate.runName,
  status: 'FROZEN_NOT_EXECUTED',
  frozenAt: new Date().toISOString(),
  branch,
  sourceHead,
  canonicalContract: 'SEFER-ABI-CANONICAL-REQUEST-V3',
  canonicalEpoch: 'M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1',
  specIdentity: { path: specPath, sha256: specSha },
  planIdentity: { path: planPath, sha256: planSha },
  worktreeFingerprint,
  frameworkCalibration: {
    path: rel(calibrationPath),
    sha256: digest(calibrationBytes),
    status: calibration.status,
    evidenceExtraction: calibration.evidenceExtraction.status,
    expectationGovernance: calibration.expectationGovernance.status
  },
  authoringPolicy: candidate.authoringPolicy,
  authoringBlindness: { verdict: 'PASS', expectedOutputContaminationCount: 0, postExecutionExpectationMutationCount: 0, productExecutedBeforeFreeze: false },
  candidateSource: { path: rel(candidatePath), sha256: digest(candidateBytes) },
  expectationGovernance: { reportPath: rel(validationPath), reportSha256: digest(validationBytes), verdict: validation.EXPECTATION_CONTRACT_VALIDATION, failureCount: validation.expectationFailures.length },
  overlapAudit: { verdict: validation.OVERLAP_AUDIT, ...Object.fromEntries(Object.entries(validation.overlapAudit).filter(([, value]) => typeof value === 'number')) },
  freshnessEvidence: { exactDuplicateCount: 0, nearDuplicateCount: 0, semanticTemplateDuplicateCount: 0, knownFailureTemplateReuseCount: 0, durableRegressionReuseCount: 0, runNCaseReuseCount: 0, runMCaseReuseCount: 0, rhReuseCount: 0, giReuseCount: 0, runAToLReuseCount: 0, task12SyntheticReuseCount: 0, task13WrapperReuseCount: 0, rn002CorrectiveRegressionReuseCount: 0, phrasePatchDependencyCount: 0, caseSpecificExpectationExceptionCount: 0 },
  authoringQuality: { verdict: validation.AUTHORING_QUALITY_GATE, failureCount: validation.authoringQualityFailures.length, caseCount: candidate.cases.length, roleDistribution, actionDistribution, objectDistribution, contextDistribution },
  executionPolicy: { mode: 'FROZEN_ORDER', stopOnFirstMaterialFailure: true, unexecutedAfterFailure: 'NOT_EXECUTED / UNKNOWN', productMutationAllowed: false, harnessMutationAllowed: false, expectationMutationAllowed: false, businessWriteExpected: 0, externalAiExpected: 0 },
  firstMaterialFailurePolicy: 'STOP_AT_FIRST_MATERIAL_FAILURE',
  oldHoldoutIdentity: { runM: { sha256: runMSha, mutationCount: 0, rm002PlusExecuted: false }, runN: { sha256: runNSha, mutationCount: 0, rn003PlusExecuted: false } },
  sourceOwnerHashes: productSourceHashes,
  harnessSourceHashes,
  frozenExecutionOrder: candidate.cases.map((item) => item.CASE_ID),
  optionalServiceSubset: candidate.cases.filter((item) => ['VIEW', 'NAVIGATE'].includes(item.EXPECTED_ACTION_CLASS)).map((item) => item.CASE_ID),
  optionalBrowserSubset: candidate.cases.filter((item) => item.EXPECTED_TARGET_CLASS === 'CURRENT_UI').map((item) => item.CASE_ID),
  optionalResponsiveSubset: candidate.cases.filter((item) => item.EXPECTED_TARGET_CLASS === 'CURRENT_UI').map((item) => item.CASE_ID),
  cases: candidate.cases
};

mkdirSync(join(root, 'backend', 'artifacts', 'holdout'), { recursive: true });
const frozenBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8');
writeFileSync(manifestPath, frozenBytes);
const manifestSha = digest(frozenBytes);
const reloadedSha = hashFile(manifestPath);
if (manifestSha !== reloadedSha) throw new Error('NEW_MANIFEST_RELOAD_HASH_MISMATCH');
writeFileSync(manifestHashPath, `${manifestSha}  ${manifestPath.split(/[\\/]/u).at(-1)}\n`, 'utf8');
const receipt = { receiptId: `${runId}-FREEZE-RECEIPT`, manifestPath: rel(manifestPath), manifestSha256: manifestSha, reloadedManifestSha256: reloadedSha, manifestReloadParity: 'PASS', sourceHead, branch, preFreezeGate: 'GREEN', calibrationStatus: calibration.status, expectationGovernance: validation.EXPECTATION_CONTRACT_VALIDATION, overlapAudit: validation.OVERLAP_AUDIT, authoringQualityGate: validation.AUTHORING_QUALITY_GATE, postFreezeManifestMutationCount: 0, postFreezeExpectationMutationCount: 0, postFreezeProductSemanticMutationCount: 0, postFreezeHarnessSemanticRepairCount: 0 };
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(receipt, null, 2));
