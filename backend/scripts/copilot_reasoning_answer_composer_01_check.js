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
  }).reply;
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
  mustNoDiff(['backend/src/routes', 'backend/src/services', 'prisma', 'backend/prisma'], 'route/service/prisma diff remains empty');

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
  must(companyOverview, 'vardiya', 'company overview uses plan language');
  must(companyOverview, 'sözleşme', 'company overview uses contract language');
  must(driverOverview, 'rota', 'driver overview uses field language');
  must(driverOverview, 'sıradaki', 'driver overview uses stop language');
  mustNot(companyOverview, 'Şimdi:', 'company overview strips generic lead marker');
  mustNot(driverOverview, 'Şimdi:', 'driver overview strips generic lead marker');
  assert(driverOverview.length <= 280, 'driver reply stays short');

  const defaultChat = buildHelpReply({ message: 'Bu program ne işe yarıyor?', role: 'DEFAULT' });
  must(defaultChat, 'SeferPakt', 'chat overview gives natural product explanation');
  must(defaultChat, 'Hangi roldesin?', 'chat overview asks role');
  must(defaultChat, 'Takılırsan "bulamadım" yaz.', 'chat overview keeps fallback');
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
  must(driverChat, 'rota', 'driver chat stays field oriented');
  must(driverChat, 'sıradaki', 'driver chat keeps stop language');
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
  must(superAdminChat, 'sistem', 'super admin chat uses system language');
  must(superAdminChat, 'audit', 'super admin chat uses audit language');
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

  const companyStartReply = buildHelpReply({
    message: 'Bu programda Company olarak ne yapmam gerekiyor?',
    role: 'COMPANY',
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
  must(companyStartReply, 'vardiya', 'company start reply uses plan flow language');
  must(companyStartReply, 'teklif', 'company start reply uses offer flow language');
  must(companyStartReply, 'sözleşme', 'company start reply uses contract language');
  mustNot(companyStartReply, 'gönderirsin', 'company start reply avoids write-action wording');
  mustNot(companyStartReply, 'APPROVED', 'company start reply strips uppercase status tokens');

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
  must(planBuilderReply, 'Plan Builder', 'named screen answer keeps the named screen');
  must(planBuilderReply, 'vardiya', 'named screen answer explains the start flow');
  must(planBuilderReply, 'teklif', 'named screen answer explains the preparation flow');
  mustNot(planBuilderReply, 'NEEDS_REVIEW', 'named screen answer strips internal statuses');

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
    must(refusal, 'yapamam', `${actionMessage} gets a safe refusal`);
    must(refusal, 'güvenli alternatif', `${actionMessage} offers a safe alternative`);
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
  must(refusalReply, 'yapamam', 'write-action request gets safe refusal');
  must(refusalReply, 'Güvenli alternatif', 'write-action reply offers a safe alternative');
  mustNot(refusalReply, 'uyguladım', 'write-action reply does not claim execution');

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
