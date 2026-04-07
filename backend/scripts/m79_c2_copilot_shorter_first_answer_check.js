
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

function ok(msg){ console.log(`OK ${msg}`); }
function fail(msg){ console.error(`FAIL ${msg}`); process.exitCode = 1; }
function has(text, needle){ return String(text||'').includes(needle); }

const repo = process.argv[2] || process.cwd();
const hp = fs.readFileSync(path.join(repo,'backend/src/ai/chat/helpComposer.js'),'utf8');

console.log('=== M79 C2 COPILOT SHORTER FIRST ANSWER CHECK ===');
if (has(hp,'function openingActionForQuestionType')) ok('help composer adds opening action helper'); else fail('help composer adds opening action helper');
if (has(hp,"return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560);")) ok('polish reply uses tighter length limits'); else fail('polish reply uses tighter length limits');
if (has(hp,'const cut = Math.max(')) ok('trim keeps sentence boundary'); else fail('trim keeps sentence boundary');
if (has(hp,"return `${lead} ${value}`.trim();")) ok('action lead is prefixed to the answer'); else fail('action lead is prefixed to the answer');
if (!has(hp,"return `${value} Şimdi: ${fallback}`.trim();")) ok('old trailing action lead removed'); else fail('old trailing action lead removed');
if (has(hp,"NEXT_SCREEN: `Önce ${first}.`")) ok('next-screen replies start with once guidance'); else fail('next-screen replies start with once guidance');
if (has(hp,"WHY_BLOCKED: `Önce ${first}.`")) ok('why-blocked replies start with once guidance'); else fail('why-blocked replies start with once guidance');
if (process.exitCode) {
  console.error('FAIL M79 C2 copilot shorter first answer check');
  process.exit(process.exitCode);
}
console.log('PASS M79 C2 copilot shorter first answer check');
