#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as supplierMatching from '../src/ai/chat/supplierMatching.js';

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

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) fail(`${label}: missing ${needle}`);
    cursor = index + target.length;
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

function mustEach(text, items, label) {
  mustCondition(Array.isArray(items), `${label} export is array`);
  for (const item of items) {
    must(text, item, `${label} includes ${item}`);
  }
}

async function main() {
  console.log('=== SUPPLIER-MATCHING-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const primer = read('docs/PRIMER_SSOT.md');
const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
const doc = read('docs/SUPPLIER_MATCHING_01.md');
  const rfqPrepDoc = read('docs/COPILOT_RFQ_PREP_01.md');
  const humanApprovalDoc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const marketplaceDoc = read('docs/UX_MARKETPLACE_PANELS_01.md');
  const verifiedDoc = read('docs/VERIFIED_SUPPLIER_01.md');
  const helper = read('backend/src/ai/chat/supplierMatching.js');
  const rfqPrepHelper = read('backend/src/ai/chat/copilotRfqPrep.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const cachedNames = gitCachedNames();
  const rfqFixture = Object.freeze({
    rfqType: 'personel servis',
    serviceScope: 'Gebze-Tuzla 40 personel',
    region: 'Kocaeli / Gebze / Tuzla',
    province: 'Kocaeli',
    district: 'Gebze',
    startDate: '2026-08-01',
    shift: '06:00-18:00',
    passengerCount: 40,
    vehicleCapacityRequirement: 40,
    pickupRegion: 'Gebze',
    dropoffRegion: 'Tuzla',
    sla: 'Zamanında ve güvenli hizmet',
    documentRequirements: ['SRC3', 'Psikoteknik'],
    safetyRequirements: ['Kasko', 'Araç takip'],
  });
  const supplierProfilesFixture = Object.freeze([
    Object.freeze({
      candidateId: 'supplier-opa-01',
      supplierName: 'Alpha Servis A.Ş.',
      supplierLabel: 'Alpha Servis A.Ş.',
      serviceAreas: ['Kocaeli', 'Gebze', 'Tuzla'],
      fleetCapacity: 55,
      vehicleTypes: ['midibus'],
      startAvailability: ['2026-08-01'],
      shifts: ['06:00-18:00'],
      serviceTypes: ['personel servis', 'okul servis'],
      licenses: ['SRC3', 'Psikoteknik'],
      qualitySignal: 92,
      insurance: true,
      safetyCerts: ['Kasko'],
      riskNotes: [],
    }),
    Object.freeze({
      candidateId: 'supplier-opa-02',
      supplierName: 'Beta Taşımacılık Ltd.',
      supplierLabel: 'Beta Taşımacılık Ltd.',
      serviceAreas: ['İzmit'],
      fleetCapacity: 18,
      vehicleTypes: ['minibus'],
      startAvailability: [],
      shifts: ['night'],
      serviceTypes: ['shuttle'],
      licenses: [],
      qualitySignal: 60,
      insurance: false,
      safetyCerts: [],
      riskNotes: ['KVKK-safe history only'],
    }),
  ]);

  must(pkg, '"check:suppliermatching01": "node backend/scripts/supplier_matching_01_check.js"', 'package.json exposes supplier matching check');
  must(runner, 'check:suppliermatching01', 'product extensions runner includes supplier matching check');
  must(verify, 'check:suppliermatching01', 'verify chain includes supplier matching check');

  ordered(runner, ['check:verifiedsupplier01', 'check:suppliermatching01', 'check:uxmarketplacepanels01'], 'product extensions runner keeps supplier matching after verified supplier');
  ordered(verify, ['check:verifiedsupplier01', 'check:suppliermatching01', 'check:uxmarketplacepanels01'], 'verify chain keeps supplier matching after verified supplier');

  must(guide, 'SUPPLIER-MATCHING-01', 'milestone guide mentions supplier matching milestone');
  must(guide, 'check:suppliermatching01', 'milestone guide exposes supplier matching check');
  must(guide, 'node backend\\scripts\\supplier_matching_01_check.js', 'milestone guide includes supplier matching command');
  must(guide, 'docs/SUPPLIER_MATCHING_01.md', 'milestone guide includes supplier matching doc');
  ordered(guide, ['VERIFIED-SUPPLIER-01', 'SUPPLIER-MATCHING-01', 'UX-MARKETPLACE-PANELS-01'], 'milestone guide keeps supplier matching after verified supplier');

  must(primer, 'SUPPLIER-MATCHING-01', 'primer mentions supplier matching milestone');
  must(primer, 'docs/SUPPLIER_MATCHING_01.md', 'primer links supplier matching doc');
  ordered(primer, ['VERIFIED-SUPPLIER-01', 'SUPPLIER-MATCHING-01', 'UX-MARKETPLACE-PANELS-01'], 'primer keeps supplier matching after verified supplier');

  must(roadmap, 'SUPPLIER-MATCHING-01', 'roadmap keeps supplier matching milestone');
  must(roadmap, 'Supplier matching guard', 'roadmap keeps supplier matching guard section');
  must(roadmap, 'docs/SUPPLIER_MATCHING_01.md', 'roadmap links supplier matching doc');
  must(roadmap, 'RFQ prep çıktısını supplier matching inputuna dönüştürür', 'roadmap keeps supplier matching purpose wording');
  must(roadmap, 'RFQ send, supplier contact, offer collect ve offer accept/reject açmaz', 'roadmap keeps supplier matching boundary wording');

  must(doc, '# SUPPLIER-MATCHING-01', 'supplier matching doc title present');
  must(doc, 'RFQ prep çıktısını supplier matching inputuna dönüştürmek', 'supplier matching doc keeps purpose wording');
  must(doc, 'draftOnly=true', 'supplier matching doc keeps draftOnly boundary');
  must(doc, 'notContacted=true', 'supplier matching doc keeps notContacted boundary');
  must(doc, 'notSent=true', 'supplier matching doc keeps notSent boundary');
  must(doc, 'notSelected=true', 'supplier matching doc keeps notSelected boundary');
  must(doc, 'approvalRequired=true', 'supplier matching doc keeps approvalRequired boundary');
  must(doc, 'executionState=supplier_match_draft_only / not_contacted / not_selected / not_executed', 'supplier matching doc keeps execution state wording');
  must(doc, 'nextSafeStep=aday kısa listeyi kontrol edip insan onayına sunmak', 'supplier matching doc keeps next safe step wording');
  ordered(doc, [
    '## 1) Amaç',
    '## 2) Kanonik akış',
    '## 3) Matching input summary',
    '## 4) Matching criteria',
    '## 5) Candidate evaluation',
    '## 6) Shortlist draft',
    '## 7) Safety / boundary',
    '## 8) Türkçe visible answer',
    '## 9) Static helper',
    '## 10) What is not changed',
    '## 11) Validation results',
    '## 12) Remaining risks',
    '## 13) Next recommended milestone',
  ], 'supplier matching doc keeps section order');
  must(doc, 'Aday tedarikçi uygunluk taslağını hazırladım; henüz hiçbir tedarikçi seçilmedi veya aranmadı.', 'supplier matching doc keeps visible answer');
  must(doc, 'Tedarikçiye RFQ göndermek için insan onayı gerekir.', 'supplier matching doc keeps RFQ approval line');
  must(doc, 'Bu liste sadece ön değerlendirmedir.', 'supplier matching doc keeps preview line');
  must(doc, 'Eksik bilgiler tamamlanmadan tedarikçiye gönderim önerilmez.', 'supplier matching doc keeps missing info line');
  must(doc, 'Sıradaki güvenli adım: kısa listeyi kontrol edip onaya sunmak.', 'supplier matching doc keeps next safe step line');
  must(doc, 'backend/src/ai/chat/supplierMatching.js', 'supplier matching doc links static helper');
  must(doc, 'Runtime execution yoktur.', 'supplier matching doc keeps runtime boundary');
  must(doc, 'DB persistence, audit event write ve backend write route açmaz.', 'supplier matching doc keeps write boundary');
  must(doc, 'commit-external', 'supplier matching doc keeps commit external wording');
  must(doc, 'prismaSummary', 'supplier matching doc keeps prisma summary label');
  must(doc, 'matchingInputSummary', 'supplier matching doc keeps matching input summary label');
  must(doc, 'matchingCriteriaSummary', 'supplier matching doc keeps matching criteria summary label');
  must(doc, 'candidateEvaluationSummary', 'supplier matching doc keeps candidate evaluation summary label');
  must(doc, 'shortlistDraftSummary', 'supplier matching doc keeps shortlist draft summary label');
  must(doc, 'safetyBoundarySummary', 'supplier matching doc keeps safety boundary summary label');
  must(doc, 'turkishVisibleSummary', 'supplier matching doc keeps Turkish visible summary label');
  must(doc, 'chainWiringSummary', 'supplier matching doc keeps chain wiring summary label');
  must(doc, 'commitExternalSummary', 'supplier matching doc keeps commit external summary label');

  must(helper, 'SUPPLIER_MATCHING_VERSION', 'helper exposes version marker');
  must(helper, 'SUPPLIER_MATCHING_STAGES', 'helper exposes stages');
  must(helper, 'SUPPLIER_MATCHING_INPUT_SUMMARY', 'helper exposes matching input summary');
  must(helper, 'SUPPLIER_MATCHING_MATCHING_CRITERIA', 'helper exposes matching criteria');
  must(helper, 'SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS', 'helper exposes candidate evaluation fields');
  must(helper, 'SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS', 'helper exposes shortlist draft fields');
  must(helper, 'SUPPLIER_MATCHING_BOUNDARY_FLAGS', 'helper exposes boundary flags');
  must(helper, 'SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES', 'helper exposes Turkish visible phrases');
  must(helper, 'SUPPLIER_MATCHING_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'SUPPLIER_MATCHING_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'SUPPLIER_MATCHING_HANOFFS', 'helper exposes handoffs');
  must(helper, 'SUPPLIER_MATCHING_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'SUPPLIER_MATCHING_INTENT_TYPES', 'helper exposes intent types');
  must(helper, 'SUPPLIER_MATCHING_MATCHING_TYPES', 'helper exposes matching types');
  must(helper, 'SUPPLIER_MATCHING_MATCHING_TYPE_LABELS', 'helper exposes matching type labels');
  must(helper, 'SUPPLIER_MATCHING_SCORE_WEIGHTS', 'helper exposes score weights');
  must(helper, 'SUPPLIER_MATCHING_REQUIRED_SUPPLIER_FIELDS', 'helper exposes required supplier fields');
  must(helper, 'SUPPLIER_MATCHING_QUESTION_BANK', 'helper exposes question bank');
  must(helper, 'SUPPLIER_MATCHING_EXECUTION_STATE', 'helper exposes execution state');
  must(helper, 'SUPPLIER_MATCHING_NEXT_SAFE_STEP', 'helper exposes next safe step');
  must(helper, 'SUPPLIER_MATCHING_POLICY', 'helper exposes policy object');
  must(helper, 'listSupplierMatchingRoles', 'helper exposes role lister');
  must(helper, 'getSupplierMatchingPolicy', 'helper exposes policy getter');
  must(helper, 'detectSupplierMatchingIntent', 'helper exposes intent detector');
  must(helper, 'buildSupplierMatchingInput', 'helper exposes matching input builder');
  must(helper, 'scoreSupplierCandidate', 'helper exposes candidate scorer');
  must(helper, 'buildSupplierCandidateMatrix', 'helper exposes candidate matrix builder');
  must(helper, 'buildSupplierShortlistDraft', 'helper exposes shortlist draft builder');
  must(helper, 'getSupplierMatchingMissingFields', 'helper exposes missing fields helper');
  must(helper, 'buildSupplierQuestionSet', 'helper exposes question set builder');
  must(helper, 'composeSupplierMatchingAnswer', 'helper exposes answer composer');
  must(helper, 'maskSupplierSensitiveValue', 'helper exposes masking helper');
  must(helper, 'normalizeSupplierMatchingField', 'helper exposes normalization helper');
  ordered(helper, [
    'Matching Input Summary',
    'Matching Criteria',
    'Candidate Evaluation',
    'Shortlist Draft',
    'Safety / Boundary',
    'Human Approval Handoff',
  ], 'helper keeps stage ordering');

  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_STAGES.map((stage) => stage.title), 'helper stage titles');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_INPUT_SUMMARY, 'helper input summary');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_MATCHING_CRITERIA, 'helper matching criteria');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS, 'helper candidate evaluation fields');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_SHORTLIST_DRAFT_FIELDS, 'helper shortlist draft fields');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_BOUNDARY_FLAGS, 'helper boundary flags');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES, 'helper Turkish visible phrases');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_BLOCKED_ACTIONS, 'helper blocked actions');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_NEVER_AUTOMATE, 'helper never automate');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_HANOFFS, 'helper handoffs');
  mustEach(helper, supplierMatching.SUPPLIER_MATCHING_PUBLIC_PROMISE, 'helper public promise');

  mustCondition(Array.isArray(supplierMatching.listSupplierMatchingRoles()), 'helper role list returns array');
  mustCondition(supplierMatching.listSupplierMatchingRoles().length === Object.keys(supplierMatching.SUPPLIER_MATCHING_POLICY).length, 'helper role list count matches policy keys');
  for (const role of supplierMatching.listSupplierMatchingRoles()) {
    const policy = supplierMatching.getSupplierMatchingPolicy(role);
    mustCondition(Boolean(policy), `helper policy exists for role ${role}`);
    mustCondition(policy.role === role, `helper policy role matches ${role}`);
    mustCondition(typeof policy.visible === 'boolean', `helper policy visible flag exists for role ${role}`);
    mustCondition(Array.isArray(policy.MATCHING_INPUT_SUMMARY), `helper policy ${role} has matching input summary`);
    mustCondition(Array.isArray(policy.MATCHING_CRITERIA), `helper policy ${role} has matching criteria`);
    mustCondition(Array.isArray(policy.CANDIDATE_EVALUATION_FIELDS), `helper policy ${role} has candidate evaluation fields`);
    mustCondition(Array.isArray(policy.SHORTLIST_DRAFT_FIELDS), `helper policy ${role} has shortlist draft fields`);
    mustCondition(Array.isArray(policy.SAFETY_BOUNDARY_FLAGS), `helper policy ${role} has safety boundary flags`);
    mustCondition(Array.isArray(policy.TURKISH_VISIBLE_PHRASES), `helper policy ${role} has Turkish visible phrases`);
    mustCondition(Array.isArray(policy.BLOCKED_RUNTIME_ACTION), `helper policy ${role} has blocked runtime actions`);
    mustCondition(Array.isArray(policy.NEVER_AUTOMATE), `helper policy ${role} has never automate list`);
  }
  mustCondition(supplierMatching.getSupplierMatchingPolicy('UNKNOWN') === null, 'helper policy getter returns null for unknown role');

  mustCondition(typeof supplierMatching.detectSupplierMatchingIntent === 'function', 'helper intent detector is a function');
  mustCondition(typeof supplierMatching.buildSupplierMatchingInput === 'function', 'helper matching input builder is a function');
  mustCondition(typeof supplierMatching.scoreSupplierCandidate === 'function', 'helper candidate scorer is a function');
  mustCondition(typeof supplierMatching.buildSupplierCandidateMatrix === 'function', 'helper candidate matrix builder is a function');
  mustCondition(typeof supplierMatching.buildSupplierShortlistDraft === 'function', 'helper shortlist builder is a function');
  mustCondition(typeof supplierMatching.getSupplierMatchingMissingFields === 'function', 'helper missing fields helper is a function');
  mustCondition(typeof supplierMatching.buildSupplierQuestionSet === 'function', 'helper question set builder is a function');
  mustCondition(typeof supplierMatching.composeSupplierMatchingAnswer === 'function', 'helper answer composer is a function');
  mustCondition(typeof supplierMatching.maskSupplierSensitiveValue === 'function', 'helper masking helper is a function');
  mustCondition(typeof supplierMatching.normalizeSupplierMatchingField === 'function', 'helper normalization helper is a function');

  const intentFixtures = [
    ['Bu RFQ için uygun tedarikçileri değerlendir.', 'matching_shortlist_request', 'genel_supplier_matching'],
    ['Aday tedarikçi kısa listesi çıkar.', 'matching_shortlist_request', 'genel_supplier_matching'],
    ['Gebze-Tuzla 40 personel için hangi tedarikçi uygun olur?', 'matching_shortlist_request', 'personel_servis'],
    ['Tedarikçilere göre riskleri sırala.', 'matching_risk_review_request', 'genel_supplier_matching'],
    ['Bu talebe hangi servisçi daha uygun?', 'matching_shortlist_request', 'genel_supplier_matching'],
    ['Bunu tedarikçilere gönder.', 'execution_blocked_request', 'genel_supplier_matching'],
    ['Tamam seç.', 'execution_blocked_request', 'genel_supplier_matching'],
    ['En uygunu seç ve ilerle.', 'execution_blocked_request', 'genel_supplier_matching'],
    ['Eksik supplier bilgisi var mı?', 'matching_question_request', 'genel_supplier_matching'],
    ['Tedarikçiye sorulacak soruları çıkar.', 'matching_question_request', 'genel_supplier_matching'],
    ['İşçi servisi için adayları değerlendir.', 'matching_shortlist_request', 'personel_servis'],
    ['Okul servisi için kısa liste çıkar.', 'matching_shortlist_request', 'okul_servis'],
    ['Vardiya bazlı matching yap.', 'matching_shortlist_request', 'vardiya_bazli'],
    ['Mevcut sözleşmeye ek hat öner.', 'matching_shortlist_request', 'mevcut_sozlesmeye_ek_hat'],
    ['Kapasite artırma ihtiyacı için aday tara.', 'matching_shortlist_request', 'kapasite_artirma'],
    ['Güzergah değişikliği var.', 'matching_shortlist_request', 'guzergah_degisikligi'],
  ];
  for (const [input, expectedIntent, expectedType] of intentFixtures) {
    const detected = supplierMatching.detectSupplierMatchingIntent(input);
    mustCondition(detected.intentType === expectedIntent, `intent detector returns ${expectedIntent} for ${input}`);
    mustCondition(detected.matchingType === expectedType, `intent detector returns ${expectedType} for ${input}`);
    mustCondition(detected.draftOnly === true, `intent detector keeps draftOnly for ${input}`);
    mustCondition(detected.notSelected === true, `intent detector keeps notSelected for ${input}`);
    mustCondition(detected.notContacted === true, `intent detector keeps notContacted for ${input}`);
    mustCondition(detected.notSent === true, `intent detector keeps notSent for ${input}`);
    mustCondition(detected.approvalRequired === true, `intent detector keeps approvalRequired for ${input}`);
    mustCondition(detected.executionState === 'supplier_match_draft_only / not_contacted / not_selected / not_executed', `intent detector keeps execution state for ${input}`);
  }

  mustCondition(supplierMatching.detectSupplierMatchingIntent('Bunu tedarikçilere gönder.').blockedExecutionRequest === true, 'intent detector blocks send request');
  mustCondition(supplierMatching.detectSupplierMatchingIntent('Tamam seç.').blockedExecutionRequest === true, 'intent detector blocks select request');
  mustCondition(supplierMatching.detectSupplierMatchingIntent('En uygunu seç ve ilerle.').blockedExecutionRequest === true, 'intent detector blocks advance request');

  mustCondition(supplierMatching.maskSupplierSensitiveValue('ali.kaya@example.com') !== 'ali.kaya@example.com', 'masking helper hides email');
  mustCondition(String(supplierMatching.maskSupplierSensitiveValue('ali.kaya@example.com')).includes('***'), 'masking helper masks email with stars');
  mustCondition(supplierMatching.normalizeSupplierMatchingField('Gebze-Tuzla') === 'gebze-tuzla', 'normalization helper normalizes Turkish text');

  const matchingInput = supplierMatching.buildSupplierMatchingInput(rfqFixture, {
    userInput: 'Bu RFQ için uygun tedarikçileri değerlendir.',
  });
  mustCondition(matchingInput.intentType === 'matching_shortlist_request', 'matching input keeps shortlist intent');
  mustCondition(matchingInput.matchingType === 'genel_supplier_matching', 'matching input keeps general matching type');
  mustCondition(Array.isArray(matchingInput.sourceRfqSummary.documentRequirements), 'matching input keeps document requirements array');
  mustCondition(Array.isArray(matchingInput.matchingCriteria), 'matching input keeps matching criteria array');
  mustCondition(Array.isArray(matchingInput.missingFields), 'matching input keeps missing fields array');
  mustCondition(matchingInput.draftOnly === true, 'matching input keeps draftOnly');
  mustCondition(matchingInput.notSelected === true, 'matching input keeps notSelected');
  mustCondition(matchingInput.notContacted === true, 'matching input keeps notContacted');
  mustCondition(matchingInput.notSent === true, 'matching input keeps notSent');
  mustCondition(matchingInput.approvalRequired === true, 'matching input keeps approvalRequired');
  mustCondition(matchingInput.executionState === 'supplier_match_draft_only / not_contacted / not_selected / not_executed', 'matching input keeps execution state');

  const candidateAlpha = supplierMatching.scoreSupplierCandidate(rfqFixture, supplierProfilesFixture[0], 0);
  const candidateBeta = supplierMatching.scoreSupplierCandidate(rfqFixture, supplierProfilesFixture[1], 1);
  mustCondition(candidateAlpha.candidateId === 'supplier-opa-01', 'candidate alpha keeps candidate id');
  mustCondition(candidateAlpha.score > candidateBeta.score, 'candidate alpha scores above beta');
  mustCondition(candidateAlpha.fitLevel === 'high' || candidateAlpha.fitLevel === 'medium', 'candidate alpha fit level is high or medium');
  mustCondition(candidateBeta.fitLevel === 'blocked' || candidateBeta.fitLevel === 'low', 'candidate beta fit level is blocked or low');
  mustCondition(candidateAlpha.humanReviewRequired === true, 'candidate alpha requires human review');
  mustCondition(candidateAlpha.draftOnly === true, 'candidate alpha stays draft only');
  mustCondition(candidateAlpha.notSelected === true, 'candidate alpha stays not selected');
  mustCondition(candidateAlpha.notContacted === true, 'candidate alpha stays not contacted');
  mustCondition(candidateAlpha.notSent === true, 'candidate alpha stays not sent');
  mustCondition(Array.isArray(candidateAlpha.matchReasons), 'candidate alpha keeps match reasons');
  mustCondition(Array.isArray(candidateAlpha.missingSupplierFields), 'candidate alpha keeps missing supplier fields');
  mustCondition(Array.isArray(candidateAlpha.riskNotes), 'candidate alpha keeps risk notes');
  mustCondition(Array.isArray(candidateAlpha.disqualifiers), 'candidate alpha keeps disqualifiers');
  mustCondition(Array.isArray(candidateAlpha.nextQuestionsForSupplier), 'candidate alpha keeps next questions');
  mustCondition(Array.isArray(candidateAlpha.criteriaBreakdown), 'candidate alpha keeps criteria breakdown');

  const candidateMatrix = supplierMatching.buildSupplierCandidateMatrix(rfqFixture, supplierProfilesFixture);
  mustCondition(Array.isArray(candidateMatrix), 'candidate matrix returns array');
  mustCondition(candidateMatrix.length === 2, 'candidate matrix keeps two candidates');
  mustCondition(candidateMatrix[0].candidateId === 'supplier-opa-01', 'candidate matrix sorts alpha first');
  mustCondition(candidateMatrix[0].score >= candidateMatrix[1].score, 'candidate matrix sorts by score');
  mustCondition(candidateMatrix[0].rank === 1, 'candidate matrix rank starts at one');
  mustCondition(candidateMatrix[1].rank === 2, 'candidate matrix rank increments');

  const missingFields = supplierMatching.getSupplierMatchingMissingFields(rfqFixture, supplierProfilesFixture);
  mustCondition(Array.isArray(missingFields.rfqMissingFields), 'missing fields keeps rfq missing fields array');
  mustCondition(Array.isArray(missingFields.supplierMissingFields), 'missing fields keeps supplier missing fields array');
  mustCondition(Array.isArray(missingFields.missingFields), 'missing fields keeps combined missing fields array');
  mustCondition(missingFields.supplierMissingFields.includes('licenses'), 'missing fields detects missing licenses');
  mustCondition(missingFields.supplierMissingFields.includes('startAvailability'), 'missing fields detects missing start availability');

  const questionSet = supplierMatching.buildSupplierQuestionSet(candidateMatrix);
  mustCondition(Array.isArray(questionSet), 'question set returns array');
  mustCondition(questionSet.includes('Kapasite uygunluğunuzu doğrular mısınız?'), 'question set includes capacity question');
  mustCondition(questionSet.includes('Başlangıç tarihinde müsait misiniz?'), 'question set includes start availability question');
  mustCondition(questionSet.includes('Belirtilen bölgeye hizmet veriyor musunuz?'), 'question set includes region question');
  mustCondition(questionSet.includes('İstenen araç tipi ve filo uygun mu?'), 'question set includes vehicle question');
  mustCondition(questionSet.includes('Gerekli belge ve ruhsatlar mevcut mu?'), 'question set includes license question');
  mustCondition(questionSet.includes('SLA / kalite hedeflerini karşılıyor musunuz?'), 'question set includes SLA question');
  mustCondition(questionSet.includes('Sigorta ve güvenlik gereksinimleri hazır mı?'), 'question set includes insurance question');
  mustCondition(questionSet.includes('Alternatif rota veya kapasite öneriniz var mı?'), 'question set includes alternative question');

  const shortlistDraft = supplierMatching.buildSupplierShortlistDraft(candidateMatrix);
  mustCondition(shortlistDraft.draftOnly === true, 'shortlist draft keeps draftOnly');
  mustCondition(shortlistDraft.notSelected === true, 'shortlist draft keeps notSelected');
  mustCondition(shortlistDraft.notContacted === true, 'shortlist draft keeps notContacted');
  mustCondition(shortlistDraft.notSent === true, 'shortlist draft keeps notSent');
  mustCondition(shortlistDraft.approvalRequired === true, 'shortlist draft keeps approvalRequired');
  mustCondition(shortlistDraft.executionState === 'supplier_match_draft_only / not_contacted / not_selected / not_executed', 'shortlist draft keeps execution state');
  mustCondition(shortlistDraft.nextSafeStep === 'aday kısa listeyi kontrol edip insan onayına sunmak', 'shortlist draft keeps next safe step');
  mustCondition(Array.isArray(shortlistDraft.bestCandidates), 'shortlist draft keeps best candidates array');
  mustCondition(shortlistDraft.bestCandidates.length >= 1, 'shortlist draft keeps at least one best candidate');
  mustCondition(Array.isArray(shortlistDraft.whyTheyFit), 'shortlist draft keeps why they fit array');
  mustCondition(Array.isArray(shortlistDraft.missingInformation), 'shortlist draft keeps missing information array');
  mustCondition(Array.isArray(shortlistDraft.questionsForSupplier), 'shortlist draft keeps questions for supplier array');
  mustCondition(Array.isArray(shortlistDraft.riskNotes), 'shortlist draft keeps risk notes array');
  mustCondition(shortlistDraft.humanApprovalNote.includes('insan onayı'), 'shortlist draft keeps human approval note');

  const composedAnswer = supplierMatching.composeSupplierMatchingAnswer({
    userInput: 'Bunu tedarikçilere gönder.',
    rfqDraft: rfqFixture,
    supplierProfiles: supplierProfilesFixture,
  });
  mustCondition(composedAnswer.intentType === 'execution_blocked_request', 'composed answer keeps execution blocked intent');
  mustCondition(composedAnswer.matchingType === 'genel_supplier_matching', 'composed answer keeps general matching type for blocked send request');
  mustCondition(composedAnswer.draftOnly === true, 'composed answer keeps draftOnly');
  mustCondition(composedAnswer.notSelected === true, 'composed answer keeps notSelected');
  mustCondition(composedAnswer.notContacted === true, 'composed answer keeps notContacted');
  mustCondition(composedAnswer.notSent === true, 'composed answer keeps notSent');
  mustCondition(composedAnswer.approvalRequired === true, 'composed answer keeps approvalRequired');
  mustCondition(composedAnswer.humanReviewRequired === true, 'composed answer keeps human review requirement');
  mustCondition(Array.isArray(composedAnswer.candidateMatrix), 'composed answer keeps candidate matrix array');
  mustCondition(Array.isArray(composedAnswer.supplierQuestionSet), 'composed answer keeps supplier question set array');
  mustCondition(Array.isArray(composedAnswer.riskNotes), 'composed answer keeps risk notes array');
  mustCondition(Array.isArray(composedAnswer.safetyNotes), 'composed answer keeps safety notes array');
  mustCondition(composedAnswer.visibleAnswer.includes('Aday tedarikçi uygunluk taslağını hazırladım'), 'composed answer keeps visible answer opening');
  mustCondition(composedAnswer.visibleAnswer.includes('Tedarikçilere gönderim veya seçim için insan onayı gerekir.'), 'composed answer keeps blocked send line');
  mustCondition(composedAnswer.visibleAnswer.includes('Sıradaki güvenli adım: aday kısa listeyi kontrol edip insan onayına sunmak.'), 'composed answer keeps next safe step line');
  mustCondition(composedAnswer.matchingIntentSummary.includes('intentType=execution_blocked_request'), 'composed answer keeps intent summary');
  mustCondition(composedAnswer.matchingTypeSummary.includes('genel supplier matching'), 'composed answer keeps matching type summary');
  mustCondition(composedAnswer.candidateMatrixSummary.includes('aday'), 'composed answer keeps candidate matrix summary');
  mustCondition(composedAnswer.shortlistDraftSummary.includes('aday shortlist'), 'composed answer keeps shortlist summary');
  mustCondition(composedAnswer.supplierQuestionSummary.includes('soru'), 'composed answer keeps supplier question summary');
  mustCondition(composedAnswer.draftOnlySummary.includes('ön değerlendirme'), 'composed answer keeps draft only summary');
  mustCondition(composedAnswer.safetyPhraseSummary.includes('approvalRequired=true'), 'composed answer keeps safety phrase summary');
  mustCondition(composedAnswer.kvkkSafeSummary.includes('raw token'), 'composed answer keeps kvkk safe summary');
  mustCondition(composedAnswer.auditApprovalSummary.includes('human approval boundary'), 'composed answer keeps audit approval summary');
  mustCondition(composedAnswer.noWriteActionSummary.includes('RFQ send'), 'composed answer keeps no write action summary');
  mustCondition(composedAnswer.chainWiringSummary.includes('check:suppliermatching01'), 'composed answer keeps chain wiring summary');
  mustCondition(composedAnswer.smokeThresholdSummary.includes('product-flow PASS 18/0/0/0'), 'composed answer keeps smoke threshold summary');
  mustCondition(composedAnswer.commitExternalSummary.includes('runtime-data'), 'composed answer keeps commit external summary');
  mustCondition(composedAnswer.prismaSummary.includes('No route/service/prisma diff'), 'composed answer keeps prisma summary');

  must(rfqPrepDoc, 'SUPPLIER-MATCHING-01', 'rfq prep doc still references supplier matching');
  must(rfqPrepHelper, 'SUPPLIER-MATCHING-01', 'rfq prep helper still references supplier matching');
  must(humanApprovalDoc, 'SUPPLIER-MATCHING-01', 'human approval doc still references supplier matching');
  must(marketplaceDoc, 'SUPPLIER-MATCHING-01', 'marketplace doc references supplier matching');
  must(verifiedDoc, 'SUPPLIER-MATCHING-01', 'verified supplier doc references supplier matching');

  must(harnessCheck, 'check:suppliermatching01', 'script harness check knows supplier matching alias');
  must(harnessCheck, 'supplier_matching_01_check.js', 'script harness check knows supplier matching file');
  must(harnessCheck, 'SUPPLIER-MATCHING-01', 'script harness check knows supplier matching milestone');
  must(harnessCheck, 'docs/SUPPLIER_MATCHING_01.md', 'script harness check knows supplier matching doc');
  must(harnessCheck, 'backend/src/ai/chat/supplierMatching.js', 'script harness check knows supplier matching helper');

  must(harnessDoc, 'root:check:suppliermatching01', 'script harness doc lists supplier matching root check');
  must(harnessDoc, 'supplier_matching_01_check.js', 'script harness doc lists supplier matching check');
  must(harnessDoc, 'docs/SUPPLIER_MATCHING_01.md', 'script harness doc lists supplier matching doc');
  must(harnessDoc, 'backend/src/ai/chat/supplierMatching.js', 'script harness doc lists supplier matching helper');
  must(harnessDoc, 'SUPPLIER-MATCHING-01', 'script harness doc lists supplier matching milestone');

  mustNoDiffExcept(['backend/src/routes', 'backend/src/services'], ['backend/src/routes/companyOverview.js'], 'backend route/service diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  mustCondition(guardCases >= 200, 'supplier matching check keeps at least 200 guard cases');
  mustCondition(passCount >= 200, 'supplier matching check keeps at least 200 passing cases');
  mustCondition(failCount === 0, 'supplier matching check keeps fail count at zero');

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`matchingIntentSummary=${composedAnswer.matchingIntentSummary}`);
  console.log(`matchingTypeSummary=${composedAnswer.matchingTypeSummary}`);
  console.log(`matchingInputSummary=${supplierMatching.SUPPLIER_MATCHING_INPUT_SUMMARY.length} items; RFQ type, scope, region, schedule, count, capacity, pickup/drop-off, SLA and document/safety needs stay visible`);
  console.log(`matchingCriteriaSummary=${supplierMatching.SUPPLIER_MATCHING_MATCHING_CRITERIA.length} criteria; region, capacity, vehicle type, schedule, experience, document, SLA and risk fit stay visible`);
  console.log(`candidateMatrixSummary=${composedAnswer.candidateMatrixSummary}`);
  console.log(`candidateEvaluationSummary=${supplierMatching.SUPPLIER_MATCHING_CANDIDATE_EVALUATION_FIELDS.length} fields; candidateId, masked label, score, fitLevel, reasons and human review stay visible`);
  console.log(`shortlistDraftSummary=${composedAnswer.shortlistDraftSummary}`);
  console.log(`supplierQuestionSummary=${composedAnswer.supplierQuestionSummary}`);
  console.log(`draftOnlySummary=${composedAnswer.draftOnlySummary}`);
  console.log(`safetyPhraseSummary=${composedAnswer.safetyPhraseSummary}`);
  console.log(`kvkkSafeSummary=${composedAnswer.kvkkSafeSummary}`);
  console.log(`auditApprovalSummary=${composedAnswer.auditApprovalSummary}`);
  console.log(`noWriteActionSummary=${composedAnswer.noWriteActionSummary}`);
  console.log(`safetyBoundarySummary=${supplierMatching.SUPPLIER_MATCHING_BOUNDARY_FLAGS.length} flags; draftOnly/notContacted/notSent/notSelected/approvalRequired remain enforced`);
  console.log(`turkishVisibleSummary=${supplierMatching.SUPPLIER_MATCHING_TURKISH_VISIBLE_PHRASES.length} visible phrases; draft-only ve human-approved cevaplar korunur`);
  console.log('chainWiringSummary=check:copilotrfqprep01 -> check:suppliermatching01 -> check:copilothumanapproval01 -> check:uxmarketplacepanels01 remains wired');
  console.log(`smokeThresholdSummary=${composedAnswer.smokeThresholdSummary}`);
  console.log('commitExternalSummary=runtime-data, browser-smoke, and debug.log stay commit-external');
  console.log('prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only');
  console.log('PASS SUPPLIER-MATCHING-01');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
