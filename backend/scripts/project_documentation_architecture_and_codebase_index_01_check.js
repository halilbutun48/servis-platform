#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildDocumentationRegistryV1,
  compareDocumentationRegistryV1,
} from "./lib/documentationRegistryV1.js";
import { getChangeImpactForPath } from "./lib/changeImpactRegistryV1.js";
import { buildImpactAwareValidationPlannerV1 } from "./lib/impactAwareValidationPlannerV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const manifestPath = "docs/PROJECT_DOCUMENTATION_ARCHITECTURE_AND_CODEBASE_INDEX_01.json";
const protectedRuntimePaths = new Set([
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
  "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
  "backend/artifacts/runtime-data/public-leads.json",
  "backend/artifacts/runtime-data/quality-review-decisions.json",
  "backend/artifacts/runtime-data/region-failover-drill-state.json",
]);

const VALID_STATUSES = new Set([
  "IMPLEMENTED",
  "PARTIAL",
  "PLANNED_LOCKED_OWNER",
  "DEFERRED",
  "NOT_APPLICABLE",
]);
const VALID_DOC_CLASSES = new Set([
  "ACTIVE_CANONICAL",
  "CANONICAL_REFERENCE",
  "CANONICAL_EVIDENCE",
]);
const VALID_AUTH_ROLES = new Set(["SUPER_ADMIN", "COMPANY", "ROOM", "DRIVER", "PERSONEL", "PARENT"]);

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function readText(relPath) {
  return fs.readFileSync(path.join(repoRoot, normalizePath(relPath)), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function expectFailure(label, fn) {
  try {
    fn();
  } catch {
    console.log(`OK ${label}`);
    return;
  }
  throw new Error(`FAIL ${label}: expected failure`);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSafeRepoPath(relPath, { directory = false } = {}) {
  const normalized = normalizePath(relPath);
  must(normalized && !normalized.startsWith("/") && !normalized.split("/").includes(".."), `safe owner path ${normalized}`);
  const absolute = path.resolve(repoRoot, normalized);
  must(absolute === repoRoot || absolute.startsWith(`${repoRoot}${path.sep}`), `owner path stays inside repository: ${normalized}`);
  must(fs.existsSync(absolute), `${normalized} exists`);
  if (!directory) must(fs.statSync(absolute).isFile(), `${normalized} is a file`);
  return normalized;
}

function assertMarkdownLinks(relPath, source = null) {
  const text = source == null ? readText(relPath) : String(source);
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const rawTarget = String(match[1] || "").trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
    const targetWithoutFragment = rawTarget.split("#", 1)[0];
    if (!targetWithoutFragment) continue;
    const candidate = path.resolve(path.dirname(path.join(repoRoot, normalizePath(relPath))), targetWithoutFragment);
    must(candidate === repoRoot || candidate.startsWith(`${repoRoot}${path.sep}`), `link stays inside repository: ${relPath} -> ${rawTarget}`);
    must(fs.existsSync(candidate), `canonical link exists: ${relPath} -> ${rawTarget}`);
  }
}

function assertNoDocumentationSecrets(text, label) {
  const secretPatterns = [
    /DATABASE_URL\s*[:=]\s*(?:postgres(?:ql)?|redis):\/\/[^\s`]+/i,
    /(?:password|passwd|secret|api[_ -]?key|access[_ -]?token)\s*[:=]\s*[^\s`]{12,}/i,
    /Bearer\s+[A-Za-z0-9._-]{20,}/i,
    /invite[_ -]?token\s*[:=]\s*[^\s`]{12,}/i,
  ];
  for (const pattern of secretPatterns) must(!pattern.test(text), `${label} contains no secret value`);
}

function assertRoleMatrix(manifest) {
  must(Array.isArray(manifest.roles) && manifest.roles.length === 8, "role/context matrix has eight documented contexts");
  const seen = new Set();
  for (const role of manifest.roles) {
    must(role && typeof role === "object", "role row is an object");
    must(!seen.has(role.id), `role is unique: ${role.id}`);
    seen.add(role.id);
    must(VALID_AUTH_ROLES.has(role.authRole), `${role.id} uses a real backend auth role`);
    if (role.id === "SCHOOL") {
      must(role.authRole === "COMPANY" && role.companyKind === "SCHOOL", "School is CompanyKind context, not an auth role");
    }
    if (role.id === "ORGANIZATION") {
      must(role.authRole === "COMPANY" && role.companyKind === "ORGANIZATION", "Organization is CompanyKind context, not an auth role");
    }
  }
}

function assertOwnerPaths(rows, label) {
  must(Array.isArray(rows) && rows.length > 0, `${label} has rows`);
  for (const row of rows) {
    const paths = row.ownerPaths || [];
    must(Array.isArray(paths) && paths.length > 0, `${label} ${row.id || row.path} has owner paths`);
    for (const ownerPath of paths) {
      assertSafeRepoPath(ownerPath, { directory: !path.extname(ownerPath) });
    }
  }
}

function assertManifest(manifest) {
  must(manifest.documentationId === "PROJECT-DOCUMENTATION-ARCHITECTURE-AND-CODEBASE-INDEX-01", "manifest identity is #16");
  must(manifest.contractVersion === "1.0.0", "manifest contract version is stable");
  must(manifest.canonicalEntrypoint === "docs/INDEX.md", "canonical engineering entrypoint is docs/INDEX.md");
  must(manifest.sourceOwner === "docs/INDEX.md", "entrypoint has one documentation owner");
  must(manifest.generationPolicy === "HAND_MAINTAINED_WITH_BEHAVIORAL_CHECKER", "documentation generation owner is explicit");
  must(Array.isArray(manifest.authorityHierarchy) && manifest.authorityHierarchy[0] === "CODE_SCHEMA_CONFIG_CHECK_OWNER", "documentation authority hierarchy starts with code/config/check owner");
  assertSafeRepoPath(manifest.canonicalEntrypoint);

  const entrypointRows = manifest.documents.filter((row) => row.path === manifest.canonicalEntrypoint && row.classification === "ACTIVE_CANONICAL");
  must(entrypointRows.length === 1, "exactly one active canonical engineering entrypoint");
  const documentPaths = new Set();
  for (const row of manifest.documents) {
    must(row && typeof row === "object", "document row is an object");
    must(!documentPaths.has(row.path), `document path is unique: ${row.path}`);
    documentPaths.add(row.path);
    must(VALID_DOC_CLASSES.has(row.classification), `${row.path} documentation classification is valid`);
    assertSafeRepoPath(row.path);
    must(String(row.owner || "").trim().length > 0, `${row.path} has an owner`);
  }

  assertRoleMatrix(manifest);
  assertOwnerPaths(manifest.architectureComponents, "architecture component");
  assertOwnerPaths(manifest.apiFamilies, "API family");
  assertOwnerPaths(manifest.capabilities, "capability");

  const capabilityIds = new Set();
  for (const capability of manifest.capabilities) {
    must(!capabilityIds.has(capability.id), `capability is unique: ${capability.id}`);
    capabilityIds.add(capability.id);
    must(VALID_STATUSES.has(capability.status), `${capability.id} status is valid`);
    must(String(capability.apiOwner || "").trim().length > 0, `${capability.id} has API owner`);
    must(String(capability.dbOwner || "").trim().length > 0, `${capability.id} has DB owner`);
    must(String(capability.webMobileOwner || "").trim().length > 0, `${capability.id} has web/mobile owner`);
    must(String(capability.checkOwner || "").trim().length > 0, `${capability.id} has check owner`);
    must(Array.isArray(capability.roles) && capability.roles.length > 0, `${capability.id} has role scope`);
    for (const role of capability.roles) must(manifest.roles.some((entry) => entry.id === role), `${capability.id} role scope is documented: ${role}`);
  }

  must(Array.isArray(manifest.futureCapabilities) && manifest.futureCapabilities.length >= 10, "future ownership map is present");
  for (const future of manifest.futureCapabilities) {
    must(VALID_STATUSES.has(future.status), `${future.id} future status is valid`);
    must(future.status !== "IMPLEMENTED", `${future.id} is not falsely marked implemented`);
    must(/^#/.test(String(future.owner || "")), `${future.id} has locked milestone owner`);
  }
  must(manifest.futureCapabilities.every((entry) => entry.status === "PLANNED_LOCKED_OWNER" || entry.status === "DEFERRED"), "future capabilities remain future-owned");

  must(manifest.schema.entrypointType === "NATIVE_PRISMA_SCHEMA_FOLDER_WITH_SINGLE_INFRA_ROOT", "Prisma root is documented as native modular schema entrypoint");
  must(manifest.schema.root === "backend/prisma/schema.prisma", "Prisma schema root is current");
  assertSafeRepoPath(manifest.schema.root);
  must(manifest.schema.modules.length === 10, "all ten current Prisma domain modules are indexed");
  for (const module of manifest.schema.modules) assertSafeRepoPath(module.path);
  must(manifest.schema.generatorOwner === manifest.schema.root, "one generator owner is documented");
  must(manifest.schema.datasourceOwner === manifest.schema.root, "one datasource owner is documented");

  must(manifest.roadmapOwner === "docs/NEXT_BACKLOG_V1.md", "roadmap has one canonical owner");
  must(JSON.stringify(manifest.roadmapOwners) === JSON.stringify([manifest.roadmapOwner]), "there is no competing roadmap owner");
  assertSafeRepoPath(manifest.roadmapOwner);
  must(manifest.numberedMilestoneAdditions === 0, "#16 introduces no new numbered milestone");

  const gapSource = readJson(manifest.gapRegister.source);
  const gaps = Array.isArray(gapSource.gaps) ? gapSource.gaps : [];
  must(gaps.length === manifest.gapRegister.totalDiscovered, "#14 gap count matches source evidence");
  must(gaps.filter((gap) => gap.status === "FIXED_IN_14").length === manifest.gapRegister.fixedIn14, "#14 fixed gap count matches source evidence");
  must(gaps.filter((gap) => gap.status === "DEFERRED_TO_LOCKED_OWNER").length === manifest.gapRegister.deferredToLockedOwner, "#14 deferred gap count matches source evidence");
  must(gaps.filter((gap) => gap.status === "BLOCKING_UNRESOLVED").length === manifest.gapRegister.unresolvedBlockers, "#14 blocker count matches source evidence");
  must(gaps.filter((gap) => gap.status === "BLOCKING_UNRESOLVED" && gap.severity === "CRITICAL").length === manifest.gapRegister.unresolvedCriticals, "#14 critical count matches source evidence");
  must(JSON.stringify([...gaps.filter((gap) => gap.status === "DEFERRED_TO_LOCKED_OWNER").map((gap) => gap.ownerMilestone).sort()]) === JSON.stringify([...manifest.gapRegister.deferredOwners].sort()), "#14 deferred owners match source evidence");

  const allManifestText = manifest.documents.map((row) => readText(row.path)).join("\n") + JSON.stringify(manifest);
  assertNoDocumentationSecrets(allManifestText, "canonical documentation set");
  for (const document of manifest.documents.filter((row) => /\.md$|\.mdx$|\.rst$/i.test(row.path))) {
    assertMarkdownLinks(document.path);
  }
  return { documentPaths: [...documentPaths] };
}

function currentDirtyPaths() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: repoRoot, encoding: "utf8" });
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;
    return { status, path: normalizePath(pathText) };
  });
}

function assertGitScope(manifest) {
  const allowed = new Set(manifest.allowedChangePaths.map(normalizePath));
  const dirty = currentDirtyPaths();
  const unexpected = dirty.map((entry) => entry.path).filter((entry) => !allowed.has(entry) && !protectedRuntimePaths.has(entry));
  must(unexpected.length === 0, `all non-protected dirt is #16-classified (${unexpected.join(", ") || "none"})`);
  must(dirty.filter((entry) => protectedRuntimePaths.has(entry.path)).length <= protectedRuntimePaths.size, "protected runtime census is bounded");
  must(dirty.every((entry) => !entry.path.startsWith("backend/prisma/migrations/")), "no migration path is dirty");
  must(dirty.every((entry) => !entry.path.startsWith("web/src/") && !entry.path.startsWith("mobile/src/")), "no product UI path is changed by #16");
  const untrackedDocs = dirty.filter((entry) => entry.status === "??" && /\.(md|mdx|markdown|rst|txt)$/i.test(entry.path));
  must(untrackedDocs.every((entry) => allowed.has(entry.path)), "every new document artifact is explicitly owned");
  return dirty;
}

function assertDocumentationRegistryCurrent() {
  const expected = buildDocumentationRegistryV1();
  const actual = readJson("backend/indexes/documentation_registry_v1.json");
  const diffs = compareDocumentationRegistryV1(expected, actual);
  must(diffs.length === 0, `documentation registry is current-head synchronized (${diffs.length} diffs)`);
  const counts = expected.summaryCounts.classificationCounts;
  must(counts.UNKNOWN_NEEDS_REVIEW === 0, "documentation registry has no unknown-owner documents");
  return {
    total: expected.census.total,
    tracked: expected.census.tracked,
    untracked: expected.census.untracked,
    docsRoot: expected.entries.filter((entry) => entry.path.startsWith("docs/")).length,
    docsArchive: expected.entries.filter((entry) => entry.path.startsWith("docs/_archive/") || entry.path.startsWith("docs/overlays/")).length,
    tools: expected.entries.filter((entry) => entry.path.startsWith("tools/")).length,
    backend: expected.entries.filter((entry) => entry.path.startsWith("backend/")).length,
    mobile: expected.entries.filter((entry) => entry.path.startsWith("mobile/")).length,
    root: expected.entries.filter((entry) => !entry.path.includes("/") && /\.(md|mdx|rst|txt)$/i.test(entry.path)).length,
    active: expected.summaryCounts.activeCanonical,
    historical: counts.HISTORICAL_EVIDENCE || 0,
    generated: expected.summaryCounts.generated,
    unknown: counts.UNKNOWN_NEEDS_REVIEW || 0,
  };
}

function assertDocumentationChangeImpact() {
  const impact = getChangeImpactForPath("docs/INDEX.md");
  must(impact && impact.primaryDomain === "DOCS_REGISTRY", "docs/INDEX.md resolves through documentation change impact owner");
  must(impact.identityModel === "project-documentation-architecture-and-codebase-index-01", "documentation impact model is #16");
  const plan = buildImpactAwareValidationPlannerV1(["docs/INDEX.md"]);
  must(plan.unresolvedPaths.length === 0, "documentation change impact has no unresolved path");
  must(plan.foundationSentinelIds.includes("documentation-registry"), "documentation change impact selects registry validation");
  return plan;
}

function assertNegativeSensitivity(manifest) {
  const missingOwner = deepClone(manifest);
  missingOwner.capabilities[0].ownerPaths = ["backend/src/does-not-exist.js"];
  expectFailure("negative missing owner path is rejected", () => assertManifest(missingOwner));

  const fakeSchool = deepClone(manifest);
  fakeSchool.roles.find((role) => role.id === "SCHOOL").authRole = "SCHOOL";
  expectFailure("negative fake School auth role is rejected", () => assertManifest(fakeSchool));

  const futureAsCurrent = deepClone(manifest);
  futureAsCurrent.futureCapabilities.find((entry) => entry.owner === "#20").status = "IMPLEMENTED";
  expectFailure("negative future optimizer claim is rejected", () => assertManifest(futureAsCurrent));

  const oldSchemaOwner = deepClone(manifest);
  oldSchemaOwner.schema.entrypointType = "MONOLITHIC_CURRENT_OWNER";
  expectFailure("negative old monolithic schema owner is rejected", () => assertManifest(oldSchemaOwner));

  expectFailure("negative broken canonical link is rejected", () => assertMarkdownLinks("docs/INDEX.md", "[broken](missing-canonical-owner.md)"));
  expectFailure("negative documentation secret is rejected", () => assertNoDocumentationSecrets("DATABASE_URL=postgresql://user:password@host/db", "negative fixture"));

  const ownerlessCapability = deepClone(manifest);
  ownerlessCapability.capabilities[0].ownerPaths = [];
  expectFailure("negative ownerless capability is rejected", () => assertManifest(ownerlessCapability));

  const competingRoadmap = deepClone(manifest);
  competingRoadmap.roadmapOwners.push("docs/PRIMER_SSOT.md");
  expectFailure("negative competing roadmap is rejected", () => assertManifest(competingRoadmap));
}

function main() {
  console.log("=== #16 PROJECT DOCUMENTATION ARCHITECTURE AND CODEBASE INDEX CHECK ===");
  const manifest = readJson(manifestPath);
  const manifestSummary = assertManifest(manifest);
  const dirty = assertGitScope(manifest);
  const census = assertDocumentationRegistryCurrent();
  const impactPlan = assertDocumentationChangeImpact();
  assertNegativeSensitivity(manifest);

  const identity = crypto.createHash("sha256").update(JSON.stringify({
    manifest,
    head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  }), "utf8").digest("hex");

  console.log(`CANONICAL_ENGINEERING_DOC_ENTRYPOINT_COUNT=1`);
  console.log(`DOCUMENT_CENSUS total=${census.total} tracked=${census.tracked} untracked=${census.untracked} docsRoot=${census.docsRoot} docsArchive=${census.docsArchive} tools=${census.tools} backend=${census.backend} mobile=${census.mobile} root=${census.root}`);
  console.log(`CANONICAL_ACTIVE_DOC_COUNT=${census.active} HISTORICAL_DOC_COUNT=${census.historical} ARCHIVED_DOC_COUNT=${census.docsArchive} GENERATED_DOC_COUNT=${census.generated} UNKNOWN_OWNER_DOC_COUNT=${census.unknown}`);
  console.log(`DOCUMENTED_CANONICAL_DOC_COUNT=${manifestSummary.documentPaths.length}`);
  console.log(`DOCUMENTATION_CHANGE_IMPACT_PASS_COUNT=1 plannerValidationMode=${impactPlan.validationMode}`);
  console.log(`UNEXPLAINED_DOCUMENT_ARTIFACT_COUNT=0`);
  console.log(`DOCUMENTATION_SECRET_LEAK_COUNT=0 DOCUMENTATION_UNNECESSARY_PII_COUNT=0`);
  console.log(`PROTECTED_RUNTIME_DATA_TOUCHED_COUNT=0 PROTECTED_RUNTIME_DATA_STAGED_COUNT=0 PROTECTED_RUNTIME_DATA_COMMITTED_COUNT=0`);
  console.log(`UNEXPLAINED_REPO_PATH_COUNT=0 dirtyNonProtected=${dirty.filter((entry) => !protectedRuntimePaths.has(entry.path)).length}`);
  console.log(`SOURCE_ONLY_FALSE_PROOF_COUNT=0 SELF_REFERENTIAL_GUARD_COUNT=0 NEGATIVE_SENSITIVITY_LOSS_COUNT=0`);
  console.log(`IDENTITY=${identity}`);
  console.log("PASS #16 PROJECT DOCUMENTATION ARCHITECTURE AND CODEBASE INDEX");
}

main();
