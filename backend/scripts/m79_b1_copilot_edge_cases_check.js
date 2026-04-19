import { scoreGoldenQuestionPack } from '../src/ai/chat/qualityScorer.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function expect(cond, msg) { cond ? ok(msg) : fail(msg); }

function buildResponse({ role, path, message, screenContext, entityType = 'screen', context = null }) {
  const user = role === 'SCHOOL' ? { role: 'COMPANY', companyKind: 'SCHOOL' } : role === 'ORGANIZATION' ? { role: 'COMPANY', companyKind: 'ORGANIZATION' } : { role };
  const scope = { roleMode: ['DRIVER', 'PERSONEL', 'PARENT'].includes(String(role || '')) ? 'SIMPLE' : 'OPERATIONS' };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext, Number(screenContext?.id || 0));
  return buildChatHelpResponse({
    entityType,
    entityId: Number(context?.id || screenContext?.id || 0),
    user,
    message,
    context,
    entityLabel: screenContext?.selectedLabel || screenContext?.label || '',
    scope,
    conversationState: { lastScreenPath: path },
    screenContext,
    screenDefinition,
  });
}

console.log('=== M79 B1 COPILOT EDGE CASES CHECK ===');
const score = scoreGoldenQuestionPack();
expect(score.overall.score >= 0.99, `overall score ${score.overall.score}`);
expect(Number(score.byRole?.PERSONEL?.score || 0) >= 1, `PERSONEL score ${score.byRole?.PERSONEL?.score}`);
expect(Number(score.byType?.WHY_BLOCKED?.score || 0) >= 1, `WHY_BLOCKED score ${score.byType?.WHY_BLOCKED?.score}`);
expect(Number(score.byType?.ROLE_HELP?.score || 0) >= 1, `ROLE_HELP score ${score.byType?.ROLE_HELP?.score}`);

const blocked = buildResponse({
  role: 'ROOM',
  path: '/room/operation-health',
  message: 'Neden sorunlu görünüyor?',
  screenContext: {
    path: '/room/operation-health',
    label: 'Operasyon Sağlığı',
    selectedLabel: 'Araç 20 ABC 123',
    selectedFields: [{ label: 'Canlılık', value: 'Yok' }, { label: 'Son paket', value: '15 dk önce' }],
  },
});
expect(blocked.questionType === 'WHY_BLOCKED', 'operation health why-risk => WHY_BLOCKED');
expect(Number(blocked.intentConfidence || 0) >= 0.72, 'operation health why-risk confidence strong');

const personelNext = buildResponse({
  role: 'PERSONEL',
  path: '/personel/my',
  message: 'Şimdi ne yapmalıyım?',
  screenContext: { path: '/personel/my', label: 'Servisim' },
});
expect(personelNext.questionType === 'NEXT_STEP', 'personel simple next step classified');
expect(String(personelNext.quickActions?.[0]?.actionKind || '') === 'OPEN_ROUTE', 'personel next step prefers route action');

const roleHelp = buildResponse({
  role: 'SUPER_ADMIN',
  path: '/superadmin/users',
  message: 'Bu rolde burada neyi yönetebilirim?',
  screenContext: { path: '/superadmin/users', label: 'Kullanıcılar' },
});
expect(roleHelp.questionType === 'ROLE_HELP', 'super admin users => ROLE_HELP');
expect(String(roleHelp.quickActions?.[0]?.actionKind || '') === 'OPEN_ROUTE', 'role help prioritizes route action');

if (process.exitCode) {
  console.error('FAIL M79 B1 copilot edge cases check');
  process.exit(process.exitCode);
}
console.log('PASS M79 B1 copilot edge cases check');
