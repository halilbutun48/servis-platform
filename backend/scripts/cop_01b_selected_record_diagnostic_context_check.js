import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreGoldenQuestionPack } from '../src/ai/chat/qualityScorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const file = (rel) => path.join(root, rel.replace(/\\/g, '/'));
const read = (rel) => fs.readFileSync(file(rel), 'utf8');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function has(rel) {
  if (fs.existsSync(file(rel))) ok(`${rel} exists`); else fail(`${rel} exists`);
}
function must(text, needle, label) {
  if (String(text || '').includes(needle)) ok(label); else fail(label);
}
function mustNot(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label); else fail(label);
}

console.log('=== COP-01B SELECTED RECORD DIAGNOSTIC CONTEXT CHECK ===');

const helpText = read('backend/src/ai/chat/helpComposer.js');
const packText = read('backend/src/ai/chat/goldenQuestionPack.js');
const packageText = read('package.json');

has('backend/src/ai/chat/helpComposer.js');
has('backend/src/ai/chat/goldenQuestionPack.js');
has('backend/src/ai/chat/qualityScorer.js');

const helperStart = helpText.indexOf('function composeSelectedRecordDiagnosticReply');
const cop01aStart = helpText.indexOf('// COP-01A:', helperStart >= 0 ? helperStart : 0);
const helperText = helperStart >= 0 && cop01aStart > helperStart ? helpText.slice(helperStart, cop01aStart) : '';
const resultStart = helpText.indexOf('function selectedDiagnosticResult');
const resultEnd = helperStart >= 0 && resultStart >= 0 ? helperStart : -1;
const resultText = resultStart >= 0 && resultEnd > resultStart ? helpText.slice(resultStart, resultEnd) : '';
must(helperText, 'composeSelectedRecordDiagnosticReply', 'selected diagnostic helper exists');
must(helperText, 'Bu ekrandaki veriye göre', 'selected diagnostic helper uses visible lead');
must(helperText, 'Neden?', 'selected diagnostic helper has why marker');
must(helperText, 'İlk kontrol:', 'selected diagnostic helper has first-control marker');
must(helperText, '/superadmin/operations', 'selected diagnostic helper keeps operations surface');
must(helperText, '/superadmin/commercial-core', 'selected diagnostic helper keeps commercial surface');
must(helperText, '/superadmin/trust-quality', 'selected diagnostic helper keeps quality surface');
must(helperText, '/superadmin/operation-verification', 'selected diagnostic helper keeps verification surface');
must(resultText, 'Bu ekrandaki veriye göre bu vardiya başlayamıyor.', 'selected diagnostic result keeps shift wording');
must(resultText, 'Bu ekrandaki veriye göre bu araç haritada görünmüyor.', 'selected diagnostic result keeps vehicle wording');
must(resultText, 'Bu ekrandaki veriye göre sürücünün telefon GPS’i devrede görünüyor.', 'selected diagnostic result keeps visible GPS wording');
must(resultText, 'Bu ekrandaki veriye göre bu sağlayıcı daha güçlü görünüyor.', 'selected diagnostic result keeps provider wording');
must(resultText, 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretilmiş görünüyor.', 'selected diagnostic result keeps sözleşme wording');
must(resultText, 'Bu ekrandaki veriye göre bu hakediş eksik görünüyor.', 'selected diagnostic result keeps payment wording');
must(resultText, 'Bu ekrandaki veriye göre sıradaki doğru işlem önce seçili kaydı netleştirmek.', 'selected diagnostic result keeps next-action wording');
mustNot(helperText, 'driver GPS', 'selected diagnostic helper avoids driver GPS wording');
mustNot(helperText, 'agreement', 'selected diagnostic helper avoids agreement wording');
mustNot(helperText, 'raw', 'selected diagnostic helper avoids raw wording');
mustNot(helperText, 'payload', 'selected diagnostic helper avoids payload wording');
mustNot(helperText, 'token', 'selected diagnostic helper avoids token wording');
mustNot(helperText, 'hash', 'selected diagnostic helper avoids hash wording');
mustNot(helperText, 'debug', 'selected diagnostic helper avoids debug wording');

const composeReplyCallIndex = helpText.indexOf('const selectedRecordDiagnosticReply = composeSelectedRecordDiagnosticReply');
const cop01aCallIndex = helpText.indexOf('const opsQualityPaymentReply = composeOpsQualityPaymentGuideReply');
if (composeReplyCallIndex >= 0 && cop01aCallIndex >= 0 && composeReplyCallIndex < cop01aCallIndex) ok('composeReply wires selected diagnostic helper before COP-01A'); else fail('composeReply wires selected diagnostic helper before COP-01A');

for (const needle of [
  'Bu vardiya neden başlayamıyor?',
  'Bu araç neden haritada görünmüyor?',
  'Sürücünün telefon GPS’i neden devrede?',
  'Bu sağlayıcı neden daha iyi?',
  'Sözleşmeden bugün vardiya üretildi mi?',
  'Bu hakediş neden eksik?',
  'Sıradaki doğru işlem ne?',
]) {
  must(packText, needle, `golden pack includes diagnostic marker: ${needle}`);
}

must(packageText, '"check:cop01b"', 'package.json exposes check:cop01b');
must(packageText, '"check:cop01a"', 'package.json preserves check:cop01a');
must(packageText, '"check:web-mobile"', 'package.json preserves check:web-mobile');
must(packageText, '"lint:web"', 'package.json preserves lint:web');
must(packageText, '"verify:final"', 'package.json preserves verify:final');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 34) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

console.log('PASS COP-01B selected record diagnostic context check');
