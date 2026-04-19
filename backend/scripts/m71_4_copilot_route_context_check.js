
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
import path from 'path';
import { fileURLToPath } from 'url';

function must(label, cond) {
  if (!cond) {
    console.error('FAIL', label);
    process.exit(1);
  }
  console.log('OK', label);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const panel = fs.readFileSync(path.join(repoRoot, 'web/src/panels/shared/CopilotPanel.jsx'), 'utf8');
const composer = fs.readFileSync(path.join(repoRoot, 'backend/src/ai/chat/helpComposer.js'), 'utf8');

console.log('=== M71.4 COPILOT ROUTE CONTEXT + SCREEN ANALYSIS CHECK ===');
must('chat screen route sync added', includesText(panel, 'useHashRoute') && includesText(panel, 'hashPath'));
must('chat screen route sync uses current route', includesText(panel, 'setChatScreenId(String(match.id))'));
must('screen analysis widened beyond entityType screen', includesText(composer, "const hasScreenContext") && includesText(composer, "analyzeScreenState({ screenContext, screenDefinition, conversationState })"));
console.log('=== M71.4 COPILOT ROUTE CONTEXT + SCREEN ANALYSIS CHECK PASS ===');
