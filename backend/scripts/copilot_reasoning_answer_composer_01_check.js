#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import {
  buildSeferAbiReasoningAssistant,
  getSeferAbiReasoningRoleProfile,
} from '../src/ai/chat/seferAbiReasoningAssistant.js';
import { buildSuggestedChips } from '../src/ai/chat/intentRouter.js';
import { normalizeCopilotRequestInput } from '../src/ai/schemas.js';
import {
  COPILOT_REASONING_ANSWER_COMPOSER_VERSION,
  composeCopilotReasoningAnswer,
} from '../src/ai/chat/copilotReasoningAnswerComposer.js';

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

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) fail(`${label}: ${files.join(', ')}`);
  ok(label);
}

function buildScreenFixture({
  path: screenPath,
  label: screenLabel,
  menuPurpose = `${screenLabel} özeti`,
  screenExplanation = menuPurpose,
  summary = menuPurpose,
  selectedSummary = 'Seçili kayıt hazır.',
  selectedLabel = 'Seçili kayıt',
  selectedRecordStatus = 'Seçili kayıt hazır.',
  firstStep = '',
  nextStep = '',
  screenMenus = null,
  buttonGuides = null,
  simpleTerms = null,
} = {}) {
  return {
    screenDefinition: {
      path: screenPath,
      label: screenLabel,
      menuPurpose,
      screenExplanation,
      plainSummary: summary,
      summary,
      firstStep,
      nextStep,
      screenMenus: screenMenus || [{ label: 'Takip', path: screenPath, purpose: `${screenLabel} ekranını açar.` }],
      buttonGuides: buttonGuides || [{ label: 'Takip', purpose: `${screenLabel} listesini açar.`, whenToUse: 'Kayıt görmek istediğinde.', whatHappens: `${screenLabel} listesi açılır.` }],
      simpleTerms: simpleTerms || ['hakediş', 'route readiness', 'servis kanıtı'],
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

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function buildHelpReply({
  message,
  role = 'DEFAULT',
  companyKind = '',
  roleMode = 'OPERATIONS',
  screenFixture = buildScreenFixture({
    path: '/shared/help',
    label: 'Copilot Help',
    firstStep: 'Önce seçili kaydı aç.',
    nextStep: 'Sonra ilgili kontrol kartına geç.',
  }),
  conversationState = null,
  user = null,
} = {}) {
  return buildHelpResponse({
    message,
    role,
    companyKind,
    roleMode,
    screenFixture,
    conversationState,
    user,
  }).reply;
}

function buildHelpResponse({
  message,
  role = 'DEFAULT',
  companyKind = '',
  roleMode = 'OPERATIONS',
  screenFixture = buildScreenFixture({
    path: '/shared/help',
    label: 'Copilot Help',
    firstStep: 'Önce seçili kaydı aç.',
    nextStep: 'Sonra ilgili kontrol kartına geç.',
  }),
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

function buildAssistantReply({
  message,
  role = 'DEFAULT',
  companyKind = '',
  screenFixture = buildScreenFixture({
    path: '/company/shifts',
    label: 'Company Shifts',
    firstStep: 'Önce vardiya satırını aç.',
    nextStep: 'Sonra araç ve sürücüyü kontrol et.',
  }),
} = {}) {
  const resolvedUser = makeUser(role, companyKind);
  return buildSeferAbiReasoningAssistant({
    rawReply: 'Şimdi: SeferPakt, servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılan bir platformdur.',
    message,
    questionType: 'PRODUCT_OVERVIEW_HELP',
    replyMode: 'SHORT',
    guide: {
      plainSummary: '',
      summary: '',
      screenExplanation: '',
      whatToDoNow: '',
      whatToDoNext: '',
      whyBlocked: '',
      doNotDo: '',
    },
    roleMode: 'OPERATIONS',
    userRole: resolvedUser.role,
    user: resolvedUser,
    screenPath: screenFixture?.screenDefinition?.path || '',
    screenDefinition: screenFixture?.screenDefinition || null,
    screenContext: screenFixture?.screenContext || null,
    analysis: {
      reasoningLead: '',
      nextBestAction: '',
      safestNextStep: '',
      selectedRecordStatus: '',
      blockers: [],
      missingData: [],
      evidence: [],
      compareHint: '',
    },
    contextPriority: {
      summaryLead: '',
      bestNextAction: '',
      selectedRecordMismatchLead: '',
      needsSelection: false,
      sameRecordLikely: true,
      roleBoundary: '',
      evidenceConfidence: '',
    },
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
  });
}

function boundaryReplyText(reply) {
  return normalize(reply);
}

function main() {
  console.log('=== COPILOT-REASONING-ANSWER-COMPOSER-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const reasoningDoc = read('docs/SEFER_ABI_REASONING_ASSISTANT_01.md');
  const allRolesDoc = read('docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md');
  const composerDoc = read('docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const assistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const composerSource = read('backend/src/ai/chat/copilotReasoningAnswerComposer.js');

  must(pkg, '"check:copilotreasoninganswercomposer01": "node backend/scripts/copilot_reasoning_answer_composer_01_check.js"', 'package.json exposes composer check');
  ordered(runner, ['check:copilotguidedtaskengine01', 'check:copilotreasoninganswercomposer01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01', 'check:uxcopilotsmartchips01'], 'product extensions runner places composer after guided task engine');
  ordered(verify, ['check:copilotguidedtaskengine01', 'check:copilotreasoninganswercomposer01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01', 'check:uxcopilotsmartchips01'], 'verify chain places composer after guided task engine');

  must(guide, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'script guide mentions composer milestone');
  must(guide, 'check:copilotreasoninganswercomposer01', 'script guide exposes composer check');
  must(guide, 'core composer + required product acceptance support', 'script guide records scoped composer milestone');
  must(guide, 'node backend\\scripts\\copilot_reasoning_answer_composer_01_check.js', 'script guide includes composer command');
  must(guide, 'docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md', 'script guide includes composer doc');
  must(primer, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'primer mentions composer milestone');
  must(primer, 'check:copilotreasoninganswercomposer01', 'primer exposes composer check');
  must(primer, 'core composer + required product acceptance support', 'primer records scoped composer milestone');
  must(primer, 'docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md', 'primer links composer doc');
  must(primer, 'backend/src/ai/chat/copilotReasoningAnswerComposer.js', 'primer links composer helper');
  must(roleMatrix, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'role/task matrix references composer milestone');
  must(aiRoadmap, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'AI action roadmap references composer milestone');
  must(reasoningDoc, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'reasoning assistant doc references composer milestone');
  must(allRolesDoc, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'all-roles reasoning assistant doc references composer milestone');
  must(composerDoc, 'Canonical check: `check:copilotreasoninganswercomposer01`', 'composer doc keeps canonical check wording');
  must(composerDoc, 'backend/src/ai/chat/copilotReasoningAnswerComposer.js', 'composer doc links static helper');
  must(composerDoc, 'core composer + required product acceptance support', 'composer doc records scoped composer milestone');
  must(composerDoc, 'web/src/panels/company/ShiftsPanel.jsx', 'composer doc names required Company support panel');
  must(composerDoc, 'web/src/panels/company/CompanyShiftsPanelTrackView.jsx', 'composer doc names required Company track view');
  must(composerDoc, 'web/src/panels/company/companyShiftsPanelSections.jsx', 'composer doc names required Company sections');
  must(helpComposerSource, 'composeCopilotReasoningAnswer', 'help composer wires composer');
  must(helpComposerSource, 'reply = composeCopilotReasoningAnswer', 'help composer postprocesses final reply');
  must(assistantSource, 'reasoningAnswerComposerVersion', 'assistant snapshot carries composer version');
  must(composerSource, 'COPILOT_REASONING_ANSWER_COMPOSER_VERSION', 'composer source exports version');
  must(composerSource, 'composeCopilotReasoningAnswer', 'composer source exports composer function');
  mustNot(composerSource, 'goldenQuestionPack', 'composer source does not import golden pack');
  mustNot(composerSource, 'child_process', 'composer source does not spawn processes');
  mustNot(composerSource, 'prisma', 'composer source has no prisma access');
  mustNot(composerSource, 'fetch(', 'composer source has no network fetch');
  mustNot(composerSource, 'spawn(', 'composer source has no child process spawn');
  mustNoDiff(['backend/src/services', 'prisma'], 'service/prisma diff remains empty');

  const defaultOverview = composeCopilotReasoningAnswer({
    questionType: 'PRODUCT_OVERVIEW_HELP',
    rawReply: 'Şimdi: SeferPakt, servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılan bir platformdur.',
    roleProfile: getSeferAbiReasoningRoleProfile('DEFAULT'),
    effectiveRole: 'DEFAULT',
    message: 'Bu program ne işe yarıyor?',
  });
  must(defaultOverview, 'SeferPakt, servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılan bir platformdur.', 'default overview keeps product explanation');
  must(defaultOverview, 'Hangi roldesin?', 'default overview asks role');
  mustNot(defaultOverview, 'Şimdi:', 'composer strips generic lead marker');
  mustNot(defaultOverview, 'Takılırsan', 'default overview drops repetitive fallback');

  const companyOverview = composeCopilotReasoningAnswer({
    questionType: 'PRODUCT_OVERVIEW_HELP',
    rawReply: 'Şimdi: Vardiya, teklif ve sözleşme akışını düzenlemek için kullanılır.',
    roleProfile: getSeferAbiReasoningRoleProfile('COMPANY'),
    effectiveRole: 'COMPANY',
    message: 'Bu program ne işe yarıyor?',
  });
  const driverOverview = composeCopilotReasoningAnswer({
    questionType: 'PRODUCT_OVERVIEW_HELP',
    rawReply: 'Şimdi: Günün rotasını ve sıradaki durağı güvenli şekilde takip etmek için kullanılır.',
    roleProfile: getSeferAbiReasoningRoleProfile('DRIVER'),
    effectiveRole: 'DRIVER',
    message: 'Bu program ne işe yarıyor?',
  });
  assert(companyOverview !== driverOverview, 'same question produces different role replies');
  must(companyOverview, 'Şirket', 'company overview uses Turkish role name');
  must(companyOverview, 'vardiya', 'company overview uses plan language');
  must(companyOverview, 'sözleşme', 'company overview uses contract language');
  mustNot(companyOverview, 'Company', 'company overview avoids English role name');
  must(driverOverview, 'Sürücü', 'driver overview uses Turkish role name');
  must(driverOverview, 'rota', 'driver overview uses field language');
  must(driverOverview, 'sıradaki', 'driver overview uses stop language');
  mustNot(driverOverview, 'Driver', 'driver overview avoids English role name');
  mustNot(companyOverview, 'Şimdi:', 'company overview strips generic lead marker');
  mustNot(driverOverview, 'Şimdi:', 'driver overview strips generic lead marker');
  mustNot(companyOverview, 'Takılırsan', 'company overview drops repetitive fallback');
  mustNot(driverOverview, 'Takılırsan', 'driver overview drops repetitive fallback');
  assert(driverOverview.length <= 280, 'driver reply stays short');

  const defaultChat = buildHelpReply({ message: 'Bu program ne işe yarıyor?', role: 'DEFAULT' });
  must(defaultChat, 'SeferPakt', 'chat overview gives natural product explanation');
  must(defaultChat, 'Hangi roldesin?', 'chat overview asks role');
  mustNot(defaultChat, 'Takılırsan "bulamadım" yaz.', 'chat overview drops repetitive fallback');
  mustNot(defaultChat, 'Şimdi:', 'chat overview strips robotic lead');

  const companyChat = buildHelpReply({
    message: 'Bu program ne işe yarıyor?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/agreements',
      label: 'Company Agreements',
      selectedSummary: 'Teklif hazır değil.',
      selectedRecordStatus: 'Teklif hazır değil.',
      firstStep: 'Vardiya veya talebi aç.',
      nextStep: 'Teklifleri topla ve karşılaştır.',
    }),
  });
  const driverChat = buildHelpReply({
    message: 'Bu program ne işe yarıyor?',
    role: 'DRIVER',
    screenFixture: buildScreenFixture({
      path: '/driver/today',
      label: 'Driver Today',
      selectedSummary: 'Aktif rota hazır.',
      selectedRecordStatus: 'Aktif rota hazır.',
      firstStep: 'Aktif rotanı aç.',
      nextStep: 'Sıradaki durağı kontrol et.',
    }),
  });
  must(companyChat, 'teklif', 'company chat uses plan language');
  must(companyChat, 'sözleşme', 'company chat uses contract language');
  must(companyChat, 'Şirket', 'company chat uses Turkish role name');
  mustNot(companyChat, 'Company', 'company chat avoids English role name');
  must(driverChat, 'rota', 'driver chat stays field oriented');
  must(driverChat, 'sıradaki', 'driver chat keeps stop language');
  must(driverChat, 'Sürücü', 'driver chat uses Turkish role name');
  mustNot(driverChat, 'Driver', 'driver chat avoids English role name');
  assert(companyChat !== driverChat, 'same chat question produces different role replies');

  const roomChat = buildHelpReply({
    message: 'Bu program ne işe yarıyor?',
    role: 'ROOM',
    screenFixture: buildScreenFixture({
      path: '/room/operation-health',
      label: 'Room Operation Health',
      menuPurpose: 'Araç, sürücü ve operasyon akışını izlemek için kullanılır.',
      screenExplanation: 'Araç, sürücü ve operasyon akışını izlemek için kullanılır.',
      summary: 'Araç, sürücü ve operasyon akışı hazır.',
      selectedSummary: 'Araç ve sürücü kontrolü hazır.',
      selectedRecordStatus: 'Araç ve sürücü kontrolü hazır.',
      firstStep: 'Teklifleri incele.',
      nextStep: 'Araç ve sürücü uygunluğunu kontrol et.',
    }),
  });
  const superAdminChat = buildHelpReply({
    message: 'Bu program ne işe yarıyor?',
    role: 'SUPER_ADMIN',
    screenFixture: buildScreenFixture({
      path: '/superadmin',
      label: 'Super Admin',
      menuPurpose: 'Sistem durumu, ticari akış ve audit özetini gösterir.',
      screenExplanation: 'Sistem durumu, ticari akış ve audit özetini gösterir.',
      summary: 'Sistem durumu ve audit özeti hazır.',
      selectedSummary: 'Sistem durumu hazır.',
      selectedRecordStatus: 'Sistem durumu hazır.',
      firstStep: 'Sistem durumu bandını aç.',
      nextStep: 'Ticari akışı kontrol et.',
    }),
  });
  must(roomChat, 'araç', 'room chat uses vehicle language');
  must(roomChat, 'sürücü', 'room chat uses driver language');
  must(roomChat, 'Oda', 'room chat uses Turkish role name');
  mustNot(roomChat, 'Room', 'room chat avoids English role name');
  must(superAdminChat, 'sistem', 'super admin chat uses system language');
  must(superAdminChat, 'audit', 'super admin chat uses audit language');
  must(superAdminChat, 'Süper Yönetici', 'super admin chat uses Turkish role name');
  mustNot(superAdminChat, 'Super admin', 'super admin chat avoids English role name');
  assert(roomChat !== superAdminChat, 'room and super admin replies differ');

  const startDefaultReply = buildHelpReply({
    message: 'Ben nereden başlamalıyım?',
    role: 'DEFAULT',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
    },
    screenFixture: buildScreenFixture({
      path: '/company/operations',
      label: 'Planlama Merkezi',
      menuPurpose: 'Planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Vardiya ya da talebi aç.',
      nextStep: 'Teklifleri topla ve karşılaştır.',
    }),
  });
  must(startDefaultReply, 'Hangi roldesin?', 'generic start asks for role when role is unknown');
  mustNot(startDefaultReply, 'alternatif menü', 'generic start no longer becomes an alternative-path reply');
  mustNot(startDefaultReply, 'NEEDS_REVIEW', 'generic start does not leak internal status');
  mustNot(startDefaultReply, 'Takılırsan', 'generic start drops repetitive fallback');

  const companyStartReply = buildHelpReply({
    message: 'Bu programda Company olarak ne yapmam gerekiyor?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  must(companyStartReply, 'Şirket', 'company start reply uses Turkish role name');
  must(companyStartReply, 'Şirket rolünde servis ihtiyacını planlarsın.', 'company start reply gives operational guidance');
  must(companyStartReply, 'Planlama Merkezi', 'company start reply names the planning center');
  must(companyStartReply, 'Yeni Plan Oluştur', 'company start reply includes the new plan entry');
  must(companyStartReply, 'Rehberi Başlat', 'company start reply includes the guided entry');
  must(companyStartReply, 'oluşan vardiyayı Vardiyalar ekranında takip eder', 'company start reply keeps Vardiyalar for follow-up only');
  must(companyStartReply, 'teklif karşılaştırma', 'company start reply uses the planning lane');
  must(companyStartReply, 'sözleşme hazırlığı', 'company start reply uses the contract lane');
  mustNot(companyStartReply, 'Company', 'company start reply avoids English role name');
  mustNot(companyStartReply, 'Takılırsan', 'company start reply drops repetitive fallback');

  const planBuilderReply = buildHelpReply({
    message: 'Plan Builder ne işe yarıyor, burada ne yapacağım?',
    role: 'DEFAULT',
    screenFixture: buildScreenFixture({
      path: '/company/plan-builder',
      label: 'Plan Builder',
      menuPurpose: 'Plan Builder, vardiya ve teklif akışını düzenler.',
      screenExplanation: 'Plan Builder, vardiya ve teklif akışını düzenler.',
      summary: 'Plan Builder plan ve teklif hazırlığı için kullanılır.',
      selectedSummary: 'Plan Builder seçili.',
      selectedRecordStatus: 'Plan Builder seçili.',
      firstStep: 'Vardiya ya da talebi aç.',
      nextStep: 'Teklifleri topla ve karşılaştır.',
    }),
  });
  must(planBuilderReply, 'Planlama Merkezi', 'named screen answer resolves to planning center');
  mustNot(planBuilderReply, 'Plan Builder', 'named screen answer does not echo the English alias');
  must(planBuilderReply, 'vardiya', 'named screen answer explains the start flow');
  must(planBuilderReply, 'teklif', 'named screen answer explains the preparation flow');
  mustNot(planBuilderReply, 'Takılırsan', 'named screen answer drops repetitive fallback');
  mustNot(planBuilderReply, 'NEEDS_REVIEW', 'named screen answer strips internal statuses');

  const screenFocusResponse = buildHelpResponse({
    message: 'Bu ekranda neye bakmalıyım?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  const screenFocusReply = screenFocusResponse.reply;
  must(screenFocusReply, 'şirket konumu', 'screen focus reply starts with company location');
  must(screenFocusReply, 'tarih / saat', 'screen focus reply includes date and time');
  must(screenFocusReply, 'servis yönü', 'screen focus reply includes service direction');
  must(screenFocusReply, 'kapsam', 'screen focus reply includes scope');
  must(screenFocusReply, 'personel', 'screen focus reply includes personnel review');
  must(screenFocusReply, 'adres / konum', 'screen focus reply includes address and location review');
  must(screenFocusReply, 'duraklar', 'screen focus reply includes stop review');
  must(screenFocusReply, 'rota önizlemesine', 'screen focus reply includes route preview');
  must(screenFocusReply, 'Vardiyalar ekranında takip', 'screen focus reply keeps shifts as follow-up only');
  mustNot(screenFocusReply, 'Bu ekran,', 'screen focus reply does not fall back to screen-purpose template');
  mustNot(screenFocusReply, 'Plan Builder', 'screen focus reply avoids builder jargon');
  mustNot(screenFocusReply, 'OSRM', 'screen focus reply avoids OSRM jargon');
  mustNot(screenFocusReply, 'georeview', 'screen focus reply avoids georeview jargon');
  mustNot(screenFocusReply, 'matrix', 'screen focus reply avoids matrix jargon');
  mustNot(screenFocusReply, 'readiness', 'screen focus reply avoids readiness jargon');
  const screenFocusChips = buildSuggestedChips({ entityType: 'screen', questionType: 'SCREEN_FOCUS', roleMode: 'OPERATIONS', screenPath: '/company' });
  must(screenFocusChips.join(' • '), 'Konum kontrolü', 'screen focus chips stay on the focus family');
  must(screenFocusChips.join(' • '), 'Tarih / saat kontrolü', 'screen focus chips include date-time review');
  must(screenFocusChips.join(' • '), 'Personel ve duraklar', 'screen focus chips include personnel and stops');
  assert(screenFocusResponse.questionType === 'SCREEN_FOCUS', 'screen focus reply resolves to SCREEN_FOCUS');

  const riskListResponse = buildHelpResponse({
    message: 'Riskleri sırala',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  const riskListReply = riskListResponse.reply;
  must(riskListReply, 'Başlıca riskler', 'risk list reply names the risk lane');
  must(riskListReply, 'şirket konumunun eksik olması', 'risk list reply includes location risk');
  must(riskListReply, 'tarih / saat ya da servis yönünün yanlış seçilmesi', 'risk list reply includes date-time and direction risk');
  must(riskListReply, 'kapsamın dar ya da geniş gelmesi', 'risk list reply includes scope risk');
  must(riskListReply, 'personel listesindeki eksikler', 'risk list reply includes personnel risk');
  must(riskListReply, 'adres / konum hatası', 'risk list reply includes address risk');
  must(riskListReply, 'durak / rota önizlemesinde sapma', 'risk list reply includes stop-route preview risk');
  mustNot(riskListReply, 'Bu ekran,', 'risk list reply does not fall back to screen-purpose template');
  mustNot(riskListReply, 'Plan Builder', 'risk list reply avoids builder jargon');
  mustNot(riskListReply, 'OSRM', 'risk list reply avoids OSRM jargon');
  mustNot(riskListReply, 'georeview', 'risk list reply avoids georeview jargon');
  mustNot(riskListReply, 'matrix', 'risk list reply avoids matrix jargon');
  mustNot(riskListReply, 'readiness', 'risk list reply avoids readiness jargon');
  const riskListChips = buildSuggestedChips({ entityType: 'screen', questionType: 'RISK_LIST', roleMode: 'OPERATIONS', screenPath: '/company' });
  must(riskListChips.join(' • '), 'Konum riski', 'risk list chips stay on the risk family');
  must(riskListChips.join(' • '), 'Tarih / saat riski', 'risk list chips include date-time risk');
  must(riskListChips.join(' • '), 'Personel açığı', 'risk list chips include personnel gap');
  assert(riskListResponse.questionType === 'RISK_LIST', 'risk list reply resolves to RISK_LIST');

  const nextBestActionResponse = buildHelpResponse({
    message: 'Sıradaki doğru işlem ne?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  const nextBestActionReply = nextBestActionResponse.reply;
  must(nextBestActionReply, 'Planlama Merkezi', 'next best action reply names the planning center');
  must(nextBestActionReply, 'Sıradaki doğru işlem planın durumuna bağlıdır', 'next best action reply names the action lane');
  must(nextBestActionReply, 'Yeni Plan Oluştur', 'next best action reply includes new plan entry');
  must(nextBestActionReply, 'Rehberi Başlat', 'next best action reply includes guided entry');
  must(nextBestActionReply, 'paket, tarih, saat, servis yönü ve kapsam', 'next best action reply includes plan controls');
  must(nextBestActionReply, 'personel', 'next best action reply includes personnel review');
  must(nextBestActionReply, 'adres ve konum', 'next best action reply includes address/location review');
  must(nextBestActionReply, 'durakları hazırla', 'next best action reply includes stop preparation');
  must(nextBestActionReply, 'rota önizlemesini kontrol et', 'next best action reply includes route preview');
  must(nextBestActionReply, 'Vardiyalar ekranında takip', 'next best action reply keeps shifts as follow-up only');
  mustNot(nextBestActionReply, 'Bu ekran,', 'next best action reply does not fall back to screen-purpose template');
  mustNot(nextBestActionReply, 'Plan Builder', 'next best action reply avoids builder jargon');
  mustNot(nextBestActionReply, 'OSRM', 'next best action reply avoids OSRM jargon');
  mustNot(nextBestActionReply, 'georeview', 'next best action reply avoids georeview jargon');
  mustNot(nextBestActionReply, 'matrix', 'next best action reply avoids matrix jargon');
  mustNot(nextBestActionReply, 'readiness', 'next best action reply avoids readiness jargon');
  for (const term of ['Step', 'gönderime hazır', 'route apply', 'selected record', 'screen context', 'entity', 'enum']) {
    mustNot(nextBestActionReply, term, `next best action reply avoids ${term}`);
  }
  const nextBestActionChips = buildSuggestedChips({ entityType: 'screen', questionType: 'NEXT_BEST_ACTION', roleMode: 'OPERATIONS', screenPath: '/company' });
  must(nextBestActionChips.join(' • '), 'Eksik konumu düzelt', 'next best action chips stay on the action family');
  must(nextBestActionChips.join(' • '), 'Vardiyayı takip et', 'next best action chips include follow-up tracking');
  must(nextBestActionChips.join(' • '), 'Teklif hazırlığı', 'next best action chips include commercial prep');
  assert(nextBestActionResponse.questionType === 'NEXT_BEST_ACTION', 'next best action reply resolves to NEXT_BEST_ACTION');

  const nextBestActionVariantResponse = buildHelpResponse({
    message: 'Sıradaki doğru işlem ne?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/planning',
      label: 'Rehberli Mod',
      menuPurpose: 'Yeni plan ve rehber akışı için kullanılır.',
      screenExplanation: 'Yeni plan ve rehber akışı için kullanılır.',
      summary: 'Yeni plan rehberi hazır.',
      selectedSummary: 'Yeni plan akışı hazır.',
      selectedRecordStatus: 'Yeni plan akışı hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Yeni Plan Oluştur veya Rehberi Başlat.',
    }),
  });
  const nextBestActionVariantReply = nextBestActionVariantResponse.reply;
  must(nextBestActionVariantReply, 'Planlama Merkezi', 'variant next best action reply names the planning center');
  must(nextBestActionVariantReply, 'Sıradaki doğru işlem planın durumuna bağlıdır', 'variant next best action reply names the action lane');
  must(nextBestActionVariantReply, 'Yeni Plan Oluştur', 'variant next best action reply includes new plan entry');
  must(nextBestActionVariantReply, 'Rehberi Başlat', 'variant next best action reply includes guided entry');
  must(nextBestActionVariantReply, 'paket, tarih, saat, servis yönü ve kapsam', 'variant next best action reply includes plan controls');
  must(nextBestActionVariantReply, 'personel', 'variant next best action reply includes personnel review');
  must(nextBestActionVariantReply, 'adres ve konum', 'variant next best action reply includes address/location review');
  must(nextBestActionVariantReply, 'durakları hazırla', 'variant next best action reply includes stop preparation');
  must(nextBestActionVariantReply, 'rota önizlemesini kontrol et', 'variant next best action reply includes route preview');
  must(nextBestActionVariantReply, 'Vardiyalar ekranında takip', 'variant next best action reply keeps shifts as follow-up only');
  mustNot(nextBestActionVariantReply, 'Bu ekran,', 'variant next best action reply does not fall back to screen-purpose template');
  mustNot(nextBestActionVariantReply, 'Plan Builder', 'variant next best action reply avoids builder jargon');
  mustNot(nextBestActionVariantReply, 'OSRM', 'variant next best action reply avoids OSRM jargon');
  mustNot(nextBestActionVariantReply, 'georeview', 'variant next best action reply avoids georeview jargon');
  mustNot(nextBestActionVariantReply, 'matrix', 'variant next best action reply avoids matrix jargon');
  mustNot(nextBestActionVariantReply, 'readiness', 'variant next best action reply avoids readiness jargon');
  assert(nextBestActionVariantResponse.questionType === 'NEXT_BEST_ACTION', 'variant next best action reply resolves to NEXT_BEST_ACTION');

  const nextBestActionPlanningPathResponse = buildHelpResponse({
    message: 'Sıradaki doğru işlem ne?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/organization/planning',
      label: 'Rehberli Mod',
      menuPurpose: 'Yeni plan ve rehber akışı için kullanılır.',
      screenExplanation: 'Yeni plan ve rehber akışı için kullanılır.',
      summary: 'Yeni plan rehberi hazır.',
      selectedSummary: 'Yeni plan akışı hazır.',
      selectedRecordStatus: 'Yeni plan akışı hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Yeni Plan Oluştur veya Rehberi Başlat.',
    }),
  });
  const nextBestActionPlanningPathReply = nextBestActionPlanningPathResponse.reply;
  must(nextBestActionPlanningPathReply, 'Planlama Merkezi', 'planning path next best action reply names the planning center');
  must(nextBestActionPlanningPathReply, 'Sıradaki doğru işlem planın durumuna bağlıdır', 'planning path next best action reply names the action lane');
  must(nextBestActionPlanningPathReply, 'Yeni Plan Oluştur', 'planning path next best action reply includes new plan entry');
  must(nextBestActionPlanningPathReply, 'Rehberi Başlat', 'planning path next best action reply includes guided entry');
  must(nextBestActionPlanningPathReply, 'paket, tarih, saat, servis yönü ve kapsam', 'planning path next best action reply includes plan controls');
  must(nextBestActionPlanningPathReply, 'personel', 'planning path next best action reply includes personnel review');
  must(nextBestActionPlanningPathReply, 'adres ve konum', 'planning path next best action reply includes address/location review');
  must(nextBestActionPlanningPathReply, 'durakları hazırla', 'planning path next best action reply includes stop preparation');
  must(nextBestActionPlanningPathReply, 'rota önizlemesini kontrol et', 'planning path next best action reply includes route preview');
  must(nextBestActionPlanningPathReply, 'Vardiyalar ekranında takip', 'planning path next best action reply keeps shifts as follow-up only');
  mustNot(nextBestActionPlanningPathReply, 'Bu ekran,', 'planning path next best action reply does not fall back to screen-purpose template');
  mustNot(nextBestActionPlanningPathReply, 'Plan Builder', 'planning path next best action reply avoids builder jargon');
  mustNot(nextBestActionPlanningPathReply, 'OSRM', 'planning path next best action reply avoids OSRM jargon');
  mustNot(nextBestActionPlanningPathReply, 'georeview', 'planning path next best action reply avoids georeview jargon');
  mustNot(nextBestActionPlanningPathReply, 'matrix', 'planning path next best action reply avoids matrix jargon');
  mustNot(nextBestActionPlanningPathReply, 'readiness', 'planning path next best action reply avoids readiness jargon');
  assert(nextBestActionPlanningPathResponse.questionType === 'NEXT_BEST_ACTION', 'planning path next best action reply resolves to NEXT_BEST_ACTION');

  const nextBestActionMinimalResponse = buildHelpResponse({
    message: 'Sıradaki doğru işlem ne?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: '',
      screenExplanation: '',
      summary: '',
      selectedSummary: '',
      selectedRecordStatus: '',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  const nextBestActionMinimalReply = nextBestActionMinimalResponse.reply;
  must(nextBestActionMinimalReply, 'Planlama Merkezi', 'minimal next best action reply still uses planning center');
  must(nextBestActionMinimalReply, 'Sıradaki doğru işlem planın durumuna bağlıdır', 'minimal next best action reply names the action lane');
  must(nextBestActionMinimalReply, 'Yeni Plan Oluştur', 'minimal next best action reply keeps the fix lane');
  must(nextBestActionMinimalReply, 'Rehberi Başlat', 'minimal next best action reply keeps the guided lane');
  must(nextBestActionMinimalReply, 'paket, tarih, saat, servis yönü ve kapsam', 'minimal next best action reply keeps the plan controls');
  must(nextBestActionMinimalReply, 'personel', 'minimal next best action reply keeps the personnel lane');
  must(nextBestActionMinimalReply, 'Vardiyalar ekranında takip', 'minimal next best action reply keeps follow-up tracking');
  mustNot(nextBestActionMinimalReply, 'Bu ekran,', 'minimal next best action reply does not fall back to screen-purpose template');
  mustNot(nextBestActionMinimalReply, 'Plan Builder', 'minimal next best action reply avoids builder jargon');
  assert(nextBestActionMinimalResponse.questionType === 'NEXT_BEST_ACTION', 'minimal next best action phrase resolves to NEXT_BEST_ACTION');

  const liveLikePlanningRequest = normalizeCopilotRequestInput({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    message: 'Sıradaki doğru işlem ne?',
    conversationState: {
      recentMessages: [],
      drawerMode: 'STEP',
      lastScreenPath: '/company',
      lastScreenLabel: 'Planlama Merkezi',
      uiSurface: {
        visibleButtons: [
          { label: 'Harita', disabled: false, reason: '' },
          { label: 'Operasyon Paneli', disabled: false, reason: '' },
          { label: 'Planlama Merkezi', disabled: false, reason: '' },
          { label: 'Vardiyalar', disabled: false, reason: '' },
          { label: 'Sözleşmeler', disabled: false, reason: '' },
          { label: 'Ticari Akış', disabled: false, reason: '' },
          { label: 'Hizmet Değerlendirme', disabled: false, reason: '' },
          { label: 'Raporlar', disabled: false, reason: '' },
          { label: 'Personel Link', disabled: false, reason: '' },
          { label: 'Personel Erişimi', disabled: false, reason: '' },
          { label: 'Personel Konum Seçici', disabled: false, reason: '' },
          { label: 'Check-in', disabled: false, reason: '' },
        ],
        disabledButtons: [],
        tableHeaders: ['Ad Soyad', 'Adres', 'Enlem', 'Boylam', 'Konum', 'İşlem'],
        modalTitles: [],
        activeTabs: ['Planlama Merkezi'],
        pageTitles: [],
      },
    },
    screenContext: {
      id: 2101,
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      companyKind: 'COMPANY',
      selectedLabel: '',
      selectedEntityType: '',
      selectedEntityId: null,
      selectedSummary: '',
      selectedRecordSummary: '',
      selectedRecordStatus: '',
      selectedRecordLabel: '',
      helpContextSummary: '',
      contextSummary: '',
      selectedFields: [],
      selectedBadges: [],
      structuredFacts: null,
      liveFacts: null,
      uiHints: {
        drawerMode: 'STEP',
        visibleSuggestions: ['Bu ekranda neye bakmalıyım?', 'Riskleri sırala', 'Sıradaki doğru işlem ne?'],
      },
    },
    format: 'json',
  });
  must(liveLikePlanningRequest.message, 'Sıradaki doğru işlem ne?', 'normalization preserves the live next-best-action phrase');
  mustNot(liveLikePlanningRequest.message, 'Şimdi ne yapayım?', 'normalization does not collapse next-best-action into generic next-step');
  const liveLikePlanningResponse = buildHelpResponse({
    message: liveLikePlanningRequest.message,
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
    conversationState: liveLikePlanningRequest.conversationState,
  });
  must(liveLikePlanningResponse.reply, 'Planlama Merkezi', 'live-like planning reply names the planning center');
  must(liveLikePlanningResponse.reply, 'Sıradaki doğru işlem planın durumuna bağlıdır', 'live-like planning reply uses the next-best-action lane');
  must(liveLikePlanningResponse.reply, 'Yeni Plan Oluştur', 'live-like planning reply includes new plan entry');
  must(liveLikePlanningResponse.reply, 'Rehberi Başlat', 'live-like planning reply includes guided entry');
  must(liveLikePlanningResponse.reply, 'paket, tarih, saat, servis yönü ve kapsam', 'live-like planning reply includes plan controls');
  mustNot(liveLikePlanningResponse.reply, 'Bu ekran, planlama merkezi içinde', 'live-like planning reply avoids screen-purpose fallback');
  assert(liveLikePlanningResponse.questionType === 'NEXT_BEST_ACTION', 'live-like planning reply resolves to NEXT_BEST_ACTION');

  const liveLikeParaphraseResponse = buildHelpResponse({
    message: 'Şimdi ne yapayım?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
    conversationState: liveLikePlanningRequest.conversationState,
  });
  must(liveLikeParaphraseResponse.reply, 'Planlama Merkezi', 'planning paraphrase reply names the planning center');
  must(liveLikeParaphraseResponse.reply, 'Sıradaki doğru işlem', 'planning paraphrase reply keeps the action lane');
  mustNot(liveLikeParaphraseResponse.reply, 'Bu ekran, planlama merkezi içinde', 'planning paraphrase reply avoids screen-purpose fallback');
  assert(liveLikeParaphraseResponse.questionType === 'NEXT_BEST_ACTION', 'planning paraphrase reply resolves to NEXT_BEST_ACTION');

  const liveLikeContinueResponse = buildHelpResponse({
    message: 'Nereden devam edeyim?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
    conversationState: liveLikePlanningRequest.conversationState,
  });
  must(liveLikeContinueResponse.reply, 'Planlama Merkezi', 'continue reply names the planning center');
  must(liveLikeContinueResponse.reply, 'Sıradaki doğru işlem', 'continue reply keeps the action lane');
  mustNot(liveLikeContinueResponse.reply, 'Bu ekran, planlama merkezi içinde', 'continue reply avoids screen-purpose fallback');
  assert(liveLikeContinueResponse.questionType === 'NEXT_BEST_ACTION', 'continue reply resolves to NEXT_BEST_ACTION');

  const liveLikeStepChangeResponse = buildHelpResponse({
    message: 'Hangi adıma geçeceğim?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
    conversationState: liveLikePlanningRequest.conversationState,
  });
  must(liveLikeStepChangeResponse.reply, 'Planlama Merkezi', 'step change reply names the planning center');
  must(liveLikeStepChangeResponse.reply, 'Sıradaki doğru işlem', 'step change reply keeps the action lane');
  mustNot(liveLikeStepChangeResponse.reply, 'Bu ekran, planlama merkezi içinde', 'step change reply avoids screen-purpose fallback');
  assert(liveLikeStepChangeResponse.questionType === 'NEXT_BEST_ACTION', 'step change reply resolves to NEXT_BEST_ACTION');

  const nextBestActionUiSurfaceResponse = buildHelpResponse({
    message: 'Sıradaki doğru işlem ne?',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'SCREEN_PURPOSE',
      lastPrimaryConcern: 'Planlama Merkezi / Rehberli Mod → Yeni Plan',
      uiSurface: {
        modalTitles: ['Rehberli Mod → Yeni Plan'],
        pageTitles: ['Planlama Merkezi'],
        activeTabs: ['Yeni Plan'],
      },
    },
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Şirket Paneli',
      menuPurpose: '',
      screenExplanation: '',
      summary: '',
      selectedSummary: '',
      selectedRecordStatus: '',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  const nextBestActionUiSurfaceReply = nextBestActionUiSurfaceResponse.reply;
  must(nextBestActionUiSurfaceReply, 'Planlama Merkezi', 'ui-surface next best action reply names the planning center');
  must(nextBestActionUiSurfaceReply, 'Yeni Plan Oluştur', 'ui-surface next best action reply includes new plan entry');
  must(nextBestActionUiSurfaceReply, 'Rehberi Başlat', 'ui-surface next best action reply includes guided entry');
  must(nextBestActionUiSurfaceReply, 'paket, tarih, saat, servis yönü ve kapsam', 'ui-surface next best action reply includes plan controls');
  must(nextBestActionUiSurfaceReply, 'Vardiyalar ekranında takip', 'ui-surface next best action reply keeps shifts as follow-up only');
  mustNot(nextBestActionUiSurfaceReply, 'Bu ekran, planlama merkezi içinde', 'ui-surface next best action reply avoids the screen-purpose fallback');
  assert(nextBestActionUiSurfaceResponse.questionType === 'NEXT_BEST_ACTION', 'ui-surface next best action reply resolves to NEXT_BEST_ACTION');

  const companyStartPathReply = buildHelpReply({
    message: 'Ben nereden başlamalıyım?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Şirket planlama ve teklif hazırlığı hazır.',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    }),
  });
  must(companyStartPathReply, 'Şirket', 'company start path reply uses Turkish role name');
  must(companyStartPathReply, 'Planlama Merkezi', 'company start path reply uses planning center');
  must(companyStartPathReply, 'vardiya', 'company start path reply uses plan flow language');
  must(companyStartPathReply, 'teklif', 'company start path reply uses offer flow language');
  mustNot(companyStartPathReply, 'Company', 'company start path reply avoids English role name');
  mustNot(companyStartPathReply, 'Takılırsan', 'company start path reply drops repetitive fallback');

  const howToResponse = buildHelpResponse({
    message: 'Vardiya nasıl oluşturulur?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama ve takip için kullanılır.',
      screenExplanation: 'Vardiya planlama ve takip için kullanılır.',
      summary: 'Vardiya planlama ve takip hazır.',
      selectedSummary: 'Vardiyalar ekranında takip edilen kayıt hazır.',
      selectedRecordStatus: 'Vardiyalar ekranında takip edilen kayıt hazır.',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    }),
  });
  const howToReply = howToResponse.reply;
  must(howToResponse.followUpPrompt, 'devamını anlat', 'how-to reply exposes continue-detail prompt');
  mustNot(howToResponse.followUpPrompt, 'Önce ilgili satırı seç', 'how-to reply avoids selection prompt');
  assert(['HOW_TO_HELP', 'DETAIL_FLOW'].includes(String(howToResponse.questionType || '')), 'how-to reply resolves to detail continuation intent');
  must(howToReply, 'Planlama Merkezi', 'how-to reply starts from planning center');
  must(howToReply, 'Yeni Plan Oluştur', 'how-to reply includes new plan entry');
  must(howToReply, 'Rehberi Başlat', 'how-to reply includes guidance entry');
  must(howToReply, 'paket', 'how-to reply includes package selection');
  must(howToReply, 'tarih', 'how-to reply includes date selection');
  must(howToReply, 'saat', 'how-to reply includes time selection');
  must(howToReply, 'servis yönü', 'how-to reply includes direction selection');
  must(howToReply, 'kapsam', 'how-to reply includes scope selection');
  must(howToReply, 'personel', 'how-to reply includes personnel review');
  must(howToReply, 'adres/konum', 'how-to reply includes address/location review');
  must(howToReply, 'durak', 'how-to reply includes stop review');
  must(howToReply, 'rota önizlemesini', 'how-to reply includes route preview');
  must(howToReply, 'oluşan vardiyayı Vardiyalar ekranında takip eder', 'how-to reply uses shifts only for follow-up');
  mustNot(howToReply, 'Vardiyalar ekranına gir', 'how-to reply does not start from the shifts screen');
  mustNot(howToReply, 'Bu ekran,', 'how-to reply avoids screen-purpose template');
  mustNot(howToReply, 'Plan Builder', 'how-to reply avoids English builder jargon');
  mustNot(howToReply, 'Company', 'how-to reply avoids English role name');
  mustNot(howToReply, 'georeview', 'how-to reply avoids georeview jargon');
  mustNot(howToReply, 'matrix', 'how-to reply avoids matrix jargon');
  mustNot(howToReply, 'Takılırsan', 'how-to reply drops repetitive fallback');

  const companyDetailResponse = buildHelpResponse({
    message: 'devamını anlat',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'HOW_TO_HELP',
      lastPrimaryConcern: 'Vardiya nasıl oluşturulur?',
      lastUserMessage: 'Vardiya nasıl oluşturulur?',
      lastRawUserMessage: 'Vardiya nasıl oluşturulur?',
      recentMessages: [
        { role: 'user', text: 'Vardiya nasıl oluşturulur?' },
        { role: 'assistant', text: howToReply },
      ],
    },
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya planlama ve takip için kullanılır.',
      screenExplanation: 'Vardiya planlama ve takip için kullanılır.',
      summary: 'Vardiya planlama ve takip hazır.',
      selectedSummary: 'Vardiyalar ekranında takip edilen kayıt hazır.',
      selectedRecordStatus: 'Vardiyalar ekranında takip edilen kayıt hazır.',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    }),
  });
  const companyDetailReply = companyDetailResponse.reply;
  assert(normalize(companyDetailReply) !== normalize(howToReply), 'devamını anlat expands instead of repeating the short answer');
  mustNot(companyDetailResponse.followUpPrompt, 'Önce ilgili satırı seç', 'detail reply avoids selection prompt');
  assert(['HOW_TO_HELP', 'DETAIL_FLOW'].includes(String(companyDetailResponse.questionType || '')), 'detail reply resolves to detail continuation intent');
  ordered(
    companyDetailReply,
    ['Planlama Merkezi', 'Yeni Plan Oluştur', 'Rehberi Başlat', 'Şirket konumunu ve servis başlangıç noktasını', 'Excel ile toplu ekle', 'tek tek', 'Personel Konum Seçici', 'haritada mevcut konumu düzelt', 'Durakları hazırla', 'yakın adresleri uygun duraklarda topla', 'Taslak vardiyayı oluştur', 'Vardiyalar ekranında takip', 'Oda veya sağlayıcıdan teklif alma hazırlığı', 'sözleşme hazırlığı'],
    'devamını anlat follows the expanded company shift flow',
  );
  mustNot(companyDetailReply, 'Vardiyalar ekranına gir', 'detail reply does not restart from the shifts screen');
  mustNot(companyDetailReply, 'Bu ekran,', 'detail reply avoids screen-purpose template');
  mustNot(companyDetailReply, 'Plan Builder', 'detail reply avoids English builder jargon');
  mustNot(companyDetailReply, 'OSRM', 'detail reply avoids OSRM jargon');
  mustNot(companyDetailReply, 'matrix', 'detail reply avoids matrix jargon');
  mustNot(companyDetailReply, 'geocode', 'detail reply avoids geocode jargon');
  mustNot(companyDetailReply, 'lat/lng', 'detail reply avoids lat/lng jargon');
  mustNot(companyDetailReply, 'route apply', 'detail reply avoids route apply jargon');
  mustNot(companyDetailReply, 'readiness', 'detail reply avoids readiness jargon');
  mustNot(companyDetailReply, 'Takılırsan', 'detail reply drops repetitive fallback');
  for (const term of ['Step', 'gönderime hazır', 'selected record', 'screen context', 'entity', 'enum']) {
    mustNot(companyDetailReply, term, `detail reply avoids ${term}`);
  }

  const companyDetailMinimalResponse = buildHelpResponse({
    message: 'devamını anlat',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'HOW_TO_HELP',
      lastPrimaryConcern: 'Vardiya nasıl oluşturulur?',
      lastUserMessage: 'Vardiya nasıl oluşturulur?',
      lastRawUserMessage: 'Vardiya nasıl oluşturulur?',
      recentMessages: [
        { role: 'user', text: 'Vardiya nasıl oluşturulur?' },
        { role: 'assistant', text: howToReply },
      ],
    },
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: '',
      screenExplanation: '',
      summary: '',
      selectedSummary: '',
      selectedRecordStatus: '',
      firstStep: 'Takip edeceğin vardiyayı seç.',
      nextStep: 'Teklif, detay veya önizlemeyi aç.',
    }),
  });
  const companyDetailMinimalReply = companyDetailMinimalResponse.reply;
  assert(normalize(companyDetailMinimalReply) !== normalize(howToReply), 'minimal detail reply expands instead of repeating the short answer');
  ordered(
    companyDetailMinimalReply,
    ['Planlama Merkezi', 'Yeni Plan Oluştur', 'Rehberi Başlat', 'Paket', 'tarih', 'saat', 'servis yönü', 'kapsam', 'personel', 'adres / konum', 'durak', 'rota önizlemesi', 'Vardiyalar ekranında takip'],
    'minimal devamını anlat follows the expanded company shift flow',
  );
  mustNot(companyDetailMinimalReply, 'Bu ekran,', 'minimal detail reply avoids screen-purpose template');
  mustNot(companyDetailMinimalReply, 'Plan Builder', 'minimal detail reply avoids English builder jargon');
  mustNot(companyDetailMinimalReply, 'Takılırsan', 'minimal detail reply drops repetitive fallback');

  for (const actionMessage of ['teklifi kabul et', 'aracı ata', 'sözleşmeyi yürürlüğe al']) {
    const refusal = buildHelpReply({
      message: actionMessage,
      role: 'COMPANY',
      screenFixture: buildScreenFixture({
        path: '/company/agreements',
        label: 'Company Agreements',
        menuPurpose: 'Planlama ve teklif hazırlığı için kullanılır.',
        screenExplanation: 'Planlama ve teklif hazırlığı için kullanılır.',
        summary: 'Planlama ve teklif hazırlığı hazır.',
        selectedSummary: 'Teklif hazır değil.',
        selectedRecordStatus: 'Teklif hazır değil.',
        firstStep: 'Vardiya veya talebi aç.',
        nextStep: 'Teklifleri topla ve karşılaştır.',
      }),
    });
    if (actionMessage === 'teklifi kabul et') {
      must(refusal, 'kabul edemem', `${actionMessage} gets a safe refusal`);
      must(refusal, 'Kabul öncesi', `${actionMessage} keeps the safe preparation lane`);
    } else if (actionMessage === 'aracı ata') {
      must(refusal, 'atayamam', `${actionMessage} gets a safe refusal`);
      must(refusal, 'Şirket tarafında araç / sürücü uygunluğunu kontrol', `${actionMessage} keeps the safe preparation lane`);
    } else {
      must(refusal, 'alamam', `${actionMessage} gets a safe refusal`);
      must(refusal, 'Sözleşme hazırlığı', `${actionMessage} keeps the safe preparation lane`);
    }
    mustNot(refusal, 'uyguladım', `${actionMessage} does not claim execution`);
  }

  const enteredReply = buildHelpReply({
    message: 'girdim',
    role: 'DRIVER',
    screenFixture: buildScreenFixture({
      path: '/driver/today',
      label: 'Driver Today',
      selectedSummary: 'Aktif rota hazır.',
      selectedRecordStatus: 'Aktif rota hazır.',
    }),
  });
  const doneReply = buildHelpReply({
    message: 'yaptım',
    role: 'DRIVER',
    screenFixture: buildScreenFixture({
      path: '/driver/today',
      label: 'Driver Today',
      selectedSummary: 'Aktif rota hazır.',
      selectedRecordStatus: 'Aktif rota hazır.',
    }),
  });
  const missingReply = buildHelpReply({
    message: 'bulamadım',
    role: 'DRIVER',
    screenFixture: buildScreenFixture({
      path: '/driver/today',
      label: 'Driver Today',
      selectedSummary: 'Aktif rota hazır.',
      selectedRecordStatus: 'Aktif rota hazır.',
    }),
  });
  const continueReply = buildHelpReply({
    message: 'devam et',
    role: 'DRIVER',
    conversationState: {
      lastSelectedLabel: 'Aktif rota',
      lastSelectedSummary: 'Aktif rota',
      lastGuidedTaskQuestionType: 'NEXT_STEP',
    },
    screenFixture: buildScreenFixture({
      path: '/driver/today',
      label: 'Driver Today',
      selectedSummary: 'Aktif rota hazır.',
      selectedRecordStatus: 'Aktif rota hazır.',
    }),
  });
  must(enteredReply, 'Girdin', 'girdim acknowledges the current step');
  must(doneReply, 'birlikte kontrol', 'yaptım checks the result');
  must(missingReply, 'alternatif', 'bulamadım offers an alternative path');
  must(continueReply, 'Aynı', 'devam et preserves context');
  assert(enteredReply !== doneReply && doneReply !== missingReply && missingReply !== continueReply, 'progress messages yield distinct replies');

  const companyEnteredReply = buildHelpReply({
    message: 'Vardiyalar ekranına girdim',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    }),
  });
  const companyDoneReply = buildHelpReply({
    message: 'yaptım',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'STEP_ENTERED',
      lastSelectedLabel: 'Aktif vardiya',
      lastSelectedSummary: 'Aktif vardiya',
    },
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    }),
  });
  const companyMissingReply = buildHelpReply({
    message: 'bulamadım',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    }),
  });
  const companyContinueReply = buildHelpReply({
    message: 'devam et',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      lastSelectedLabel: 'Aktif vardiya',
      lastSelectedSummary: 'Aktif vardiya',
    },
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Vardiyalar',
      selectedSummary: 'Aktif vardiya hazır.',
      selectedRecordStatus: 'Aktif vardiya hazır.',
    }),
  });
  must(companyEnteredReply, 'Vardiyalar ekranına girdin', 'company entered reply anchors the current screen');
  must(companyEnteredReply, 'yeni vardiya', 'company entered reply asks for the path choices');
  must(companyEnteredReply, 'teklif', 'company entered reply keeps the preparation path');
  mustNot(companyEnteredReply, 'GPS', 'company entered reply avoids driver/location drift');
  mustNot(companyEnteredReply, 'audit', 'company entered reply avoids audit drift');
  must(companyDoneReply, 'Tamam, aynı vardiya akışından devam edelim', 'company done reply checks the result');
  must(companyDoneReply, 'tarih / saat', 'company done reply keeps the flow');
  must(companyMissingReply, 'Vardiyalar ekranında yeni vardiya veya yeni plan oluştur alanını kontrol et', 'company missing reply offers an alternate menu path');
  must(companyMissingReply, 'Bekleyen sekmesinden', 'company missing reply uses alternative-path language');
  must(companyContinueReply, 'Vardiyalar akışından devam edelim', 'company continue reply preserves the prior path');
  mustNot(companyContinueReply, 'Hangi roldesin?', 'company continue reply does not restart from zero');

  const refusalReply = buildHelpReply({
    message: 'bunu sen yap',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/agreements',
      label: 'Company Agreements',
      selectedSummary: 'Teklif hazır değil.',
      selectedRecordStatus: 'Teklif hazır değil.',
      firstStep: 'Vardiya veya talebi aç.',
      nextStep: 'Teklifleri topla ve karşılaştır.',
    }),
  });
  must(refusalReply, 'Bunu senin yerine uygulayamam', 'write-action reply offers a safe preparation step');
  must(refusalReply, 'güvenli bir hazırlık yapmana yardımcı olayım', 'write-action reply keeps the safe alternative');
  mustNot(refusalReply, 'uyguladım', 'write-action reply does not claim execution');

  const locationReply = buildHelpReply({
    message: 'Konumda sorun varsa ne yapacağım?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/georeview',
      label: 'Konum İncele',
      selectedSummary: 'Konum sorunu olan kayıt hazır.',
      selectedRecordStatus: 'Konum sorunu olan kayıt hazır.',
      firstStep: 'Önce hangi kayıt veya kişinin konumunu incelediğini seç.',
      nextStep: 'Sorunun konum verisi mi, yol hesabı mı, yoksa eşleşme mi olduğunu ayır.',
    }),
  });
  must(locationReply, 'konum', 'location reply stays in plain Turkish');
  must(locationReply, 'adres', 'location reply keeps the address/control path');
  mustNot(locationReply, 'geocode', 'location reply avoids geocode jargon');
  mustNot(locationReply, 'lat/lng', 'location reply avoids lat/lng jargon');
  mustNot(locationReply, 'route apply', 'location reply avoids route apply jargon');
  mustNot(locationReply, 'readiness', 'location reply avoids readiness jargon');

  const parentReply = buildHelpReply({
    message: 'başkasının servisi ne durumda?',
    role: 'PARENT',
    screenFixture: buildScreenFixture({
      path: '/parent/live',
      label: 'Parent Live',
      selectedSummary: 'Mehmet Yılmaz servisi hazır',
      selectedRecordStatus: 'Mehmet Yılmaz servisi hazır',
    }),
  });
  const personelReply = buildHelpReply({
    message: 'başkasının servisi ne durumda?',
    role: 'PERSONEL',
    screenFixture: buildScreenFixture({
      path: '/personel/live',
      label: 'Personel Live',
      selectedSummary: 'Mehmet Yılmaz servisi hazır',
      selectedRecordStatus: 'Mehmet Yılmaz servisi hazır',
    }),
  });
  assert(
    boundaryReplyText(parentReply).includes('kvkk') || boundaryReplyText(parentReply).includes('yetkili'),
    'parent reply keeps a privacy boundary',
  );
  assert(
    boundaryReplyText(personelReply).includes('kvkk') || boundaryReplyText(personelReply).includes('yetkili'),
    'personel reply keeps a privacy boundary',
  );
  mustNot(parentReply, 'Mehmet Yılmaz', 'parent reply does not reveal another child name');
  mustNot(personelReply, 'Mehmet Yılmaz', 'personel reply does not reveal another child name');

  const assistantReply = buildAssistantReply({
    message: 'Bu program ne işe yarıyor?',
    role: 'DEFAULT',
  });
  must(assistantReply.reply, 'Hangi roldesin?', 'assistant reply keeps composer tail');
  mustNot(assistantReply.reply, 'Şimdi:', 'assistant reply strips generic lead');
  assert(
    assistantReply.reasoningAnswerComposerVersion === COPILOT_REASONING_ANSWER_COMPOSER_VERSION,
    'assistant snapshot exposes composer version',
  );

  console.log('=== COPILOT-REASONING-ANSWER-COMPOSER-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
