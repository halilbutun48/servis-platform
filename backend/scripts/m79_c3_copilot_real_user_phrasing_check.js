import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
const helpComposerPath = path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function has(text, needle) { return String(text || '').includes(needle); }

console.log('=== M79 C3 COPILOT REAL USER PHRASING CHECK ===');

if (!fs.existsSync(helpComposerPath)) {
  console.error(`FAIL missing ${helpComposerPath}`);
  process.exit(1);
}
ok('help composer exists');

const src = fs.readFileSync(helpComposerPath, 'utf8');
if (has(src, 'export function normalizeEverydayQuestion(message)')) ok('help composer exports everyday question normalizer'); else fail('help composer exports everyday question normalizer');
if (has(src, "const effectiveMessage = normalizeEverydayQuestion(expandFollowUpMessage(rawMessage, conversationState, screenContext));")) ok('everyday question normalizer feeds effective message'); else fail('everyday question normalizer feeds effective message');
if (has(src, "return 'Bu ekran ne için?';")) ok('normalizer maps screen purpose slang'); else fail('normalizer maps screen purpose slang');
if (has(src, "return 'İlk neye bakayım?';")) ok('normalizer maps first-control slang'); else fail('normalizer maps first-control slang');
if (has(src, "return 'Bu neden olmuyor?';")) ok('normalizer maps blockage slang'); else fail('normalizer maps blockage slang');
if (has(src, "return 'Hazır mı?';")) ok('normalizer maps readiness slang'); else fail('normalizer maps readiness slang');
if (has(src, "return 'Konum neden görünmüyor?';")) ok('normalizer maps location slang'); else fail('normalizer maps location slang');
if (has(src, "return 'Bu rolde ne yapabilirim?';")) ok('normalizer maps role-help slang'); else fail('normalizer maps role-help slang');
if (has(src, "return 'Bu satırı nasıl okurum?';")) ok('normalizer maps row-help slang'); else fail('normalizer maps row-help slang');

const mod = await import(pathToFileURL(helpComposerPath).href + `?t=${Date.now()}`);
const normalizeEverydayQuestion = mod.normalizeEverydayQuestion;
const buildChatHelpResponse = mod.buildChatHelpResponse;
if (typeof normalizeEverydayQuestion !== 'function') {
  fail('normalizeEverydayQuestion import works');
  process.exit(1);
}
ok('normalizeEverydayQuestion import works');

const normalizationCases = [
  ['burası ne işe yarıyor', 'Bu ekran ne için?'],
  ['nereye bakcam şimdi', 'İlk neye bakayım?'],
  ['niye pasif bu', 'Bu neden olmuyor?'],
  ['burda ne eksik', 'Hazır mı?'],
  ['konum niye yok', 'Konum neden görünmüyor?'],
  ['bu rolde ne yapıyoruz', 'Bu rolde ne yapabilirim?'],
  ['bu satır ne diyor', 'Bu satırı nasıl okurum?'],
];
for (const [input, expected] of normalizationCases) {
  const actual = normalizeEverydayQuestion(input);
  if (actual === expected) ok(`${input} => ${expected}`); else fail(`${input} => ${expected}`);
}

if (typeof buildChatHelpResponse === 'function') {
  const base = {
    entityType: 'screen',
    entityId: 0,
    user: { role: 'ROOM' },
    context: { type: 'screen', path: '/room/operation-health' },
    entityLabel: '',
    scope: { roleMode: 'OPERATIONS' },
    conversationState: { recentMessages: [] },
    screenContext: { path: '/room/operation-health', label: 'Operasyon Sağlığı' },
    screenDefinition: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      menuPurpose: 'Operasyon risklerini ve eksikleri görmek için kullanılır.',
      firstStep: 'Riskli kaydı seç.',
      firstControls: ['Durum rozeti'],
      nextStep: 'Detaya in.',
    },
  };
  const purposeRes = buildChatHelpResponse({ ...base, message: 'burası ne işe yarıyor' });
  if (String(purposeRes?.questionType || '') === 'SCREEN_PURPOSE') ok('screen-purpose slang resolves to SCREEN_PURPOSE'); else fail('screen-purpose slang resolves to SCREEN_PURPOSE');
  const blockedRes = buildChatHelpResponse({ ...base, message: 'niye pasif bu' });
  if (String(blockedRes?.questionType || '') === 'WHY_BLOCKED') ok('blocked slang resolves to WHY_BLOCKED'); else fail('blocked slang resolves to WHY_BLOCKED');
  const roleRes = buildChatHelpResponse({ ...base, message: 'bu rolde ne yapıyoruz' });
  if (String(roleRes?.questionType || '') === 'ROLE_HELP') ok('role slang resolves to ROLE_HELP'); else fail('role slang resolves to ROLE_HELP');
  const rowRes = buildChatHelpResponse({ ...base, message: 'bu satır ne diyor' });
  if (String(rowRes?.questionType || '') === 'ROW_HELP') ok('row slang resolves to ROW_HELP'); else fail('row slang resolves to ROW_HELP');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS M79 C3 copilot real user phrasing check');
