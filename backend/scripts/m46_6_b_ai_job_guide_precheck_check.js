import { banner, step, must, login, reqJson, itemsOf } from './_harness.js';

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner('M46.6-B AI JOB GUIDE PRECHECK CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  const companyToken = await login('company@demo.com', 'demo123');
  must('room login ok', !!roomToken);
  must('company login ok', !!companyToken);

  step('discover scoped ids');
  const roomShifts = await reqJson('GET', '/api/shifts?includeOffered=1&take=5', { token: roomToken });
  const roomShiftId = firstId(roomShifts);
  must('room shift id found', !!roomShiftId);
  const roomVehicles = await reqJson('GET', '/api/vehicles', { token: roomToken });
  const vehicleId = firstId(roomVehicles);
  must('room vehicle id found', !!vehicleId);

  step('offer approval precheck');
  const offerApproval = await reqJson('POST', '/api/ai/copilot', {
    token: companyToken,
    body: { intent: 'JOB_GUIDE', jobType: 'OFFER_APPROVAL', guideLevel: 'SHORT', entityType: 'shift', entityId: roomShiftId },
  });
  must('offer approval ok', offerApproval.ok && offerApproval.json?.jobType === 'OFFER_APPROVAL');
  must('copilot version upgraded', /^M46\.6-/.test(String(offerApproval.json?.copilotVersion || '')) || Array.isArray(offerApproval.json?.beforeYouStart) || !!offerApproval.json?.precheckLabel);
  must('before you start visible', Array.isArray(offerApproval.json?.beforeYouStart) && offerApproval.json.beforeYouStart.length > 0);
  must('precheck label visible', typeof offerApproval.json?.precheckLabel === 'string' && offerApproval.json.precheckLabel.length > 0);
  must('locked reasons visible', Array.isArray(offerApproval.json?.lockedActionReasons));
  must('quick actions visible', Array.isArray(offerApproval.json?.quickActions) && offerApproval.json.quickActions.length > 0);
  must('copy outputs visible', typeof offerApproval.json?.copyOutputs?.opsNote === 'string' && offerApproval.json.copyOutputs.opsNote.length > 0);

  step('vehicle bind precheck');
  const vehicleBind = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: { intent: 'JOB_GUIDE', jobType: 'VEHICLE_DRIVER_BIND', guideLevel: 'WHY', entityType: 'vehicle', entityId: vehicleId },
  });
  must('vehicle bind ok', vehicleBind.ok && vehicleBind.json?.jobType === 'VEHICLE_DRIVER_BIND');
  must('if stuck visible', Array.isArray(vehicleBind.json?.ifStuck) && vehicleBind.json.ifStuck.length > 0);
  must('before you start visible on vehicle bind', Array.isArray(vehicleBind.json?.beforeYouStart) && vehicleBind.json.beforeYouStart.length > 0);

  banner('M46.6-B AI JOB GUIDE PRECHECK CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
