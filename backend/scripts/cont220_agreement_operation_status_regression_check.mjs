import assert from 'node:assert/strict';
import { prisma } from '../src/prisma.js';
import { buildSelectedAgreementOperationStatusResponse } from '../src/ai/service.js';

const roomContext = {
  path: '/room/agreements',
  selectedEntityType: 'agreement',
  selectedEntityId: 11,
};
const companyContext = {
  path: '/company/agreements',
  selectedEntityType: 'agreement',
  selectedEntityId: 11,
};

try {
  const zero = await buildSelectedAgreementOperationStatusResponse({
    user: { role: 'ROOM', roomId: 1 },
    screenContext: roomContext,
    message: 'Bu sözleşme için operasyon kaydı oluştu mu?',
  });
  assert.match(zero?.reply || '', /bağlı operasyon vardiyası kaydı yok/u);
  assert.match(zero?.reply || '', /GPS, biniş veya gerçekleşmiş hizmet kanıtı oluşmuş sayılmıyor/u);

  const positive = await buildSelectedAgreementOperationStatusResponse({
    user: { role: 'ROOM', roomId: 1 },
    screenContext: { ...roomContext, selectedEntityId: 9 },
    message: 'Bu sözleşme için bağlı operasyon kaydı var mı?',
  });
  assert.match(positive?.reply || '', /1 bağlı operasyon vardiyası kaydı var/u);
  assert.match(positive?.reply || '', /Vardiya #22/u);

  const company = await buildSelectedAgreementOperationStatusResponse({
    user: { role: 'COMPANY', companyId: 1 },
    screenContext: companyContext,
    message: 'Bu sözleşme için operasyon kaydı var mı?',
  });
  assert.match(company?.reply || '', /bağlı operasyon vardiyası kaydı yok/u);

  const denied = await buildSelectedAgreementOperationStatusResponse({
    user: { role: 'COMPANY', companyId: 999999 },
    screenContext: companyContext,
    message: 'Bu sözleşme için operasyon kaydı var mı?',
  });
  assert.match(denied?.reply || '', /yetkili kapsamında doğrulayamıyorum/u);
  assert.deepEqual(denied.authorizedRecords, []);

  console.log('CONT220_AGREEMENT_OPERATION_STATUS_REGRESSION=PASS');
} finally {
  await prisma.$disconnect();
}
