
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
const bubble = fs.readFileSync(path.join(repo,'web/src/components/copilot/ChatMessageBubble.jsx'),'utf8');
const qa = fs.readFileSync(path.join(repo,'web/src/components/copilot/ChatQuickActions.jsx'),'utf8');

console.log('=== M79 C1 COPILOT PLAIN LANGUAGE CHECK ===');
if (has(hp,'function applyPlainLanguage')) ok('help composer adds plain language helper'); else fail('help composer adds plain language helper');
if (has(hp,"NEXT_SCREEN: 'Nereye gitmeliyim'")) ok('question label uses plain next-screen wording'); else fail('question label uses plain next-screen wording');
if (has(hp,"title: 'Şimdi bunu yap'")) ok('response section title simplified'); else fail('response section title simplified');
if (has(hp,"title: 'İzlenecek yol'")) ok('route section title simplified'); else fail('route section title simplified');
if (has(hp,"title: 'Sonra şunu sor'")) ok('follow-up section title simplified'); else fail('follow-up section title simplified');
if (has(hp,"replace(/bağlam/gi, 'durum')")) ok('plain language maps baglam to durum'); else fail('plain language maps baglam to durum');
if (has(hp,"replace(/blokaj/gi, 'engel')")) ok('plain language maps blokaj to engel'); else fail('plain language maps blokaj to engel');
if (has(bubble,'message?.uncertaintyMeta?.label')) ok('bubble uses simpler confidence label'); else fail('bubble uses simpler confidence label');
if (has(bubble,'message.followUpPrompt')) ok('bubble uses simpler follow-up heading'); else fail('bubble uses simpler follow-up heading');
if (has(bubble,'message?.screenLabel')) ok('bubble uses bakilan ekran label'); else fail('bubble uses bakilan ekran label');
if (has(bubble,'message?.activeEntityLabel')) ok('bubble uses bakilan kayit label'); else fail('bubble uses bakilan kayit label');
if (has(qa,'const visibleActions = hasActions ? actions.slice(0, 3) : []')) ok('quick actions use simpler primary heading'); else fail('quick actions use simpler primary heading');
if (has(qa,'Sonraki adımlar')) ok('quick actions use simpler secondary heading'); else fail('quick actions use simpler secondary heading');
if (has(qa,'Rehberi aç') || has(qa,'Rehbere geç')) ok('quick actions use simpler guide heading'); else fail('quick actions use simpler guide heading');
if (has(qa,'Bu ekrana git')) ok('quick actions use simpler route label'); else fail('quick actions use simpler route label');
if (process.exitCode) {
  console.error('FAIL M79 C1 copilot plain language check');
  process.exit(process.exitCode);
}
console.log('PASS M79 C1 copilot plain language check');
