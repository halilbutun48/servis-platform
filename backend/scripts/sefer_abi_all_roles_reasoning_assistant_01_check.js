#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import {
  SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION,
  buildSeferAbiReasoningAssistant,
  getSeferAbiReasoningRolePlaybook,
  listSeferAbiReasoningRoles,
} from '../src/ai/chat/seferAbiReasoningAssistant.js';

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

function assert(condition, label) {
  if (!condition) fail(label);
  ok(label);
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
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
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
      fail(`${relPath}: bare CR`);
    }
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
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

function mustAcceptedPrismaManifest() {
  mustNoDiff(['backend/prisma', 'prisma'], 'backend/prisma diff empty');
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, 'accepted Prisma schema SHA matches');
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

async function loadModule(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function buildScreenFixture({
  path: screenPath,
  label: screenLabel,
  selectedSummary = 'Seçili kayıt hazır.',
  selectedLabel = 'Seçili kayıt',
  selectedRecordStatus = 'Seçili kayıt hazır.',
  firstStep = '',
  nextStep = '',
} = {}) {
  return {
    screenDefinition: {
      path: screenPath,
      label: screenLabel,
      menuPurpose: `${screenLabel} için özet`,
      plainSummary: `${screenLabel} için özet`,
      summary: `${screenLabel} için özet`,
      firstStep,
      nextStep,
      screenMenus: [{ label: 'Takip', path: screenPath, purpose: `${screenLabel} ekranını açar.` }],
      buttonGuides: [{ label: 'Takip', purpose: `${screenLabel} listesini açar.`, whenToUse: 'Kayıt görmek istediğinde.', whatHappens: `${screenLabel} listesi açılır.` }],
      simpleTerms: ['hakediş', 'route readiness', 'servis kanıtı'],
    },
    screenContext: {
      path: screenPath,
      label: screenLabel,
      selectedSummary,
      selectedLabel,
      selectedRecordStatus,
      selectedFields: [
        { label: 'Durum', value: selectedRecordStatus },
        { label: 'Özet', value: selectedSummary },
      ],
      selectedBadges: [{ label: 'Durum', value: selectedRecordStatus }],
      structuredFacts: {
        reasoningLead: `${screenLabel} için özet.`,
        nextBestAction: firstStep || 'İlk kartı aç.',
        selectedRecordStatus,
      },
    },
  };
}

function buildReply({
  message,
  role = '',
  companyKind = '',
  roleMode = 'OPERATIONS',
  screenFixture = buildScreenFixture({ path: '/company/shifts', label: 'Company Shifts', firstStep: 'Önce vardiya satırını aç.', nextStep: 'Sonra araç ve sürücüyü bağla.' }),
  conversationState = null,
  user = null,
} = {}) {
  const resolvedUser = user || makeUser(role, companyKind);
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: resolvedUser,
    message,
    context: null,
    entityLabel: screenFixture?.screenContext?.label || '',
    scope: { roleMode, role },
    conversationState,
    screenContext: screenFixture?.screenContext || null,
    screenDefinition: screenFixture?.screenDefinition || null,
  });
}

function buildAssistantSnapshot({
  message,
  role = '',
  companyKind = '',
  roleMode = 'OPERATIONS',
  questionType = 'NEXT_STEP',
  conversationState = null,
  screenFixture = buildScreenFixture({ path: '/company/shifts', label: 'Company Shifts', firstStep: 'Önce vardiya satırını aç.', nextStep: 'Sonra araç ve sürücüyü bağla.' }),
  guide = null,
  analysis = null,
  contextPriority = null,
} = {}) {
  const resolvedUser = makeUser(role, companyKind);
  return buildSeferAbiReasoningAssistant({
    rawReply: 'Temel cevap.',
    message,
    questionType,
    replyMode: 'SHORT',
    guide: guide || {
      plainSummary: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      summary: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      screenExplanation: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      whatToDoNow: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      whatToDoNext: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      whyBlocked: '',
      doNotDo: '',
    },
    roleMode,
    userRole: resolvedUser.role,
    user: resolvedUser,
    screenPath: screenFixture?.screenDefinition?.path || '',
    screenDefinition: screenFixture?.screenDefinition || null,
    screenContext: screenFixture?.screenContext || null,
    analysis: analysis || {
      reasoningLead: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      nextBestAction: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      safestNextStep: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      selectedRecordStatus: screenFixture?.screenContext?.selectedRecordStatus || '',
      blockers: [],
      missingData: [],
      evidence: [],
      compareHint: '',
    },
    contextPriority: contextPriority || {
      summaryLead: screenFixture?.screenContext?.structuredFacts?.reasoningLead || '',
      bestNextAction: screenFixture?.screenContext?.structuredFacts?.nextBestAction || '',
      selectedRecordMismatchLead: screenFixture?.screenContext?.selectedRecordStatus || '',
      needsSelection: false,
      sameRecordLikely: true,
      roleBoundary: '',
      evidenceConfidence: '',
    },
    conversationState,
    guidedTaskMeta: null,
    entityType: 'screen',
  });
}

async function main() {
  console.log('=== SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const guidedDoc = read('docs/COPILOT_GUIDED_TASK_ENGINE_01.md');
  const newDoc = read('docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const helperSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const cachedNames = gitCachedNames();

  const helperMod = await loadModule('backend/src/ai/chat/seferAbiReasoningAssistant.js');

  must(pkg, '"check:seferabiallrolesreasoningassistant01": "node backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js"', 'package.json exposes new reasoning assistant check');
  ordered(runner, ['check:copilotguidedtaskengine01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01', 'check:uxcopilotsmartchips01'], 'product extensions runner places all-roles reasoning assistant after base reasoning assistant');
  ordered(verify, ['check:copilotguidedtaskengine01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01', 'check:uxcopilotsmartchips01'], 'verify chain places all-roles reasoning assistant after base reasoning assistant');

  must(guide, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'script guide mentions new milestone');
  must(guide, 'check:seferabiallrolesreasoningassistant01', 'script guide exposes new check');
  must(guide, 'node backend\\scripts\\sefer_abi_all_roles_reasoning_assistant_01_check.js', 'script guide includes new check command');
  must(guide, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'script guide includes new doc');
  ordered(guide, ['SEFER-ABI-REASONING-ASSISTANT-01', 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'ETA-SANITY-01'], 'script guide keeps new milestone after the base reasoning assistant');

  must(primer, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'primer mentions new milestone');
  must(primer, 'check:seferabiallrolesreasoningassistant01', 'primer exposes new check');
  must(primer, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'primer links new doc');
  must(primer, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'primer links reasoning helper');

  must(roadmapLock, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'roadmap lock keeps new milestone');
  must(roleMatrix, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'role/task matrix references new milestone');
  must(aiRoadmap, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'AI action roadmap references new milestone');
  must(guidedDoc, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'guided task engine doc references new milestone');
  must(guidedDoc, 'Golden pack test/kabul içindir', 'guided task engine doc keeps golden pack test-only wording');

  must(newDoc, '# SEFER ABI ALL ROLES REASONING ASSISTANT 01', 'new doc title present');
  must(newDoc, 'Canonical check: `check:seferabiallrolesreasoningassistant01`', 'new doc keeps canonical check wording');
  must(newDoc, 'interactionIntentFamily', 'new doc mentions intent family');
  must(newDoc, 'role + screen + selected record + conversation state', 'new doc keeps reasoning context inputs');
  must(newDoc, 'Golden pack test/kabul içindir', 'new doc keeps golden pack test-only wording');
  must(newDoc, 'reply source değildir', 'new doc keeps reply-source boundary');
  must(newDoc, 'Runtime AI action açmaz', 'new doc keeps runtime boundary');
  must(newDoc, 'Tool execution açmaz', 'new doc keeps tool boundary');
  must(newDoc, 'Write-action dispatcher açmaz', 'new doc keeps dispatcher boundary');
  must(newDoc, 'DB write açmaz', 'new doc keeps db boundary');
  must(newDoc, 'Route apply açmaz', 'new doc keeps route apply boundary');
  must(newDoc, 'Fake success açmaz', 'new doc keeps fake success boundary');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(newDoc, role, `new doc covers role ${role}`);
  }

  must(helperSource, 'SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION', 'helper exposes new milestone version marker');
  must(helperSource, 'SEFER_ABI_REASONING_ASSISTANT_INTENT_FAMILIES', 'helper exposes intent families');
  must(helperSource, 'assistantMilestone', 'helper exposes assistant milestone marker');
  must(helperSource, 'interactionIntentFamily', 'helper stores interaction intent family');
  must(helperSource, 'buildSeferAbiReasoningAssistant', 'helper exports builder');
  must(helperSource, 'getSeferAbiReasoningRolePlaybook', 'helper exports role playbook');
  mustNot(helperSource, 'goldenQuestionPack', 'helper never imports golden pack');
  mustNot(helperSource, 'fetch(', 'helper has no fetch runtime');
  mustNot(helperSource, 'spawn(', 'helper has no spawn runtime');
  mustNot(helperSource, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helperSource, 'prisma', 'helper has no prisma runtime');

  must(helpComposerSource, 'getSeferAbiReasoningRolePlaybook', 'help composer imports the role playbook helper');
  must(helpComposerSource, 'stepFlowSentence', 'help composer keeps natural step flow helper');
  must(helpComposerSource, 'Takılırsan "bulamadım" yaz.', 'help composer keeps safe follow-up line');
  mustNot(helpComposerSource, 'goldenQuestionPack', 'help composer does not use golden pack as runtime reply source');

  const rolePlaybookCases = [
    { role: 'SUPER_ADMIN', frame: 'Sistem açısından:', firstStep: 'Sistem durumu bandını aç' },
    { role: 'COMPANY', frame: 'Şirket açısından:', firstStep: 'Planlama Merkezi\'ni aç' },
    { role: 'ROOM', frame: 'Oda açısından:', firstStep: 'Teklifleri incele' },
    { role: 'DRIVER', frame: 'Kısaca:', firstStep: 'Aktif rotanı aç' },
    { role: 'PERSONEL', frame: 'Sade cevap:', firstStep: 'Servis durumunu / my ride ekranını aç' },
    { role: 'PARENT', frame: 'Kısa cevap:', firstStep: 'Yetkili öğrenci servis görünümünü aç' },
    { role: 'SCHOOL', frame: 'Plan ve kanıt açısından:', firstStep: 'Servis kanıtı, devam ve gecikme özetine bak' },
    { role: 'ORGANIZATION', frame: 'Plan ve onay açısından:', firstStep: 'Organizasyon servis planını aç' },
  ];
  for (const row of rolePlaybookCases) {
    const playbook = getSeferAbiReasoningRolePlaybook(row.role, row.role === 'SCHOOL' ? { role: 'COMPANY', companyKind: 'SCHOOL' } : row.role === 'ORGANIZATION' ? { role: 'COMPANY', companyKind: 'ORGANIZATION' } : { role: row.role });
    assert(playbook.frame === row.frame, `${row.role} playbook frame`);
    must(playbook.starterSteps[0], row.firstStep, `${row.role} playbook first step`);
    assert(playbook.starterSteps.length >= 2, `${row.role} playbook has at least two starter steps`);
  }
  assert(getSeferAbiReasoningRolePlaybook('COMPANY', { role: 'COMPANY', companyKind: 'SCHOOL' }).frame === 'Plan ve kanıt açısından:', 'company+school resolves to school playbook');
  assert(getSeferAbiReasoningRolePlaybook('COMPANY', { role: 'COMPANY', companyKind: 'ORGANIZATION' }).frame === 'Plan ve onay açısından:', 'company+organization resolves to organization playbook');
  assert(Array.isArray(listSeferAbiReasoningRoles()) && listSeferAbiReasoningRoles().length === 8, 'eight reasoning roles listed');

  const genericOverview = buildReply({
    message: 'Bu program ne işe yarıyor?',
    role: '',
    roleMode: 'OPERATIONS',
    screenFixture: null,
    conversationState: null,
    user: {},
  });
  assert(genericOverview.questionType === 'PRODUCT_OVERVIEW_HELP', 'generic overview routes to product overview help');
  must(genericOverview.reply, 'SeferPakt', 'generic overview mentions product');
  must(genericOverview.reply, 'planlamak, takip etmek', 'generic overview explains the platform');
  must(genericOverview.reply, 'Hangi roldesin?', 'generic overview asks for role when missing');
  mustNot(genericOverview.reply, 'bulamadım', 'generic overview drops repetitive fallback');

  const companyOverview = buildReply({ message: 'Bu program ne?', role: 'COMPANY' });
  const driverOverview = buildReply({ message: 'Bu program ne?', role: 'DRIVER', roleMode: 'SIMPLE' });
  const roomOverview = buildReply({ message: 'Bu program ne?', role: 'ROOM' });
  must(companyOverview.reply, 'Şirket rolünde', 'company overview names the role');
  must(companyOverview.reply, 'teklif', 'company overview mentions the plan / offer lane');
  must(companyOverview.reply, 'sözleşme', 'company overview mentions contracts');
  must(companyOverview.reply, 'vardiya', 'company overview mentions shifts');
  must(driverOverview.reply, 'Sürücü rolünde', 'driver overview names the role');
  must(driverOverview.reply, 'rota', 'driver overview mentions route');
  must(driverOverview.reply, 'durağı', 'driver overview stays field-oriented');
  assert(driverOverview.reply.length <= 320, 'driver overview stays short');
  must(roomOverview.reply, 'Oda rolünde', 'room overview names the role');
  must(roomOverview.reply, 'araç', 'room overview mentions vehicle');
  must(roomOverview.reply, 'sürücü', 'room overview mentions driver');
  must(roomOverview.reply, 'operasyon', 'room overview stays operational');
  assert(companyOverview.reply !== driverOverview.reply, 'different roles produce different product-overview replies');
  assert(driverOverview.reply !== roomOverview.reply, 'different roles produce different role-shaped replies');

  const schoolOverview = buildReply({ message: 'Bu program ne?', role: 'COMPANY', companyKind: 'SCHOOL' });
  const organizationOverview = buildReply({ message: 'Bu program ne?', role: 'COMPANY', companyKind: 'ORGANIZATION' });
  must(schoolOverview.reply, 'Okul rolünde', 'company+school overview resolves to school');
  must(organizationOverview.reply, 'Organizasyon rolünde', 'company+organization overview resolves to organization');
  must(schoolOverview.reply, 'kanıt', 'school overview stays within evidence lane');
  must(organizationOverview.reply, 'onay', 'organization overview stays within approval lane');

  const roleExplanation = buildReply({
    message: 'Room rolü ne yapar?',
    role: 'ROOM',
    roleMode: 'OPERATIONS',
  });
  assert(roleExplanation.questionType === 'ROLE_EXPLANATION_HELP', 'role explanation routes correctly');
  must(roleExplanation.reply, 'Oda rolünde', 'role explanation names the role');
  must(roleExplanation.reply, 'operasyon, sürücü ve araç', 'role explanation explains the role');
  must(roleExplanation.reply, 'Önce', 'role explanation gives a first step');
  mustNot(roleExplanation.reply, 'bulamadım', 'role explanation drops repetitive fallback');

  const screenExplanation = buildReply({
    message: 'Bu ekran ne işe yarar?',
    role: 'SUPER_ADMIN',
    screenFixture: buildScreenFixture({
      path: '/superadmin/operations',
      label: 'Super Admin Operations',
      firstStep: 'Önce operasyon özetini aç.',
      nextStep: 'Sonra kritik kayıtları incele.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(screenExplanation.questionType === 'SCREEN_EXPLANATION_HELP', 'screen explanation routes correctly');
  must(screenExplanation.reply, 'operasyon özetini aç', 'screen explanation keeps the purpose');
  must(screenExplanation.reply, 'Şu an Super Admin Operations ekranındaysan', 'screen explanation keeps the screen context');
  mustNot(screenExplanation.reply, 'bulamadım', 'screen explanation drops repetitive fallback');

  const howToHelp = buildReply({
    message: 'Vardiya nasıl oluşturulur?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(howToHelp.questionType === 'HOW_TO_HELP', 'how-to routes correctly');
  must(howToHelp.reply, 'Planlama Merkezi', 'how-to reply starts from planning center');
  must(howToHelp.reply, 'Yeni Plan Oluştur', 'how-to reply includes new plan entry');
  must(howToHelp.reply, 'Rehberi Başlat', 'how-to reply includes guidance entry');
  must(howToHelp.reply, 'paket', 'how-to reply includes package selection');
  must(howToHelp.reply, 'tarih', 'how-to reply includes date selection');
  must(howToHelp.reply, 'saat', 'how-to reply includes time selection');
  must(howToHelp.reply, 'servis yönü', 'how-to reply includes direction selection');
  must(howToHelp.reply, 'kapsam', 'how-to reply includes scope selection');
  must(howToHelp.reply, 'personel', 'how-to reply includes personnel review');
  must(howToHelp.reply, 'adres/konum', 'how-to reply includes address/location review');
  must(howToHelp.reply, 'durak', 'how-to reply includes stop review');
  must(howToHelp.reply, 'rota önizlemesini', 'how-to reply includes route preview');
  must(howToHelp.reply, 'oluşan vardiyayı Vardiyalar ekranında takip eder', 'how-to reply uses shifts only for follow-up');
  mustNot(howToHelp.reply, 'Vardiyalar ekranına gir', 'how-to reply does not start from the shifts screen');
  mustNot(howToHelp.reply, 'Plan Builder', 'how-to reply avoids English builder jargon');
  mustNot(howToHelp.reply, 'Company', 'how-to reply avoids English role name');
  mustNot(howToHelp.reply, 'georeview', 'how-to reply avoids georeview jargon');
  mustNot(howToHelp.reply, 'matrix', 'how-to reply avoids matrix jargon');
  mustNot(howToHelp.reply, 'bulamadım', 'how-to reply drops repetitive fallback');

  const buttonHelp = buildReply({
    message: 'Bu buton ne işe yarıyor?',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(buttonHelp.questionType === 'FIELD_BUTTON_HELP', 'button question routes correctly');
  must(buttonHelp.reply, 'Takip', 'button help names the button');
  must(buttonHelp.reply, 'Vardiya listelerini takip görünümünde açar', 'button help explains the button purpose');
  must(buttonHelp.reply, 'bulamadım', 'button help keeps the safe follow-up line');

  const girdim = buildReply({
    message: 'girdim',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'WHY_BLOCKED',
      recentMessages: ['Bu vardiya neden ilerlemiyor?'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev',
    },
    roleMode: 'OPERATIONS',
  });
  must(girdim.reply, 'Vardiyalar ekranına girdin', 'girdim keeps the flow moving');
  must(girdim.reply, 'yeni vardiya', 'girdim asks for the first control');

  const yaptim = buildReply({
    message: 'yaptım',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'RESULT_CHECK',
      recentMessages: ['Yaptım'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev-2',
    },
    roleMode: 'OPERATIONS',
  });
  must(yaptim.reply, 'Tamam, aynı vardiya akışından devam edelim', 'yaptım keeps the flow moving');
  must(yaptim.reply, 'tarih / saat', 'yaptım asks for the result check');

  const bulamadim = buildReply({
    message: 'bulamadım',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'NEXT_SCREEN',
      recentMessages: ['Bulamadım'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev-3',
    },
    roleMode: 'OPERATIONS',
  });
  must(bulamadim.reply, 'Vardiyalar ekranında yeni vardiya veya yeni plan oluştur alanını kontrol et', 'bulamadım names the entry path');
  must(bulamadim.reply, 'Bekleyen sekmesinden', 'bulamadım names the alternate path');

  const devamEt = buildReply({
    message: 'devam et',
    role: 'COMPANY',
    screenFixture: buildScreenFixture({
      path: '/company/shifts',
      label: 'Company Shifts',
      selectedSummary: 'Plan satırı eksik veri içeriyor',
      selectedLabel: 'Plan satırı',
      selectedRecordStatus: 'Plan satırı eksik veri içeriyor',
      firstStep: 'Önce vardiya satırını aç.',
      nextStep: 'Sonra araç ve sürücüyü bağla.',
    }),
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      recentMessages: ['Devam et'],
      lastScreenPath: '/company/shifts',
      lastSelectedLabel: 'Plan satırı',
      lastSelectedSummary: 'Plan satırı eksik veri içeriyor',
      lastReasoningFingerprint: 'prev-4',
    },
    roleMode: 'OPERATIONS',
  });
  must(devamEt.reply, 'Vardiyalar akışından devam edelim', 'devam et keeps the current context');
  must(devamEt.reply, 'Seçili Vardiya #6', 'devam et asks for the next safe step');

  const companyActionRefusal = buildReply({
    message: 'teklifi kabul et',
    role: 'COMPANY',
    conversationState: {
      lastQuestionType: 'AGREEMENT_ROUTE_REFRESH',
      recentMessages: ['teklifi kabul et'],
      lastScreenPath: '/company/agreements',
      lastReasoningFingerprint: 'prev-5',
    },
    roleMode: 'OPERATIONS',
  });
  must(companyActionRefusal.reply, 'Teklifi senin yerine kabul edemem', 'action refusal avoids executing the action');
  must(companyActionRefusal.reply, 'Kabul öncesi', 'action refusal gives the planning lane');
  must(companyActionRefusal.reply, 'son onay', 'company action refusal keeps the approval boundary visible');

  const roomActionRefusal = buildReply({
    message: 'aracı ata',
    role: 'ROOM',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      recentMessages: ['aracı ata'],
      lastScreenPath: '/room/shifts',
      lastReasoningFingerprint: 'prev-6',
    },
    roleMode: 'OPERATIONS',
  });
  must(roomActionRefusal.reply, 'Bunu ben atayamam', 'room action refusal avoids the write action');
  must(roomActionRefusal.reply, 'Önerilen güvenli adım', 'room action refusal gives an alternative');
  must(roomActionRefusal.reply, 'araç', 'room action refusal stays in the vehicle lane');

  const parentBoundary = buildAssistantSnapshot({
    message: 'Başkasının öğrencisini göster',
    role: 'PARENT',
    questionType: 'KVKK_VISIBILITY',
    conversationState: {
      lastQuestionType: 'KVKK_VISIBILITY',
      recentMessages: ['Başkasının öğrencisini göster'],
      lastScreenPath: '/parent/live',
      lastReasoningFingerprint: 'prev-7',
    },
    screenFixture: buildScreenFixture({
      path: '/parent/live',
      label: 'Parent Live',
      selectedSummary: 'Çocuğun servisi beklemede',
      selectedLabel: 'Çocuk servisi',
      selectedRecordStatus: 'Çocuğun servisi beklemede',
      firstStep: 'Önce yetkili öğrenci servis görünümünü aç.',
      nextStep: 'Sonra canlı takip bilgisini kontrol et.',
    }),
    roleMode: 'SIMPLE',
  });
  assert(parentBoundary.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE', 'parent boundary uses safe refusal mode');
  must(parentBoundary.reply, 'yetkili', 'parent boundary keeps the authority scope');
  must(parentBoundary.reply, 'Takılırsan', 'parent boundary gives a safe alternative');
  must(parentBoundary.reply, 'öğrenci', 'parent boundary stays in the student lane');

  const personelBoundary = buildAssistantSnapshot({
    message: 'Başkasının verisini benim yerime aç',
    role: 'PERSONEL',
    questionType: 'ROLE_BOUNDARY',
    conversationState: {
      lastQuestionType: 'ROLE_BOUNDARY',
      recentMessages: ['Başkasının verisini benim yerime aç'],
      lastScreenPath: '/personel/live',
      lastReasoningFingerprint: 'prev-8',
    },
    screenFixture: buildScreenFixture({
      path: '/personel/live',
      label: 'Personel Live',
      selectedSummary: 'Servis görünür ama kişisel alanlar sınırlı',
      selectedLabel: 'Servis',
      selectedRecordStatus: 'Servis görünür ama kişisel alanlar sınırlı',
      firstStep: 'Önce servis durumunu / my ride ekranını aç.',
      nextStep: 'Sonra biniş noktası ve saat bilgisini kontrol et.',
    }),
    roleMode: 'SIMPLE',
  });
  assert(personelBoundary.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE', 'personel boundary uses safe refusal mode');
  must(personelBoundary.reply, 'yetkili', 'personel boundary keeps the authority scope');
  must(personelBoundary.reply, 'Takılırsan', 'personel boundary gives a safe alternative');
  must(personelBoundary.reply, 'KVKK', 'personel boundary keeps KVKK wording');

  const assistantStep = buildAssistantSnapshot({
    message: 'girdim',
    role: 'ROOM',
    questionType: 'NEXT_STEP',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      recentMessages: ['girdim'],
      lastScreenPath: '/room/shifts',
      lastReasoningFingerprint: 'prev-9',
      lastReasoningRepeatCount: 0,
    },
    screenFixture: buildScreenFixture({
      path: '/room/shifts',
      label: 'Room Shifts',
      selectedSummary: 'Vardiya araç ve sürücü bekliyor',
      selectedLabel: 'Vardiya',
      selectedRecordStatus: 'Vardiya araç ve sürücü bekliyor',
      firstStep: 'Önce teklifleri incele.',
      nextStep: 'Sonra araç / sürücü uygunluğunu kontrol et.',
    }),
    roleMode: 'OPERATIONS',
  });
  assert(assistantStep.assistantMilestone === SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION, 'assistant milestone marker exposed');
  assert(assistantStep.interactionIntentFamily === 'STEP_ENTERED', 'assistant detects the step-entered intent family');
  must(assistantStep.reply, 'adımı', 'assistant keeps the progressed flow');
  must(assistantStep.reply, 'kontrol', 'assistant keeps the next control');

  const helperExports = Object.keys(helperMod).join(' | ');
  for (const exportName of [
    'SEFER_ABI_REASONING_ASSISTANT_VERSION',
    'SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION',
    'SEFER_ABI_REASONING_ASSISTANT_MODES',
    'SEFER_ABI_REASONING_ASSISTANT_INTENT_FAMILIES',
    'SEFER_ABI_REASONING_ASSISTANT_GUARD_REQUIREMENTS',
    'SEFER_ABI_REASONING_ASSISTANT_PUBLIC_PROMISE',
    'SEFER_ABI_REASONING_ASSISTANT_BLOCKED_ACTIONS',
    'SEFER_ABI_REASONING_ASSISTANT_NEVER_AUTOMATE',
    'SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES',
    'listSeferAbiReasoningRoles',
    'getSeferAbiReasoningRoleProfile',
    'getSeferAbiReasoningRolePlaybook',
    'buildSeferAbiReasoningAssistantContextSnapshot',
    'detectSeferAbiReasoningMode',
    'composeSeferAbiReasoningReply',
    'buildSeferAbiReasoningAssistant',
  ]) {
    must(helperExports, exportName, `helper exports ${exportName}`);
  }

  mustNoDiff(['backend/src/routes', 'backend/src/services'], 'backend route/service diff stays empty');
  mustAcceptedPrismaManifest();
  assert(cachedNames.length === 0, 'stage stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  mustNot(helperSource, 'goldenQuestionPack', 'helper never imports golden pack');
  mustNot(helpComposerSource, 'goldenQuestionPack', 'help composer never imports golden pack');

  console.log('=== SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01 CHECK OK ===');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
