import fs from 'fs';
import path from 'path';

function read(repoRoot, rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function has(text, needle, msg) { text.includes(needle) ? ok(msg) : fail(msg); }

const cwd = process.argv[2] || process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");
console.log('=== M79 A5 COPILOT CHAT UX CHECK ===');
const helpComposer = read(repoRoot, 'backend/src/ai/chat/helpComposer.js');
const panel = read(repoRoot, 'web/src/panels/shared/CopilotPanel.jsx');
const bubble = read(repoRoot, 'web/src/components/copilot/ChatMessageBubble.jsx');
const actions = read(repoRoot, 'web/src/components/copilot/ChatQuickActions.jsx');

has(helpComposer, 'function questionTypeLabel(', 'help composer adds question label helper');
has(helpComposer, 'function buildResponseSections(', 'help composer adds response sections');
has(helpComposer, 'questionLabel,', 'help composer returns question label');
has(helpComposer, 'responseSections,', 'help composer returns response sections');
has(helpComposer, "title: 'Şimdi yap'", 'response sections include next step card');
has(helpComposer, "title: 'Devamında sor'", 'response sections include follow-up card');

has(panel, 'suggestedChips: payload?.suggestedChips || []', 'copilot panel stores suggested chips on message');
has(panel, 'questionType: payload?.questionType || ""', 'copilot panel stores question type');
has(panel, 'questionLabel: payload?.questionLabel || ""', 'copilot panel stores question label');
has(panel, 'intentConfidence: Number(payload?.intentConfidence || 0)', 'copilot panel stores intent confidence');
has(panel, 'responseSections: payload?.responseSections || []', 'copilot panel stores response sections');

has(bubble, 'Hızlı devam soruları', 'chat bubble shows follow-up chips');
has(bubble, 'İşe yaradı', 'chat bubble exposes positive feedback');
has(bubble, 'Eksik kaldı', 'chat bubble exposes negative feedback');
has(bubble, 'message.responseSections', 'chat bubble renders response sections');
has(bubble, 'message.questionLabel', 'chat bubble renders question label');

has(actions, 'Öncelikli adım', 'chat quick actions highlights primary action');
has(actions, 'Diğer hızlı adımlar', 'chat quick actions labels secondary actions');
has(actions, 'İlgili rehberler', 'chat quick actions labels guides');

if (process.exitCode) {
  console.error('FAIL M79 A5 copilot chat ux check');
  process.exit(process.exitCode);
}
console.log('PASS M79 A5 copilot chat ux check');
