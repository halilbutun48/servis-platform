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
      'package.json',
      'backend/scripts/run_product_extensions_check_chain.js',
      'backend/scripts/verify_chain_01_product_extensions_check.js',
      'backend/scripts/script_harness_consolidation_01_check.js',
      'backend/scripts/copilot_route_review_human_approval_01_check.js',
      'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
      'backend/scripts/onboarding_review_final_audit_01_check.js',
      'backend/scripts/invite_based_membership_01_check.js',
      'backend/scripts/verified_supplier_01_check.js',
      'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js',
      'backend/src/ai/chat/answerQualityPolicy.js',
      'backend/src/ai/chat/helpComposer.js',
      'backend/src/ai/chat/intentRouter.js',
      'backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js',
      'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js',
      'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md',
      'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md',
      'tools/repo_contract_state.json',
      'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
      'docs/PRIMER_SSOT.md',
      'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
      'docs/COPILOT_ROLE_TASK_MATRIX_01.md',
      'docs/COPILOT_AI_ACTION_ROADMAP_01.md',
      'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
      'backend/scripts/ux_brand_login_premium_01_check.js',
      'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
      'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
      'backend/scripts/ux_panel_standard_architecture_01_check.js',
      'backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js',
      'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
      'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
      'web/src/utils/uiDataCache.js',
      'backend/src/ai/chat/copilotGuidedTaskEngine.js',
      'backend/src/ai/chat/goldenQuestionPack.js',
      'backend/src/ai/chat/qualityScorer.js',
      'backend/scripts/copilot_guided_task_engine_01_check.js',
      'docs/COPILOT_GUIDED_TASK_ENGINE_01.md',
      'backend/scripts/product_flow_button_audit_01.mjs',
      'web/src/panels/parent/LivePanel.jsx',
    ]),
    ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'],
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
