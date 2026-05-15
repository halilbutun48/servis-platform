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

function mustAny(text, needles, label) {
  const haystack = normalize(text);
  const values = Array.isArray(needles) ? needles : [];
  if (values.some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

console.log('=== COP-04B PANEL CONTEXT AUDIT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const doc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const copilotSelection = read('web/src/utils/copilotSelection.js');
const agreementFacts = read('web/src/utils/agreementCopilotFacts.js');
const facts = read('web/src/utils/copilotFacts.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
const screenAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
const schemas = read('backend/src/ai/schemas.js');
const http = read('backend/src/errors/http.js');
const aiRoute = read('backend/src/routes/ai.js');

must(pkg, '"check:cop04b": "node backend/scripts/cop_04b_panel_context_audit_check.js"', 'package.json exposes check:cop04b');
must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');
must(pkg, '"check:e2esmoke01"', 'package.json keeps check:e2esmoke01');
must(pkg, '"check:fieldlaunch01"', 'package.json keeps check:fieldlaunch01');

must(runner, 'check:cop04b', 'product extensions runner keeps cop04b');
must(verifyChain, 'check:cop04b', 'verify chain waits for check:cop04b');
must(guide, 'check:cop04b', 'script guide exposes check:cop04b');
must(guide, 'check:cop04afix04', 'script guide keeps check:cop04afix04');
must(guide, 'check:cop04afix03', 'script guide keeps check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(doc, 'COPILOT PANEL CONTEXT AUDIT V1', 'audit doc keeps title');
must(doc, 'Selected Context Parity Standard', 'audit doc keeps selected context parity standard');
must(doc, 'Role-wide panel matrix', 'audit doc keeps role matrix');
must(doc, 'Panel bazli audit tablosu', 'audit doc keeps panel inventory table');
must(doc, 'Backend intent / composer coverage table', 'audit doc keeps backend coverage table');
must(doc, 'Frontend facts bridge coverage table', 'audit doc keeps frontend coverage table');
must(doc, 'Risk classification', 'audit doc keeps risk classification section');
mustAny(doc, ['live question fallback', 'teknik hata', 'yanlış selected context'], 'audit doc keeps p0 definition');
mustAny(doc, ['selected info var ama cevapta kullanılmıyor', 'cevapta kullanılmıyor'], 'audit doc keeps p1 definition');
mustAny(doc, ['chip / görünür dil / premium polish', 'görünür dil', 'premium polish'], 'audit doc keeps p2 definition');
must(doc, 'COP-04B-FIX-01', 'audit doc keeps next fix 01');
must(doc, 'COP-04B-FIX-02', 'audit doc keeps next fix 02');
must(doc, 'COP-04B-FIX-03', 'audit doc keeps next fix 03');
must(doc, 'COP-04B-FIX-04', 'audit doc keeps next fix 04');
must(doc, 'Bu audit product behavior değiştirmez.', 'audit doc keeps no product behavior note');
must(doc, 'Firma / Sözleşmeler', 'audit doc keeps company live failure reference');
must(doc, 'Oda / Canlı Takip', 'audit doc keeps room live tracking reference');
must(doc, '34ABC123', 'audit doc keeps vehicle reference');
must(doc, 'Üretilen vardiya: 3', 'audit doc keeps generated shift reference');
must(doc, 'Son üretilen vardiya #7', 'audit doc keeps last generated shift reference');
must(doc, 'Bugün üretim: Var', 'audit doc keeps today generation reference');
must(doc, 'Bunu anlayamadım', 'audit doc keeps unknown fallback reference');
must(doc, 'seçili araç bilgisi net görünmüyor', 'audit doc keeps vehicle fallback reference');
mustAny(doc, [
  'SUPER_ADMIN',
  'ROOM',
  'COMPANY',
  'SCHOOL',
  'ORGANIZATION',
  'DRIVER',
  'PERSONEL',
  'PARENT',
], 'audit doc keeps role list');

mustAny(doc, [
  'web/src/panels/shared/CopilotPanel.jsx',
  'web/src/utils/copilotSelection.js',
  'web/src/utils/agreementCopilotFacts.js',
  'web/src/utils/copilotFacts.js',
  'backend/src/ai/chat/helpComposer.js',
  'backend/src/ai/chat/intentRouter.js',
  'backend/src/ai/chat/answerQualityPolicy.js',
  'backend/src/ai/chat/screenStateAnalyzer.js',
  'backend/src/ai/schemas.js',
  'backend/src/errors/http.js',
], 'audit doc keeps core bridge source references');

mustAny(doc, [
  'web/src/panels/company/AgreementsPanel.jsx',
  'web/src/panels/company/CommercialFlowPanel.jsx',
  'web/src/panels/room/MapPanel.jsx',
  'web/src/panels/room/OperationHealthPanel.jsx',
  'web/src/panels/superadmin/OperationsPanel.jsx',
  'web/src/panels/driver/TodayPanel.jsx',
  'web/src/panels/personel/LivePanel.jsx',
  'web/src/panels/parent/LivePanel.jsx',
  'web/src/panels/school/OperationsPanel.jsx',
], 'audit doc keeps representative panel inventory references');

must(copilotPanel, 'selectedSummary', 'CopilotPanel keeps selectedSummary bridge');
must(copilotPanel, 'selectedFields', 'CopilotPanel keeps selectedFields bridge');
must(copilotPanel, 'selectedBadges', 'CopilotPanel keeps selectedBadges bridge');
must(copilotPanel, 'structuredFacts', 'CopilotPanel keeps structuredFacts bridge');
must(copilotPanel, 'screenContext', 'CopilotPanel keeps screenContext bridge');
must(copilotSelection, 'setCopilotSelection', 'copilot selection store keeps setter');
must(copilotSelection, 'readCopilotSelection', 'copilot selection store keeps reader');

must(agreementFacts, 'generatedShiftCount', 'agreement facts keeps generated shift count');
must(agreementFacts, 'lastGeneratedShiftId', 'agreement facts keeps last generated shift id');
must(agreementFacts, 'todayGeneratedShift', 'agreement facts keeps today generated flag');
must(agreementFacts, 'copilotSummary', 'agreement facts keeps copilot summary');
mustAny(agreementFacts, ['Üretilen vardiya:', 'Son üretilen vardiya #', 'Bugün üretim: Var'], 'agreement facts keeps production wording');

must(facts, 'buildLiveFactConfidence', 'copilot facts keeps live confidence helper');
must(facts, 'buildDiagnosticPriority', 'copilot facts keeps diagnostic priority helper');
must(facts, 'buildActionSimulationWording', 'copilot facts keeps action simulation helper');
must(facts, 'Sürücünün telefon GPS’i', 'copilot facts keeps driver gps wording');
must(facts, 'Araç GPS’i', 'copilot facts keeps vehicle gps wording');
must(facts, 'operasyon kanıtı', 'copilot facts keeps operational proof wording');

must(intentRouter, 'CONTRACT_TO_SHIFT', 'intent router keeps contract intent');
must(intentRouter, 'PAYMENT_READINESS', 'intent router keeps payment readiness intent');
must(intentRouter, 'LOCATION_HELP', 'intent router keeps location help intent');
must(intentRouter, 'WHO_CAN_DO', 'intent router keeps who can do intent');
must(intentRouter, 'QUALITY_SIGNAL', 'intent router keeps quality intent');
must(intentRouter, 'FEEDBACK_STATUS', 'intent router keeps feedback intent');
must(intentRouter, 'NOTIFICATION_SOURCE', 'intent router keeps notification intent');
must(intentRouter, 'KVKK_VISIBILITY', 'intent router keeps kvkk intent');
must(intentRouter, 'NEXT_STEP', 'intent router keeps next step intent');
must(intentRouter, 'NEXT_SCREEN', 'intent router keeps next screen intent');
must(intentRouter, 'filterWorkflowGenericChips(', 'intent router keeps generic chip filtering context');

must(helpComposer, 'Şimdi:', 'help composer keeps workflow lead');
must(helpComposer, 'Bu programda bunun anlamı:', 'help composer keeps meaning lead');
must(helpComposer, 'Öneri:', 'help composer keeps suggestion lead');
must(helpComposer, 'Sıradaki doğru işlem:', 'help composer keeps next action lead');
must(helpComposer, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'help composer keeps contract production wording');
must(helpComposer, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'help composer keeps negative contract wording');

must(answerPolicy, 'WORKFLOW_GENERIC_CHIP_BLOCKLIST', 'answer policy keeps generic chip blocklist');
must(answerPolicy, 'Bunu sor', 'answer policy keeps generic chip block');
must(answerPolicy, 'Aynı kayıt için devam et', 'answer policy keeps continuation block');
must(answerPolicy, 'Ekran rehberini aç', 'answer policy keeps guide block');
must(answerPolicy, 'Vardiya engelini sor', 'answer policy keeps old generic block');
must(answerPolicy, 'Üretim geçmişini göster', 'answer policy keeps contract chip');
must(answerPolicy, 'Riskli cihazı göster', 'answer policy keeps operations chip');

must(screenAnalyzer, 'activeDrivers', 'screen analyzer keeps active drivers');
must(screenAnalyzer, 'riskyDevices', 'screen analyzer keeps risky devices');
must(screenAnalyzer, 'staleOrOffline', 'screen analyzer keeps stale offline');
must(screenAnalyzer, 'openIssues', 'screen analyzer keeps open issues');
must(screenAnalyzer, 'Şimdi: En kritik sorun canlılık ve cihaz riski.', 'screen analyzer keeps operation health lead');
must(screenAnalyzer, 'Önce riskli cihazı aç. Sonra stale/offline satırını ve açık sorunları sırala. Ardından ilgili sürücü veya araç ekranına geç.', 'screen analyzer keeps operation health next step');

must(schemas, 'isAgreementScreenContext', 'schemas keeps agreement screen helper');
must(schemas, 'CONTRACT_TO_SHIFT_PHRASES', 'schemas keeps contract phrase helper');
must(http, 'JOB_TYPE_ENTITY_MISMATCH', 'http keeps safe mismatch normalization');
must(http, 'Şimdi: Bu ekranda seçili araç bilgisi net görünmüyor.', 'http keeps safe mismatch fallback');
must(aiRoute, 'VALIDATION_ERROR', 'ai route keeps validation error handling');
must(aiRoute, 'Bunu anlayamadım. Kısaca ne yapmak istediğini yazabilir misin?', 'ai route keeps validation fallback wording');

must(doc, 'Runtime behavior değiştirmez.', 'audit doc keeps runtime note');

console.log('=== COP-04B PANEL CONTEXT AUDIT CHECK PASS ===');
