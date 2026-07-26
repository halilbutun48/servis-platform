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
  doc: path.join(repoRoot, "docs", "SECURITY_KVKK_FINAL_01.md"),
  roleDataDoc: path.join(repoRoot, "docs", "ROLE_DATA_ISOLATION_REDTEAM_01.md"),
  dataIntegrityDoc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  observabilityDoc: path.join(repoRoot, "docs", "OBSERVABILITY_MONITORING_ALERTING_01.md"),
  dbScalingDoc: path.join(repoRoot, "docs", "DB_POOL_AND_API_SCALING_01.md"),
  loadTestDoc: path.join(repoRoot, "docs", "LOAD_TEST_2000_USERS_01.md"),
  cacheDoc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  rateLimitDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  phase12Doc: path.join(repoRoot, "docs", "PHASE_12_KVKK_SECURITY.md"),
  kvkkRunbook: path.join(repoRoot, "docs", "RUNBOOK_M77_KVKK_UYUM_KATMANI.md"),
  retentionRunbook: path.join(repoRoot, "docs", "RUNBOOK_M45_RETENTION_BACKUP.md"),
  kvkkMatrix: path.join(repoRoot, "backend", "src", "kvkk", "matrix.js"),
  kvkkRoute: path.join(repoRoot, "backend", "src", "routes", "kvkk.js"),
  responseCache: path.join(repoRoot, "backend", "src", "utils", "responseCache.js"),
  dashboardBulk: path.join(repoRoot, "backend", "src", "services", "dashboardBulk.js"),
  adminRoute: path.join(repoRoot, "backend", "src", "routes", "admin.js"),
  routeMounts: path.join(repoRoot, "backend", "src", "bootstrap", "routeMounts.js"),
  serverJs: path.join(repoRoot, "backend", "src", "server.js"),
  retentionBackupPolicy: path.join(repoRoot, "backend", "src", "ops", "retentionBackupPolicy.js"),
  backupArchiveOps: path.join(repoRoot, "backend", "src", "ops", "backupArchiveOps.js"),
  jsonFileStore: path.join(repoRoot, "backend", "src", "lib", "jsonFileStore.js"),
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
  if (!condition) throw new Error(`FAIL ${label}`);
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
    if (index === -1) throw new Error(`FAIL ${label}: missing ${needle}`);
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
  if (unexpected.length > 0) throw new Error(`FAIL ${label}: ${unexpected.join(", ")}`);
  console.log(`OK ${label}`);
}

function main() {
  console.log("=== SECURITY-KVKK-FINAL-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const roleDataDoc = readFile(paths.roleDataDoc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);
  const observabilityDoc = readFile(paths.observabilityDoc);
  const dbScalingDoc = readFile(paths.dbScalingDoc);
  const loadTestDoc = readFile(paths.loadTestDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const rateLimitDoc = readFile(paths.rateLimitDoc);
  const phase12Doc = readFile(paths.phase12Doc);
  const kvkkRunbook = readFile(paths.kvkkRunbook);
  const retentionRunbook = readFile(paths.retentionRunbook);
  const kvkkMatrix = readFile(paths.kvkkMatrix);
  const kvkkRoute = readFile(paths.kvkkRoute);
  const responseCache = readFile(paths.responseCache);
  const dashboardBulk = readFile(paths.dashboardBulk);
  const adminRoute = readFile(paths.adminRoute);
  const routeMounts = readFile(paths.routeMounts);
  const serverJs = readFile(paths.serverJs);
  const retentionBackupPolicy = readFile(paths.retentionBackupPolicy);
  const backupArchiveOps = readFile(paths.backupArchiveOps);
  const jsonFileStore = readFile(paths.jsonFileStore);

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
    "backend/scripts/supplier_matching_01_check.js",
    "backend/scripts/supplier_offer_collect_01_check.js",
    "backend/scripts/copilot_offer_analysis_01_check.js",
    "backend/scripts/copilot_negotiation_assist_01_check.js",
    "backend/scripts/copilot_offer_recommendation_01_check.js",
    "backend/scripts/copilot_demand_intake_01_check.js",
    "backend/scripts/copilot_shift_to_agreement_prep_01_check.js",
    "backend/src/ai/chat/copilotDemandIntake.js",
    "backend/src/ai/chat/copilotOfferAnalysis.js",
    "backend/src/ai/chat/copilotNegotiationAssist.js",
    "backend/src/ai/chat/copilotOfferRecommendation.js",
    "backend/src/ai/chat/copilotShiftToAgreementPrep.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_INTAKE_01.md",
    "docs/COPILOT_OFFER_ANALYSIS_01.md",
    "docs/COPILOT_NEGOTIATION_ASSIST_01.md",
    "docs/COPILOT_OFFER_RECOMMENDATION_01.md",
    "docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/scripts/copilot_rfq_prep_01_check.js",
    "backend/src/ai/chat/copilotRfqPrep.js",
    "docs/COPILOT_RFQ_PREP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/security_kvkk_final_01_check.js",
    "backend/scripts/audit_log_and_approval_trace_01_check.js",
    "docs/SECURITY_KVKK_FINAL_01.md",
    "backend/src/ai/chat/supplierMatching.js",
    "backend/src/ai/chat/supplierOfferCollect.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/SUPPLIER_MATCHING_01.md",
    "docs/SUPPLIER_OFFER_COLLECT_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/PRIMER_SSOT.md",
    "docs/DATA_INTEGRITY_AND_RECOVERY_01.md",
    "docs/OBSERVABILITY_MONITORING_ALERTING_01.md",
    "docs/DB_POOL_AND_API_SCALING_01.md",
    "docs/LOAD_TEST_2000_USERS_01.md",
    "docs/CACHE_COALESCING_AND_BACKOFF_01.md",
    "docs/REQUEST_STORM_RESILIENCE_01.md",
    "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
  ]);

  addContains(cases, "package.json exposes security alias", pkg, '"check:securitykvkkfinal01": "node backend/scripts/security_kvkk_final_01_check.js"');
  addContains(cases, "product extensions runner includes security alias", runner, "check:securitykvkkfinal01");
  addContains(cases, "verify chain includes security alias", verify, "check:securitykvkkfinal01");

  addContains(cases, "script harness check knows security milestone", harnessCheck, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "script harness check knows security alias", harnessCheck, "check:securitykvkkfinal01");
  addContains(cases, "script harness check knows security doc", harnessCheck, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "script harness check knows security command", harnessCheck, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "script harness doc lists security milestone", harnessDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "script harness doc lists security alias", harnessDoc, "check:securitykvkkfinal01");
  addContains(cases, "script harness doc lists security doc", harnessDoc, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "script harness doc lists security command", harnessDoc, "node backend\\scripts\\security_kvkk_final_01_check.js");

  addContains(cases, "guide mentions security milestone", guide, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "guide exposes security alias", guide, "check:securitykvkkfinal01");
  addContains(cases, "guide includes security doc", guide, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "guide includes security command", guide, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "primer mentions security milestone", primer, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "primer exposes security alias", primer, "check:securitykvkkfinal01");
  addContains(cases, "primer includes security doc", primer, "docs/SECURITY_KVKK_FINAL_01.md");
  addContains(cases, "primer includes security command", primer, "backend/scripts/security_kvkk_final_01_check.js");

  const headings = [
    "# SECURITY-KVKK-FINAL-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Security / KVKK data classification",
    "## 4) Sensitive field matrix",
    "## 5) Never-log / never-store matrix",
    "## 6) Public lead / personel / parent / school / organization safety",
    "## 7) Live GPS / route / stop / shift / agreement / payment preview safety",
    "## 8) Retention / deletion / anonymization readiness",
    "## 9) Backup / restore handoff",
    "## 10) Role-data isolation handoff",
    "## 11) Observability / security alert handoff",
    "## 12) Data integrity / recovery handoff",
    "## 13) No write-action / human approval boundary",
    "## 14) Runtime-data / generated artifact / commit-external boundary",
    "## 15) Release gate checklist",
    "## 16) What is not changed",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of headings) {
    addContains(cases, `security doc heading ${heading}`, doc, heading);
  }
  addContains(cases, "security doc canonical check", doc, "Canonical check: `check:securitykvkkfinal01`");
  addContains(cases, "security doc script path", doc, "node backend\\scripts\\security_kvkk_final_01_check.js");
  addContains(cases, "security doc package alias", doc, "check:securitykvkkfinal01");
  addContains(cases, "security doc mentions phase 12", doc, "docs/PHASE_12_KVKK_SECURITY.md");
  addContains(cases, "security doc mentions m77 runbook", doc, "docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md");
  addContains(cases, "security doc mentions m45 runbook", doc, "docs/RUNBOOK_M45_RETENTION_BACKUP.md");
  addContains(cases, "security doc mentions role data handoff", doc, "ROLE-DATA-ISOLATION-REDTEAM-01");
  addContains(cases, "security doc mentions data integrity handoff", doc, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContains(cases, "security doc mentions observability handoff", doc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContains(cases, "security doc mentions db scaling handoff", doc, "DB-POOL-AND-API-SCALING-01");
  addContains(cases, "security doc mentions load test handoff", doc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "security doc mentions cache coalescing handoff", doc, "CACHE-COALESCING-AND-BACKOFF-01");
  addContains(cases, "security doc mentions request storm handoff", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "security doc mentions production rate limit handoff", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContains(cases, "security doc mentions support docs block", doc, "Supporting references");
  addContains(cases, "security doc mentions no probe", doc, "Probe gerekli değildir");
  addContains(cases, "security doc mentions static inventory", doc, "static policy/doc/code inventory");
  addContains(cases, "security doc mentions technical only", doc, "technical security / KVKK readiness gate");
  addContains(cases, "security doc mentions not legal advice", doc, "Hukuki danışmanlık değildir");

  const sensitiveNeedles = [
    "token",
    "cookie",
    "password",
    "provider credential",
    "TCKN",
    "raw GPS",
    "full name",
    "phone",
    "address",
    "email",
    "child data",
    "personel data",
    "public lead",
    "driver",
    "room",
    "company",
    "school",
    "organization",
    "super admin",
  ];
  for (const needle of sensitiveNeedles) {
    addContains(cases, `security doc sensitive field ${needle}`, doc, needle);
  }

  const policyNeedles = [
    "Data classification",
    "Critical entity matrix",
    "Referential integrity policy",
    "Transaction boundary policy",
    "Idempotency and retry-safety policy",
    "Backup policy",
    "Restore policy",
    "RPO / RTO targets",
    "Recovery runbook",
    "Corruption detection policy",
    "Partial write / duplicate write / stale write risk matrix",
    "Runtime-data commit-external and recovery policy",
    "Migration and rollback safety policy",
    "KVKK-safe backup/logging policy",
    "Observability handoff",
    "Incident severity matrix",
    "Release gate checklist",
    "Generated artifact policy",
    "Runtime-data list",
    "No production DB",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "smoke threshold 18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
    "No public URL",
    "No real token/credential generation",
    "No stage/commit/tag/push",
    "No runtime AI/model execution",
  ];
  for (const needle of policyNeedles) {
    addContains(cases, `security doc policy phrase ${needle}`, doc, needle);
  }

  const neverLogNeedles = [
    "never-log",
    "never-store",
    "token",
    "cookie",
    "password",
    "provider credential",
    "raw GPS",
    "TCKN",
    "no write-action",
    "human approval boundary",
  ];
  for (const needle of neverLogNeedles) {
    addContains(cases, `security doc never-log phrase ${needle}`, doc, needle);
  }

  const runtimeDataNeedles = [
    "backend/artifacts/runtime-data/",
    "password-change-requirements.json",
    "username-directory.json",
    "agreement-route-refresh-requests.json",
    "public-leads.json",
    "quality-review-decisions.json",
    "region-failover-drill-state.json",
  ];
  for (const needle of runtimeDataNeedles) {
    addContains(cases, `security doc runtime-data ${needle}`, doc, needle);
  }
  addContains(cases, "security doc generated artifact boundary", doc, "backend/artifacts/security-kvkk/");
  addContains(cases, "security doc commit-external boundary", doc, "commit-external");

  const companionMilestones = [
    "ROLE-DATA-ISOLATION-REDTEAM-01",
    "DATA-INTEGRITY-AND-RECOVERY-01",
    "OBSERVABILITY-MONITORING-ALERTING-01",
    "DB-POOL-AND-API-SCALING-01",
    "LOAD-TEST-2000-USERS-01",
    "CACHE-COALESCING-AND-BACKOFF-01",
    "REQUEST-STORM-RESILIENCE-01",
    "PRODUCTION-RATE-LIMIT-POLICY-01",
  ];
  for (const needle of companionMilestones) {
    addContains(cases, `security compatibility ${needle}`, doc, needle);
  }
  addCase(cases, "security compatibility order", () => {
    ordered(doc, companionMilestones, "security compatibility order");
  });

  const summaryPairs = [
    ["dataClassificationSummary", "data classification, critical entity matrix and referential integrity policy stay visible"],
    ["sensitiveFieldSummary", "token, cookie, password, provider credential, raw GPS and TCKN stay blocked"],
    ["neverLogSummary", "never-log and never-store matrix stays visible"],
    ["publicSurfaceSummary", "public lead, personel, parent, school, organization and driver surfaces stay separated"],
    ["liveOpsSummary", "live GPS, route, stop, shift, agreement and payment preview stay read-only"],
    ["retentionSummary", "retention, deletion and anonymization readiness stay visible"],
    ["backupRestoreSummary", "backup policy, restore policy and M45 handoff stay visible"],
    ["roleDataHandoffSummary", "role-data isolation handoff stays visible"],
    ["observabilitySecuritySummary", "observability and security alert handoff stays visible"],
    ["dataIntegrityHandoffSummary", "data integrity and recovery handoff stays visible"],
    ["humanApprovalBoundarySummary", "no write-action / human approval boundary stays visible"],
    ["runtimeDataBoundarySummary", "runtime-data and generated artifact boundary stays visible"],
    ["compatibilitySummary", companionMilestones.join(" | ")],
    ["smokeThresholdSummary", "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none"],
    ["chainWiringSummary", "package.json + runner + verify chain + harness check/doc + guide + primer"],
    ["commitExternalSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk are commit-external; stage stays empty"],
    ["prismaSummary", "No route/service/prisma diff; no production DB; no schema/migration; read-only only"],
  ];
  for (const [label, value] of summaryPairs) {
    addContains(cases, `security doc summary token ${label}`, doc, label);
    addContains(cases, `security doc summary value ${label}`, doc, value);
  }

  addContains(cases, "role data doc keeps security final next milestone", roleDataDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "data integrity doc mentions security final", dataIntegrityDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "observability doc mentions security final", observabilityDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "db scaling doc mentions security final", dbScalingDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "load test doc mentions security final", loadTestDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "cache doc mentions security final", cacheDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "request storm doc mentions security final", requestStormDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "rate limit doc mentions security final", rateLimitDoc, "SECURITY-KVKK-FINAL-01");
  addContains(cases, "phase 12 doc mentions security final", phase12Doc, "KVKK & Security");
  addContains(cases, "m77 runbook mentions retention and anonymization", kvkkRunbook, "retention / silme / anonimleştirme");
  addContains(cases, "m45 runbook mentions backup create", retentionRunbook, "backup_create_m45.ps1");

  const codeNeedles = [
    ["kvkk matrix version", kvkkMatrix, "KVKK_MATRIX_VERSION"],
    ["kvkk auth roles", kvkkMatrix, "KVKK_AUTH_ROLES"],
    ["kvkk business domains", kvkkMatrix, "KVKK_BUSINESS_DOMAINS"],
    ["kvkk matrix helper", kvkkMatrix, "getKvkkMatrix"],
    ["kvkk route matrix", kvkkRoute, "/matrix"],
    ["kvkk route retention", kvkkRoute, "/retention"],
    ["kvkk route accept", kvkkRoute, "/consents/accept"],
    ["kvkk route revoke", kvkkRoute, "/consents/revoke"],
    ["kvkk route accept action", kvkkRoute, "KVKK_DOC_ACCEPT"],
    ["kvkk route revoke action", kvkkRoute, "KVKK_DOC_REVOKE"],
    ["responseCache scope key", responseCache, "return `${role}:${companyId}:${roomId}:${userId}`;"],
    ["responseCache write", responseCache, "writeResponseCache"],
    ["responseCache remember", responseCache, "rememberResponse"],
    ["responseCache clear", responseCache, "clearResponseCache"],
    ["dashboardBulk scopeOf", dashboardBulk, "function scopeOf(user)"],
    ["dashboardBulk bulkCacheKey", dashboardBulk, "function bulkCacheKey(bundle, user, query = {})"],
    ["dashboardBulk rememberResponse", dashboardBulk, "rememberResponse(cacheKey, load, {"],
    ["dashboardBulk super admin", dashboardBulk, 'role === "SUPER_ADMIN"'],
    ["dashboardBulk company scope", dashboardBulk, "companyId: user.companyId"],
    ["dashboardBulk room scope", dashboardBulk, "roomId: user.roomId"],
    ["admin backup policy", adminRoute, "/backup/policy"],
    ["admin backup manifest", adminRoute, "/backup/manifest"],
    ["admin backup create", adminRoute, "/backup/create"],
    ["admin backup restore", adminRoute, "/backup/restore"],
    ["admin retention run", adminRoute, "/retention/run"],
    ["route mounts public leads", routeMounts, "/api/public/leads"],
    ["route mounts passenger live", routeMounts, "/api/public/passenger-live"],
    ["route mounts personel live", routeMounts, "/api/public/personel-live"],
    ["route mounts kvkk", routeMounts, "/api/kvkk"],
    ["route mounts observability", routeMounts, "/api/observability"],
    ["route mounts dashboard", routeMounts, "/api/dashboard"],
    ["route mounts admin public leads", routeMounts, "/api/admin/public-leads"],
    ["server health route", serverJs, 'app.get("/health"'],
    ["server db latency", serverJs, "dbLatencyMs"],
    ["server capacity", serverJs, "capacity"],
    ["server edge security", serverJs, "edgeSecurity"],
    ["retention policy dir", retentionBackupPolicy, "backupLocalDir"],
    ["retention policy days", retentionBackupPolicy, "backupLocalRetentionDays"],
    ["retention policy format", retentionBackupPolicy, "backupDumpFormat"],
    ["retention policy summary", retentionBackupPolicy, "getBackupPolicySummary"],
    ["backup archive create", backupArchiveOps, "createBackupArchive"],
    ["backup archive restore", backupArchiveOps, "restoreBackupArchive"],
    ["backup archive manifest", backupArchiveOps, "manifest"],
    ["backup archive sha256", backupArchiveOps, "backupSha256"],
    ["json store backup path", jsonFileStore, "backupPath"],
    ["json store async backup", jsonFileStore, "backupCurrentAsync"],
    ["json store sync backup", jsonFileStore, "backupCurrentSync"],
    ["json store bak fallback", jsonFileStore, ".bak"],
    ["json store parse fallback", jsonFileStore, 'return parse(await fsp.readFile(backupPath, "utf8"));'],
  ];
  for (const [label, text, needle] of codeNeedles) {
    addContains(cases, label, text, needle);
  }

  const explicitSafetyNeedles = [
    "No production DB",
    "No public URL",
    "No real token/credential generation",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "No write-action / human approval boundary",
    "No stage/commit/tag/push",
    "No runtime AI/model execution",
    "No 429 allowlist",
    "smoke threshold 18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
  ];
  for (const needle of explicitSafetyNeedles) {
    addContains(cases, `security doc explicit safety ${needle}`, doc, needle);
  }

  const roleSurfaceNeedles = [
    "public lead",
    "personel",
    "parent",
    "school",
    "organization",
    "driver",
    "room",
    "company",
    "super admin",
  ];
  for (const needle of roleSurfaceNeedles) {
    addContains(cases, `security doc role surface ${needle}`, doc, needle);
  }

  addCase(cases, "security doc heading order", () => {
    ordered(doc, headings, "security doc heading order");
  });

  addCase(cases, "working tree only contains approved files", () => {
    const files = gitStatusNames();
    allWithin(files, allowedStatusNames, [], "working tree hygiene");
  });
  addCase(cases, "stage remains empty", () => must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged files present"));
  addCase(cases, "git diff --check stays clean", () => must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings"));
  addCase(cases, "route diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0, "route diff not empty"));
  addCase(cases, "service diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0, "service diff not empty"));
  addCase(cases, "prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty"));
  addCase(cases, "backend prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty"));
  addCase(cases, "debug.log stays absent", () => must(!fs.existsSync(paths.debugLog), "debug.log exists"));

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

  console.log("PASS SECURITY-KVKK-FINAL-01");
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  console.log(`dataClassificationSummary=${summaryPairs[0][1]}`);
  console.log(`sensitiveFieldSummary=${summaryPairs[1][1]}`);
  console.log(`neverLogSummary=${summaryPairs[2][1]}`);
  console.log(`publicSurfaceSummary=${summaryPairs[3][1]}`);
  console.log(`liveOpsSummary=${summaryPairs[4][1]}`);
  console.log(`retentionSummary=${summaryPairs[5][1]}`);
  console.log(`backupRestoreSummary=${summaryPairs[6][1]}`);
  console.log(`roleDataHandoffSummary=${summaryPairs[7][1]}`);
  console.log(`observabilitySecuritySummary=${summaryPairs[8][1]}`);
  console.log(`dataIntegrityHandoffSummary=${summaryPairs[9][1]}`);
  console.log(`humanApprovalBoundarySummary=${summaryPairs[10][1]}`);
  console.log(`runtimeDataBoundarySummary=${summaryPairs[11][1]}`);
  console.log(`compatibilitySummary=${summaryPairs[12][1]}`);
  console.log(`smokeThresholdSummary=${summaryPairs[13][1]}`);
  console.log(`chainWiringSummary=${summaryPairs[14][1]}`);
  console.log(`commitExternalSummary=${summaryPairs[15][1]}`);
  console.log(`prismaSummary=${summaryPairs[16][1]}`);
}

main();
