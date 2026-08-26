#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getScreenDefinitionForUser, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  buildOperationHealthChips,
  buildOperationHealthReply,
  buildOperationHealthState,
  detectOperationHealthSurface,
  looksLikeOperationHealthQuestion,
  OPERATION_HEALTH_ENGINE_VERSION,
  OPERATION_HEALTH_GUARD_REQUIREMENTS,
  OPERATION_HEALTH_HEALTH_SIGNAL_ASSERTIONS,
  OPERATION_HEALTH_NO_WRITE_ACTIONS,
  OPERATION_HEALTH_REGRESSION_BOUNDARIES,
  OPERATION_HEALTH_SURFACE_PROFILES,
  OPERATION_HEALTH_TERMINOLOGY,
  OPERATION_HEALTH_TRIGGER_PHRASES,
} from '../src/ai/chat/conversationOperationHealthEngine.js';
import { normalizeVisibleReplyFragment } from '../src/ai/chat/conversationTaskStateShared.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const FIXED_COUNTS = Object.freeze({
  activeDrivers: 3,
  riskyDevices: 1,
  staleOrOffline: 2,
  openIssues: 4,
  sampleDriver: 'Eren K.',
  sampleIssue: 'Konum güncel değil',
});

const RUNTIME_QUESTION_SPECS = Object.freeze([
  { questionType: 'STATUS_HELP', message: 'Operasyon sağlığı nasıl?' },
  { questionType: 'SCREEN_PURPOSE', message: 'Canlı durum ne?' },
  { questionType: 'SCREEN_FOCUS', message: 'Hangi risk var?' },
  { questionType: 'NEXT_STEP', message: 'Neyde sorun var?' },
  { questionType: 'FIRST_CONTROL', message: 'Konum sinyali güncel mi?' },
  { questionType: 'SAFE_NEXT_STEP', message: 'Saha güveni nasıl?' },
  { questionType: 'READINESS_CHECK', message: 'Oturum riski var mı?' },
  { questionType: 'NEXT_BEST_ACTION', message: 'Çevrim dışı kayıt var mı?' },
]);

const REGRESSION_CASES = Object.freeze([
  {
    label: 'plan-review-override',
    role: 'ROOM',
    path: '/room/operation-health',
    questionType: 'PLAN_REVIEW',
    message: 'Operasyon sağlığı nasıl?',
  },
  {
    label: 'risk-list-override',
    role: 'ROOM',
    path: '/room/operation-health',
    questionType: 'RISK_LIST',
    message: 'Hangi risk var?',
  },
  {
    label: 'root-cause-override',
    role: 'ROOM',
    path: '/room/operation-health',
    questionType: 'ROOT_CAUSE',
    message: 'Neyde sorun var?',
  },
  {
    label: 'smart-diagnostic-override',
    role: 'ROOM',
    path: '/room/operation-health',
    questionType: 'SMART_DIAGNOSTIC',
    message: 'Konum sinyali güncel mi?',
  },
  {
    label: 'dynamic-question-override',
    role: 'ROOM',
    path: '/room/operation-health',
    questionType: 'DYNAMIC_QUESTION',
    message: 'Devam edelim mi?',
  },
  {
    label: 'clarifying-question-override',
    role: 'ROOM',
    path: '/room/operation-health',
    questionType: 'CLARIFYING_QUESTION',
    message: 'Hangi kayıt için bakayım?',
  },
  {
    label: 'company-agreements-neutral',
    role: 'COMPANY',
    path: '/company/agreements',
    questionType: 'PRODUCT_OVERVIEW_HELP',
    message: 'Bu sözleşme ne işe yarar?',
  },
  {
    label: 'company-shifts-neutral',
    role: 'COMPANY',
    path: '/company/shifts',
    questionType: 'PRODUCT_OVERVIEW_HELP',
    message: 'Bu rolde ne yapabilirim?',
  },
  {
    label: 'trust-quality-neutral',
    role: 'SUPER_ADMIN',
    path: '/superadmin/trust-quality',
    questionType: 'HOW_TO_HELP',
    message: 'Bu ekran ne anlatıyor?',
  },
  {
    label: 'driver-route-neutral',
    role: 'DRIVER',
    path: '/driver/route',
    questionType: 'FIELD_BUTTON_HELP',
    message: 'Bu düğme ne yapar?',
  },
  {
    label: 'personel-agreements-neutral',
    role: 'PERSONEL',
    path: '/company/agreements',
    questionType: 'SCREEN_EXPLANATION_HELP',
    message: 'Bana bu sayfayı açıkla.',
  },
  {
    label: 'parent-trust-quality-neutral',
    role: 'PARENT',
    path: '/superadmin/trust-quality',
    questionType: 'OPEN',
    message: 'Açıp bakalım.',
  },
]);

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

function lineCount(text) {
  return String(text || '').split(/\r?\n/).length;
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function ok(label) {
  console.log(`OK ${label}`);
}

function casePass(label) {
  ok(label);
  caseCount += 1;
}

function check(condition, label) {
  if (!condition) fail(label);
  assertionCount += 1;
  ok(label);
}

function must(text, needle, label) {
  check(normalize(text).includes(normalize(needle)), label);
}

function mustNot(text, needle, label) {
  check(!normalize(text).includes(normalize(needle)), label);
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

function roleForProfile(profile) {
  switch (profile.key) {
    case 'ROOM_OPERATION_HEALTH':
    case 'ROOM_SHIFTS':
    case 'ROOM_MAP':
    case 'ROOM_VEHICLES':
      return { role: 'ROOM' };
    case 'SUPERADMIN_OPERATIONS':
    case 'OBSERVABILITY':
    case 'TRUST_QUALITY':
      return { role: 'SUPER_ADMIN' };
    case 'COMPANY_OPERATIONS':
    case 'COMPANY_SHIFTS':
      return { role: 'COMPANY' };
    case 'SCHOOL_OPERATIONS':
      return { role: 'COMPANY', companyKind: 'SCHOOL' };
    case 'ORGANIZATION_OPERATIONS':
      return { role: 'COMPANY', companyKind: 'ORGANIZATION' };
    case 'DRIVER_ROUTE':
      return { role: 'DRIVER' };
    case 'PERSONEL_LIVE':
      return { role: 'PERSONEL' };
    case 'PARENT_LIVE':
      return { role: 'PARENT' };
    default:
      return { role: 'ROOM' };
  }
}

function pickSurfacePath(profile, user) {
  for (const candidate of Array.isArray(profile.paths) ? profile.paths : []) {
    const screenDefinition = getScreenDefinitionForUser(user, { path: candidate }, null);
    if (screenDefinition && !screenDefinition.isSafeFallback) return candidate;
  }
  return Array.isArray(profile.paths) && profile.paths.length > 0 ? profile.paths[0] : '';
}

function buildDetectionScreenDefinition(profile, user, screenPath) {
  const screenDefinition = getScreenDefinitionForUser(user, { path: screenPath }, null);
  if (profile.key !== 'COMPANY_OPERATIONS') return screenDefinition;
  return {
    ...screenDefinition,
    roleKey: 'COMPANY',
    roleLabel: 'Şirket',
    label: 'Şirket Operasyonları',
    menuPurpose: 'şirket operasyon riskini ve açık talepleri birlikte okuma',
    screenExplanation: 'şirket operasyon riskini ve açık talepleri birlikte okuma',
  };
}

function buildRuntimeScreenDefinition(profile, user, screenPath) {
  const screenDefinition = buildDetectionScreenDefinition(profile, user, screenPath);
  if (profile.key !== 'ROOM_SHIFTS') return screenDefinition;
  return {
    ...screenDefinition,
    roleKey: 'ROOM',
    roleLabel: 'Oda',
    label: 'Oda Vardiyaları',
    menuPurpose: 'oda tarafındaki vardiya planı ve canlı başlangıcı birlikte okuma',
    screenExplanation: 'oda tarafındaki vardiya planı ve canlı başlangıcı birlikte okuma',
  };
}

function formatCountSummary(counts) {
  return `Aktif sürücü ${counts.activeDrivers} • Riskli cihaz ${counts.riskyDevices} • Konum sinyali güncel değil / çevrim dışı ${counts.staleOrOffline} • Açık sorun ${counts.openIssues}`;
}

function buildSharedContext(screenLabel, selectedSummary) {
  return {
    label: screenLabel,
    selectedSummary,
    selectedLabel: screenLabel,
    selectedRecordStatus: '',
    selectedFields: [
      { label: 'Aktif sürücü', value: String(FIXED_COUNTS.activeDrivers) },
      { label: 'Riskli cihaz', value: String(FIXED_COUNTS.riskyDevices) },
      { label: 'Konum sinyali güncel değil / çevrim dışı', value: String(FIXED_COUNTS.staleOrOffline) },
      { label: 'Açık sorun', value: String(FIXED_COUNTS.openIssues) },
      { label: 'Özet', value: selectedSummary },
    ],
    selectedBadges: [
      { label: 'Aktif sürücü', value: String(FIXED_COUNTS.activeDrivers) },
      { label: 'Riskli cihaz', value: String(FIXED_COUNTS.riskyDevices) },
      { label: 'Konum sinyali güncel değil / çevrim dışı', value: String(FIXED_COUNTS.staleOrOffline) },
      { label: 'Açık sorun', value: String(FIXED_COUNTS.openIssues) },
    ],
    structuredFacts: {
      counters: { ...FIXED_COUNTS },
    },
  };
}

function buildRuntimeArgs(profile, promptSpec) {
  const user = roleForProfile(profile);
  const screenPath = pickSurfacePath(profile, user);
  const screenDefinition = buildRuntimeScreenDefinition(profile, user, screenPath);
  const screenLabel = normalizeVisibleReplyFragment(String(screenDefinition?.label || profile.label || screenPath || '').trim());
  const visibleLabel = String(profile.label || screenLabel || screenPath || '').trim();
  const selectedSummary = `${visibleLabel} saha özeti`;
  const screenContext = buildSharedContext(visibleLabel, selectedSummary);
  const analysis = {
    reasoningLead: profile.reviewLead,
    nextBestAction: profile.nextBestAction,
    safestNextStep: profile.safestNextStep,
    selectedRecordStatus: '',
    blockers: [],
    missingData: [],
    evidence: [],
  };
  const contextPriority = {
    activeTopic: promptSpec.questionType,
    activeTopicLabel: screenLabel,
    summaryLead: profile.reviewLead,
    bestNextAction: profile.nextBestAction,
    followUpPrompt: profile.safestNextStep,
    selectedRecordMismatchLead: '',
    evidenceConfidence: selectedSummary,
    needsSelection: false,
    sameRecordLikely: true,
    guidedTaskMeta: null,
  };
  const message = promptSpec.message;
  return {
    user,
    screenPath,
    screenDefinition,
    screenContext,
    analysis,
    contextPriority,
    message,
    questionType: promptSpec.questionType,
    screenLabel,
    visibleLabel,
    selectedSummary,
  };
}

function runtimeAssertions(profile, promptSpec) {
  const args = buildRuntimeArgs(profile, promptSpec);
  const screenNames = listScreensForUser(args.user, { path: args.screenPath });
  const detected = detectOperationHealthSurface({
    screenPath: args.screenPath,
    screenDefinition: args.screenDefinition,
    screenContext: args.screenContext,
    sourceScreenDefinition: args.screenDefinition,
    sourceScreenContext: args.screenContext,
  });
  const looksLike = looksLikeOperationHealthQuestion(args.message, args.questionType, '', {
    message: args.message,
    rawMessage: args.message,
    questionType: args.questionType,
    interactionIntentFamily: '',
    screenPath: args.screenPath,
    screenDefinition: args.screenDefinition,
    screenContext: args.screenContext,
    sourceScreenDefinition: args.screenDefinition,
    sourceScreenContext: args.screenContext,
    conversationState: null,
    entityType: 'screen',
    context: null,
    taskState: null,
  });
  const state = buildOperationHealthState({
    message: args.message,
    rawMessage: args.message,
    questionType: args.questionType,
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: args.user.role,
    user: args.user,
    screenPath: args.screenPath,
    screenDefinition: args.screenDefinition,
    screenContext: args.screenContext,
    sourceScreenDefinition: args.screenDefinition,
    sourceScreenContext: args.screenContext,
    analysis: args.analysis,
    contextPriority: args.contextPriority,
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
    taskState: null,
  });
  const reply = buildOperationHealthReply({
    message: args.message,
    rawMessage: args.message,
    questionType: args.questionType,
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: args.user.role,
    user: args.user,
    screenPath: args.screenPath,
    screenDefinition: args.screenDefinition,
    screenContext: args.screenContext,
    sourceScreenDefinition: args.screenDefinition,
    sourceScreenContext: args.screenContext,
    analysis: args.analysis,
    contextPriority: args.contextPriority,
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
    taskState: null,
  });
  const chips = buildOperationHealthChips({
    message: args.message,
    rawMessage: args.message,
    questionType: args.questionType,
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: args.user.role,
    user: args.user,
    screenPath: args.screenPath,
    screenDefinition: args.screenDefinition,
    screenContext: args.screenContext,
    sourceScreenDefinition: args.screenDefinition,
    sourceScreenContext: args.screenContext,
    analysis: args.analysis,
    contextPriority: args.contextPriority,
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
    taskState: null,
  });

  const expectedCountSummary = formatCountSummary(FIXED_COUNTS);
  const replyCorpus = [
    reply,
    state.summary,
    state.nextBestAction,
    state.safestNextStep,
    state.compareHint,
    state.selectedSummaryText,
    state.selectedRecordStatus,
    state.evidence.join(' '),
    state.healthSignals.map((item) => `${item.label}: ${item.value} ${item.note || ''}`).join(' '),
    chips.join(' '),
  ].join(' ');

  check(screenNames.some((item) => item.path === args.screenPath), `${profile.key} screen catalog contains ${args.screenPath}`);
  check(detected.key !== 'GENERIC', `${profile.key} detectOperationHealthSurface resolves a non-generic surface`);
  check(looksLike, `${profile.key} question is recognized as operation health`);
  check(state.engineVersion === OPERATION_HEALTH_ENGINE_VERSION, `${profile.key} engine version matches`);
  check(state.shouldRespond, `${profile.key} state responds`);
  check(state.surfaceKey === detected.key, `${profile.key} surface key matches detected surface`);
  check(state.surfaceLabel === detected.label, `${profile.key} surface label matches detected surface`);
  check(state.surfacePurpose === detected.purpose, `${profile.key} surface purpose matches detected surface`);
  check(state.screenLabel === args.screenLabel, `${profile.key} screen label preserved`);
  check(state.roleText, `${profile.key} role text is present`);
  check(containsNormalized(reply, state.roleText), `${profile.key} reply mentions role text`);
  check(state.selectedSummaryText === args.selectedSummary, `${profile.key} selected summary preserved`);
  check(state.selectedRecordStatus === expectedCountSummary, `${profile.key} selected record status is derived from counters`);
  check(state.summary === detected.reviewLead, `${profile.key} summary uses detected review lead`);
  check(state.reasoningLead === detected.reviewLead, `${profile.key} reasoning lead uses detected review lead`);
  check(state.nextBestAction === 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını aç ve açık sorunları sırala.', `${profile.key} next best action is counter-based`);
  check(state.safestNextStep === detected.safestNextStep, `${profile.key} safest next step preserved`);
  check(state.compareHint === detected.compareHint, `${profile.key} compare hint preserved`);
  check(state.counters.activeDrivers === FIXED_COUNTS.activeDrivers, `${profile.key} active driver count preserved`);
  check(state.counters.riskyDevices === FIXED_COUNTS.riskyDevices, `${profile.key} risky device count preserved`);
  check(state.counters.staleOrOffline === FIXED_COUNTS.staleOrOffline, `${profile.key} stale/offline count preserved`);
  check(state.counters.openIssues === FIXED_COUNTS.openIssues, `${profile.key} open issue count preserved`);
  check(reply === state.reply, `${profile.key} helper reply matches state reply`);
  check(JSON.stringify(chips) === JSON.stringify(state.chips), `${profile.key} helper chips match state chips`);
  check(state.chips.length >= 4, `${profile.key} chips have at least four items`);
  check(state.healthSignals.length >= 4, `${profile.key} health signals have at least four items`);
  check(state.evidence.length >= 4, `${profile.key} evidence has at least four items`);
  check(state.blockers.length >= 1, `${profile.key} blockers list is populated`);
  check(containsNormalized(reply, normalizeVisibleReplyFragment(detected.label)), `${profile.key} reply mentions surface label`);
  check(containsNormalized(reply, normalizeVisibleReplyFragment(args.selectedSummary)), `${profile.key} reply mentions selected summary`);
  check(containsNormalized(reply, expectedCountSummary), `${profile.key} reply mentions selected record status`);
  check(containsNormalized(reply, normalizeVisibleReplyFragment(detected.reviewLead)), `${profile.key} reply mentions review lead`);
  check(containsNormalized(reply, normalizeVisibleReplyFragment(detected.compareHint)), `${profile.key} reply mentions compare hint`);
  check(containsNormalized(reply, 'Onayınız gerekli'), `${profile.key} reply mentions human approval`);
  check(containsNormalized(reply, 'Riskli cihazı aç'), `${profile.key} reply mentions risky-device control`);
  check(containsNormalized(reply, 'konum sinyali güncel değil / çevrim dışı'), `${profile.key} reply mentions stale/offline control`);
  check(containsNormalized(reply, 'açık sorunları sırala'), `${profile.key} reply mentions open-issue control`);
  check(containsNormalized(state.evidence.join(' '), FIXED_COUNTS.sampleDriver), `${profile.key} evidence mentions sample driver`);
  check(containsNormalized(state.evidence.join(' '), FIXED_COUNTS.sampleIssue), `${profile.key} evidence mentions sample issue`);
  check(state.healthSignals.some((item) => item.label === 'Aktif sürücü'), `${profile.key} health signal has active drivers`);
  check(state.healthSignals.some((item) => item.label === 'Riskli cihaz'), `${profile.key} health signal has risky devices`);
  check(state.healthSignals.some((item) => item.label === 'Konum sinyali güncel değil / çevrim dışı'), `${profile.key} health signal has stale/offline`);
  check(state.healthSignals.some((item) => item.label === 'Açık sorun'), `${profile.key} health signal has open issues`);
  check(state.healthSignals.some((item) => item.label === 'Örnek sürücü'), `${profile.key} health signal has sample driver`);
  check(state.healthSignals.some((item) => item.label === 'Örnek sorun'), `${profile.key} health signal has sample issue`);

  runtimeReplyCorpus += ` ${replyCorpus}`;
  roleCoverageSeen.add(String(getRoleKeyFromUser(args.user, { path: args.screenPath })));
  surfaceCoverageSeen.add(profile.key);
  if (!sampleState) sampleState = state;
  casePass(`runtime ${profile.key} :: ${promptSpec.message}`);
}

function getRoleKeyFromUser(user, screenContext) {
  return getScreenDefinitionForUser(user, screenContext, null)?.roleKey || '';
}

function runRegressionCase(spec) {
  const user = spec.role === 'COMPANY' && spec.companyKind
    ? { role: spec.role, companyKind: spec.companyKind }
    : { role: spec.role };
  const screenDefinition = getScreenDefinitionForUser(user, { path: spec.path }, null);
  const screenNames = listScreensForUser(user, { path: spec.path });
  const screenLabel = normalizeVisibleReplyFragment(String(screenDefinition?.label || spec.path || spec.label || '').trim());
  const screenContext = {
    label: screenLabel,
    selectedSummary: `${screenLabel} kayıt özeti`,
    selectedLabel: screenLabel,
    selectedRecordStatus: 'Hazır',
    selectedFields: [
      { label: 'Durum', value: 'Hazır' },
      { label: 'Özet', value: `${screenLabel} kayıt özeti` },
    ],
    selectedBadges: [{ label: 'Durum', value: 'Hazır' }],
    structuredFacts: {},
  };
  const message = spec.message;
  const looksLike = looksLikeOperationHealthQuestion(message, spec.questionType, '', {
    message,
    rawMessage: message,
    questionType: spec.questionType,
    interactionIntentFamily: '',
    screenPath: spec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    conversationState: null,
    entityType: 'screen',
    context: null,
    taskState: null,
  });
  const detected = detectOperationHealthSurface({
    screenPath: spec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
  });
  const state = buildOperationHealthState({
    message,
    rawMessage: message,
    questionType: spec.questionType,
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: spec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis: {
      reasoningLead: `${screenLabel} için başka bir yardımcı devrede olmalı.`,
      nextBestAction: 'Başka yardımcı kullanılmalı.',
      safestNextStep: 'Başka yardımcı kullanılmalı.',
      selectedRecordStatus: 'Hazır',
      blockers: [],
      missingData: [],
      evidence: [],
    },
    contextPriority: {
      activeTopic: spec.questionType,
      activeTopicLabel: screenLabel,
      summaryLead: `${screenLabel} için başka bir yardımcı devrede olmalı.`,
      bestNextAction: 'Başka yardımcı kullanılmalı.',
      followUpPrompt: 'Başka yardımcı kullanılmalı.',
      selectedRecordMismatchLead: 'Hazır',
      evidenceConfidence: `${screenLabel} kayıt özeti`,
      needsSelection: false,
      sameRecordLikely: true,
      guidedTaskMeta: null,
    },
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
    taskState: null,
  });
  check(screenNames.some((item) => item.path === spec.path), `${spec.label} screen catalog contains ${spec.path}`);
  check(!looksLike, `${spec.label} is not captured by operation-health heuristics`);
  check(!state.shouldRespond, `${spec.label} state stays silent`);
  check(state.reply === '', `${spec.label} reply stays empty`);
  check(state.surfaceKey === detected.key, `${spec.label} surface key is stable`);
  casePass(`regression ${spec.label}`);
}

function runSourceGuardAssertions(bundle) {
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(bundle.packageJson, '"check:copilotoperationhealthengine01": "node backend/scripts/copilot_operation_health_engine_01_check.js"', 'package.json exposes operation-health check');
  assertProductExtensionsOrder(['check:copilotworkflowreasoningengine01', 'check:copilotoperationhealthengine01', 'check:copilotplanreviewengine01', 'check:hotfilesplitaichatcomposers01'], 'product extensions registry keeps operation-health between workflow reasoning and plan review', registryScripts);
  assertProductExtensionsOrder(['check:copilotworkflowreasoningengine01', 'check:copilotoperationhealthengine01', 'check:copilotplanreviewengine01', 'check:hotfilesplitaichatcomposers01'], 'verify chain registry keeps operation-health between workflow reasoning and plan review', registryScripts);

  must(bundle.guide, 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'milestone guide mentions operation-health milestone');
  must(bundle.guide, 'check:copilotoperationhealthengine01', 'milestone guide exposes operation-health check');
  must(bundle.guide, 'node backend\\scripts\\copilot_operation_health_engine_01_check.js', 'milestone guide includes operation-health command');
  must(bundle.guide, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'milestone guide includes operation-health doc');
  must(bundle.guide, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'milestone guide includes operation-health helper');
  ordered(bundle.guide, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01'], 'milestone guide places operation-health between workflow reasoning and plan review');

  must(bundle.primer, 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'primer mentions operation-health milestone');
  must(bundle.primer, 'check:copilotoperationhealthengine01', 'primer exposes operation-health check');
  must(bundle.primer, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'primer links operation-health doc');
  must(bundle.primer, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'primer links operation-health helper');
  must(bundle.primer, 'backend/src/ai/chat/screenStateAnalyzer.js', 'primer links screen-state bridge for operation-health');
  ordered(bundle.primer, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01'], 'primer places operation-health between workflow reasoning and plan review');

  must(bundle.harnessCheck, 'check:copilotoperationhealthengine01', 'script harness check knows operation-health alias');
  must(bundle.harnessCheck, 'root:check:copilotoperationhealthengine01', 'script harness check knows operation-health root check');
  must(bundle.harnessCheck, 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'script harness check knows operation-health milestone');
  must(bundle.harnessCheck, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'script harness check knows operation-health doc');
  must(bundle.harnessCheck, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'script harness check knows operation-health helper');

  must(bundle.harnessDoc, 'Copilot operation health engine milestone: `COPILOT-OPERATION-HEALTH-ENGINE-01`', 'script harness doc lists operation-health milestone');
  must(bundle.harnessDoc, 'root:check:copilotoperationhealthengine01', 'script harness doc lists operation-health root check');
  must(bundle.harnessDoc, 'copilot_operation_health_engine_01_check.js', 'script harness doc lists operation-health command');
  must(bundle.harnessDoc, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'script harness doc lists operation-health helper');
  must(bundle.harnessDoc, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'script harness doc lists operation-health doc');

  must(bundle.helper, 'OPERATION_HEALTH_ENGINE_VERSION', 'helper exposes engine version');
  must(bundle.helper, 'OPERATION_HEALTH_SURFACE_PROFILES', 'helper exposes surface profiles');
  must(bundle.helper, 'OPERATION_HEALTH_TRIGGER_PHRASES', 'helper exposes trigger phrases');
  must(bundle.helper, 'OPERATION_HEALTH_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(bundle.helper, 'OPERATION_HEALTH_NO_WRITE_ACTIONS', 'helper exposes no-write-action guards');
  must(bundle.helper, 'OPERATION_HEALTH_TERMINOLOGY', 'helper exposes terminology guards');
  must(bundle.helper, 'OPERATION_HEALTH_REGRESSION_BOUNDARIES', 'helper exposes regression boundaries');
  must(bundle.helper, 'OPERATION_HEALTH_HEALTH_SIGNAL_ASSERTIONS', 'helper exposes health-signal assertions');
  must(bundle.helper, 'buildOperationHealthState', 'helper exposes state builder');
  must(bundle.helper, 'buildOperationHealthReply', 'helper exposes reply builder');
  must(bundle.helper, 'buildOperationHealthChips', 'helper exposes chips builder');
  must(bundle.helper, 'detectOperationHealthSurface', 'helper exposes surface detector');
  must(bundle.helper, 'looksLikeOperationHealthQuestion', 'helper exposes question detector');

  must(bundle.helpComposer, 'buildOperationHealthState', 'helpComposer imports operation-health state');
  must(bundle.helpComposer, 'buildOperationHealthChips', 'helpComposer imports operation-health chips');
  must(bundle.helpComposer, 'operationHealthState?.shouldRespond', 'helpComposer gates operation-health wiring');

  must(bundle.intentRouter, 'buildOperationHealthChips', 'intent router imports operation-health chips');
  mustNot(bundle.intentRouter, 'buildOperationHealthState', 'intent router keeps operation-health state out');
  mustNot(bundle.intentRouter, 'buildOperationHealthReply', 'intent router keeps operation-health reply out');

  must(bundle.answerQualityPolicy, 'buildOperationHealthChips', 'answer quality policy imports operation-health chips');
  mustNot(bundle.answerQualityPolicy, 'buildOperationHealthState', 'answer quality policy keeps operation-health state out');
  mustNot(bundle.answerQualityPolicy, 'buildOperationHealthReply', 'answer quality policy keeps operation-health reply out');

  must(bundle.screenStateAnalyzer, 'buildOperationHealthState', 'screen-state analyzer imports operation-health state');
  must(bundle.seferAbiReasoningAssistant, 'operationHealthState', 'Sefer Abi assistant bridges operation-health state');
  must(bundle.seferAbiReasoningAssistant, 'operationHealthReply', 'Sefer Abi assistant bridges operation-health reply');
  must(bundle.seferAbiReasoningAssistant, 'operationHealthChips', 'Sefer Abi assistant bridges operation-health chips');
  must(bundle.responses, 'buildOperationHealthState', 'task state responses re-export operation-health state');
  must(bundle.responses, 'buildOperationHealthReply', 'task state responses re-export operation-health reply');
  must(bundle.responses, 'buildOperationHealthChips', 'task state responses re-export operation-health chips');

  must(bundle.doc, '# COPILOT OPERATION HEALTH ENGINE 01', 'doc title present');
  must(bundle.doc, 'Canonical check: `check:copilotoperationhealthengine01`', 'doc canonical check present');
  must(bundle.doc, 'Purpose', 'doc purpose section present');
  must(bundle.doc, 'Scope', 'doc scope section present');
  must(bundle.doc, 'Supported roles/screens', 'doc supported roles/screens section present');
  must(bundle.doc, 'Health signals', 'doc health signals section present');
  must(bundle.doc, 'Examples', 'doc examples section present');
  must(bundle.doc, 'No write-action boundary', 'doc no-write-action section present');
  must(bundle.doc, 'Terminology boundary', 'doc terminology section present');
  must(bundle.doc, 'Regression protection', 'doc regression section present');
  must(bundle.doc, 'Validation results', 'doc validation results section present');
  must(bundle.doc, 'Known limitations', 'doc known limitations section present');
  must(bundle.doc, 'Next milestone recommendation', 'doc next milestone section present');
  must(bundle.doc, 'sadece okur', 'doc keeps read-only boundary wording');
  must(bundle.doc, 'yazma yok', 'doc keeps no-write wording');
  must(bundle.doc, 'İngilizce ve sistem içi jargon yüzeye çıkmaz', 'doc keeps jargon boundary wording');

  check(lineCount(bundle.helper) < 1000, `operation-health helper stays under 1000 lines (${lineCount(bundle.helper)})`);
  check(lineCount(bundle.helpComposer) < 6900, `helpComposer stays under 6900 lines (${lineCount(bundle.helpComposer)})`);
  check(lineCount(bundle.intentRouter) <= 1119, `intentRouter stays at or below 1119 lines (${lineCount(bundle.intentRouter)})`);
  check(lineCount(bundle.planReviewHelper) < 1000, `plan review helper stays under 1000 lines (${lineCount(bundle.planReviewHelper)})`);
  check(lineCount(bundle.operationHealthHelper) < 1000, `operation-health helper stays under 1000 lines (${lineCount(bundle.operationHealthHelper)})`);
}

function runHealthSignalAssertions(sampleState) {
  for (const key of OPERATION_HEALTH_HEALTH_SIGNAL_ASSERTIONS) {
    check(Object.prototype.hasOwnProperty.call(sampleState, key), `health signal assertion covers ${key}`);
  }
}

function runTerminologyAssertions(helperText, docText) {
  const corpus = `${helperText}\n${docText}`;
  for (const term of OPERATION_HEALTH_TERMINOLOGY) {
    check(containsNormalized(corpus, term), `terminology guard includes ${term}`);
  }
}

function runNoWriteActionAssertions(replyCorpus) {
  for (const term of OPERATION_HEALTH_NO_WRITE_ACTIONS) {
    check(!containsNormalized(replyCorpus, term), `reply corpus excludes write-action term ${term}`);
  }
}

let assertionCount = 0;
let caseCount = 0;
let runtimeCaseCount = 0;
let regressionCaseCount = 0;
let runtimeReplyCorpus = '';
let sampleState = null;
const roleCoverageSeen = new Set();
const surfaceCoverageSeen = new Set();

async function main() {
  console.log('=== COPILOT-OPERATION-HEALTH-ENGINE-01 CHECK ===');

  const sourceBundle = {
    packageJson: read('package.json'),
    guide: read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'),
    primer: read('docs/PRIMER_SSOT.md'),
    helpComposer: read('backend/src/ai/chat/helpComposer.js'),
    intentRouter: read('backend/src/ai/chat/intentRouter.js'),
    answerQualityPolicy: read('backend/src/ai/chat/answerQualityPolicy.js'),
    screenStateAnalyzer: read('backend/src/ai/chat/screenStateAnalyzer.js'),
    seferAbiReasoningAssistant: read('backend/src/ai/chat/seferAbiReasoningAssistant.js'),
    responses: read('backend/src/ai/chat/conversationTaskStateResponses.js'),
    harnessCheck: read('backend/scripts/script_harness_consolidation_01_check.js'),
    harnessDoc: read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md'),
    helper: read('backend/src/ai/chat/conversationOperationHealthEngine.js'),
    planReviewHelper: read('backend/src/ai/chat/conversationPlanReviewEngine.js'),
    operationHealthHelper: read('backend/src/ai/chat/conversationOperationHealthEngine.js'),
    doc: read('docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md'),
  };

  runSourceGuardAssertions(sourceBundle);

  const helperLines = lineCount(sourceBundle.operationHealthHelper);
  const planReviewLines = lineCount(sourceBundle.planReviewHelper);
  const helpComposerLines = lineCount(sourceBundle.helpComposer);
  const intentRouterLines = lineCount(sourceBundle.intentRouter);

  const operationHealthProfiles = OPERATION_HEALTH_SURFACE_PROFILES;
  check(operationHealthProfiles.length === 14, `operation-health surface profile count is 14 (${operationHealthProfiles.length})`);

  for (const profile of operationHealthProfiles) {
    const roleKey = getRoleKeyFromUser(roleForProfile(profile), { path: pickSurfacePath(profile) });
    roleCoverageSeen.add(roleKey);
    for (const promptSpec of RUNTIME_QUESTION_SPECS) {
      runtimeAssertions(profile, promptSpec);
      runtimeCaseCount += 1;
    }
  }

  for (const regression of REGRESSION_CASES) {
    runRegressionCase(regression);
    regressionCaseCount += 1;
  }

  const testedCases = runtimeCaseCount + regressionCaseCount;
  const passCount = caseCount;
  const failCount = 0;

  check(roleCoverageSeen.size === 8, `role coverage is 8/8 (${roleCoverageSeen.size})`);
  check(surfaceCoverageSeen.size === operationHealthProfiles.length, `surface coverage is 14/14 (${surfaceCoverageSeen.size})`);
  check(passCount === testedCases, `pass count matches tested cases (${passCount}/${testedCases})`);

  runHealthSignalAssertions(sampleState || {});
  runNoWriteActionAssertions(runtimeReplyCorpus);
  runTerminologyAssertions(sourceBundle.helper, sourceBundle.doc);

  const noWriteActionAssertions = OPERATION_HEALTH_NO_WRITE_ACTIONS.length;
  const terminologyAssertions = OPERATION_HEALTH_TERMINOLOGY.length;
  const regressionBoundaryAssertions = REGRESSION_CASES.length;
  const healthSignalAssertions = OPERATION_HEALTH_HEALTH_SIGNAL_ASSERTIONS.length;

  console.log(`SUMMARY runtimeCases=${runtimeCaseCount} testedCases=${testedCases} passCount=${passCount} failCount=${failCount} assertions=${assertionCount}`);
  console.log(`SUMMARY roleCoverage=${roleCoverageSeen.size}/8 surfaceCoverage=${surfaceCoverageSeen.size}/14`);
  console.log(`SUMMARY helperLines=${helperLines} helperBelow1000=${helperLines < 1000} planReviewLines=${planReviewLines} planReviewBelow1000=${planReviewLines < 1000} helpComposerLines=${helpComposerLines} helpComposerBelow6900=${helpComposerLines < 6900} intentRouterLines=${intentRouterLines} intentRouterMinimal=${intentRouterLines <= 1119}`);
  console.log(`SUMMARY noWriteActionAssertions=${noWriteActionAssertions}/${noWriteActionAssertions} terminologyAssertions=${terminologyAssertions}/${terminologyAssertions} regressionSeparation=${regressionBoundaryAssertions}/${regressionBoundaryAssertions} healthSignalAssertions=${healthSignalAssertions}/${healthSignalAssertions}`);
  console.log(`SUMMARY guardRequirements=${OPERATION_HEALTH_GUARD_REQUIREMENTS.length} triggerPhrases=${OPERATION_HEALTH_TRIGGER_PHRASES.length} boundaries=${OPERATION_HEALTH_REGRESSION_BOUNDARIES.length}`);
  console.log('PASS COPILOT-OPERATION-HEALTH-ENGINE-01');
}

try {
  await main();
} catch (error) {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
}
