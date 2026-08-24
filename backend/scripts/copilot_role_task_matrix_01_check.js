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
  'REQUIRES_HUMAN_APPROVAL',
  'BLOCKED_RUNTIME_ACTION',
  'NEVER_AUTOMATE',
];

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
  console.log('=== COPILOT-ROLE-TASK-MATRIX-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const doc = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const helperSource = read('backend/src/ai/chat/copilotRoleTaskMatrix.js');
  const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');
  const screenRegistry = read('web/src/copilot/screenRegistry.js');
  const globalQuality = read('docs/COPILOT_GLOBAL_ANSWER_QUALITY_V1.md');
  const actionStrategy = read('docs/COPILOT_AI_ACTION_STRATEGY_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const verifiedSupplier = read('docs/VERIFIED_SUPPLIER_01.md');
  const inviteBasedMembership = read('docs/INVITE_BASED_MEMBERSHIP_01.md');
  const safeDrive = read('docs/SAFE_DRIVE_01.md');
  const telematicsHub = read('docs/TELEMATICS_PROVIDER_HUB_01.md');
  const offerRanking = read('docs/OFFER_RANKING_QUALITY_01.md');
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotroletaskmatrix01": "node backend/scripts/copilot_role_task_matrix_01_check.js"', 'package.json exposes copilot role/task matrix check');
  assertProductExtensionsOrder(['check:cop04bfix08', 'check:copilotroletaskmatrix01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps copilot role/task matrix before copilot UX polish', registryScripts);
  assertProductExtensionsOrder(['check:cop04bfix08', 'check:copilotroletaskmatrix01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps copilot role/task matrix before copilot UX polish', registryScripts);

  must(guide, 'COPILOT-ROLE-TASK-MATRIX-01', 'milestone guide mentions copilot role/task matrix');
  must(guide, 'check:copilotroletaskmatrix01', 'milestone guide exposes copilot role/task matrix check');
  must(guide, 'node backend\\scripts\\copilot_role_task_matrix_01_check.js', 'milestone guide includes copilot role/task matrix command');
  must(guide, 'docs/COPILOT_ROLE_TASK_MATRIX_01.md', 'milestone guide includes copilot role/task matrix doc');

  must(primer, 'COPILOT-ROLE-TASK-MATRIX-01', 'primer mentions copilot role/task matrix');
  must(primer, 'docs/COPILOT_ROLE_TASK_MATRIX_01.md', 'primer links copilot role/task matrix doc');

  must(roadmap, 'COPILOT-ROLE-TASK-MATRIX-01', 'roadmap keeps copilot role/task matrix milestone');
  must(roadmap, 'role/task matrix', 'roadmap keeps role/task matrix wording');
  must(roadmap, 'guardrail', 'roadmap keeps guardrail wording');

  must(doc, '# COPILOT ROLE TASK MATRIX 01', 'role/task matrix doc title present');
  must(doc, 'docs/check milestone', 'role/task matrix doc keeps docs/check wording');
  must(doc, 'Canonical action model', 'role/task matrix doc keeps canonical action model section');
  must(doc, 'Anla -> Analiz et -> En iyi seçenekleri sun -> Riskleri açıkla -> İnsan onayı al -> Guard\'lı uygula -> Audit log yaz', 'role/task matrix doc keeps canonical action model wording');
  must(doc, 'Guard\'lı uygula', 'role/task matrix doc mentions guard-apply boundary');
  must(doc, 'Audit log yaz', 'role/task matrix doc mentions audit log boundary');
  must(doc, 'READ', 'role/task matrix doc includes READ category');
  must(doc, 'EXPLAIN', 'role/task matrix doc includes EXPLAIN category');
  must(doc, 'RECOMMEND', 'role/task matrix doc includes RECOMMEND category');
  must(doc, 'PREPARE', 'role/task matrix doc includes PREPARE category');
  must(doc, 'REQUIRES_HUMAN_APPROVAL', 'role/task matrix doc includes human approval category');
  must(doc, 'BLOCKED_RUNTIME_ACTION', 'role/task matrix doc includes blocked runtime action category');
  must(doc, 'NEVER_AUTOMATE', 'role/task matrix doc includes never automate category');
  must(doc, 'SUPER_ADMIN', 'role/task matrix doc includes super admin role');
  must(doc, 'ROOM', 'role/task matrix doc includes room role');
  must(doc, 'COMPANY', 'role/task matrix doc includes company role');
  must(doc, 'DRIVER', 'role/task matrix doc includes driver role');
  must(doc, 'PERSONEL', 'role/task matrix doc includes personel role');
  must(doc, 'PARENT', 'role/task matrix doc includes parent role');
  must(doc, 'SCHOOL', 'role/task matrix doc includes school role');
  must(doc, 'ORGANIZATION', 'role/task matrix doc includes organization role');
  must(doc, 'underpromise / overdeliver', 'role/task matrix doc keeps underpromise / overdeliver strategy');
  must(doc, 'Karar kullanıcıdadır', 'role/task matrix doc keeps user decision language');
  must(doc, 'insan onayı gerekir', 'role/task matrix doc keeps human approval language');
  mustNot(doc, 'Her şeyi AI yapar', 'role/task matrix doc avoids overclaim copy');
  must(doc, 'backend/src/ai/chat/helpComposer.js', 'role/task matrix doc links helpComposer bridge');
  must(doc, 'backend/src/ai/chat/intentRouter.js', 'role/task matrix doc links intentRouter bridge');
  must(doc, 'backend/src/ai/chat/answerQualityPolicy.js', 'role/task matrix doc links answer quality policy bridge');
  must(doc, 'backend/src/ai/chat/goldenQuestionPack.js', 'role/task matrix doc links golden question pack bridge');
  must(doc, 'backend/src/ai/jobGuide/screenCatalog.js', 'role/task matrix doc links screen catalog bridge');
  must(doc, 'web/src/copilot/screenRegistry.js', 'role/task matrix doc links screen registry bridge');
  must(doc, 'backend/src/ai/chat/copilotRoleTaskMatrix.js', 'role/task matrix doc links static helper');
  must(doc, 'runtime AI action açmaz', 'role/task matrix doc keeps runtime AI boundary');
  must(doc, 'tool execution', 'role/task matrix doc keeps tool execution boundary');
  must(doc, 'payment/hakediş execute', 'role/task matrix doc keeps payment boundary');
  must(doc, 'contract/agreement execute', 'role/task matrix doc keeps contract boundary');
  must(doc, 'offer auto-accept', 'role/task matrix doc keeps offer auto-accept boundary');
  must(doc, 'supplier auto-selection', 'role/task matrix doc keeps supplier auto-selection boundary');
  must(doc, 'route apply', 'role/task matrix doc keeps route apply boundary');
  must(doc, 'driver / vehicle assignment execute', 'role/task matrix doc keeps assignment boundary');
  must(doc, 'SMS / e-posta / push', 'role/task matrix doc keeps messaging boundary');
  must(doc, 'provider credential', 'role/task matrix doc keeps credential boundary');
  must(doc, 'user / account write-action', 'role/task matrix doc keeps user write-action boundary');

  must(helperSource, 'COPILOT_ROLE_TASK_MATRIX_VERSION', 'helper exposes version marker');
  must(helperSource, 'COPILOT_ACTION_MODEL', 'helper exposes canonical action model');
  must(helperSource, 'COPILOT_TASK_CATEGORIES', 'helper exposes task categories');
  must(helperSource, 'COPILOT_ROLE_TASK_MATRIX', 'helper exposes role/task matrix');
  for (const category of requiredCategories) {
    must(helperSource, category, `helper keeps category ${category}`);
  }
  for (const role of requiredRoles) {
    must(helperSource, `role: '${role}'`, `helper keeps role ${role}`);
  }
  must(helperSource, "Guard'lı uygula", 'helper keeps guard-apply wording');
  must(helperSource, 'Audit log yaz', 'helper keeps audit log wording');
  must(helperSource, 'COMMON_READ_ONLY_RUNTIME_BLOCKS', 'helper keeps shared runtime block list');
  must(helperSource, 'COMMON_NEVER_AUTOMATE', 'helper keeps shared never automate list');
  must(helperSource, 'listCopilotRoles', 'helper exposes role lister');
  must(helperSource, 'getCopilotRoleTaskMatrix', 'helper exposes role matrix getter');

  must(screenCatalog, '/superadmin/trust-quality', 'screen catalog keeps super admin trust quality surface');
  must(screenCatalog, '/room/offers', 'screen catalog keeps room offers surface');
  must(screenCatalog, '/company/agreements', 'screen catalog keeps company agreements surface');
  must(screenCatalog, '/driver/today', 'screen catalog keeps driver today surface');
  must(screenCatalog, '/personel/live', 'screen catalog keeps personel live surface');
  must(screenCatalog, '/parent/live', 'screen catalog keeps parent live surface');
  must(screenCatalog, '/school/operations', 'screen catalog keeps school operations surface');
  must(screenCatalog, '/organization/operations', 'screen catalog keeps organization operations surface');

  must(screenRegistry, '/superadmin/trust-quality', 'screen registry keeps super admin trust quality route');
  must(screenRegistry, '/room/offers', 'screen registry keeps room offers route');
  must(screenRegistry, '/company/agreements', 'screen registry keeps company agreements route');
  must(screenRegistry, '/driver/today', 'screen registry keeps driver today route');
  must(screenRegistry, '/personel/live', 'screen registry keeps personel live route');
  must(screenRegistry, '/parent/live', 'screen registry keeps parent live route');
  must(screenRegistry, '/school/operations', 'screen registry keeps school operations route');
  must(screenRegistry, '/organization/operations', 'screen registry keeps organization operations route');

  must(globalQuality, 'Role-Wide Screen Matrix', 'global quality doc keeps role-wide matrix bridge');
  must(globalQuality, 'Veli / Öğrencimin servisi', 'global quality doc keeps parent bridge');
  must(actionStrategy, 'Prepare', 'action strategy keeps prepare stage');
  must(actionStrategy, 'Confirm', 'action strategy keeps confirm stage');
  must(actionStrategy, 'Track', 'action strategy keeps track stage');
  must(actionStrategy, 'AI kritik write işlemini doğrudan yapmaz', 'action strategy keeps non-write boundary');
  must(demandToAgreement, 'Kullanıcı onaylarsa', 'demand-to-agreement doc keeps human approval wording');
  must(verifiedSupplier, 'human approval', 'verified supplier doc keeps human approval language');
  must(inviteBasedMembership, 'human onaylı', 'invite based membership doc keeps human approval wording');
  must(safeDrive, 'İnsan onayı gerekir', 'safe drive doc keeps human approval wording');
  must(telematicsHub, 'readonly telematics', 'telematics hub doc keeps readonly telematics wording');
  must(offerRanking, 'AI runtime action', 'offer ranking doc keeps AI runtime boundary');

  must(harnessCheck, 'check:copilotroletaskmatrix01', 'script harness check knows copilot role/task matrix alias');
  must(harnessCheck, 'copilot_role_task_matrix_01_check.js', 'script harness check knows copilot role/task matrix file');
  must(harnessCheck, 'COPILOT-ROLE-TASK-MATRIX-01', 'script harness check knows copilot role/task matrix milestone');
  must(harnessCheck, 'docs/COPILOT_ROLE_TASK_MATRIX_01.md', 'script harness check knows copilot role/task matrix doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotRoleTaskMatrix.js', 'script harness check knows copilot role/task matrix helper');

  must(harnessDoc, 'root:check:copilotroletaskmatrix01', 'script harness doc lists copilot role/task matrix root check');
  must(harnessDoc, 'copilot_role_task_matrix_01_check.js', 'script harness doc lists copilot role/task matrix check');
  must(harnessDoc, 'docs/COPILOT_ROLE_TASK_MATRIX_01.md', 'script harness doc lists copilot role/task matrix doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotRoleTaskMatrix.js', 'script harness doc lists copilot role/task matrix helper');
  must(harnessDoc, 'COPILOT-ROLE-TASK-MATRIX-01', 'script harness doc lists copilot role/task matrix milestone');

  mustNoDiffExceptWithIdentity(['backend/src/routes', 'backend/src/services', 'prisma'], CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');
  mustNoStagedPrefix(cachedNames, ['debug.log'], 'debug.log stays commit-external');

  console.log('=== COPILOT-ROLE-TASK-MATRIX-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
