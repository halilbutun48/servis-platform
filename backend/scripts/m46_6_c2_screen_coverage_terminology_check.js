import { banner, step, must, login, reqJson } from './_harness.js';

async function main() {
  banner('M46.6-C2 SCREEN COVERAGE + TERMINOLOGY CHECK');

  step('login demo users');
  const roomToken = await login('room@demo.com', 'demo123');
  const companyToken = await login('company@demo.com', 'demo123');
  const driverToken = await login('driver@demo.com', 'demo123');
  must('room login ok', !!roomToken);
  must('company login ok', !!companyToken);
  must('driver login ok', !!driverToken);

  step('company hub term help');
  const hubChat = await reqJson('POST', '/api/ai/copilot', {
    token: companyToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 2106,
      message: 'hub ne demek',
      screenContext: { id: 2106, path: '/company/hub', label: 'Hub' },
    },
  });
  must('hub chat ok', hubChat.ok && hubChat.json?.mode === 'CHAT_HELP');
  must('hub reply explains main point', /ana nokta|toplandığı|bırakıldığı/i.test(String(hubChat.json?.reply || '')));
  must('hub chips include inbound or outbound', (hubChat.json?.suggestedChips || []).some((x) => /Inbound|Outbound/i.test(String(x || ''))));

  step('company georeview term help');
  const geoChat = await reqJson('POST', '/api/ai/copilot', {
    token: companyToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 2109,
      message: 'osrm ve matrix ne demek',
      screenContext: { id: 2109, path: '/company/georeview', label: 'Konum İncele' },
    },
  });
  must('georeview chat ok', geoChat.ok && geoChat.json?.mode === 'CHAT_HELP');
  const geoReply = String(geoChat.json?.reply || '');
  const geoChips = Array.isArray(geoChat.json?.suggestedChips) ? geoChat.json.suggestedChips.map((x) => String(x || '')) : [];
  must('georeview reply explains route estimate basics', /(OSRM|Matrix|rota|yol|mesafe|süre|sure|hesap)/i.test(geoReply));
  must('georeview response offers follow-up help', geoChips.length > 0 || /Konum İncele|konum|incele|şimdi ne yap|simdi ne yap/i.test(geoReply));

  step('school parent access term help');
  const parentAccessChat = await reqJson('POST', '/api/ai/copilot', {
    token: companyToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 2201,
      message: 'veli erişimi ile öğrenci linki aynı şey mi',
      screenContext: { id: 2201, path: '/school/parents', label: 'Veli Erişimi' },
    },
  });
  must('parent access chat ok', parentAccessChat.ok && parentAccessChat.json?.mode === 'CHAT_HELP');
  must('parent access reply compares access and link', /Aynı şey değil|Eski giriş daveti akışı kaldırıldı/i.test(String(parentAccessChat.json?.reply || '')));

  step('shared notifications vs logs term help');
  const notificationsChat = await reqJson('POST', '/api/ai/copilot', {
    token: roomToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 1111,
      message: 'bildirimlerle loglar aynı şey mi',
      screenContext: { id: 1111, path: '/shared/notifications', label: 'Bildirimler' },
    },
  });
  must('notifications chat ok', notificationsChat.ok && notificationsChat.json?.mode === 'CHAT_HELP');
  must('notifications reply compares logs and notifications', /Aynı şey değil/i.test(String(notificationsChat.json?.reply || '')));

  step('driver check-in term help');
  const checkinChat = await reqJson('POST', '/api/ai/copilot', {
    token: driverToken,
    body: {
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 3104,
      message: 'check-in ne demek',
      screenContext: { id: 3104, path: '/driver/checkin', label: 'Check-in' },
    },
  });
  must('driver check-in chat ok', checkinChat.ok && checkinChat.json?.mode === 'CHAT_HELP');
  must('driver role mode simple', checkinChat.json?.roleMode === 'SIMPLE');
  must('check-in reply exists', /Check-in|doğrulayan kayıt|bindiğini|indiğini/i.test(String(checkinChat.json?.reply || '')));

  banner('M46.6-C2 SCREEN COVERAGE + TERMINOLOGY CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
