import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.7 DRIVER CODE LOGIN + REHBER FIRST CHECK');

  step('login room');
  const roomToken = await login('room@demo.com', 'demo123');
  must('room login ok', !!roomToken);

  step('create driver with auto credentials');
  const suffix = String(Date.now()).slice(-6);
  const created = await reqJson('POST', '/api/drivers', {
    token: roomToken,
    body: {
      fullName: `Kodlu Surucu ${suffix}`,
      phone: `0555${suffix}`,
      deviceInfo: 'Android Telefon',
    },
  });
  must('driver create ok', created.ok);
  must('driver code issued', !!created.json?.issuedCredentials?.driverCode);
  must('temporary pin issued', !!created.json?.issuedCredentials?.temporaryPin);
  must('login mode driver code pin', created.json?.loginMode === 'DRIVER_CODE_PIN');

  const driverId = Number(created.json?.id || 0);
  const driverCode = String(created.json?.issuedCredentials?.driverCode || '');
  const tempPin = String(created.json?.issuedCredentials?.temporaryPin || '');
  must('driver id present', Number.isFinite(driverId) && driverId > 0);

  step('driver login by code + pin');
  const loginResp = await reqJson('POST', '/api/auth/login', {
    body: { identifier: driverCode, password: tempPin },
  });
  must('driver code login ok', loginResp.ok && !!loginResp.json?.token);
  const driverToken = loginResp.json.token;

  step('me shows pin change required');
  const me1 = await reqJson('GET', '/api/me', { token: driverToken });
  must('driver me ok', me1.ok);
  must('driver code visible', me1.json?.driverCode === driverCode);
  must('require pin change true', me1.json?.requirePinChange === true);

  step('change driver pin');
  const changed = await reqJson('POST', '/api/auth/driver/change-pin', {
    token: driverToken,
    body: { currentPin: tempPin, newPin: '654321' },
  });
  must('driver pin change ok', changed.ok && changed.json?.ok === true);

  const me2 = await reqJson('GET', '/api/me', { token: driverToken });
  must('require pin change false', me2.ok && me2.json?.requirePinChange === false);

  step('room can reset driver pin');
  const reset = await reqJson('POST', `/api/drivers/${driverId}/reset-pin`, {
    token: roomToken,
    body: {},
  });
  must('room reset pin ok', reset.ok && !!reset.json?.issuedCredentials?.temporaryPin);
  must('driver code stable after reset', String(reset.json?.issuedCredentials?.driverCode || '') === driverCode);

  banner('M46.7 DRIVER CODE LOGIN + REHBER FIRST CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
