import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectScreenMetricResponse } from './service.js';

test('commercial flow explains the visible market offer count without reading protected offer records', () => {
  const response = buildDirectScreenMetricResponse({
    user: { role: 'ORGANIZATION', companyKind: 'ORGANIZATION', companyId: 1 },
    entityType: 'screen',
    entityId: 1,
    message: 'Bu ticari akışta Market Teklifi sayısı nedir?',
    screenContext: {
      path: '/organization/commercial-flow',
      label: 'Ticari Akışım',
      uiHints: {
        visibleMetrics: [{ label: 'Market Teklifi', value: '0', source: 'AUTHORIZED_VISIBLE_SCREEN' }],
      },
    },
  });

  assert.ok(response);
  assert.match(response.reply, /Market Teklifi sayısı: 0/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
  assert.equal(response.retrievedFacts[0].value, '0');

  const protectedDetailQuestion = buildDirectScreenMetricResponse({
    user: { role: 'ORGANIZATION', companyKind: 'ORGANIZATION', companyId: 1 },
    entityType: 'screen',
    entityId: 1,
    message: 'Peki tekliflerimi görebilir miyim?',
    screenContext: {
      path: '/organization/commercial-flow',
      uiHints: {
        visibleMetrics: [{ label: 'Market Teklifi', value: '0', source: 'AUTHORIZED_VISIBLE_SCREEN' }],
      },
    },
  });
  assert.equal(protectedDetailQuestion, null);
});

test('super admin regions explains the visible authorized region count read-only', () => {
  const response = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN', companyId: null },
    entityType: 'screen',
    entityId: 1,
    message: 'Bu ekranda kaç bölge var?',
    screenContext: {
      path: '/superadmin/regions',
      label: 'İller ve Bölgeler',
      uiHints: { visibleMetrics: [{ label: 'Bölge', value: '1', source: 'AUTHORIZED_VISIBLE_SCREEN' }] },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /bölge sayısı: 1/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
});

test('super admin users explains the visible authorized user count read-only', () => {
  const response = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN', companyId: null },
    entityType: 'screen',
    entityId: 6106,
    message: 'Bu ekranda kaç kullanıcı var?',
    screenContext: {
      path: '/superadmin/users',
      label: 'Kullanıcılar',
      uiHints: { visibleMetrics: [{ label: 'Kayıt sayısı', value: '17', source: 'AUTHORIZED_VISIBLE_SCREEN' }] },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /yetkili kullanıcı sayısı: 17/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
  assert.equal(response.retrievedFacts[0].value, '17');
});

test('super admin users metric remains role-scoped and requires a visible value', () => {
  const nonAdmin = buildDirectScreenMetricResponse({
    user: { role: 'COMPANY', companyId: 1 },
    entityType: 'screen',
    entityId: 6106,
    message: 'Bu ekranda kaç kullanıcı var?',
    screenContext: {
      path: '/superadmin/users',
      label: 'Kullanıcılar',
      uiHints: { visibleMetrics: [{ label: 'Kayıt sayısı', value: '17', source: 'AUTHORIZED_VISIBLE_SCREEN' }] },
    },
  });
  assert.equal(nonAdmin, null);

  const withoutVisibleMetric = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6106,
    message: 'Bu ekranda kaç kullanıcı var?',
    screenContext: { path: '/superadmin/users', label: 'Kullanıcılar', uiHints: { visibleMetrics: [] } },
  });
  assert.equal(withoutVisibleMetric, null);
});

test('super admin regions keeps the follow-up tenant boundary explicit', () => {
  const response = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 1,
    message: 'Peki bu sayı başka tenantları içeriyor mu?',
    screenContext: {
      path: '/superadmin/regions',
      label: 'İller ve Bölgeler',
      uiHints: { visibleMetrics: [{ label: 'Bölge', value: '1', source: 'AUTHORIZED_VISIBLE_SCREEN' }] },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /başka tenant.*dahil edilmiyor/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
});

test('super admin audit explains the visible audit count read-only', () => {
  const response = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN', companyId: null },
    entityType: 'screen',
    entityId: 1,
    message: 'Bu ekranda kaç işlem kaydı var?',
    screenContext: {
      path: '/superadmin/audit',
      label: 'İşlem Kayıtları',
      uiHints: { visibleMetrics: [{ label: 'İşlem Kayıtları', value: '250', source: 'AUTHORIZED_VISIBLE_SCREEN' }] },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /kayıt sayısı: 250/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
});

test('super admin audit keeps the tenant boundary explicit on a follow-up', () => {
  const response = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN', companyId: null },
    entityType: 'screen',
    entityId: 1,
    message: 'Peki bu kayıtlar başka tenantları içeriyor mu?',
    screenContext: {
      path: '/superadmin/audit',
      label: 'İşlem Kayıtları',
      uiHints: { visibleMetrics: [{ label: 'İşlem Kayıtları', value: '250', source: 'AUTHORIZED_VISIBLE_SCREEN' }] },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /başka tenant.*dahil edilmiyor/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
});

test('super admin ssot alignment answers visible target and active-rule questions read-only', () => {
  const context = {
    path: '/superadmin/ssot-alignment',
    label: 'Sistem Standartları',
    selectedFields: [
      { label: 'Aktif çalışma kuralı', value: 'M61 green olmadan M62 acılmaz' },
      { label: 'İzlenen dosyalar', value: '10 hedef' },
    ],
    structuredFacts: {
      activeRule: 'M61 green olmadan M62 acılmaz',
      counters: { targetCount: 10, greenCount: 2, errorCount: 7 },
    },
  };
  const count = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6111,
    message: 'Bu ekranda kaç dosya izleniyor?',
    screenContext: context,
  });
  assert.ok(count);
  assert.match(count.reply, /10 hedef dosya izleniyor/u);
  assert.equal(count.readOnly, true);
  assert.equal(count.writeAction, false);

  const rule = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6111,
    message: 'Peki bu ekran hangi aktif çalışma kuralını uyguluyor?',
    screenContext: context,
  });
  assert.ok(rule);
  assert.match(rule.reply, /M61 green olmadan M62 acılmaz/u);
});

test('super admin commercial core answers payment and accrual boundaries without mutation', () => {
  const context = {
    path: '/superadmin/commercial-core',
    label: 'Ticari Akış',
    selectedFields: [{ label: 'Hakediş önizleme', value: 'Taslak' }],
  };
  const payment = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6112,
    message: 'Bu ticari akış ekranında ödeme başlatılıyor mu?',
    screenContext: context,
  });
  assert.ok(payment);
  assert.match(payment.reply, /ödeme başlatılmıyor/u);
  assert.equal(payment.writeAction, false);

  const accrual = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6112,
    message: 'Peki hakediş hangi modda?',
    screenContext: context,
  });
  assert.ok(accrual);
  assert.match(accrual.reply, /güvenli hazırlık modunda/u);
  assert.match(accrual.reply, /Taslak/u);
});

test('super admin trust quality answers active count and definitive-score boundary', () => {
  const context = {
    path: '/superadmin/trust-quality',
    label: 'Güven ve Kalite Özeti',
    selectedFields: [
      { label: 'Aktif Hizmet', value: '0' },
      { label: 'Taslak Skor', value: 'Tekrar kontrol gerekli' },
    ],
  };
  const active = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6113,
    message: 'Bu ekranda kaç aktif operasyon var?',
    screenContext: context,
  });
  assert.ok(active);
  assert.match(active.reply, /aktif operasyon\/hizmet sayısı: 0/u);
  assert.equal(active.writeAction, false);

  const score = buildDirectScreenMetricResponse({
    user: { role: 'SUPER_ADMIN' },
    entityType: 'screen',
    entityId: 6113,
    message: 'Peki bu kalite puanı kesin mi?',
    screenContext: context,
  });
  assert.ok(score);
  assert.match(score.reply, /kesin kalite puanı vermez/u);
});
