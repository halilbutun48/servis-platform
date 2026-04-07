import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const repoRoot = process.argv[2] || process.cwd();


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
const ok = (msg) => console.log(`OK ${msg}`);
const fail = (msg) => { console.error(`FAIL ${msg}`); process.exit(1); };

const helpPath = path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js');
if (!fs.existsSync(helpPath)) fail('help composer exists');
ok('help composer exists');
const text = fs.readFileSync(helpPath, 'utf8');
if (!includesText(text, 'export function extractPrimaryConcern')) fail('help composer exports primary concern extractor');
ok('help composer exports primary concern extractor');
if (!includesText(text, 'function splitCompoundQuestion')) fail('help composer has compound question splitter');
ok('help composer has compound question splitter');
if (!includesText(text, 'const expandedMessage = expandFollowUpMessage')) fail('help composer expands follow-up message before concern extraction');
ok('help composer expands follow-up message before concern extraction');
if (!includesText(text, 'const effectiveMessage = extractPrimaryConcern(expandedMessage);')) fail('help composer uses primary concern extractor for effective message');
ok('help composer uses primary concern extractor for effective message');
if (!includesText(text, 'lastPrimaryConcern')) fail('conversation state stores last primary concern');
ok('conversation state stores last primary concern');

const mod = await import(pathToFileURL(helpPath).href);
if (typeof mod.extractPrimaryConcern !== 'function') fail('extractPrimaryConcern import works');
ok('extractPrimaryConcern import works');

const cases = [
  ['burası ne işe yarıyor ama sonra nereye geçeyim', 'Şimdi hangi ekrana gitmeliyim?'],
  ['bu kayıt onaylı ama araç yok niye pasif', 'Bu neden olmuyor?'],
  ['konum niye yok ve sonra ne yapayım', 'Konum neden görünmüyor?'],
  ['burda ne eksik ve sonra nereye bakcam', 'Hazır mı?'],
  ['bu rolde ne yapıyoruz ve sonra nereye geçeyim', 'Şimdi hangi ekrana gitmeliyim?'],
  ['bu satır ne diyor ama niye pasif bu', 'Bu neden olmuyor?'],
];
for (const [input, expected] of cases) {
  const actual = mod.extractPrimaryConcern(input);
  if (actual !== expected) fail(`${input} => ${actual} (expected ${expected})`);
  ok(`${input} => ${expected}`);
}

console.log('PASS M79 C4 copilot primary concern check');
