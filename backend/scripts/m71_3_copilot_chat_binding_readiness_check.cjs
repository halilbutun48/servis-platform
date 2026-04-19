const fs = require('fs');
const path = require('path');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exit(1); }

console.log('=== M71.3 COPILOT CHAT BINDING + READINESS CHECK ===');

const backendRoot = path.join(__dirname, '..');
const repoRoot = path.join(backendRoot, '..');


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
const copilotPanel = fs.readFileSync(path.join(repoRoot, 'web', 'src', 'panels', 'shared', 'CopilotPanel.jsx'), 'utf8');
const helpComposer = fs.readFileSync(path.join(backendRoot, 'src', 'ai', 'chat', 'helpComposer.js'), 'utf8');

if (!includesText(copilotPanel, 'useHashRoute') || !includesText(copilotPanel, 'hashPath')) fail('CopilotPanel route sync missing');
ok('CopilotPanel route sync present');
if (!includesText(copilotPanel, 'setChatScreenId(String(match.id))')) fail('CopilotPanel hard screen sync missing');
ok('CopilotPanel hard screen sync present');
if (!includesText(helpComposer, "const hasScreenContext") || !includesText(helpComposer, "analyzeScreenState({ screenContext, screenDefinition, conversationState })")) fail('helpComposer screenContext-based analysis missing');
ok('helpComposer screenContext-based analysis present');
if (!includesText(helpComposer, "questionType === 'READINESS_CHECK'")) fail('readiness branch missing');
ok('readiness branch present');
console.log('=== M71.3 COPILOT CHAT BINDING + READINESS CHECK PASS ===');
