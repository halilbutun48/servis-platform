#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import {
  COPILOT_RISK_SCORING_ENGINE_VERSION,
  buildRiskScoringChips,
  buildRiskScoringReply,
  buildRiskScoringState,
  looksLikeRiskScoringQuestion,
} from '../src/ai/chat/conversationRiskScoringEngine.js';
import {
  buildRiskScoringChips as buildRiskScoringChipsFacade,
  buildRiskScoringReply as buildRiskScoringReplyFacade,
  buildRiskScoringState as buildRiskScoringStateFacade,
} from '../src/ai/chat/conversationTaskStateResponses.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';

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
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(condition, label) {
  if (condition) {
    ok(label);
    return;
  }
  fail(label);
}

function sameText(actual, expected) {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return normalize(Array.isArray(actual) ? actual.join(' | ') : actual) === normalize(Array.isArray(expected) ? expected.join(' | ') : expected);
  }
  return normalize(actual) === normalize(expected);
}

function mustEqual(actual, expected, label) {
  if (sameText(actual, expected)) {
    ok(label);
    return;
  }
  fail(`${label} expected=${Array.isArray(expected) ? expected.join(' / ') : String(expected || '')} actual=${excerpt(actual)}`);
}

function contains(haystack, needle) {
  if (Array.isArray(haystack)) {
    return normalize(haystack.join(' | ')).includes(normalize(needle));
  }
  return normalize(haystack).includes(normalize(needle));
}

function mustInclude(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  for (const needle of list) {
    must(contains(text, needle), `${label} missing=${needle}`);
  }
}

function mustNotInclude(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  for (const needle of list) {
    must(!contains(text, needle), `${label} unexpected=${needle}`);
  }
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

function buildRiskOptions(surface, message) {
  const fixture = resolveSurfaceFixture(surface);
  return {
    message,
    currentReply: '',
    questionType: 'RISK_LIST',
    screenPath: fixture.screenContext.path,
    screenDefinition: fixture.screenDefinition,
    screenContext: fixture.screenContext,
    sourceScreenDefinition: fixture.screenDefinition,
    sourceScreenContext: fixture.screenContext,
    conversationState: null,
    contextPriority: null,
    analysis: null,
    roleMode: 'OPERATIONS',
    userRole: surface.role,
    user: makeUser(surface.role),
    guidedTaskMeta: null,
    context: null,
    entityType: 'screen',
  };
}

function buildAssistantResponse(surface, message, directReply) {
  const fixture = resolveSurfaceFixture(surface);
  return buildSeferAbiReasoningAssistant({
    rawReply: directReply,
    message,
    questionType: 'RISK_LIST',
    replyMode: 'SHORT',
    guide: {
      plainSummary: fixture.screenDefinition.menuPurpose || '',
      summary: fixture.screenDefinition.menuPurpose || '',
      screenExplanation: fixture.screenDefinition.menuPurpose || '',
      whatToDoNow: fixture.screenDefinition.firstStep || 'İlk kontrolü aç.',
      whatToDoNext: fixture.screenDefinition.nextStep || 'Sonraki adımı aç.',
      whyBlocked: '',
      doNotDo: '',
    },
    roleMode: 'OPERATIONS',
    userRole: surface.role,
    user: makeUser(surface.role),
    screenPath: fixture.screenContext.path || '',
    screenDefinition: fixture.screenDefinition,
    screenContext: fixture.screenContext,
    sourceScreenDefinition: fixture.screenDefinition,
    sourceScreenContext: fixture.screenContext,
    analysis: {
      reasoningLead: fixture.screenDefinition.menuPurpose || '',
      nextBestAction: fixture.screenDefinition.nextStep || '',
      safestNextStep: fixture.screenDefinition.nextStep || '',
      selectedRecordStatus: fixture.screenContext.selectedRecordStatus || '',
      compareHint: '',
      blockers: [],
      missingData: [],
      evidence: [],
    },
    contextPriority: {
      summaryLead: fixture.screenDefinition.menuPurpose || '',
      bestNextAction: fixture.screenDefinition.nextStep || '',
      selectedRecordMismatchLead: '',
      evidenceConfidence: '',
      roleBoundary: '',
      needsSelection: false,
      sameRecordLikely: false,
      activeTopic: 'RISK_LIST',
      activeTopicLabel: fixture.screenContext.label || '',
      followUpPrompt: '',
    },
    conversationState: null,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
}

function resolveSurfaceFixture(surface) {
  if (surface?.fixture?.screenDefinition && surface?.fixture?.screenContext) {
    return surface.fixture;
  }
  return makeSurfaceFixture({
    path: surface?.path || '',
    label: surface?.label || '',
    menuPurpose: surface?.menuPurpose || '',
    firstStep: surface?.firstStep || '',
    nextStep: surface?.nextStep || '',
    selectedLabel: surface?.selectedLabel || '',
    selectedSummary: surface?.selectedSummary || '',
    selectedRecordStatus: surface?.selectedRecordStatus || '',
    selectedEntityType: surface?.selectedEntityType || 'record',
    selectedEntityId: surface?.selectedEntityId || 1,
  });
}

function runCase(testCase) {
  try {
    const fixture = resolveSurfaceFixture(testCase.surface);
    const intent = detectQuestionIntent(testCase.message, {
      originalMessage: testCase.message,
      screenPath: fixture.screenContext.path || '',
      userRole: testCase.surface.role,
      roleMode: 'OPERATIONS',
      entityType: 'screen',
    });
    must(looksLikeRiskScoringQuestion(testCase.message), `${testCase.label} detects risk question`);
    mustEqual(intent?.questionType || '', 'RISK_LIST', `${testCase.label} intent question type`);

    const options = buildRiskOptions(testCase.surface, testCase.message);
    const directReply = buildRiskScoringReply(options);
    const facadeReply = buildRiskScoringReplyFacade(options);
    const chips = buildRiskScoringChips();
    const facadeChips = buildRiskScoringChipsFacade();
    const state = buildRiskScoringState(options);
    const facadeState = buildRiskScoringStateFacade(options);
    const assistant = buildAssistantResponse(testCase.surface, testCase.message, directReply);

    mustEqual(facadeReply, directReply, `${testCase.label} facade reply mirrors helper`);
    mustInclude(directReply, testCase.replyNeedles, `${testCase.label} direct reply`);
    mustInclude(facadeReply, testCase.replyNeedles, `${testCase.label} facade reply`);
    mustEqual(state.version, COPILOT_RISK_SCORING_ENGINE_VERSION, `${testCase.label} state version`);
    mustEqual(state.theme || '', testCase.surface.theme, `${testCase.label} state theme`);
    mustEqual(state.surfaceKey || '', testCase.surface.theme, `${testCase.label} state surface key`);
    mustEqual(state.questionType || '', 'RISK_LIST', `${testCase.label} state question type`);
    mustEqual(state.screenPath || '', fixture.screenContext.path || '', `${testCase.label} state screen path`);
    mustEqual(state.screenLabel || '', fixture.screenContext.label || '', `${testCase.label} state screen label`);
    mustEqual(state.reply || '', directReply, `${testCase.label} state reply mirrors helper`);
    mustEqual(state.isRiskScoring, true, `${testCase.label} state marks risk scoring`);
    mustEqual(JSON.stringify(state.chips || []), JSON.stringify(chips), `${testCase.label} state chips`);
    mustEqual(JSON.stringify(facadeChips || []), JSON.stringify(chips), `${testCase.label} facade chips`);
    mustEqual(facadeState.version, COPILOT_RISK_SCORING_ENGINE_VERSION, `${testCase.label} facade state version`);
    mustEqual(facadeState.theme || '', testCase.surface.theme, `${testCase.label} facade state theme`);
    mustEqual(facadeState.surfaceKey || '', testCase.surface.theme, `${testCase.label} facade state surface key`);
    mustEqual(facadeState.reply || '', directReply, `${testCase.label} facade state reply`);
    mustEqual(JSON.stringify(facadeState.chips || []), JSON.stringify(chips), `${testCase.label} facade state chips`);
    mustEqual(assistant?.questionType || '', 'RISK_LIST', `${testCase.label} assistant question type`);
    mustEqual(assistant?.riskScoringState?.version || '', COPILOT_RISK_SCORING_ENGINE_VERSION, `${testCase.label} assistant version`);
    mustEqual(assistant?.riskScoringState?.theme || '', testCase.surface.theme, `${testCase.label} assistant theme`);
    mustEqual(assistant?.riskScoringState?.surfaceKey || '', testCase.surface.theme, `${testCase.label} assistant surface key`);
    mustEqual(assistant?.riskScoringState?.reply || '', directReply, `${testCase.label} assistant reply`);
    mustEqual(assistant?.riskScoringState?.isRiskScoring, true, `${testCase.label} assistant marks risk scoring`);
    mustEqual(JSON.stringify(assistant?.riskScoringState?.chips || []), JSON.stringify(chips), `${testCase.label} assistant chips`);
    mustNotInclude([directReply, assistant?.riskScoringState?.reply || ''].join(' '), ['write-action', 'runtime ai action', 'db write', 'tool execution', 'fake success'], `${testCase.label} keeps forbidden wording out`);

    passCount += 1;
    console.log(`PASS ${testCase.label}`);
  } catch (error) {
    failCount += 1;
    console.error(`FAIL ${testCase.label}: ${error?.message || String(error)}`);
  }
}

function buildCases() {
  const genericMessages = [
    'Riskleri sırala',
    'Risk var mı',
    'Riskli mi',
    'Risk listesi',
    'Başlıca riskler',
    'En büyük riskler',
    'Hangi konu acil',
  ];

  const surfaces = [
    {
      theme: 'COMPANY_PLANNING',
      role: 'COMPANY',
      path: '/company/planning-center',
      label: 'Planlama Merkezi',
      menuPurpose: 'Planlama Merkezi yeni plan oluşturma ve rota önizleme için kullanılır.',
      firstStep: 'Plan satırını aç.',
      nextStep: 'Rota ve personel durumunu kontrol et.',
      genericNeedles: ['Başlıca riskler yüksek görünüyor', 'hizmet alan firma konumunun eksik olması', 'durak / rota önizlemesinde sapma'],
      special: {
        message: 'Risk var mı? kapasite durumu',
        replyNeedles: ['Planlama Merkezi için yüksek risk kişi sayısının araç kapasitesine yaklaşmasıdır', 'kişi sayısı, araç kapasitesi ve rota önizlemesini kontrol edelim.'],
      },
    },
    {
      theme: 'COMPANY_SHIFTS',
      role: 'COMPANY',
      path: '/company/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiya akışını izlemek için kullanılır.',
      firstStep: 'Bugünkü vardiyayı aç.',
      nextStep: 'Sonraki adımı kontrol et.',
      genericNeedles: ['Vardiyalar açısından başlıca riskler yüksek görünüyor', 'tarih / saat uyumsuzluğu', 'vardiya kaydını, durumunu ve ilgili planlama verisini kontrol edelim.'],
      special: {
        message: 'Risk var mı? personel eksikliği',
        replyNeedles: ['Vardiyalar açısından personel riski yüksekse', 'vardiya kaydını, personel listesini ve atama durumunu kontrol edelim.'],
      },
    },
    {
      theme: 'COMPANY_OPERATIONS',
      role: 'COMPANY',
      path: '/company/operations',
      label: 'Hizmet Alan Firma Operasyon',
      menuPurpose: 'Canlı operasyon ve vardiya izleme için kullanılır.',
      firstStep: 'Aktif vardiyayı aç.',
      nextStep: 'Son GPS ve araç atamasını kontrol et.',
      genericNeedles: ['operasyon riskini değerlendirirken aktif servis, konum sinyali ve kayıt kapsamı birlikte okunur', 'konum sinyali verisinin gelmemesidir', 'aktif vardiya ve Son konum bilgisi sinyalini kontrol edelim.'],
      special: {
        message: 'Risk var mı? aktif servis görünmüyor',
        replyNeedles: ['yüksek risk aktif servis görünmemesi veya konum sinyali verisinin gelmemesidir', 'aktif vardiya ve Son konum bilgisi sinyalini kontrol edelim.'],
      },
    },
    {
      theme: 'OFFERS',
      role: 'COMPANY',
      path: '/company/agreements',
      label: 'Teklifler',
      menuPurpose: 'Teklifleri fiyat, süre, risk ve sözleşme uygunluğu açısından karşılaştırır.',
      firstStep: 'Teklifleri incele.',
      nextStep: 'Teklifleri karşılaştır.',
      genericNeedles: ['teklif riskini değerlendirirken fiyat sapması, kapasite ve güzergâh uygunluğu birlikte okunur', 'fiyat sapması', 'fiyat, kapasite ve güzergâh uygunluğunu karşılaştıralım.'],
      special: {
        message: 'Risk var mı? fiyat sapması',
        replyNeedles: ['yüksek risk fiyat sapmasıdır', 'fiyat, kapasite ve güzergâh uygunluğunu karşılaştıralım.'],
      },
    },
    {
      theme: 'ROOM_SHIFTS',
      role: 'ROOM',
      path: '/room/shifts',
      label: 'Vardiyalar',
      menuPurpose: 'Vardiyalar ekranı mevcut vardiya ve operasyon akışını takip eder.',
      firstStep: 'Vardiya satırını aç.',
      nextStep: 'Araç ve sürücüyü kontrol et.',
      genericNeedles: ['Taşımacılık Firması açısından başlıca riskler yüksek görünüyor', 'vardiya onaylı ama canlı başlatılmamış olabilir', 'Riskli alanı belirle.'],
      special: {
        message: 'Risk var mı? başlatma',
      replyNeedles: ['Taşımacılık Firması açısından başlatma riski araç-sürücü ataması veya konum sinyali hazırlığı eksikse yükselir', 'Riskli alanı belirle.'],
      },
    },
    {
      theme: 'ROOM_VEHICLES',
      role: 'ROOM',
      path: '/room/vehicles',
      label: 'Araçlar',
      menuPurpose: 'Araç ve sürücü uygunluğu ile GPS durumunu gösterir.',
      firstStep: 'Araç satırını aç.',
      nextStep: 'Sürücü ve GPS durumunu kontrol et.',
      genericNeedles: ['araç riski, araç pasif ya da görünmezse', 'Kritik olan önce araç-sürücü eşleşmesi ve konum sinyali durumudur', 'aktiflik ve Son konum bilgisi durumunu kontrol edelim.'],
      special: {
        message: 'Risk var mı? sürücü eşleşmesi',
        replyNeedles: ['araç riski, sürücü eşleşmesi yoksa veya konum sinyali göndermiyorsa yükselir', 'aktiflik ve Son konum bilgisi durumunu kontrol edelim.'],
      },
    },
    {
      theme: 'DRIVER_ROUTE',
      role: 'DRIVER',
      path: '/driver/route',
      label: 'Sürücü Rotası',
      menuPurpose: 'Günlük rota ve check-in akışını gösterir.',
      firstStep: 'Aktif vardiyayı aç.',
      nextStep: 'Durak listesini ve GPS doğrulamasını kontrol et.',
      genericNeedles: ['yüksek risk aktif vardiya / rota görünmüyorsa veya durak listesi hazır değilse oluşur', 'Orta risk konum sinyali / konum doğrulamasının eksik olmasıdır.', 'Otomatik işlem yapmadan önce aktif vardiya ve durak listesini kontrol edelim.'],
      special: {
        message: 'Risk var mı? check-in',
        replyNeedles: ['check-in riski yanlış durak, uygunsuz zaman veya konum sinyali doğrulaması eksikse yükselir', 'doğru durak ve konum sinyalini kontrol etmek gerekir.'],
      },
    },
    {
      theme: 'PERSONEL_LIVE',
      role: 'PERSONEL',
      path: '/personel/live',
      label: 'Personel Canlı',
      menuPurpose: 'Personel canlı ekranı servis durumu ve canlı takip sinyallerini gösterir.',
      firstStep: 'Servis durumunu aç.',
      nextStep: 'Biniş ve saat bilgisini kontrol et.',
      genericNeedles: ['Personel Canlı için yüksek risk servis görünmüyorsa veya araç konum sinyali göndermiyorsa oluşur', 'Servis durumunu aç.', 'atanmış vardiya ve araç konumunu kontrol edelim.'],
      special: {
        message: 'Risk var mı? gecikme',
        replyNeedles: ['Personel Canlı için gecikme riski araç konumu gelmiyorsa, servis saati yaklaştıysa veya sıradaki durak bilgisi eksikse artar', 'Servis durumunu aç.'],
      },
    },
    {
      theme: 'PARENT_LIVE',
      role: 'PARENT',
      path: '/parent/live',
      label: 'Veli Canlı',
      menuPurpose: 'Veli canlı ekranı çocuğun servis konumu ve geliş saatini gösterir.',
      firstStep: 'Servis durumunu aç.',
      nextStep: 'Konum ve saat bilgisini kontrol et.',
      genericNeedles: ['çocuk için risk seviyesi servis saatine, araç konumuna ve atanmış vardiyaya bağlıdır', 'Yüksek risk araç konumu görünmüyorsa veya servis saati geçmişse oluşur.', 'servis saati, araç konumu ve atanmış vardiyayı kontrol edelim.'],
      special: {
        message: 'Risk var mı? gelmedi',
        replyNeedles: ['çocuk için risk seviyesi servis saatine, araç konumuna ve atanmış vardiyaya bağlıdır', 'Araç konumu yoksa veya saat geçmişse risk daha yüksek görünür.'],
      },
    },
    {
      theme: 'SUPERADMIN',
      role: 'SUPER_ADMIN',
      path: '/superadmin',
      label: 'Genel Bakış',
      menuPurpose: 'Sistem özet ve denetim alanı.',
      firstStep: 'İlk kartı aç.',
      nextStep: 'Sonraki kartı aç.',
      genericNeedles: ['hizmet alan firma riskini değerlendirirken kayıt durumu, yetki kapsamı ve operasyon / ödeme / kalite sinyallerine bakmak gerekir', 'en kritik risk boş veya eksik veri nedeniyle yanlış operasyon kararı verilmesidir', 'kayıt ve kapsam bilgisini kontrol edelim.'],
      special: {
        message: 'Risk var mı? yetki',
        replyNeedles: ['yetki riski varsa rol kapsamı ve görünür kayıtları doğrulamadan kesin hüküm vermeyelim', 'rol, filtre ve kayıt kapsamını kontrol edelim.'],
      },
    },
    {
      theme: 'GENERIC',
      role: 'SUPER_ADMIN',
      path: '/general/overview',
      label: 'Genel Bakış',
      menuPurpose: 'Sistem özet ve denetim alanı.',
      firstStep: 'İlk kartı aç.',
      nextStep: 'Sonraki kartı aç.',
      genericNeedles: ['riskler bağlama göre değişir', 'Yüksek risk seçili kayıt, konum veya zaman verisi eksikse yanlış karar kolaylaşır', 'eksik kayıt ve son sinyali kontrol edelim.'],
      special: {
        message: 'Risk var mı? seçili kayıt',
        replyNeedles: ['riskler bağlama göre değişir', 'eksik kayıt ve son sinyali kontrol edelim.'],
      },
    },
  ];

  const cases = [];
  for (const surface of surfaces) {
    for (const message of genericMessages) {
      cases.push({
        label: `${surface.theme.toLowerCase()}-${normalize(message).replace(/\s+/g, '-')}`,
        surface,
        message,
        replyNeedles: surface.genericNeedles,
      });
    }
    cases.push({
      label: `${surface.theme.toLowerCase()}-special`,
      surface,
      message: surface.special.message,
      replyNeedles: surface.special.replyNeedles,
    });
  }
  return cases;
}

function main() {
  console.log('=== COPILOT RISK SCORING ENGINE 01 ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const riskDoc = read('docs/COPILOT_RISK_SCORING_ENGINE_01.md');
  const helperSource = read('backend/src/ai/chat/conversationRiskScoringEngine.js');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const assistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const intentRouterCoreSource = read('backend/src/ai/chat/intentRouterCore.js');
  const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
  const facadeSource = read('backend/src/ai/chat/conversationTaskStateResponses.js');

  must(pkg, '"check:copilotriskscoringengine01": "node backend/scripts/copilot_risk_scoring_engine_01_check.js"', 'package.json exposes check:copilotriskscoringengine01');
  must(runner, 'check:copilotriskscoringengine01', 'product extensions runner includes risk scoring engine check');
  must(verifyChain, 'check:copilotriskscoringengine01', 'verify chain includes risk scoring engine check');
  must(verifyChain, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'verify chain includes risk scoring engine doc');
  must(guide, 'COPILOT-RISK-SCORING-ENGINE-01', 'script guide mentions risk scoring engine milestone');
  must(guide, 'check:copilotriskscoringengine01', 'script guide exposes risk scoring engine check');
  must(guide, 'node backend\\scripts\\copilot_risk_scoring_engine_01_check.js', 'script guide includes risk scoring engine command');
  must(guide, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'script guide includes risk scoring engine doc');
  must(primer, 'COPILOT-RISK-SCORING-ENGINE-01', 'primer mentions risk scoring engine milestone');
  must(primer, 'check:copilotriskscoringengine01', 'primer exposes risk scoring engine check');
  must(primer, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'primer links risk scoring engine doc');
  must(primer, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'primer links risk scoring engine helper');
  must(harnessDoc, 'Copilot risk scoring engine milestone: `COPILOT-RISK-SCORING-ENGINE-01`', 'script harness doc lists risk scoring engine milestone');
  must(harnessDoc, 'root:check:copilotriskscoringengine01', 'script harness doc lists risk scoring engine root check');
  must(harnessDoc, 'copilot_risk_scoring_engine_01_check.js', 'script harness doc lists risk scoring engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'script harness doc lists risk scoring engine helper');
  must(harnessCheck, 'check:copilotriskscoringengine01', 'script harness check knows risk scoring engine alias');
  must(harnessCheck, 'root:check:copilotriskscoringengine01', 'script harness check knows risk scoring engine root check');
  must(harnessCheck, 'COPILOT-RISK-SCORING-ENGINE-01', 'script harness check knows risk scoring engine milestone');
  must(harnessCheck, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'script harness check knows risk scoring engine doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'script harness check knows risk scoring engine helper');
  must(riskDoc, '# COPILOT RISK SCORING ENGINE 01', 'risk scoring doc title present');
  must(riskDoc, 'Canonical check: `check:copilotriskscoringengine01`', 'risk scoring doc keeps canonical check wording');
  must(riskDoc, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'risk scoring doc mentions canonical helper');
  must(riskDoc, 'helpComposer.js', 'risk scoring doc mentions help composer');
  must(riskDoc, 'seferAbiReasoningAssistant.js', 'risk scoring doc mentions reasoning assistant');
  must(riskDoc, 'answerQualityPolicy.js', 'risk scoring doc mentions answer quality policy');
  must(helperSource, 'COMPANY_SHIFTS', 'risk scoring helper includes company shifts surface');
  must(helperSource, 'buildRiskScoringReply', 'risk scoring helper exports reply builder');
  must(helperSource, 'buildRiskScoringState', 'risk scoring helper exports state builder');
  must(helperSource, 'looksLikeRiskScoringQuestion', 'risk scoring helper exports question detector');
  must(helpComposerSource, 'buildRiskScoringReply', 'help composer imports risk scoring helper');
  must(helpComposerSource, "if (questionType === 'RISK_LIST')", 'help composer routes RISK_LIST to risk scoring');
  must(helpComposerSource, 'RISK_LIST', 'help composer keeps risk list question type');
  must(assistantSource, 'buildRiskScoringState', 'reasoning assistant imports risk scoring helper');
  must(assistantSource, 'riskScoringState', 'reasoning assistant stores risk scoring state');
  must(assistantSource, 'riskScoringChips', 'reasoning assistant stores risk scoring chips');
  must(assistantSource, 'riskScoringReply', 'reasoning assistant stores risk scoring reply');
  must(intentRouterCoreSource, 'RISK_LIST', 'intent router core knows risk list question type');
  must(intentRouterCoreSource, 'risk var mı', 'intent router core includes risk question signal');
  must(intentRouterCoreSource, 'hangi konu acil', 'intent router core includes urgency signal');
  must(intentRouterSource, 'buildRiskScoringChips', 'intent router imports risk scoring chips');
  must(intentRouterSource, "if (String(questionType || '') === 'RISK_LIST')", 'intent router keeps RISK_LIST chip path');
  must(facadeSource, 'buildRiskScoringReply', 'task-state facade exports risk scoring reply');
  must(facadeSource, 'buildRiskScoringState', 'task-state facade exports risk scoring state');
  must(facadeSource, 'buildRiskScoringChips', 'task-state facade exports risk scoring chips');

  const cases = buildCases();
  for (const testCase of cases) {
    runCase(testCase);
  }

  const runtimeCases = passCount + failCount;
  const testedCases = runtimeCases;
  console.log(`runtimeCases=${runtimeCases}`);
  console.log(`testedCases=${testedCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log('PASS COPILOT-RISK-SCORING-ENGINE-01');
}

main();
