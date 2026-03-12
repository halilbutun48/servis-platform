import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.6-D AI CHAT SHELL CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  const driverToken = await login('driver@demo.com', 'demo123');
  must('room login ok', !!roomToken);
  must('driver login ok', !!driverToken);

  step('room chat help on offers screen');
  const roomChat = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 1102,
      message: 'neden kapalı',
      screenContext: { path: '/room/offers', label: 'Teklifler' },
    },
  });
  must('room chat help ok', roomChat.ok && roomChat.json?.mode === 'CHAT_HELP');
  must('room reply exists', !!roomChat.json?.reply);
  must('room suggested chips visible', Array.isArray(roomChat.json?.suggestedChips) && roomChat.json.suggestedChips.length >= 3);
  must('room quick actions visible', Array.isArray(roomChat.json?.quickActions) && roomChat.json.quickActions.length >= 1);
  must('room linked guides visible', Array.isArray(roomChat.json?.linkedGuides) && roomChat.json.linkedGuides.length >= 1);

  step('driver simple chat help');
  const driverChat = await reqJson('POST', '/api/ai/copilot', {
    token: driverToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 3101,
      message: 'bu ekranda ne yapabilirim',
      screenContext: { path: '/driver/today', label: 'Bugün' },
    },
  });
  must('driver chat help ok', driverChat.ok && driverChat.json?.mode === 'CHAT_HELP');
  must('driver reply short exists', !!driverChat.json?.reply);
  must('driver version upgraded', driverChat.json?.copilotVersion === 'M46.6-D1');

  banner('M46.6-D AI CHAT SHELL CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
