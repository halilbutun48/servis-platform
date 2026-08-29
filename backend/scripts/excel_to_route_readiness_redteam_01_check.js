#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BATCH10_DOC_WORKTREE_CLOSURE_PATHS, mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from './lib/guardGitScope.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const helperRel = 'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js';
const docRel = 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md';
const redteamOwnedScopePaths = [
  'package.json',
  'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
  helperRel,
  docRel,
  'backend/scripts/script_harness_consolidation_01_check.js',
  ...BATCH10_DOC_WORKTREE_CLOSURE_PATHS,
  'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
  'docs/COPILOT_ROLE_TASK_MATRIX_01.md',
  'docs/COPILOT_AI_ACTION_ROADMAP_01.md',
  'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md',
  'backend/scripts/ux_live_panel_premium_smoke_01_check.js',
  'backend/scripts/lib/guardSmokeEvidence.js',
  'backend/scripts/current_head_scope_policy_01_check.js',
  'backend/scripts/lib/currentHeadScopePolicy.js',
];
const redteamTrackedCleanPaths = [
  'backend/scripts/lib/guardSmokeEvidence.js',
  ...BATCH10_DOC_WORKTREE_CLOSURE_PATHS.filter(
    (path) =>
      path !== 'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md' &&
      path !== 'docs/PRIMER_SSOT.md' &&
      path !== 'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md' &&
      path !== 'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md'
  ),
  'backend/scripts/current_head_scope_policy_01_check.js',
];
const redteamAuthorizedFollowupPaths = [
  'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
  'backend/scripts/ux_live_panel_premium_smoke_01_check.js',
  'backend/scripts/lib/currentHeadScopePolicy.js',
  'docs/SCRIPT_HARNESS_CONSOLIDATION_01.md',
  'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
  'docs/PRIMER_SSOT.md',
  'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
  'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md',
];
const exactApprovedConcurrentCanonicalEntries = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF;

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

function gitTrackedNames(paths) {
  const out = execFileSync('git', ['ls-files', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, '/'))
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

function mustTrackedAndCleanPaths(paths, label) {
  const actualTracked = sortedUniquePaths(gitTrackedNames(paths));
  const expected = sortedUniquePaths(paths);
  const unexpected = actualTracked.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actualTracked.includes(file));
  const dirty = gitDiffNames(paths);
  if (unexpected.length > 0 || missing.length > 0 || dirty.length > 0) {
    fail(
      `${label}: unexpected=${unexpected.join(', ') || '(none)'} missing=${missing.join(', ') || '(none)'} dirty=${dirty.join(', ') || '(none)'}`
    );
  }
  ok(label);
}

function mustTrackedPaths(paths, label) {
  const actualTracked = sortedUniquePaths(gitTrackedNames(paths));
  const expected = sortedUniquePaths(paths);
  const unexpected = actualTracked.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actualTracked.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(
      `${label}: unexpected=${unexpected.join(', ') || '(none)'} missing=${missing.join(', ') || '(none)'}`
    );
  }
  ok(label);
}

function mustDirtyOnlyWithin(paths, allowedPaths, label) {
  const entries = gitStatusEntries(paths);
  const actual = sortedUniquePaths(entries.map((entry) => entry.path));
  const allowed = sortedUniquePaths(allowedPaths);
  const unexpected = actual.filter((file) => !allowed.includes(file));
  const invalidStatuses = entries
    .filter((entry) => allowed.includes(entry.path))
    .filter((entry) => {
      const status = String(entry.raw || '').slice(0, 2);
      return status.includes('D') || status.includes('R');
    })
    .map((entry) => `${entry.path} (${entry.raw})`);
  if (unexpected.length > 0 || invalidStatuses.length > 0) {
    fail(
      `${label}: unexpected=${unexpected.join(', ') || '(none)'} invalid=${invalidStatuses.join(', ') || '(none)'}`
    );
  }
  ok(label);
}

function mustExactStatusPaths(files, expectedPaths, label) {
  const actual = sortedUniquePaths(files);
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(`${label}: unexpected=${unexpected.join(', ') || '(none)'} missing=${missing.join(', ') || '(none)'}`);
  }
  ok(label);
}

function mustRejectScope(files, exactPaths, prefixes, label) {
  const allowed = files.filter((file) => exactPaths.has(file) || prefixes.some((prefix) => file.startsWith(prefix)));
  if (allowed.length > 0) fail(`${label}: unexpectedly allowed=${allowed.join(', ')}`);
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
  const registryScripts = productExtensionsChecks.map((step) => step.script);
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
  assertProductExtensionsOrder(['check:copilotroutereviewhumanapproval01', 'check:exceltoroutereadinessredteam01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps redteam after route review', registryScripts);
  assertProductExtensionsOrder(['check:copilotroutereviewhumanapproval01', 'check:exceltoroutereadinessredteam01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps redteam after route review', registryScripts);

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

  mustStatusEmptyOrExactlyWithIdentity(
    ['backend/src/routes', 'backend/src/services'],
    [
      ...exactApprovedConcurrentCanonicalEntries,
    ],
    'backend route/service status stays current-head approved'
  );
  mustDiffEmptyOrExactlyWithIdentity(
    ['backend/prisma', 'prisma'],
    [],
    'backend prisma diff stays empty'
  );
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, 'accepted Prisma schema SHA matches');
  mustFileSha256('backend/scripts/lib/guardSmokeEvidence.js', 'BB5A4A9658F57496CD39869068842A5D28FDCA3690E0AE39B99F19C702B1FB5D', 'guard smoke evidence helper SHA matches');
  mustFileSha256('backend/scripts/ux_live_panel_premium_smoke_01_check.js', '57EC9539945C5B250122366EA966FC08BC798B6452760C2CED935DE906E1CAAA', 'premium smoke check SHA matches');
  mustFileSha256('backend/scripts/current_head_scope_policy_01_check.js', '0F56180FD86135B5742E8D473E61975A1BEB1F57CDA61F2DC4C362575086951F', 'current head scope policy check SHA matches');
  mustFileSha256('backend/scripts/lib/currentHeadScopePolicy.js', 'A1EFDEADF2EB8DEB972DFCD2175844EF4B8290B8988C591AD38B00FB57BAC313', 'current head scope policy manifest SHA matches');
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  if (cachedNames.length !== 0) fail(`stage stays empty: ${cachedNames.join(', ')}`);
  ok('stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');
  mustTrackedAndCleanPaths(redteamTrackedCleanPaths, 'redteam committed scope stays tracked and clean');
  mustTrackedPaths(redteamAuthorizedFollowupPaths, 'redteam authorized follow-up scope stays tracked');
  mustDirtyOnlyWithin(
    redteamOwnedScopePaths,
    redteamAuthorizedFollowupPaths,
    'redteam follow-up dirty scope stays within authorized follow-up paths'
  );
  mustRejectScope(
    ['backend/scripts/guard_v2_synthetic_unrelated.js'],
    new Set([
      'backend/scripts/guard_v2_standardization_01_check.js',
      'backend/scripts/run_guard_regression_chain.js',
      'backend/scripts/run_repo_check_chain.js',
      'backend/scripts/lib/guardTextIntegrity.js',
      'backend/scripts/lib/guardGitScope.js',
      'backend/scripts/lib/guardValidationEnvironment.js',
      'backend/scripts/lib/guardRunnerContracts.js',
      'backend/scripts/lib/guardRegressionTiers.js',
      'docs/GUARD_V2_STANDARDIZATION_01.md',
    ]),
    [],
    'guard-v2 synthetic unrelated path is rejected',
  );

  console.log('=== EXCEL-TO-ROUTE-READINESS-REDTEAM-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
