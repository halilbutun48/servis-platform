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
  'COMPANY',
  'ROOM',
  'DRIVER',
  'PERSONEL',
  'PARENT',
  'SCHOOL',
  'ORGANIZATION',
];

const requiredStages = [
  'Demand Intake',
  'Data Readiness',
  'Stop / Route Draft Readiness',
  'RFQ / Offer Prep',
  'Offer Comparison',
  'Negotiation / Clarification Prep',
  'Agreement Prep',
  'Dispatch / Operation Prep',
];

const requiredCategories = [
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'HUMAN_APPROVAL_REQUIRED',
];

async function main() {
  console.log('=== COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const doc = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const helper = read('backend/src/ai/chat/copilotDemandToAgreementRoadmap.js');
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotdemandagreement01": "node backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js"', 'package.json exposes demand-to-agreement check');
  assertProductExtensionsOrder(['check:copilotairoadmap01', 'check:copilotdemandagreement01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps demand-to-agreement after AI action roadmap', registryScripts);
  assertProductExtensionsOrder(['check:copilotairoadmap01', 'check:copilotdemandagreement01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps demand-to-agreement after AI action roadmap', registryScripts);

  must(guide, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'milestone guide mentions demand-to-agreement milestone');
  must(guide, 'check:copilotdemandagreement01', 'milestone guide exposes demand-to-agreement check');
  must(guide, 'node backend\\scripts\\copilot_demand_to_agreement_roadmap_01_check.js', 'milestone guide includes demand-to-agreement command');
  must(guide, 'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md', 'milestone guide includes demand-to-agreement doc');
  ordered(guide, ['COPILOT-ROLE-TASK-MATRIX-01', 'COPILOT-AI-ACTION-ROADMAP-01', 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01'], 'milestone guide keeps demand-to-agreement after AI action roadmap');

  must(primer, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'primer mentions demand-to-agreement milestone');
  must(primer, 'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md', 'primer links demand-to-agreement doc');

  must(roadmapLock, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'roadmap lock keeps demand-to-agreement milestone');
  must(roadmapLock, 'demand-to-agreement', 'roadmap lock keeps demand-to-agreement wording');
  must(roadmapLock, 'COPILOT-RFQ-PREP-01', 'roadmap lock keeps RFQ prep companion milestone');
  must(roadmapLock, 'draft-only RFQ prep companion milestone', 'roadmap lock keeps RFQ prep wording');

  must(roleMatrix, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'role/task matrix doc references demand-to-agreement milestone');
  must(roleMatrix, 'runtime AI action açmaz', 'role/task matrix doc keeps runtime AI boundary');
  must(roleMatrix, 'talep -> teklif -> sözleşme hazırlık roadmap', 'role/task matrix doc links demand-to-agreement roadmap');

  must(aiRoadmap, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'AI action roadmap doc references next roadmap');
  must(aiRoadmap, 'demand-to-agreement hazırlık hattına zemin hazırlar', 'AI action roadmap doc keeps demand-to-agreement bridge wording');

  must(doc, '# COPILOT DEMAND TO AGREEMENT ROADMAP 01', 'demand-to-agreement doc title present');
  must(doc, 'docs/check milestone', 'demand-to-agreement doc keeps docs/check wording');
  ordered(doc, requiredStages, 'demand-to-agreement doc keeps stage ordering');
  must(doc, 'Copilot görev sınırı', 'demand-to-agreement doc keeps task boundary section');
  for (const category of requiredCategories) {
    must(doc, category, `demand-to-agreement doc includes category ${category}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `demand-to-agreement doc includes role ${role}`);
  }
  must(doc, 'Static helper', 'demand-to-agreement doc keeps static helper section');
  must(doc, 'Kapsam dışı', 'demand-to-agreement doc keeps out-of-scope section');
  must(doc, 'Kullanıcı onaylarsa', 'demand-to-agreement doc keeps human approval wording');
  must(doc, 'Underpromise, overdeliver', 'demand-to-agreement doc keeps trust strategy wording');
  must(doc, 'Kullanıcıya "AI her şeyi yapar" denmez.', 'demand-to-agreement doc avoids overclaim copy');
  must(doc, 'Nihai karar kullanıcıdadır.', 'demand-to-agreement doc keeps final decision wording');
  must(doc, 'Kritik işlerde insan onayı gerekir.', 'demand-to-agreement doc keeps human approval wording');
  must(doc, 'Runtime AI action yok.', 'demand-to-agreement doc keeps runtime boundary');
  must(doc, 'Tool execution yok.', 'demand-to-agreement doc keeps tool boundary');
  must(doc, 'Demand create execute yok.', 'demand-to-agreement doc keeps demand boundary');
  must(doc, 'Excel/CSV import execute yok.', 'demand-to-agreement doc keeps import boundary');
  must(doc, 'Route apply yok.', 'demand-to-agreement doc keeps route boundary');
  must(doc, 'RFQ send yok.', 'demand-to-agreement doc keeps RFQ boundary');
  must(doc, 'COPILOT-RFQ-PREP-01', 'demand-to-agreement doc references RFQ prep companion');
  must(doc, 'Supplier matching yok.', 'demand-to-agreement doc keeps supplier matching boundary');
  must(doc, 'Offer collect yok.', 'demand-to-agreement doc keeps offer collect boundary');
  must(doc, 'Offer accept/reject yok.', 'demand-to-agreement doc keeps offer boundary');
  must(doc, 'Supplier auto-selection yok.', 'demand-to-agreement doc keeps supplier boundary');
  must(doc, 'Agreement/contract execute yok.', 'demand-to-agreement doc keeps agreement boundary');
  must(doc, 'Dispatch apply yok.', 'demand-to-agreement doc keeps dispatch boundary');
  must(doc, 'Driver/vehicle assignment yok.', 'demand-to-agreement doc keeps assignment boundary');
  must(doc, 'Stop reached/skipped/complete yok.', 'demand-to-agreement doc keeps stop boundary');
  must(doc, 'Payment/hakediş execute yok.', 'demand-to-agreement doc keeps payment boundary');
  must(doc, 'SMS/email/push yok.', 'demand-to-agreement doc keeps messaging boundary');
  must(doc, 'Provider credential management yok.', 'demand-to-agreement doc keeps credential boundary');
  must(doc, 'User/account/admin write-action yok.', 'demand-to-agreement doc keeps admin boundary');
  must(doc, 'Backend route/service/schema yok.', 'demand-to-agreement doc keeps backend boundary');
  must(doc, 'Prisma/schema/migration yok.', 'demand-to-agreement doc keeps prisma boundary');
  must(doc, 'backend/src/ai/chat/copilotDemandToAgreementRoadmap.js', 'demand-to-agreement doc links static helper');

  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_NEVER_AUTOMATE', 'helper exposes never-automate list');
  must(helper, 'COPILOT_DEMAND_TO_AGREEMENT_ROADMAP', 'helper exposes roadmap object');
  must(helper, "companionMilestone: 'COPILOT-RFQ-PREP-01'", 'helper links RFQ prep companion milestone');
  must(helper, 'supplier matching execute', 'helper blocks supplier matching execution');
  must(helper, 'offer collect execute', 'helper blocks offer collect execution');
  must(helper, 'listCopilotDemandToAgreementRoadmapRoles', 'helper exposes role lister');
  must(helper, 'getCopilotDemandToAgreementRoadmap', 'helper exposes roadmap getter');
  ordered(helper, requiredStages, 'helper keeps roadmap stage ordering');
  for (const role of requiredRoles) {
    must(helper, `buildDemandRoadmapRole('${role}',`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'execFileSync', 'helper has no child-process runtime');
  mustNot(helper, 'fetch(', 'helper has no network runtime');
  mustNot(helper, 'spawn(', 'helper has no spawned runtime');

  mustNoDiffExceptWithIdentity(
    ['backend/src/routes', 'backend/src/services', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    'backend route/service/schema and Prisma diff stays empty'
  );
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
