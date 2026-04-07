import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
const fails = [];

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); fails.push(msg); }
function must(cond, msg) { cond ? ok(msg) : fail(msg); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), 'utf8'); }
function expectIntent(message, options, expected, label) {
  const result = detectQuestionIntent(message, options);
  must(result.questionType === expected, `${label} => ${expected}`);
  return result;
}

console.log('=== M79 A2 COPILOT INTENT QUALITY CHECK ===');

const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');

must(includesText(intentRouter, 'export function detectQuestionIntent'), 'intent router exports detectQuestionIntent');
must(includesText(intentRouter, 'const BASE_RULES = ['), 'intent router has scored base rules');
must(includesText(intentRouter, 'confidence:'), 'intent router returns intent confidence');
must(includesText(helpComposer, 'const intentMeta = detectQuestionIntent'), 'help composer uses detectQuestionIntent');
must(includesText(helpComposer, 'intentConfidence: Number(intentMeta?.confidence || 0)'), 'help composer exposes intent confidence');
must(includesText(helpComposer, 'intentSignals: Array.isArray(intentMeta?.matchedSignals)'), 'help composer exposes intent signals');
must(includesText(helpComposer, 'questionType,'), 'help composer returns question type');

expectIntent('konum inceleden sonra nereye geçeyim?', { entityType: 'screen', screenPath: '/company/georeview' }, 'NEXT_SCREEN', 'georeview next screen');
expectIntent('hangi ekrana geçeyim?', { entityType: 'screen', screenPath: '/company/map' }, 'NEXT_SCREEN', 'generic route steer');
expectIntent('git vardiyalar ekranına', { entityType: 'screen', screenPath: '/company/georeview' }, 'GO_TO', 'imperative go to');
expectIntent('bu kayıt ne durumda?', { entityType: 'shift', screenPath: '/company/shifts' }, 'STATUS_HELP', 'shift status help');
expectIntent('atamaya hazır mı?', { entityType: 'shift', screenPath: '/company/shifts' }, 'READINESS_CHECK', 'shift readiness');
expectIntent('neden bu buton pasif?', { entityType: 'screen', screenPath: '/company/shifts' }, 'WHY_BLOCKED', 'blocked button why');
expectIntent('bu buton ne yapar?', { entityType: 'screen', screenPath: '/company/shifts' }, 'BUTTON_HELP', 'button purpose');
expectIntent('önce neyi kontrol edeyim?', { entityType: 'screen', screenPath: '/superadmin/operation-verification' }, 'FIRST_CONTROL', 'first control');
expectIntent('bu satırı nasıl okurum?', { entityType: 'screen', screenPath: '/company/shifts' }, 'ROW_HELP', 'row help');
expectIntent('bu rozet ne demek?', { entityType: 'screen', screenPath: '/company/shifts' }, 'BADGE_HELP', 'badge help');
expectIntent('bu rolde ne yapabilirim?', { entityType: 'screen', screenPath: '/driver/today' }, 'ROLE_HELP', 'role help');
expectIntent('en risksiz sonraki adım ne?', { entityType: 'shift', screenPath: '/room/shifts' }, 'SAFE_NEXT_STEP', 'safe next step');
expectIntent('az önce ne değişti?', { entityType: 'screen', screenPath: '/company/shifts' }, 'WHAT_CHANGED', 'what changed');

const reply = buildChatHelpResponse({
  entityType: 'screen',
  entityId: 11,
  user: { role: 'ROOM' },
  message: 'Konum inceleden sonra nereye geçeyim?',
  context: { type: 'screen', path: '/room/georeview', label: 'Konum İncele' },
  entityLabel: 'Konum İncele • ROOM',
  scope: { role: 'ROOM', roleMode: 'OPERATIONS' },
  conversationState: {},
  screenContext: { path: '/room/georeview', label: 'Konum İncele' },
  screenDefinition: { id: 11, path: '/room/georeview', label: 'Konum İncele', menuPurpose: 'Konumları incelemek için', screenMenus: [] },
  sourceEntityType: 'screen',
  sourceEntityId: 11,
  resolvedEntityType: 'screen',
  resolvedEntityId: 11,
});

must(reply.questionType === 'NEXT_SCREEN', 'chat help response returns question type');
must(Number(reply.intentConfidence || 0) >= 0.7, 'chat help response carries strong intent confidence');
must(Array.isArray(reply.intentSignals) && reply.intentSignals.length > 0, 'chat help response carries intent signals');
must(Array.isArray(reply.quickActions) && String(reply.quickActions[0]?.actionKind || '') === 'OPEN_ROUTE', 'next-screen question prioritizes route action');

if (fails.length) {
  console.error('CHECK FAIL M79 A2 copilot intent quality');
  process.exit(1);
}
console.log('PASS M79 A2 copilot intent quality check');
