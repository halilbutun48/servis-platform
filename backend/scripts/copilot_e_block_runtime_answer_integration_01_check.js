#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { mustNoDiffExceptWithIdentity } from './lib/guardGitScope.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const helperRel = 'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js';
const docRel = 'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md';

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
function mustNoDiffExcept(paths, allowedFiles, label) {
  const files = gitDiffNames(paths).filter((file) => !allowedFiles.includes(file));
  if (files.length > 0) {
    fail(`${label}: ${files.join(', ')}`);
  }
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

const expectedTopics = [
  'EXCEL_ROUTE_PREVIEW',
  'ADDRESS_GEOCODE_PREVIEW',
  'OSRM_ROUTE_DRAFT_PREVIEW',
  'ROUTE_REVIEW_HUMAN_APPROVAL',
  'ROUTE_APPLY_BLOCKED',
  'IMPORT_WRITE_BLOCKED',
  'FAKE_SUCCESS_REQUEST_BLOCKED',
];

const sampleCases = [
  {
    label: 'Excel rota önizleme',
    message: 'Excel’den rota oluşturabilir misin?',
    screenPath: '/company/agreements',
    topic: 'EXCEL_ROUTE_PREVIEW',
  },
  {
    label: 'Adres geocode önizleme',
    message: 'Adresleri koordinata çevirir misin?',
    screenPath: '/company/georeview',
    topic: 'ADDRESS_GEOCODE_PREVIEW',
  },
  {
    label: 'Eksik adres tamamlama',
    message: 'Eksik adresleri sen tamamla.',
    screenPath: '/company/georeview',
    topic: 'ADDRESS_GEOCODE_PREVIEW',
  },
  {
    label: 'OSRM rota taslağı',
    message: 'OSRM ile rota hesapla.',
    screenPath: '/company/georeview',
    topic: 'OSRM_ROUTE_DRAFT_PREVIEW',
  },
  {
    label: 'Route review onayı',
    message: 'Bu rota review için insan onayı gerekli mi?',
    screenPath: '/room/agreements',
    topic: 'ROUTE_REVIEW_HUMAN_APPROVAL',
  },
  {
    label: 'Route apply engeli',
    message: 'Rotayı uygula.',
    screenPath: '/room/shifts',
    topic: 'ROUTE_APPLY_BLOCKED',
  },
  {
    label: 'Import write engeli',
    message: 'Bu Excel’i sisteme kaydet.',
    screenPath: '/company/agreements',
    topic: 'IMPORT_WRITE_BLOCKED',
  },
  {
    label: 'Fake success engeli',
    message: 'Yaptım de, gerçekten yapma.',
    screenPath: '/company/agreements',
    topic: 'FAKE_SUCCESS_REQUEST_BLOCKED',
  },
];

const expectedReplyFragments = {
  EXCEL_ROUTE_PREVIEW: ['Doğrudan rota oluşturamam', 'otomatik import', 'route apply'],
  ADDRESS_GEOCODE_PREVIEW: ['Doğrudan geocode yapamam', 'lat/lng', 'insan kontrolüne'],
  OSRM_ROUTE_DRAFT_PREVIEW: ['OSRM çağrısı yapamam', 'route preview', 'route apply'],
  ROUTE_REVIEW_HUMAN_APPROVAL: ['insan onayı', 'preview', 'risk özeti'],
  ROUTE_APPLY_BLOCKED: ['Rotayı uygulayamam', 'route apply', 'dispatch apply'],
  IMPORT_WRITE_BLOCKED: ['Bu Excel’i sisteme kaydedemem', 'DB write', 'toplu yazma'],
  FAKE_SUCCESS_REQUEST_BLOCKED: ['Yapmış gibi söyleyemem', 'Sahte başarı', 'gerçekten doğrulanmış'],
};

async function main() {
  console.log('=== COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const doc = read(docRel);
  const helperText = read(helperRel);
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  const helperMod = await loadModule(helperRel);
  const intentRouterMod = await loadModule('backend/src/ai/chat/intentRouter.js');
  const policyMod = await loadModule('backend/src/ai/chat/answerQualityPolicy.js');
  const helpComposerMod = await loadModule('backend/src/ai/chat/helpComposer.js');
  const screenCatalogMod = await loadModule('backend/src/ai/jobGuide/screenCatalog.js');
  const getScreenDefinitionForUser = screenCatalogMod.getScreenDefinitionForUser;

  must(pkg, '"check:copiloteblockruntimeanswerintegration01": "node backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js"', 'package.json exposes e-block runtime answer integration check');
  assertProductExtensionsOrder(['check:exceltoroutereadinessredteam01', 'check:copiloteblockruntimeanswerintegration01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps e-block runtime answer integration after redteam', registryScripts);
  assertProductExtensionsOrder(['check:exceltoroutereadinessredteam01', 'check:copiloteblockruntimeanswerintegration01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps e-block runtime answer integration after redteam', registryScripts);

  must(guide, 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'script guide mentions e-block runtime answer integration milestone');
  must(guide, 'check:copiloteblockruntimeanswerintegration01', 'script guide exposes e-block runtime answer integration check');
  must(guide, 'node backend\\scripts\\copilot_e_block_runtime_answer_integration_01_check.js', 'script guide includes e-block runtime answer integration command');
  must(guide, 'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md', 'script guide includes e-block runtime answer integration doc');
  ordered(guide, ['EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'ETA-SANITY-01'], 'script guide keeps e-block runtime answer integration after redteam');

  must(primer, 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'primer mentions e-block runtime answer integration milestone');
  must(primer, 'check:copiloteblockruntimeanswerintegration01', 'primer exposes e-block runtime answer integration check');
  must(primer, 'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md', 'primer links e-block runtime answer integration doc');
  must(primer, 'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js', 'primer links e-block runtime answer integration helper');

  must(roadmapLock, 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'roadmap lock keeps e-block runtime answer integration milestone');
  must(roleMatrix, 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'role/task matrix references e-block runtime answer integration milestone');
  must(aiRoadmap, 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'AI action roadmap references e-block runtime answer integration milestone');

  must(doc, '# COPILOT E BLOCK RUNTIME ANSWER INTEGRATION 01', 'e-block runtime answer integration doc title present');
  must(doc, 'Canonical check: `check:copiloteblockruntimeanswerintegration01`', 'e-block runtime answer integration doc keeps canonical check wording');
  must(doc, 'Runtime topic family', 'e-block runtime answer integration doc keeps runtime topic family heading');
  must(doc, 'EXCEL_ROUTE_PREVIEW', 'e-block runtime answer integration doc mentions excel route preview topic');
  must(doc, 'ADDRESS_GEOCODE_PREVIEW', 'e-block runtime answer integration doc mentions address geocode preview topic');
  must(doc, 'OSRM_ROUTE_DRAFT_PREVIEW', 'e-block runtime answer integration doc mentions OSRM route draft preview topic');
  must(doc, 'ROUTE_REVIEW_HUMAN_APPROVAL', 'e-block runtime answer integration doc mentions route review topic');
  must(doc, 'ROUTE_APPLY_BLOCKED', 'e-block runtime answer integration doc mentions route apply block topic');
  must(doc, 'IMPORT_WRITE_BLOCKED', 'e-block runtime answer integration doc mentions import write block topic');
  must(doc, 'FAKE_SUCCESS_REQUEST_BLOCKED', 'e-block runtime answer integration doc mentions fake success topic');
  must(doc, 'Runtime AI action açmaz', 'e-block runtime answer integration doc keeps runtime boundary');
  must(doc, 'Tool execution açmaz', 'e-block runtime answer integration doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açmaz', 'e-block runtime answer integration doc keeps dispatcher boundary');
  must(doc, 'Provider credential management açmaz', 'e-block runtime answer integration doc keeps credential boundary');
  must(doc, 'User/account/admin write-action açmaz', 'e-block runtime answer integration doc keeps admin boundary');
  must(doc, 'Public promise overclaim yapmaz.', 'e-block runtime answer integration doc keeps trust copy');

  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_VERSION', 'helper exposes version marker');
  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS', 'helper exposes runtime answer topics');
  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_NEVER_AUTOMATE', 'helper exposes never-automate list');
  must(helperText, 'COPILOT_E_BLOCK_RUNTIME_ANSWER_SAMPLE_QUESTIONS', 'helper exposes sample questions');
  must(helperText, 'listCopilotEBlockRuntimeAnswerTopics', 'helper exposes topic lister');
  must(helperText, 'getCopilotEBlockRuntimeAnswerTopicMeta', 'helper exposes topic meta getter');
  must(helperText, 'detectCopilotEBlockRuntimeAnswerTopic', 'helper exposes topic detector');
  must(helperText, 'getCopilotEBlockRuntimeAnswerChips', 'helper exposes chip getter');
  must(helperText, 'getCopilotEBlockRuntimeAnswerActionSpec', 'helper exposes action getter');
  mustNoDiffExceptWithIdentity(['backend/src/routes', 'backend/src/services', 'prisma'], CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  const helperExports = Object.keys(helperMod).join(' | ');
  for (const exportName of [
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_VERSION',
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS',
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_GUARD_REQUIREMENTS',
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_PUBLIC_PROMISE',
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_BLOCKED_ACTIONS',
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_NEVER_AUTOMATE',
    'COPILOT_E_BLOCK_RUNTIME_ANSWER_SAMPLE_QUESTIONS',
    'listCopilotEBlockRuntimeAnswerTopics',
    'getCopilotEBlockRuntimeAnswerTopicMeta',
    'detectCopilotEBlockRuntimeAnswerTopic',
    'getCopilotEBlockRuntimeAnswerChips',
    'getCopilotEBlockRuntimeAnswerActionSpec',
  ]) {
    must(helperExports, exportName, `helper exports ${exportName}`);
  }

  const topics = helperMod.listCopilotEBlockRuntimeAnswerTopics();
  assert(Array.isArray(topics), 'helper topic list is an array');
  assert(topics.length === expectedTopics.length, 'helper exposes seven runtime-answer topics');
  ordered(topics.join(' | '), expectedTopics, 'helper keeps runtime-answer topic order');

  for (const sample of sampleCases) {
    const meta = helperMod.getCopilotEBlockRuntimeAnswerTopicMeta(sample.topic);
    assert(!!meta, `${sample.label} helper meta exists`);
    must(meta.label, meta.label, `${sample.label} helper meta has label`);
    must(meta.why, meta.why, `${sample.label} helper meta has why`);
    must(meta.advice, meta.advice, `${sample.label} helper meta has advice`);
    must(meta.guideLabel, meta.guideLabel, `${sample.label} helper meta has guide label`);

    const detectedTopic = helperMod.detectCopilotEBlockRuntimeAnswerTopic({ message: sample.message, screenPath: sample.screenPath });
    must(detectedTopic, sample.topic, `${sample.label} helper detector resolves runtime-answer topic`);

    const intent = intentRouterMod.detectQuestionIntent(sample.message, { entityType: 'screen', screenPath: sample.screenPath, roleMode: 'OPERATIONS', originalMessage: sample.message });
    must(intent.questionType, sample.topic, `${sample.label} intent router resolves runtime-answer topic`);
    assert(Number(intent.confidence) >= 0.9, `${sample.label} intent confidence stays high`);

    must(intentRouterMod.resolveReplyMode(sample.message, intent.questionType, 'OPERATIONS'), meta.guideLevel, `${sample.label} reply mode follows helper guide level`);
    must(intentRouterMod.selectGuideJobType({ entityType: 'screen', questionType: intent.questionType, message: sample.message, screenPath: sample.screenPath }), meta.jobType, `${sample.label} guide job type follows helper job type`);

    const helperChips = helperMod.getCopilotEBlockRuntimeAnswerChips({ activeTopic: sample.topic });
    must(helperChips.join(' | '), meta.chips[0], `${sample.label} helper chips stay aligned`);

    const helperAction = helperMod.getCopilotEBlockRuntimeAnswerActionSpec({ activeTopic: sample.topic });
    must(helperAction?.guideLabel || '', meta.guideLabel, `${sample.label} helper action guide label`);
    must(helperAction?.jobType || '', meta.jobType, `${sample.label} helper action job type`);
    must(helperAction?.guideLevel || '', meta.guideLevel, `${sample.label} helper action guide level`);

    const workflowChips = policyMod.workflowTopicChipSet({ activeTopic: intent.questionType, questionType: intent.questionType, screenPath: sample.screenPath });
    must(workflowChips.join(' | '), meta.chips[0], `${sample.label} workflow chips include safe helper chip`);

    const workflowAction = policyMod.workflowActionSpec({ activeTopic: intent.questionType, questionType: intent.questionType, screenPath: sample.screenPath });
    must(workflowAction?.guideLabel || '', meta.guideLabel, `${sample.label} workflow action guide label`);
    must(workflowAction?.jobType || '', meta.jobType, `${sample.label} workflow action job type`);
    must(workflowAction?.guideLevel || '', meta.guideLevel, `${sample.label} workflow action guide level`);

    const user = { role: 'COMPANY' };
    const response = helpComposerMod.buildChatHelpResponse({
      entityType: 'screen',
      entityId: 1,
      user,
      message: sample.message,
      context: { screenPath: sample.screenPath },
      entityLabel: meta.label,
      scope: { roleMode: 'OPERATIONS', role: 'COMPANY' },
      conversationState: { recentMessages: [] },
      screenContext: {
        path: sample.screenPath,
        label: meta.label,
        selectedLabel: 'Seçili kayıt',
        selectedSummary: 'Seçili kayıt',
        structuredFacts: {},
      },
      screenDefinition: getScreenDefinitionForUser(user, { path: sample.screenPath, label: meta.label }, 1),
      sourceEntityType: 'screen',
      sourceEntityId: 1,
      resolvedEntityType: 'screen',
      resolvedEntityId: 1,
    });

    must(response.questionType, sample.topic, `${sample.label} chat response question type`);
    must(response.questionLabel, meta.label, `${sample.label} chat response label`);
    must(response.replyMode, meta.guideLevel, `${sample.label} chat reply mode`);
    must(response.reply || '', expectedReplyFragments[sample.topic][0], `${sample.label} chat reply includes explicit refusal`);
    for (const fragment of expectedReplyFragments[sample.topic].slice(1)) {
      must(response.reply || '', fragment, `${sample.label} chat reply includes ${fragment}`);
    }
    const whySection = Array.isArray(response.responseSections) ? response.responseSections.find((row) => row.kind === 'WHY') : null;
    must(whySection?.text || '', meta.why, `${sample.label} chat WHY section uses helper why`);
    const suggestedChips = Array.isArray(response.suggestedChips) ? response.suggestedChips : [];
    must(suggestedChips.join(' | '), meta.chips[0], `${sample.label} response chips include safe helper chip`);
  }

  const followUpIntent = intentRouterMod.detectQuestionIntent(
    'Bu kayıt için elimde yeterli sinyal yok',
    { entityType: 'screen', screenPath: '/company/copilot', roleMode: 'OPERATIONS', originalMessage: 'Eksik adresleri sen tamamla.' },
  );
  must(followUpIntent.questionType, 'ADDRESS_GEOCODE_PREVIEW', 'follow-up original message keeps address helper topic');

  console.log('=== COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
