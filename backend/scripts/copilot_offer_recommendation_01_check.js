#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as offerAnalysis from '../src/ai/chat/copilotOfferAnalysis.js';
import * as negotiationAssist from '../src/ai/chat/copilotNegotiationAssist.js';
import * as offerRecommendation from '../src/ai/chat/copilotOfferRecommendation.js';

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
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function mustEach(text, items, label) {
  mustCondition(Array.isArray(items), `${label} export is array`);
  for (const item of items) {
    must(text, item, `${label} includes ${item}`);
  }
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

function mustCommandPass(args, label) {
  execFileSync(args[0], args.slice(1), {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  ok(label);
}

function assertRolePolicy(role, expectedVisible) {
  const policy = offerRecommendation.getCopilotOfferRecommendationPolicy(role);
  mustCondition(Boolean(policy), `policy exists for ${role}`);
  mustCondition(policy.role === role, `policy role matches ${role}`);
  mustCondition(policy.visible === expectedVisible, `policy visibility matches ${role}`);
  mustCondition(Array.isArray(policy.RECOMMENDATION_INPUT_SUMMARY), `${role} policy input summary is array`);
  mustCondition(Array.isArray(policy.SUPPORTED_RECOMMENDATION_TYPES), `${role} policy supported types is array`);
  mustCondition(Array.isArray(policy.CRITERIA_MODEL), `${role} policy criteria model is array`);
  mustCondition(Array.isArray(policy.SCORECARD_FIELDS), `${role} policy scorecard fields is array`);
  mustCondition(Array.isArray(policy.DRAFT_FIELDS), `${role} policy draft fields is array`);
  mustCondition(Array.isArray(policy.APPROVAL_PACKET_FIELDS), `${role} policy approval packet fields is array`);
  mustCondition(Array.isArray(policy.SAFETY_BOUNDARY_FLAGS), `${role} policy boundary flags is array`);
  mustCondition(Array.isArray(policy.BLOCKED_RUNTIME_ACTION), `${role} policy blocked runtime action is array`);
  mustCondition(Array.isArray(policy.NEVER_AUTOMATE), `${role} policy never automate is array`);
  mustCondition(Array.isArray(policy.TURKISH_VISIBLE_PHRASES), `${role} policy visible phrases is array`);
  mustCondition(Array.isArray(policy.BLOCKED_PHRASES), `${role} policy blocked phrases is array`);
  mustCondition(Array.isArray(policy.HANDOFFS), `${role} policy handoffs is array`);
  mustCondition(Array.isArray(policy.PUBLIC_PROMISE), `${role} policy public promise is array`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES, `${role} policy supports recommendation type`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS, `${role} policy keeps boundary flag`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS, `${role} policy keeps blocked action`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_NEVER_AUTOMATE, `${role} policy keeps never-automate phrase`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES, `${role} policy keeps visible phrase`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES, `${role} policy keeps blocked phrase`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_HANOFFS, `${role} policy keeps handoff`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_INPUT_SUMMARY, `${role} policy keeps input summary`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_CRITERIA_MODEL, `${role} policy keeps criteria model`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_SCORECARD_FIELDS, `${role} policy keeps scorecard field`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_DRAFT_FIELDS, `${role} policy keeps draft field`);
  mustEach(JSON.stringify(policy), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_APPROVAL_PACKET_FIELDS, `${role} policy keeps approval packet field`);
  mustEach(policy.PUBLIC_PROMISE.join(' '), offerRecommendation.COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE, `${role} policy keeps public promise`);
}

function main() {
  console.log('=== COPILOT-OFFER-RECOMMENDATION-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const doc = read('docs/COPILOT_OFFER_RECOMMENDATION_01.md');
  const helper = read('backend/src/ai/chat/copilotOfferRecommendation.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const routeReviewCheck = read('backend/scripts/copilot_route_review_human_approval_01_check.js');
  const excelRedteamCheck = read('backend/scripts/excel_to_route_readiness_redteam_01_check.js');
  const roleRedteamCheck = read('backend/scripts/role_data_isolation_redteam_01_check.js');
  const securityFinalCheck = read('backend/scripts/security_kvkk_final_01_check.js');
  const auditTraceCheck = read('backend/scripts/audit_log_and_approval_trace_01_check.js');
  const offerAnalysisDoc = read('docs/COPILOT_OFFER_ANALYSIS_01.md');
  const negotiationAssistDoc = read('docs/COPILOT_NEGOTIATION_ASSIST_01.md');
  const offerAnalysisHelper = read('backend/src/ai/chat/copilotOfferAnalysis.js');
  const negotiationAssistHelper = read('backend/src/ai/chat/copilotNegotiationAssist.js');
  const cachedNames = gitCachedNames();

  const requiredStages = [
    'Recommendation Input Summary',
    'Supported Recommendation Types',
    'Recommendation Criteria Model',
    'Recommendation Scorecard',
    'Recommendation Draft',
    'Approval Packet Draft',
    'Risk Summary',
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

  const requiredSupportedTypes = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES;
  const requiredRoleNames = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_ROLE_NAMES;
  const requiredVisiblePhrases = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES;
  const requiredBlockedPhrases = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES;
  const requiredSafetyExamples = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_SAFETY_EXAMPLES;
  const requiredBoundaryFlags = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS;
  const requiredBlockedActions = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS;
  const requiredNeverAutomate = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_NEVER_AUTOMATE;
  const requiredHandoffs = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_HANOFFS;
  const requiredPublicPromise = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE;
  const requiredInputSummary = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_INPUT_SUMMARY;
  const requiredCriteriaModel = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_CRITERIA_MODEL;
  const requiredScorecardFields = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_SCORECARD_FIELDS;
  const requiredDraftFields = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_DRAFT_FIELDS;
  const requiredApprovalPacketFields = offerRecommendation.COPILOT_OFFER_RECOMMENDATION_APPROVAL_PACKET_FIELDS;
  const supportedTypeLabels = {
    best_value_recommendation: 'En iyi değer önerisi',
    lowest_risk_recommendation: 'En düşük risk önerisi',
    budget_sensitive_recommendation: 'Bütçe duyarlı öneri',
    sla_first_recommendation: 'SLA öncelikli öneri',
    capacity_first_recommendation: 'Kapasite öncelikli öneri',
    compliance_first_recommendation: 'Uygunluk öncelikli öneri',
    alternative_candidate_recommendation: 'Alternatif aday önerisi',
    blocked_offer_recommendation: 'Engellenen öneri isteği',
    approval_packet_request: 'Onay paketi hazırlığı',
    general_recommendation: 'Genel öneri',
  };
  const helperExports = [
    'COPILOT_OFFER_RECOMMENDATION_VERSION',
    'COPILOT_OFFER_RECOMMENDATION_STAGES',
    'COPILOT_OFFER_RECOMMENDATION_CATEGORIES',
    'COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES',
    'COPILOT_OFFER_RECOMMENDATION_INPUT_SUMMARY',
    'COPILOT_OFFER_RECOMMENDATION_CRITERIA_MODEL',
    'COPILOT_OFFER_RECOMMENDATION_SCORECARD_FIELDS',
    'COPILOT_OFFER_RECOMMENDATION_DRAFT_FIELDS',
    'COPILOT_OFFER_RECOMMENDATION_APPROVAL_PACKET_FIELDS',
    'COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS',
    'COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS',
    'COPILOT_OFFER_RECOMMENDATION_NEVER_AUTOMATE',
    'COPILOT_OFFER_RECOMMENDATION_HANOFFS',
    'COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES',
    'COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES',
    'COPILOT_OFFER_RECOMMENDATION_SAFETY_EXAMPLES',
    'COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE',
    'COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP',
    'COPILOT_OFFER_RECOMMENDATION_ROLE_NAMES',
    'COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE',
    'COPILOT_OFFER_RECOMMENDATION_POLICY',
    'detectOfferRecommendationIntent',
    'classifyOfferRecommendationTypes',
    'buildRecommendationInputSummary',
    'buildRecommendationValueSummary',
    'buildRecommendationRiskSummary',
    'buildRecommendationMissingFieldSummary',
    'buildRecommendationAlternativeSummary',
    'buildRecommendationCriteriaModel',
    'buildRecommendationScorecard',
    'buildOfferRecommendationDraft',
    'buildApprovalPacketDraft',
    'buildOfferRecommendationInput',
    'composeOfferRecommendationAnswer',
    'maskOfferRecommendationSensitiveValue',
    'normalizeOfferRecommendationField',
    'listCopilotOfferRecommendationRoles',
    'getCopilotOfferRecommendationPolicy',
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

  const offerCollectionFixture = Object.freeze({
    sourceRfqSummary,
    collectionState: 'received_draft',
    message: 'teklifleri değerlendir',
    offerFixtures: Object.freeze([
      Object.freeze({
        supplierRef: 'supplier-ora-01',
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
        validityUntil: '2026-08-31',
      }),
      Object.freeze({
        supplierRef: 'supplier-ora-02',
        supplierLabel: 'Beta Taşımacılık Ltd.',
        offerPrice: 138000,
        priceScope: 'Aylık tüm servis',
        includedItems: ['şoför', 'yakıt'],
        excludedItems: ['KDV', 'yedek araç'],
        vehicleCapacity: 36,
        vehicleType: 'midibus',
        startAvailability: ['2026-08-03'],
        shiftAvailability: ['06:00-18:00'],
        licenseCompliance: ['SRC3'],
        insuranceSafety: ['Kasko'],
        slaCommitment: '',
        validityUntil: '2026-08-10',
      }),
      Object.freeze({
        supplierRef: 'supplier-ora-03',
        supplierLabel: 'Delta Lojistik A.Ş.',
        offerPrice: 151000,
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
        validityUntil: '2026-09-15',
      }),
      Object.freeze({
        supplierRef: 'supplier-ora-04',
        supplierLabel: 'Gamma Servis A.Ş.',
        blocked: true,
        offerState: 'blocked',
        missingOfferFields: ['teklif detayı'],
        riskNotes: ['blocked by policy'],
      }),
    ]),
  });

  const offerAnalysisInput = offerAnalysis.composeOfferAnalysisAnswer({
    offerCollection: offerCollectionFixture,
    message: 'Teklifleri analiz et',
  });
  const negotiationAssistInput = negotiationAssist.composeNegotiationAssistAnswer({
    offerAnalysis: offerAnalysisInput,
    message: 'Karar destek için pazarlık hazırlığı',
    negotiationTypeHint: 'price_improvement',
  });

  const bestValueRecommendation = offerRecommendation.composeOfferRecommendationAnswer({
    offerAnalysis: offerAnalysisInput,
    negotiationAssist: negotiationAssistInput,
    offerCollection: offerCollectionFixture,
    message: 'Teklif öneri taslağı hazırla',
    recommendationTypeHint: 'best_value_recommendation',
    sourceRfqSummary,
  });
  const lowestRiskRecommendation = offerRecommendation.composeOfferRecommendationAnswer({
    offerAnalysis: offerAnalysisInput,
    negotiationAssist: negotiationAssistInput,
    offerCollection: offerCollectionFixture,
    message: 'en güvenli alternatifi öner',
    recommendationTypeHint: 'lowest_risk_recommendation',
    sourceRfqSummary,
  });
  const approvalPacketRecommendation = offerRecommendation.composeOfferRecommendationAnswer({
    offerAnalysis: offerAnalysisInput,
    negotiationAssist: negotiationAssistInput,
    offerCollection: offerCollectionFixture,
    message: 'onay paketi hazırla',
    recommendationTypeHint: 'approval_packet_request',
    sourceRfqSummary,
  });
  const blockedRecommendation = offerRecommendation.composeOfferRecommendationAnswer({
    offerAnalysis: offerAnalysisInput,
    negotiationAssist: negotiationAssistInput,
    offerCollection: offerCollectionFixture,
    message: 'Teklifi kabul ettim ve mesaj gönderdim.',
    recommendationTypeHint: 'best_value_recommendation',
    sourceRfqSummary,
  });
  const recommendationSamples = [
    bestValueRecommendation,
    lowestRiskRecommendation,
    approvalPacketRecommendation,
    blockedRecommendation,
  ];
  const helperExportNames = Object.keys(offerRecommendation);

  must(pkg, '"check:copilotofferrecommendation01": "node backend/scripts/copilot_offer_recommendation_01_check.js"', 'package.json exposes offer recommendation check');
  ordered(runner, ['check:copilotnegotiationassist01', 'check:copilotofferrecommendation01', 'check:uxmarketplacepanels01'], 'product extensions runner places offer recommendation after negotiation assist');
  ordered(verify, ['check:copilotnegotiationassist01', 'check:copilotofferrecommendation01', 'check:uxmarketplacepanels01'], 'verify chain places offer recommendation after negotiation assist');

  must(guide, 'COPILOT-OFFER-RECOMMENDATION-01', 'script guide mentions offer recommendation milestone');
  must(guide, 'check:copilotofferrecommendation01', 'script guide exposes offer recommendation check');
  must(guide, 'node backend\\scripts\\copilot_offer_recommendation_01_check.js', 'script guide includes offer recommendation command');
  must(guide, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'script guide includes offer recommendation doc');
  must(guide, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'script guide includes offer recommendation helper');
  ordered(guide, ['COPILOT-OFFER-ANALYSIS-01', 'COPILOT-NEGOTIATION-ASSIST-01', 'COPILOT-OFFER-RECOMMENDATION-01', 'COPILOT-HUMAN-APPROVAL-01'], 'script guide keeps offer recommendation after negotiation assist and before human approval');

  must(primer, 'COPILOT-OFFER-RECOMMENDATION-01', 'primer mentions offer recommendation milestone');
  must(primer, 'check:copilotofferrecommendation01', 'primer exposes offer recommendation check');
  must(primer, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'primer links offer recommendation doc');
  ordered(primer, ['COPILOT-OFFER-ANALYSIS-01', 'COPILOT-NEGOTIATION-ASSIST-01', 'COPILOT-OFFER-RECOMMENDATION-01', 'COPILOT-HUMAN-APPROVAL-01'], 'primer keeps offer recommendation after negotiation assist and before human approval');

  must(roadmap, 'COPILOT-OFFER-RECOMMENDATION-01', 'roadmap keeps offer recommendation milestone');
  must(roadmap, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'roadmap links offer recommendation doc');
  ordered(roadmap, ['COPILOT-OFFER-ANALYSIS-01', 'COPILOT-NEGOTIATION-ASSIST-01', 'COPILOT-OFFER-RECOMMENDATION-01'], 'roadmap keeps offer recommendation after negotiation assist');

  must(doc, '# COPILOT OFFER RECOMMENDATION 01', 'offer recommendation doc title present');
  must(doc, 'Canonical check: `check:copilotofferrecommendation01`', 'offer recommendation doc keeps canonical check wording');
  must(doc, 'docs/check milestone', 'offer recommendation doc keeps docs/check wording');
  ordered(doc, [
    '## 1) Amaç',
    '## 2) Kanonik akış',
    '## 3) Supported recommendation types',
    '## 4) Recommendation input summary',
    '## 5) Criteria model',
    '## 6) Scorecard output model',
    '## 7) Recommendation draft policy',
    '## 8) Approval packet draft',
    '## 9) Safety / boundary',
    '## 10) Türkçe visible answer',
    '## 11) Static helper',
    '## 12) What is not changed',
    '## 13) Validation results',
    '## 14) Remaining risks',
    '## 15) Next recommended milestone',
  ], 'offer recommendation doc keeps section order');
  must(doc, 'Source offer analysis handoff', 'offer recommendation doc keeps source offer analysis handoff wording');
  must(doc, 'Source negotiation assist handoff', 'offer recommendation doc keeps source negotiation assist handoff wording');
  must(doc, 'Source RFQ prep handoff', 'offer recommendation doc keeps RFQ prep handoff wording');
  must(doc, 'Approval packet draft', 'offer recommendation doc keeps approval packet wording');
  must(doc, 'No route / service / prisma diff.', 'offer recommendation doc keeps prisma boundary wording');
  must(doc, 'No production DB.', 'offer recommendation doc keeps production DB wording');
  must(doc, 'No destructive query.', 'offer recommendation doc keeps destructive query wording');
  must(doc, 'No browser / public probe.', 'offer recommendation doc keeps browser boundary wording');
  must(doc, 'No write-action.', 'offer recommendation doc keeps write-action boundary wording');
  must(doc, 'No message / email / SMS / push.', 'offer recommendation doc keeps messaging boundary wording');
  must(doc, 'No supplier selection.', 'offer recommendation doc keeps supplier selection boundary wording');
  must(doc, 'No offer accept / reject.', 'offer recommendation doc keeps offer accept/reject boundary wording');
  must(doc, 'No agreement / contract execute.', 'offer recommendation doc keeps agreement boundary wording');
  must(doc, 'No dispatch apply.', 'offer recommendation doc keeps dispatch boundary wording');
  must(doc, 'No route apply.', 'offer recommendation doc keeps route boundary wording');
  must(doc, 'No payment / hakediş execute.', 'offer recommendation doc keeps payment boundary wording');
  must(doc, 'No provider credential management.', 'offer recommendation doc keeps provider credential boundary wording');
  must(doc, 'PASS COPILOT-OFFER-RECOMMENDATION-01', 'offer recommendation doc keeps pass marker');

  must(harnessCheck, 'check:copilotofferrecommendation01', 'script harness check knows offer recommendation alias');
  must(harnessCheck, 'copilot_offer_recommendation_01_check.js', 'script harness check knows offer recommendation file');
  must(harnessCheck, 'COPILOT-OFFER-RECOMMENDATION-01', 'script harness check knows offer recommendation milestone');
  must(harnessCheck, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'script harness check knows offer recommendation doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'script harness check knows offer recommendation helper');

  must(harnessDoc, 'root:check:copilotofferrecommendation01', 'script harness doc lists offer recommendation root check');
  must(harnessDoc, 'copilot_offer_recommendation_01_check.js', 'script harness doc lists offer recommendation check');
  must(harnessDoc, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'script harness doc lists offer recommendation doc');
  must(harnessDoc, 'COPILOT-OFFER-RECOMMENDATION-01', 'script harness doc lists offer recommendation milestone');
  must(harnessDoc, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'script harness doc lists offer recommendation helper');

  must(routeReviewCheck, 'backend/scripts/copilot_offer_recommendation_01_check.js', 'route review allowlist mentions offer recommendation check');
  must(routeReviewCheck, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'route review allowlist mentions offer recommendation helper');
  must(routeReviewCheck, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'route review allowlist mentions offer recommendation doc');
  must(excelRedteamCheck, 'backend/scripts/copilot_offer_recommendation_01_check.js', 'excel route readiness allowlist mentions offer recommendation check');
  must(excelRedteamCheck, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'excel route readiness allowlist mentions offer recommendation helper');
  must(excelRedteamCheck, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'excel route readiness allowlist mentions offer recommendation doc');
  must(roleRedteamCheck, 'backend/scripts/copilot_offer_recommendation_01_check.js', 'role redteam allowlist mentions offer recommendation check');
  must(roleRedteamCheck, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'role redteam allowlist mentions offer recommendation helper');
  must(roleRedteamCheck, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'role redteam allowlist mentions offer recommendation doc');
  must(securityFinalCheck, 'backend/scripts/copilot_offer_recommendation_01_check.js', 'security allowlist mentions offer recommendation check');
  must(securityFinalCheck, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'security allowlist mentions offer recommendation helper');
  must(securityFinalCheck, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'security allowlist mentions offer recommendation doc');
  must(auditTraceCheck, 'backend/scripts/copilot_offer_recommendation_01_check.js', 'audit trace allowlist mentions offer recommendation check');
  must(auditTraceCheck, 'backend/src/ai/chat/copilotOfferRecommendation.js', 'audit trace allowlist mentions offer recommendation helper');
  must(auditTraceCheck, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md', 'audit trace allowlist mentions offer recommendation doc');
  mustCondition(helperExportNames.length >= helperExports.length, 'offer recommendation helper export catalog is captured');
  mustEach(helperExportNames.join(' '), helperExports, 'offer recommendation helper exports');
  mustCondition(recommendationSamples.every(Boolean), 'offer recommendation sample outputs are captured');

  must(helper, "from './copilotOfferAnalysis.js';", 'helper imports offer analysis helper');
  must(helper, "from './copilotNegotiationAssist.js';", 'helper imports negotiation assist helper');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_VERSION', 'helper exports version marker');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_STAGES', 'helper exports stages');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_CATEGORIES', 'helper exports categories');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_SUPPORTED_TYPES', 'helper exports supported types');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_INPUT_SUMMARY', 'helper exports input summary');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_CRITERIA_MODEL', 'helper exports criteria model');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_SCORECARD_FIELDS', 'helper exports scorecard fields');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_DRAFT_FIELDS', 'helper exports draft fields');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_APPROVAL_PACKET_FIELDS', 'helper exports approval packet fields');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_BOUNDARY_FLAGS', 'helper exports boundary flags');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_BLOCKED_ACTIONS', 'helper exports blocked actions');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_NEVER_AUTOMATE', 'helper exports never automate');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_HANOFFS', 'helper exports handoffs');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES', 'helper exports Turkish visible phrases');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES', 'helper exports blocked phrases');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_SAFETY_EXAMPLES', 'helper exports safety examples');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE', 'helper exports execution state');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP', 'helper exports next safe step');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_ROLE_NAMES', 'helper exports role names');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE', 'helper exports public promise');
  must(helper, 'COPILOT_OFFER_RECOMMENDATION_POLICY', 'helper exports policy');
  must(helper, 'detectOfferRecommendationIntent', 'helper exports intent detector');
  must(helper, 'classifyOfferRecommendationTypes', 'helper exports type classifier');
  must(helper, 'buildRecommendationInputSummary', 'helper exports input summary builder');
  must(helper, 'buildRecommendationValueSummary', 'helper exports value summary builder');
  must(helper, 'buildRecommendationRiskSummary', 'helper exports risk summary builder');
  must(helper, 'buildRecommendationMissingFieldSummary', 'helper exports missing field summary builder');
  must(helper, 'buildRecommendationAlternativeSummary', 'helper exports alternative summary builder');
  must(helper, 'buildRecommendationCriteriaModel', 'helper exports criteria model builder');
  must(helper, 'buildRecommendationScorecard', 'helper exports scorecard builder');
  must(helper, 'buildOfferRecommendationDraft', 'helper exports draft builder');
  must(helper, 'buildApprovalPacketDraft', 'helper exports approval packet builder');
  must(helper, 'buildOfferRecommendationInput', 'helper exports input builder');
  must(helper, 'composeOfferRecommendationAnswer', 'helper exports answer composer');
  must(helper, 'maskOfferRecommendationSensitiveValue', 'helper exports masker');
  must(helper, 'normalizeOfferRecommendationField', 'helper exports normalizer');
  must(helper, 'listCopilotOfferRecommendationRoles', 'helper exports role lister');
  must(helper, 'getCopilotOfferRecommendationPolicy', 'helper exports policy getter');
  must(helper, 'buildCopilotOfferRecommendationRole', 'helper exports role builder');

  ordered(helper, requiredStages, 'helper keeps stage ordering');
  mustEach(helper, requiredCategories, 'helper categories');
  mustEach(helper, requiredSupportedTypes, 'helper supported types');
  mustEach(helper, requiredInputSummary, 'helper input summary');
  mustEach(helper, requiredCriteriaModel, 'helper criteria model');
  mustEach(helper, requiredScorecardFields, 'helper scorecard fields');
  mustEach(helper, requiredDraftFields, 'helper draft fields');
  mustEach(helper, requiredApprovalPacketFields, 'helper approval packet fields');
  mustEach(helper, requiredBoundaryFlags, 'helper boundary flags');
  mustEach(helper, requiredBlockedActions, 'helper blocked actions');
  mustEach(helper, requiredNeverAutomate, 'helper never automate phrases');
  mustEach(helper, requiredHandoffs, 'helper handoffs');
  mustEach(helper, requiredVisiblePhrases, 'helper visible phrases');
  mustEach(helper, requiredBlockedPhrases, 'helper blocked phrases');
  mustEach(helper, requiredSafetyExamples, 'helper safety examples');
  mustEach(helper, requiredRoleNames, 'helper role names');
  mustEach(helper, requiredPublicPromise, 'helper public promise');

  mustCondition(offerRecommendation.COPILOT_OFFER_RECOMMENDATION_VERSION === 'COPILOT-OFFER-RECOMMENDATION-01', 'helper version constant matches milestone');
  mustCondition(offerRecommendation.COPILOT_OFFER_RECOMMENDATION_EXECUTION_STATE.includes('draft_only'), 'helper keeps draft only execution state');
  mustCondition(offerRecommendation.COPILOT_OFFER_RECOMMENDATION_NEXT_SAFE_STEP.length > 0, 'helper keeps next safe step');
  mustCondition(fs.readFileSync(path.join(root, 'backend/src/ai/chat/copilotOfferRecommendation.js'), 'utf8').split(/\r?\n/).length < 1000, 'helper line count stays under 1000');
  mustCondition(fs.readFileSync(path.join(root, 'docs/COPILOT_OFFER_RECOMMENDATION_01.md'), 'utf8').includes('PASS COPILOT-OFFER-RECOMMENDATION-01'), 'doc keeps pass marker');

  mustCommandPass(['git', 'diff', '--check'], 'git diff --check is clean');
  mustCommandPass(['git', 'diff', '--cached', '--check'], 'git diff --cached --check is clean');
  mustCommandPass(['git', 'show', '--check', '--stat', 'HEAD'], 'git show --check --stat HEAD is clean');
  mustNoDiff(['backend/src/services', 'prisma'], 'service/prisma diffs stay empty');
  mustCondition(cachedNames.length === 0, 'stage stays empty');
  mustCondition(!fs.existsSync(path.join(root, 'debug.log')), 'debug.log stays absent');

  const inputSummary = offerRecommendation.buildRecommendationInputSummary(offerAnalysisInput, negotiationAssistInput, { sourceRfqSummary });
  mustCondition(inputSummary.summary.includes('rfqType=personel servis'), 'input summary keeps rfq type');
  mustCondition(inputSummary.summary.includes('analysisRows=4'), 'input summary keeps analysis row count');
  mustCondition(inputSummary.summary.includes('opportunityCount=4'), 'input summary keeps opportunity count');
  mustCondition(inputSummary.summary.includes('candidateSuppliersMasked='), 'input summary keeps masked suppliers');
  mustCondition(inputSummary.summary.includes('missingRiskCount='), 'input summary keeps missing/risk count');
  mustCondition(inputSummary.candidateSuppliersMasked.length >= 3, 'input summary exposes candidate labels');

  const criteriaModel = offerRecommendation.buildRecommendationCriteriaModel(offerAnalysisInput, negotiationAssistInput, {
    offerCollection: offerCollectionFixture,
    message: 'Teklif öneri taslağı hazırla',
    recommendationTypeHint: 'best_value_recommendation',
  });
  mustCondition(Array.isArray(criteriaModel), 'criteria model returns array');
  mustCondition(criteriaModel.length === 4, 'criteria model keeps 4 candidates');
  mustCondition(criteriaModel[0].supplierRef === 'supplier-ora-01', 'criteria model keeps strongest supplier first');
  mustCondition(criteriaModel[0].recommendationType === 'best_value_recommendation', 'criteria model keeps forced recommendation type');
  mustCondition(criteriaModel[0].recommendationTypeLabel === 'En iyi değer önerisi', 'criteria model keeps forced recommendation label');
  mustCondition(criteriaModel[0].draftOnly === true, 'criteria model keeps draftOnly flag');
  mustCondition(criteriaModel[0].notAccepted === true, 'criteria model keeps notAccepted flag');
  mustCondition(criteriaModel[0].notRejected === true, 'criteria model keeps notRejected flag');
  mustCondition(criteriaModel[0].notSelected === true, 'criteria model keeps notSelected flag');
  mustCondition(criteriaModel[0].notContacted === true, 'criteria model keeps notContacted flag');
  mustCondition(criteriaModel[0].notSent === true, 'criteria model keeps notSent flag');
  mustCondition(criteriaModel[0].humanReviewRequired === true, 'criteria model keeps human review flag');
  mustCondition(criteriaModel[0].recommendationScore >= criteriaModel[1].recommendationScore, 'criteria model sorts by recommendation score');

  const scorecard = offerRecommendation.buildRecommendationScorecard(criteriaModel, {
    recommendationType: 'best_value_recommendation',
    recommendationTypeLabel: 'En iyi değer önerisi',
  });
  mustCondition(scorecard.topCandidate.supplierRef === 'supplier-ora-01', 'scorecard keeps top candidate');
  mustCondition(scorecard.alternativeCandidates.length === 3, 'scorecard keeps three alternatives');
  mustCondition(scorecard.criteriaSummary.includes('recommendationScore'), 'scorecard keeps criteria summary');
  mustCondition(scorecard.scorecardSummary.includes('Alpha Servis A.Ş.'), 'scorecard keeps scorecard summary');
  mustCondition(scorecard.valueSummary.summary.includes('fiyat, kapsam, SLA, kapasite ve risk dengesi'), 'scorecard keeps value summary');
  mustCondition(scorecard.riskSummary.summary.includes('yüksek /'), 'scorecard keeps risk summary');
  mustCondition(scorecard.missingFieldSummary.summary.includes('eksik alan'), 'scorecard keeps missing field summary');
  mustCondition(scorecard.alternativeSummary.summary.includes('Alternatifler:'), 'scorecard keeps alternative summary');

  const draft = offerRecommendation.buildOfferRecommendationDraft(scorecard, { blockedExecutionRequest: false });
  mustCondition(draft.recommendationType === 'best_value_recommendation', 'draft keeps recommendation type');
  mustCondition(draft.recommendationTypeLabel === 'En iyi değer önerisi', 'draft keeps recommendation label');
  mustCondition(draft.draftTitle.includes('En iyi değer önerisi'), 'draft keeps draft title');
  mustCondition(draft.recommendationDraftSummary.includes('Alpha Servis A.Ş.'), 'draft keeps recommendation summary');
  mustCondition(draft.visibleAnswer.includes('Teklif öneri taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.'), 'draft keeps visible lead sentence');
  mustCondition(draft.visibleAnswer.includes('Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.'), 'draft keeps supplier-selection boundary');
  mustCondition(draft.visibleAnswer.includes('Bu sonuç karar değil, insan onayına sunulacak karar destek taslağıdır.'), 'draft keeps decision-support boundary');
  mustCondition(draft.visibleAnswer.includes('Öne çıkan aday: Alpha Servis A.Ş.'), 'draft keeps top candidate sentence');
  mustCondition(draft.visibleAnswer.includes('Alternatif adaylar:'), 'draft keeps alternatives sentence');
  mustCondition(draft.visibleAnswer.includes('Sıradaki güvenli adım: öneri paketini kontrol edip insan onayına sunmak.'), 'draft keeps next safe step');
  mustCondition(draft.approvalRequired === true, 'draft keeps approvalRequired');
  mustCondition(draft.draftOnly === true, 'draft keeps draftOnly');
  mustCondition(draft.notAccepted === true, 'draft keeps notAccepted');
  mustCondition(draft.notRejected === true, 'draft keeps notRejected');
  mustCondition(draft.notSelected === true, 'draft keeps notSelected');
  mustCondition(draft.notContacted === true, 'draft keeps notContacted');
  mustCondition(draft.notSent === true, 'draft keeps notSent');

  const approvalPacket = offerRecommendation.buildApprovalPacketDraft(draft, scorecard, { blockedExecutionRequest: false });
  mustCondition(approvalPacket.packetTitle.includes('Onay paketi'), 'approval packet keeps packet title');
  mustCondition(approvalPacket.approvalPacketSummary.includes('Alpha Servis A.Ş.'), 'approval packet keeps top candidate');
  mustCondition(approvalPacket.approvalPacketSummary.includes('alternatifler='), 'approval packet keeps alternatives');
  mustCondition(approvalPacket.approvalPacketSummary.includes('risk='), 'approval packet keeps risk summary');
  mustCondition(approvalPacket.approvalPacketSummary.includes('eksik='), 'approval packet keeps missing summary');
  mustCondition(approvalPacket.nextSafeStep === 'teklif öneri paketini kontrol edip insan onayına sunmak', 'approval packet keeps next safe step');
  mustCondition(approvalPacket.approvalRequired === true, 'approval packet keeps approvalRequired');
  mustCondition(approvalPacket.humanReviewRequired === true, 'approval packet keeps humanReviewRequired');

  const composedBestValue = offerRecommendation.composeOfferRecommendationAnswer({
    offerAnalysis: offerAnalysisInput,
    negotiationAssist: negotiationAssistInput,
    offerCollection: offerCollectionFixture,
    message: 'Teklif öneri taslağı hazırla',
    recommendationTypeHint: 'best_value_recommendation',
    sourceRfqSummary,
  });
  mustCondition(composedBestValue.intentType === 'recommendation_draft_request', 'composed answer keeps intent type');
  mustCondition(composedBestValue.recommendationType === 'best_value_recommendation', 'composed answer keeps forced recommendation type');
  mustCondition(composedBestValue.recommendationTypeLabel === 'En iyi değer önerisi', 'composed answer keeps forced label');
  mustCondition(composedBestValue.recommendationIntentSummary.includes('draftOnly=true'), 'composed answer keeps draftOnly');
  mustCondition(composedBestValue.recommendationIntentSummary.includes('notSent=true'), 'composed answer keeps notSent');
  mustCondition(composedBestValue.recommendationIntentSummary.includes('approvalRequired=true'), 'composed answer keeps approvalRequired');
  mustCondition(composedBestValue.recommendationInputSummaryText.includes('rfqType=personel servis'), 'composed answer keeps input summary');
  mustCondition(composedBestValue.recommendationInputSummaryText.includes('analysisRows=4'), 'composed answer keeps analysis row count');
  mustCondition(composedBestValue.recommendationTypeSummary.includes('En iyi değer önerisi'), 'composed answer keeps type summary');
  mustEach(composedBestValue.recommendationTypeSummary, Object.values(supportedTypeLabels), 'composed answer keeps all supported labels');
  mustCondition(composedBestValue.criteriaModel.length === 4, 'composed answer keeps criteria model');
  mustCondition(composedBestValue.scorecard.topCandidate.supplierRef === 'supplier-ora-01', 'composed answer keeps top candidate');
  mustCondition(composedBestValue.recommendationDraft.visibleAnswer.includes('Teklif öneri taslağını hazırladım'), 'composed answer keeps visible answer');
  mustCondition(composedBestValue.approvalPacket.approvalPacketSummary.includes('Alpha Servis A.Ş.'), 'composed answer keeps approval packet');
  mustCondition(composedBestValue.valueSummary.includes('Alpha Servis A.Ş.'), 'composed answer keeps value summary');
  mustCondition(composedBestValue.riskSummary.includes('yüksek /'), 'composed answer keeps risk summary');
  mustCondition(composedBestValue.missingFieldSummary.includes('eksik alan'), 'composed answer keeps missing summary');
  mustCondition(composedBestValue.alternativeSummary.includes('Alternatifler:'), 'composed answer keeps alternative summary');
  mustCondition(composedBestValue.safetyPhraseSummary.includes('draftOnly=true'), 'composed answer keeps safety summary');
  mustCondition(composedBestValue.noWriteActionSummary.includes('supplier selection'), 'composed answer keeps no-write summary');
  mustCondition(composedBestValue.chainWiringSummary.includes('check:copilotofferrecommendation01'), 'composed answer keeps chain wiring summary');
  mustCondition(composedBestValue.smokeThresholdSummary.includes('product-flow PASS 18/0/0/0'), 'composed answer keeps smoke threshold summary');
  mustCondition(composedBestValue.commitExternalSummary.includes('debug.log commit dışı kalır'), 'composed answer keeps commit-external summary');
  mustCondition(composedBestValue.prismaSummary.includes('No route/service/prisma diff'), 'composed answer keeps prisma summary');
  mustCondition(composedBestValue.lineCountSummary.includes('under 1000 lines'), 'composed answer keeps line-count summary');

  const blockedIntent = offerRecommendation.detectOfferRecommendationIntent('Teklifi kabul ettim ve mesaj gönderdim.');
  mustCondition(blockedIntent.intentType === 'execution_blocked_request', 'blocked intent detected');
  mustCondition(blockedIntent.blockedExecutionRequest === true, 'blocked intent keeps blockedExecutionRequest');
  mustCondition(blockedIntent.notSent === true, 'blocked intent keeps notSent');
  mustCondition(blockedIntent.notAccepted === true, 'blocked intent keeps notAccepted');
  mustCondition(blockedIntent.notRejected === true, 'blocked intent keeps notRejected');
  mustCondition(blockedIntent.notSelected === true, 'blocked intent keeps notSelected');

  const blockedAnswer = offerRecommendation.composeOfferRecommendationAnswer({
    offerAnalysis: offerAnalysisInput,
    negotiationAssist: negotiationAssistInput,
    offerCollection: offerCollectionFixture,
    message: 'Teklifi kabul ettim ve mesaj gönderdim.',
    recommendationTypeHint: 'best_value_recommendation',
    sourceRfqSummary,
  });
  mustCondition(blockedAnswer.blockedExecutionRequest === true, 'blocked answer keeps blocked execution flag');
  mustCondition(blockedAnswer.visibleAnswer.includes('Teklif kabul / ret, seçim, contact ve RFQ send isteği engellendi'), 'blocked answer keeps blocked line');
  mustCondition(blockedAnswer.visibleAnswer.includes('Sıradaki güvenli adım: öneri paketini kontrol edip insan onayına sunmak.'), 'blocked answer keeps next safe step');

  for (const type of requiredSupportedTypes) {
    const classified = offerRecommendation.classifyOfferRecommendationTypes({ message: `taslak ${type}`, recommendationTypeHint: type });
    const intent = offerRecommendation.detectOfferRecommendationIntent({ message: `taslak ${type}`, recommendationTypeHint: type });
    const draftResult = offerRecommendation.composeOfferRecommendationAnswer({
      offerAnalysis: offerAnalysisInput,
      negotiationAssist: negotiationAssistInput,
      offerCollection: offerCollectionFixture,
      message: `taslak ${type}`,
      recommendationTypeHint: type,
      sourceRfqSummary,
    });
    mustCondition(classified.length === 1, `classifier keeps single forced type for ${type}`);
    mustCondition(classified[0] === type, `classifier returns forced type ${type}`);
    mustCondition(intent.recommendationType === type, `intent keeps forced recommendation type ${type}`);
    mustCondition(intent.approvalRequired === true, `intent keeps approval flag for ${type}`);
    mustCondition(intent.draftOnly === true, `intent keeps draftOnly flag for ${type}`);
    mustCondition(draftResult.recommendationType === type, `draft keeps forced recommendation type ${type}`);
    mustCondition(draftResult.recommendationTypeSummary.includes(supportedTypeLabels[type]), `draft keeps type wiring for ${type}`);
    mustCondition(draftResult.recommendationDraft.visibleAnswer.includes('Sıradaki güvenli adım: öneri paketini kontrol edip insan onayına sunmak.'), `draft keeps next safe step for ${type}`);
    mustCondition(draftResult.approvalPacket.approvalPacketSummary.length > 0, `draft keeps approval packet for ${type}`);
  }

  for (const role of requiredRoleNames) {
    assertRolePolicy(role, !['DRIVER', 'PERSONEL', 'PARENT'].includes(role));
  }

  mustEach(helper, offerRecommendation.COPILOT_OFFER_RECOMMENDATION_TURKISH_VISIBLE_PHRASES, 'helper visible Turkish phrases');
  mustEach(helper, offerRecommendation.COPILOT_OFFER_RECOMMENDATION_BLOCKED_PHRASES, 'helper blocked Turkish phrases');
  mustEach(helper, offerRecommendation.COPILOT_OFFER_RECOMMENDATION_SAFETY_EXAMPLES, 'helper safety examples');
  mustEach(helper, offerRecommendation.COPILOT_OFFER_RECOMMENDATION_PUBLIC_PROMISE, 'helper public promise');
  mustEach(helper, offerRecommendation.COPILOT_OFFER_RECOMMENDATION_HANOFFS, 'helper handoffs');

  must(offerAnalysisDoc, 'COPILOT-OFFER-RECOMMENDATION-01', 'offer analysis doc keeps recommendation handoff wording');
  must(negotiationAssistDoc, 'COPILOT-OFFER-RECOMMENDATION-01', 'negotiation assist doc keeps recommendation handoff wording');
  must(offerAnalysisHelper, 'COPILOT_OFFER_ANALYSIS_VERSION', 'offer analysis helper still exports version');
  must(negotiationAssistHelper, 'COPILOT_NEGOTIATION_ASSIST_VERSION', 'negotiation assist helper still exports version');

  mustCondition(guardCases >= 220, 'offer recommendation check keeps at least 220 guard cases');
  mustCondition(passCount >= 220, 'offer recommendation check keeps at least 220 passing cases');
  mustCondition(failCount === 0, 'offer recommendation check keeps zero failures');

  console.log('=== COPILOT-OFFER-RECOMMENDATION-01 CHECK PASS ===');
  console.log(`guardCases=${guardCases}, passCount=${passCount}, failCount=${failCount}`);
}

Promise.resolve(main()).catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
  console.log(`guardCases=${guardCases}, passCount=${passCount}, failCount=${failCount}`);
});
