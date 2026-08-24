#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mustNoDiffExceptWithIdentity } from './lib/guardGitScope.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
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

const requiredRoles = [
  'SUPER_ADMIN',
  'ROOM',
  'COMPANY',
  'DRIVER',
  'PERSONEL',
  'PARENT',
  'SCHOOL',
  'ORGANIZATION',
];

async function main() {
  console.log('=== COPILOT-AI-ACTION-ROADMAP-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const doc = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const helper = read('backend/src/ai/chat/copilotAiActionRoadmap.js');
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotairoadmap01": "node backend/scripts/copilot_ai_action_roadmap_01_check.js"', 'package.json exposes copilot AI action roadmap check');
  assertProductExtensionsOrder(['check:copilotroletaskmatrix01', 'check:copilotairoadmap01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps copilot AI action roadmap after role/task matrix', registryScripts);
  assertProductExtensionsOrder(['check:copilotroletaskmatrix01', 'check:copilotairoadmap01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps copilot AI action roadmap after role/task matrix', registryScripts);

  must(guide, 'COPILOT-AI-ACTION-ROADMAP-01', 'milestone guide mentions AI action roadmap milestone');
  must(guide, 'check:copilotairoadmap01', 'milestone guide exposes AI action roadmap check');
  must(guide, 'node backend\\scripts\\copilot_ai_action_roadmap_01_check.js', 'milestone guide includes AI action roadmap command');
  must(guide, 'docs/COPILOT_AI_ACTION_ROADMAP_01.md', 'milestone guide includes AI action roadmap doc');
  ordered(guide, ['COPILOT-ROLE-TASK-MATRIX-01', 'COPILOT-AI-ACTION-ROADMAP-01', 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01'], 'milestone guide keeps AI action roadmap after role/task matrix');

  must(primer, 'COPILOT-AI-ACTION-ROADMAP-01', 'primer mentions AI action roadmap milestone');
  must(primer, 'docs/COPILOT_AI_ACTION_ROADMAP_01.md', 'primer links AI action roadmap doc');

  must(roadmapLock, 'COPILOT-AI-ACTION-ROADMAP-01', 'roadmap lock keeps AI action roadmap milestone');
  must(roadmapLock, 'future-only phase model', 'roadmap lock keeps future-only phase model wording');

  must(roleMatrix, 'COPILOT-AI-ACTION-ROADMAP-01', 'role/task matrix doc references new roadmap milestone');
  must(roleMatrix, 'runtime AI action açmaz', 'role/task matrix doc keeps runtime AI boundary');
  must(roleMatrix, "Guard'lı uygula", 'role/task matrix doc keeps guard boundary');

  must(doc, '# COPILOT AI ACTION ROADMAP 01', 'AI action roadmap doc title present');
  must(doc, 'docs/check milestone', 'AI action roadmap doc keeps docs/check wording');
  must(doc, 'PHASE 0 — READ / EXPLAIN', 'AI action roadmap doc keeps phase 0 wording');
  must(doc, 'PHASE 1 — RECOMMEND', 'AI action roadmap doc keeps phase 1 wording');
  must(doc, 'PHASE 2 — PREPARE', 'AI action roadmap doc keeps phase 2 wording');
  must(doc, 'PHASE 3 — HUMAN_APPROVAL_REQUIRED', 'AI action roadmap doc keeps phase 3 wording');
  must(doc, 'PHASE 4 — GUARDED_EXECUTION, future only', 'AI action roadmap doc keeps phase 4 future-only wording');
  must(doc, 'PHASE 5 — AUDIT_AND_MONITOR, future only', 'AI action roadmap doc keeps phase 5 future-only wording');
  must(doc, 'Low-risk assistive actions', 'AI action roadmap doc keeps assistive actions heading');
  must(doc, 'Medium-risk preparation actions', 'AI action roadmap doc keeps preparation actions heading');
  must(doc, 'High-risk guarded actions, future only', 'AI action roadmap doc keeps guarded actions heading');
  must(doc, 'Never-autonomous actions', 'AI action roadmap doc keeps never-autonomous actions heading');
  must(doc, 'SUPER_ADMIN', 'AI action roadmap doc keeps super admin roadmap');
  must(doc, 'ROOM', 'AI action roadmap doc keeps room roadmap');
  must(doc, 'COMPANY', 'AI action roadmap doc keeps company roadmap');
  must(doc, 'DRIVER', 'AI action roadmap doc keeps driver roadmap');
  must(doc, 'PERSONEL / PARENT', 'AI action roadmap doc keeps personel/parent roadmap');
  must(doc, 'SCHOOL / ORGANIZATION', 'AI action roadmap doc keeps school/organization roadmap');
  must(doc, 'explicit human approval', 'AI action roadmap doc keeps explicit approval wording');
  must(doc, 'RBAC', 'AI action roadmap doc keeps RBAC wording');
  must(doc, 'IDOR', 'AI action roadmap doc keeps IDOR wording');
  must(doc, 'idempotency key', 'AI action roadmap doc keeps idempotency wording');
  must(doc, 'dry-run / preview payload', 'AI action roadmap doc keeps preview wording');
  must(doc, 'audit log', 'AI action roadmap doc keeps audit log wording');
  must(doc, 'before/after snapshot', 'AI action roadmap doc keeps before/after wording');
  must(doc, 'rollback / undo note', 'AI action roadmap doc keeps rollback wording');
  must(doc, 'failure fallback', 'AI action roadmap doc keeps fallback wording');
  must(doc, 'no silent execution', 'AI action roadmap doc keeps no silent execution wording');
  must(doc, 'no hidden background action', 'AI action roadmap doc keeps hidden background action wording');
  must(doc, 'no secret / token exposure', 'AI action roadmap doc keeps secret/token wording');
  must(doc, 'KVKK / privacy minimization', 'AI action roadmap doc keeps KVKK/privacy wording');
  must(doc, 'Underpromise, overdeliver', 'AI action roadmap doc keeps trust strategy wording');
  must(doc, 'Kullanıcıya "AI her şeyi yapar" denmez.', 'AI action roadmap doc avoids overclaim copy');
  must(doc, 'Nihai karar kullanıcıdadır.', 'AI action roadmap doc keeps final decision wording');
  must(doc, 'Kritik işlerde insan onayı gerekir.', 'AI action roadmap doc keeps human approval wording');
  must(doc, 'Runtime AI action açılmaz.', 'AI action roadmap doc keeps runtime boundary');
  must(doc, 'Tool execution açılmaz.', 'AI action roadmap doc keeps tool execution boundary');
  must(doc, 'Write-action dispatcher açılmaz.', 'AI action roadmap doc keeps dispatcher boundary');
  must(doc, 'Payment / billing / hakediş execute açılmaz.', 'AI action roadmap doc keeps payment boundary');
  must(doc, 'Contract / agreement execute açılmaz.', 'AI action roadmap doc keeps contract boundary');
  must(doc, 'Offer auto-accept açılmaz.', 'AI action roadmap doc keeps offer boundary');
  must(doc, 'Supplier auto-selection açılmaz.', 'AI action roadmap doc keeps supplier boundary');
  must(doc, 'Route apply açılmaz.', 'AI action roadmap doc keeps route boundary');
  must(doc, 'Driver / vehicle assignment execute açılmaz.', 'AI action roadmap doc keeps assignment boundary');
  must(doc, 'Provider credential management açılmaz.', 'AI action roadmap doc keeps credential boundary');
  must(doc, 'User / account / admin write-action açılmaz.', 'AI action roadmap doc keeps admin boundary');
  must(doc, 'Prisma / schema / migration açılmaz.', 'AI action roadmap doc keeps prisma boundary');

  must(helper, 'COPILOT_AI_ACTION_ROADMAP_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_AI_ACTION_PHASES', 'helper exposes phases');
  must(helper, 'COPILOT_AI_ACTION_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_AI_ACTION_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_AI_ACTION_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_AI_ACTION_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_AI_ACTION_NEVER_AUTONOMOUS', 'helper exposes never-autonomous actions');
  must(helper, 'COPILOT_AI_ACTION_ROADMAP', 'helper exposes roadmap object');
  must(helper, 'listCopilotAiActionRoadmapRoles', 'helper exposes role lister');
  must(helper, 'getCopilotAiActionRoadmap', 'helper exposes roadmap getter');
  for (const role of requiredRoles) {
    must(helper, `${role}: Object.freeze({`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'execFileSync', 'helper has no child-process runtime');
  mustNot(helper, 'fetch(', 'helper has no network runtime');
  mustNot(helper, 'spawn(', 'helper has no spawned runtime');

  mustNoDiffExceptWithIdentity(['backend/src/routes', 'backend/src/services', 'prisma'], CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  console.log('=== COPILOT-AI-ACTION-ROADMAP-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
