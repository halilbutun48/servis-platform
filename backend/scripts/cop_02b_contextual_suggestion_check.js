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

function mustNot(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function sliceBetween(text, startNeedle, endNeedle) {
  const start = String(text || '').indexOf(startNeedle);
  if (start < 0) return '';
  const end = String(text || '').indexOf(endNeedle, start + startNeedle.length);
  return end < 0 ? String(text || '').slice(start) : String(text || '').slice(start, end);
}

console.log('=== COP-02B CONTEXTUAL SUGGESTION CHECK ===');

const pkg = read('package.json');
const doc = read('docs/COPILOT_BAGLAMLI_ONERI_V1.md');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const goldenPackText = read('backend/src/ai/chat/goldenQuestionPack.js');
const scriptGuide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const generalReplySnippet = sliceBetween(helpComposer, '// COP-02A: program içi genel ürün rehberi fallback’i.', 'export function buildChatHelpResponse');

has('docs/COPILOT_BAGLAMLI_ONERI_V1.md');
has('backend/scripts/cop_02b_contextual_suggestion_check.js');

must(pkg, '"check:cop02b": "node backend/scripts/cop_02b_contextual_suggestion_check.js"', 'package.json exposes check:cop02b');
must(pkg, '"check:cop02a"', 'package.json preserves check:cop02a');
must(pkg, '"check:cop01e"', 'package.json preserves check:cop01e');
must(pkg, '"check:cop01d"', 'package.json preserves check:cop01d');
must(pkg, '"check:cop01c"', 'package.json preserves check:cop01c');
must(pkg, '"check:cop01b"', 'package.json preserves check:cop01b');
must(pkg, '"check:cop01a"', 'package.json preserves check:cop01a');
must(pkg, '"check:product-extensions"', 'package.json preserves check:product-extensions');
must(pkg, '"verify:final"', 'package.json preserves verify:final');
must(pkg, '"check:web-mobile"', 'package.json preserves check:web-mobile');
must(pkg, '"lint:web"', 'package.json preserves lint:web');

must(doc, 'ChatGPT gibi ama program çerçevesinde', 'doc has program frame wording');
must(doc, 'Context priority sırası', 'doc has context priority section');
must(doc, 'Takip sorusu davranışı', 'doc has follow-up section');
must(doc, 'Seçili kayıt yoksa davranış', 'doc has no-selection section');
must(doc, 'Rol / yetki / KVKK sınırı', 'doc has role boundary section');
must(doc, 'Evidence confidence wording', 'doc has evidence confidence section');
must(doc, 'Hazır soru kararı', 'doc has question bank policy section');
must(doc, 'Golden question pack ile görünür öneri çiplerinin farkı', 'doc has pack vs chips section');
must(doc, 'Context-aware suggested chips standardı', 'doc has contextual chips section');
must(doc, 'En fazla 2-4 görünür öneri kuralı', 'doc has visible suggestion count rule');
must(doc, 'COP-02B manuel kabul soruları', 'doc has manual acceptance questions section');
must(doc, 'COP-02C sonraki plan', 'doc has next plan section');
must(doc, 'Önce ilgili satırı seç.', 'doc keeps selection fallback wording');
must(doc, 'Sadece bağlama göre 2-4 kısa öneri çipi', 'doc keeps chip count wording');
must(doc, 'Golden question pack iç test ve acceptance içindir', 'doc keeps golden pack internal wording');

for (const question of [
  'peki şimdi ne yapayım',
  'neden',
  'bu kayıt niye ilerlemiyor',
  'hangi ekrana gideyim',
  'bunu kim yapabilir',
  'burada eksik ne',
  'bu uyarı önemli mi',
  'önce neyi kontrol edeyim',
  'bu işlem bende görünmüyor neden',
  'aynı kayıt için devam et',
  'neye basayım',
  'kim onaylayacak',
  'bu yüzden mi başlamıyor',
  'tamam bunu nasıl düzeltirim',
  'bende çıkmıyor',
  'burda takıldı',
  'sorun kimde',
  'bu hakediş neden hazır değil',
  'bu araç niye yok',
  'bu sözleşmeden vardiya çıkmış mı',
]) {
  must(doc, question, `doc includes question: ${question}`);
}

must(helpComposer, 'buildContextPriorityDecision', 'helpComposer keeps context priority helper');
must(helpComposer, 'resolveFollowUpContextQuestion', 'helpComposer keeps follow-up resolver');
must(helpComposer, 'buildRoleBoundaryExplanation', 'helpComposer keeps role boundary explainer');
must(helpComposer, 'buildEvidenceConfidenceWording', 'helpComposer keeps evidence confidence wording');
must(helpComposer, 'buildContextualSuggestedChips', 'helpComposer keeps contextual chips helper');
must(helpComposer, 'contextualSuggestedChips', 'helpComposer exposes contextual chips field');
must(helpComposer, 'contextPriority', 'helpComposer exposes context priority field');
must(helpComposer, 'sameRecordLikely', 'helpComposer keeps same-record signal');
must(helpComposer, 'needsSelection', 'helpComposer keeps selection-needed signal');
must(helpComposer, 'roleBoundary', 'helpComposer keeps role boundary signal');
must(helpComposer, 'Şimdi:', 'helpComposer keeps answer format heading');
must(helpComposer, 'Bu programda bunun anlamı:', 'helpComposer keeps meaning heading');
must(helpComposer, 'Neden?', 'helpComposer keeps why heading');
must(helpComposer, 'Öneri:', 'helpComposer keeps suggestion heading');
must(helpComposer, 'Sıradaki doğru işlem:', 'helpComposer keeps next-step heading');
must(helpComposer, 'slice(0, roleMode === \'SIMPLE\' ? 2 : 4)', 'helpComposer keeps 2-4 visible chip limit');
mustNot(generalReplySnippet, 'raw', 'general reply avoids raw wording');
mustNot(generalReplySnippet, 'payload', 'general reply avoids payload wording');
mustNot(generalReplySnippet, 'token', 'general reply avoids token wording');
mustNot(generalReplySnippet, 'hash', 'general reply avoids hash wording');
mustNot(generalReplySnippet, 'debug', 'general reply avoids debug wording');
mustNot(generalReplySnippet, 'driver GPS', 'general reply avoids driver GPS wording');
mustNot(generalReplySnippet, 'agreement', 'general reply avoids agreement wording');

must(copilotPanel, 'contextualSuggestedChips', 'copilot panel uses contextual chips');
must(copilotPanel, 'Takip önerileri', 'copilot panel shows follow-up chips label');
must(copilotPanel, 'contextPriority:', 'copilot panel stores context priority metadata');
must(copilotPanel, 'activeTopicLabel:', 'copilot panel stores active topic metadata');
must(copilotPanel, 'bestNextAction:', 'copilot panel stores next action metadata');
must(copilotPanel, 'sameRecordLikely:', 'copilot panel stores same-record metadata');
must(copilotPanel, 'needsSelection:', 'copilot panel stores selection-needed metadata');
mustNot(copilotPanel, 'Örnek sorular', 'copilot panel avoids long static example label');

must(goldenPackText, 'COP02B_CONTEXTUAL_FOLLOW_UPS', 'golden pack exports COP-02B follow-up examples');
for (const question of [
  'peki şimdi ne yapayım',
  'neden',
  'bu kayıt niye ilerlemiyor',
  'hangi ekrana gideyim',
  'bunu kim yapabilir',
  'burada eksik ne',
  'bu uyarı önemli mi',
  'önce neyi kontrol edeyim',
  'bu işlem bende görünmüyor neden',
  'aynı kayıt için devam et',
  'neye basayım',
  'kim onaylayacak',
  'bu yüzden mi başlamıyor',
  'tamam bunu nasıl düzeltirim',
  'bende çıkmıyor',
  'burda takıldı',
  'sorun kimde',
  'bu hakediş neden hazır değil',
  'bu araç niye yok',
  'bu sözleşmeden vardiya çıkmış mı',
]) {
  must(goldenPackText, question, `golden pack includes question: ${question}`);
}
must(goldenPackText, 'buildGoldenQuestionPack', 'golden pack helper stays present');

must(scriptGuide, 'check:cop02b', 'script guide includes check:cop02b');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 52) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

console.log('PASS COP-02B contextual suggestion check');
