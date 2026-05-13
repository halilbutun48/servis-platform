import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

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

function must(label, cond) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function collectChipLabels(response) {
  const labels = [];
  for (const item of Array.isArray(response?.suggestedChips) ? response.suggestedChips : []) {
    if (item) labels.push(String(item));
  }
  for (const item of Array.isArray(response?.quickActions) ? response.quickActions : []) {
    if (item?.label) labels.push(String(item.label));
  }
  return Array.from(new Set(labels));
}

function makeResponse({ role, path: screenPath, message, selectedLabel = '', selectedSummary = '', selectedEntityType = '', selectedEntityId = 0 }) {
  const user = { role };
  const screenContext = {
    path: screenPath,
    selectedLabel,
    selectedSummary,
    selectedEntityType,
    selectedEntityId,
  };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext);
  const roleMode = ['DRIVER', 'PERSONEL', 'PARENT'].includes(role) ? 'SIMPLE' : 'OPERATIONS';
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    context: screenContext,
    entityLabel: screenDefinition?.label || '',
    scope: { roleMode, role },
    conversationState: {
      recentMessages: [],
      lastQuestionType: '',
      lastSelectedLabel: selectedLabel,
      lastSelectedSummary: selectedSummary,
      lastSelectedEntityType: selectedEntityType,
      lastSelectedEntityId: selectedEntityId,
    },
    screenContext,
    screenDefinition,
  });
}

console.log('=== COP-03A FIX-02 VISIBLE REPLY CHIP POLISH CHECK ===');

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'backend/scripts/run_product_extensions_check_chain.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'backend/scripts/verify_chain_01_product_extensions_check.js'), 'utf8');
const helpComposer = fs.readFileSync(path.join(root, 'backend/src/ai/chat/helpComposer.js'), 'utf8');
const intentRouter = fs.readFileSync(path.join(root, 'backend/src/ai/chat/intentRouter.js'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.roomCompany.js'), 'utf8');

must('check:cop03afix02 exists in package.json', pkg.includes('"check:cop03afix02": "node backend/scripts/cop_03a_fix_02_visible_reply_chip_polish_check.js"'));
must('package.json keeps check:cop03afix01', pkg.includes('"check:cop03afix01"'));
must('package.json keeps check:cop03a', pkg.includes('"check:cop03a"'));
must('package.json keeps check:product-extensions', pkg.includes('"check:product-extensions"'));
must('package.json keeps check:verifychain01', pkg.includes('"check:verifychain01"'));
must('package.json keeps verify:final', pkg.includes('"verify:final"'));
must('product extensions runner includes cop03afix02', runner.includes('check:cop03afix02'));
must('verify chain expects cop03afix02', verify.includes('"check:cop03afix02"'));
must('helpComposer keeps screen-purpose carry reply', helpComposer.includes('composeScreenPurposeWithCarry'));
must('helpComposer keeps selection-aware chips', helpComposer.includes('Bu ekranda seçili kayıt da var:'));
must('helpComposer keeps generic screen-purpose chip', helpComposer.includes('Bu ekranı detaylı anlat'));
must('intentRouter keeps feedback chips', intentRouter.includes('Açık kayıt var mı?'));
must('intentRouter keeps notification chips', intentRouter.includes('Okunmamış bildirim var mı?'));
must('intentRouter keeps driver chips', intentRouter.includes('Aktif sürücüler kim?'));
must('catalog keeps natural feedback copy', catalog.includes('Açık veya kritik kayıtları incele.'));
must('catalog keeps natural notifications copy', catalog.includes('Bildirimin hangi olaya bağlı olduğunu incele.'));
must('catalog keeps natural check-in copy', catalog.includes('Check-in yapılacak kayıt veya işi netle.'));

const roleScreenMatrix = [
  { role: 'SUPER_ADMIN', path: '/superadmin/commercial-core', message: 'burası ne' },
  { role: 'SUPER_ADMIN', path: '/superadmin/operations', message: 'ne yapayım' },
  { role: 'ROOM', path: '/room/drivers', message: 'bu ne' },
  { role: 'ROOM', path: '/room/commercial-flow', message: 'burası ne' },
  { role: 'ROOM', path: '/room/reports', message: 'ilk neye bakayım' },
  { role: 'COMPANY', path: '/company', message: 'burası ne' },
  { role: 'COMPANY', path: '/company/operations', message: 'ne yapayım' },
  { role: 'SCHOOL', path: '/school', message: 'bu ekran ne' },
  { role: 'SCHOOL', path: '/school/operations', message: 'burada ne yapacağım' },
  { role: 'ORGANIZATION', path: '/organization', message: 'burası ne' },
  { role: 'ORGANIZATION', path: '/organization/operations', message: 'ne yapayım' },
  { role: 'DRIVER', path: '/driver/change-pin', message: 'burası ne' },
  { role: 'PERSONEL', path: '/personel/live', message: 'bu ekran ne' },
  { role: 'PARENT', path: '/parent/live', message: 'burası ne' },
];

for (const scenario of roleScreenMatrix) {
  const response = makeResponse({ role: scenario.role, path: scenario.path, message: scenario.message });
  const reply = String(response?.reply || '');
  const chips = collectChipLabels(response);
  const normalizedReply = normalize(reply);
  must(`${scenario.role} ${scenario.path} reply exists`, normalizedReply.length > 0);
  const nowFirstPaths = ['/superadmin/operations', '/room/reports', '/company/operations', '/school/operations', '/organization/operations'];
  must(`${scenario.role} ${scenario.path} reply is screen-first`, nowFirstPaths.includes(scenario.path) ? (normalizedReply.startsWith('simdi:') || normalizedReply.startsWith('bu ekran') || normalizedReply.startsWith('bu bilgi')) : (normalizedReply.startsWith('bu ekran') || normalizedReply.startsWith('bu bilgi') || normalizedReply.startsWith('simdi: bu ekran') || normalizedReply.startsWith('simdi: bu bilgi')));
  must(`${scenario.role} ${scenario.path} reply avoids validation text`, !normalizedReply.includes('validation failed'));
  must(`${scenario.role} ${scenario.path} reply avoids generic fallback`, !normalizedReply.includes('bunu anlayamadim'));
  must(`${scenario.role} ${scenario.path} reply avoids capital after comma`, !/Bu ekran,\s+[A-ZÇĞİÖŞÜ]/.test(reply));
  must(`${scenario.role} ${scenario.path} reply avoids double punctuation`, !reply.includes('..'));
  must(`${scenario.role} ${scenario.path} no auto record chip`, !chips.some((chip) => normalize(chip).includes(normalize('Bu kayıt ne durumda?'))));
  must(`${scenario.role} ${scenario.path} includes screen explain chip`, chips.some((chip) => normalize(chip).includes(normalize('Bu ekranı detaylı anlat'))));
}

const sharedMatrix = [
  { role: 'ROOM', path: '/shared/feedback', message: 'burası ne işe yarar', expectedReply: ['Bu ekran,', 'saha geri bildirimlerini'], forbiddenReply: ['Bu ekranda seçili kayıt da var:'], expectedChips: ['Açık kayıt var mı?', 'Kritik geri bildirim var mı?', 'Sorumlu rol kim?', 'Bu ekranı detaylı anlat'] },
  { role: 'ROOM', path: '/shared/kvkk', message: 'burası ne', expectedReply: ['Bu ekran,', 'KVKK', 'Bu bilgi bu rolde görünmeyebilir'], expectedChips: ['Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?'] },
  { role: 'COMPANY', path: '/shared/notifications', message: 'bu ekran ne', expectedReply: ['Bu ekran,', 'bildirim', 'İlk bakılacak yer:'], expectedChips: ['Okunmamış bildirim var mı?', 'Bu bildirim hangi olaydan geldi?', 'İlgili kayda gitmeli miyim?'] },
  { role: 'DRIVER', path: '/shared/logs', message: 'bu ne', expectedReply: ['Bu ekran,', 'işlem kayıtları', 'İlk bakılacak yer:'], expectedChips: ['Bu ekranı detaylı anlat', 'İşlem kaydı ne demek?'] },
];

for (const scenario of sharedMatrix) {
  const response = makeResponse({ role: scenario.role, path: scenario.path, message: scenario.message });
  const reply = String(response?.reply || '');
  const chips = collectChipLabels(response);
  const normalizedReply = normalize(reply);
  must(`${scenario.role} ${scenario.path} shared reply exists`, normalizedReply.length > 0);
  must(`${scenario.role} ${scenario.path} shared reply has expected phrases`, scenario.expectedReply.every((needle) => normalizedReply.includes(normalize(needle))));
  for (const needle of scenario.forbiddenReply || []) {
    must(`${scenario.role} ${scenario.path} shared reply avoids ${needle}`, !normalizedReply.includes(normalize(needle)));
  }
  must(`${scenario.role} ${scenario.path} shared reply avoids capital after comma`, !/Bu ekran,\s+[A-ZÇĞİÖŞÜ]/.test(reply));
  must(`${scenario.role} ${scenario.path} shared reply avoids mechanical fragments`, !normalizedReply.includes('bak..') && !normalizedReply.includes('oku..') && !normalizedReply.includes('kontrol et..'));
  must(`${scenario.role} ${scenario.path} shared no auto record chip`, !chips.some((chip) => normalize(chip).includes(normalize('Bu kayıt ne durumda?'))));
  for (const chip of scenario.expectedChips) {
    must(`${scenario.role} ${scenario.path} shared chip ${chip}`, chips.some((item) => normalize(item) === normalize(chip)));
  }
}

const selectedFeedback = makeResponse({
  role: 'ROOM',
  path: '/shared/feedback',
  message: 'burası ne işe yarar',
  selectedLabel: 'Gecikme bildirimi',
  selectedSummary: 'Gecikme bildirimi: 15 dakika',
  selectedEntityType: 'feedback',
  selectedEntityId: 9004,
});
const selectedReply = String(selectedFeedback?.reply || '');
const selectedChips = collectChipLabels(selectedFeedback);
must('selected feedback reply starts with screen explanation', normalize(selectedReply).startsWith('bu ekran'));
must('selected feedback reply keeps selected record after explanation', normalize(selectedReply).includes(normalize('Bu ekranda seçili kayıt da var:')));
must('selected feedback reply does not start with selected record', !normalize(selectedReply).startsWith('gecikme bildirimi'));
must('selected feedback reply avoids capital after comma', !/Bu ekran,\s+[A-ZÇĞİÖŞÜ]/.test(selectedReply));
must('selected feedback chips include record follow-up', selectedChips.some((item) => normalize(item) === normalize('Bu kayıt ne durumda?')));
must('selected feedback chips include progress follow-up', selectedChips.some((item) => normalize(item) === normalize('Neden ilerlemiyor?')));
must('selected feedback chips include next step', selectedChips.some((item) => normalize(item) === normalize('Sıradaki adımı açıkla')));

const unknown = makeResponse({ role: 'DRIVER', path: '/unknown/polish-check', message: 'bu ne' });
const unknownReply = String(unknown?.reply || '');
const unknownChips = collectChipLabels(unknown);
must('unknown fallback is safe', normalize(unknownReply).includes(normalize('Bu ekran için detaylı rehber henüz katalogda yok')));
must('unknown fallback avoids apology fallback', !normalize(unknownReply).includes(normalize('Bunu anlayamadım')));
must('unknown fallback avoids wrong screen content', !normalize(unknownReply).includes('harita') && !normalize(unknownReply).includes('araç seç') && !normalize(unknownReply).includes('canlı takip'));
must('unknown fallback does not surface auto record chip', !unknownChips.some((chip) => normalize(chip).includes(normalize('Bu kayıt ne durumda?'))));

console.log('PASS COP-03A FIX-02 visible reply chip polish check');
