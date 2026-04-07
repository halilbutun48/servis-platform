import { prisma } from '../src/prisma.js';
import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.8 DRIVER ACCESS HARDENING CHECK');

  const startedAt = new Date();

  step('login room');
  const roomToken = await login('room@demo.com', 'demo123');
  must('room login ok', !!roomToken);

  step('create driver with auto credentials');
  const suffix = String(Date.now()).slice(-6);
  const created = await reqJson('POST', '/api/drivers', {
    token: roomToken,
    body: {
      fullName: `M468 Surucu ${suffix}`,
      phone: `0556${suffix}`,
      deviceInfo: 'Android Telefon',
    },
  });
  must('driver create ok', created.ok);

  const driverId = Number(created.json?.id || 0);
  const driverCode = String(created.json?.issuedCredentials?.driverCode || '');
  const tempPin = String(created.json?.issuedCredentials?.temporaryPin || '');
  must('driver id present', driverId > 0);
  must('driver code issued', !!driverCode);
  must('temporary pin issued', !!tempPin);

  const driverRow = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } });
  must('driver user linked', !!driverRow?.userId && !!driverRow?.user);
  const driverUserId = Number(driverRow.userId || 0);
  const deviceId = `m468-device-${suffix}`;

  step('driver login with deviceId');
  const loginOk = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: tempPin, deviceId },
  });
  must('driver code login ok', loginOk.ok && !!loginOk.json?.token);
  const driverToken = String(loginOk.json.token || '');

  const me1 = await reqJson('GET', '/api/me', { token: driverToken });
  must('driver me ok', me1.ok);
  must('require pin change true', me1.json?.requirePinChange === true);

  const userAfterLogin = await prisma.user.findUnique({ where: { id: driverUserId } });
  must('device bound after login', String(userAfterLogin?.deviceId || '') === deviceId);

  step('weak pin rejected');
  const weak = await reqJson('POST', '/api/auth/driver/change-pin', {
    token: driverToken,
    body: { currentPin: tempPin, newPin: '111111' },
  });
  const weakCode = String(weak.json?.code || weak.json?.error?.code || weak.json?.error || '');
  must('weak pin rejected', weak.status === 400 && weakCode === 'PIN_TOO_WEAK');

  step('good pin accepted');
  const changed = await reqJson('POST', '/api/auth/driver/change-pin', {
    token: driverToken,
    body: { currentPin: tempPin, newPin: '246802' },
  });
  must('driver pin change ok', changed.ok && changed.json?.ok === true);

  const me2 = await reqJson('GET', '/api/me', { token: driverToken });
  must('require pin change false', me2.ok && me2.json?.requirePinChange === false);

  step('wrong pin attempts trigger lock');
  let lockResp = null;
  for (let i = 0; i < 6; i += 1) {
    const bad = await reqJson('POST', '/api/auth/login', {
      body: { identifier: driverCode, password: '000000', deviceId },
    });
    must(`bad pin request ${i + 1} handled`, bad.status === 401 || bad.status === 423);
    if (bad.status === 423) {
      lockResp = bad;
      break;
    }
  }
  must('pin locked response seen', !!lockResp);
  const lockCode = String(lockResp?.json?.code || lockResp?.json?.error?.code || lockResp?.json?.error || '');
  must('pin locked code ok', lockCode === 'PIN_LOCKED');
  must('pin locked cooldown present', Number(lockResp?.json?.cooldownSec || 0) > 0);

  step('room reset pin clears lock');
  const reset = await reqJson('POST', `/api/drivers/${driverId}/reset-pin`, {
    token: roomToken,
    body: {},
  });
  must('room reset pin ok', reset.ok && !!reset.json?.issuedCredentials?.temporaryPin);
  const resetPin = String(reset.json?.issuedCredentials?.temporaryPin || '');
  must('reset temp pin issued', !!resetPin && resetPin !== tempPin);

  const loginAfterReset = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: resetPin, deviceId },
  });
  must('login after reset ok', loginAfterReset.ok && !!loginAfterReset.json?.token);

  const oldPinAfterReset = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: '246802', deviceId },
  });
  must('old pin rejected after reset', oldPinAfterReset.status === 401);

  step('audit traces exist');
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startedAt },
      OR: [
        { action: 'AUTH_DRIVER_PIN_CHANGE_FAIL', actorUserId: driverUserId },
        { action: 'AUTH_DRIVER_PIN_CHANGE_OK', actorUserId: driverUserId },
        { action: 'AUTH_DRIVER_PIN_LOCKED', actorUserId: driverUserId },
        { action: 'AUTH_DRIVER_PIN_RESET', entityId: driverId },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  const hasWeakReject = logs.some((x) => x.action === 'AUTH_DRIVER_PIN_CHANGE_FAIL' && String(x.meta?.policyCode || x.meta?.reason || x.meta?.reasonCode || x.meta?.code || '') === 'PIN_TOO_WEAK');
  const hasPinChangeOk = logs.some((x) => x.action === 'AUTH_DRIVER_PIN_CHANGE_OK');
  const hasPinLocked = logs.some((x) => x.action === 'AUTH_DRIVER_PIN_LOCKED');
  const hasPinReset = logs.some((x) => x.action === 'AUTH_DRIVER_PIN_RESET');
  must('audit weak pin reject visible', hasWeakReject);
  must('audit pin change ok visible', hasPinChangeOk);
  must('audit pin locked visible', hasPinLocked);
  must('audit pin reset visible', hasPinReset);

  banner('M46.8 DRIVER ACCESS HARDENING CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
