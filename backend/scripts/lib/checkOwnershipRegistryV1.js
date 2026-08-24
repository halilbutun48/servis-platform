import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertProductExtensionsRegistryIntegrity,
  productExtensionsChecks,
} from "./productExtensionsRegistry.js";
import { CHANGE_IMPACT_VALID_DOMAINS } from "./changeImpactRegistryV1.js";
import { repoRoot } from "./guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CHECK_OWNERSHIP_REGISTRY_V1_VERSION = "step-1b-check-ownership-foundation";

export const CHECK_OWNERSHIP_VALID_DOMAINS = Object.freeze([...CHANGE_IMPACT_VALID_DOMAINS]);

export const CHECK_OWNERSHIP_VALID_PROTECTION_CLASSES = Object.freeze([
  "DOMAIN_SEMANTIC",
  "SECURITY_AUTH_TENANT",
  "GLOBAL_CURRENT_HEAD",
  "GLOBAL_PROVENANCE",
  "WORKTREE_HYGIENE",
  "SOURCE_IDENTITY",
  "SMOKE_EVIDENCE",
  "DATA_INTEGRITY",
  "DOCUMENTATION_TRACEABILITY",
  "QUALITY_GATE",
  "TOOLING_RUNTIME",
  "MIXED",
]);

export const CHECK_OWNERSHIP_VALID_SCOPE_CLASSES = Object.freeze([
  "GLOBAL",
  "DOMAIN",
  "MIXED",
]);

export const CHECK_OWNERSHIP_VALID_COST_CLASSES = Object.freeze([
  "CHEAP",
  "MODERATE",
  "EXPENSIVE",
]);

export const CHECK_OWNERSHIP_VALID_NEGATIVE_SENSITIVITY_OWNERS = Object.freeze([
  "INTERNAL_NEGATIVE",
  "EXTERNAL_SHARED_NEGATIVE",
  "NONE",
  "UNKNOWN",
]);

const ROOT_PACKAGE_JSON_PATH = path.join(repoRoot, "package.json");
const PACKAGE_JSON_CACHE = new Map();
const RESOLUTION_CACHE = new Map();
const ROOT_PACKAGE_SCRIPTS = Object.freeze(readJson(ROOT_PACKAGE_JSON_PATH).scripts || {});

const GLOBAL_DOMAIN_SET = new Set([
  "CHECKER_INFRA",
  "DOCS_REGISTRY",
  "GENERATED_EVIDENCE",
  "RUNTIME_DATA",
]);

const DOMAIN_RULES = [
  { domain: "CHECKER_INFRA", tokens: ["current_head_scope_policy", "change_impact_registry", "check_ownership_registry", "product_extensions", "verify_chain", "run_product_extensions", "guardv2standardization"] },
  { domain: "DOCS_REGISTRY", tokens: ["documentation_registry", "docs_state", "script_harness_consolidation", "docsbrandcleanup", "primer_ssot", "script_harness"] },
  { domain: "GENERATED_EVIDENCE", tokens: ["smoke", "e2e_smoke", "finaluxsmoke", "mobile_web_final", "product_flow_button_audit", "uxlivepanel", "uxmobileallroles", "uxallpanels", "uxsmokepass"] },
  { domain: "AUTH", tokens: ["auth_stepup", "security_kvkk", "role_data_isolation", "audit_log_and_approval_trace"] },
  { domain: "ADMIN", tokens: ["superadmin", "field_acceptance_center", "field_dispatch_discovery", "commercial_flow", "system_mode", "admin"] },
  { domain: "PUBLIC", tokens: ["public_landing", "lead_capture", "onboarding_review", "invite_based_membership"] },
  { domain: "COMPANY", tokens: ["company"] },
  { domain: "ROOM", tokens: ["room"] },
  { domain: "AGREEMENT", tokens: ["agreement"] },
  { domain: "SHIFT", tokens: ["shift"] },
  { domain: "QUALITY", tokens: ["offer_ranking_quality", "trust_quality", "quality", "qlt", "sefer_score"] },
  { domain: "OFFER_MARKETPLACE", tokens: ["supplier", "marketplace", "offer", "rfq", "negotiation"] },
  { domain: "ROUTE_DISPATCH", tokens: ["route", "dispatch", "boarding", "stop_route"] },
  { domain: "GPS_TELEMATICS", tokens: ["gps", "telematics", "eta", "driver", "vehicle", "tracking", "safe_drive"] },
  { domain: "MOBILE", tokens: ["mobile", "android", "ios", "phone"] },
  { domain: "WEB_SHELL", tokens: ["web_01a", "web_01b", "web_shell", "nav", "brand"] },
  { domain: "WEB_DOMAIN_PANELS", tokens: ["panel", "ux", "density", "layout", "tabs", "card", "live_map", "collapsible_panels", "panel_reality", "panel_structure", "marketplace_panels", "premium_navdock"] },
  { domain: "FINANCE_PAYMENT", tokens: ["qlt_pay_bridge", "op_04_proof_commercial_quality_readonly_bridge", "payment", "pay", "financial", "finance", "cost", "budget", "profit", "commercial", "reconciliation", "dormant_payment", "payment_readonly", "payment_preview"] },
  { domain: "TOOLING", tokens: ["load_test", "request_storm", "cache_coalescing", "production_rate_limit", "observability", "db_pool", "source_visibility", "source_badge", "source_priority", "field_launch"] },
  { domain: "RUNTIME_DATA", tokens: ["runtime_data", "snapshot", "drill", "state"] },
  { domain: "AI_SEFER_ABI", tokens: ["roadmap_lock_ai_marketplace", "ai03b", "ai_response", "sefer_abi", "seferabi", "copilot", "copliveaccept", "cop_"] },
];

const PROTECTION_RULES = [
  { protectionClass: "GLOBAL_CURRENT_HEAD", tokens: ["current_head_scope_policy", "change_impact_registry", "check_ownership_registry", "product_extensions", "verify_chain", "worktree", "git_scope"] },
  { protectionClass: "GLOBAL_PROVENANCE", tokens: ["canonical_provenance", "request_url", "requesturl", "source_identity", "provenance"] },
  { protectionClass: "WORKTREE_HYGIENE", tokens: ["snapshot", "worktree", "staged", "cached", "clean"] },
  { protectionClass: "SOURCE_IDENTITY", tokens: ["source_visibility", "source_badge", "source_priority", "identity", "exact", "pin", "sha", "hash"] },
  { protectionClass: "SMOKE_EVIDENCE", tokens: ["smoke", "e2e_smoke", "finaluxsmoke", "uxlivepanel", "uxmobileallroles", "uxallpanels", "uxsmokepass", "mobile_web_final", "product_flow_button_audit"] },
  { protectionClass: "DATA_INTEGRITY", tokens: ["data_integrity", "runtime_data", "recovery"] },
  { protectionClass: "DOCUMENTATION_TRACEABILITY", tokens: ["documentation_registry", "docs_state", "script_harness_consolidation", "docsbrandcleanup"] },
  { protectionClass: "QUALITY_GATE", tokens: ["quality_gate", "test_quality", "backend_lint", "lint", "qa", "quality_gate_final"] },
  { protectionClass: "TOOLING_RUNTIME", tokens: ["load_test", "request_storm", "cache_coalescing", "production_rate_limit", "observability", "db_pool", "field_launch", "mobile_web_final", "e2e_smoke"] },
  { protectionClass: "SECURITY_AUTH_TENANT", tokens: ["auth_stepup", "security_kvkk", "role_data_isolation", "audit_log_and_approval_trace"] },
];

const COST_RULES = [
  { costClass: "EXPENSIVE", tokens: ["smoke", "e2e_smoke", "load_test", "mobile_web_final", "field_launch", "live_tracking", "driver_flow", "product_flow_button_audit", "uxlivepanel", "uxmobileallroles", "uxallpanels"] },
  { costClass: "MODERATE", tokens: ["current_head_scope_policy", "canonical_provenance", "documentation_registry", "security_kvkk", "audit_log_and_approval_trace", "role_data_isolation", "data_integrity", "quality_gate", "test_quality", "backend_lint", "request_storm", "cache_coalescing", "production_rate_limit", "observability", "db_pool"] },
];

const NEGATIVE_INTERNAL_HINTS = [
  "expectfailure(",
  "mustnot(",
  "mustnodiff(",
  "mustnodiffexcept(",
  "mustnodiffexceptwithidentity(",
  "mustdiffemptyorexactlywithidentity(",
  "muststatusemptyorexactlywithidentity(",
  "fail closed",
  "failclosed",
  "negative",
];

const NEGATIVE_SHARED_HINTS = [
  "mustcurrentheadcommittedstate",
  "mustcleancommittedstate",
  "assertproductextensionsregistryintegrity",
  "assertcanonicalprovenanceregistryshape",
  "mustsmokeevidenceidentity",
  "assertchangeimpactregistryv1shape",
];

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function readJson(absPath) {
  const normalized = normalizePath(absPath);
  if (!PACKAGE_JSON_CACHE.has(normalized)) {
    PACKAGE_JSON_CACHE.set(normalized, JSON.parse(fs.readFileSync(absPath, "utf8")));
  }
  return PACKAGE_JSON_CACHE.get(normalized);
}

function readPackageScripts(packageRoot) {
  const pkg = readJson(path.join(packageRoot, "package.json"));
  return pkg.scripts || {};
}

function firstShellSegment(commandText) {
  return String(commandText || "")
    .split(/\s*(?:&&|;)\s*/)[0]
    .trim();
}

function resolveScriptPath(scriptName, packageRoot = repoRoot, seen = new Set()) {
  const cacheKey = `${normalizePath(packageRoot)}::${scriptName}`;
  if (RESOLUTION_CACHE.has(cacheKey)) {
    return RESOLUTION_CACHE.get(cacheKey);
  }
  if (seen.has(cacheKey)) {
    return { checkerPath: null, checkerKind: "cycle", packageRoot: normalizePath(packageRoot), commandText: null };
  }

  seen.add(cacheKey);
  const directCommand = firstShellSegment(scriptName);
  const directNodeMatch = directCommand.match(/^node\s+(.+)$/i);
  if (directNodeMatch) {
    const scriptPath = directNodeMatch[1].trim().replace(/^["']|["']$/g, "");
    const absPath = path.resolve(packageRoot, scriptPath);
    const resolved = {
      checkerPath: normalizePath(path.relative(repoRoot, absPath)),
      checkerKind: "node",
      packageRoot: normalizePath(packageRoot),
      commandText: directCommand,
    };
    RESOLUTION_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  const directNpmMatch = directCommand.match(/^npm(?:\s+--prefix\s+([^\s]+))?\s+run\s+([^\s]+)$/i);
  if (directNpmMatch) {
    const prefix = directNpmMatch[1] || ".";
    const nestedRoot = path.resolve(packageRoot, prefix);
    const resolved = resolveScriptPath(directNpmMatch[2], nestedRoot, seen);
    RESOLUTION_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  const scripts = readPackageScripts(packageRoot);
  const commandText = String(scripts[scriptName] || "").trim();
  if (!commandText) {
    const unresolved = { checkerPath: null, checkerKind: "missing", packageRoot: normalizePath(packageRoot), commandText: null };
    RESOLUTION_CACHE.set(cacheKey, unresolved);
    return unresolved;
  }

  const command = firstShellSegment(commandText);
  const nodeMatch = command.match(/^node\s+(.+)$/i);
  if (nodeMatch) {
    const scriptPath = nodeMatch[1].trim().replace(/^["']|["']$/g, "");
    const absPath = path.resolve(packageRoot, scriptPath);
    const resolved = {
      checkerPath: normalizePath(path.relative(repoRoot, absPath)),
      checkerKind: "node",
      packageRoot: normalizePath(packageRoot),
      commandText,
    };
    RESOLUTION_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  const npmMatch = command.match(/^npm(?:\s+--prefix\s+([^\s]+))?\s+run\s+([^\s]+)$/i);
  if (npmMatch) {
    const prefix = npmMatch[1] || ".";
    const nestedRoot = path.resolve(packageRoot, prefix);
    const resolved = resolveScriptPath(npmMatch[2], nestedRoot, seen);
    RESOLUTION_CACHE.set(cacheKey, resolved);
    return resolved;
  }

  const unresolved = {
    checkerPath: null,
    checkerKind: "unresolved",
    packageRoot: normalizePath(packageRoot),
    commandText,
  };
  RESOLUTION_CACHE.set(cacheKey, unresolved);
  return unresolved;
}

function textForSignal(checkId, checkerPath, commandText) {
  return normalizeText([checkId, checkerPath, commandText].filter(Boolean).join(" "));
}

function collectMatches(text, rules) {
  const hits = [];
  for (const rule of rules) {
    if (rule.tokens.some((token) => text.includes(token))) {
      hits.push(rule);
    }
  }
  return hits;
}

function inferPrimaryDomain(signalText) {
  const hits = collectMatches(signalText, DOMAIN_RULES);
  return hits.length > 0 ? hits[0].domain : "CHECKER_INFRA";
}

function inferSecondaryDomains(signalText, primaryDomain) {
  const hits = collectMatches(signalText, DOMAIN_RULES).map((rule) => rule.domain);
  return [...new Set(hits)].filter((domain) => domain !== primaryDomain);
}

function inferProtectionClass(signalText, primaryDomain) {
  const matches = collectMatches(signalText, PROTECTION_RULES);
  if (matches.length > 0) {
    return matches[0].protectionClass;
  }

  if (GLOBAL_DOMAIN_SET.has(primaryDomain)) {
    return primaryDomain === "CHECKER_INFRA" ? "GLOBAL_CURRENT_HEAD" : "DOCUMENTATION_TRACEABILITY";
  }

  return "DOMAIN_SEMANTIC";
}

function inferScopeClass(primaryDomain, secondaryDomains, protectionClass) {
  if (GLOBAL_DOMAIN_SET.has(primaryDomain)) {
    return "GLOBAL";
  }
  if (protectionClass === "SMOKE_EVIDENCE") {
    return "MIXED";
  }
  if (secondaryDomains.length > 0 || protectionClass === "MIXED") {
    return "MIXED";
  }
  return "DOMAIN";
}

function inferCostClass(signalText, checkerPath) {
  const expensive = COST_RULES.find((rule) => rule.tokens.some((token) => signalText.includes(token)));
  if (expensive) {
    return expensive.costClass;
  }

  if (checkerPath && /(\.mjs|smoke|e2e|load_test|field_launch|mobile|android|ios)$/i.test(checkerPath)) {
    return "EXPENSIVE";
  }

  return "CHEAP";
}

function inferNegativeSensitivityOwner(signalText, checkerPath) {
  if (NEGATIVE_INTERNAL_HINTS.some((token) => signalText.includes(token))) {
    return "INTERNAL_NEGATIVE";
  }

  if (NEGATIVE_SHARED_HINTS.some((token) => signalText.includes(token))) {
    return "EXTERNAL_SHARED_NEGATIVE";
  }

  if (!checkerPath) {
    return "UNKNOWN";
  }

  return "NONE";
}

function buildSemanticGroups(primaryDomain, secondaryDomains, protectionClass, scopeClass) {
  return Object.freeze([...new Set([primaryDomain, ...secondaryDomains, protectionClass, scopeClass].filter(Boolean))]);
}

function buildRecord(step) {
  const resolved = resolveScriptPath(step.script, repoRoot);
  const checkerPath = resolved.checkerPath;
  const signalText = textForSignal(step.script, checkerPath, resolved.commandText);
  const primaryDomain = inferPrimaryDomain(signalText);
  const secondaryDomains = inferSecondaryDomains(signalText, primaryDomain);
  const protectionClass = inferProtectionClass(signalText, primaryDomain);
  const scopeClass = inferScopeClass(primaryDomain, secondaryDomains, protectionClass);
  const costClass = inferCostClass(signalText, checkerPath);
  const negativeSensitivityOwner = inferNegativeSensitivityOwner(signalText, checkerPath);
  const semanticGroups = buildSemanticGroups(primaryDomain, secondaryDomains, protectionClass, scopeClass);

  return Object.freeze({
    productExtensionsStep: step.id,
    productExtensionsOrder: step.order,
    checkId: step.script,
    checkerPath,
    checkerKind: resolved.checkerKind,
    packageRoot: resolved.packageRoot,
    commandText: resolved.commandText,
    primaryDomain,
    secondaryDomains: Object.freeze([...secondaryDomains]),
    protectionClass,
    scopeClass,
    costClass,
    negativeSensitivityOwner,
    semanticGroups,
    manualOverride: false,
    notes: checkerPath
      ? `Derived from productExtensionsRegistry via ${path.posix.basename(checkerPath)}`
      : "Unresolved checker path",
  });
}

function freezeSummaryCounts(map) {
  return Object.freeze(Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b))));
}

function assertRecordShape(record, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`FAIL ${label}: record is not an object`);
  }

  const keys = Object.keys(record);
  if (keys.some((key) => /sha/i.test(key))) {
    throw new Error(`FAIL ${label}: sha field is forbidden`);
  }
  const allowedKeys = new Set([
    "productExtensionsStep",
    "productExtensionsOrder",
    "checkId",
    "checkerPath",
    "checkerKind",
    "packageRoot",
    "commandText",
    "primaryDomain",
    "secondaryDomains",
    "protectionClass",
    "scopeClass",
    "costClass",
    "negativeSensitivityOwner",
    "semanticGroups",
    "manualOverride",
    "notes",
  ]);
  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      throw new Error(`FAIL ${label}: unexpected field ${key}`);
    }
  }

  if (!String(record.productExtensionsStep || "").trim()) {
    throw new Error(`FAIL ${label}: missing productExtensionsStep`);
  }
  if (!String(record.checkId || "").trim()) {
    throw new Error(`FAIL ${label}: missing checkId`);
  }
  if (typeof record.productExtensionsOrder !== "number" || record.productExtensionsOrder < 1) {
    throw new Error(`FAIL ${label}: invalid productExtensionsOrder`);
  }
  if (typeof record.checkerPath !== "string" || !record.checkerPath.trim()) {
    throw new Error(`FAIL ${label}: invalid checkerPath`);
  }
  if (record.checkerKind !== "node") {
    throw new Error(`FAIL ${label}: checkerKind must resolve to node`);
  }
  if (!CHECK_OWNERSHIP_VALID_DOMAINS.includes(record.primaryDomain)) {
    throw new Error(`FAIL ${label}: invalid primaryDomain ${record.primaryDomain}`);
  }
  if (!Array.isArray(record.secondaryDomains)) {
    throw new Error(`FAIL ${label}: secondaryDomains is not an array`);
  }
  if (!CHECK_OWNERSHIP_VALID_PROTECTION_CLASSES.includes(record.protectionClass)) {
    throw new Error(`FAIL ${label}: invalid protectionClass ${record.protectionClass}`);
  }
  if (!CHECK_OWNERSHIP_VALID_SCOPE_CLASSES.includes(record.scopeClass)) {
    throw new Error(`FAIL ${label}: invalid scopeClass ${record.scopeClass}`);
  }
  if (!CHECK_OWNERSHIP_VALID_COST_CLASSES.includes(record.costClass)) {
    throw new Error(`FAIL ${label}: invalid costClass ${record.costClass}`);
  }
  if (!CHECK_OWNERSHIP_VALID_NEGATIVE_SENSITIVITY_OWNERS.includes(record.negativeSensitivityOwner)) {
    throw new Error(`FAIL ${label}: invalid negativeSensitivityOwner ${record.negativeSensitivityOwner}`);
  }
  if (!Array.isArray(record.semanticGroups) || record.semanticGroups.length === 0) {
    throw new Error(`FAIL ${label}: semanticGroups missing`);
  }
  if (typeof record.manualOverride !== "boolean") {
    throw new Error(`FAIL ${label}: invalid manualOverride`);
  }
  if (!record.semanticGroups.includes(record.primaryDomain)) {
    throw new Error(`FAIL ${label}: semanticGroups must include primaryDomain`);
  }
  if (!record.semanticGroups.includes(record.protectionClass)) {
    throw new Error(`FAIL ${label}: semanticGroups must include protectionClass`);
  }
  if (!record.semanticGroups.includes(record.scopeClass)) {
    throw new Error(`FAIL ${label}: semanticGroups must include scopeClass`);
  }
}

function buildImpactQueryTags(impact) {
  const tags = new Set();
  if (!impact || typeof impact !== "object") {
    return tags;
  }

  if (impact.primaryDomain) {
    tags.add(String(impact.primaryDomain).trim());
  }
  for (const domain of impact.secondaryDomains || []) {
    tags.add(String(domain).trim());
  }
  for (const group of impact.semanticOwnerGroups || []) {
    tags.add(String(group).trim());
  }
  for (const protectionClass of impact.protectionClasses || []) {
    tags.add(String(protectionClass).trim());
  }

  if ((impact.smokeSuites || []).length > 0) {
    tags.add("SMOKE_EVIDENCE");
  }
  if ((impact.smokeSuites || []).includes("MOBILE_ALL_ROLES")) {
    tags.add("MOBILE");
  }
  if ((impact.smokeSuites || []).includes("ALL_PANELS")) {
    tags.add("WEB_DOMAIN_PANELS");
  }
  if ((impact.smokeSuites || []).includes("PREMIUM")) {
    tags.add("FINANCE_PAYMENT");
  }

  return tags;
}

export function buildCheckOwnershipRegistryV1(records = null) {
  const sourceRegistry = records || productExtensionsChecks;
  assertProductExtensionsRegistryIntegrity({
    registry: sourceRegistry,
    packageScripts: ROOT_PACKAGE_SCRIPTS,
    label: "product extensions registry",
  });

  const derivedRecords = sourceRegistry.map((step) => buildRecord(step));
  const checkerPathCounts = new Map();
  const counts = {
    primaryDomain: new Map(),
    protectionClass: new Map(),
    scopeClass: new Map(),
    costClass: new Map(),
    negativeSensitivityOwner: new Map(),
  };

  for (const record of derivedRecords) {
    assertRecordShape(record, record.checkId);
    if (record.checkerPath) {
      checkerPathCounts.set(record.checkerPath, (checkerPathCounts.get(record.checkerPath) || 0) + 1);
    }
    counts.primaryDomain.set(record.primaryDomain, (counts.primaryDomain.get(record.primaryDomain) || 0) + 1);
    counts.protectionClass.set(record.protectionClass, (counts.protectionClass.get(record.protectionClass) || 0) + 1);
    counts.scopeClass.set(record.scopeClass, (counts.scopeClass.get(record.scopeClass) || 0) + 1);
    counts.costClass.set(record.costClass, (counts.costClass.get(record.costClass) || 0) + 1);
    counts.negativeSensitivityOwner.set(
      record.negativeSensitivityOwner,
      (counts.negativeSensitivityOwner.get(record.negativeSensitivityOwner) || 0) + 1,
    );
  }

  const resolvedPathCount = derivedRecords.filter((record) => Boolean(record.checkerPath)).length;
  const missingPathResolutionCount = derivedRecords.length - resolvedPathCount;
  const nonJsCheckCount = derivedRecords.filter((record) => record.checkerPath && !/\.(?:js|mjs|cjs)$/i.test(record.checkerPath)).length;
  const multiStepCheckerCount = [...checkerPathCounts.values()].filter((count) => count > 1).length;
  const manualOverrideCount = derivedRecords.filter((record) => record.manualOverride).length;
  const derivedGlobalCount = derivedRecords.filter((record) => record.scopeClass === "GLOBAL").length;
  const derivedDomainCount = derivedRecords.filter((record) => record.scopeClass === "DOMAIN").length;
  const derivedMixedCount = derivedRecords.filter((record) => record.scopeClass === "MIXED").length;

  const checkerPathSet = [...new Set(derivedRecords.map((record) => record.checkerPath).filter(Boolean))].sort();
  const recordsByCheckId = Object.fromEntries(derivedRecords.map((record) => [record.checkId, record]));
  const recordsByStep = Object.fromEntries(derivedRecords.map((record) => [record.productExtensionsStep, record]));

  return Object.freeze({
    version: CHECK_OWNERSHIP_REGISTRY_V1_VERSION,
    count: derivedRecords.length,
    manualOverrideCount,
    manualOverridePct: derivedRecords.length > 0 ? manualOverrideCount / derivedRecords.length : 0,
    missingPathResolutionCount,
    nonJsCheckCount,
    multiStepCheckerCount,
    derivedGlobalCount,
    derivedDomainCount,
    derivedMixedCount,
    checkerPathCount: checkerPathSet.length,
    records: Object.freeze(derivedRecords),
    byCheckId: Object.freeze(recordsByCheckId),
    byStep: Object.freeze(recordsByStep),
    summary: Object.freeze({
      primaryDomainCounts: freezeSummaryCounts(counts.primaryDomain),
      protectionClassCounts: freezeSummaryCounts(counts.protectionClass),
      scopeClassCounts: freezeSummaryCounts(counts.scopeClass),
      costClassCounts: freezeSummaryCounts(counts.costClass),
      negativeSensitivityCounts: freezeSummaryCounts(counts.negativeSensitivityOwner),
    }),
  });
}

export function assertCheckOwnershipRegistryV1Shape(registry = null, label = "check ownership registry v1") {
  const derived = registry || buildCheckOwnershipRegistryV1().records;
  if (!Array.isArray(derived)) {
    throw new Error(`FAIL ${label}: registry is not an array`);
  }
  if (derived.length !== productExtensionsChecks.length) {
    throw new Error(`FAIL ${label}: registry length mismatch (${derived.length} !== ${productExtensionsChecks.length})`);
  }

  const seenStepIds = new Set();
  const seenCheckIds = new Set();

  for (const [index, record] of derived.entries()) {
    const stepLabel = `${label} row ${index + 1}`;
    assertRecordShape(record, stepLabel);
    if (seenStepIds.has(record.productExtensionsStep)) {
      throw new Error(`FAIL ${label}: duplicate productExtensionsStep ${record.productExtensionsStep}`);
    }
    if (seenCheckIds.has(record.checkId)) {
      throw new Error(`FAIL ${label}: duplicate checkId ${record.checkId}`);
    }
    seenStepIds.add(record.productExtensionsStep);
    seenCheckIds.add(record.checkId);
  }

  const expectedStepIds = productExtensionsChecks.map((step) => step.id).join("|");
  const actualStepIds = derived.map((record) => record.productExtensionsStep).join("|");
  if (expectedStepIds !== actualStepIds) {
    throw new Error(`FAIL ${label}: productExtensionsStep order mismatch`);
  }

  return Object.freeze(derived);
}

function intersectSets(left, right) {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}

export function getCheckOwnershipForId(checkId, registry = null) {
  const records = registry || buildCheckOwnershipRegistryV1().records;
  return records.find((record) => record.checkId === checkId) || null;
}

export function getCheckOwnershipForStep(stepId, registry = null) {
  const records = registry || buildCheckOwnershipRegistryV1().records;
  return records.find((record) => record.productExtensionsStep === stepId) || null;
}

export function getChecksForImpactMetadata(impact, registry = null) {
  const records = registry || buildCheckOwnershipRegistryV1().records;
  const queryTags = buildImpactQueryTags(impact);
  const candidateRecords = [];

  for (const record of records) {
    const recordTags = new Set(record.semanticGroups);
    const isGlobal = record.scopeClass === "GLOBAL";
    if (isGlobal || intersectSets(queryTags, recordTags)) {
      candidateRecords.push(record);
    }
  }

  const globalRecords = candidateRecords.filter((record) => record.scopeClass === "GLOBAL");
  const smokeRecords = candidateRecords.filter((record) => record.protectionClass === "SMOKE_EVIDENCE");

  return Object.freeze({
    queryTags: Object.freeze([...queryTags]),
    records: Object.freeze(candidateRecords),
    globalRecords: Object.freeze(globalRecords),
    smokeRecords: Object.freeze(smokeRecords),
    domainRecords: Object.freeze(candidateRecords.filter((record) => record.scopeClass === "DOMAIN")),
    mixedRecords: Object.freeze(candidateRecords.filter((record) => record.scopeClass === "MIXED")),
  });
}

export function buildCheckOwnershipRegistryV1Summary(registry = null) {
  const records = registry == null
    ? buildCheckOwnershipRegistryV1().records
    : assertCheckOwnershipRegistryV1Shape(registry, "check ownership registry v1 summary");

  const countBy = (field) => {
    const map = new Map();
    for (const record of records) {
      map.set(record[field], (map.get(record[field]) || 0) + 1);
    }
    return freezeSummaryCounts(map);
  };

  const checkerPathCounts = new Map();
  let manualOverrideCount = 0;
  let missingPathResolutionCount = 0;
  let nonJsCheckCount = 0;
  let derivedGlobalCount = 0;
  let derivedDomainCount = 0;
  let derivedMixedCount = 0;

  for (const record of records) {
    if (record.manualOverride) {
      manualOverrideCount += 1;
    }
    if (!record.checkerPath) {
      missingPathResolutionCount += 1;
    } else {
      if (!/\.(?:js|mjs|cjs)$/i.test(record.checkerPath)) {
        nonJsCheckCount += 1;
      }
      checkerPathCounts.set(record.checkerPath, (checkerPathCounts.get(record.checkerPath) || 0) + 1);
    }
    if (record.scopeClass === "GLOBAL") {
      derivedGlobalCount += 1;
    } else if (record.scopeClass === "DOMAIN") {
      derivedDomainCount += 1;
    } else if (record.scopeClass === "MIXED") {
      derivedMixedCount += 1;
    }
  }

  const checkerPathCount = checkerPathCounts.size;
  const multiStepCheckerCount = [...checkerPathCounts.values()].filter((count) => count > 1).length;

  return Object.freeze({
    version: CHECK_OWNERSHIP_REGISTRY_V1_VERSION,
    count: records.length,
    manualOverrideCount,
    manualOverridePct: records.length > 0 ? manualOverrideCount / records.length : 0,
    missingPathResolutionCount,
    nonJsCheckCount,
    multiStepCheckerCount,
    derivedGlobalCount,
    derivedDomainCount,
    derivedMixedCount,
    checkerPathCount,
    primaryDomainCounts: countBy("primaryDomain"),
    protectionClassCounts: countBy("protectionClass"),
    scopeClassCounts: countBy("scopeClass"),
    costClassCounts: countBy("costClass"),
    negativeSensitivityCounts: countBy("negativeSensitivityOwner"),
  });
}

assertCheckOwnershipRegistryV1Shape();
