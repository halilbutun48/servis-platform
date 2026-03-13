import { banner, step, must, login, reqJson } from './_harness.js';

function len(value) {
  return String(value || '').trim().length;
}

async function main() {
  banner('M46.6-D4 SIMPLE ROLE MODE CHECK');

  step('login simple demo users');
  const driverToken = await login('driver@demo.com', 'demo123');
  const personelToken = await login('personel@demo.com', 'demo123');
  const parentToken = await login('parent@demo.com', 'demo123');
  must('driver login ok', !!driverToken);
  must('personel login ok', !!personelToken);
  must('parent login ok', !!parentToken);

  step('driver next-step chat is compact');
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
  must('driver version upgraded', driverChat.json?.copilotVersion === 'M46.6-D4');
  must('driver role mode simple', driverChat.json?.roleMode === 'SIMPLE');
  must('driver action plan label simple', driverChat.json?.actionPlanLabel === 'Buradan devam et');
  must('driver quick actions compact', Array.isArray(driverChat.json?.quickActions) && driverChat.json.quickActions.length >= 2 && driverChat.json.quickActions.length <= 3);
  must('driver chips compact', Array.isArray(driverChat.json?.suggestedChips) && driverChat.json.suggestedChips.length >= 3 && driverChat.json.suggestedChips.length <= 4);
  must('driver route action prioritized', String(driverChat.json?.quickActions?.[0]?.actionKind || '') === 'OPEN_ROUTE');
  must('driver reply compact', len(driverChat.json?.reply) > 0 && len(driverChat.json?.reply) <= 220);

  step('personel screen purpose stays simple');
  const personelChat = await reqJson('POST', '/api/ai/copilot', {
    token: personelToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 4101,
      message: 'bu ekran ne için var',
      screenContext: { id: 4101, path: '/personel/live', label: 'Canlı' },
    },
  });
  must('personel chat ok', personelChat.ok && personelChat.json?.mode === 'CHAT_HELP');
  must('personel role mode simple', personelChat.json?.roleMode === 'SIMPLE');
  must('personel follow up exists', !!personelChat.json?.followUpPrompt);
  must('personel context summary compact', /^Ekran:/i.test(String(personelChat.json?.contextSummary || '')));
  must('personel linked guides compact', Array.isArray(personelChat.json?.linkedGuides) && personelChat.json.linkedGuides.length <= 1);

  step('parent term help remains low density');
  const parentChat = await reqJson('POST', '/api/ai/copilot', {
    token: parentToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 5101,
      message: 'bu ne demek',
      screenContext: { id: 5101, path: '/parent/live', label: 'Canlı' },
    },
  });
  must('parent chat ok', parentChat.ok && parentChat.json?.mode === 'CHAT_HELP');
  must('parent role mode simple', parentChat.json?.roleMode === 'SIMPLE');
  must('parent quick actions compact', Array.isArray(parentChat.json?.quickActions) && parentChat.json.quickActions.length <= 3);
  must('parent reply compact', len(parentChat.json?.reply) > 0 && len(parentChat.json?.reply) <= 220);

  banner('M46.6-D4 SIMPLE ROLE MODE CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
