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
    .toLowerCase('tr-TR');
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
  const list = Array.isArray(needles) ? needles : [];
  if (list.some((needle) => haystack.includes(normalize(needle)))) ok(label);
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

function replyText(result) {
  return String(result?.reply || result?.summary || result?.screenExplanation || '');
}

function chipList(result) {
  return result?.contextualSuggestedChips || result?.suggestedChips || [];
}

function assertNoForbiddenVisibleTerms(text, label) {
  const forbidden = [
    'FORBIDDEN',
    'JOB_TYPE_ENTITY_MISMATCH',
    'OperationProof',
    'agreement',
    'contractShiftGeneration',
    'raw',
    'payload',
    'token',
    'hash',
    'debug',
    'write',
    'execute',
    'settlement execute',
    'stack',
    'exception',
    'Validation failed',
    'Bu aksiyonu simüle et',
  ];
  for (const term of forbidden) {
    mustNotRaw(text, term, `${label} avoids ${term}`);
  }
}

console.log('=== COP-04B-FIX-07 PERSONEL LIVE COPILOT CONTEXT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const aiRouteSource = read('backend/src/routes/ai.js');
const contextResolverSource = read('backend/src/ai/chat/contextResolver.js');
const httpSource = read('backend/src/errors/http.js');
const apiContractSource = read('web/src/utils/apiContract.js');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const answerPolicySource = read('backend/src/ai/chat/answerQualityPolicy.js');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const copilotPanelSource = read('web/src/panels/shared/CopilotPanel.jsx');
const personelLivePanelSource = read('web/src/panels/personel/LivePanel.jsx');
const personelMyRidePanelSource = read('web/src/panels/personel/MyRidePanel.jsx');

must(pkg, '"check:cop04bfix07": "node backend/scripts/cop_04b_fix_07_personel_live_copilot_context_check.js"', 'package.json exposes check:cop04bfix07');
must(pkg, '"check:cop04bfix06"', 'package.json keeps check:cop04bfix06');
must(pkg, '"check:cop04bfix05"', 'package.json keeps check:cop04bfix05');
must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');
must(pkg, '"check:product-extensions"', 'package.json keeps check:product-extensions');

must(runner, 'check:cop04bfix07', 'product extensions runner keeps cop04bfix07');
must(verifyChain, 'check:cop04bfix07', 'verify chain waits for check:cop04bfix07');
must(guide, 'check:cop04bfix07', 'script guide exposes check:cop04bfix07');
must(guide, 'check:cop04bfix06', 'script guide keeps check:cop04bfix06');
must(guide, 'check:cop04bfix05', 'script guide keeps check:cop04bfix05');
must(guide, 'check:cop04bfix04', 'script guide keeps check:cop04bfix04');
must(guide, 'check:cop04bfix03', 'script guide keeps check:cop04bfix03');
must(guide, 'check:cop04bfix02', 'script guide keeps check:cop04bfix02');
must(guide, 'check:cop04bfix01', 'script guide keeps check:cop04bfix01');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(auditDoc, 'COP-04B-FIX-07 personel live copilot forbidden/context fix', 'audit doc keeps fix07 note');
must(auditDoc, 'FORBIDDEN normalization', 'audit doc keeps forbidden normalization note');
must(auditDoc, 'Personel / Canlı Takip', 'audit doc keeps personel live reference');

must(aiRouteSource, '["DRIVER", "PERSONEL", "PARENT"]', 'ai route keeps simple chat roles');
must(aiRouteSource, 'isSimpleChatRole', 'ai route keeps simple chat gate');
must(contextResolverSource, 'simpleScreenRole', 'context resolver bypasses DB entity resolution for simple screen roles');
must(contextResolverSource, "['DRIVER', 'PERSONEL', 'PARENT']", 'context resolver keeps simple roles list');

must(httpSource, 'FORBIDDEN', 'http error normalizer keeps forbidden alias');
must(httpSource, 'Bu işlem için bu rolde erişim görünmüyor.', 'http error normalizer keeps safe forbidden message');
must(apiContractSource, 'normalizeVisibleApiErrorMessage', 'api contract sanitizes forbidden messages');
must(apiContractSource, 'normalizeVisibleApiErrorCode', 'api contract sanitizes forbidden codes');

must(helpComposerSource, 'helpContextSummary', 'help composer keeps helpContextSummary bridge');
must(helpComposerSource, 'contextSummary', 'help composer keeps contextSummary bridge');
must(helpComposerSource, 'selectedRecordSummary', 'help composer keeps selectedRecordSummary bridge');
must(helpComposerSource, 'selectedCarrySummary', 'help composer keeps selected carry summary helper');
must(helpComposerSource, 'Bu ekranda seçili servis bilgisi net görünmüyor; önce bugünkü servis satırını seç.', 'help composer keeps personel fallback');
must(helpComposerSource, 'Bu ekranda bugünkü göreve ait seçili bilgi net görünmüyor; önce vardiya veya araç satırını seç.', 'help composer keeps driver fallback');

must(answerPolicySource, "path.includes('/personel/live')", 'answer policy keeps personel live path');
must(answerPolicySource, "path.includes('/parent/live')", 'answer policy keeps parent live path');
must(answerPolicySource, 'Araç nerede?', 'answer policy keeps personel live gps chip');
must(answerPolicySource, 'Servis durumu ne?', 'answer policy keeps personel live status chip');
must(answerPolicySource, 'Sürücünün telefonundan konum sinyali devrede mi?', 'answer policy keeps personel live phone gps chip');
must(answerPolicySource, 'Bunu sor', 'answer policy keeps generic chip block');
must(answerPolicySource, 'Aynı kayıt için devam et', 'answer policy keeps continuation block');
must(answerPolicySource, 'Ekran rehberini aç', 'answer policy keeps guide block');
must(answerPolicySource, 'İlgili durumu sor', 'answer policy keeps generic follow-up block');

must(drawerSource, 'helpContextSummary', 'floating drawer keeps helpContextSummary bridge');
must(drawerSource, 'contextSummary', 'floating drawer keeps contextSummary bridge');
must(drawerSource, 'selectedFields', 'floating drawer keeps selected fields bridge');
must(drawerSource, 'selectedBadges', 'floating drawer keeps selected badges bridge');
must(drawerSource, 'structuredFacts', 'floating drawer keeps structured facts bridge');
must(drawerSource, 'liveFacts', 'floating drawer keeps live facts bridge');
must(copilotPanelSource, 'helpContextSummary', 'copilot panel keeps helpContextSummary bridge');
must(copilotPanelSource, 'contextSummary', 'copilot panel keeps contextSummary bridge');
must(copilotPanelSource, 'selectedFields', 'copilot panel keeps selected fields bridge');
must(copilotPanelSource, 'selectedBadges', 'copilot panel keeps selected badges bridge');
must(copilotPanelSource, 'structuredFacts', 'copilot panel keeps structured facts bridge');
must(copilotPanelSource, 'liveFacts', 'copilot panel keeps live facts bridge');
must(personelLivePanelSource, 'setCopilotSelection(copilotSelection)', 'personel live panel keeps selection push');
must(personelLivePanelSource, 'fields:', 'personel live panel keeps fields bridge');
must(personelLivePanelSource, 'badges:', 'personel live panel keeps badges bridge');
must(personelLivePanelSource, 'facts', 'personel live panel keeps facts bridge');
must(personelLivePanelSource, 'selectedRecordLabel', 'personel live panel keeps selected record label bridge');
must(personelLivePanelSource, 'Araç GPS’i', 'personel live panel keeps vehicle gps label');
must(personelLivePanelSource, 'Sürücünün telefonundan konum sinyali', 'personel live panel keeps driver phone gps label');
must(personelMyRidePanelSource, 'setCopilotSelection(copilotSelection)', 'personel my-ride panel keeps selection push');
must(personelMyRidePanelSource, 'fields:', 'personel my-ride panel keeps fields bridge');
must(personelMyRidePanelSource, 'badges:', 'personel my-ride panel keeps badges bridge');
must(personelMyRidePanelSource, 'facts', 'personel my-ride panel keeps facts bridge');
must(personelMyRidePanelSource, 'selectedRecordLabel', 'personel my-ride panel keeps selected record label bridge');

const { resolveChatContext } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/contextResolver.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { workflowTopicChipSet } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/answerQualityPolicy.js')).href);
const { normalizeError } = await import(pathToFileURL(path.join(root, 'backend/src/errors/http.js')).href);
const { makeHttpError, getApiErrorInfo } = await import(pathToFileURL(path.join(root, 'web/src/utils/apiContract.js')).href);
const { listScreensForUser, getScreenDefinitionForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);
const { buildMapFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);

const personelUser = { role: 'PERSONEL', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const personelScreen = listScreensForUser(personelUser).find((row) => String(row?.path || '') === '/personel/live');
if (!personelScreen) fail('personel live screen exists');
const personelScreenDef = getScreenDefinitionForUser(personelUser, personelScreen, Number(personelScreen.id));

const baseFacts = buildMapFacts({
  selected: { id: 34, plate: '34ABC123' },
  selectedShift: {
    id: 1,
    status: 'APPROVED',
    vehicle: { plate: '34ABC123' },
    driver: { fullName: 'Sürücü Demo' },
    stops: [{ name: 'Durak A' }, { name: 'Durak B' }, { name: 'Durak C' }],
  },
  selectedNext: { name: 'Durak A' },
  selectedEta: 3,
  selectedStats: { total: 6, remaining: 3, completed: 3 },
  gpsStatus: 'Çevrim Dışı / OFFLINE',
  gpsAge: '11dk',
  vehicleCount: 1,
});

function buildPersonelFixture({ selectedRecord = null, selectedEntityType = 'vehicle', selectedEntityId = 34, helpContextSummary = '', contextSummary = '', selectedFields = [], selectedBadges = [], extraFacts = {} } = {}) {
  const facts = {
    ...baseFacts,
    selectedRecordLabel: 'Bugünkü servis',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    ...extraFacts,
  };
  return {
    path: '/personel/live',
    label: 'Personel • Canlı Harita',
    role: 'PERSONEL',
    companyKind: 'DEMO',
    selectedLabel: 'Bugünkü servis',
    selectedEntityType,
    selectedEntityId,
    selectedSummary: helpContextSummary || facts.selectedRecordSummary || facts.copilotSummary || '',
    selectedRecordSummary: facts.selectedRecordSummary || helpContextSummary || '',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    selectedRecordLabel: 'Bugünkü servis',
    helpContextSummary: helpContextSummary || facts.helpContextSummary || '',
    contextSummary: contextSummary || facts.contextSummary || '',
    selectedFields,
    selectedBadges,
    structuredFacts: facts,
    liveFacts: facts,
    selectedRecord,
  };
}

function buildResponse(args) {
  return buildChatHelpResponse({
    entityType: 'screen',
    ...args,
  });
}

const liveHelpSummary = 'Şu an: Canlı • Seçili kayıt: Bugünkü servis • 34ABC123 • Shift #1 • Kabul Edildi • Araç 34ABC123 • Son GPS 11dk • Sıradaki Durak A • ETA 0 dk • Kalan durak 3';
const liveContextSummary = 'Personel canlı takip • Shift #1 • Araç 34ABC123 • GPS Çevrim Dışı / OFFLINE • Son GPS: 11dk • Sıradaki: Durak A • ETA: 3dk • Rota km: 1.6km';
const liveFixture = buildPersonelFixture({
  selectedRecord: null,
  helpContextSummary: liveHelpSummary,
  contextSummary: liveContextSummary,
  selectedFields: [
    { label: 'Servis', value: 'Bugünkü servis' },
    { label: 'Araç', value: '34ABC123' },
    { label: 'Sürücü', value: 'Sürücü Demo' },
    { label: 'Son GPS', value: '11dk' },
    { label: 'GPS durumu', value: 'Çevrim Dışı / OFFLINE' },
    { label: 'Kaynak', value: 'Sürücünün telefon GPS’i' },
    { label: 'Sıradaki durak', value: 'Durak A' },
    { label: 'ETA', value: '3 dk' },
    { label: 'Servis durumu', value: 'Kabul Edildi / APPROVED' },
  ],
  selectedBadges: [
    { label: 'Araç GPS’i', value: 'Çevrim Dışı / OFFLINE' },
    { label: 'Sürücünün telefon GPS’i', value: 'Sürücünün telefon GPS’i' },
  ],
});

const intent = 'Servis neden görünmüyor?';
const resolvedLive = await resolveChatContext({
  entityType: 'screen',
  entityId: Number(personelScreen.id),
  user: personelUser,
  screenContext: liveFixture,
  conversationState: {
    recentMessages: [],
    lastScreenPath: '/personel/live',
    lastScreenLabel: 'Personel • Canlı Harita',
    selectedEntityType: 'vehicle',
    selectedEntityId: 34,
  },
});
must(resolvedLive.context?.type || '', 'screen', 'simple role keeps screen context instead of forbidden entity lookup');
must(resolvedLive.resolvedEntityType || '', 'screen', 'simple role keeps resolved entity type on screen');
must(resolvedLive.selectedEntityType || '', 'vehicle', 'simple role preserves selected entity marker');

const responseLive = buildResponse({
  entityId: Number(personelScreen.id),
  user: personelUser,
  message: intent,
  context: resolvedLive.context,
  entityLabel: resolvedLive.entityLabel,
  scope: resolvedLive.scope,
  conversationState: {
    recentMessages: [{ role: 'user', text: intent }],
    lastScreenPath: '/personel/live',
    lastScreenLabel: 'Personel • Canlı Harita',
  },
  screenContext: liveFixture,
  screenDefinition: personelScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(personelScreen.id),
  resolvedEntityType: resolvedLive.resolvedEntityType,
  resolvedEntityId: resolvedLive.resolvedEntityId,
});
const replyLive = replyText(responseLive);
mustNotRaw(replyLive, 'FORBIDDEN', 'live personel reply avoids raw FORBIDDEN');
mustNot(replyLive, 'Bu ekranda seçili servis bilgisi net görünmüyor', 'live personel reply avoids no-selection fallback');
must(replyLive, '34ABC123', 'live personel reply keeps vehicle plate');
mustAny(replyLive, ['konum sinyali', 'Çevrim Dışı', 'OFFLINE', 'eski'], 'live personel reply keeps gps state');
mustAny(replyLive, ['Son GPS', '11dk'], 'live personel reply keeps last gps');
mustAny(replyLive, ['Durak A'], 'live personel reply keeps next stop');
mustAny(replyLive, ['Tahmini varış süresi 0 dk', 'Tahmini varış süresi', 'Kalan durak 3'], 'live personel reply keeps ETA');
must(replyLive, 'Sürücünün telefonundan konum sinyali', 'live personel reply keeps driver phone gps wording');
mustAny(replyLive, ['araç bağlantısını', 'görev bağlantısını'], 'live personel reply keeps connection controls');
assertNoForbiddenVisibleTerms(replyLive, 'live personel reply');
const liveChips = chipList(responseLive);
mustArrayContains(liveChips, 'Son konum bilgisi ne zaman geldi?', 'live personel chips keep last gps chip');
mustArrayContains(liveChips, 'Araç nerede?', 'live personel chips keep vehicle chip');
mustArrayContains(liveChips, 'Servis durumu ne?', 'live personel chips keep service status chip');
mustArrayContains(liveChips, 'Sürücünün telefonundan konum sinyali devrede mi?', 'live personel chips keep driver phone gps chip');
mustArrayNotContains(liveChips, 'Bu ekranı detaylı anlat', 'live personel chips avoid generic screen explainer');
mustArrayNotContains(liveChips, 'Bunu sor', 'live personel chips avoid generic ask chip');
mustArrayNotContains(liveChips, 'Aynı kayıt için devam et', 'live personel chips avoid continuation chip');
mustArrayNotContains(liveChips, 'Ekran rehberini aç', 'live personel chips avoid guide chip');
mustArrayNotContains(liveChips, 'İlgili durumu sor', 'live personel chips avoid generic follow-up chip');
const policyPersonelChips = workflowTopicChipSet({ screenPath: '/personel/live', activeTopic: 'OPEN', questionType: 'OPEN' });
mustArrayContains(policyPersonelChips, 'Araç nerede?', 'policy personel chips keep vehicle chip');
mustArrayContains(policyPersonelChips, 'Son konum bilgisi ne zaman geldi?', 'policy personel chips keep last gps chip');
mustArrayContains(policyPersonelChips, 'Servis durumu ne?', 'policy personel chips keep service status chip');
mustArrayContains(policyPersonelChips, 'Sürücünün telefonundan konum sinyali devrede mi?', 'policy personel chips keep driver phone gps chip');
mustArrayNotContains(policyPersonelChips, 'Bu ekranı detaylı anlat', 'policy personel chips avoid generic screen explainer');

const noSelectionFixture = buildPersonelFixture({
  selectedRecord: null,
  selectedEntityType: '',
  selectedEntityId: null,
  helpContextSummary: 'Şu an: Canlı',
  contextSummary: 'Şu an: Canlı',
  selectedFields: [],
  selectedBadges: [],
  extraFacts: {},
});
const resolvedNoSelection = await resolveChatContext({
  entityType: 'screen',
  entityId: Number(personelScreen.id),
  user: personelUser,
  screenContext: noSelectionFixture,
  conversationState: { recentMessages: [] },
});
const noSelectionResponse = buildResponse({
  entityId: Number(personelScreen.id),
  user: personelUser,
  message: intent,
  context: resolvedNoSelection.context,
  entityLabel: resolvedNoSelection.entityLabel,
  scope: resolvedNoSelection.scope,
  conversationState: { recentMessages: [{ role: 'user', text: intent }] },
  screenContext: noSelectionFixture,
  screenDefinition: personelScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(personelScreen.id),
  resolvedEntityType: resolvedNoSelection.resolvedEntityType,
  resolvedEntityId: resolvedNoSelection.resolvedEntityId,
});
const noSelectionReply = replyText(noSelectionResponse);
mustNotRaw(noSelectionReply, 'FORBIDDEN', 'no-selection reply avoids raw FORBIDDEN');
must(noSelectionReply, 'Bu ekranda seçili servis bilgisi net görünmüyor', 'no-selection reply keeps safe fallback');
mustNot(noSelectionReply, 'Bunu anlayamadım', 'no-selection reply avoids understand fallback');
const noSelectionChips = chipList(noSelectionResponse);
mustArrayContains(noSelectionChips, 'Son konum bilgisi ne zaman geldi?', 'no-selection reply keeps gps chips');
mustArrayNotContains(noSelectionChips, 'Bu ekranı detaylı anlat', 'no-selection reply avoids generic explainer');

const rawForbiddenError = makeHttpError(403, { error: { code: 'FORBIDDEN', message: 'Forbidden' } });
mustNotRaw(rawForbiddenError.message, 'FORBIDDEN', 'makeHttpError sanitizes forbidden message');
mustNotRaw(rawForbiddenError.message, 'Forbidden', 'makeHttpError avoids raw forbidden message');
mustAny(rawForbiddenError.message, ['erişim görünmüyor', 'rolde erişim görünmüyor'], 'makeHttpError returns safe forbidden message');
mustNotRaw(String(rawForbiddenError.code || ''), 'FORBIDDEN', 'makeHttpError sanitizes forbidden code');

const rawForbiddenTextError = makeHttpError(403, 'FORBIDDEN');
mustNotRaw(rawForbiddenTextError.message, 'FORBIDDEN', 'makeHttpError sanitizes raw forbidden text');
mustAny(rawForbiddenTextError.message, ['erişim görünmüyor', 'rolde erişim görünmüyor'], 'makeHttpError sanitizes raw forbidden text message');

const forbiddenInfo = getApiErrorInfo(rawForbiddenError);
mustAny(forbiddenInfo.message, ['erişim görünmüyor', 'rolde erişim görünmüyor'], 'getApiErrorInfo returns safe forbidden message');
mustNotRaw(String(forbiddenInfo.code || ''), 'FORBIDDEN', 'getApiErrorInfo sanitizes forbidden code');

const normalizedBackendError = normalizeError({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' });
mustAny(normalizedBackendError.body.error.message, ['erişim görünmüyor', 'rolde erişim görünmüyor'], 'normalizeError returns safe forbidden message');
mustNotRaw(JSON.stringify(normalizedBackendError.body), 'FORBIDDEN', 'normalizeError body avoids raw forbidden');
mustNotRaw(JSON.stringify(normalizedBackendError.body), 'Forbidden', 'normalizeError body avoids raw forbidden text');

console.log('=== COP-04B-FIX-07 PERSONEL LIVE COPILOT CONTEXT CHECK PASS ===');
