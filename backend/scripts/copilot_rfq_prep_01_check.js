#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as copilotRfqPrep from '../src/ai/chat/copilotRfqPrep.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

let guardCases = 0;
let passCount = 0;
let failCount = 0;

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
  guardCases += 1;
  passCount += 1;
  console.log(`OK ${label}`);
}

function fail(label) {
  failCount += 1;
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustCondition(condition, label) {
  if (condition) ok(label);
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

function mustEveryItemInText(text, items, label) {
  mustCondition(Array.isArray(items), `${label} export is array`);
  for (const item of items) {
    must(text, item, `${label} includes ${item}`);
  }
}

const requiredStages = [
  'RFQ Scope Intake',
  'Candidate Readiness Matrix',
  'Risk and Privacy Gate',
  'Draft-Only RFQ Prep',
  'Human Approval Gate',
  'Next Milestone Handoff',
];

const requiredCategories = [
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'DRAFT',
  'RISK_SUMMARY',
  'NEXT_STEP',
  'HUMAN_APPROVAL_REQUIRED',
];

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

async function main() {
  console.log('=== COPILOT-RFQ-PREP-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const demandToAgreementDoc = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const doc = read('docs/COPILOT_RFQ_PREP_01.md');
  const helper = read('backend/src/ai/chat/copilotRfqPrep.js');
  const demandToAgreementHelper = read('backend/src/ai/chat/copilotDemandToAgreementRoadmap.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:copilotrfqprep01": "node backend/scripts/copilot_rfq_prep_01_check.js"', 'package.json exposes RFQ prep check');
  ordered(runner, ['check:copilotdemandagreement01', 'check:copilotrfqprep01', 'check:copilothumanapproval01'], 'product extensions runner places RFQ prep after demand-to-agreement');
  ordered(verify, ['check:copilotdemandagreement01', 'check:copilotrfqprep01', 'check:copilothumanapproval01'], 'verify chain places RFQ prep after demand-to-agreement');

  must(guide, 'COPILOT-RFQ-PREP-01', 'milestone guide mentions RFQ prep milestone');
  must(guide, 'check:copilotrfqprep01', 'milestone guide exposes RFQ prep check');
  must(guide, 'node backend\\scripts\\copilot_rfq_prep_01_check.js', 'milestone guide includes RFQ prep command');
  must(guide, 'docs/COPILOT_RFQ_PREP_01.md', 'milestone guide includes RFQ prep doc');
  ordered(guide, ['COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'COPILOT-RFQ-PREP-01', 'COPILOT-HUMAN-APPROVAL-01'], 'milestone guide keeps RFQ prep between demand-to-agreement and human approval');

  must(primer, 'COPILOT-RFQ-PREP-01', 'primer mentions RFQ prep milestone');
  must(primer, 'docs/COPILOT_RFQ_PREP_01.md', 'primer links RFQ prep doc');
  ordered(primer, ['COPILOT-DEMAND-INTAKE-01', 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'COPILOT-RFQ-PREP-01', 'COPILOT-HUMAN-APPROVAL-01', 'COPILOT-EXCEL-DEMAND-IMPORT-01'], 'primer keeps RFQ prep before human approval');

  must(roadmapLock, 'COPILOT-RFQ-PREP-01', 'roadmap lock keeps RFQ prep milestone');
  must(roadmapLock, 'draft-only RFQ prep companion milestone', 'roadmap lock keeps RFQ prep wording');

  must(demandToAgreementDoc, 'COPILOT-RFQ-PREP-01', 'demand-to-agreement doc references RFQ prep companion');
  must(demandToAgreementDoc, 'Supplier matching yok.', 'demand-to-agreement doc keeps supplier matching boundary');
  must(demandToAgreementDoc, 'Offer collect yok.', 'demand-to-agreement doc keeps offer collect boundary');

  must(doc, '# COPILOT RFQ PREP 01', 'RFQ prep doc title present');
  must(doc, 'docs/check milestone', 'RFQ prep doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotrfqprep01`', 'RFQ prep doc keeps canonical check wording');
  ordered(doc, requiredStages, 'RFQ prep doc keeps stage ordering');
  for (const category of requiredCategories) {
    must(doc, category, `RFQ prep doc includes category ${category}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `RFQ prep doc includes role ${role}`);
  }
  must(doc, 'Static helper', 'RFQ prep doc keeps static helper section');
  must(doc, 'Kapsam dışı', 'RFQ prep doc keeps out-of-scope section');
  must(doc, 'RFQ send açılmaz.', 'RFQ prep doc keeps RFQ boundary');
  must(doc, 'Supplier matching açılmaz.', 'RFQ prep doc keeps supplier matching boundary');
  must(doc, 'Offer collect açılmaz.', 'RFQ prep doc keeps offer collect boundary');
  must(doc, 'Offer accept/reject açılmaz.', 'RFQ prep doc keeps offer accept/reject boundary');
  must(doc, 'Agreement/contract execute açılmaz.', 'RFQ prep doc keeps agreement boundary');
  must(doc, 'Dispatch apply açılmaz.', 'RFQ prep doc keeps dispatch boundary');
  must(doc, 'Route apply açılmaz.', 'RFQ prep doc keeps route boundary');
  must(doc, 'Payment/hakediş execute açılmaz.', 'RFQ prep doc keeps payment boundary');
  must(doc, 'SMS/email/push açılmaz.', 'RFQ prep doc keeps messaging boundary');
  must(doc, 'Provider credential management açılmaz.', 'RFQ prep doc keeps credential boundary');
  must(doc, 'User/account/admin write-action açılmaz.', 'RFQ prep doc keeps admin boundary');
  must(doc, 'Backend route/service/schema açılmaz.', 'RFQ prep doc keeps backend boundary');
  must(doc, 'Prisma/schema/migration açılmaz.', 'RFQ prep doc keeps prisma boundary');
  must(doc, 'backend/src/ai/chat/copilotRfqPrep.js', 'RFQ prep doc links static helper');
  must(doc, 'No production DB.', 'RFQ prep doc keeps production DB boundary');
  must(doc, 'No route/service/prisma diff.', 'RFQ prep doc keeps route/service/prisma boundary');
  must(doc, 'prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only', 'RFQ prep doc keeps prisma summary wording');
  for (const summaryKey of ['rfqPrepSummary', 'candidateReadinessSummary', 'humanApprovalBoundarySummary', 'compatibilitySummary', 'smokeThresholdSummary', 'chainWiringSummary', 'commitExternalSummary', 'prismaSummary']) {
    must(doc, summaryKey, `RFQ prep doc keeps ${summaryKey}`);
  }

  must(helper, 'COPILOT_RFQ_PREP_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_RFQ_PREP_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_RFQ_PREP_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_RFQ_PREP_CHECKLIST', 'helper exposes checklist');
  must(helper, 'COPILOT_RFQ_PREP_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_RFQ_PREP_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_RFQ_PREP_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_RFQ_PREP_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_RFQ_PREP_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_RFQ_PREP_POLICY', 'helper exposes policy object');
  must(helper, 'listCopilotRfqPrepRoles', 'helper exposes role lister');
  must(helper, 'getCopilotRfqPrepPolicy', 'helper exposes policy getter');
  ordered(helper, requiredStages, 'helper keeps stage ordering');
  for (const role of requiredRoles) {
    must(helper, `buildRfqPrepRole('${role}'`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router', 'helper has no router runtime');
  mustNot(helper, 'prisma', 'helper has no prisma runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');

  must(demandToAgreementHelper, "companionMilestone: 'COPILOT-RFQ-PREP-01'", 'demand-to-agreement helper links RFQ prep companion');
  must(demandToAgreementHelper, 'supplier matching execute', 'demand-to-agreement helper blocks supplier matching');
  must(demandToAgreementHelper, 'offer collect execute', 'demand-to-agreement helper blocks offer collect');

  must(harnessCheck, 'check:copilotrfqprep01', 'script harness check knows RFQ prep alias');
  must(harnessCheck, 'copilot_rfq_prep_01_check.js', 'script harness check knows RFQ prep file');
  must(harnessCheck, 'COPILOT-RFQ-PREP-01', 'script harness check knows RFQ prep milestone');
  must(harnessCheck, 'docs/COPILOT_RFQ_PREP_01.md', 'script harness check knows RFQ prep doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotRfqPrep.js', 'script harness check knows RFQ prep helper');

  must(harnessDoc, 'root:check:copilotrfqprep01', 'script harness doc lists RFQ prep root check');
  must(harnessDoc, 'copilot_rfq_prep_01_check.js', 'script harness doc lists RFQ prep check');
  must(harnessDoc, 'docs/COPILOT_RFQ_PREP_01.md', 'script harness doc lists RFQ prep doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotRfqPrep.js', 'script harness doc lists RFQ prep helper');
  must(harnessDoc, 'COPILOT-RFQ-PREP-01', 'script harness doc lists RFQ prep milestone');

  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_STAGES), 'helper module exposes stages array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_CATEGORIES), 'helper module exposes categories array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_CHECKLIST), 'helper module exposes checklist array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_GUARD_REQUIREMENTS), 'helper module exposes guard requirements array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_PUBLIC_PROMISE), 'helper module exposes public promise array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_BLOCKED_ACTIONS), 'helper module exposes blocked actions array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_NEVER_AUTOMATE), 'helper module exposes never automate array');
  mustCondition(Array.isArray(copilotRfqPrep.COPILOT_RFQ_PREP_HANOFFS), 'helper module exposes handoffs array');

  for (const stage of copilotRfqPrep.COPILOT_RFQ_PREP_STAGES) {
    mustCondition(Boolean(stage && typeof stage === 'object'), `helper stage object exists for ${stage?.title ?? 'unknown'}`);
    mustCondition(typeof stage.id === 'string' && stage.id.length > 0, `helper stage ${stage.title} has id`);
    mustCondition(typeof stage.title === 'string' && stage.title.length > 0, `helper stage ${stage.id} has title`);
    mustCondition(stage.status === 'current baseline', `helper stage ${stage.id} keeps current baseline status`);
    mustCondition(stage.futureOnly === false, `helper stage ${stage.id} stays current baseline`);
    must(helper, stage.title, `helper text includes stage title ${stage.title}`);
  }

  for (const category of copilotRfqPrep.COPILOT_RFQ_PREP_CATEGORIES) {
    mustCondition(Boolean(category && typeof category === 'object'), `helper category object exists for ${category?.title ?? 'unknown'}`);
    mustCondition(typeof category.id === 'string' && category.id.length > 0, `helper category ${category.title} has id`);
    mustCondition(typeof category.title === 'string' && category.title.length > 0, `helper category ${category.id} has title`);
    mustCondition(typeof category.meaning === 'string' && category.meaning.length > 0, `helper category ${category.id} has meaning`);
    must(helper, category.title, `helper text includes category title ${category.title}`);
  }

  mustEveryItemInText(helper, copilotRfqPrep.COPILOT_RFQ_PREP_CHECKLIST, 'helper checklist');
  mustEveryItemInText(helper, copilotRfqPrep.COPILOT_RFQ_PREP_GUARD_REQUIREMENTS, 'helper guard requirements');
  mustEveryItemInText(helper, copilotRfqPrep.COPILOT_RFQ_PREP_PUBLIC_PROMISE, 'helper public promise');
  mustEveryItemInText(helper, copilotRfqPrep.COPILOT_RFQ_PREP_BLOCKED_ACTIONS, 'helper blocked actions');
  mustEveryItemInText(helper, copilotRfqPrep.COPILOT_RFQ_PREP_NEVER_AUTOMATE, 'helper never automate');
  mustEveryItemInText(helper, copilotRfqPrep.COPILOT_RFQ_PREP_HANOFFS, 'helper handoffs');

  mustCondition(copilotRfqPrep.listCopilotRfqPrepRoles().length === Object.keys(copilotRfqPrep.COPILOT_RFQ_PREP_POLICY).length, 'helper role list count matches policy keys');
  for (const role of copilotRfqPrep.listCopilotRfqPrepRoles()) {
    const policy = copilotRfqPrep.getCopilotRfqPrepPolicy(role);
    mustCondition(Boolean(policy), `helper policy exists for role ${role}`);
    mustCondition(policy.role === role, `helper policy role matches ${role}`);
    mustCondition(typeof policy.visible === 'boolean', `helper policy visible flag exists for role ${role}`);
  }

  const stageCount = copilotRfqPrep.COPILOT_RFQ_PREP_STAGES.length;
  const categoryCount = copilotRfqPrep.COPILOT_RFQ_PREP_CATEGORIES.length;
  const checklistCount = copilotRfqPrep.COPILOT_RFQ_PREP_CHECKLIST.length;
  const guardRequirementCount = copilotRfqPrep.COPILOT_RFQ_PREP_GUARD_REQUIREMENTS.length;
  const publicPromiseCount = copilotRfqPrep.COPILOT_RFQ_PREP_PUBLIC_PROMISE.length;
  const blockedActionCount = copilotRfqPrep.COPILOT_RFQ_PREP_BLOCKED_ACTIONS.length;
  const neverAutomateCount = copilotRfqPrep.COPILOT_RFQ_PREP_NEVER_AUTOMATE.length;
  const handoffCount = copilotRfqPrep.COPILOT_RFQ_PREP_HANOFFS.length;

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  mustCondition(guardCases >= 190, 'RFQ prep check keeps at least 190 guard cases');
  mustCondition(passCount >= 190, 'RFQ prep check keeps at least 190 passing cases');
  mustCondition(failCount === 0, 'RFQ prep check keeps fail count at zero');

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`rfqIntentSummary=stages=${stageCount}; categories=${categoryCount}; helper-driven draft-only RFQ prep stays human-approved`);
  console.log(`rfqTypeSummary=stages=${stageCount}; categories=${categoryCount}; roles=${Object.keys(copilotRfqPrep.COPILOT_RFQ_PREP_POLICY).length}`);
  console.log(`requiredFieldSummary=checklist=${checklistCount}; guardRequirements=${guardRequirementCount}; publicPromise=${publicPromiseCount}; blockedActions=${blockedActionCount}; neverAutomate=${neverAutomateCount}; handoffs=${handoffCount}`);
  console.log(`supplierQuestionSummary=verified supplier signals stay read-only; supplier matching and supplier auto-selection remain blocked`);
  console.log(`readinessChecklistSummary=${checklistCount} items; scope, readiness, risk, and handoff coverage stay visible`);
  console.log('draftOnlySummary=draft-only RFQ prep remains a preview and never becomes execution');
  console.log('safetyPhraseSummary=public promise stays underpromise/overdeliver and never claims untested execution');
  console.log('kvkkSafeSummary=KVKK minimization, no secret exposure, and no production DB remain enforced');
  console.log('auditApprovalSummary=explicit human approval, audit log, snapshot, and rollback note remain enforced');
  console.log('noWriteActionSummary=no silent execution, no hidden background action, and no write-action dispatcher remain blocked');
  console.log('chainWiringSummary=check:copilotdemandagreement01 -> check:copilotrfqprep01 -> check:copilothumanapproval01 remains wired');
  console.log('smokeThresholdSummary=18/82/82/82 with consoleErrorCount=0, pageErrorCount=0, 429=none remains the threshold');
  console.log('commitExternalSummary=runtime-data, browser-smoke, and debug.log stay commit-external');
  console.log('prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only');
  console.log('PASS COPILOT-RFQ-PREP-01');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
