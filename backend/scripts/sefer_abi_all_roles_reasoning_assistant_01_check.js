#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import {
  SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION,
  buildSeferAbiReasoningAssistant,
  getSeferAbiReasoningRolePlaybook,
  listSeferAbiReasoningRoles,
} from '../src/ai/chat/seferAbiReasoningAssistant.js';

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

function buildScreenFixture({
  path: screenPath,
  label: screenLabel,
  selectedSummary = 'Seçili kayıt hazır.',
  selectedLabel = 'Seçili kayıt',
  selectedRecordStatus = 'Seçili kayıt hazır.',
  firstStep = '',
  nextStep = '',
} = {}) {
  return {
    screenDefinition: {
      path: screenPath,
      label: screenLabel,
      menuPurpose: `${screenLabel} için özet`,
      plainSummary: `${screenLabel} için özet`,
      summary: `${screenLabel} için özet`,
      firstStep,
      nextStep,
      screenMenus: [{ label: 'Takip', path: screenPath, purpose: `${screenLabel} ekranını açar.` }],
      buttonGuides: [{ label: 'Takip', purpose: `${screenLabel} listesini açar.`, whenToUse: 'Kayıt görmek istediğinde.', whatHappens: `${screenLabel} listesi açılır.` }],
      simpleTerms: ['hakediş', 'route readiness', 'servis kanıtı'],
    },
    screenContext: {
      path: screenPath,
      label: screenLabel,
      selectedSummary,
      selectedLabel,
      selectedRecordStatus,
      selectedFields: [
        { label: 'Durum', value: selectedRecordStatus },
        { label: 'Özet', value: selectedSummary },
      ],
      selectedBadges: [{ label: 'Durum', value: selectedRecordStatus }],
      structuredFacts: {
        reasoningLead: `${screenLabel} için özet.`,
        nextBestAction: firstStep || 'İlk kartı aç.',
        selectedRecordStatus,
      },
    },
  };
}

function buildReply({
  message,
  role = '',
  companyKind = '',
  roleMode = 'OPERATIONS',
  screenFixture = buildScreenFixture({ path: '/company/shifts', label: 'Company Shifts', firstStep: 'Önce vardiya satırını aç.', nextStep: 'Sonra araç ve sürücüyü bağla.' }),
  conversationState = null,
  user = null,
} = {}) {
  const resolvedUser = user || makeUser(role, companyKind);
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: resolvedUser,
    message,
    context: null,
    entityLabel: screenFixture?.screenContext?.label || '',
    scope: { roleMode, role },
    conversationState,
    screenContext: screenFixture?.screenContext || null,
    screenDefinition: screenFixture?.screenDefinition || null,
  });
}

function buildAssistantSnapshot({
  message,
  role = '',
  companyKind = '',
  roleMode = 'OPERATIONS',
  questionType = 'NEXT_STEP',
  conversationState = null,
  screenFixture = buildScreenFixture({ path: '/company/shifts', label: 'Company Shifts', firstStep: 'Önce vardiya satırını aç.', nextStep: 'Sonra araç ve sürücüyü bağla.' }),
  guide = null,
  analysis = null,
  contextPriority = null,
} = {}) {
  const resolvedUser = makeUser(role, companyKind);
  return buildSeferAbiReasoningAssistant({
    rawReply: 'Temel cevap.',
    message,
    questionType,
    replyMode: 'SHORT',
    guide: guide || {
      plainSummary: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      summary: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      screenExplanation: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      whatToDoNow: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      whatToDoNext: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      whyBlocked: '',
      doNotDo: '',
    },
    roleMode,
    userRole: resolvedUser.role,
    user: resolvedUser,
    screenPath: screenFixture?.screenDefinition?.path || '',
    screenDefinition: screenFixture?.screenDefinition || null,
    screenContext: screenFixture?.screenContext || null,
    analysis: analysis || {
      reasoningLead: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      nextBestAction: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      safestNextStep: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      selectedRecordStatus: screenFixture?.screenContext?.selectedRecordStatus || '',
      blockers: [],
      missingData: [],
      evidence: [],
      compareHint: '',
    },
    contextPriority: contextPriority || {
      summaryLead: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      bestNextAction: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      selectedRecordMismatchLead: screenFixture?.screenContext?.selectedRecordStatus || '',
      needsSelection: false,
      sameRecordLikely: true,
      roleBoundary: '',
      evidenceConfidence: '',
    },
    conversationState,
    guidedTaskMeta: null,
    entityType: 'screen',
  });
}

async function main() {
  console.log('=== SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const guidedDoc = read('docs/COPILOT_GUIDED_TASK_ENGINE_01.md');
  const newDoc = read('docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const helperSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const cachedNames = gitCachedNames();

  const helperMod = await loadModule('backend/src/ai/chat/seferAbiReasoningAssistant.js');

  must(pkg, '"check:seferabiallrolesreasoningassistant01": "node backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js"', 'package.json exposes new reasoning assistant check');
  ordered(runner, ['check:copilotguidedtaskengine01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01', 'check:uxcopilotsmartchips01'], 'product extensions runner places all-roles reasoning assistant after base reasoning assistant');
  ordered(verify, ['check:copilotguidedtaskengine01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01', 'check:uxcopilotsmartchips01'], 'verify chain places all-roles reasoning assistant after base reasoning assistant');

  must(guide, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'script guide mentions new milestone');
  must(guide, 'check:seferabiallrolesreasoningassistant01', 'script guide exposes new check');
  must(guide, 'node backend\\scripts\\sefer_abi_all_roles_reasoning_assistant_01_check.js', 'script guide includes new check command');
  must(guide, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'script guide includes new doc');
  ordered(guide, ['SEFER-ABI-REASONING-ASSISTANT-01', 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'ETA-SANITY-01'], 'script guide keeps new milestone after the base reasoning assistant');

  must(primer, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'primer mentions new milestone');
  must(primer, 'check:seferabiallrolesreasoningassistant01', 'primer exposes new check');
  must(primer, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'primer links new doc');
  must(primer, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'primer links reasoning helper');

  must(roadmapLock, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'roadmap lock keeps new milestone');
  must(roleMatrix, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'role/task matrix references new milestone');
  must(aiRoadmap, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'AI action roadmap references new milestone');
  must(guidedDoc, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'guided task engine doc references new milestone');
  must(guidedDoc, 'Golden pack test/kabul içindir', 'guided task engine doc keeps golden pack test-only wording');

  must(newDoc, '# SEFER ABI ALL ROLES REASONING ASSISTANT 01', 'new doc title present');
  must(newDoc, 'Canonical check: `check:seferabiallrolesreasoningassistant01`', 'new doc keeps canonical check wording');
  must(newDoc, 'interactionIntentFamily', 'new doc mentions intent family');
  must(newDoc, 'role + screen + selected record + conversation state', 'new doc keeps reasoning context inputs');
  must(newDoc, 'Golden pack test/kabul içindir', 'new doc keeps golden pack test-only wording');
  must(newDoc, 'reply source değildir', 'new doc keeps reply-source boundary');
  must(newDoc, 'Runtime AI action açmaz', 'new doc keeps runtime boundary');
  must(newDoc, 'Tool execution açmaz', 'new doc keeps tool boundary');
  must(newDoc, 'Write-action dispatcher açmaz', 'new doc keeps dispatcher boundary');
  must(newDoc, 'DB write açmaz', 'new doc keeps db boundary');
  must(newDoc, 'Route apply açmaz', 'new doc keeps route apply boundary');
  must(newDoc, 'Fake success açmaz', 'new doc keeps fake success boundary');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(newDoc, role, `new doc covers role ${role}`);
  }

  must(helperSource, 'SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION', 'helper exposes new milestone version marker');
  must(helperSource, 'SEFER_ABI_REASONING_ASSISTANT_INTENT_FAMILIES', 'helper exposes intent families');
  must(helperSource, 'assistantMilestone', 'helper exposes assistant milestone marker');
  must(helperSource, 'interactionIntentFamily', 'helper stores interaction intent family');
  must(helperSource, 'buildSeferAbiReasoningAssistant', 'helper exports builder');
  must(helperSource, 'getSeferAbiReasoningRolePlaybook', 'helper exports role playbook');
  mustNot(helperSource, 'goldenQuestionPack', 'helper never imports golden pack');
  mustNot(helperSource, 'fetch(', 'helper has no fetch runtime');
  mustNot(helperSource, 'spawn(', 'helper has no spawn runtime');
  mustNot(helperSource, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helperSource, 'prisma', 'helper has no prisma runtime');

  must(helpComposerSource, 'getSeferAbiReasoningRolePlaybook', 'help composer imports the role playbook helper');
  must(helpComposerSource, 'stepFlowSentence', 'help composer keeps natural step flow helper');
  must(helpComposerSource, 'Takılırsan "bulamadım" yaz.', 'help composer keeps safe follow-up line');
  mustNot(helpComposerSource, 'goldenQuestionPack', 'help composer does not use golden pack as runtime reply source');

  const rolePlaybookCases = [
    { role: 'SUPER_ADMIN', frame: 'Stratejik özet:', firstStep: 'Sistem durumu bandını aç' },
    { role: 'COMPANY', frame: 'Plan açısından:', firstStep: 'Vardiya ya da talebi aç' },
    { role: 'ROOM', frame: 'Operasyon açısından:', firstStep: 'Teklifleri incele' },
    { role: 'DRIVER', frame: 'Kısaca:', firstStep: 'Aktif rotanı aç' },
    { role: 'PERSONEL', frame: 'Sade cevap:', firstStep: 'Servis durumunu / my ride ekranını aç' },
    { role: 'PARENT', frame: 'Kısa cevap:', firstStep: 'Yetkili öğrenci servis görünümünü aç' },
    { role: 'SCHOOL', frame: 'Plan ve kanıt açısından:', firstStep: 'Servis kanıtı, devam ve gecikme özetine bak' },
    { role: 'ORGANIZATION', frame: 'Plan ve onay açısından:', firstStep: 'Organizasyon servis planını aç' },
  ];
  for (const row of rolePlaybookCases) {
    const playbook = getSeferAbiReasoningRolePlaybook(row.role, row.role === 'SCHOOL' ? { role: 'COMPANY', companyKind: 'SCHOOL' } : row.role === 'ORGANIZATION' ? { role: 'COMPANY', companyKind: 'ORGANIZATION' } : { role: row.role });
    assert(playbook.frame === row.frame, `${row.role} playbook frame`);
    must(playbook.starterSteps[0], row.firstStep, `${row.role} playbook first step`);
    assert(playbook.starterSteps.length >= 2, `${row.role} playbook has at least two starter steps`);
  }
  assert(getSeferAbiReasoningRolePlaybook('COMPANY', { role: 'COMPANY', companyKind: 'SCHOOL' }).frame === 'Plan ve kanıt açısından:', 'company+school resolves to school playbook');
  assert(getSeferAbiReasoningRolePlaybook('COMPANY', { role: 'COMPANY', companyKind: 'ORGANIZATION' }).frame === 'Plan ve onay açısından:', 'company+organization resolves to organization playbook');
  assert(Array.isArray(listSeferAbiReasoningRoles()) && listSeferAbiReasoningRoles().length === 8, 'eight reasoning roles listed');

  const genericOverview = buildReply({
    message: 'Bu program ne işe yarıyor?',
    role: '',
    roleMode: 'OPERATIONS',
    screenFixture: null,
    conversationState: null,
    user: {},
  });
  assert(genericOverview.questionType === 'PRODUCT_OVERVIEW_HELP', 'generic overview routes to product overview help');
  must(genericOverview.reply, 'SeferPakt', 'generic overview mentions product');
  must(genericOverview.reply, 'planlamak, takip etmek', 'generic overview explains the platform');
  must(genericOverview.reply, 'Hangi roldesin?', 'generic overview asks for role when missing');
  must(genericOverview.reply, 'bulamadım', 'generic overview keeps safe follow-up line');

  const companyOverview = buildReply({ message: 'Bu program ne?', role: 'COMPANY' });
  const driverOverview = buildReply({ message: 'Bu program ne?', role: 'DRIVER', roleMode: 'SIMPLE' });
  const roomOverview = buildReply({ message: 'Bu program ne?', role: 'ROOM' });
  must(companyOverview.reply, 'Company rolünde', 'company overview names the role');
  must(companyOverview.reply, 'teklif', 'company overview mentions the plan / offer lane');
  must(companyOverview.reply, 'sözleşme', 'company overview mentions contracts');
  must(companyOverview.reply, 'vardiya', 'company overview mentions shifts');
  must(driverOverview.reply, 'Driver rolünde', 'driver overview names the role');
  must(driverOverview.reply, 'rota', 'driver overview mentions route');
  must(driverOverview.reply, 'durağı', 'driver overview stays field-oriented');
  assert(driverOverview.reply.length <= 320, 'driver overview stays short');
  must(roomOverview.reply, 'Room rolünde', 'room overview names the role');
  must(roomOverview.reply, 'araç', 'room overview mentions vehicle');
  must(roomOverview.reply, 'sürücü', 'room overview mentions driver');
  must(roomOverview.reply, 'operasyon', 'room overview stays operational');
  assert(companyOverview.reply !== driverOverview.reply, 'different roles produce different product-overview replies');
  assert(driverOverview.reply !== roomOverview.reply, 'different roles produce different role-shaped replies');

  const schoolOverview = buildReply({ message: 'Bu program ne?', role: 'COMPANY', companyKind: 'SCHOOL' });
  const organizationOverview = buildReply({ message: 'Bu program ne?', role: 'COMPANY', companyKind: 'ORGANIZATION' });
  must(schoolOverview.reply, 'School rolünde', 'company+school overview resolves to school');
  must(organizationOverview.reply, 'Organization rolünde', 'company+organization overview resolves to organization');
  must(schoolOverview.reply, 'kanıt', 'school overview stays within evidence lane');
  must(organizationOverview.reply, 'onay', 'organization overview stays within approval lane');

  const roleExplanation = buildReply({
    message: 'Room rolü ne yapar?',
    role: 'ROOM',
    roleMode: 'OPERATIONS',
  });
  assert(roleExplanation.questionType === 'ROLE_EXPLANATION_HELP', 'role explanation routes correctly');
  must(roleExplanation.reply, 'Room rolünde', 'role explanation names the role');
  must(roleExplanation.reply, 'operasyon, sürücü ve araç', 'role explanation explains the role');
  must(roleExplanation.reply, 'Önce', 'role explanation gives a first step');
  must(roleExplanation.reply, 'bulamadım', 'role explanation keeps the safe follow-up line');

  const screenExplanation = buildReply({
    message: 'Bu ekran ne işe yarar?',
    role: 'SUPER_ADMIN',
    screenFixture: buildScreenFixture({
      path: '/superadmin/operations',
      label: 'Super Admin Operations',
      firstStep: 'Önce operasyon özetini aç.',
      nextStep: 'Sonra kritik kayıtları incele.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(screenExplanation.questionType === 'SCREEN_EXPLANATION_HELP', 'screen explanation routes correctly');
  must(screenExplanation.reply, 'operasyon özetini aç', 'screen explanation keeps the purpose');
  must(screenExplanation.reply, 'Şu an Super Admin Operations ekranındaysan', 'screen explanation keeps the screen context');
  must(screenExplanation.reply, 'bulamadım', 'screen explanation keeps safe follow-up');

  const howToHelp = buildReply({
    message: 'Vardiya nasıl oluşturulur?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(howToHelp.questionType === 'HOW_TO_HELP', 'how-to routes correctly');
  must(howToHelp.reply, 'Şu an Vardiyalar ekranındaysan', 'how-to reply keeps the screen context');
  must(howToHelp.reply, 'doğru kaydı aç', 'how-to reply keeps the first step');
  must(howToHelp.reply, 'Teklif, atama, operasyon ve sözleşme rozetlerini', 'how-to reply keeps the next step');
  must(howToHelp.reply, 'bulamadım', 'how-to reply keeps the safe follow-up line');

  const buttonHelp = buildReply({
    message: 'Bu buton ne işe yarıyor?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(buttonHelp.questionType === 'FIELD_BUTTON_HELP', 'button question routes correctly');
  must(buttonHelp.reply, 'Takip', 'button help names the button');
  must(buttonHelp.reply, 'Vardiya listelerini takip görünümünde açar', 'button help explains the button purpose');
  must(buttonHelp.reply, 'bulamadım', 'button help keeps the safe follow-up line');

  const girdim = buildReply({
    message: 'girdim',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'WHY_BLOCKED',
      recentMessages: ['Bu vardiya neden ilerlemiyor?'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev',
    },
    roleMode: 'OPERATIONS',
  });
  must(girdim.reply, 'Önce', 'girdim keeps the flow moving');
  must(girdim.reply, 'kontrol', 'girdim asks for the first control');

  const yaptim = buildReply({
    message: 'yaptım',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'RESULT_CHECK',
      recentMessages: ['Yaptım'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev-2',
    },
    roleMode: 'OPERATIONS',
  });
  must(yaptim.reply, 'birlikte kontrol et', 'yaptım asks for the result check');
  must(yaptim.reply, 'birlikte kontrol et', 'yaptım keeps the flow moving');

  const bulamadim = buildReply({
    message: 'bulamadım',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'NEXT_SCREEN',
      recentMessages: ['Bulamadım'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev-3',
    },
    roleMode: 'OPERATIONS',
  });
  must(bulamadim.reply, 'alternatif', 'bulamadım gives an alternative path');
  must(bulamadim.reply, 'menü', 'bulamadım names a menu path');

  const devamEt = buildReply({
    message: 'devam et',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      recentMessages: ['Devam et'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev-4',
    },
    roleMode: 'OPERATIONS',
  });
  must(devamEt.reply, 'Bekleyen işleri kontrol et', 'devam et keeps the current context');
  must(devamEt.reply, 'İlgili kartı aç', 'devam et asks for the next safe step');

  const companyActionRefusal = buildReply({
    message: 'teklifi kabul et',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'AGREEMENT_ROUTE_REFRESH',
      recentMessages: ['teklifi kabul et'],
      lastScreenPath: '/company/agreements',
      lastReasoningFingerprint: 'prev-5',
    },
    roleMode: 'OPERATIONS',
  });
  must(companyActionRefusal.reply, 'Bunu senin yerine yapamam', 'action refusal avoids executing the action');
  must(companyActionRefusal.reply, 'Güvenli alternatif', 'action refusal gives an alternative');
  must(companyActionRefusal.reply, 'sözleşme', 'company action refusal keeps the contract lane visible');

  const roomActionRefusal = buildReply({
    message: 'aracı ata',
    role: 'ROOM',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      recentMessages: ['aracı ata'],
      lastScreenPath: '/room/shifts',
      lastReasoningFingerprint: 'prev-6',
    },
    roleMode: 'OPERATIONS',
  });
  must(roomActionRefusal.reply, 'Bunu ben atayamam', 'room action refusal avoids the write action');
  must(roomActionRefusal.reply, 'Güvenli alternatif', 'room action refusal gives an alternative');
  must(roomActionRefusal.reply, 'araç', 'room action refusal stays in the vehicle lane');

  const parentBoundary = buildAssistantSnapshot({
    message: 'Başkasının öğrencisini göster',
    role: 'PARENT',
    questionType: 'KVKK_VISIBILITY',
    conversationState: {
      lastQuestionType: 'KVKK_VISIBILITY',
      recentMessages: ['Başkasının öğrencisini göster'],
      lastScreenPath: '/parent/live',
      lastReasoningFingerprint: 'prev-7',
    },
    screenFixture: buildScreenFixture({
      path: '/parent/live',
      label: 'Parent Live',
      selectedSummary: 'Çocuğun servisi beklemede',
      selectedLabel: 'Çocuk servisi',
      selectedRecordStatus: 'Çocuğun servisi beklemede',
      firstStep: 'Önce yetkili öğrenci servis görünümünü aç.',
      nextStep: 'Sonra canlı takip bilgisini kontrol et.',
    }),
    roleMode: 'SIMPLE',
  });
  assert(parentBoundary.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE', 'parent boundary uses safe refusal mode');
  must(parentBoundary.reply, 'yetkili', 'parent boundary keeps the authority scope');
  must(parentBoundary.reply, 'Güvenli alternatif', 'parent boundary gives a safe alternative');
  must(parentBoundary.reply, 'öğrenci', 'parent boundary stays in the student lane');

  const personelBoundary = buildAssistantSnapshot({
    message: 'Başkasının verisini benim yerime aç',
    role: 'PERSONEL',
    questionType: 'ROLE_BOUNDARY',
    conversationState: {
      lastQuestionType: 'ROLE_BOUNDARY',
      recentMessages: ['Başkasının verisini benim yerime aç'],
      lastScreenPath: '/personel/live',
      lastReasoningFingerprint: 'prev-8',
    },
    screenFixture: buildScreenFixture({
      path: '/personel/live',
      label: 'Personel Live',
      selectedSummary: 'Servis görünür ama kişisel alanlar sınırlı',
      selectedLabel: 'Servis',
      selectedRecordStatus: 'Servis görünür ama kişisel alanlar sınırlı',
      firstStep: 'Önce servis durumunu / my ride ekranını aç.',
      nextStep: 'Sonra biniş noktası ve saat bilgisini kontrol et.',
    }),
    roleMode: 'SIMPLE',
  });
  assert(personelBoundary.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE', 'personel boundary uses safe refusal mode');
  must(personelBoundary.reply, 'yetkili', 'personel boundary keeps the authority scope');
  must(personelBoundary.reply, 'Güvenli alternatif', 'personel boundary gives a safe alternative');
  must(personelBoundary.reply, 'KVKK', 'personel boundary keeps KVKK wording');

  const assistantStep = buildAssistantSnapshot({
    message: 'girdim',
    role: 'ROOM',
    questionType: 'NEXT_STEP',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      recentMessages: ['girdim'],
      lastScreenPath: '/room/shifts',
      lastReasoningFingerprint: 'prev-9',
      lastReasoningRepeatCount: 0,
    },
    screenFixture: buildScreenFixture({
      path: '/room/shifts',
      label: 'Room Shifts',
      selectedSummary: 'Vardiya araç ve sürücü bekliyor',
      selectedLabel: 'Vardiya',
      selectedRecordStatus: 'Vardiya araç ve sürücü bekliyor',
      firstStep: 'Önce teklifleri incele.',
      nextStep: 'Sonra araç / sürücü uygunluğunu kontrol et.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(assistantStep.assistantMilestone === SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION, 'assistant milestone marker exposed');
  assert(assistantStep.interactionIntentFamily === 'STEP_ENTERED', 'assistant detects the step-entered intent family');
  must(assistantStep.reply, 'adımı', 'assistant keeps the progressed flow');
  must(assistantStep.reply, 'kontrol', 'assistant keeps the next control');

  const helperExports = Object.keys(helperMod).join(' | ');
  for (const exportName of [
    'SEFER_ABI_REASONING_ASSISTANT_VERSION',
    'SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION',
    'SEFER_ABI_REASONING_ASSISTANT_MODES',
    'SEFER_ABI_REASONING_ASSISTANT_INTENT_FAMILIES',
    'SEFER_ABI_REASONING_ASSISTANT_GUARD_REQUIREMENTS',
    'SEFER_ABI_REASONING_ASSISTANT_PUBLIC_PROMISE',
    'SEFER_ABI_REASONING_ASSISTANT_BLOCKED_ACTIONS',
    'SEFER_ABI_REASONING_ASSISTANT_NEVER_AUTOMATE',
    'SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES',
    'listSeferAbiReasoningRoles',
    'getSeferAbiReasoningRoleProfile',
    'getSeferAbiReasoningRolePlaybook',
    'buildSeferAbiReasoningAssistantContextSnapshot',
    'detectSeferAbiReasoningMode',
    'composeSeferAbiReasoningReply',
    'buildSeferAbiReasoningAssistant',
  ]) {
    must(helperExports, exportName, `helper exports ${exportName}`);
  }

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  assert(cachedNames.length === 0, 'stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  mustNot(helperSource, 'goldenQuestionPack', 'helper never imports golden pack');
  mustNot(helpComposerSource, 'goldenQuestionPack', 'help composer never imports golden pack');

  console.log('=== SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01 CHECK OK ===');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
