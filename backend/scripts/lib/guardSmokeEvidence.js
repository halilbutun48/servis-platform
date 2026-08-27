import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { gitLines } from "./guardGitScope.js";

export const SMOKE_EVIDENCE_IDENTITY_VERSION = "PROVENANCE_VS_PRODUCT_INPUT_V1";
export const SMOKE_EVIDENCE_HELPER_PATH = "backend/scripts/lib/guardSmokeEvidence.js";

// These files affect browser setup or the shared runtime boundary for every
// canonical smoke suite. The list is explicit so an unlisted change fails closed.
export const SMOKE_EVIDENCE_SHARED_PRODUCT_INPUTS = Object.freeze([
  "package.json",
  "backend/package.json",
  "web/package.json",
  "backend/prisma/schema.prisma",
  "backend/prisma/seed.js",
  "backend/src/server.js",
  "backend/src/bootstrap/routeMounts.js",
  "backend/src/auth/middleware.js",
  "backend/src/auth/securityPolicy.js",
  "backend/src/routes/auth.js",
  "backend/src/prisma.js",
  "backend/scripts/lib/guardGitScope.js",
  "backend/scripts/lib/guardTextIntegrity.js",
  "backend/scripts/lib/prismaSchemaIdentity.js",
]);

// Only these exact guard/check/doc owners can move HEAD without invalidating
// an otherwise unchanged product-input fingerprint.
export const SMOKE_EVIDENCE_SAFE_REUSE_PATHS = Object.freeze([
  "backend/scripts/product_flow_button_audit_01_check.js",
  "backend/scripts/ux_live_panel_premium_smoke_01_check.js",
  "backend/scripts/ux_all_panels_reality_audit_01_check.js",
  "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
  "backend/scripts/lib/productExtensionsRegistry.js",
  "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
  "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  "docs/PRIMER_SSOT.md",
  "docs/CHECKLIST_SSOT.md",
  "docs/MILESTONE_REGISTRY_V1.md",
]);

export const PREMIUM_SMOKE_COVERAGE_SOURCES = [
  "web/src/panels/public/PublicLandingPage.jsx",
  "web/src/components/public/PublicLeadCaptureModal.jsx",
  "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
  "web/src/panels/superadmin/CommercialCorePanel.jsx",
  "web/src/components/PaymentReadinessReadonlyCard.jsx",
  "web/src/panels/company/companyShiftsPanelRows.jsx",
  "web/src/panels/company/AgreementsPanel.jsx",
  "web/src/panels/room/roomShiftsPanelRows.jsx",
  "web/src/panels/room/AgreementsPanel.jsx",
  "web/src/panels/personel/LivePanel.jsx",
  "web/src/panels/parent/LivePanel.jsx",
  "web/src/components/RoutePreviewModal.jsx",
];

const PREMIUM_SMOKE_WORKTREE_SOURCE_FILES = [
  "backend/src/routes/commercialCore.js",
  "backend/src/routes/trustQuality.js",
  "backend/src/routes/operationProof.js",
  "backend/src/services/qualityPaymentBridgeService.js",
];

export function buildPremiumSmokeEvidenceSourceFiles(runnerPath = "backend/scripts/ux_live_panel_premium_smoke_01.mjs") {
  return [runnerPath, ...PREMIUM_SMOKE_WORKTREE_SOURCE_FILES, ...PREMIUM_SMOKE_COVERAGE_SOURCES];
}

function uniqueStrings(items) {
  return [...new Set((items || []).map((item) => String(item || "").replace(/\\/g, "/").trim()).filter(Boolean))];
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").toUpperCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex").toUpperCase();
}

function readFileSha256(absPath) {
  return sha256Hex(fs.readFileSync(absPath));
}

function readGitHead(repoRoot) {
  const gitPath = path.join(repoRoot, ".git");
  let gitDir = gitPath;
  try {
    const stat = fs.statSync(gitPath);
    if (stat.isFile()) {
      const content = fs.readFileSync(gitPath, "utf8").trim();
      const prefix = "gitdir:";
      if (content.toLowerCase().startsWith(prefix)) {
        gitDir = path.resolve(repoRoot, content.slice(prefix.length).trim());
      }
    }
  } catch {
    // Let the HEAD lookup below fail with a clear filesystem error.
  }

  const headPath = path.join(gitDir, "HEAD");
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head;

  const refName = head.slice(5).trim();
  const refPath = path.join(gitDir, ...refName.split("/"));
  if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf8").trim();

  const packedRefsPath = path.join(gitDir, "packed-refs");
  if (fs.existsSync(packedRefsPath)) {
    const packedRefs = fs.readFileSync(packedRefsPath, "utf8").split(/\r?\n/);
    const packedMatch = packedRefs.find((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("^") && trimmed.endsWith(` ${refName}`);
    });
    if (packedMatch) return packedMatch.trim().split(/\s+/)[0];
  }

  throw new Error(`Unable to resolve git HEAD ref ${refName}`);
}

function buildProductInputFiles({ repoRoot, sourceFiles = [], schemaPath = "backend/prisma/schema.prisma" }) {
  if (!repoRoot) throw new Error("FAIL smoke evidence identity: repoRoot is required");
  const paths = uniqueStrings([
    ...SMOKE_EVIDENCE_SHARED_PRODUCT_INPUTS,
    SMOKE_EVIDENCE_HELPER_PATH,
    schemaPath,
    ...sourceFiles,
  ]);
  return paths.map((relPath) => {
    const absPath = path.join(repoRoot, relPath);
    const stats = fs.statSync(absPath);
    return {
      path: relPath,
      bytes: stats.size,
      sha256: readFileSha256(absPath),
    };
  });
}

function buildCurrentSmokeEvidenceIdentity({ repoRoot, sourceFiles = [], schemaPath = "backend/prisma/schema.prisma" } = {}) {
  const gitHead = readGitHead(repoRoot);
  const sourceIdentityFiles = buildProductInputFiles({ repoRoot, sourceFiles, schemaPath });
  const sourceIdentityFileHashes = sourceIdentityFiles.map(({ path: filePath, sha256 }) => ({ path: filePath, sha256 }));
  const schemaSha256 = sourceIdentityFiles.find(({ path: filePath }) => filePath === schemaPath)?.sha256 || "";
  const testedProductInputIdentitySha256 = sha256Json({
    schemaPath,
    schemaSha256,
    sourceIdentityFiles,
  });

  return {
    evidenceIdentityVersion: SMOKE_EVIDENCE_IDENTITY_VERSION,
    gitHead,
    schemaPath,
    schemaSha256,
    sourceIdentityFiles,
    sourceIdentityFileHashes,
    testedProductInputIdentitySha256,
    // Kept as a compatibility field; it now deliberately excludes gitHead.
    sourceIdentitySha256: testedProductInputIdentitySha256,
  };
}

function normalizePaths(items) {
  return uniqueStrings(items);
}

export function classifySmokeEvidenceChangePaths(
  changedPaths,
  { sourceFiles = [], schemaPath = "backend/prisma/schema.prisma", safeReusePaths = SMOKE_EVIDENCE_SAFE_REUSE_PATHS } = {}
) {
  const productInputPaths = new Set([
    ...SMOKE_EVIDENCE_SHARED_PRODUCT_INPUTS,
    SMOKE_EVIDENCE_HELPER_PATH,
    schemaPath,
    ...sourceFiles,
  ].map((item) => String(item || "").replace(/\\/g, "/").trim()).filter(Boolean));
  const safePaths = new Set(normalizePaths(safeReusePaths));
  const normalizedChangedPaths = normalizePaths(changedPaths);

  return Object.freeze({
    changed: Object.freeze(normalizedChangedPaths),
    invalidating: Object.freeze(normalizedChangedPaths.filter((item) => productInputPaths.has(item))),
    reusable: Object.freeze(normalizedChangedPaths.filter((item) => safePaths.has(item))),
    unknown: Object.freeze(normalizedChangedPaths.filter((item) => !productInputPaths.has(item) && !safePaths.has(item))),
  });
}

function assertReportInputIdentity(report, expected, fail) {
  if (report.evidenceIdentityVersion !== SMOKE_EVIDENCE_IDENTITY_VERSION) fail("evidence identity version mismatch");
  if (typeof report.gitHead !== "string" || !/^[0-9a-f]{40}$/i.test(report.gitHead.trim())) fail("gitHead provenance missing");
  if (String(report.schemaPath || "") !== String(expected.schemaPath || "")) fail("schemaPath mismatch");
  if (String(report.schemaSha256 || "") !== String(expected.schemaSha256 || "")) fail("schemaSha256 mismatch");
  if (!Array.isArray(report.sourceIdentityFiles)) fail("sourceIdentityFiles missing");
  if (JSON.stringify(report.sourceIdentityFiles) !== JSON.stringify(expected.sourceIdentityFiles)) fail("sourceIdentityFiles mismatch");
  if (!Array.isArray(report.sourceIdentityFileHashes)) fail("sourceIdentityFileHashes missing");
  if (JSON.stringify(report.sourceIdentityFileHashes) !== JSON.stringify(expected.sourceIdentityFileHashes)) fail("sourceIdentityFileHashes mismatch");
  if (String(report.testedProductInputIdentitySha256 || "") !== String(expected.testedProductInputIdentitySha256 || "")) {
    fail("testedProductInputIdentitySha256 mismatch");
  }
  if (String(report.sourceIdentitySha256 || "") !== String(expected.sourceIdentitySha256 || "")) fail("sourceIdentitySha256 mismatch");
}

function assertReportedHeadCanReuseEvidence(reportHead, currentHead, options, fail) {
  if (reportHead === currentHead) return;

  try {
    gitLines(["cat-file", "-e", `${reportHead}^{commit}`]);
    gitLines(["merge-base", "--is-ancestor", reportHead, currentHead]);
  } catch {
    fail("gitHead provenance is not a valid ancestor of current HEAD");
  }

  let changedPaths;
  try {
    changedPaths = gitLines(["diff", "--name-only", `${reportHead}..${currentHead}`]);
  } catch {
    fail("gitHead provenance range cannot be inspected");
  }
  const classification = classifySmokeEvidenceChangePaths(changedPaths, options);
  if (classification.invalidating.length > 0) fail(`product input changed since report: ${classification.invalidating.join(", ")}`);
  if (classification.unknown.length > 0) fail(`unknown changed path since report: ${classification.unknown.join(", ")}`);
}

export function buildSmokeEvidenceIdentity(options = {}) {
  return buildCurrentSmokeEvidenceIdentity(options);
}

export function mustSmokeEvidenceIdentity(report, options = {}, label = "smoke report identity") {
  const expected = buildSmokeEvidenceIdentity(options);
  const fail = (message) => {
    throw new Error(`FAIL ${label}: ${message}`);
  };

  if (!report || typeof report !== "object") fail("report missing");
  if (typeof report.generatedAt !== "string" || !report.generatedAt.trim()) fail("generatedAt missing");
  assertReportInputIdentity(report, expected, fail);
  assertReportedHeadCanReuseEvidence(String(report.gitHead).trim(), expected.gitHead, options, fail);
  return expected;
}
