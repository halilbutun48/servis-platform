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
  const normalized = normalize(text);
  for (const needle of needles) {
    const idx = normalized.indexOf(normalize(needle));
    if (idx < 0) fail(`${label}: missing ${needle}`);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

console.log('=== COP-04A-FIX-01 GLOBAL LIVE ANSWER FINAL POLISH CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const policy = read('backend/src/ai/chat/answerQualityPolicy.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const facts = read('web/src/utils/copilotFacts.js');

must(pkg, '"check:cop04afix01": "node backend/scripts/cop_04a_fix_01_global_live_answer_final_polish_check.js"', 'package.json exposes check:cop04afix01');
must(pkg, '"check:cop04afix02": "node backend/scripts/cop_04a_fix_02_contract_generation_intent_check.js"', 'package.json exposes check:cop04afix02');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');
must(pkg, '"check:cop03cfix03"', 'package.json keeps check:cop03cfix03');
must(pkg, '"check:e2esmoke01"', 'package.json keeps check:e2esmoke01');
must(pkg, '"check:fieldlaunch01"', 'package.json keeps check:fieldlaunch01');

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
  'check:cop04afix02',
  'check:cop04afix01',
], 'product extensions runner order keeps cop04afix01 last');

must(verifyChain, 'check:cop04afix01', 'verify chain waits for check:cop04afix01');
must(verifyChain, 'check:cop04afix02', 'verify chain waits for check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide exposes check:cop04afix01');
must(guide, 'check:cop04afix02', 'script guide exposes check:cop04afix02');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');
must(guide, 'check:cop03cfix03', 'script guide keeps check:cop03cfix03');

must(policy, 'WORKFLOW_GENERIC_CHIP_BLOCKLIST', 'workflow chip policy keeps generic blocklist');
must(policy, 'Bu aksiyonu simüle et', 'workflow chip policy still blocks simulated-action wording');
must(policy, 'Aynı kayıt için devam et', 'workflow chip policy keeps generic continuation block');
must(policy, 'Ekran rehberini aç', 'workflow chip policy keeps generic guide block');
must(policy, 'Vardiya engelini sor', 'workflow chip policy keeps blocked-shift block');

must(helpComposer, 'Riskli cihazı aç, stale/offline satırını kontrol et ve açık sorunları sırala.', 'help composer keeps operation-health direct next step');
  must(helpComposer, 'Başlatma zamanı ve aktif durum uygunsa GPS ve operasyon kanıtı akışını kontrol et; araç/sürücü bağı görünmüyorsa kontrol et, atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.', 'help composer keeps shift direct next step');
  must(helpComposer, 'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya sözleşme üretim sinyali gerekir.', 'help composer keeps Turkish contract mismatch lead');
  must(helpComposer, 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.', 'help composer keeps contract next action');
  must(helpComposer, 'normalizeVisibleSuggestionFragment(actionSimulation)', 'help composer keeps action simulation normalizer');
must(helpComposer, 'replace(/^Bu aksiyonu simüle et', 'help composer strips generic simulated-action wording');
mustNot(helpComposer, 'Sıradaki doğru işlem: Bu aksiyonu simüle et', 'help composer does not surface simulated-action text verbatim');
mustNotRaw(helpComposer, 'contractShiftGeneration', 'help composer avoids technical contract signal wording');
mustNotRaw(helpComposer, 'OperationProof', 'help composer avoids technical proof wording');
mustNotRaw(helpComposer, 'JOB_TYPE_ENTITY_MISMATCH', 'help composer avoids raw mismatch code');

ordered(helpComposer, [
  'if (/(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text)',
  "if (path.includes('/commercial-core') || path.includes('/payment') || /(hakediş|hakedis|ödeme|odeme|settlement|komisyon|csv|önizleme|onizleme)/.test(text)) return /(hazır değil|hazir degil|hazırlık|hazirlik|eksik|kontrol gerekli)/.test(text) ? 'PAYMENT_READINESS' : 'PAYMENT_PREVIEW';",
], 'contract-shift detection beats payment readiness');

must(facts, 'Şimdi: En kritik sorun canlılık ve cihaz riski.', 'facts keeps operation-health lead');
must(facts, 'Şimdi: Bu ekranda somut operasyon sağlığı sinyali görünmüyor; açık sorun, riskli cihaz, aktif sürücü ve stale/offline satırlarını kontrol et.', 'facts keeps operation-health fallback');
must(facts, 'Riskli cihazı aç, stale/offline satırını kontrol et ve açık sorunları sırala.', 'facts keeps operation-health direct next step');
must(facts, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'facts keeps contract no-signal wording');
must(facts, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'facts keeps contract positive signal wording');
must(facts, 'Eksik bilgi 0 görünüyor; ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini kontrol et.', 'facts keeps payment zero-missing wording');
must(facts, 'Sürücünün telefon GPS’i', 'facts keeps driver gps language');
must(facts, 'Araç GPS’i', 'facts keeps vehicle gps language');
mustNotRaw(facts, 'OperationProof', 'facts avoids technical proof wording');
mustNot(facts, 'Öneri: Önerilen adım:', 'facts avoids duplicated suggestion prefix');

console.log('=== COP-04A-FIX-01 GLOBAL LIVE ANSWER FINAL POLISH CHECK PASS ===');
