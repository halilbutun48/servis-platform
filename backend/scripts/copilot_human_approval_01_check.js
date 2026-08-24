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

const APPROVED_CONCURRENT_BACKEND_DIFF = [
  'backend/src/routes/companyOverview.js',
   { path: 'backend/src/routes/commercialCore.js', sha256: '088503EEBD1AFA49616E00E04D6295F12961948BE3DFADBB049E16C266F2602F' },
  { path: 'backend/src/routes/operationProof.js', sha256: 'E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0' },
  { path: 'backend/src/routes/trustQuality.js', sha256: 'FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD' },
  { path: 'backend/src/services/qualityPaymentBridgeService.js', sha256: '935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83' },
  { path: 'backend/src/routes/admin.js', sha256: '61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4' },
  { path: 'backend/src/routes/agreements.js', sha256: '90CED5678F26B47AE69CE985D6D436B70DF8886B523ECA8988E51BE53ECD2B9A' },
  { path: 'backend/src/routes/auth.js', sha256: 'A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3' },
  { path: 'backend/src/routes/dashboardBulk.js', sha256: 'C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F' },
  { path: 'backend/src/routes/offers.js', sha256: '40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649' },
  { path: 'backend/src/routes/public.js', sha256: '5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23' },
    { path: 'backend/src/services/dashboardBulk.js', sha256: 'E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E' },
];

const requiredChecklist = [
  'Action summary',
  'Role / actor',
  'Scope',
  'Data source',
  'Confidence',
  'Missing data',
  'Risk summary',
  'Impact preview',
  'Reversibility',
  'Audit expectation',
  'Human confirmation phrase',
  'Safe fallback',
];

async function main() {
  console.log('=== COPILOT-HUMAN-APPROVAL-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const doc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const helper = read('backend/src/ai/chat/copilotHumanApprovalPolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilothumanapproval01": "node backend/scripts/copilot_human_approval_01_check.js"', 'package.json exposes human approval check');
  assertProductExtensionsOrder(['check:copilotdemandagreement01', 'check:copilothumanapproval01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps human approval after demand-to-agreement', registryScripts);
  assertProductExtensionsOrder(['check:copilotdemandagreement01', 'check:copilothumanapproval01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps human approval after demand-to-agreement', registryScripts);

  must(guide, 'COPILOT-HUMAN-APPROVAL-01', 'milestone guide mentions human approval milestone');
  must(guide, 'check:copilothumanapproval01', 'milestone guide exposes human approval check');
  must(guide, 'node backend\\scripts\\copilot_human_approval_01_check.js', 'milestone guide includes human approval command');
  must(guide, 'docs/COPILOT_HUMAN_APPROVAL_01.md', 'milestone guide includes human approval doc');
  ordered(guide, ['COPILOT-ROLE-TASK-MATRIX-01', 'COPILOT-AI-ACTION-ROADMAP-01', 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'COPILOT-HUMAN-APPROVAL-01'], 'milestone guide keeps human approval after demand-to-agreement');

  must(primer, 'COPILOT-HUMAN-APPROVAL-01', 'primer mentions human approval milestone');
  must(primer, 'docs/COPILOT_HUMAN_APPROVAL_01.md', 'primer links human approval doc');

  must(roadmapLock, 'COPILOT-HUMAN-APPROVAL-01', 'roadmap lock keeps human approval milestone');
  must(roadmapLock, 'human approval', 'roadmap lock keeps human approval wording');

  must(roleMatrix, 'COPILOT-HUMAN-APPROVAL-01', 'role/task matrix doc references human approval milestone');
  must(roleMatrix, 'runtime AI action açmaz', 'role/task matrix doc keeps runtime AI boundary');
  must(roleMatrix, 'insan onayı gerekir', 'role/task matrix doc keeps human approval wording');

  must(aiRoadmap, 'COPILOT-HUMAN-APPROVAL-01', 'AI action roadmap doc references human approval milestone');
  must(aiRoadmap, 'human approval', 'AI action roadmap doc keeps human approval wording');

  must(demandToAgreement, 'COPILOT-HUMAN-APPROVAL-01', 'demand-to-agreement doc references human approval milestone');
  must(demandToAgreement, 'human approval', 'demand-to-agreement doc keeps human approval wording');

  must(doc, '# COPILOT HUMAN APPROVAL 01', 'human approval doc title present');
  must(doc, 'docs/check milestone', 'human approval doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilothumanapproval01`', 'human approval doc keeps canonical check wording');
  must(doc, 'READ', 'human approval doc includes READ category');
  for (const category of requiredCategories) {
    must(doc, category, `human approval doc includes ${category} category`);
  }
  ordered(doc, requiredChecklist, 'human approval doc keeps approval checklist ordering');
  must(doc, 'SUPER_ADMIN', 'human approval doc includes super admin role');
  must(doc, 'COMPANY', 'human approval doc includes company role');
  must(doc, 'ROOM', 'human approval doc includes room role');
  must(doc, 'DRIVER', 'human approval doc includes driver role');
  must(doc, 'PERSONEL / PARENT', 'human approval doc includes personel/parent role');
  must(doc, 'SCHOOL / ORGANIZATION', 'human approval doc includes school/organization role');
  must(doc, 'voice command alone must not execute critical actions', 'human approval doc keeps voice boundary wording');
  must(doc, 'second explicit confirmation is required for critical voice actions', 'human approval doc keeps second confirmation wording');
  must(doc, 'wrong-interpretation risk stops the action', 'human approval doc keeps wrong interpretation wording');
  must(doc, 'safe autopilot does not open real-world action', 'human approval doc keeps safe autopilot wording');
  must(doc, 'real autopilot action only after separate milestone + audit + rollback + explicit human approval guard', 'human approval doc keeps real autopilot boundary');
  must(doc, 'AI her şeyi yapar public promise yok.', 'human approval doc keeps no overclaim wording');
  must(doc, 'Tek tıkla her şeyi halleder gibi bir overclaim yok.', 'human approval doc keeps no overclaim wording');
  must(doc, 'Underpromise, overdeliver stratejisi korunur.', 'human approval doc keeps trust strategy wording');
  must(doc, 'backend/src/ai/chat/copilotHumanApprovalPolicy.js', 'human approval doc links static helper');
  must(doc, 'runtime AI action açmaz', 'human approval doc keeps runtime boundary');
  must(doc, 'Tool execution açılmaz.', 'human approval doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açılmaz.', 'human approval doc keeps dispatcher boundary');
  must(doc, 'Demand create execute açılmaz.', 'human approval doc keeps demand boundary');
  must(doc, 'Excel/CSV import execute açılmaz.', 'human approval doc keeps import boundary');
  must(doc, 'Address/geocode persistent write açılmaz.', 'human approval doc keeps geocode boundary');
  must(doc, 'Route apply açılmaz.', 'human approval doc keeps route boundary');
  must(doc, 'RFQ send açılmaz.', 'human approval doc keeps RFQ boundary');
  must(doc, 'Offer accept/reject açılmaz.', 'human approval doc keeps offer boundary');
  must(doc, 'Supplier auto-selection açılmaz.', 'human approval doc keeps supplier boundary');
  must(doc, 'Agreement/contract execute açılmaz.', 'human approval doc keeps agreement boundary');
  must(doc, 'Dispatch apply açılmaz.', 'human approval doc keeps dispatch boundary');
  must(doc, 'Driver/vehicle assignment açılmaz.', 'human approval doc keeps assignment boundary');
  must(doc, 'Stop reached/skipped/complete açılmaz.', 'human approval doc keeps stop boundary');
  must(doc, 'Payment/hakediş execute açılmaz.', 'human approval doc keeps payment boundary');
  must(doc, 'SMS/email/push açılmaz.', 'human approval doc keeps messaging boundary');
  must(doc, 'Provider credential management açılmaz.', 'human approval doc keeps credential boundary');
  must(doc, 'User/account/admin write-action açılmaz.', 'human approval doc keeps admin boundary');
  must(doc, 'Cross-organization write açılmaz.', 'human approval doc keeps cross-org boundary');
  must(doc, 'Voice command execute açılmaz.', 'human approval doc keeps voice boundary');
  must(doc, 'Autopilot real action açılmaz.', 'human approval doc keeps autopilot boundary');
  must(doc, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'human approval doc references future milestone');
  must(doc, 'COPILOT-SAFE-AUTOPILOT-01', 'human approval doc references future milestone');

  must(helper, 'COPILOT_HUMAN_APPROVAL_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_HUMAN_APPROVAL_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_HUMAN_APPROVAL_CHECKLIST', 'helper exposes checklist');
  must(helper, 'COPILOT_HUMAN_APPROVAL_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_HUMAN_APPROVAL_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_HUMAN_APPROVAL_VOICE_BOUNDARIES', 'helper exposes voice boundaries');
  must(helper, 'COPILOT_HUMAN_APPROVAL_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_HUMAN_APPROVAL_FUTURE_LINES', 'helper exposes future lines');
  must(helper, 'COPILOT_HUMAN_APPROVAL_POLICY', 'helper exposes policy object');
  must(helper, 'listCopilotHumanApprovalRoles', 'helper exposes role lister');
  must(helper, 'getCopilotHumanApprovalPolicy', 'helper exposes policy getter');
  for (const role of requiredRoles) {
    must(helper, `buildHumanApprovalRole('${role}'`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router', 'helper has no router runtime');
  mustNot(helper, 'prisma', 'helper has no prisma runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');
  mustNot(helper, 'http.request', 'helper has no http runtime');

  must(harnessCheck, 'check:copilothumanapproval01', 'script harness check knows human approval alias');
  must(harnessCheck, 'copilot_human_approval_01_check.js', 'script harness check knows human approval file');
  must(harnessCheck, 'COPILOT-HUMAN-APPROVAL-01', 'script harness check knows human approval milestone');
  must(harnessCheck, 'docs/COPILOT_HUMAN_APPROVAL_01.md', 'script harness check knows human approval doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotHumanApprovalPolicy.js', 'script harness check knows human approval helper');

  must(harnessDoc, 'root:check:copilothumanapproval01', 'script harness doc lists human approval root check');
  must(harnessDoc, 'copilot_human_approval_01_check.js', 'script harness doc lists human approval check');
  must(harnessDoc, 'docs/COPILOT_HUMAN_APPROVAL_01.md', 'script harness doc lists human approval doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotHumanApprovalPolicy.js', 'script harness doc lists human approval helper');
  must(harnessDoc, 'COPILOT-HUMAN-APPROVAL-01', 'script harness doc lists human approval milestone');

  mustNoDiffExceptWithIdentity(['backend/src/routes', 'backend/src/services', 'prisma'], CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== COPILOT-HUMAN-APPROVAL-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
