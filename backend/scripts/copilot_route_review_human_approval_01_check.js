#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

async function main() {
  console.log('=== COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const doc = read('docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md');
  const helper = read('backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const status = gitStatusNames();
  const cachedNames = gitCachedNames();

  must(pkg, '"check:copilotroutereviewhumanapproval01": "node backend/scripts/copilot_route_review_human_approval_01_check.js"', 'package.json exposes route review check');
  ordered(runner, ['check:osrmroutedraftfromexcel01', 'check:copilotroutereviewhumanapproval01', 'check:uxcopilotsmartchips01'], 'product extensions runner places route review after OSRM route draft');
  ordered(verify, ['check:osrmroutedraftfromexcel01', 'check:copilotroutereviewhumanapproval01', 'check:uxcopilotsmartchips01'], 'verify chain places route review after OSRM route draft');

  must(guide, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'milestone guide mentions route review milestone');
  must(guide, 'check:copilotroutereviewhumanapproval01', 'milestone guide exposes route review check');
  must(guide, 'node backend\\scripts\\copilot_route_review_human_approval_01_check.js', 'milestone guide includes route review command');
  must(guide, 'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md', 'milestone guide includes route review doc');
  ordered(guide, ['OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'COPILOT-DEMAND-INTAKE-01'], 'milestone guide keeps route review after OSRM route draft');

  must(primer, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'primer mentions route review milestone');
  must(primer, 'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md', 'primer links route review doc');

  must(roadmapLock, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'roadmap lock keeps route review milestone');
  must(roadmapLock, 'route review', 'roadmap lock keeps route review wording');

  must(roleMatrix, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'role/task matrix doc references route review milestone');
  must(roleMatrix, 'route review', 'role/task matrix doc keeps route review wording');

  must(aiRoadmap, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'AI action roadmap doc references route review milestone');
  must(aiRoadmap, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'AI action roadmap doc keeps OSRM bridge wording');

  must(demandToAgreement, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'demand-to-agreement doc references route review milestone');
  must(demandToAgreement, 'route review', 'demand-to-agreement doc keeps route review wording');

  must(doc, '# COPILOT ROUTE REVIEW HUMAN APPROVAL 01', 'route review doc title present');
  must(doc, 'docs/check milestone', 'route review doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotroutereviewhumanapproval01`', 'route review doc keeps canonical check wording');
  ordered(doc, ['Route Review Input Readiness', 'Review Evidence Checklist', 'Human Approval Decision States', 'Approval Checklist', 'Review Boundaries', 'Handoff to Next Milestones'], 'route review doc keeps stage ordering');
  ordered(doc, ['route summary', 'source data lineage', 'affected people/stops/hub', 'direction', 'address/coordinate confidence', 'missing data', 'route risk summary', 'KVKK/cross-organization risk', 'operational impact', 'reversibility', 'audit expectation', 'safe fallback', 'explicit confirmation phrase'], 'route review doc keeps approval checklist ordering');

  for (const state of ['READY_FOR_HUMAN_REVIEW', 'NEEDS_DATA_FIX', 'MANUAL_REVIEW_REQUIRED', 'BLOCKED_FOR_ROUTE_ACTION', 'APPROVAL_REQUIRED_BEFORE_EXECUTION']) {
    must(doc, state, `route review doc includes decision state ${state}`);
  }

  for (const category of ['ROUTE_REVIEW_READINESS_EXPLAIN', 'REVIEW_EVIDENCE_SUMMARY', 'ROUTE_APPROVAL_CHECKLIST_PREPARE', 'ROUTE_RISK_SUMMARY', 'MANUAL_REVIEW_LIST', 'SAFE_FALLBACK_RECOMMENDATION', 'EXPLICIT_CONFIRMATION_PHRASE_PREPARE', 'HUMAN_APPROVAL_REQUIRED']) {
    must(doc, category, `route review doc includes task category ${category}`);
  }

  for (const role of ['COMPANY', 'SCHOOL', 'ORGANIZATION', 'SUPER_ADMIN', 'ROOM', 'DRIVER', 'PERSONEL / PARENT']) {
    must(doc, role, `route review doc includes role ${role}`);
  }

  for (const phrase of [
    'COPILOT-EXCEL-DEMAND-IMPORT-01',
    'ADDRESS-GEOCODING-CONFIDENCE-01',
    'COPILOT-STOP-ROUTE-DRAFT-01',
    'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
    'COPILOT-HUMAN-APPROVAL-01',
    'EXCEL-TO-ROUTE-READINESS-REDTEAM-01',
    'Public promise overclaim yok.',
    'Fake success yasaktır.',
    'backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js',
    'route preview üretmez',
    'OSRM call yapmaz',
    'route apply',
    'route review readiness',
  ]) {
    must(doc, phrase, `route review doc includes ${phrase}`);
  }

  for (const phrase of [
    'Kişi + adres + koordinat + rota adayları kişisel veri riski taşır.',
    'Öğrenci/veli/personel adresleri hassas operasyonel veri kabul edilir.',
    'Bu milestone lat/lng, stop, route, OSRM sonucu veya review decision’ı DB’ye yazmaz.',
    'KVKK/izin belirsizliği varsa route review “manual review required” olur.',
    'Cross-organization/cross-tenant veri karışması',
    'İnsan onayı olmadan OSRM/route preview/apply/write yapılmaz.',
  ]) {
    must(doc, phrase, `route review doc keeps privacy boundary: ${phrase}`);
  }

  for (const phrase of [
    'runtime route review/action açmaz',
    'tool execution',
    'write-action dispatcher',
    'Demand create execute açılmaz.',
    'Excel/CSV import execute açılmaz.',
    'Address/geocode persistent write açılmaz.',
    'Route apply açılmaz.',
    'RFQ send açılmaz.',
    'Offer accept/reject açılmaz.',
    'Supplier auto-selection açılmaz.',
    'Agreement/contract execute açılmaz.',
    'Dispatch apply açılmaz.',
    'Driver/vehicle assignment açılmaz.',
    'Stop reached/skipped/complete açılmaz.',
    'Payment/hakediş execute açılmaz.',
    'SMS/email/push açılmaz.',
    'Provider credential management açılmaz.',
    'User/account/admin write-action açılmaz.',
    'Cross-organization write açılmaz.',
    'Voice command execute açılmaz.',
    'Autopilot real action açılmaz.',
  ]) {
    must(doc, phrase, `route review doc keeps boundary: ${phrase}`);
  }

  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_DECISION_STATES', 'helper exposes decision states');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_CHECKLIST', 'helper exposes checklist');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_TASK_CATEGORIES', 'helper exposes task categories');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_POLICY', 'helper exposes policy object');
  must(helper, 'listCopilotRouteReviewHumanApprovalRoles', 'helper exposes role lister');
  must(helper, 'getCopilotRouteReviewHumanApprovalPolicy', 'helper exposes policy getter');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT']) {
    must(helper, `buildRouteReviewHumanApprovalRole('${role}'`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router.', 'helper has no router runtime');
  mustNot(helper, 'router =', 'helper has no router runtime');
  mustNot(helper, 'Router(', 'helper has no router runtime');
  mustNot(helper, 'prisma', 'helper has no prisma runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');
  mustNot(helper, 'http.request', 'helper has no http runtime');

  must(harnessCheck, 'check:copilotroutereviewhumanapproval01', 'script harness check knows route review alias');
  must(harnessCheck, 'copilot_route_review_human_approval_01_check.js', 'script harness check knows route review file');
  must(harnessCheck, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'script harness check knows route review milestone');
  must(harnessCheck, 'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md', 'script harness check knows route review doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js', 'script harness check knows route review helper');

  must(harnessDoc, 'root:check:copilotroutereviewhumanapproval01', 'script harness doc lists route review root check');
  must(harnessDoc, 'copilot_route_review_human_approval_01_check.js', 'script harness doc lists route review check');
  must(harnessDoc, 'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md', 'script harness doc lists route review doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js', 'script harness doc lists route review helper');
  must(harnessDoc, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'script harness doc lists route review milestone');

  const exactAllowed = new Set([
    'package.json',
    'backend/scripts/run_product_extensions_check_chain.js',
    'backend/scripts/verify_chain_01_product_extensions_check.js',
    'backend/scripts/script_harness_consolidation_01_check.js',
    'backend/scripts/copilot_route_review_human_approval_01_check.js',
    'backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js',
    'backend/src/ai/chat/answerQualityPolicy.js',
    'backend/src/ai/chat/helpComposer.js',
    'backend/src/ai/chat/intentRouter.js',
    'backend/src/ai/chat/intentRouterCore.js',
    'backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js',
    'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js',
    'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md',
    'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md',
    'backend/scripts/ai03b_semantic_visible_audit_01_check.js',
    'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
    'backend/scripts/copilot_context_memory_task_state_01_check.js',
    'backend/scripts/sefer_abi_reasoning_assistant_01_check.js',
    'backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js',
    'backend/scripts/copilot_reasoning_answer_composer_01_check.js',
    'backend/scripts/plan_center_guided_flow_persistence_01_check.js',
    'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js',
    'backend/src/ai/chat/copilotReasoningAnswerComposer.js',
    'backend/src/ai/chat/seferAbiReasoningAssistant.js',
    'backend/src/ai/chat/conversationTaskState.js',
    'backend/src/ai/chat/conversationTaskStateResponses.js',
    'backend/src/ai/chat/conversationTaskStateShared.js',
    'backend/src/ai/chat/conversationTaskStateClarifiers.js',
    'backend/src/ai/chat/conversationTaskStateSelectedRecord.js',
    'backend/src/ai/chat/conversationTaskStateFollowUps.js',
    'backend/src/ai/chat/conversationTaskStateBuilders.js',
    'backend/src/ai/chat/conversationTaskStateCompanyReplies.js',
    'backend/src/ai/chat/conversationTaskStateRoomReplies.js',
    'backend/src/ai/schemas.js',
    'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md',
    'web/src/components/copilot/FloatingCopilotDrawer.jsx',
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
    'web/src/panels/room/ShiftsPanel.jsx',
    'web/src/panels/room/VehiclesPanel.jsx',
    'web/src/panels/room/roomShiftsPanelWorkflow.js',
    'web/src/panels/room/roomVehiclesPanelActions.js',
    'web/src/utils/planCenterOverlayLayer.js',
    'web/src/components/copilot/uiSurface.js',
    'docs/SEFER_ABI_REASONING_ASSISTANT_01.md',
    'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md',
    'tools/repo_contract_state.json',
    'docs/PRIMER_SSOT.md',
    'docs/COPILOT_AI_ACTION_ROADMAP_01.md',
    'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
    'docs/COPILOT_ROLE_TASK_MATRIX_01.md',
    'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md',
    'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
    'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
    'backend/scripts/ux_brand_login_premium_01_check.js',
    'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
    'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
    'backend/scripts/ux_panel_standard_architecture_01_check.js',
    'backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js',
    'backend/scripts/ux_premium_critical_fix_room_01_check.js',
    'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
    'backend/scripts/ux_parent_personel_live_error_clarity_01_check.js',
    'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
    'backend/src/ai/chat/copilotGuidedTaskEngine.js',
    'backend/src/ai/chat/goldenQuestionPack.js',
    'backend/src/ai/chat/qualityScorer.js',
    'backend/scripts/copilot_guided_task_engine_01_check.js',
    'backend/scripts/onboarding_review_final_audit_01_check.js',
    'backend/scripts/invite_based_membership_01_check.js',
    'backend/scripts/verified_supplier_01_check.js',
    'backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js',
    'docs/COPILOT_GUIDED_TASK_ENGINE_01.md',
    'docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md',
    'docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md',
    'backend/scripts/product_flow_button_audit_01.mjs',
    'web/src/panels/parent/LivePanel.jsx',
    'backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs',
    'web/src/utils/uiDataCache.js',
    'tools/PRIMER_SNAPSHOT.md',
  ]);

  allWithin(status, exactAllowed, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'web/public/seferpakt-', 'web/public/vardis-', 'debug.log'], 'working tree stays within route review scope');
  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
