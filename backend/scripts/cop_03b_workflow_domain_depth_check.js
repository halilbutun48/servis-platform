#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreGoldenQuestionPack } from '../src/ai/chat/qualityScorer.js';
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function file(rel) {
  return path.join(root, rel.replace(/\\/g, '/'));
}

function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
}

function has(rel) {
  if (fs.existsSync(file(rel))) ok(`${rel} exists`);
  else fail(`${rel} exists`);
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
    .toLowerCase('tr-TR');
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  throw new Error(`FAIL ${msg}`);
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

function assertTypeCount(byType, type, minCount, label) {
  const count = Number(byType?.[type]?.count || 0);
  if (count >= minCount) ok(`${label} (${count})`);
  else fail(`${label} (${count})`);
}

console.log('=== COP-03B WORKFLOW DOMAIN DEPTH CHECK ===');

const pkg = read('package.json');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const doc = read('docs/COPILOT_WORKFLOW_DOMAIN_DEPTH_V1.md');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const contextResolver = read('backend/src/ai/chat/contextResolver.js');
const selectedRuntime = read('backend/src/ai/chat/helpComposerSelectedRuntime.js');
const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');
const roomCompanyCatalog = read('backend/src/ai/jobGuide/screenCatalog.roomCompany.js');
const goldenPackText = read('backend/src/ai/chat/goldenQuestionPack.js');
const facts = read('web/src/utils/copilotFacts.js');
const registryScripts = productExtensionsChecks.map((step) => step.script);

must(pkg, '"check:cop03b": "node backend/scripts/cop_03b_workflow_domain_depth_check.js"', 'package.json exposes check:cop03b');
must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json keeps check:product-extensions');
must(pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', 'package.json keeps check:verifychain01');
must(pkg, '"check:cop03a"', 'package.json keeps check:cop03a');
must(pkg, '"check:cop03afix01"', 'package.json keeps check:cop03afix01');
must(pkg, '"check:cop03afix02"', 'package.json keeps check:cop03afix02');
must(pkg, '"verify:final"', 'package.json keeps verify:final');

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
  'check:uxkvkk01',
  'check:docsstate01',
], 'product extensions registry order', registryScripts);
assertProductExtensionsIncludes('check:cop03b', 'product extensions registry references check:cop03b', registryScripts);
assertProductExtensionsIncludes('check:cop03b', 'verify chain registry waits for check:cop03b', registryScripts);
must(guide, 'check:cop03b', 'script guide exposes check:cop03b');

has('docs/COPILOT_WORKFLOW_DOMAIN_DEPTH_V1.md');
must(doc, 'COPILOT Workflow Domain Depth V1', 'workflow doc title');
must(doc, 'Şimdi:', 'workflow doc keeps now lead');
must(doc, 'Bu programda bunun anlamı:', 'workflow doc keeps meaning lead');
must(doc, 'Neden?', 'workflow doc keeps why lead');
must(doc, 'Öneri:', 'workflow doc keeps suggestion lead');
must(doc, 'Sıradaki doğru işlem:', 'workflow doc keeps next step lead');
must(doc, 'Vardiya / Görev / Rota / GPS', 'workflow doc covers shift family');
must(doc, 'Sözleşme → Vardiya Üretimi', 'workflow doc covers contract-to-shift family');
must(doc, 'Ticari Akış / Hakediş Önizleme', 'workflow doc covers commercial family');
must(doc, 'Kalite / Güven / Değerlendirme', 'workflow doc covers quality family');
must(doc, 'Geri Bildirim / Bildirim / KVKK', 'workflow doc covers feedback family');
must(doc, 'Mobil / Sürücü / Personel / Veli Canlı Takip', 'workflow doc covers mobile family');
must(doc, 'Yetki / Rol / Sonraki Ekran', 'workflow doc covers role family');
must(doc, 'WHY_BLOCKED', 'workflow doc mentions why blocked intent');
must(doc, 'NEXT_STEP', 'workflow doc mentions next step intent');
must(doc, 'NEXT_SCREEN', 'workflow doc mentions next screen intent');
must(doc, 'WHO_CAN_DO', 'workflow doc mentions who can do intent');
must(doc, 'MISSING_DATA', 'workflow doc mentions missing data intent');
must(doc, 'CONTRACT_TO_SHIFT', 'workflow doc mentions contract to shift intent');
must(doc, 'PAYMENT_READINESS', 'workflow doc mentions payment readiness intent');
must(doc, 'QUALITY_SIGNAL', 'workflow doc mentions quality signal intent');
must(doc, 'FEEDBACK_STATUS', 'workflow doc mentions feedback status intent');
must(doc, 'NOTIFICATION_SOURCE', 'workflow doc mentions notification source intent');
must(doc, 'KVKK_VISIBILITY', 'workflow doc mentions KVKK visibility intent');
must(doc, 'DRIVER_PHONE_GPS', 'workflow doc mentions driver phone GPS intent');
must(doc, 'Sürücünün telefon GPS’i', 'workflow doc keeps driver phone GPS wording');
must(doc, 'sözleşme', 'workflow doc keeps sözleşme wording');
mustNot(doc, 'agreement', 'workflow doc avoids agreement wording');
mustNot(doc, 'driver GPS', 'workflow doc avoids driver GPS wording');
mustNot(doc, 'raw', 'workflow doc avoids raw wording');
mustNot(doc, 'payload', 'workflow doc avoids payload wording');
mustNot(doc, 'token', 'workflow doc avoids token wording');
mustNot(doc, 'hash', 'workflow doc avoids hash wording');
mustNot(doc, 'debug', 'workflow doc avoids debug wording');
mustNot(doc, 'payment execute', 'workflow doc avoids payment execute wording');
mustNot(doc, 'settlement execute', 'workflow doc avoids settlement execute wording');

must(helpComposer, 'composeGeneralProductGuideReply', 'helpComposer keeps general workflow guide');
must(helpComposer, 'shouldUseWorkflowGuide', 'helpComposer keeps workflow guide gate');
must(helpComposer, 'if (type === \'SCREEN_PURPOSE\') return false;', 'helpComposer preserves screen-purpose gate');
must(helpComposer, 'WORKFLOW_TOPICS', 'helpComposer keeps workflow topic set');
must(helpComposer, 'selectedDiagnosticTheme', 'helpComposer keeps selected diagnostic theme');
must(helpComposer, 'selectedDiagnosticSurfaceHint', 'helpComposer keeps selected diagnostic surface hint');
must(helpComposer, 'composeSelectedRecordDiagnosticReply', 'helpComposer keeps selected diagnostic reply');
must(helpComposer, 'composeOpsQualityPaymentGuideReply', 'helpComposer keeps ops quality payment guide');
must(helpComposer, 'Şimdi:', 'helpComposer keeps now lead');
must(helpComposer, 'Bu programda bunun anlamı:', 'helpComposer keeps meaning lead');
must(helpComposer, 'Neden?', 'helpComposer keeps why lead');
must(helpComposer, 'Öneri:', 'helpComposer keeps suggestion lead');
must(helpComposer, 'Sıradaki doğru işlem:', 'helpComposer keeps next step lead');
must(helpComposer, 'QUALITY_SIGNAL', 'helpComposer covers quality signal topic');
must(helpComposer, 'PAYMENT_READINESS', 'helpComposer covers payment readiness topic');
must(helpComposer, 'FEEDBACK_STATUS', 'helpComposer covers feedback status topic');
must(helpComposer, 'NOTIFICATION_SOURCE', 'helpComposer covers notification source topic');
must(helpComposer, 'KVKK_VISIBILITY', 'helpComposer covers KVKK visibility topic');
must(helpComposer, 'WHO_CAN_DO', 'helpComposer covers who-can-do topic');
must(helpComposer, 'MISSING_DATA', 'helpComposer covers missing data topic');
must(helpComposer, 'CONTRACT_TO_SHIFT', 'helpComposer covers contract to shift topic');
must(helpComposer, 'DRIVER_PHONE_GPS', 'helpComposer covers driver phone GPS topic');
must(helpComposer, 'Bu rolde bu bilgi görünmeyebilir.', 'helpComposer keeps role boundary wording');
must(helpComposer, 'Sürücünün telefon GPS’i', 'helpComposer keeps driver GPS wording');
must(helpComposer, 'sözleşme', 'helpComposer keeps sözleşme wording');

must(intentRouter, 'ROLE_HELP', 'intent router keeps role help intent');
must(intentRouter, 'MISSING_DATA_HELP', 'intent router keeps missing data helper intent');
must(intentRouter, 'READINESS_CHECK', 'intent router keeps readiness check intent');
must(intentRouter, 'WHY_BLOCKED', 'intent router keeps why blocked intent');
must(intentRouter, 'STATUS_HELP', 'intent router keeps status help intent');
must(intentRouter, 'LOCATION_HELP', 'intent router keeps location help intent');
must(intentRouter, 'commercial-readiness', 'intent router keeps commercial readiness scoring');
must(intentRouter, 'contract-shift-readiness', 'intent router keeps contract shift scoring');
must(intentRouter, 'feedback-status', 'intent router keeps feedback status scoring');
must(intentRouter, 'notification-source', 'intent router keeps notification source scoring');
must(intentRouter, 'kvkk-visibility', 'intent router keeps KVKK visibility scoring');
must(intentRouter, 'trust-quality-quality-signal', 'intent router keeps quality signal scoring');
must(intentRouter, 'feedback-ownership', 'intent router keeps feedback ownership scoring');
must(intentRouter, 'bu hakediş neden hazır değil', 'intent router covers payment readiness wording');
must(intentRouter, 'bu kayıt kimde', 'intent router covers ownership wording');
must(intentRouter, 'bu bilgi neden görünmüyor', 'intent router covers KVKK wording');
must(intentRouter, 'bu sağlayıcı neden daha iyi', 'intent router covers quality wording');
must(intentRouter, 'sözleşmeden bugün vardiya üretildi mi', 'intent router covers contract-shift wording');
must(intentRouter, 'sürücünün telefon gps’i neden devrede', 'intent router covers driver phone GPS wording');
must(intentRouter, 'bunu kim yapabilir', 'intent router covers who-can-do wording');

must(contextResolver, 'pickSelectedEntity', 'context resolver keeps selected entity helper');
must(contextResolver, 'resolveChatContext', 'context resolver keeps resolve chat context');
must(contextResolver, 'deriveRoleMode', 'context resolver keeps role mode helper');
must(contextResolver, 'roleMode', 'context resolver still returns role mode');
must(contextResolver, 'selectedEntityType', 'context resolver keeps selected entity type');

must(selectedRuntime, 'selectedFieldReply', 'selected runtime keeps selected field reply');
must(selectedRuntime, 'ownershipAsk', 'selected runtime keeps ownership ask branch');
must(selectedRuntime, 'sorumlu', 'selected runtime keeps ownership vocabulary: sorumlu');
must(selectedRuntime, 'yetki', 'selected runtime keeps ownership vocabulary: yetki');
must(selectedRuntime, 'owner', 'selected runtime keeps ownership vocabulary: owner');
must(selectedRuntime, 'sahip', 'selected runtime keeps ownership vocabulary: sahip');
must(selectedRuntime, 'atanan', 'selected runtime keeps ownership vocabulary: atanan');
must(selectedRuntime, 'atayan', 'selected runtime keeps ownership vocabulary: atayan');
must(selectedRuntime, 'rol', 'selected runtime keeps ownership vocabulary: rol');
must(selectedRuntime, 'onay', 'selected runtime keeps ownership vocabulary: onay');

must(screenCatalog, 'workflowStages', 'screen catalog keeps workflow stages');
must(screenCatalog, 'chatQuestions', 'screen catalog keeps chat questions');
must(screenCatalog, 'Sözleşmeden bugün vardiya üretildi mi?', 'screen catalog covers contract to shift wording');
must(screenCatalog, 'Bu hakediş neden hazır değil?', 'screen catalog covers payment readiness wording');
must(screenCatalog, 'Bu sağlayıcı neden daha iyi görünüyor?', 'screen catalog covers quality wording');
must(screenCatalog, 'Bu bildirim hangi olaydan geldi?', 'screen catalog covers notification source wording');
must(screenCatalog, 'Bu bilgi neden görünmüyor?', 'screen catalog covers KVKK visibility wording');
must(screenCatalog, 'Bu kayıt kimde?', 'screen catalog covers ownership wording');
must(screenCatalog, 'Bunu kim yapabilir?', 'screen catalog covers who-can-do wording');
must(screenCatalog, 'Sürücünün telefon GPS’i devrede mi?', 'screen catalog covers driver phone GPS wording');

must(roomCompanyCatalog, 'workflowStages', 'room/company catalog keeps workflow stages');
must(roomCompanyCatalog, 'chatQuestions', 'room/company catalog keeps chat questions');
must(roomCompanyCatalog, 'Sözleşmeden bugün vardiya üretildi mi?', 'room/company catalog covers contract readiness wording');
must(roomCompanyCatalog, 'Bu hakediş neden hazır değil?', 'room/company catalog covers payment readiness wording');
must(roomCompanyCatalog, 'Bu kayıt kimde?', 'room/company catalog covers ownership wording');
must(roomCompanyCatalog, 'Bu bilgi neden görünmüyor?', 'room/company catalog covers KVKK wording');
must(roomCompanyCatalog, 'Sürücünün telefon GPS’i devrede mi?', 'room/company catalog covers driver GPS wording');
must(roomCompanyCatalog, 'SÖZLEŞME', 'room/company catalog uses sözleşme wording');
mustNot(roomCompanyCatalog, 'label: "Agreement"', 'room/company catalog avoids visible agreement wording');

must(facts, 'qualitySignal', 'copilot facts keeps quality signal fact');
must(facts, 'paymentPreview', 'copilot facts keeps payment preview fact');
must(facts, 'contractShiftGeneration', 'copilot facts keeps contract shift fact');
must(facts, 'gpsSourceVisibility', 'copilot facts keeps GPS source visibility fact');
must(facts, 'Sürücünün telefon GPS’i', 'copilot facts keeps driver GPS wording');

must(goldenPackText, 'room-agreements-contract-readiness', 'golden pack includes contract readiness case');
must(goldenPackText, 'room-commercial-flow-readiness', 'golden pack includes commercial readiness case');
must(goldenPackText, 'shared-notification-source', 'golden pack includes notification source case');
must(goldenPackText, 'shared-feedback-status', 'golden pack includes feedback status case');
must(goldenPackText, 'shared-kvkk-visibility', 'golden pack includes KVKK visibility case');
must(goldenPackText, 'superadmin-operations-role-help', 'golden pack includes role help case');
must(goldenPackText, 'room-shifts-missing-data', 'golden pack includes missing data case');
must(goldenPackText, 'superadmin-selected-provider-better-diagnostic', 'golden pack keeps quality diagnostic case');
must(goldenPackText, 'superadmin-selected-payment-missing', 'golden pack keeps payment missing case');
must(goldenPackText, 'superadmin-selected-contract-shift-today', 'golden pack keeps contract shift case');
must(goldenPackText, 'company-payment-readiness', 'golden pack keeps company payment readiness case');
must(goldenPackText, 'superadmin-quality-finite', 'golden pack keeps quality finite case');
must(goldenPackText, 'school-kvkk-boundary', 'golden pack keeps KVKK boundary case');
must(goldenPackText, 'personel-mobile-route', 'golden pack keeps mobile route case');
must(goldenPackText, 'parent-next-step-general', 'golden pack keeps next step case');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 40) ok(`golden pack case count ${report.totalCases}`);
else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`);
else fail(`overall score ${report.overall?.score || 0}`);
assertTypeCount(report.byType, 'READINESS_CHECK', 4, 'golden pack covers readiness check cases');
assertTypeCount(report.byType, 'WHY_BLOCKED', 6, 'golden pack covers why blocked cases');
assertTypeCount(report.byType, 'STATUS_HELP', 6, 'golden pack covers status help cases');
assertTypeCount(report.byType, 'ROLE_HELP', 2, 'golden pack covers role help cases');
assertTypeCount(report.byType, 'LOCATION_HELP', 1, 'golden pack covers location help cases');
assertTypeCount(report.byType, 'MISSING_DATA_HELP', 1, 'golden pack covers missing data cases');
assertTypeCount(report.byType, 'NEXT_STEP', 4, 'golden pack covers next step cases');
assertTypeCount(report.byType, 'NEXT_SCREEN', 3, 'golden pack covers next screen cases');
assertTypeCount(report.byType, 'SCREEN_PURPOSE', 6, 'golden pack keeps screen purpose coverage');
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported');
else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`);
else fail(`weakest case floor ${weakestScore}`);

console.log('=== COP-03B WORKFLOW DOMAIN DEPTH CHECK PASS ===');
