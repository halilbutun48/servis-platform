import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.6-D3 AI ACTIONABLE CHAT CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  const driverToken = await login('driver@demo.com', 'demo123');
  must('room login ok', !!roomToken);
  must('driver login ok', !!driverToken);

  step('room shift actionable chat');
  const roomShiftChat = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'shift',
      entityId: 1,
      message: 'ilgili yere götür',
      screenContext: { id: 1103, path: '/room/shifts', label: 'Vardiyalar' },
    },
  });
  must('room shift chat ok', roomShiftChat.ok && roomShiftChat.json?.mode === 'CHAT_HELP');
  const roomShiftVersion = String(roomShiftChat.json?.copilotVersion || '');
  must('room shift shell metadata present', /^M46\.6-D/.test(roomShiftVersion) || !!roomShiftChat.json?.roleMode || !!roomShiftChat.json?.actionPlanLabel);
  must('room shift action plan label exists', !!roomShiftChat.json?.actionPlanLabel);
  must('room shift quick actions visible', Array.isArray(roomShiftChat.json?.quickActions) && roomShiftChat.json.quickActions.length >= 3);
  must('room shift route action exists', roomShiftChat.json.quickActions.some((x) => x?.actionKind === 'OPEN_ROUTE'));
  must('room shift guide affordance exists', roomShiftChat.json.quickActions.some((x) => x?.actionKind === 'OPEN_GUIDE') || (Array.isArray(roomShiftChat.json?.linkedGuides) && roomShiftChat.json.linkedGuides.length > 0));
  must('room shift ask affordance exists', roomShiftChat.json.quickActions.some((x) => x?.actionKind === 'ASK') || !!roomShiftChat.json?.followUpPrompt || (Array.isArray(roomShiftChat.json?.suggestedChips) && roomShiftChat.json.suggestedChips.length > 0));

  step('room vehicle actionable chat');
  const roomVehicleChat = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'vehicle',
      entityId: 1,
      message: 'konum neden görünmüyor',
      screenContext: { id: 1104, path: '/room/vehicles', label: 'Araçlar' },
    },
  });
  must('room vehicle chat ok', roomVehicleChat.ok && roomVehicleChat.json?.mode === 'CHAT_HELP');
  must('room vehicle route params exist', roomVehicleChat.json.quickActions.some((x) => x?.routeParams && typeof x.routeParams === 'object'));

  step('driver simple actionable chat remains simple');
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
  must('driver chat ok', driverChat.ok && driverChat.json?.mode === 'CHAT_HELP');
  must('driver role mode simple', driverChat.json?.roleMode === 'SIMPLE');
  must('driver ask or guide action visible', driverChat.json.quickActions.some((x) => ['ASK','OPEN_GUIDE','COPY_TEXT'].includes(String(x?.actionKind || ''))));

  banner('M46.6-D3 AI ACTIONABLE CHAT CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
