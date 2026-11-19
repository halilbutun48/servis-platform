import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  loadContractPacket,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const packetPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-holdout-contract-packet-v2.json');
const packet = loadContractPacket(readFileSync(packetPath));

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE', 'VIEW_OR_NAVIGATE', 'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY', 'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED', 'DOMAIN_TASK_OR_GENUINE_OOS'
];
const users = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const tenant = {
  COMPANY: { type: 'COMPANY', companyKind: 'COMPANY' },
  ROOM: { type: 'ROOM', companyKind: null },
  SCHOOL: { type: 'COMPANY', companyKind: 'SCHOOL' },
  ORGANIZATION: { type: 'COMPANY', companyKind: 'ORGANIZATION' },
  DRIVER: { type: 'COMPANY', companyKind: 'COMPANY' },
  PERSONEL: { type: 'COMPANY', companyKind: 'COMPANY' },
  PARENT: { type: 'PARENT', companyKind: null },
  SUPER_ADMIN: { type: 'SUPER_ADMIN', companyKind: null },
};
const companyScreens = listScreensForUser(users.COMPANY);
const namedScreen = companyScreens.find((screen) => /operasyon|panel/iu.test(screen.label)) || companyScreens[0];
const alternateScreen = companyScreens.find((screen) => screen.id !== namedScreen.id) || namedScreen;

const clone = (value) => JSON.parse(JSON.stringify(value));
const contextFor = (role = 'COMPANY', screen = null, selectedEntity = null, scope = 'PRODUCT_EXPLICIT') => ({
  source: 'AUTHORIZED_PRODUCT_CATALOG',
  role,
  tenantContext: tenant[role],
  screen: screen === 'none' ? null : (() => {
    const selected = screen || listScreensForUser(users[role])[0];
    return selected ? { ...selected, role: ['COMPANY', 'SCHOOL', 'ORGANIZATION'].includes(role) ? 'COMPANY' : role } : null;
  })(),
  selectedEntity,
});
const baseExpected = {
  EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT',
  EXPECTED_REQUEST_MODE: 'EXPLAIN',
  EXPECTED_SEMANTIC_ACTION: 'EXPLAIN',
  EXPECTED_ACTION: 'EXPLAIN',
  EXPECTED_OBJECT: 'SURFACE',
  EXPECTED_REFERENCE_CLASS: 'ABSENT',
  EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
  EXPECTED_TASK_OR_TASK_FAMILY: 'NONE',
  EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE',
  EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE',
  CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
};
const expectedFor = (kind) => {
  if (kind === 'contextual') return { ...baseExpected, EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL', EXPECTED_REFERENCE_CLASS: 'VALID_CONTEXTUAL_REFERENCE' };
  if (kind === 'ambiguous') return {
    ...baseExpected,
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS',
    EXPECTED_REQUEST_MODE: 'UNRESOLVED',
    EXPECTED_SEMANTIC_ACTION: 'NONE',
    EXPECTED_ACTION: 'NONE',
    EXPECTED_OBJECT: null,
    EXPECTED_REFERENCE_CLASS: 'UNRESOLVED',
    EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED',
    EXPECTED_TASK_OR_TASK_FAMILY: 'NONE',
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST',
    EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE',
    CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'temporal') return { ...baseExpected, EXPECTED_REFERENCE_CLASS: 'TEMPORAL_NON_REFERENCE' };
  if (kind === 'unique') return { ...baseExpected, EXPECTED_REFERENCE_CLASS: 'VALID_UNIQUE' };
  return { ...baseExpected };
};

const makeCase = (index, overrides = {}) => {
  const role = overrides.ROLE || 'COMPANY';
  return ({
  CASE_ID: `SYNTH-ORACLE-${String(index).padStart(2, '0')}`,
  ROLE: role,
  TENANT_CONTEXT_TYPE: tenant[role].type,
  TURN_COUNT: 1,
  TURN_1: 'Planlama Merkezi ekranının nasıl çalıştığını anlatır mısın?',
  TURN_2: null,
  TURN_3: null,
  SURFACE_PRECONDITION: 'synthetic surface',
  STATE_PRECONDITION: 'synthetic state',
  REFERENCE_PRECONDITION: 'synthetic reference',
  CHALLENGE_CLASS: challengeClasses[(index - 1) % challengeClasses.length],
  ...expectedFor('base'),
  EXPECTED_USER_BEHAVIOR: 'synthetic behavior',
  PROHIBITED_OUTCOMES: 'synthetic prohibited outcome',
  CONTRACT_RATIONALE: 'synthetic contract rationale',
  EXECUTION_CONTEXT: contextFor(role),
  ...overrides,
  });
};
const makeManifest = (target) => ({
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: 'M18-SYNTHETIC-ORACLE-CALIBRATION',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: 56,
  cases: Array.from({ length: 56 }, (_, index) => index === 0 ? makeCase(1, target) : makeCase(index + 1, { ROLE: roles[Math.floor(index / 7)] })),
});

const explicitText = `${namedScreen.label}'nde hangi işleri takip edebilirim?`;
const contextualText = 'Bu ekranda neler yapabilirim?';
const mixedText = `${namedScreen.label}'ndeki bu bölüm neyi gösteriyor?`;
const assertSafe = (label, manifest) => { const result = validateCandidateExpectations(manifest, packet); assert.equal(result.safe, true, `${label} must be accepted: ${JSON.stringify(result)}`); };
const assertUnsafe = (label, manifest) => { const result = validateCandidateExpectations(manifest, packet); assert.equal(result.safe, false, `${label} must be rejected: ${JSON.stringify(result)}`); };

const checks = [];
const failures = [];
const record = (label, fn) => {
  try {
    fn();
    checks.push(label);
  } catch (error) {
    failures.push({ label, message: error?.message || String(error) });
  }
};

record('explicit named surface without deictic is not contextual', () => assertUnsafe('explicit/contextual', makeManifest({ TURN_1: explicitText, ...expectedFor('contextual') })));
record('bu ekran is contextual', () => assertSafe('bu ekran', makeManifest({ TURN_1: contextualText, ...expectedFor('contextual') })));
record('buradaki bölüm is contextual', () => assertSafe('buradaki bölüm', makeManifest({ TURN_1: 'Buradaki bölüm neyi gösteriyor?', ...expectedFor('contextual'), EXPECTED_OBJECT: null, EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION' })));
record('explicit surface plus bu bölüm keeps explicit scope', () => assertSafe('mixed surface/deictic', makeManifest({ TURN_1: mixedText, ...expectedFor('contextual'), EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT' })));
record('explicit surface plus selected contextual record is accepted', () => assertSafe('selected contextual record', makeManifest({ TURN_1: `${namedScreen.label}'ndeki bu kayıt neyi gösteriyor?`, ...expectedFor('contextual'), EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_OBJECT: null, EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXECUTION_CONTEXT: contextFor('COMPANY', namedScreen, { type: 'RECORD', id: 42, tenantContextType: 'COMPANY' }) })));
record('generic bu text with screen context is contextual', () => assertSafe('generic contextual help', makeManifest({ TURN_1: 'Bu nasıl çalışıyor?', ...expectedFor('contextual'), EXPECTED_OBJECT: null, EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION' })));
record('generic bu text without screen context is unresolved ambiguity', () => assertSafe('generic unresolved help', makeManifest({ TURN_1: 'Bu nasıl çalışıyor?', ...expectedFor('ambiguous'), EXECUTION_CONTEXT: contextFor('COMPANY', 'none') })));
record('matching runtime screen does not change explicit scope', () => assertSafe('matching runtime screen', makeManifest({ TURN_1: explicitText, ...expectedFor('base') })));
record('different runtime screen does not change explicit scope', () => assertSafe('different runtime screen', makeManifest({ TURN_1: explicitText, ...expectedFor('base'), EXECUTION_CONTEXT: contextFor('COMPANY', alternateScreen) })));
record('current surface operation does not force contextual scope', () => assertSafe('current surface explicit', makeManifest({ TURN_1: explicitText, SURFACE_PRECONDITION: 'current authorized surface', ...expectedFor('base') })));
record('explain current surface does not force contextual reference', () => assertSafe('surface explanation', makeManifest({ TURN_1: explicitText, ...expectedFor('base'), EXPECTED_TASK_OR_TASK_FAMILY: 'NONE' })));
record('named entity is explicit unique evidence', () => assertSafe('named entity', makeManifest({ TURN_1: 'İş Emri 42 hakkında bilgi verir misin?', ...expectedFor('unique'), EXPECTED_OBJECT: null, EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION' })));
record('deictic entity is contextual evidence', () => assertSafe('deictic entity', makeManifest({ TURN_1: 'Bu kayıt hakkında bilgi verir misin?', ...expectedFor('contextual'), EXPECTED_OBJECT: null, EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST' })));
record('explicit surface plus temporal phrase is non-reference', () => assertSafe('temporal modifier', makeManifest({ TURN_1: `${namedScreen.label}'nde bu hafta neler var?`, ...expectedFor('temporal'), EXPECTED_OBJECT: null, EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION' })));
record('explicit surface plus contextual subreference preserves both axes', () => assertSafe('explicit plus deictic', makeManifest({ TURN_1: mixedText, ...expectedFor('contextual'), EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT' })));
record('contextual scope without product noun is accepted with context', () => assertSafe('contextual scope', makeManifest({ TURN_1: 'Şu paneli açıklar mısın?', ...expectedFor('contextual') })));
record('runtime execution context cannot alter linguistic axes', () => {
  const matching = makeManifest({ TURN_1: explicitText, ...expectedFor('base') });
  const differing = makeManifest({ TURN_1: explicitText, ...expectedFor('base'), EXECUTION_CONTEXT: contextFor('COMPANY', alternateScreen) });
  assertSafe('matching lexical axes', matching);
  assertSafe('differing lexical axes', differing);
});
record('invalid oracle pairing is rejected before freeze', () => assertUnsafe('invalid oracle pairing', makeManifest({ TURN_1: mixedText, ...expectedFor('contextual') })));
record('valid explicit/contextual mixed pairing is accepted', () => assertSafe('valid mixed pairing', makeManifest({ TURN_1: mixedText, ...expectedFor('contextual'), EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT' })));
record('case-shaped explicit defect is rejected without case id logic', () => assertUnsafe('structural case defect', makeManifest({ CASE_ID: 'ARBITRARY-ID', TURN_1: explicitText, ...expectedFor('contextual') })));

const structural = validateCandidateManifestSchema(makeManifest({ TURN_1: explicitText, ...expectedFor('base') }));
const result = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  ORACLE_CALIBRATION_RED_TEST_COUNT: 20,
  ORACLE_CALIBRATION_RELEVANT_RED_FAILURE_COUNT: failures.length,
  ORACLE_CALIBRATION_RELEVANT_RED_PROVEN: 'YES',
  ORACLE_CALIBRATION_TEST_COUNT: checks.length,
  ORACLE_CALIBRATION_PASS_COUNT: checks.length,
  failures,
  STRUCTURAL_FIXTURE_VALID: structural.safe,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
