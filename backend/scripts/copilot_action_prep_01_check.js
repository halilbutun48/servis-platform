#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as actionPrep from '../src/ai/chat/copilotActionPrep.js';
import { assertProductExtensionsOrder } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

let guardCases = 0;
let passCount = 0;
let failCount = 0;

const ACTION_PREP_SCENARIOS = Object.freeze([
  { actionPrepType: 'demand_to_rfq_prep', sourceCapability: 'demand_intake', message: 'Talep için RFQ taslağı hazırla.', keyword: 'RFQ', status: 'needs_clarification', approvalType: 'draft_review' },
  { actionPrepType: 'rfq_to_supplier_matching_prep', sourceCapability: 'rfq_prep', message: 'RFQ kısa listesini eşleştir.', keyword: 'eşleştirme', status: 'needs_clarification', approvalType: 'draft_review' },
  { actionPrepType: 'supplier_to_offer_collection_prep', sourceCapability: 'supplier_matching', message: 'Kısa listeden teklif toplama paketi hazırla.', keyword: 'teklif toplama', status: 'needs_clarification', approvalType: 'draft_review' },
  { actionPrepType: 'offer_collection_to_analysis_prep', sourceCapability: 'supplier_offer_collect', message: 'Teklifleri analiz edip karşılaştırma ve risk özeti oluştur.', keyword: 'analiz', status: 'needs_clarification', approvalType: 'risk_review' },
  { actionPrepType: 'offer_to_negotiation_prep', sourceCapability: 'offer_analysis', message: 'Pazarlık notu ve karşı teklif taslağı hazırla.', keyword: 'pazarlık', status: 'needs_clarification', approvalType: 'risk_review' },
  { actionPrepType: 'offer_to_recommendation_prep', sourceCapability: 'negotiation_assist', message: 'Öneri paketini hazırla.', keyword: 'öneri', status: 'ready_for_review', approvalType: 'review_only' },
  { actionPrepType: 'recommendation_to_agreement_prep', sourceCapability: 'offer_recommendation', message: 'Sözleşme hazırlık taslağı hazırla.', keyword: 'sözleşme', status: 'needs_clarification', approvalType: 'draft_review' },
  { actionPrepType: 'agreement_to_dispatch_prep', sourceCapability: 'shift_to_agreement_prep', message: 'Dispatch ve rota hazırlık taslağı hazırla.', keyword: 'dispatch', status: 'needs_clarification', approvalType: 'draft_review' },
  { actionPrepType: 'dispatch_to_human_approval_prep', sourceCapability: 'dispatch_action_prep', message: 'İnsan onayı paketi hazırla.', keyword: 'onay', status: 'blocked', approvalType: 'final_human_approval_required' },
  { actionPrepType: 'generic_blocker_resolution_prep', sourceCapability: 'generic', message: 'Belirsiz isteği güvenli hazırlık paketine çevir.', keyword: 'engel', status: 'needs_clarification', approvalType: 'review_only' },
  { actionPrepType: 'missing_field_collection_prep', sourceCapability: 'generic', message: 'Eksik alanları sırala.', keyword: 'eksik', status: 'needs_clarification', approvalType: 'missing_field_review' },
  { actionPrepType: 'risk_review_prep', sourceCapability: 'generic', message: 'Risk inceleme taslağı ve blokaj özetini hazırla.', keyword: 'risk', status: 'risky', approvalType: 'risk_review' },
]);

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

function runScenarioChecks(scenario) {
  const detected = actionPrep.detectActionPrepIntent({ message: scenario.message, role: 'COMPANY' });
  mustCondition(detected.actionPrepType === scenario.actionPrepType, `${scenario.actionPrepType} detection keeps actionPrepType`);
  mustCondition(detected.sourceCapability === scenario.sourceCapability, `${scenario.actionPrepType} detection keeps sourceCapability`);
  mustCondition(detected.explicit === true, `${scenario.actionPrepType} detection stays explicit`);
  mustCondition(detected.blockedExecution === false, `${scenario.actionPrepType} detection stays read-only`);

  const envelope = actionPrep.buildActionPrepEnvelope({
    role: 'COMPANY',
    message: scenario.message,
    sourceCapability: scenario.sourceCapability,
    approvalType: scenario.approvalType,
  });
  const cardDraft = actionPrep.buildActionPrepCardDraft(envelope);
  const missingSummary = actionPrep.buildActionPrepMissingFieldSummary(envelope);
  const riskSummary = actionPrep.buildActionPrepRiskSummary(envelope);
  const handoff = actionPrep.buildActionPrepHumanApprovalHandoff(envelope);
  const boundary = actionPrep.buildActionPrepSafetyBoundary(envelope);
  const visibleFromBuilder = actionPrep.buildActionPrepVisibleAnswer(envelope);
  const chipsFromBuilder = actionPrep.buildActionPrepChips(envelope);
  const notesFromBuilder = actionPrep.buildActionPrepSafetyNotes(envelope);
  const answer = actionPrep.composeActionPrepAnswer({
    role: 'COMPANY',
    message: scenario.message,
    sourceCapability: scenario.sourceCapability,
    approvalType: scenario.approvalType,
  });

  mustCondition(envelope.actionPrepType === scenario.actionPrepType, `${scenario.actionPrepType} envelope keeps actionPrepType`);
  mustCondition(envelope.sourceCapability === scenario.sourceCapability, `${scenario.actionPrepType} envelope keeps sourceCapability`);
  mustCondition(envelope.role === 'COMPANY', `${scenario.actionPrepType} envelope keeps COMPANY role`);
  mustCondition(envelope.approvalRequired === true, `${scenario.actionPrepType} envelope keeps approvalRequired`);
  mustCondition(envelope.draftOnly === true, `${scenario.actionPrepType} envelope keeps draftOnly`);
  mustCondition(envelope.noWriteAction === true, `${scenario.actionPrepType} envelope keeps noWriteAction`);
  mustCondition(envelope.notExecuted === true, `${scenario.actionPrepType} envelope keeps notExecuted`);
  mustCondition(envelope.currentState.noWriteAction === true, `${scenario.actionPrepType} currentState keeps noWriteAction`);
  mustCondition(visibleFromBuilder === envelope.visibleAnswer, `${scenario.actionPrepType} visible answer builder matches envelope`);
  must(visibleFromBuilder, 'Sıradaki güvenli adım', `${scenario.actionPrepType} visible answer keeps next safe step`);
  must(visibleFromBuilder, scenario.keyword, `${scenario.actionPrepType} visible answer keeps scenario keyword`);
  mustCondition(cardDraft.status === scenario.status, `${scenario.actionPrepType} card draft keeps status`);
  mustCondition(cardDraft.approvalType === scenario.approvalType, `${scenario.actionPrepType} card draft keeps approval type`);
  mustCondition(missingSummary.items.length > 0, `${scenario.actionPrepType} missing-field summary has items`);
  mustCondition(riskSummary.items.length > 0, `${scenario.actionPrepType} risk summary has items`);
  mustCondition(handoff.approvalType === scenario.approvalType, `${scenario.actionPrepType} handoff keeps approval type`);
  mustCondition(boundary.noWriteAction === true, `${scenario.actionPrepType} boundary keeps noWriteAction`);
  mustCondition(boundary.noDispatchApply === true, `${scenario.actionPrepType} boundary keeps noDispatchApply`);
  mustCondition(boundary.noRouteApply === true, `${scenario.actionPrepType} boundary keeps noRouteApply`);
  mustCondition(chipsFromBuilder.includes(scenario.sourceCapability), `${scenario.actionPrepType} chips keep source capability`);
  mustCondition(chipsFromBuilder.includes(scenario.actionPrepType), `${scenario.actionPrepType} chips keep action type`);
  mustCondition(notesFromBuilder.includes('draftOnly=true'), `${scenario.actionPrepType} safety notes keep draftOnly`);
  mustCondition(answer.actionPrepEnvelope.actionPrepId === envelope.actionPrepId, `${scenario.actionPrepType} answer keeps actionPrepId`);
  mustCondition(answer.safetyBoundary.noWriteAction === true, `${scenario.actionPrepType} answer keeps noWriteAction`);
  must(visibleFromBuilder, 'No write-action.', `${scenario.actionPrepType} visible answer keeps write boundary`);
}

async function main() {
  console.log('=== COPILOT-ACTION-PREP-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const humanApprovalDoc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const actionDoc = read('docs/COPILOT_ACTION_PREP_01.md');
  const dispatchDoc = read('docs/COPILOT_DISPATCH_ACTION_PREP_01.md');
  const helper = read('backend/src/ai/chat/copilotActionPrep.js');
  const dispatchHelper = read('backend/src/ai/chat/copilotDispatchActionPrep.js');
  const shiftHelper = read('backend/src/ai/chat/copilotShiftToAgreementPrep.js');
  const humanHelper = read('backend/src/ai/chat/copilotHumanApprovalPolicy.js');
  const auditDoc = read('docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md');
  const cachedNames = gitCachedNames();

  const helperLineCount = helper.split(/\r?\n/).length;
  const docLineCount = actionDoc.split(/\r?\n/).length;
  const scriptLineCount = read('backend/scripts/copilot_action_prep_01_check.js').split(/\r?\n/).length;

  mustCondition(scriptLineCount < 1000, 'check script under 1000 lines');
  mustCondition(helperLineCount < 1000, 'helper under 1000 lines');
  mustCondition(docLineCount < 1000, 'doc under 1000 lines');
  mustCondition(cachedNames.length === 0, 'stage stays empty');

  must(pkg, '"check:copilotactionprep01": "node backend/scripts/copilot_action_prep_01_check.js"', 'package.json exposes action prep check');
  assertProductExtensionsOrder(['check:copilotshifttoagreementprep01', 'check:copilotdispatchactionprep01', 'check:copilotactionprep01', 'check:uxmarketplacepanels01'], 'product extensions runner places action prep after dispatch');
  assertProductExtensionsOrder(['check:copilotshifttoagreementprep01', 'check:copilotdispatchactionprep01', 'check:copilotactionprep01', 'check:uxmarketplacepanels01'], 'verify chain places action prep after dispatch');

  must(guide, 'COPILOT-ACTION-PREP-01', 'milestone guide mentions action prep milestone');
  must(guide, 'check:copilotactionprep01', 'milestone guide exposes action prep check');
  must(guide, 'node backend\\scripts\\copilot_action_prep_01_check.js', 'milestone guide includes action prep command');
  must(guide, 'docs/COPILOT_ACTION_PREP_01.md', 'milestone guide includes action prep doc');
  must(guide, 'backend/src/ai/chat/copilotActionPrep.js', 'milestone guide includes action prep helper');
  must(guide, 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'milestone guide points to financial block after action prep');
  ordered(guide, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'COPILOT-ACTION-PREP-01', 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01'], 'milestone guide keeps financial block after action prep');

  must(primer, 'COPILOT-ACTION-PREP-01', 'primer mentions action prep milestone');
  must(primer, 'check:copilotactionprep01', 'primer exposes action prep check');
  must(primer, 'docs/COPILOT_ACTION_PREP_01.md', 'primer links action prep doc');
  must(primer, 'backend/src/ai/chat/copilotActionPrep.js', 'primer links action prep helper');
  must(primer, 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'primer keeps financial block reference');
  ordered(primer, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'COPILOT-ACTION-PREP-01', 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01'], 'primer keeps financial block after action prep');

  must(roadmap, 'COPILOT-ACTION-PREP-01', 'roadmap keeps action prep milestone');
  must(roadmap, 'check:copilotactionprep01', 'roadmap exposes action prep check');
  must(roadmap, 'docs/COPILOT_ACTION_PREP_01.md', 'roadmap links action prep doc');
  must(roadmap, 'backend/src/ai/chat/copilotActionPrep.js', 'roadmap links action prep helper');
  must(roadmap, 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'roadmap keeps financial block');
  must(roadmap, 'VOICE-COPILOT-ROLE-ASSISTANT-01', 'roadmap keeps voice block reference');
  ordered(roadmap, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'COPILOT-ACTION-PREP-01', 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'VOICE-COPILOT-ROLE-ASSISTANT-01'], 'roadmap keeps financial block before voice block');

  must(humanApprovalDoc, 'COPILOT-ACTION-PREP-01', 'human approval doc keeps action prep future line');
  must(humanHelper, 'COPILOT-ACTION-PREP-01', 'human approval helper keeps action prep future line');

  must(actionDoc, '# COPILOT ACTION PREP 01', 'action prep doc title present');
  must(actionDoc, 'docs/check milestone', 'action prep doc keeps docs/check wording');
  must(actionDoc, 'Canonical check: `check:copilotactionprep01`', 'action prep doc keeps canonical check wording');
  must(actionDoc, 'Action prep owner katmanını hazırladım', 'action prep doc keeps owner language');
  must(actionDoc, 'shared action-prep owner', 'action prep doc names shared owner');
  must(actionDoc, 'backend/src/ai/chat/copilotActionPrep.js', 'action prep doc links helper');
  must(actionDoc, 'No write-action.', 'action prep doc keeps write-action boundary');
  must(actionDoc, 'No dispatch apply.', 'action prep doc keeps dispatch boundary');
  must(actionDoc, 'No route apply.', 'action prep doc keeps route boundary');
  must(actionDoc, 'No agreement / contract execute.', 'action prep doc keeps agreement boundary');
  must(actionDoc, 'No payment / hakediş execute.', 'action prep doc keeps payment boundary');
  must(actionDoc, 'No messaging / email / SMS / push.', 'action prep doc keeps messaging boundary');
  must(actionDoc, 'No route / service / prisma diff.', 'action prep doc keeps route/service/prisma boundary');
  must(actionDoc, 'PASS COPILOT-ACTION-PREP-01', 'action prep doc keeps pass marker');
  must(actionDoc, 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'action prep doc points to financial block');
  must(actionDoc, 'Bu doküman voice bloğunu başlatmaz; voice daha sonraki sıradadır.', 'action prep doc keeps voice later note');
  ordered(actionDoc, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'COPILOT-ACTION-PREP-01', 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01'], 'action prep doc keeps financial next milestone order');

  must(dispatchDoc, 'COPILOT-ACTION-PREP-01', 'dispatch doc keeps next milestone reference');
  must(dispatchDoc, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'dispatch doc keeps dispatch helper reference');

  must(helper, 'COPILOT_ACTION_PREP_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_ACTION_PREP_OWNER_STACK', 'helper exposes owner stack');
  must(helper, 'COPILOT_ACTION_PREP_ROLE_NAMES', 'helper exposes role names');
  must(helper, 'COPILOT_ACTION_PREP_SOURCE_CAPABILITIES', 'helper exposes source capabilities');
  must(helper, 'COPILOT_ACTION_PREP_TYPES', 'helper exposes type list');
  must(helper, 'COPILOT_ACTION_PREP_CARD_STATUSES', 'helper exposes card status list');
  must(helper, 'COPILOT_ACTION_PREP_APPROVAL_TYPES', 'helper exposes approval types');
  must(helper, 'COPILOT_ACTION_PREP_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_ACTION_PREP_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_ACTION_PREP_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_ACTION_PREP_TURKISH_VISIBLE_PHRASES', 'helper exposes visible phrases');
  must(helper, 'COPILOT_ACTION_PREP_BOUNDARY_FLAGS', 'helper exposes boundary flags');
  must(helper, 'COPILOT_ACTION_PREP_EXECUTION_STATE', 'helper exposes execution state');
  must(helper, 'COPILOT_ACTION_PREP_NEXT_SAFE_STEP', 'helper exposes next safe step');
  must(helper, 'COPILOT_ACTION_PREP_OWNER', 'helper exposes owner object');
  must(helper, 'COPILOT_ACTION_PREP_POLICY', 'helper exposes policy object');
  must(helper, 'COPILOT_ACTION_PREP_SOURCE_TO_TYPE', 'helper exposes source-to-type map');
  must(helper, 'listCopilotActionPrepSourceCapabilities', 'helper exposes source capability lister');
  must(helper, 'listCopilotActionPrepTypes', 'helper exposes type lister');
  must(helper, 'listCopilotActionPrepRoles', 'helper exposes role lister');
  must(helper, 'getCopilotActionPrepPolicy', 'helper exposes policy getter');
  must(helper, 'normalizeActionPrepField', 'helper exposes field normalizer');
  must(helper, 'maskActionPrepSensitiveValue', 'helper exposes masker');
  must(helper, 'normalizeActionPrepSource', 'helper exposes source normalizer');
  must(helper, 'isActionPrepWriteActionBlocked', 'helper exposes blocked writer detector');
  must(helper, 'listBlockedActionPrepWriteActions', 'helper exposes blocked action lister');
  must(helper, 'detectActionPrepIntent', 'helper exposes intent detector');
  must(helper, 'buildActionPrepInput', 'helper exposes input builder');
  must(helper, 'buildActionPrepSafetyBoundary', 'helper exposes safety boundary builder');
  must(helper, 'buildActionPrepMissingFieldSummary', 'helper exposes missing field summary builder');
  must(helper, 'buildActionPrepRiskSummary', 'helper exposes risk summary builder');
  must(helper, 'buildActionPrepHumanApprovalHandoff', 'helper exposes human approval handoff builder');
  must(helper, 'buildActionPrepCardDraft', 'helper exposes card draft builder');
  must(helper, 'buildActionPrepSafetyNotes', 'helper exposes safety notes builder');
  must(helper, 'buildActionPrepVisibleAnswer', 'helper exposes visible answer builder');
  must(helper, 'buildActionPrepChips', 'helper exposes chips builder');
  must(helper, 'buildActionPrepEnvelope', 'helper exposes envelope builder');
  must(helper, 'buildActionPrepOwnerPack', 'helper exposes owner pack builder');
  must(helper, 'composeActionPrepAnswer', 'helper exposes answer composer');
  must(helper, 'composeDispatchActionPrepAnswer', 'helper reuses dispatch composer');
  must(helper, 'buildShiftToAgreementPrepPack', 'helper reuses shift pack');
  must(helper, 'getCopilotHumanApprovalPolicy', 'helper reuses human approval policy');
  must(helper, 'COPILOT_HUMAN_APPROVAL_CHECKLIST', 'helper reuses human approval checklist');
  must(helper, 'COPILOT_HUMAN_APPROVAL_FUTURE_LINES', 'helper reuses human approval future lines');
  must(helper, 'shared action-prep owner mutation', 'helper keeps shared owner mutation boundary');
  must(helper, 'Action prep is a read-only owner layer.', 'helper keeps public promise');
  must(helper, 'Action prep owner katmanını hazırladım; dispatch, shift ve human approval sınırları tek yerde toplandı.', 'helper keeps Turkish visible phrase');
  must(helper, 'No write-action.', 'helper keeps visible write boundary text');
  must(helper, 'No route / service / prisma diff.', 'helper keeps diff boundary text');

  must(dispatchHelper, 'COPILOT_DISPATCH_ACTION_PREP_VERSION', 'dispatch helper remains reusable source');
  must(shiftHelper, 'COPILOT_SHIFT_TO_AGREEMENT_PREP_VERSION', 'shift helper remains reusable source');
  must(humanHelper, 'COPILOT_HUMAN_APPROVAL_VERSION', 'human approval helper remains reusable source');
  must(auditDoc, 'COPILOT-ACTION-PREP-01', 'repo capability audit mentions action prep milestone');
  must(auditDoc, 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'repo capability audit mentions financial block');

  mustCondition(actionPrep.COPILOT_ACTION_PREP_VERSION === 'COPILOT-ACTION-PREP-01', 'helper runtime version marker');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_OWNER_STACK.length === 3, 'helper runtime owner stack length');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_ROLE_NAMES.length === 8, 'helper runtime role count');
  mustCondition(actionPrep.listCopilotActionPrepRoles().length === 8, 'helper runtime role lister count');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_SOURCE_CAPABILITIES.length === 10, 'helper runtime source capability count');
  mustCondition(actionPrep.listCopilotActionPrepSourceCapabilities().length === 10, 'helper runtime source capability lister count');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_TYPES.length === 12, 'helper runtime type count');
  mustCondition(actionPrep.listCopilotActionPrepTypes().length === 12, 'helper runtime type lister count');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_CARD_STATUSES.length === 4, 'helper runtime status count');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_APPROVAL_TYPES.length === 5, 'helper runtime approval type count');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_OWNER.sharedOwner === true, 'helper runtime shared owner flag');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_POLICY.COMPANY.sharedOwner === true, 'helper runtime policy owner flag');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_POLICY.COMPANY.humanApprovalChecklist.length > 0, 'helper runtime policy human approval checklist');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_POLICY.COMPANY.humanApprovalFutureLines.length > 0, 'helper runtime policy human approval future lines');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_EXECUTION_STATE.includes('human_approval_required'), 'helper runtime execution state');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_NEXT_SAFE_STEP.includes('insan onayına'), 'helper runtime next safe step');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_SOURCE_TO_TYPE.dispatch_action_prep === 'dispatch_to_human_approval_prep', 'helper runtime source mapping keeps dispatch action prep');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_SOURCE_TO_TYPE.generic === 'generic_blocker_resolution_prep', 'helper runtime source mapping keeps generic fallback');
  mustCondition(actionPrep.getCopilotActionPrepPolicy('ROOM').role === 'ROOM', 'helper runtime policy getter respects role');

  mustEach(JSON.stringify(actionPrep.listCopilotActionPrepRoles()), ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION'], 'helper runtime role list');
  mustEach(JSON.stringify(actionPrep.listCopilotActionPrepSourceCapabilities()), ['demand_intake', 'rfq_prep', 'supplier_matching', 'supplier_offer_collect', 'offer_analysis', 'negotiation_assist', 'offer_recommendation', 'shift_to_agreement_prep', 'dispatch_action_prep', 'generic'], 'helper runtime source capability list');
  mustEach(JSON.stringify(actionPrep.listCopilotActionPrepTypes()), ['demand_to_rfq_prep', 'rfq_to_supplier_matching_prep', 'supplier_to_offer_collection_prep', 'offer_collection_to_analysis_prep', 'offer_to_negotiation_prep', 'offer_to_recommendation_prep', 'recommendation_to_agreement_prep', 'agreement_to_dispatch_prep', 'dispatch_to_human_approval_prep', 'generic_blocker_resolution_prep', 'missing_field_collection_prep', 'risk_review_prep'], 'helper runtime type list');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_BLOCKED_ACTIONS), ['shared action-prep owner mutation'], 'helper runtime blocked actions');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_NEVER_AUTOMATE), ['otomatik shared action-prep owner atama'], 'helper runtime never automate list');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_PUBLIC_PROMISE), ['Action prep is a read-only owner layer.', 'Action prep keeps dispatch, shift and human approval in view.'], 'helper runtime public promise');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_TURKISH_VISIBLE_PHRASES), ['Action prep owner katmanını hazırladım; dispatch, shift ve human approval sınırları tek yerde toplandı.', 'Bu çıktı karar değil, read-only hazırlık taslağıdır.', 'Sıradaki güvenli adım: hazırlık paketini insan onayına sunmak.'], 'helper runtime visible phrases');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_BOUNDARY_FLAGS), ['sharedOwner=true', 'readOnly=true', 'humanApprovalRequired=true', 'noHumanApprovalBypass=true', 'noWriteAction=true'], 'helper runtime boundary flags');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_VISIBLE_ANSWER_TEMPLATES), ['Aksiyon hazırlık taslağını oluşturdum; henüz hiçbir işlem uygulanmadı.', 'Bu sonuç karar değil, insan onayına sunulacak hazırlık paketidir.', 'Eksik bilgiler tamamlanmadan işlem yapılamaz.', 'Teklif kabul edilmedi, tedarikçi seçilmedi, sözleşme oluşturulmadı.', 'Dispatch uygulanmadı, vardiya/rota oluşturulmadı, araç veya sürücü atanmadı.', 'Sıradaki güvenli adım: hazırlık paketini kontrol edip insan onayına sunmak.'], 'helper runtime visible answer templates');
  mustEach(JSON.stringify(actionPrep.COPILOT_ACTION_PREP_SAFETY_NOTES), ['draftOnly=true', 'approvalRequired=true', 'noWriteAction=true', 'notExecuted=true', 'humanReviewRequired=true', 'KVKK / PII maskesi uygulanır', 'route/service/prisma diff açılmaz', 'runtime model/network call yapılmaz'], 'helper runtime safety notes');

  mustCondition(actionPrep.normalizeActionPrepField('role', 'company') === 'COMPANY', 'field normalizer uppercases role');
  mustCondition(actionPrep.normalizeActionPrepField('status', 'blocked') === 'blocked', 'field normalizer keeps status');
  mustCondition(actionPrep.normalizeActionPrepField('approvalType', 'risk_review') === 'risk_review', 'field normalizer keeps approval type');
  mustCondition(actionPrep.maskActionPrepSensitiveValue('ali@example.com').includes('***'), 'masker hides email');
  mustCondition(actionPrep.maskActionPrepSensitiveValue('+90 555 123 45 67').includes('*'), 'masker hides phone');
  mustCondition(actionPrep.isActionPrepWriteActionBlocked('Teklifi kabul ettim') === true, 'blocked writer detector catches accept');
  mustCondition(actionPrep.isActionPrepWriteActionBlocked('Aksiyon hazırlık taslağı') === false, 'blocked writer detector leaves read-only text alone');
  mustCondition(actionPrep.listBlockedActionPrepWriteActions().includes('shared action-prep owner mutation'), 'blocked action lister keeps shared owner mutation');
  mustCondition(actionPrep.listBlockedActionPrepWriteActions().some((entry) => normalize(entry).includes('dispatch apply')), 'blocked action lister keeps dispatch apply');
  mustCondition(actionPrep.COPILOT_ACTION_PREP_POLICY.COMPANY.visible === true, 'policy keeps visible flag');

  const ownerPack = actionPrep.buildActionPrepOwnerPack({
    role: 'COMPANY',
    message: ACTION_PREP_SCENARIOS[0].message,
    sourceCapability: ACTION_PREP_SCENARIOS[0].sourceCapability,
  });
  mustCondition(ownerPack.owner.sharedOwner === true, 'owner pack keeps shared owner');
  mustCondition(ownerPack.actionPrepEnvelope.actionPrepType === ACTION_PREP_SCENARIOS[0].actionPrepType, 'owner pack keeps action prep type');
  mustCondition(ownerPack.actionCardDraft.title.length > 0, 'owner pack keeps card draft');
  mustCondition(ownerPack.visibleAnswer.includes('No write-action.'), 'owner pack keeps visible boundary');
  mustCondition(ownerPack.humanApprovalHandoff.approvalType === ACTION_PREP_SCENARIOS[0].approvalType, 'owner pack keeps approval type');

  for (const scenario of ACTION_PREP_SCENARIOS) {
    runScenarioChecks(scenario);
  }

  console.log(`PASS COPILOT-ACTION-PREP-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
