import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectedRuntimeHelpers } from './helpComposerSelectedRuntime.js';

const normalizeText = (value) => String(value ?? '')
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i')
  .trim();

const helpers = createSelectedRuntimeHelpers({
  firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '',
  normalizeText,
  tokenOverlapScore: () => 0,
  structuredFacts: (context) => context?.structuredFacts || context?.facts || null,
  structuredActionRows: () => [],
  dataRules: () => [],
});

test('SUPER_ADMIN gözlem ekranı gerçek sıfır alarm metriğini doğrudan açıklar', () => {
  const reply = helpers.selectedMetricReply('Bu ekranda açık alarm sayısı nedir?', {
    scopeKey: '/superadmin/observability',
    selectedFields: [{ label: 'Açık alarm / açık sorun', value: '0' }],
  });

  assert.match(reply, /açık alarm \/ açık sorun sayısı: 0/i);
});

test('ORGANIZATION operasyon ekranı tenant kapsamındaki sıfır aktif servisi doğrudan açıklar', () => {
  const reply = helpers.selectedMetricReply('Bu panelde bugün aktif servis sayısı nedir?', {
    scopeKey: '/organization/operations',
    selectedFields: [{ label: 'Aktif servis', value: '0' }],
  });

  assert.match(reply, /bugün aktif servis sayısı: 0/i);
});

test('sıfır-metrik yanıtı ilgisiz ekrana taşınmaz', () => {
  const reply = helpers.selectedMetricReply('Bu ekranda açık alarm sayısı nedir?', {
    path: '/organization/reports',
    selectedFields: [{ label: 'Açık alarm / açık sorun', value: '0' }],
  });

  assert.equal(reply, '');
});
