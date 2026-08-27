#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from './lib/guardGitScope.js';
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

const requiredStages = [
  'STAGE 1 — Source Draft Readiness',
  'STAGE 2 — Coordinate Readiness',
  'STAGE 3 — Direction-Specific OSRM Input Model',
  'STAGE 4 — Hub and Stop Sequence Readiness',
  'STAGE 5 — OSRM Risk Categories',
  'STAGE 6 — Route Draft Preview Readiness',
  'STAGE 7 — Human Review Gate',
  'STAGE 8 — Handoff to Next Milestones',
];

const requiredRiskCategories = [
  'MISSING_COORDINATE',
  'LOW_CONFIDENCE_COORDINATE',
  'BLOCKED_ADDRESS',
  'MISSING_HUB',
  'MISSING_DIRECTION',
  'TOO_FEW_STOPS',
  'TOO_MANY_STOPS',
  'DUPLICATE_WAYPOINT',
  'POSSIBLE_OUTLIER_STOP',
  'CROSS_ORGANIZATION_ROUTE_RISK',
  'KVKK_CONSENT_UNKNOWN',
  'MANUAL_REVIEW_REQUIRED',
  'OSRM_EXECUTION_NOT_ALLOWED',
];

const requiredTaskCategories = [
  'OSRM_READINESS_EXPLAIN',
  'COORDINATE_READINESS_REPORT',
  'DIRECTION_OSRM_INPUT_EXPLAIN',
  'HUB_AND_STOP_SEQUENCE_READINESS',
  'OSRM_RISK_SUMMARY',
  'OUTLIER_STOP_HINT',
  'MANUAL_REVIEW_LIST',
  'ROUTE_PREVIEW_READINESS',
  'HUMAN_APPROVAL_REQUIRED',
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

const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_ROUTE_SERVICE_DIFF =
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) =>
    path.startsWith('backend/src/routes/') || path.startsWith('backend/src/services/'),
  );

const ACCEPTED_PRISMA_MIGRATIONS = [
  {
    path: 'backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql',
    sha256: '27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD',
  },
  {
    path: 'backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql',
    sha256: '864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD',
  },
  {
    path: 'backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql',
    sha256: 'E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5',
  },
  {
    path: 'backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql',
    sha256: '6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB',
  },
  {
    path: 'backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql',
    sha256: 'CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F',
  },
  {
    path: 'backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql',
    sha256: 'B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90',
  },
  {
    path: 'backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql',
    sha256: '734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005',
  },
  {
    path: 'backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql',
    sha256: '85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17',
  },
  {
    path: 'backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql',
    sha256: '3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0',
  },
  {
    path: 'backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql',
    sha256: '24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198',
  },
  {
    path: 'backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql',
    sha256: 'A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202',
  },
  {
    path: 'backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql',
    sha256: '0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A',
  },
  {
    path: 'backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql',
    sha256: 'D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF',
  },
  {
    path: 'backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql',
    sha256: '8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A',
  },
  {
    path: 'backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql',
    sha256: 'F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A',
  },
  {
    path: 'backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql',
    sha256: '025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0',
  },
  {
    path: 'backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql',
    sha256: 'D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E',
  },
  {
    path: 'backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql',
    sha256: 'C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54',
  },
  {
    path: 'backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql',
    sha256: 'FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D',
  },
  {
    path: 'backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql',
    sha256: 'E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90',
  },
  {
    path: 'backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql',
    sha256: '7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007',
  },
  {
    path: 'backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql',
    sha256: '285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27',
  },
  {
    path: 'backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql',
    sha256: 'E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5',
  },
  {
    path: 'backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql',
    sha256: '3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36',
  },
  {
    path: 'backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql',
    sha256: '59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA',
  },
  {
    path: 'backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql',
    sha256: 'F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528',
  },
  {
    path: 'backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql',
    sha256: '423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581',
  },
  {
    path: 'backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql',
    sha256: '252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79',
  },
  {
    path: 'backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql',
    sha256: '168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F',
  },
  {
    path: 'backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql',
    sha256: 'BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC',
  },
  {
    path: 'backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql',
    sha256: '2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924',
  },
  {
    path: 'backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql',
    sha256: '939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5',
  },
];
const ACCEPTED_PRISMA_FILES = [
  ACCEPTED_SCHEMA_PATH,
  ...ACCEPTED_PRISMA_MIGRATIONS.map((entry) => entry.path),
];

async function main() {
  console.log('=== OSRM-ROUTE-DRAFT-FROM-EXCEL-01 CHECK ===');

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const humanApproval = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const excelDoc = read('docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md');
  const addressDoc = read('docs/ADDRESS_GEOCODING_CONFIDENCE_01.md');
  const stopDoc = read('docs/COPILOT_STOP_ROUTE_DRAFT_01.md');
  const doc = read('docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md');
  const helper = read('backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const roadmapLockCheck = read('backend/scripts/roadmap_lock_ai_marketplace_01_check.js');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:osrmroutedraftfromexcel01": "node backend/scripts/osrm_route_draft_from_excel_01_check.js"', 'package.json exposes OSRM route draft from Excel check');
  assertProductExtensionsOrder(['check:copilotstoproutedraft01', 'check:osrmroutedraftfromexcel01', 'check:uxcopilotsmartchips01'], 'product extensions registry keeps OSRM route draft from Excel after stop-route draft', registryScripts);
  assertProductExtensionsOrder(['check:copilotstoproutedraft01', 'check:osrmroutedraftfromexcel01', 'check:uxcopilotsmartchips01'], 'verify chain registry keeps OSRM route draft from Excel after stop-route draft', registryScripts);

  must(guide, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'milestone guide mentions OSRM route draft from Excel milestone');
  must(guide, 'check:osrmroutedraftfromexcel01', 'milestone guide exposes OSRM route draft from Excel check');
  must(guide, 'node backend\\scripts\\osrm_route_draft_from_excel_01_check.js', 'milestone guide includes OSRM route draft from Excel command');
  must(guide, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'milestone guide includes OSRM route draft from Excel doc');
  must(guide, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'milestone guide includes OSRM route draft from Excel helper');
  ordered(guide, ['COPILOT-STOP-ROUTE-DRAFT-01', 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01'], 'milestone guide keeps OSRM route draft from Excel after stop-route draft');

  must(primer, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'primer mentions OSRM route draft from Excel milestone');
  must(primer, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'primer links OSRM route draft from Excel doc');

  must(roadmapLock, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'roadmap lock keeps OSRM route draft from Excel milestone');
  must(roadmapLock, 'EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI', 'roadmap lock keeps Excel/address/OSRM route draft line');

  must(roleMatrix, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'role/task matrix doc references OSRM route draft from Excel milestone');
  must(roleMatrix, 'route draft readiness roadmap', 'role/task matrix doc keeps OSRM route draft readiness wording');
  must(roleMatrix, 'runtime OSRM call', 'role/task matrix doc keeps runtime OSRM boundary');

  must(aiRoadmap, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'AI action roadmap doc references OSRM route draft from Excel milestone');
  must(aiRoadmap, 'future-only OSRM route draft readiness', 'AI action roadmap doc keeps OSRM readiness wording');

  must(demandToAgreement, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'demand-to-agreement doc references OSRM route draft from Excel milestone');
  must(demandToAgreement, 'OSRM route draft readiness', 'demand-to-agreement doc keeps OSRM readiness wording');

  must(humanApproval, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'human approval doc keeps OSRM route draft from Excel future line');
  must(excelDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'Excel demand import doc references OSRM route draft from Excel milestone');
  must(addressDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'address geocoding confidence doc references OSRM route draft from Excel milestone');
  must(stopDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'stop-route draft doc references OSRM route draft from Excel milestone');
  must(roadmapLockCheck, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'roadmap lock check references OSRM route draft from Excel milestone');

  must(doc, '# OSRM ROUTE DRAFT FROM EXCEL 01', 'OSRM route draft from Excel doc title present');
  must(doc, 'docs/check milestone', 'OSRM route draft from Excel doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:osrmroutedraftfromexcel01`', 'OSRM route draft from Excel doc keeps canonical check wording');
  ordered(doc, requiredStages, 'OSRM route draft from Excel doc keeps stage ordering');
  for (const risk of requiredRiskCategories) {
    must(doc, risk, `OSRM route draft from Excel doc includes risk category ${risk}`);
  }
  for (const category of requiredTaskCategories) {
    must(doc, category, `OSRM route draft from Excel doc includes task category ${category}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `OSRM route draft from Excel doc includes role boundary ${role}`);
  }
  must(doc, 'sabah inbound', 'OSRM route draft from Excel doc keeps sabah inbound model');
  must(doc, 'akşam outbound', 'OSRM route draft from Excel doc keeps akşam outbound model');
  must(doc, 'ring varsayımı yok', 'OSRM route draft from Excel doc keeps ring assumption boundary');
  must(doc, 'araç deposu zorunlu varsayımı yok', 'OSRM route draft from Excel doc keeps depot assumption boundary');
  must(doc, 'Distance/duration/polyline hesaplamaz.', 'OSRM route draft from Excel doc keeps preview computation boundary');
  must(doc, 'OSRM call yapmaz.', 'OSRM route draft from Excel doc keeps OSRM call boundary');
  must(doc, 'Human Review Gate', 'OSRM route draft from Excel doc keeps human review gate section');
  must(doc, 'KVKK / veri güvenliği sınırı', 'OSRM route draft from Excel doc keeps KVKK/data safety boundary');
  must(doc, 'Public promise / güven stratejisi', 'OSRM route draft from Excel doc keeps public promise section');
  must(doc, 'Underpromise, overdeliver', 'OSRM route draft from Excel doc keeps trust strategy wording');
  must(doc, 'Excel’den otomatik rota oluşturur', 'OSRM route draft from Excel doc keeps no-overclaim wording');
  must(doc, 'Runtime OSRM route calculation açılmaz.', 'OSRM route draft from Excel doc keeps runtime OSRM boundary');
  must(doc, 'OSRM table/match/route call açılmaz.', 'OSRM route draft from Excel doc keeps OSRM table/match/route boundary');
  must(doc, 'Route preview generation açılmaz.', 'OSRM route draft from Excel doc keeps route preview boundary');
  must(doc, 'Distance/duration/polyline generation açılmaz.', 'OSRM route draft from Excel doc keeps geometry boundary');
  must(doc, 'Route draft create/apply açılmaz.', 'OSRM route draft from Excel doc keeps route draft boundary');
  must(doc, 'Stop create açılmaz.', 'OSRM route draft from Excel doc keeps stop boundary');
  must(doc, 'Geocode execute açılmaz.', 'OSRM route draft from Excel doc keeps geocode boundary');
  must(doc, 'Lat/lng persistent write açılmaz.', 'OSRM route draft from Excel doc keeps lat/lng boundary');
  must(doc, 'DB write açılmaz.', 'OSRM route draft from Excel doc keeps DB boundary');
  must(doc, 'Runtime AI action açılmaz.', 'OSRM route draft from Excel doc keeps runtime AI boundary');
  must(doc, 'Tool execution açılmaz.', 'OSRM route draft from Excel doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açılmaz.', 'OSRM route draft from Excel doc keeps dispatcher boundary');
  must(doc, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'OSRM route draft from Excel doc links static helper');
  must(doc, 'Kapsam dışı', 'OSRM route draft from Excel doc keeps out-of-scope section');

  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_VERSION', 'helper exposes version marker');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_STAGES', 'helper exposes stages');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_DIRECTION_MODEL', 'helper exposes direction model');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_COORDINATE_READINESS', 'helper exposes coordinate readiness');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_RISK_CATEGORIES', 'helper exposes risk categories');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_TASK_CATEGORIES', 'helper exposes task categories');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_HANOFFS', 'helper exposes handoffs');
  must(helper, 'OSRM_ROUTE_DRAFT_FROM_EXCEL_POLICY', 'helper exposes policy object');
  must(helper, 'buildOsrmRouteDraftFromExcelRole', 'helper exposes role builder');
  must(helper, 'listOsrmRouteDraftFromExcelRoles', 'helper exposes role lister');
  must(helper, 'getOsrmRouteDraftFromExcelPolicy', 'helper exposes policy getter');
  ordered(helper, requiredStages, 'helper keeps OSRM route draft from Excel stage ordering');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT']) {
    must(helper, `buildOsrmRouteDraftFromExcelRole('${role}'`, `helper keeps role ${role}`);
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

  must(harnessCheck, 'check:osrmroutedraftfromexcel01', 'script harness check knows OSRM route draft from Excel alias');
  must(harnessCheck, 'osrm_route_draft_from_excel_01_check.js', 'script harness check knows OSRM route draft from Excel file');
  must(harnessCheck, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'script harness check knows OSRM route draft from Excel milestone');
  must(harnessCheck, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'script harness check knows OSRM route draft from Excel doc');
  must(harnessCheck, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'script harness check knows OSRM route draft from Excel helper');

  must(harnessDoc, 'root:check:osrmroutedraftfromexcel01', 'script harness doc lists OSRM route draft from Excel root check');
  must(harnessDoc, 'osrm_route_draft_from_excel_01_check.js', 'script harness doc lists OSRM route draft from Excel check');
  must(harnessDoc, 'docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md', 'script harness doc lists OSRM route draft from Excel doc');
  must(harnessDoc, 'backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js', 'script harness doc lists OSRM route draft from Excel helper');
  must(harnessDoc, 'OSRM-ROUTE-DRAFT-FROM-EXCEL-01', 'script harness doc lists OSRM route draft from Excel milestone');

  mustStatusEmptyOrExactlyWithIdentity(
    ['backend/src/routes', 'backend/src/services'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_ROUTE_SERVICE_DIFF,
    'backend route/service status stays current-head approved'
  );
  mustDiffEmptyOrExactlyWithIdentity(['backend/prisma', 'prisma'], [], 'backend prisma diff stays empty');
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, 'accepted Prisma schema SHA matches');
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${path.posix.basename(path.posix.dirname(entry.path))}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${path.posix.basename(path.posix.dirname(entry.path))}`);
  }
  if (cachedNames.length !== 0) fail(`stage stays empty: ${cachedNames.join(', ')}`);
  ok('stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== OSRM-ROUTE-DRAFT-FROM-EXCEL-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
