import { banner, step, must, login, reqJson, itemsOf } from './_harness.js';

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner('M46.6-T AI LOCATION SOURCE GUIDE CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  must('room login ok', !!roomToken);

  step('discover scoped vehicle');
  const roomVehicles = await reqJson('GET', '/api/vehicles', { token: roomToken });
  const vehicleId = firstId(roomVehicles);
  must('room vehicle id found', !!vehicleId);

  step('location source guide');
  const sourceGuide = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: { intent: 'JOB_GUIDE', jobType: 'LOCATION_SOURCE_GUIDE', guideLevel: 'WHY', entityType: 'vehicle', entityId: vehicleId },
  });
  must('location source guide ok', sourceGuide.ok && sourceGuide.json?.jobType === 'LOCATION_SOURCE_GUIDE');
  must('copilot version upgraded', sourceGuide.json?.copilotVersion === 'M46.6-T');
  must('location guide uses simple terms', Array.isArray(sourceGuide.json?.simpleTerms) && sourceGuide.json.simpleTerms.some((x) => String(x?.term || '').includes('telefon GPS')));
  must('location guide has quick actions', Array.isArray(sourceGuide.json?.quickActions) && sourceGuide.json.quickActions.length > 0);

  step('telematics device create guide');
  const telematicsGuide = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: { intent: 'JOB_GUIDE', jobType: 'TELEMATICS_DEVICE_CREATE', guideLevel: 'SHORT', entityType: 'vehicle', entityId: vehicleId },
  });
  must('telematics guide ok', telematicsGuide.ok && telematicsGuide.json?.jobType === 'TELEMATICS_DEVICE_CREATE');
  must('telematics quick actions visible', Array.isArray(telematicsGuide.json?.quickActions) && telematicsGuide.json.quickActions.length > 0);
  must('telematics before you start visible', Array.isArray(telematicsGuide.json?.beforeYouStart) && telematicsGuide.json.beforeYouStart.length > 0);

  step('gps signal diagnosis guide');
  const gpsGuide = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: { intent: 'JOB_GUIDE', jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE', guideLevel: 'STEP_BY_STEP', entityType: 'vehicle', entityId: vehicleId },
  });
  must('gps signal guide ok', gpsGuide.ok && gpsGuide.json?.jobType === 'GPS_SIGNAL_DIAGNOSIS_GUIDE');
  must('gps guide if stuck visible', Array.isArray(gpsGuide.json?.ifStuck) && gpsGuide.json.ifStuck.length > 0);
  must('gps guide explanation visible', typeof gpsGuide.json?.screenExplanation === 'string' && gpsGuide.json.screenExplanation.length > 0);

  banner('M46.6-T AI LOCATION SOURCE GUIDE CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
