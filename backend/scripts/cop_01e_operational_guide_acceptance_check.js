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

function has(rel) {
  if (fs.existsSync(file(rel))) ok(`${rel} exists`);
  else fail(`${rel} exists`);
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function must(text, needle, label) {
  if (String(text || '').includes(needle)) ok(label);
  else fail(label);
}

console.log('=== COP-01E OPERATIONAL GUIDE ACCEPTANCE CHECK ===');

const pkg = read('package.json');
const doc = read('docs/COPILOT_OPERASYON_REHBERI_KABUL_V1.md');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const goldenPackText = read('backend/src/ai/chat/goldenQuestionPack.js');

has('docs/COPILOT_OPERASYON_REHBERI_KABUL_V1.md');
has('backend/scripts/cop_01e_operational_guide_acceptance_check.js');

must(pkg, '"check:cop01e": "node backend/scripts/cop_01e_operational_guide_acceptance_check.js"', 'package.json exposes check:cop01e');
must(pkg, '"check:cop01d"', 'package.json preserves check:cop01d');
must(pkg, '"check:cop01c"', 'package.json preserves check:cop01c');
must(pkg, '"check:cop01b"', 'package.json preserves check:cop01b');
must(pkg, '"check:cop01a"', 'package.json preserves check:cop01a');
must(pkg, '"check:web-mobile"', 'package.json preserves check:web-mobile');
must(pkg, '"lint:web"', 'package.json preserves lint:web');
must(pkg, '"verify:final"', 'package.json preserves verify:final');

must(doc, 'Copilot’un amacı', 'doc has purpose section');
must(doc, 'ChatGPT gibi ama ürün çerçevesinde çalışma kuralı', 'doc has ChatGPT-like product frame section');
must(doc, 'program çerçevesinde cevap', 'doc keeps program frame wording');
must(doc, 'sorun + neden + öneri + sıradaki adım', 'doc keeps response flow wording');
must(doc, 'emin değilse ilk kontrolü söyler', 'doc keeps uncertainty fallback wording');
must(doc, 'Sorun söyleme kuralı', 'doc has problem statement rule');
must(doc, 'Öneri verme kuralı', 'doc has suggestion rule');
must(doc, 'Belirsizlik / KVKK / yetki sınırı', 'doc has uncertainty boundary section');
must(doc, 'Yasak görünen teknik dil', 'doc has forbidden technical language section');
must(doc, 'OP/QLT/PAY 7 ana manuel kabul sorusu', 'doc has 7 acceptance questions section');
must(doc, 'COP-02 genişleme planı', 'doc has COP-02 expansion plan section');

const questions = [
  'Bu vardiya neden başlayamıyor?',
  'Bu araç neden haritada görünmüyor?',
  'Sürücünün telefon GPS’i neden devrede?',
  'Bu sağlayıcı neden daha iyi?',
  'Bu sözleşmeden bugün vardiya üretildi mi?',
  'Bu hakediş neden eksik?',
  'Sıradaki doğru işlem ne?',
];
for (const question of questions) {
  must(doc, question, `doc includes question: ${question}`);
}

must(helpComposer, 'program çerçevesinde cevap', 'helpComposer keeps program frame marker');
must(helpComposer, 'sorun + neden + öneri + sıradaki adım', 'helpComposer keeps response flow marker');
must(helpComposer, 'emin değilse ilk kontrolü söyler', 'helpComposer keeps uncertainty fallback marker');
must(helpComposer, 'composeOpsQualityPaymentGuideReply', 'helpComposer guide helper stays present');
must(helpComposer, 'composeSelectedRecordDiagnosticReply', 'helpComposer diagnostic helper stays present');
must(helpComposer, 'selectedDiagnosticTheme', 'helpComposer theme resolver stays present');
must(helpComposer, 'selectedDiagnosticSurfaceHint', 'helpComposer surface hint stays present');

must(goldenPackText, 'buildGoldenQuestionPack', 'golden pack helper stays present');
must(goldenPackText, 'superadmin-system-status-band', 'golden pack keeps system status example');
must(goldenPackText, 'superadmin-commercial-core-readiness', 'golden pack keeps commercial readiness example');
must(goldenPackText, 'superadmin-commercial-core-csv-preview', 'golden pack keeps csv preview example');
must(goldenPackText, 'superadmin-quality-score-finite', 'golden pack keeps quality score example');
must(goldenPackText, 'superadmin-proof-purpose', 'golden pack keeps proof purpose example');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 34) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

console.log('PASS COP-01E operational guide acceptance check');
