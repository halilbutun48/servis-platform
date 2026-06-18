#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import {
  buildSeferAbiReasoningAssistant,
  SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION,
  getSeferAbiReasoningRoleProfile,
  listSeferAbiReasoningRoles,
} from '../src/ai/chat/seferAbiReasoningAssistant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const helperRel = 'backend/src/ai/chat/seferAbiReasoningAssistant.js';
const docRel = 'docs/SEFER_ABI_REASONING_ASSISTANT_01.md';

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
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
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
}

function gitDiffNames(paths) {
  const out = execFileSync('git', ['diff', '--name-only', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCachedNames() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) fail(`${label}: ${files.join(', ')}`);
  ok(label);
}

function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) fail(`${label}: ${hits.join(', ')}`);
  ok(label);
}

async function loadModule(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function buildSnapshotCase({
  role,
  companyKind = '',
  screenPath,
  screenLabel,
  message,
  rawReply = 'Temel cevap.',
  selectedSummary = 'Seçili kayıt hazır.',
  selectedLabel = 'Seçili kayıt',
  selectedRecordStatus = 'Seçili kayıt hazır.',
  reasoningLead = '',
  nextBestAction = '',
  roleMode = 'OPERATIONS',
  questionType = 'STATUS_HELP',
  blockers = [],
  missingData = [],
  evidence = [],
  compareHint = '',
  conversationState = null,
  contextPriorityExtra = {},
} = {}) {
  const user = makeUser(role, companyKind);
  const screenContext = {
    path: screenPath,
    label: screenLabel,
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
      blockers,
      missing: missingData,
      evidence,
      compareHint,
      selectedRecordStatus,
    },
  };
  const screenDefinition = {
    path: screenPath,
    label: screenLabel,
  };
  const analysis = {
    reasoningLead,
    nextBestAction,
    safestNextStep: nextBestAction,
    selectedRecordStatus,
    compareHint,
    blockers,
    missingData,
    evidence,
  };
  const contextPriority = {
    summaryLead: reasoningLead,
    bestNextAction: nextBestAction,
    selectedRecordMismatchLead: selectedRecordStatus,
    evidenceConfidence: evidence[0] || '',
    roleBoundary: contextPriorityExtra.roleBoundary || '',
    needsSelection: Boolean(contextPriorityExtra.needsSelection),
    sameRecordLikely: Boolean(contextPriorityExtra.sameRecordLikely),
    activeTopic: questionType,
    activeTopicLabel: contextPriorityExtra.activeTopicLabel || '',
    followUpPrompt: contextPriorityExtra.followUpPrompt || '',
    guidedTaskMeta: contextPriorityExtra.guidedTaskMeta || null,
  };
  const guide = {
    plainSummary: reasoningLead,
    summary: reasoningLead,
    screenExplanation: reasoningLead,
    whatToDoNow: nextBestAction,
    whatToDoNext: nextBestAction,
    whyBlocked: compareHint,
    doNotDo: contextPriorityExtra.doNotDo || '',
  };
  return buildSeferAbiReasoningAssistant({
    rawReply,
    message,
    questionType,
    replyMode: contextPriorityExtra.replyMode || 'SHORT',
    guide,
    roleMode,
    userRole: user.role,
    user,
    screenPath,
    screenDefinition,
    screenContext,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta: contextPriority.guidedTaskMeta,
    entityType: 'screen',
  });
}

function assertRoleFrame(caseItem, assistant, expectedFrame, expectedNeedle) {
  if (String(caseItem.roleMode || '').toUpperCase() === 'SIMPLE') mustNot(assistant.reply, expectedFrame, `${caseItem.label} reply drops the role frame`);
  else must(assistant.reply, expectedFrame, `${caseItem.label} reply includes role frame`);
  must(assistant.reply, expectedNeedle, `${caseItem.label} reply includes reasoning needle`);
  must(assistant.reply, caseItem.selectedSummary, `${caseItem.label} reply includes selected summary`);
  assert(assistant.mode === 'CONTEXTUAL_REASONING', `${caseItem.label} contextual reasoning mode`);
  assert(assistant.effectiveRole === caseItem.effectiveRole, `${caseItem.label} effective role`);
  assert(Array.isArray(assistant.suggestedChips) && assistant.suggestedChips.length > 0, `${caseItem.label} suggested chips`);
  assert(Boolean(assistant.clarifyingQuestion), `${caseItem.label} clarifying question`);
  assert(Boolean(assistant.safeAlternative), `${caseItem.label} safe alternative`);
}

async function main() {
  console.log('=== SEFER-ABI-REASONING-ASSISTANT-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const guidedDoc = read('docs/COPILOT_GUIDED_TASK_ENGINE_01.md');
  const doc = read(docRel);
  const helperText = read(helperRel);
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const qualityScorerSource = read('backend/src/ai/chat/qualityScorer.js');
  const cachedNames = gitCachedNames();
  const helperMod = await loadModule(helperRel);
  const screenCatalogMod = await loadModule('backend/src/ai/jobGuide/screenCatalog.js');
  const getScreenDefinitionForUser = screenCatalogMod.getScreenDefinitionForUser;

  must(pkg, '"check:seferabireasoningassistant01": "node backend/scripts/sefer_abi_reasoning_assistant_01_check.js"', 'package.json exposes reasoning assistant check');
  ordered(runner, ['check:copilotguidedtaskengine01', 'check:seferabireasoningassistant01', 'check:uxcopilotsmartchips01'], 'product extensions runner places reasoning assistant after guided task engine');
  ordered(verify, ['check:copilotguidedtaskengine01', 'check:seferabireasoningassistant01', 'check:uxcopilotsmartchips01'], 'verify chain places reasoning assistant after guided task engine');

  must(guide, 'SEFER-ABI-REASONING-ASSISTANT-01', 'script guide mentions reasoning assistant milestone');
  must(guide, 'check:seferabireasoningassistant01', 'script guide exposes reasoning assistant check');
  must(guide, 'node backend\\scripts\\sefer_abi_reasoning_assistant_01_check.js', 'script guide includes reasoning assistant command');
  must(guide, 'docs/SEFER_ABI_REASONING_ASSISTANT_01.md', 'script guide includes reasoning assistant doc');
  ordered(guide, ['COPILOT-GUIDED-TASK-ENGINE-01', 'SEFER-ABI-REASONING-ASSISTANT-01', 'ETA-SANITY-01'], 'script guide keeps reasoning assistant after guided task engine');

  must(primer, 'SEFER-ABI-REASONING-ASSISTANT-01', 'primer mentions reasoning assistant milestone');
  must(primer, 'check:seferabireasoningassistant01', 'primer exposes reasoning assistant check');
  must(primer, 'docs/SEFER_ABI_REASONING_ASSISTANT_01.md', 'primer links reasoning assistant doc');
  must(primer, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'primer links reasoning assistant helper');

  must(roadmapLock, 'SEFER-ABI-REASONING-ASSISTANT-01', 'roadmap lock keeps reasoning assistant milestone');
  must(roleMatrix, 'SEFER-ABI-REASONING-ASSISTANT-01', 'role/task matrix references reasoning assistant milestone');
  must(aiRoadmap, 'SEFER-ABI-REASONING-ASSISTANT-01', 'AI action roadmap references reasoning assistant milestone');
  must(guidedDoc, 'SEFER-ABI-REASONING-ASSISTANT-01', 'guided task engine doc references reasoning assistant milestone');
  must(guidedDoc, 'Golden pack', 'guided task engine doc keeps golden pack test-only wording');

  must(doc, '# SEFER ABI REASONING ASSISTANT 01', 'reasoning assistant doc title present');
  must(doc, 'Canonical check: `check:seferabireasoningassistant01`', 'reasoning assistant doc keeps canonical check wording');
  must(doc, 'role + screen + selected record + conversation state', 'reasoning assistant doc keeps context inputs');
  must(doc, 'repetition control', 'reasoning assistant doc keeps repetition control wording');
  must(doc, 'clarifying question', 'reasoning assistant doc keeps clarifying question wording');
  must(doc, 'safe refusal', 'reasoning assistant doc keeps safe refusal wording');
  must(doc, 'Golden pack test/kabul içindir', 'reasoning assistant doc keeps golden pack test-only wording');
  must(doc, 'reply source değildir', 'reasoning assistant doc keeps reply-source boundary');
  must(doc, 'Runtime AI action açmaz', 'reasoning assistant doc keeps runtime boundary');
  must(doc, 'Tool execution açmaz', 'reasoning assistant doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açmaz', 'reasoning assistant doc keeps dispatcher boundary');
  must(doc, 'DB write açmaz', 'reasoning assistant doc keeps db boundary');
  must(doc, 'Route apply açmaz', 'reasoning assistant doc keeps route apply boundary');
  must(doc, 'Fake success açmaz', 'reasoning assistant doc keeps fake success boundary');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(doc, role, `reasoning assistant doc covers role ${role}`);
  }

  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_VERSION', 'helper exposes version marker');
  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_MODES', 'helper exposes modes');
  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helperText, 'SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES', 'helper exposes role profiles');
  must(helperText, 'listSeferAbiReasoningRoles', 'helper exposes role lister');
  must(helperText, 'getSeferAbiReasoningRoleProfile', 'helper exposes role profile getter');
  must(helperText, 'buildSeferAbiReasoningAssistantContextSnapshot', 'helper exposes context snapshot builder');
  must(helperText, 'detectSeferAbiReasoningMode', 'helper exposes mode detector');
  must(helperText, 'composeSeferAbiReasoningReply', 'helper exposes reply composer');
  must(helperText, 'buildSeferAbiReasoningAssistant', 'helper exposes assistant builder');
  must(helperText, 'hasExplicitRoleBoundarySignal', 'helper uses explicit role boundary signal');
  mustNot(helperText, 'goldenQuestionPack', 'helper never imports golden pack');
  mustNot(helperText, 'fetch(', 'helper has no fetch runtime');
  mustNot(helperText, 'spawn(', 'helper has no spawn runtime');
  mustNot(helperText, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helperText, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helperText, 'express', 'helper has no express runtime');
  mustNot(helperText, 'router.', 'helper has no router runtime');
  mustNot(helperText, 'Router(', 'helper has no router runtime');
  mustNot(helperText, 'prisma', 'helper has no prisma runtime');
  mustNot(helperText, 'axios', 'helper has no network client runtime');
  mustNot(helperText, 'http.request', 'helper has no http runtime');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(helperText, role, `helper keeps role ${role}`);
  }

  must(helpComposerSource, 'buildSeferAbiReasoningAssistant', 'help composer imports reasoning assistant');
  must(helpComposerSource, 'reasoningAssistant.reply || rawReply', 'help composer prefers reasoning assistant reply');
  must(helpComposerSource, 'lastReasoningAssistantFingerprint', 'conversation state stores reasoning fingerprint');
  must(helpComposerSource, 'lastReasoningAssistantMode', 'conversation state stores reasoning mode');
  must(helpComposerSource, 'lastReasoningAssistantSummary', 'conversation state stores reasoning summary');
  mustNot(helpComposerSource, 'goldenQuestionPack', 'help composer does not use golden pack as reply source');

  must(qualityScorerSource, 'buildGoldenQuestionPack', 'quality scorer keeps golden pack as test source');
  must(qualityScorerSource, 'goldenQuestionPack', 'quality scorer imports golden pack test source');

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  assert(cachedNames.length === 0, 'stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  const helperExports = Object.keys(helperMod).join(' | ');
  for (const exportName of [
    'SEFER_ABI_REASONING_ASSISTANT_VERSION',
    'SEFER_ABI_REASONING_ASSISTANT_MODES',
    'SEFER_ABI_REASONING_ASSISTANT_GUARD_REQUIREMENTS',
    'SEFER_ABI_REASONING_ASSISTANT_PUBLIC_PROMISE',
    'SEFER_ABI_REASONING_ASSISTANT_BLOCKED_ACTIONS',
    'SEFER_ABI_REASONING_ASSISTANT_NEVER_AUTOMATE',
    'SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES',
    'listSeferAbiReasoningRoles',
    'getSeferAbiReasoningRoleProfile',
    'buildSeferAbiReasoningAssistantContextSnapshot',
    'detectSeferAbiReasoningMode',
    'composeSeferAbiReasoningReply',
    'buildSeferAbiReasoningAssistant',
  ]) {
    must(helperExports, exportName, `helper exports ${exportName}`);
  }

  const roleCases = [
    {
      label: 'Super admin',
      effectiveRole: 'SUPER_ADMIN',
      role: 'SUPER_ADMIN',
      screenPath: '/superadmin/operations',
      screenLabel: 'Super Admin Operations',
      message: 'Bu kaydı stratejik özetle.',
      expectedFrame: 'Sistem açısından:',
      expectedNeedle: 'risk',
      selectedSummary: 'Operasyon riski yüksek',
      selectedRecordStatus: 'Operasyon riski yüksek',
      reasoningLead: 'Bu ekranda risk ve audit birlikte okunmalı.',
      nextBestAction: 'Önce kritik kayıtları sırala.',
      roleMode: 'OPERATIONS',
    },
    {
      label: 'Company',
      effectiveRole: 'COMPANY',
      role: 'COMPANY',
      screenPath: '/company/agreements',
      screenLabel: 'Company Agreements',
      message: 'Bugünkü planı ve eksik veriyi söyle.',
      expectedFrame: 'Şirket açısından:',
      expectedNeedle: 'plan',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      reasoningLead: 'Bu plan vardiya ve sözleşme hazırlığını etkiliyor.',
      nextBestAction: 'Önce eksik veri ve sözleşme kaydını kontrol et.',
      roleMode: 'OPERATIONS',
    },
    {
      label: 'Room',
      effectiveRole: 'ROOM',
      role: 'ROOM',
      screenPath: '/room/shifts',
      screenLabel: 'Room Shifts',
      message: 'Bu vardiya neden ilerlemiyor?',
      expectedFrame: 'Oda açısından:',
      expectedNeedle: 'araç',
      selectedSummary: 'Vardiya araç ve sürücü bekliyor',
      selectedRecordStatus: 'Vardiya araç ve sürücü bekliyor',
      reasoningLead: 'Araç ve sürücü bağı önce netleşmeli.',
      nextBestAction: 'Önce araç ve sürücü alanını kontrol et.',
      roleMode: 'OPERATIONS',
    },
    {
      label: 'Driver',
      effectiveRole: 'DRIVER',
      role: 'DRIVER',
      screenPath: '/driver/today',
      screenLabel: 'Driver Today',
      message: 'Bugünkü rota ne durumda?',
      expectedFrame: 'Kısaca:',
      expectedNeedle: 'rota',
      selectedSummary: 'Aktif rota var',
      selectedRecordStatus: 'Aktif rota var',
      reasoningLead: 'Aktif rota ve check-in birlikte okunmalı.',
      nextBestAction: 'Önce check-in ve son durak sinyalini kontrol et.',
      roleMode: 'SIMPLE',
    },
    {
      label: 'Personel',
      effectiveRole: 'PERSONEL',
      role: 'PERSONEL',
      screenPath: '/personel/live',
      screenLabel: 'Personel Live',
      message: 'Servisim ne durumda?',
      expectedFrame: 'Sade cevap:',
      expectedNeedle: 'KVKK',
      selectedSummary: 'Servis görünür ama kişisel alanlar sınırlı',
      selectedRecordStatus: 'Servis görünür ama kişisel alanlar sınırlı',
      reasoningLead: 'Servis ve kişisel bilgi sınırı birlikte okunmalı.',
      nextBestAction: 'Önce servis durumunu ve görünür bilgiyi kontrol et.',
      roleMode: 'SIMPLE',
    },
    {
      label: 'Parent',
      effectiveRole: 'PARENT',
      role: 'PARENT',
      screenPath: '/parent/live',
      screenLabel: 'Parent Live',
      message: 'Çocuğumun servisi ne durumda?',
      expectedFrame: 'Kısa cevap:',
      expectedNeedle: 'çocuk',
      selectedSummary: 'Çocuğun servisi beklemede',
      selectedRecordStatus: 'Çocuğun servisi beklemede',
      reasoningLead: 'Servis ve KVKK sınırı birlikte okunmalı.',
      nextBestAction: 'Önce servis durumunu ve görünür sınırı kontrol et.',
      roleMode: 'SIMPLE',
    },
    {
      label: 'School',
      effectiveRole: 'SCHOOL',
      role: 'COMPANY',
      companyKind: 'SCHOOL',
      screenPath: '/school/operations',
      screenLabel: 'School Operations',
      message: 'Bu servis planında neye bakmalıyım?',
      expectedFrame: 'Plan ve kanıt açısından:',
      expectedNeedle: 'kanıt',
      selectedSummary: 'Plan ve onay bekleniyor',
      selectedRecordStatus: 'Plan ve onay bekleniyor',
      reasoningLead: 'Plan ve kanıt birlikte okunmalı.',
      nextBestAction: 'Önce plan, kanıt ve onay sınırını aç.',
      roleMode: 'OPERATIONS',
    },
    {
      label: 'Organization',
      effectiveRole: 'ORGANIZATION',
      role: 'COMPANY',
      companyKind: 'ORGANIZATION',
      screenPath: '/organization/operations',
      screenLabel: 'Organization Operations',
      message: 'Bu operasyon için onay ve kanıt durumu ne?',
      expectedFrame: 'Plan ve onay açısından:',
      expectedNeedle: 'onay',
      selectedSummary: 'Operasyon onayı bekliyor',
      selectedRecordStatus: 'Operasyon onayı bekliyor',
      reasoningLead: 'Plan ve onay birlikte okunmalı.',
      nextBestAction: 'Önce plan, kanıt ve onay sınırını aç.',
      roleMode: 'OPERATIONS',
    },
  ];

  for (const caseItem of roleCases) {
    const assistant = buildSnapshotCase(caseItem);
    assertRoleFrame(caseItem, assistant, caseItem.expectedFrame, caseItem.expectedNeedle);
    assert(getSeferAbiReasoningRoleProfile(caseItem.effectiveRole).frame === caseItem.expectedFrame, `${caseItem.label} role profile frame`);
    assert(listSeferAbiReasoningRoles().includes(caseItem.effectiveRole), `${caseItem.label} role listed`);
  }

  const firstRepeat = buildSnapshotCase({
    label: 'Repeat base',
    effectiveRole: 'ROOM',
    role: 'ROOM',
    screenPath: '/room/shifts',
    screenLabel: 'Room Shifts',
    message: 'Bu vardiya neden ilerlemiyor?',
    selectedSummary: 'Vardiya araç ve sürücü bekliyor',
    selectedRecordStatus: 'Vardiya araç ve sürücü bekliyor',
    reasoningLead: 'Araç ve sürücü bağı önce netleşmeli.',
    nextBestAction: 'Önce araç ve sürücü alanını kontrol et.',
    roleMode: 'OPERATIONS',
  });
  const secondRepeat = buildSeferAbiReasoningAssistant({
    rawReply: 'Temel cevap.',
    message: 'Bu vardiya neden ilerlemiyor?',
    questionType: 'WHY_BLOCKED',
    replyMode: 'WHY',
    guide: {
      plainSummary: 'Araç ve sürücü bağı önce netleşmeli.',
      summary: 'Araç ve sürücü bağı önce netleşmeli.',
      screenExplanation: 'Araç ve sürücü bağı önce netleşmeli.',
      whatToDoNow: 'Önce araç ve sürücü alanını kontrol et.',
      whatToDoNext: 'Önce araç ve sürücü alanını kontrol et.',
    },
    roleMode: 'OPERATIONS',
    userRole: 'ROOM',
    user: { role: 'ROOM' },
    screenPath: '/room/shifts',
    screenDefinition: { path: '/room/shifts', label: 'Room Shifts' },
    screenContext: {
      path: '/room/shifts',
      label: 'Room Shifts',
      selectedSummary: 'Vardiya araç ve sürücü bekliyor',
      selectedLabel: 'Vardiya',
      selectedRecordStatus: 'Vardiya araç ve sürücü bekliyor',
    },
    analysis: {
      reasoningLead: 'Araç ve sürücü bağı önce netleşmeli.',
      nextBestAction: 'Önce araç ve sürücü alanını kontrol et.',
      selectedRecordStatus: 'Vardiya araç ve sürücü bekliyor',
      blockers: ['Vardiya araç ve sürücü bekliyor'],
      missingData: [],
      evidence: [],
      compareHint: '',
    },
    contextPriority: {
      summaryLead: 'Araç ve sürücü bağı önce netleşmeli.',
      bestNextAction: 'Önce araç ve sürücü alanını kontrol et.',
      selectedRecordMismatchLead: 'Vardiya araç ve sürücü bekliyor',
      needsSelection: false,
    },
    conversationState: {
      lastReasoningFingerprint: firstRepeat.fingerprint,
      lastReasoningRepeatCount: 1,
      lastUserMessage: 'Bu vardiya neden ilerlemiyor?',
      lastRawUserMessage: 'Bu vardiya neden ilerlemiyor?',
    },
    guidedTaskMeta: null,
    entityType: 'screen',
  });
  assert(secondRepeat.mode === 'REPETITION_CONTROL', 'repeat control mode');
  must(secondRepeat.reply, 'farklı açıdan', 'repeat control phrasing');

  const clarification = buildSeferAbiReasoningAssistant({
    rawReply: 'Temel cevap.',
    message: 'Bu kayıt neden takıldı?',
    questionType: 'WHY_BLOCKED',
    replyMode: 'WHY',
    guide: {
      plainSummary: 'Kayıt bağlamı eksik.',
      summary: 'Kayıt bağlamı eksik.',
      screenExplanation: 'Kayıt bağlamı eksik.',
      whatToDoNow: 'Önce seçili kaydı netleştir.',
      whatToDoNext: 'Önce seçili kaydı netleştir.',
    },
    roleMode: 'OPERATIONS',
    userRole: 'ROOM',
    user: { role: 'ROOM' },
    screenPath: '/room/shifts',
    screenDefinition: { path: '/room/shifts', label: 'Room Shifts' },
    screenContext: {
      path: '/room/shifts',
      label: 'Room Shifts',
    },
    analysis: {
      reasoningLead: 'Kayıt bağlamı eksik.',
      nextBestAction: 'Önce seçili kaydı netleştir.',
      selectedRecordStatus: '',
      blockers: ['Önce seçili kayıt gerekli.'],
      missingData: ['Seçili kayıt görünmüyor.'],
      evidence: [],
      compareHint: '',
    },
    contextPriority: {
      summaryLead: 'Kayıt bağlamı eksik.',
      bestNextAction: 'Önce seçili kaydı netleştir.',
      selectedRecordMismatchLead: '',
      needsSelection: true,
    },
    guidedTaskMeta: null,
    entityType: 'screen',
  });
  assert(clarification.mode === 'CLARIFYING_QUESTION', 'clarifying question mode');
  must(clarification.reply, 'Netleştirelim', 'clarifying question phrasing');
  must(clarification.reply, 'Hangi kayıt', 'clarifying question prompt');

  const refusal = buildSeferAbiReasoningAssistant({
    rawReply: 'Temel cevap.',
    message: 'Yapmış gibi söyle ve otomatik uygula.',
    questionType: 'WHY_BLOCKED',
    replyMode: 'WHY',
    guide: {
      plainSummary: 'Bu istek güvenli değil.',
      summary: 'Bu istek güvenli değil.',
      screenExplanation: 'Bu istek güvenli değil.',
      whyBlocked: 'İnsan onayı gerekir.',
      doNotDo: 'Yapmış gibi söyleme.',
    },
    roleMode: 'OPERATIONS',
    userRole: 'SUPER_ADMIN',
    user: { role: 'SUPER_ADMIN' },
    screenPath: '/superadmin/operations',
    screenDefinition: { path: '/superadmin/operations', label: 'Super Admin Operations' },
    screenContext: {
      path: '/superadmin/operations',
      label: 'Super Admin Operations',
    },
    analysis: {
      reasoningLead: 'Bu istek güvenli değil.',
      nextBestAction: 'İnsan onayı ile ilerle.',
      selectedRecordStatus: '',
      blockers: ['fake success request'],
      missingData: [],
      evidence: [],
      compareHint: 'fake success',
    },
    contextPriority: {
      summaryLead: 'Bu istek güvenli değil.',
      bestNextAction: 'İnsan onayı ile ilerle.',
      selectedRecordMismatchLead: '',
      needsSelection: false,
      roleBoundary: 'İnsan onayı gerekir.',
    },
    guidedTaskMeta: null,
    entityType: 'screen',
  });
  assert(refusal.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE', 'safe refusal mode');
  must(refusal.reply, 'sistem durumu', 'safe refusal lead');
  must(refusal.reply, 'Güvenli alternatif', 'safe refusal alternative');

  const integrationUser = { role: 'COMPANY', companyKind: 'SCHOOL' };
  const integrationScreenContext = {
    path: '/school/operations',
    label: 'School Operations',
    selectedSummary: 'Plan ve onay bekleniyor',
    selectedLabel: 'Plan satırı',
    selectedRecordStatus: 'Plan ve onay bekleniyor',
    selectedFields: [{ label: 'Durum', value: 'Bekliyor' }],
    selectedBadges: [{ label: 'Onay', value: 'Bekliyor' }],
    structuredFacts: {
      reasoningLead: 'Plan ve kanıt birlikte okunmalı.',
      nextBestAction: 'Önce plan, kanıt ve onay sınırını aç.',
      selectedRecordStatus: 'Plan ve onay bekleniyor',
      evidence: ['Kanıt satırı'],
    },
  };
  const integrationScreenDefinition = getScreenDefinitionForUser(integrationUser, integrationScreenContext, 1) || integrationScreenContext;
  const integrationResponse = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: integrationUser,
    message: 'Bu servis planını özetler misin?',
    context: null,
    entityLabel: 'School Operations',
    scope: { roleMode: 'OPERATIONS', role: 'COMPANY' },
    conversationState: {
      lastScreenPath: '/school/operations',
      recentMessages: ['Bu servis planını özetler misin?'],
    },
    screenContext: integrationScreenContext,
    screenDefinition: integrationScreenDefinition,
  });
  assert(Boolean(integrationResponse.reasoningAssistant), 'integration response exposes reasoning assistant');
  assert(integrationResponse.reasoningAssistant.effectiveRole === 'SCHOOL', 'integration response resolves school role');
  assert(integrationResponse.reasoningAssistant.mode !== 'PASS_THROUGH', 'integration response uses reasoning mode');
  must(integrationResponse.reply, 'Plan', 'integration response keeps planning language');
  must(integrationResponse.reply, 'kanıt', 'integration response keeps evidence language');
  assert(integrationResponse.conversationState.lastReasoningAssistantRole === 'SCHOOL', 'integration response stores reasoning role');
  assert(Boolean(integrationResponse.conversationState.lastReasoningAssistantFingerprint), 'integration response stores reasoning fingerprint');

  const directHelpScreenContext = {
    path: '/company/shifts',
    label: 'Company Shifts',
    selectedSummary: 'Seçili kayıt hazır.',
    selectedLabel: 'Seçili kayıt',
    selectedRecordStatus: 'Seçili kayıt hazır.',
    selectedFields: [{ label: 'Durum', value: 'Hazır' }],
    selectedBadges: [{ label: 'Durum', value: 'Hazır' }],
    structuredFacts: {
      reasoningLead: '',
      nextBestAction: '',
      selectedRecordStatus: 'Seçili kayıt hazır.',
    },
  };
  const directHelpScreenDefinition = {
    path: '/company/shifts',
    label: 'Company Shifts',
    menuPurpose: 'Vardiya planlama',
    plainSummary: 'Vardiya planlama',
    summary: 'Vardiya planlama',
    firstStep: 'Önce vardiya satırını aç.',
    nextStep: 'Sonra araç ve sürücüyü bağla.',
    screenMenus: [{ label: 'Takip', path: '/company/shifts', purpose: 'Vardiya listesini açar.' }],
    buttonGuides: [{ label: 'Takip', purpose: 'Vardiya listesini açar.', whenToUse: 'Listeden bir kayıt görmek istediğinde.', whatHappens: 'Vardiya listesi açılır.' }],
    simpleTerms: ['hakediş', 'route readiness', 'servis kanıtı'],
  };
  function buildDirectHelpResponse({ message, role, companyKind = '', screenPath = '/company/shifts', screenLabel = 'Company Shifts', screenDefinition = directHelpScreenDefinition, screenContext = directHelpScreenContext, roleMode = 'OPERATIONS' }) {
    const user = makeUser(role, companyKind);
    return buildChatHelpResponse({
      entityType: 'screen',
      entityId: 1,
      user,
      message,
      context: null,
      entityLabel: screenLabel,
      scope: { roleMode, role },
      conversationState: {
        lastScreenPath: screenPath,
        recentMessages: [message],
      },
      screenContext,
      screenDefinition,
    });
  }

  const productOverview = buildDirectHelpResponse({ message: 'Bu program ne?', role: 'COMPANY' });
  assert(productOverview.questionType === 'PRODUCT_OVERVIEW_HELP', 'product overview routes to PRODUCT_OVERVIEW_HELP');
  must(productOverview.reply, 'SeferPakt', 'product overview mentions SeferPakt');
  must(productOverview.reply, 'platform', 'product overview explains platform purpose');
  must(productOverview.reply, 'Şirket rolünde', 'product overview names the role view');
  mustNot(productOverview.reply, 'Company rolünde', 'product overview avoids the English role name');
  must(productOverview.reply, 'vardiya', 'product overview gives a starting path');
  must(productOverview.reply, 'teklif', 'product overview keeps the commercial path');
  mustNot(productOverview.reply, 'bulamadım', 'product overview drops the safe follow-up line');

  const roleExplanation = buildDirectHelpResponse({ message: 'Room rolü ne yapar?', role: 'ROOM' });
  assert(roleExplanation.questionType === 'ROLE_EXPLANATION_HELP', 'role explanation routes to ROLE_EXPLANATION_HELP');
  must(roleExplanation.reply, 'Oda rolünde', 'role explanation mentions role name');
  mustNot(roleExplanation.reply, 'Room rolünde', 'role explanation avoids the English role name');
  must(roleExplanation.reply, 'operasyon, sürücü ve araç', 'role explanation explains the role');
  must(roleExplanation.reply, 'Önce', 'role explanation gives first step');
  mustNot(roleExplanation.reply, 'bulamadım', 'role explanation drops the safe follow-up line');

  const screenExplanation = buildDirectHelpResponse({
    message: 'Bu ekran ne işe yarar?',
    role: 'SUPER_ADMIN',
    screenPath: '/superadmin/operations',
    screenLabel: 'Süper Yönetici Operasyonlar',
    screenDefinition: {
      path: '/superadmin/operations',
      label: 'Süper Yönetici Operasyonlar',
      menuPurpose: 'Operasyon özetini gösterir',
      plainSummary: 'Operasyon özetini gösterir',
      summary: 'Operasyon özetini gösterir',
      firstStep: 'Önce operasyon özetini aç.',
      nextStep: 'Sonra kritik kayıtları incele.',
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/superadmin/operations',
      label: 'Süper Yönetici Operasyonlar',
      selectedSummary: 'Operasyon özeti hazır.',
      selectedRecordStatus: 'Operasyon özeti hazır.',
    },
    roleMode: 'OPERATIONS',
  });
  assert(screenExplanation.questionType === 'SCREEN_EXPLANATION_HELP', 'screen explanation routes to SCREEN_EXPLANATION_HELP');
  must(screenExplanation.reply, 'Operasyon özetini gösterir', 'screen explanation uses screen purpose');
  must(screenExplanation.reply, 'Şu an Süper Yönetici Operasyonlar ekranındaysan', 'screen explanation keeps screen context');
  mustNot(screenExplanation.reply, 'bulamadım', 'screen explanation drops safe follow-up');

  const howToHelp = buildDirectHelpResponse({
    message: 'Vardiya nasıl oluşturulur?',
    role: 'COMPANY',
    screenPath: '/company/shifts',
    screenLabel: 'Vardiyalar',
    screenDefinition: {
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama',
      plainSummary: 'Vardiya planlama',
      summary: 'Vardiya planlama',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
      screenMenus: [{ label: 'Takip', path: '/company/shifts', purpose: 'Vardiya listesini açar.' }],
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
    },
  });
  assert(howToHelp.questionType === 'HOW_TO_HELP', 'how-to routes to HOW_TO_HELP');
  must(howToHelp.reply, 'Planlama Merkezi', 'how-to reply starts from the planning center');
  must(howToHelp.reply, 'Yeni Plan Oluştur', 'how-to reply includes the new plan entry');
  must(howToHelp.reply, 'Rehberi Başlat', 'how-to reply includes the guide entry');
  must(howToHelp.reply, 'paket', 'how-to reply includes package selection');
  must(howToHelp.reply, 'tarih', 'how-to reply includes date selection');
  must(howToHelp.reply, 'saat', 'how-to reply includes time selection');
  must(howToHelp.reply, 'servis yönü', 'how-to reply includes direction selection');
  must(howToHelp.reply, 'kapsam', 'how-to reply includes scope selection');
  must(howToHelp.reply, 'personel', 'how-to reply includes personnel review');
  must(howToHelp.reply, 'adres/konum', 'how-to reply includes address/location review');
  must(howToHelp.reply, 'durak', 'how-to reply includes stop review');
  must(howToHelp.reply, 'rota önizlemesini', 'how-to reply includes route preview');
  must(howToHelp.reply, 'oluşan vardiyayı Vardiyalar ekranında takip eder', 'how-to reply uses the shifts screen only for follow-up');
  mustNot(howToHelp.reply, 'Vardiyalar ekranına gir', 'how-to reply does not start from the shifts screen');
  mustNot(howToHelp.reply, 'Plan Builder', 'how-to reply avoids English builder jargon');
  mustNot(howToHelp.reply, 'Company', 'how-to reply avoids English role name');
  mustNot(howToHelp.reply, 'georeview', 'how-to reply avoids georeview jargon');
  mustNot(howToHelp.reply, 'matrix', 'how-to reply avoids matrix jargon');
  mustNot(howToHelp.reply, 'bulamadım', 'how-to reply drops repetitive fallback');

  const companyEnteredReply = buildDirectHelpResponse({
    message: 'Vardiyalar ekranına girdim',
    role: 'COMPANY',
    screenPath: '/company/shifts',
    screenLabel: 'Vardiyalar',
    screenDefinition: {
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama ve takip',
      plainSummary: 'Vardiya planlama ve takip',
      summary: 'Vardiya planlama ve takip',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    },
    roleMode: 'OPERATIONS',
  });
  must(companyEnteredReply.reply, 'Vardiyalar ekranına girdin', 'company entered reply anchors the screen');
  must(companyEnteredReply.reply, 'yeni vardiya', 'company entered reply offers creation path');
  must(companyEnteredReply.reply, 'teklif', 'company entered reply keeps commercial path visible');
  mustNot(companyEnteredReply.reply, 'GPS', 'company entered reply avoids location drift');
  mustNot(companyEnteredReply.reply, 'audit', 'company entered reply avoids audit drift');

  const companyDoneReply = buildDirectHelpResponse({
    message: 'yaptım',
    role: 'COMPANY',
    screenPath: '/company/shifts',
    screenLabel: 'Vardiyalar',
    conversationState: {
      lastQuestionType: 'STEP_ENTERED',
      lastSelectedLabel: 'Aktif vardiya',
      lastSelectedSummary: 'Aktif vardiya',
    },
    screenDefinition: {
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama ve takip',
      plainSummary: 'Vardiya planlama ve takip',
      summary: 'Vardiya planlama ve takip',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    },
    roleMode: 'OPERATIONS',
  });
  must(companyDoneReply.reply, 'Tamam, aynı vardiya akışından devam edelim', 'company done reply checks the result');
  must(companyDoneReply.reply, 'tarih / saat', 'company done reply keeps the flow');

  const companyMissingReply = buildDirectHelpResponse({
    message: 'bulamadım',
    role: 'COMPANY',
    screenPath: '/company/shifts',
    screenLabel: 'Vardiyalar',
    screenDefinition: {
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama ve takip',
      plainSummary: 'Vardiya planlama ve takip',
      summary: 'Vardiya planlama ve takip',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    },
    roleMode: 'OPERATIONS',
  });
  must(companyMissingReply.reply, 'Bulamadığın şey yeni vardiya oluşturma alanıysa', 'company missing reply offers an alternate menu path');
  must(companyMissingReply.reply, 'Hangisini bulamadığını yazarsan oradan devam edelim', 'company missing reply uses alternative-path language');

  const companyContinueReply = buildDirectHelpResponse({
    message: 'devam et',
    role: 'COMPANY',
    screenPath: '/company/shifts',
    screenLabel: 'Vardiyalar',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      lastSelectedLabel: 'Aktif vardiya',
      lastSelectedSummary: 'Aktif vardiya',
    },
    screenDefinition: {
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama ve takip',
      plainSummary: 'Vardiya planlama ve takip',
      summary: 'Vardiya planlama ve takip',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    },
    roleMode: 'OPERATIONS',
  });
  must(companyContinueReply.reply, 'Vardiyalar akışından devam edelim', 'company continue reply preserves the prior path');
  must(companyContinueReply.reply, 'Seçili Vardiya #6', 'company continue reply keeps the prior selection');
  mustNot(companyContinueReply.reply, 'Hangi roldesin?', 'company continue reply does not restart from zero');

  const locationReply = buildDirectHelpResponse({
    message: 'Konumda sorun varsa ne yapacağım?',
    role: 'COMPANY',
    screenPath: '/company/georeview',
    screenLabel: 'Konum İncele',
    screenDefinition: {
      path: '/company/georeview',
      label: 'Konum İncele',
      menuPurpose: 'Konum verisini kontrol et',
      plainSummary: 'Konum verisini kontrol et',
      summary: 'Konum verisini kontrol et',
      firstStep: 'Önce hangi kayıt veya kişinin konumunu incelediğini seç.',
      nextStep: 'Sorunun konum verisi mi, yol hesabı mı, yoksa eşleşme mi olduğunu ayır.',
    },
    screenContext: {
      ...directHelpScreenContext,
      path: '/company/georeview',
      label: 'Konum İncele',
      selectedSummary: 'Konum sorunu olan kayıt hazır.',
      selectedRecordStatus: 'Konum sorunu olan kayıt hazır.',
    },
    roleMode: 'OPERATIONS',
  });
  must(locationReply.reply, 'konum', 'location reply stays in plain Turkish');
  must(locationReply.reply, 'adres', 'location reply keeps the address/control path');
  mustNot(locationReply.reply, 'geocode', 'location reply avoids geocode jargon');
  mustNot(locationReply.reply, 'lat/lng', 'location reply avoids lat/lng jargon');
  mustNot(locationReply.reply, 'route apply', 'location reply avoids route apply jargon');
  mustNot(locationReply.reply, 'readiness', 'location reply avoids readiness jargon');

  const fieldButtonTermCases = [
    {
      label: 'Hakediş',
      message: 'Hakediş ne demek?',
      needle: 'Yapılan işin ödeme önizlemesi',
    },
    {
      label: 'Route readiness',
      message: 'Route readiness ne demek?',
      needle: 'Rota ve atama zincirinin ilerlemeye hazır olup olmadığını gösteren durum',
    },
    {
      label: 'Servis kanıtı',
      message: 'Servis kanıtı ne işe yarar?',
      needle: 'Sürücünün telefon GPS’i ve ilgili sinyallerle hizmetin görünürlüğünü doğrulayan kart',
    },
  ];
  for (const caseItem of fieldButtonTermCases) {
    const response = buildDirectHelpResponse({
      message: caseItem.message,
      role: 'SUPER_ADMIN',
      screenPath: '/superadmin/commercial-core',
      screenLabel: 'Super Admin Commercial Core',
      screenDefinition: {
        path: '/superadmin/commercial-core',
        label: 'Super Admin Commercial Core',
        menuPurpose: 'Ticari akış özeti',
        plainSummary: 'Ticari akış özeti',
        summary: 'Ticari akış özeti',
        buttonGuides: [{ label: 'Takip', purpose: 'Vardiya listesini açar.' }],
        simpleTerms: ['hakediş', 'route readiness', 'servis kanıtı'],
      },
      screenContext: {
        ...directHelpScreenContext,
        path: '/superadmin/commercial-core',
        label: 'Super Admin Commercial Core',
      },
    });
    assert(response.questionType === 'FIELD_BUTTON_HELP', `${caseItem.label} routes to FIELD_BUTTON_HELP`);
    must(response.reply, caseItem.needle, `${caseItem.label} explanation is specific`);
    mustNot(response.reply, 'Şimdi:', `${caseItem.label} drops the robotic lead`);
  }

  const buttonHelp = buildDirectHelpResponse({
    message: 'Bu buton ne işe yarıyor?',
    role: 'COMPANY',
    screenPath: '/company/shifts',
    screenLabel: 'Company Shifts',
    screenDefinition: {
      ...directHelpScreenDefinition,
      buttonGuides: [{ label: 'Takip', purpose: 'Vardiya listesini açar.', whenToUse: 'Bir kayıt görmek istediğinde.', whatHappens: 'Vardiya listesi açılır.' }],
    },
  });
  assert(buttonHelp.questionType === 'FIELD_BUTTON_HELP', 'button question routes to FIELD_BUTTON_HELP');
  must(buttonHelp.reply, 'Takip', 'button help names the button');
  must(buttonHelp.reply, 'Vardiya listesini açar', 'button help explains the button purpose');
  must(buttonHelp.reply, 'bulamadım', 'button help keeps the safe follow-up line');

  must(helpComposerSource, 'buildSeferAbiReasoningAssistant', 'help composer keeps reasoning assistant wiring');
  must(helpComposerSource, 'reasoningAssistant.reply || rawReply', 'help composer prefers reasoning assistant reply');
  must(helpComposerSource, 'lastReasoningAssistantFingerprint', 'help composer stores reasoning fingerprint');
  mustNot(helpComposerSource, 'goldenQuestionPack', 'help composer does not use golden pack as reply source');

  assert(Array.isArray(listSeferAbiReasoningRoles()) && listSeferAbiReasoningRoles().length === 8, 'eight reasoning roles listed');
  assert(getSeferAbiReasoningRoleProfile('COMPANY', { companyKind: 'SCHOOL' }).frame === 'Plan ve kanıt açısından:', 'school role profile resolves from company kind');
  assert(getSeferAbiReasoningRoleProfile('COMPANY', { companyKind: 'ORGANIZATION' }).frame === 'Plan ve onay açısından:', 'organization role profile resolves from company kind');
  assert(buildSeferAbiReasoningAssistant({
    message: 'Bu kayıt ne?',
    questionType: 'SCREEN_START',
    replyMode: 'SHORT',
    guide: {},
    userRole: 'COMPANY',
    user: { role: 'COMPANY' },
    screenPath: '/company/shifts',
    screenDefinition: { path: '/company/shifts', label: 'Company Shifts', firstStep: 'Önce vardiya satırını aç.' },
    screenContext: { path: '/company/shifts', label: 'Company Shifts', selectedSummary: 'Hazır' },
  }).assistantMilestone === SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION, 'assistant milestone marker exposed');

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  assert(cachedNames.length === 0, 'stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  console.log('=== SEFER-ABI-REASONING-ASSISTANT-01 CHECK OK ===');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
