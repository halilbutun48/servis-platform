import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = 'NEW';

const company = { role: 'COMPANY', companyId: 10 };
const room = { role: 'ROOM', roomId: 20 };
const companySurface = { id: 2101, path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' };
const roomSurface = { id: 3101, path: '/room', label: 'Operasyon Paneli', role: 'ROOM' };

function canonical({ message, user = company, screenContext = companySurface } = {}) {
  const result = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState: null,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const plan = resolveSemanticIntent({
    message,
    user,
    screenContext,
    canonicalRequest: result,
  });
  return {
    action: result.request.semanticAction?.actionClass || null,
    object: result.request.semanticAction?.objectClass || null,
    operation: result.request.operation || null,
    resolutionStatus: result.request.semanticAction?.resolutionStatus || null,
    workflowIntent: plan.workflowIntent || null,
  };
}

const cases = [
  {
    id: 'mixed-navigate-guidance-converb',
    message: 'Planlama Merkezi\'ne geçip ilk adımı gösterir misin?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'mixed-navigate-guidance-alternate',
    message: 'Operasyon Paneline geçerek başlangıcı anlatır mısın?',
    user: room,
    screenContext: roomSurface,
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'navigate-only',
    message: 'Planlama Merkezi sayfasına geç',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'guidance-only',
    message: 'Planlama Merkezi sayfasında nereden başlamalıyım?',
    expect: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'pure-explain',
    message: 'Planlama Merkezi ne işe yarıyor?',
    expect: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'negated-navigation',
    message: 'Planlama Merkezi sayfasına geçme, burada devam edelim.',
    expect: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'hypothetical-navigation',
    message: 'Planlama Merkezi sayfasına geçersem ne görürüm?',
    expect: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'navigation-meta-question',
    message: 'Planlama Merkezi sayfasına geçiş nasıl çalışıyor?',
    expect: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'resolved-deictic-navigation',
    message: 'Bu ekrana geçip ilk adımı anlatır mısın?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'unresolved-destination',
    message: 'Hayali kullanıcı yönetimi ekranına geçip ne yapacağımı gösterir misin?',
    expect: (actual) => actual.workflowIntent === 'UNRESOLVED_UI_TARGET',
  },
  {
    id: 'transition-then-explain',
    message: 'Planlama Merkezi\'ne geçerek ne işe yaradığını anlat.',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'transition-then-starting-guidance',
    message: 'Planlama Merkezi sayfasına geçip nereden başlayacağımı açıklar mısın?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'guidance-without-transition',
    message: 'Planlama Merkezi sayfasında hangi adımları izlemeliyim?',
    expect: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'current-surface-deictic-guidance',
    message: 'Bu ekranda ne yapabilirim?',
    expect: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'unauthorized-role-semantic-boundary',
    message: 'Planlama Merkezi\'ne geçip ilk adımı gösterir misin?',
    user: room,
    screenContext: roomSurface,
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'alternate-surface-guidance',
    message: 'Operasyon Paneli\'ne gidip ne yapacağımı anlatır mısın?',
    user: room,
    screenContext: roomSurface,
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'ability-navigation-control',
    message: 'Planlama Merkezi\'ne geçebilir miyim?',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'coordinated-navigation-first',
    message: 'Planlama Merkezi\'ne geçip başlangıç adımını göster.',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'pure-explanation-control',
    message: 'Planlama Merkezi kullanımını açıklar mısın?',
    expect: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'pure-navigation-control',
    message: 'Planlama Merkezi\'ne git.',
    expect: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'mixed-navigation-guidance-variant',
    message: 'Operasyon Paneline geçip nereden başlayacağımı açıklar mısın?',
    user: room,
    screenContext: roomSurface,
    expect: (actual) => actual.action === 'NAVIGATE',
  },
];

const failures = [];
for (const testCase of cases) {
  const actual = canonical(testCase);
  if (!testCase.expect(actual)) failures.push({ id: testCase.id, message: testCase.message, actual });
}

console.log(JSON.stringify({
  MIXED_NAVIGATION_RED_TEST_COUNT: cases.length,
  MIXED_NAVIGATION_RELEVANT_RED_FAILURE_COUNT: failures.length,
  failures,
}, null, 2));

if (failures.length === 0) process.exit(0);
process.exitCode = 1;
