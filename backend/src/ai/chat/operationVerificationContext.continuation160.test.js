import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatHelpResponse } from './helpComposer.js';

const screenContext = {
  id: 6109,
  path: '/superadmin/operation-verification',
  label: 'Operasyon Doğrulama',
  role: 'SUPER_ADMIN',
  selectedFields: [
    { label: 'Rol', value: 'Süper Yönetici' },
    { label: 'Kayıtlı Kontrol', value: '3' },
    { label: 'Toplam Kontrol', value: '3' },
    { label: 'Durum özeti', value: 'Kabul: 2 • Red: 0 • Eksik: 1 • Tekrar kontrol: 0' },
    { label: 'İlk kontrol', value: 'Operasyon özeti' },
  ],
};

function ask(message) {
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 6109,
    user: { role: 'SUPER_ADMIN', companyId: 1 },
    scope: { role: 'SUPER_ADMIN', roleMode: 'OPERATIONS' },
    message,
    screenContext,
  });
}

test('operation verification count uses the selected visible context', () => {
  const result = ask('Operasyon doğrulama ekranında kaç kontrol kaydı var?');
  assert.match(result.reply, /3 kayıtlı kontrol/);
  assert.match(result.reply, /toplam kontrol 3/);
  assert.equal(result.activeTopic, 'OPERATION_VERIFICATION_CONTEXT');
});

test('operation verification follow-up preserves role and status summary', () => {
  const result = ask('Peki seçili rol hangisi ve durum özeti ne?');
  assert.match(result.reply, /Seçili rol: Süper Yönetici/);
  assert.match(result.reply, /Kabul: 2/);
  assert.match(result.reply, /Eksik: 1/);
});
