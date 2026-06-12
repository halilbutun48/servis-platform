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
  'STAGE 1 — File Understanding',
  'STAGE 2 — Column Mapping',
  'STAGE 3 — Data Quality',
  'STAGE 4 — Address Readiness',
  'STAGE 5 — Demand Preview',
  'STAGE 6 — Human Approval Gate',
  'STAGE 7 — Next Milestone Handoff',
];

const requiredTaskCategories = [
  'READINESS_EXPLAIN',
  'COLUMN_MAP_PREPARE',
  'DATA_QUALITY_SUMMARY',
  'MISSING_FIELD_REPORT',
  'DUPLICATE_RISK_REPORT',
  'ADDRESS_READINESS_REPORT',
  'KVKK_CONSENT_WARNING',
  'DEMAND_PREVIEW',
  'HUMAN_APPROVAL_REQUIRED',
];

const requiredColumnCategories = [
  'ad soyad / personel adı',
  'adres / servis adresi / durak adresi',
  'telefon',
  'departman / grup / sınıf / organizasyon birimi',
  'vardiya tarihi',
  'vardiya saati',
  'yön: sabah inbound / akşam outbound',
  'not / özel ihtiyaç',
  'servis tipi',
  'KVKK / izin sinyali',
  'şirket / okul / organizasyon lokasyonu',
  'kapasite / kişi sayısı',
];

const requiredQualityChecks = [
  'Boş ad / adres kontrolü yapılır.',
  'Tekrarlı kişi kontrolü yapılır.',
  'Tekrarlı adres kontrolü yapılır.',
  'Eksik telefon kontrolü yapılır.',
  'Eksik vardiya saati kontrolü yapılır.',
  'Eksik yön bilgisi kontrolü yapılır.',
  'Belirsiz adres kontrolü yapılır.',
  'İl / ilçe eksikliği kontrolü yapılır.',
  'Çok uzun / çok kısa adres kontrolü yapılır.',
  'KVKK / izin belirsizliği kontrolü yapılır.',
  'Cross-organization veri riski kontrolü yapılır.',
  'Kapasite tahmini belirsizliği kontrolü yapılır.',
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
  console.log('=== COPILOT-EXCEL-DEMAND-IMPORT-01 CHECK ===');

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
  const doc = read('docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md');
  const helper = read('backend/src/ai/chat/copilotExcelDemandImportPolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:copilotexceldemandimport01": "node backend/scripts/copilot_excel_demand_import_01_check.js"', 'package.json exposes Excel demand import check');
  ordered(runner, ['check:copilotdemandagreement01', 'check:copilothumanapproval01', 'check:copilotexceldemandimport01', 'check:uxcopilotsmartchips01'], 'product extensions runner places Excel demand import after human approval');
  ordered(verify, ['check:copilotdemandagreement01', 'check:copilothumanapproval01', 'check:copilotexceldemandimport01', 'check:uxcopilotsmartchips01'], 'verify chain places Excel demand import after human approval');

  must(guide, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'milestone guide mentions Excel demand import milestone');
  must(guide, 'check:copilotexceldemandimport01', 'milestone guide exposes Excel demand import check');
  must(guide, 'node backend\\scripts\\copilot_excel_demand_import_01_check.js', 'milestone guide includes Excel demand import command');
  must(guide, 'docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md', 'milestone guide includes Excel demand import doc');
  ordered(guide, ['COPILOT-HUMAN-APPROVAL-01', 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'ADDRESS-GEOCODING-CONFIDENCE-01'], 'milestone guide keeps Excel demand import after human approval');

  must(primer, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'primer mentions Excel demand import milestone');
  must(primer, 'docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md', 'primer links Excel demand import doc');

  must(roadmapLock, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'roadmap lock keeps Excel demand import milestone');
  must(roadmapLock, '### D) EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI', 'roadmap lock keeps Excel/address/OSRM line');

  must(roleMatrix, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'role/task matrix doc references Excel demand import milestone');
  must(roleMatrix, 'Excel/CSV demand import readiness roadmap', 'role/task matrix doc keeps Excel readiness wording');
  must(roleMatrix, 'runtime import execute açmaz', 'role/task matrix doc keeps runtime import boundary');

  must(aiRoadmap, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'AI action roadmap doc references Excel demand import milestone');
  must(aiRoadmap, 'Excel demand import readiness', 'AI action roadmap doc keeps Excel readiness wording');

  must(demandToAgreement, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'demand-to-agreement doc references Excel demand import milestone');
  must(demandToAgreement, 'Excel/CSV hazırlığı için ileride checklist oluşturur', 'demand-to-agreement doc keeps Excel readiness wording');

  must(humanApproval, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'human approval doc keeps Excel demand import future line');

  must(doc, '# COPILOT EXCEL DEMAND IMPORT 01', 'Excel demand import doc title present');
  must(doc, 'docs/check milestone', 'Excel demand import doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotexceldemandimport01`', 'Excel demand import doc keeps canonical check wording');
  ordered(doc, requiredStages, 'Excel demand import doc keeps stage ordering');
  ordered(doc, requiredTaskCategories, 'Excel demand import doc keeps task category ordering');
  for (const columnCategory of requiredColumnCategories) {
    must(doc, columnCategory, `Excel demand import doc includes column category ${columnCategory}`);
  }
  for (const qualityCheck of requiredQualityChecks) {
    must(doc, qualityCheck, `Excel demand import doc includes quality check ${qualityCheck}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `Excel demand import doc includes role boundary ${role}`);
  }
  must(doc, 'COMPANY', 'Excel demand import doc includes company role');
  must(doc, 'SUPER_ADMIN', 'Excel demand import doc includes super admin role');
  must(doc, 'ROOM', 'Excel demand import doc includes room role');
  must(doc, 'DRIVER', 'Excel demand import doc includes driver role');
  must(doc, 'PERSONEL / PARENT', 'Excel demand import doc includes personel/parent role');
  must(doc, 'KVKK / veri güvenliği sınırı', 'Excel demand import doc keeps KVKK boundary section');
  must(doc, 'Excel/CSV kişisel veri içerebilir', 'Excel demand import doc keeps personal data warning');
  must(doc, 'Public dokümanda “Excel yükle her şeyi otomatik yapar” vaadi yok.', 'Excel demand import doc keeps public promise wording');
  must(doc, 'Underpromise, overdeliver', 'Excel demand import doc keeps trust strategy wording');
  must(doc, 'Runtime AI action açılmaz.', 'Excel demand import doc keeps runtime AI boundary');
  must(doc, 'Tool execution açılmaz.', 'Excel demand import doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açılmaz.', 'Excel demand import doc keeps dispatcher boundary');
  must(doc, 'Excel/CSV import execute açılmaz.', 'Excel demand import doc keeps import boundary');
  must(doc, 'File upload endpoint açılmaz.', 'Excel demand import doc keeps file upload boundary');
  must(doc, 'DB write açılmaz.', 'Excel demand import doc keeps DB boundary');
  must(doc, 'Bu milestone geocode commit veya lat/lng write yapmaz.', 'Excel demand import doc keeps geocode boundary');
  must(doc, 'Geocode execute/commit açılmaz.', 'Excel demand import doc keeps geocode execute boundary');
  must(doc, 'Route draft create/apply açılmaz.', 'Excel demand import doc keeps route boundary');
  must(doc, 'OSRM route apply açılmaz.', 'Excel demand import doc keeps OSRM boundary');
  must(doc, 'RFQ send açılmaz.', 'Excel demand import doc keeps RFQ boundary');
  must(doc, 'Offer accept/reject açılmaz.', 'Excel demand import doc keeps offer boundary');
  must(doc, 'Agreement/contract execute açılmaz.', 'Excel demand import doc keeps agreement boundary');
  must(doc, 'Dispatch apply açılmaz.', 'Excel demand import doc keeps dispatch boundary');
  must(doc, 'Payment/hakediş execute açılmaz.', 'Excel demand import doc keeps payment boundary');
  must(doc, 'SMS/email/push açılmaz.', 'Excel demand import doc keeps messaging boundary');
  must(doc, 'Provider credential management açılmaz.', 'Excel demand import doc keeps credential boundary');
  must(doc, 'User/account/admin write-action açılmaz.', 'Excel demand import doc keeps admin boundary');
  must(doc, 'Cross-organization write açılmaz.', 'Excel demand import doc keeps cross-org boundary');
  must(doc, 'Supplier auto-selection açılmaz.', 'Excel demand import doc keeps supplier boundary');
  must(doc, 'Driver/vehicle assignment açılmaz.', 'Excel demand import doc keeps driver assignment boundary');
  must(doc, 'Demand create execute açılmaz.', 'Excel demand import doc keeps demand boundary');
  must(doc, 'Shift create execute açılmaz.', 'Excel demand import doc keeps shift boundary');
  must(doc, 'Stop create execute açılmaz.', 'Excel demand import doc keeps stop boundary');
  must(doc, 'Route draft create/apply açılmaz.', 'Excel demand import doc keeps route draft boundary');
  must(doc, 'Bu milestone runtime import execute açmaz.', 'Excel demand import doc keeps runtime import boundary');
  must(doc, 'Backend route/service/schema açılmaz.', 'Excel demand import doc keeps backend boundary');
  must(doc, 'Prisma/schema/migration açılmaz.', 'Excel demand import doc keeps prisma boundary');
  must(doc, 'HUMAN_APPROVAL_REQUIRED', 'Excel demand import doc includes human approval category');
  must(doc, 'COPILOT-HUMAN-APPROVAL-01', 'Excel demand import doc references human approval milestone');
  must(doc, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'Excel demand import doc references demand-to-agreement milestone');
  must(doc, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'Excel demand import doc references address geocoding confidence milestone');
  must(doc, 'COPILOT-STOP-ROUTE-DRAFT-01', 'Excel demand import doc references stop-route draft milestone');
  must(doc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'Excel demand import doc references OSRM-from-Excel milestone');
  must(doc, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'Excel demand import doc references route review human approval milestone');
  must(doc, 'COPILOT-DEMAND-INTAKE-01', 'Excel demand import doc references demand intake milestone');
  must(doc, 'Static helper', 'Excel demand import doc keeps static helper section');
  must(doc, 'Kapsam dışı', 'Excel demand import doc keeps out-of-scope section');

  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_COLUMN_MODEL', 'helper exposes column model');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_QUALITY_CHECKS', 'helper exposes quality checks');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_ADDRESS_READINESS_STATES', 'helper exposes address readiness states');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_EXCEL_DEMAND_IMPORT_POLICY', 'helper exposes policy object');
  must(helper, 'buildExcelDemandImportRole', 'helper exposes role builder');
  must(helper, 'listCopilotExcelDemandImportRoles', 'helper exposes role lister');
  must(helper, 'getCopilotExcelDemandImportPolicy', 'helper exposes policy getter');
  for (const stage of requiredStages) {
    const stageTitle = stage.split('—').pop().trim();
    must(helper, stageTitle, `helper keeps ${stage}`);
  }
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(helper, `buildExcelDemandImportRole('${role}'`, `helper keeps role ${role}`);
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

  must(harnessCheck, 'check:copilotexceldemandimport01', 'script harness check knows Excel demand import alias');
  must(harnessCheck, 'copilot_excel_demand_import_01_check.js', 'script harness check knows Excel demand import file');
  must(harnessCheck, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'script harness check knows Excel demand import milestone');
  must(harnessCheck, 'docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md', 'script harness check knows Excel demand import doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotExcelDemandImportPolicy.js', 'script harness check knows Excel demand import helper');

  must(harnessDoc, 'root:check:copilotexceldemandimport01', 'script harness doc lists Excel demand import root check');
  must(harnessDoc, 'copilot_excel_demand_import_01_check.js', 'script harness doc lists Excel demand import check');
  must(harnessDoc, 'docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md', 'script harness doc lists Excel demand import doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotExcelDemandImportPolicy.js', 'script harness doc lists Excel demand import helper');
  must(harnessDoc, 'COPILOT-EXCEL-DEMAND-IMPORT-01', 'script harness doc lists Excel demand import milestone');

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== COPILOT-EXCEL-DEMAND-IMPORT-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
