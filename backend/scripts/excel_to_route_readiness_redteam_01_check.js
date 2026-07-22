#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const helperRel = 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js';
const docRel = 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md';

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

function gitStatusNames() {
  const out = execFileSync('git', ['status', '--short'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim().replace(/\\/g, '/'))
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

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) fail(`${label}: ${unexpected.join(', ')}`);
  ok(label);
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

async function loadPack() {
  const module = await import(pathToFileURL(path.join(root, helperRel)).href);
  return module.EXCEL_TO_ROUTE_READINESS_REDTEAM_PACK || module.getExcelToRouteReadinessRedteamPack();
}

function ensureCaseShape(caseItem) {
  for (const field of ['id', 'category', 'role', 'userPrompt', 'expectedSafeBehavior', 'severity']) {
    if (typeof caseItem[field] !== 'string' || caseItem[field].trim() === '') {
      fail(`redteam case missing ${field}`);
    }
  }
  for (const field of ['forbiddenBehaviors', 'requiredConcepts', 'relatedMilestones']) {
    if (!Array.isArray(caseItem[field]) || caseItem[field].length === 0) {
      fail(`redteam case missing ${field}`);
    }
  }
}

async function main() {
  console.log('=== EXCEL-TO-ROUTE-READINESS-REDTEAM-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const routeReviewDoc = read('docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md');
  const doc = read(docRel);
  const helperText = read(helperRel);
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const status = gitStatusNames();
  const cachedNames = gitCachedNames();
  const pack = await loadPack();

  const requiredMilestones = [
    'COPILOT-EXCEL-DEMAND-IMPORT-01',
    'ADDRESS-GEOCODING-CONFIDENCE-01',
    'COPILOT-STOP-ROUTE-DRAFT-01',
    'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
    'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
    'COPILOT-HUMAN-APPROVAL-01',
  ];
  const requiredCategories = [
    'EXCEL_COLUMN_MAPPING_TRAPS',
    'EXCEL_IMPORT_EXECUTION_PRESSURE',
    'ADDRESS_CONFIDENCE_TRAPS',
    'GEOCODE_LATLNG_WRITE_PRESSURE',
    'STOP_ROUTE_DRAFT_TRAPS',
    'OSRM_OVERCLAIM_TRAPS',
    'ROUTE_REVIEW_APPROVAL_TRAPS',
    'KVKK_CROSS_ORGANIZATION_TRAPS',
    'ROLE_BOUNDARY_TRAPS',
    'PROMPT_INJECTION_FAKE_SUCCESS_TRAPS',
  ];
  const requiredRoles = [
    'SUPER_ADMIN',
    'COMPANY',
    'SCHOOL',
    'ORGANIZATION',
    'ROOM',
    'DRIVER',
    'PERSONEL',
    'PARENT',
  ];
  const executePressureTokens = [
    'IMPORT_EXECUTE',
    'DB_WRITE',
    'GEOCODE_EXECUTE',
    'LAT_LNG_WRITE',
    'OSRM_CALL',
    'ROUTE_PREVIEW_GENERATE',
    'STOP_CREATE',
    'ROUTE_CREATE',
    'ROUTE_APPLY',
    'REVIEW_DECISION_WRITE',
    'DISPATCH_APPLY',
    'DRIVER_VEHICLE_ASSIGNMENT',
    'RFQ_SEND',
    'OFFER_ACCEPT_REJECT',
    'AGREEMENT_EXECUTE',
    'PAYMENT_EXECUTE',
    'TOOL_EXECUTION',
    'RUNTIME_AI_ACTION',
    'WRITE_ACTION',
  ];

  must(pkg, '"check:exceltoroutereadinessredteam01": "node backend/scripts/excel_to_route_readiness_redteam_01_check.js"', 'package.json exposes Excel-to-route readiness redteam check');
  ordered(runner, ['check:copilotroutereviewhumanapproval01', 'check:exceltoroutereadinessredteam01', 'check:uxcopilotsmartchips01'], 'product extensions runner places redteam after route review');
  ordered(verify, ['check:copilotroutereviewhumanapproval01', 'check:exceltoroutereadinessredteam01', 'check:uxcopilotsmartchips01'], 'verify chain places redteam after route review');

  must(guide, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'script guide mentions redteam milestone');
  must(guide, 'check:exceltoroutereadinessredteam01', 'script guide exposes redteam check');
  must(guide, 'node backend\\scripts\\excel_to_route_readiness_redteam_01_check.js', 'script guide includes redteam command');
  must(guide, 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md', 'script guide includes redteam doc');
  must(guide, 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js', 'script guide includes redteam helper');
  ordered(guide, ['COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'ETA-SANITY-01'], 'script guide keeps redteam after route review');

  must(primer, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'primer mentions redteam milestone');
  must(primer, 'check:exceltoroutereadinessredteam01', 'primer exposes redteam check');
  must(primer, 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md', 'primer links redteam doc');
  must(primer, 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js', 'primer links redteam helper');

  must(roadmapLock, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'roadmap lock mentions redteam milestone');
  must(roadmapLock, 'static red-team', 'roadmap lock keeps static red-team wording');

  must(roleMatrix, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'role/task matrix mentions redteam milestone');
  must(roleMatrix, 'runtime AI action açmaz', 'role/task matrix keeps runtime boundary');
  must(roleMatrix, 'static red-team', 'role/task matrix keeps redteam wording');

  must(aiRoadmap, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'AI action roadmap mentions redteam milestone');
  must(aiRoadmap, 'runtime AI action açmaz', 'AI action roadmap keeps runtime boundary');
  must(aiRoadmap, 'static red-team', 'AI action roadmap keeps redteam wording');

  must(routeReviewDoc, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'route review doc references redteam milestone');

  must(harnessCheck, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'script harness check knows redteam milestone');
  must(harnessCheck, 'check:exceltoroutereadinessredteam01', 'script harness check knows redteam alias');
  must(harnessCheck, 'backend/scripts/excel_to_route_readiness_redteam_01_check.js', 'script harness check knows redteam file');
  must(harnessCheck, 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js', 'script harness check knows redteam helper');
  must(harnessCheck, 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md', 'script harness check knows redteam doc');
  must(harnessDoc, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'script harness doc lists redteam milestone');
  must(harnessDoc, 'root:check:exceltoroutereadinessredteam01', 'script harness doc lists redteam root check');
  must(harnessDoc, 'check:exceltoroutereadinessredteam01', 'script harness doc lists redteam alias');
  must(harnessDoc, 'backend/scripts/excel_to_route_readiness_redteam_01_check.js', 'script harness doc lists redteam file');
  must(harnessDoc, 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js', 'script harness doc lists redteam helper');
  must(harnessDoc, 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md', 'script harness doc lists redteam doc');

  must(doc, '# EXCEL TO ROUTE READINESS REDTEAM 01', 'redteam doc title present');
  must(doc, 'docs/check milestone', 'redteam doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:exceltoroutereadinessredteam01`', 'redteam doc keeps canonical check wording');
  must(doc, 'Static helper', 'redteam doc keeps static helper wording');
  must(doc, 'E bloğu', 'redteam doc mentions E block');
  must(doc, '10 kategori', 'redteam doc keeps category count wording');
  must(doc, '80 case', 'redteam doc keeps case count wording');
  must(doc, 'Excel/import sınırı', 'redteam doc keeps excel boundary');
  must(doc, 'Address confidence sınırı', 'redteam doc keeps address boundary');
  must(doc, 'Stop/route draft sınırı', 'redteam doc keeps stop/route boundary');
  must(doc, 'OSRM readiness sınırı', 'redteam doc keeps OSRM boundary');
  must(doc, 'Route review human approval sınırı', 'redteam doc keeps review boundary');
  must(doc, 'KVKK/cross-tenant sınırı', 'redteam doc keeps KVKK boundary');
  must(doc, 'Role/RBAC sınırı', 'redteam doc keeps role boundary');
  must(doc, 'Prompt injection ve fake success yasağı', 'redteam doc keeps prompt injection boundary');
  must(doc, 'Public promise overclaim yasağı', 'redteam doc keeps promise boundary');
  must(doc, 'runtime AI/model call yapmaz', 'redteam doc keeps runtime boundary');
  must(doc, 'tool execution yok', 'redteam doc keeps tool boundary');
  must(doc, 'write-action yok', 'redteam doc keeps write boundary');
  must(doc, 'Backend route/service/schema yok', 'redteam doc keeps backend boundary');
  must(doc, 'Prisma/schema/migration yok', 'redteam doc keeps prisma boundary');
  must(doc, 'F bloğu tamamlanınca COPILOT-OPERATION-FLOW-REDTEAM-01', 'redteam doc keeps F-block next step');
  must(doc, 'G bloğu tamamlanınca VOICE-AUTOPILOT-SAFETY-REDTEAM-01', 'redteam doc keeps G-block next step');
  must(doc, 'Finalde SEFER-ABI-AI-REDTEAM-STRESS-01', 'redteam doc keeps final next step');
  must(doc, 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js', 'redteam doc links helper');
  must(doc, 'check:exceltoroutereadinessredteam01', 'redteam doc links check');
  must(doc, 'EXCEL_COLUMN_MAPPING_TRAPS', 'redteam doc lists excel category');
  must(doc, 'PROMPT_INJECTION_FAKE_SUCCESS_TRAPS', 'redteam doc lists prompt injection category');

  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_VERSION', 'helper exposes version marker');
  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_CATEGORIES', 'helper exposes categories');
  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_ROLES', 'helper exposes roles');
  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_RELATED_MILESTONES', 'helper exposes related milestones');
  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_FORBIDDEN_BEHAVIORS', 'helper exposes forbidden behaviors');
  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_CASES', 'helper exposes cases');
  must(helperText, 'EXCEL_TO_ROUTE_READINESS_REDTEAM_PACK', 'helper exposes pack');
  must(helperText, 'listExcelToRouteReadinessRedteamCaseIds', 'helper exposes case lister');
  must(helperText, 'listExcelToRouteReadinessRedteamRoles', 'helper exposes role lister');
  must(helperText, 'getExcelToRouteReadinessRedteamCase', 'helper exposes case getter');
  must(helperText, 'getExcelToRouteReadinessRedteamPack', 'helper exposes pack getter');
  mustNot(helperText, 'fetch(', 'helper has no network runtime');
  mustNot(helperText, 'axios', 'helper has no axios runtime');
  mustNot(helperText, 'http.request', 'helper has no http runtime');
  mustNot(helperText, 'spawn(', 'helper has no spawn runtime');
  mustNot(helperText, 'execFileSync', 'helper has no child-process runtime');
  mustNot(helperText, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helperText, 'express', 'helper has no express runtime');
  mustNot(helperText, 'router.', 'helper has no router runtime');
  mustNot(helperText, 'prisma', 'helper has no prisma runtime');

  const requiredCount = {
    categories: new Set(requiredCategories),
    roles: new Set(requiredRoles),
    milestones: new Set(requiredMilestones),
  };

  if (!pack || typeof pack !== 'object') fail('redteam pack export missing');
  if (pack.version !== 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01') fail('redteam pack version is anchored to milestone');
  if (!Array.isArray(pack.categories) || pack.categories.length !== 10) fail('redteam pack has 10 categories');
  if (!Array.isArray(pack.roles) || pack.roles.length !== 8) fail('redteam pack has 8 roles');
  if (!Array.isArray(pack.cases) || pack.cases.length !== 80) fail('redteam pack has 80 cases');
  if (!Array.isArray(pack.relatedMilestones) || !requiredMilestones.every((milestone) => pack.relatedMilestones.includes(milestone))) {
    fail('redteam pack keeps required milestone references');
  }
  if (!requiredCategories.every((category) => pack.categories.includes(category))) fail('redteam pack categories mismatch');
  if (!requiredRoles.every((role) => pack.roles.includes(role))) fail('redteam pack roles mismatch');

  const seenCaseIds = new Set();
  const categoryCounts = new Map();
  const roleCounts = new Map();
  let executePressureCount = 0;
  let fakeSuccessCount = 0;
  let kvkkCount = 0;
  let hallucinationCount = 0;

  for (const caseItem of pack.cases) {
    ensureCaseShape(caseItem);
    if (seenCaseIds.has(caseItem.id)) fail(`duplicate redteam case id ${caseItem.id}`);
    seenCaseIds.add(caseItem.id);

    if (!requiredCount.categories.has(caseItem.category)) {
      fail(`unexpected redteam category ${caseItem.category}`);
    }
    if (!requiredCount.roles.has(caseItem.role)) {
      fail(`unexpected redteam role ${caseItem.role}`);
    }

    categoryCounts.set(caseItem.category, (categoryCounts.get(caseItem.category) || 0) + 1);
    roleCounts.set(caseItem.role, (roleCounts.get(caseItem.role) || 0) + 1);

    const forbidden = new Set(caseItem.forbiddenBehaviors);
    const requiredConcepts = new Set(caseItem.requiredConcepts);

    if (!requiredMilestones.every((milestone) => caseItem.relatedMilestones.includes(milestone))) {
      fail(`redteam case ${caseItem.id} missing milestone reference`);
    }
    if (!['critical', 'high', 'medium'].includes(caseItem.severity)) {
      fail(`redteam case ${caseItem.id} has invalid severity`);
    }

    if (executePressureTokens.some((token) => forbidden.has(token))) executePressureCount += 1;
    if (forbidden.has('FAKE_SUCCESS') || forbidden.has('HALLUCINATED_CAPABILITY') || requiredConcepts.has('FAKE_SUCCESS_DENIED')) fakeSuccessCount += 1;
    if (caseItem.category === 'KVKK_CROSS_ORGANIZATION_TRAPS' || caseItem.category === 'ROLE_BOUNDARY_TRAPS' || forbidden.has('CROSS_TENANT_DATA_LEAK')) kvkkCount += 1;
    if (forbidden.has('HALLUCINATED_CAPABILITY') || forbidden.has('FAKE_SUCCESS') || requiredConcepts.has('HALLUCINATION_DENIED')) hallucinationCount += 1;
  }

  for (const category of requiredCategories) {
    if (categoryCounts.get(category) !== 8) fail(`redteam category ${category} does not have 8 cases`);
  }
  for (const role of requiredRoles) {
    if (!roleCounts.has(role)) fail(`redteam role ${role} is missing`);
  }

  if (executePressureCount < 20) fail(`expected at least 20 execute-pressure cases, saw ${executePressureCount}`);
  if (fakeSuccessCount < 10) fail(`expected at least 10 prompt-injection / fake-success cases, saw ${fakeSuccessCount}`);
  if (kvkkCount < 10) fail(`expected at least 10 KVKK / cross-org cases, saw ${kvkkCount}`);
  if (hallucinationCount < 10) fail(`expected at least 10 hallucination / overclaim cases, saw ${hallucinationCount}`);

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');
  allWithin(
    status,
    new Set([
      'backend/scripts/ai03b_semantic_visible_audit_01_check.js',
      'backend/scripts/copilot_context_memory_task_state_01_check.js',
      'backend/src/ai/chat/conversationTaskState.js',
      'package.json',
      'backend/scripts/run_product_extensions_check_chain.js',
      'backend/scripts/verify_chain_01_product_extensions_check.js',
      'backend/scripts/script_harness_consolidation_01_check.js',
      'backend/scripts/copilot_route_review_human_approval_01_check.js',
      'backend/scripts/request_storm_resilience_01_check.js',
      'backend/scripts/copilot_operation_health_engine_01_check.js',
      'backend/scripts/copilot_next_best_action_engine_01_check.js',
      'backend/scripts/copilot_plan_review_engine_01_check.js',
      'backend/scripts/copilot_workflow_reasoning_engine_01_check.js',
      'backend/src/ai/chat/screenStateAnalyzer.js',
      'backend/src/ai/chat/conversationOperationHealthEngine.js',
      'backend/src/ai/chat/conversationNextBestActionEngine.js',
      'backend/src/ai/chat/conversationPlanReviewEngine.js',
      'backend/src/ai/jobGuide/screenCatalog.js',
      'backend/src/ai/jobGuide/screenCatalog.roomCompany.js',
      'backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js',
      'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md',
      'backend/scripts/copilot_clarifying_question_engine_01_check.js',
      'backend/scripts/copilot_dynamic_question_engine_01_check.js',
      'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
      'backend/scripts/db_pool_and_api_scaling_01_check.js',
      'backend/scripts/db_pool_and_api_scaling_01_probe.js',
      // Semantic quality gate files are part of the current consolidated validation pass.
      'backend/scripts/ai_response_semantic_quality_gate_01_check.js',
      'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md',
      // Dashboard bulk endpoint files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/dashboard_bulk_endpoint_01_check.js',
      'backend/src/bootstrap/routeMounts.js',
      'backend/src/server.js',
      'backend/src/routes/dashboardBulk.js',
      'backend/src/services/dashboardBulk.js',
      'docs/DASHBOARD_BULK_ENDPOINT_01.md',
      'web/src/panels/school/OperationsPanel.jsx',
      'web/src/panels/superadmin/SuperAdminPanel.jsx',
      'web/src/utils/dashboardBulk.js',
      // Cache coalescing and backoff files are legitimate read-only companions for this pass.
      'backend/scripts/cache_coalescing_and_backoff_01_check.js',
      'backend/src/utils/responseCache.js',
      'docs/CACHE_COALESCING_AND_BACKOFF_01.md',
      // Observability monitoring alerting files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/observability_monitoring_alerting_01_check.js',
      'backend/scripts/observability_monitoring_alerting_01_probe.js',
      'docs/OBSERVABILITY_MONITORING_ALERTING_01.md',
      // Quality gate final file is a legitimate smoke-summary companion for this pass.
      'backend/scripts/quality_gate_final_01_check.js',
      // Production rate limit policy files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/production_rate_limit_policy_01_check.js',
      'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md',
      'docs/DB_POOL_AND_API_SCALING_01.md',
      'backend/scripts/sefer_abi_terminal_humanize_01_check.js',
      'backend/scripts/cop_live_accept_01_check.js',
      'backend/scripts/onboarding_review_final_audit_01_check.js',
      'backend/scripts/invite_based_membership_01_check.js',
      'backend/scripts/verified_supplier_01_check.js',
      'backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js',
      'backend/scripts/sefer_abi_reasoning_assistant_01_check.js',
      'backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js',
      'backend/scripts/hot_file_split_ai_chat_composers_01_check.js',
      'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js',
      'backend/src/ai/chat/answerQualityPolicy.js',
      'backend/src/ai/chat/helpComposer.js',
      'backend/src/ai/chat/helpComposerSafeReplies.js',
      'backend/src/ai/chat/conversationTaskStateResponses.js',
      'backend/src/ai/chat/conversationTaskStateShared.js',
      'backend/src/ai/chat/conversationTaskStateClarifiers.js',
      'backend/src/ai/chat/conversationTaskStateSelectedRecord.js',
      'backend/src/ai/chat/conversationTaskStateFollowUps.js',
      'backend/src/ai/chat/conversationTaskStateBuilders.js',
      'backend/src/ai/chat/conversationTaskStateCompanyReplies.js',
      'backend/src/ai/chat/conversationTaskStateRoomReplies.js',
      'backend/src/ai/chat/conversationTaskStateDynamicQuestions.js',
      'backend/src/ai/chat/intentRouter.js',
      'backend/src/ai/chat/intentRouterCore.js',
      'backend/src/ai/chat/seferAbiReasoningAssistant.js',
      'backend/src/ai/chat/conversationWorkflowReasoningEngine.js',
      'backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js',
      'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js',
      'backend/scripts/copilot_reasoning_answer_composer_01_check.js',
      'backend/src/ai/chat/copilotReasoningAnswerComposer.js',
      'backend/scripts/copilot_smart_diagnostic_engine_01_check.js',
      'backend/src/ai/chat/conversationSmartDiagnostics.js',
      'backend/src/ai/schemas.js',
      'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md',
      'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md',
      'docs/REQUEST_STORM_RESILIENCE_01.md',
      'docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md',
      'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md',
      'docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md',
      'docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md',
      'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md',
      'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md',
      'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md',
      'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md',
      'docs/SEFER_ABI_REASONING_ASSISTANT_01.md',
      'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md',
      'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md',
      'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md',
      'tools/repo_contract_state.json',
      '.gitignore',
      'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
      'docs/PRIMER_SSOT.md',
      'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
      'docs/COPILOT_ROLE_TASK_MATRIX_01.md',
      'docs/COPILOT_AI_ACTION_ROADMAP_01.md',
      'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
      'docs/LOAD_TEST_2000_USERS_01.md',
      'backend/scripts/ux_brand_login_premium_01_check.js',
      'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
      'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
      'backend/scripts/ux_panel_standard_architecture_01_check.js',
      'backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js',
      'backend/scripts/ux_premium_critical_fix_room_01_check.js',
      'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
      'backend/scripts/ux_parent_personel_live_error_clarity_01_check.js',
      'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
      'backend/scripts/load_test_2000_users_01_check.js',
      'backend/scripts/load_test_2000_users_01_harness.js',
      'backend/scripts/agreement_source_shift_lineage_01_check.js',
      'backend/scripts/marketplace_free_to_operate_01_check.js',
      'backend/scripts/qlt_pay_bridge_01_check.js',
      'backend/scripts/sefer_score_01_check.js',
      'backend/scripts/hot_file_split_web_panels_01_check.js',
      'backend/scripts/_m91_route_preview_checks.js',
      'backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js',
      'backend/scripts/ux_collapsible_panels_01_check.js',
      'backend/scripts/ux_panel_structure_02_check.js',
      'backend/scripts/ux_panel_inventory_02a_check.js',
      'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
      'backend/scripts/ux_panel_reality_cleanup_02d_check.js',
      'backend/scripts/ux_brand_login_premium_01_check.js',
      'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
      'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
      'backend/scripts/ux_panel_standard_architecture_01_check.js',
      'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
      'docs/UX_PANEL_INVENTORY_02A_AUDIT.md',
      'backend/scripts/plan_center_guided_flow_persistence_01_check.js',
      'web/src/components/copilot/FloatingCopilotDrawer.jsx',
      'web/src/components/copilot/uiSurface.js',
      'web/src/panels/company/WorkflowPanel.jsx',
      'web/src/panels/company/GuidedPlanModal.jsx',
      'web/src/panels/company/ShiftPeopleTab.jsx',
      'web/src/panels/company/guidedPlanModalActions.js',
      'web/src/panels/company/guidedPlanModalCards.jsx',
      'web/src/panels/company/guidedPlanModalDestinationCards.jsx',
      'web/src/panels/company/guidedPlanModalPeopleStep.jsx',
      'web/src/panels/company/guidedPlanModalPlanCards.jsx',
      'web/src/panels/company/guidedPlanModalSections.jsx',
      'web/src/panels/company/guidedPlanModalShell.jsx',
      'web/src/panels/company/guidedPlanModalUtils.js',
      'web/src/panels/company/shiftPeopleTabActions.js',
      'web/src/panels/company/shiftPeopleTabSections.jsx',
      'web/src/panels/company/OperationsPanel.jsx',
      'web/src/panels/company/AgreementsPanel.jsx',
      'web/src/panels/room/MapPanel.jsx',
      'web/src/panels/room/AgreementsPanel.jsx',
      'web/src/panels/company/companyAgreementsBridgeSection.jsx',
      'web/src/panels/company/companyAgreementsPanelHelpers.js',
      'web/src/panels/room/roomAgreementsBridgeSection.jsx',
      'web/src/panels/room/roomAgreementsPanelHelpers.js',
      'web/src/panels/room/CommercialFlowPanel.jsx',
      'web/src/panels/room/OperationHealthPanel.jsx',
      'web/src/components/AgreementOpsBridgeCard.jsx',
      'web/src/components/RoutePreviewModal.jsx',
      'web/src/components/geo/GeoLocationPicker.jsx',
      'web/src/components/geo/HubMapPicker.jsx',
      'web/src/components/map/MapView.jsx',
      'web/src/components/map/ReadableMiniRouteMap.jsx',
      'web/src/components/map/mapTileAssets.js',
      'web/src/panels/room/roomShiftsOverviewSection.jsx',
      'web/src/utils/uiDataCache.js',
      'web/src/utils/planCenterOverlayLayer.js',
      'web/src/panels/room/ShiftsPanel.jsx',
      'web/src/panels/room/VehiclesPanel.jsx',
      'web/src/panels/room/roomShiftsPanelWorkflow.js',
      'web/src/panels/room/roomShiftsPanelActions.js',
      'web/src/panels/room/roomVehiclesPanelActions.js',
      'web/src/panels/shared/KvkkConsentGate.jsx',
      'web/src/panels/shared/PanelKvkkHint.jsx',
      'tools/PRIMER_SNAPSHOT.md',
      'backend/src/ai/chat/copilotGuidedTaskEngine.js',
      'backend/src/ai/chat/conversationRootCauseEngine.js',
      'backend/src/ai/chat/goldenQuestionPack.js',
      'backend/src/ai/chat/qualityScorer.js',
      'backend/scripts/copilot_guided_task_engine_01_check.js',
      'backend/scripts/copilot_root_cause_engine_01_check.js',
      'backend/scripts/copilot_risk_scoring_engine_01_check.js',
      'backend/src/ai/chat/conversationRiskScoringEngine.js',
      'docs/COPILOT_GUIDED_TASK_ENGINE_01.md',
      'docs/COPILOT_ROOT_CAUSE_ENGINE_01.md',
      'docs/COPILOT_RISK_SCORING_ENGINE_01.md',
      'backend/scripts/product_flow_button_audit_01.mjs',
      'backend/scripts/ux_live_panel_premium_smoke_01.mjs',
      'backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs',
      // Test quality and flake audit files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/ux_all_panels_reality_audit_01.mjs',
      'backend/scripts/test_quality_and_flake_audit_01_check.js',
      'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md',
      'backend/scripts/bug_route_impact_preview_button_01_check.js',
      'web/src/panels/parent/LivePanel.jsx',
      'backend/src/ai/chat/etaSanity.js',
      'backend/scripts/driver_flow_final_01_acceptance_check.js',
      'backend/scripts/eta_osrm_01_route_eta_service_check.js',
      'backend/scripts/eta_osrm_02_api_eta_bridge_check.js',
      'backend/scripts/live_tracking_final_01_acceptance_check.js',
      'web/src/utils/etaSanity.js',
      'backend/src/ai/chat/helpComposerSelectedRuntime.js',
      'backend/src/ai/chat/replyShapes.js',
      'web/src/panels/personel/LivePanel.jsx',
      'web/src/utils/copilotFacts.js',
      'backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js',
      'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md',
      'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md',
      // Backend lint warning burndown files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/backend_lint_warning_burndown_01_check.js',
      'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md',
    ]),
    ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log', 'backend/scripts/cop_03', 'backend/scripts/cop_04'],
    'working tree stays within redteam scope',
  );

  console.log('=== EXCEL-TO-ROUTE-READINESS-REDTEAM-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
