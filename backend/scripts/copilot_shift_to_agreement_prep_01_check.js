#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as shiftToAgreementPrep from '../src/ai/chat/copilotShiftToAgreementPrep.js';

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
  const policy = shiftToAgreementPrep.getCopilotShiftToAgreementPrepPolicy(role);
  mustCondition(Boolean(policy), `policy exists for ${role}`);
  mustCondition(policy.role === role, `policy role matches ${role}`);
  mustCondition(policy.visible === expectedVisible, `policy visibility matches ${role}`);
  mustCondition(Array.isArray(policy.READ), `${role} policy READ is array`);
  mustCondition(Array.isArray(policy.EXPLAIN), `${role} policy EXPLAIN is array`);
  mustCondition(Array.isArray(policy.RECOMMEND), `${role} policy RECOMMEND is array`);
  mustCondition(Array.isArray(policy.PREPARE), `${role} policy PREPARE is array`);
  mustCondition(Array.isArray(policy.DRAFT), `${role} policy DRAFT is array`);
  mustCondition(Array.isArray(policy.RISK_SUMMARY), `${role} policy RISK_SUMMARY is array`);
  mustCondition(Array.isArray(policy.NEXT_STEP), `${role} policy NEXT_STEP is array`);
  mustCondition(Array.isArray(policy.HUMAN_APPROVAL_REQUIRED), `${role} policy HUMAN_APPROVAL_REQUIRED is array`);
  mustCondition(Array.isArray(policy.BLOCKED_RUNTIME_ACTION), `${role} policy BLOCKED_RUNTIME_ACTION is array`);
  mustCondition(Array.isArray(policy.NEVER_AUTOMATE), `${role} policy NEVER_AUTOMATE is array`);
  mustCondition(Array.isArray(policy.TURKISH_VISIBLE_PHRASES), `${role} policy TURKISH_VISIBLE_PHRASES is array`);
  mustCondition(Array.isArray(policy.BLOCKED_PHRASES), `${role} policy BLOCKED_PHRASES is array`);
  mustCondition(Array.isArray(policy.HANOFFS), `${role} policy HANOFFS is array`);
  mustCondition(Array.isArray(policy.PUBLIC_PROMISE), `${role} policy PUBLIC_PROMISE is array`);
  mustCondition(Array.isArray(policy.PII_KVKK_SAFE_HANDLING), `${role} policy PII_KVKK_SAFE_HANDLING is array`);
  mustCondition(Array.isArray(policy.BOUNDARY_FLAGS), `${role} policy BOUNDARY_FLAGS is array`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS, `${role} policy keeps blocked action`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_NEVER_AUTOMATE, `${role} policy keeps never-automate phrase`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES, `${role} policy keeps visible phrase`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_PHRASES, `${role} policy keeps blocked phrase`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_HANOFFS, `${role} policy keeps handoff`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE, `${role} policy keeps public promise`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_PII_KVKK_SAFE_HANDLING, `${role} policy keeps PII/KVKK safe handling`);
  mustEach(JSON.stringify(policy), shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS, `${role} policy keeps boundary flag`);
}

async function main() {
  console.log('=== COPILOT-SHIFT-TO-AGREEMENT-PREP-01 CHECK ===');

  const scriptText = read('backend/scripts/copilot_shift_to_agreement_prep_01_check.js');
  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const demandToAgreementDoc = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const offerRecommendationDoc = read('docs/COPILOT_OFFER_RECOMMENDATION_01.md');
  const humanApprovalDoc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const doc = read('docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md');
  const helper = read('backend/src/ai/chat/copilotShiftToAgreementPrep.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');

  const stageTitles = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_STAGES.map((stage) => stage.title);
  const categories = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_CATEGORIES;
  const supportedTypes = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_SUPPORTED_TYPES;
  const inputSummary = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_INPUT_SUMMARY;
  const fieldMappingModel = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_FIELD_MAPPING_MODEL;
  const readinessScorecardFields = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_READINESS_SCORECARD_FIELDS;
  const packetFields = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_PACKET_DRAFT_FIELDS;
  const missingFieldSummary = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_MISSING_FIELD_SUMMARY;
  const riskSummary = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_RISK_SUMMARY;
  const questionSet = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_QUESTION_SET;
  const safeNextStepDraft = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_SAFE_NEXT_STEP_DRAFT;
  const boundaryFlags = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS;
  const blockedActions = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS;
  const neverAutomate = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_NEVER_AUTOMATE;
  const turkishVisible = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES;
  const blockedPhrases = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_PHRASES;
  const safetyExamples = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_SAFETY_EXAMPLES;
  const handoffs = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_HANOFFS;
  const publicPromise = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE;
  const roleNames = shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_ROLE_NAMES;
  const sampleInput = Object.freeze({
    sourceRecommendationSummary: 'Offer recommendation ready for agreement prep',
    sourceNegotiationSummary: 'Negotiation assist shows remaining clarifications',
    sourceOfferAnalysisSummary: 'Offer analysis highlights commercial and privacy risks',
    supplierRef: 'supplier-7788-01',
    supplierLabel: 'Akdeniz Servis A.Ş.',
    contactName: 'Ayse Yilmaz',
    contactEmail: 'ayse.yilmaz@example.com',
    contactPhone: '05551234567',
    contactAddress: 'Ataturk Mah. No: 12',
    agreementType: 'hizmet sozlesmesi',
    agreementScope: 'personel servisi agreement prep',
    serviceScope: 'Gebze-Tuzla personel servisi',
    region: 'Kocaeli',
    province: 'Kocaeli',
    district: 'Gebze',
    startDate: '2026-08-01',
    validityPeriod: '12 ay',
    pricingSummary: 'aylik sabit bedel',
    billingSummary: 'aylik fatura',
    slaSummary: 'zamaninda hizmet ve guvenlik',
    legalTermsSummary: 'imza oncesi kontrol',
    complianceSummary: 'KVKK ve izin kontrolu',
    privacySummary: 'kisisel veri minimizasyonu',
    missingFields: ['agreement signature', 'privacy mask', 'pricing summary', 'start date', 'service scope', 'contact email'],
    missingOptionalFields: ['backup contact'],
    missingApprovalFields: ['signing authority'],
    riskSignals: ['privacy exposure from raw contact', 'approval gap', 'timing risk'],
    questionSeed: ['Hangi imza yetkilisi onaylar?'],
  });

  const helperLineCount = helper.split(/\r?\n/).length;
  const docLineCount = doc.split(/\r?\n/).length;
  const scriptLineCount = scriptText.split(/\r?\n/).length;

  mustCondition(scriptLineCount < 1000, 'check script under 1000 lines');
  mustCondition(helperLineCount < 1000, 'helper under 1000 lines');
  mustCondition(docLineCount < 1000, 'doc under 1000 lines');

  must(pkg, '"check:copilotshifttoagreementprep01": "node backend/scripts/copilot_shift_to_agreement_prep_01_check.js"', 'package.json exposes shift-to-agreement prep check');
  ordered(runner, ['check:copilotofferrecommendation01', 'check:copilotshifttoagreementprep01', 'check:uxmarketplacepanels01'], 'product extensions runner places shift-to-agreement prep after offer recommendation');
  ordered(verify, ['check:copilotofferrecommendation01', 'check:copilotshifttoagreementprep01', 'check:uxmarketplacepanels01'], 'verify chain places shift-to-agreement prep after offer recommendation');

  must(guide, 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'milestone guide mentions shift-to-agreement prep milestone');
  must(guide, 'check:copilotshifttoagreementprep01', 'milestone guide exposes shift-to-agreement prep check');
  must(guide, 'node backend\\scripts\\copilot_shift_to_agreement_prep_01_check.js', 'milestone guide includes shift-to-agreement prep command');
  must(guide, 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md', 'milestone guide includes shift-to-agreement prep doc');
  ordered(guide, ['COPILOT-OFFER-RECOMMENDATION-01', 'COPILOT-HUMAN-APPROVAL-01', 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01'], 'milestone guide keeps shift-to-agreement prep after human approval');

  must(primer, 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'primer mentions shift-to-agreement prep milestone');
  must(primer, 'check:copilotshifttoagreementprep01', 'primer exposes shift-to-agreement prep check');
  must(primer, 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md', 'primer links shift-to-agreement prep doc');
  ordered(primer, ['COPILOT-OFFER-RECOMMENDATION-01', 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01'], 'primer keeps shift-to-agreement prep before dispatch');

  must(roadmap, 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'roadmap keeps shift-to-agreement prep milestone');
  must(roadmap, 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md', 'roadmap links shift-to-agreement prep doc');
  ordered(roadmap, ['COPILOT-OFFER-ANALYSIS-01', 'COPILOT-NEGOTIATION-ASSIST-01', 'COPILOT-OFFER-RECOMMENDATION-01', 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01'], 'roadmap keeps shift-to-agreement prep between recommendation and dispatch');

  must(demandToAgreementDoc, 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'demand-to-agreement roadmap references shift-to-agreement prep milestone');
  must(demandToAgreementDoc, 'Agreement Prep', 'demand-to-agreement roadmap keeps agreement prep stage');
  must(demandToAgreementDoc, 'No agreement/contract execute yok.', 'demand-to-agreement roadmap keeps agreement execute boundary');

  must(offerRecommendationDoc, 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'offer recommendation doc references shift-to-agreement prep milestone');
  must(humanApprovalDoc, 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'human approval doc references shift-to-agreement prep milestone');

  must(doc, '# COPILOT SHIFT TO AGREEMENT PREP 01', 'shift doc title present');
  must(doc, 'docs/check milestone', 'shift doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotshifttoagreementprep01`', 'shift doc keeps canonical check wording');
  ordered(doc, stageTitles, 'shift doc keeps stage ordering');
  for (const category of categories) {
    must(doc, category, `shift doc includes category ${category}`);
  }
  must(doc, 'Static helper', 'shift doc keeps static helper section');
  must(doc, 'Kapsam dışı', 'shift doc keeps out-of-scope section');
  must(doc, 'No agreement / contract create.', 'shift doc keeps agreement create boundary');
  must(doc, 'No supplier contact.', 'shift doc keeps supplier contact boundary');
  must(doc, 'No RFQ send.', 'shift doc keeps RFQ boundary');
  must(doc, 'No offer accept/reject.', 'shift doc keeps offer accept/reject boundary');
  must(doc, 'No DB write.', 'shift doc keeps DB boundary');
  must(doc, 'No audit event write.', 'shift doc keeps audit boundary');
  must(doc, 'No route/service/prisma/backend.prisma diff.', 'shift doc keeps diff boundary');
  must(doc, 'No route/service/prisma/backend/prisma diff.', 'shift doc keeps backend prisma diff boundary');
  must(doc, 'No write-action.', 'shift doc keeps write-action boundary');
  must(doc, 'No execution.', 'shift doc keeps execution boundary');
  must(doc, 'PII / KVKK safe handling', 'shift doc keeps PII/KVKK section');
  must(doc, 'minimum necessary data only', 'shift doc keeps minimum necessary data wording');
  must(doc, 'masked contact details', 'shift doc keeps masked contact wording');
  must(doc, 'no cross-organization leakage', 'shift doc keeps cross-org wording');
  must(doc, 'Sözleşme ön hazırlığını hazırladım; henüz hiçbir sözleşme oluşturulmadı, onaylanmadı veya yürütülmedi.', 'shift doc keeps Turkish visible answer');
  must(doc, 'Sıradaki güvenli adım: sözleşme taslağını kontrol edip insan onayına sunmak.', 'shift doc keeps Turkish next step');
  must(doc, 'PASS COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'shift doc keeps validation result');
  must(doc, 'backend/src/ai/chat/copilotShiftToAgreementPrep.js', 'shift doc links static helper');
  must(doc, 'No route / service / prisma diff.', 'shift doc keeps route/service/prisma boundary');
  must(doc, 'No backend/prisma diff.', 'shift doc keeps backend prisma boundary');

  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_SUPPORTED_TYPES', 'helper exposes supported types');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_INPUT_SUMMARY', 'helper exposes input summary');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_FIELD_MAPPING_MODEL', 'helper exposes field mapping model');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_READINESS_SCORECARD_FIELDS', 'helper exposes readiness scorecard fields');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_PACKET_DRAFT_FIELDS', 'helper exposes packet draft fields');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_MISSING_FIELD_SUMMARY', 'helper exposes missing field summary');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_RISK_SUMMARY', 'helper exposes risk summary');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_QUESTION_SET', 'helper exposes question set');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_SAFE_NEXT_STEP_DRAFT', 'helper exposes safe next-step draft');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_BOUNDARY_FLAGS', 'helper exposes boundary flags');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_TURKISH_VISIBLE_PHRASES', 'helper exposes visible phrases');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_BLOCKED_PHRASES', 'helper exposes blocked phrases');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_SAFETY_EXAMPLES', 'helper exposes safety examples');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_ROLE_NAMES', 'helper exposes role names');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_EXECUTION_STATE', 'helper exposes execution state');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_NEXT_SAFE_STEP', 'helper exposes next safe step');
  must(helper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_PII_KVKK_SAFE_HANDLING', 'helper exposes PII/KVKK safe handling');
  must(helper, 'buildShiftToAgreementPrepInput', 'helper exposes build input');
  must(helper, 'buildAgreementFieldMappingModel', 'helper exposes field mapping builder');
  must(helper, 'buildAgreementReadinessScorecard', 'helper exposes readiness scorecard builder');
  must(helper, 'buildAgreementPrepPacketDraft', 'helper exposes packet draft builder');
  must(helper, 'buildAgreementMissingFieldSummary', 'helper exposes missing field summary builder');
  must(helper, 'buildAgreementRiskSummary', 'helper exposes risk summary builder');
  must(helper, 'buildAgreementQuestionSet', 'helper exposes question set builder');
  must(helper, 'buildSafeNextStepDraft', 'helper exposes safe next-step builder');
  must(helper, 'buildShiftToAgreementPrepPack', 'helper exposes pack builder');
  must(helper, 'composeShiftToAgreementPrepAnswer', 'helper exposes compose answer');
  must(helper, 'maskShiftToAgreementSensitiveValue', 'helper exposes masking helper');
  must(helper, 'normalizeShiftToAgreementField', 'helper exposes normalization helper');
  must(helper, 'detectShiftToAgreementPrepIntent', 'helper exposes intent detector');
  must(helper, 'buildShiftToAgreementPrepRole', 'helper exposes role builder');
  must(helper, 'listCopilotShiftToAgreementPrepRoles', 'helper exposes role list helper');
  must(helper, 'getCopilotShiftToAgreementPrepPolicy', 'helper exposes policy getter');
  mustEach(helper, stageTitles, 'helper keeps stage titles');
  mustEach(helper, categories, 'helper keeps categories');
  mustEach(helper, supportedTypes, 'helper keeps supported types');
  mustEach(helper, inputSummary, 'helper keeps input summary');
  mustEach(helper, fieldMappingModel, 'helper keeps field mapping model');
  mustEach(helper, readinessScorecardFields, 'helper keeps readiness scorecard field');
  mustEach(helper, packetFields, 'helper keeps packet draft field');
  mustEach(helper, missingFieldSummary, 'helper keeps missing field summary');
  mustEach(helper, riskSummary, 'helper keeps risk summary');
  mustEach(helper, questionSet, 'helper keeps question set');
  mustEach(helper, safeNextStepDraft, 'helper keeps safe next-step draft');
  mustEach(helper, boundaryFlags, 'helper keeps boundary flag');
  mustEach(helper, blockedActions, 'helper keeps blocked action');
  mustEach(helper, neverAutomate, 'helper keeps never-automate phrase');
  mustEach(helper, turkishVisible, 'helper keeps visible phrase');
  mustEach(helper, blockedPhrases, 'helper keeps blocked phrase');
  mustEach(helper, safetyExamples, 'helper keeps safety example');
  mustEach(helper, handoffs, 'helper keeps handoff');
  mustEach(helper, publicPromise, 'helper keeps public promise');
  mustEach(helper, roleNames, 'helper keeps role name');

  const helperInput = shiftToAgreementPrep.buildShiftToAgreementPrepInput(sampleInput);
  mustCondition(helperInput.piiMasked === true, 'helper input keeps PII mask');
  mustCondition(helperInput.kvkkSafe === true, 'helper input keeps KVKK safe');
  mustCondition(helperInput.draftOnly === true, 'helper input keeps draftOnly');
  mustCondition(helperInput.humanApprovalRequired === true, 'helper input keeps human approval');
  mustCondition(helperInput.executionState === shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_EXECUTION_STATE, 'helper input keeps execution state');
  mustCondition(helperInput.nextSafeStep === shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_NEXT_SAFE_STEP, 'helper input keeps next safe step');
  mustCondition(Array.isArray(helperInput.contactSummary), 'helper input contact summary is array');
  mustCondition(helperInput.contactSummary.length >= 4, 'helper input contact summary keeps all masked contacts');
  must(helperInput.contactSummary.join(' '), 'ay***@example.com', 'helper input masks email');
  must(helperInput.contactSummary.join(' '), '05***67', 'helper input masks phone');

  const mappingModel = shiftToAgreementPrep.buildAgreementFieldMappingModel(helperInput);
  mustCondition(Array.isArray(mappingModel), 'mapping model is array');
  mustCondition(mappingModel.length >= 20, 'mapping model has enough rows');
  for (const row of mappingModel) {
    mustCondition(typeof row.source === 'string' && row.source.length > 0, `mapping row source is string for ${row.target}`);
    mustCondition(typeof row.target === 'string' && row.target.length > 0, `mapping row target is string for ${row.source}`);
    mustCondition(typeof row.notes === 'string' && row.notes.length > 0, `mapping row notes are string for ${row.source}`);
    mustCondition(typeof row.privacy === 'string' && row.privacy.length > 0, `mapping row privacy is string for ${row.source}`);
    mustCondition(typeof row.required === 'boolean', `mapping row required is boolean for ${row.source}`);
    mustCondition(typeof row.sourceSnapshot === 'string', `mapping row source snapshot is string for ${row.source}`);
  }

  const missingSummary = shiftToAgreementPrep.buildAgreementMissingFieldSummary(helperInput);
  mustCondition(missingSummary.cannotProceedYet === true, 'missing summary marks cannot proceed');
  mustCondition(Array.isArray(missingSummary.missingRequiredFields), 'missing summary required list is array');
  mustCondition(missingSummary.missingRequiredFields.length >= 6, 'missing summary keeps required fields');
  mustCondition(missingSummary.missingLegalFields.length >= 1, 'missing summary categorizes legal fields');
  mustCondition(missingSummary.missingPrivacyFields.length >= 1, 'missing summary categorizes privacy fields');
  mustCondition(missingSummary.missingPricingFields.length >= 1, 'missing summary categorizes pricing fields');
  mustCondition(missingSummary.missingTimingFields.length >= 1, 'missing summary categorizes timing fields');
  mustCondition(missingSummary.missingOperationalFields.length >= 1, 'missing summary categorizes operational fields');
  for (const field of sampleInput.missingFields) {
    must(missingSummary.missingRequiredFields.join(' '), field, `missing summary includes required field ${field}`);
    must(missingSummary.nextDataToGather.join(' '), field, `missing summary next data includes ${field}`);
  }

  const riskSummaryPack = shiftToAgreementPrep.buildAgreementRiskSummary(helperInput);
  mustCondition(Array.isArray(riskSummaryPack.rows), 'risk summary rows are array');
  mustCondition(riskSummaryPack.rows.length >= 4, 'risk summary keeps enough rows');
  mustCondition(riskSummaryPack.highestSeverity === 'high', 'risk summary marks high severity');
  mustCondition(riskSummaryPack.kvkkImpact === true, 'risk summary keeps kvkk impact');
  for (const row of riskSummaryPack.rows) {
    mustCondition(typeof row.riskType === 'string' && row.riskType.length > 0, `risk row type present for ${row.riskDetail}`);
    mustCondition(typeof row.riskDetail === 'string' && row.riskDetail.length > 0, `risk row detail present for ${row.riskType}`);
    mustCondition(typeof row.severity === 'string' && row.severity.length > 0, `risk row severity present for ${row.riskDetail}`);
    mustCondition(typeof row.impact === 'string' && row.impact.length > 0, `risk row impact present for ${row.riskDetail}`);
    mustCondition(typeof row.mitigation === 'string' && row.mitigation.length > 0, `risk row mitigation present for ${row.riskDetail}`);
    mustCondition(row.humanReviewRequired === true, `risk row human review required for ${row.riskDetail}`);
  }

  const questionSetPack = shiftToAgreementPrep.buildAgreementQuestionSet(helperInput);
  mustCondition(Array.isArray(questionSetPack), 'question set is array');
  mustCondition(questionSetPack.length >= 4, 'question set keeps enough rows');
  for (const row of questionSetPack) {
    mustCondition(typeof row.question === 'string' && row.question.length > 0, `question row question present for ${row.nextSafeStepCue}`);
    mustCondition(typeof row.whyNeeded === 'string' && row.whyNeeded.length > 0, `question row why-needed present for ${row.question}`);
    mustCondition(row.blockingIfUnanswered === true, `question row blocking flag present for ${row.question}`);
    mustCondition(row.maskRequirement === true, `question row mask requirement present for ${row.question}`);
    mustCondition(row.humanApprovalCue === true, `question row human approval cue present for ${row.question}`);
  }

  const readinessScorecard = shiftToAgreementPrep.buildAgreementReadinessScorecard(helperInput);
  mustCondition(typeof readinessScorecard.readinessScore === 'number', 'readiness score is number');
  mustCondition(readinessScorecard.scoreBand === 'blocked' || readinessScorecard.scoreBand === 'needs_review' || readinessScorecard.scoreBand === 'ready_for_human_review', 'readiness score band is valid');
  mustCondition(Array.isArray(readinessScorecard.rows), 'readiness scorecard rows are array');
  mustCondition(readinessScorecard.rows.length >= 6, 'readiness scorecard keeps enough rows');
  for (const row of readinessScorecard.rows) {
    mustCondition(typeof row.dimension === 'string' && row.dimension.length > 0, `scorecard row dimension present for ${row.status}`);
    mustCondition(typeof row.score === 'number', `scorecard row score present for ${row.dimension}`);
    mustCondition(typeof row.status === 'string' && row.status.length > 0, `scorecard row status present for ${row.dimension}`);
    mustCondition(typeof row.note === 'string' && row.note.length > 0, `scorecard row note present for ${row.dimension}`);
  }
  mustCondition(readinessScorecard.humanApprovalRequired === true, 'readiness scorecard keeps human approval');
  mustCondition(typeof readinessScorecard.nextSafeStep === 'string' && readinessScorecard.nextSafeStep.length > 0, 'readiness scorecard keeps next safe step');

  const safeNextStep = shiftToAgreementPrep.buildSafeNextStepDraft(helperInput);
  mustCondition(safeNextStep.humanApprovalRequired === true, 'safe next step keeps human approval');
  mustCondition(safeNextStep.draftOnly === true, 'safe next step keeps draftOnly');
  mustCondition(safeNextStep.notCreated === true, 'safe next step keeps notCreated');
  mustCondition(safeNextStep.notExecuted === true, 'safe next step keeps notExecuted');
  mustCondition(typeof safeNextStep.title === 'string' && safeNextStep.title.length > 0, 'safe next step keeps title');
  mustCondition(Array.isArray(safeNextStep.whatToDo), 'safe next step whatToDo is array');
  mustCondition(Array.isArray(safeNextStep.whatNotToDo), 'safe next step whatNotToDo is array');
  must(safeNextStep.whatNotToDo.join(' '), 'write-action', 'safe next step blocks write-action');

  const packetDraft = shiftToAgreementPrep.buildAgreementPrepPacketDraft(helperInput);
  mustCondition(typeof packetDraft.draftTitle === 'string' && packetDraft.draftTitle.length > 0, 'packet draft keeps title');
  mustCondition(Array.isArray(packetDraft.boundaryFlags), 'packet draft keeps boundary flags');
  mustCondition(packetDraft.boundaryFlags.length >= boundaryFlags.length, 'packet draft keeps boundary flag count');
  mustCondition(packetDraft.humanApprovalNote.includes('Human approval'), 'packet draft keeps human approval note');
  mustCondition(packetDraft.executionBoundaryNote.includes('No create / approve / sign / execute / write-action'), 'packet draft keeps execution boundary note');

  const pack = shiftToAgreementPrep.buildShiftToAgreementPrepPack(helperInput);
  mustCondition(pack.version === shiftToAgreementPrep.COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION, 'pack keeps version');
  mustCondition(Array.isArray(pack.inputSummary), 'pack keeps input summary array');
  mustCondition(Array.isArray(pack.fieldMappingModel), 'pack keeps field mapping model array');
  mustCondition(Array.isArray(pack.questionSet), 'pack keeps question set array');
  mustCondition(Array.isArray(pack.boundaryFlags), 'pack keeps boundary flags array');
  mustCondition(Array.isArray(pack.turkishVisiblePhrases), 'pack keeps Turkish visible phrases array');
  mustCondition(pack.piiKvkkNote.includes('PII'), 'pack keeps PII note');

  const answer = shiftToAgreementPrep.composeShiftToAgreementPrepAnswer(helperInput);
  must(answer, 'Agreement prep input summary', 'compose answer keeps input summary title');
  must(answer, 'Agreement field mapping model', 'compose answer keeps field mapping title');
  must(answer, 'Agreement readiness scorecard', 'compose answer keeps scorecard title');
  must(answer, 'Agreement prep packet draft', 'compose answer keeps packet title');
  must(answer, 'Missing field summary', 'compose answer keeps missing summary title');
  must(answer, 'Risk summary', 'compose answer keeps risk title');
  must(answer, 'Question set', 'compose answer keeps question set title');
  must(answer, 'Safe next-step draft', 'compose answer keeps next step title');
  must(answer, 'Safety / boundary', 'compose answer keeps safety title');
  must(answer, 'PII / KVKK safe handling', 'compose answer keeps PII title');
  must(answer, 'Türkçe visible answer', 'compose answer keeps Turkish title');
  must(answer, 'Sözleşme ön hazırlığını hazırladım', 'compose answer keeps Turkish visible content');

  mustCondition(shiftToAgreementPrep.normalizeShiftToAgreementField('İMZA') === 'imza', 'normalize helper keeps Turkish normalization');
  mustCondition(shiftToAgreementPrep.maskShiftToAgreementSensitiveValue('ali@example.com') === 'al***@example.com', 'mask helper masks email');
  mustCondition(shiftToAgreementPrep.maskShiftToAgreementSensitiveValue('05551234567').includes('***'), 'mask helper masks phone');
  mustCondition(shiftToAgreementPrep.detectShiftToAgreementPrepIntent('Sözleşme taslağı ve KVKK') === 'agreement_prep_draft', 'intent detector keeps agreement prep intent');
  mustCondition(shiftToAgreementPrep.detectShiftToAgreementPrepIntent('readiness scorecard') === 'agreement_readiness_scorecard', 'intent detector keeps readiness intent');
  mustCondition(shiftToAgreementPrep.detectShiftToAgreementPrepIntent('hangi alanlar eksik?') === 'question_set', 'intent detector keeps question intent');

  const roles = shiftToAgreementPrep.listCopilotShiftToAgreementPrepRoles();
  mustCondition(JSON.stringify(roles) === JSON.stringify(roleNames), 'role list matches exported role names');
  mustCondition(shiftToAgreementPrep.getCopilotShiftToAgreementPrepPolicy('UNKNOWN') === null, 'unknown policy returns null');
  for (const role of roles) {
    assertRolePolicy(role, true);
  }

  mustCondition(gitCachedNames().length === 0, 'stage is empty');
  mustNoDiff(['backend/src/services', 'prisma'], 'service/prisma diff empty');
  mustCommandPass(['git', 'diff', '--check'], 'working tree diff check is clean');
  mustCommandPass(['git', 'diff', '--cached', '--check'], 'cached diff check is clean');
  mustCondition(!fs.existsSync(path.join(root, 'debug.log')), 'debug.log absent');

  mustEach(guide, stageTitles, 'guide keeps shift stages');
  mustEach(primer, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md', 'check:copilotshifttoagreementprep01'], 'primer keeps shift references');
  mustEach(roadmap, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md', 'check:copilotshifttoagreementprep01'], 'roadmap keeps shift references');
  mustEach(harnessCheck, ['check:copilotshifttoagreementprep01', 'copilot_shift_to_agreement_prep_01_check.js', 'backend/src/ai/chat/copilotShiftToAgreementPrep.js', 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md'], 'harness check knows shift milestone');
  mustEach(harnessDoc, ['Shift to agreement prep milestone: `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`', 'check:copilotshifttoagreementprep01', 'docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md', 'node backend\\scripts\\copilot_shift_to_agreement_prep_01_check.js'], 'harness doc lists shift milestone');

  mustCondition(guardCases >= 250, `guard case minimum preserved: ${guardCases}`);
  console.log(`PASS COPILOT-SHIFT-TO-AGREEMENT-PREP-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  console.log(`FAIL COPILOT-SHIFT-TO-AGREEMENT-PREP-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
  process.exit(1);
});
