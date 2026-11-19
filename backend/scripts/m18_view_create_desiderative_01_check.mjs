import assert from 'node:assert/strict';
import { extractTurkishSemanticFeatures } from '../src/ai/chat/turkishSemanticFeatures.js';
import { composeSemanticEvidence } from '../src/ai/chat/semanticEvidenceComposer.js';

const baseContext = {
  role: 'COMPANY',
  currentDomain: 'PRODUCT',
  currentSurface: { path: '/company', label: 'Planlama Merkezi' },
  evidence: { product: true },
};

function evidence(text, context = baseContext) {
  const features = extractTurkishSemanticFeatures({ text });
  return composeSemanticEvidence({
    features,
    context,
    conversationState: {},
    screenContext: { path: context.currentSurface?.path || '/company', role: context.role },
  });
}

const positive = [
  ['view desiderative with explicit object', 'Vardiyaları görüntülemek istiyorum.', 'VIEW'],
  ['view desiderative with named surface context', 'Planlama Merkezi alanında bugünkü vardiyaları görüntülemek istiyorum.', 'VIEW'],
  ['view desiderative synonym', 'Vardiyaları görmek istiyorum.', 'VIEW'],
  ['view polite request', 'Bugünkü vardiyaları gösterir misin?', 'VIEW'],
  ['view direct request', 'Bugünkü vardiyaları görüntüle.', 'VIEW'],
  ['create desiderative', 'Vardiya oluşturmak istiyorum.', 'CREATE'],
  ['create desiderative alternative', 'Yeni bir servis vardiyası kurmak istiyorum.', 'CREATE'],
  ['create polite request', 'Yeni vardiya oluşturur musun?', 'CREATE'],
  ['navigate desiderative', 'Planlama Merkezi ekranına geçmek istiyorum.', 'NAVIGATE'],
  ['explain desiderative', 'Bu ekranın nasıl çalıştığını öğrenmek istiyorum.', 'EXPLAIN'],
  ['update desiderative', 'Şu vardiyayı güncellemek istiyorum.', 'UPDATE'],
  ['compare desiderative', 'İki vardiyayı karşılaştırmak istiyorum.', 'COMPARE'],
  ['send desiderative', 'Teklifi göndermek istiyorum.', 'SEND'],
  ['surface-grounded view', 'Planlama Merkezi içindeki vardiyaları incelemek istiyorum.', 'VIEW'],
  ['agreement view desiderative', 'Sözleşmeleri incelemek istiyorum.', 'VIEW'],
];

const negative = [
  ['negated create', 'Vardiya oluşturmak istemiyorum.'],
  ['negated view', 'Vardiyaları görüntülemek istemiyorum.'],
  ['hypothetical create', 'Vardiya oluşturmak istesem nereden başlarım?'],
  ['permission meta', 'Vardiya oluşturmak isteyebilir miyim?'],
  ['pure explanation', 'Planlama Merkezi nasıl çalışıyor?'],
  ['genuine out of scope', 'Hafta sonu için film seçmeme yardım eder misin?'],
];

const failures = [];
for (const [label, text, expected] of positive) {
  const actual = evidence(text).requestMode?.value ?? null;
  if (actual !== expected) failures.push({ label, text, expected, actual });
}
for (const [label, text] of negative) {
  const actual = evidence(text).requestMode?.value ?? null;
  if (['CREATE', 'VIEW', 'UPDATE', 'COMPARE', 'SEND', 'NAVIGATE'].includes(actual)) {
    failures.push({ label, text, expected: 'NOT_AFFIRMATIVE_ACTION', actual });
  }
}

const roomCreate = evidence('Yeni vardiya oluşturmak istiyorum.', {
  ...baseContext,
  role: 'ROOM',
  currentSurface: { path: '/room', label: 'Oda Merkezi' },
});
assert.equal(roomCreate.requestMode?.value, 'CREATE', 'role boundary must retain semantic create evidence');

const result = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  RED_OBSERVED: failures.length > 0 ? 'YES' : 'NO',
  testCount: positive.length + negative.length,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
