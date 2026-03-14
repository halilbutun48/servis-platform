import { prisma } from '../src/prisma.js';
import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M47 KVKK NOTICE / CONSENT FRAMEWORK CHECK');
  const startedAt = new Date();

  step('login room');
  const roomToken = await login('room@demo.com', 'demo123');
  must('room login ok', !!roomToken);

  step('create driver with auto credentials');
  const suffix = String(Date.now()).slice(-6);
  const created = await reqJson('POST', '/api/drivers', {
    token: roomToken,
    body: {
      fullName: `M47 Surucu ${suffix}`,
      phone: `0557${suffix}`,
      deviceInfo: 'Android Telefon',
    },
  });
  must('driver create ok', created.ok);

  const driverCode = String(created.json?.issuedCredentials?.driverCode || '');
  const tempPin = String(created.json?.issuedCredentials?.temporaryPin || '');
  must('driver code issued', !!driverCode);
  must('temporary pin issued', !!tempPin);

  step('driver login');
  const deviceId = `m47-device-${suffix}`;
  const loginOk = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: tempPin, deviceId },
  });
  must('driver login ok', loginOk.ok && !!loginOk.json?.token);
  const driverToken = String(loginOk.json?.token || '');

  step('me shows kvkk blocking before accept');
  const meBefore = await reqJson('GET', '/api/me', { token: driverToken });
  must('me before ok', meBefore.ok);
  must('kvkk blocking before accept', meBefore.json?.kvkk?.blocking === true);

  step('documents current returns notice + consent');
  const docs = await reqJson('GET', '/api/kvkk/documents/current', { token: driverToken });
  must('documents current ok', docs.ok);
  const items = Array.isArray(docs.json?.items) ? docs.json.items : [];
  must('documents count >= 2', items.length >= 2);
  must('location notice exists', items.some((x) => x.docKey === 'LOCATION_NOTICE'));
  must('location consent exists', items.some((x) => x.docKey === 'LOCATION_CONSENT'));

  step('accept all required kvkk docs');
  const acceptAll = await reqJson('POST', '/api/kvkk/consents/accept-many', { token: driverToken, body: {} });
  must('accept all ok', acceptAll.ok && Number(acceptAll.json?.count || 0) >= 2);

  const meAfterAccept = await reqJson('GET', '/api/me', { token: driverToken });
  must('me after accept ok', meAfterAccept.ok);
  must('kvkk blocking cleared', meAfterAccept.json?.kvkk?.blocking === false);
  must('accepted count visible', Number(meAfterAccept.json?.kvkk?.acceptedCount || 0) >= 2);

  step('revoke location consent and block again');
  const revoke = await reqJson('POST', '/api/kvkk/consents/revoke', {
    token: driverToken,
    body: { docKey: 'LOCATION_CONSENT' },
  });
  must('revoke ok', revoke.ok);

  const meAfterRevoke = await reqJson('GET', '/api/me', { token: driverToken });
  must('me after revoke ok', meAfterRevoke.ok);
  must('kvkk blocking after revoke', meAfterRevoke.json?.kvkk?.blocking === true);
  must('pending doc key contains location consent', Array.isArray(meAfterRevoke.json?.kvkk?.pendingDocKeys) && meAfterRevoke.json.kvkk.pendingDocKeys.includes('LOCATION_CONSENT'));

  step('audit traces exist');
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startedAt },
      action: { in: ['KVKK_DOC_ACCEPT', 'KVKK_DOC_REVOKE'] },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 200,
  });

  must('kvkk accept audit visible', logs.some((x) => x.action === 'KVKK_DOC_ACCEPT'));
  must('kvkk revoke audit visible', logs.some((x) => x.action === 'KVKK_DOC_REVOKE'));

  banner('M47 KVKK NOTICE / CONSENT FRAMEWORK CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
