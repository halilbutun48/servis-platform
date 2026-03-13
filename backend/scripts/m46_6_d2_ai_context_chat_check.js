import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.6-D2 AI CONTEXT CHAT CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  const driverToken = await login('driver@demo.com', 'demo123');
  must('room login ok', !!roomToken);
  must('driver login ok', !!driverToken);

  step('room shift-aware chat help');
  const roomShiftChat = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'shift',
      entityId: 1,
      message: 'bu kayıt ne durumda',
      screenContext: { id: 1103, path: '/room/shifts', label: 'Vardiyalar' },
    },
  });
  must('room shift chat ok', roomShiftChat.ok && roomShiftChat.json?.mode === 'CHAT_HELP');
  must('room shift version upgraded', ['M46.6-D2','M46.6-D3','M46.6-D4'].includes(roomShiftChat.json?.copilotVersion));
  must('room shift context summary exists', !!roomShiftChat.json?.contextSummary);
  must('room shift quick actions visible', Array.isArray(roomShiftChat.json?.quickActions) && roomShiftChat.json.quickActions.length >= 1);
  must('room shift chips visible', Array.isArray(roomShiftChat.json?.suggestedChips) && roomShiftChat.json.suggestedChips.length >= 3);

  step('room vehicle-aware chat help');
  const roomVehicleChat = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'vehicle',
      entityId: 1,
      message: 'bu araçta telefon gps mi cihaz gps mi var',
      screenContext: { id: 1104, path: '/room/vehicles', label: 'Araçlar' },
    },
  });
  must('room vehicle chat ok', roomVehicleChat.ok && roomVehicleChat.json?.mode === 'CHAT_HELP');
  must('room vehicle reply exists', !!roomVehicleChat.json?.reply);
  must('room vehicle role mode exists', !!roomVehicleChat.json?.roleMode);

  step('driver simple chat remains simple');
  const driverChat = await reqJson('POST', '/api/ai/copilot', {
    token: driverToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 3101,
      message: 'şimdi ne yapayım',
      screenContext: { id: 3101, path: '/driver/today', label: 'Bugün' },
    },
  });
  must('driver chat help ok', driverChat.ok && driverChat.json?.mode === 'CHAT_HELP');
  must('driver role mode simple', driverChat.json?.roleMode === 'SIMPLE');
  must('driver chips visible', Array.isArray(driverChat.json?.suggestedChips) && driverChat.json.suggestedChips.length >= 3);

  banner('M46.6-D2 AI CONTEXT CHAT CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
