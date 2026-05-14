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

console.log('=== COP-04A GLOBAL ANSWER QUALITY CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const doc = read('docs/COPILOT_GLOBAL_ANSWER_QUALITY_V1.md');
const policy = read('backend/src/ai/chat/answerQualityPolicy.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const screenStateAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
const facts = read('web/src/utils/copilotFacts.js');
const golden = read('backend/src/ai/chat/goldenQuestionPack.js');
const http = read('backend/src/errors/http.js');

must(pkg, '"check:cop04a": "node backend/scripts/cop_04a_global_answer_quality_check.js"', 'package.json exposes check:cop04a');
must(pkg, '"check:cop03cfix03"', 'package.json keeps check:cop03cfix03');
must(pkg, '"check:e2esmoke01"', 'package.json keeps check:e2esmoke01');
must(pkg, '"check:fieldlaunch01"', 'package.json keeps check:fieldlaunch01');
must(pkg, '"check:product-extensions"', 'package.json keeps check:product-extensions');

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
  'check:cop04a',
], 'product extensions runner order keeps cop04a last');

must(verifyChain, 'check:cop04a', 'verify chain waits for check:cop04a');
must(guide, 'check:cop04a', 'script guide exposes check:cop04a');
must(guide, 'check:cop03cfix03', 'script guide keeps check:cop03cfix03');
must(guide, 'check:e2esmoke01', 'script guide keeps check:e2esmoke01');
must(guide, 'check:fieldlaunch01', 'script guide keeps check:fieldlaunch01');

must(doc, 'COPILOT Global Answer Quality V1', 'global quality doc keeps heading visible');
must(doc, 'Workflow Intent Standard', 'global quality doc keeps workflow intent section');
must(doc, 'Role-Wide Screen Matrix', 'global quality doc keeps role matrix');
must(doc, 'Sürücünün telefon GPS’i', 'global quality doc keeps driver gps language');
must(doc, 'Araç GPS’i', 'global quality doc keeps vehicle gps language');
must(doc, 'sözleşme', 'global quality doc keeps contract language');
must(doc, 'COP-03C-FIX-03', 'global quality doc keeps fix-03 protection note');
must(doc, 'Bu araç neden haritada görünmüyor?', 'global quality doc keeps GPS example');
must(doc, 'Bu hakediş neden hazır değil?', 'global quality doc keeps payment example');
must(doc, 'Bu sözleşmeden bugün vardiya üretildi mi?', 'global quality doc keeps contract example');
must(doc, 'Oda / Operasyon Sağlığı', 'global quality doc keeps operation health matrix');
must(doc, 'Vardiya / Görev / Rota / GPS', 'global quality doc keeps workflow family wording');
must(doc, 'Super Admin / Canlı İzleme', 'global quality doc keeps super admin live monitoring matrix');
must(doc, 'Super Admin / Ticari Akış', 'global quality doc keeps super admin commercial matrix');
must(doc, 'Oda / Canlı Takip', 'global quality doc keeps room live tracking matrix');
must(doc, 'Firma / Sözleşmeler', 'global quality doc keeps company contract matrix');
must(doc, 'Personel / Canlı takip', 'global quality doc keeps personel live matrix');
must(doc, 'Veli / Öğrencimin servisi', 'global quality doc keeps parent live matrix');
must(doc, 'Sürücü / Bugünkü görev', 'global quality doc keeps driver daily task matrix');
must(doc, 'Yetki sınırını kontrol et', 'global quality doc mentions old default only as non-default caution');
mustNot(doc, 'agreement', 'global quality doc avoids agreement wording');
mustNot(doc, 'raw', 'global quality doc avoids raw wording');
mustNot(doc, 'payload', 'global quality doc avoids payload wording');
mustNot(doc, 'token', 'global quality doc avoids token wording');
mustNot(doc, 'hash', 'global quality doc avoids hash wording');
mustNot(doc, 'debug', 'global quality doc avoids debug wording');
mustNot(doc, 'write', 'global quality doc avoids write wording');
mustNot(doc, 'execute', 'global quality doc avoids execute wording');
mustNot(doc, 'settlement execute', 'global quality doc avoids settlement execute wording');

must(policy, 'WORKFLOW_GENERIC_CHIP_BLOCKLIST', 'workflow chip policy keeps generic blocklist');
must(policy, 'Bunu sor', 'workflow chip policy blocks self-question prefix');
must(policy, 'Yetki sınırını açıkla', 'workflow chip policy keeps explicit role-boundary wording');
must(policy, 'Başlatma durumunu sor', 'workflow chip policy keeps shift ask label');
must(policy, 'GPS görünürlüğünü sor', 'workflow chip policy keeps GPS ask label');
must(policy, 'Hakediş önizlemesini aç', 'workflow chip policy keeps payment chip');
must(policy, 'Üretim geçmişini göster', 'workflow chip policy keeps contract chip');
must(policy, 'Riskli cihazı göster', 'workflow chip policy keeps operations-health chip');
must(policy, 'Açık kalite sinyallerini göster', 'workflow chip policy keeps quality chip');
must(policy, 'KVKK sınırını açıkla', 'workflow chip policy keeps KVKK chip');
must(policy, 'filterWorkflowGenericChips(', 'workflow chip policy exposes workflow filter');
must(policy, 'Yetki sınırını kontrol et', 'workflow chip policy still blocks old default wording');

must(helpComposer, "if (path.includes('/room/map') || path.includes('/room/live')) return ['Son GPS ne zaman geldi?', \"Sürücünün telefon GPS’i devrede mi?\", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];", 'help composer keeps map/live GPS fallback');
must(helpComposer, "const isVehicleSurface = answerEntityType === 'vehicle' || screen.includes('/map') || screen.includes('/live');", 'help composer includes live surfaces in vehicle routing');
must(helpComposer, 'GPS görünürlüğünü sor', 'help composer keeps GPS ask wording');
must(helpComposer, 'Başlatma durumunu sor', 'help composer keeps shift ask wording');
must(helpComposer, 'Hakediş önizlemesini aç', 'help composer keeps payment chip wording');
must(helpComposer, 'İlgili sözleşmeyi aç', 'help composer keeps contract chip wording');
must(helpComposer, 'Riskli cihazı göster', 'help composer keeps operation-health chip wording');
must(helpComposer, 'Açık kalite sinyallerini göster', 'help composer keeps quality chip wording');
must(helpComposer, 'KVKK sınırını açıkla', 'help composer keeps KVKK chip wording');
must(helpComposer, 'Yetki sınırını açıkla', 'help composer keeps explicit role boundary wording');
must(helpComposer, 'Sürücünün telefon GPS’i', 'help composer keeps driver GPS wording');
must(helpComposer, 'operasyon kanıtı', 'help composer keeps operational proof wording');
mustNot(helpComposer, 'Yetki sınırını kontrol et', 'help composer no longer favors old default wording');
mustNot(helpComposer, 'Bunu sor:', 'help composer does not emit self-question chip prefix');
mustNotRaw(helpComposer, 'OperationProof', 'help composer avoids visible technical proof wording');
mustNotRaw(helpComposer, 'JOB_TYPE_ENTITY_MISMATCH', 'help composer avoids visible job mismatch code');

must(intentRouter, "pathHas(options.screenPath, ['/room/map', '/room/live', '/company/live', '/organization/live', '/school/live', '/driver/map', '/driver/live', '/vehicles'])", 'intent router keeps live map location routing');
must(intentRouter, 'LOCATION_HELP', 'intent router keeps location help intent');
must(intentRouter, 'PAYMENT_READINESS', 'intent router keeps payment readiness intent');
must(intentRouter, 'CONTRACT_TO_SHIFT', 'intent router keeps contract to shift intent');
must(intentRouter, 'WHY_BLOCKED', 'intent router keeps why blocked intent');
must(intentRouter, 'NEXT_STEP', 'intent router keeps next step intent');
must(intentRouter, 'NEXT_SCREEN', 'intent router keeps next screen intent');
must(intentRouter, 'WHO_CAN_DO', 'intent router keeps role boundary intent');
must(intentRouter, 'KVKK_VISIBILITY', 'intent router keeps KVKK intent');
must(intentRouter, 'FEEDBACK_STATUS', 'intent router keeps feedback intent');
must(intentRouter, 'NOTIFICATION_SOURCE', 'intent router keeps notification intent');
must(intentRouter, 'QUALITY_SIGNAL', 'intent router keeps quality intent');
must(intentRouter, 'filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });', 'intent router keeps workflow chip filtering');
must(intentRouter, 'Riskli cihazı göster', 'intent router keeps operation health chip');
must(intentRouter, 'Stale/offline satırını aç', 'intent router keeps stale chip');
must(intentRouter, 'Açık sorunları sırala', 'intent router keeps issue chip');
must(intentRouter, 'Aktif sürücüleri kontrol et', 'intent router keeps active driver chip');
must(intentRouter, 'Canlı takip ekranını aç', 'intent router keeps live tracking chip');

must(screenStateAnalyzer, 'activeDrivers', 'screen analyzer keeps active driver counter');
must(screenStateAnalyzer, 'riskyDevices', 'screen analyzer keeps risky device counter');
must(screenStateAnalyzer, 'staleOrOffline', 'screen analyzer keeps stale/offline counter');
must(screenStateAnalyzer, 'openIssues', 'screen analyzer keeps open issues counter');
must(screenStateAnalyzer, 'Şimdi: En kritik sorun canlılık ve cihaz riski.', 'screen analyzer keeps operation health lead');
must(screenStateAnalyzer, 'Önce riskli cihazı aç. Sonra stale/offline satırını ve açık sorunları sırala. Ardından ilgili sürücü veya araç ekranına geç.', 'screen analyzer keeps operation health next action');

must(facts, "label: 'Canlı başlatma zamanı / aktif durum / GPS / operasyon kanıtı kontrolü'", 'facts keeps live start label');
must(facts, "readyForLiveStart ? ['live-start', 'gps-old', 'missing-vehicle-driver', 'operation-proof']", 'facts keeps live-start scoring boost');
must(facts, 'Önerilen adım: canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.', 'facts keeps shift recommendation');
must(facts, 'Önerilen adım: araç, sürücü, rota/durak, araç GPS’i ve Sürücünün telefon GPS’i sinyalini birlikte kontrol et.', 'facts keeps map recommendation');
must(facts, 'Şimdi: En kritik sorun canlılık ve cihaz riski.', 'facts keeps operation health lead');
must(facts, 'Servis kanıtı', 'facts keeps service-proof visible language');
mustNotRaw(facts, 'OperationProof', 'facts avoids visible technical proof wording');
mustNot(facts, 'Yetki sınırını kontrol et', 'facts no longer uses old default wording');
mustNotRaw(facts, 'JOB_TYPE_ENTITY_MISMATCH', 'facts avoids visible job mismatch code');

must(golden, "path: '/room/map'", 'golden pack keeps room map case');
must(golden, 'Bu araç neden haritada görünmüyor?', 'golden pack keeps vehicle visibility question');
must(golden, "path: '/superadmin/operations'", 'golden pack keeps super admin operations case');
must(golden, 'Sürücünün telefon GPS’i neden devrede?', 'golden pack keeps super admin GPS question');
must(golden, "path: '/superadmin/commercial-core'", 'golden pack keeps commercial core case');
must(golden, 'Bu hakediş neden hazır değil?', 'golden pack keeps payment readiness question');
must(golden, "path: '/room/operation-health'", 'golden pack keeps operation health case');
must(golden, 'Operasyon Sağlığı: sorun ne?', 'golden pack keeps operation health question');
must(golden, "path: '/room/agreements'", 'golden pack keeps room agreements case');
must(golden, 'Bu sözleşmeden bugün vardiya üretildi mi?', 'golden pack keeps contract to shift question');
must(golden, "path: '/driver/today'", 'golden pack keeps driver today case');
must(golden, 'selectedLabel: \'Bugünkü görev\'', 'golden pack keeps driver today selected record');
must(golden, "path: '/personel/live'", 'golden pack keeps personel live case');
must(golden, 'Servisim nerede?', 'golden pack keeps personel location question');
must(golden, "path: '/parent/live'", 'golden pack keeps parent live case');
must(golden, 'Öğrencimin servisi nerede?', 'golden pack keeps parent location question');
must(golden, "path: '/superadmin/operations'", 'golden pack keeps superadmin operations case');
must(golden, 'Sürücünün telefon GPS’i neden devrede?', 'golden pack keeps driver gps question');
must(golden, "path: '/shared/kvkk'", 'golden pack keeps kvkk case');
must(golden, 'Bu bilgi neden görünmüyor?', 'golden pack keeps kvkk visibility question');
must(golden, "path: '/shared/feedback'", 'golden pack keeps feedback case');
must(golden, 'Bu kayıt kimde?', 'golden pack keeps feedback ownership question');
must(golden, "path: '/superadmin/trust-quality'", 'golden pack keeps trust quality case');
must(golden, 'Bu sağlayıcı neden daha iyi?', 'golden pack keeps provider comparison question');

must(http, 'Şimdi: Bu ekranda seçili araç bilgisi net görünmüyor.', 'http normalizer keeps safe mismatch fallback');
must(http, 'Bu rehber şu anda bu ekran için kullanılamıyor.', 'http normalizer keeps safe unsupported fallback');

console.log('=== COP-04A GLOBAL ANSWER QUALITY CHECK PASS ===');
