
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
import fs from 'fs';

function must(label, cond) {
  if (!cond) {
    console.error('FAIL', label);
    process.exit(1);
  }
  console.log('OK', label);
}

const panel = fs.readFileSync(new URL('../src/panels/shared/CopilotPanel.jsx', import.meta.url), 'utf8');
const composer = fs.readFileSync(new URL('../src/ai/chat/helpComposer.js', import.meta.url), 'utf8');

console.log('=== M71.4 COPILOT ROUTE CONTEXT + SCREEN ANALYSIS CHECK ===');
must('chat screen route sync added', includesText(panel, 'syncChatScreenToRoute') && includesText(panel, 'hashchange') && includesText(panel, 'popstate'));
must('chat screen route sync uses current route', includesText(panel, 'setChatScreenId(String(match.id))'));
must('screen analysis widened beyond entityType screen', includesText(composer, "const analysis = screenContext && screenDefinition ? analyzeScreenState({ screenContext, screenDefinition, conversationState }) : null;"));
console.log('=== M71.4 COPILOT ROUTE CONTEXT + SCREEN ANALYSIS CHECK PASS ===');
