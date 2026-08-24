#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
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

function mustStageEmpty(names, label) {
  if (names.length > 0) fail(`${label}: ${names.join(', ')}`);
  ok(label);
}

const demandFixtures = [
  {
    label: 'personel servis talebi',
    phrase: 'Personel servis talebi için sabah inbound hat istiyorum',
    expectedType: 'PERSONEL_SERVICE',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'okul servis talebi',
    phrase: 'Okul öğrencileri için servis talebi ve veli iletişimi',
    expectedType: 'SCHOOL_SERVICE',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'vardiya bazlı servis talebi',
    phrase: 'Vardiya bazlı servis talebi, akşam outbound',
    expectedType: 'SHIFT_BASED_SERVICE',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'düzenli hat talebi',
    phrase: 'Düzenli hat / rota talebi, haftalık tekrar eden servis',
    expectedType: 'REGULAR_ROUTE',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'tek seferlik servis talebi',
    phrase: 'Tek seferlik servis talebi için geçici ulaşım',
    expectedType: 'ONE_TIME_SERVICE',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'ek hat talebi',
    phrase: 'Mevcut sözleşmeye ek hat ve ek vardiya talebi',
    expectedType: 'CONTRACT_ADD_ON',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'kapasite artırma talebi',
    phrase: 'Kapasite artırma talebi, araç kapasitesi yükseltme',
    expectedType: 'CAPACITY_INCREASE',
    expectedIntent: 'INTAKE_REQUEST',
  },
  {
    label: 'güzergah değişikliği talebi',
    phrase: 'Güzergah değişikliği talebi, mevcut rotayı güncelle',
    expectedType: 'ROUTE_CHANGE',
    expectedIntent: 'INTAKE_REQUEST',
  },
];

async function main() {
  console.log('=== COPILOT-DEMAND-INTAKE-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const demandToAgreementDoc = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const humanApprovalDoc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const excelImportDoc = read('docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md');
  const addressDoc = read('docs/ADDRESS_GEOCODING_CONFIDENCE_01.md');
  const stopRouteDoc = read('docs/COPILOT_STOP_ROUTE_DRAFT_01.md');
  const osrmDoc = read('docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md');
  const routeReviewDoc = read('docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md');
  const demandIntakeDoc = read('docs/COPILOT_DEMAND_INTAKE_01.md');
  const demandToAgreementHelperSource = read('backend/src/ai/chat/copilotDemandToAgreementRoadmap.js');
  const demandIntakeHelperSource = read('backend/src/ai/chat/copilotDemandIntake.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const helperModule = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/copilotDemandIntake.js')).href);

  must(pkg, '"check:copilotdemandintake01": "node backend/scripts/copilot_demand_intake_01_check.js"', 'package.json exposes demand intake check');
  assertProductExtensionsOrder(['check:copilotairoadmap01', 'check:copilotdemandintake01', 'check:copilotdemandagreement01', 'check:copilothumanapproval01'], 'product extensions registry keeps demand intake after AI action roadmap', registryScripts);
  assertProductExtensionsOrder(['check:copilotairoadmap01', 'check:copilotdemandintake01', 'check:copilotdemandagreement01', 'check:copilothumanapproval01'], 'verify chain registry keeps demand intake after AI action roadmap', registryScripts);

  must(guide, 'COPILOT-DEMAND-INTAKE-01', 'milestone guide mentions demand intake milestone');
  must(guide, 'check:copilotdemandintake01', 'milestone guide exposes demand intake check');
  must(guide, 'node backend\\scripts\\copilot_demand_intake_01_check.js', 'milestone guide includes demand intake command');
  must(guide, 'docs/COPILOT_DEMAND_INTAKE_01.md', 'milestone guide includes demand intake doc');
  ordered(guide, ['COPILOT-AI-ACTION-ROADMAP-01', 'COPILOT-DEMAND-INTAKE-01', 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01'], 'milestone guide keeps demand intake after AI action roadmap');

  must(primer, 'COPILOT-DEMAND-INTAKE-01', 'primer mentions demand intake milestone');
  must(primer, 'docs/COPILOT_DEMAND_INTAKE_01.md', 'primer links demand intake doc');

  must(roadmapLock, 'COPILOT-DEMAND-INTAKE-01', 'roadmap lock keeps demand intake milestone');
  must(roadmapLock, 'demand intake', 'roadmap lock keeps demand intake wording');

  must(aiRoadmap, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'AI roadmap keeps demand-to-agreement bridge');
  must(demandToAgreementDoc, 'COPILOT-DEMAND-INTAKE-01', 'demand-to-agreement doc references demand intake milestone');
  must(demandToAgreementDoc, 'Stage 1 - Demand Intake', 'demand-to-agreement doc keeps demand intake stage');
  must(humanApprovalDoc, 'COPILOT-DEMAND-INTAKE-01', 'human approval doc keeps demand intake future line');
  must(excelImportDoc, 'COPILOT-DEMAND-INTAKE-01', 'excel demand import doc references demand intake milestone');
  must(addressDoc, 'COPILOT-DEMAND-INTAKE-01', 'address geocoding doc references demand intake milestone');
  must(stopRouteDoc, 'COPILOT-DEMAND-INTAKE-01', 'stop route draft doc references demand intake milestone');
  must(osrmDoc, 'COPILOT-DEMAND-INTAKE-01', 'OSRM route draft doc references demand intake milestone');
  must(routeReviewDoc, 'COPILOT-DEMAND-INTAKE-01', 'route review doc references demand intake milestone');

  must(demandIntakeDoc, '# COPILOT DEMAND INTAKE 01', 'demand intake doc title present');
  must(demandIntakeDoc, 'docs/check milestone', 'demand intake doc keeps docs/check wording');
  must(demandIntakeDoc, 'Canonical check: `check:copilotdemandintake01`', 'demand intake doc keeps canonical check wording');
  must(demandIntakeDoc, 'draft-only intake', 'demand intake doc keeps draft-only wording');
  must(demandIntakeDoc, 'Personel servis talebi', 'demand intake doc keeps personel service demand type');
  must(demandIntakeDoc, 'Okul / öğrenci servis talebi', 'demand intake doc keeps school demand type');
  must(demandIntakeDoc, 'Vardiya bazlı servis talebi', 'demand intake doc keeps shift-based demand type');
  must(demandIntakeDoc, 'Düzenli hat / rota talebi', 'demand intake doc keeps regular route demand type');
  must(demandIntakeDoc, 'Tek seferlik servis talebi', 'demand intake doc keeps one-time demand type');
  must(demandIntakeDoc, 'Mevcut sözleşmeye ek hat / ek vardiya talebi', 'demand intake doc keeps contract add-on demand type');
  must(demandIntakeDoc, 'Kapasite artırma talebi', 'demand intake doc keeps capacity increase demand type');
  must(demandIntakeDoc, 'Güzergah değişikliği talebi', 'demand intake doc keeps route change demand type');
  must(demandIntakeDoc, 'organization', 'demand intake doc keeps required organization field');
  must(demandIntakeDoc, 'serviceType', 'demand intake doc keeps required serviceType field');
  must(demandIntakeDoc, 'location', 'demand intake doc keeps required location field');
  must(demandIntakeDoc, 'headcount', 'demand intake doc keeps required headcount field');
  must(demandIntakeDoc, 'direction', 'demand intake doc keeps required direction field');
  must(demandIntakeDoc, 'dateOrFrequency', 'demand intake doc keeps required dateOrFrequency field');
  must(demandIntakeDoc, 'consentSignal', 'demand intake doc keeps required consentSignal field');
  must(demandIntakeDoc, 'KVKK / izin sinyali', 'demand intake doc keeps KVKK wording');
  must(demandIntakeDoc, 'draft-only', 'demand intake doc keeps draft-only boundary');
  must(demandIntakeDoc, 'No route / service / prisma diff', 'demand intake doc keeps route/service/prisma boundary');
  must(demandIntakeDoc, 'No production DB', 'demand intake doc keeps production DB boundary');
  must(demandIntakeDoc, 'No destructive query', 'demand intake doc keeps destructive query boundary');
  must(demandIntakeDoc, 'Smoke threshold', 'demand intake doc keeps smoke threshold wording');
  must(demandIntakeDoc, 'consoleErrorCount=0', 'demand intake doc keeps consoleErrorCount boundary');
  must(demandIntakeDoc, 'pageErrorCount=0', 'demand intake doc keeps pageErrorCount boundary');
  must(demandIntakeDoc, '429=none', 'demand intake doc keeps 429 boundary');
  must(demandIntakeDoc, 'PASS COPILOT-DEMAND-INTAKE-01', 'demand intake doc keeps pass marker');

  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_VERSION', 'helper exposes version marker');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_PUBLIC_PROMISE', 'helper exposes public promise');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_BLOCKED_EXECUTION_PHRASES', 'helper exposes blocked execution phrases');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_REQUIRED_FIELDS', 'helper exposes required fields');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_OPTIONAL_FIELDS', 'helper exposes optional fields');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_FIELD_HINTS', 'helper exposes field hints');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_SAFETY_NOTES', 'helper exposes safety notes');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_SUPPORTED_DEMAND_TYPES', 'helper exposes supported demand types');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_ROLE_GUIDANCE', 'helper exposes role guidance');
  must(demandIntakeHelperSource, 'normalizeDemandIntakeField', 'helper exposes field normalizer');
  must(demandIntakeHelperSource, 'maskDemandIntakeSensitiveValue', 'helper exposes sensitive value masker');
  must(demandIntakeHelperSource, 'detectDemandIntakeIntent', 'helper exposes intent detector');
  must(demandIntakeHelperSource, 'buildDemandIntakeDraft', 'helper exposes draft builder');
  must(demandIntakeHelperSource, 'getDemandIntakeMissingFields', 'helper exposes missing field helper');
  must(demandIntakeHelperSource, 'buildDemandIntakeClarifyingQuestions', 'helper exposes clarifying question helper');
  must(demandIntakeHelperSource, 'composeDemandIntakeAnswer', 'helper exposes answer composer');
  must(demandIntakeHelperSource, 'listCopilotDemandIntakeTypes', 'helper exposes type lister');
  must(demandIntakeHelperSource, 'getCopilotDemandIntakePolicy', 'helper exposes policy getter');
  must(demandIntakeHelperSource, 'COPILOT_DEMAND_INTAKE_POLICY', 'helper exposes policy object');
  mustNot(demandIntakeHelperSource, 'execFileSync', 'helper has no child-process runtime');
  mustNot(demandIntakeHelperSource, 'fetch(', 'helper has no network runtime');
  mustNot(demandIntakeHelperSource, 'spawn(', 'helper has no spawned runtime');
  mustNot(demandIntakeHelperSource, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(demandIntakeHelperSource, '@prisma/client', 'helper has no prisma client import');
  mustNot(demandIntakeHelperSource, 'PrismaClient', 'helper has no PrismaClient runtime');
  mustNot(demandIntakeHelperSource, 'express', 'helper has no express runtime');
  mustNot(demandIntakeHelperSource, 'express.Router', 'helper has no router runtime');
  mustNot(demandIntakeHelperSource, 'axios', 'helper has no axios runtime');
  mustNot(demandIntakeHelperSource, 'http.request', 'helper has no http runtime');

  must(demandToAgreementHelperSource, 'companionMilestone', 'demand-to-agreement helper keeps companion milestone field');
  must(demandToAgreementHelperSource, 'COPILOT-DEMAND-INTAKE-01', 'demand-to-agreement helper references demand intake milestone');

  must(harnessCheck, 'check:copilotdemandintake01', 'script harness check knows demand intake alias');
  must(harnessCheck, 'copilot_demand_intake_01_check.js', 'script harness check knows demand intake file');
  must(harnessCheck, 'COPILOT-DEMAND-INTAKE-01', 'script harness check knows demand intake milestone');
  must(harnessCheck, 'docs/COPILOT_DEMAND_INTAKE_01.md', 'script harness check knows demand intake doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotDemandIntake.js', 'script harness check knows demand intake helper');

  must(harnessDoc, 'root:check:copilotdemandintake01', 'script harness doc lists demand intake root check');
  must(harnessDoc, 'copilot_demand_intake_01_check.js', 'script harness doc lists demand intake check');
  must(harnessDoc, 'docs/COPILOT_DEMAND_INTAKE_01.md', 'script harness doc lists demand intake doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotDemandIntake.js', 'script harness doc lists demand intake helper');
  must(harnessDoc, 'COPILOT-DEMAND-INTAKE-01', 'script harness doc lists demand intake milestone');

  const helperModuleType = helperModule?.COPILOT_DEMAND_INTAKE_VERSION || '';
  must(helperModuleType, 'COPILOT-DEMAND-INTAKE-01', 'runtime import exposes demand intake version');
  must(helperModule.COPILOT_DEMAND_INTAKE_PUBLIC_PROMISE.join(' '), 'draft-only intake', 'runtime import exposes public promise');
  must(helperModule.COPILOT_DEMAND_INTAKE_GUARD_REQUIREMENTS.join(' '), 'draft-only intake', 'runtime import exposes guard requirements');
  must(helperModule.COPILOT_DEMAND_INTAKE_BLOCKED_EXECUTION_PHRASES.join(' '), 'route apply', 'runtime import exposes blocked execution phrases');

  for (const fixture of demandFixtures) {
    const detected = helperModule.detectDemandIntakeIntent(fixture.phrase);
    must(detected.demandType, fixture.expectedType, `${fixture.label} type detection`);
    must(detected.intentType, fixture.expectedIntent, `${fixture.label} intent detection`);
    must(detected.executionState, 'draft_only', `${fixture.label} draft-only state`);
    must(String(detected.approvalRequired), 'true', `${fixture.label} approval required`);
  }

  const maskingPhone = helperModule.normalizeDemandIntakeField('contactPhone', '+90 555 123 45 67');
  const maskingEmail = helperModule.normalizeDemandIntakeField('contactEmail', 'test@example.com');
  const maskingName = helperModule.normalizeDemandIntakeField('contactName', 'Halil Demir');
  const maskingToken = helperModule.maskDemandIntakeSensitiveValue('Bearer very-secret-token');
  must(maskingPhone, '[REDACTED]', 'phone value is redacted');
  must(maskingEmail, '[REDACTED]', 'email value is redacted');
  must(maskingName, '[REDACTED]', 'name value is redacted');
  must(maskingToken, '[REDACTED]', 'token value is redacted');

  const draft = helperModule.buildDemandIntakeDraft({
    text: 'Personel servis talebi için sabah inbound hat istiyorum',
    demandType: 'PERSONEL_SERVICE',
    organization: 'Mavi Lojistik',
    location: 'Ataşehir İçerenköy Merkez',
    headcount: 24,
    direction: 'sabah inbound',
    dateOrFrequency: 'haftalık',
    consentSignal: 'kvkk consent present',
    contactName: 'Halil Demir',
    contactPhone: '+90 555 123 45 67',
    contactEmail: 'test@example.com',
    notes: 'Özel not yok',
  });
  must(draft.executionState, 'draft_only', 'draft builder keeps draft-only state');
  must(String(draft.approvalRequired), 'true', 'draft builder requires approval');
  must(draft.collectedFields.contactPhone, '[REDACTED]', 'draft builder redacts contact phone');
  must(draft.collectedFields.contactEmail, '[REDACTED]', 'draft builder redacts contact email');
  must(draft.collectedFields.contactName, '[REDACTED]', 'draft builder redacts contact name');
  must(draft.collectedFields.direction, 'inbound', 'draft builder normalizes direction');
  must(draft.collectedFields.consentSignal, 'kvkk-consent-present', 'draft builder normalizes consent signal');
  must(String(Array.isArray(draft.requiredFields)), 'true', 'draft builder exposes required fields array');
  must(String(Array.isArray(draft.optionalFields)), 'true', 'draft builder exposes optional fields array');
  must(String(Array.isArray(draft.missingFields)), 'true', 'draft builder exposes missing fields array');
  must(String(Array.isArray(draft.clarifyingQuestions)), 'true', 'draft builder exposes clarifying questions array');
  must(draft.draftSummary, 'draft-only intake', 'draft builder keeps draft summary wording');
  must(draft.classificationSummary, 'PERSONEL_SERVICE', 'draft builder keeps classification summary');
  must(draft.privacySummary, 'PII masked', 'draft builder keeps privacy summary');
  must(draft.handoffSummary, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'draft builder keeps handoff summary');
  must(draft.nextSafeStep, 'taslak', 'draft builder keeps next safe step wording');

  const missingDraft = helperModule.buildDemandIntakeDraft({
    text: 'Personel servis talebi için taslak',
    demandType: 'PERSONEL_SERVICE',
    organization: 'SeferPakt',
    location: 'Ataşehir İçerenköy',
    headcount: 18,
    direction: 'sabah inbound',
    consentSignal: 'kvkk consent present',
  });
  must(missingDraft.missingFields.join(' '), 'dateOrFrequency', 'missing draft includes dateOrFrequency');
  must(missingDraft.clarifyingQuestions.join(' '), 'tarih', 'missing draft includes clarifying questions');
  must(missingDraft.nextSafeStep, 'netleştir', 'missing draft keeps next safe step wording');

  const composed = helperModule.composeDemandIntakeAnswer({
    text: 'Kapasite artırma talebi',
    demandType: 'CAPACITY_INCREASE',
    organization: 'Mavi Lojistik',
    currentCapacity: 12,
    capacityTarget: 18,
    effectiveDate: '2026-08-01',
    consentSignal: 'kvkk consent present',
    contactPhone: '+90 555 444 33 22',
  });
  must(composed.executionState, 'draft_only', 'composed answer keeps draft-only state');
  must(String(composed.approvalRequired), 'true', 'composed answer requires approval');
  must(composed.collectedFields.contactPhone, '[REDACTED]', 'composed answer redacts phone');
  must(composed.blockedActions.join(' '), 'route apply', 'composed answer keeps blocked action list');
  must(composed.neverAutomate.join(' '), 'otomatik', 'composed answer keeps never-automate list');

  mustNoDiffExceptWithIdentity(
    ['backend/src/routes', 'backend/src/services', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    'route/service/schema and Prisma diff stays empty'
  );
  mustStageEmpty(cachedNames, 'stage remains empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');
  must(String(!fs.existsSync(path.join(root, 'debug.log'))), 'true', 'debug.log absent');

  console.log('=== COPILOT-DEMAND-INTAKE-01 CHECK PASS ===');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
