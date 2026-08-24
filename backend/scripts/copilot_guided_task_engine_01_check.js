#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { mustNoDiffExceptWithIdentity } from './lib/guardGitScope.js';
import {
  detectCopilotGuidedTaskEngineIntent,
  detectCopilotGuidedTaskEngineProgressCommand,
  getCopilotGuidedTaskEngineFamilyMeta,
  getCopilotGuidedTaskEngineSampleCases,
  listCopilotGuidedTaskEngineFamilies,
} from '../src/ai/chat/copilotGuidedTaskEngine.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';

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

function same(actual, expected, label) {
  assert(normalize(actual) === normalize(expected), `${label}: ${actual} !== ${expected}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function assertSome(text, needles, label) {
  const haystack = normalize(text);
  const list = Array.isArray(needles) ? needles : [];
  if (list.some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function assertNone(text, needles, label) {
  const haystack = normalize(text);
  const list = Array.isArray(needles) ? needles : [];
  if (list.every((needle) => !haystack.includes(normalize(needle)))) ok(label);
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

function buildResponseContext({ role, screenPath, screenLabel, message, conversationState = null, entityType = 'screen' }) {
  const user = { role };
  const screenContext = { path: screenPath, label: screenLabel };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext, 1) || screenContext;
  const replyContext = {
    entityType,
    entityId: 1,
    user,
    message,
    context: { type: entityType },
    entityLabel: screenDefinition?.label || screenLabel || '',
    scope: { roleMode: 'OPERATIONS', role },
    conversationState,
    screenContext,
    screenDefinition,
    sourceEntityType: entityType,
    sourceEntityId: 1,
    resolvedEntityType: entityType,
    resolvedEntityId: 1,
  };
  const response = buildChatHelpResponse(replyContext);
  const intent = detectQuestionIntent(message, {
    entityType,
    screenPath: screenDefinition?.path || screenPath || '',
    roleMode: 'OPERATIONS',
    userRole: role,
    conversationState,
    originalMessage: message,
  });
  const direct = detectCopilotGuidedTaskEngineIntent({
    message,
    originalMessage: message,
    screenPath: screenDefinition?.path || screenPath || '',
    roleMode: 'OPERATIONS',
    userRole: role,
    conversationState,
    entityType,
    questionType: '',
  });
  return { user, screenContext, screenDefinition, response, intent, direct };
}

function assertSafeReplyMeta(meta, label) {
  const blockedText = Array.isArray(meta?.blockedActions) ? meta.blockedActions.join(' • ') : '';
  must(blockedText, 'runtime AI action', `${label} blocks runtime AI action`);
  must(blockedText, 'tool execution', `${label} blocks tool execution`);
  must(blockedText, 'write-action dispatcher', `${label} blocks write-action dispatcher`);
}

function assertGuidedCase({
  label,
  message,
  role,
  screenPath,
  screenLabel,
  expectedFamilyId,
  allowedFamilyIds = [],
  allowedFamilyIdsByMessage = null,
  expectedQuestionType,
  expectedQuestionTypeByMessage = null,
  expectedReplyMode,
  expectedReplyModeByMessage = null,
  replyNeedles,
  replyNeedlesByMessage = null,
  conversationState = null,
  expectedProgressCommand = '',
}) {
  const { response, intent, direct } = buildResponseContext({
    role,
    screenPath,
    screenLabel,
    message,
    conversationState,
  });
  const meta = response.contextPriority?.guidedTaskMeta || intent.guidedTaskMeta || direct || null;
  const familyMeta = getCopilotGuidedTaskEngineFamilyMeta(expectedFamilyId) || null;
  const allowedFamilies = Array.isArray(allowedFamilyIdsByMessage?.[message]) && allowedFamilyIdsByMessage[message].length
    ? allowedFamilyIdsByMessage[message]
    : (Array.isArray(allowedFamilyIds) && allowedFamilyIds.length ? allowedFamilyIds : [expectedFamilyId]);
  const expectedQuestionTypeForMessage = expectedQuestionTypeByMessage?.[message] || expectedQuestionType;
  const expectedReplyModeForMessage = expectedReplyModeByMessage?.[message] || expectedReplyMode;
  const replyNeedlesForMessage = replyNeedlesByMessage?.[message] || replyNeedles;
  assert(allowedFamilies.some((familyId) => normalize(direct?.familyId || '') === normalize(familyId)), `${label} direct family`);
  same(direct?.replyMode || '', familyMeta?.replyMode || '', `${label} direct family reply mode`);
  assert(allowedFamilies.some((familyId) => normalize(intent.guidedTaskMeta?.familyId || '') === normalize(familyId)), `${label} routed family`);
  same(intent.questionType || '', expectedQuestionTypeForMessage, `${label} intent question type`);
  same(response.questionType || '', expectedQuestionTypeForMessage, `${label} response question type`);
  same(response.replyMode || '', expectedReplyModeForMessage, `${label} response reply mode`);
  assert(allowedFamilies.some((familyId) => normalize(meta?.familyId || '') === normalize(familyId)), `${label} response meta family`);
  same(meta?.questionType || '', expectedQuestionTypeForMessage, `${label} response meta question type`);
  same(meta?.replyMode || '', familyMeta?.replyMode || '', `${label} response meta reply mode`);
  same(meta?.guideLevel || '', expectedReplyModeForMessage, `${label} response meta guide level`);
  if (expectedProgressCommand) {
    same(meta?.progressCommand || '', expectedProgressCommand, `${label} progress command`);
    same(detectCopilotGuidedTaskEngineProgressCommand(message, conversationState)?.command || '', expectedProgressCommand, `${label} progress detector command`);
  }
  assert(Number(response.intentConfidence || 0) >= 0.7, `${label} confidence threshold`);
  assert(Array.isArray(response.quickActions) && response.quickActions.length > 0, `${label} quick actions present`);
  assert(response.quickActions.some((action) => ['ASK', 'OPEN_GUIDE', 'COPY_TEXT', 'OPEN_ROUTE'].includes(String(action?.actionKind || ''))), `${label} exposes safe quick actions`);
  assertSome(response.reply, replyNeedlesForMessage, `${label} reply fragments`);
  assertNone(response.reply, ['Bu ekran için kısa rehber', 'Ekrandaki sinyale göre konuşuyorum', 'Bu ekrandaki sinyale göre konuşuyorum'], `${label} avoids generic screen fallback`);
  assertSafeReplyMeta(meta, label);
}

async function main() {
  console.log('=== COPILOT-GUIDED-TASK-ENGINE-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const doc = read('docs/COPILOT_GUIDED_TASK_ENGINE_01.md');
  const helperSource = read('backend/src/ai/chat/copilotGuidedTaskEngine.js');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
  const answerQualitySource = read('backend/src/ai/chat/answerQualityPolicy.js');
  const goldenQuestionPackSource = read('backend/src/ai/chat/goldenQuestionPack.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();
  const sampleCases = getCopilotGuidedTaskEngineSampleCases();
  const familyIds = listCopilotGuidedTaskEngineFamilies();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotguidedtaskengine01": "node backend/scripts/copilot_guided_task_engine_01_check.js"', 'package.json exposes guided task engine check');
  assertProductExtensionsOrder(['check:copiloteblockruntimeanswerintegration01', 'check:copilotguidedtaskengine01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps guided task engine after e-block', registryScripts);
  assertProductExtensionsOrder(['check:copiloteblockruntimeanswerintegration01', 'check:copilotguidedtaskengine01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps guided task engine after e-block', registryScripts);

  must(guide, 'COPILOT-GUIDED-TASK-ENGINE-01', 'script guide mentions guided task engine milestone');
  must(guide, 'check:copilotguidedtaskengine01', 'script guide exposes guided task engine check');
  must(guide, 'node backend\\scripts\\copilot_guided_task_engine_01_check.js', 'script guide includes guided task engine command');
  must(guide, 'docs/COPILOT_GUIDED_TASK_ENGINE_01.md', 'script guide includes guided task engine doc');
  ordered(guide, ['EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'COPILOT-GUIDED-TASK-ENGINE-01', 'ETA-SANITY-01'], 'script guide keeps guided task engine after e-block');

  must(primer, 'COPILOT-GUIDED-TASK-ENGINE-01', 'primer mentions guided task engine milestone');
  must(primer, 'check:copilotguidedtaskengine01', 'primer exposes guided task engine check');
  must(primer, 'docs/COPILOT_GUIDED_TASK_ENGINE_01.md', 'primer links guided task engine doc');
  must(primer, 'backend/src/ai/chat/copilotGuidedTaskEngine.js', 'primer links guided task engine helper');

  must(roadmapLock, 'COPILOT-GUIDED-TASK-ENGINE-01', 'roadmap lock keeps guided task engine milestone');
  must(roadmapLock, 'semantic intent family', 'roadmap lock keeps semantic intent wording');
  must(roleMatrix, 'COPILOT-GUIDED-TASK-ENGINE-01', 'role/task matrix references guided task engine milestone');
  must(roleMatrix, 'exact phrase matching yerine role + screen + task family + synonym + typo toleransı', 'role/task matrix keeps semantic family wording');
  must(aiRoadmap, 'COPILOT-GUIDED-TASK-ENGINE-01', 'AI action roadmap references guided task engine milestone');
  must(aiRoadmap, 'semantic intent family', 'AI action roadmap keeps semantic family wording');

  must(doc, '# COPILOT GUIDED TASK ENGINE 01', 'guided task engine doc title present');
  must(doc, 'docs/check milestone', 'guided task engine doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotguidedtaskengine01`', 'guided task engine doc keeps canonical check wording');
  must(doc, 'exact phrase matching', 'guided task engine doc keeps semantic boundary wording');
  must(doc, 'role + screen + task family', 'guided task engine doc keeps role/screen/family wording');
  must(doc, 'Ana örnek havuzu 8 sample family + progress flow ile 72 test case içerir; ayrıca genel guided-task fallback için 4 doğrudan doğrulama vardır.', 'guided task engine doc keeps coverage wording');
  must(doc, 'GENERAL_GUIDED_TASK_GUIDE', 'guided task engine doc mentions general guided family');
  must(doc, 'ROUTE_REVIEW_APPROVAL', 'guided task engine doc mentions route review approval family');
  must(doc, 'Girdim', 'guided task engine doc mentions progress flow');
  must(doc, 'Bulamadım', 'guided task engine doc mentions clarify progress');
  must(doc, 'runtime AI action', 'guided task engine doc keeps runtime boundary');
  must(doc, 'tool execution', 'guided task engine doc keeps tool boundary');
  must(doc, 'write-action dispatcher', 'guided task engine doc keeps write-action boundary');
  must(doc, 'OSRM/geocode call', 'guided task engine doc keeps OSRM/geocode boundary');
  must(doc, 'route apply', 'guided task engine doc keeps route boundary');

  must(helperSource, 'COPILOT_GUIDED_TASK_ENGINE_VERSION', 'helper exposes version marker');
  must(helperSource, 'COPILOT_GUIDED_TASK_ENGINE_PROGRESS_COMMANDS', 'helper exposes progress commands');
  must(helperSource, 'COPILOT_GUIDED_TASK_ENGINE_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helperSource, 'COPILOT_GUIDED_TASK_ENGINE_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helperSource, 'COPILOT_GUIDED_TASK_ENGINE_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helperSource, 'COPILOT_GUIDED_TASK_ENGINE_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helperSource, 'ROUTE_PREP_EXCEL', 'helper keeps Excel family');
  must(helperSource, 'ROUTE_PREP_ADDRESS', 'helper keeps address family');
  must(helperSource, 'ROUTE_PREP_OSRM', 'helper keeps OSRM family');
  must(helperSource, 'ROUTE_REVIEW_APPROVAL', 'helper keeps route review approval family');
  must(helperSource, 'ROUTE_APPLY_BLOCKED', 'helper keeps route apply family');
  must(helperSource, 'IMPORT_WRITE_BLOCKED', 'helper keeps import write family');
  must(helperSource, 'FAKE_SUCCESS_REQUEST_BLOCKED', 'helper keeps fake success family');
  must(helperSource, 'OFFER_FLOW_GUIDE', 'helper keeps offer family');
  must(helperSource, 'SHIFT_FLOW_GUIDE', 'helper keeps shift family');
  must(helperSource, 'GENERAL_GUIDED_TASK_GUIDE', 'helper keeps general guided family');
  must(helperSource, 'listCopilotGuidedTaskEngineFamilies', 'helper exposes family lister');
  must(helperSource, 'getCopilotGuidedTaskEngineFamilyMeta', 'helper exposes family meta getter');
  must(helperSource, 'detectCopilotGuidedTaskEngineProgressCommand', 'helper exposes progress detector');
  must(helperSource, 'detectCopilotGuidedTaskEngineIntent', 'helper exposes intent detector');
  must(helperSource, 'composeCopilotGuidedTaskEngineReply', 'helper exposes reply composer');
  must(helperSource, 'buildCopilotGuidedTaskEngineGuide', 'helper exposes guide builder');
  must(helperSource, 'getCopilotGuidedTaskEngineSampleCases', 'helper exposes sample cases');
  must(helperSource, 'listCopilotGuidedTaskEngineSampleMessages', 'helper exposes sample message lister');
  must(helpComposerSource, 'composeCopilotGuidedTaskEngineReply', 'helpComposer uses guided task engine reply helper');
  must(helpComposerSource, 'buildCopilotGuidedTaskEngineGuide', 'helpComposer uses guided task engine guide helper');
  must(helpComposerSource, 'detectCopilotGuidedTaskEngineProgressCommand', 'helpComposer uses progress command detector');
  must(helpComposerSource, 'guidedTaskMeta', 'helpComposer keeps guided task metadata');
  must(intentRouterSource, 'guidedTaskMeta', 'intentRouter preserves guided task metadata');
  must(intentRouterSource, 'detectCopilotGuidedTaskEngineIntent', 'intentRouter uses guided task engine detector');
  must(answerQualitySource, 'guidedTaskMeta', 'answer quality policy respects guided task metadata');
  must(answerQualitySource, 'workflowTopicChipSet', 'answer quality policy keeps workflow topic chips');
  must(goldenQuestionPackSource, 'buildGuidedTaskEngineGoldenCases', 'golden question pack includes guided cases');
  must(goldenQuestionPackSource, 'getCopilotGuidedTaskEngineSampleCases', 'golden question pack imports guided samples');

  must(harnessCheck, 'check:copilotguidedtaskengine01', 'script harness check knows guided task engine alias');
  must(harnessCheck, 'copilot_guided_task_engine_01_check.js', 'script harness check knows guided task engine file');
  must(harnessCheck, 'COPILOT-GUIDED-TASK-ENGINE-01', 'script harness check knows guided task engine milestone');
  must(harnessCheck, 'docs/COPILOT_GUIDED_TASK_ENGINE_01.md', 'script harness check knows guided task engine doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotGuidedTaskEngine.js', 'script harness check knows guided task engine helper');

  must(harnessDoc, 'root:check:copilotguidedtaskengine01', 'script harness doc lists guided task engine root check');
  must(harnessDoc, 'copilot_guided_task_engine_01_check.js', 'script harness doc lists guided task engine check');
  must(harnessDoc, 'docs/COPILOT_GUIDED_TASK_ENGINE_01.md', 'script harness doc lists guided task engine doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotGuidedTaskEngine.js', 'script harness doc lists guided task engine helper');
  must(harnessDoc, 'COPILOT-GUIDED-TASK-ENGINE-01', 'script harness doc lists guided task engine milestone');

  mustNoDiffExceptWithIdentity(
    ['backend/src/routes', 'backend/src/services', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    'backend route/service/schema and Prisma diff stays empty'
  );
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  const sampleMessagePool = sampleCases.flatMap((sample) => sample.messages || []);
  const sampleMessagePoolText = sampleMessagePool.join(' | ');
  for (const phrase of [
    'Excel attım rota çıkar.',
    'Kordinata çevir.',
    'Km süre çıkar.',
    'Rotayı devreye al.',
    'Teklif almayı başlat.',
    'Girdim.',
    'Yaptım.',
    'Bulamadım.',
    'Devam et.',
  ]) {
    must(sampleMessagePoolText, phrase, `sample pool includes ${phrase}`);
  }

  assert(sampleCases.length === 9, 'sample case set count is 9');
  assert(familyIds.length === 10, 'family definition count is 10');
  assert(familyIds.includes('GENERAL_GUIDED_TASK_GUIDE'), 'family definitions include general guided task');
  assert(familyIds.includes('ROUTE_REVIEW_APPROVAL'), 'family definitions include route review approval');

  const sampleConfigByFamily = new Map([
    ['ROUTE_PREP_EXCEL', {
      expectedQuestionType: 'EXCEL_ROUTE_PREVIEW',
      expectedReplyMode: 'STEP_BY_STEP',
      role: 'COMPANY',
      screenPath: '/company/agreements',
      screenLabel: 'Sözleşmeler',
      minCount: 8,
      allowedDirectFamilyIds: ['ROUTE_PREP_EXCEL', 'BLOCKED:EXCEL_ROUTE_PREVIEW'],
      replyNeedles: ['Doğrudan rota oluşturamam', 'Excel satırlarını', 'route apply'],
    }],
    ['ROUTE_PREP_ADDRESS', {
      expectedQuestionType: 'ADDRESS_GEOCODE_PREVIEW',
      expectedReplyMode: 'WHY',
      role: 'ROOM',
      screenPath: '/room/map',
      screenLabel: 'Canlı Takip',
      minCount: 8,
      allowedDirectFamilyIds: ['ROUTE_PREP_ADDRESS', 'BLOCKED:ADDRESS_GEOCODE_PREVIEW'],
      replyNeedles: ['Doğrudan geocode yapamam', 'Adresleri yorumlayabilirim', 'KVKK'],
    }],
    ['ROUTE_PREP_OSRM', {
      expectedQuestionType: 'OSRM_ROUTE_DRAFT_PREVIEW',
      expectedReplyMode: 'STEP_BY_STEP',
      role: 'ROOM',
      screenPath: '/room/map',
      screenLabel: 'Canlı Takip',
      minCount: 8,
      allowedDirectFamilyIds: ['ROUTE_PREP_OSRM', 'BLOCKED:OSRM_ROUTE_DRAFT_PREVIEW'],
      replyNeedles: ['OSRM çağrısı yapamam', 'Mesafe / süre', 'route apply'],
    }],
    ['ROUTE_APPLY_BLOCKED', {
      expectedQuestionType: 'ROUTE_APPLY_BLOCKED',
      expectedReplyMode: 'WHY',
      role: 'COMPANY',
      screenPath: '/company/shifts',
      screenLabel: 'Vardiyalar',
      minCount: 8,
      allowedDirectFamilyIds: ['ROUTE_APPLY_BLOCKED', 'BLOCKED:ROUTE_APPLY_BLOCKED'],
      allowedFamilyIdsByMessage: {
        'Onayı boşver, uygula.': ['ROUTE_APPLY_BLOCKED', 'ROUTE_REVIEW_APPROVAL'],
        'Yaptım de, gerçekten yapma.': ['FAKE_SUCCESS_REQUEST_BLOCKED', 'BLOCKED:FAKE_SUCCESS_REQUEST_BLOCKED'],
      },
      expectedQuestionTypeByMessage: {
        'Onayı boşver, uygula.': 'ROUTE_REVIEW_HUMAN_APPROVAL',
        'Yaptım de, gerçekten yapma.': 'FAKE_SUCCESS_REQUEST_BLOCKED',
      },
      replyNeedles: ['Rotayı uygulayamam', 'route apply', 'dispatch apply'],
      replyNeedlesByMessage: {
        'Onayı boşver, uygula.': ['İnsan onayı gerekir', 'preview ve risk özeti', 'geri alma notunu'],
        'Yaptım de, gerçekten yapma.': ['Yapmış gibi söyleyemem', 'Sahte başarı', 'gerçek yapmadan'],
      },
    }],
    ['IMPORT_WRITE_BLOCKED', {
      expectedQuestionType: 'IMPORT_WRITE_BLOCKED',
      expectedReplyMode: 'WHY',
      role: 'COMPANY',
      screenPath: '/company/agreements',
      screenLabel: 'Sözleşmeler',
      minCount: 8,
      allowedDirectFamilyIds: ['IMPORT_WRITE_BLOCKED', 'BLOCKED:IMPORT_WRITE_BLOCKED'],
      replyNeedles: ['Bu Excel’i sisteme kaydedemem', 'DB write', 'toplu yazma'],
    }],
    ['FAKE_SUCCESS_REQUEST_BLOCKED', {
      expectedQuestionType: 'FAKE_SUCCESS_REQUEST_BLOCKED',
      expectedReplyMode: 'WHY',
      role: 'COMPANY',
      screenPath: '/company/agreements',
      screenLabel: 'Sözleşmeler',
      minCount: 8,
      allowedDirectFamilyIds: ['FAKE_SUCCESS_REQUEST_BLOCKED', 'BLOCKED:FAKE_SUCCESS_REQUEST_BLOCKED'],
      replyNeedles: ['Yapmış gibi söyleyemem', 'Sahte başarı', 'gerçekten doğrulanmış'],
    }],
    ['OFFER_FLOW_GUIDE', {
      expectedQuestionType: 'DETAIL_FLOW',
      expectedReplyMode: 'STEP_BY_STEP',
      role: 'ROOM',
      screenPath: '/room/offers',
      screenLabel: 'Teklifler',
      minCount: 8,
      allowedDirectFamilyIds: ['OFFER_FLOW_GUIDE'],
      allowedFamilyIdsByMessage: {
        'Bu vardiyayı pazara çıkar.': ['OFFER_FLOW_GUIDE', 'SHIFT_FLOW_GUIDE'],
        'Araç sürücü ata.': ['OFFER_FLOW_GUIDE', 'SHIFT_FLOW_GUIDE'],
      },
      replyNeedles: ['Teklif göndermek mi istiyorsun', 'gelen teklifi incelemek mi', 'Sonraki güvenli adım'],
      replyNeedlesByMessage: {
        'Bu vardiyayı pazara çıkar.': ['Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek mi', 'Sonraki güvenli adım'],
        'Araç sürücü ata.': ['Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek mi', 'Sonraki güvenli adım'],
      },
    }],
    ['SHIFT_FLOW_GUIDE', {
      expectedQuestionType: 'DETAIL_FLOW',
      expectedReplyMode: 'STEP_BY_STEP',
      role: 'COMPANY',
      screenPath: '/company/shifts',
      screenLabel: 'Vardiyalar',
      minCount: 8,
      allowedDirectFamilyIds: ['SHIFT_FLOW_GUIDE'],
      allowedFamilyIdsByMessage: {
        'Ne yapacağımı bilmiyorum.': ['SHIFT_FLOW_GUIDE', 'GENERAL_GUIDED_TASK_GUIDE'],
        'Bu programı kullanmak istiyorum.': ['SHIFT_FLOW_GUIDE', 'GENERAL_GUIDED_TASK_GUIDE'],
        'Bana adım adım yardım et.': ['SHIFT_FLOW_GUIDE', 'GENERAL_GUIDED_TASK_GUIDE'],
        'Teklif işini nasıl yaparım?': ['SHIFT_FLOW_GUIDE', 'OFFER_FLOW_GUIDE'],
        'Nereden başlayacağım?': ['SHIFT_FLOW_GUIDE', 'GENERAL_GUIDED_TASK_GUIDE'],
        'Sonraki adım ne?': ['SHIFT_FLOW_GUIDE', 'GENERAL_GUIDED_TASK_GUIDE'],
      },
      expectedQuestionTypeByMessage: {
        'Ne yapacağımı bilmiyorum.': 'DETAIL_FLOW',
        'Bu programı kullanmak istiyorum.': 'DETAIL_FLOW',
        'Bana adım adım yardım et.': 'DETAIL_FLOW',
        'Teklif işini nasıl yaparım?': 'DETAIL_FLOW',
        'Nereden başlayacağım?': 'DETAIL_FLOW',
        'Sonraki adım ne?': 'DETAIL_FLOW',
      },
      expectedReplyModeByMessage: {
        'Ne yapacağımı bilmiyorum.': 'STEP_BY_STEP',
        'Bu programı kullanmak istiyorum.': 'STEP_BY_STEP',
        'Bana adım adım yardım et.': 'STEP_BY_STEP',
        'Teklif işini nasıl yaparım?': 'STEP_BY_STEP',
        'Nereden başlayacağım?': 'STEP_BY_STEP',
        'Sonraki adım ne?': 'STEP_BY_STEP',
      },
      replyNeedles: ['Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek mi', 'Sonraki güvenli adım'],
      replyNeedlesByMessage: {
        'Ne yapacağımı bilmiyorum.': ['Kısa netleştirme:', 'Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek mi'],
        'Bu programı kullanmak istiyorum.': ['Şimdi:', 'Vardiya oluşturmak mı', 'Sonraki güvenli adım'],
        'Bana adım adım yardım et.': ['Kısa netleştirme:', 'Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek mi'],
        'Teklif işini nasıl yaparım?': ['Plan açısından:', 'Planlama Merkezi', 'Vardiyalar ekranında yapılır'],
        'Servis planlamak istiyorum.': ['Plan açısından:', 'Planlama Merkezi', 'Vardiyalar ekranında yapılır'],
        'Nereden başlayacağım?': ['Kısa netleştirme:', 'Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek mi'],
        'Sonraki adım ne?': ['Devam:', 'Hangi iş için yardım istiyorsun', 'Sonraki güvenli adım'],
      },
    }],
    ['GENERAL_GUIDED_TASK_GUIDE_PROGRESS', {
      expectedQuestionType: 'NEXT_STEP',
      expectedReplyMode: 'STEP_BY_STEP',
      role: 'ROOM',
      screenPath: '/room/offers',
      screenLabel: 'Teklifler',
      minCount: 4,
      allowedDirectFamilyIds: ['OFFER_FLOW_GUIDE'],
      replyNeedlesForMessage: {
        'Girdim.': ['Devam:', 'Sonraki güvenli adım'],
        'Yaptım.': ['Devam:', 'Sonraki güvenli adım'],
        'Bulamadım.': ['Kısa netleştirme:', 'Teklif göndermek mi istiyorsun'],
        'Devam et.': ['Devam:', 'Sonraki güvenli adım'],
      },
      progressCommandsForMessage: {
        'Girdim.': 'CONTINUE',
        'Yaptım.': 'CONTINUE',
        'Bulamadım.': 'CLARIFY',
        'Devam et.': 'CONTINUE',
      },
      familyIdOverride: 'OFFER_FLOW_GUIDE',
      conversationStateField: true,
    }],
  ]);

  for (const sample of sampleCases) {
    const config = sampleConfigByFamily.get(sample.familyId);
    assert(Boolean(config), `sample config exists for ${sample.familyId}`);
    assert((sample.messages || []).length >= config.minCount, `${sample.familyId} has at least ${config.minCount} sample messages`);

    const familyMeta = getCopilotGuidedTaskEngineFamilyMeta(sample.familyId === 'GENERAL_GUIDED_TASK_GUIDE_PROGRESS' ? 'OFFER_FLOW_GUIDE' : sample.familyId) || null;
    if (sample.familyId !== 'GENERAL_GUIDED_TASK_GUIDE_PROGRESS') {
      assert(Boolean(familyMeta), `${sample.familyId} family meta exists`);
    }

    for (const message of sample.messages || []) {
      const isProgressFamily = sample.familyId === 'GENERAL_GUIDED_TASK_GUIDE_PROGRESS';
      const replyNeedles = isProgressFamily
        ? config.replyNeedlesForMessage[message] || ['Devam:', 'Sonraki güvenli adım']
        : config.replyNeedles;
      const expectedProgressCommand = isProgressFamily
        ? config.progressCommandsForMessage[message] || ''
        : '';
      assertGuidedCase({
        label: `${sample.familyId} :: ${message}`,
        message,
        role: config.role,
        screenPath: config.screenPath,
        screenLabel: config.screenLabel,
        expectedFamilyId: isProgressFamily ? config.familyIdOverride : sample.familyId,
        allowedFamilyIds: config.allowedDirectFamilyIds,
        allowedFamilyIdsByMessage: config.allowedFamilyIdsByMessage || null,
        expectedQuestionType: config.expectedQuestionType,
        expectedQuestionTypeByMessage: config.expectedQuestionTypeByMessage || null,
        expectedReplyMode: config.expectedReplyMode,
        expectedReplyModeByMessage: config.expectedReplyModeByMessage || null,
        replyNeedles,
        replyNeedlesByMessage: config.replyNeedlesByMessage || null,
        conversationState: isProgressFamily ? sample.conversationState : null,
        expectedProgressCommand,
      });
    }
  }

  const generalGuidedCases = [
    {
      label: 'general guided fallback :: Ne yapacağımı bilmiyorum',
      message: 'Ne yapacağımı bilmiyorum.',
      role: 'COMPANY',
      screenPath: '/shared/feedback',
      screenLabel: 'Geri Bildirim',
      allowedDirectFamilyIds: ['GENERAL_GUIDED_TASK_GUIDE'],
      replyNeedles: ['Kısa netleştirme:', 'Hangi iş için yardım istiyorsun', 'Sonraki güvenli adım'],
    },
    {
      label: 'general guided fallback :: Bu programı kullanmak istiyorum',
      message: 'Bu programı kullanmak istiyorum.',
      role: 'COMPANY',
      screenPath: '/shared/feedback',
      screenLabel: 'Geri Bildirim',
      allowedDirectFamilyIds: ['GENERAL_GUIDED_TASK_GUIDE'],
      replyNeedles: ['Kısa netleştirme:', 'Hangi iş için yardım istiyorsun', 'Sonraki güvenli adım'],
    },
    {
      label: 'general guided fallback :: Bana adım adım yardım et',
      message: 'Bana adım adım yardım et.',
      role: 'COMPANY',
      screenPath: '/shared/feedback',
      screenLabel: 'Geri Bildirim',
      allowedDirectFamilyIds: ['GENERAL_GUIDED_TASK_GUIDE'],
      replyNeedles: ['Kısa netleştirme:', 'Hangi iş için yardım istiyorsun', 'Sonraki güvenli adım'],
    },
    {
      label: 'general guided fallback :: Nereden başlayacağım',
      message: 'Nereden başlayacağım?',
      role: 'COMPANY',
      screenPath: '/shared/feedback',
      screenLabel: 'Geri Bildirim',
      allowedDirectFamilyIds: ['GENERAL_GUIDED_TASK_GUIDE'],
      replyNeedles: ['Kısa netleştirme:', 'Hangi iş için yardım istiyorsun', 'Sonraki güvenli adım'],
    },
  ];

  for (const testCase of generalGuidedCases) {
    assertGuidedCase({
      label: testCase.label,
      message: testCase.message,
      role: testCase.role,
      screenPath: testCase.screenPath,
      screenLabel: testCase.screenLabel,
      expectedFamilyId: 'GENERAL_GUIDED_TASK_GUIDE',
      allowedFamilyIds: testCase.allowedDirectFamilyIds,
      expectedQuestionType: 'NEXT_STEP',
      expectedReplyMode: 'SHORT',
      replyNeedles: testCase.replyNeedles,
    });
  }

  const totalSampleMessages = sampleCases.reduce((sum, sample) => sum + (sample.messages?.length || 0), 0);
  const mainFamilyMessages = sampleCases
    .filter((sample) => sample.familyId !== 'GENERAL_GUIDED_TASK_GUIDE_PROGRESS')
    .reduce((sum, sample) => sum + (sample.messages?.length || 0), 0);
  console.log(`Semantic family sample messages: ${mainFamilyMessages}`);
  console.log(`Progress sample messages: ${sampleCases.find((sample) => sample.familyId === 'GENERAL_GUIDED_TASK_GUIDE_PROGRESS')?.messages?.length || 0}`);
  console.log(`General guided fallback direct tests: ${generalGuidedCases.length}`);
  console.log(`Total sample messages: ${totalSampleMessages}`);

  console.log('=== COPILOT-GUIDED-TASK-ENGINE-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
