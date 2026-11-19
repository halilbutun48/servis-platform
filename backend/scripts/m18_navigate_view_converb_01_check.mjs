import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { hasTurkishDirectionalNavigationPredicate } from '../src/ai/chat/turkishNavigationEvidence.js';

const company = { role: 'COMPANY', companyId: 10 };
const companySurface = { id: 2101, path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' };

function canonical(message) {
  const result = resolveCanonicalConversationRequest({
    message,
    user: company,
    screenContext: companySurface,
    conversationState: null,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  return {
    action: result.request.semanticAction?.actionClass || null,
    object: result.request.semanticAction?.objectClass || null,
    operation: result.request.operation || null,
  };
}

const cases = [
  {
    id: 'ilerleyip-guidance-preserves-navigation',
    message: 'Operasyon ekranına ilerleyip başlangıç kontrolünü gösterir misin?',
    expect: (actual) => actual.action === 'NAVIGATE' && actual.operation === 'NAVIGATE_AUTHORIZED_SURFACE',
  },
  {
    id: 'ilerleyerek-guidance-preserves-navigation',
    message: 'Operasyon ekranına ilerleyerek ilk kontrolü anlatır mısın?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'gecip-control-remains-navigation',
    message: 'Operasyon ekranına geçip başlangıç kontrolünü gösterir misin?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'gidip-control-remains-navigation',
    message: 'Operasyon ekranına gidip ilk adımı gösterir misin?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'pure-navigation',
    message: 'Operasyon ekranına geç.',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'pure-view',
    message: 'Operasyon ekranını görüntüle.',
    expect: (actual) => actual.action === 'VIEW',
  },
  {
    id: 'pure-explain',
    message: 'Operasyon ekranı nasıl çalışıyor?',
    expect: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'same-surface-guidance-remains-explain',
    message: 'Operasyon ekranında başlangıç kontrolünü gösterir misin?',
    expect: (actual) => actual.action === 'VIEW',
  },
  {
    id: 'negated-navigation-is-not-committed',
    message: 'Operasyon ekranına geçmek istemiyorum.',
    expect: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'hypothetical-navigation-is-not-committed',
    message: 'Operasyon ekranına geçsem nereden başlarım?',
    expect: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'infinitive-navigation-remains-navigation',
    message: 'Operasyon ekranına gitmek istiyorum.',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'directional-predicate-recognizes-y-converb',
    message: 'Operasyon ekranına ilerleyip başlangıcı anlat.',
    expect: () => hasTurkishDirectionalNavigationPredicate('ilerleyip'),
  },
];

const failures = [];
for (const testCase of cases) {
  const actual = canonical(testCase.message);
  const passed = testCase.id === 'directional-predicate-recognizes-y-converb'
    ? testCase.expect()
    : testCase.expect(actual);
  if (!passed) failures.push({ id: testCase.id, message: testCase.message, actual });
}

console.log(JSON.stringify({
  NAVIGATE_VIEW_CONVERB_RED_TEST_COUNT: cases.length,
  NAVIGATE_VIEW_CONVERB_RELEVANT_RED_FAILURE_COUNT: failures.length,
  failures,
}, null, 2));

if (failures.length === 0) process.exit(0);
process.exitCode = 1;
