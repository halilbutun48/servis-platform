#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const BANNED_TERMS = [
  'ETA',
  'GPS',
  'offline',
  'stale',
  'fallback',
  'selected record',
  'safe alternative',
  'Güvenli alternatif',
  'active segment',
  'completed segment',
  'live decision',
  'route binding',
  'task-state',
  'root cause',
  'diagnostic',
  'risk scoring',
  'intent',
  'chip',
  'workflow',
  'screen purpose',
  'next best action',
  'current step',
  'context',
  'status',
  'warning',
  'error',
  'blocker',
  'assignment',
  'Son GPS',
  'GPS: Çevrim dışı',
  'ETA: hesaplanamıyor',
  'canlı karar',
  'rota bağı',
];

const RAW_ROLE_PATTERNS = [
  ['COMPANY', /(^|[^A-Z0-9])COMPANY(?=$|[^A-Z0-9])/i],
  ['ROOM', /(^|[^A-Z0-9])ROOM(?=$|[^A-Z0-9])/i],
  ['Oda', /(^|[^\p{L}])Oda(?=$|[^\p{L}])/iu],
  ['Şirket', /(^|[^\p{L}])Şirket(?=$|[^\p{L}])/iu],
  ['İnsan onayı', /(^|[^\p{L}])İnsan onayı(?=$|[^\p{L}])/iu],
  ['human approval', /(^|[^\p{L}])human approval(?=$|[^\p{L}])/iu],
  ['human confirmation', /(^|[^\p{L}])human confirmation(?=$|[^\p{L}])/iu],
];

const ROLE_CONFIGS = [
  {
    role: 'SUPER_ADMIN',
    companyKind: '',
    surfaces: ['/superadmin/operations', '/superadmin/commercial-core', '/superadmin/trust-quality', '/superadmin/telematics'],
  },
  {
    role: 'COMPANY',
    companyKind: '',
    surfaces: ['/company/operations', '/company/agreements', '/company/shifts', '/company/commercial-flow'],
  },
  {
    role: 'ROOM',
    companyKind: '',
    surfaces: ['/room/map', '/room/shifts', '/room/vehicles', '/room/operation-health'],
  },
  {
    role: 'DRIVER',
    companyKind: '',
    surfaces: ['/driver/route', '/driver/today'],
  },
  {
    role: 'PERSONEL',
    companyKind: '',
    surfaces: ['/personel/live', '/personel/my'],
  },
  {
    role: 'PARENT',
    companyKind: '',
    surfaces: ['/parent/live'],
  },
  {
    role: 'SCHOOL',
    companyKind: 'SCHOOL',
    surfaces: ['/school/operations'],
  },
  {
    role: 'ORGANIZATION',
    companyKind: 'ORGANIZATION',
    surfaces: ['/organization/operations'],
  },
];

const THEMES = [
  {
    key: 'gps-eta',
    label: 'GPS Durumu',
    menuPurpose: 'GPS ve ETA özeti',
    firstStep: 'GPS sinyalini ve ETA bilgisini aç.',
    nextStep: 'Son GPS ve ETA satırını kontrol et.',
    selectedLabel: 'Son GPS',
    selectedSummary: 'GPS: Çevrim dışı • ETA: hesaplanamıyor',
    selectedRecordStatus: 'GPS: Çevrim dışı',
    helpMessage: 'GPS offline mı, ETA neden hesaplanamıyor?',
    assistantMessage: 'GPS offline ve ETA hesaplanamıyor.',
    rawReply: 'Araç: 34ABC123 • GPS: Çevrim dışı • Son GPS: 21 sa önce • ETA: hesaplanamıyor.',
    questionType: 'WHY_BLOCKED',
    helpAnchors: ['Konum sinyali', 'Tahmini varış süresi', 'son konum bilgisi'],
    assistantAnchors: ['Konum sinyali', 'Tahmini varış süresi', 'son konum bilgisi'],
  },
  {
    key: 'selected-record-fallback',
    label: 'Selected Record',
    menuPurpose: 'selected record fallback özeti',
    firstStep: 'selected record alanını aç.',
    nextStep: 'safe alternative yerine önce şunu kontrol et.',
    selectedLabel: 'selected record',
    selectedSummary: 'fallback',
    selectedRecordStatus: 'fallback',
    helpMessage: 'selected record neden boş?',
    assistantMessage: 'selected record fallback görünüyor.',
    rawReply: 'selected record için safe alternative ve fallback gerekiyor.',
    questionType: 'SCREEN_EXPLANATION_HELP',
    helpAnchors: ['Seçili kayıt', 'Yedek', 'Önce şunu kontrol et'],
    assistantAnchors: ['Seçili kayıt', 'Yedek', 'Önce şunu kontrol et'],
  },
  {
    key: 'root-cause-diagnostic',
    label: 'Root Cause',
    menuPurpose: 'root cause diagnostic özeti',
    firstStep: 'root cause kontrolünü aç.',
    nextStep: 'diagnostic açıklamasını oku.',
    selectedLabel: 'root cause satırı',
    selectedSummary: 'diagnostic context',
    selectedRecordStatus: 'context',
    helpMessage: 'root cause neden görünmüyor?',
    assistantMessage: 'root cause diagnostic context',
    rawReply: 'root cause diagnostic context',
    questionType: 'ROOT_CAUSE',
    expectAssistantField: 'rootCauseReply',
    helpAnchors: ['Olası ana neden', 'Sorun kontrolü', 'Bağlam'],
    assistantAnchors: ['Olası ana neden', 'Sorun kontrolü', 'Bağlam'],
  },
  {
    key: 'risk-scoring-status',
    label: 'Risk Scoring',
    menuPurpose: 'risk scoring status özeti',
    firstStep: 'risk scoring kontrolünü aç.',
    nextStep: 'status warning error blocker sinyallerini sırala.',
    selectedLabel: 'risk scoring',
    selectedSummary: 'warning error blocker',
    selectedRecordStatus: 'status warning',
    helpMessage: 'risk scoring neden yükseldi?',
    assistantMessage: 'risk scoring status warning error blocker',
    rawReply: 'risk scoring status warning error blocker',
    questionType: 'RISK_LIST',
    expectAssistantField: 'riskScoringReply',
    helpAnchors: ['Risk değerlendirmesi', 'Durum', 'Uyarı', 'Hata', 'Engel'],
    assistantAnchors: ['Risk değerlendirmesi', 'Durum', 'Uyarı', 'Hata', 'Engel'],
  },
  {
    key: 'workflow-task-state',
    label: 'Workflow',
    menuPurpose: 'workflow task-state özeti',
    firstStep: 'workflow akışını aç.',
    nextStep: 'current step ve next best action satırını oku.',
    selectedLabel: 'task-state',
    selectedSummary: 'current step',
    selectedRecordStatus: 'task-state',
    helpMessage: 'workflow task-state neden ilerlemiyor?',
    assistantMessage: 'workflow task-state current step next best action',
    rawReply: 'workflow task-state current step next best action',
    questionType: 'NEXT_STEP',
    helpAnchors: ['İşlem akışı', 'Geçerli adım', 'Sıradaki en doğru adım'],
    assistantAnchors: ['İşlem akışı', 'Geçerli adım', 'Sıradaki en doğru adım'],
  },
  {
    key: 'screen-purpose-chip',
    label: 'Screen Purpose',
    menuPurpose: 'screen purpose chip özeti',
    firstStep: 'screen purpose alanını aç.',
    nextStep: 'chip listesini incele.',
    selectedLabel: 'screen purpose',
    selectedSummary: 'chip',
    selectedRecordStatus: 'chip',
    helpMessage: 'screen purpose bu ekran ne işe yarıyor?',
    assistantMessage: 'screen purpose chip',
    rawReply: 'screen purpose chip',
    questionType: 'SCREEN_EXPLANATION_HELP',
    helpAnchors: ['Ekranın amacı', 'Hızlı seçenek'],
    assistantAnchors: ['Ekranın amacı', 'Hızlı seçenek'],
  },
  {
    key: 'route-binding-segment',
    label: 'Route Binding',
    menuPurpose: 'route binding active segment completed segment live decision özeti',
    firstStep: 'route binding satırını aç.',
    nextStep: 'active segment ve completed segment kontrol et.',
    selectedLabel: 'route binding',
    selectedSummary: 'active segment completed segment live decision',
    selectedRecordStatus: 'live decision',
    helpMessage: 'route binding neden bozuk?',
    assistantMessage: 'route binding active segment completed segment live decision',
    rawReply: 'route binding active segment completed segment live decision',
    questionType: 'NEXT_STEP',
    helpAnchors: ['Rota bağlantısı', 'Sıradaki yol bölümü', 'Tamamlanan yol bölümü', 'Anlık operasyon kararı'],
    assistantAnchors: ['Rota bağlantısı', 'Sıradaki yol bölümü', 'Tamamlanan yol bölümü', 'Anlık operasyon kararı'],
  },
  {
    key: 'assignment-context',
    label: 'Assignment',
    menuPurpose: 'assignment ve atama özeti',
    firstStep: 'assignment durumunu aç.',
    nextStep: 'atama ve vardiya durumunu kontrol et.',
    selectedLabel: 'assignment',
    selectedSummary: 'atama',
    selectedRecordStatus: 'assignment',
    helpMessage: 'assignment neden görünmüyor?',
    assistantMessage: 'assignment task-state status',
    rawReply: 'assignment task-state status',
    questionType: 'ROLE_EXPLANATION_HELP',
    helpAnchors: ['Atama', 'Durum'],
    assistantAnchors: ['Atama', 'Durum'],
  },
  {
    key: 'intent-context',
    label: 'Intent',
    menuPurpose: 'intent context özeti',
    firstStep: 'intent ve context içeriğini aç.',
    nextStep: 'status warning error blocker sinyallerini oku.',
    selectedLabel: 'intent',
    selectedSummary: 'context',
    selectedRecordStatus: 'status',
    helpMessage: 'intent burada ne anlama geliyor?',
    assistantMessage: 'intent context status warning error blocker',
    rawReply: 'intent context status warning error blocker',
    questionType: 'STATUS_HELP',
    helpAnchors: ['Kullanıcının isteği', 'Bağlam', 'Durum', 'Uyarı', 'Hata', 'Engel'],
    assistantAnchors: ['Kullanıcının isteği', 'Bağlam', 'Durum', 'Uyarı', 'Hata', 'Engel'],
  },
  {
    key: 'next-best-action-safe-alternative',
    label: 'Next Best Action',
    menuPurpose: 'next best action current step screen purpose özeti',
    firstStep: 'next best action ve current step kontrol et.',
    nextStep: 'safe alternative yerine önce şunu kontrol et.',
    selectedLabel: 'next best action',
    selectedSummary: 'current step screen purpose',
    selectedRecordStatus: 'safe alternative',
    helpMessage: 'next best action ne?',
    assistantMessage: 'next best action current step screen purpose safe alternative',
    rawReply: 'next best action current step screen purpose safe alternative',
    questionType: 'NEXT_BEST_ACTION',
    helpAnchors: ['Sıradaki en doğru adım', 'Geçerli adım', 'Ekranın amacı', 'Önce şunu kontrol et'],
    assistantAnchors: ['Sıradaki en doğru adım', 'Geçerli adım', 'Ekranın amacı', 'Önce şunu kontrol et'],
  },
];

let runtimeCases = 0;
let testedCases = 0;
let passCount = 0;
let failCount = 0;

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
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

function flattenStrings(value) {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => flattenStrings(item));
  if (typeof value === 'object') return Object.values(value).flatMap((item) => flattenStrings(item));
  return [];
}

function uniqueStrings(values) {
  return [...new Set(flattenStrings(values).map((value) => String(value || '').trim()).filter(Boolean))];
}

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function makeSurfaceFixture({
  path: screenPath,
  label,
  menuPurpose = '',
  firstStep = '',
  nextStep = '',
  selectedLabel = '',
  selectedSummary = '',
  selectedRecordStatus = 'aktif',
  selectedEntityType = 'screen',
  selectedEntityId = 1,
} = {}) {
  const summary = menuPurpose || `${label} özeti`;
  return {
    screenDefinition: {
      path: screenPath,
      label,
      menuPurpose: summary,
      screenExplanation: summary,
      plainSummary: summary,
      summary,
      firstStep,
      nextStep,
      simpleTerms: [label],
    },
    screenContext: {
      path: screenPath,
      label,
      menuPurpose: summary,
      screenExplanation: summary,
      helpContextSummary: summary,
      contextSummary: summary,
      selectedLabel,
      selectedSummary,
      selectedRecordStatus,
      selectedEntityType,
      selectedEntityId,
      selectedFields: [
        { label: 'Durum', value: selectedRecordStatus || selectedSummary || selectedLabel },
        { label: 'Özet', value: selectedSummary || selectedLabel || selectedRecordStatus || summary },
      ].filter((row) => Boolean(row.value)),
      selectedBadges: selectedRecordStatus ? [{ label: 'Durum', value: selectedRecordStatus }] : [],
      structuredFacts: {
        reasoningLead: summary,
        nextBestAction: nextStep || firstStep || 'İlk kontrolü aç.',
        selectedRecordStatus: selectedRecordStatus || selectedSummary || selectedLabel || '',
        selectedRecordSummary: selectedSummary || selectedLabel || '',
        helpContextSummary: summary,
        contextSummary: summary,
      },
    },
  };
}

function buildHelpResponse({ role, companyKind = '', fixture, message }) {
  const user = makeUser(role, companyKind);
  const entityId = Number(fixture?.screenContext?.selectedEntityId || 1) || 1;
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId,
    user,
    message,
    context: { type: 'screen' },
    entityLabel: fixture?.screenContext?.label || '',
    scope: { roleMode: 'OPERATIONS', role: user.role },
    conversationState: null,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
    sourceEntityType: 'screen',
    sourceEntityId: entityId,
    sourceScreenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
  });
}

function buildAssistantResponse({ role, companyKind = '', fixture, message, questionType, rawReply = 'Temel cevap.' }) {
  const user = makeUser(role, companyKind);
  const menuPurpose = fixture?.screenDefinition?.menuPurpose || '';
  const nextStep = fixture?.screenDefinition?.nextStep || '';
  return buildSeferAbiReasoningAssistant({
    rawReply,
    message,
    questionType,
    replyMode: 'SHORT',
    guide: {
      plainSummary: menuPurpose,
      summary: menuPurpose,
      screenExplanation: menuPurpose,
      whatToDoNow: fixture?.screenDefinition?.firstStep || 'İlk kontrolü aç.',
      whatToDoNext: nextStep || 'Sonraki adımı aç.',
      whyBlocked: '',
      doNotDo: '',
    },
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: fixture?.screenContext?.path || '',
    screenDefinition: fixture?.screenDefinition || null,
    screenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    analysis: {
      reasoningLead: menuPurpose,
      nextBestAction: nextStep,
      safestNextStep: nextStep,
      selectedRecordStatus: fixture?.screenContext?.selectedRecordStatus || fixture?.screenContext?.selectedSummary || fixture?.screenContext?.selectedLabel || '',
      compareHint: '',
      blockers: [],
      missingData: [],
      evidence: [],
    },
    contextPriority: {
      summaryLead: menuPurpose,
      bestNextAction: nextStep,
      selectedRecordMismatchLead: fixture?.screenContext?.selectedRecordStatus || fixture?.screenContext?.selectedSummary || fixture?.screenContext?.selectedLabel || '',
      evidenceConfidence: '',
      roleBoundary: '',
      needsSelection: false,
      sameRecordLikely: Boolean(fixture?.screenContext?.selectedLabel || fixture?.screenContext?.selectedSummary),
      activeTopic: questionType,
      activeTopicLabel: fixture?.screenContext?.label || '',
      followUpPrompt: '',
    },
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
}

function helpVisibleStrings(help) {
  return uniqueStrings([
    help?.reply,
    help?.summary,
    help?.contextSummary,
    help?.questionLabel,
    help?.followUpPrompt,
    help?.actionPlanLabel,
    help?.bestNextAction,
    help?.activeTopicLabel,
    help?.roleBoundary,
    help?.selectedRecordLabel,
    help?.selectedRecordSummary,
    help?.selectedRecordStatus,
    help?.selectedFieldLines,
    help?.selectedBadgeLines,
    help?.selectedSignalLines,
    help?.suggestedChips,
    help?.quickActions?.map((row) => ({ label: row?.label, reason: row?.reason, askText: row?.askText, copyText: row?.copyText })),
    help?.linkedGuides?.map((row) => ({ label: row?.label, reason: row?.reason })),
    help?.responseSections?.map((row) => ({
      title: row?.title,
      text: row?.text,
      hint: row?.hint,
      items: row?.items,
    })),
    help?.routePlan ? {
      summary: help.routePlan.summary,
      primaryRouteLabel: help.routePlan.primaryRouteLabel,
      secondaryRouteLabel: help.routePlan.secondaryRouteLabel,
      steps: help.routePlan.steps,
    } : null,
    help?.uncertaintyMeta ? {
      label: help.uncertaintyMeta.label,
      summary: help.uncertaintyMeta.summary,
      verifyText: help.uncertaintyMeta.verifyText,
    } : null,
    help?.reasoningAssistant ? {
      reply: help.reasoningAssistant.reply,
      summary: help.reasoningAssistant.summary,
      assistantReply: help.reasoningAssistant.assistantReply,
      boundaryText: help.reasoningAssistant.boundaryText,
      clarifyingQuestion: help.reasoningAssistant.clarifyingQuestion,
      safeAlternative: help.reasoningAssistant.safeAlternative,
      nextBestAction: help.reasoningAssistant.nextBestAction,
      rootCauseReply: help.reasoningAssistant.rootCauseReply,
      riskScoringReply: help.reasoningAssistant.riskScoringReply,
      smartDiagnosticReply: help.reasoningAssistant.smartDiagnosticReply,
      selectedFieldLines: help.reasoningAssistant.selectedFieldLines,
      selectedBadgeLines: help.reasoningAssistant.selectedBadgeLines,
      selectedSignalLines: help.reasoningAssistant.selectedSignalLines,
      suggestedChips: help.reasoningAssistant.suggestedChips,
      rootCauseChips: help.reasoningAssistant.rootCauseChips,
      riskScoringChips: help.reasoningAssistant.riskScoringChips,
      smartDiagnosticChips: help.reasoningAssistant.smartDiagnosticChips,
    } : null,
  ]);
}

function assistantVisibleStrings(assistant) {
  return uniqueStrings([
    assistant?.reply,
    assistant?.summary,
    assistant?.assistantReply,
    assistant?.boundaryText,
    assistant?.clarifyingQuestion,
    assistant?.safeAlternative,
    assistant?.nextBestAction,
    assistant?.reasoningLead,
    assistant?.rootCauseReply,
    assistant?.riskScoringReply,
    assistant?.smartDiagnosticReply,
    assistant?.selectedRecordLabel,
    assistant?.selectedRecordSummary,
    assistant?.selectedRecordStatus,
    assistant?.selectedFieldLines,
    assistant?.selectedBadgeLines,
    assistant?.selectedSignalLines,
    assistant?.suggestedChips,
    assistant?.rootCauseChips,
    assistant?.riskScoringChips,
    assistant?.smartDiagnosticChips,
  ]);
}

function findBlockedTerms(text) {
  const haystack = normalize(text);
  const hits = [];
  for (const term of BANNED_TERMS) {
    const normalized = normalize(term);
    if (!normalized) continue;
    if (normalized === 'eta') {
      if (/(^|[^a-z0-9])eta([^a-z0-9]|$)/.test(haystack)) hits.push(term);
      continue;
    }
    if (haystack.includes(normalized)) hits.push(term);
  }
  return [...new Set(hits)];
}

function findRawRoleTerms(text) {
  const value = String(text || '');
  return RAW_ROLE_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([term]) => term);
}

function summarize(values, limit = 220) {
  const text = uniqueStrings(values).join(' | ');
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}

function must(condition, label) {
  if (!condition) {
    failCount += 1;
    throw new Error(`FAIL ${label}`);
  }
}

function mustIncludeAny(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  const haystack = normalize(text);
  must(list.some((needle) => haystack.includes(normalize(needle))), `${label} missing any of ${list.join(' / ')}`);
}

function assertNoLeaks(label, values, meta) {
  const haystack = uniqueStrings(values).join(' | ');
  const hits = [...new Set([...findBlockedTerms(haystack), ...findRawRoleTerms(haystack)])];
  must(
    hits.length === 0,
    `${label} blockedTerms found: ${hits.join(' / ') || 'none'} | role=${meta.role} | screen=${meta.screenPath} | question=${meta.question} | actual excerpt=${summarize(values)}`
  );
}

function runCase({ role, companyKind = '', fixtureSource, helpMessage, assistantMessage, assistantQuestionType, helpAnchors, assistantAnchors, expectAssistantField }) {
  const fixture = makeSurfaceFixture(fixtureSource);
  const help = buildHelpResponse({
    role,
    companyKind,
    fixture,
    message: helpMessage,
  });
  const assistant = buildAssistantResponse({
    role,
    companyKind,
    fixture,
    message: assistantMessage,
    questionType: assistantQuestionType,
    rawReply: fixtureSource.rawReply || assistantMessage || 'Temel cevap.',
  });

  const helpStrings = helpVisibleStrings(help);
  const assistantStrings = assistantVisibleStrings(assistant);

  must(String(help.reply || '').trim().length > 0, 'help reply is non-empty');
  must(String(assistant.reply || '').trim().length > 0, 'assistant reply is non-empty');

  assertNoLeaks('help', helpStrings, {
    role,
    screenPath: fixtureSource.path,
    question: helpMessage,
  });
  assertNoLeaks('assistant', assistantStrings, {
    role,
    screenPath: fixtureSource.path,
    question: assistantMessage,
  });

  mustIncludeAny(helpStrings.join(' | '), helpAnchors, 'help Turkish anchor');
  mustIncludeAny(assistantStrings.join(' | '), assistantAnchors, 'assistant Turkish anchor');

  if (expectAssistantField) {
    must(String(assistant[expectAssistantField] || '').trim().length > 0, `assistant ${expectAssistantField} is non-empty`);
  }
}

function main() {
  console.log('=== SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-01 ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const terminologyDoc = read('docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md');
  const replyShapesSource = read('backend/src/ai/chat/replyShapes.js');
  const sharedTaskStateSource = read('backend/src/ai/chat/conversationTaskStateShared.js');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const roomCompanyGuideSource = read('backend/src/ai/jobGuide/screenCatalog.roomCompany.js');
  const routePanelSource = read('web/src/panels/driver/RoutePanel.jsx');
  const todayPanelSource = read('web/src/panels/driver/TodayPanel.jsx');
  const roomMapPanelSource = read('web/src/panels/room/MapPanel.jsx');

  must(pkg, '"check:seferabiturkishterminology01": "node backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js"', 'package.json exposes terminology audit check');
  must(runner, 'check:seferabiturkishterminology01', 'product extensions runner includes terminology audit');
  must(verifyChain, 'check:seferabiturkishterminology01', 'verify chain exposes terminology audit');
  must(verifyChain, 'node backend\\scripts\\sefer_abi_turkish_user_facing_terminology_01_check.js', 'verify chain includes terminology audit command');
  must(verifyChain, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'verify chain includes terminology audit doc');
  must(guide, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'script guide mentions terminology audit milestone');
  must(guide, 'check:seferabiturkishterminology01', 'script guide exposes terminology audit check');
  must(guide, 'node backend\\scripts\\sefer_abi_turkish_user_facing_terminology_01_check.js', 'script guide includes terminology audit command');
  must(guide, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'script guide includes terminology audit doc');
  must(primer, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'primer mentions terminology audit milestone');
  must(primer, 'check:seferabiturkishterminology01', 'primer exposes terminology audit check');
  must(primer, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'primer links terminology audit doc');
  must(harnessDoc, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'script harness doc lists terminology audit milestone');
  must(harnessDoc, 'check:seferabiturkishterminology01', 'script harness doc lists terminology audit check');
  must(harnessDoc, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'script harness doc lists terminology audit doc');
  must(terminologyDoc, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'terminology doc mentions canonical milestone');
  must(terminologyDoc, 'check:seferabiturkishterminology01', 'terminology doc exposes canonical check');
  must(terminologyDoc, 'ETA → tahmini varış süresi', 'terminology doc documents ETA replacement');
  must(terminologyDoc, 'GPS → konum sinyali / konum bilgisi', 'terminology doc documents GPS replacement');
  must(helpComposerSource, 'normalizeVisibleTerminology', 'helpComposer uses visible terminology normalizer');
  must(sharedTaskStateSource, 'normalizeVisibleTerminology', 'shared task-state helper uses visible terminology normalizer');
  must(replyShapesSource, 'Güvenli alternatif', 'reply shapes keeps safe alternative source mapping');
  must(replyShapesSource, 'Önce şunu kontrol et', 'reply shapes maps safe alternative to Turkish guidance');
  must(replyShapesSource, 'Hızlı seçenek', 'reply shapes maps chip wording to Turkish guidance');
  must(roomCompanyGuideSource, 'Mavi aktif parça', 'room guide keeps blue route explanation');
  must(roomCompanyGuideSource, 'Yeşil parça', 'room guide keeps green route explanation');
  must(routePanelSource, 'Konum sinyali durumu', 'driver route panel uses konum terminology');
  must(todayPanelSource, 'Sürücünün telefonundan konum sinyali', 'driver today panel uses konum terminology');
  must(roomMapPanelSource, 'Konum sinyali', 'room map panel uses konum terminology');

  const cases = [];
  ROLE_CONFIGS.forEach((roleConfig, roleIndex) => {
    THEMES.forEach((theme, themeIndex) => {
      const surfacePath = roleConfig.surfaces[themeIndex % roleConfig.surfaces.length];
      cases.push({
        role: roleConfig.role,
        companyKind: roleConfig.companyKind,
        fixtureSource: {
          path: surfacePath,
          label: theme.label,
          menuPurpose: theme.menuPurpose,
          firstStep: theme.firstStep,
          nextStep: theme.nextStep,
          selectedLabel: theme.selectedLabel,
          selectedSummary: theme.selectedSummary,
          selectedRecordStatus: theme.selectedRecordStatus,
          selectedEntityType: 'screen',
          selectedEntityId: roleIndex * 100 + themeIndex + 1,
          rawReply: theme.rawReply,
        },
        helpMessage: theme.helpMessage,
        assistantMessage: theme.assistantMessage,
        assistantQuestionType: theme.questionType,
        helpAnchors: theme.helpAnchors,
        assistantAnchors: theme.assistantAnchors,
        expectAssistantField: theme.expectAssistantField,
        label: `${roleConfig.role.toLowerCase()}-${theme.key}`,
      });
    });
  });

  runtimeCases = cases.length;

  for (const testCase of cases) {
    testedCases += 1;
    runCase(testCase);
    passCount += 1;
    console.log(`OK ${testCase.label}`);
  }

  testedCases += 1;
  runCase({
    role: 'COMPANY',
    fixtureSource: {
      path: '/company/agreements',
      label: 'ROOM / COMPANY',
      menuPurpose: 'ROOM teklifi için COMPANY onayı ve kullanıcı adımı',
      firstStep: 'ROOM teklifini aç.',
      nextStep: 'COMPANY onayını kontrol et.',
      selectedLabel: 'ROOM teklifi',
      selectedSummary: 'COMPANY onayı bekleniyor',
      selectedRecordStatus: 'İnsan onayı gerekir',
      rawReply: 'ROOM teklifi için COMPANY onayı bekleniyor. İnsan onayı gerekir. Human confirmation olmadan ilerleme.',
    },
    helpMessage: 'ROOM teklifi için COMPANY onayı bekleniyor.',
    assistantMessage: 'ROOM teklifi için COMPANY onayı bekleniyor.',
    assistantQuestionType: 'SCREEN_EXPLANATION_HELP',
    helpAnchors: ['Hizmet Alan Firma', 'Taşımacılık Firması', 'Kullanıcı onayı'],
    assistantAnchors: ['Hizmet Alan Firma', 'Taşımacılık Firması', 'Kullanıcı onayı'],
  });
  passCount += 1;
  console.log('OK role-approval-canonical-presentation');

  must(runtimeCases >= 80, `runtimeCases >= 80 (actual ${runtimeCases})`);
  must(testedCases >= 80, `testedCases >= 80 (actual ${testedCases})`);
  must(passCount === testedCases, `passCount matches testedCases (${passCount}/${testedCases})`);
  must(failCount === 0, `failCount is zero (${failCount})`);

  console.log(`runtimeCases ${runtimeCases}`);
  console.log(`testedCases ${testedCases}`);
  console.log(`passCount ${passCount}`);
  console.log(`failCount ${failCount}`);
  console.log('blockedTerms found: none');
  console.log('PASS SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-01');
  console.log('PASS sefer abi turkish user-facing terminology audit completed');
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error);
  process.exit(1);
}
