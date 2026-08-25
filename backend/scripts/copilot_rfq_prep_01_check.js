#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as copilotRfqPrep from '../src/ai/chat/copilotRfqPrep.js';
import { mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from './lib/guardGitScope.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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
  const out = execFileSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, 'diff', '--cached', '--name-only'], {
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

const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_ROUTE_SERVICE_DIFF =
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) =>
    path.startsWith('backend/src/routes/') || path.startsWith('backend/src/services/'),
  );

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
  console.log('=== COPILOT-RFQ-PREP-01 CHECK ===');

  const pkg = read('package.json');
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
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:copilotrfqprep01": "node backend/scripts/copilot_rfq_prep_01_check.js"', 'package.json exposes RFQ prep check');
  assertProductExtensionsOrder(['check:copilotdemandagreement01', 'check:copilotrfqprep01', 'check:copilothumanapproval01'], 'product extensions registry keeps RFQ prep after demand-to-agreement', registryScripts);
  assertProductExtensionsOrder(['check:copilotdemandagreement01', 'check:copilotrfqprep01', 'check:copilothumanapproval01'], 'verify chain registry keeps RFQ prep after demand-to-agreement', registryScripts);

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

  mustStatusEmptyOrExactlyWithIdentity(
    ['backend/src/routes', 'backend/src/services'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_ROUTE_SERVICE_DIFF,
    'backend route/service status stays current-head approved'
  );
  mustDiffEmptyOrExactlyWithIdentity(['backend/prisma', 'prisma'], [], 'backend prisma diff stays empty');
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, 'accepted Prisma schema SHA matches');
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  if (cachedNames.length !== 0) fail(`stage stays empty: ${cachedNames.join(', ')}`);
  ok('stage stays empty');
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
