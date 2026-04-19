import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';

function must(label, cond) {
  if (!cond) {
    console.error('FAIL', label);
    process.exit(1);
  }
  console.log('OK', label);
}

function ask({ user, screenPath, message, screenContextExtra = {} }) {
  const baseScreenContext = { path: screenPath, ...screenContextExtra };
  const screenDefinition = getScreenDefinitionForUser(user, baseScreenContext);
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: screenDefinition.id,
    user,
    message,
    context: screenDefinition,
    entityLabel: screenDefinition.label,
    scope: { roleMode: 'OPERATIONS' },
    conversationState: { recentMessages: [], lastUserMessage: message },
    screenContext: { id: screenDefinition.id, path: screenDefinition.path, label: screenDefinition.label, ...screenContextExtra },
    screenDefinition,
  });
}

const companyUser = { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };

console.log('=== M71.2 COPILOT ROUTE BRIDGE SMOKE CHECK ===');

const q1 = ask({ user: companyUser, screenPath: '/company/commercial-flow', message: 'ticari akışımdan sonra nereye geçeyim' });
must('commercial -> shifts reply', /Vardiyalar/.test(q1.reply));
must('commercial -> shifts action first', String(q1.quickActions?.[0]?.label || '').includes('Vardiyalar'));

const q2 = ask({ user: companyUser, screenPath: '/company/georeview', message: 'konum inceleden sonra nereye geçeyim' });
must('georeview -> shifts reply', /Vardiyalar/.test(q2.reply));
must('georeview -> shifts action available', (q2.quickActions || []).some((row) => String(row?.label || '').includes('Vardiyalar')));

const q3 = ask({
  user: companyUser,
  screenPath: '/company/map',
  message: 'bu seçili kayıt için vardiyalar ekranında önce neye bakayım',
  screenContextExtra: {
    selectedLabel: 'Vardiya #1',
    selectedFields: [
      { label: 'Araç', value: '34ABC123' },
      { label: 'Son GPS', value: '1dk' },
      { label: 'Sıradaki Durak', value: 'A Durağı' },
      { label: 'ETA', value: '5dk' },
    ],
    selectedBadges: [{ label: 'ONLINE', value: 'ONLINE' }],
    structuredFacts: { hasSelectedVehicle: true, hasShift: true, nextReady: true, etaReady: true },
  },
});
must('map -> shifts first control bridge reply', /Haritadaki araç ile vardiyadaki araç aynı mı kontrol et/.test(q3.reply));

const q4 = ask({
  user: companyUser,
  screenPath: '/company/map',
  message: 'doğrudan Vardiyalar, yanlış hedef ekran sapması olmadan',
  screenContextExtra: {
    selectedLabel: 'Vardiya #1',
    selectedFields: [
      { label: 'Araç', value: '34ABC123' },
      { label: 'Son GPS', value: '2dk' },
    ],
    structuredFacts: { hasSelectedVehicle: true, hasShift: true },
  },
});
must('direct route reply mentions direct target', /sorduğun yer Vardiyalar|sordugun yer Vardiyalar|Doğrudan hedef ekran: Vardiyalar/.test(q4.reply));
must('direct route action first', String(q4.quickActions?.[0]?.label || '').includes('Vardiyalar'));

console.log('=== M71.2 COPILOT ROUTE BRIDGE SMOKE CHECK PASS ===');
