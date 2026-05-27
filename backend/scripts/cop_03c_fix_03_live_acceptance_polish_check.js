#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNotRaw(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

console.log('=== COP-03C-FIX-03 LIVE ACCEPTANCE POLISH CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const facts = read('web/src/utils/copilotFacts.js');
const service = read('backend/src/ai/service.js');
const http = read('backend/src/errors/http.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const helpComposerEntityRuntime = read('backend/src/ai/chat/helpComposerEntityRuntime.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const operationHealthPanel = read('web/src/panels/room/OperationHealthPanel.jsx');

must(pkg, '"check:cop03cfix03": "node backend/scripts/cop_03c_fix_03_live_acceptance_polish_check.js"', 'package.json exposes check:cop03cfix03');
must(pkg, '"check:cop03cfix02"', 'package.json keeps check:cop03cfix02');
must(pkg, '"check:cop03cfix01"', 'package.json keeps check:cop03cfix01');
must(pkg, '"check:cop03c"', 'package.json keeps check:cop03c');

ordered(runner, [
  'check:op04',
  'check:qlt04b',
  'check:pay01e',
  'check:paysafe01',
  'check:web01a',
  'check:web01b',
  'check:cop01e',
  'check:cop02a',
  'check:cop02b',
  'check:cop03a',
  'check:cop03afix01',
  'check:cop03afix02',
  'check:cop03b',
  'check:cop03c',
  'check:cop03cfix01',
  'check:uxkvkk01',
  'check:docsstate01',
  'check:e2esmoke01',
  'check:fieldlaunch01',
  'check:cop03cfix02',
  'check:cop03cfix03',
], 'product extensions runner order keeps cop03cfix03 last');

must(verifyChain, 'check:cop03cfix03', 'verify chain waits for check:cop03cfix03');
must(guide, 'check:cop03cfix03', 'script guide exposes check:cop03cfix03');

must(helpComposerEntityRuntime, 'Önerilen adım:', 'entity runtime uses recommendation wording');
mustNot(helpComposerEntityRuntime, 'Bu durumda doğru aksiyon şu olurdu:', 'entity runtime removes mechanical action wording');
mustNotRaw(helpComposerEntityRuntime, 'OperationProof', 'entity runtime avoids visible technical proof wording');

must(helpComposer, 'Önerilen adım:', 'help composer uses recommendation wording');
must(helpComposer, "if (['VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'LOCATION_HELP'].includes(theme)) {", 'help composer keeps GPS map remap branch');
must(helpComposer, "pickScreenByKind(screens, 'MAP')", 'help composer routes GPS questions to map screen');
must(helpComposer, 'Canlı takip ekranını aç', 'help composer keeps live tracking prompt');
must(helpComposer, 'Başlatma zamanı uygun mu?', 'help composer keeps shift action chip');
must(helpComposer, 'Son GPS ne zaman geldi?', 'help composer keeps GPS action chip');
must(helpComposer, "Sürücünün telefon GPS’i devrede mi?", 'help composer keeps driver phone GPS chip');
must(helpComposer, 'GPS/operasyon kanıtını kontrol et', 'help composer keeps gps action chip');
must(helpComposer, "if (path.includes('/room/map') || path.includes('/room/live')) return ['Son GPS ne zaman geldi?', \"Sürücünün telefon GPS’i devrede mi?\", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];", 'help composer keeps map/live GPS route');
must(helpComposer, 'Hakediş önizlemesini aç', 'help composer keeps payment action chip');
must(helpComposer, 'İlgili sözleşmeyi aç', 'help composer keeps contract action chip');
must(helpComposer, 'Bildirim kaynağını göster', 'help composer keeps notification action chip');
must(helpComposer, 'Açık geri bildirimi göster', 'help composer keeps feedback action chip');
must(helpComposer, 'Bu ekranı detaylı anlat', 'help composer still keeps generic screen chip');
mustNot(helpComposer, 'Bu durumda doğru aksiyon şu olurdu:', 'help composer removes mechanical action wording');
mustNot(helpComposer, 'Bu araç neden haritada görünmüyor?', 'help composer removes room map self-question chip');
mustNotRaw(helpComposer, 'OperationProof', 'help composer avoids visible technical proof wording');
ordered(helpComposer, [
  "if (['VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'LOCATION_HELP'].includes(theme)) {",
  "pickScreenByKind(screens, 'MAP')",
  'if (pathLooksLikeWorkflowSurface(sourcePath) && (selectedDiagnosticTheme(text) || isCommercialFlowContractToShiftQuestion(text))) {',
], 'help composer keeps GPS remap before workflow surface preserve');

must(intentRouter, 'Başlatma zamanı uygun mu?', 'intent router keeps shift readiness chip');
must(intentRouter, 'GPS/operasyon kanıtını kontrol et', 'intent router keeps gps/proof chip');
must(intentRouter, 'Hakediş önizlemesini aç', 'intent router keeps payment chip');
must(intentRouter, 'İlgili sözleşmeyi aç', 'intent router keeps contract chip');
must(intentRouter, 'Bildirim kaynağını göster', 'intent router keeps notification chip');
must(intentRouter, 'Riskli cihazı göster', 'intent router keeps operation-health risk chip');
must(intentRouter, 'GPS güncel değil / çevrim dışı satırını aç', 'intent router keeps operation-health stale chip');
must(intentRouter, 'Açık sorunları sırala', 'intent router keeps operation-health issue chip');
must(intentRouter, 'Aktif sürücüleri kontrol et', 'intent router keeps operation-health active driver chip');
must(intentRouter, 'İşlem kaydını aç', 'intent router keeps logs chip');
must(intentRouter, 'Check-in akışını aç', 'intent router keeps check-in chip');
must(intentRouter, 'Hub akışını aç', 'intent router keeps hub chip');
must(intentRouter, 'Okunmamış bildirimleri göster', 'intent router keeps notification list chip');
must(intentRouter, 'İlgili kaydı aç', 'intent router keeps target-open chip');
must(intentRouter, "pathHas(options.screenPath, ['/room/map', '/room/live', '/company/live', '/organization/live', '/school/live', '/driver/map', '/driver/live', '/vehicles'])", 'intent router keeps live map location routing');
mustNot(intentRouter, 'Bu araç neden haritada görünmüyor?', 'intent router removes room map self-question chip');
mustNot(intentRouter, 'Sözleşme burada ne işe yarıyor?', 'intent router removes agreement self-question chip');
mustNot(intentRouter, 'Şimdi ne yapayım?', 'intent router removes generic fallback chip from visible workflow blocks');

must(service, 'buildJobGuideMismatchFallback', 'service normalizes job/entity mismatch to safe fallback');
must(service, 'Şimdi: Bu ekranda seçili araç bilgisi net görünmüyor.', 'service keeps safe GPS fallback text');
must(service, "String(err?.code || \"\") === \"JOB_TYPE_ENTITY_MISMATCH\" || String(err?.code || \"\") === \"UNSUPPORTED_JOB_TYPE\"", 'service catches mismatch and unsupported job types');
must(http, 'JOB_TYPE_ENTITY_MISMATCH', 'http normalizer maps job/entity mismatch safely');
must(http, 'Şimdi: Bu ekranda seçili araç bilgisi net görünmüyor.', 'http normalizer exposes safe GPS fallback text');
must(http, 'Bu rehber şu anda bu ekran için kullanılamıyor.', 'http normalizer exposes safe unsupported-job fallback text');

must(facts, "label: 'Canlı başlatma zamanı / aktif durum / GPS / operasyon kanıtı kontrolü'", 'facts keeps live-start label');
must(facts, 'Önerilen adım: canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.', 'facts keeps shift recommendation text');
must(facts, 'Önerilen adım: araç, sürücü, rota/durak, araç GPS’i ve Sürücünün telefon GPS’i sinyalini birlikte kontrol et.', 'facts keeps map recommendation text');
  must(facts, 'Şimdi: En kritik sorun canlılık ve cihaz riski.', 'facts keeps operation health lead');
  must(facts, 'Riskli cihazı aç, GPS güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.', 'facts keeps operation health recommendation');
  mustNotRaw(facts, 'OperationProof', 'facts avoids visible technical proof wording');

must(operationHealthPanel, 'buildOperationHealthCopilotFacts', 'operation health panel uses dedicated copilot facts helper');

console.log('=== COP-03C-FIX-03 LIVE ACCEPTANCE POLISH CHECK PASS ===');
