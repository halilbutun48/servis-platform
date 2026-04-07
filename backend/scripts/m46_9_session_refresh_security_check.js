import { prisma } from '../src/prisma.js';
import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.9 SESSION & REFRESH SECURITY CHECK');

  const startedAt = new Date();

  step('login room');
  const roomToken = await login('room@demo.com', 'demo123');
  must('room login ok', !!roomToken);

  step('create driver with auto credentials');
  const suffix = String(Date.now()).slice(-6);
  const created = await reqJson('POST', '/api/drivers', {
    token: roomToken,
    body: {
      fullName: `M469 Surucu ${suffix}`,
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

  const deviceId = `m469-device-${suffix}`;

  step('driver login returns refreshToken');
  const loginOk = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: tempPin, deviceId },
  });
  must('driver login ok', loginOk.ok && !!loginOk.json?.token && !!loginOk.json?.refreshToken);

  const token1 = String(loginOk.json?.token || '');
  const refresh1 = String(loginOk.json?.refreshToken || '');

  step('refresh rotates refresh token');
  const refreshed = await reqJson('POST', '/api/auth/refresh', {
    body: { refreshToken: refresh1, deviceId },
  });
  must('refresh ok', refreshed.ok && !!refreshed.json?.token && !!refreshed.json?.refreshToken);

  const token2 = String(refreshed.json?.token || '');
  const refresh2 = String(refreshed.json?.refreshToken || '');
  must('refresh token rotated', refresh2 && refresh2 !== refresh1);

  step('reuse old refresh token detected');
  const reuse = await reqJson('POST', '/api/auth/refresh', {
    body: { refreshToken: refresh1, deviceId },
  });
  must('reuse returns 401', reuse.status === 401);
  const reuseCode = String(reuse.json?.code || reuse.json?.error?.code || reuse.json?.error || '');
  must('reuse detected code ok', reuseCode === 'REFRESH_REUSE_DETECTED');

  step('session list visible');
  const sessions = await reqJson('GET', '/api/me/sessions', { token: token2 });
  must('sessions endpoint ok', sessions.ok);
  must('sessions list present', Array.isArray(sessions.json?.items));

  step('revoke-all invalidates access token');
  const revokeAll = await reqJson('POST', '/api/me/sessions/revoke-all', { token: token2, body: {} });
  must('revoke-all ok', revokeAll.ok && revokeAll.json?.ok === true);

  const meAfterRevoke = await reqJson('GET', '/api/me', { token: token2 });
  must('old token rejected after revoke-all', meAfterRevoke.status === 401);

  step('login again after revoke-all');
  const loginAgain = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: tempPin, deviceId },
  });
  must('re-login ok', loginAgain.ok && !!loginAgain.json?.token);
  const token3 = String(loginAgain.json?.token || '');

  step('room reset pin invalidates existing access tokens');
  const reset = await reqJson('POST', `/api/drivers/${driverId}/reset-pin`, { token: roomToken, body: {} });
  must('reset pin ok', reset.ok && !!reset.json?.issuedCredentials?.temporaryPin);
  const newTempPin = String(reset.json?.issuedCredentials?.temporaryPin || '');
  must('new temp pin differs', newTempPin && newTempPin !== tempPin);

  const meAfterResetOldToken = await reqJson('GET', '/api/me', { token: token3 });
  must('old token rejected after room reset', meAfterResetOldToken.status === 401);

  const loginAfterReset = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: newTempPin, deviceId },
  });
  must('login after reset ok', loginAfterReset.ok && !!loginAfterReset.json?.token);

  step('audit traces exist');
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startedAt },
      OR: [
        { action: 'AUTH_REFRESH_OK' },
        { action: 'AUTH_REFRESH_REUSE_DETECTED' },
        { action: 'AUTH_SESSION_REVOKE_ALL' },
        { action: 'AUTH_DRIVER_PIN_RESET' },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 200,
  });

  const hasRefreshOk = logs.some((x) => x.action === 'AUTH_REFRESH_OK');
  const hasReuse = logs.some((x) => x.action === 'AUTH_REFRESH_REUSE_DETECTED');
  const hasRevokeAll = logs.some((x) => x.action === 'AUTH_SESSION_REVOKE_ALL');
  const hasReset = logs.some((x) => x.action === 'AUTH_DRIVER_PIN_RESET');

  must('audit refresh ok visible', hasRefreshOk);
  must('audit refresh reuse detected visible', hasReuse);
  must('audit session revoke-all visible', hasRevokeAll);
  must('audit pin reset visible', hasReset);

  banner('M46.9 SESSION & REFRESH SECURITY CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
