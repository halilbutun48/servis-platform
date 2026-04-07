import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exit(1); }
function ensure(cond, msg) { if (!cond) fail(msg); ok(msg); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }

console.log('=== M79 B2 COPILOT FOLLOW-UP MEMORY CHECK ===');
ensure(exists('backend/src/ai/chat/helpComposer.js'), 'help composer exists');
ensure(exists('backend/src/ai/chat/intentRouter.js'), 'intent router exists');
ensure(exists('web/src/panels/shared/CopilotPanel.jsx'), 'copilot panel exists');
ensure(exists('web/src/components/copilot/ChatMessageBubble.jsx'), 'chat bubble exists');

const helpComposerText = read('backend/src/ai/chat/helpComposer.js');
const intentRouterText = read('backend/src/ai/chat/intentRouter.js');
const panelText = read('web/src/panels/shared/CopilotPanel.jsx');
const bubbleText = read('web/src/components/copilot/ChatMessageBubble.jsx');

ensure(includesText(helpComposerText, 'expandFollowUpMessage'), 'help composer expands short follow-up prompts');
ensure(includesText(helpComposerText, 'buildContinuityMeta'), 'help composer builds continuity meta');
ensure(includesText(helpComposerText, 'Aynı kayıt üstünde devam'), 'help composer adds same-record response section');
ensure(includesText(helpComposerText, 'lastSelectedEntityType'), 'help composer stores last selected entity type');
ensure(includesText(helpComposerText, 'lastSelectedLabel'), 'help composer stores last selected label');
ensure(includesText(intentRouterText, 'isShortFollowUp'), 'intent router detects short follow-up prompts');
ensure(includesText(intentRouterText, 'follow-up-next'), 'intent router scores next-step follow-up prompts');
ensure(includesText(intentRouterText, 'follow-up-why'), 'intent router scores why follow-up prompts');
ensure(includesText(panelText, 'recentMessages: ['), 'copilot panel sends bounded recent message history including current prompt');
ensure(includesText(panelText, 'continuity: payload?.continuity || null'), 'copilot panel stores continuity on assistant message');
ensure(includesText(bubbleText, 'Aynı kayıt'), 'chat bubble shows same-record badge');
ensure(includesText(bubbleText, 'Devam sorusu'), 'chat bubble shows follow-up badge');

const helpComposerModule = await import(pathToFileURL(path.join(repoRoot, 'backend/src/ai/chat/helpComposer.js')).href);
const screenCatalogModule = await import(pathToFileURL(path.join(repoRoot, 'backend/src/ai/jobGuide/screenCatalog.js')).href);
const { buildChatHelpResponse } = helpComposerModule;
const { getScreenDefinitionForUser } = screenCatalogModule;

function runCase({ user, pathName, label, selectedLabel, selectedEntityType, selectedEntityId, selectedFields = [], selectedBadges = [], message, conversationState, entityType = 'screen', entityId = 0, scopeRoleMode = 'OPERATIONS' }) {
  const screenContext = { path: pathName, label, selectedLabel, selectedEntityType, selectedEntityId, selectedFields, selectedBadges };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext, 0);
  return buildChatHelpResponse({
    entityType,
    entityId,
    user,
    message,
    context: null,
    entityLabel: selectedLabel || label,
    scope: { roleMode: scopeRoleMode },
    conversationState,
    screenContext,
    screenDefinition,
  });
}

const followUpNext = runCase({
  user: { role: 'ROOM' },
  pathName: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  selectedLabel: 'Vardiya #710',
  selectedEntityType: 'shift',
  selectedEntityId: 710,
  selectedFields: [{ label: 'Durum', value: 'RISKLI' }],
  selectedBadges: [{ label: 'Risk', value: 'Yüksek' }],
  message: 'peki sonra?',
  entityType: 'screen',
  entityId: 710,
  conversationState: {
    lastQuestionType: 'WHY_BLOCKED',
    lastSelectedEntityType: 'shift',
    lastSelectedEntityId: 710,
    lastSelectedLabel: 'Vardiya #710',
    lastScreenPath: '/room/operation-health',
    recentMessages: [
      { role: 'user', text: 'neden riskli?' },
      { role: 'assistant', text: '...' },
    ],
  },
});
ensure(String(followUpNext.questionType || '') === 'NEXT_STEP', 'short follow-up after blockage resolves to NEXT_STEP');
ensure(Boolean(followUpNext?.continuity?.sameEntity), 'short follow-up keeps same selected record');
ensure(String(followUpNext?.contextSummary || '').includes('Aynı kayıt üzerinde devam ediyoruz'), 'follow-up response summary mentions same-record continuity');
ensure((Array.isArray(followUpNext?.responseSections) ? followUpNext.responseSections : []).some((row) => String(row?.kind || '') === 'THREAD'), 'follow-up response includes continuity section');

const followUpWhy = runCase({
  user: { role: 'ROOM' },
  pathName: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  selectedLabel: 'Vardiya #711',
  selectedEntityType: 'shift',
  selectedEntityId: 711,
  selectedFields: [{ label: 'Durum', value: 'UYARI' }],
  message: 'neden?',
  entityType: 'screen',
  entityId: 711,
  conversationState: {
    lastQuestionType: 'STATUS_HELP',
    lastSelectedEntityType: 'shift',
    lastSelectedEntityId: 711,
    lastSelectedLabel: 'Vardiya #711',
    lastScreenPath: '/room/operation-health',
    recentMessages: [
      { role: 'user', text: 'bu kayıt ne durumda?' },
      { role: 'assistant', text: '...' },
    ],
  },
});
ensure(String(followUpWhy.questionType || '') === 'WHY_BLOCKED', 'short why follow-up resolves to WHY_BLOCKED');
ensure(Boolean(followUpWhy?.continuity?.sameEntity), 'why follow-up keeps same selected record');
ensure(Number(followUpWhy?.intentConfidence || 0) >= 0.72, 'why follow-up confidence stays strong');

console.log('PASS M79 B2 copilot follow-up memory check');
