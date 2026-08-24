#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { normalizeCopilotRequestInput } from '../src/ai/schemas.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { mustDiffEmptyOrExactlyWithIdentity } from './lib/guardGitScope.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const CURRENT_HEAD_APPROVED_CONCURRENT_SERVICE_DIFF = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) => path.startsWith('backend/src/services/'));

const ROLE_SPECS = [
  {
    role: 'COMPANY',
    paths: [
      '/company',
      '/company/operations',
      '/company/shifts',
      '/company/agreements',
      '/company/access-links',
      '/company/map',
      '/company/commercial-flow',
      '/company/georeview',
    ],
  },
  {
    role: 'ROOM',
    paths: [
      '/room/map',
      '/room/shifts',
      '/room/vehicles',
      '/room/drivers',
      '/room/agreements',
      '/room/hub',
      '/room/checkin',
      '/room/operation-health',
      '/room/commercial-flow',
    ],
  },
  {
    role: 'DRIVER',
    paths: [
      '/driver/today',
      '/driver/route',
      '/driver/map',
    ],
  },
  {
    role: 'PERSONEL',
    paths: [
      '/personel/live',
      '/personel/my',
    ],
  },
  {
    role: 'SUPER_ADMIN',
    paths: [
      '/superadmin',
      '/superadmin/operations',
      '/superadmin/audit',
      '/superadmin/trust-quality',
      '/superadmin/commercial-core',
      '/superadmin/onboarding-review',
    ],
  },
];

const QUESTION_MATRIX = [
  {
    question: 'Bu ekranda neye bakmalıyım?',
    expectedIntentFamily: 'SCREEN_PURPOSE',
    mustIncludeAny: ['ekran', 'kullanılır', 'görmek', 'bak', 'takip'],
    mustNotIncludeAny: ['sıradaki doğru işlem', 'hangi kayıt', 'şimdi:'],
  },
  {
    question: 'Riskleri sırala',
    expectedIntentFamily: 'RISK_LIST',
    mustIncludeAny: ['risk'],
    mustNotIncludeAny: ['sıradaki doğru işlem', 'netleştirelim', 'hangi kayıt'],
  },
  {
    question: 'Sıradaki doğru işlem ne?',
    expectedIntentFamily: 'NEXT_ACTION',
    mustIncludeAny: ['şimdi', 'sıradaki', 'önce', 'ilk', 'takip', 'açık veya riskli kartı aç', 'ilgili kartı aç'],
    mustNotIncludeAny: ['netleştirelim'],
  },
  {
    question: 'Şimdi ne yapayım?',
    expectedIntentFamily: 'NEXT_ACTION',
    mustIncludeAny: ['şimdi', 'sıradaki', 'önce', 'ilk', 'takip', 'açık veya riskli kartı aç', 'ilgili kartı aç'],
    mustNotIncludeAny: ['netleştirelim'],
  },
  {
    question: 'Devamını anlat',
    expectedIntentFamily: 'CONTINUE_FLOW',
    mustIncludeAny: ['devam', 'akış', 'sürdür'],
    mustNotIncludeAny: ['netleştirelim', 'bu ekran,'],
  },
  {
    question: 'İlgili durumu sor',
    expectedIntentFamily: 'CLARIFY',
    mustIncludeAny: ['hangi', 'bakayım', 'bakmam', 'istiyorsun', 'kayıt'],
    mustHaveQuestionMark: true,
    mustNotIncludeAny: ['sıradaki doğru işlem', 'bu ekran,', 'operasyon sağlığı', 'mavi aktif', 'yeşil aktif'],
  },
];

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

function excerpt(text, limit = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
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

function containsAny(text, needles) {
  const haystack = normalize(text);
  return needles.some((needle) => haystack.includes(normalize(needle)));
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

function buildSelectedContext(screenPath, label) {
  const lower = String(screenPath || '').toLowerCase();

  if (lower === '/company') {
    return {
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedLabel: 'Seçili plan',
      selectedRecordStatus: 'Seçili plan hazır.',
      selectedRecordType: 'plan',
      selectedRecordLabel: 'Plan',
      facts: { module: 'planning' },
    };
  }

  if (lower === '/superadmin') {
    return {
      selectedSummary: 'Genel bakış hazır.',
      selectedLabel: 'Genel bakış',
      selectedRecordStatus: 'Genel bakış hazır.',
      selectedRecordType: 'overview',
      selectedRecordLabel: 'Genel bakış',
      facts: { module: 'overview' },
    };
  }

  if (lower.includes('/map')) {
    return {
      selectedSummary: 'Araç 34ABC123 • Son GPS 1 dk • ETA 6 dk',
      selectedLabel: 'Canlı kart',
      selectedRecordStatus: 'Araç 34ABC123 • Son GPS 1 dk • ETA 6 dk',
      selectedRecordType: 'liveMap',
      selectedRecordLabel: 'Canlı kart',
      facts: { vehicle: '34ABC123', gps: '1 dk', eta: '6 dk' },
    };
  }

  if (lower.includes('/shifts')) {
    return {
      selectedSummary: 'Seçili vardiya hazır.',
      selectedLabel: 'Seçili vardiya',
      selectedRecordStatus: 'Seçili vardiya hazır.',
      selectedRecordType: 'shift',
      selectedRecordLabel: 'Seçili vardiya',
      facts: { shift: '#6' },
    };
  }

  if (lower.includes('/agreements')) {
    return {
      selectedSummary: 'Seçili sözleşme kaydı hazır.',
      selectedLabel: 'Seçili sözleşme',
      selectedRecordStatus: 'Seçili sözleşme kaydı hazır.',
      selectedRecordType: 'agreement',
      selectedRecordLabel: 'Seçili sözleşme',
      facts: { agreement: '#A1' },
    };
  }

  if (lower.includes('/vehicles')) {
    return {
      selectedSummary: 'Seçili araç hazır.',
      selectedLabel: 'Seçili araç',
      selectedRecordStatus: 'Seçili araç hazır.',
      selectedRecordType: 'vehicle',
      selectedRecordLabel: 'Seçili araç',
      facts: { vehicle: '34ABC123' },
    };
  }

  if (lower.includes('/drivers')) {
    return {
      selectedSummary: 'Seçili sürücü hazır.',
      selectedLabel: 'Seçili sürücü',
      selectedRecordStatus: 'Seçili sürücü hazır.',
      selectedRecordType: 'driver',
      selectedRecordLabel: 'Seçili sürücü',
      facts: { driver: 'Sürücü 1' },
    };
  }

  if (lower.includes('/checkin')) {
    return {
      selectedSummary: 'Check-in kaydı hazır.',
      selectedLabel: 'Seçili check-in',
      selectedRecordStatus: 'Check-in kaydı hazır.',
      selectedRecordType: 'checkin',
      selectedRecordLabel: 'Check-in kaydı',
      facts: { checkin: true },
    };
  }

  if (lower.includes('/hub')) {
    return {
      selectedSummary: 'Ana nokta kaydı hazır.',
      selectedLabel: 'Seçili hub',
      selectedRecordStatus: 'Ana nokta kaydı hazır.',
      selectedRecordType: 'hub',
      selectedRecordLabel: 'Ana nokta',
      facts: { hub: true },
    };
  }

  if (lower.includes('/operation-health')) {
    return {
      selectedSummary: 'Operasyon sağlığı bandı hazır.',
      selectedLabel: 'Sağlık bandı',
      selectedRecordStatus: 'Operasyon sağlığı bandı hazır.',
      selectedRecordType: 'health',
      selectedRecordLabel: 'Sağlık bandı',
      facts: { health: true },
    };
  }

  if (lower.includes('/commercial-core')) {
    return {
      selectedSummary: 'Ticari çekirdek kaydı hazır.',
      selectedLabel: 'Ticari çekirdek',
      selectedRecordStatus: 'Ticari çekirdek kaydı hazır.',
      selectedRecordType: 'commercialCore',
      selectedRecordLabel: 'Ticari çekirdek',
      facts: { commercial: true },
    };
  }

  if (lower.includes('/commercial-flow')) {
    return {
      selectedSummary: 'Ticari akış kaydı hazır.',
      selectedLabel: 'Ticari akış',
      selectedRecordStatus: 'Ticari akış kaydı hazır.',
      selectedRecordType: 'commercialFlow',
      selectedRecordLabel: 'Ticari akış',
      facts: { commercialFlow: true },
    };
  }

  if (lower.includes('/onboarding-review')) {
    return {
      selectedSummary: 'İnceleme kaydı hazır.',
      selectedLabel: 'İnceleme',
      selectedRecordStatus: 'İnceleme kaydı hazır.',
      selectedRecordType: 'onboardingReview',
      selectedRecordLabel: 'İnceleme',
      facts: { onboarding: true },
    };
  }

  if (lower.includes('/audit')) {
    return {
      selectedSummary: 'Denetim kaydı hazır.',
      selectedLabel: 'Denetim',
      selectedRecordStatus: 'Denetim kaydı hazır.',
      selectedRecordType: 'audit',
      selectedRecordLabel: 'Denetim',
      facts: { audit: true },
    };
  }

  if (lower.includes('/trust-quality')) {
    return {
      selectedSummary: 'Güven ve kalite kaydı hazır.',
      selectedLabel: 'Kalite',
      selectedRecordStatus: 'Güven ve kalite kaydı hazır.',
      selectedRecordType: 'quality',
      selectedRecordLabel: 'Kalite',
      facts: { quality: true },
    };
  }

  if (lower.includes('/operations')) {
    return {
      selectedSummary: 'Operasyon kaydı hazır.',
      selectedLabel: 'Operasyon',
      selectedRecordStatus: 'Operasyon kaydı hazır.',
      selectedRecordType: 'operations',
      selectedRecordLabel: 'Operasyon',
      facts: { operations: true },
    };
  }

  if (lower.includes('/access-links')) {
    return {
      selectedSummary: 'Erişim linki hazır.',
      selectedLabel: 'Erişim',
      selectedRecordStatus: 'Erişim linki hazır.',
      selectedRecordType: 'access',
      selectedRecordLabel: 'Erişim',
      facts: { access: true },
    };
  }

  if (lower.includes('/georeview')) {
    return {
      selectedSummary: 'Konum inceleme kaydı hazır.',
      selectedLabel: 'Konum inceleme',
      selectedRecordStatus: 'Konum inceleme kaydı hazır.',
      selectedRecordType: 'georeview',
      selectedRecordLabel: 'Konum inceleme',
      facts: { georeview: true },
    };
  }

  if (lower.includes('/reports')) {
    return {
      selectedSummary: 'Rapor kaydı hazır.',
      selectedLabel: 'Rapor',
      selectedRecordStatus: 'Rapor kaydı hazır.',
      selectedRecordType: 'report',
      selectedRecordLabel: 'Rapor',
      facts: { report: true },
    };
  }

  if (lower.includes('/today')) {
    return {
      selectedSummary: 'Bugün için plan hazır.',
      selectedLabel: 'Bugün',
      selectedRecordStatus: 'Bugün için plan hazır.',
      selectedRecordType: 'today',
      selectedRecordLabel: 'Bugün',
      facts: { today: true },
    };
  }

  if (lower.includes('/live')) {
    return {
      selectedSummary: 'Canlı servis kartı hazır.',
      selectedLabel: 'Canlı servis',
      selectedRecordStatus: 'Canlı servis kartı hazır.',
      selectedRecordType: 'live',
      selectedRecordLabel: 'Canlı servis',
      facts: { live: true },
    };
  }

  if (lower.includes('/my')) {
    return {
      selectedSummary: 'Kendi servis kaydı hazır.',
      selectedLabel: 'Kendi servis',
      selectedRecordStatus: 'Kendi servis kaydı hazır.',
      selectedRecordType: 'my',
      selectedRecordLabel: 'Kendi servis',
      facts: { my: true },
    };
  }

  return {
    selectedSummary: `Seçili ${label} hazır.`,
    selectedLabel: `Seçili ${label}`,
    selectedRecordStatus: `Seçili ${label} hazır.`,
    selectedRecordType: 'record',
    selectedRecordLabel: label,
    facts: {},
  };
}

function buildScreenFixture(role, screenPath) {
  const user = { role };
  const availablePaths = new Set(listScreensForUser(user).map((screen) => screen.path));
  if (!availablePaths.has(screenPath)) return null;

  const screenDefinition = getScreenDefinitionForUser(user, { path: screenPath });
  if (!screenDefinition || screenDefinition.path !== screenPath) return null;

  const selected = buildSelectedContext(screenPath, screenDefinition.label);
  const menuPurpose = String(screenDefinition.menuPurpose || screenDefinition.summary || `${screenDefinition.label} özeti`);

  const screenContext = {
    path: screenPath,
    label: screenDefinition.label,
    menuPurpose,
    selectedSummary: selected.selectedSummary,
    selectedLabel: selected.selectedLabel,
    selectedRecordStatus: selected.selectedRecordStatus,
    selectedRecordSummary: selected.selectedSummary,
    selectedRecordType: selected.selectedRecordType,
    selectedRecordLabel: selected.selectedRecordLabel,
    selectedEntityType: selected.selectedRecordType,
    selectedEntityId: 1,
    helpContextSummary: selected.selectedSummary,
    contextSummary: menuPurpose,
    facts: {
      role,
      path: screenPath,
      label: screenDefinition.label,
      ...selected.facts,
    },
    selectedFields: [
      { label: 'Durum', value: selected.selectedRecordStatus },
      { label: 'Özet', value: selected.selectedSummary },
    ],
    selectedBadges: [{ label: 'Durum', value: selected.selectedRecordStatus }],
    structuredFacts: {
      reasoningLead: `${screenDefinition.label} için özet.`,
      nextBestAction: String(screenDefinition.nextStep || screenDefinition.firstStep || 'İlk kartı aç.'),
      selectedRecordStatus: selected.selectedRecordStatus,
      selectedRecordType: selected.selectedRecordType,
      selectedRecordLabel: selected.selectedRecordLabel,
      facts: {
        role,
        path: screenPath,
        label: screenDefinition.label,
        ...selected.facts,
      },
    },
  };

  return {
    role,
    user,
    path: screenPath,
    screenDefinition,
    screenContext,
  };
}

function stripSelection(fixture) {
  return {
    ...fixture,
    screenContext: {
      ...fixture.screenContext,
      selectedSummary: '',
      selectedLabel: '',
      selectedRecordStatus: '',
      selectedRecordType: '',
      selectedRecordLabel: '',
      selectedRecordSummary: '',
      helpContextSummary: '',
      contextSummary: '',
      selectedEntityType: '',
      selectedEntityId: 0,
      selectedFields: [],
      selectedBadges: [],
      structuredFacts: {
        ...fixture.screenContext.structuredFacts,
        selectedRecordStatus: '',
        selectedRecordType: '',
        selectedRecordLabel: '',
      },
    },
  };
}

function buildContinueConversationState(fixture) {
  const seedMessage = 'Şimdi ne yapayım?';
  const seedResponse = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: fixture.user,
    message: seedMessage,
    context: null,
    entityLabel: fixture.screenDefinition?.label || '',
    scope: { roleMode: 'OPERATIONS', role: fixture.role },
    conversationState: null,
    screenContext: fixture.screenContext,
    screenDefinition: fixture.screenDefinition,
  });

  return {
    ...(seedResponse.conversationState && typeof seedResponse.conversationState === 'object' ? seedResponse.conversationState : {}),
    lastQuestionType: seedResponse.questionType || seedResponse.conversationState?.lastQuestionType || 'NEXT_STEP',
    lastPrimaryConcern: seedMessage,
    lastUserMessage: seedMessage,
    lastRawUserMessage: seedMessage,
    recentMessages: [
      { role: 'user', text: seedMessage },
      { role: 'assistant', text: String(seedResponse.reply || '') },
    ],
  };
}

function buildHelpResponse({ fixture, message, conversationState = null }) {
  const normalized = normalizeCopilotRequestInput({ message });
  const normalizedMessage = String(normalized?.message || message || '');
  return {
    normalized,
    response: buildChatHelpResponse({
      entityType: 'screen',
      entityId: 1,
      user: fixture.user,
      message: normalizedMessage,
      context: null,
      entityLabel: fixture.screenDefinition?.label || '',
      scope: { roleMode: 'OPERATIONS', role: fixture.role },
      conversationState,
      screenContext: fixture.screenContext,
      screenDefinition: fixture.screenDefinition,
    }),
  };
}

function classifyActualIntentFamily(response) {
  const questionType = String(response?.questionType || '').toUpperCase();
  const mode = String(response?.reasoningAssistant?.mode || '').toUpperCase();
  const reasoningFamily = String(response?.reasoningAssistant?.interactionIntentFamily || '').toUpperCase();
  const reply = normalize(response?.reply || '');

  if (mode === 'CLARIFYING_QUESTION' || reply.startsWith('netleştirelim:')) return 'CLARIFY';
  if (reasoningFamily === 'CONTINUE_FLOW' || /devam edelim/.test(reply) || /akışından devam edelim/.test(reply)) return 'CONTINUE_FLOW';
  if (['SCREEN_PURPOSE', 'SCREEN_FOCUS', 'SCREEN_EXPLANATION_HELP', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(questionType)) return 'SCREEN_PURPOSE';
  if (questionType === 'RISK_LIST') return 'RISK_LIST';
  return 'NEXT_ACTION';
}

function validateReplyShape({ response, expectedIntentFamily, screenPath, question }) {
  const reply = String(response?.reply || '').trim();
  const issues = [];

  if (!reply) issues.push('reply is empty');

  const normalizedReply = normalize(reply);
  const template = QUESTION_MATRIX.find((item) => item.question === question) || null;
  const shouldInclude = template?.mustIncludeAny || [];
  const shouldExclude = template?.mustNotIncludeAny || [];

  if (template?.mustHaveQuestionMark && !reply.includes('?')) {
    issues.push('clarifying reply is not phrased as a question');
  }

  if (shouldInclude.length > 0 && !containsAny(reply, shouldInclude)) {
    issues.push(`reply missing one of: ${shouldInclude.join(' | ')}`);
  }

  for (const needle of shouldExclude) {
    if (normalizedReply.includes(normalize(needle))) {
      issues.push(`reply leaks "${needle}"`);
    }
  }

  if (screenPath === '/room/shifts' && normalizedReply.includes('operasyon sağlığı')) {
    issues.push('room shifts reply leaks Operation Health wording');
  }

  if (screenPath === '/room/shifts' && /mavi\s+aktif|yeşil\s+aktif/.test(normalizedReply)) {
    issues.push('room shifts reply leaks unrelated progress wording');
  }

  if (expectedIntentFamily === 'CLARIFY' && !reply.includes('?')) {
    issues.push('clarify reply should ask a direct question');
  }

  if (expectedIntentFamily === 'CONTINUE_FLOW' && !containsAny(reply, ['devam', 'akış'])) {
    issues.push('continue-flow reply does not preserve the previous context');
  }

  if (
    expectedIntentFamily === 'NEXT_ACTION'
    && !containsAny(reply, ['şimdi', 'sıradaki', 'önce', 'ilk', 'takip', 'açık veya riskli kartı aç', 'ilgili kartı aç'])
  ) {
    issues.push('next-action reply does not sound action-oriented');
  }

  if (expectedIntentFamily === 'SCREEN_PURPOSE' && containsAny(reply, ['sıradaki doğru işlem'])) {
    issues.push('screen-purpose reply drifts into next-action or clarify language');
  }

  if (expectedIntentFamily === 'RISK_LIST' && !containsAny(reply, ['risk'])) {
    issues.push('risk-list reply does not read like a risk list');
  }

  return issues;
}

function evaluateCase(testCase) {
  const issues = [];
  let normalized = null;
  let response = null;

  try {
    normalized = normalizeCopilotRequestInput({ message: testCase.question });

    const buildResult = buildHelpResponse({
      fixture: testCase.fixture,
      message: normalized.message || testCase.question,
      conversationState: testCase.conversationState,
    });
    response = buildResult.response;

    const actualIntentFamily = classifyActualIntentFamily(response);
    if (actualIntentFamily !== testCase.expectedIntentFamily) {
      issues.push(`expected ${testCase.expectedIntentFamily} but got ${actualIntentFamily}`);
    }

    const replyIssues = validateReplyShape({
      response,
      expectedIntentFamily: testCase.expectedIntentFamily,
      screenPath: testCase.screenPath,
      question: testCase.question,
    });
    issues.push(...replyIssues);

    if (testCase.screenPath === '/room/shifts' && testCase.question === 'İlgili durumu sor') {
      const reply = String(response?.reply || '');
      if (!containsAny(reply, ['hangi', 'kayıt', 'vardiya', 'talep', 'sözleşme', 'araç', 'sürücü'])) {
        issues.push('room shifts clarify reply should ask which record/surface to inspect');
      }
    }
  } catch (error) {
    issues.push(error?.stack || error?.message || String(error));
  }

  const reply = String(response?.reply || '');
  return {
    pass: issues.length === 0,
    role: testCase.role,
    screen: `${testCase.role} ${testCase.screenPath}`,
    question: testCase.question,
    expectedIntentFamily: testCase.expectedIntentFamily,
    actualIntentFamily: response ? classifyActualIntentFamily(response) : 'ERROR',
    answerExcerpt: excerpt(reply),
    failReason: issues.join(' | '),
    questionType: response?.questionType || '',
    reasoningMode: response?.reasoningAssistant?.mode || '',
    reasoningFamily: response?.reasoningAssistant?.interactionIntentFamily || '',
  };
}

function main() {
  console.log('=== AI-03B-SEMANTIC-VISIBLE-LIVE-MATRIX-01 CHECK ===');

  const pkg = read('package.json');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:ai03bsemanticvisiblelivematrix01": "node backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js"', 'package.json exposes the AI-03B semantic visible live matrix');
  assertProductExtensionsOrder(['check:copilotreasoninganswercomposer01', 'check:ai03bparaphraseintentaudit01', 'check:ai03bsemanticvisibleaudit01', 'check:ai03bsemanticvisiblelivematrix01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01'], 'product extensions registry keeps the AI-03B live matrix in order', registryScripts);
  assertProductExtensionsOrder(['check:copilotreasoninganswercomposer01', 'check:ai03bparaphraseintentaudit01', 'check:ai03bsemanticvisibleaudit01', 'check:ai03bsemanticvisiblelivematrix01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01'], 'verify chain registry keeps the AI-03B live matrix in order', registryScripts);
  must(harnessDoc, 'ai03b_semantic_visible_live_matrix_01_check.js', 'script harness doc tracks the AI-03B live matrix file');
  must(harnessDoc, 'check:ai03bsemanticvisiblelivematrix01', 'script harness doc exposes the AI-03B live matrix command');

  const fixtures = [];
  for (const spec of ROLE_SPECS) {
    for (const screenPath of spec.paths) {
      const fixture = buildScreenFixture(spec.role, screenPath);
      if (fixture) {
        fixtures.push(fixture);
      } else if (spec.role === 'COMPANY' || spec.role === 'ROOM' || spec.role === 'DRIVER' || spec.role === 'PERSONEL' || spec.role === 'SUPER_ADMIN') {
        throw new Error(`Missing required screen fixture for ${spec.role} ${screenPath}`);
      }
    }
  }

  const testedRoles = uniqueStrings(fixtures.map((fixture) => fixture.role));
  const testedScreens = uniqueStrings(fixtures.map((fixture) => `${fixture.role} ${fixture.path} (${fixture.screenDefinition.label})`));
  const testedQuestions = QUESTION_MATRIX.map((item) => item.question);

  const cases = [];
  for (const fixture of fixtures) {
    for (const template of QUESTION_MATRIX) {
      const matrixFixture = template.question === 'İlgili durumu sor' ? stripSelection(fixture) : fixture;
      const conversationState = template.question === 'Devamını anlat' ? buildContinueConversationState(fixture) : null;
      cases.push({
        role: fixture.role,
        screenPath: fixture.path,
        fixture: matrixFixture,
        question: template.question,
        expectedIntentFamily: template.expectedIntentFamily,
        conversationState,
      });
    }
  }

  const results = cases.map(evaluateCase);
  const passCount = results.filter((result) => result.pass).length;
  const failList = results
    .filter((result) => !result.pass)
    .map((result) => ({
      role: result.role,
      screen: result.screen,
      question: result.question,
      expectedIntentFamily: result.expectedIntentFamily,
      actualIntentFamily: result.actualIntentFamily,
      answerExcerpt: result.answerExcerpt,
      failReason: result.failReason,
    }));

  const report = {
    testedRoles,
    testedScreens,
    testedQuestions,
    totalCases: results.length,
    passCount,
    failCount: failList.length,
    failList,
  };

  console.log(JSON.stringify(report, null, 2));

  mustDiffEmptyOrExactlyWithIdentity(
    ['backend/src/services', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_SERVICE_DIFF,
    'service/prisma diff stays empty'
  );
  assert(gitCachedNames().length === 0, 'stage stays empty');
  mustNoStagedPrefix(gitCachedNames(), ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  if (report.totalCases < 60) {
    fail(`live matrix case count ${report.totalCases} is below the 60-case minimum`);
  }
  if (report.failCount > 0) {
    fail(`live matrix has ${report.failCount} failing cases`);
  }

  console.log('=== AI-03B-SEMANTIC-VISIBLE-LIVE-MATRIX-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
}
