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

const requiredStages = [
  'STAGE 1 — Address Intake Readiness',
  'STAGE 2 — Address Normalization Signals',
  'STAGE 3 — Confidence Bands',
  'STAGE 4 — Risk Categories',
  'STAGE 5 — Human Review Gate',
  'STAGE 6 — Handoff to Next Milestones',
];

const requiredBands = [
  'HIGH_CONFIDENCE',
  'MEDIUM_CONFIDENCE',
  'LOW_CONFIDENCE',
  'BLOCKED_FOR_GEOCODING',
];

const requiredRiskCategories = [
  'MISSING_CITY',
  'MISSING_DISTRICT',
  'MISSING_STREET_OR_NEIGHBORHOOD',
  'AMBIGUOUS_LANDMARK',
  'DUPLICATE_ADDRESS',
  'POSSIBLE_MULTI_MATCH',
  'PERSONAL_DATA_EXPOSURE',
  'CROSS_ORGANIZATION_RISK',
  'KVKK_CONSENT_UNKNOWN',
  'TOO_SHORT_ADDRESS',
  'TOO_LONG_FREE_TEXT',
  'TURKISH_CHARACTER_OR_TYPING_RISK',
  'MANUAL_REVIEW_REQUIRED',
];

const requiredTaskCategories = [
  'ADDRESS_READINESS_EXPLAIN',
  'CONFIDENCE_CLASSIFY',
  'RISK_FLAG_SUMMARY',
  'MISSING_ADDRESS_FIELD_REPORT',
  'DUPLICATE_ADDRESS_HINT',
  'MANUAL_REVIEW_LIST',
  'GEOCODE_PREP_CHECKLIST',
  'NEXT_STEP_RECOMMENDATION',
  'HUMAN_APPROVAL_REQUIRED',
];

const requiredRoles = [
  'SUPER_ADMIN',
  'COMPANY',
  'ROOM',
  'DRIVER',
  'PERSONEL / PARENT',
  'SCHOOL / ORGANIZATION',
];

const requiredQualityDictionary = [
  'city',
  'district',
  'neighborhood',
  'street / avenue',
  'building number',
  'block / floor / apartment',
  'landmark',
  'postal code',
  'organization / tenant label',
  'duplicate candidate',
  'typo risk',
  'Turkish character / typing risk',
  'KVKK / privacy exposure',
];

const requiredHumanReviewStates = [
  'HUMAN_REVIEW_REQUIRED',
  'KVKK_REVIEW_REQUIRED',
  'CROSS_ORGANIZATION_REVIEW_REQUIRED',
  'AMBIGUOUS_ADDRESS_REVIEW_REQUIRED',
  'BLOCKED_FOR_GEOCODING',
];

async function main() {
  console.log('=== ADDRESS-GEOCODING-CONFIDENCE-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const excelDoc = read('docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md');
  const humanApproval = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const demandToAgreement = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const doc = read('docs/ADDRESS_GEOCODING_CONFIDENCE_01.md');
  const helper = read('backend/src/ai/chat/addressGeocodingConfidencePolicy.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:addressgeocodingconfidence01": "node backend/scripts/address_geocoding_confidence_01_check.js"', 'package.json exposes address geocoding confidence check');
  ordered(runner, ['check:copilotexceldemandimport01', 'check:addressgeocodingconfidence01', 'check:uxcopilotsmartchips01'], 'product extensions runner places address geocoding confidence after Excel demand import');
  ordered(verify, ['check:copilotexceldemandimport01', 'check:addressgeocodingconfidence01', 'check:uxcopilotsmartchips01'], 'verify chain places address geocoding confidence after Excel demand import');

  must(guide, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'milestone guide mentions address geocoding confidence milestone');
  must(guide, 'check:addressgeocodingconfidence01', 'milestone guide exposes address geocoding confidence check');
  must(guide, 'node backend\\scripts\\address_geocoding_confidence_01_check.js', 'milestone guide includes address geocoding confidence command');
  must(guide, 'docs/ADDRESS_GEOCODING_CONFIDENCE_01.md', 'milestone guide includes address geocoding confidence doc');
  must(guide, 'backend/src/ai/chat/addressGeocodingConfidencePolicy.js', 'milestone guide includes address geocoding confidence helper');
  ordered(guide, ['COPILOT-EXCEL-DEMAND-IMPORT-01', 'ADDRESS-GEOCODING-CONFIDENCE-01', 'COPILOT-STOP-ROUTE-DRAFT-01'], 'milestone guide keeps address geocoding confidence after Excel demand import');

  must(primer, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'primer mentions address geocoding confidence milestone');
  must(primer, 'check:addressgeocodingconfidence01', 'primer exposes address geocoding confidence check');
  must(primer, 'docs/ADDRESS_GEOCODING_CONFIDENCE_01.md', 'primer links address geocoding confidence doc');

  must(roadmapLock, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'roadmap lock keeps address geocoding confidence milestone');
  must(roadmapLock, 'EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI', 'roadmap lock keeps Excel/address/OSRM route draft line');

  must(roleMatrix, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'role/task matrix doc references address geocoding confidence milestone');
  must(roleMatrix, 'runtime geocode açmaz', 'role/task matrix doc keeps runtime geocode boundary');
  must(roleMatrix, 'KVKK / data safety boundary', 'role/task matrix doc keeps KVKK/data safety boundary');

  must(excelDoc, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'Excel demand import doc references address geocoding confidence milestone');
  must(humanApproval, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'human approval doc keeps address geocoding confidence future line');
  must(demandToAgreement, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'demand-to-agreement doc references address geocoding confidence milestone');

  must(doc, '# ADDRESS GEOCODING CONFIDENCE 01', 'address geocoding confidence doc title present');
  must(doc, 'docs/check milestone', 'address geocoding confidence doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:addressgeocodingconfidence01`', 'address geocoding confidence doc keeps canonical check wording');
  ordered(doc, requiredStages, 'address geocoding confidence doc keeps stage ordering');
  must(doc, 'Address quality dictionary', 'address geocoding confidence doc keeps quality dictionary heading');
  for (const item of requiredQualityDictionary) {
    must(doc, item, `address geocoding confidence doc includes quality dictionary item ${item}`);
  }
  must(doc, 'Geocoding readiness model', 'address geocoding confidence doc keeps readiness model heading');
  for (const band of requiredBands) {
    must(doc, band, `address geocoding confidence doc includes confidence band ${band}`);
  }
  for (const risk of requiredRiskCategories) {
    must(doc, risk, `address geocoding confidence doc includes risk category ${risk}`);
  }
  for (const state of requiredHumanReviewStates) {
    must(doc, state, `address geocoding confidence doc includes human review state ${state}`);
  }
  for (const category of requiredTaskCategories) {
    must(doc, category, `address geocoding confidence doc includes task category ${category}`);
  }
  for (const role of requiredRoles) {
    must(doc, role, `address geocoding confidence doc includes role boundary ${role}`);
  }
  must(doc, 'KVKK / data safety boundary', 'address geocoding confidence doc keeps KVKK/data safety boundary');
  must(doc, 'Excel demand import handoff alignment', 'address geocoding confidence doc keeps Excel demand import handoff alignment');
  must(doc, 'Stop / route draft handoff alignment', 'address geocoding confidence doc keeps stop/route draft handoff alignment');
  must(doc, 'Public promise / güven stratejisi', 'address geocoding confidence doc keeps public promise section');
  must(doc, 'Underpromise, overdeliver', 'address geocoding confidence doc keeps trust strategy wording');
  must(doc, 'Runtime geocode açılmaz.', 'address geocoding confidence doc keeps runtime geocode boundary');
  must(doc, 'Geocode provider call', 'address geocoding confidence doc keeps provider boundary');
  must(doc, 'Map API call', 'address geocoding confidence doc keeps map API boundary');
  must(doc, 'OSRM call', 'address geocoding confidence doc keeps OSRM boundary');
  must(doc, 'lat/lng persistence', 'address geocoding confidence doc keeps lat/lng boundary');
  must(doc, 'Route apply açılmaz.', 'address geocoding confidence doc keeps route boundary');
  must(doc, 'Stop create açılmaz.', 'address geocoding confidence doc keeps stop boundary');
  must(doc, 'SMS/email/push açılmaz.', 'address geocoding confidence doc keeps messaging boundary');
  must(doc, 'Provider credential management açılmaz.', 'address geocoding confidence doc keeps credential boundary');
  must(doc, 'User/account/admin write-action açılmaz.', 'address geocoding confidence doc keeps admin boundary');
  must(doc, 'Runtime AI action açılmaz.', 'address geocoding confidence doc keeps runtime AI boundary');
  must(doc, 'Tool execution açılmaz.', 'address geocoding confidence doc keeps tool boundary');
  must(doc, 'Write-action dispatcher açılmaz.', 'address geocoding confidence doc keeps dispatcher boundary');
  must(doc, 'backend/src/ai/chat/addressGeocodingConfidencePolicy.js', 'address geocoding confidence doc links static helper');

  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_VERSION', 'helper exposes version marker');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_STAGES', 'helper exposes stages');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_QUALITY_DICTIONARY', 'helper exposes quality dictionary');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_READINESS_MODEL', 'helper exposes readiness model');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_BANDS', 'helper exposes confidence bands');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_RISK_CATEGORIES', 'helper exposes risk categories');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_HUMAN_REVIEW_STATES', 'helper exposes human review states');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_TASK_CATEGORIES', 'helper exposes task categories');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_HANOFFS', 'helper exposes handoffs');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_COMPATIBILITY', 'helper exposes compatibility list');
  must(helper, 'ADDRESS_GEOCODING_CONFIDENCE_POLICY', 'helper exposes policy object');
  must(helper, 'buildAddressGeocodingConfidenceRole', 'helper exposes role builder');
  must(helper, 'listAddressGeocodingConfidenceRoles', 'helper exposes role lister');
  must(helper, 'getAddressGeocodingConfidencePolicy', 'helper exposes policy getter');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(helper, `buildAddressGeocodingConfidenceRole('${role}'`, `helper keeps role ${role}`);
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

  must(harnessCheck, 'check:addressgeocodingconfidence01', 'script harness check knows address geocoding confidence alias');
  must(harnessCheck, 'address_geocoding_confidence_01_check.js', 'script harness check knows address geocoding confidence file');
  must(harnessCheck, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'script harness check knows address geocoding confidence milestone');
  must(harnessCheck, 'docs/ADDRESS_GEOCODING_CONFIDENCE_01.md', 'script harness check knows address geocoding confidence doc');
  must(harnessCheck, 'backend/src/ai/chat/addressGeocodingConfidencePolicy.js', 'script harness check knows address geocoding confidence helper');

  must(harnessDoc, 'root:check:addressgeocodingconfidence01', 'script harness doc lists address geocoding confidence root check');
  must(harnessDoc, 'address_geocoding_confidence_01_check.js', 'script harness doc lists address geocoding confidence check');
  must(harnessDoc, 'docs/ADDRESS_GEOCODING_CONFIDENCE_01.md', 'script harness doc lists address geocoding confidence doc');
  must(harnessDoc, 'backend/src/ai/chat/addressGeocodingConfidencePolicy.js', 'script harness doc lists address geocoding confidence helper');
  must(harnessDoc, 'ADDRESS-GEOCODING-CONFIDENCE-01', 'script harness doc lists address geocoding confidence milestone');

  mustNoDiffExcept(['backend/src/routes', 'backend/src/services', 'prisma'], ['backend/src/routes/companyOverview.js'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log('=== ADDRESS-GEOCODING-CONFIDENCE-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
