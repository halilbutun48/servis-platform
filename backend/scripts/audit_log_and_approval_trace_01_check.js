#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  runner: path.join(repoRoot, "backend", "scripts", "run_product_extensions_check_chain.js"),
  verify: path.join(repoRoot, "backend", "scripts", "verify_chain_01_product_extensions_check.js"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "AUDIT_LOG_AND_APPROVAL_TRACE_01.md"),
  securityDoc: path.join(repoRoot, "docs", "SECURITY_KVKK_FINAL_01.md"),
  dataIntegrityDoc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  debugLog: path.join(repoRoot, "debug.log"),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContains(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) {
      throw new Error(`FAIL ${label}: missing ${needle}`);
    }
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitStatusNames() {
  const out = execFileSync("git", ["status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*../, "").trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) {
    throw new Error(`FAIL ${label}: ${unexpected.join(", ")}`);
  }
  console.log(`OK ${label}`);
}

function main() {
  console.log("=== AUDIT-LOG-AND-APPROVAL-TRACE-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const securityDoc = readFile(paths.securityDoc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);

  const runtimeDataFiles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
  ];

  const allowedStatusNames = new Set([
    ...runtimeDataFiles,
    "tools/repo_contract_state.json",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/scripts/role_data_isolation_redteam_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/financial_operations_surface_and_rbac_01_check.js",
    "backend/src/finance/",
    "backend/src/finance/financialOperationsScope.js",
    "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md",
    "web/src/panels/room/DriversPanel.jsx",
    "backend/scripts/supplier_matching_01_check.js",
    "backend/scripts/supplier_offer_collect_01_check.js",
    "backend/scripts/copilot_offer_analysis_01_check.js",
    "backend/scripts/copilot_negotiation_assist_01_check.js",
    "backend/scripts/copilot_offer_recommendation_01_check.js",
    "backend/scripts/copilot_demand_intake_01_check.js",
    "backend/scripts/copilot_shift_to_agreement_prep_01_check.js",
    "backend/scripts/copilot_dispatch_action_prep_01_check.js",
    "backend/scripts/copilot_action_prep_01_check.js",
    "backend/src/ai/chat/copilotDemandIntake.js",
    "backend/src/ai/chat/copilotOfferAnalysis.js",
    "backend/src/ai/chat/copilotNegotiationAssist.js",
    "backend/src/ai/chat/copilotOfferRecommendation.js",
    "backend/src/ai/chat/copilotShiftToAgreementPrep.js",
    "backend/src/ai/chat/copilotDispatchActionPrep.js",
    "backend/src/ai/chat/copilotActionPrep.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "backend/src/ai/chat/supplierMatching.js",
    "backend/src/ai/chat/supplierOfferCollect.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_INTAKE_01.md",
    "docs/COPILOT_OFFER_ANALYSIS_01.md",
    "docs/COPILOT_NEGOTIATION_ASSIST_01.md",
    "docs/COPILOT_OFFER_RECOMMENDATION_01.md",
    "docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md",
    "docs/COPILOT_DISPATCH_ACTION_PREP_01.md",
    "docs/COPILOT_ACTION_PREP_01.md",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/SUPPLIER_MATCHING_01.md",
    "docs/SUPPLIER_OFFER_COLLECT_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/scripts/copilot_rfq_prep_01_check.js",
    "backend/src/ai/chat/copilotRfqPrep.js",
    "docs/COPILOT_RFQ_PREP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/security_kvkk_final_01_check.js",
    "backend/scripts/audit_log_and_approval_trace_01_check.js",
    "docs/SECURITY_KVKK_FINAL_01.md",
    "docs/DATA_INTEGRITY_AND_RECOVERY_01.md",
    "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/PRIMER_SSOT.md",
  ]);

  const wiringNeedles = [
    [pkg, '"check:auditlogandapprovaltrace01": "node backend/scripts/audit_log_and_approval_trace_01_check.js"'],
    [runner, "check:auditlogandapprovaltrace01"],
    [verify, "check:auditlogandapprovaltrace01"],
    [harnessCheck, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [harnessCheck, "check:auditlogandapprovaltrace01"],
    [harnessCheck, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [harnessCheck, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [harnessDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [harnessDoc, "check:auditlogandapprovaltrace01"],
    [harnessDoc, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [harnessDoc, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [guide, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [guide, "check:auditlogandapprovaltrace01"],
    [guide, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [guide, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [primer, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [primer, "check:auditlogandapprovaltrace01"],
    [primer, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [primer, "backend/scripts/audit_log_and_approval_trace_01_check.js"],
    [securityDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [dataIntegrityDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
  ];
  for (const [text, needle] of wiringNeedles) {
    addContains(cases, `wiring contains ${needle}`, text, needle);
  }

  const headings = [
    "# AUDIT-LOG-AND-APPROVAL-TRACE-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Auditability principles",
    "## 4) Event taxonomy",
    "## 5) Approval trace lifecycle",
    "## 6) Action-prep vs execution boundary",
    "## 7) Approval-required action matrix",
    "## 8) KVKK-safe audit payload policy",
    "## 9) Never-log / never-store matrix",
    "## 10) Role / tenant / scope audit policy",
    "## 11) Rejection / cancel / timeout / stale approval policy",
    "## 12) Runtime-data / generated artifact / commit-external boundary",
    "## 13) AI / Copilot recommendation trace policy",
    "## 14) No write-action / human approval boundary",
    "## 15) Release gate checklist",
    "## 16) What is not changed",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of headings) {
    addContains(cases, `doc heading ${heading}`, doc, heading);
  }
  addCase(cases, "doc heading order", () => {
    ordered(doc, headings, "audit trace doc heading order");
  });

  const principleNeedles = [
    "static policy / doc / code inventory",
    "Probe gerekli değildir",
    "append-only",
    "deterministic",
    "Action-prep",
    "execution boundary",
    "correlationId",
    "requestId",
    "Companion references",
    "raw secret",
  ];
  for (const needle of principleNeedles) {
    addContains(cases, `principle ${needle}`, doc, needle);
  }

  const eventTaxonomy = [
    "recommendation_prepared",
    "approval_requested",
    "approval_granted",
    "approval_rejected",
    "approval_cancelled",
    "approval_expired",
    "action_blocked",
    "action_not_executed",
    "human_override",
    "safety_policy_blocked",
    "stale_context_blocked",
    "scope_mismatch_blocked",
  ];
  for (const needle of eventTaxonomy) {
    addContains(cases, `event taxonomy ${needle}`, doc, needle);
  }

  addCase(cases, "event lifecycle order", () => {
    ordered(doc, [
      "recommendation_prepared",
      "approval_requested",
      "approval_granted",
      "approval_rejected",
      "approval_cancelled",
      "approval_expired",
      "action_blocked",
      "action_not_executed",
      "human_override",
      "safety_policy_blocked",
      "stale_context_blocked",
      "scope_mismatch_blocked",
    ], "audit trace lifecycle order");
  });

  const boundaryNeedles = [
    "PREPARE",
    "DRAFT",
    "EXECUTE",
    "Hidden background action",
    "Silent write-action",
    "Write-action dispatcher",
  ];
  for (const needle of boundaryNeedles) {
    addContains(cases, `action boundary ${needle}`, doc, needle);
  }

  const approvalMatrixNeedles = [
    "RFQ send",
    "offer accept/reject",
    "agreement execute",
    "dispatch apply",
    "driver/vehicle assign",
    "route apply",
    "payment/hakediş execute",
    "messaging/SMS/email/push",
    "provider credential read/write/use",
    "user/admin write",
    "public lead conversion",
    "quality decision apply",
    "agreement route refresh apply",
  ];
  for (const needle of approvalMatrixNeedles) {
    addContains(cases, `approval matrix ${needle}`, doc, needle);
  }

  const payloadFields = [
    "eventType",
    "actorRole",
    "actorScopeType",
    "actorScopeIdHashOrOpaqueRef",
    "targetType",
    "targetScopeType",
    "targetScopeIdHashOrOpaqueRef",
    "actionType",
    "approvalState",
    "policyVersion",
    "reasonCode",
    "timestamp",
    "correlationId",
    "requestId",
    "sourceSurface",
  ];
  for (const needle of payloadFields) {
    addContains(cases, `payload field ${needle}`, doc, needle);
  }

  const neverLogNeedles = [
    "full name",
    "phone",
    "address",
    "email",
    "TCKN",
    "token",
    "refresh token",
    "cookie",
    "password",
    "provider credential",
    "raw GPS",
    "debug payload",
    "secret header",
    "raw access token",
    "raw session token",
  ];
  for (const needle of neverLogNeedles) {
    addContains(cases, `never-log ${needle}`, doc, needle);
  }

  const scopeNeedles = [
    "SUPER_ADMIN",
    "COMPANY",
    "ROOM",
    "DRIVER",
    "PERSONEL",
    "PARENT",
    "SCHOOL",
    "ORGANIZATION",
    "actorScopeType",
    "targetScopeType",
    "actorScopeIdHashOrOpaqueRef",
    "targetScopeIdHashOrOpaqueRef",
    "cross-tenant",
    "cross-org",
    "Scope mismatch blocked",
  ];
  for (const needle of scopeNeedles) {
    addContains(cases, `scope policy ${needle}`, doc, needle);
  }

  const rejectionNeedles = [
    "approval_rejected",
    "approval_cancelled",
    "approval_expired",
    "stale_context_blocked",
    "scope_mismatch_blocked",
    "safety_policy_blocked",
    "action_not_executed",
    "Silent fallback to execution yoktur",
  ];
  for (const needle of rejectionNeedles) {
    addContains(cases, `rejection policy ${needle}`, doc, needle);
  }

  const runtimeBoundaryNeedles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
    "backend/artifacts/browser-smoke/",
    "backend/artifacts/load-test/",
    "backend/artifacts/db-scaling/",
    "backend/artifacts/observability/",
    "backend/artifacts/data-integrity/",
    "backend/artifacts/role-redteam/",
    "backend/artifacts/security-kvkk/",
    "backend/artifacts/audit-trace/",
    "debug.log",
    "No stage/commit/tag/push",
  ];
  for (const needle of runtimeBoundaryNeedles) {
    addContains(cases, `runtime boundary ${needle}`, doc, needle);
  }

  const aiTraceNeedles = [
    "Copilot öneri, hazırlık ve risk özeti üretebilir",
    "recommendation_prepared",
    "approval_requested",
    "COPILOT-HUMAN-APPROVAL-01",
    "COPILOT-AI-ACTION-ROADMAP-01",
    "COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01",
    "Runtime AI/model execution açılmaz",
    "Tool execution açılmaz",
    "Write-action açılmaz",
    "Human approval explicit ve auditable kalır",
  ];
  for (const needle of aiTraceNeedles) {
    addContains(cases, `ai trace ${needle}`, doc, needle);
  }

  const noWriteNeedles = [
    "No production DB",
    "No public URL",
    "No real token/credential generation",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "No runtime AI/model execution",
    "No stage/commit/tag/push",
    "No smoke threshold loosening",
    "No 429 allowlist",
    "No hidden auto-execute",
    "No admin/user write",
  ];
  for (const needle of noWriteNeedles) {
    addContains(cases, `write boundary ${needle}`, doc, needle);
  }

  const releaseGateNeedles = [
    "check:auditlogandapprovaltrace01",
    "check:securitykvkkfinal01",
    "check:roledataisolationredteam01",
    "check:dataintegrityandrecovery01",
    "check:backendlintwarningburndown01",
    "check:observabilitymonitoringalerting01",
    "check:dbpoolandapiscaling01",
    "check:loadtest2000users01",
    "check:cachecoalescingandbackoff01",
    "check:dashboardbulkendpoint01",
    "check:productionratelimitpolicy01",
    "check:requeststormresilience01",
    "check:airesponsesemanticqualitygate01",
    "check:testqualityandflakeaudit01",
    "check:hotfilesplitwebpanels01",
    "check:hotfilesplitaichatcomposers01",
    "check:copilotnextbestactionengine01",
    "check:copilotoperationhealthengine01",
    "check:copilotplanreviewengine01",
    "check:copilotworkflowreasoningengine01",
    "check:seferabiturkishterminology01",
    "check:seferabiturkishuserfacinglanguage01",
    "check:copilotriskscoringengine01",
    "check:copilotrootcauseengine01",
    "check:copilotsmartdiagnosticengine01",
    "check:copilotdynamicquestionengine01",
    "check:copilotclarifyingquestionengine01",
    "check:copilotroutereviewhumanapproval01",
    "check:exceltoroutereadinessredteam01",
    "check:product-extensions",
    "verify:repo",
    "verify:final",
    "npm --prefix backend run lint",
    "npm --prefix web run lint",
    "18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
  ];
  for (const needle of releaseGateNeedles) {
    addContains(cases, `release gate ${needle}`, doc, needle);
  }
  addCase(cases, "release gate checklist order", () => {
    ordered(doc, [
      "check:auditlogandapprovaltrace01",
      "check:securitykvkkfinal01",
      "check:roledataisolationredteam01",
      "check:dataintegrityandrecovery01",
      "check:backendlintwarningburndown01",
      "check:observabilitymonitoringalerting01",
      "check:dbpoolandapiscaling01",
      "check:loadtest2000users01",
      "check:cachecoalescingandbackoff01",
      "check:dashboardbulkendpoint01",
      "check:productionratelimitpolicy01",
      "check:requeststormresilience01",
      "check:airesponsesemanticqualitygate01",
      "check:testqualityandflakeaudit01",
      "check:hotfilesplitwebpanels01",
      "check:hotfilesplitaichatcomposers01",
      "check:copilotnextbestactionengine01",
      "check:copilotoperationhealthengine01",
      "check:copilotplanreviewengine01",
      "check:copilotworkflowreasoningengine01",
      "check:seferabiturkishterminology01",
      "check:seferabiturkishuserfacinglanguage01",
      "check:copilotriskscoringengine01",
      "check:copilotrootcauseengine01",
      "check:copilotsmartdiagnosticengine01",
      "check:copilotdynamicquestionengine01",
      "check:copilotclarifyingquestionengine01",
      "check:copilotroutereviewhumanapproval01",
      "check:exceltoroutereadinessredteam01",
      "check:product-extensions",
      "verify:repo",
      "verify:final",
      "npm --prefix backend run lint",
      "npm --prefix web run lint",
    ], "audit trace release gate order");
  });

  const companionNeedles = [
    "SECURITY-KVKK-FINAL-01",
    "ROLE-DATA-ISOLATION-REDTEAM-01",
    "DATA-INTEGRITY-AND-RECOVERY-01",
    "OBSERVABILITY-MONITORING-ALERTING-01",
    "DB-POOL-AND-API-SCALING-01",
    "LOAD-TEST-2000-USERS-01",
    "CACHE-COALESCING-AND-BACKOFF-01",
    "REQUEST-STORM-RESILIENCE-01",
    "PRODUCTION-RATE-LIMIT-POLICY-01",
  ];
  for (const needle of companionNeedles) {
    addContains(cases, `companion ${needle}`, doc, needle);
  }

  const validationTokens = [
    "auditabilitySummary",
    "approvalMatrixSummary",
    "eventTaxonomySummary",
    "traceLifecycleSummary",
    "kvkkSafeAuditPayloadSummary",
    "runtimeGeneratedArtifactSummary",
    "humanApprovalBoundarySummary",
    "compatibilitySummary",
    "smokeThresholdSummary",
    "chainWiringSummary",
    "commitExternalSummary",
    "prismaSummary",
  ];
  for (const needle of validationTokens) {
    addContains(cases, `validation token ${needle}`, doc, needle);
  }

  const validationSummaryNeedles = [
    "append-only audit and approval trace stays visible",
    "approval-required action matrix stays blocked until explicit human approval",
    "recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked",
    "trace moves from recommendation to request to approval or block, then stops without silent execution",
    "eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS",
    "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external",
    "no write-action / human approval boundary stays visible",
    "SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01",
    "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none",
    "package.json + runner + verify chain + harness check/doc + guide + primer",
    "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty",
    "No route/service/prisma diff; no production DB; no schema/migration; read-only only",
  ];
  for (const needle of validationSummaryNeedles) {
    addContains(cases, `validation summary ${needle}`, doc, needle);
  }

  const summaryPairs = [
    ["auditabilitySummary", "append-only audit and approval trace stays visible"],
    ["approvalMatrixSummary", "approval-required action matrix stays blocked until explicit human approval"],
    ["eventTaxonomySummary", "recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked"],
    ["traceLifecycleSummary", "trace moves from recommendation to request to approval or block, then stops without silent execution"],
    ["kvkkSafeAuditPayloadSummary", "eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS"],
    ["runtimeGeneratedArtifactSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external"],
    ["humanApprovalBoundarySummary", "no write-action / human approval boundary stays visible"],
    ["compatibilitySummary", "SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01"],
    ["smokeThresholdSummary", "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none"],
    ["chainWiringSummary", "package.json + runner + verify chain + harness check/doc + guide + primer"],
    ["commitExternalSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty"],
    ["prismaSummary", "No route/service/prisma diff; no production DB; no schema/migration; read-only only"],
  ];
  for (const [key, value] of summaryPairs) {
    addContains(cases, `summary ${key}`, doc, `${key}=${value}`);
  }

  const files = gitStatusNames();
  const stageEmpty = gitLines(["diff", "--cached", "--name-only"]).length === 0;
  const diffCheckClean = gitLines(["diff", "--check"]).length === 0;
  const cachedDiffCheckClean = gitLines(["diff", "--cached", "--check"]).length === 0;
  const routeDiffEmpty = gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0;
  const serviceDiffEmpty = gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0;
  const prismaDiffEmpty = gitLines(["diff", "--name-only", "--", "prisma"]).length === 0;
  const backendPrismaDiffEmpty = gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0;
  const gitShowCheckClean = gitLines(["show", "--check", "--stat", "HEAD"]).length > 0;
  const debugLogAbsent = !fs.existsSync(paths.debugLog);

  addCase(cases, "working tree hygiene", () => allWithin(files, allowedStatusNames, [], "working tree hygiene"));
  addCase(cases, "stage remains empty", () => must(stageEmpty, "staged files present"));
  addCase(cases, "git diff --check stays clean", () => must(diffCheckClean, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(cachedDiffCheckClean, "git diff --cached --check findings"));
  addCase(cases, "route diff stays empty", () => must(routeDiffEmpty, "route diff not empty"));
  addCase(cases, "service diff stays empty", () => must(serviceDiffEmpty, "service diff not empty"));
  addCase(cases, "prisma diff stays empty", () => must(prismaDiffEmpty, "prisma diff not empty"));
  addCase(cases, "backend prisma diff stays empty", () => must(backendPrismaDiffEmpty, "backend prisma diff not empty"));
  addCase(cases, "git show --check --stat HEAD succeeds", () => must(gitShowCheckClean, "git show --check --stat HEAD produced no output"));
  addCase(cases, "debug.log stays absent", () => must(debugLogAbsent, "debug.log exists"));

  const results = [];
  for (const entry of cases) {
    try {
      entry.fn();
      results.push({ label: entry.label, ok: true });
    } catch (error) {
      results.push({ label: entry.label, ok: false, error: error?.message || String(error) });
      console.log(`FAIL ${entry.label}`);
    }
  }

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const guardCases = results.length;

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    console.log(`guardCases=${guardCases}`);
    console.log(`passCount=${passCount}`);
    console.log(`failCount=${failCount}`);
    process.exit(1);
  }

  const summaryLines = summaryPairs.map(([key, value]) => `${key}=${value}`);

  console.log("PASS AUDIT-LOG-AND-APPROVAL-TRACE-01");
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  for (const line of summaryLines) {
    console.log(line);
  }
}

main();
