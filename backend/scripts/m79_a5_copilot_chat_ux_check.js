import fs from 'fs';
import path from 'path';

function read(repoRoot, rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function has(text, needle, msg) { includesText(text, needle) ? ok(msg) : fail(msg); }

const cwd = process.argv[2] || process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


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
console.log('=== M79 A5 COPILOT CHAT UX CHECK ===');
const helpComposer = read(repoRoot, 'backend/src/ai/chat/helpComposer.js');
const panel = read(repoRoot, 'web/src/panels/shared/CopilotPanel.jsx');
const bubble = read(repoRoot, 'web/src/components/copilot/ChatMessageBubble.jsx');
const actions = read(repoRoot, 'web/src/components/copilot/ChatQuickActions.jsx');

has(helpComposer, 'function questionTypeLabel(', 'help composer adds question label helper');
has(helpComposer, 'function buildResponseSections(', 'help composer adds response sections');
has(helpComposer, 'questionLabel,', 'help composer returns question label');
has(helpComposer, 'responseSections,', 'help composer returns response sections');
has(helpComposer, "title: 'Şimdi bunu yap'", 'response sections include next step card');
has(helpComposer, "title: 'Sonra şunu sor'", 'response sections include follow-up card');

has(panel, 'suggestedChips: payload?.suggestedChips || []', 'copilot panel stores suggested chips on message');
has(panel, 'questionType: payload?.questionType || ""', 'copilot panel stores question type');
has(panel, 'questionLabel: payload?.questionLabel || ""', 'copilot panel stores question label');
has(panel, 'intentConfidence: Number(payload?.intentConfidence || 0)', 'copilot panel stores intent confidence');
has(panel, 'responseSections: payload?.responseSections || []', 'copilot panel stores response sections');

has(bubble, 'message.followUpPrompt', 'chat bubble shows follow-up chips');
has(bubble, 'İşe yaradı', 'chat bubble exposes positive feedback');
has(bubble, 'Eksik kaldı', 'chat bubble exposes negative feedback');
has(bubble, 'message.responseSections', 'chat bubble renders response sections');
has(bubble, 'message.questionLabel', 'chat bubble renders question label');

has(actions, 'const visibleActions = hasActions ? actions.slice(0, 3) : []', 'chat quick actions highlights primary action');
has(actions, 'Sonraki adımlar', 'chat quick actions labels secondary actions');
has(actions, 'linkedGuides.slice(0, 2)', 'chat quick actions labels guides');

if (process.exitCode) {
  console.error('FAIL M79 A5 copilot chat ux check');
  process.exit(process.exitCode);
}
console.log('PASS M79 A5 copilot chat ux check');
