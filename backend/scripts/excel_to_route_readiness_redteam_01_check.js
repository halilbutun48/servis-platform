#!/usr/bin/env node

import crypto from 'node:crypto';
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

function normalizePath(relPath) {
  return String(relPath || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .trim();
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((pathText) => normalizePath(pathText)))].sort(compareText);
}

function gitStatusEntries(paths) {
  const out = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() : rawPath;
      return { code, path: normalizePath(pathText), raw: line };
    });
}

function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((pathText) => !expected.includes(pathText));
  const missing = expected.filter((pathText) => !actual.includes(pathText));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(
      `${label}: ${[
        unexpected.length > 0 ? `unexpected=${unexpected.join(', ')}` : '',
        missing.length > 0 ? `missing=${missing.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('; ')}`
    );
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relPath))).digest('hex').toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  if (actual !== String(expectedHash || '').toUpperCase()) {
    fail(`${label}: ${actual} != ${String(expectedHash || '').toUpperCase()}`);
  }
  ok(label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      fail(`${relPath}: unexpected bare CR`);
    }
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${relPath}: invalid UTF-8`);
  }
  const normalized = text.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(Buffer.from(normalized, 'utf8')).digest('hex').toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  if (actual !== String(expectedHash || '').toUpperCase()) {
    fail(`${label}: ${actual} != ${String(expectedHash || '').toUpperCase()}`);
  }
  ok(label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(`${label}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== 'migration.sql') {
    fail(`${label}: unexpected contents=${entries.join(', ')}`);
  }
  ok(label);
}

const ACCEPTED_SCHEMA_PATH = 'backend/prisma/schema.prisma';
const ACCEPTED_SCHEMA_SHA256 = '7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748';
const ACCEPTED_PRISMA_MIGRATIONS = [
  { path: 'backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql', sha256: '27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD' },
  { path: 'backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql', sha256: '864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD' },
  { path: 'backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql', sha256: 'E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5' },
  { path: 'backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql', sha256: '6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB' },
  { path: 'backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql', sha256: 'CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F' },
  { path: 'backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql', sha256: 'B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90' },
  { path: 'backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql', sha256: '734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005' },
  { path: 'backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql', sha256: '85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17' },
  { path: 'backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql', sha256: '3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0' },
  { path: 'backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql', sha256: '24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198' },
  { path: 'backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql', sha256: 'A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202' },
  { path: 'backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql', sha256: '0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A' },
  { path: 'backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql', sha256: 'D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF' },
  { path: 'backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql', sha256: '8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A' },
  { path: 'backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql', sha256: 'F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A' },
  { path: 'backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql', sha256: '025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0' },
  { path: 'backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql', sha256: 'D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E' },
  { path: 'backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql', sha256: 'C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54' },
  { path: 'backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql', sha256: 'FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D' },
  { path: 'backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql', sha256: 'E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90' },
  { path: 'backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql', sha256: '7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007' },
  { path: 'backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql', sha256: '285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27' },
  { path: 'backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql', sha256: 'E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5' },
  { path: 'backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql', sha256: '3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36' },
  { path: 'backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql', sha256: '59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA' },
  { path: 'backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql', sha256: 'F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528' },
  { path: 'backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql', sha256: '423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581' },
  { path: 'backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql', sha256: '252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79' },
  { path: 'backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql', sha256: '168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F' },
  { path: 'backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql', sha256: 'BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC' },
  { path: 'backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql', sha256: '2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924' },
  { path: 'backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql', sha256: '939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5' },
];
const ACCEPTED_PRISMA_FILES = [
  { path: ACCEPTED_SCHEMA_PATH, sha256: ACCEPTED_SCHEMA_SHA256 },
  ...ACCEPTED_PRISMA_MIGRATIONS,
];
const ACCEPTED_PRISMA_PATHS = ACCEPTED_PRISMA_FILES.map((entry) => entry.path);

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
  const status = sortedUniquePaths(gitStatusEntries(['.']).map((entry) => entry.path));
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

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoDiff(['backend/prisma', 'prisma'], 'backend/prisma diff empty');
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, 'accepted Prisma schema SHA matches');
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  if (cachedNames.length !== 0) fail(`stage stays empty: ${cachedNames.join(', ')}`);
  ok('stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');
  allWithin(
    status,
    new Set([
      'backend/scripts/ai03b_semantic_visible_audit_01_check.js',
      'backend/scripts/copilot_context_memory_task_state_01_check.js',
      'backend/src/ai/chat/conversationTaskState.js',
      'package.json',
      'backend/scripts/run_product_extensions_check_chain.js',
      'backend/scripts/verify_chain_01_product_extensions_check.js',
      'backend/scripts/script_harness_consolidation_01_check.js',
      'backend/scripts/copilot_route_review_human_approval_01_check.js',
      'backend/scripts/financial_operations_surface_and_rbac_01_check.js',
      'backend/src/finance/financialOperationsScope.js',
      'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md',
      'backend/scripts/operational_cost_model_01_check.js',
      'backend/scripts/operational_cost_model_01_expansion.js',
      'docs/OPERATIONAL_COST_MODEL_01.md',
      // Demand intake companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/copilot_demand_intake_01_check.js',
      'backend/src/ai/chat/copilotDemandIntake.js',
      'backend/src/ai/chat/copilotDemandToAgreementRoadmap.js',
      'docs/COPILOT_DEMAND_INTAKE_01.md',
      'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md',
      'backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js',
      'backend/scripts/copilot_rfq_prep_01_check.js',
      'backend/src/ai/chat/copilotRfqPrep.js',
      'docs/COPILOT_RFQ_PREP_01.md',
      'backend/scripts/request_storm_resilience_01_check.js',
      'backend/scripts/copilot_operation_health_engine_01_check.js',
      'backend/scripts/copilot_next_best_action_engine_01_check.js',
      'backend/scripts/copilot_plan_review_engine_01_check.js',
      'backend/scripts/copilot_workflow_reasoning_engine_01_check.js',
      'backend/src/ai/chat/screenStateAnalyzer.js',
      'backend/src/ai/chat/conversationOperationHealthEngine.js',
      'backend/src/ai/chat/conversationNextBestActionEngine.js',
      'backend/src/ai/chat/conversationPlanReviewEngine.js',
      'backend/src/ai/jobGuide/screenCatalog.js',
      'backend/src/ai/jobGuide/screenCatalog.roomCompany.js',
      'backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js',
      'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md',
      'backend/scripts/copilot_clarifying_question_engine_01_check.js',
      'backend/scripts/copilot_dynamic_question_engine_01_check.js',
      'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
      'backend/scripts/lead_capture_01_check.js',
      'backend/scripts/shift_dispatch_approval_fix_01_check.js',
      'backend/scripts/db_pool_and_api_scaling_01_check.js',
      'backend/scripts/db_pool_and_api_scaling_01_probe.js',
      // Semantic quality gate files are part of the current consolidated validation pass.
      'backend/scripts/ai_response_semantic_quality_gate_01_check.js',
      'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md',
      // Dashboard bulk endpoint files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/dashboard_bulk_endpoint_01_check.js',
      'backend/src/bootstrap/routeMounts.js',
      'backend/src/server.js',
      'backend/src/routes/dashboardBulk.js',
      'backend/src/services/dashboardBulk.js',
      'docs/DASHBOARD_BULK_ENDPOINT_01.md',
      'web/src/panels/school/OperationsPanel.jsx',
      'web/src/panels/superadmin/SuperAdminPanel.jsx',
      'web/src/utils/dashboardBulk.js',
      // Cache coalescing and backoff files are legitimate read-only companions for this pass.
      'backend/scripts/cache_coalescing_and_backoff_01_check.js',
      'backend/src/utils/responseCache.js',
      'docs/CACHE_COALESCING_AND_BACKOFF_01.md',
      // Observability monitoring alerting files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/observability_monitoring_alerting_01_check.js',
      'backend/scripts/observability_monitoring_alerting_01_probe.js',
      'docs/OBSERVABILITY_MONITORING_ALERTING_01.md',
      // Quality gate final file is a legitimate smoke-summary companion for this pass.
      'backend/scripts/quality_gate_final_01_check.js',
      // Production rate limit policy files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/production_rate_limit_policy_01_check.js',
      'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md',
      'docs/DB_POOL_AND_API_SCALING_01.md',
      'backend/scripts/sefer_abi_terminal_humanize_01_check.js',
      'backend/scripts/cop_live_accept_01_check.js',
      'backend/scripts/onboarding_review_final_audit_01_check.js',
      'backend/scripts/invite_based_membership_01_check.js',
      'backend/scripts/verified_supplier_01_check.js',
      'backend/scripts/supplier_matching_01_check.js',
      'backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js',
      'backend/src/ai/chat/supplierMatching.js',
      'docs/VERIFIED_SUPPLIER_01.md',
      'docs/SUPPLIER_MATCHING_01.md',
      'docs/UX_MARKETPLACE_PANELS_01.md',
      'backend/scripts/roadmap_lock_ai_marketplace_01_check.js',
      // Supplier offer collect companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/supplier_offer_collect_01_check.js',
      'backend/src/ai/chat/supplierOfferCollect.js',
      'docs/SUPPLIER_OFFER_COLLECT_01.md',
      // Offer analysis companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/copilot_offer_analysis_01_check.js',
      'backend/src/ai/chat/copilotOfferAnalysis.js',
      'docs/COPILOT_OFFER_ANALYSIS_01.md',
      'backend/scripts/copilot_negotiation_assist_01_check.js',
      'backend/src/ai/chat/copilotNegotiationAssist.js',
      'backend/src/ai/chat/copilotHumanApprovalPolicy.js',
      'docs/COPILOT_NEGOTIATION_ASSIST_01.md',
      // Offer recommendation companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/copilot_offer_recommendation_01_check.js',
      'backend/src/ai/chat/copilotOfferRecommendation.js',
      'docs/COPILOT_OFFER_RECOMMENDATION_01.md',
      'docs/COPILOT_HUMAN_APPROVAL_01.md',
      // Shift-to-agreement prep companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/copilot_shift_to_agreement_prep_01_check.js',
      'backend/src/ai/chat/copilotShiftToAgreementPrep.js',
      'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md',
      // Dispatch prep companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/copilot_dispatch_action_prep_01_check.js',
      'backend/src/ai/chat/copilotDispatchActionPrep.js',
      'docs/COPILOT_DISPATCH_ACTION_PREP_01.md',
      // Action prep companion files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/copilot_action_prep_01_check.js',
      'backend/src/ai/chat/copilotActionPrep.js',
      'docs/COPILOT_ACTION_PREP_01.md',
      'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md',
      'backend/scripts/sefer_abi_reasoning_assistant_01_check.js',
      'backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js',
      'backend/scripts/hot_file_split_ai_chat_composers_01_check.js',
      'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js',
      'backend/src/ai/chat/answerQualityPolicy.js',
      'backend/src/ai/chat/helpComposer.js',
      'backend/src/ai/chat/helpComposerSafeReplies.js',
      'backend/src/ai/chat/conversationTaskStateResponses.js',
      'backend/src/ai/chat/conversationTaskStateShared.js',
      'backend/src/ai/chat/conversationTaskStateClarifiers.js',
      'backend/src/ai/chat/conversationTaskStateSelectedRecord.js',
      'backend/src/ai/chat/conversationTaskStateFollowUps.js',
      'backend/src/ai/chat/conversationTaskStateBuilders.js',
      'backend/src/ai/chat/conversationTaskStateCompanyReplies.js',
      'backend/src/ai/chat/conversationTaskStateRoomReplies.js',
      'backend/src/ai/chat/conversationTaskStateDynamicQuestions.js',
      'backend/src/ai/chat/intentRouter.js',
      'backend/src/ai/chat/intentRouterCore.js',
      'backend/src/ai/chat/seferAbiReasoningAssistant.js',
      'backend/src/ai/chat/conversationWorkflowReasoningEngine.js',
      'backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js',
      'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js',
      'backend/scripts/copilot_reasoning_answer_composer_01_check.js',
      'backend/src/ai/chat/copilotReasoningAnswerComposer.js',
      'backend/scripts/copilot_smart_diagnostic_engine_01_check.js',
      'backend/src/ai/chat/conversationSmartDiagnostics.js',
      'backend/src/ai/schemas.js',
      'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md',
      'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md',
      'docs/REQUEST_STORM_RESILIENCE_01.md',
      'docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md',
      'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md',
      'docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md',
      'docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md',
      'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md',
      'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md',
      'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md',
      'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md',
      'docs/SEFER_ABI_REASONING_ASSISTANT_01.md',
      'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md',
      'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md',
      'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md',
      'tools/repo_contract_state.json',
      '.gitignore',
      'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
      'docs/PRIMER_SSOT.md',
      'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
      'docs/COPILOT_ROLE_TASK_MATRIX_01.md',
      'docs/COPILOT_AI_ACTION_ROADMAP_01.md',
      'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
      'docs/LOAD_TEST_2000_USERS_01.md',
      'backend/scripts/ux_brand_login_premium_01_check.js',
      'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
      'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
      'backend/scripts/ux_panel_standard_architecture_01_check.js',
      'backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js',
      'backend/scripts/ux_premium_critical_fix_room_01_check.js',
      'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
      'backend/scripts/ux_parent_personel_live_error_clarity_01_check.js',
      'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
      'backend/scripts/load_test_2000_users_01_check.js',
      'backend/scripts/load_test_2000_users_01_harness.js',
      'backend/scripts/agreement_source_shift_lineage_01_check.js',
      'backend/scripts/marketplace_free_to_operate_01_check.js',
      'backend/scripts/qlt_pay_bridge_01_check.js',
      'backend/scripts/sefer_score_01_check.js',
      'backend/scripts/hot_file_split_web_panels_01_check.js',
      'backend/scripts/_m91_route_preview_checks.js',
      'backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js',
      'backend/scripts/ux_collapsible_panels_01_check.js',
      'backend/scripts/ux_panel_structure_02_check.js',
      'backend/scripts/ux_panel_inventory_02a_check.js',
      'backend/scripts/ux_company_mobile_action_clarity_01_check.js',
      'backend/scripts/ux_panel_reality_cleanup_02d_check.js',
      'backend/scripts/ux_brand_login_premium_01_check.js',
      'backend/scripts/ux_mobile_web_shell_clarity_01_check.js',
      'backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js',
      'backend/scripts/ux_panel_standard_architecture_01_check.js',
      'backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js',
      'docs/UX_PANEL_INVENTORY_02A_AUDIT.md',
      'backend/scripts/plan_center_guided_flow_persistence_01_check.js',
      'web/src/components/copilot/FloatingCopilotDrawer.jsx',
      'web/src/components/copilot/uiSurface.js',
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
      'web/src/panels/company/OperationsPanel.jsx',
      'web/src/panels/company/AgreementsPanel.jsx',
      'web/src/panels/room/MapPanel.jsx',
      'web/src/panels/room/AgreementsPanel.jsx',
      'web/src/panels/company/companyAgreementsBridgeSection.jsx',
      'web/src/panels/company/companyAgreementsPanelHelpers.js',
      'web/src/panels/room/roomAgreementsBridgeSection.jsx',
      'web/src/panels/room/roomAgreementsPanelHelpers.js',
      'web/src/panels/room/CommercialFlowPanel.jsx',
      'web/src/panels/room/OperationHealthPanel.jsx',
      'web/src/components/AgreementOpsBridgeCard.jsx',
      'web/src/components/RoutePreviewModal.jsx',
      'web/src/components/geo/GeoLocationPicker.jsx',
      'web/src/components/geo/HubMapPicker.jsx',
      'web/src/components/map/MapView.jsx',
      'web/src/components/map/ReadableMiniRouteMap.jsx',
      'web/src/components/map/mapTileAssets.js',
      'web/src/panels/room/roomShiftsOverviewSection.jsx',
      'web/src/utils/uiDataCache.js',
      'web/src/utils/planCenterOverlayLayer.js',
      'web/src/panels/room/ShiftsPanel.jsx',
      'web/src/panels/room/VehiclesPanel.jsx',
      'web/src/panels/room/DriversPanel.jsx',
      'web/src/panels/room/roomShiftsPanelWorkflow.js',
      'web/src/panels/room/roomShiftsPanelActions.js',
      'web/src/panels/room/roomVehiclesPanelActions.js',
      'web/src/panels/shared/KvkkConsentGate.jsx',
      'web/src/panels/shared/PanelKvkkHint.jsx',
      'tools/PRIMER_SNAPSHOT.md',
      'backend/src/ai/chat/copilotGuidedTaskEngine.js',
      'backend/src/ai/chat/conversationRootCauseEngine.js',
      'backend/src/ai/chat/goldenQuestionPack.js',
      'backend/src/ai/chat/qualityScorer.js',
      'backend/scripts/copilot_guided_task_engine_01_check.js',
      'backend/scripts/copilot_root_cause_engine_01_check.js',
      'backend/scripts/copilot_risk_scoring_engine_01_check.js',
      'backend/src/ai/chat/conversationRiskScoringEngine.js',
      'docs/COPILOT_GUIDED_TASK_ENGINE_01.md',
      'docs/COPILOT_ROOT_CAUSE_ENGINE_01.md',
      'docs/COPILOT_RISK_SCORING_ENGINE_01.md',
      'backend/scripts/product_flow_button_audit_01.mjs',
      'backend/scripts/ux_live_panel_premium_smoke_01.mjs',
      'backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs',
      // Test quality and flake audit files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/ux_all_panels_reality_audit_01.mjs',
      'backend/scripts/test_quality_and_flake_audit_01_check.js',
      'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md',
      'backend/scripts/bug_route_impact_preview_button_01_check.js',
      'web/src/panels/parent/LivePanel.jsx',
      'backend/src/ai/chat/etaSanity.js',
      'backend/scripts/driver_flow_final_01_acceptance_check.js',
      'backend/scripts/eta_osrm_01_route_eta_service_check.js',
      'backend/scripts/eta_osrm_02_api_eta_bridge_check.js',
      'backend/scripts/live_tracking_final_01_acceptance_check.js',
      'web/src/utils/etaSanity.js',
      'backend/src/ai/chat/helpComposerSelectedRuntime.js',
      'backend/src/ai/chat/replyShapes.js',
      'web/src/panels/personel/LivePanel.jsx',
      'web/src/utils/copilotFacts.js',
      'backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js',
      'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md',
      'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md',
      // Backend lint warning burndown files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/backend_lint_warning_burndown_01_check.js',
      'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md',
      // Data integrity and recovery files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/data_integrity_and_recovery_01_check.js',
      'docs/DATA_INTEGRITY_AND_RECOVERY_01.md',
      // Role data isolation redteam files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/role_data_isolation_redteam_01_check.js',
      'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md',
      // Security KVKK final files are legitimate consolidated-scope companions for this pass.
      'backend/scripts/security_kvkk_final_01_check.js',
      'docs/SECURITY_KVKK_FINAL_01.md',
      'backend/scripts/audit_log_and_approval_trace_01_check.js',
      'docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md',
      // Current route-readiness companions from the consolidated company-budget repair pass.
      'backend/scripts/address_geocoding_confidence_01_check.js',
      'backend/scripts/ai03b_paraphrase_intent_audit_01_check.js',
      'backend/scripts/copilot_ai_action_roadmap_01_check.js',
      'backend/scripts/copilot_excel_demand_import_01_check.js',
      'backend/scripts/copilot_human_approval_01_check.js',
      'backend/scripts/copilot_role_task_matrix_01_check.js',
      'backend/scripts/copilot_stop_route_draft_01_check.js',
      'backend/scripts/m44_telematics_t1_t5_check.js',
      'backend/scripts/offer_ranking_quality_01_check.js',
      'backend/scripts/osrm_route_draft_from_excel_01_check.js',
      'backend/scripts/public_landing_final_promise_01_check.js',
      'backend/scripts/room_profitability_and_quote_floor_01_check.js',
      'backend/scripts/run_backend_lint.js',
      'backend/scripts/safe_drive_01_check.js',
      'backend/scripts/telematics_provider_hub_01_check.js',
      'backend/scripts/ux_company_personel_access_mobile_parity_01_check.js',
      'backend/scripts/ux_marketplace_panels_01_check.js',
      'backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js',
      'backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js',
      'backend/scripts/company_budget_and_service_cost_01_check.js',
      'backend/src/routes/companyOverview.js',
      'web/src/panels/shared/FinancialOperationsPanel.jsx',
      'backend/scripts/ux_density_01_panel_card_density_check.js',
      'backend/scripts/mobile_web_final_01_check.js',
      'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
      'docs/RUNBOOK_M45_RETENTION_BACKUP.md',
      ...ACCEPTED_PRISMA_PATHS,
    ]),
    ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log', 'backend/scripts/cop_03', 'backend/scripts/cop_04', 'backend/src/finance/'],
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
