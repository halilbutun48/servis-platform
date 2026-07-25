#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as copilotOfferAnalysis from '../src/ai/chat/copilotOfferAnalysis.js';

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

function mustEach(text, items, label) {
  mustCondition(Array.isArray(items), `${label} export is array`);
  for (const item of items) {
    must(text, item, `${label} includes ${item}`);
  }
}

const requiredStages = [
  'Offer Analysis Input Summary',
  'Supported Analysis Types',
  'Normalized Offer Model',
  'Comparison Matrix',
  'Value / Risk Analysis',
  'Missing Offer Field Policy',
  'Recommendation Draft',
  'Safety / Boundary',
  'Türkçe Visible Answer',
  'Audit / Human Approval Handoff',
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

const requiredAnalysisTypes = [
  'personel_servis_offer_analysis',
  'okul_servis_offer_analysis',
  'vardiya_bazli_offer_analysis',
  'regular_route_offer_analysis',
  'one_off_service_offer_analysis',
  'existing_contract_add_on_offer_analysis',
  'capacity_increase_offer_analysis',
  'route_change_offer_analysis',
  'general_offer_analysis',
];

const requiredValueRules = [
  'En düşük fiyat tek başına seçilmez.',
  'Fiyat-kapsam dengesi gösterilir.',
  'Kapsam, kapasite, SLA ve uygunluk birlikte değerlendirilir.',
  'Analiz puanı karar değildir; insan onayı gerekir.',
];

const requiredRiskRules = [
  'Eksik dahil / hariç kalemler risk olarak işaretlenir.',
  'Kapasite veya saat uyumsuzluğu risk olarak işaretlenir.',
  'Belge / ruhsat / sigorta belirsizliği risk olarak işaretlenir.',
  'SLA taahhüdü eksikse risk olarak işaretlenir.',
  'Geçerlilik tarihi yoksa risk olarak işaretlenir.',
];

const requiredMissingPolicy = [
  'Eksik alanlar karar öncesi görünür tutulur.',
  'Eksik alan tamamlanmadan kesin seçim yapılmaz.',
  'Eksik alanlar supplier contact veya RFQ send ile kapatılmaz.',
  'Eksik alanlar sadece insan onayına hazır taslak olarak kalır.',
];

const requiredRecommendationPolicy = [
  'Kesin seçim dili kullanılmaz.',
  'Öne çıkan aday teklif dili kullanılır.',
  'Daha güçlü görünen teklif dili kullanılır.',
  'İncelenmesi önerilen teklif dili kullanılır.',
  'İnsan onayı notu zorunludur.',
];

const requiredBoundaryFlags = [
  'draftOnly=true',
  'notAccepted=true',
  'notRejected=true',
  'notSelected=true',
  'notContacted=true',
  'notSent=true',
  'approvalRequired=true',
];

const requiredBlockedActions = [
  'Offer accept/reject',
  'Supplier selection',
  'Supplier contact',
  'RFQ send',
  'Agreement execute',
  'Dispatch apply',
  'Route apply',
  'Payment/hakediş execute',
  'Messaging/email/SMS/push',
  'Provider credential use',
  'User/account/admin write',
];

const requiredNeverAutomate = [
  'Kabul / ret kararı',
  'Kazanan tedarikçi kararı',
  'Sözleşme başlatma',
  'RFQ gönderimi',
  'Tedarikçiye mesaj gönderimi',
  'Ödeme / hakediş başlatma',
  'Yazma işlemi',
];

const requiredHandoffs = [
  'COPILOT-DEMAND-INTAKE-01',
  'COPILOT-RFQ-PREP-01',
  'SUPPLIER-MATCHING-01',
  'SUPPLIER-OFFER-COLLECT-01',
  'COPILOT-OFFER-ANALYSIS-01',
  'COPILOT-OFFER-RECOMMENDATION-01',
  'COPILOT-NEGOTIATION-ASSIST-01',
  'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
  'COPILOT-DISPATCH-ACTION-PREP-01',
  'AUDIT-LOG-AND-APPROVAL-TRACE-01',
  'SECURITY-KVKK-FINAL-01',
  'ROLE-DATA-ISOLATION-REDTEAM-01',
  'DATA-INTEGRITY-AND-RECOVERY-01',
];

const requiredVisiblePhrases = [
  'Teklif analiz taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.',
  'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.',
  'En düşük fiyat tek başına karar için yeterli değildir.',
  'Kapsam, kapasite, SLA ve riskler birlikte değerlendirilmelidir.',
  'Eksik teklif alanları tamamlanmadan karar önerilmez.',
  'Sıradaki güvenli adım: analiz taslağını kontrol edip insan onayına sunmak.',
];

const requiredBlockedPhrases = [
  'Teklifi kabul ettim.',
  'Teklifi reddettim.',
  'Bu tedarikçiyi seçtim.',
  'Kazanan tedarikçi budur.',
  'Sözleşmeyi başlattım.',
  'RFQ gönderdim.',
  'Tedarikçiye mesaj gönderdim.',
  'Teklifleri topladım.',
  'Onayladım.',
  'Uyguladım.',
];

const requiredSafetyExamples = [
  'Teklifleri analiz et.',
  'Bu teklifleri karşılaştır.',
  'Hangisi daha avantajlı görünüyor?',
  'En ucuz teklif güvenli mi?',
  'Fiyat/kapsam farklarını çıkar.',
  'Eksik teklif bilgileri neler?',
  'Riskli teklifleri sırala.',
  'Analizi onaya hazırla.',
];

const sourceRfqSummary = Object.freeze({
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
  shiftAvailability: ['06:00-18:00'],
  licenseCompliance: ['SRC3', 'Psikoteknik'],
  insuranceSafety: ['Kasko', 'Araç takip'],
  slaCommitment: 'Zamanında ve güvenli hizmet',
  validityUntil: '15 gün',
});

const lowerPriceOfferFixture = Object.freeze({
  supplierRef: 'supplier-opa-04',
  supplierLabel: 'Delta Taşımacılık Ltd.',
  offerPrice: 138000,
  priceScope: 'Aylık tüm servis',
  includedItems: ['şoför', 'yakıt', 'sigorta', 'yedek araç'],
  excludedItems: ['KDV'],
  vehicleCapacity: 42,
  vehicleType: 'midibus',
  startAvailability: ['2026-08-01'],
  shiftAvailability: ['06:00-18:00'],
  licenseCompliance: ['SRC3', 'Psikoteknik'],
  insuranceSafety: ['Kasko', 'Araç takip'],
  slaCommitment: 'Zamanında ve güvenli hizmet',
  validityUntil: '2026-08-15',
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
  shiftAvailability: [],
  licenseCompliance: [],
  insuranceSafety: [],
  slaCommitment: '',
  validityUntil: '',
  missingOfferFields: ['Teklif fiyatı', 'Başlangıç uygunluğu'],
});

const blockedOfferFixture = Object.freeze({
  supplierRef: 'supplier-opa-03',
  supplierLabel: 'Gamma Taşımacılık A.Ş.',
  blocked: true,
  offerState: 'blocked',
  missingOfferFields: ['teklif detayı'],
  riskNotes: ['blocked by policy'],
});

const offerCollectionFixture = Object.freeze({
  matchingDraft: Object.freeze({
    sourceRfqSummary,
    collectionStateSummary: 'received_draft / draftOnly=true / notRequested=true / notContacted=true / notSent=true / approvalRequired=true',
    offerCollectionInputSummary: 'supplier offer collect input summary',
  }),
  sourceRfqSummary,
  collectionState: 'received_draft',
  message: 'Teklifleri analiz et',
  offerFixtures: Object.freeze([
    lowerPriceOfferFixture,
    completeOfferFixture,
    partialOfferFixture,
    blockedOfferFixture,
  ]),
});

async function main() {
  console.log('=== COPILOT-OFFER-ANALYSIS-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const doc = read('docs/COPILOT_OFFER_ANALYSIS_01.md');
  const helper = read('backend/src/ai/chat/copilotOfferAnalysis.js');
  const supplierMatchingHelper = read('backend/src/ai/chat/supplierMatching.js');
  const supplierOfferCollectHelper = read('backend/src/ai/chat/supplierOfferCollect.js');
  const rfqPrepHelper = read('backend/src/ai/chat/copilotRfqPrep.js');
  const humanApprovalHelper = read('backend/src/ai/chat/copilotHumanApprovalPolicy.js');
  const supplierMatchingDoc = read('docs/SUPPLIER_MATCHING_01.md');
  const supplierOfferCollectDoc = read('docs/SUPPLIER_OFFER_COLLECT_01.md');
  const rfqPrepDoc = read('docs/COPILOT_RFQ_PREP_01.md');
  const humanApprovalDoc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const cachedNames = gitCachedNames();

  must(pkg, '"check:copilotofferanalysis01": "node backend/scripts/copilot_offer_analysis_01_check.js"', 'package.json exposes offer analysis check');
  ordered(runner, ['check:supplieroffercollect01', 'check:copilotofferanalysis01', 'check:uxmarketplacepanels01'], 'product extensions runner places offer analysis after supplier offer collect');
  ordered(verify, ['check:supplieroffercollect01', 'check:copilotofferanalysis01', 'check:uxmarketplacepanels01'], 'verify chain places offer analysis after supplier offer collect');

  must(guide, 'COPILOT-OFFER-ANALYSIS-01', 'milestone guide mentions offer analysis milestone');
  must(guide, 'check:copilotofferanalysis01', 'milestone guide exposes offer analysis check');
  must(guide, 'node backend\\scripts\\copilot_offer_analysis_01_check.js', 'milestone guide includes offer analysis command');
  must(guide, 'docs/COPILOT_OFFER_ANALYSIS_01.md', 'milestone guide includes offer analysis doc');
  ordered(guide, ['SUPPLIER-OFFER-COLLECT-01', 'COPILOT-OFFER-ANALYSIS-01', 'COPILOT-OFFER-RECOMMENDATION-01'], 'milestone guide keeps offer analysis after supplier offer collect');

  must(primer, 'COPILOT-OFFER-ANALYSIS-01', 'primer mentions offer analysis milestone');
  must(primer, 'docs/COPILOT_OFFER_ANALYSIS_01.md', 'primer links offer analysis doc');
  must(primer, 'offer analysis', 'primer keeps offer analysis wording');
  ordered(primer, ['SUPPLIER-OFFER-COLLECT-01', 'COPILOT-OFFER-ANALYSIS-01', 'COPILOT-OFFER-RECOMMENDATION-01'], 'primer keeps offer analysis after supplier offer collect');

  must(roadmap, 'COPILOT-OFFER-ANALYSIS-01', 'roadmap keeps offer analysis milestone');
  must(roadmap, 'draft-only offer analysis companion milestone', 'roadmap keeps offer analysis wording');
  must(roadmap, 'docs/COPILOT_OFFER_ANALYSIS_01.md', 'roadmap links offer analysis doc');

  must(doc, '# COPILOT OFFER ANALYSIS 01', 'offer analysis doc title present');
  must(doc, 'docs/check milestone', 'offer analysis doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotofferanalysis01`', 'offer analysis doc keeps canonical check wording');
  ordered(doc, [
    '## 1) Amaç',
    '## 2) Kanonik akış',
    '## 3) Supported analysis types',
    '## 4) Offer analysis input summary',
    '## 5) Normalized offer model',
    '## 6) Comparison matrix output model',
    '## 7) Value / Risk Analysis',
    '## 8) Missing offer field policy',
    '## 9) Recommendation draft policy',
    '## 10) Safety / boundary',
    '## 11) Türkçe visible answer',
    '## 12) Static helper',
    '## 13) What is not changed',
    '## 14) Validation results',
    '## 15) Remaining risks',
    '## 16) Next recommended milestone',
  ], 'offer analysis doc keeps section order');
  must(doc, 'Source supplier offer collect handoff', 'offer analysis doc keeps supplier offer collect handoff wording');
  must(doc, 'Source supplier matching handoff', 'offer analysis doc keeps supplier matching handoff wording');
  must(doc, 'Source RFQ prep handoff', 'offer analysis doc keeps RFQ prep handoff wording');
  must(doc, 'Offer recommendation handoff: `COPILOT-OFFER-RECOMMENDATION-01`', 'offer analysis doc keeps recommendation handoff wording');
  must(doc, 'Audit trace handoff: `AUDIT-LOG-AND-APPROVAL-TRACE-01`', 'offer analysis doc keeps audit trace handoff wording');
  must(doc, 'priceAmount, sadece fixture/user-provided ise', 'offer analysis doc keeps priceAmount wording');
  must(doc, 'priceCurrency: `TRY`', 'offer analysis doc keeps currency wording');
  must(doc, 'offerState: `complete` / `partial` / `missing_fields` / `blocked`', 'offer analysis doc keeps offer state wording');
  must(doc, 'fitLevel: `strong` / `acceptable` / `weak` / `blocked`', 'offer analysis doc keeps fit level wording');
  must(doc, 'Price / scope / SLA / capacity / compliance comparison policy', 'offer analysis doc keeps comparison policy wording');
  must(doc, 'No supplier selection boundary korunur.', 'offer analysis doc keeps supplier selection boundary wording');
  must(doc, 'No offer accept/reject boundary korunur.', 'offer analysis doc keeps offer boundary wording');
  must(doc, 'No supplier contact boundary korunur.', 'offer analysis doc keeps supplier contact boundary wording');
  must(doc, 'No RFQ send boundary korunur.', 'offer analysis doc keeps RFQ boundary wording');
  must(doc, 'No provider credential boundary korunur.', 'offer analysis doc keeps provider credential boundary wording');
  must(doc, 'No message/email/SMS/push boundary korunur.', 'offer analysis doc keeps messaging boundary wording');
  must(doc, 'No write-action boundary korunur.', 'offer analysis doc keeps write-action boundary wording');
  must(doc, 'Role/tenant scope policy', 'offer analysis doc keeps role scope wording');
  must(doc, 'PII/KVKK safe handling', 'offer analysis doc keeps KVKK wording');
  must(doc, 'Safety examples:', 'offer analysis doc keeps safety examples wording');
  must(doc, 'Blocked execution phrases:', 'offer analysis doc keeps blocked phrases wording');
  must(doc, 'analysisDraftSummary', 'offer analysis doc keeps analysis draft summary label');
  must(doc, 'lineCountSummary', 'offer analysis doc keeps line count summary label');
  must(doc, 'Next recommended milestone', 'offer analysis doc keeps next milestone heading');
  must(doc, 'COPILOT-NEGOTIATION-ASSIST-01', 'offer analysis doc keeps negotiation next milestone');
  must(doc, 'COPILOT-OFFER-RECOMMENDATION-01', 'offer analysis doc keeps recommendation next milestone');

  must(supplierMatchingDoc, 'COPILOT-OFFER-ANALYSIS-01', 'supplier matching doc still references offer analysis milestone');
  must(supplierOfferCollectDoc, 'COPILOT-OFFER-ANALYSIS-01', 'supplier offer collect doc references offer analysis milestone');
  must(rfqPrepDoc, 'COPILOT-OFFER-ANALYSIS-01', 'rfq prep doc references offer analysis milestone');
  must(humanApprovalDoc, 'COPILOT-OFFER-ANALYSIS-01', 'human approval doc references offer analysis milestone');
  must(supplierMatchingHelper, 'COPILOT-OFFER-ANALYSIS-01', 'supplier matching helper keeps offer analysis handoff');
  must(supplierOfferCollectHelper, 'COPILOT-OFFER-ANALYSIS-01', 'supplier offer collect helper keeps offer analysis handoff');
  must(rfqPrepHelper, 'COPILOT-OFFER-ANALYSIS-01', 'rfq prep helper keeps offer analysis handoff');
  must(humanApprovalHelper, 'COPILOT-OFFER-ANALYSIS-01', 'human approval helper keeps offer analysis handoff');
  must(harnessCheck, 'check:copilotofferanalysis01', 'script harness check knows offer analysis alias');
  must(harnessCheck, 'copilot_offer_analysis_01_check.js', 'script harness check knows offer analysis file');
  must(harnessCheck, 'COPILOT-OFFER-ANALYSIS-01', 'script harness check knows offer analysis milestone');
  must(harnessCheck, 'docs/COPILOT_OFFER_ANALYSIS_01.md', 'script harness check knows offer analysis doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotOfferAnalysis.js', 'script harness check knows offer analysis helper');
  must(harnessDoc, 'root:check:copilotofferanalysis01', 'script harness doc lists offer analysis root check');
  must(harnessDoc, 'copilot_offer_analysis_01_check.js', 'script harness doc lists offer analysis check');
  must(harnessDoc, 'docs/COPILOT_OFFER_ANALYSIS_01.md', 'script harness doc lists offer analysis doc');
  must(harnessDoc, 'COPILOT-OFFER-ANALYSIS-01', 'script harness doc lists offer analysis milestone');
  must(harnessDoc, 'backend/src/ai/chat/copilotOfferAnalysis.js', 'script harness doc lists offer analysis helper');

  must(helper, 'COPILOT_OFFER_ANALYSIS_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_OFFER_ANALYSIS_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_OFFER_ANALYSIS_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_OFFER_ANALYSIS_SUPPORTED_ANALYSIS_TYPES', 'helper exposes supported analysis types');
  must(helper, 'COPILOT_OFFER_ANALYSIS_INPUT_SUMMARY', 'helper exposes input summary');
  must(helper, 'COPILOT_OFFER_ANALYSIS_NORMALIZED_OFFER_MODEL', 'helper exposes normalized offer model');
  must(helper, 'COPILOT_OFFER_ANALYSIS_COMPARISON_MATRIX_FIELDS', 'helper exposes comparison matrix fields');
  must(helper, 'COPILOT_OFFER_ANALYSIS_VALUE_RULES', 'helper exposes value rules');
  must(helper, 'COPILOT_OFFER_ANALYSIS_RISK_RULES', 'helper exposes risk rules');
  must(helper, 'COPILOT_OFFER_ANALYSIS_MISSING_FIELD_POLICY', 'helper exposes missing field policy');
  must(helper, 'COPILOT_OFFER_ANALYSIS_RECOMMENDATION_POLICY', 'helper exposes recommendation policy');
  must(helper, 'COPILOT_OFFER_ANALYSIS_BOUNDARY_FLAGS', 'helper exposes boundary flags');
  must(helper, 'COPILOT_OFFER_ANALYSIS_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_OFFER_ANALYSIS_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_OFFER_ANALYSIS_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_OFFER_ANALYSIS_TURKISH_VISIBLE_PHRASES', 'helper exposes Turkish visible phrases');
  must(helper, 'COPILOT_OFFER_ANALYSIS_BLOCKED_PHRASES', 'helper exposes blocked phrases');
  must(helper, 'COPILOT_OFFER_ANALYSIS_SAFETY_EXAMPLES', 'helper exposes safety examples');
  must(helper, 'COPILOT_OFFER_ANALYSIS_EXECUTION_STATE', 'helper exposes execution state');
  must(helper, 'COPILOT_OFFER_ANALYSIS_NEXT_SAFE_STEP', 'helper exposes next safe step');
  must(helper, 'COPILOT_OFFER_ANALYSIS_POLICY', 'helper exposes policy object');
  must(helper, 'listCopilotOfferAnalysisRoles', 'helper exposes role lister');
  must(helper, 'getCopilotOfferAnalysisPolicy', 'helper exposes policy getter');
  must(helper, 'detectOfferAnalysisIntent', 'helper exposes intent detector');
  must(helper, 'buildOfferAnalysisInput', 'helper exposes offer analysis input builder');
  must(helper, 'normalizeOfferForAnalysis', 'helper exposes normalized offer builder');
  must(helper, 'buildOfferComparisonMatrix', 'helper exposes comparison matrix builder');
  must(helper, 'scoreOfferAnalysisCandidate', 'helper exposes candidate scorer');
  must(helper, 'buildOfferRiskSummary', 'helper exposes risk summary builder');
  must(helper, 'buildOfferMissingFieldSummary', 'helper exposes missing field summary builder');
  must(helper, 'buildOfferValueSummary', 'helper exposes value summary builder');
  must(helper, 'buildOfferAnalysisDraft', 'helper exposes analysis draft builder');
  must(helper, 'composeOfferAnalysisAnswer', 'helper exposes answer composer');
  must(helper, 'maskOfferAnalysisSensitiveValue', 'helper exposes masker');
  must(helper, 'normalizeOfferAnalysisField', 'helper exposes normalizer');
  ordered(helper, requiredStages, 'helper keeps stage ordering');
  mustEach(helper, requiredCategories, 'helper categories');
  mustEach(helper, requiredAnalysisTypes, 'helper supported analysis types');
  mustEach(helper, copilotOfferAnalysis.COPILOT_OFFER_ANALYSIS_INPUT_SUMMARY, 'helper input summary');
  mustEach(helper, copilotOfferAnalysis.COPILOT_OFFER_ANALYSIS_NORMALIZED_OFFER_MODEL, 'helper normalized offer model');
  mustEach(helper, copilotOfferAnalysis.COPILOT_OFFER_ANALYSIS_COMPARISON_MATRIX_FIELDS, 'helper comparison matrix fields');
  mustEach(helper, requiredValueRules, 'helper value rules');
  mustEach(helper, requiredRiskRules, 'helper risk rules');
  mustEach(helper, requiredMissingPolicy, 'helper missing field policy');
  mustEach(helper, requiredRecommendationPolicy, 'helper recommendation policy');
  mustEach(helper, requiredBoundaryFlags, 'helper boundary flags');
  mustEach(helper, requiredBlockedActions, 'helper blocked actions');
  mustEach(helper, requiredNeverAutomate, 'helper never automate');
  mustEach(helper, requiredHandoffs, 'helper handoffs');
  mustEach(helper, requiredVisiblePhrases, 'helper Turkish visible phrases');
  mustEach(helper, requiredBlockedPhrases, 'helper blocked phrases');
  mustEach(helper, requiredSafetyExamples, 'helper safety examples');
  mustCondition(helper.split(/\r?\n/).length < 1000, 'helper stays under 1000 lines');
  must(helper, 'No DB / network / model call yoktur.', 'helper text keeps no DB/network wording');
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
  mustNot(helper, 'https.request', 'helper has no https runtime');

  mustCondition(Array.isArray(copilotOfferAnalysis.listCopilotOfferAnalysisRoles()), 'helper role list returns array');
  mustCondition(copilotOfferAnalysis.listCopilotOfferAnalysisRoles().length === requiredRoles.length, 'helper role list count matches policy keys');
  for (const role of requiredRoles) {
    const policy = copilotOfferAnalysis.getCopilotOfferAnalysisPolicy(role);
    mustCondition(Boolean(policy), `helper policy exists for role ${role}`);
    mustCondition(policy.role === role, `helper policy role matches ${role}`);
    mustCondition(typeof policy.visible === 'boolean', `helper policy visible flag exists for role ${role}`);
    mustCondition(Array.isArray(policy.ANALYSIS_INPUT_SUMMARY), `helper policy ${role} has input summary`);
    mustCondition(Array.isArray(policy.SUPPORTED_ANALYSIS_TYPES), `helper policy ${role} has supported analysis types`);
    mustCondition(Array.isArray(policy.NORMALIZED_OFFER_MODEL), `helper policy ${role} has normalized offer model`);
    mustCondition(Array.isArray(policy.COMPARISON_MATRIX_FIELDS), `helper policy ${role} has comparison matrix fields`);
    mustCondition(Array.isArray(policy.VALUE_RISK_POLICY), `helper policy ${role} has value risk policy`);
    mustCondition(Array.isArray(policy.MISSING_FIELD_POLICY), `helper policy ${role} has missing field policy`);
    mustCondition(Array.isArray(policy.RECOMMENDATION_POLICY), `helper policy ${role} has recommendation policy`);
    mustCondition(Array.isArray(policy.SAFETY_BOUNDARY_FLAGS), `helper policy ${role} has safety boundary flags`);
    mustCondition(Array.isArray(policy.BLOCKED_RUNTIME_ACTION), `helper policy ${role} has blocked runtime action`);
    mustCondition(Array.isArray(policy.NEVER_AUTOMATE), `helper policy ${role} has never automate list`);
    mustCondition(Array.isArray(policy.TURKISH_VISIBLE_PHRASES), `helper policy ${role} has Turkish visible phrases`);
    mustCondition(Array.isArray(policy.BLOCKED_PHRASES), `helper policy ${role} has blocked phrases`);
    mustCondition(Array.isArray(policy.HANDOFFS), `helper policy ${role} has handoffs`);
  }
  mustCondition(copilotOfferAnalysis.getCopilotOfferAnalysisPolicy('UNKNOWN') === null, 'helper policy getter returns null for unknown role');

  const blockedIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Teklifi kabul et.');
  const selectBlockedIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Bu tedarikçiyi seç.');
  const analysisIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Teklifleri analiz et.');
  const compareIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Bu teklifleri karşılaştır.');
  const riskIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('En ucuz teklif güvenli mi?');
  const missingIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Eksik teklif bilgileri neler?');
  const draftIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Analizi onaya hazırla.');
  const personelIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Personel servis tekliflerini analiz et.');
  const okulIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Okul servis tekliflerini analiz et.');
  const vardiyaIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Vardiya bazlı teklifleri analiz et.');
  const addOnIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Mevcut sözleşmeye ek hat için teklifleri analiz et.');
  const capacityIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Kapasite artırma için teklifleri analiz et.');
  const routeIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Güzergah değişikliği tekliflerini analiz et.');
  const oneOffIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Tek seferlik servis tekliflerini analiz et.');
  const regularIntent = copilotOfferAnalysis.detectOfferAnalysisIntent('Hat bazlı teklifleri analiz et.');

  mustCondition(blockedIntent.intentType === 'execution_blocked_request', 'intent detector blocks accept request');
  mustCondition(blockedIntent.blockedExecutionRequest === true, 'intent detector marks accept request as blocked');
  mustCondition(selectBlockedIntent.intentType === 'execution_blocked_request', 'intent detector blocks select request');
  mustCondition(analysisIntent.intentType === 'offer_analysis_request', 'intent detector recognizes generic analysis request');
  mustCondition(compareIntent.intentType === 'offer_comparison_request', 'intent detector recognizes comparison request');
  mustCondition(riskIntent.intentType === 'offer_risk_review_request', 'intent detector recognizes risk review request');
  mustCondition(missingIntent.intentType === 'offer_missing_fields_request', 'intent detector recognizes missing field request');
  mustCondition(draftIntent.intentType === 'offer_recommendation_draft_request', 'intent detector recognizes recommendation draft request');
  mustCondition(personelIntent.analysisType === 'personel_servis_offer_analysis', 'intent detector recognizes personel servis analysis');
  mustCondition(okulIntent.analysisType === 'okul_servis_offer_analysis', 'intent detector recognizes okul servis analysis');
  mustCondition(vardiyaIntent.analysisType === 'vardiya_bazli_offer_analysis', 'intent detector recognizes vardiya analysis');
  mustCondition(addOnIntent.analysisType === 'existing_contract_add_on_offer_analysis', 'intent detector recognizes add-on analysis');
  mustCondition(capacityIntent.analysisType === 'capacity_increase_offer_analysis', 'intent detector recognizes capacity increase analysis');
  mustCondition(routeIntent.analysisType === 'route_change_offer_analysis', 'intent detector recognizes route change analysis');
  mustCondition(oneOffIntent.analysisType === 'one_off_service_offer_analysis', 'intent detector recognizes one-off service analysis');
  mustCondition(regularIntent.analysisType === 'regular_route_offer_analysis', 'intent detector recognizes regular route analysis');
  for (const intent of [blockedIntent, selectBlockedIntent, analysisIntent, compareIntent, riskIntent, missingIntent, draftIntent, personelIntent, okulIntent, vardiyaIntent, addOnIntent, capacityIntent, routeIntent, oneOffIntent, regularIntent]) {
    mustCondition(intent.draftOnly === true, `intent keeps draftOnly for ${intent.intentType}`);
    mustCondition(intent.notAccepted === true, `intent keeps notAccepted for ${intent.intentType}`);
    mustCondition(intent.notRejected === true, `intent keeps notRejected for ${intent.intentType}`);
    mustCondition(intent.notSelected === true, `intent keeps notSelected for ${intent.intentType}`);
    mustCondition(intent.notContacted === true, `intent keeps notContacted for ${intent.intentType}`);
    mustCondition(intent.notSent === true, `intent keeps notSent for ${intent.intentType}`);
    mustCondition(intent.approvalRequired === true, `intent keeps approvalRequired for ${intent.intentType}`);
    mustCondition(intent.executionState === copilotOfferAnalysis.COPILOT_OFFER_ANALYSIS_EXECUTION_STATE, `intent keeps execution state for ${intent.intentType}`);
  }

  mustCondition(copilotOfferAnalysis.normalizeOfferAnalysisField('Teklif Analizi') === 'teklif analizi', 'normalization helper lowercases and trims');
  mustCondition(String(copilotOfferAnalysis.maskOfferAnalysisSensitiveValue('ali.kaya@example.com')).includes('***'), 'masking helper hides email');
  mustCondition(copilotOfferAnalysis.maskOfferAnalysisSensitiveValue('ali.kaya@example.com') !== 'ali.kaya@example.com', 'masking helper changes email');
  mustCondition(copilotOfferAnalysis.maskOfferAnalysisSensitiveValue('05321234567') !== '05321234567', 'masking helper changes phone');
  mustCondition(String(copilotOfferAnalysis.maskOfferAnalysisSensitiveValue('Alpha Servis A.Ş.')).includes('***'), 'masking helper masks supplier label');

  const normalizedComplete = copilotOfferAnalysis.normalizeOfferForAnalysis(completeOfferFixture, 0, sourceRfqSummary);
  const normalizedLowerPrice = copilotOfferAnalysis.normalizeOfferForAnalysis(lowerPriceOfferFixture, 1, sourceRfqSummary);
  const normalizedPartial = copilotOfferAnalysis.normalizeOfferForAnalysis(partialOfferFixture, 2, sourceRfqSummary);
  const normalizedBlocked = copilotOfferAnalysis.normalizeOfferForAnalysis(blockedOfferFixture, 3, sourceRfqSummary);

  mustCondition(normalizedComplete.offerState === 'complete', 'normalizer marks complete offer');
  mustCondition(normalizedLowerPrice.offerState === 'complete', 'normalizer keeps lower price complete offer complete');
  mustCondition(normalizedPartial.offerState === 'missing_fields' || normalizedPartial.offerState === 'partial', 'normalizer marks partial offer as partial or missing fields');
  mustCondition(normalizedBlocked.offerState === 'blocked', 'normalizer marks blocked offer');
  mustCondition(normalizedComplete.priceCurrency === 'TRY', 'normalizer keeps TRY currency');
  mustCondition(normalizedComplete.pricePeriod === 'monthly', 'normalizer infers monthly period');
  mustCondition(normalizedComplete.humanReviewRequired === true, 'normalizer keeps human review requirement');
  mustCondition(normalizedComplete.notAccepted === true, 'normalizer keeps notAccepted');
  mustCondition(normalizedComplete.notRejected === true, 'normalizer keeps notRejected');
  mustCondition(normalizedComplete.notSelected === true, 'normalizer keeps notSelected');
  mustCondition(normalizedComplete.notContacted === true, 'normalizer keeps notContacted');
  mustCondition(normalizedComplete.notSent === true, 'normalizer keeps notSent');
  mustCondition(normalizedComplete.approvalRequired === true, 'normalizer keeps approvalRequired');
  mustCondition(Array.isArray(normalizedComplete.missingOfferFields), 'normalizer keeps missingOfferFields array');
  mustCondition(Array.isArray(normalizedComplete.riskNotes), 'normalizer keeps riskNotes array');
  mustCondition(normalizedComplete.offerAnalysisSummary.includes('supplierRef=supplier-opa-01'), 'normalizer keeps offer summary');
  mustCondition(normalizedComplete.offerAnalysisSummary.includes('offerState=complete'), 'normalizer keeps complete summary');
  mustCondition(normalizedBlocked.offerAnalysisSummary.includes('offerState=blocked'), 'normalizer keeps blocked summary');
  mustCondition(normalizedPartial.offerAnalysisSummary.includes('supplierRef=supplier-opa-02'), 'normalizer keeps partial summary');
  mustCondition(normalizedComplete.supplierLabelMasked.includes('***'), 'normalizer masks supplier label');

  const comparisonInput = copilotOfferAnalysis.buildOfferComparisonMatrix(offerCollectionFixture, {});
  mustCondition(Array.isArray(comparisonInput.normalizedOffers), 'comparison builder returns normalized offers array');
  mustCondition(Array.isArray(comparisonInput.comparisonMatrix), 'comparison builder returns comparison matrix array');
  mustCondition(comparisonInput.normalizedOffers.length === 4, 'comparison builder keeps four normalized offers');
  mustCondition(comparisonInput.comparisonMatrix.length === 4, 'comparison builder keeps four comparison rows');
  mustCondition(comparisonInput.comparisonMatrix[0].analysisScore >= comparisonInput.comparisonMatrix[1].analysisScore, 'comparison matrix sorts by score desc');
  mustCondition(comparisonInput.comparisonMatrix[0].fitLevel === 'strong' || comparisonInput.comparisonMatrix[0].fitLevel === 'acceptable', 'comparison matrix top row has usable fit');
  mustCondition(comparisonInput.comparisonMatrix[3].fitLevel === 'blocked' || comparisonInput.comparisonMatrix[3].riskLevel === 'blocked', 'comparison matrix bottom row can be blocked');
  for (const row of comparisonInput.comparisonMatrix) {
    mustCondition(typeof row.supplierRef === 'string' && row.supplierRef.length > 0, `comparison row ${row.rank} has supplierRef`);
    mustCondition(typeof row.supplierLabelMasked === 'string' && row.supplierLabelMasked.length > 0, `comparison row ${row.rank} has masked label`);
    mustCondition(typeof row.normalizedPriceSummary === 'string', `comparison row ${row.rank} has price summary`);
    mustCondition(typeof row.scopeCompleteness === 'string', `comparison row ${row.rank} has scope completeness`);
    mustCondition(typeof row.capacityFit === 'string', `comparison row ${row.rank} has capacity fit`);
    mustCondition(typeof row.timingFit === 'string', `comparison row ${row.rank} has timing fit`);
    mustCondition(typeof row.slaFit === 'string', `comparison row ${row.rank} has SLA fit`);
    mustCondition(typeof row.complianceFit === 'string', `comparison row ${row.rank} has compliance fit`);
    mustCondition(typeof row.riskLevel === 'string', `comparison row ${row.rank} has risk level`);
    mustCondition(Array.isArray(row.missingFields), `comparison row ${row.rank} has missing fields array`);
    mustCondition(typeof row.analysisScore === 'number', `comparison row ${row.rank} has analysis score`);
    mustCondition(typeof row.fitLevel === 'string', `comparison row ${row.rank} has fit level`);
    mustCondition(row.notAccepted === true, `comparison row ${row.rank} keeps notAccepted`);
    mustCondition(row.notRejected === true, `comparison row ${row.rank} keeps notRejected`);
    mustCondition(row.notSelected === true, `comparison row ${row.rank} keeps notSelected`);
    mustCondition(row.humanReviewRequired === true, `comparison row ${row.rank} keeps human review requirement`);
    mustCondition(Array.isArray(row.riskNotes), `comparison row ${row.rank} has risk notes array`);
  }
  mustCondition(comparisonInput.sourceOfferCollectionSummary.includes('rfqType=personel servis'), 'comparison summary keeps RFQ type');
  mustCondition(comparisonInput.sourceOfferCollectionSummary.includes('offerCount=4'), 'comparison summary keeps offer count');
  mustCondition(comparisonInput.sourceOfferCollectionSummary.includes('missingOfferCount=2'), 'comparison summary keeps missing offer count');
  mustCondition(comparisonInput.sourceOfferCollectionSummary.includes('collectionState=received_draft'), 'comparison summary keeps collection state');

  const scoreComplete = copilotOfferAnalysis.scoreOfferAnalysisCandidate(normalizedComplete, sourceRfqSummary);
  const scoreLowerPrice = copilotOfferAnalysis.scoreOfferAnalysisCandidate(normalizedLowerPrice, sourceRfqSummary);
  const scorePartial = copilotOfferAnalysis.scoreOfferAnalysisCandidate(normalizedPartial, sourceRfqSummary);
  const scoreBlocked = copilotOfferAnalysis.scoreOfferAnalysisCandidate(normalizedBlocked, sourceRfqSummary);
  mustCondition(scoreLowerPrice.analysisScore >= scoreComplete.analysisScore - 20, 'score keeps lower price candidate near complete candidate');
  mustCondition(scoreComplete.analysisScore >= scorePartial.analysisScore, 'score ranks complete above partial');
  mustCondition(scorePartial.analysisScore >= scoreBlocked.analysisScore || scoreBlocked.fitLevel === 'blocked', 'score ranks partial above blocked');
  mustCondition(scoreComplete.fitLevel === 'strong' || scoreComplete.fitLevel === 'acceptable', 'score keeps complete fit level usable');
  mustCondition(scoreBlocked.fitLevel === 'blocked', 'score keeps blocked fit level blocked');
  mustCondition(scoreComplete.capacityFit === 'strong', 'score keeps complete capacity fit strong');
  mustCondition(scoreComplete.timingFit === 'strong', 'score keeps complete timing fit strong');
  mustCondition(scoreComplete.slaFit === 'strong', 'score keeps complete SLA fit strong');
  mustCondition(scoreComplete.complianceFit === 'strong', 'score keeps complete compliance fit strong');
  mustCondition(scoreComplete.riskLevel === 'low' || scoreComplete.riskLevel === 'medium', 'score keeps complete risk low or medium');

  const valueSummary = copilotOfferAnalysis.buildOfferValueSummary(comparisonInput.comparisonMatrix);
  const riskSummary = copilotOfferAnalysis.buildOfferRiskSummary(comparisonInput.comparisonMatrix);
  const missingSummary = copilotOfferAnalysis.buildOfferMissingFieldSummary(comparisonInput.comparisonMatrix);
  mustCondition(valueSummary.valueSummary.includes('En düşük fiyat tek başına seçilmez;'), 'value summary keeps low-price warning');
  mustCondition(valueSummary.valueSummary.includes('Kapsam, kapasite, SLA ve uygunluk birlikte değerlendirilmelidir.'), 'value summary keeps combined decision rule');
  mustCondition(riskSummary.riskSummary.includes('blocked='), 'risk summary keeps blocked count');
  mustCondition(riskSummary.riskSummary.includes('partial='), 'risk summary keeps partial count');
  mustCondition(riskSummary.riskSummary.includes('missing_fields='), 'risk summary keeps missing fields count');
  mustCondition(Array.isArray(riskSummary.riskNotes), 'risk summary keeps notes array');
  mustCondition(missingSummary.missingFieldSummary.includes('Eksik teklif alanları:'), 'missing summary keeps missing fields heading');
  mustCondition(Array.isArray(missingSummary.missingFields), 'missing summary keeps missing fields array');
  mustCondition(missingSummary.bySupplier.length === 4, 'missing summary keeps by-supplier list');

  const analysisDraft = copilotOfferAnalysis.buildOfferAnalysisDraft(comparisonInput.comparisonMatrix, { message: 'Teklifleri analiz et' });
  mustCondition(analysisDraft.draftOnly === true, 'analysis draft keeps draftOnly');
  mustCondition(analysisDraft.notAccepted === true, 'analysis draft keeps notAccepted');
  mustCondition(analysisDraft.notRejected === true, 'analysis draft keeps notRejected');
  mustCondition(analysisDraft.notSelected === true, 'analysis draft keeps notSelected');
  mustCondition(analysisDraft.notContacted === true, 'analysis draft keeps notContacted');
  mustCondition(analysisDraft.notSent === true, 'analysis draft keeps notSent');
  mustCondition(analysisDraft.approvalRequired === true, 'analysis draft keeps approvalRequired');
  mustCondition(analysisDraft.executionState === copilotOfferAnalysis.COPILOT_OFFER_ANALYSIS_EXECUTION_STATE, 'analysis draft keeps execution state');
  mustCondition(analysisDraft.nextSafeStep === copilotOfferAnalysis.COPILOT_OFFER_ANALYSIS_NEXT_SAFE_STEP, 'analysis draft keeps next safe step');
  mustCondition(analysisDraft.analysisDraftSummary.includes('Teklif analiz taslağı hazır;'), 'analysis draft keeps summary');
  mustCondition(analysisDraft.analysisDraftSummary.includes('insan onayı gerekir'), 'analysis draft keeps human approval line');
  mustCondition(analysisDraft.humanApprovalNote.includes('insan onayı gerekir'), 'analysis draft keeps human approval note');
  mustCondition(Array.isArray(analysisDraft.recommendationDraft), 'analysis draft keeps recommendation draft array');
  mustCondition(analysisDraft.recommendationDraft.length === 3, 'analysis draft keeps top 3 recommendation draft rows');
  mustCondition(analysisDraft.recommendationDraft[0].analysisScore >= analysisDraft.recommendationDraft[1].analysisScore, 'analysis draft keeps recommendation order');
  mustCondition(analysisDraft.valueSummary.includes('En düşük fiyat tek başına seçilmez;'), 'analysis draft keeps value summary');
  mustCondition(analysisDraft.riskSummary.includes('blocked='), 'analysis draft keeps risk summary');
  mustCondition(analysisDraft.missingFieldSummary.includes('Eksik teklif alanları:'), 'analysis draft keeps missing field summary');
  mustCondition(Array.isArray(analysisDraft.safetyNotes), 'analysis draft keeps safety notes array');
  mustCondition(analysisDraft.safetyNotes.some((line) => line.includes('draftOnly=true')), 'analysis draft keeps boundary note');
  mustCondition(Array.isArray(analysisDraft.blockedExecutionPhrases), 'analysis draft keeps blocked phrases array');

  const composedAnswer = copilotOfferAnalysis.composeOfferAnalysisAnswer({
    offerCollection: offerCollectionFixture,
    message: 'Teklifleri analiz et',
  });
  mustCondition(composedAnswer.intentType === 'offer_analysis_request', 'composed answer keeps generic analysis intent');
  mustCondition(composedAnswer.analysisType === 'personel_servis_offer_analysis', 'composed answer keeps analysis type from RFQ');
  mustCondition(composedAnswer.offerAnalysisIntentSummary.includes('intentType=offer_analysis_request'), 'composed answer keeps intent summary');
  mustCondition(composedAnswer.offerAnalysisIntentSummary.includes('approvalRequired=true'), 'composed answer keeps approval requirement in intent summary');
  mustCondition(composedAnswer.offerAnalysisTypeSummary.includes('personel_servis_offer_analysis'), 'composed answer keeps type summary');
  mustCondition(composedAnswer.visibleAnswer.includes('Teklif analiz taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.'), 'visible answer keeps opening line');
  mustCondition(composedAnswer.visibleAnswer.includes('Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.'), 'visible answer keeps no-select line');
  mustCondition(composedAnswer.visibleAnswer.includes('En düşük fiyat tek başına karar için yeterli değildir.'), 'visible answer keeps value warning');
  mustCondition(composedAnswer.visibleAnswer.includes('Kapsam, kapasite, SLA ve riskler birlikte değerlendirilmelidir.'), 'visible answer keeps comparison line');
  mustCondition(composedAnswer.visibleAnswer.includes('Eksik teklif alanları tamamlanmadan karar önerilmez.'), 'visible answer keeps missing fields line');
  mustCondition(composedAnswer.visibleAnswer.includes('Sıradaki güvenli adım: analiz taslağını kontrol edip insan onayına sunmak.'), 'visible answer keeps next step line');
  mustCondition(composedAnswer.normalizedOffers.length === 4, 'composed answer keeps normalized offer count');
  mustCondition(composedAnswer.comparisonMatrix.length === 4, 'composed answer keeps comparison matrix count');
  mustCondition(composedAnswer.comparisonMatrix[0].analysisScore >= composedAnswer.comparisonMatrix[1].analysisScore, 'composed answer keeps sorted matrix');
  mustCondition(composedAnswer.sourceOfferCollectionSummary.includes('offerCount=4'), 'composed answer keeps source summary');
  mustCondition(composedAnswer.sourceOfferCollectionSummary.includes('missingOfferCount=2'), 'composed answer keeps missing summary');
  mustCondition(composedAnswer.normalizedOfferSummary.includes('4 normalized offers'), 'composed answer keeps normalized summary');
  mustCondition(composedAnswer.comparisonMatrixSummary.includes('4 rows'), 'composed answer keeps matrix summary');
  mustCondition(composedAnswer.recommendationDraftSummary.includes('score='), 'composed answer keeps recommendation summary');
  mustCondition(composedAnswer.draftOnlySummary.includes('ön değerlendirme'), 'composed answer keeps draft only summary');
  mustCondition(composedAnswer.safetyPhraseSummary.includes('approvalRequired=true'), 'composed answer keeps safety phrase summary');
  mustCondition(composedAnswer.kvkkSafeSummary.includes('masked'), 'composed answer keeps kvkk summary');
  mustCondition(composedAnswer.auditApprovalSummary.includes('human approval boundary'), 'composed answer keeps audit approval summary');
  mustCondition(composedAnswer.noWriteActionSummary.includes('RFQ send'), 'composed answer keeps no write action summary');
  mustCondition(composedAnswer.chainWiringSummary.includes('check:copilotofferanalysis01'), 'composed answer keeps chain wiring summary');
  mustCondition(composedAnswer.smokeThresholdSummary.includes('product-flow PASS 18/0/0/0'), 'composed answer keeps smoke summary');
  mustCondition(composedAnswer.commitExternalSummary.includes('runtime-data'), 'composed answer keeps commit external summary');
  mustCondition(composedAnswer.prismaSummary.includes('No route/service/prisma diff'), 'composed answer keeps prisma summary');
  mustCondition(composedAnswer.lineCountSummary.includes('under 1000 lines'), 'composed answer keeps line count summary');

  must(doc, 'DB / network / model call yoktur.', 'offer analysis doc keeps no DB/network wording');
  must(doc, 'Role/tenant scope policy', 'offer analysis doc keeps role scope wording');
  must(doc, 'PII/KVKK safe handling', 'offer analysis doc keeps KVKK wording');
  must(doc, 'Source supplier offer collect handoff', 'offer analysis doc keeps offer collect handoff wording');
  must(doc, 'Source supplier matching handoff', 'offer analysis doc keeps supplier matching handoff wording');
  must(doc, 'Source RFQ prep handoff', 'offer analysis doc keeps RFQ prep handoff wording');
  must(doc, 'Offer recommendation handoff', 'offer analysis doc keeps recommendation handoff wording');

  mustNoDiff(['backend/src/routes', 'backend/src/services', 'backend/prisma', 'prisma'], 'backend route/service/schema and Prisma diff stays empty');
  mustNoStagedPrefix(cachedNames, ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');
  mustCondition(!fs.existsSync(path.join(root, 'debug.log')), 'debug.log absent');
  mustCondition(cachedNames.length === 0, 'stage stays empty');
  mustCondition(guardCases >= 220, 'offer analysis check keeps at least 220 guard cases');
  mustCondition(passCount >= 220, 'offer analysis check keeps at least 220 passing cases');
  mustCondition(failCount === 0, 'offer analysis check keeps fail count at zero');

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`offerAnalysisIntentSummary=${composedAnswer.offerAnalysisIntentSummary}`);
  console.log(`offerAnalysisTypeSummary=${composedAnswer.offerAnalysisTypeSummary}`);
  console.log(`normalizedOfferSummary=${composedAnswer.normalizedOfferSummary}`);
  console.log(`comparisonMatrixSummary=${composedAnswer.comparisonMatrixSummary}`);
  console.log(`valueSummary=${composedAnswer.valueSummary}`);
  console.log(`riskSummary=${composedAnswer.riskSummary}`);
  console.log(`missingFieldSummary=${composedAnswer.missingFieldSummary}`);
  console.log(`analysisDraftSummary=${composedAnswer.analysisDraft.analysisDraftSummary}`);
  console.log(`draftOnlySummary=${composedAnswer.draftOnlySummary}`);
  console.log(`safetyPhraseSummary=${composedAnswer.safetyPhraseSummary}`);
  console.log(`kvkkSafeSummary=${composedAnswer.kvkkSafeSummary}`);
  console.log(`auditApprovalSummary=${composedAnswer.auditApprovalSummary}`);
  console.log(`noWriteActionSummary=${composedAnswer.noWriteActionSummary}`);
  console.log(`chainWiringSummary=${composedAnswer.chainWiringSummary}`);
  console.log(`smokeThresholdSummary=${composedAnswer.smokeThresholdSummary}`);
  console.log(`commitExternalSummary=${composedAnswer.commitExternalSummary}`);
  console.log(`prismaSummary=${composedAnswer.prismaSummary}`);
  console.log(`lineCountSummary=${composedAnswer.lineCountSummary}`);
  console.log('PASS COPILOT-OFFER-ANALYSIS-01');
}

try {
  await main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
