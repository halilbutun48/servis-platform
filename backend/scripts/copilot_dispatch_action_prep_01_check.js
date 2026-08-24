#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as dispatchActionPrep from '../src/ai/chat/copilotDispatchActionPrep.js';
import { assertProductExtensionsOrder } from './lib/productExtensionsRegistry.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { mustNoDiffExceptWithIdentity } from './lib/guardGitScope.js';

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

function assertPolicy(role) {
  const policy = dispatchActionPrep.getCopilotDispatchActionPrepPolicy(role);
  mustCondition(Boolean(policy), `policy exists for ${role}`);
  mustCondition(policy.role === role, `policy role matches ${role}`);
  mustCondition(policy.visible === true, `policy visibility matches ${role}`);
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
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS, `${role} policy keeps blocked action`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEVER_AUTOMATE, `${role} policy keeps never-automate phrase`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_TURKISH_VISIBLE_PHRASES, `${role} policy keeps visible phrase`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BLOCKED_PHRASES, `${role} policy keeps blocked phrase`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_HANOFFS, `${role} policy keeps handoff`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_PUBLIC_PROMISE, `${role} policy keeps public promise`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_PII_KVKK_SAFE_HANDLING, `${role} policy keeps PII/KVKK safe handling`);
  mustEach(JSON.stringify(policy), dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BOUNDARY_FLAGS, `${role} policy keeps boundary flag`);
}

async function main() {
  console.log('=== COPILOT-DISPATCH-ACTION-PREP-01 CHECK ===');

  const scriptText = read('backend/scripts/copilot_dispatch_action_prep_01_check.js');
  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmapLock = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const demandToAgreementDoc = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const shiftDoc = read('docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md');
  const doc = read('docs/COPILOT_DISPATCH_ACTION_PREP_01.md');
  const helper = read('backend/src/ai/chat/copilotDispatchActionPrep.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');

  const stageTitles = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_STAGES.map((stage) => stage.title);
  const categories = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_CATEGORIES;
  const supportedTypes = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_SUPPORTED_TYPES;
  const inputSummary = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_INPUT_SUMMARY;
  const readinessModelFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_READINESS_MODEL_FIELDS;
  const readinessScorecardFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_READINESS_SCORECARD_FIELDS;
  const packetFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_PACKET_DRAFT_FIELDS;
  const missingSummaryFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_MISSING_FIELD_SUMMARY;
  const riskSummaryFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_RISK_SUMMARY;
  const questionSetFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_QUESTION_SET;
  const safeNextStepFields = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_SAFE_NEXT_STEP_DRAFT;
  const boundaryFlags = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BOUNDARY_FLAGS;
  const blockedActions = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS;
  const neverAutomate = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEVER_AUTOMATE;
  const turkishVisible = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_TURKISH_VISIBLE_PHRASES;
  const blockedPhrases = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_BLOCKED_PHRASES;
  const safetyExamples = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_SAFETY_EXAMPLES;
  const handoffs = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_HANOFFS;
  const publicPromise = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_PUBLIC_PROMISE;
  const roleNames = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_ROLE_NAMES;
  const piiHandling = dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_PII_KVKK_SAFE_HANDLING;

  const sampleInput = Object.freeze({
    sourceAgreementSummary: 'Agreement prep ready for dispatch',
    sourceRouteReviewSummary: 'Route review shows no route apply yet',
    sourceShiftSummary: 'Shift summary includes safe-drive and evidence notes',
    routeSummary: 'Gebze-Tuzla route',
    driverLabel: 'Mehmet Yilmaz',
    driverPhone: '05551234567',
    vehicleLabel: '34 ABC 123',
    dispatchWindow: '06:30-08:30',
    gpsSummary: 'gps alive',
    safeDriveSummary: 'safe drive green',
    evidenceChecklist: ['photo proof', 'check-in log'],
    region: 'Kocaeli',
    province: 'Kocaeli',
    district: 'Gebze',
    serviceScope: 'personel servisi',
    missingFields: ['driver contact', 'vehicle plate', 'route confirmation'],
    missingOptionalFields: ['backup contact'],
    riskSignals: ['route timing risk'],
    questionSeed: ['Hangi sürücü hazır?', 'Hangi araç hazır?'],
    role: 'COMPANY',
  });

  const helperLineCount = helper.split(/\r?\n/).length;
  const docLineCount = doc.split(/\r?\n/).length;
  const scriptLineCount = scriptText.split(/\r?\n/).length;

  mustCondition(scriptLineCount < 1000, 'check script under 1000 lines');
  mustCondition(helperLineCount < 1000, 'helper under 1000 lines');
  mustCondition(docLineCount < 1000, 'doc under 1000 lines');

  must(pkg, '"check:copilotdispatchactionprep01": "node backend/scripts/copilot_dispatch_action_prep_01_check.js"', 'package.json exposes dispatch prep check');
  assertProductExtensionsOrder(['check:copilotshifttoagreementprep01', 'check:copilotdispatchactionprep01', 'check:uxmarketplacepanels01'], 'product extensions runner places dispatch prep after shift-to-agreement prep');
  assertProductExtensionsOrder(['check:copilotshifttoagreementprep01', 'check:copilotdispatchactionprep01', 'check:uxmarketplacepanels01'], 'verify chain places dispatch prep after shift-to-agreement prep');

  must(guide, 'COPILOT-DISPATCH-ACTION-PREP-01', 'milestone guide mentions dispatch prep milestone');
  must(guide, 'check:copilotdispatchactionprep01', 'milestone guide exposes dispatch prep check');
  must(guide, 'node backend\\scripts\\copilot_dispatch_action_prep_01_check.js', 'milestone guide includes dispatch prep command');
  must(guide, 'docs/COPILOT_DISPATCH_ACTION_PREP_01.md', 'milestone guide includes dispatch prep doc');
  must(guide, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'milestone guide includes dispatch prep helper');
  ordered(guide, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'UX-MARKETPLACE-PANELS-01'], 'milestone guide keeps dispatch prep after shift-to-agreement prep');

  must(primer, 'COPILOT-DISPATCH-ACTION-PREP-01', 'primer mentions dispatch prep milestone');
  must(primer, 'check:copilotdispatchactionprep01', 'primer exposes dispatch prep check');
  must(primer, 'docs/COPILOT_DISPATCH_ACTION_PREP_01.md', 'primer links dispatch prep doc');
  must(primer, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'primer links dispatch prep helper');
  ordered(primer, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'COPILOT-HUMAN-APPROVAL-01'], 'primer keeps dispatch prep between shift-to-agreement prep and human approval');

  must(roadmapLock, 'COPILOT-DISPATCH-ACTION-PREP-01', 'roadmap lock keeps dispatch prep milestone');
  must(roadmapLock, 'check:copilotdispatchactionprep01', 'roadmap lock exposes dispatch prep check');
  must(roadmapLock, 'docs/COPILOT_DISPATCH_ACTION_PREP_01.md', 'roadmap lock links dispatch prep doc');
  must(roadmapLock, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'roadmap lock links dispatch prep helper');
  ordered(roadmapLock, ['COPILOT-SHIFT-TO-AGREEMENT-PREP-01', 'COPILOT-DISPATCH-ACTION-PREP-01', 'COPILOT-ACTION-PREP-01'], 'roadmap keeps dispatch prep before action prep');

  must(demandToAgreementDoc, 'COPILOT-DISPATCH-ACTION-PREP-01', 'demand-to-agreement roadmap references dispatch prep milestone');
  must(demandToAgreementDoc, 'check:copilotdispatchactionprep01', 'demand-to-agreement roadmap exposes dispatch prep check');
  must(demandToAgreementDoc, 'docs/COPILOT_DISPATCH_ACTION_PREP_01.md', 'demand-to-agreement roadmap links dispatch prep doc');
  must(demandToAgreementDoc, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'demand-to-agreement roadmap links dispatch prep helper');

  must(shiftDoc, 'COPILOT-DISPATCH-ACTION-PREP-01', 'shift doc keeps dispatch milestone reference');
  must(shiftDoc, 'No dispatch apply yok.', 'shift doc keeps dispatch boundary wording');

  must(doc, '# COPILOT DISPATCH ACTION PREP 01', 'dispatch doc title present');
  must(doc, 'docs/check milestone', 'dispatch doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:copilotdispatchactionprep01`', 'dispatch doc keeps canonical check wording');
  ordered(doc, stageTitles, 'dispatch doc keeps stage ordering');
  for (const category of categories) {
    must(doc, category, `dispatch doc includes category ${category}`);
  }
  for (const type of supportedTypes) {
    must(doc, type, `dispatch doc includes supported type ${type}`);
  }
  for (const field of inputSummary) {
    must(doc, field, `dispatch doc includes input summary ${field}`);
  }
  for (const field of readinessModelFields) {
    must(doc, field, `dispatch doc includes readiness model field ${field}`);
  }
  for (const field of readinessScorecardFields) {
    must(doc, field, `dispatch doc includes readiness scorecard field ${field}`);
  }
  for (const field of packetFields) {
    must(doc, field, `dispatch doc includes packet field ${field}`);
  }
  for (const field of missingSummaryFields) {
    must(doc, field, `dispatch doc includes missing summary field ${field}`);
  }
  for (const field of riskSummaryFields) {
    must(doc, field, `dispatch doc includes risk summary field ${field}`);
  }
  for (const field of questionSetFields) {
    must(doc, field, `dispatch doc includes question-set field ${field}`);
  }
  for (const field of safeNextStepFields) {
    must(doc, field, `dispatch doc includes safe-next-step field ${field}`);
  }
  for (const flag of boundaryFlags) {
    must(doc, flag, `dispatch doc includes boundary flag ${flag}`);
  }
  for (const phrase of [
    'Dispatch hazırlık taslağını hazırladım; henüz hiçbir dispatch apply, route apply veya sürücü/araç ataması yapılmadı.',
    'GPS / safe-drive ve evidence checklist read-only olarak kontrol edildi.',
    'Bu çıktı karar değil, insan onayına gidecek taslaktır.',
    'Kişisel veriler maskelenerek işlendi.',
    'KVKK açısından yalnızca gerekli minimum veri kullanıldı.',
    'Sıradaki güvenli adım: dispatch hazırlık paketini kontrol edip insan onayına sunmak.',
  ]) {
    must(doc, phrase, `dispatch doc includes visible phrase ${phrase}`);
  }
  for (const phrase of [
    'No route apply.',
    'No dispatch apply.',
    'No driver/vehicle assignment.',
    'No stop reached/skipped/complete.',
    'No messaging/email/SMS/push.',
    'No provider credential use.',
    'No DB write.',
    'No audit event write.',
    'No backend route/service/prisma mutation.',
  ]) {
    must(doc, phrase, `dispatch doc includes boundary phrase ${phrase}`);
  }
  for (const role of roleNames) {
    must(doc, role, `dispatch doc includes role ${role}`);
  }
  for (const phrase of safetyExamples) {
    must(doc, phrase, `dispatch doc includes safety example ${phrase}`);
  }
  for (const phrase of blockedActions) {
    must(doc, phrase, `dispatch doc includes blocked action ${phrase}`);
  }
  for (const phrase of neverAutomate) {
    must(doc, phrase, `dispatch doc includes never automate phrase ${phrase}`);
  }
  for (const phrase of turkishVisible) {
    must(doc, phrase, `dispatch doc includes Turkish visible phrase ${phrase}`);
  }
  for (const phrase of blockedPhrases) {
    must(doc, phrase, `dispatch doc includes blocked phrase ${phrase}`);
  }
  for (const phrase of handoffs) {
    must(doc, phrase, `dispatch doc includes handoff ${phrase}`);
  }
  for (const phrase of publicPromise) {
    must(doc, phrase, `dispatch doc includes public promise ${phrase}`);
  }
  for (const phrase of piiHandling) {
    must(doc, phrase, `dispatch doc includes PII/KVKK safe handling ${phrase}`);
  }
  must(doc, 'Static helper', 'dispatch doc keeps static helper section');
  must(doc, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'dispatch doc links static helper');
  must(doc, 'buildDispatchActionPrepInput', 'dispatch doc lists buildDispatchActionPrepInput');
  must(doc, 'buildDispatchFieldMappingModel', 'dispatch doc lists buildDispatchFieldMappingModel');
  must(doc, 'buildDispatchReadinessModel', 'dispatch doc lists buildDispatchReadinessModel');
  must(doc, 'buildDispatchReadinessScorecard', 'dispatch doc lists buildDispatchReadinessScorecard');
  must(doc, 'buildDispatchPrepPacketDraft', 'dispatch doc lists buildDispatchPrepPacketDraft');
  must(doc, 'buildDispatchMissingFieldSummary', 'dispatch doc lists buildDispatchMissingFieldSummary');
  must(doc, 'buildDispatchRiskSummary', 'dispatch doc lists buildDispatchRiskSummary');
  must(doc, 'buildDispatchQuestionSet', 'dispatch doc lists buildDispatchQuestionSet');
  must(doc, 'buildSafeNextStepDraft', 'dispatch doc lists buildSafeNextStepDraft');
  must(doc, 'composeDispatchActionPrepAnswer', 'dispatch doc lists composeDispatchActionPrepAnswer');
  must(doc, 'maskDispatchActionPrepSensitiveValue', 'dispatch doc lists maskDispatchActionPrepSensitiveValue');
  must(doc, 'normalizeDispatchActionPrepField', 'dispatch doc lists normalizeDispatchActionPrepField');
  must(doc, 'detectDispatchActionPrepIntent', 'dispatch doc lists detectDispatchActionPrepIntent');
  must(doc, 'listCopilotDispatchActionPrepRoles', 'dispatch doc lists role lister');
  must(doc, 'getCopilotDispatchActionPrepPolicy', 'dispatch doc lists policy getter');
  must(doc, 'Kapsam dışı', 'dispatch doc keeps out-of-scope section');
  must(doc, 'No route / service / prisma diff.', 'dispatch doc keeps route/service/prisma boundary');
  must(doc, 'No backend/prisma diff.', 'dispatch doc keeps backend/prisma boundary');
  must(doc, 'No production DB.', 'dispatch doc keeps production DB boundary');
  must(doc, 'No destructive query.', 'dispatch doc keeps destructive query boundary');
  must(doc, 'No browser / public probe.', 'dispatch doc keeps browser/public probe boundary');
  must(doc, 'No write-action.', 'dispatch doc keeps write-action boundary');
  must(doc, 'No dispatch apply.', 'dispatch doc keeps dispatch boundary');
  must(doc, 'No route apply.', 'dispatch doc keeps route boundary');
  must(doc, 'No driver/vehicle assignment.', 'dispatch doc keeps assignment boundary');
  must(doc, 'No payment / hakediş execute.', 'dispatch doc keeps payment boundary');
  must(doc, 'No provider credential management.', 'dispatch doc keeps credential boundary');
  must(doc, 'Validation results', 'dispatch doc keeps validation results section');
  must(doc, 'PASS COPILOT-DISPATCH-ACTION-PREP-01', 'dispatch doc keeps pass marker');
  must(doc, 'Remaining risks', 'dispatch doc keeps remaining risks section');
  must(doc, 'Next recommended milestone', 'dispatch doc keeps next recommended milestone section');
  must(doc, 'COPILOT-ACTION-PREP-01', 'dispatch doc keeps next milestone reference');

  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_VERSION', 'helper exposes version marker');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_STAGES', 'helper exposes stages');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_CATEGORIES', 'helper exposes categories');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_SUPPORTED_TYPES', 'helper exposes supported types');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_INPUT_SUMMARY', 'helper exposes input summary');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_READINESS_MODEL_FIELDS', 'helper exposes readiness model fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_READINESS_SCORECARD_FIELDS', 'helper exposes readiness scorecard fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_PACKET_DRAFT_FIELDS', 'helper exposes packet fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_MISSING_FIELD_SUMMARY', 'helper exposes missing summary fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_RISK_SUMMARY', 'helper exposes risk summary fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_QUESTION_SET', 'helper exposes question set fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_SAFE_NEXT_STEP_DRAFT', 'helper exposes safe next-step fields');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_BOUNDARY_FLAGS', 'helper exposes boundary flags');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_BLOCKED_ACTIONS', 'helper exposes blocked actions');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_NEVER_AUTOMATE', 'helper exposes never automate list');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_SAFETY_EXAMPLES', 'helper exposes safety examples');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_HANOFFS', 'helper exposes handoffs');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_TURKISH_VISIBLE_PHRASES', 'helper exposes visible phrases');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_BLOCKED_PHRASES', 'helper exposes blocked phrases');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_PUBLIC_PROMISE', 'helper exposes public promise');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_EXECUTION_STATE', 'helper exposes execution state');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP', 'helper exposes next safe step');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_PII_KVKK_SAFE_HANDLING', 'helper exposes PII/KVKK handling');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_ROLE_NAMES', 'helper exposes role names');
  must(helper, 'COPILOT_DISPATCH_ACTION_PREP_POLICY', 'helper exposes policy object');
  must(helper, 'buildDispatchActionPrepInput', 'helper exposes input builder');
  must(helper, 'buildDispatchFieldMappingModel', 'helper exposes field mapping model');
  must(helper, 'buildDispatchReadinessModel', 'helper exposes readiness model builder');
  must(helper, 'buildDispatchReadinessScorecard', 'helper exposes readiness scorecard builder');
  must(helper, 'buildDispatchPrepPacketDraft', 'helper exposes packet draft builder');
  must(helper, 'buildDispatchMissingFieldSummary', 'helper exposes missing field summary builder');
  must(helper, 'buildDispatchRiskSummary', 'helper exposes risk summary builder');
  must(helper, 'buildDispatchQuestionSet', 'helper exposes question set builder');
  must(helper, 'buildSafeNextStepDraft', 'helper exposes safe next step builder');
  must(helper, 'composeDispatchActionPrepAnswer', 'helper exposes answer composer');
  must(helper, 'maskDispatchActionPrepSensitiveValue', 'helper exposes masker');
  must(helper, 'normalizeDispatchActionPrepField', 'helper exposes normalizer');
  must(helper, 'detectDispatchActionPrepIntent', 'helper exposes intent detector');
  must(helper, 'listCopilotDispatchActionPrepRoles', 'helper exposes role lister');
  must(helper, 'getCopilotDispatchActionPrepPolicy', 'helper exposes policy getter');
  must(helper, 'buildDispatchActionPrepRole', 'helper exposes role builder');
  mustNot(helper, 'fetch(', 'helper has no fetch runtime');
  mustNot(helper, 'spawn(', 'helper has no spawn runtime');
  mustNot(helper, 'execFileSync', 'helper has no child_process runtime');
  mustNot(helper, 'writeFileSync', 'helper has no filesystem write runtime');
  mustNot(helper, 'express', 'helper has no express runtime');
  mustNot(helper, 'router', 'helper has no router runtime');
  mustNot(helper, 'prisma', 'helper has no prisma runtime');
  mustNot(helper, 'axios', 'helper has no network client runtime');
  mustNot(helper, 'http.request', 'helper has no http runtime');

  must(dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_VERSION, 'COPILOT-DISPATCH-ACTION-PREP-01', 'version anchor is stable');
  mustCondition(dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_STAGES.length === 12, 'dispatch stages length is 12');
  mustCondition(dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_CATEGORIES.length === 8, 'dispatch categories length is 8');
  mustCondition(dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_SUPPORTED_TYPES.length === 8, 'dispatch supported types length is 8');
  mustCondition(dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_ROLE_NAMES.length === 8, 'dispatch role names length is 8');

  const input = dispatchActionPrep.buildDispatchActionPrepInput(sampleInput);
  mustCondition(input.maskedDriverLabel !== sampleInput.driverLabel, 'driver label is masked');
  mustCondition(input.maskedVehicleLabel !== sampleInput.vehicleLabel, 'vehicle label is masked');
  mustCondition(input.nextSafeStep === dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP, 'input keeps next safe step');
  mustCondition(input.humanApprovalRequired === true, 'input keeps human approval gate');
  mustCondition(input.noWriteAction === true, 'input keeps no write-action gate');
  mustCondition(input.noRouteApply === true, 'input keeps no route apply gate');
  mustCondition(input.noDispatchApply === true, 'input keeps no dispatch apply gate');
  mustCondition(Array.isArray(input.evidenceChecklist) && input.evidenceChecklist.length === 2, 'input keeps evidence checklist');

  const readinessModel = dispatchActionPrep.buildDispatchReadinessModel(sampleInput);
  mustCondition(readinessModel.readinessScore <= 100, 'readiness score bounded');
  mustCondition(readinessModel.scoreBand.length === 1, 'readiness score band present');
  mustCondition(Array.isArray(readinessModel.evidenceChecklist), 'readiness model keeps evidence checklist');
  mustCondition(readinessModel.noDispatchApply === true, 'readiness model keeps dispatch boundary');

  const scorecard = dispatchActionPrep.buildDispatchReadinessScorecard(sampleInput);
  mustCondition(Array.isArray(scorecard.blockingReasons), 'scorecard keeps blocking reasons');
  mustCondition(scorecard.humanApprovalRequired === true, 'scorecard keeps human approval requirement');
  mustCondition(scorecard.nextSafeStep === dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP, 'scorecard keeps next safe step');

  const mappingModel = dispatchActionPrep.buildDispatchFieldMappingModel(sampleInput);
  mustCondition(Array.isArray(mappingModel) && mappingModel.length >= 10, 'field mapping model has entries');
  mustCondition(mappingModel.some((entry) => entry.target === 'maskedDriverLabel'), 'field mapping model keeps masked driver label');

  const packet = dispatchActionPrep.buildDispatchPrepPacketDraft(sampleInput);
  mustCondition(packet.draftOnly === true, 'packet is draft-only');
  mustCondition(packet.noWriteAction === true, 'packet keeps no write-action boundary');
  mustCondition(packet.readinessScorecard.readinessScore === scorecard.readinessScore, 'packet scorecard matches scorecard builder');

  const missing = dispatchActionPrep.buildDispatchMissingFieldSummary(sampleInput);
  mustCondition(missing.cannotProceedYet === true, 'missing summary marks incomplete input');
  mustCondition(missing.missingDriverFields.includes('driver contact'), 'missing summary keeps driver bucket');
  mustCondition(missing.missingVehicleFields.includes('vehicle plate'), 'missing summary keeps vehicle bucket');
  mustCondition(missing.missingRouteFields.includes('route confirmation'), 'missing summary keeps route bucket');

  const riskSummary = dispatchActionPrep.buildDispatchRiskSummary(sampleInput);
  mustCondition(Array.isArray(riskSummary.risks), 'risk summary keeps risk array');
  mustCondition(riskSummary.risks.length >= 1, 'risk summary has at least one risk');
  mustCondition(riskSummary.humanApprovalRequired === true, 'risk summary keeps human approval requirement');

  const questions = dispatchActionPrep.buildDispatchQuestionSet(sampleInput);
  mustCondition(Array.isArray(questions) && questions.length === 10, 'question set has 10 entries');
  mustCondition(questions.every((question) => typeof question.question === 'string' && typeof question.nextSafeStepCue === 'string'), 'question set keeps expected shape');

  const safeStep = dispatchActionPrep.buildSafeNextStepDraft(sampleInput);
  mustCondition(safeStep.humanApprovalRequired === true, 'safe next-step keeps human approval');
  mustCondition(safeStep.notApplied === true, 'safe next-step keeps notApplied');
  mustCondition(safeStep.notExecuted === true, 'safe next-step keeps notExecuted');
  mustCondition(safeStep.nextSafeStep === dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP, 'safe next-step keeps next step');

  const answer = dispatchActionPrep.composeDispatchActionPrepAnswer({ input: sampleInput, role: 'COMPANY', locale: 'tr' });
  mustCondition(answer.version === 'COPILOT-DISPATCH-ACTION-PREP-01', 'answer keeps version anchor');
  mustCondition(answer.visibleAnswer.includes('Dispatch hazırlık taslağını hazırladım'), 'answer keeps visible summary');
  mustCondition(answer.visibleAnswer.includes('dispatch apply'), 'answer keeps dispatch boundary');
  mustCondition(answer.visibleAnswer.includes('route apply'), 'answer keeps route boundary');
  mustCondition(answer.visibleAnswer.includes(dispatchActionPrep.COPILOT_DISPATCH_ACTION_PREP_NEXT_SAFE_STEP), 'answer keeps next safe step');
  mustCondition(answer.prepPacketDraft.draftOnly === true, 'answer keeps draft packet');
  mustCondition(answer.policy.role === 'COMPANY', 'answer keeps policy role');

  const intent = dispatchActionPrep.detectDispatchActionPrepIntent('dispatch hazırlık paketi ve evidence checklist');
  mustCondition(intent.matched === true, 'intent detector finds dispatch prep');
  mustCondition(intent.intent === 'dispatch_action_prep', 'intent detector labels dispatch prep');
  mustCondition(intent.score > 0, 'intent detector scores positive');

  const roles = dispatchActionPrep.listCopilotDispatchActionPrepRoles();
  mustCondition(Array.isArray(roles) && roles.length === 8, 'role list has 8 entries');
  for (const role of roles) {
    assertPolicy(role);
  }

  must(harnessCheck, 'check:copilotdispatchactionprep01', 'script harness check knows dispatch prep alias');
  must(harnessCheck, 'copilot_dispatch_action_prep_01_check.js', 'script harness check knows dispatch prep file');
  must(harnessCheck, 'COPILOT-DISPATCH-ACTION-PREP-01', 'script harness check knows dispatch prep milestone');
  must(harnessCheck, 'docs/COPILOT_DISPATCH_ACTION_PREP_01.md', 'script harness check knows dispatch prep doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'script harness check knows dispatch prep helper');

  must(harnessDoc, 'root:check:copilotdispatchactionprep01', 'script harness doc lists dispatch prep root check');
  must(harnessDoc, 'copilot_dispatch_action_prep_01_check.js', 'script harness doc lists dispatch prep check');
  must(harnessDoc, 'docs/COPILOT_DISPATCH_ACTION_PREP_01.md', 'script harness doc lists dispatch prep doc');
  must(harnessDoc, 'backend/src/ai/chat/copilotDispatchActionPrep.js', 'script harness doc lists dispatch prep helper');
  must(harnessDoc, 'COPILOT-DISPATCH-ACTION-PREP-01', 'script harness doc lists dispatch prep milestone');

  mustNoDiffExceptWithIdentity(
    ['backend/src/routes', 'backend/src/services', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    'backend route/service/schema and Prisma diff stays empty',
  );
  mustNoStagedPrefix(gitCachedNames(), ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/', 'debug.log'], 'runtime-data, browser-smoke and debug.log stay commit-external');

  console.log(`PASS COPILOT-DISPATCH-ACTION-PREP-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
