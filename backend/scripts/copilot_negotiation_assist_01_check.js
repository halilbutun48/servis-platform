#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as negotiationAssist from '../src/ai/chat/copilotNegotiationAssist.js';

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
  const policy = negotiationAssist.getCopilotNegotiationAssistPolicy(role);
  mustCondition(Boolean(policy), `policy exists for ${role}`);
  mustCondition(policy.role === role, `policy role matches ${role}`);
  mustCondition(policy.visible === expectedVisible, `policy visibility matches ${role}`);
  mustCondition(Array.isArray(policy.INPUT_SUMMARY), `${role} policy input summary is array`);
  mustCondition(Array.isArray(policy.SUPPORTED_NEGOTIATION_TYPES), `${role} policy supported types is array`);
  mustCondition(Array.isArray(policy.OPPORTUNITY_FIELDS), `${role} policy opportunity fields is array`);
  mustCondition(Array.isArray(policy.COUNTER_OFFER_FIELDS), `${role} policy counter-offer fields is array`);
  mustCondition(Array.isArray(policy.READINESS_FIELDS), `${role} policy readiness fields is array`);
  mustCondition(Array.isArray(policy.SAFETY_BOUNDARY_FLAGS), `${role} policy boundary flags is array`);
  mustCondition(Array.isArray(policy.BLOCKED_RUNTIME_ACTION), `${role} policy blocked runtime action is array`);
  mustCondition(Array.isArray(policy.NEVER_AUTOMATE), `${role} policy never automate is array`);
  mustCondition(Array.isArray(policy.TURKISH_VISIBLE_PHRASES), `${role} policy visible phrases is array`);
  mustCondition(Array.isArray(policy.BLOCKED_PHRASES), `${role} policy blocked phrases is array`);
  mustCondition(Array.isArray(policy.HANDOFFS), `${role} policy handoffs is array`);
  mustCondition(Array.isArray(policy.PUBLIC_PROMISE), `${role} policy public promise is array`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES, `${role} policy supports negotiation type`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS, `${role} policy keeps boundary flag`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS, `${role} policy keeps blocked action`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE, `${role} policy keeps never-automate phrase`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES, `${role} policy keeps visible phrase`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES, `${role} policy keeps blocked phrase`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_HANOFFS, `${role} policy keeps handoff`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY, `${role} policy keeps input summary`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS, `${role} policy keeps opportunity field`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS, `${role} policy keeps counter-offer field`);
  mustEach(JSON.stringify(policy), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS, `${role} policy keeps readiness field`);
  mustEach(policy.PUBLIC_PROMISE.join(' '), negotiationAssist.COPILOT_NEGOTIATION_ASSIST_PUBLIC_PROMISE, `${role} policy keeps public promise`);
}

async function main() {
  console.log('=== COPILOT-NEGOTIATION-ASSIST-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const humanPolicy = read('backend/src/ai/chat/copilotHumanApprovalPolicy.js');
  const humanDoc = read('docs/COPILOT_HUMAN_APPROVAL_01.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const doc = read('docs/COPILOT_NEGOTIATION_ASSIST_01.md');
  const helper = read('backend/src/ai/chat/copilotNegotiationAssist.js');
  const auditTrace = read('backend/scripts/audit_log_and_approval_trace_01_check.js');
  const roleRedteam = read('backend/scripts/role_data_isolation_redteam_01_check.js');
  const securityFinal = read('backend/scripts/security_kvkk_final_01_check.js');
  const cachedNames = gitCachedNames();
  const supportedTypes = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES;
  const roleNames = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_ROLE_NAMES;
  const stageTitles = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_STAGES.map((stage) => stage.title);
  const requiredCategories = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_CATEGORIES;
  const visiblePhrases = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES;
  const blockedPhrases = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES;
  const safetyExamples = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_SAFETY_EXAMPLES;
  const boundaryFlags = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS;
  const blockedActions = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS;
  const neverAutomate = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE;
  const handoffs = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_HANOFFS;
  const inputSummary = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY;
  const opportunityFields = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS;
  const counterOfferFields = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS;
  const readinessFields = negotiationAssist.COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS;
  const helperExports = [
    'COPILOT_NEGOTIATION_ASSIST_VERSION',
    'COPILOT_NEGOTIATION_ASSIST_STAGES',
    'COPILOT_NEGOTIATION_ASSIST_CATEGORIES',
    'COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES',
    'COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY',
    'COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS',
    'COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS',
    'COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS',
    'COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS',
    'COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS',
    'COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE',
    'COPILOT_NEGOTIATION_ASSIST_HANOFFS',
    'COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES',
    'COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES',
    'COPILOT_NEGOTIATION_ASSIST_SAFETY_EXAMPLES',
    'COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE',
    'COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP',
    'COPILOT_NEGOTIATION_ASSIST_ROLE_NAMES',
    'COPILOT_NEGOTIATION_ASSIST_POLICY',
    'detectNegotiationAssistIntent',
    'buildNegotiationAssistInput',
    'buildNegotiationInputSummary',
    'buildNegotiationOpportunityModel',
    'buildCounterOfferDraft',
    'buildNegotiationReadinessTable',
    'buildNegotiationQuestionSet',
    'buildNegotiationRiskSummary',
    'buildNegotiationValueSummary',
    'composeNegotiationAssistAnswer',
    'maskNegotiationSensitiveValue',
    'normalizeNegotiationField',
    'classifyNegotiationOpportunityTypes',
    'listCopilotNegotiationAssistRoles',
    'getCopilotNegotiationAssistPolicy',
    'buildNegotiationAssistRole',
  ];

  must(pkg, '"check:copilotnegotiationassist01": "node backend/scripts/copilot_negotiation_assist_01_check.js"', 'package.json exposes negotiation assist check');
  ordered(runner, ['check:copilotofferanalysis01', 'check:copilotnegotiationassist01', 'check:uxmarketplacepanels01'], 'product extensions runner places negotiation assist after offer analysis');
  ordered(verify, ['check:copilotofferanalysis01', 'check:copilotnegotiationassist01', 'check:uxmarketplacepanels01'], 'verify chain places negotiation assist after offer analysis');
  must(guide, 'COPILOT-NEGOTIATION-ASSIST-01', 'script guide mentions negotiation assist milestone');
  must(guide, 'check:copilotnegotiationassist01', 'script guide exposes negotiation assist check');
  must(guide, 'node backend\\scripts\\copilot_negotiation_assist_01_check.js', 'script guide includes negotiation assist command');
  must(guide, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'script guide includes negotiation assist doc');
  ordered(guide, ['COPILOT-OFFER-ANALYSIS-01', 'COPILOT-NEGOTIATION-ASSIST-01', 'COPILOT-OFFER-RECOMMENDATION-01'], 'script guide keeps negotiation assist after offer analysis');
  must(primer, 'COPILOT-NEGOTIATION-ASSIST-01', 'primer mentions negotiation assist milestone');
  must(primer, 'check:copilotnegotiationassist01', 'primer exposes negotiation assist check');
  must(primer, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'primer links negotiation assist doc');
  ordered(primer, ['COPILOT-OFFER-ANALYSIS-01', 'COPILOT-NEGOTIATION-ASSIST-01', 'COPILOT-OFFER-RECOMMENDATION-01', 'COPILOT-HUMAN-APPROVAL-01'], 'primer keeps negotiation assist between offer analysis and recommendation');
  must(roadmap, 'COPILOT-NEGOTIATION-ASSIST-01', 'roadmap keeps negotiation assist milestone');
  must(roadmap, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'roadmap links negotiation assist doc');
  must(humanPolicy, 'COPILOT-NEGOTIATION-ASSIST-01', 'human approval policy references negotiation assist milestone');
  must(humanDoc, 'COPILOT-NEGOTIATION-ASSIST-01', 'human approval doc references negotiation assist milestone');
  must(humanDoc, 'check:copilotnegotiationassist01', 'human approval doc exposes negotiation assist check');
  must(harnessCheck, 'check:copilotnegotiationassist01', 'harness check knows negotiation assist alias');
  must(harnessCheck, 'copilot_negotiation_assist_01_check.js', 'harness check knows negotiation assist file');
  must(harnessCheck, 'COPILOT-NEGOTIATION-ASSIST-01', 'harness check knows negotiation assist milestone');
  must(harnessCheck, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'harness check knows negotiation assist doc');
  must(harnessCheck, 'backend/src/ai/chat/copilotNegotiationAssist.js', 'harness check knows negotiation assist helper');
  must(harnessDoc, 'Negotiation assist milestone: `COPILOT-NEGOTIATION-ASSIST-01`', 'harness doc lists negotiation assist milestone');
  must(harnessDoc, 'check:copilotnegotiationassist01', 'harness doc lists negotiation assist check');
  must(harnessDoc, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'harness doc lists negotiation assist doc');
  must(harnessDoc, 'node backend\\scripts\\copilot_negotiation_assist_01_check.js', 'harness doc lists negotiation assist command');
  must(harnessDoc, 'backend/src/ai/chat/copilotNegotiationAssist.js', 'harness doc lists negotiation assist helper');
  must(harnessDoc, 'root:check:copilotnegotiationassist01', 'harness doc lists negotiation assist root check');
  must(auditTrace, 'backend/scripts/copilot_negotiation_assist_01_check.js', 'audit trace allowlist mentions negotiation assist check');
  must(auditTrace, 'backend/src/ai/chat/copilotNegotiationAssist.js', 'audit trace allowlist mentions negotiation assist helper');
  must(auditTrace, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'audit trace allowlist mentions negotiation assist doc');
  must(roleRedteam, 'backend/scripts/copilot_negotiation_assist_01_check.js', 'role redteam allowlist mentions negotiation assist check');
  must(roleRedteam, 'backend/src/ai/chat/copilotNegotiationAssist.js', 'role redteam allowlist mentions negotiation assist helper');
  must(roleRedteam, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'role redteam allowlist mentions negotiation assist doc');
  must(securityFinal, 'backend/scripts/copilot_negotiation_assist_01_check.js', 'security allowlist mentions negotiation assist check');
  must(securityFinal, 'backend/src/ai/chat/copilotNegotiationAssist.js', 'security allowlist mentions negotiation assist helper');
  must(securityFinal, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md', 'security allowlist mentions negotiation assist doc');

  must(helper, "from './copilotOfferAnalysis.js';", 'helper imports offer analysis helper');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_VERSION', 'helper exports version marker');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_STAGES', 'helper exports stages');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_CATEGORIES', 'helper exports categories');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES', 'helper exports supported types');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY', 'helper exports input summary');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS', 'helper exports opportunity fields');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS', 'helper exports counter-offer fields');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS', 'helper exports readiness fields');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS', 'helper exports boundary flags');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS', 'helper exports blocked actions');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE', 'helper exports never automate');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_HANOFFS', 'helper exports handoffs');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES', 'helper exports Turkish phrases');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES', 'helper exports blocked phrases');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_SAFETY_EXAMPLES', 'helper exports safety examples');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE', 'helper exports execution state');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP', 'helper exports next safe step');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_ROLE_NAMES', 'helper exports role names');
  must(helper, 'COPILOT_NEGOTIATION_ASSIST_POLICY', 'helper exports policy');
  must(helper, 'detectNegotiationAssistIntent', 'helper exports intent detector');
  must(helper, 'buildNegotiationAssistInput', 'helper exports answer builder');
  must(helper, 'buildNegotiationInputSummary', 'helper exports input summary builder');
  must(helper, 'buildNegotiationOpportunityModel', 'helper exports opportunity model builder');
  must(helper, 'buildCounterOfferDraft', 'helper exports counter-offer draft builder');
  must(helper, 'buildNegotiationReadinessTable', 'helper exports readiness table builder');
  must(helper, 'buildNegotiationQuestionSet', 'helper exports question set builder');
  must(helper, 'buildNegotiationRiskSummary', 'helper exports risk summary builder');
  must(helper, 'buildNegotiationValueSummary', 'helper exports value summary builder');
  must(helper, 'composeNegotiationAssistAnswer', 'helper exports composer');
  must(helper, 'maskNegotiationSensitiveValue', 'helper exports masker');
  must(helper, 'normalizeNegotiationField', 'helper exports normalizer');
  must(helper, 'classifyNegotiationOpportunityTypes', 'helper exports classifier');
  must(helper, 'listCopilotNegotiationAssistRoles', 'helper exports role lister');
  must(helper, 'getCopilotNegotiationAssistPolicy', 'helper exports policy getter');
  must(helper, 'buildNegotiationAssistRole', 'helper exports role builder');
  must(helper, 'Pazarlık hazırlık taslağını oluşturdum; henüz hiçbir tedarikçiye mesaj gönderilmedi.', 'helper keeps visible Turkish phrase');
  must(helper, 'Hiçbir teklif kabul edilmedi veya reddedilmedi.', 'helper keeps visible Turkish phrase');
  must(helper, 'Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.', 'helper keeps visible Turkish phrase');
  must(helper, 'Pazarlık için öne çıkan başlıklar: fiyat kapsamı, dahil/hariç kalemler, SLA, kapasite ve belge netliği.', 'helper keeps visible Turkish phrase');
  must(helper, 'Sıradaki güvenli adım: pazarlık taslağını kontrol edip insan onayına sunmak.', 'helper keeps visible Turkish phrase');
  must(helper, 'draftOnly=true', 'helper keeps draftOnly flag');
  must(helper, 'notSent=true', 'helper keeps notSent flag');
  must(helper, 'notContacted=true', 'helper keeps notContacted flag');
  must(helper, 'notAccepted=true', 'helper keeps notAccepted flag');
  must(helper, 'notRejected=true', 'helper keeps notRejected flag');
  must(helper, 'notSelected=true', 'helper keeps notSelected flag');
  must(helper, 'approvalRequired=true', 'helper keeps approvalRequired flag');
  must(helper, 'humanReviewRequired=true', 'helper keeps human review flag');
  must(doc, 'No route / service / prisma diff.', 'doc keeps prisma boundary wording');
  must(doc, 'No production DB.', 'doc keeps production DB boundary wording');
  must(doc, 'No destructive query.', 'doc keeps destructive query boundary wording');
  must(doc, 'No browser / public probe.', 'doc keeps browser boundary wording');
  must(doc, 'No write-action.', 'doc keeps write-action boundary wording');
  must(doc, 'No message / email / SMS / push.', 'doc keeps messaging boundary wording');
  must(doc, 'No supplier selection.', 'doc keeps supplier selection boundary wording');
  must(doc, 'No offer accept / reject.', 'doc keeps offer accept/reject boundary wording');
  must(doc, 'No agreement / contract execute.', 'doc keeps agreement boundary wording');
  must(doc, 'No dispatch apply.', 'doc keeps dispatch boundary wording');
  must(doc, 'No route apply.', 'doc keeps route boundary wording');
  must(doc, 'No payment / hakediş execute.', 'doc keeps payment boundary wording');
  must(helper, 'backend/src/ai/chat/copilotNegotiationAssist.js stays under 1000 lines', 'helper keeps line-count summary');
  must(helper, 'check:copilotofferanalysis01 -> check:copilotnegotiationassist01 -> check:copilotofferrecommendation01 -> check:copilothumanapproval01 remains wired', 'helper keeps chain wiring summary');
  must(helper, 'product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none', 'helper keeps smoke threshold summary');
  must(helper, 'runtime-data, browser-smoke, load-test, db-scaling, observability, data-integrity, role-redteam, security-kvkk, audit-trace ve debug.log commit dışı kalır', 'helper keeps commit-external summary');
  must(helper, 'No route/service/prisma diff; no production DB; no schema/migration; read-only only', 'helper keeps prisma summary');
  must(helper, 'Pazarlık hazırlık taslağı', 'helper contains negotiation framing');
  must(helper, 'counter-offer draft', 'helper contains counter-offer draft wording');
  must(helper, 'supplierQuestionSummary', 'helper exposes supplier question summary key');
  must(helper, 'valueSummary', 'helper exposes value summary key');
  must(helper, 'riskSummary', 'helper exposes risk summary key');
  must(helper, 'auditApprovalSummary', 'helper exposes audit approval summary key');
  must(helper, 'lineCountSummary', 'helper exposes line count summary key');
  must(helper, 'visibleAnswer', 'helper exposes visible answer key');

  mustEach(helper, helperExports, 'helper exports');
  mustCondition(negotiationAssist.COPILOT_NEGOTIATION_ASSIST_VERSION === 'COPILOT-NEGOTIATION-ASSIST-01', 'helper version constant matches milestone');
  mustCondition(negotiationAssist.COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE.includes('draft_only'), 'execution state stays draft only');
  mustCondition(negotiationAssist.COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP.length > 0, 'next safe step exists');
  mustCondition(fs.existsSync(path.join(root, 'backend/src/ai/chat/copilotNegotiationAssist.js')), 'negotiation helper file exists');
  mustCondition(fs.existsSync(path.join(root, 'backend/scripts/copilot_negotiation_assist_01_check.js')), 'negotiation check file exists');
  mustCondition(fs.existsSync(path.join(root, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md')), 'negotiation doc file exists');

  mustCommandPass(['git', 'diff', '--check'], 'git diff --check is clean');
  mustCommandPass(['git', 'diff', '--cached', '--check'], 'git diff --cached --check is clean');
  mustCommandPass(['git', 'show', '--check', '--stat', 'HEAD'], 'git show --check --stat HEAD is clean');
  mustNoDiff(['backend/src/routes', 'backend/src/services', 'prisma', 'backend/prisma'], 'route/service/prisma diffs stay empty');
  mustCondition(cachedNames.length === 0, 'stage stays empty');
  mustCondition(!fs.existsSync(path.join(root, 'debug.log')), 'debug.log stays absent');

  const negotiationTypeLabels = [
    'Fiyat iyileştirme',
    'Kapsam netleştirme',
    'Dahil kalemler',
    'Hariç kalemler',
    'Kapasite taahhüdü',
    'Zamanlama taahhüdü',
    'SLA taahhüdü',
    'Belge / uyum netliği',
    'Sigorta / güvenlik',
    'Geçerlilik uzatma',
    'Ödeme şartları',
    'Servis kalitesi',
    'Rota / vardiya netliği',
    'Genel pazarlık',
  ];

  const analysisFixture = Object.freeze({
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
    comparisonMatrix: Object.freeze([
      Object.freeze({
        supplierRef: 'supplier-opa-01',
        supplierLabelMasked: 'Al***Ş',
        opportunityType: 'price_improvement',
        currentIssue: 'Fiyat bileşeni pazarlık alanı bırakıyor.',
        suggestedAsk: 'Fiyatı kalemlere ayırıp indirim / iskonto payını netleştirin.',
        rationale: 'En düşük fiyat tek başına karar değildir.',
        riskIfUnresolved: 'Fiyat netleşmezse bütçe sapması riski kalır.',
        priority: 'high',
        missingFields: ['price'],
        riskNotes: ['Bütçe varyansı'],
        normalizedPriceSummary: '145000 TRY / aylık',
        offerState: 'partial',
      }),
      Object.freeze({
        supplierRef: 'supplier-opa-02',
        supplierLabelMasked: 'Be***d',
        opportunityType: 'sla_commitment',
        currentIssue: 'SLA / kalite taahhüdü yeterince görünür değil.',
        suggestedAsk: 'SLA metriklerini ve kalite taahhüdünü yazılı netleştirin.',
        rationale: 'SLA netliği servis kalitesini korur.',
        riskIfUnresolved: 'SLA netleşmezse kalite sapması riski büyür.',
        priority: 'medium',
        missingFields: ['sla'],
        riskNotes: ['Kalite görünürlüğü'],
        normalizedPriceSummary: '155000 TRY / aylık',
        offerState: 'partial',
      }),
    ]),
    collectionState: 'received_draft',
    message: 'pazarlık taslağı hazırla',
  });

  const draft = negotiationAssist.buildNegotiationAssistInput(analysisFixture, { message: 'pazarlık taslağı hazırla', negotiationTypeHint: 'price_improvement' });
  const composed = negotiationAssist.composeNegotiationAssistAnswer({ negotiationAssist: analysisFixture, message: 'karşı teklif hazırla', negotiationTypeHint: 'price_improvement' });

  mustCondition(draft.intentType === 'negotiation_prep_request', 'draft intent type matches negotiation prep');
  mustCondition(draft.negotiationType === 'price_improvement', 'draft negotiation type follows forced opportunity');
  mustCondition(draft.negotiationTypeLabel === 'Fiyat iyileştirme', 'draft negotiation label matches forced opportunity');
  mustCondition(draft.negotiationIntentSummary.includes('draftOnly=true'), 'draft intent summary keeps draftOnly');
  mustCondition(draft.negotiationIntentSummary.includes('notSent=true'), 'draft intent summary keeps notSent');
  mustCondition(draft.negotiationIntentSummary.includes('approvalRequired=true'), 'draft intent summary keeps approvalRequired');
  mustCondition(draft.negotiationTypeSummary.includes('Fiyat iyileştirme'), 'draft type summary includes price improvement');
  mustEach(draft.negotiationTypeSummary, negotiationTypeLabels, 'draft type summary keeps supported labels');
  mustCondition(draft.negotiationInputSummaryText.includes('rfqType=personel servis'), 'draft input summary keeps rfqType');
  mustCondition(draft.negotiationInputSummaryText.includes('candidateSuppliersMasked=Al****Ş, Be****d'), 'draft input summary keeps masked suppliers');
  mustCondition(draft.negotiationInputSummaryText.includes('analyzedOfferCount=2'), 'draft input summary keeps analyzed offer count');
  mustCondition(draft.negotiationInputSummaryText.includes('missingOrRiskyOfferCount=2'), 'draft input summary keeps missing/risky count');
  mustCondition(draft.opportunities.length === 2, 'draft returns two opportunities');
  mustCondition(draft.counterOfferDrafts.length === 2, 'draft returns two counter-offer drafts');
  mustCondition(draft.readinessTable.length === 2, 'draft returns two readiness rows');
  mustCondition(draft.supplierQuestionSet.length === 2, 'draft returns two supplier questions');
  mustCondition(draft.valueSummary.includes('En düşük fiyat tek başına karar değildir'), 'draft value summary keeps policy');
  mustCondition(draft.riskSummary.includes('2 yüksek / 0 orta / 0 düşük'), 'draft risk summary keeps risk counts');
  mustCondition(draft.safetyPhraseSummary.includes('notSent=true'), 'draft safety summary keeps notSent');
  mustCondition(draft.safetyPhraseSummary.includes('mesaj / kabul / ret / seçim / sözleşme / gönderim yok'), 'draft safety summary keeps blocked actions');
  mustCondition(draft.kvkkSafeSummary.includes('masked supplier labels kullanılır'), 'draft KVKK summary keeps masking policy');
  mustCondition(draft.auditApprovalSummary.includes('human approval boundary'), 'draft audit summary keeps human approval boundary');
  mustCondition(draft.noWriteActionSummary.includes('provider credential use açılmaz'), 'draft no-write summary keeps credential boundary');
  mustCondition(draft.chainWiringSummary.includes('check:copilotnegotiationassist01'), 'draft chain wiring keeps negotiation assist check');
  mustCondition(draft.smokeThresholdSummary.includes('product-flow PASS 18/0/0/0'), 'draft smoke summary keeps product-flow threshold');
  mustCondition(draft.commitExternalSummary.includes('debug.log commit dışı kalır'), 'draft commit-external summary keeps debug.log boundary');
  mustCondition(draft.prismaSummary.includes('No route/service/prisma diff'), 'draft prisma summary keeps route/service/prisma boundary');
  mustCondition(draft.lineCountSummary.includes('under 1000 lines'), 'draft line-count summary keeps line cap');
  mustCondition(draft.visibleAnswer.includes('Pazarlık hazırlık taslağını oluşturdum'), 'draft visible answer keeps lead sentence');
  mustCondition(draft.visibleAnswer.includes('Hiçbir teklif kabul edilmedi veya reddedilmedi.'), 'draft visible answer keeps acceptance boundary');
  mustCondition(draft.visibleAnswer.includes('Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.'), 'draft visible answer keeps supplier-selection boundary');
  mustCondition(draft.visibleAnswer.includes('Pazarlık için öne çıkan başlıklar'), 'draft visible answer keeps topic summary');
  mustCondition(draft.visibleAnswer.includes('Sıradaki güvenli adım: pazarlık taslağını kontrol edip insan onayına sunmak.'), 'draft visible answer keeps next safe step');
  mustCondition(draft.draftOnly === true, 'draftOnly flag stays true');
  mustCondition(draft.notSent === true, 'notSent flag stays true');
  mustCondition(draft.notContacted === true, 'notContacted flag stays true');
  mustCondition(draft.notAccepted === true, 'notAccepted flag stays true');
  mustCondition(draft.notRejected === true, 'notRejected flag stays true');
  mustCondition(draft.notSelected === true, 'notSelected flag stays true');
  mustCondition(draft.approvalRequired === true, 'approvalRequired flag stays true');
  mustCondition(draft.humanReviewRequired === true, 'humanReviewRequired flag stays true');
  mustCondition(draft.nextSafeStep === 'pazarlık taslağını kontrol edip insan onayına sunmak', 'next safe step stays safe');
  mustCondition(composed.negotiationType === draft.negotiationType, 'compose helper reuses negotiation type');
  mustCondition(composed.negotiationIntentSummary.includes('draftOnly=true'), 'compose helper keeps draftOnly');

  for (const type of supportedTypes) {
    const classified = negotiationAssist.classifyNegotiationOpportunityTypes({ negotiationTypeHint: type });
    mustCondition(classified.length === 1, `classifier keeps single forced type for ${type}`);
    mustCondition(classified[0] === type, `classifier returns forced type ${type}`);
    const intent = negotiationAssist.detectNegotiationAssistIntent({ message: `taslak ${type}`, negotiationTypeHint: type });
    mustCondition(intent.negotiationType === type, `intent keeps forced negotiation type ${type}`);
    mustCondition(intent.approvalRequired === true, `intent keeps approval flag for ${type}`);
    mustCondition(intent.draftOnly === true, `intent keeps draftOnly flag for ${type}`);
    const typeDraft = negotiationAssist.buildNegotiationAssistInput({ comparisonMatrix: analysisFixture.comparisonMatrix, sourceRfqSummary: analysisFixture.sourceRfqSummary, collectionState: 'received_draft' }, { message: 'hazırla', negotiationTypeHint: type });
    mustCondition(typeDraft.negotiationType === type, `draft keeps forced negotiation type ${type}`);
    mustCondition(typeDraft.negotiationTypeSummary.includes(negotiationTypeLabels[supportedTypes.indexOf(type)]), `draft summary keeps label for ${type}`);
  }

  const blockedIntent = negotiationAssist.detectNegotiationAssistIntent('Mesaj gönderdim ve teklifi kabul ettim.');
  mustCondition(blockedIntent.intentType === 'execution_blocked_request', 'blocked intent detected');
  mustCondition(blockedIntent.blockedExecutionRequest === true, 'blocked intent keeps blockedExecutionRequest');
  mustCondition(blockedIntent.notSent === true, 'blocked intent keeps notSent');
  mustCondition(blockedIntent.notAccepted === true, 'blocked intent keeps notAccepted');
  mustCondition(blockedIntent.notRejected === true, 'blocked intent keeps notRejected');
  mustCondition(blockedIntent.notSelected === true, 'blocked intent keeps notSelected');

  for (const role of roleNames) {
    assertRolePolicy(role, !['DRIVER', 'PERSONEL', 'PARENT'].includes(role), helper);
  }

  mustEach(helper, stageTitles, 'helper stages');
  ordered(helper, stageTitles, 'helper keeps stage order');
  mustEach(helper, requiredCategories, 'helper categories');
  mustEach(helper, supportedTypes, 'helper supported types');
  mustEach(helper, inputSummary, 'helper input summary');
  mustEach(helper, opportunityFields, 'helper opportunity fields');
  mustEach(helper, counterOfferFields, 'helper counter-offer fields');
  mustEach(helper, readinessFields, 'helper readiness fields');
  mustEach(helper, boundaryFlags, 'helper boundary flags');
  mustEach(helper, blockedActions, 'helper blocked actions');
  mustEach(helper, neverAutomate, 'helper never automate phrases');
  mustEach(helper, handoffs, 'helper handoffs');
  mustEach(helper, visiblePhrases, 'helper visible phrases');
  mustEach(helper, blockedPhrases, 'helper blocked phrases');
  mustEach(helper, safetyExamples, 'helper safety examples');
  mustEach(helper, roleNames, 'helper role names');

  mustCondition(fs.readFileSync(path.join(root, 'backend/src/ai/chat/copilotNegotiationAssist.js'), 'utf8').split(/\r?\n/).length < 1000, 'helper line count stays under 1000');
  mustCondition(fs.readFileSync(path.join(root, 'docs/COPILOT_NEGOTIATION_ASSIST_01.md'), 'utf8').includes('PASS COPILOT-NEGOTIATION-ASSIST-01'), 'doc keeps pass marker');

  console.log(`=== COPILOT-NEGOTIATION-ASSIST-01 CHECK PASS ===`);
  console.log(`guardCases=${guardCases}, passCount=${passCount}, failCount=${failCount}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
  console.log(`guardCases=${guardCases}, passCount=${passCount}, failCount=${failCount}`);
});
