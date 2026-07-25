#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as supplierOfferCollect from '../src/ai/chat/supplierOfferCollect.js';

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

function mustEveryItemInText(text, items, label) {
  mustCondition(Array.isArray(items), `${label} export is array`);
  for (const item of items) {
    must(text, item, `${label} includes ${item}`);
  }
}

const requiredStages = [
  'Offer Collection Input Summary',
  'Offer Request Field Model',
  'Offer Collection Status Draft',
  'Offer Intake Table Draft',
  'Safety / Boundary',
  'Türkçe Visible Answer',
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

const rfqMatchingFixture = Object.freeze({
  sourceRfqSummary: Object.freeze({
    rfqType: 'personel servis',
    serviceScope: 'Gebze-Tuzla 40 personel',
    region: 'Kocaeli / Gebze / Tuzla',
    province: 'Kocaeli',
    district: 'Gebze',
    startDate: '2026-08-01',
    shift: '06:00-18:00',
    passengerCount: 40,
    vehicleCapacityRequirement: 40,
    sla: 'Zamanında ve güvenli hizmet',
    documentRequirements: ['SRC3', 'Psikoteknik'],
    safetyRequirements: ['Kasko', 'Araç takip'],
  }),
  candidateMatrix: Object.freeze([
    Object.freeze({
      candidateId: 'supplier-opa-01',
      supplierLabel: 'Alpha Servis A.Ş.',
      supplierLabelMasked: 'Al***Ş',
      score: 92,
      fitLevel: 'high',
      matchReasons: ['Bölge uyumu', 'Kapasite uyumu'],
      missingSupplierFields: [],
      riskNotes: [],
    }),
    Object.freeze({
      candidateId: 'supplier-opa-02',
      supplierLabel: 'Beta Taşımacılık Ltd.',
      supplierLabelMasked: 'Be***d',
      score: 61,
      fitLevel: 'medium',
      matchReasons: ['Kısmi bölge uyumu'],
      missingSupplierFields: ['licenses'],
      riskNotes: ['KVKK-safe history only'],
    }),
  ]),
  shortlistDraft: Object.freeze({
    bestCandidates: Object.freeze([
      Object.freeze({
        candidateId: 'supplier-opa-01',
        supplierLabel: 'Alpha Servis A.Ş.',
        supplierLabelMasked: 'Al***Ş',
        score: 92,
        fitLevel: 'high',
        matchReasons: ['Bölge uyumu', 'Kapasite uyumu'],
        missingSupplierFields: [],
        riskNotes: [],
      }),
      Object.freeze({
        candidateId: 'supplier-opa-02',
        supplierLabel: 'Beta Taşımacılık Ltd.',
        supplierLabelMasked: 'Be***d',
        score: 61,
        fitLevel: 'medium',
        matchReasons: ['Kısmi bölge uyumu'],
        missingSupplierFields: ['licenses'],
        riskNotes: ['KVKK-safe history only'],
      }),
    ]),
  }),
  matchingIntentSummary: 'intentType=matching_shortlist_request; matchingType=personel_servis; draftOnly=true; notSelected=true; notContacted=true; notSent=true; approvalRequired=true',
});

const completeOfferFixture = Object.freeze({
  supplierRef: 'supplier-opa-01',
  supplierLabel: 'Alpha Servis A.Ş.',
  offerPrice: 145000,
  priceScope: 'Aylık tüm servis',
  includedItems: ['şoför', 'yakıt', 'sigorta'],
  excludedItems: ['KDV'],
  vehicleCapacity: 40,
  vehicleType: 'midibus',
  startAvailability: ['2026-08-01'],
  shiftFit: '06:00-18:00',
  documentLicenseFit: ['SRC3', 'Psikoteknik'],
  insuranceSafety: ['Kasko', 'Araç takip'],
  slaCommitment: 'Zamanında ve güvenli hizmet',
  validityPeriod: '15 gün',
  extraNotes: 'fixture-only',
});

const partialOfferFixture = Object.freeze({
  supplierRef: 'supplier-opa-02',
  supplierLabel: 'Beta Taşımacılık Ltd.',
  offerPrice: '',
  priceScope: '',
  includedItems: ['temel hizmet'],
  excludedItems: [],
  vehicleCapacity: 18,
  vehicleType: 'minibus',
  startAvailability: [],
  shiftFit: '',
  documentLicenseFit: [],
  insuranceSafety: [],
  slaCommitment: '',
  validityPeriod: '',
  missingOrUnclearFields: ['Teklif fiyatı', 'Başlangıç uygunluğu'],
});

const pendingOfferFixture = Object.freeze({
  supplierRef: 'supplier-opa-03',
  supplierLabel: 'Gamma Taşımacılık A.Ş.',
});

async function main() {
  console.log('=== SUPPLIER-OFFER-COLLECT-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const doc = read('docs/SUPPLIER_OFFER_COLLECT_01.md');
  const helper = read('backend/src/ai/chat/supplierOfferCollect.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:supplieroffercollect01": "node backend/scripts/supplier_offer_collect_01_check.js"', 'package.json exposes supplier offer collect check');
  ordered(runner, ['check:suppliermatching01', 'check:supplieroffercollect01', 'check:uxmarketplacepanels01'], 'product extensions runner places supplier offer collect after supplier matching');
  ordered(verify, ['check:suppliermatching01', 'check:supplieroffercollect01', 'check:uxmarketplacepanels01'], 'verify chain places supplier offer collect after supplier matching');

  must(guide, 'SUPPLIER-OFFER-COLLECT-01', 'milestone guide mentions supplier offer collect milestone');
  must(guide, 'check:supplieroffercollect01', 'milestone guide exposes supplier offer collect check');
  must(guide, 'node backend\\scripts\\supplier_offer_collect_01_check.js', 'milestone guide includes supplier offer collect command');
  must(guide, 'docs/SUPPLIER_OFFER_COLLECT_01.md', 'milestone guide includes supplier offer collect doc');
  ordered(guide, ['SUPPLIER-MATCHING-01', 'SUPPLIER-OFFER-COLLECT-01', 'UX-MARKETPLACE-PANELS-01'], 'milestone guide keeps supplier offer collect after supplier matching');

  must(primer, 'SUPPLIER-OFFER-COLLECT-01', 'primer mentions supplier offer collect milestone');
  must(primer, 'docs/SUPPLIER_OFFER_COLLECT_01.md', 'primer links supplier offer collect doc');
  ordered(primer, ['SUPPLIER-MATCHING-01', 'SUPPLIER-OFFER-COLLECT-01', 'UX-MARKETPLACE-PANELS-01'], 'primer keeps supplier offer collect after supplier matching');

  must(roadmapLock, 'SUPPLIER-OFFER-COLLECT-01', 'roadmap lock keeps supplier offer collect milestone');
  must(roadmapLock, 'offer collection', 'roadmap lock keeps offer collection wording');
  must(roadmapLock, 'docs/SUPPLIER_OFFER_COLLECT_01.md', 'roadmap lock links supplier offer collect doc');

  must(harnessCheck, 'check:supplieroffercollect01', 'script harness check knows supplier offer collect alias');
  must(harnessCheck, 'supplier_offer_collect_01_check.js', 'script harness check knows supplier offer collect file');
  must(harnessCheck, 'SUPPLIER-OFFER-COLLECT-01', 'script harness check knows supplier offer collect milestone');
  must(harnessCheck, 'docs/SUPPLIER_OFFER_COLLECT_01.md', 'script harness check knows supplier offer collect doc');
  must(harnessCheck, 'backend/src/ai/chat/supplierOfferCollect.js', 'script harness check knows supplier offer collect helper');
  must(harnessDoc, 'root:check:supplieroffercollect01', 'script harness doc lists supplier offer collect root check');
  must(harnessDoc, 'supplier_offer_collect_01_check.js', 'script harness doc lists supplier offer collect check');
  must(harnessDoc, 'docs/SUPPLIER_OFFER_COLLECT_01.md', 'script harness doc lists supplier offer collect doc');
  must(harnessDoc, 'SUPPLIER-OFFER-COLLECT-01', 'script harness doc lists supplier offer collect milestone');
  must(harnessDoc, 'backend/src/ai/chat/supplierOfferCollect.js', 'script harness doc lists supplier offer collect helper');

  must(doc, '# SUPPLIER-OFFER-COLLECT-01', 'supplier offer collect doc title present');
  must(doc, 'docs/check milestone', 'supplier offer collect doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:supplieroffercollect01`', 'supplier offer collect doc keeps canonical check wording');
  ordered(doc, [
    '## 1) Amaç',
    '## 2) Kanonik akış',
    '## 3) Offer collection input summary',
    '## 4) Offer request field model',
    '## 5) Offer collection status draft',
    '## 6) Offer intake table draft',
    '## 7) Safety / boundary',
    '## 8) Türkçe visible answer',
    '## 9) Static helper',
    '## 10) What is not changed',
    '## 11) Validation results',
    '## 12) Remaining risks',
    '## 13) Next recommended milestone',
  ], 'supplier offer collect doc keeps section order');
  must(doc, 'supplier matching çıktısını offer collection inputuna dönüştürür', 'supplier offer collect doc keeps purpose wording');
  must(doc, 'collectionState=pending / missing_fields / received_draft / ready_for_analysis / blocked', 'supplier offer collect doc keeps collection state wording');
  must(doc, 'draftOnly=true', 'supplier offer collect doc keeps draftOnly boundary');
  must(doc, 'notRequested=true', 'supplier offer collect doc keeps notRequested boundary');
  must(doc, 'notContacted=true', 'supplier offer collect doc keeps notContacted boundary');
  must(doc, 'notSent=true', 'supplier offer collect doc keeps notSent boundary');
  must(doc, 'notAccepted=true', 'supplier offer collect doc keeps notAccepted boundary');
  must(doc, 'notRejected=true', 'supplier offer collect doc keeps notRejected boundary');
  must(doc, 'approvalRequired=true', 'supplier offer collect doc keeps approvalRequired boundary');
  must(doc, 'executionState=offer_collect_draft_only / not_requested / not_contacted / not_executed', 'supplier offer collect doc keeps execution state wording');
  must(doc, 'nextSafeStep=teklif toplama planını kontrol edip insan onayına sunmak', 'supplier offer collect doc keeps next safe step wording');
  must(doc, 'Teklif toplama planını hazırladım; henüz hiçbir tedarikçiden teklif istenmedi.', 'supplier offer collect doc keeps visible answer opening');
  must(doc, 'Tedarikçilerle iletişim kurulmadı ve mesaj gönderilmedi.', 'supplier offer collect doc keeps visible answer contact line');
  must(doc, 'Teklif istemek veya kabul/ret yapmak için insan onayı gerekir.', 'supplier offer collect doc keeps visible answer approval line');
  must(doc, 'Eksik teklif alanları: fiyat kapsamı, başlangıç uygunluğu, araç kapasitesi', 'supplier offer collect doc keeps visible answer missing line');
  must(doc, 'Sıradaki güvenli adım: teklif toplama planını kontrol edip onaya sunmak.', 'supplier offer collect doc keeps visible answer next line');
  must(doc, 'backend/src/ai/chat/supplierOfferCollect.js', 'supplier offer collect doc links static helper');
  must(doc, 'No production DB.', 'supplier offer collect doc keeps production DB boundary');
  must(doc, 'No destructive query.', 'supplier offer collect doc keeps destructive query boundary');
  must(doc, 'No route/service/prisma diff.', 'supplier offer collect doc keeps route/service/prisma boundary');
  must(doc, 'PASS SUPPLIER-OFFER-COLLECT-01', 'supplier offer collect doc keeps pass marker');
  for (const summaryKey of ['offerCollectionInputSummary', 'offerRequestFieldModelSummary', 'collectionStateSummary', 'intakeTableSummary', 'safetyBoundarySummary', 'turkishVisibleSummary', 'chainWiringSummary', 'smokeThresholdSummary', 'commitExternalSummary', 'prismaSummary']) {
    must(doc, summaryKey, `supplier offer collect doc keeps ${summaryKey}`);
  }

  must(helper, 'SUPPLIER_OFFER_COLLECT_VERSION', 'helper exposes version marker');
  must(helper, 'SUPPLIER_OFFER_COLLECT_STAGES', 'helper exposes stages');
  must(helper, 'SUPPLIER_OFFER_COLLECT_CATEGORIES', 'helper exposes categories');
  must(helper, 'SUPPLIER_OFFER_COLLECT_CHECKLIST', 'helper exposes checklist');
  must(helper, 'SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL', 'helper exposes request field model');
  must(helper, 'SUPPLIER_OFFER_COLLECT_COLLECTION_STATES', 'helper exposes collection states');
  must(helper, 'SUPPLIER_OFFER_COLLECT_COLLECTION_STATE_LABELS', 'helper exposes collection state labels');
  must(helper, 'SUPPLIER_OFFER_COLLECT_BOUNDARY_FLAGS', 'helper exposes boundary flags');
  must(helper, 'SUPPLIER_OFFER_COLLECT_GUARD_REQUIREMENTS', 'helper exposes guard requirements');
  must(helper, 'SUPPLIER_OFFER_COLLECT_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'SUPPLIER_OFFER_COLLECT_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'SUPPLIER_OFFER_COLLECT_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'SUPPLIER_OFFER_COLLECT_HANOFFS', 'helper exposes handoffs');
  must(helper, 'SUPPLIER_OFFER_COLLECT_INTENT_TYPES', 'helper exposes intent types');
  must(helper, 'SUPPLIER_OFFER_COLLECT_QUESTION_BANK', 'helper exposes question bank');
  must(helper, 'SUPPLIER_OFFER_COLLECT_EXECUTION_STATE', 'helper exposes execution state');
  must(helper, 'SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP', 'helper exposes next safe step');
  must(helper, 'SUPPLIER_OFFER_COLLECT_POLICY', 'helper exposes policy object');
  must(helper, 'listSupplierOfferCollectRoles', 'helper exposes role lister');
  must(helper, 'getSupplierOfferCollectPolicy', 'helper exposes policy getter');
  must(helper, 'detectSupplierOfferCollectIntent', 'helper exposes intent detector');
  must(helper, 'buildSupplierOfferCollectInput', 'helper exposes collect input builder');
  must(helper, 'buildSupplierOfferRequestFieldModel', 'helper exposes request field model builder');
  must(helper, 'scoreSupplierOfferReadiness', 'helper exposes readiness scorer');
  must(helper, 'buildSupplierOfferCollectionStatusDraft', 'helper exposes collection status builder');
  must(helper, 'buildSupplierOfferIntakeTableDraft', 'helper exposes intake table builder');
  must(helper, 'getSupplierOfferMissingFields', 'helper exposes missing fields helper');
  must(helper, 'buildSupplierOfferQuestionSet', 'helper exposes question set builder');
  must(helper, 'composeSupplierOfferCollectAnswer', 'helper exposes answer composer');
  must(helper, 'maskSupplierOfferSensitiveValue', 'helper exposes masker');
  must(helper, 'normalizeSupplierOfferCollectField', 'helper exposes normalizer');
  ordered(helper, requiredStages, 'helper keeps stage ordering');
  mustCondition(helper.split(/\r?\n/).length < 1000, 'helper stays under 1000 lines');
  for (const role of requiredRoles) {
    must(helper, `buildSupplierOfferCollectRole('${role}'`, `helper keeps role ${role}`);
  }
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router', 'helper has no router runtime');
  mustNot(helper, '@prisma/client', 'helper has no prisma runtime');
  mustNot(helper, 'PrismaClient', 'helper has no prisma runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');
  mustNot(helper, 'http.request', 'helper has no http runtime');

  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_STAGES), 'helper module exposes stages array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_CATEGORIES), 'helper module exposes categories array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_CHECKLIST), 'helper module exposes checklist array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL), 'helper module exposes request field model array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_COLLECTION_STATES), 'helper module exposes collection states array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_BOUNDARY_FLAGS), 'helper module exposes boundary flags array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_PUBLIC_PROMISE), 'helper module exposes public promise array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_BLOCKED_ACTIONS), 'helper module exposes blocked actions array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_NEVER_AUTOMATE), 'helper module exposes never automate array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_HANOFFS), 'helper module exposes handoffs array');
  mustCondition(Array.isArray(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_INTENT_TYPES), 'helper module exposes intent types array');

  for (const stage of supplierOfferCollect.SUPPLIER_OFFER_COLLECT_STAGES) {
    mustCondition(Boolean(stage && typeof stage === 'object'), `helper stage object exists for ${stage?.title ?? 'unknown'}`);
    mustCondition(typeof stage.id === 'string' && stage.id.length > 0, `helper stage ${stage.title} has id`);
    mustCondition(typeof stage.title === 'string' && stage.title.length > 0, `helper stage ${stage.id} has title`);
    mustCondition(stage.status === 'current baseline', `helper stage ${stage.id} keeps current baseline status`);
    mustCondition(stage.futureOnly === false, `helper stage ${stage.id} stays current baseline`);
    must(helper, stage.title, `helper text includes stage title ${stage.title}`);
  }

  for (const category of supplierOfferCollect.SUPPLIER_OFFER_COLLECT_CATEGORIES) {
    mustCondition(Boolean(category && typeof category === 'object'), `helper category object exists for ${category?.title ?? 'unknown'}`);
    mustCondition(typeof category.id === 'string' && category.id.length > 0, `helper category ${category.title} has id`);
    mustCondition(typeof category.title === 'string' && category.title.length > 0, `helper category ${category.id} has title`);
    mustCondition(typeof category.meaning === 'string' && category.meaning.length > 0, `helper category ${category.id} has meaning`);
    must(helper, category.title, `helper text includes category title ${category.title}`);
  }

  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_CHECKLIST, 'helper checklist');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_BOUNDARY_FLAGS, 'helper boundary flags');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_GUARD_REQUIREMENTS, 'helper guard requirements');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_PUBLIC_PROMISE, 'helper public promise');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_BLOCKED_ACTIONS, 'helper blocked actions');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_NEVER_AUTOMATE, 'helper never automate');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_HANOFFS, 'helper handoffs');
  mustEveryItemInText(helper, supplierOfferCollect.SUPPLIER_OFFER_COLLECT_COLLECTION_STATES, 'helper collection states');

  for (const field of supplierOfferCollect.SUPPLIER_OFFER_COLLECT_REQUEST_FIELD_MODEL) {
    mustCondition(Boolean(field && typeof field === 'object'), `helper request field object exists for ${field?.title ?? 'unknown'}`);
    mustCondition(typeof field.id === 'string' && field.id.length > 0, `helper request field ${field.title} has id`);
    mustCondition(typeof field.title === 'string' && field.title.length > 0, `helper request field ${field.id} has title`);
    mustCondition(typeof field.meaning === 'string' && field.meaning.length > 0, `helper request field ${field.id} has meaning`);
    must(helper, field.title, `helper text includes request field title ${field.title}`);
  }

  mustCondition(supplierOfferCollect.listSupplierOfferCollectRoles().length === Object.keys(supplierOfferCollect.SUPPLIER_OFFER_COLLECT_POLICY).length, 'helper role list count matches policy keys');
  for (const role of supplierOfferCollect.listSupplierOfferCollectRoles()) {
    const policy = supplierOfferCollect.getSupplierOfferCollectPolicy(role);
    mustCondition(Boolean(policy), `helper policy exists for role ${role}`);
    mustCondition(policy.role === role, `helper policy role matches ${role}`);
    mustCondition(typeof policy.visible === 'boolean', `helper policy visible flag exists for role ${role}`);
    mustCondition(Array.isArray(policy.READ), `helper policy ${role} has READ`);
    mustCondition(Array.isArray(policy.EXPLAIN), `helper policy ${role} has EXPLAIN`);
    mustCondition(Array.isArray(policy.RECOMMEND), `helper policy ${role} has RECOMMEND`);
    mustCondition(Array.isArray(policy.PREPARE), `helper policy ${role} has PREPARE`);
    mustCondition(Array.isArray(policy.DRAFT), `helper policy ${role} has DRAFT`);
    mustCondition(Array.isArray(policy.RISK_SUMMARY), `helper policy ${role} has RISK_SUMMARY`);
    mustCondition(Array.isArray(policy.NEXT_STEP), `helper policy ${role} has NEXT_STEP`);
    mustCondition(Array.isArray(policy.HUMAN_APPROVAL_REQUIRED), `helper policy ${role} has HUMAN_APPROVAL_REQUIRED`);
    mustCondition(Array.isArray(policy.BLOCKED_RUNTIME_ACTION), `helper policy ${role} has BLOCKED_RUNTIME_ACTION`);
    mustCondition(Array.isArray(policy.NEVER_AUTOMATE), `helper policy ${role} has NEVER_AUTOMATE`);
  }
  mustCondition(supplierOfferCollect.getSupplierOfferCollectPolicy('UNKNOWN') === null, 'helper policy getter returns null for unknown role');

  mustCondition(typeof supplierOfferCollect.detectSupplierOfferCollectIntent === 'function', 'helper intent detector is a function');
  mustCondition(typeof supplierOfferCollect.buildSupplierOfferCollectInput === 'function', 'helper collect input builder is a function');
  mustCondition(typeof supplierOfferCollect.buildSupplierOfferRequestFieldModel === 'function', 'helper request field model builder is a function');
  mustCondition(typeof supplierOfferCollect.scoreSupplierOfferReadiness === 'function', 'helper readiness scorer is a function');
  mustCondition(typeof supplierOfferCollect.buildSupplierOfferCollectionStatusDraft === 'function', 'helper status draft builder is a function');
  mustCondition(typeof supplierOfferCollect.buildSupplierOfferIntakeTableDraft === 'function', 'helper intake table builder is a function');
  mustCondition(typeof supplierOfferCollect.getSupplierOfferMissingFields === 'function', 'helper missing fields helper is a function');
  mustCondition(typeof supplierOfferCollect.buildSupplierOfferQuestionSet === 'function', 'helper question set builder is a function');
  mustCondition(typeof supplierOfferCollect.composeSupplierOfferCollectAnswer === 'function', 'helper answer composer is a function');
  mustCondition(typeof supplierOfferCollect.maskSupplierOfferSensitiveValue === 'function', 'helper masking helper is a function');
  mustCondition(typeof supplierOfferCollect.normalizeSupplierOfferCollectField === 'function', 'helper normalization helper is a function');

  const blockedIntent = supplierOfferCollect.detectSupplierOfferCollectIntent('Teklifleri topla ve mesaj gönder');
  const missingIntent = supplierOfferCollect.detectSupplierOfferCollectIntent('Eksik teklif alanlarını çıkar');
  const draftIntent = supplierOfferCollect.detectSupplierOfferCollectIntent('Teklif toplama planını hazırla');
  mustCondition(blockedIntent.intentType === 'execution_blocked_request', 'helper intent detector blocks collection/send request');
  mustCondition(missingIntent.intentType === 'offer_missing_fields_request', 'helper intent detector recognizes missing fields request');
  mustCondition(draftIntent.intentType === 'offer_collection_request', 'helper intent detector recognizes collection request');

  const blockedStatus = supplierOfferCollect.buildSupplierOfferCollectionStatusDraft(completeOfferFixture, { message: 'Teklifleri topla ve mesaj gönder' }, 0);
  const readyStatus = supplierOfferCollect.buildSupplierOfferCollectionStatusDraft(completeOfferFixture, {}, 0);
  const partialStatus = supplierOfferCollect.buildSupplierOfferCollectionStatusDraft(partialOfferFixture, {}, 1);
  const pendingStatus = supplierOfferCollect.buildSupplierOfferCollectionStatusDraft(pendingOfferFixture, {}, 2);

  mustCondition(blockedStatus.collectionState === 'blocked', 'helper blocks explicit execution request');
  mustCondition(readyStatus.collectionState === 'ready_for_analysis', 'helper marks complete fixture as ready for analysis');
  mustCondition(partialStatus.collectionState === 'missing_fields', 'helper marks partial fixture as missing fields');
  mustCondition(pendingStatus.collectionState === 'pending', 'helper marks empty fixture as pending');
  mustCondition(readyStatus.readinessScore > partialStatus.readinessScore, 'helper readiness score ranks complete fixture above partial fixture');
  mustCondition(partialStatus.readinessScore > pendingStatus.readinessScore, 'helper readiness score ranks partial fixture above pending fixture');
  mustCondition(readyStatus.missingOfferFields.length === 0, 'helper complete fixture has no missing offer fields');
  mustCondition(partialStatus.missingOfferFields.length > 0, 'helper partial fixture has missing offer fields');
  mustCondition(Array.isArray(readyStatus.nextQuestionsForSupplier), 'helper status includes next questions array');
  mustCondition(readyStatus.humanReviewRequired === true, 'helper status keeps human review requirement');
  mustCondition(readyStatus.notRequested === true, 'helper status keeps notRequested boundary');
  mustCondition(readyStatus.notContacted === true, 'helper status keeps notContacted boundary');
  mustCondition(readyStatus.notSent === true, 'helper status keeps notSent boundary');
  mustCondition(readyStatus.notAccepted === true, 'helper status keeps notAccepted boundary');
  mustCondition(readyStatus.notRejected === true, 'helper status keeps notRejected boundary');
  mustCondition(readyStatus.approvalRequired === true, 'helper status keeps approvalRequired boundary');
  mustCondition(readyStatus.executionState === supplierOfferCollect.SUPPLIER_OFFER_COLLECT_EXECUTION_STATE, 'helper status keeps execution state');
  mustCondition(readyStatus.nextSafeStep === supplierOfferCollect.SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP, 'helper status keeps next safe step');
  mustCondition(readyStatus.supplierLabelMasked.length > 0, 'helper status keeps masked supplier label');

  const collectInput = supplierOfferCollect.buildSupplierOfferCollectInput(rfqMatchingFixture, {
    offerFixtures: [completeOfferFixture, partialOfferFixture, pendingOfferFixture],
    message: 'Teklif toplama planını hazırla',
  });
  mustCondition(collectInput.candidateSuppliers.length === 2, 'helper collect input keeps candidate supplier list');
  mustCondition(collectInput.statusMatrix.length === 3, 'helper collect input keeps status matrix');
  mustCondition(collectInput.intakeTableDraft.rows.length === 3, 'helper collect input keeps intake table rows');
  mustCondition(collectInput.intakeTableDraft.rows[0].collectionState === 'ready_for_analysis', 'helper intake table sorts ready rows first');
  mustCondition(collectInput.intakeTableDraft.rows[1].collectionState === 'missing_fields', 'helper intake table keeps partial row second');
  mustCondition(collectInput.intakeTableDraft.rows[2].collectionState === 'pending', 'helper intake table keeps pending row last');
  must(collectInput.offerCollectionInputSummary, 'aday; RFQ türü, hizmet kapsamı, bölge, başlangıç, vardiya, kapasite, SLA ve belge gereksinimi görünür', 'helper collect input summary keeps wording');
  must(collectInput.collectionStateSummary, 'pending, missing_fields, received_draft, ready_for_analysis ve blocked', 'helper collect input keeps collection state summary wording');
  mustCondition(collectInput.offerRequestFieldModel.requestFieldModelSummary.length > 0, 'helper collect input keeps request field model summary');

  const questionSet = supplierOfferCollect.buildSupplierOfferQuestionSet(collectInput.statusMatrix);
  mustCondition(Array.isArray(questionSet), 'helper question set returns array');
  mustCondition(questionSet.length > 0, 'helper question set returns questions');
  must(questionSet.join(' '), 'Tedarikçi opaque ref nedir?', 'helper question set includes supplier ref question');
  must(questionSet.join(' '), 'Tedarikçi label nedir?', 'helper question set includes supplier label question');
  must(questionSet.join(' '), 'Teklif fiyatı nedir?', 'helper question set includes price question');
  must(questionSet.join(' '), 'Başlangıç uygunluğu nedir?', 'helper question set includes start availability question');

  const answer = supplierOfferCollect.composeSupplierOfferCollectAnswer({
    matchingDraft: rfqMatchingFixture,
    offerFixtures: [completeOfferFixture, partialOfferFixture, pendingOfferFixture],
    message: 'Teklif toplama planını hazırla',
  });
  must(answer.visibleAnswer, 'Teklif toplama planını hazırladım; henüz hiçbir tedarikçiden teklif istenmedi.', 'helper answer keeps opening line');
  must(answer.visibleAnswer, 'Tedarikçilerle iletişim kurulmadı ve mesaj gönderilmedi.', 'helper answer keeps no contact line');
  must(answer.visibleAnswer, 'Teklif istemek veya kabul/ret yapmak için insan onayı gerekir.', 'helper answer keeps approval line');
  must(answer.visibleAnswer, 'Eksik teklif alanları:', 'helper answer keeps missing fields line');
  must(answer.visibleAnswer, 'Sıradaki güvenli adım: teklif toplama planını kontrol edip insan onayına sunmak.', 'helper answer keeps next line');
  must(answer.offerCollectionSummary, 'draft-only teklif toplama planı; contact/send/accept/reject kapalı', 'helper answer keeps summary wording');
  must(answer.safetyPhraseSummary, 'draftOnly=true / notRequested=true / notContacted=true / notSent=true / notAccepted=true / notRejected=true / approvalRequired=true korunur', 'helper answer keeps safety phrase wording');
  must(answer.chainWiringSummary, 'check:suppliermatching01 -> check:supplieroffercollect01 -> check:copilothumanapproval01 -> check:uxmarketplacepanels01', 'helper answer keeps chain wiring summary');
  must(answer.smokeThresholdSummary, 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none', 'helper answer keeps smoke threshold summary');
  must(answer.commitExternalSummary, 'runtime-data, browser-smoke ve debug.log commit dışı kalır', 'helper answer keeps commit external summary');
  must(answer.prismaSummary, 'No route/service/prisma diff; no production DB; no schema/migration; read-only only', 'helper answer keeps prisma summary');

  mustCondition(collectInput.draftOnly === true, 'helper collect input keeps draftOnly boundary');
  mustCondition(collectInput.notRequested === true, 'helper collect input keeps notRequested boundary');
  mustCondition(collectInput.notContacted === true, 'helper collect input keeps notContacted boundary');
  mustCondition(collectInput.notSent === true, 'helper collect input keeps notSent boundary');
  mustCondition(collectInput.notAccepted === true, 'helper collect input keeps notAccepted boundary');
  mustCondition(collectInput.notRejected === true, 'helper collect input keeps notRejected boundary');
  mustCondition(collectInput.approvalRequired === true, 'helper collect input keeps approvalRequired boundary');
  mustCondition(collectInput.executionState === supplierOfferCollect.SUPPLIER_OFFER_COLLECT_EXECUTION_STATE, 'helper collect input keeps execution state');
  mustCondition(collectInput.nextSafeStep === supplierOfferCollect.SUPPLIER_OFFER_COLLECT_NEXT_SAFE_STEP, 'helper collect input keeps next safe step');

  for (const role of requiredRoles) {
    const policy = supplierOfferCollect.getSupplierOfferCollectPolicy(role);
    mustCondition(Boolean(policy), `helper policy exists for role ${role}`);
    mustCondition(policy.role === role, `helper policy role matches ${role}`);
    mustCondition(typeof policy.visible === 'boolean', `helper policy visible flag exists for role ${role}`);
  }

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');
  mustCondition(!fs.existsSync(path.join(root, 'debug.log')), 'debug.log absent');

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`offerCollectionInputSummary=${collectInput.offerCollectionInputSummary}`);
  console.log(`offerRequestFieldModelSummary=${collectInput.offerRequestFieldModelSummary}`);
  console.log(`collectionStateSummary=${collectInput.collectionStateSummary}`);
  console.log(`intakeTableSummary=${collectInput.intakeTableDraft.intakeTableSummary}`);
  console.log('safetyBoundarySummary=draftOnly=true / notRequested=true / notContacted=true / notSent=true / notAccepted=true / notRejected=true / approvalRequired=true');
  console.log('turkishVisibleSummary=Teklif toplama planını hazırladım; henüz hiçbir tedarikçiden teklif istenmedi. | Tedarikçilerle iletişim kurulmadı ve mesaj gönderilmedi. | Teklif istemek veya kabul/ret yapmak için insan onayı gerekir. | Eksik teklif alanları: fiyat kapsamı, başlangıç uygunluğu, araç kapasitesi. | Sıradaki güvenli adım: teklif toplama planını kontrol edip onaya sunmak.');
  console.log('chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer + roadmap');
  console.log('smokeThresholdSummary=product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none');
  console.log('commitExternalSummary=runtime-data, browser-smoke ve debug.log commit dışı kalır; stage stays empty');
  console.log('prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only');
  console.log('PASS SUPPLIER-OFFER-COLLECT-01');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
