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

const requiredStages = [
  'STAGE 1 — Source Draft Readiness',
  'STAGE 2 — Coordinate Readiness',
  'STAGE 3 — Direction-Specific OSRM Input Model',
  'STAGE 4 — Hub and Stop Sequence Readiness',
  'STAGE 5 — OSRM Risk Categories',
  'STAGE 6 — Route Draft Preview Readiness',
  'STAGE 7 — Human Review Gate',
  'STAGE 8 — Handoff to Next Milestones',
];

const requiredRiskCategories = [
  'MISSING_COORDINATE',
  'LOW_CONFIDENCE_COORDINATE',
  'BLOCKED_ADDRESS',
  'MISSING_HUB',
  'MISSING_DIRECTION',
  'TOO_FEW_STOPS',
  'TOO_MANY_STOPS',
  'DUPLICATE_WAYPOINT',
  'POSSIBLE_OUTLIER_STOP',
  'CROSS_ORGANIZATION_ROUTE_RISK',
  'KVKK_CONSENT_UNKNOWN',
  'MANUAL_REVIEW_REQUIRED',
  'OSRM_EXECUTION_NOT_ALLOWED',
];

const requiredTaskCategories = [
  'OSRM_READINESS_EXPLAIN',
  'COORDINATE_READINESS_REPORT',
  'DIRECTION_OSRM_INPUT_EXPLAIN',
  'HUB_AND_STOP_SEQUENCE_READINESS',
  'OSRM_RISK_SUMMARY',
  'OUTLIER_STOP_HINT',
  'MANUAL_REVIEW_LIST',
  'ROUTE_PREVIEW_READINESS',
  'HUMAN_APPROVAL_REQUIRED',
];

const requiredRoles = [
  'SUPER_ADMIN',
  'COMPANY',
  'SCHOOL',
  'ORGANIZATION',
  'ROOM',
  'DRIVER',
  'PERSONEL / PARENT',
];

async function main() {
  console.log('=== OSRM-ROUTE-DRAFT-FROM-EXCEL-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const humanApproval = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const excelDoc = read('docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md');
  const addressDoc = read('docs/ADDRESS_GEOCODING_CONFIDENCE_01.md');
  const stopDoc = read('docs/COPILOT_STOP_ROUTE_DRAFT_01.md');
  const doc = read('docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md');
  const helper = read('backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const roadmapLockCheck = read('backend/scripts/roadmap_lock_ai_marketplace_01_check.js');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:osrmroutedraftfromexcel01": "node backend/scripts/osrm_route_draft_from_excel_01_check.js"', 'package.json exposes OSRM route draft from Excel check');
  ordered(runner, ['check:copilotstoproutedraft01', 'check:osrmroutedraftfromexcel01', 'check:uxcopilotsmartchips01'], 'product extensions runner places OSRM route draft from Excel after stop-route draft');
  ordered(verify, ['check:copilotstoproutedraft01', 'check:osrmroutedraftfromexcel01', 'check:uxcopilotsmartchips01'], 'verify chain places OSRM route draft from Excel after stop-route draft');

  must(guide, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'milestone guide mentions OSRM route draft from Excel milestone');
  must(guide, 'check:osrmroutedraftfromexcel01', 'milestone guide exposes OSRM route draft from Excel check');
  must(guide, 'node backend\\scripts\\osrm_route_draft_from_excel_01_check.js', 'milestone guide includes OSRM route draft from Excel command');
  must(guide, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'milestone guide includes OSRM route draft from Excel doc');
  must(guide, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'milestone guide includes OSRM route draft from Excel helper');
  ordered(guide, ['COPILOT-STOP-ROUTE-DRAFT-01', 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01'], 'milestone guide keeps OSRM route draft from Excel after stop-route draft');

  must(primer, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'primer mentions OSRM route draft from Excel milestone');
  must(primer, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'primer links OSRM route draft from Excel doc');

  must(roadmapLock, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'roadmap lock keeps OSRM route draft from Excel milestone');
  must(roadmapLock, 'EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI', 'roadmap lock keeps Excel/address/OSRM route draft line');

  must(roleMatrix, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'role/task matrix doc references OSRM route draft from Excel milestone');
  must(roleMatrix, 'route draft readiness roadmap', 'role/task matrix doc keeps OSRM route draft readiness wording');
  must(roleMatrix, 'runtime OSRM call', 'role/task matrix doc keeps runtime OSRM boundary');

  must(aiRoadmap, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'AI action roadmap doc references OSRM route draft from Excel milestone');
  must(aiRoadmap, 'future-only OSRM route draft readiness', 'AI action roadmap doc keeps OSRM readiness wording');

  must(demandToAgreement, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'demand-to-agreement doc references OSRM route draft from Excel milestone');
  must(demandToAgreement, 'OSRM route draft readiness', 'demand-to-agreement doc keeps OSRM readiness wording');

  must(humanApproval, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'human approval doc keeps OSRM route draft from Excel future line');
  must(excelDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'Excel demand import doc references OSRM route draft from Excel milestone');
  must(addressDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'address geocoding confidence doc references OSRM route draft from Excel milestone');
  must(stopDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'stop-route draft doc references OSRM route draft from Excel milestone');
  must(roadmapLockCheck, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'roadmap lock check references OSRM route draft from Excel milestone');

  must(doc, '# OSRM ROUTE DRAFT FROM EXCEL 01', 'OSRM route draft from Excel doc title present');
  must(doc, 'docs/check milestone', 'OSRM route draft from Excel doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:osrmroutedraftfromexcel01`', 'OSRM route draft from Excel doc keeps canonical check wording');
  ordered(doc, requiredStages, 'OSRM route draft from Excel doc keeps stage ordering');
  for (const risk of requiredRiskCategories) {
    must(doc, risk, `OSRM route draft from Excel doc includes risk category ${risk}`);
  }
  for (const category of requiredTaskCategories) {
    must(doc, category, `OSRM route draft from Excel doc includes task category ${category}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `OSRM route draft from Excel doc includes role boundary ${role}`);
  }
  must(doc, 'sabah inbound', 'OSRM route draft from Excel doc keeps sabah inbound model');
  must(doc, 'akşam outbound', 'OSRM route draft from Excel doc keeps akşam outbound model');
  must(doc, 'ring varsayımı yok', 'OSRM route draft from Excel doc keeps ring assumption boundary');
  must(doc, 'araç deposu zorunlu varsayımı yok', 'OSRM route draft from Excel doc keeps depot assumption boundary');
  must(doc, 'Distance/duration/polyline hesaplamaz.', 'OSRM route draft from Excel doc keeps preview computation boundary');
  must(doc, 'OSRM call yapmaz.', 'OSRM route draft from Excel doc keeps OSRM call boundary');
  must(doc, 'Human Review Gate', 'OSRM route draft from Excel doc keeps human review gate section');
  must(doc, 'KVKK / veri güvenliği sınırı', 'OSRM route draft from Excel doc keeps KVKK/data safety boundary');
  must(doc, 'Public promise / güven stratejisi', 'OSRM route draft from Excel doc keeps public promise section');
  must(doc, 'Underpromise, overdeliver', 'OSRM route draft from Excel doc keeps trust strategy wording');
  must(doc, 'Excel’den otomatik rota oluşturur', 'OSRM route draft from Excel doc keeps no-overclaim wording');
  must(doc, 'Runtime OSRM route calculation açılmaz.', 'OSRM route draft from Excel doc keeps runtime OSRM boundary');
  must(doc, 'OSRM table/match/route call açılmaz.', 'OSRM route draft from Excel doc keeps OSRM table/match/route boundary');
  must(doc, 'Route preview generation açılmaz.', 'OSRM route draft from Excel doc keeps route preview boundary');
  must(doc, 'Distance/duration/polyline generation açılmaz.', 'OSRM route draft from Excel doc keeps geometry boundary');
  must(doc, 'Route draft create/apply açılmaz.', 'OSRM route draft from Excel doc keeps route draft boundary');
  must(doc, 'Stop create açılmaz.', 'OSRM route draft from Excel doc keeps stop boundary');
  must(doc, 'Geocode execute açılmaz.', 'OSRM route draft from Excel doc keeps geocode boundary');
  must(doc, 'Lat/lng persistent write açılmaz.', 'OSRM route draft from Excel doc keeps lat/lng boundary');
  must(doc, 'DB write açılmaz.', 'OSRM route draft from Excel doc keeps DB boundary');
  must(doc, 'Runtime AI action açılmaz.', 'OSRM route draft from Excel doc keeps runtime AI boundary');
  must(doc, 'Tool execution açılmaz.', 'OSRM route draft from Excel doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açılmaz.', 'OSRM route draft from Excel doc keeps dispatcher boundary');
  must(doc, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'OSRM route draft from Excel doc links static helper');
  must(doc, 'Kapsam dışı', 'OSRM route draft from Excel doc keeps out-of-scope section');

  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_VERSION', 'helper exposes version marker');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_STAGES', 'helper exposes stages');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_DIRECTION_MODEL', 'helper exposes direction model');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_COORDINATE_READINESS', 'helper exposes coordinate readiness');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_RISK_CATEGORIES', 'helper exposes risk categories');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_TASK_CATEGORIES', 'helper exposes task categories');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_HANOFFS', 'helper exposes handoffs');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_POLICY', 'helper exposes policy object');
  must(helper, 'buildOsrmRouteDraftFromExcelRole', 'helper exposes role builder');
  must(helper, 'listOsrmRouteDraftFromExcelRoles', 'helper exposes role lister');
  must(helper, 'getOsrmRouteDraftFromExcelPolicy', 'helper exposes policy getter');
  ordered(helper, requiredStages, 'helper keeps OSRM route draft from Excel stage ordering');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT']) {
    must(helper, `buildOsrmRouteDraftFromExcelRole('${role}'`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router', 'helper has no router runtime');
  mustNot(helper, '@prisma/client', 'helper has no prisma client import');
  mustNot(helper, 'PrismaClient', 'helper has no PrismaClient runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');
  mustNot(helper, 'http.request', 'helper has no http runtime');

  must(harnessCheck, 'check:osrmroutedraftfromexcel01', 'script harness check knows OSRM route draft from Excel alias');
  must(harnessCheck, 'osrm_route_draft_from_excel_01_check.js', 'script harness check knows OSRM route draft from Excel file');
  must(harnessCheck, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'script harness check knows OSRM route draft from Excel milestone');
  must(harnessCheck, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'script harness check knows OSRM route draft from Excel doc');
  must(harnessCheck, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'script harness check knows OSRM route draft from Excel helper');

  must(harnessDoc, 'root:check:osrmroutedraftfromexcel01', 'script harness doc lists OSRM route draft from Excel root check');
  must(harnessDoc, 'osrm_route_draft_from_excel_01_check.js', 'script harness doc lists OSRM route draft from Excel check');
  must(harnessDoc, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'script harness doc lists OSRM route draft from Excel doc');
  must(harnessDoc, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'script harness doc lists OSRM route draft from Excel helper');
  must(harnessDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'script harness doc lists OSRM route draft from Excel milestone');

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== OSRM-ROUTE-DRAFT-FROM-EXCEL-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
