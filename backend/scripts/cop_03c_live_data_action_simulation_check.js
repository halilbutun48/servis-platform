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

console.log('=== COP-03C LIVE DATA ACTION SIMULATION CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const doc = read('docs/COPILOT_LIVE_DATA_ACTION_SIMULATION_V1.md');
const facts = read('web/src/utils/copilotFacts.js');
const selectedRuntime = read('backend/src/ai/chat/helpComposerSelectedRuntime.js');
const screenStateAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
const helpComposerEntityRuntime = read('backend/src/ai/chat/helpComposerEntityRuntime.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');
const roomCompanyCatalog = read('backend/src/ai/jobGuide/screenCatalog.roomCompany.js');
const goldenPack = read('backend/src/ai/chat/goldenQuestionPack.js');

must(pkg, '"check:cop03c": "node backend/scripts/cop_03c_live_data_action_simulation_check.js"', 'package.json exposes check:cop03c');
must(pkg, '"check:cop03b"', 'package.json keeps check:cop03b');
must(pkg, '"check:cop03afix02"', 'package.json keeps check:cop03afix02');
must(pkg, '"check:cop03afix01"', 'package.json keeps check:cop03afix01');
must(pkg, '"check:cop03a"', 'package.json keeps check:cop03a');
must(pkg, '"check:cop03cfix01"', 'package.json keeps check:cop03cfix01');
must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json exposes check:product-extensions');
must(pkg, '"verify:final"', 'package.json keeps verify:final');

ordered(runner, [
  'check:cop03a',
  'check:cop03afix01',
  'check:cop03afix02',
  'check:cop03b',
  'check:cop03c',
  'check:cop03cfix01',
  'check:uxkvkk01',
], 'product extensions runner order');
must(runner, 'check:cop03c', 'product extensions runner includes check:cop03c');
must(runner, 'check:cop03cfix01', 'product extensions runner includes check:cop03cfix01');

must(verifyChain, 'check:cop03c', 'verify chain waits for check:cop03c');
must(verifyChain, 'check:cop03cfix01', 'verify chain waits for check:cop03cfix01');
must(guide, 'check:cop03c', 'script guide exposes check:cop03c');
must(guide, 'check:cop03cfix01', 'script guide exposes check:cop03cfix01');

must(doc, 'COPILOT Live Data Action Simulation V1', 'live data doc title');
must(doc, 'COP-03C-FIX-01', 'live data doc keeps fix note visible');
ordered(doc, ['Şimdi:', 'Bu programda bunun anlamı:', 'Neden?', 'Öneri:', 'Sıradaki doğru işlem:'], 'live data doc response frame');
must(doc, 'Vardiya / Görev / Rota / GPS', 'live data doc covers shift family');
must(doc, 'Sözleşme → Vardiya Üretimi', 'live data doc covers contract-to-shift family');
must(doc, 'Ticari Akış / Hakediş Önizleme', 'live data doc covers commercial family');
must(doc, 'Kalite / Güven / Değerlendirme', 'live data doc covers quality family');
must(doc, 'Geri Bildirim / Bildirim / KVKK', 'live data doc covers feedback family');
must(doc, 'Mobil / Sürücü / Personel / Veli Canlı Takip', 'live data doc covers mobile family');
must(doc, 'Yetki / Rol / Sonraki Ekran', 'live data doc covers role family');
must(doc, 'WHY_BLOCKED', 'live data doc covers why blocked');
must(doc, 'NEXT_STEP', 'live data doc covers next step');
must(doc, 'NEXT_SCREEN', 'live data doc covers next screen');
must(doc, 'WHO_CAN_DO', 'live data doc covers who can do');
must(doc, 'MISSING_DATA', 'live data doc covers missing data');
must(doc, 'CONTRACT_TO_SHIFT', 'live data doc covers contract to shift');
must(doc, 'PAYMENT_READINESS', 'live data doc covers payment readiness');
must(doc, 'QUALITY_SIGNAL', 'live data doc covers quality signal');
must(doc, 'FEEDBACK_STATUS', 'live data doc covers feedback status');
must(doc, 'NOTIFICATION_SOURCE', 'live data doc covers notification source');
must(doc, 'KVKK_VISIBILITY', 'live data doc covers KVKK visibility');
must(doc, 'DRIVER_PHONE_GPS', 'live data doc covers driver phone GPS');
must(doc, 'Sürücünün telefon GPS’i', 'live data doc keeps driver GPS wording');
must(doc, 'sözleşme', 'live data doc keeps sözleşme wording');
must(doc, 'Yeni route/schema/migration yok.', 'live data doc keeps no-new-infrastructure rule');
mustNot(doc, 'agreement', 'live data doc avoids agreement wording');
mustNot(doc, 'raw', 'live data doc avoids raw wording');
mustNot(doc, 'payload', 'live data doc avoids payload wording');
mustNot(doc, 'token', 'live data doc avoids token wording');
mustNot(doc, 'hash', 'live data doc avoids hash wording');
mustNot(doc, 'debug', 'live data doc avoids debug wording');
mustNot(doc, 'payment execute', 'live data doc avoids payment execute wording');
mustNot(doc, 'settlement execute', 'live data doc avoids settlement execute wording');

must(facts, 'buildLiveFactConfidence', 'copilot facts keeps live fact confidence helper');
must(facts, 'buildDiagnosticPriority', 'copilot facts keeps diagnostic priority helper');
must(facts, 'buildActionSimulationWording', 'copilot facts keeps action simulation helper');
must(facts, 'selectedRecordStatus', 'copilot facts keeps selected record status field');
must(facts, 'liveFactConfidence', 'copilot facts keeps live fact confidence field');
must(facts, 'diagnosticPriority', 'copilot facts keeps diagnostic priority field');
must(facts, 'actionSimulation', 'copilot facts keeps action simulation field');
must(facts, 'Ekrandaki sinyal', 'copilot facts keeps screen signal wording');
must(facts, 'Hakediş eksik bilgi', 'copilot facts keeps payment readiness scoring');
must(facts, 'Sözleşme/vardiya kontrolü', 'copilot facts keeps contract-to-shift scoring');
must(facts, 'Önerilen adım: canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.', 'copilot facts keeps shift action simulation wording');
must(facts, 'Önerilen adım: araç, sürücü, rota/durak, araç GPS’i ve Sürücünün telefon GPS’i sinyalini birlikte kontrol et.', 'copilot facts keeps gps action simulation wording');

must(selectedRuntime, 'Seçili kayıt durumu', 'selected runtime exposes selected status row');
must(selectedRuntime, 'Ekrandaki sinyal', 'selected runtime exposes live signal row');
must(selectedRuntime, 'Diagnostic öncelik', 'selected runtime exposes diagnostic priority row');
must(selectedRuntime, 'Aksiyon simülasyonu', 'selected runtime exposes action simulation row');

must(screenStateAnalyzer, 'selectedRecordStatus', 'screen state analyzer keeps selected record status merge');
must(screenStateAnalyzer, 'liveFactConfidence', 'screen state analyzer keeps live fact confidence merge');
must(screenStateAnalyzer, 'diagnosticPriority', 'screen state analyzer keeps diagnostic priority merge');
must(screenStateAnalyzer, 'actionSimulation', 'screen state analyzer keeps action simulation merge');

must(helpComposerEntityRuntime, 'analyzerLiveFactConfidenceText', 'entity runtime keeps live fact confidence helper');
must(helpComposerEntityRuntime, 'analyzerDiagnosticPriorityText', 'entity runtime keeps diagnostic priority helper');
must(helpComposerEntityRuntime, 'analyzerActionSimulationText', 'entity runtime keeps action simulation helper');
must(helpComposerEntityRuntime, 'Ekrandaki sinyale göre:', 'entity runtime keeps confidence wording');
must(helpComposerEntityRuntime, 'Önerilen adım:', 'entity runtime keeps action simulation wording');
must(helpComposerEntityRuntime, 'Bu daha çok eksik veri gibi duruyor.', 'entity runtime keeps missing data wording');

must(helpComposer, 'composeGeneralProductGuideReply', 'help composer keeps general guide reply');
must(helpComposer, 'shouldUseWorkflowGuide', 'help composer keeps workflow guide gate');
must(helpComposer, "if (type === 'SCREEN_PURPOSE') return false;", 'help composer preserves screen-purpose behavior');
ordered(helpComposer, ['Şimdi:', 'Bu programda bunun anlamı:', 'Neden?', 'Öneri:', 'Sıradaki doğru işlem:'], 'help composer workflow reply order');
must(helpComposer, 'Ekrandaki sinyale göre konuşuyorum', 'help composer keeps live signal wording');
must(helpComposer, 'Bu kayıt için elimde yeterli sinyal yok; ilk kontrol', 'help composer keeps missing signal wording');
must(helpComposer, 'Bu daha çok eksik veri gibi duruyor.', 'help composer keeps extra missing data wording');
must(helpComposer, 'Bu yetki sınırı olabilir.', 'help composer keeps role boundary wording');
must(helpComposer, 'Önerilen adım:', 'help composer keeps action simulation wording');
mustNot(helpComposer, 'Şimdi ödeme başlat', 'help composer avoids payment start wording');
mustNot(helpComposer, 'payment execute', 'help composer avoids payment execute wording');
mustNot(helpComposer, 'settlement execute', 'help composer avoids settlement execute wording');
mustNot(helpComposer, 'veriyi güncelledim', 'help composer avoids write claim wording');
mustNot(helpComposer, 'ben bunu düzelttim', 'help composer avoids write claim wording');

must(intentRouter, "workflowQuestion ? ['Son GPS ne zaman geldi?', \"Sürücünün telefon GPS’i devrede mi?\", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç']", 'intent router covers room map diagnostic wording');
mustNot(intentRouter, "workflowQuestion ? ['Bu araç neden haritada görünmüyor?',", 'intent router removes room map self-question wording');
must(intentRouter, 'Ne yapayım?', 'intent router covers driver next-step wording');
must(intentRouter, 'Servis durumunu göster', 'intent router covers personel live wording');
must(intentRouter, 'Servis durumunu göster', 'intent router covers parent live wording');
must(intentRouter, 'İlgili sözleşmeyi aç', 'intent router covers contract-to-shift wording');
must(intentRouter, 'Bu kayıt kimde?', 'intent router covers ownership wording');
must(intentRouter, 'Bildirim kaynağı', 'intent router covers notification source wording');
must(intentRouter, 'Yetki sınırı', 'intent router covers boundary wording');
must(intentRouter, 'Sürücünün telefon GPS’i devrede mi?', 'intent router covers driver phone GPS wording');

must(screenCatalog, 'Ne yapayım?', 'screen catalog covers driver next-step wording');
must(screenCatalog, 'Servisim nerede?', 'screen catalog covers personel live wording');
must(screenCatalog, 'Öğrencimin servisi nerede?', 'screen catalog covers parent live wording');

must(roomCompanyCatalog, 'Bu araç neden haritada görünmüyor?', 'room/company catalog covers room map wording');
must(roomCompanyCatalog, 'Bu sözleşmeden bugün vardiya üretildi mi?', 'room/company catalog covers room commercial wording');
must(roomCompanyCatalog, 'Sürücünün telefon GPS’i devrede mi?', 'room/company catalog covers driver phone GPS wording');
mustNot(roomCompanyCatalog, 'label: "Agreement"', 'room/company catalog avoids visible agreement wording');

must(goldenPack, 'room-map-vehicle-not-visible', 'golden pack covers room map vehicle diagnostic case');
must(goldenPack, 'superadmin-commercial-core-readiness-live', 'golden pack covers superadmin commercial readiness case');
must(goldenPack, 'room-commercial-flow-contract-today', 'golden pack covers contract-to-shift case');
must(goldenPack, 'shared-feedback-owner', 'golden pack covers feedback ownership case');
must(goldenPack, 'superadmin-operations-start-blocked', 'golden pack covers blocked shift case');
must(goldenPack, 'driver-today-next-step', 'golden pack covers driver next-step case');
must(goldenPack, 'personel-live-service-location', 'golden pack covers personel live location case');
must(goldenPack, 'parent-live-service-location', 'golden pack covers parent live location case');
must(goldenPack, 'room-map-next-screen', 'golden pack keeps existing room map next screen case');
must(goldenPack, 'shared-kvkk-visibility', 'golden pack keeps existing KVKK visibility case');
must(goldenPack, 'superadmin-operations-role-help', 'golden pack keeps role-help case');
must(goldenPack, 'Sürücünün telefon GPS’i', 'golden pack keeps driver GPS wording');
mustNot(goldenPack, 'veriyi güncelledim', 'golden pack avoids write claim wording');
mustNot(goldenPack, 'payment execute', 'golden pack avoids payment execute wording');
mustNot(goldenPack, 'settlement execute', 'golden pack avoids settlement execute wording');

console.log('=== COP-03C LIVE DATA ACTION SIMULATION CHECK PASS ===');
