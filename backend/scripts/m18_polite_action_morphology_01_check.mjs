import assert from 'node:assert/strict';
import { extractTurkishSemanticFeatures } from '../src/ai/chat/turkishSemanticFeatures.js';
import { composeSemanticEvidence } from '../src/ai/chat/semanticEvidenceComposer.js';

const context = {
  role: 'COMPANY',
  currentDomain: 'PRODUCT',
  currentSurface: { path: '/company', label: 'Planlama Merkezi' },
  evidence: { product: true },
};

function evidence(text, overrides = {}) {
  const features = extractTurkishSemanticFeatures({ text });
  return {
    features,
    composed: composeSemanticEvidence({
      features,
      context: { ...context, ...overrides.context },
      conversationState: overrides.conversationState || {},
      screenContext: overrides.screenContext || {},
    }),
  };
}

const cases = [
  ['direct update imperative', 'Şu kaydı güncelle.', 'UPDATE'],
  ['polite update interrogative', 'Şu kaydı günceller misin?', 'UPDATE'],
  ['polite update unresolved reference', 'Bu vardiya kaydını günceller misin?', 'UPDATE'],
  ['polite update with valid context', 'Bu kaydı günceller misin?', 'UPDATE', { context: { referenceState: { uniqueReferent: { type: 'RECORD', id: 42, validated: true } } } }],
  ['polite view', 'Kaydı gösterir misin?', 'VIEW'],
  ['polite navigation', 'Planlama Merkezi ekranına geçer misin?', 'NAVIGATE'],
  ['polite explanation', 'Bu ekranı anlatır mısın?', 'EXPLAIN'],
  ['polite create', 'Yeni vardiya oluşturur musun?', 'CREATE'],
  ['polite compare', 'İki kaydı karşılaştırır mısın?', 'COMPARE'],
  ['vowel harmony mi', 'Kaydı günceller misin?', 'UPDATE'],
  ['plural polite person', 'Kaydı günceller misiniz?', 'UPDATE'],
  ['negative control', 'Kaydı güncelleme.', null],
  ['hypothetical control', 'Kaydı güncellersem ne olur?', null],
  ['permission meta control', 'Kaydı güncelleyebilir miyim?', null],
  ['polite show family', 'Raporu gösterir misin?', 'VIEW'],
  ['coordinated update and guidance', 'Kaydı günceller misin ve sonucu anlatır mısın?', 'UPDATE'],
  ['polite action with secondary guidance', 'Şu kaydı günceller misin, ardından açıklar mısın?', 'UPDATE'],
  ['unresolved action request', 'Şu vardiya kaydını günceller misin?', 'UPDATE'],
  ['role boundary semantic preservation', 'Yeni vardiya oluşturur musun?', 'CREATE'],
  ['genuine OOS polite question', 'Yarın yağmur yağar mı?', null],
  ['pure explain control', 'Bu ekran nasıl çalışıyor?', 'EXPLAIN'],
  ['pure navigation control', 'Planlama Merkezi ekranına git.', 'NAVIGATE'],
  ['converb navigation regression', 'Planlama Merkezi ekranına geçip başlangıcı göster.', 'NAVIGATE'],
  ['continuation control', 'Şimdi kaldığımız yerden devam edelim.', 'CONTINUE', { conversationState: { activeGuidedTask: { id: 'task-politeness-01' } } }],
];

const failures = [];
for (const [label, text, expected, overrides] of cases) {
  const actual = evidence(text, overrides).composed.requestMode.value;
  if (expected === null) {
    if (['UPDATE', 'CREATE', 'COMPARE', 'VIEW', 'NAVIGATE'].includes(actual)) failures.push({ label, text, expected: 'NOT_ACTIONABLE', actual });
  } else if (actual !== expected) {
    failures.push({ label, text, expected, actual });
  }
}

const relevantRedFailures = failures.filter((failure) => [
  'polite update interrogative',
  'polite update unresolved reference',
  'polite create',
  'polite compare',
  'plural polite person',
  'polite action with secondary guidance',
  'unresolved action request',
].includes(failure.label));

const result = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  POLITE_ACTION_RED_TEST_COUNT: cases.length,
  POLITE_ACTION_RELEVANT_RED_FAILURE_COUNT: relevantRedFailures.length,
  POLITE_ACTION_RELEVANT_RED_PROVEN: relevantRedFailures.length > 0 ? 'YES' : 'NO',
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length === 0) process.exitCode = 1;
