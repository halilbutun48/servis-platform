#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

let passCount = 0;
let failCount = 0;

const BANNED_TERMS = [
  'free-to-operate',
  'free to operate',
  'root cause',
  'diagnostic',
  'risk scoring',
  'workflow',
  'screen purpose',
  'next best action',
  'current step',
  'selected record',
  'fallback',
  'offline',
  'stale',
  'eta',
  'warning',
  'error',
  'blocker',
  'read-only',
  'readonly',
  'debug',
  'internal',
  'payload',
  'token',
  'hash',
];

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

function ok(label) {
  passCount += 1;
  console.log(`OK ${label}`);
}

function fail(label) {
  failCount += 1;
  throw new Error(`FAIL ${label}`);
}

function must(condition, label) {
  if (!condition) fail(label);
  ok(label);
}

function mustEqual(actual, expected, label) {
  must(normalize(actual) === normalize(expected), `${label} expected=${String(expected || '')} actual=${String(actual || '')}`);
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).flatMap((value) => flattenStrings(value)).map((value) => String(value || '').trim()).filter(Boolean))];
}

function flattenStrings(value) {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => flattenStrings(item));
  if (typeof value === 'object') return Object.values(value).flatMap((item) => flattenStrings(item));
  return [];
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
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: Number(fixture?.screenContext?.selectedEntityId || 1) || 1,
    user,
    message,
    context: { type: 'screen' },
    entityLabel: fixture?.screenContext?.label || '',
    scope: { roleMode: 'OPERATIONS', role: user.role },
    conversationState: null,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
    sourceEntityType: 'screen',
    sourceEntityId: Number(fixture?.screenContext?.selectedEntityId || 1) || 1,
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
    help?.suggestedChips,
    help?.quickActions?.map((row) => ({ label: row?.label, reason: row?.reason, askText: row?.askText })),
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
    assistant?.selectedFieldLines,
    assistant?.selectedBadgeLines,
    assistant?.selectedSignalLines,
    assistant?.suggestedChips,
    assistant?.rootCauseChips,
    assistant?.riskScoringChips,
    assistant?.smartDiagnosticChips,
  ]);
}

function mustNoLeaks(label, values) {
  const haystack = normalize((Array.isArray(values) ? values : []).join(' | '));
  const hits = BANNED_TERMS.filter((term) => {
    if (term === 'eta') return /(^|[^a-z0-9])eta([^a-z0-9]|$)/.test(haystack);
    return haystack.includes(normalize(term));
  });
  must(hits.length === 0, `${label} visible English/system leak: ${hits.join(' / ') || 'none'}`);
}

function mustTurkishAnchor(label, values, anchors) {
  const list = Array.isArray(anchors) ? anchors : [anchors];
  const haystack = normalize((Array.isArray(values) ? values : []).join(' | '));
  must(list.some((anchor) => haystack.includes(normalize(anchor))), `${label} missing Turkish anchor: ${list.join(' / ')}`);
}

function runCase(testCase) {
  const fixture = makeSurfaceFixture(testCase.fixture);
  const help = buildHelpResponse({
    role: testCase.role,
    companyKind: testCase.companyKind || '',
    fixture,
    message: testCase.helpMessage,
  });
  const helpStrings = helpVisibleStrings(help);
  must(String(help.reply || '').trim().length > 0, `${testCase.label} help reply is non-empty`);
  mustNoLeaks(`${testCase.label} help`, helpStrings);
  mustTurkishAnchor(`${testCase.label} help`, helpStrings, testCase.helpAnchors);

  if (testCase.expectQuestionLabel) {
    mustEqual(help.questionLabel, testCase.expectQuestionLabel, `${testCase.label} help question label`);
  }

  const assistant = buildAssistantResponse({
    role: testCase.role,
    companyKind: testCase.companyKind || '',
    fixture,
    message: testCase.assistantMessage || testCase.helpMessage,
    questionType: testCase.assistantQuestionType,
    rawReply: testCase.rawReply || 'Temel cevap.',
  });
  const assistantStrings = assistantVisibleStrings(assistant);
  must(String(assistant.reply || '').trim().length > 0, `${testCase.label} assistant reply is non-empty`);
  mustNoLeaks(`${testCase.label} assistant`, assistantStrings);
  mustTurkishAnchor(`${testCase.label} assistant`, assistantStrings, testCase.assistantAnchors || testCase.helpAnchors);

  if (testCase.expectAssistantField) {
    must(String(assistant[testCase.expectAssistantField] || '').trim().length > 0, `${testCase.label} assistant ${testCase.expectAssistantField} is non-empty`);
  }

  return { help, assistant, helpStrings, assistantStrings };
}

function main() {
  console.log('=== SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01 ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const harness = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const auditDoc = read('docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');

  must(pkg, '"check:seferabiturkishuserfacinglanguage01": "node backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js"', 'package.json exposes Turkish user-facing language audit check');
  must(runner, 'check:seferabiturkishuserfacinglanguage01', 'product extensions runner includes Turkish user-facing language audit');
  must(verifyChain, 'check:seferabiturkishuserfacinglanguage01', 'verify chain exposes Turkish user-facing language audit');
  must(verifyChain, 'node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js', 'verify chain includes Turkish user-facing language audit command');
  must(verifyChain, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'verify chain includes Turkish user-facing language audit doc');
  must(guide, 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01', 'script guide mentions Turkish user-facing language audit milestone');
  must(guide, 'check:seferabiturkishuserfacinglanguage01', 'script guide exposes Turkish user-facing language audit check');
  must(guide, 'node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js', 'script guide includes Turkish user-facing language audit command');
  must(guide, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'script guide includes Turkish user-facing language audit doc');
  must(primer, 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01', 'primer mentions Turkish user-facing language audit milestone');
  must(primer, 'check:seferabiturkishuserfacinglanguage01', 'primer exposes Turkish user-facing language audit check');
  must(primer, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'primer links Turkish user-facing language audit doc');
  must(harness, 'Sefer Abi Turkish user-facing language audit milestone', 'script harness doc mentions Turkish user-facing language audit milestone');
  must(harness, 'check:seferabiturkishuserfacinglanguage01', 'script harness doc exposes Turkish user-facing language audit check');
  must(harness, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'script harness doc links Turkish user-facing language audit doc');
  must(auditDoc, 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01', 'audit doc mentions canonical milestone');
  must(auditDoc, 'check:seferabiturkishuserfacinglanguage01', 'audit doc exposes canonical check');
  must(auditDoc, 'Başarı payı önizlemesi', 'audit doc documents Turkish marketplace label');
  must(helpComposerSource, 'Başarı payı önizlemesi', 'helpComposer keeps Turkish marketplace label');
  must(!normalize(helpComposerSource).includes(normalize('Free-to-operate önizlemesi')), 'helpComposer removes visible Free-to-operate label');

  const cases = [
    {
      label: 'superadmin-overview',
      role: 'SUPER_ADMIN',
      fixture: {
        path: '/superadmin/operations',
        label: 'Sistem',
        menuPurpose: 'Sistem özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Sistem satırı',
        selectedSummary: 'Sistem özeti',
      },
      helpMessage: 'Bu program ne işe yarıyor?',
      helpAnchors: ['Sistem', 'işe yarar', 'özeti'],
      assistantQuestionType: 'STATUS_HELP',
      assistantAnchors: ['Sistem', 'durum', 'özet'],
    },
    {
      label: 'superadmin-commercial',
      role: 'SUPER_ADMIN',
      fixture: {
        path: '/superadmin/commercial-core',
        label: 'Ticari Akış',
        menuPurpose: 'Ticari akış özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Ticari satır',
        selectedSummary: 'Ticari akış özeti',
      },
      helpMessage: 'Bu pay alacak mı?',
      helpAnchors: ['Başarı payı', 'önizleme', 'Ticari'],
      expectQuestionLabel: 'Başarı payı önizlemesi',
      assistantQuestionType: 'RISK_LIST',
      assistantAnchors: ['risk', 'öncelik', 'Ticari'],
    },
    {
      label: 'company-agreements',
      role: 'COMPANY',
      fixture: {
        path: '/company/agreements',
        label: 'Sözleşmeler',
        menuPurpose: 'Sözleşme özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Vardiya satırı',
        selectedSummary: 'Vardiya özeti',
      },
      helpMessage: 'Bu pay alacak mı?',
      helpAnchors: ['Sözleşme', 'başarı payı', 'vardiya'],
      assistantQuestionType: 'ROOT_CAUSE',
      assistantAnchors: ['neden', 'sözleşme', 'vardiya'],
      expectAssistantField: 'rootCauseReply',
    },
    {
      label: 'company-operations',
      role: 'COMPANY',
      fixture: {
        path: '/company/operations',
        label: 'Operasyon Merkezi',
        menuPurpose: 'Operasyon özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Operasyon satırı',
        selectedSummary: 'Operasyon özeti',
      },
      helpMessage: 'Bu ekran ne için?',
      helpAnchors: ['Operasyon', 'ekran', 'amaç'],
      assistantQuestionType: 'SCREEN_EXPLANATION_HELP',
      assistantAnchors: ['ekran', 'amaç', 'kontrol'],
    },
    {
      label: 'room-shifts',
      role: 'ROOM',
      fixture: {
        path: '/room/shifts',
        label: 'Vardiyalar',
        menuPurpose: 'Vardiya özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Vardiya satırı',
        selectedSummary: 'Vardiya özeti',
      },
      helpMessage: 'Bu kayıt neden ilerlemiyor?',
      helpAnchors: ['Vardiya', 'neden', 'ilerlem'],
      assistantQuestionType: 'WHY_BLOCKED',
      assistantAnchors: ['blokaj', 'neden', 'vardiya'],
    },
    {
      label: 'room-vehicles',
      role: 'ROOM',
      fixture: {
        path: '/room/vehicles',
        label: 'Araçlar',
        menuPurpose: 'Araç özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Araç satırı',
        selectedSummary: 'Araç özeti',
      },
      helpMessage: 'Araç neden görünmüyor?',
      helpAnchors: ['Araç', 'görünmüyor', 'özet'],
      assistantQuestionType: 'NEXT_STEP',
      assistantAnchors: ['araç', 'adım', 'görünm'],
    },
    {
      label: 'driver-today',
      role: 'DRIVER',
      fixture: {
        path: '/driver/today',
        label: 'Bugün',
        menuPurpose: 'Günlük sürüş özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Sürüş satırı',
        selectedSummary: 'Bugün özeti',
      },
      helpMessage: 'Buradan sonra ne yapacağım?',
      helpAnchors: ['Sürüş', 'günlük', 'adım'],
      assistantQuestionType: 'HOW_TO_HELP',
      assistantAnchors: ['adım', 'rota', 'sürücü'],
    },
    {
      label: 'personel-live',
      role: 'PERSONEL',
      fixture: {
        path: '/personel/live',
        label: 'Servis',
        menuPurpose: 'Servis durumu özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Servis satırı',
        selectedSummary: 'Servis durumu özeti',
      },
      helpMessage: 'Servis neden görünmüyor?',
      helpAnchors: ['Servis', 'görünmüyor', 'durum'],
      assistantQuestionType: 'WHY_BLOCKED',
      assistantAnchors: ['görünmüyor', 'servis', 'sinyal'],
    },
    {
      label: 'parent-live',
      role: 'PARENT',
      fixture: {
        path: '/parent/live',
        label: 'Veli Servisi',
        menuPurpose: 'Veli servisi özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Çocuk satırı',
        selectedSummary: 'Veli servisi özeti',
      },
      helpMessage: 'Çocuğumun servisi nerede?',
      helpAnchors: ['Çocuk', 'servis', 'veli'],
      assistantQuestionType: 'SCREEN_EXPLANATION_HELP',
      assistantAnchors: ['çocuk', 'servis', 'ekran'],
    },
    {
      label: 'school-operations',
      role: 'SCHOOL',
      companyKind: 'SCHOOL',
      fixture: {
        path: '/school/operations',
        label: 'Okul Operasyon',
        menuPurpose: 'Okul operasyon özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Okul satırı',
        selectedSummary: 'Okul operasyon özeti',
      },
      helpMessage: 'Bu ekran ne için?',
      helpAnchors: ['Okul', 'ekran', 'servis'],
      assistantQuestionType: 'ROLE_EXPLANATION_HELP',
      assistantAnchors: ['okul', 'rol', 'servis'],
    },
    {
      label: 'organization-operations',
      role: 'ORGANIZATION',
      companyKind: 'ORGANIZATION',
      fixture: {
        path: '/organization/operations',
        label: 'Organizasyon Operasyon',
        menuPurpose: 'Organizasyon operasyon özeti',
        firstStep: 'İlk kontrolü aç.',
        nextStep: 'Sıradaki adımı aç.',
        selectedLabel: 'Organizasyon satırı',
        selectedSummary: 'Organizasyon operasyon özeti',
      },
      helpMessage: 'İlk neye bakayım?',
      helpAnchors: ['Organizasyon', 'bakayım', 'operasyon'],
      assistantQuestionType: 'NEXT_BEST_ACTION',
      assistantAnchors: ['organizasyon', 'öncelik', 'adım'],
    },
  ];

  for (const testCase of cases) {
    runCase(testCase);
  }

  must(passCount > 0, 'audit produced at least one check');
  must(failCount === 0, 'audit completed with zero failures');

  console.log('PASS SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01');
  console.log('PASS sefer abi turkish user-facing language audit completed');
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error);
  process.exit(1);
}
