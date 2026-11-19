import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const defaultEvidenceDirectory = join(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const candidatePath = resolve(process.env.M18_RUN_CANDIDATE_PATH || join(defaultEvidenceDirectory, 'run-m-authoring-candidate-20261003.json'));
const reportPath = resolve(process.env.M18_RUN_VALIDATION_PATH || join(defaultEvidenceDirectory, 'run-m-pre-freeze-validation-20261003.json'));
const writeReport = process.argv.includes('--write-report');
const REQUIRED_CASE_FIELDS = ['CASE_ID', 'ROLE', 'TENANT_CONTEXT', 'SURFACE_CONTEXT', 'ACTIVE_TASK_CONTEXT', 'REFERENCE_CONTEXT', 'PRECONDITION', 'UTTERANCE', 'IMMEDIATE_REQUESTED_ACTION', 'ULTIMATE_GOAL', 'REQUEST_FORM', 'OBJECT_CLASS', 'CONTEXT_RELATION', 'EXPECTED_SEMANTIC_SCOPE', 'EXPECTED_ACTION_CLASS', 'EXPECTED_OBJECT_CLASS', 'EXPECTED_RESOLUTION_STATUS', 'EXPECTED_OPERATION', 'EXPECTED_CAPABILITY', 'EXPECTED_AUTHORIZATION', 'EXPECTED_WORKFLOW', 'EXPECTED_TARGET_CLASS', 'EXPECTED_BUSINESS_WRITE_EXECUTION', 'EXPECTED_EXTERNAL_AI_CALL_COUNT', 'RATIONALE', 'SEMANTIC_TEMPLATE_ID'];
const REQUIRED_ACTION_COVERAGE = ['EXPLAIN', 'VIEW', 'NAVIGATE', 'CONTINUE', 'NEXT', 'PREVIOUS', 'COMPARE', 'CREATE', 'UPDATE'];
const REQUIRED_ROLES = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const PRODUCT_SOURCE_PATHS = ['backend/src/ai/chat/turkishSemanticFeatures.js', 'backend/src/ai/chat/semanticEvidence.js', 'backend/src/ai/chat/semanticEvidenceComposer.js', 'backend/src/ai/chat/canonicalSemanticRequest.js', 'backend/src/ai/chat/canonicalSemanticContext.js', 'backend/src/ai/chat/canonicalConversationState.js', 'backend/src/ai/chat/semanticIntentPlanner.js', 'backend/src/ai/chat/conversationRouting.js', 'backend/src/ai/chat/authorizationGate.js', 'backend/src/ai/chat/copilotUiElementAnchor.js', 'backend/src/ai/chat/helpComposer.js', 'backend/src/ai/chat/userFacingLanguageNormalizer.js', 'backend/src/ai/service.js'];
const HARNESS_SOURCE_PATHS = ['backend/scripts/m18_run_m_authoring_validate_01_check.mjs', 'backend/scripts/m18_run_m_freeze_01_check.mjs', 'backend/scripts/m18_run_m_frozen_execute_01_check.mjs'];
const IGNORED_DIRECTORY_NAMES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo']);
const AUDITED_EXTENSIONS = new Set(['.json', '.md', '.js', '.mjs', '.cjs', '.txt', '.yaml', '.yml']);
const AUDIT_ROOTS = [
  join(root, 'backend', 'artifacts', 'harness-topology'),
  join(root, 'backend', 'artifacts', 'holdout'),
  join(root, 'backend', 'scripts'),
  join(root, '.superpowers', 'sdd')
];
const SELF_EXCLUDED_PATHS = new Set([relative(root, candidatePath).replaceAll('\\', '/'), relative(root, reportPath).replaceAll('\\', '/'), 'backend/scripts/m18_run_m_authoring_validate_01_check.mjs']);
const digest = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const normalizedText = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const tokens = (value) => normalizedText(value).split(' ').filter((token) => token.length > 2);
const tokenJaccard = (left, right) => {
  const a = new Set(tokens(left)); const b = new Set(tokens(right));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};
const semanticTemplate = (value) => tokens(value).map((token) => {
  if (/^(ac|acmak|goster|gor|goruntule|git|yonlendir|anlat|acikla|karsilastir|devam|don|hazirla|olustur|degistir)/.test(token)) return '<ACTION>';
  if (/^(vardiya|sefer|rota|guzergah|teklif|sozlesme|plan|durak|ogrenci|cocuk|kayit|servis|talep|ekran|bolum|liste)/.test(token)) return '<OBJECT>';
  if (/^(sirket|oda|okul|organizasyon|surucu|personel|veli|yonetici)/.test(token)) return '<ROLE>';
  if (/^(bugun|onceki|sonraki|eski|yeni|sabah|ogle|acil)/.test(token)) return '<TIME_OR_CONTEXT>';
  return token;
}).join(' ');
const classifySource = (path) => {
  const p = path.toLowerCase();
  if (p.includes('m18-role-help-architecture-diagnostic')) return 'RH';
  if (p.includes('m18-typed-semantic-evidence-independent-diagnostic')) return 'GI';
  if (p.includes('task-12') || p.includes('m18_task12')) return 'TASK12';
  if (p.includes('task-13') || p.includes('m18_semantic_evidence_service') || p.includes('m18_semantic_evidence_browser') || p.includes('m18_semantic_evidence_responsive')) return 'TASK13';
  if (/(run[-_][a-z]|attempt03|holdout)/.test(p)) return 'HISTORICAL_HOLDOUT';
  return 'REGRESSION';
};
const isPlausibleUtterance = (value) => {
  const raw = String(value ?? '').trim();
  const words = tokens(raw);
  return raw.length >= 14
    && raw.length <= 360
    && words.length >= 3
    && words.length <= 60
    && /[?.!]$/.test(raw)
    && !/[{}[\]=;]/.test(raw);
};

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORY_NAMES.has(entry.name)) walk(join(directory, entry.name), files);
      continue;
    }
    const path = join(directory, entry.name);
    const rel = relative(root, path).replaceAll('\\', '/');
    if (AUDITED_EXTENSIONS.has(extname(entry.name).toLowerCase()) && !SELF_EXCLUDED_PATHS.has(rel)) files.push(path);
  }
  return files;
}
function collectJsonStrings(value, output) {
  if (typeof value === 'string') {
    if (isPlausibleUtterance(value)) output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonStrings(item, output);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectJsonStrings(item, output);
  }
}
function collectSourceStrings(path) {
  const content = readFileSync(path, 'utf8');
  const output = [];
  if (extname(path).toLowerCase() === '.json') {
    try { collectJsonStrings(JSON.parse(content), output); } catch { /* scan text below */ }
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (isPlausibleUtterance(trimmed)) output.push(trimmed);
  }
  const quoted = /(["'])((?:\\.|(?!\1).){14,360}?)\1/g;
  for (const match of content.matchAll(quoted)) if (isPlausibleUtterance(match[2])) output.push(match[2]);
  return [...new Set(output)];
}
function validateExpectationContract(cases) {
  const failures = []; const ids = new Set(); const templates = new Set();
  for (const testCase of cases) {
    for (const field of REQUIRED_CASE_FIELDS) if (!(field in testCase)) failures.push({ caseId: testCase.CASE_ID ?? 'UNKNOWN', rule: 'REQUIRED_FIELD_PRESENT', field });
    if (ids.has(testCase.CASE_ID)) failures.push({ caseId: testCase.CASE_ID, rule: 'CASE_ID_UNIQUE' });
    ids.add(testCase.CASE_ID);
    if (templates.has(testCase.SEMANTIC_TEMPLATE_ID)) failures.push({ caseId: testCase.CASE_ID, rule: 'SEMANTIC_TEMPLATE_ID_UNIQUE' });
    templates.add(testCase.SEMANTIC_TEMPLATE_ID);
    if (testCase.IMMEDIATE_REQUESTED_ACTION !== testCase.EXPECTED_ACTION_CLASS && testCase.EXPECTED_ACTION_CLASS !== 'NONE') failures.push({ caseId: testCase.CASE_ID, rule: 'IMMEDIATE_ACTION_MUST_MATCH_EXPECTED_ACTION' });
    if (testCase.ULTIMATE_GOAL && testCase.IMMEDIATE_REQUESTED_ACTION === 'EXPLAIN' && testCase.EXPECTED_ACTION_CLASS !== 'EXPLAIN') failures.push({ caseId: testCase.CASE_ID, rule: 'GUIDANCE_MUST_NOT_COLLAPSE_TO_ULTIMATE_GOAL' });
    if (testCase.IMMEDIATE_REQUESTED_ACTION === 'EXPLAIN'
      && testCase.REQUEST_FORM === 'STARTING_GUIDANCE'
      && testCase.ULTIMATE_GOAL
      && !testCase.ACTIVE_TASK_CONTEXT
      && !testCase.REFERENCE_CONTEXT
      && testCase.EXPECTED_WORKFLOW !== null) {
      failures.push({ caseId: testCase.CASE_ID, rule: 'EXPLAIN_STARTING_GUIDANCE_WITHOUT_ACTIVE_CONTEXT_MUST_NOT_REQUIRE_WORKFLOW', actual: testCase.EXPECTED_WORKFLOW });
    }
    if (testCase.EXPECTED_RESOLUTION_STATUS === 'UNRESOLVED' && (testCase.EXPECTED_ACTION_CLASS !== 'NONE' || testCase.EXPECTED_TARGET_CLASS !== 'NONE')) failures.push({ caseId: testCase.CASE_ID, rule: 'UNRESOLVED_MUST_NOT_INVENT_ACTION_OR_TARGET' });
    if (testCase.EXPECTED_SEMANTIC_SCOPE === 'OFF_TOPIC_GENUINE' && (testCase.EXPECTED_ACTION_CLASS !== 'NONE' || testCase.EXPECTED_RESOLUTION_STATUS !== 'NOT_APPLICABLE')) failures.push({ caseId: testCase.CASE_ID, rule: 'GENUINE_OOS_MUST_HAVE_NONE_ACTION' });
    if (testCase.EXPECTED_AUTHORIZATION === 'DENY' && testCase.EXPECTED_SEMANTIC_SCOPE !== 'PRODUCT_EXPLICIT') failures.push({ caseId: testCase.CASE_ID, rule: 'AUTHORIZATION_MUST_REMAIN_DOWNSTREAM_OF_MEANING' });
    if (testCase.EXPECTED_TARGET_CLASS === 'CURRENT_UI' && !['VIEW', 'NAVIGATE'].includes(testCase.EXPECTED_ACTION_CLASS)) failures.push({ caseId: testCase.CASE_ID, rule: 'CURRENT_UI_TARGET_REQUIRES_VIEW_OR_NAVIGATE' });
    if (testCase.EXPECTED_BUSINESS_WRITE_EXECUTION !== 0 || testCase.EXPECTED_EXTERNAL_AI_CALL_COUNT !== 0) failures.push({ caseId: testCase.CASE_ID, rule: 'NO_WRITE_AND_NO_EXTERNAL_AI_EXPECTATION' });
  }
  const actionSet = new Set(cases.map((testCase) => testCase.EXPECTED_ACTION_CLASS));
  for (const action of REQUIRED_ACTION_COVERAGE) if (!actionSet.has(action)) failures.push({ caseId: 'RUN_M', rule: 'REQUIRED_ACTION_COVERAGE', action });
  const roleSet = new Set(cases.map((testCase) => testCase.ROLE));
  for (const role of REQUIRED_ROLES) if (!roleSet.has(role)) failures.push({ caseId: 'RUN_M', rule: 'REQUIRED_ROLE_COVERAGE', role });
  if (cases.length < 48 || cases.length > 64) failures.push({ caseId: 'RUN_M', rule: 'CASE_COUNT_48_TO_64', actual: cases.length });
  return failures;
}
if (process.argv.includes('--self-test')) {
  const probeCandidate = readJson(candidatePath);
  const guidanceCase = probeCandidate.cases.find((testCase) => testCase.REQUEST_FORM === 'STARTING_GUIDANCE');
  if (!guidanceCase) throw new Error('RED: no structural starting-guidance fixture is available.');
  const failures = validateExpectationContract(probeCandidate.cases);
  const rule = 'EXPLAIN_STARTING_GUIDANCE_WITHOUT_ACTIVE_CONTEXT_MUST_NOT_REQUIRE_WORKFLOW';
  if (!failures.some((failure) => failure.caseId === guidanceCase.CASE_ID && failure.rule === rule)) {
    throw new Error(`RED: invalid starting-guidance workflow expectation was accepted: ${JSON.stringify(guidanceCase)}`);
  }
  const correctedCandidate = JSON.parse(JSON.stringify(probeCandidate));
  const correctedGuidance = correctedCandidate.cases.find((testCase) => testCase.REQUEST_FORM === 'STARTING_GUIDANCE');
  correctedGuidance.EXPECTED_WORKFLOW = null;
  const correctedFailures = validateExpectationContract(correctedCandidate.cases);
  if (correctedFailures.some((failure) => failure.caseId === correctedGuidance.CASE_ID && failure.rule === rule)) {
    throw new Error(`RED: corrected starting-guidance expectation remained rejected: ${JSON.stringify(correctedGuidance)}`);
  }
  const explicitCreate = probeCandidate.cases.find((testCase) => testCase.IMMEDIATE_REQUESTED_ACTION === 'CREATE');
  const activeContinuation = probeCandidate.cases.find((testCase) => testCase.ACTIVE_TASK_CONTEXT && ['CONTINUE', 'NEXT', 'PREVIOUS'].includes(testCase.IMMEDIATE_REQUESTED_ACTION));
  const activeExplain = probeCandidate.cases.find((testCase) => testCase.ACTIVE_TASK_CONTEXT && testCase.IMMEDIATE_REQUESTED_ACTION === 'EXPLAIN');
  for (const preservedCase of [explicitCreate, activeContinuation, activeExplain]) {
    if (preservedCase && correctedFailures.some((failure) => failure.caseId === preservedCase.CASE_ID && failure.rule === rule)) {
      throw new Error(`RED: existing workflow context was incorrectly rejected: ${JSON.stringify(preservedCase)}`);
    }
  }
  console.log(JSON.stringify({ status: 'GREEN', caseShape: { requestForm: guidanceCase.REQUEST_FORM, immediateAction: guidanceCase.IMMEDIATE_REQUESTED_ACTION, hasActiveTask: Boolean(guidanceCase.ACTIVE_TASK_CONTEXT), hasReference: Boolean(guidanceCase.REFERENCE_CONTEXT) }, matchedRule: rule, correctedWorkflow: correctedGuidance.EXPECTED_WORKFLOW, preservedCases: [explicitCreate?.CASE_ID, activeContinuation?.CASE_ID, activeExplain?.CASE_ID].filter(Boolean) }, null, 2));
  process.exit(0);
}
function auditOverlap(cases) {
  const externalEntries = [];
  for (const auditRoot of AUDIT_ROOTS.filter(existsSync)) for (const path of walk(auditRoot)) {
    const source = relative(root, path).replaceAll('\\', '/');
    for (const text of collectSourceStrings(path)) externalEntries.push({ source, category: classifySource(source), text, normalized: normalizedText(text), template: semanticTemplate(text) });
  }
  const exactByNormalizedText = new Map();
  const externalByTemplate = new Map();
  for (const external of externalEntries) {
    if (!exactByNormalizedText.has(external.normalized)) exactByNormalizedText.set(external.normalized, []);
    exactByNormalizedText.get(external.normalized).push(external);
    if (!externalByTemplate.has(external.template)) externalByTemplate.set(external.template, []);
    externalByTemplate.get(external.template).push(external);
  }
  const exactOverlaps = []; const nearDuplicates = []; const templateDuplicates = [];
  for (const testCase of cases) {
    const normalized = normalizedText(testCase.UTTERANCE);
    const template = semanticTemplate(testCase.UTTERANCE);
    for (const external of exactByNormalizedText.get(normalized) ?? []) exactOverlaps.push({ caseId: testCase.CASE_ID, source: external.source, category: external.category, text: external.text });
    for (const external of externalByTemplate.get(template) ?? []) {
      if (normalized !== external.normalized) templateDuplicates.push({ caseId: testCase.CASE_ID, source: external.source, category: external.category, template, text: external.text });
    }
    for (const external of externalEntries) {
      if (normalized === external.normalized) continue;
      const similarity = tokenJaccard(testCase.UTTERANCE, external.text);
      if (similarity >= 0.82) nearDuplicates.push({ caseId: testCase.CASE_ID, source: external.source, category: external.category, similarity, text: external.text });
    }
  }
  const categoryCount = (collection, category) => collection.filter((entry) => entry.category === category).length;
  return {
    externalMaterialStringCount: externalEntries.length, exactOverlaps, nearDuplicates, templateDuplicates,
    exactOverlapCount: exactOverlaps.length, nearDuplicateCount: nearDuplicates.length, semanticTemplateDuplicateCount: templateDuplicates.length,
    exposedReuseCount: exactOverlaps.length + nearDuplicates.length + templateDuplicates.length,
    rhOverlapCount: categoryCount(exactOverlaps, 'RH') + categoryCount(nearDuplicates, 'RH') + categoryCount(templateDuplicates, 'RH'),
    giOverlapCount: categoryCount(exactOverlaps, 'GI') + categoryCount(nearDuplicates, 'GI') + categoryCount(templateDuplicates, 'GI'),
    runALOverlapCount: categoryCount(exactOverlaps, 'HISTORICAL_HOLDOUT') + categoryCount(nearDuplicates, 'HISTORICAL_HOLDOUT') + categoryCount(templateDuplicates, 'HISTORICAL_HOLDOUT'),
    task12OverlapCount: categoryCount(exactOverlaps, 'TASK12') + categoryCount(nearDuplicates, 'TASK12') + categoryCount(templateDuplicates, 'TASK12'),
    task13OverlapCount: categoryCount(exactOverlaps, 'TASK13') + categoryCount(nearDuplicates, 'TASK13') + categoryCount(templateDuplicates, 'TASK13'),
    regressionOverlapCount: categoryCount(exactOverlaps, 'REGRESSION') + categoryCount(nearDuplicates, 'REGRESSION') + categoryCount(templateDuplicates, 'REGRESSION')
  };
}
function sourceHashInventory() {
  return Object.fromEntries(PRODUCT_SOURCE_PATHS.map((relativePath) => {
    const path = join(root, relativePath);
    return [relativePath, existsSync(path) ? digest(readFileSync(path)) : 'MISSING'];
  }));
}
function hashInventory(paths) {
  return Object.fromEntries(paths.map((relativePath) => {
    const path = join(root, relativePath);
    return [relativePath, existsSync(path) ? digest(readFileSync(path)) : 'MISSING'];
  }));
}

const candidate = readJson(candidatePath);
const expectationFailures = validateExpectationContract(candidate.cases);
const overlapAudit = auditOverlap(candidate.cases);
const overlapCounters = [overlapAudit.exactOverlapCount, overlapAudit.nearDuplicateCount, overlapAudit.semanticTemplateDuplicateCount, overlapAudit.exposedReuseCount, overlapAudit.rhOverlapCount, overlapAudit.giOverlapCount, overlapAudit.runALOverlapCount, overlapAudit.task12OverlapCount, overlapAudit.task13OverlapCount, overlapAudit.regressionOverlapCount];
const authoringQualityFailures = [
  ...(candidate.authoringPolicy.implementationMatcherSourceUsed ? [{ rule: 'IMPLEMENTATION_MATCHER_SOURCE_FORBIDDEN' }] : []),
  ...(candidate.authoringPolicy.exposedDiagnosticCaseUsed ? [{ rule: 'EXPOSED_DIAGNOSTIC_CASE_FORBIDDEN' }] : []),
  ...(new Set(candidate.cases.map((testCase) => testCase.REQUEST_FORM)).size < 8 ? [{ rule: 'REQUEST_FORM_DIVERSITY' }] : [])
];
const overlapSummary = Object.fromEntries(Object.entries(overlapAudit).filter(([, value]) => typeof value === 'number'));
const report = {
  reportId: `${candidate.runId}-PRE-FREEZE-VALIDATION`, runId: candidate.runId,
  candidateSha256: digest(readFileSync(candidatePath)), caseCount: candidate.cases.length,
  roleCounts: Object.fromEntries(REQUIRED_ROLES.map((role) => [role, candidate.cases.filter((testCase) => testCase.ROLE === role).length])),
  actionCounts: Object.fromEntries([...new Set(candidate.cases.map((testCase) => testCase.EXPECTED_ACTION_CLASS))].sort().map((action) => [action, candidate.cases.filter((testCase) => testCase.EXPECTED_ACTION_CLASS === action).length])),
  EXPECTATION_CONTRACT_VALIDATION: expectationFailures.length === 0 ? 'PASS' : 'FAIL', expectationFailures,
  OVERLAP_AUDIT: overlapCounters.every((count) => count === 0) ? 'PASS' : 'FAIL', overlapAudit: overlapSummary,
  AUTHORING_QUALITY_GATE: authoringQualityFailures.length === 0 ? 'PASS' : 'FAIL', authoringQualityFailures,
  productSourceHashes: sourceHashInventory(),
  harnessSourceHashes: hashInventory(HARNESS_SOURCE_PATHS),
  PREFREEZE_GATE: expectationFailures.length === 0 && overlapCounters.every((count) => count === 0) && authoringQualityFailures.length === 0 ? 'GREEN' : 'RED'
};
if (writeReport) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.PREFREEZE_GATE === 'GREEN' ? 0 : 1;
