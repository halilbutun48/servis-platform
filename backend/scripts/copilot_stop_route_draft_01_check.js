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
  'STAGE 1 — Signal Intake',
  'STAGE 2 — Inbound / Outbound Direction Model',
  'STAGE 3 — Stop Draft Scoping',
  'STAGE 4 — Hub Readiness',
  'STAGE 5 — Capacity Readiness',
  'STAGE 6 — Human Review Gate',
  'STAGE 7 — Route Review Handoff',
  'STAGE 8 — Next Milestone Handoff',
];

const requiredDirections = ['INBOUND', 'OUTBOUND', 'MIXED', 'UNKNOWN'];

const requiredHubReadiness = [
  'TELEMATICS_HUB_READY',
  'ROUTE_DRAFT_PREVIEW_READY',
  'VEHICLE_DRIVER_READINESS_READY',
  'HUMAN_REVIEW_REQUIRED',
];

const requiredCapacityReadiness = ['CAPACITY_READY', 'CAPACITY_TIGHT', 'CAPACITY_CONSTRAINED', 'CAPACITY_UNKNOWN'];

const requiredTaskCategories = [
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
];

const requiredRoles = ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION'];

async function main() {
  console.log('=== COPILOT-STOP-ROUTE-DRAFT-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const excelDoc = read('docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md');
  const addressDoc = read('docs/ADDRESS_GEOCODING_CONFIDENCE_01.md');
  const humanApproval = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const doc = read('docs/COPILOT_STOP_ROUTE_DRAFT_01.md');
  const helper = read('backend/src/ai/chat/copilotStopRouteDraftPolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:copilotstoproutedraft01": "node backend/scripts/copilot_stop_route_draft_01_check.js"', 'package.json exposes stop-route draft check');
  ordered(runner, ['check:copilotexceldemandimport01', 'check:addressgeocodingconfidence01', 'check:copilotstoproutedraft01', 'check:uxcopilotsmartchips01'], 'product extensions runner places stop-route draft after address geocoding confidence');
  ordered(verify, ['check:copilotexceldemandimport01', 'check:addressgeocodingconfidence01', 'check:copilotstoproutedraft01', 'check:uxcopilotsmartchips01'], 'verify chain places stop-route draft after address geocoding confidence');

  must(guide, 'COPILOT-STOP-ROUTE-DRAFT-01', 'milestone guide mentions stop-route draft milestone');
  must(guide, 'check:copilotstoproutedraft01', 'milestone guide exposes stop-route draft check');
  must(guide, 'node backend\\scripts\\copilot_stop_route_draft_01_check.js', 'milestone guide includes stop-route draft command');
  must(guide, 'docs/COPILOT_STOP_ROUTE_DRAFT_01.md', 'milestone guide includes stop-route draft doc');
  ordered(guide, ['COPILOT-EXCEL-DEMAND-IMPORT-01', 'ADDRESS-GEOCODING-CONFIDENCE-01', 'COPILOT-STOP-ROUTE-DRAFT-01'], 'milestone guide keeps stop-route draft after address geocoding confidence');

  must(primer, 'COPILOT-STOP-ROUTE-DRAFT-01', 'primer mentions stop-route draft milestone');
  must(primer, 'docs/COPILOT_STOP_ROUTE_DRAFT_01.md', 'primer links stop-route draft doc');

  must(roadmapLock, 'COPILOT-STOP-ROUTE-DRAFT-01', 'roadmap lock keeps stop-route draft milestone');
  must(roadmapLock, 'EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI', 'roadmap lock keeps route draft line');

  must(roleMatrix, 'COPILOT-STOP-ROUTE-DRAFT-01', 'role/task matrix doc references stop-route draft milestone');
  must(roleMatrix, 'stop / route draft readiness roadmap', 'role/task matrix doc keeps stop-route draft wording');
  must(roleMatrix, 'inbound / outbound direction model', 'role/task matrix doc keeps direction model wording');

  must(aiRoadmap, 'COPILOT-STOP-ROUTE-DRAFT-01', 'AI action roadmap doc references stop-route draft milestone');
  must(aiRoadmap, 'stop-route draft', 'AI action roadmap doc keeps stop-route draft wording');

  must(demandToAgreement, 'COPILOT-STOP-ROUTE-DRAFT-01', 'demand-to-agreement doc references stop-route draft milestone');
  must(demandToAgreement, 'Stop / Route Draft Readiness', 'demand-to-agreement doc keeps stop-route draft stage wording');

  must(excelDoc, 'COPILOT-STOP-ROUTE-DRAFT-01', 'Excel demand import doc references stop-route draft milestone');
  must(addressDoc, 'COPILOT-STOP-ROUTE-DRAFT-01', 'address geocoding confidence doc references stop-route draft milestone');
  must(humanApproval, 'COPILOT-STOP-ROUTE-DRAFT-01', 'human approval doc keeps stop-route draft future line');

  must(doc, '# COPILOT STOP ROUTE DRAFT 01', 'stop-route draft doc title present');
  must(doc, 'docs/check milestone', 'stop-route draft doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotstoproutedraft01`', 'stop-route draft doc keeps canonical check wording');
  ordered(doc, requiredStages, 'stop-route draft doc keeps stage ordering');
  for (const direction of requiredDirections) {
    must(doc, direction, `stop-route draft doc includes direction ${direction}`);
  }
  for (const hub of requiredHubReadiness) {
    must(doc, hub, `stop-route draft doc includes hub readiness ${hub}`);
  }
  for (const capacity of requiredCapacityReadiness) {
    must(doc, capacity, `stop-route draft doc includes capacity readiness ${capacity}`);
  }
  for (const category of requiredTaskCategories) {
    must(doc, category, `stop-route draft doc includes task category ${category}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `stop-route draft doc includes role boundary ${role}`);
  }
  must(doc, 'KVKK / data safety boundary', 'stop-route draft doc keeps KVKK/data safety boundary');
  must(doc, 'Public promise / güven stratejisi', 'stop-route draft doc keeps public promise section');
  must(doc, 'Underpromise, overdeliver', 'stop-route draft doc keeps trust strategy wording');
  must(doc, 'Runtime stop create açılmaz.', 'stop-route draft doc keeps stop-create boundary');
  must(doc, 'Route apply açılmaz.', 'stop-route draft doc keeps route-apply boundary');
  must(doc, 'Driver/vehicle assignment açılmaz.', 'stop-route draft doc keeps assignment boundary');
  must(doc, 'OSRM route apply açılmaz.', 'stop-route draft doc keeps OSRM boundary');
  must(doc, 'backend/src/ai/chat/copilotStopRouteDraftPolicy.js', 'stop-route draft doc links static helper');

  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_DIRECTION_MODEL', 'helper exposes direction model');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_HUB_READINESS', 'helper exposes hub readiness');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_CAPACITY_READINESS', 'helper exposes capacity readiness');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_TASK_CATEGORIES', 'helper exposes task categories');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_NEVER_AUTOMATE', 'helper exposes never-automate list');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_STOP_ROUTE_DRAFT_POLICY', 'helper exposes policy object');
  must(helper, 'buildStopRouteDraftRole', 'helper exposes role builder');
  must(helper, 'listCopilotStopRouteDraftRoles', 'helper exposes role lister');
  must(helper, 'getCopilotStopRouteDraftPolicy', 'helper exposes policy getter');
  ordered(helper, requiredStages, 'helper keeps stop-route stage ordering');
  for (const role of requiredRoles) {
    must(helper, `buildStopRouteDraftRole('${role}'`, `helper keeps role ${role}`);
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

  must(harnessCheck, 'check:copilotstoproutedraft01', 'script harness check knows stop-route draft alias');
  must(harnessCheck, 'copilot_stop_route_draft_01_check.js', 'script harness check knows stop-route draft file');
  must(harnessCheck, 'COPILOT-STOP-ROUTE-DRAFT-01', 'script harness check knows stop-route draft milestone');
  must(harnessCheck, 'docs/COPILOT_STOP_ROUTE_DRAFT_01.md', 'script harness check knows stop-route draft doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotStopRouteDraftPolicy.js', 'script harness check knows stop-route draft helper');

  must(harnessDoc, 'root:check:copilotstoproutedraft01', 'script harness doc lists stop-route draft root check');
  must(harnessDoc, 'copilot_stop_route_draft_01_check.js', 'script harness doc lists stop-route draft check');
  must(harnessDoc, 'docs/COPILOT_STOP_ROUTE_DRAFT_01.md', 'script harness doc lists stop-route draft doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotStopRouteDraftPolicy.js', 'script harness doc lists stop-route draft helper');
  must(harnessDoc, 'COPILOT-STOP-ROUTE-DRAFT-01', 'script harness doc lists stop-route draft milestone');

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== COPILOT-STOP-ROUTE-DRAFT-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
