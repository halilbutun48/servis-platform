import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreGoldenQuestionPack } from '../src/ai/chat/qualityScorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function file(rel) {
  return path.join(root, rel.replace(/\\/g, '/'));
}

function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function has(rel) {
  if (fs.existsSync(file(rel))) ok(`${rel} exists`);
  else fail(`${rel} exists`);
}

function must(text, needle, label) {
  if (String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function sliceBetween(text, start, end) {
  const from = String(text || '').indexOf(start);
  if (from < 0) return '';
  const to = end ? String(text || '').indexOf(end, from + start.length) : -1;
  return to > from ? String(text).slice(from, to) : String(text).slice(from);
}

console.log('=== COP-01C REAL CONTEXT BRIDGE CHECK ===');

const pkg = read('package.json');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const selectedRuntime = read('backend/src/ai/chat/helpComposerSelectedRuntime.js');
const copilotFacts = read('web/src/utils/copilotFacts.js');
const operationsPanel = read('web/src/panels/superadmin/OperationsPanel.jsx');
const trustQualityPanel = read('web/src/panels/superadmin/TrustQualityPanel.jsx');
const commercialPanel = read('web/src/panels/superadmin/CommercialCorePanel.jsx');
const serviceEvaluationPanel = read('web/src/panels/company/ServiceEvaluationPanel.jsx');
const screenRegistry = read('web/src/copilot/screenRegistry.js');
const apiText = read('web/src/api.js');

has('backend/src/ai/chat/helpComposer.js');
has('backend/src/ai/chat/helpComposerSelectedRuntime.js');
has('web/src/utils/copilotFacts.js');
has('web/src/panels/superadmin/OperationsPanel.jsx');
has('web/src/panels/superadmin/TrustQualityPanel.jsx');
has('web/src/panels/superadmin/CommercialCorePanel.jsx');
has('web/src/panels/company/ServiceEvaluationPanel.jsx');

must(pkg, '"check:cop01c": "node backend/scripts/cop_01c_real_context_bridge_check.js"', 'package.json exposes check:cop01c');
must(pkg, '"check:cop01b"', 'package.json preserves check:cop01b');
must(pkg, '"check:cop01a"', 'package.json preserves check:cop01a');
must(pkg, '"check:web-mobile"', 'package.json preserves check:web-mobile');
must(pkg, '"lint:web"', 'package.json preserves lint:web');
must(pkg, '"verify:final"', 'package.json preserves verify:final');

must(selectedRuntime, 'selectedSignalRows', 'selected runtime helper keeps signal rows');
must(selectedRuntime, 'selectedSignalReply', 'selected runtime helper keeps signal reply');

const selectedRuntimeBlock = sliceBetween(helpComposer, 'const { selectedFieldRows', 'function buildSelectedDiagnosticBridgeContext');
const selectedBridgeBlock = sliceBetween(helpComposer, 'function buildSelectedDiagnosticBridgeContext', 'const { vehicleReadinessReply');
const guideBlock = sliceBetween(helpComposer, 'function composeOpsQualityPaymentGuideReply', 'function normalizeEverydayQuestion');

must(selectedRuntimeBlock, 'selectedSignalRows', 'selected diagnostic context checks signal rows');
must(selectedRuntimeBlock, 'selectedSignalReply', 'selected diagnostic context wires signal reply');
must(selectedBridgeBlock, 'copilotSummary', 'selected carry summary reads copilot summary');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre', 'selected diagnostic reply keeps visible lead');
must(selectedBridgeBlock, 'Neden?', 'selected diagnostic reply keeps why marker');
must(selectedBridgeBlock, 'İlk kontrol:', 'selected diagnostic reply keeps first-control marker');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre bu vardiya başlayamıyor.', 'selected diagnostic reply keeps shift wording');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre bu araç haritada görünmüyor.', 'selected diagnostic reply keeps vehicle wording');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre sürücünün telefon GPS’i devrede görünüyor.', 'selected diagnostic reply keeps GPS wording');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre bu sağlayıcı daha güçlü görünüyor.', 'selected diagnostic reply keeps provider wording');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretilmiş görünüyor.', 'selected diagnostic reply keeps sözleşme wording');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre bu hakediş eksik görünüyor.', 'selected diagnostic reply keeps payment wording');
must(selectedBridgeBlock, 'Bu ekrandaki veriye göre sıradaki doğru işlem önce seçili kaydı netleştirmek.', 'selected diagnostic reply keeps next-action wording');
mustNot(selectedBridgeBlock, 'raw', 'selected diagnostic reply avoids raw wording');
mustNot(selectedBridgeBlock, 'payload', 'selected diagnostic reply avoids payload wording');
mustNot(selectedBridgeBlock, 'token', 'selected diagnostic reply avoids token wording');
mustNot(selectedBridgeBlock, 'hash', 'selected diagnostic reply avoids hash wording');
mustNot(selectedBridgeBlock, 'debug', 'selected diagnostic reply avoids debug wording');
mustNot(selectedBridgeBlock, 'driver GPS', 'selected diagnostic reply avoids driver GPS wording');
mustNot(selectedBridgeBlock, 'agreement', 'selected diagnostic reply avoids agreement wording');

must(guideBlock, 'İlk bakılacak yer: Sistem durumu bandı.', 'guide keeps system status marker');
must(guideBlock, 'İlk bakılacak yer: Ticari akış özeti.', 'guide keeps commercial flow marker');
must(guideBlock, 'İlk bakılacak yer: Kalite akış özeti.', 'guide keeps quality flow marker');
must(guideBlock, 'İlk bakılacak yer: Servis Kanıtı kartı.', 'guide keeps proof marker');
must(guideBlock, 'Bu ekran ödeme başlatmaz.', 'guide keeps non-final payment wording');
must(guideBlock, 'Ödeme, settlement ve komisyon kapalıdır.', 'guide keeps closed payment wording');
must(guideBlock, 'Bu bilgi kesin kalite puanı değildir.', 'guide keeps non-final quality wording');
must(guideBlock, 'Sağlayıcı sıralaması değildir.', 'guide keeps no-ranking wording');
must(guideBlock, 'Hakediş veya komisyon hesabını etkilemez.', 'guide keeps no-impact wording');
must(guideBlock, 'Servis Kanıtı operasyon görünürlüğü sağlar.', 'guide keeps proof visibility wording');

const operationsEffect = sliceBetween(operationsPanel, 'useEffect(() => {', 'if (me?.role !== "SUPER_ADMIN")');
const commercialEffect = sliceBetween(commercialPanel, 'const facts = buildCommercialCoreCopilotFacts', 'return (');

must(operationsPanel, 'buildOperationsCopilotFacts', 'operations panel imports operations copilot facts');
must(operationsPanel, 'getOperationProofSummary', 'operations panel reads operation proof summary');
must(operationsEffect, 'operationProofSummary', 'operations panel context carries operation proof summary');
must(operationsEffect, 'facts?.copilotSummary', 'operations panel sends copilot summary');
must(operationsEffect, 'GPS görünürlüğü', 'operations panel exposes GPS visibility field');
must(operationsEffect, 'Servis kanıtı', 'operations panel exposes service proof field');
must(operationsEffect, 'auditCount', 'operations panel exposes audit counter');
must(operationsEffect, 'clearCopilotSelection', 'operations panel can clear copilot selection');
must(operationsEffect, 'setCopilotSelection', 'operations panel sets copilot selection');

must(trustQualityPanel, 'buildTrustQualityCopilotFacts', 'trust quality panel imports trust copilot facts');
must(trustQualityPanel, 'getQualityProofSignalSummary', 'trust quality panel reads proof signal summary');
must(trustQualityPanel, 'getQualityDraftScoreSummary', 'trust quality panel reads draft score summary');
must(trustQualityPanel, 'getQualityReviewDecisionSummary', 'trust quality panel reads review decision summary');
must(trustQualityPanel, 'getQualityReviewDecisionHistory', 'trust quality panel reads review history summary');
must(trustQualityPanel, 'Kanıt', 'trust quality panel exposes proof field');
must(trustQualityPanel, 'Taslak Skor', 'trust quality panel exposes draft score field');
must(trustQualityPanel, 'İnceleme', 'trust quality panel exposes review decision field');
must(trustQualityPanel, 'Geçmiş', 'trust quality panel exposes history field');
must(trustQualityPanel, 'Sağlayıcı Sinyali', 'trust quality panel keeps provider signal field');
must(trustQualityPanel, 'qualityFacts?.copilotSummary', 'trust quality panel sends copilot summary');
must(trustQualityPanel, 'clearCopilotSelection', 'trust quality panel can clear copilot selection');
must(trustQualityPanel, 'setCopilotSelection', 'trust quality panel sets copilot selection');

must(commercialPanel, 'buildCommercialCoreCopilotFacts', 'commercial panel imports commercial copilot facts');
must(commercialPanel, 'getPaymentBackboneReadinessPreview', 'commercial panel reads payment preview summary');
must(commercialPanel, 'getOperationProofSummary', 'commercial panel reads operation proof summary');
must(commercialEffect, 'Hakediş önizleme', 'commercial panel exposes payment preview field');
must(commercialEffect, 'Eksik bilgi', 'commercial panel exposes missing info field');
must(commercialEffect, 'Kontrol gerekli', 'commercial panel exposes review-needed field');
must(commercialEffect, 'Komisyon', 'commercial panel exposes commission field');
must(commercialEffect, 'Ödeme hesabı', 'commercial panel exposes payment account field');
must(commercialEffect, 'Sözleşme / vardiya', 'commercial panel exposes contract shift field');
must(commercialEffect, 'facts?.copilotSummary', 'commercial panel sends copilot summary');
must(commercialEffect, 'clearCopilotSelection', 'commercial panel can clear copilot selection');
must(commercialEffect, 'setCopilotSelection', 'commercial panel sets copilot selection');

must(serviceEvaluationPanel, 'buildServiceEvaluationFacts', 'service evaluation panel keeps service evaluation facts');
must(serviceEvaluationPanel, 'Sözleşmeleri aç', 'service evaluation facts keep sözleşme wording');
must(serviceEvaluationPanel, 'setCopilotSelection', 'service evaluation panel keeps copilot selection');
must(serviceEvaluationPanel, 'clearCopilotSelection', 'service evaluation panel clears copilot selection');

must(screenRegistry, '/superadmin/operations', 'screen registry keeps operations context');
must(screenRegistry, '/superadmin/commercial-core', 'screen registry keeps commercial context');
must(screenRegistry, '/superadmin/trust-quality', 'screen registry keeps quality context');

must(apiText, 'getOperationProofSummary', 'api keeps operation proof summary helper');
must(apiText, 'getQualityProofSignalSummary', 'api keeps quality proof summary helper');
must(apiText, 'getQualityDraftScoreSummary', 'api keeps draft score summary helper');
must(apiText, 'getQualityReviewDecisionSummary', 'api keeps review decision summary helper');
must(apiText, 'getQualityReviewDecisionHistory', 'api keeps review history helper');
must(apiText, 'getPaymentBackboneReadinessPreview', 'api keeps payment preview helper');

must(copilotFacts, 'buildOperationsCopilotFacts', 'copilot facts keeps operations bridge');
must(copilotFacts, 'operationProof', 'copilot facts keeps operation proof signal');
must(copilotFacts, 'gpsSourceVisibility', 'copilot facts keeps gps source visibility signal');
must(copilotFacts, 'audit/notification/event', 'copilot facts keeps audit/notification/event signal');
must(copilotFacts, 'buildTrustQualityCopilotFacts', 'copilot facts keeps quality bridge');
must(copilotFacts, 'qualitySignal', 'copilot facts keeps quality signal');
must(copilotFacts, 'reviewDecision', 'copilot facts keeps review decision signal');
must(copilotFacts, 'reviewHistory', 'copilot facts keeps review history signal');
must(copilotFacts, 'providerComparison', 'copilot facts keeps provider comparison signal');
must(copilotFacts, 'buildCommercialCoreCopilotFacts', 'copilot facts keeps commercial bridge');
must(copilotFacts, 'paymentPreviewStatus', 'copilot facts keeps payment preview status signal');
must(copilotFacts, 'paymentPreviewMissingInfo', 'copilot facts keeps missing info signal');
must(copilotFacts, 'commissionStatus', 'copilot facts keeps commission status signal');
must(copilotFacts, 'paymentAccountStatus', 'copilot facts keeps payment account signal');
must(copilotFacts, 'contractShiftGeneration', 'copilot facts keeps contract shift generation signal');
must(copilotFacts, 'buildServiceEvaluationFacts', 'copilot facts keeps service evaluation helper');
must(copilotFacts, 'copilotSignals', 'copilot facts keeps copilot signals array');
must(copilotFacts, 'copilotSummary', 'copilot facts keeps copilot summary');
must(copilotFacts, 'Sözleşme / vardiya', 'copilot facts keeps sözleşme / vardiya wording');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 34) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

console.log('PASS COP-01C real context bridge check');
