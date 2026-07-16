#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getScreenDefinitionForUser, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  buildWorkflowReasoningReply,
  buildWorkflowReasoningState,
} from '../src/ai/chat/conversationWorkflowReasoningEngine.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';

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

function assert(condition, label) {
  if (!condition) fail(label);
  ok(label);
  assertionCount += 1;
}

function must(text, needle, label) {
  assert(normalize(text).includes(normalize(needle)), label);
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
  ok(label);
  assertionCount += 1;
}

function containsNormalized(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function buildCase({
  label,
  role,
  path: screenPath,
  questionType,
  message,
  selectedSummary,
  selectedLabel,
  selectedRecordStatus,
  companyKind = '',
}) {
  const user = makeUser(role, companyKind);
  const screenDefinition = getScreenDefinitionForUser(user, { path: screenPath }, null);
  const screenLabel = String(screenDefinition?.label || screenPath || label || '').trim();
  const resolvedSelectedSummary = String(selectedSummary || `${screenLabel} seçili kayıt`).trim();
  const resolvedSelectedLabel = String(selectedLabel || screenLabel || 'Seçili kayıt').trim();
  const resolvedSelectedRecordStatus = String(selectedRecordStatus || `${screenLabel} hazır`).trim();
  const screenContext = {
    path: screenPath,
    label: screenLabel,
    selectedSummary: resolvedSelectedSummary,
    selectedLabel: resolvedSelectedLabel,
    selectedRecordStatus: resolvedSelectedRecordStatus,
    selectedFields: [
      { label: 'Durum', value: resolvedSelectedRecordStatus },
      { label: 'Özet', value: resolvedSelectedSummary },
    ],
    selectedBadges: [
      { label: 'Durum', value: resolvedSelectedRecordStatus },
    ],
    structuredFacts: {
      reasoningLead: `${screenLabel} için güvenli workflow.`,
      nextBestAction: String(screenDefinition?.nextStep || screenDefinition?.firstStep || 'İlgili satırı aç.').trim(),
      selectedRecordStatus: resolvedSelectedRecordStatus,
    },
  };
  const guide = {
    plainSummary: String(screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    summary: String(screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    screenExplanation: String(screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    whatToDoNow: String(screenDefinition?.firstStep || 'İlk kontrolü aç.').trim(),
    whatToDoNext: String(screenDefinition?.nextStep || 'Sonraki ekrana geç.').trim(),
    whyBlocked: String(screenDefinition?.doNotDo || '').trim(),
    doNotDo: String(screenDefinition?.doNotDo || '').trim(),
  };
  const analysis = {
    reasoningLead: String(screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    nextBestAction: String(screenDefinition?.nextStep || screenDefinition?.firstStep || 'İlk kontrolü aç.').trim(),
    safestNextStep: String(screenDefinition?.nextStep || screenDefinition?.firstStep || 'İlk kontrolü aç.').trim(),
    selectedRecordStatus: resolvedSelectedRecordStatus,
    blockers: screenDefinition?.doNotDo ? [screenDefinition.doNotDo] : [],
    missingData: [],
    evidence: [],
  };
  const contextPriority = {
    activeTopic: questionType,
    activeTopicLabel: screenLabel,
    summaryLead: String(screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    bestNextAction: String(screenDefinition?.nextStep || screenDefinition?.firstStep || 'İlk kontrolü aç.').trim(),
    followUpPrompt: String(screenDefinition?.nextStep || screenDefinition?.firstStep || 'İlgili ekrana geç.').trim(),
    selectedRecordMismatchLead: resolvedSelectedRecordStatus,
    evidenceConfidence: resolvedSelectedSummary,
    needsSelection: false,
    sameRecordLikely: true,
    guidedTaskMeta: null,
  };
  const assistantMessage = String(message || `Bu ${screenLabel} kaydı hangi aşamada, sonraki güvenli kontrol ne ve onay noktası nedir?`).trim();
  const state = buildWorkflowReasoningState({
    message: assistantMessage,
    rawMessage: assistantMessage,
    questionType,
    interactionIntentFamily: '',
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath,
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
  const assistant = buildSeferAbiReasoningAssistant({
    rawReply: 'Temel cevap.',
    message: assistantMessage,
    questionType,
    replyMode: 'SHORT',
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath,
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
  const screenNames = listScreensForUser(user, { path: screenPath });
  assert(screenNames.some((item) => item.path === screenPath), `${label} screen catalog contains ${screenPath}`);
  return {
    label,
    user,
    screenDefinition,
    screenContext,
    assistantMessage,
    state,
    assistant,
    screenLabel,
    selectedSummary: resolvedSelectedSummary,
    selectedRecordStatus: resolvedSelectedRecordStatus,
  };
}

function runPositiveCase(config) {
  const row = buildCase(config);
  const { label, state, assistant, screenLabel, selectedSummary, selectedRecordStatus } = row;
  const assistantReplyNeedles = Array.isArray(config.assistantReplyNeedles) ? config.assistantReplyNeedles : [];

  assert(state.shouldRespond, `${label} workflow state responds`);
  assert(state.surfaceKey === config.expectedSurfaceKey, `${label} surface key is ${config.expectedSurfaceKey}`);
  assert(state.reply === buildWorkflowReasoningReply({
    message: row.assistantMessage,
    rawMessage: row.assistantMessage,
    questionType: config.questionType,
    guide: {
      plainSummary: row.screenDefinition.menuPurpose || '',
      summary: row.screenDefinition.menuPurpose || '',
      screenExplanation: row.screenDefinition.menuPurpose || '',
      whatToDoNow: row.screenDefinition.firstStep || '',
      whatToDoNext: row.screenDefinition.nextStep || '',
      whyBlocked: row.screenDefinition.doNotDo || '',
      doNotDo: row.screenDefinition.doNotDo || '',
    },
    roleMode: 'OPERATIONS',
    userRole: row.user.role,
    user: row.user,
    screenPath: row.screenDefinition.path,
    screenDefinition: row.screenDefinition,
    screenContext: row.screenContext,
    sourceScreenDefinition: row.screenDefinition,
    sourceScreenContext: row.screenContext,
    analysis: {
      reasoningLead: row.screenDefinition.menuPurpose || '',
      nextBestAction: row.screenDefinition.nextStep || row.screenDefinition.firstStep || '',
      safestNextStep: row.screenDefinition.nextStep || row.screenDefinition.firstStep || '',
      selectedRecordStatus,
      blockers: row.screenDefinition.doNotDo ? [row.screenDefinition.doNotDo] : [],
      missingData: [],
      evidence: [],
    },
    contextPriority: {
      activeTopic: config.questionType,
      activeTopicLabel: screenLabel,
      summaryLead: row.screenDefinition.menuPurpose || '',
      bestNextAction: row.screenDefinition.nextStep || row.screenDefinition.firstStep || '',
      followUpPrompt: row.screenDefinition.nextStep || row.screenDefinition.firstStep || '',
      selectedRecordMismatchLead: selectedRecordStatus,
      evidenceConfidence: selectedSummary,
      needsSelection: false,
      sameRecordLikely: true,
    },
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  }), `${label} workflow reply helper matches state`);
  assert(assistant.workflowReasoningState?.shouldRespond === true, `${label} assistant carries workflow state`);
  assert(assistant.workflowReasoningState?.surfaceKey === config.expectedSurfaceKey, `${label} assistant surface key matches`);
  assert(assistant.workflowReasoningReply === state.reply, `${label} assistant workflow reply matches state reply`);
  assert(containsNormalized(state.reply, selectedRecordStatus), `${label} reply mentions selected status`);
  for (const needle of config.replyNeedles) {
    assert(containsNormalized(state.reply, needle), `${label} reply mentions ${needle}`);
    assert(containsNormalized(assistant.workflowReasoningReply, needle), `${label} workflow reply mentions ${needle}`);
  }
  for (const needle of assistantReplyNeedles) {
    assert(containsNormalized(assistant.reply, needle), `${label} assistant reply mentions ${needle}`);
  }
  assert(state.chips.length === 4, `${label} chip set is capped at four`);
  assert(assistant.reply.length > 0, `${label} assistant reply is not empty`);
  assertionCount += 1;
}

function runBlockedCase(config) {
  const row = buildCase(config);
  const { label, state } = row;
  assert(!state.shouldRespond, `${label} workflow state stays silent`);
  assert(state.reply === '', `${label} workflow reply stays empty`);
  const expectedSurfaceKey = typeof config.expectedSurfaceKey === 'string' ? config.expectedSurfaceKey : '';
  assert(state.surfaceKey === expectedSurfaceKey, `${label} surface key is ${expectedSurfaceKey || 'empty'}`);
  assertionCount += 1;
}

const helperSource = read('backend/src/ai/chat/conversationWorkflowReasoningEngine.js');
const assistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
const barrelSource = read('backend/src/ai/chat/conversationTaskStateResponses.js');
const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const primer = read('docs/PRIMER_SSOT.md');
const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
const workflowDoc = read('docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');

let assertionCount = 0;

must(pkg, '"check:copilotworkflowreasoningengine01": "node backend/scripts/copilot_workflow_reasoning_engine_01_check.js"', 'package.json exposes workflow reasoning engine check');
must(runner, 'check:copilotworkflowreasoningengine01', 'product extensions runner includes workflow reasoning engine check');
must(verifyChain, 'check:copilotworkflowreasoningengine01', 'verify chain check includes workflow reasoning engine');
must(guide, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'script guide mentions workflow reasoning engine');
must(guide, 'check:copilotworkflowreasoningengine01', 'script guide exposes workflow reasoning engine check');
must(guide, 'node backend\\scripts\\copilot_workflow_reasoning_engine_01_check.js', 'script guide includes workflow reasoning engine command');
must(guide, 'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md', 'script guide includes workflow reasoning engine doc');
ordered(guide, ['COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01'], 'script guide keeps workflow engine between clarifying and composer');
must(primer, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'primer mentions workflow reasoning engine');
must(primer, 'check:copilotworkflowreasoningengine01', 'primer exposes workflow reasoning engine check');
must(primer, 'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md', 'primer links workflow reasoning engine doc');
must(primer, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'primer links workflow reasoning engine helper');
ordered(primer, ['COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01'], 'primer keeps workflow engine between clarifying and composer');
must(harnessCheck, 'check:copilotworkflowreasoningengine01', 'script harness knows workflow reasoning engine alias');
must(harnessCheck, 'root:check:copilotworkflowreasoningengine01', 'script harness knows workflow reasoning engine root check');
must(harnessCheck, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'script harness knows workflow reasoning engine milestone');
must(harnessCheck, 'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md', 'script harness knows workflow reasoning engine doc');
must(harnessCheck, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'script harness knows workflow reasoning engine helper');
must(harnessDoc, 'Copilot workflow reasoning engine milestone: `COPILOT-WORKFLOW-REASONING-ENGINE-01`', 'script harness doc lists workflow reasoning engine milestone');
must(harnessDoc, 'root:check:copilotworkflowreasoningengine01', 'script harness doc lists workflow reasoning engine root check');
must(harnessDoc, 'copilot_workflow_reasoning_engine_01_check.js', 'script harness doc lists workflow reasoning engine command');
must(harnessDoc, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'script harness doc lists workflow reasoning engine helper');
must(workflowDoc, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'workflow doc mentions canonical milestone');
must(workflowDoc, 'check:copilotworkflowreasoningengine01', 'workflow doc exposes canonical check');
must(workflowDoc, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'workflow doc names canonical helper');
must(workflowDoc, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'workflow doc names assistant consumer');
must(workflowDoc, 'İşlem akışı', 'workflow doc keeps Turkish process flow wording');
must(workflowDoc, 'Sonraki güvenli kontrol', 'workflow doc keeps Turkish safe control wording');
must(workflowDoc, 'Onay noktası', 'workflow doc keeps Turkish approval wording');
must(assistantSource, 'buildWorkflowReasoningState', 'reasoning assistant integrates workflow reasoning state');
must(assistantSource, 'workflowReasoningState', 'reasoning assistant stores workflow reasoning state');
must(assistantSource, 'workflowReasoningReply', 'reasoning assistant stores workflow reasoning reply');
must(barrelSource, 'buildWorkflowReasoningReply', 'task state responses barrel re-exports workflow reply helper');
must(barrelSource, 'buildWorkflowReasoningState', 'task state responses barrel re-exports workflow state helper');
must(helperSource, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'workflow helper source mentions canonical milestone');
must(helperSource, 'COMPANY_PLAN', 'workflow helper source covers company plan surface');
must(helperSource, 'ROOM_OFFERS', 'workflow helper source covers room offers surface');
must(helperSource, 'COMPANY_SHIFTS', 'workflow helper source covers company shifts surface');
must(helperSource, 'ROOM_MAP', 'workflow helper source covers room map surface');
must(helperSource, 'ROOM_VEHICLES', 'workflow helper source covers room vehicles surface');
must(helperSource, 'DRIVER_ROUTE', 'workflow helper source covers driver route surface');
must(helperSource, 'PERSONEL_LIVE', 'workflow helper source covers personel live surface');
must(helperSource, 'PARENT_LIVE', 'workflow helper source covers parent live surface');
must(helperSource, 'SUPERADMIN', 'workflow helper source covers superadmin surface');
must(helperSource, 'İşlem akışı', 'workflow helper source keeps Turkish process flow wording');
must(helperSource, 'Sonraki güvenli kontrol', 'workflow helper source keeps Turkish safe control wording');
must(helperSource, 'Onay noktası', 'workflow helper source keeps Turkish approval wording');

const positiveCases = [
  {
    label: 'company-plan',
    role: 'COMPANY',
    path: '/company',
    questionType: 'SCREEN_PURPOSE',
    message: 'Bu kaydın sonraki aşaması nedir?',
    selectedSummary: 'Plan taslağı',
    selectedLabel: 'Plan',
    selectedRecordStatus: 'Taslak hazır',
    expectedSurfaceKey: 'COMPANY_PLAN',
    replyNeedles: ['Bu yüzeyin amacı', 'İşlem akışı', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'company-agreements',
    role: 'COMPANY',
    path: '/company/agreements',
    questionType: 'NEXT_STEP',
    message: 'Bu sözleşme hangi aşamada, sonraki güvenli kontrol ne?',
    selectedSummary: 'Sözleşme taslağı',
    selectedLabel: 'Sözleşme',
    selectedRecordStatus: 'Önizleme hazır',
    expectedSurfaceKey: 'COMPANY_AGREEMENTS',
    replyNeedles: ['Sözleşmeler', 'İşlem akışı', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'company-shifts',
    role: 'COMPANY',
    path: '/company/shifts',
    questionType: 'WHY_BLOCKED',
    message: 'Bu vardiya neden ilerlemiyor, sonraki güvenli kontrol ne?',
    selectedSummary: 'Günlük vardiya',
    selectedLabel: 'Vardiya',
    selectedRecordStatus: 'Atama bekliyor',
    expectedSurfaceKey: 'COMPANY_SHIFTS',
    replyNeedles: ['Vardiyalar', 'İşlem akışı', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'room-map',
    role: 'ROOM',
    path: '/room/map',
    questionType: 'LOCATION_HELP',
    message: 'Bu araç neden haritada görünmüyor, sonraki güvenli kontrol ne?',
    selectedSummary: 'Canlı takip kaydı',
    selectedLabel: 'Araç',
    selectedRecordStatus: 'Konum sinyali okunuyor',
    expectedSurfaceKey: 'ROOM_MAP',
    replyNeedles: ['Canlı Takip', 'Konum sinyali', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'room-vehicles',
    role: 'ROOM',
    path: '/room/vehicles',
    questionType: 'FIRST_CONTROL',
    message: 'Araç ve sürücü bağlantısında ilk güvenli kontrol ne?',
    selectedSummary: 'Araç kaydı',
    selectedLabel: 'Araç',
    selectedRecordStatus: 'Araç bağlı',
    expectedSurfaceKey: 'ROOM_VEHICLES',
    replyNeedles: ['Araçlar', 'İşlem akışı', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'driver-route',
    role: 'DRIVER',
    path: '/driver/route',
    questionType: 'NEXT_STEP',
    message: 'Bu rota için sıradaki güvenli kontrol ve onay noktası ne?',
    selectedSummary: 'Günlük rota',
    selectedLabel: 'Rota',
    selectedRecordStatus: 'Rota aktif',
    expectedSurfaceKey: 'DRIVER_ROUTE',
    replyNeedles: ['Sürücü Rotası', 'İşlem akışı', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'personel-live',
    role: 'PERSONEL',
    path: '/personel/live',
    questionType: 'STATUS_HELP',
    message: 'Bu servis kaydı hangi aşamada, sonraki güvenli kontrol ne?',
    selectedSummary: 'Personel servis kaydı',
    selectedLabel: 'Servis',
    selectedRecordStatus: 'Canlı servis görünümü',
    expectedSurfaceKey: 'PERSONEL_LIVE',
    replyNeedles: ['Canlı', 'Sonraki güvenli kontrol', 'Onay noktası'],
    assistantReplyNeedles: ['KVKK'],
  },
  {
    label: 'parent-live',
    role: 'PARENT',
    path: '/parent/live',
    questionType: 'STATUS_HELP',
    message: 'Bu öğrenci servisi hangi aşamada, sonraki güvenli kontrol ne?',
    selectedSummary: 'Öğrenci servisi',
    selectedLabel: 'Servis',
    selectedRecordStatus: 'Canlı öğrenci görünümü',
    expectedSurfaceKey: 'PARENT_LIVE',
    replyNeedles: ['Canlı', 'Öğrenci', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
  {
    label: 'superadmin',
    role: 'SUPER_ADMIN',
    path: '/superadmin/trust-quality',
    questionType: 'READINESS_CHECK',
    message: 'Bu kaydın hazır olup olmadığını ve onay noktasını göster',
    selectedSummary: 'Denetim kaydı',
    selectedLabel: 'Denetim',
    selectedRecordStatus: 'Denetim hazır',
    expectedSurfaceKey: 'SUPERADMIN',
    replyNeedles: ['Süper Yönetici', 'İşlem akışı', 'Sonraki güvenli kontrol', 'Onay noktası'],
  },
];

for (const testCase of positiveCases) {
  runPositiveCase(testCase);
}

runBlockedCase({
  label: 'blocked-direct-help',
  role: 'COMPANY',
  path: '/company',
  questionType: 'PRODUCT_OVERVIEW_HELP',
  message: 'Bu ekran ne işe yarar?',
  selectedSummary: 'Plan taslağı',
  selectedLabel: 'Plan',
  selectedRecordStatus: 'Taslak hazır',
  expectedSurfaceKey: 'COMPANY_PLAN',
});

runBlockedCase({
  label: 'blocked-unsupported-surface',
  role: 'ROOM',
  path: '/shared/logs',
  questionType: 'NEXT_STEP',
  message: 'hangi aşama',
  selectedSummary: 'Log kaydı',
  selectedLabel: 'Log',
  selectedRecordStatus: 'Log hazır',
});

const runtimeCases = positiveCases.length;
const guardCases = 2;
const totalCases = runtimeCases + guardCases;
console.log(`SUMMARY runtimeCases=${runtimeCases} guardCases=${guardCases} assertions=${assertionCount} passCount=${totalCases} failCount=0`);
console.log('PASS COPILOT-WORKFLOW-REASONING-ENGINE-01');
