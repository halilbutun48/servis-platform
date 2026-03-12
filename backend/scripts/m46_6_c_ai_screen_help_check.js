import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.6-C AI SCREEN HELP CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  const companyToken = await login('company@demo.com', 'demo123');
  const driverToken = await login('driver@demo.com', 'demo123');
  const personelToken = await login('personel@demo.com', 'demo123');
  const parentToken = await login('parent@demo.com', 'demo123');
  must('room login ok', !!roomToken);
  must('company login ok', !!companyToken);
  must('driver login ok', !!driverToken);
  must('personel login ok', !!personelToken);
  must('parent login ok', !!parentToken);

  step('room screen menu guide');
  const roomGuide = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'JOB_GUIDE', jobType: 'SCREEN_MENU_GUIDE', guideLevel: 'SHORT',
      entityType: 'screen', entityId: 1106,
      screenContext: { path: '/room/agreements', label: 'Sözleşmeler' },
    },
  });
  must('room screen guide ok', roomGuide.ok && roomGuide.json?.jobType === 'SCREEN_MENU_GUIDE');
  must('menu purpose visible', !!roomGuide.json?.menuPurpose?.description);
  must('button guides visible', Array.isArray(roomGuide.json?.buttonGuides) && roomGuide.json.buttonGuides.length > 0);

  step('driver role help guide');
  const driverGuide = await reqJson('POST', '/api/ai/copilot', {
    token: driverToken,
    body: {
      intent: 'JOB_GUIDE', jobType: 'ROLE_HELP_GUIDE', guideLevel: 'SHORT',
      entityType: 'screen', entityId: 3101,
      screenContext: { path: '/driver/today', label: 'Bugün' },
    },
  });
  must('driver role help ok', driverGuide.ok && driverGuide.json?.jobType === 'ROLE_HELP_GUIDE');
  must('driver guide opens for simple role', driverGuide.ok);
  must('driver screen menus visible', Array.isArray(driverGuide.json?.screenMenus) && driverGuide.json.screenMenus.length > 0);

  step('parent button guide');
  const parentGuide = await reqJson('POST', '/api/ai/copilot', {
    token: parentToken,
    body: {
      intent: 'JOB_GUIDE', jobType: 'BUTTON_ACTION_GUIDE', guideLevel: 'WHY',
      entityType: 'screen', entityId: 5101,
      screenContext: { path: '/parent/live', label: 'Canlı' },
    },
  });
  must('parent button guide ok', parentGuide.ok && parentGuide.json?.jobType === 'BUTTON_ACTION_GUIDE');
  must('parent button explanations visible', Array.isArray(parentGuide.json?.buttonGuides) && parentGuide.json.buttonGuides.length > 0);
  must('copilot version upgraded', parentGuide.json?.copilotVersion === 'M46.6-C');

  banner('M46.6-C AI SCREEN HELP CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
