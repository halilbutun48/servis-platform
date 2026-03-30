import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exit(1); }
function ensure(cond, msg) { if (!cond) fail(msg); ok(msg); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }

console.log('=== M79 B3 COPILOT UNCERTAINTY CHECK ===');
ensure(exists('backend/src/ai/chat/helpComposer.js'), 'help composer exists');
ensure(exists('web/src/panels/shared/CopilotPanel.jsx'), 'copilot panel exists');
ensure(exists('web/src/components/copilot/ChatMessageBubble.jsx'), 'chat bubble exists');

const helpComposerText = read('backend/src/ai/chat/helpComposer.js');
const panelText = read('web/src/panels/shared/CopilotPanel.jsx');
const bubbleText = read('web/src/components/copilot/ChatMessageBubble.jsx');

ensure(helpComposerText.includes('buildUncertaintyMeta'), 'help composer builds uncertainty meta');
ensure(helpComposerText.includes('verificationHintForQuestionType'), 'help composer builds verification hint');
ensure(helpComposerText.includes('Emin değilsen önce bunu kontrol et'), 'help composer adds verify response section');
ensure(helpComposerText.includes('uncertaintyMeta'), 'help composer returns uncertainty meta');
ensure(panelText.includes('uncertaintyMeta: payload?.uncertaintyMeta || null'), 'copilot panel stores uncertainty meta on assistant message');
ensure(bubbleText.includes('uncertaintyTone'), 'chat bubble renders uncertainty tone');
ensure(bubbleText.includes('message?.uncertaintyMeta?.label'), 'chat bubble renders uncertainty badge label');

const helpComposerModule = await import(pathToFileURL(path.join(repoRoot, 'backend/src/ai/chat/helpComposer.js')).href);
const screenCatalogModule = await import(pathToFileURL(path.join(repoRoot, 'backend/src/ai/jobGuide/screenCatalog.js')).href);
const { buildChatHelpResponse } = helpComposerModule;
const { getScreenDefinitionForUser } = screenCatalogModule;

function runCase({ user, pathName, label, message, selectedLabel = '', selectedEntityType = '', selectedEntityId = 0, selectedFields = [], selectedBadges = [], conversationState = null, entityType = 'screen', entityId = 0 }) {
  const screenContext = { path: pathName, label, selectedLabel, selectedEntityType, selectedEntityId, selectedFields, selectedBadges };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext, 0) || { path: pathName, label };
  return buildChatHelpResponse({
    entityType,
    entityId,
    user,
    message,
    context: null,
    entityLabel: selectedLabel || label,
    scope: { roleMode: 'OPERATIONS' },
    conversationState,
    screenContext,
    screenDefinition,
  });
}

const uncertain = runCase({
  user: { role: 'ROOM' },
  pathName: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  message: 'eee?',
  selectedLabel: 'Vardiya #999',
  selectedEntityType: 'shift',
  selectedEntityId: 999,
  selectedFields: [{ label: 'Durum', value: 'UYARI' }],
});
ensure(String(uncertain?.uncertaintyMeta?.cautionLevel || '') === 'HIGH', 'ambiguous question yields high caution level');
ensure(Boolean(uncertain?.uncertaintyMeta?.needsVerification), 'ambiguous question requires verification');
ensure((Array.isArray(uncertain?.responseSections) ? uncertain.responseSections : []).some((row) => String(row?.kind || '') === 'VERIFY'), 'ambiguous question includes verify response section');
ensure(String(uncertain?.uncertaintyMeta?.verifyText || '').includes('kontrol'), 'ambiguous question includes concrete verification hint');

const confident = runCase({
  user: { role: 'ROOM' },
  pathName: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  message: 'neden riskli görünüyor?',
  selectedLabel: 'Vardiya #1000',
  selectedEntityType: 'shift',
  selectedEntityId: 1000,
  selectedFields: [{ label: 'Durum', value: 'RISKLI' }],
  selectedBadges: [{ label: 'Risk', value: 'Yüksek' }],
});
ensure(String(confident?.questionType || '') === 'WHY_BLOCKED', 'risk diagnosis stays on why-blocked');
ensure(String(confident?.uncertaintyMeta?.cautionLevel || '') === 'LOW', 'clear blockage question yields low caution level');
ensure(!Boolean(confident?.uncertaintyMeta?.needsVerification), 'clear blockage question does not require extra verification');
ensure(!(Array.isArray(confident?.responseSections) ? confident.responseSections : []).some((row) => String(row?.kind || '') === 'VERIFY'), 'clear blockage question does not add verify response section');

console.log('PASS M79 B3 copilot uncertainty check');
