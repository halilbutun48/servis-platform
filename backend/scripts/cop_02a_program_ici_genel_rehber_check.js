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

console.log('=== COP-02A PROGRAM ICI GENEL REHBER CHECK ===');

const pkg = read('package.json');
const doc = read('docs/COPILOT_PROGRAM_ICI_GENEL_REHBER_V1.md');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const goldenPackText = read('backend/src/ai/chat/goldenQuestionPack.js');
const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');

has('docs/COPILOT_PROGRAM_ICI_GENEL_REHBER_V1.md');
has('backend/scripts/cop_02a_program_ici_genel_rehber_check.js');

must(pkg, '"check:cop02a": "node backend/scripts/cop_02a_program_ici_genel_rehber_check.js"', 'package.json exposes check:cop02a');
must(pkg, '"check:cop01e"', 'package.json preserves check:cop01e');
must(pkg, '"check:cop01d"', 'package.json preserves check:cop01d');
must(pkg, '"check:cop01c"', 'package.json preserves check:cop01c');
must(pkg, '"check:cop01b"', 'package.json preserves check:cop01b');
must(pkg, '"check:cop01a"', 'package.json preserves check:cop01a');
must(pkg, '"check:web-mobile"', 'package.json preserves check:web-mobile');
must(pkg, '"lint:web"', 'package.json preserves lint:web');
must(pkg, '"verify:final"', 'package.json preserves verify:final');

must(doc, 'Copilot\'un amacı', 'doc has purpose section');
must(doc, 'ChatGPT gibi ama program içinde çalışma kuralı', 'doc has program-internal ChatGPT rule');
must(doc, 'Rol bazlı cevap sınırı', 'doc has role boundary section');
must(doc, 'Genel Soru Cevap Formatı', 'doc has answer format section');
must(doc, 'Belirsiz Soru Davranışı', 'doc has uncertainty behavior section');
must(doc, 'Yetki / KVKK Davranışı', 'doc has KVKK behavior section');
must(doc, 'COP-02A Manuel Kabul Soruları', 'doc has manual acceptance questions section');
must(doc, 'COP-02B İçin Sonraki Plan', 'doc has COP-02B plan section');
must(doc, 'Şimdi: kısa sonuç', 'doc keeps answer format wording');
must(doc, 'Bu programda bunun anlamı:', 'doc keeps program meaning wording');
must(doc, 'Neden? kısa gerekçe', 'doc keeps why wording');
must(doc, 'Öneri: güvenli öneri', 'doc keeps suggestion wording');
must(doc, 'Sıradaki doğru işlem: bir sonraki adım', 'doc keeps next step wording');

const questions = [
  'Bu ekranda ne yapmalıyım?',
  'Burada ne eksik?',
  'Bu kayıt neden ilerlemiyor?',
  'Hangi ekrana gitmeliyim?',
  'Bu kullanıcı ne yapabilir?',
  'Konum neden görünmüyor?',
  'Sözleşme ile vardiya ilişkisi ne?',
  'Hakediş tarafında ne kontrol etmeliyim?',
  'Kalite puanı kesin karar mı?',
  'KVKK yüzünden bunu göremiyor olabilir miyim?',
  'Mobilde bu iş nereden yapılır?',
  'Sıradaki doğru işlem ne?',
];
for (const question of questions) {
  must(doc, question, `doc includes question: ${question}`);
}

for (const role of ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT']) {
  must(doc, role, `doc includes role: ${role}`);
}

for (const topic of [
  'operasyon',
  'vardiya',
  'rota / durak',
  'sözleşme',
  'teklif / ticari akış',
  'hakediş / ödeme önizleme',
  'kalite / güven',
  'servis kanıtı',
  'bildirim',
  'kullanıcı kodu / PIN',
  'KVKK / yetki sınırı',
  'mobil kullanım',
  'harita / GPS / sürücünün telefon GPS’i',
  'saha kabul / checklist',
]) {
  must(doc, topic, `doc includes topic family: ${topic}`);
}

must(helpComposer, 'composeGeneralProductGuideReply', 'helpComposer keeps general guide helper');
must(helpComposer, 'program çerçevesinde cevap', 'helpComposer keeps program frame marker');
must(helpComposer, 'sorun + neden + öneri + sıradaki adım', 'helpComposer keeps response flow marker');
must(helpComposer, 'emin değilse ilk kontrolü söyler', 'helpComposer keeps uncertainty fallback marker');

const generalReplySnippet = sliceBetween(helpComposer, '// COP-02A: program içi genel ürün rehberi fallback’i.', 'export function buildChatHelpResponse');
must(generalReplySnippet, 'Şimdi:', 'general reply has now lead');
must(generalReplySnippet, 'Bu programda bunun anlamı:', 'general reply has program meaning lead');
must(generalReplySnippet, 'Neden?', 'general reply has why lead');
must(generalReplySnippet, 'Öneri:', 'general reply has suggestion lead');
must(generalReplySnippet, 'Sıradaki doğru işlem:', 'general reply has next step lead');
mustNot(generalReplySnippet, 'raw', 'general reply avoids raw wording');
mustNot(generalReplySnippet, 'payload', 'general reply avoids payload wording');
mustNot(generalReplySnippet, 'token', 'general reply avoids token wording');
mustNot(generalReplySnippet, 'hash', 'general reply avoids hash wording');
mustNot(generalReplySnippet, 'debug', 'general reply avoids debug wording');
mustNot(generalReplySnippet, 'driver GPS', 'general reply avoids driver GPS wording');
mustNot(generalReplySnippet, 'agreement', 'general reply avoids agreement wording');

must(intentRouter, 'bu kullanıcı ne yapabilir', 'intent router covers role capability');
must(intentRouter, 'sözleşme ile vardiya ilişkisi ne', 'intent router covers contract-shift relation');
must(intentRouter, 'hakediş tarafında ne kontrol etmeliyim', 'intent router covers payment readiness');
must(intentRouter, 'sürücünün telefon gps’i neden devrede', 'intent router covers driver phone GPS');
must(intentRouter, 'hangi ekrana gitmeliyim', 'intent router covers next screen');
must(intentRouter, 'saha kabul', 'intent router covers field acceptance');
must(intentRouter, 'checklist', 'intent router covers checklist');

for (const role of ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT']) {
  must(screenCatalog, role, `screen catalog includes role: ${role}`);
}

must(goldenPackText, 'buildGoldenQuestionPack', 'golden pack helper stays present');
must(goldenPackText, 'superadmin-main-what-to-do', 'golden pack keeps general main screen example');
must(goldenPackText, 'room-operation-missing', 'golden pack keeps missing data example');
must(goldenPackText, 'company-commercial-stuck', 'golden pack keeps commercial stuck example');
must(goldenPackText, 'superadmin-next-screen-general', 'golden pack keeps next screen example');
must(goldenPackText, 'superadmin-user-capability', 'golden pack keeps user capability example');
must(goldenPackText, 'driver-map-gps', 'golden pack keeps GPS example');
must(goldenPackText, 'organization-shift-contract', 'golden pack keeps contract-shift example');
must(goldenPackText, 'company-payment-readiness', 'golden pack keeps payment readiness example');
must(goldenPackText, 'superadmin-quality-finite', 'golden pack keeps quality finite example');
must(goldenPackText, 'school-kvkk-boundary', 'golden pack keeps KVKK boundary example');
must(goldenPackText, 'personel-mobile-route', 'golden pack keeps mobile route example');
must(goldenPackText, 'parent-next-step-general', 'golden pack keeps next step example');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 34) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

console.log('PASS COP-02A program içi genel rehber check');
