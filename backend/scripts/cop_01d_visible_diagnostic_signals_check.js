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

console.log('=== COP-01D VISIBLE DIAGNOSTIC SIGNALS CHECK ===');

const pkg = read('package.json');
const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const bubble = read('web/src/components/copilot/ChatMessageBubble.jsx');
const signalStrip = read('web/src/components/copilot/ChatDiagnosticSignals.jsx');
const cop01c = read('backend/scripts/cop_01c_real_context_bridge_check.js');
const cop01b = read('backend/scripts/cop_01b_selected_record_diagnostic_context_check.js');
const cop01a = read('backend/scripts/cop_01a_op_qlt_pay_copilot_guide_check.js');

has('web/src/components/copilot/ChatDiagnosticSignals.jsx');
has('web/src/components/copilot/ChatMessageBubble.jsx');
has('web/src/panels/shared/CopilotPanel.jsx');
has('backend/scripts/cop_01d_visible_diagnostic_signals_check.js');

must(pkg, '"check:cop01d": "node backend/scripts/cop_01d_visible_diagnostic_signals_check.js"', 'package.json exposes check:cop01d');
must(pkg, '"check:cop01c"', 'package.json preserves check:cop01c');
must(pkg, '"check:cop01b"', 'package.json preserves check:cop01b');
must(pkg, '"check:cop01a"', 'package.json preserves check:cop01a');
must(pkg, '"check:web-mobile"', 'package.json preserves check:web-mobile');
must(pkg, '"lint:web"', 'package.json preserves lint:web');
must(pkg, '"verify:final"', 'package.json preserves verify:final');

must(copilotPanel, 'diagnosticSignals:', 'copilot panel stores diagnostic signals metadata');
must(copilotPanel, 'diagnosticSignalSummary:', 'copilot panel stores diagnostic signal summary metadata');
must(copilotPanel, 'diagnosticSignalsVisible:', 'copilot panel marks diagnostic signals visibility');
must(bubble, 'ChatDiagnosticSignals', 'chat bubble imports diagnostic signal strip');
must(bubble, 'diagnosticSignalsVisible', 'chat bubble checks signal visibility');
must(bubble, 'diagnosticSignals', 'chat bubble renders diagnostic signals');

must(signalStrip, 'Ekrandan gelen sinyaller', 'signal strip has visible title');
must(signalStrip, 'Bu cevap ekran verisine dayanıyor.', 'signal strip has visible explanatory line');
must(signalStrip, 'Bu cevap ekran verisine dayanıyor.', 'signal strip has evidence wording');
must(signalStrip, 'Operasyon kanıtı var', 'signal strip keeps operation proof chip');
must(signalStrip, 'GPS görünürlüğü kontrol edildi', 'signal strip keeps GPS visibility chip');
must(signalStrip, 'Sürücünün telefon GPS’i devrede', 'signal strip keeps driver phone GPS chip');
must(signalStrip, 'Kalite sinyali var', 'signal strip keeps quality chip');
must(signalStrip, 'Hakediş eksik bilgi içeriyor', 'signal strip keeps payment missing-info chip');
must(signalStrip, 'Ödeme hesabı eksik', 'signal strip keeps payment account chip');
must(signalStrip, 'Sözleşme/vardiya üretimi kontrol edildi', 'signal strip keeps contract-shift chip');
must(signalStrip, 'Bu ekranda ek kanıt sinyali yok', 'signal strip keeps empty state');
mustNot(signalStrip, 'raw', 'signal strip avoids raw wording');
mustNot(signalStrip, 'payload', 'signal strip avoids payload wording');
mustNot(signalStrip, 'token', 'signal strip avoids token wording');
mustNot(signalStrip, 'hash', 'signal strip avoids hash wording');
mustNot(signalStrip, 'debug', 'signal strip avoids debug wording');
mustNot(signalStrip, 'driver GPS', 'signal strip avoids driver GPS wording');
mustNot(signalStrip, 'agreement', 'signal strip avoids agreement wording');

must(cop01c, 'selectedSignalRows', 'COP-01C bridge stays present');
must(cop01c, 'selectedSignalReply', 'COP-01C signal reply stays present');
must(cop01b, 'composeSelectedRecordDiagnosticReply', 'COP-01B diagnostic helper stays present');
must(cop01a, 'composeOpsQualityPaymentGuideReply', 'COP-01A guide helper stays present');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 34) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

console.log('PASS COP-01D visible diagnostic signals check');
