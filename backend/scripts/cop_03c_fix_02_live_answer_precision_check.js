#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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

console.log('=== COP-03C-FIX-02 LIVE ANSWER PRECISION CHECK ===');

const pkg = read('package.json');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const doc = read('docs/COPILOT_LIVE_DATA_ACTION_SIMULATION_V1.md');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const facts = read('web/src/utils/copilotFacts.js');
const screenStateAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
const registryScripts = productExtensionsChecks.map((step) => step.script);

must(pkg, '"check:cop03cfix02": "node backend/scripts/cop_03c_fix_02_live_answer_precision_check.js"', 'package.json exposes check:cop03cfix02');
must(pkg, '"check:cop03cfix01"', 'package.json keeps check:cop03cfix01');
must(pkg, '"check:cop03c"', 'package.json keeps check:cop03c');
must(pkg, '"check:cop03b"', 'package.json keeps check:cop03b');

assertProductExtensionsOrder([
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
  'check:cop03cfix02',
], 'product extensions registry order keeps cop03cfix02 last', registryScripts);

assertProductExtensionsIncludes('check:cop03cfix02', 'product extensions registry references cop03cfix02', registryScripts);
assertProductExtensionsIncludes('check:cop03cfix02', 'verify chain registry waits for check:cop03cfix02', registryScripts);
must(guide, 'check:cop03cfix02', 'script guide exposes check:cop03cfix02');
must(guide, 'check:cop03cfix01', 'script guide keeps check:cop03cfix01');

must(doc, 'COP-03C-FIX-02', 'live data doc keeps fix-02 heading visible');
must(doc, 'Workflow soruları ekran amacıyla başlamaz', 'live data doc keeps workflow precision note');
must(doc, 'Canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı', 'live data doc keeps live-start wording');
mustNot(doc, 'execute', 'live data doc avoids execute wording');
mustNot(doc, 'write', 'live data doc avoids write wording');
mustNot(doc, 'settlement execute', 'live data doc avoids settlement execute wording');
mustNot(doc, 'payment execute', 'live data doc avoids payment execute wording');
mustNot(doc, 'payload', 'live data doc avoids payload wording');
mustNot(doc, 'token', 'live data doc avoids token wording');
mustNot(doc, 'hash', 'live data doc avoids hash wording');
mustNot(doc, 'debug', 'live data doc avoids debug wording');

must(helpComposer, 'looksLikeWorkflowPurposeLeak', 'help composer filters workflow purpose leaks');
must(helpComposer, 'workflowVisibleFragments([', 'help composer keeps workflow fragment filter');
must(helpComposer, 'pickWorkflowVisibleReply(', 'help composer keeps workflow reply picker');
must(helpComposer, 'const workflowAction = workflowQuestion ? workflowActionSpec({ activeTopic: context?.activeTopic, questionType }) : null;', 'help composer keeps workflow action gate');
must(helpComposer, 'workflowAsk = (() => {', 'help composer keeps workflow ask gate');
must(helpComposer, 'if (workflowAction) {', 'help composer keeps workflow-specific shift branch');
must(helpComposer, 'const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType);', 'help composer distinguishes workflow topics');
must(helpComposer, 'if (hasSelectedRecord && !workflowTopic && !path.includes(\'/parent/live\')) {', 'help composer keeps generic selected-record chips out of workflow questions');
must(helpComposer, "if (roleBoundary && ['ROLE_HELP', 'WHO_CAN_DO', 'ROLE_BOUNDARY', 'KVKK_VISIBILITY'].includes(String(questionType || ''))) chips.unshift('Yetki sınırını açıkla');", 'help composer narrows role-boundary chip injection');
must(helpComposer, "const relevantQuestionType = ['STATUS_HELP', 'WHY_BLOCKED', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'READINESS_CHECK', 'TERM_HELP', 'FIRST_CONTROL'].includes", 'help composer keeps workflow-only operational questions');
must(helpComposer, "const workflowNow = pickWorkflowVisibleReply(", 'help composer workflow now uses filtered fragments');
must(helpComposer, "const workflowMeaning = pickWorkflowVisibleReply(", 'help composer workflow meaning uses filtered fragments');
must(helpComposer, "const workflowWhy = pickWorkflowVisibleReply(", 'help composer workflow why uses filtered fragments');
must(helpComposer, "const workflowAdvice = pickWorkflowVisibleReply(", 'help composer workflow advice uses filtered fragments');
must(helpComposer, "const workflowNextAction = pickWorkflowVisibleReply(", 'help composer workflow next action uses filtered fragments');
must(helpComposer, 'const workflowContextSummary = workflowVisibleFragments([', 'help composer workflow context summary uses filtered fragments');
must(helpComposer, "replace(/\\bblokajı\\b/gi, 'engeli')", 'help composer fixes vardiya blokajı typo');
must(helpComposer, "replace(/blokajı/gi, 'engeli')", 'help composer fixes plain-language blokajı typo');
must(helpComposer, "SHIFT_BLOCKED: 'Vardiya engeli'", 'help composer keeps correct blocked-shift label');
must(helpComposer, "makeGuideAction('Sıralı kontrol rehberini aç'", 'help composer keeps sequential-control guide label');
must(helpComposer, 'Başlatma zamanı uygun mu?', 'help composer keeps vardiya follow-up wording');
must(helpComposer, 'Hakediş önizleme rehberini aç', 'help composer keeps workflow-specific payment guide label');
must(helpComposer, 'Sözleşme → vardiya rehberini aç', 'help composer keeps workflow-specific contract guide label');
must(helpComposer, 'Konum kaynağı rehberini aç', 'help composer keeps workflow-specific GPS guide label');
must(helpComposer, "if (path.includes('/room/map') || path.includes('/room/live')) return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];", 'help composer keeps GPS workflow chips without self-question');
must(helpComposer, "if (['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(questionType || ''))) return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];", 'help composer keeps GPS workflow question chips');
mustNot(helpComposer, "if (path.includes('/room/map')) return ['Bu araç neden haritada görünmüyor?',", 'help composer removes GPS self-question chip');
must(helpComposer, 'Canlı takip ekranını aç', 'help composer keeps live tracking chip');
must(helpComposer, 'Bu ekranda hakediş sinyali görünmüyor; Ticari Akış/Hakediş önizlemesi ekranında eksik bilgi, ödeme hesabı ve komisyon durumunu kontrol et.', 'help composer keeps payment mismatch guard');
  must(helpComposer, 'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya sözleşme üretim sinyali gerekir.', 'help composer keeps contract-shift mismatch guard');
must(helpComposer, "makeGuideAction('Sıralı kontrol rehberini aç', { jobType: 'ASSIGNMENT_READINESS_GUIDE'", 'help composer keeps generic readiness guide label in shift fallback');
must(helpComposer, 'Konum sinyali/operasyon kanıtını kontrol et', 'help composer uses vardiya follow-up in shift fallback');
mustNot(helpComposer, 'Bu ekran, teklifin temel bilgilerini kontrol et', 'help composer no longer leaks offer-purpose intro');
mustNot(helpComposer, 'Atamaya hazır mı rehberini aç', 'help composer removes generic readiness guide wording');

must(intentRouter, "pathHas(screenPath, ['/room/shifts'])", 'intent router adds room shifts routing');
must(intentRouter, 'Başlatma zamanı uygun mu?', 'intent router keeps shift workflow chips');
must(intentRouter, 'Araç/sürücü bağlantısını kontrol et', 'intent router keeps shift workflow chip');
must(intentRouter, 'Rota/durak hazır mı?', 'intent router keeps shift workflow chip');
must(intentRouter, 'Konum sinyali/operasyon kanıtını kontrol et', 'intent router keeps shift workflow chip');
must(intentRouter, 'Başlatma zamanı uygun mu?', 'intent router keeps shift workflow chip');
must(intentRouter, "if (pathHas(screenPath, ['/room/map'])) {\n    return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];\n  }", 'intent router keeps map workflow chips');
must(intentRouter, "workflowQuestion ? ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'] : ['Bu ekranı detaylı anlat', 'Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç']", 'intent router keeps map workflow chips');
mustNot(intentRouter, "workflowQuestion ? ['Bu araç neden haritada görünmüyor?',", 'intent router removes GPS self-question chip');
must(intentRouter, 'Riskli cihazı göster', 'intent router keeps operation-health chips');
must(intentRouter, 'konum sinyali güncel değil / çevrim dışı satırını aç', 'intent router keeps operation-health chips');
must(intentRouter, 'Açık sorunları sırala', 'intent router keeps operation-health chips');
must(intentRouter, 'Aktif sürücüleri kontrol et', 'intent router keeps operation-health chips');
must(intentRouter, 'Bu bilgi neden görünmüyor?', 'intent router keeps KVKK workflow chips');

must(screenStateAnalyzer, 'activeDrivers', 'operation health reads activeDrivers counter');
must(screenStateAnalyzer, 'riskyDevices', 'operation health reads riskyDevices counter');
must(screenStateAnalyzer, 'staleOrOffline', 'operation health reads staleOrOffline counter');
must(screenStateAnalyzer, 'openIssues', 'operation health reads openIssues counter');
must(screenStateAnalyzer, 'Şimdi: En kritik sorun canlılık ve cihaz riski.', 'operation health uses precise diagnosis lead');
must(screenStateAnalyzer, 'Aktif sürücü: ', 'operation health surfaces active drivers count');
must(screenStateAnalyzer, 'Riskli cihaz: ', 'operation health surfaces risky device count');
must(screenStateAnalyzer, 'GPS güncel değil / çevrim dışı: ', 'operation health surfaces stale/offline count');
must(screenStateAnalyzer, 'Açık sorun: ', 'operation health surfaces open issues count');
must(screenStateAnalyzer, 'Önce riskli cihazı aç. Sonra GPS güncel değil / çevrim dışı satırını ve açık sorunları sırala. Ardından ilgili sürücü veya araç ekranına geç.', 'operation health next action stays concrete');

must(facts, 'normalizeEnumKey', 'facts adds enum normalization helper');
must(facts, "const screenTypeKey = normalizeEnumKey(screenType);", 'facts uses uppercase screen type key');
must(facts, "const readyForLiveStart = screenTypeKey === 'SHIFTS' && /approved/.test(text) && /ready/.test(text) && /(araç|arac|vehicle|sürücü|surucu|driver)/.test(text);", 'facts keeps ready-for-live-start guard');
must(facts, "screenTypeKey === 'SHIFTS'", 'facts guards live-start scoring with normalized screen type');
must(facts, "screenTypeKey === 'PAYMENT_READINESS'", 'facts uses normalized payment readiness branch');
must(facts, "screenTypeKey === 'COMMERCIAL_FLOW'", 'facts uses normalized commercial flow branch');
must(facts, "const normalizedScreenType = normalizeEnumKey(screenType);", 'facts uses normalized screen type in action wording');
mustNot(facts, "normalizeSignalText(screenType) === 'shifts'", 'facts no longer uses locale-sensitive shift guard');
must(facts, "if (/(kvkk|yetki|erişim|erisim|izin|403|401|permission denied|gizli|görünmüyor|gorunmuyor)/.test(combined))", 'facts narrows role false-positive guard');
must(facts, "label: 'Canlı başlatma zamanı / aktif durum / GPS / operasyon kanıtı kontrolü'", 'facts keeps live-start diagnostic label');
must(facts, "readyForLiveStart ? ['live-start', 'gps-old', 'missing-vehicle-driver', 'operation-proof']", 'facts boosts live-start priority on ready shifts');
must(facts, 'APPROVED ile canlı başlatma aynı şey değildir', 'facts keeps live-start compare hint');
must(facts, 'Önerilen adım: canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.', 'facts keeps shift action simulation wording');
must(facts, 'Önerilen adım: araç, sürücü, rota/durak, araç konum sinyali ve sürücünün telefonundan konum sinyalini birlikte kontrol et.', 'facts keeps GPS action simulation wording');
mustNot(facts, 'write', 'facts avoids write wording');
mustNot(facts, 'execute', 'facts avoids execute wording');
mustNot(facts, 'settlement execute', 'facts avoids settlement execute wording');
mustNot(facts, 'payment execute', 'facts avoids payment execute wording');
mustNot(facts, 'payload', 'facts avoids payload wording');
mustNot(facts, 'token', 'facts avoids token wording');
mustNot(facts, 'hash', 'facts avoids hash wording');
mustNot(facts, 'debug', 'facts avoids debug wording');

console.log('=== COP-03C-FIX-02 LIVE ANSWER PRECISION CHECK PASS ===');
