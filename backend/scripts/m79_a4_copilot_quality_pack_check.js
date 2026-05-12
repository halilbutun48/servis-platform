import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildGoldenQuestionPack } from '../src/ai/chat/goldenQuestionPack.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');


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

function must(label, cond) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

console.log('=== M79 A4 COPILOT QUALITY PACK CHECK ===');

must('golden question pack exists', fs.existsSync(path.join(root, 'backend/src/ai/chat/goldenQuestionPack.js')));
must('help composer exists', fs.existsSync(path.join(root, 'backend/src/ai/chat/helpComposer.js')));
must('help composer exposes quality hints', read('backend/src/ai/chat/helpComposer.js').includes('qualityHints'));
must('help composer polishes reply', read('backend/src/ai/chat/helpComposer.js').includes('polishReply'));

const scenarios = buildGoldenQuestionPack();
must('golden pack has broad coverage', Array.isArray(scenarios) && scenarios.length >= 12);
const roleSet = new Set(scenarios.map((row) => row.role));
must('golden pack covers room', roleSet.has('ROOM'));
must('golden pack covers super admin', roleSet.has('SUPER_ADMIN'));
must('golden pack covers driver', roleSet.has('DRIVER'));
must('golden pack covers personel', roleSet.has('PERSONEL'));
must('golden pack covers parent', roleSet.has('PARENT'));

for (const scenario of scenarios) {
  const user = { role: scenario.role };
  const screenContext = { ...(scenario.screenContext || {}), path: scenario.path };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext);
  const response = buildChatHelpResponse({
    entityType: scenario.entityType,
    entityId: Number(scenario.context?.id || 0),
    user,
    message: scenario.message,
    context: scenario.context || null,
    entityLabel: scenario.screenContext?.selectedLabel || screenDefinition?.label || '',
    scope: { roleMode: ['DRIVER', 'PERSONEL', 'PARENT'].includes(scenario.role) ? 'SIMPLE' : 'OPERATIONS' },
    conversationState: { recentMessages: [] },
    screenContext,
    screenDefinition,
  });
  must(`${scenario.id} question type`, response.questionType === scenario.expectedType);
  must(`${scenario.id} confidence`, Number(response.intentConfidence || 0) >= Number(scenario.minConfidence || 0.6));
  must(`${scenario.id} reply exists`, typeof response.reply === 'string' && response.reply.trim().length > 0);
  must(`${scenario.id} reply bounded`, response.reply.length <= (scenario.role === 'DRIVER' || scenario.role === 'PERSONEL' || scenario.role === 'PARENT' ? 360 : 720));
  must(`${scenario.id} quality hints`, response.qualityHints && response.qualityHints.actionable === true && response.qualityHints.hasSupportAction === true);
  must(`${scenario.id} quick actions exist`, Array.isArray(response.quickActions) && response.quickActions.length >= 1);
  must(`${scenario.id} suggested chips exist`, Array.isArray(response.suggestedChips) && response.suggestedChips.length >= 1);
  if (scenario.expectedFirstActionKind) must(`${scenario.id} first action kind`, String(response.quickActions[0]?.actionKind || '') === String(scenario.expectedFirstActionKind));
  if (['NEXT_SCREEN', 'NEXT_STEP', 'FIRST_CONTROL', 'WHY_BLOCKED', 'STATUS_HELP', 'READINESS_CHECK'].includes(scenario.expectedType)) {
    must(`${scenario.id} reply is action-led`, /Şimdi:|Şimdi yap:|Önce:|Önce\s|İlk kontrol:|İlk bakılacak yer:/.test(response.reply));
  }
}

console.log('PASS M79 A4 copilot quality pack check');
