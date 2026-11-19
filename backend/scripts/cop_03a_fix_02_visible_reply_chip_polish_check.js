import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { assertProductExtensionsIncludes, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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

function makeCanonicalResponse({ role = 'ROOM', path: screenPath, message, structuredFacts = null }) {
  const user = { role, companyId: 1, roomId: role === 'ROOM' ? 1 : undefined };
  const screenContext = {
    path: screenPath,
    label: screenPath === '/shared/kvkk' ? 'KVKK' : 'ROOM surface',
    role,
    ...(structuredFacts ? { structuredFacts } : {}),
  };
  const canonical = resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity: null,
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
    screenContext,
    interpreterMode: 'DETERMINISTIC',
  });
  const semanticPlan = resolveSemanticIntent({
    message,
    user,
    selectedEntity: null,
    conversationState: null,
    screenContext,
    canonicalRequest: canonical.request,
  });
  semanticPlan.canonicalRequest = canonical.request;
  semanticPlan.canonicalRequestEnvelope = canonical;
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    context: screenContext,
    entityLabel: screenContext.label,
    scope: { roleMode: 'OPERATIONS', role },
    conversationState: null,
    semanticPlan,
    screenContext,
    screenDefinition: getScreenDefinitionForUser(user, screenContext),
  });
}

console.log('=== COP-03A FIX-02 VISIBLE REPLY CHIP POLISH CHECK ===');

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const helpComposer = fs.readFileSync(path.join(root, 'backend/src/ai/chat/helpComposer.js'), 'utf8');
const intentRouter = fs.readFileSync(path.join(root, 'backend/src/ai/chat/intentRouter.js'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.roomCompany.js'), 'utf8');
const roomCommercialFlow = fs.readFileSync(path.join(root, 'web/src/panels/room/CommercialFlowPanel.jsx'), 'utf8');
const floatingCopilotDrawer = fs.readFileSync(path.join(root, 'web/src/components/copilot/FloatingCopilotDrawer.jsx'), 'utf8');
const registryScripts = productExtensionsChecks.map((step) => step.script);

must('check:cop03afix02 exists in package.json', pkg.includes('"check:cop03afix02": "node backend/scripts/cop_03a_fix_02_visible_reply_chip_polish_check.js"'));
must('package.json keeps check:cop03afix01', pkg.includes('"check:cop03afix01"'));
must('package.json keeps check:cop03a', pkg.includes('"check:cop03a"'));
must('package.json keeps check:product-extensions', pkg.includes('"check:product-extensions"'));
must('package.json keeps check:verifychain01', pkg.includes('"check:verifychain01"'));
must('package.json keeps verify:final', pkg.includes('"verify:final"'));
assertProductExtensionsIncludes('check:cop03afix02', 'product extensions registry references cop03afix02', registryScripts);
assertProductExtensionsIncludes('check:cop03afix02', 'verify chain registry exposes cop03afix02', registryScripts);
must('helpComposer keeps screen-purpose carry reply', helpComposer.includes('composeScreenPurposeWithCarry'));
must('helpComposer keeps selection-aware chips', helpComposer.includes('Bu ekranda seçili kayıt da var:'));
must('helpComposer keeps generic screen-purpose chip', helpComposer.includes('Bu ekranı detaylı anlat'));
must('intentRouter keeps feedback chips', intentRouter.includes('Açık kayıt var mı?'));
must('intentRouter keeps notification chips', intentRouter.includes('Bildirim kaynağını göster'));
must('intentRouter keeps driver chips', intentRouter.includes('Aktif sürücüler kim?'));
must('catalog keeps natural feedback copy', catalog.includes('Açık veya kritik kayıtları incele.'));
must('catalog keeps natural notifications copy', catalog.includes('Bildirimin hangi olaya bağlı olduğunu incele.'));
must('catalog keeps natural check-in copy', catalog.includes('Check-in yapılacak kayıt veya işi netle.'));
must('room commercial flow maps internal negotiation label', roomCommercialFlow.includes('pazarlik: "Pazarlık"'));
must('room commercial flow maps requested status label', roomCommercialFlow.includes('requested: "Bekliyor"'));
must('room commercial flow maps open status label', roomCommercialFlow.includes('open: "Açık"'));
must('room commercial flow maps separate agreement label', roomCommercialFlow.includes('"sozlesme (ayri akis)": "Sözleşme"'));
must('room commercial flow renders action labels through visible mapper', roomCommercialFlow.includes('commercialFlowVisibleLabel(item.actionLabel || actionLabel)'));
must('copilot drawer protects commercial workspace actions', floatingCopilotDrawer.includes('.roomCommercialWorkspaceFull button'));
must('copilot drawer considers centered safe placement', floatingCopilotDrawer.includes('Math.round((viewportWidth - width) / 2)'));
must('copilot drawer compacts short desktop viewports', floatingCopilotDrawer.includes('compactDesktopDrawer'));

const kvkkAccessFacts = {
  screenType: 'KVKK',
  kvkkAccess: { requiredCount: 0, acceptedCount: 0, blocking: false },
};
for (const message of ['Erişim neden kapalı?', 'Bu KVKK görünürlüğü neden kısıtlı?']) {
  const response = makeCanonicalResponse({
    path: '/shared/kvkk',
    message,
    structuredFacts: kvkkAccessFacts,
  });
  const reply = normalize(response?.reply || '');
  must(`KVKK access explanation is grounded for ${message}`, reply.includes(normalize('KVKK erişimi kapalı görünmüyor')));
  must(`KVKK access explanation avoids generic root-cause fallback for ${message}`, !reply.includes(normalize('kesin sebebi veriyle doğrulamak gerekir')));
}
const kvkkOutsideResponse = makeCanonicalResponse({
  path: '/room/shifts',
  message: 'Erişim neden kapalı?',
});
must('KVKK access explanation does not leak onto non-KVKK surfaces', !normalize(kvkkOutsideResponse?.reply || '').includes(normalize('KVKK erişimi kapalı görünmüyor')));

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
  const naturalOpeners = [
    'simdi:',
    'sıradaki doğru işlem:',
    'bu ekran',
    'bu bilgi',
    'bu kayıt',
    'bekleyen işleri',
    'açık veya riskli',
  ];
  const currentRoomSemanticContext = {
    '/room/drivers': 'SEMANTIC_MULTI_DOMAIN_SUMMARY',
    '/room/reports': 'SEMANTIC_PRIORITY',
  };
  const expectedRoomSemanticType = scenario.role === 'ROOM' ? currentRoomSemanticContext[scenario.path] : '';
  must(
    `${scenario.role} ${scenario.path} reply follows the current screen or semantic contract`,
    expectedRoomSemanticType
      ? response.questionType === expectedRoomSemanticType && normalizedReply.startsWith(normalize('Taşımacılık Firması açısından:'))
      : naturalOpeners.some((prefix) => normalizedReply.startsWith(normalize(prefix))),
  );
  must(`${scenario.role} ${scenario.path} reply avoids validation text`, !normalizedReply.includes('validation failed'));
  must(`${scenario.role} ${scenario.path} reply avoids generic fallback`, !normalizedReply.includes('bunu anlayamadim'));
  must(`${scenario.role} ${scenario.path} reply avoids capital after comma`, !/Bu ekran,\s+[A-ZÇĞİÖŞÜ]/.test(reply));
  must(`${scenario.role} ${scenario.path} reply avoids double punctuation`, !reply.includes('..'));
  must(`${scenario.role} ${scenario.path} no auto record chip`, !chips.some((chip) => normalize(chip).includes(normalize('Bu kayıt ne durumda?'))));
  const requiresScreenExplainChip = !['/superadmin/commercial-core', '/superadmin/operations', '/room/drivers', '/room/commercial-flow', '/room/reports', '/company/operations', '/school/operations', '/organization/operations', '/parent/live'].includes(scenario.path);
  must(`${scenario.role} ${scenario.path} includes screen explain chip`, requiresScreenExplainChip ? chips.some((chip) => normalize(chip).includes(normalize('Bu ekranı detaylı anlat'))) : true);
}

const sharedMatrix = [
  { role: 'ROOM', path: '/shared/feedback', message: 'burası ne işe yarar', expectedReply: ['Bu ekran,', 'saha geri bildirimlerini'], forbiddenReply: ['Bu ekranda seçili kayıt da var:'], expectedChips: ['Bu ekranı detaylı anlat', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster'] },
  { role: 'ROOM', path: '/shared/kvkk', message: 'burası ne', expectedReply: ['Bu ekran,', 'KVKK', 'Bu bilgi bu rolde görünmeyebilir'], expectedChips: ['Bu ekranı detaylı anlat', 'KVKK sınırını açıkla', 'Bu rolde ne görünür?', 'Erişim neden kapalı?'] },
  { role: 'COMPANY', path: '/shared/notifications', message: 'bu ekran ne', expectedReply: ['Bu ekranın ana işi takip etmektir', 'vardiyaları', 'takip sekmesini seç'], expectedChips: ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Sıradaki doğru işlem ne?', 'Sıradaki adımı açıkla'] },
  { role: 'DRIVER', path: '/shared/logs', message: 'bu ne', expectedReply: ['Log Dışa Aktarımı ekranı:', 'işlem kayıtlarını', 'hangi kaydı aradığını netleştir'], expectedChips: ['Bu ekranı detaylı anlat', 'İşlem kaydını aç'] },
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
  const normalizedReplyWithoutTerminalTruncation = normalize(reply.replace(/…$/u, ''));
  must(`${scenario.role} ${scenario.path} shared reply avoids mechanical fragments`, !normalizedReplyWithoutTerminalTruncation.includes('bak..') && !normalizedReplyWithoutTerminalTruncation.includes('oku..') && !normalizedReplyWithoutTerminalTruncation.includes('kontrol et..'));
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
must('selected feedback reply keeps first-step guidance', normalize(selectedReply).includes(normalize('İlk bakılacak yer:')) || normalize(selectedReply).includes(normalize('Açık veya kritik kayıtları')));
must('selected feedback reply does not start with selected record', !normalize(selectedReply).startsWith('gecikme bildirimi'));
must('selected feedback reply avoids capital after comma', !/Bu ekran,\s+[A-ZÇĞİÖŞÜ]/.test(selectedReply));
must('selected feedback chips include open selected record', selectedChips.some((item) => normalize(item) === normalize('Seçili kaydı aç')));
must('selected feedback chips include start time check', selectedChips.some((item) => normalize(item) === normalize('Başlatma zamanını kontrol et')));
must('selected feedback chips include missing data', selectedChips.some((item) => normalize(item) === normalize('Eksik veriyi göster')));
must('selected feedback chips include role boundary', selectedChips.some((item) => normalize(item) === normalize('Yetki sınırını açıkla')));

const unknown = makeResponse({ role: 'DRIVER', path: '/unknown/polish-check', message: 'bu ne' });
const unknownReply = String(unknown?.reply || '');
const unknownChips = collectChipLabels(unknown);
must(
  'unknown fallback is safe',
  normalize(unknownReply).includes(normalize('Bu ekranda önce seçili kayıt ve boş alanlar okunmalı'))
    && normalize(unknownReply).includes(normalize('Bu ekran, doğru ekranı seçmen gerekiyor')),
);
must('unknown fallback avoids apology fallback', !normalize(unknownReply).includes(normalize('Bunu anlayamadım')));
must('unknown fallback avoids wrong screen content', !normalize(unknownReply).includes('harita') && !normalize(unknownReply).includes('araç seç') && !normalize(unknownReply).includes('canlı takip'));
must('unknown fallback does not surface auto record chip', !unknownChips.some((chip) => normalize(chip).includes(normalize('Bu kayıt ne durumda?'))));

console.log('PASS COP-03A FIX-02 visible reply chip polish check');
