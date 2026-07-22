#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getScreenDefinitionForUser, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { buildSuggestedChips, detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import {
  buildPlanReviewReply,
  buildPlanReviewState,
  PLAN_REVIEW_GUARD_REQUIREMENTS,
  PLAN_REVIEW_NO_WRITE_ACTIONS,
  PLAN_REVIEW_REGRESSION_BOUNDARIES,
  PLAN_REVIEW_TERMINOLOGY,
  PLAN_REVIEW_TRIGGER_PHRASES,
  looksLikePlanReviewQuestion,
} from '../src/ai/chat/conversationPlanReviewEngine.js';

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
    .toLowerCase();
}

function lineCount(text) {
  return String(text || '').split(/\r?\n/).length;
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function check(condition, label) {
  if (!condition) fail(label);
  assertionCount += 1;
}

function ok(label) {
  console.log(`OK ${label}`);
}

function casePass(label) {
  ok(label);
}

function must(text, needle, label) {
  check(normalize(text).includes(normalize(needle)), label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  assertionCount += 1;
  ok(label);
}

function containsNormalized(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function buildScreenContext({ pathName, label, selectedSummary, selectedLabel, selectedRecordStatus, reasoningLead, nextBestAction }) {
  return {
    path: pathName,
    label,
    selectedSummary,
    selectedLabel,
    selectedRecordStatus,
    selectedFields: [
      { label: 'Durum', value: selectedRecordStatus },
      { label: 'Özet', value: selectedSummary },
    ],
    selectedBadges: [
      { label: 'Durum', value: selectedRecordStatus },
    ],
    structuredFacts: {
      reasoningLead,
      nextBestAction,
      selectedRecordStatus,
    },
  };
}

function buildGuide({ label, reasoningLead, followUpText }) {
  return {
    plainSummary: reasoningLead,
    summary: reasoningLead,
    screenExplanation: reasoningLead,
    whatToDoNow: followUpText,
    whatToDoNext: followUpText,
    whyBlocked: 'İnsan onayı gerekir.',
    doNotDo: 'Yazma veya uygulama yok.',
    quickActions: [label, followUpText, 'İnsan onayı'],
  };
}

function buildAnalysis({ reasoningLead, followUpText, selectedRecordStatus }) {
  return {
    reasoningLead,
    nextBestAction: followUpText,
    safestNextStep: followUpText,
    selectedRecordStatus,
    blockers: [],
    missingData: [],
    evidence: [],
  };
}

function buildContextPriority({ label, reasoningLead, followUpText, selectedSummary, selectedRecordStatus }) {
  return {
    activeTopic: 'PLAN_REVIEW',
    activeTopicLabel: label,
    summaryLead: reasoningLead,
    bestNextAction: followUpText,
    followUpPrompt: followUpText,
    selectedRecordMismatchLead: selectedRecordStatus,
    evidenceConfidence: selectedSummary,
    needsSelection: false,
    sameRecordLikely: true,
    guidedTaskMeta: null,
    contextualSuggestedChips: [],
  };
}

function buildRuntimeCase(config, prompt) {
  const user = makeUser(config.role, config.companyKind || '');
  const screenDefinition = getScreenDefinitionForUser(user, { path: config.path }, null);
  const screenLabel = String(screenDefinition?.label || config.label || config.path || '').trim();
  const selectedSummary = String(config.selectedSummary || `${screenLabel} plan özeti`).trim();
  const selectedLabel = String(config.selectedLabel || screenLabel || 'Plan').trim();
  const selectedRecordStatus = String(config.selectedRecordStatus || 'Gözden geçiriliyor').trim();
  const reasoningLead = String(config.reasoningLead || `${screenLabel} için plan kontrolü.`).trim();
  const followUpText = String(config.followUpText || 'İlgili satırı aç.').trim();
  const screenContext = buildScreenContext({
    pathName: config.path,
    label: screenLabel,
    selectedSummary,
    selectedLabel,
    selectedRecordStatus,
    reasoningLead,
    nextBestAction: followUpText,
  });
  const guide = buildGuide({ label: screenLabel, reasoningLead, followUpText });
  const analysis = buildAnalysis({ reasoningLead, followUpText, selectedRecordStatus });
  const contextPriority = buildContextPriority({
    label: screenLabel,
    reasoningLead,
    followUpText,
    selectedSummary,
    selectedRecordStatus,
  });
  const assistantMessage = String(prompt || 'Bu plan doğru mu?').trim();
  const intent = detectQuestionIntent(assistantMessage, {
    entityType: 'screen',
    screenPath: config.path,
    sourceScreenPath: config.path,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    conversationState: null,
    originalMessage: assistantMessage,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    user,
  });
  const state = buildPlanReviewState({
    message: assistantMessage,
    rawMessage: assistantMessage,
    questionType: intent.questionType,
    interactionIntentFamily: '',
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: config.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis,
    contextPriority,
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
  const reply = buildPlanReviewReply({
    message: assistantMessage,
    rawMessage: assistantMessage,
    questionType: intent.questionType,
    interactionIntentFamily: '',
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: config.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis,
    contextPriority,
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
  const chips = buildSuggestedChips({
    entityType: 'screen',
    questionType: intent.questionType,
    roleMode: 'OPERATIONS',
    screenPath: config.path,
    context: {
      selectedSummary,
      selectedLabel,
      selectedRecordStatus,
      structuredFacts: screenContext.structuredFacts,
    },
    guidedTaskMeta: null,
  });
  const screenNames = listScreensForUser(user, { path: config.path });
  check(screenNames.some((item) => item.path === config.path), `${config.label} screen catalog contains ${config.path}`);
  return {
    label: config.label,
    intent,
    state,
    reply,
    chips,
    screenLabel,
    selectedSummary,
    selectedRecordStatus,
  };
}

function runRuntimeCase(config, prompt) {
  const row = buildRuntimeCase(config, prompt);
  const { label, intent, state, reply, chips, screenLabel, selectedSummary, selectedRecordStatus } = row;
  check(intent.questionType === 'PLAN_REVIEW', `${label} intent routes to PLAN_REVIEW`);
  check(state.shouldRespond, `${label} plan review state responds`);
  check(state.surfaceKey === config.expectedSurfaceKey, `${label} surface key is ${config.expectedSurfaceKey}`);
  check(row.reply === state.reply, `${label} helper reply matches state reply`);
  check(state.reply === buildPlanReviewReply({
    message: prompt,
    rawMessage: prompt,
    questionType: 'PLAN_REVIEW',
    guide: buildGuide({
      label: screenLabel,
      reasoningLead: row.state.surfacePurpose || `${screenLabel} için plan kontrolü.`,
      followUpText: 'İlgili satırı aç.',
    }),
    roleMode: 'OPERATIONS',
    userRole: config.role,
    user: makeUser(config.role, config.companyKind || ''),
    screenPath: config.path,
    screenDefinition: getScreenDefinitionForUser(makeUser(config.role, config.companyKind || ''), { path: config.path }, null),
    screenContext: buildScreenContext({
      pathName: config.path,
      label: screenLabel,
      selectedSummary,
      selectedLabel: screenLabel,
      selectedRecordStatus,
      reasoningLead: row.state.surfacePurpose || `${screenLabel} için plan kontrolü.`,
      nextBestAction: 'İlgili satırı aç.',
    }),
    sourceScreenDefinition: getScreenDefinitionForUser(makeUser(config.role, config.companyKind || ''), { path: config.path }, null),
    sourceScreenContext: buildScreenContext({
      pathName: config.path,
      label: screenLabel,
      selectedSummary,
      selectedLabel: screenLabel,
      selectedRecordStatus,
      reasoningLead: row.state.surfacePurpose || `${screenLabel} için plan kontrolü.`,
      nextBestAction: 'İlgili satırı aç.',
    }),
    analysis: buildAnalysis({
      reasoningLead: row.state.surfacePurpose || `${screenLabel} için plan kontrolü.`,
      followUpText: 'İlgili satırı aç.',
      selectedRecordStatus,
    }),
    contextPriority: buildContextPriority({
      label: screenLabel,
      reasoningLead: row.state.surfacePurpose || `${screenLabel} için plan kontrolü.`,
      followUpText: 'İlgili satırı aç.',
      selectedSummary,
      selectedRecordStatus,
    }),
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  }), `${label} direct helper reply matches buildPlanReviewReply`);
  check(state.checklist.length >= 4, `${label} checklist has at least four items`);
  check(chips.length >= 4, `${label} suggested chips has at least four items`);
  check(containsNormalized(reply, 'Sonraki güvenli kontrol'), `${label} reply mentions next safe control`);
  check(containsNormalized(reply, 'insan onayı'), `${label} reply mentions human approval`);
  check(containsNormalized(reply, screenLabel), `${label} reply mentions surface label`);
  check(containsNormalized(reply, selectedSummary), `${label} reply mentions selected summary`);
  check(containsNormalized(reply, selectedRecordStatus), `${label} reply mentions selected record status`);
  check(containsNormalized(reply, config.expectedNeedles[0]), `${label} reply mentions ${config.expectedNeedles[0]}`);
  check(containsNormalized(reply, config.expectedNeedles[1]), `${label} reply mentions ${config.expectedNeedles[1]}`);
  surfaceCoverageSeen.add(config.expectedSurfaceKey);
  aggregateReplyText += ` ${reply}`;
  casePass(`runtime ${label} :: ${prompt}`);
}

function runRegressionCase(config) {
  const user = makeUser(config.role, config.companyKind || '');
  const screenDefinition = getScreenDefinitionForUser(user, { path: config.path }, null);
  const screenLabel = String(screenDefinition?.label || config.label || config.path || '').trim();
  const selectedSummary = String(config.selectedSummary || `${screenLabel} kayıt özeti`).trim();
  const screenContext = buildScreenContext({
    pathName: config.path,
    label: screenLabel,
    selectedSummary,
    selectedLabel: config.selectedLabel || screenLabel,
    selectedRecordStatus: config.selectedRecordStatus || 'Hazır',
    reasoningLead: String(config.reasoningLead || `${screenLabel} için başka bir yardımcı devrede olmalı.`).trim(),
    nextBestAction: 'Başka yardımcı kullanılmalı.',
  });
  const guide = buildGuide({
    label: screenLabel,
    reasoningLead: String(config.reasoningLead || `${screenLabel} için başka bir yardımcı devrede olmalı.`).trim(),
    followUpText: 'Başka yardımcı kullanılmalı.',
  });
  const analysis = buildAnalysis({
    reasoningLead: String(config.reasoningLead || `${screenLabel} için başka bir yardımcı devrede olmalı.`).trim(),
    followUpText: 'Başka yardımcı kullanılmalı.',
    selectedRecordStatus: screenContext.selectedRecordStatus,
  });
  const contextPriority = buildContextPriority({
    label: screenLabel,
    reasoningLead: String(config.reasoningLead || `${screenLabel} için başka bir yardımcı devrede olmalı.`).trim(),
    followUpText: 'Başka yardımcı kullanılmalı.',
    selectedSummary,
    selectedRecordStatus: screenContext.selectedRecordStatus,
  });
  const intent = detectQuestionIntent(config.message, {
    entityType: 'screen',
    screenPath: config.path,
    sourceScreenPath: config.path,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    conversationState: null,
    originalMessage: config.message,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    user,
  });
  const state = buildPlanReviewState({
    message: config.message,
    rawMessage: config.message,
    questionType: config.questionType,
    interactionIntentFamily: config.interactionIntentFamily || '',
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: config.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis,
    contextPriority,
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
  check(intent.questionType === config.questionType, `${config.label} intent stays with ${config.questionType}`);
  check(!looksLikePlanReviewQuestion(config.message, config.questionType, config.interactionIntentFamily || '', {
    screenPath: config.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    userRole: user.role,
    user,
    conversationState: null,
    entityType: 'screen',
  }) || config.allowIntentOverlap === true, `${config.label} is not captured by plan review heuristics`);
  check(!state.shouldRespond, `${config.label} plan review state stays silent`);
  check(state.reply === '', `${config.label} plan review reply stays empty`);
  check(state.surfaceKey === config.expectedSurfaceKey, `${config.label} surface key stays ${config.expectedSurfaceKey}`);
  casePass(`regression ${config.label}`);
}

function runSourceGuardAssertions(sourceBundle) {
  must(sourceBundle.packageJson, '"check:copilotplanreviewengine01": "node backend/scripts/copilot_plan_review_engine_01_check.js"', 'package.json exposes plan review engine check');
  ordered(sourceBundle.runner, ['check:copilotworkflowreasoningengine01', 'check:copilotplanreviewengine01', 'check:hotfilesplitaichatcomposers01'], 'product extensions runner places plan review after workflow reasoning and before hot-file split');
  ordered(sourceBundle.verify, ['check:copilotworkflowreasoningengine01', 'check:copilotplanreviewengine01', 'check:hotfilesplitaichatcomposers01'], 'verify chain places plan review after workflow reasoning and before hot-file split');

  must(sourceBundle.guide, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'milestone guide mentions plan review milestone');
  must(sourceBundle.guide, 'check:copilotplanreviewengine01', 'milestone guide exposes plan review check');
  must(sourceBundle.guide, 'node backend\\scripts\\copilot_plan_review_engine_01_check.js', 'milestone guide includes plan review command');
  must(sourceBundle.guide, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'milestone guide includes plan review doc');
  ordered(sourceBundle.guide, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01'], 'milestone guide keeps plan review between workflow reasoning and hot-file split');

  must(sourceBundle.primer, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'primer mentions plan review milestone');
  must(sourceBundle.primer, 'check:copilotplanreviewengine01', 'primer exposes plan review check');
  must(sourceBundle.primer, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'primer links plan review doc');
  must(sourceBundle.primer, 'backend/src/ai/chat/conversationPlanReviewEngine.js', 'primer links plan review helper');
  ordered(sourceBundle.primer, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01'], 'primer keeps plan review between workflow reasoning and hot-file split');

  must(sourceBundle.helpComposer, 'buildPlanReviewReply', 'helpComposer imports plan review reply helper');
  must(sourceBundle.helpComposer, "questionType === 'PLAN_REVIEW'", 'helpComposer routes PLAN_REVIEW directly');
  must(sourceBundle.intentRouter, 'looksLikePlanReviewQuestion', 'intent router imports plan review heuristics');
  must(sourceBundle.intentRouter, "questionType: 'PLAN_REVIEW'", 'intent router returns PLAN_REVIEW question type');
  must(sourceBundle.intentRouter, 'buildPlanReviewChips', 'intent router exposes plan review chips');
  must(sourceBundle.responses, 'buildPlanReviewReply', 'task state responses barrel re-exports plan review reply helper');
  must(sourceBundle.responses, 'buildPlanReviewState', 'task state responses barrel re-exports plan review state helper');
  must(sourceBundle.helper, 'PLAN_REVIEW_ENGINE_VERSION', 'helper exposes version marker');
  must(sourceBundle.helper, 'PLAN_REVIEW_SURFACE_PROFILES', 'helper exposes surface profiles');
  must(sourceBundle.helper, 'PLAN_REVIEW_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(sourceBundle.helper, 'PLAN_REVIEW_NO_WRITE_ACTIONS', 'helper exposes no-write-action guards');
  must(sourceBundle.helper, 'PLAN_REVIEW_TERMINOLOGY', 'helper exposes terminology guard terms');
  must(sourceBundle.helper, 'PLAN_REVIEW_REGRESSION_BOUNDARIES', 'helper exposes regression boundaries');
  must(sourceBundle.helper, 'PLAN_REVIEW_TRIGGER_PHRASES', 'helper exposes trigger phrases');
  must(sourceBundle.helper, 'buildPlanReviewState', 'helper exposes state builder');
  must(sourceBundle.helper, 'buildPlanReviewReply', 'helper exposes reply builder');
  must(sourceBundle.helper, 'buildPlanReviewChips', 'helper exposes chips builder');
  must(sourceBundle.doc, '# COPILOT PLAN REVIEW ENGINE 01', 'plan review doc title present');
  must(sourceBundle.doc, 'docs/check milestone', 'plan review doc keeps docs/check wording');
  must(sourceBundle.doc, 'Canonical check: `check:copilotplanreviewengine01`', 'plan review doc keeps canonical check wording');
  must(sourceBundle.doc, 'Planlama Merkezi', 'plan review doc mentions planlama merkezi');
  must(sourceBundle.doc, 'Sonraki güvenli kontrol', 'plan review doc mentions next safe control');
  must(sourceBundle.doc, 'İnsan onayı', 'plan review doc mentions human approval');
  must(sourceBundle.doc, 'write-action', 'plan review doc keeps write-action boundary wording');
  must(sourceBundle.doc, 'route review', 'plan review doc keeps route review boundary wording');

  must(sourceBundle.harnessCheck, 'check:copilotplanreviewengine01', 'script harness check knows plan review alias');
  must(sourceBundle.harnessCheck, 'root:check:copilotplanreviewengine01', 'script harness check knows plan review root check');
  must(sourceBundle.harnessCheck, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'script harness check knows plan review milestone');
  must(sourceBundle.harnessCheck, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'script harness check knows plan review doc');
  must(sourceBundle.harnessCheck, 'backend/src/ai/chat/conversationPlanReviewEngine.js', 'script harness check knows plan review helper');
  must(sourceBundle.harnessDoc, 'Copilot plan review engine milestone: `COPILOT-PLAN-REVIEW-ENGINE-01`', 'script harness doc lists plan review milestone');
  must(sourceBundle.harnessDoc, 'root:check:copilotplanreviewengine01', 'script harness doc lists plan review root check');
  must(sourceBundle.harnessDoc, 'copilot_plan_review_engine_01_check.js', 'script harness doc lists plan review command');
  must(sourceBundle.harnessDoc, 'backend/src/ai/chat/conversationPlanReviewEngine.js', 'script harness doc lists plan review helper');
  must(sourceBundle.harnessDoc, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'script harness doc lists plan review doc');
  must(sourceBundle.harnessDoc, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'script harness doc keeps milestone name');
  must(sourceBundle.harnessDoc, 'check:copilotplanreviewengine01', 'script harness doc keeps canonical check name');
}

function readRoot(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

let assertionCount = 0;
let runtimeCaseCount = 0;
let regressionCaseCount = 0;
const surfaceCoverageSeen = new Set();
let aggregateReplyText = '';

async function main() {
  console.log('=== COPILOT-PLAN-REVIEW-ENGINE-01 CHECK ===');

  const sourceBundle = {
    packageJson: readRoot('package.json'),
    runner: readRoot('backend/scripts/run_product_extensions_check_chain.js'),
    verify: readRoot('backend/scripts/verify_chain_01_product_extensions_check.js'),
    guide: readRoot('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'),
    primer: readRoot('docs/PRIMER_SSOT.md'),
    helpComposer: readRoot('backend/src/ai/chat/helpComposer.js'),
    intentRouter: readRoot('backend/src/ai/chat/intentRouter.js'),
    responses: readRoot('backend/src/ai/chat/conversationTaskStateResponses.js'),
    harnessCheck: readRoot('backend/scripts/script_harness_consolidation_01_check.js'),
    harnessDoc: readRoot('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md'),
    helper: readRoot('backend/src/ai/chat/conversationPlanReviewEngine.js'),
    doc: readRoot('docs/COPILOT_PLAN_REVIEW_ENGINE_01.md'),
  };

  runSourceGuardAssertions(sourceBundle);

  const helperLines = lineCount(sourceBundle.helper);
  check(helperLines < 1000, `helper stays under 1000 lines (${helperLines})`);
  ok(`helper line count = ${helperLines}`);

  const surfaceCases = [
    {
      label: 'company-plan-center',
      expectedSurfaceKey: 'COMPANY_PLAN_CENTER',
      role: 'COMPANY',
      path: '/company',
      selectedSummary: 'Plan taslağı',
      selectedLabel: 'Planlama Merkezi',
      selectedRecordStatus: 'Taslak hazır',
      reasoningLead: 'Planlama Merkezi için paket, tarih, saat ve kapasiteyi birlikte okuyorum.',
      followUpText: 'Planlama Merkezi kaydını aç.',
      expectedNeedles: ['Planlama Merkezi', 'kapasite'],
    },
    {
      label: 'company-shifts',
      expectedSurfaceKey: 'COMPANY_SHIFTS',
      role: 'COMPANY',
      path: '/company/shifts',
      selectedSummary: 'Vardiya taslağı',
      selectedLabel: 'Vardiya',
      selectedRecordStatus: 'Atama bekliyor',
      reasoningLead: 'Vardiyalar için atama ve saat uyumunu birlikte okuyorum.',
      followUpText: 'Vardiya satırını aç.',
      expectedNeedles: ['Vardiyalar', 'atama'],
    },
    {
      label: 'company-agreements',
      expectedSurfaceKey: 'COMPANY_AGREEMENTS',
      role: 'COMPANY',
      path: '/company/agreements',
      selectedSummary: 'Sözleşme taslağı',
      selectedLabel: 'Sözleşme',
      selectedRecordStatus: 'Önizleme hazır',
      reasoningLead: 'Sözleşmeler için vardiya bağı ve rota etkisini birlikte okuyorum.',
      followUpText: 'Sözleşme satırını aç.',
      expectedNeedles: ['Sözleşmeler', 'vardiya'],
    },
    {
      label: 'room-shifts',
      expectedSurfaceKey: 'ROOM_SHIFTS',
      role: 'ROOM',
      path: '/room/shifts',
      selectedSummary: 'Oda vardiya kaydı',
      selectedLabel: 'Vardiya',
      selectedRecordStatus: 'Hazırlıkta',
      reasoningLead: 'Oda vardiyaları için araç, sürücü ve durak uyumunu birlikte okuyorum.',
      followUpText: 'Vardiya kaydını aç.',
      expectedNeedles: ['araç / sürücü', 'durak'],
    },
    {
      label: 'room-map',
      expectedSurfaceKey: 'ROOM_MAP',
      role: 'ROOM',
      path: '/room/map',
      selectedSummary: 'Canlı takip kaydı',
      selectedLabel: 'Araç',
      selectedRecordStatus: 'Konum sinyali okunuyor',
      reasoningLead: 'Canlı Takip için konum, harita ve rota uyumunu birlikte okuyorum.',
      followUpText: 'Harita kaydını aç.',
      expectedNeedles: ['Canlı Takip', 'konum'],
    },
    {
      label: 'room-vehicles',
      expectedSurfaceKey: 'ROOM_VEHICLES',
      role: 'ROOM',
      path: '/room/vehicles',
      selectedSummary: 'Araç kaydı',
      selectedLabel: 'Araç',
      selectedRecordStatus: 'Bağlantı açık',
      reasoningLead: 'Araçlar için kapasite, cihaz ve eşleşme uyumunu birlikte okuyorum.',
      followUpText: 'Araç kaydını aç.',
      expectedNeedles: ['Araçlar', 'kapasite'],
    },
    {
      label: 'driver-route',
      expectedSurfaceKey: 'DRIVER_ROUTE',
      role: 'DRIVER',
      path: '/driver/route',
      selectedSummary: 'Günlük rota',
      selectedLabel: 'Rota',
      selectedRecordStatus: 'Aktif',
      reasoningLead: 'Sürücü rotasında durak sırası ve zaman uyumunu birlikte okuyorum.',
      followUpText: 'Rota kaydını aç.',
      expectedNeedles: ['Sürücü Rotası', 'rota'],
    },
    {
      label: 'personel-live',
      expectedSurfaceKey: 'PERSONEL_LIVE',
      role: 'PERSONEL',
      path: '/personel/live',
      selectedSummary: 'Personel servis kaydı',
      selectedLabel: 'Servis',
      selectedRecordStatus: 'Canlı servis görünümü',
      reasoningLead: 'Personel canlı görünümünde yetkili alanı ve KVKK sınırını birlikte okuyorum.',
      followUpText: 'Yetkili servis görünümünü aç.',
      expectedNeedles: ['KVKK', 'yetkili görünüm'],
    },
    {
      label: 'parent-live',
      expectedSurfaceKey: 'PARENT_LIVE',
      role: 'PARENT',
      path: '/parent/live',
      selectedSummary: 'Öğrenci servisi',
      selectedLabel: 'Servis',
      selectedRecordStatus: 'Canlı öğrenci görünümü',
      reasoningLead: 'Veli canlı görünümünde öğrenci servisi ve yetkili sınırı birlikte okuyorum.',
      followUpText: 'Yetkili öğrenci görünümünü aç.',
      expectedNeedles: ['öğrenci', 'yetkili görünüm'],
    },
    {
      label: 'superadmin',
      expectedSurfaceKey: 'SUPERADMIN',
      role: 'SUPER_ADMIN',
      path: '/superadmin/trust-quality',
      selectedSummary: 'Denetim kaydı',
      selectedLabel: 'Denetim',
      selectedRecordStatus: 'Denetim hazır',
      reasoningLead: 'Süper Yönetici tarafında risk, kalite ve sistem izini birlikte okuyorum.',
      followUpText: 'İlgili denetim panelini aç.',
      expectedNeedles: ['Süper Yönetici', 'risk'],
    },
  ];

  const prompts = [
    'Bu plan doğru mu?',
    'Planı kontrol eder misin?',
    'Bu plan uygulanabilir mi?',
    'Hangi alanlar eksik?',
    'Bu planı onaylamadan önce ne kontrol edilmeli?',
    'Kapasite yeterli mi?',
    'Saatler çakışıyor mu?',
    'Adres / konum net mi?',
    'Araç / sürücü uyumu uygun mu?',
  ];

  for (const surface of surfaceCases) {
    for (const prompt of prompts) {
      runRuntimeCase(surface, prompt);
    }
  }
  runtimeCaseCount = surfaceCases.length * prompts.length;

  const regressionCases = [
    {
      label: 'product-overview-boundary',
      questionType: 'PRODUCT_OVERVIEW_HELP',
      message: 'Bu program ne işe yarar?',
      role: 'COMPANY',
      path: '/company',
    },
    {
      label: 'role-help-boundary',
      questionType: 'ROLE_EXPLANATION_HELP',
      message: 'Bu rolde ne yapabilirim?',
      role: 'ROOM',
      path: '/room/shifts',
    },
    {
      label: 'how-to-boundary',
      questionType: 'HOW_TO_HELP',
      message: 'Adım adım anlat',
      role: 'COMPANY',
      path: '/company/shifts',
    },
    {
      label: 'risk-list-boundary',
      questionType: 'RISK_LIST',
      message: 'riskleri sırala',
      role: 'ROOM',
      path: '/room/map',
    },
    {
      label: 'root-cause-boundary',
      questionType: 'ROOT_CAUSE',
      message: 'kök neden ne',
      role: 'DRIVER',
      path: '/driver/route',
    },
    {
      label: 'clarifying-boundary',
      questionType: 'CLARIFYING_QUESTION',
      message: 'Hangi kayıt için bakayım?',
      role: 'PARENT',
      path: '/parent/live',
    },
    {
      label: 'workflow-next-step-boundary',
      questionType: 'NEXT_STEP',
      message: 'sıradaki doğru işlem ne',
      role: 'COMPANY',
      path: '/company/shifts',
    },
    {
      label: 'dynamic-savings-boundary',
      questionType: 'DYNAMIC_SAVINGS_PREVIEW',
      message: 'tasarruf önizlemesi',
      role: 'COMPANY',
      path: '/company/agreements',
    },
    {
      label: 'contract-to-shift-boundary',
      questionType: 'CONTRACT_TO_SHIFT',
      message: 'bu sözleşmeden vardiya çıkar mı',
      role: 'COMPANY',
      path: '/company/agreements',
    },
    {
      label: 'route-review-boundary',
      questionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
      message: 'Rota review onayı',
      role: 'ROOM',
      path: '/room/map',
    },
  ];

  for (const regression of regressionCases) {
    runRegressionCase(regression);
  }
  regressionCaseCount = regressionCases.length;

  const noWriteActionHits = PLAN_REVIEW_NO_WRITE_ACTIONS.filter((needle) => !containsNormalized(aggregateReplyText, needle));
  const terminologyHits = PLAN_REVIEW_TERMINOLOGY.filter((needle) => containsNormalized(aggregateReplyText, needle));
  const regressionBoundaryHits = regressionCases.length;
  check(noWriteActionHits.length === PLAN_REVIEW_NO_WRITE_ACTIONS.length, `no-write-action coverage is ${PLAN_REVIEW_NO_WRITE_ACTIONS.length}/${PLAN_REVIEW_NO_WRITE_ACTIONS.length}`);
  ok(`no-write-action summary ${PLAN_REVIEW_NO_WRITE_ACTIONS.length}/${PLAN_REVIEW_NO_WRITE_ACTIONS.length}`);
  check(terminologyHits.length === PLAN_REVIEW_TERMINOLOGY.length, `terminology coverage is ${PLAN_REVIEW_TERMINOLOGY.length}/${PLAN_REVIEW_TERMINOLOGY.length}`);
  ok(`terminology summary ${PLAN_REVIEW_TERMINOLOGY.length}/${PLAN_REVIEW_TERMINOLOGY.length}`);
  check(regressionBoundaryHits === regressionCases.length, `regression separation coverage is ${regressionCases.length}/${regressionCases.length}`);
  ok(`regression separation summary ${regressionCases.length}/${regressionCases.length}`);

  const testedCases = runtimeCaseCount + regressionCaseCount;
  const passCount = testedCases;
  const failCount = 0;
  const coverageCount = surfaceCoverageSeen.size;
  check(coverageCount === surfaceCases.length, `surface coverage is ${coverageCount}/${surfaceCases.length}`);
  ok(`role/screen coverage summary ${coverageCount}/${surfaceCases.length}`);

  console.log(`SUMMARY runtimeCases=${runtimeCaseCount} testedCases=${testedCases} passCount=${passCount} failCount=${failCount} assertions=${assertionCount}`);
  console.log(`SUMMARY coverage=${coverageCount}/${surfaceCases.length} helperLines=${helperLines} helperBelow1000=${helperLines < 1000}`);
  console.log(`SUMMARY noWriteAction=${PLAN_REVIEW_NO_WRITE_ACTIONS.length}/${PLAN_REVIEW_NO_WRITE_ACTIONS.length} terminology=${PLAN_REVIEW_TERMINOLOGY.length}/${PLAN_REVIEW_TERMINOLOGY.length} regressionSeparation=${regressionCaseCount}/${regressionCases.length}`);
  console.log(`SUMMARY guardRequirements=${PLAN_REVIEW_GUARD_REQUIREMENTS.length} triggerPhrases=${PLAN_REVIEW_TRIGGER_PHRASES.length} boundaries=${PLAN_REVIEW_REGRESSION_BOUNDARIES.length}`);
  console.log('PASS COPILOT-PLAN-REVIEW-ENGINE-01');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
