#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNotRaw(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function mustAny(text, needles, label) {
  const haystack = normalize(text);
  if ((Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustArrayContains(arr, needle, label) {
  if (Array.isArray(arr) && arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustArrayNotContains(arr, needle, label) {
  if (!Array.isArray(arr) || !arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

console.log('=== COP-04B-FIX-02 COMPANY COMMERCIAL CONTEXT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const schemasSource = read('backend/src/ai/schemas.js');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
const answerPolicySource = read('backend/src/ai/chat/answerQualityPolicy.js');
const factsSource = read('web/src/utils/copilotFacts.js');
const agreementFactsSource = read('web/src/utils/agreementCopilotFacts.js');
const agreementsPanelSource = read('web/src/panels/company/AgreementsPanel.jsx');
const commercialCorePanelSource = read('web/src/panels/superadmin/CommercialCorePanel.jsx');
const commercialFlowPanelSource = read('web/src/panels/company/CommercialFlowPanel.jsx');
const shiftsPanelSource = read('web/src/panels/company/ShiftsPanel.jsx');

must(pkg, '"check:cop04bfix02": "node backend/scripts/cop_04b_fix_02_company_commercial_context_check.js"', 'package.json exposes check:cop04bfix02');
must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

must(runner, 'check:cop04bfix02', 'product extensions runner keeps cop04bfix02');
must(verifyChain, 'check:cop04bfix02', 'verify chain waits for check:cop04bfix02');
must(guide, 'check:cop04bfix02', 'script guide exposes check:cop04bfix02');
must(guide, 'check:cop04bfix01', 'script guide keeps check:cop04bfix01');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');
must(guide, 'check:cop04afix04', 'script guide keeps check:cop04afix04');
must(guide, 'check:cop04afix03', 'script guide keeps check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(auditDoc, 'COP-04B-FIX-02 acceptance note', 'audit doc keeps fix02 note');
must(auditDoc, 'Company / Sözleşmeler', 'audit doc keeps company agreements reference');
must(auditDoc, 'Super Admin / Ticari Akış', 'audit doc keeps commercial core reference');
must(auditDoc, 'Eksik bilgi: 0', 'audit doc keeps zero-missing contradiction note');
must(auditDoc, 'Ödeme başlatılmaz.', 'audit doc keeps readonly payment boundary');
must(auditDoc, 'Bunu anlayamadım', 'audit doc keeps fallback reference');
must(auditDoc, 'selected context parity', 'audit doc keeps selected parity wording');

must(agreementsPanelSource, "entityType: 'screen'", 'agreements panel keeps safe screen entity type');
must(agreementsPanelSource, 'selectedAgreementCopilotContext', 'agreements panel keeps agreement bridge context');
must(agreementsPanelSource, 'buildAgreementCopilotFacts', 'agreements panel keeps agreement facts helper');
must(commercialCorePanelSource, "entityType: 'screen'", 'commercial core panel keeps safe screen entity type');
must(commercialCorePanelSource, 'paymentPreviewSummary?.missingCount', 'commercial core panel keeps missing count bridge');
must(commercialFlowPanelSource, "entityType: selectedItem?.shiftId ? 'shift' : 'screen'", 'company commercial flow panel keeps safe selection entity type');
must(shiftsPanelSource, 'entityType: "shift"', 'company shifts panel keeps shift selection entity type');

must(agreementFactsSource, 'export function buildAgreementCopilotFacts', 'agreement facts helper exists');
must(agreementFactsSource, 'generatedShiftCount', 'agreement facts helper keeps generated shift count');
must(agreementFactsSource, 'lastGeneratedShiftId', 'agreement facts helper keeps last generated shift id');
must(agreementFactsSource, 'todayGeneratedShift', 'agreement facts helper keeps today generated flag');
must(agreementFactsSource, 'copilotSummary', 'agreement facts helper keeps copilot summary');
must(agreementFactsSource, 'Üretilen vardiya:', 'agreement facts helper keeps generated shift wording');
must(agreementFactsSource, 'Son üretilen vardiya #', 'agreement facts helper keeps last generated shift wording');
must(agreementFactsSource, 'Bugün üretim: Var', 'agreement facts helper keeps today production wording');

must(factsSource, 'buildCommercialCoreCopilotFacts', 'copilot facts keeps commercial core helper');
must(factsSource, 'selectedRecordStatus: compactText(`${previewStatus} • Eksik bilgi ${missingCount} • Ödeme hesabı: ${accountText} • ${csvBoundary} • Servis kanıtı: ${serviceProofText}`', 'copilot facts keeps zero-missing commercial status');
must(factsSource, 'Eksik bilgi 0 görünüyor; ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini kontrol et.', 'copilot facts keeps zero-missing guidance');
must(factsSource, 'Ödeme başlatılmaz.', 'copilot facts keeps readonly payment boundary');
must(factsSource, 'selectedRecordStatus', 'copilot facts keeps selected record status bridge');

must(helpComposerSource, 'asksContractOrReadinessWorkflow', 'help composer keeps contract/payment guard');
must(helpComposerSource, 'buildContractProductionSignalState', 'help composer keeps contract production bridge helper');
must(helpComposerSource, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'help composer keeps positive contract production wording');
must(helpComposerSource, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'help composer keeps negative contract production wording');
must(helpComposerSource, 'Hakediş önizleme, ödeme hesabı, komisyon ve hizmet/onay sinyalini kontrol et.', 'help composer keeps payment readiness wording');
must(helpComposerSource, 'Bu ekrandaki veriye göre bu vardiya başlayamıyor.', 'help composer keeps shift wording elsewhere');
mustNotRaw(helpComposerSource, 'OperationProof', 'help composer avoids visible technical proof wording');

must(schemasSource, 'isAgreementScreenContext', 'schemas keeps agreement screen helper');
must(schemasSource, 'isContractToShiftQuestion', 'schemas keeps contract-to-shift question helper');
must(schemasSource, 'CONTRACT_TO_SHIFT_PHRASES', 'schemas keeps contract phrase helper');
must(intentRouterSource, '/company/agreements', 'intent router keeps agreements route');
must(intentRouterSource, '/superadmin/commercial-core', 'intent router keeps commercial core route');
must(intentRouterSource, 'PAYMENT_READINESS', 'intent router keeps payment readiness intent');
must(intentRouterSource, 'PAYMENT_MISSING', 'intent router keeps payment missing intent');
must(intentRouterSource, 'CONTRACT_TO_SHIFT', 'intent router keeps contract-to-shift intent');

must(answerPolicySource, 'WORKFLOW_GENERIC_CHIP_BLOCKLIST', 'answer policy keeps workflow generic blocklist');
must(answerPolicySource, 'Üretim geçmişini göster', 'answer policy keeps contract chip');
must(answerPolicySource, 'Bugünkü vardiyaları göster', 'answer policy keeps contract today chip');
must(answerPolicySource, 'Eksik bilgi ne?', 'answer policy keeps payment chip');
must(answerPolicySource, 'Ödeme hesabı var mı?', 'answer policy keeps payment account chip');
must(answerPolicySource, 'Komisyon durumu ne?', 'answer policy keeps payment commission chip');
must(answerPolicySource, 'Hakediş önizlemesini aç', 'answer policy keeps payment preview chip');
must(answerPolicySource, 'Bunu sor', 'answer policy keeps generic chip block');
must(answerPolicySource, 'Aynı kayıt için devam et', 'answer policy keeps continuation block');
must(answerPolicySource, 'Ekran rehberini aç', 'answer policy keeps guide block');

const { buildAgreementCopilotFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/agreementCopilotFacts.js')).href);
const { buildCommercialCoreCopilotFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);
const { normalizeCopilotRequestInput, parseCopilotRequest } = await import(pathToFileURL(path.join(root, 'backend/src/ai/schemas.js')).href);
const { detectQuestionIntent } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/intentRouter.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { getScreenDefinitionForUser, listScreensForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const companyUser = { role: 'COMPANY', companyId: 1, companyKind: 'DEMO' };
const superUser = { role: 'SUPER_ADMIN', companyId: 1, companyKind: 'DEMO' };

const companyScreens = listScreensForUser(companyUser);
const agreementsScreen = companyScreens.find((row) => String(row?.path || '') === '/company/agreements');
const commercialFlowScreen = companyScreens.find((row) => String(row?.path || '') === '/company/commercial-flow');
const companyShiftsScreen = companyScreens.find((row) => String(row?.path || '') === '/company/shifts');
const superScreens = listScreensForUser(superUser);
const superCommercialScreen = superScreens.find((row) => String(row?.path || '') === '/superadmin/commercial-core');

if (!agreementsScreen) fail('company agreements screen exists');
if (!commercialFlowScreen) fail('company commercial flow screen exists');
if (!companyShiftsScreen) fail('company shifts screen exists');
if (!superCommercialScreen) fail('superadmin commercial core screen exists');

const agreementsScreenDefinition = getScreenDefinitionForUser(companyUser, agreementsScreen, Number(agreementsScreen.id));
const superCommercialScreenDefinition = getScreenDefinitionForUser(superUser, superCommercialScreen, Number(superCommercialScreen.id));

const selectedAgreement = {
  id: 1,
  type: 'agreement',
  label: 'Sözleşme #1',
  status: 'Kabul Edildi',
  roomId: 1,
  roomName: 'DEMO Oda',
  startDate: '2026-05-16',
  endDate: '2026-05-20',
  startMin: 7 * 60,
  endMin: 9 * 60,
  weekMask: 62,
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
};

const agreementFacts = buildAgreementCopilotFacts(selectedAgreement, {
  screenPath: '/company/agreements',
  screenTitle: 'Sözleşmeler (Company)',
  selectedRecordType: 'agreement',
  selectedRecordLabel: 'Sözleşme #1',
  selectedRecordId: 1,
  selectedRecordStatus: 'Kabul Edildi',
  selectedRecordSummary: 'Kabul Edildi • Oda #1 • 16.05.2026 - 20.05.2026 • Kaynak vardiya #4 • Üretilen vardiya: 3 • Son üretilen vardiya #7 • APPROVED • 20.05.2026 07:00 - 20.05.2026 09:00 • Personel: 6 • Durak: 6',
  roomName: 'DEMO Oda',
  roomLabel: 'DEMO Oda',
  startDate: '2026-05-16',
  endDate: '2026-05-20',
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
  todayGeneratedShift: true,
  generationHistory: [{ id: 7, status: 'APPROVED', startAt: '20.05.2026 07:00', endAt: '20.05.2026 09:00', peopleCount: 6, stopCount: 6 }],
  productionSignal: 'Üretilen vardiya: 3',
  vehicleLabel: '34ABC123',
  driverLabel: 'Sürücü Demo',
  pendingCount: 0,
  otherCount: 0,
  extendCount: 0,
  shiftCount: 3,
  todayDone: 1,
  todayTotal: 1,
  horizonOpen: 0,
});

must(agreementFacts.copilotSummary, 'Üretilen vardiya: 3', 'agreement facts keep generated count');
must(agreementFacts.copilotSummary, 'Son üretilen vardiya #7', 'agreement facts keep last generated shift');
must(agreementFacts.copilotSummary, 'Bugün üretim: Var', 'agreement facts keep today production signal');

const agreementRequest = {
  message: 'Bu sözleşmeden bugün vardiya üretildi mi?',
  screenContext: {
    id: Number(agreementsScreen.id),
    path: '/company/agreements',
    label: 'Sözleşmeler (Company)',
    selectedLabel: agreementFacts.selectedRecordLabel,
    selectedSummary: 'Seçili kayıt: Sözleşme #1 • Kaynak vardiya: #4 • Üretilen vardiya: 3 • Son üretilen vardiya #7 • Bugün üretim: Var • Bağlam: Sözleşmeler - Sözleşme #1',
    structuredFacts: agreementFacts,
    selectedEntityType: 'screen',
    selectedEntityId: Number(agreementsScreen.id),
    selectedRecordStatus: agreementFacts.selectedRecordStatus,
    copilotSummary: agreementFacts.copilotSummary,
  },
  conversationState: {
    lastScreenPath: '/company/agreements',
    lastScreenLabel: 'Sözleşmeler (Company)',
    recentMessages: [],
  },
};

const normalizedAgreementRequest = normalizeCopilotRequestInput(agreementRequest);
must(normalizedAgreementRequest.intent, 'CHAT_HELP', 'agreement request infers chat help intent');
must(normalizedAgreementRequest.entityType, 'screen', 'agreement request keeps screen entity type');
const parsedAgreementRequest = parseCopilotRequest(agreementRequest);
if (!parsedAgreementRequest.success) fail(`agreement parse should succeed: ${JSON.stringify(parsedAgreementRequest.error.flatten())}`);
const agreementIntent = detectQuestionIntent(agreementRequest.message, {
  screenPath: '/company/agreements',
  entityType: 'screen',
  originalMessage: agreementRequest.message,
});
mustAny(agreementIntent?.questionType || '', ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'], 'agreement request routes to contract production');

const agreementResponse = buildChatHelpResponse({
  entityType: parsedAgreementRequest.data.entityType,
  entityId: parsedAgreementRequest.data.entityId,
  user: companyUser,
  message: parsedAgreementRequest.data.message,
  context: {
    screenPath: '/company/agreements',
    selectedLabel: agreementFacts.selectedRecordLabel,
    selectedSummary: agreementFacts.copilotSummary,
  },
  entityLabel: 'Sözleşmeler (Company)',
  scope: '/company/agreements',
  conversationState: parsedAgreementRequest.data.conversationState || agreementRequest.conversationState,
  screenContext: agreementRequest.screenContext,
  screenDefinition: agreementsScreenDefinition,
  sourceEntityType: 'screen',
  sourceEntityId: Number(agreementsScreen.id),
  resolvedEntityType: parsedAgreementRequest.data.entityType,
  resolvedEntityId: parsedAgreementRequest.data.entityId,
});

const agreementReply = String(agreementResponse?.reply || agreementResponse?.summary || '');
mustNot(agreementReply, 'Bunu anlayamadım', 'agreement reply avoids unknown fallback');
mustAny(agreementReply, ['Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.'], 'agreement reply keeps production wording');
mustAny(agreementReply, ['Üretilen vardiya sayısı 3', 'Üretilen vardiya: 3'], 'agreement reply keeps generated count');
must(agreementReply, 'son üretilen vardiya #7', 'agreement reply keeps last generated shift');
mustAny(agreementReply, ['Bugün üretim: Var', 'bugün üretim: var'], 'agreement reply keeps today production');
mustNotRaw(agreementReply, 'agreement', 'agreement reply avoids visible agreement term');
mustNotRaw(agreementReply, 'contractShiftGeneration', 'agreement reply avoids technical contract token');
mustNotRaw(agreementReply, 'OperationProof', 'agreement reply avoids technical proof wording');
mustNot(agreementReply, 'Bu vardiyada ana engel', 'agreement reply avoids wrong shift-first wording');
mustNotRaw(agreementReply, 'raw', 'agreement reply avoids raw token');
mustNotRaw(agreementReply, 'payload', 'agreement reply avoids payload token');
mustNotRaw(agreementReply, 'token', 'agreement reply avoids token token');
mustNotRaw(agreementReply, 'hash', 'agreement reply avoids hash token');
mustNotRaw(agreementReply, 'debug', 'agreement reply avoids debug token');
mustNotRaw(agreementReply, 'write', 'agreement reply avoids write token');
mustNotRaw(agreementReply, 'execute', 'agreement reply avoids execute token');
mustNotRaw(agreementReply, 'settlement execute', 'agreement reply avoids settlement execute token');
mustArrayContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'Üretim geçmişini göster', 'agreement chips keep production history');
mustArrayContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'Bugünkü vardiyaları göster', 'agreement chips keep today shifts');
mustArrayContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'İlgili sözleşmeyi aç', 'agreement chips keep open contract');
mustArrayContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'Üretim durumunu açıkla', 'agreement chips keep explain production');
mustArrayNotContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'Bunu sor', 'agreement chips avoid generic self-question');
mustArrayNotContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'Aynı kayıt için devam et', 'agreement chips avoid generic continuation');
mustArrayNotContains(agreementResponse?.contextualSuggestedChips || agreementResponse?.suggestedChips || [], 'Ekran rehberini aç', 'agreement chips avoid generic screen guide');

const commercialFacts = buildCommercialCoreCopilotFacts({
  paymentPreviewSummary: {
    title: 'Hakediş önizleme',
    statusText: 'Hazır değil',
    missingCount: 0,
    reviewCount: 1,
    paymentAccountStatus: 'Eksik bilgi',
    contractOrShiftSummary: 'Sözleşme / vardiya sinyali',
    nextAction: 'Önce ödeme hesabı, komisyon ve hizmet/onay sinyalini kontrol et.',
    nonFinalText: 'Ödeme başlatılmaz. Sadece önizleme verisi indirilir.',
    detailReason: 'Hazırlık sinyali okunuyor.',
  },
  paymentBackbone: { activeRule: { paymentMode: 'OFF', commissionBps: 0 } },
  settings: { globalRule: { paymentMode: 'OFF' } },
  settlementStatus: { summaryText: 'Kontrol gerekli', status: 'NEEDS_REVIEW' },
  accountStatus: { summaryText: 'Eksik bilgi' },
  operationProofSummary: { statusText: 'Kontrol gerekli', summaryText: 'Servis kanıtı kontrol gerekli', visibilityNote: 'Servis kanıtı görünür' },
  paymentSourcesMeta: { summary: 'Önizleme kaynakları özetleniyor.', total: 2 },
  lifecycle: { summary: 'Sözleşme / vardiya sinyali' },
});

must(commercialFacts.selectedRecordStatus, 'Eksik bilgi 0', 'commercial facts keep zero missing status');
mustArrayContains(commercialFacts.copilotBoundary || [], 'Ödeme başlatılmaz.', 'commercial facts keep readonly payment boundary');
mustAny(commercialFacts.copilotSummary, ['Eksik bilgi 0 görünüyor', 'Eksik bilgi 0'], 'commercial facts keep zero-missing guidance');

const commercialRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(superCommercialScreen.id),
  message: 'Bu hakediş neden hazır değil?',
  screenContext: {
    id: Number(superCommercialScreen.id),
    path: '/superadmin/commercial-core',
    label: 'Ticari Akış',
    selectedLabel: 'Hakediş önizleme',
    selectedSummary: commercialFacts.copilotSummary,
    structuredFacts: commercialFacts,
    selectedEntityType: 'screen',
    selectedEntityId: Number(superCommercialScreen.id),
    selectedRecordStatus: commercialFacts.selectedRecordStatus,
    copilotSummary: commercialFacts.copilotSummary,
  },
  conversationState: {
    lastScreenPath: '/superadmin/commercial-core',
    lastScreenLabel: 'Ticari Akış',
    recentMessages: [],
  },
};

const normalizedCommercialRequest = normalizeCopilotRequestInput(commercialRequest);
must(normalizedCommercialRequest.intent, 'CHAT_HELP', 'commercial request infers chat help intent');
must(normalizedCommercialRequest.entityType, 'screen', 'commercial request keeps screen entity type');
const parsedCommercialRequest = parseCopilotRequest(commercialRequest);
if (!parsedCommercialRequest.success) fail(`commercial parse should succeed: ${JSON.stringify(parsedCommercialRequest.error.flatten())}`);
const commercialIntent = detectQuestionIntent(commercialRequest.message, {
  screenPath: '/superadmin/commercial-core',
  entityType: 'screen',
  originalMessage: commercialRequest.message,
});
mustAny(commercialIntent?.questionType || '', ['PAYMENT_READINESS', 'PAYMENT_MISSING'], 'commercial request routes to payment readiness');

const commercialResponse = buildChatHelpResponse({
  entityType: parsedCommercialRequest.data.entityType,
  entityId: parsedCommercialRequest.data.entityId,
  user: superUser,
  message: parsedCommercialRequest.data.message,
  context: {
    screenPath: '/superadmin/commercial-core',
    selectedLabel: 'Hakediş önizleme',
    selectedSummary: commercialFacts.copilotSummary,
  },
  entityLabel: 'Ticari Akış',
  scope: '/superadmin/commercial-core',
  conversationState: parsedCommercialRequest.data.conversationState || commercialRequest.conversationState,
  screenContext: commercialRequest.screenContext,
  screenDefinition: superCommercialScreenDefinition,
  sourceEntityType: 'screen',
  sourceEntityId: Number(superCommercialScreen.id),
  resolvedEntityType: parsedCommercialRequest.data.entityType,
  resolvedEntityId: parsedCommercialRequest.data.entityId,
});

const commercialReply = String(commercialResponse?.reply || commercialResponse?.summary || '');
mustNot(commercialReply, 'Bunu anlayamadım', 'commercial reply avoids unknown fallback');
mustAny(commercialReply, ['Eksik bilgi 0 görünüyor', 'Eksik bilgi 0'], 'commercial reply keeps zero-missing wording');
mustAny(commercialReply, ['ödeme hesabı', 'ödeme hesabını', 'ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini'], 'commercial reply keeps payment account wording');
mustAny(commercialReply, ['komisyon', 'komisyon durumu'], 'commercial reply keeps commission wording');
mustAny(commercialReply, ['hizmet/onay', 'servis kanıtı', 'operasyon kanıtı'], 'commercial reply keeps proof wording');
mustAny(commercialReply, ['Ödeme başlatılmaz', 'ödeme başlatılmaz'], 'commercial reply keeps readonly payment boundary');
mustNotRaw(commercialReply, 'agreement', 'commercial reply avoids visible agreement term');
mustNotRaw(commercialReply, 'contractShiftGeneration', 'commercial reply avoids technical contract token');
mustNotRaw(commercialReply, 'OperationProof', 'commercial reply avoids technical proof wording');
mustNot(commercialReply, 'Bu vardiyada ana engel', 'commercial reply avoids wrong shift-first wording');
mustNotRaw(commercialReply, 'raw', 'commercial reply avoids raw token');
mustNotRaw(commercialReply, 'payload', 'commercial reply avoids payload token');
mustNotRaw(commercialReply, 'token', 'commercial reply avoids token token');
mustNotRaw(commercialReply, 'hash', 'commercial reply avoids hash token');
mustNotRaw(commercialReply, 'debug', 'commercial reply avoids debug token');
mustNotRaw(commercialReply, 'write', 'commercial reply avoids write token');
mustNotRaw(commercialReply, 'execute', 'commercial reply avoids execute token');
mustNotRaw(commercialReply, 'settlement execute', 'commercial reply avoids settlement execute token');
mustArrayContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Eksik bilgi ne?', 'commercial chips keep missing info');
mustArrayContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Ödeme hesabı var mı?', 'commercial chips keep payment account');
mustArrayContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Komisyon durumu ne?', 'commercial chips keep commission');
mustArrayContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Hakediş önizlemesini aç', 'commercial chips keep preview');
mustArrayNotContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Bunu sor', 'commercial chips avoid generic self-question');
mustArrayNotContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Aynı kayıt için devam et', 'commercial chips avoid generic continuation');
mustArrayNotContains(commercialResponse?.contextualSuggestedChips || commercialResponse?.suggestedChips || [], 'Ekran rehberini aç', 'commercial chips avoid generic screen guide');

const commercialNoSelectionRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(superCommercialScreen.id),
  message: 'Bu hakediş neden hazır değil?',
  screenContext: {
    id: Number(superCommercialScreen.id),
    path: '/superadmin/commercial-core',
    label: 'Ticari Akış',
    selectedLabel: '',
    selectedSummary: '',
    structuredFacts: commercialFacts,
    selectedEntityType: 'screen',
    selectedEntityId: Number(superCommercialScreen.id),
    selectedRecordStatus: '',
    copilotSummary: commercialFacts.copilotSummary,
  },
  conversationState: {
    lastScreenPath: '/superadmin/commercial-core',
    lastScreenLabel: 'Ticari Akış',
    recentMessages: [],
  },
};

const parsedCommercialNoSelection = parseCopilotRequest(normalizeCopilotRequestInput(commercialNoSelectionRequest));
if (!parsedCommercialNoSelection.success) fail(`commercial no-selection parse should succeed: ${JSON.stringify(parsedCommercialNoSelection.error.flatten())}`);
const commercialNoSelectionResponse = buildChatHelpResponse({
  entityType: parsedCommercialNoSelection.data.entityType,
  entityId: parsedCommercialNoSelection.data.entityId,
  user: superUser,
  message: parsedCommercialNoSelection.data.message,
  context: {
    screenPath: '/superadmin/commercial-core',
    selectedLabel: '',
    selectedSummary: '',
  },
  entityLabel: 'Ticari Akış',
  scope: '/superadmin/commercial-core',
  conversationState: parsedCommercialNoSelection.data.conversationState || commercialNoSelectionRequest.conversationState,
  screenContext: commercialNoSelectionRequest.screenContext,
  screenDefinition: superCommercialScreenDefinition,
  sourceEntityType: 'screen',
  sourceEntityId: Number(superCommercialScreen.id),
  resolvedEntityType: parsedCommercialNoSelection.data.entityType,
  resolvedEntityId: parsedCommercialNoSelection.data.entityId,
});

const commercialNoSelectionReply = String(commercialNoSelectionResponse?.reply || commercialNoSelectionResponse?.summary || '');
mustNot(commercialNoSelectionReply, 'Bunu anlayamadım', 'commercial no-selection reply avoids unknown fallback');
mustAny(commercialNoSelectionReply, ['Hakediş önizlemesi', 'Hakediş', 'Ödeme hesabı', 'seçili kayıt net görünmüyor'], 'commercial no-selection reply keeps safe fallback');
mustNotRaw(commercialNoSelectionReply, 'agreement', 'commercial no-selection reply avoids visible agreement term');
mustNotRaw(commercialNoSelectionReply, 'contractShiftGeneration', 'commercial no-selection reply avoids technical contract token');
mustNotRaw(commercialNoSelectionReply, 'OperationProof', 'commercial no-selection reply avoids technical proof wording');
mustNotRaw(commercialNoSelectionReply, 'raw', 'commercial no-selection reply avoids raw token');
mustNotRaw(commercialNoSelectionReply, 'payload', 'commercial no-selection reply avoids payload token');
mustNotRaw(commercialNoSelectionReply, 'token', 'commercial no-selection reply avoids token token');
mustNotRaw(commercialNoSelectionReply, 'hash', 'commercial no-selection reply avoids hash token');
mustNotRaw(commercialNoSelectionReply, 'debug', 'commercial no-selection reply avoids debug token');
mustNotRaw(commercialNoSelectionReply, 'write', 'commercial no-selection reply avoids write token');
mustNotRaw(commercialNoSelectionReply, 'execute', 'commercial no-selection reply avoids execute token');
mustNotRaw(commercialNoSelectionReply, 'settlement execute', 'commercial no-selection reply avoids settlement execute token');

console.log('=== COP-04B-FIX-02 COMPANY COMMERCIAL CONTEXT CHECK PASS ===');
