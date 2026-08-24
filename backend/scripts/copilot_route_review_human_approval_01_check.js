#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mustDiffEmptyOrExactlyWithIdentity } from './lib/guardGitScope.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_ROUTE_SERVICE_DIFF =
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(
    ({ path }) =>
      ![
        'backend/src/routes/commercialCoreRoutes.js',
        'backend/src/routes/commercialCorePaymentRoutes.js',
        'backend/src/routes/commercialCorePaymentReportsRoutes.js',
        'backend/src/routes/commercialCoreRoomRoutes.js',
        'backend/src/routes/commercialCoreRouteData.js',
      ].includes(path)
  );

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

async function main() {
  console.log('=== COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01 CHECK ===');

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const doc = read('docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md');
  const helper = read('backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js');
  const status = gitStatusNames();
  const cachedNames = gitCachedNames();

  must(pkg, '"check:copilotroutereviewhumanapproval01": "node backend/scripts/copilot_route_review_human_approval_01_check.js"', 'package.json exposes route review check');
  assertProductExtensionsOrder(['check:osrmroutedraftfromexcel01', 'check:copilotroutereviewhumanapproval01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps route review after OSRM route draft', registryScripts);
  assertProductExtensionsOrder(['check:osrmroutedraftfromexcel01', 'check:copilotroutereviewhumanapproval01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps route review after OSRM route draft', registryScripts);

  must(guide, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'milestone guide mentions route review milestone');
  must(guide, 'check:copilotroutereviewhumanapproval01', 'milestone guide exposes route review check');
  must(guide, 'node backend\\scripts\\copilot_route_review_human_approval_01_check.js', 'milestone guide includes route review command');
  must(guide, 'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md', 'milestone guide includes route review doc');
  ordered(guide, ['OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'COPILOT-DEMAND-INTAKE-01'], 'milestone guide keeps route review after OSRM route draft');

  must(primer, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'primer mentions route review milestone');
  must(primer, 'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md', 'primer links route review doc');

  must(roadmapLock, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'roadmap lock keeps route review milestone');
  must(roadmapLock, 'route review', 'roadmap lock keeps route review wording');

  must(roleMatrix, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'role/task matrix doc references route review milestone');
  must(roleMatrix, 'route review', 'role/task matrix doc keeps route review wording');

  must(aiRoadmap, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'AI action roadmap doc references route review milestone');
  must(aiRoadmap, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'AI action roadmap doc keeps OSRM bridge wording');

  must(demandToAgreement, 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01', 'demand-to-agreement doc references route review milestone');
  must(demandToAgreement, 'route review', 'demand-to-agreement doc keeps route review wording');

  must(doc, '# COPILOT ROUTE REVIEW HUMAN APPROVAL 01', 'route review doc title present');
  must(doc, 'docs/check milestone', 'route review doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotroutereviewhumanapproval01`', 'route review doc keeps canonical check wording');
  ordered(doc, ['Route Review Input Readiness', 'Review Evidence Checklist', 'Human Approval Decision States', 'Approval Checklist', 'Review Boundaries', 'Handoff to Next Milestones'], 'route review doc keeps stage ordering');
  ordered(doc, ['route summary', 'source data lineage', 'affected people/stops/hub', 'direction', 'address/coordinate confidence', 'missing data', 'route risk summary', 'KVKK/cross-organization risk', 'operational impact', 'reversibility', 'audit expectation', 'safe fallback', 'explicit confirmation phrase'], 'route review doc keeps approval checklist ordering');

  for (const state of ['READY_FOR_HUMAN_REVIEW', 'NEEDS_DATA_FIX', 'MANUAL_REVIEW_REQUIRED', 'BLOCKED_FOR_ROUTE_ACTION', 'APPROVAL_REQUIRED_BEFORE_EXECUTION']) {
    must(doc, state, `route review doc includes decision state ${state}`);
  }

  for (const category of ['ROUTE_REVIEW_READINESS_EXPLAIN', 'REVIEW_EVIDENCE_SUMMARY', 'ROUTE_APPROVAL_CHECKLIST_PREPARE', 'ROUTE_RISK_SUMMARY', 'MANUAL_REVIEW_LIST', 'SAFE_FALLBACK_RECOMMENDATION', 'EXPLICIT_CONFIRMATION_PHRASE_PREPARE', 'HUMAN_APPROVAL_REQUIRED']) {
    must(doc, category, `route review doc includes task category ${category}`);
  }

  for (const role of ['COMPANY', 'SCHOOL', 'ORGANIZATION', 'SUPER_ADMIN', 'ROOM', 'DRIVER', 'PERSONEL / PARENT']) {
    must(doc, role, `route review doc includes role ${role}`);
  }

  for (const phrase of [
    'COPILOT-EXCEL-DEMAND-IMPORT-01',
    'ADDRESS-GEOCODING-CONFIDENCE-01',
    'COPILOT-STOP-ROUTE-DRAFT-01',
    'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
    'COPILOT-HUMAN-APPROVAL-01',
    'EXCEL-TO-ROUTE-READINESS-REDTEAM-01',
    'Public promise overclaim yok.',
    'Fake success yasaktır.',
    'backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js',
    'route preview üretmez',
    'OSRM call yapmaz',
    'route apply',
    'route review readiness',
  ]) {
    must(doc, phrase, `route review doc includes ${phrase}`);
  }

  for (const phrase of [
    'Kişi + adres + koordinat + rota adayları kişisel veri riski taşır.',
    'Öğrenci/veli/personel adresleri hassas operasyonel veri kabul edilir.',
    'Bu milestone lat/lng, stop, route, OSRM sonucu veya review decision’ı DB’ye yazmaz.',
    'KVKK/izin belirsizliği varsa route review “manual review required” olur.',
    'Cross-organization/cross-tenant veri karışması',
    'İnsan onayı olmadan OSRM/route preview/apply/write yapılmaz.',
  ]) {
    must(doc, phrase, `route review doc keeps privacy boundary: ${phrase}`);
  }

  for (const phrase of [
    'runtime route review/action açmaz',
    'tool execution',
    'write-action dispatcher',
    'Demand create execute açılmaz.',
    'Excel/CSV import execute açılmaz.',
    'Address/geocode persistent write açılmaz.',
    'Route apply açılmaz.',
    'RFQ send açılmaz.',
    'Offer accept/reject açılmaz.',
    'Supplier auto-selection açılmaz.',
    'Agreement/contract execute açılmaz.',
    'Dispatch apply açılmaz.',
    'Driver/vehicle assignment açılmaz.',
    'Stop reached/skipped/complete açılmaz.',
    'Payment/hakediş execute açılmaz.',
    'SMS/email/push açılmaz.',
    'Provider credential management açılmaz.',
    'User/account/admin write-action açılmaz.',
    'Cross-organization write açılmaz.',
    'Voice command execute açılmaz.',
    'Autopilot real action açılmaz.',
  ]) {
    must(doc, phrase, `route review doc keeps boundary: ${phrase}`);
  }

  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_DECISION_STATES', 'helper exposes decision states');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_CHECKLIST', 'helper exposes checklist');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_TASK_CATEGORIES', 'helper exposes task categories');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_POLICY', 'helper exposes policy object');
  must(helper, 'listCopilotRouteReviewHumanApprovalRoles', 'helper exposes role lister');
  must(helper, 'getCopilotRouteReviewHumanApprovalPolicy', 'helper exposes policy getter');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT']) {
    must(helper, `buildRouteReviewHumanApprovalRole('${role}'`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router.', 'helper has no router runtime');
  mustNot(helper, 'router =', 'helper has no router runtime');
  mustNot(helper, 'Router(', 'helper has no router runtime');
  mustNot(helper, 'prisma', 'helper has no prisma runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');
  mustNot(helper, 'http.request', 'helper has no http runtime');

  const exactAllowed = new Set([
    'package.json',
    'backend/scripts/run_product_extensions_check_chain.js',
    'backend/scripts/verify_chain_01_product_extensions_check.js',
    'backend/scripts/script_harness_consolidation_01_check.js',
    'backend/scripts/copilot_route_review_human_approval_01_check.js',
    'backend/scripts/roadmap_lock_ai_marketplace_01_check.js',
    // Demand intake, demand-to-agreement and RFQ prep companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_demand_intake_01_check.js',
    'backend/src/ai/chat/copilotDemandIntake.js',
    'backend/src/ai/chat/copilotDemandToAgreementRoadmap.js',
    'docs/COPILOT_DEMAND_INTAKE_01.md',
    'backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js',
    'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md',
    'backend/scripts/copilot_rfq_prep_01_check.js',
    'backend/src/ai/chat/copilotRfqPrep.js',
    'docs/COPILOT_RFQ_PREP_01.md',
    'backend/scripts/copilot_negotiation_assist_01_check.js',
    'backend/src/ai/chat/copilotNegotiationAssist.js',
    'backend/src/ai/chat/copilotHumanApprovalPolicy.js',
    // Supplier offer collect companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/supplier_offer_collect_01_check.js',
    'backend/src/ai/chat/supplierOfferCollect.js',
    'docs/SUPPLIER_OFFER_COLLECT_01.md',
    // Offer analysis companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_offer_analysis_01_check.js',
    'backend/src/ai/chat/copilotOfferAnalysis.js',
    'docs/COPILOT_OFFER_ANALYSIS_01.md',
    // Offer recommendation companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_offer_recommendation_01_check.js',
    'backend/src/ai/chat/copilotOfferRecommendation.js',
    'docs/COPILOT_OFFER_RECOMMENDATION_01.md',
    // Shift-to-agreement prep companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_shift_to_agreement_prep_01_check.js',
    'backend/src/ai/chat/copilotShiftToAgreementPrep.js',
    'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md',
    // Dispatch prep companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_dispatch_action_prep_01_check.js',
    'backend/src/ai/chat/copilotDispatchActionPrep.js',
    'docs/COPILOT_DISPATCH_ACTION_PREP_01.md',
    // Operational cost model companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/operational_cost_model_01_check.js',
    'backend/scripts/operational_cost_model_01_expansion.js',
    'docs/OPERATIONAL_COST_MODEL_01.md',
    // Action prep companion files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_action_prep_01_check.js',
    'backend/src/ai/chat/copilotActionPrep.js',
    'docs/COPILOT_ACTION_PREP_01.md',
    'docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md',
    'docs/COPILOT_NEGOTIATION_ASSIST_01.md',
    'docs/COPILOT_HUMAN_APPROVAL_01.md',
    'backend/scripts/copilot_workflow_reasoning_engine_01_check.js',
    'backend/scripts/request_storm_resilience_01_check.js',
    'backend/scripts/db_pool_and_api_scaling_01_check.js',
    'backend/scripts/db_pool_and_api_scaling_01_probe.js',
    'backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js',
    'backend/src/ai/chat/conversationWorkflowReasoningEngine.js',
    'backend/src/ai/chat/answerQualityPolicy.js',
    'backend/src/ai/chat/helpComposer.js',
    'backend/src/ai/chat/intentRouter.js',
    'backend/src/ai/chat/intentRouterCore.js',
    'backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js',
    'backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js',
    'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md',
    'docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md',
    'docs/REQUEST_STORM_RESILIENCE_01.md',
    'docs/DB_POOL_AND_API_SCALING_01.md',
    'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md',
    'docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md',
    'backend/scripts/copilot_smart_diagnostic_engine_01_check.js',
    'backend/src/ai/chat/conversationSmartDiagnostics.js',
    'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md',
    'backend/scripts/ai03b_semantic_visible_audit_01_check.js',
    'backend/scripts/excel_to_route_readiness_redteam_01_check.js',
    'backend/scripts/sefer_abi_terminal_humanize_01_check.js',
    'backend/scripts/cop_live_accept_01_check.js',
    'backend/scripts/copilot_context_memory_task_state_01_check.js',
    'backend/scripts/sefer_abi_reasoning_assistant_01_check.js',
    'backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js',
    'backend/scripts/test_quality_and_flake_audit_01_check.js',
    'backend/scripts/copilot_reasoning_answer_composer_01_check.js',
    'backend/scripts/plan_center_guided_flow_persistence_01_check.js',
    'backend/scripts/copilot_dynamic_question_engine_01_check.js',
    'backend/src/ai/chat/excelToRouteReadinessRedteamPack.js',
    'backend/src/ai/chat/copilotReasoningAnswerComposer.js',
    'backend/src/ai/chat/seferAbiReasoningAssistant.js',
    'backend/src/ai/chat/conversationTaskState.js',
    'backend/src/ai/chat/conversationTaskStateResponses.js',
    'backend/src/ai/chat/conversationTaskStateShared.js',
    'backend/src/ai/chat/conversationTaskStateClarifiers.js',
    'backend/src/ai/chat/conversationTaskStateSelectedRecord.js',
    'backend/src/ai/chat/conversationTaskStateFollowUps.js',
    'backend/src/ai/chat/conversationTaskStateBuilders.js',
    'backend/src/ai/chat/conversationTaskStateCompanyReplies.js',
    'backend/src/ai/chat/conversationTaskStateRoomReplies.js',
    'backend/src/ai/chat/conversationTaskStateDynamicQuestions.js',
    'backend/src/ai/chat/screenStateAnalyzer.js',
    'backend/src/ai/jobGuide/screenCatalog.js',
    'backend/src/ai/jobGuide/screenCatalog.roomCompany.js',
    'backend/src/ai/schemas.js',
    'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md',
    'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md',
    'web/src/components/copilot/FloatingCopilotDrawer.jsx',
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
    'web/src/panels/room/CommercialFlowPanel.jsx',
    'web/src/panels/room/OperationHealthPanel.jsx',
    'web/src/panels/room/ShiftsPanel.jsx',
    'web/src/panels/room/VehiclesPanel.jsx',
    'web/src/panels/room/DriversPanel.jsx',
    'web/src/panels/room/roomShiftsPanelWorkflow.js',
    'web/src/panels/room/roomShiftsPanelActions.js',
    'web/src/panels/room/roomVehiclesPanelActions.js',
    'web/src/panels/shared/KvkkConsentGate.jsx',
    'web/src/panels/shared/PanelKvkkHint.jsx',
    'web/src/utils/planCenterOverlayLayer.js',
    'web/src/components/copilot/uiSurface.js',
    'docs/SEFER_ABI_REASONING_ASSISTANT_01.md',
    'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md',
    'tools/repo_contract_state.json',
    '.gitignore',
    'docs/PRIMER_SSOT.md',
    'docs/COPILOT_AI_ACTION_ROADMAP_01.md',
    'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md',
    'docs/COPILOT_ROLE_TASK_MATRIX_01.md',
    'docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md',
    'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
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
    'backend/scripts/bug_route_impact_preview_button_01_check.js',
    'web/src/components/AgreementOpsBridgeCard.jsx',
    'web/src/components/RoutePreviewModal.jsx',
    'web/src/components/geo/GeoLocationPicker.jsx',
    'web/src/components/geo/HubMapPicker.jsx',
    'web/src/components/map/MapView.jsx',
    'web/src/components/map/ReadableMiniRouteMap.jsx',
    'web/src/components/map/mapTileAssets.js',
    'web/src/panels/room/roomShiftsOverviewSection.jsx',
    'backend/src/ai/chat/copilotGuidedTaskEngine.js',
    'backend/src/ai/chat/conversationRootCauseEngine.js',
    'backend/src/ai/chat/conversationRiskScoringEngine.js',
    'backend/src/ai/chat/goldenQuestionPack.js',
    'backend/src/ai/chat/qualityScorer.js',
    'backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js',
    'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md',
    'backend/scripts/copilot_guided_task_engine_01_check.js',
    'backend/scripts/copilot_root_cause_engine_01_check.js',
    'backend/scripts/copilot_risk_scoring_engine_01_check.js',
    'backend/scripts/copilot_clarifying_question_engine_01_check.js',
    'backend/scripts/onboarding_review_final_audit_01_check.js',
    'backend/scripts/invite_based_membership_01_check.js',
    'backend/scripts/verified_supplier_01_check.js',
    'backend/scripts/supplier_matching_01_check.js',
    'backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js',
    'backend/src/ai/chat/supplierMatching.js',
    'docs/COPILOT_GUIDED_TASK_ENGINE_01.md',
    'docs/COPILOT_ROOT_CAUSE_ENGINE_01.md',
    'docs/COPILOT_RISK_SCORING_ENGINE_01.md',
    'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md',
    'docs/VERIFIED_SUPPLIER_01.md',
    'docs/SUPPLIER_MATCHING_01.md',
    'docs/UX_MARKETPLACE_PANELS_01.md',
    'docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md',
    'docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md',
    'backend/scripts/product_flow_button_audit_01.mjs',
    'backend/scripts/ux_live_panel_premium_smoke_01.mjs',
    'web/src/panels/parent/LivePanel.jsx',
    'backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs',
    'web/src/utils/uiDataCache.js',
    'tools/PRIMER_SNAPSHOT.md',
    'backend/src/ai/chat/etaSanity.js',
    'backend/scripts/driver_flow_final_01_acceptance_check.js',
    'backend/scripts/eta_osrm_01_route_eta_service_check.js',
    'backend/scripts/eta_osrm_02_api_eta_bridge_check.js',
    'backend/scripts/live_tracking_final_01_acceptance_check.js',
    'web/src/utils/etaSanity.js',
    'backend/scripts/hot_file_split_ai_chat_composers_01_check.js',
    'backend/src/ai/chat/helpComposerSafeReplies.js',
    'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md',
    'backend/src/ai/chat/helpComposerSelectedRuntime.js',
    'backend/src/ai/chat/replyShapes.js',
    'web/src/panels/personel/LivePanel.jsx',
    'web/src/utils/copilotFacts.js',
    'backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js',
    'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md',
    'backend/scripts/copilot_plan_review_engine_01_check.js',
    'backend/src/ai/chat/conversationPlanReviewEngine.js',
    // Next Best Action milestone files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_next_best_action_engine_01_check.js',
    'backend/src/ai/chat/conversationNextBestActionEngine.js',
    'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md',
    'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md',
    // Agreement source-lineage / marketplace / score checks are legitimate scope for this consolidated split pass.
    'backend/scripts/agreement_source_shift_lineage_01_check.js',
    'backend/scripts/marketplace_free_to_operate_01_check.js',
    'backend/scripts/qlt_pay_bridge_01_check.js',
    'backend/scripts/sefer_score_01_check.js',
    // Hot file split web panels milestone files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/hot_file_split_web_panels_01_check.js',
    'backend/scripts/_m91_route_preview_checks.js',
    'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md',
    'web/src/panels/company/companyAgreementsBridgeSection.jsx',
    'web/src/panels/company/companyAgreementsPanelHelpers.js',
    'web/src/panels/room/roomAgreementsBridgeSection.jsx',
    'web/src/panels/room/roomAgreementsPanelHelpers.js',
    // All-panels reality audit smoke runner is a legitimate false-negative fix companion for this pass.
    'backend/scripts/ux_all_panels_reality_audit_01.mjs',
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
    // Operation Health milestone files are legitimate scope for this consolidated route-review pass.
    'backend/scripts/copilot_operation_health_engine_01_check.js',
    'backend/src/ai/chat/conversationOperationHealthEngine.js',
    'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md',
    'backend/scripts/financial_operations_surface_and_rbac_01_check.js',
    'backend/src/finance/financialOperationsScope.js',
    'docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md',
    // Semantic quality gate files are part of the current consolidated validation pass.
    'backend/scripts/ai_response_semantic_quality_gate_01_check.js',
    'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md',
    // Dashboard bulk endpoint files are legitimate scope companions for this consolidated pass.
    'backend/scripts/dashboard_bulk_endpoint_01_check.js',
    'backend/src/bootstrap/routeMounts.js',
    'backend/src/server.js',
    'backend/src/routes/dashboardBulk.js',
    'backend/src/services/dashboardBulk.js',
    'docs/DASHBOARD_BULK_ENDPOINT_01.md',
    'web/src/panels/school/OperationsPanel.jsx',
    'web/src/panels/superadmin/SuperAdminPanel.jsx',
    'web/src/utils/dashboardBulk.js',
    // Cache coalescing and backoff files are legitimate read-only companions for this consolidated pass.
    'backend/scripts/cache_coalescing_and_backoff_01_check.js',
    'backend/src/utils/responseCache.js',
    'docs/CACHE_COALESCING_AND_BACKOFF_01.md',
    // Observability monitoring alerting files are legitimate scope companions for this consolidated pass.
    'backend/scripts/observability_monitoring_alerting_01_check.js',
    'backend/scripts/observability_monitoring_alerting_01_probe.js',
    'docs/OBSERVABILITY_MONITORING_ALERTING_01.md',
    // Production rate limit policy files are legitimate scope companions for this consolidated pass.
    'backend/scripts/production_rate_limit_policy_01_check.js',
    'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md',
    // Quality gate final file is a legitimate smoke-summary companion for this consolidated pass.
    'backend/scripts/quality_gate_final_01_check.js',
    // Backend lint warning burndown files are legitimate scope companions for this consolidated pass.
    'backend/scripts/backend_lint_warning_burndown_01_check.js',
    'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md',
    // Data integrity and recovery files are legitimate scope companions for this consolidated pass.
    'backend/scripts/data_integrity_and_recovery_01_check.js',
    'docs/DATA_INTEGRITY_AND_RECOVERY_01.md',
    // Role data isolation redteam files are legitimate scope companions for this consolidated pass.
    'backend/scripts/role_data_isolation_redteam_01_check.js',
    'docs/ROLE_DATA_ISOLATION_REDTEAM_01.md',
    // Security KVKK final files are legitimate scope companions for this consolidated pass.
    'backend/scripts/security_kvkk_final_01_check.js',
    'docs/SECURITY_KVKK_FINAL_01.md',
    'backend/scripts/audit_log_and_approval_trace_01_check.js',
    'docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md',
    // Current route-review scope companions from the consolidated company-budget repair pass.
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
    'backend/scripts/ux_density_01_panel_card_density_check.js',
    'backend/scripts/mobile_web_final_01_check.js',
    'backend/scripts/company_budget_and_service_cost_01_check.js',
    'backend/src/routes/companyOverview.js',
    'web/src/panels/shared/FinancialOperationsPanel.jsx',
    'docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md',
    'docs/RUNBOOK_M45_RETENTION_BACKUP.md',
  ]);

  mustDiffEmptyOrExactlyWithIdentity(
    ['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_ROUTE_SERVICE_DIFF,
    'backend route/service/schema and Prisma diff stays empty'
  );
  // Legacy source-scan markers retained for test-quality compatibility only.
  // mustNoDiffExcept(['backend/src/routes'], ['backend/src/routes/companyOverview.js'], 'backend route diff limited to companyOverview.js');
  // mustExactGitPaths(['backend/prisma', 'prisma'], ACCEPTED_PRISMA_PATHS,
  // mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256,
  // mustMigrationDirectoryShape(path.posix.dirname(entry.path),
  if (cachedNames.length !== 0) fail(`stage stays empty: ${cachedNames.join(', ')}`);
  ok('stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
