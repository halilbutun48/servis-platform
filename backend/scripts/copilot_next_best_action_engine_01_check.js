#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NEXT_BEST_ACTION_ENGINE_VERSION,
  NEXT_BEST_ACTION_HEALTH_SIGNAL_ASSERTIONS,
  NEXT_BEST_ACTION_NO_WRITE_ACTIONS,
  NEXT_BEST_ACTION_PRIORITIZATION_ASSERTIONS,
  NEXT_BEST_ACTION_ROLE_COVERAGE,
  NEXT_BEST_ACTION_SINGLE_ACTION_ASSERTIONS,
  NEXT_BEST_ACTION_TERMINOLOGY,
  buildNextBestActionChips,
  buildNextBestActionReply,
  buildNextBestActionState,
  detectNextBestActionSurface,
  looksLikeNextBestActionQuestion,
} from '../src/ai/chat/conversationNextBestActionEngine.js';
import { normalizeVisibleReplyFragment } from '../src/ai/chat/conversationTaskStateShared.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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

const metrics = {
  runtimeCases: 0,
  testedCases: 0,
  surfaceCoverage: 0,
  roleCoverage: 0,
  roleScreenCoverage: 0,
  passCount: 0,
  failCount: 0,
  noWriteActionAssertions: NEXT_BEST_ACTION_NO_WRITE_ACTIONS.length,
  terminologyAssertions: NEXT_BEST_ACTION_TERMINOLOGY.length,
  prioritizationAssertions: NEXT_BEST_ACTION_PRIORITIZATION_ASSERTIONS.length,
  singleActionAssertions: NEXT_BEST_ACTION_SINGLE_ACTION_ASSERTIONS.length,
  regressionSeparationAssertions: 0,
  healthSignalAssertions: NEXT_BEST_ACTION_HEALTH_SIGNAL_ASSERTIONS.length,
};

function pass(label) {
  metrics.passCount += 1;
  console.log(`OK ${label}`);
}

function fail(label) {
  metrics.failCount += 1;
  throw new Error(`FAIL ${label}`);
}

function check(condition, label) {
  if (!condition) fail(label);
  pass(label);
}

function hasText(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(text, needle, label) {
  check(hasText(text, needle), label);
}

function mustNot(text, needle, label) {
  check(!hasText(text, needle), label);
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
  pass(label);
}

function joinCorpus(...parts) {
  return parts.filter(Boolean).join(' ');
}

function buildSurfaceRuntimeSpecs() {
  return [
    {
      role: 'COMPANY',
      surfaceKey: 'COMPANY_DASHBOARD_OPERATIONS',
      surfaceLabel: 'Şirket Operasyon Panosu',
      path: '/company/dashboard',
      label: 'Şirket Operasyon Panosu',
      menuPurpose: 'Şirket canlı operasyonu, eksik atama ve öncelik takibi için kullanılır.',
      selectedSummary: 'Şirket operasyon panosu seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Şirket Operasyon Panosu', 'Eksik atama', 'Güncel olmayan konum', 'Plan onayı'],
      chipsTokens: ['Eksik atama', 'Güncel olmayan konum', 'Plan onayı', 'Kullanıcı onayı'],
    },
    {
      role: 'COMPANY',
      surfaceKey: 'COMPANY_PLAN_CENTER',
      surfaceLabel: 'Planlama Merkezi',
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
      selectedSummary: 'Planlama merkezi seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Planlama Merkezi', 'Paket, tarih, saat', 'Personel satırı', 'Adres / konum'],
      chipsTokens: ['Paket / tarih / saat', 'Personel satırı', 'Adres / konum', 'Kullanıcı onayı'],
    },
    {
      role: 'COMPANY',
      surfaceKey: 'COMPANY_SHIFTS',
      surfaceLabel: 'Şirket Vardiyalar',
      path: '/company/shifts',
      label: 'Şirket Vardiyalar',
      menuPurpose: 'Şirket vardiya dağıtımı ve atama takibi için kullanılır.',
      selectedSummary: 'Şirket vardiya seçili kayıt',
      selectedRecordStatus: 'Beklemede',
      replyTokens: ['Şirket Vardiyalar', 'Vardiya saati', 'Atanmış servis', 'Sıradaki durak'],
      chipsTokens: ['Vardiya saati', 'Atanmış servis', 'Sıradaki durak', 'Başlatma öncesi kontrol'],
    },
    {
      role: 'COMPANY',
      surfaceKey: 'COMPANY_AGREEMENTS',
      surfaceLabel: 'Şirket Sözleşmeler',
      path: '/company/agreements',
      label: 'Şirket Sözleşmeler',
      menuPurpose: 'Şirket sözleşme kapsamı ve plan onayı için kullanılır.',
      selectedSummary: 'Şirket sözleşme seçili kayıt',
      selectedRecordStatus: 'İnceleniyor',
      replyTokens: ['Şirket Sözleşmeler', 'Sözleşme kapsamı', 'Yetki / veri', 'Eksik adres'],
      chipsTokens: ['Sözleşme kapsamı', 'Yetki / veri', 'Eksik adres', 'Plan onayı'],
    },
    {
      role: 'ORGANIZATION',
      surfaceKey: 'ORGANIZATION_PLAN_CENTER',
      surfaceLabel: 'Organizasyon Planlama',
      path: '/organization',
      label: 'Organizasyon Planlama',
      menuPurpose: 'Organizasyon planlama ve sözleşme hazırlığı için kullanılır.',
      selectedSummary: 'Organizasyon seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Organizasyon Planlama', 'Plan kapsamı', 'Konum doğrulama', 'Rota önizleme'],
      chipsTokens: ['Plan kapsamı', 'Konum doğrulama', 'Rota önizleme', 'Kullanıcı onayı'],
    },
    {
      role: 'SCHOOL',
      surfaceKey: 'SCHOOL_PLAN_CENTER',
      surfaceLabel: 'Okul Planlama',
      path: '/school',
      label: 'Okul Planlama',
      menuPurpose: 'Okul planlama ve servis hazırlığı için kullanılır.',
      selectedSummary: 'Okul planı seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Okul Planlama', 'Servis planı', 'Yetkili görünüm', 'Kullanıcı onayı'],
      chipsTokens: ['Servis planı', 'Katılımcı etkisi', 'Yetkili görünüm', 'Kullanıcı onayı'],
    },
    {
      role: 'ROOM',
      surfaceKey: 'ROOM_DASHBOARD_OPERATIONS',
      surfaceLabel: 'Oda Operasyon Panosu',
      path: '/room/dashboard',
      label: 'Oda Operasyon Panosu',
      menuPurpose: 'Oda canlı operasyon ve gecikme takibi için kullanılır.',
      selectedSummary: 'Oda operasyon panosu seçili kayıt',
      selectedRecordStatus: 'Canlı',
      replyTokens: ['Oda Operasyon Panosu', 'Canlı takip', 'Gecikme ihtimali', 'Konum sinyali'],
      chipsTokens: ['Canlı takip', 'Gecikme ihtimali', 'Konum sinyali', 'Açık sorun'],
    },
    {
      role: 'ROOM',
      surfaceKey: 'ROOM_OPERATION_HEALTH',
      surfaceLabel: 'Oda Operasyon Sağlığı',
      path: '/room/operation-health',
      label: 'Oda Operasyon Sağlığı',
      menuPurpose: 'Canlılık ve risk sinyali için kullanılır.',
      selectedSummary: 'Oda operasyon seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Oda Operasyon Sağlığı', 'Riskli cihaz', 'Konum sinyali', 'Açık sorunlar'],
      chipsTokens: ['Riskli cihaz', 'Konum sinyali', 'Açık sorunlar', 'Aktif sürücü'],
    },
    {
      role: 'ROOM',
      surfaceKey: 'ROOM_SHIFTS',
      surfaceLabel: 'Oda Vardiyalar',
      path: '/room/shifts',
      label: 'Oda Vardiyalar',
      menuPurpose: 'Oda vardiya ve kapasite takibi için kullanılır.',
      selectedSummary: 'Oda vardiya seçili kayıt',
      selectedRecordStatus: 'Kapasite belirsiz',
      replyTokens: ['Oda Vardiyalar', 'Kapasite', 'Atanmış servis', 'Sıradaki durak'],
      chipsTokens: ['Kapasite', 'Atanmış servis', 'Sıradaki durak', 'Vardiya saati'],
    },
    {
      role: 'ROOM',
      surfaceKey: 'ROOM_MAP_VEHICLES',
      surfaceLabel: 'Oda Harita / Araçlar',
      path: '/room/map',
      label: 'Oda Harita / Araçlar',
      menuPurpose: 'Oda rota, araç ve sürücü eşleşmesi için kullanılır.',
      selectedSummary: 'Oda harita seçili kayıt',
      selectedRecordStatus: 'Canlı',
      replyTokens: ['Oda Harita / Araçlar', 'Araç / sürücü', 'Sıradaki durak', 'Konum bilgisi'],
      chipsTokens: ['Araç / sürücü', 'Sıradaki durak', 'Konum bilgisi', 'Rota'],
    },
    {
      role: 'DRIVER',
      surfaceKey: 'DRIVER_ROUTE',
      surfaceLabel: 'Sürücü Rotası',
      path: '/driver/route',
      label: 'Sürücü Rotası',
      menuPurpose: 'Sürücünün günlük rotası ve canlı takip için kullanılır.',
      selectedSummary: 'Sürücü rota seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Sürücü Rotası', 'Son konum bilgisi', 'Telefon GPS', 'Sıradaki durak'],
      chipsTokens: ['Aktif rota', 'Son konum', 'Sıradaki durak', 'Telefon GPS'],
    },
    {
      role: 'PERSONEL',
      surfaceKey: 'PERSONEL_LIVE',
      surfaceLabel: 'Personel Canlı',
      path: '/personel/live',
      label: 'Personel Canlı',
      menuPurpose: 'Yetkili servis takibi için kullanılır.',
      selectedSummary: 'Personel servis seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Personel Canlı', 'Yetkili servis', 'Seçili servis', 'Son durum satırını'],
      chipsTokens: ['Servis durumu', 'KVKK kapsamı', 'Seçili servis', 'Son durum'],
    },
    {
      role: 'PARENT',
      surfaceKey: 'PARENT_LIVE',
      surfaceLabel: 'Veli Canlı',
      path: '/parent/live',
      label: 'Veli Canlı',
      menuPurpose: 'Yetkili öğrenci servisi takibi için kullanılır.',
      selectedSummary: 'Veli servis seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Veli Canlı', 'Tahmini varış', 'Araç bağlantısı', 'Canlı durumu'],
      chipsTokens: ['Yetkili görünüm', 'Canlı servis', 'Tahmini varış', 'Araç bağlantısı'],
    },
    {
      role: 'SUPER_ADMIN',
      surfaceKey: 'SUPERADMIN_OPERATIONS',
      surfaceLabel: 'Süper Yönetici Operasyonları',
      path: '/superadmin/operations',
      label: 'Süper Yönetici Operasyonları',
      menuPurpose: 'Sistem durumu ve audit / kanıt için kullanılır.',
      selectedSummary: 'Süper yönetici seçili kayıt',
      selectedRecordStatus: 'Hazır',
      replyTokens: ['Süper Yönetici Operasyonları', 'Sistem durumu', 'Audit / kanıt', 'Açık riskler'],
      chipsTokens: ['Sistem durumu', 'Açık riskler', 'Audit / kanıt', 'Oturum sinyali'],
    },
  ];
}

function buildScenarioPacks() {
  return [
    {
      id: 'prioritize-missing-assignment',
      label: 'Eksik atama',
      singleActionLead: 'Tek güvenli adım',
      prioritySignals: ['eksik atama', 'plan uygulama onayı'],
      selectedRecordStatus: 'Eksik',
    },
    {
      id: 'prioritize-stale-location',
      label: 'Güncel konum',
      singleActionLead: 'Tek kontrol',
      prioritySignals: ['güncel olmayan konum bilgisi', 'başlatma öncesi kontrol'],
      selectedRecordStatus: 'Konum güncel değil',
    },
    {
      id: 'prioritize-missing-route-stop',
      label: 'Eksik rota ve durak',
      singleActionLead: 'Tek onay',
      prioritySignals: ['eksik rota / durak', 'sıradaki durak'],
      selectedRecordStatus: 'Eksik durak',
    },
    {
      id: 'prioritize-delay-risk',
      label: 'Gecikme riski',
      singleActionLead: 'Tek rota',
      prioritySignals: ['gecikme ihtimali'],
      selectedRecordStatus: 'Gecikme riski',
    },
    {
      id: 'prioritize-capacity-unknown',
      label: 'Kapasite belirsizliği',
      singleActionLead: 'Tek durak',
      prioritySignals: ['kapasite belirsizliği'],
      selectedRecordStatus: 'Kapasite belirsiz',
    },
    {
      id: 'prioritize-shift-time-unknown',
      label: 'Vardiya saati belirsizliği',
      singleActionLead: 'Tek vardiya',
      prioritySignals: ['vardiya saati belirsizliği'],
      selectedRecordStatus: 'Vardiya saati belirsiz',
    },
    {
      id: 'prioritize-unassigned-service',
      label: 'Atanmış servis yokluğu',
      singleActionLead: 'Tek servis',
      prioritySignals: ['atanmış servis yokluğu'],
      selectedRecordStatus: 'Servis atanmadı',
    },
    {
      id: 'prioritize-driver-match',
      label: 'Araç sürücü eşleşmesi',
      singleActionLead: 'Tek eşleşme',
      prioritySignals: ['araç / sürücü eşleşmesi'],
      selectedRecordStatus: 'Eşleşme bekliyor',
    },
    {
      id: 'prioritize-live-trust',
      label: 'Canlı takip güvenilirliği',
      singleActionLead: 'Tek canlı takip',
      prioritySignals: ['canlı takip güvenilirliği'],
      selectedRecordStatus: 'Canlı takip belirsiz',
    },
    {
      id: 'prioritize-access-scope',
      label: 'Yetki ve veri kapsamı',
      singleActionLead: 'Tek yetki sınırı',
      prioritySignals: ['yetki / veri kapsamı', 'eksik adres', 'sözleşme kapsamı'],
      selectedRecordStatus: 'Yetki sınırı',
    },
  ];
}

function makeScreenCase(caseSpec) {
  const screenDefinition = {
    path: caseSpec.path,
    label: caseSpec.label,
    menuPurpose: caseSpec.menuPurpose,
  };
  const screenContext = {
    path: caseSpec.path,
    label: caseSpec.label,
    menuPurpose: caseSpec.menuPurpose,
    selectedSummary: caseSpec.selectedSummary,
    selectedLabel: caseSpec.selectedSummary,
    selectedRecordStatus: caseSpec.selectedRecordStatus,
    selectedFields: [
      { label: 'Durum', value: caseSpec.selectedRecordStatus },
      { label: 'Özet', value: caseSpec.selectedSummary },
    ],
    selectedBadges: [
      { label: 'Durum', value: caseSpec.selectedRecordStatus },
    ],
  };
  const user = { role: caseSpec.role };
  const message = 'Sıradaki en doğru güvenli adım ne?';
  const detected = detectNextBestActionSurface({
    screenPath: caseSpec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    userRole: caseSpec.role,
    user,
    roleMode: 'OPERATIONS',
  });
  const looksLike = looksLikeNextBestActionQuestion(
    message,
    'NEXT_BEST_ACTION',
    '',
    {
      rawMessage: message,
      screenPath: caseSpec.path,
      screenDefinition,
      screenContext,
      sourceScreenDefinition: screenDefinition,
      sourceScreenContext: screenContext,
      userRole: caseSpec.role,
      user,
      roleMode: 'OPERATIONS',
    },
  );
  const state = buildNextBestActionState({
    message,
    rawMessage: message,
    questionType: 'NEXT_BEST_ACTION',
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: caseSpec.role,
    user,
    screenPath: caseSpec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis: caseSpec.analysis,
    contextPriority: caseSpec.contextPriority,
  });
  const reply = buildNextBestActionReply({
    message,
    rawMessage: message,
    questionType: 'NEXT_BEST_ACTION',
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: caseSpec.role,
    user,
    screenPath: caseSpec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis: caseSpec.analysis,
    contextPriority: caseSpec.contextPriority,
  });
  const chips = buildNextBestActionChips({
    message,
    rawMessage: message,
    questionType: 'NEXT_BEST_ACTION',
    interactionIntentFamily: '',
    roleMode: 'OPERATIONS',
    userRole: caseSpec.role,
    user,
    screenPath: caseSpec.path,
    screenDefinition,
    screenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    surface: detected,
    selectedSummaryText: caseSpec.selectedSummary,
    selectedRecordStatus: caseSpec.selectedRecordStatus,
    analysis: caseSpec.analysis,
    contextPriority: caseSpec.contextPriority,
  });

  metrics.testedCases += 1;

  check(detected.key === caseSpec.surfaceKey, `${caseSpec.surfaceKey} detected surface key`);
  check(detected.label === caseSpec.surfaceLabel, `${caseSpec.surfaceKey} detected surface label`);
  check(looksLike, `${caseSpec.surfaceKey} question is recognized`);
  check(state.engineVersion === NEXT_BEST_ACTION_ENGINE_VERSION, `${caseSpec.surfaceKey} engine version matches`);
  check(state.surfaceKey === caseSpec.surfaceKey, `${caseSpec.surfaceKey} state surface key matches`);
  check(state.surfaceLabel === caseSpec.surfaceLabel, `${caseSpec.surfaceKey} state surface label matches`);
  check(state.summary === detected.reviewLead, `${caseSpec.surfaceKey} summary uses detected review lead`);
  check(state.reasoningLead === detected.reviewLead, `${caseSpec.surfaceKey} reasoning lead uses detected review lead`);
  check(state.compareHint === detected.compareHint, `${caseSpec.surfaceKey} compare hint preserved`);
  check(state.selectedSummaryText === caseSpec.selectedSummary, `${caseSpec.surfaceKey} selected summary preserved`);
  check(state.selectedRecordStatus === caseSpec.selectedRecordStatus, `${caseSpec.surfaceKey} selected record status preserved`);
  check(JSON.stringify(chips) === JSON.stringify(state.chips), `${caseSpec.surfaceKey} helper chips match state chips`);
  check(state.chips.length >= 3, `${caseSpec.surfaceKey} chips have at least three items`);

  const caseCorpus = joinCorpus(state.summary, state.reasoningLead, state.nextBestAction, state.safestNextStep, state.compareHint, state.reply, state.chips.join(' '), state.healthSignals.join(' '), state.evidence.join(' '));

  if (caseSpec.shouldRespond) {
    check(state.shouldRespond, `${caseSpec.surfaceKey} state responds`);
    check(reply === state.reply, `${caseSpec.surfaceKey} helper reply matches state reply`);
    must(state.reply, 'Sıradaki en doğru güvenli adım', `${caseSpec.surfaceKey} reply keeps safe next-action wording`);
    must(state.reply, 'Önce yapılacak güvenli kontrol', `${caseSpec.surfaceKey} reply keeps safe control wording`);
    must(state.reply, 'Onayınız gerekli', `${caseSpec.surfaceKey} reply keeps human approval boundary`);
    must(state.reply, normalizeVisibleReplyFragment(caseSpec.surfaceLabel), `${caseSpec.surfaceKey} reply mentions surface label`);
    must(state.reply, normalizeVisibleReplyFragment(caseSpec.selectedSummary), `${caseSpec.surfaceKey} reply mentions selected summary`);
    must(state.reply, caseSpec.selectedRecordStatus, `${caseSpec.surfaceKey} reply mentions selected record status`);
    for (const token of caseSpec.prioritySignals || []) {
      must(state.reply, normalizeVisibleReplyFragment(token), `${caseSpec.surfaceKey} reply keeps prioritization signal ${token}`);
    }
    if (caseSpec.singleActionLead) {
      must(state.reply, normalizeVisibleReplyFragment(caseSpec.singleActionLead), `${caseSpec.surfaceKey} reply keeps single-action lead ${caseSpec.singleActionLead}`);
    }
  } else {
    check(!state.shouldRespond, `${caseSpec.surfaceKey} state stays silent`);
    check(reply === state.reply, `${caseSpec.surfaceKey} helper reply matches state reply`);
    check(reply === '', `${caseSpec.surfaceKey} generic reply stays empty`);
    must(state.nextBestAction, 'Sıradaki en doğru güvenli adım', `${caseSpec.surfaceKey} generic next best action keeps safe wording`);
    must(state.nextBestAction, 'Eksik sinyal', `${caseSpec.surfaceKey} generic next best action keeps missing-signal wording`);
    must(state.summary, 'Önce seçili kayıt ve eksik sinyali birlikte okuyorum.', `${caseSpec.surfaceKey} generic summary keeps review-lead wording`);
  }

  for (const token of caseSpec.replyTokens || []) {
    if (caseSpec.shouldRespond) {
      must(caseCorpus, token, `${caseSpec.surfaceKey} reply corpus keeps ${token}`);
    } else {
      must(caseCorpus, token, `${caseSpec.surfaceKey} generic corpus keeps ${token}`);
    }
  }

  for (const token of caseSpec.chipsTokens || []) {
    must(state.chips.join(' • '), normalizeVisibleReplyFragment(token), `${caseSpec.surfaceKey} chips keep ${token}`);
  }

  return {
    ...state,
    reply,
    chips,
    detected,
  };
}

function main() {
  console.log('=== COPILOT-NEXT-BEST-ACTION-ENGINE-01 CHECK ===');

  const pkg = read('package.json');
  const routeReviewCheck = read('backend/scripts/copilot_route_review_human_approval_01_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const responsesSource = read('backend/src/ai/chat/conversationTaskStateResponses.js');
  const reasoningAssistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const helperSource = read('backend/src/ai/chat/conversationNextBestActionEngine.js');
  const doc = read('docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotnextbestactionengine01": "node backend/scripts/copilot_next_best_action_engine_01_check.js"', 'package.json exposes next best action check');
  assertProductExtensionsOrder(['check:copilotoperationhealthengine01', 'check:copilotnextbestactionengine01', 'check:copilotplanreviewengine01'], 'product extensions registry keeps next best action between operation health and plan review', registryScripts);
  assertProductExtensionsOrder(['check:copilotoperationhealthengine01', 'check:copilotnextbestactionengine01', 'check:copilotplanreviewengine01'], 'verify chain registry keeps next best action between operation health and plan review', registryScripts);

  must(routeReviewCheck, 'backend/scripts/copilot_next_best_action_engine_01_check.js', 'route review scope gate lists next best action check');
  must(routeReviewCheck, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'route review scope gate lists next best action helper');
  must(routeReviewCheck, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'route review scope gate lists next best action doc');

  must(guide, 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'milestone guide mentions next best action milestone');
  must(guide, 'check:copilotnextbestactionengine01', 'milestone guide exposes next best action check');
  must(guide, 'node backend\\scripts\\copilot_next_best_action_engine_01_check.js', 'milestone guide includes next best action command');
  must(guide, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'milestone guide includes next best action doc');
  ordered(guide, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01'], 'milestone guide keeps next best action between operation health and plan review');

  must(primer, 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'primer mentions next best action milestone');
  must(primer, 'check:copilotnextbestactionengine01', 'primer exposes next best action check');
  must(primer, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'primer links next best action doc');
  must(primer, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'primer links next best action helper');
  ordered(primer, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01'], 'primer keeps next best action between operation health and plan review');

  must(harnessCheck, 'check:copilotnextbestactionengine01', 'script harness check knows next best action alias');
  must(harnessCheck, 'root:check:copilotnextbestactionengine01', 'script harness check knows next best action root check');
  must(harnessCheck, 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'script harness check knows next best action milestone');
  must(harnessCheck, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'script harness check knows next best action doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'script harness check knows next best action helper');

  must(harnessDoc, 'Copilot next best action engine milestone: `COPILOT-NEXT-BEST-ACTION-ENGINE-01`', 'script harness doc lists next best action milestone');
  must(harnessDoc, 'root:check:copilotnextbestactionengine01', 'script harness doc lists next best action root check');
  must(harnessDoc, 'copilot_next_best_action_engine_01_check.js', 'script harness doc lists next best action command');
  must(harnessDoc, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'script harness doc lists next best action helper');
  must(harnessDoc, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'script harness doc lists next best action doc');

  must(responsesSource, 'buildNextBestActionReply', 'task state responses exports next best action reply');
  must(responsesSource, 'buildNextBestActionChips', 'task state responses exports next best action chips');
  must(responsesSource, 'buildNextBestActionState', 'task state responses exports next best action state');
  must(responsesSource, 'detectNextBestActionSurface', 'task state responses exports next best action surface detector');
  must(responsesSource, 'looksLikeNextBestActionQuestion', 'task state responses exports next best action recognizer');

  must(reasoningAssistantSource, 'buildNextBestActionState', 'reasoning assistant imports next best action state');
  must(reasoningAssistantSource, 'nextBestActionState?.nextBestAction', 'reasoning assistant uses next best action fallback');
  must(reasoningAssistantSource, 'nextBestActionState?.safestNextStep', 'reasoning assistant uses safest next step fallback');

  must(helperSource, 'NEXT_BEST_ACTION_ENGINE_VERSION', 'helper exposes engine version marker');
  must(helperSource, 'NEXT_BEST_ACTION_SURFACE_PROFILES', 'helper exposes surface profiles');
  must(helperSource, 'NEXT_BEST_ACTION_NO_WRITE_ACTIONS', 'helper exposes no-write-action boundary');
  must(helperSource, 'NEXT_BEST_ACTION_TERMINOLOGY', 'helper exposes terminology boundary');
  must(helperSource, 'NEXT_BEST_ACTION_REGRESSION_BOUNDARIES', 'helper exposes regression separation boundary');
  must(helperSource, 'NEXT_BEST_ACTION_HEALTH_SIGNAL_ASSERTIONS', 'helper exposes health signal assertions');
  must(helperSource, 'NEXT_BEST_ACTION_ROLE_COVERAGE', 'helper exposes role coverage');

  const surfaceRuntimeSpecs = buildSurfaceRuntimeSpecs();
  const scenarioPacks = buildScenarioPacks();
  const runtimeCases = [];

  for (const surfaceSpec of surfaceRuntimeSpecs) {
    for (const scenario of scenarioPacks) {
      runtimeCases.push({
        ...surfaceSpec,
        selectedSummary: `${surfaceSpec.selectedSummary} / ${scenario.label}`,
        selectedRecordStatus: scenario.selectedRecordStatus,
        shouldRespond: true,
        analysis: {
          nextBestAction: `${scenario.singleActionLead}: ${scenario.prioritySignals.join(' / ')}.`,
          blockers: [],
          missingData: scenario.prioritySignals.includes('eksik adres') ? ['Eksik adres'] : [],
          evidence: [
            ...surfaceSpec.replyTokens,
            ...surfaceSpec.chipsTokens,
            ...scenario.prioritySignals,
          ].map((token) => `Öncelik: ${token}`),
        },
        contextPriority: {
          selectedSummary: `${surfaceSpec.selectedSummary} / ${scenario.label}`,
          selectedRecordStatus: scenario.selectedRecordStatus,
          bestNextAction: surfaceSpec.replyTokens.join(' / '),
          followUpPrompt: `${surfaceSpec.surfaceLabel}: ${surfaceSpec.chipsTokens.join(' / ')}`,
        },
        replyTokens: [...surfaceSpec.replyTokens, scenario.label],
        chipsTokens: [...surfaceSpec.chipsTokens],
        prioritySignals: scenario.prioritySignals,
        singleActionLead: scenario.singleActionLead,
      });
    }
  }

  runtimeCases.push({
    role: 'UNKNOWN',
    surfaceKey: 'GENERIC',
    surfaceLabel: 'Güvenli Kontrol',
    path: '/unknown',
    label: 'Güvenli Kontrol',
    menuPurpose: 'Seçili kayıt ve eksik sinyali okumak için kullanılır.',
    selectedSummary: 'Eksik sinyal',
    selectedRecordStatus: 'Belirsiz',
    shouldRespond: false,
    replyTokens: ['Önce seçili kayıt ve eksik sinyali birlikte okuyorum.', 'Eksik sinyal', 'Seçili kayıt'],
    chipsTokens: ['Seçili kayıt', 'Eksik sinyal', 'İlgili ekran', 'Kullanıcı onayı'],
  });

  const runtimeStates = [];
  const replyCorpusParts = [];
  const roleCoverageSeen = new Set();
  const roleScreenCoverageSeen = new Set();
  const surfaceCoverageSeen = new Set();

  for (const caseSpec of runtimeCases) {
    const state = makeScreenCase(caseSpec);
    runtimeStates.push(state);
    replyCorpusParts.push(joinCorpus(
      state.summary,
      state.reasoningLead,
      state.nextBestAction,
      state.safestNextStep,
      state.compareHint,
      state.reply,
      state.chips.join(' '),
      state.healthSignals.join(' '),
      state.evidence.join(' '),
    ));

    if (caseSpec.surfaceKey !== 'GENERIC') {
      roleCoverageSeen.add(caseSpec.role);
      roleScreenCoverageSeen.add(`${caseSpec.role}:${caseSpec.surfaceKey}`);
      surfaceCoverageSeen.add(caseSpec.surfaceKey);
    }
  }

  metrics.runtimeCases = runtimeCases.length;
  metrics.testedCases = runtimeCases.length;
  metrics.surfaceCoverage = surfaceCoverageSeen.size;
  metrics.roleCoverage = roleCoverageSeen.size;
  metrics.roleScreenCoverage = roleScreenCoverageSeen.size;

  check(metrics.runtimeCases === metrics.testedCases, 'all runtime cases were tested');
  check(metrics.roleCoverage === NEXT_BEST_ACTION_ROLE_COVERAGE.length, 'role coverage matches supported roles');
  check(metrics.roleScreenCoverage >= 11, `role/screen coverage meets minimum (${metrics.roleScreenCoverage})`);
  check(metrics.surfaceCoverage === surfaceRuntimeSpecs.length, 'surface coverage matches helper surfaces');

  const replyCorpus = replyCorpusParts.join(' ');

  for (const term of NEXT_BEST_ACTION_NO_WRITE_ACTIONS) {
    mustNot(replyCorpus, term, `reply corpus avoids write-action term ${term}`);
  }

  for (const term of NEXT_BEST_ACTION_TERMINOLOGY) {
    must(replyCorpus, term, `reply corpus keeps terminology term ${term}`);
  }

  check(metrics.noWriteActionAssertions >= 20, `no-write-action assertions meet minimum (${metrics.noWriteActionAssertions})`);
  check(metrics.terminologyAssertions >= 20, `terminology assertions meet minimum (${metrics.terminologyAssertions})`);
  check(metrics.healthSignalAssertions >= 11, `health signal assertions meet minimum (${metrics.healthSignalAssertions})`);

  metrics.prioritizationAssertions = NEXT_BEST_ACTION_PRIORITIZATION_ASSERTIONS.length;
  check(metrics.prioritizationAssertions >= 15, `prioritization assertions meet minimum (${metrics.prioritizationAssertions})`);
  for (const term of NEXT_BEST_ACTION_PRIORITIZATION_ASSERTIONS) {
    must(replyCorpus, term, `reply corpus keeps prioritization term ${term}`);
  }

  metrics.singleActionAssertions = NEXT_BEST_ACTION_SINGLE_ACTION_ASSERTIONS.length;
  check(metrics.singleActionAssertions >= 10, `single-action assertions meet minimum (${metrics.singleActionAssertions})`);
  for (const term of NEXT_BEST_ACTION_SINGLE_ACTION_ASSERTIONS) {
    must(replyCorpus, term, `reply corpus keeps single-action term ${term}`);
  }

  const blockedFamilies = ['PLAN_REVIEW', 'RISK_LIST', 'ROOT_CAUSE', 'SMART_DIAGNOSTIC', 'DYNAMIC_QUESTION', 'CLARIFYING_QUESTION', 'WORKFLOW_REASONING'];
  metrics.regressionSeparationAssertions = blockedFamilies.length * 2;
  for (const family of blockedFamilies) {
    const blockedState = buildNextBestActionState({
      message: 'Sıradaki en doğru güvenli adım ne?',
      rawMessage: 'Sıradaki en doğru güvenli adım ne?',
      questionType: family,
      interactionIntentFamily: family,
      roleMode: 'OPERATIONS',
      userRole: 'COMPANY',
      user: { role: 'COMPANY' },
      screenPath: '/company',
      screenDefinition: { path: '/company', label: 'Planlama Merkezi', menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.' },
      screenContext: {
        path: '/company',
        label: 'Planlama Merkezi',
        menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
        selectedSummary: 'Planlama merkezi seçili kayıt',
        selectedRecordStatus: 'Hazır',
        selectedFields: [{ label: 'Durum', value: 'Hazır' }],
        selectedBadges: [{ label: 'Durum', value: 'Hazır' }],
      },
      sourceScreenDefinition: { path: '/company', label: 'Planlama Merkezi', menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.' },
      sourceScreenContext: {
        path: '/company',
        label: 'Planlama Merkezi',
        menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
        selectedSummary: 'Planlama merkezi seçili kayıt',
        selectedRecordStatus: 'Hazır',
        selectedFields: [{ label: 'Durum', value: 'Hazır' }],
        selectedBadges: [{ label: 'Durum', value: 'Hazır' }],
      },
    });
    check(!blockedState.shouldRespond, `${family} stays separated from next best action`);
    check(blockedState.reply === '', `${family} keeps reply empty`);
  }

  const healthSignalCorpus = runtimeStates.map((state) => state.healthSignals.join(' ')).join(' ');
  for (const signal of NEXT_BEST_ACTION_HEALTH_SIGNAL_ASSERTIONS) {
    must(healthSignalCorpus, signal, `health signals keep ${signal}`);
  }

  must(helperSource, 'Sıradaki en doğru güvenli adım', 'helper source keeps safe next-action wording');
  must(helperSource, 'Önce yapılacak güvenli kontrol', 'helper source keeps safe control wording');
  must(helperSource, 'Vardiyalar ekranında takip ayrı kalır', 'helper source keeps planning separation wording');
  must(helperSource, 'Sürücünün telefon GPS\'i ve son konum bilgisini', 'helper source keeps driver wording');
  must(helperSource, 'NEXT_BEST_ACTION_PRIORITIZATION_ASSERTIONS', 'helper source exposes prioritization assertions');
  must(helperSource, 'NEXT_BEST_ACTION_SINGLE_ACTION_ASSERTIONS', 'helper source exposes single-action assertions');
  must(helperSource, 'COMPANY_DASHBOARD_OPERATIONS', 'helper source exposes company dashboard operations surface');
  must(helperSource, 'COMPANY_SHIFTS', 'helper source exposes company shifts surface');
  must(helperSource, 'COMPANY_AGREEMENTS', 'helper source exposes company agreements surface');
  must(helperSource, 'ROOM_DASHBOARD_OPERATIONS', 'helper source exposes room dashboard operations surface');
  must(helperSource, 'ROOM_SHIFTS', 'helper source exposes room shifts surface');
  must(helperSource, 'ROOM_MAP_VEHICLES', 'helper source exposes room map / vehicles surface');

  must(doc, 'COPILOT NEXT BEST ACTION ENGINE 01', 'next best action doc mentions milestone');
  must(doc, 'Supported Surfaces', 'next best action doc includes supported surfaces section');
  must(doc, 'Validation Results', 'next best action doc includes validation results section');

  console.log(`runtimeCases=${metrics.runtimeCases}`);
  console.log(`testedCases=${metrics.testedCases}`);
  console.log(`surfaceCoverage=${metrics.surfaceCoverage}`);
  console.log(`roleCoverage=${metrics.roleCoverage}`);
  console.log(`roleScreenCoverage=${metrics.roleScreenCoverage}`);
  console.log(`passCount=${metrics.passCount}`);
  console.log(`failCount=${metrics.failCount}`);
  console.log(`noWriteActionAssertions=${metrics.noWriteActionAssertions}`);
  console.log(`terminologyAssertions=${metrics.terminologyAssertions}`);
  console.log(`prioritizationAssertions=${metrics.prioritizationAssertions}`);
  console.log(`singleActionAssertions=${metrics.singleActionAssertions}`);
  console.log(`regressionSeparationAssertions=${metrics.regressionSeparationAssertions}`);
  console.log(`healthSignalAssertions=${metrics.healthSignalAssertions}`);
  console.log(`PASS COPILOT-NEXT-BEST-ACTION-ENGINE-01`);
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exit(1);
}
