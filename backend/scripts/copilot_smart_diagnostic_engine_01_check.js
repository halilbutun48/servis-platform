#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildDynamicQuestionReply, buildSmartDiagnosticChips, buildSmartDiagnosticReply, buildSmartDiagnosticState } from '../src/ai/chat/conversationTaskStateResponses.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
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

function excerpt(text, limit = 220) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function ok(label) {
  passCount += 1;
  console.log(`OK ${label}`);
}

function fail(label) {
  failCount += 1;
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    ok(label);
    return;
  }
  fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    ok(label);
    return;
  }
  fail(label);
}

function makeUser(role) {
  return { role };
}

function makeSurfaceFixture({
  path: screenPath,
  label,
  menuPurpose = '',
  firstStep = '',
  nextStep = '',
  selectedLabel = '',
  selectedSummary = '',
  selectedRecordStatus = '',
  selectedEntityType = 'record',
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

function buildDiagnosticOptions({
  role,
  fixture,
  message,
  currentReply = 'Temel cevap.',
  questionType = 'NEXT_STEP',
  conversationState = null,
} = {}) {
  return {
    message,
    currentReply,
    questionType,
    screenPath: fixture?.screenContext?.path || '',
    screenDefinition: fixture?.screenDefinition || null,
    screenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    conversationState,
    contextPriority: null,
    analysis: null,
    roleMode: 'OPERATIONS',
    userRole: role,
    user: makeUser(role),
    guidedTaskMeta: null,
    context: null,
    entityType: 'screen',
  };
}

function buildHelpResponse({
  role,
  fixture,
  message,
  conversationState = null,
} = {}) {
  const user = makeUser(role);
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: Number(fixture?.screenContext?.selectedEntityId || 1) || 1,
    user,
    message,
    context: { type: 'screen' },
    entityLabel: fixture?.screenContext?.label || '',
    scope: { roleMode: 'OPERATIONS', role },
    conversationState,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
  });
}

function buildAssistantResponse({
  role,
  fixture,
  message,
  rawReply = 'Temel cevap.',
  questionType = 'NEXT_STEP',
  conversationState = null,
} = {}) {
  const user = makeUser(role);
  const menuPurpose = fixture?.screenDefinition?.menuPurpose || '';
  const nextStep = fixture?.screenDefinition?.nextStep || '';
  const analysis = {
    reasoningLead: menuPurpose,
    nextBestAction: nextStep,
    safestNextStep: nextStep,
    selectedRecordStatus: fixture?.screenContext?.selectedRecordStatus || fixture?.screenContext?.selectedSummary || fixture?.screenContext?.selectedLabel || '',
    compareHint: '',
    blockers: [],
    missingData: [],
    evidence: [],
  };
  const contextPriority = {
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
  };
  const guide = {
    plainSummary: menuPurpose,
    summary: menuPurpose,
    screenExplanation: menuPurpose,
    whatToDoNow: fixture?.screenDefinition?.firstStep || 'İlk kontrolü aç.',
    whatToDoNext: nextStep || 'Sonraki adımı aç.',
    whyBlocked: '',
    doNotDo: '',
  };
  return buildSeferAbiReasoningAssistant({
    rawReply,
    message,
    questionType,
    replyMode: 'SHORT',
    guide,
    roleMode: 'OPERATIONS',
    userRole: role,
    user,
    screenPath: fixture?.screenContext?.path || '',
    screenDefinition: fixture?.screenDefinition || null,
    screenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
}

function main() {
  console.log('=== COPILOT SMART DIAGNOSTIC ENGINE 01 ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const smartDiagnosticDoc = read('docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md');
  const responsesSource = read('backend/src/ai/chat/conversationTaskStateResponses.js');
  const dynamicSource = read('backend/src/ai/chat/conversationTaskStateDynamicQuestions.js');
  const smartSource = read('backend/src/ai/chat/conversationSmartDiagnostics.js');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const assistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotsmartdiagnosticengine01": "node backend/scripts/copilot_smart_diagnostic_engine_01_check.js"', 'package.json exposes check:copilotsmartdiagnosticengine01');
  assertProductExtensionsOrder(['check:copilotdynamicquestionengine01', 'check:copilotsmartdiagnosticengine01', 'check:copilotrootcauseengine01'], 'product extensions registry keeps smart diagnostic engine after dynamic question engine and before root cause engine', registryScripts);
  must(guide, 'COPILOT-SMART-DIAGNOSTIC-ENGINE-01', 'script guide mentions smart diagnostic engine milestone');
  must(guide, 'check:copilotsmartdiagnosticengine01', 'script guide exposes smart diagnostic engine check');
  must(guide, 'node backend\\scripts\\copilot_smart_diagnostic_engine_01_check.js', 'script guide includes smart diagnostic engine command');
  must(guide, 'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md', 'script guide includes smart diagnostic engine doc');
  must(primer, 'COPILOT-SMART-DIAGNOSTIC-ENGINE-01', 'primer mentions smart diagnostic engine milestone');
  must(primer, 'check:copilotsmartdiagnosticengine01', 'primer exposes smart diagnostic engine check');
  must(primer, 'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md', 'primer links smart diagnostic engine doc');
  must(primer, 'backend/src/ai/chat/conversationSmartDiagnostics.js', 'primer links smart diagnostic engine helper');
  must(harnessDoc, 'Copilot smart diagnostic engine milestone: `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`', 'script harness doc lists smart diagnostic engine milestone');
  must(harnessDoc, 'root:check:copilotsmartdiagnosticengine01', 'script harness doc lists smart diagnostic engine root check');
  must(harnessDoc, 'copilot_smart_diagnostic_engine_01_check.js', 'script harness doc lists smart diagnostic engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationSmartDiagnostics.js', 'script harness doc lists smart diagnostic engine helper');
  must(smartDiagnosticDoc, '# COPILOT SMART DIAGNOSTIC ENGINE 01', 'smart diagnostic doc title present');
  must(smartDiagnosticDoc, 'Canonical check: `check:copilotsmartdiagnosticengine01`', 'smart diagnostic doc keeps canonical check wording');
  must(smartDiagnosticDoc, 'conversationSmartDiagnostics.js', 'smart diagnostic doc mentions canonical helper');
  must(smartDiagnosticDoc, 'conversationTaskStateDynamicQuestions.js', 'smart diagnostic doc mentions dynamic helper');
  must(smartDiagnosticDoc, 'helpComposer.js', 'smart diagnostic doc mentions help composer');
  must(smartDiagnosticDoc, 'seferAbiReasoningAssistant.js', 'smart diagnostic doc mentions reasoning assistant');
  must(smartDiagnosticDoc, 'Netleştirelim', 'smart diagnostic doc keeps diagnostic clarification phrasing');
  must(smartDiagnosticDoc, 'Devam edelim', 'smart diagnostic doc keeps diagnostic continuation phrasing');
  must(responsesSource, 'buildSmartDiagnosticState', 'responses facade exports smart diagnostic state');
  must(responsesSource, 'buildSmartDiagnosticReply', 'responses facade exports smart diagnostic reply');
  must(responsesSource, 'buildSmartDiagnosticChips', 'responses facade exports smart diagnostic chips');
  must(dynamicSource, 'buildSmartDiagnosticState', 'dynamic question helper imports smart diagnostic state');
  must(dynamicSource, 'buildDynamicQuestionReply', 'dynamic question helper exports dynamic reply');
  must(smartSource, 'ROOM_SHIFTS_START_BLOCKED', 'smart diagnostic source includes room shifts start blocked theme');
  must(smartSource, 'PARENT_LIVE_ARRIVAL_MISSING', 'smart diagnostic source includes parent live arrival theme');
  must(smartSource, 'GENERIC_SELECTION_RE', 'smart diagnostic source keeps generic selection guard');
  must(smartSource, 'buildSmartDiagnosticState', 'smart diagnostic source exports smart diagnostic state');
  must(helpComposerSource, 'buildDynamicQuestionReplyImpl', 'help composer keeps dynamic question reply integration');
  must(assistantSource, 'smartDiagnosticState', 'reasoning assistant stores smart diagnostic state');
  must(assistantSource, 'buildSmartDiagnosticState', 'reasoning assistant imports smart diagnostic helper');

  const planningFixture = makeSurfaceFixture({
    path: '/company/planning-center',
    label: 'Planlama Merkezi',
    menuPurpose: 'Planlama Merkezi yeni plan oluşturma ve rota önizleme için kullanılır.',
    firstStep: 'Plan satırını aç.',
    nextStep: 'Rota ve personel durumunu kontrol et.',
    selectedLabel: 'Seçili plan',
    selectedSummary: 'Plan hazır',
    selectedRecordStatus: 'Planlama merkezinde hazır',
    selectedEntityType: 'plan',
    selectedEntityId: 11,
  });
  const roomShiftsFixture = makeSurfaceFixture({
    path: '/room/shifts',
    label: 'Vardiyalar',
    menuPurpose: 'Vardiya başlatma ve canlı operasyon kontrolü için kullanılır.',
    firstStep: 'Vardiya satırını aç.',
    nextStep: 'Araç ve sürücü bilgisini kontrol et.',
    selectedLabel: 'Vardiya 6',
    selectedSummary: 'Seçili vardiya',
    selectedRecordStatus: 'Hazır',
    selectedEntityType: 'shift',
    selectedEntityId: 6,
  });
  const parentLiveFixture = makeSurfaceFixture({
    path: '/parent/live',
    label: 'Veli Canlı',
    menuPurpose: 'Öğrenci servis takibi için kullanılır.',
    firstStep: 'Servis durumunu aç.',
    nextStep: 'Konum ve saat bilgisini kontrol et.',
    selectedLabel: 'Öğrenci Servisi',
    selectedSummary: 'Canlı servis',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    selectedEntityType: 'student_service',
    selectedEntityId: 21,
  });
  const genericFixture = {
    screenDefinition: {
      path: '/superadmin',
      label: 'Genel Bakış',
    },
    screenContext: {
      path: '/superadmin',
      label: 'Genel Bakış',
      selectedFields: [],
      selectedBadges: [],
      structuredFacts: {},
    },
  };

  const planningOptions = buildDiagnosticOptions({
    role: 'COMPANY',
    fixture: planningFixture,
    message: 'Rota neden görünmüyor?',
  });
  const planningState = buildSmartDiagnosticState(planningOptions);
  must(planningState.theme, 'COMPANY_PLANNING_ROUTE_MISSING', 'planning diagnostic theme selected');
  must(planningState.reply, 'Rota genelde personel konumu eksikse', 'planning diagnostic reply explains route missing');
  must(planningState.reply, 'konumu eksik personelleri, sonra vardiya saatini kontrol edelim', 'planning diagnostic reply points to first check');
  must(buildSmartDiagnosticReply(planningOptions), 'Rota genelde personel konumu eksikse', 'planning diagnostic reply helper matches state');
  must(buildSmartDiagnosticChips(planningOptions).join(' '), 'Konumu eksik personeller', 'planning diagnostic chips include personel check');
  must(buildSmartDiagnosticChips(planningOptions).join(' '), 'Plan personel listesi', 'planning diagnostic chips include plan list check');
  must(buildDynamicQuestionReply(planningOptions), 'Rota genelde personel konumu eksikse', 'dynamic question reply uses smart diagnostic reply');

  const planningHelp = buildHelpResponse({
    role: 'COMPANY',
    fixture: planningFixture,
    message: 'Rota neden görünmüyor?',
  });
  must(planningHelp.reply, 'Rota genelde personel konumu eksikse', 'help composer uses smart diagnostic reply');

  const planningAssistant = buildAssistantResponse({
    role: 'COMPANY',
    fixture: planningFixture,
    message: 'Rota neden görünmüyor?',
  });
  must(planningAssistant.reply, 'Rota genelde personel konumu eksikse', 'reasoning assistant uses smart diagnostic reply');
  if (planningAssistant.mode !== 'CONTEXTUAL_REASONING') {
    fail(`planning reasoning assistant mode expected CONTEXTUAL_REASONING actual=${planningAssistant.mode}`);
  }
  ok('planning reasoning assistant mode');

  const roomState = buildSmartDiagnosticState(buildDiagnosticOptions({
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Başlatamıyorum.',
  }));
  must(roomState.theme, 'ROOM_SHIFTS_START_BLOCKED', 'room shifts start blocked theme selected');
  must(roomState.reply, 'Başlatma engeli genelde vardiya zamanı', 'room shifts diagnostic reply explains start block');
  must(roomState.reply, 'seçili vardiyanın atama ve canlı başlangıç durumunu kontrol edelim', 'room shifts diagnostic reply points to live start checks');
  must(buildSmartDiagnosticChips(buildDiagnosticOptions({
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Başlatamıyorum.',
  })).join(' '), 'Canlı başlangıç', 'room shifts diagnostic chips include live start');

  const parentState = buildSmartDiagnosticState(buildDiagnosticOptions({
    role: 'PARENT',
    fixture: parentLiveFixture,
    message: 'Servis gelmedi.',
  }));
  must(parentState.theme, 'PARENT_LIVE_ARRIVAL_MISSING', 'parent live arrival theme selected');
  must(parentState.reply, 'Servis gelmediyse önce planlanan servis saati', 'parent diagnostic reply explains missing arrival');

  const ambiguousState = buildSmartDiagnosticState(buildDiagnosticOptions({
    role: 'SUPER_ADMIN',
    fixture: genericFixture,
    message: 'Görünmüyor.',
    currentReply: '',
  }));
  if (ambiguousState.isDiagnostic) {
    fail(`ambiguous reply unexpectedly diagnostic: ${excerpt(ambiguousState.reply)}`);
  }
  ok('ambiguous reply stays non-diagnostic');
  if (String(ambiguousState.reply || '').trim() !== '') {
    fail(`ambiguous reply expected empty actual=${excerpt(ambiguousState.reply)}`);
  }
  ok('ambiguous reply stays empty');
  if (String(buildDynamicQuestionReply(buildDiagnosticOptions({
    role: 'SUPER_ADMIN',
    fixture: genericFixture,
    message: 'Görünmüyor.',
    currentReply: '',
  }))).trim() !== '') {
    fail('dynamic question reply unexpectedly returned text for ambiguous bare symptom');
  }
  ok('dynamic question reply stays empty for ambiguous bare symptom');

  const ambiguousHelp = buildHelpResponse({
    role: 'SUPER_ADMIN',
    fixture: genericFixture,
    message: 'Görünmüyor.',
  });
  mustNot(ambiguousHelp.reply, 'Rota genelde', 'help composer does not over-diagnose ambiguous bare symptom');
  mustNot(ambiguousHelp.reply, 'Başlatma engeli', 'help composer keeps ambiguous bare symptom away from start-block diagnostics');

  const runtimeCases = passCount + failCount;
  const testedCases = runtimeCases;
  console.log(`runtimeCases=${runtimeCases}`);
  console.log(`testedCases=${testedCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log('PASS COPILOT-SMART-DIAGNOSTIC-ENGINE-01');
  console.log('PASS smart diagnostic engine check completed');
}

main();
