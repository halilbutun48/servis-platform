import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { gitLines } from "./guardGitScope.js";
import { normalizedTextSha256 } from "./guardTextIntegrity.js";

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function uniqueStrings(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").toUpperCase();
}

function hashSourceFile(relPath) {
  return {
    path: relPath,
    sha256: normalizedTextSha256(relPath),
  };
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
    // Fall through and let the HEAD lookup fail with a clear filesystem error.
  }

  const headPath = path.join(gitDir, "HEAD");
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head;

  const refName = head.slice(5).trim();
  const refPath = path.join(gitDir, ...refName.split("/"));
  if (fs.existsSync(refPath)) {
    return fs.readFileSync(refPath, "utf8").trim();
  }

  const packedRefsPath = path.join(gitDir, "packed-refs");
  if (fs.existsSync(packedRefsPath)) {
    const packedRefs = fs.readFileSync(packedRefsPath, "utf8").split(/\r?\n/);
    const packedMatch = packedRefs.find((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("^") && trimmed.endsWith(` ${refName}`);
    });
    if (packedMatch) {
      return packedMatch.trim().split(/\s+/)[0];
    }
  }

  throw new Error(`Unable to resolve git HEAD ref ${refName}`);
}

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

function buildLegacySmokeEvidenceIdentity({ sourceFiles = [], schemaPath = "backend/prisma/schema.prisma" } = {}) {
  const sourceIdentityFiles = uniqueStrings(sourceFiles);
  const sourceIdentityFileHashes = sourceIdentityFiles.map(hashSourceFile);

  return {
    gitHead: String(gitLines(["rev-parse", "HEAD"])[0] || ""),
    schemaSha256: normalizedTextSha256(schemaPath),
    sourceIdentityFiles,
    sourceIdentityFileHashes,
    sourceIdentitySha256: sha256Json(sourceIdentityFileHashes),
  };
}

function buildCurrentSmokeEvidenceIdentity({ repoRoot, sourceFiles = [], schemaPath = "backend/prisma/schema.prisma" }) {
  const gitHead = readGitHead(repoRoot);
  const sourceIdentityFiles = sourceFiles.map((relPath) => {
    const absPath = path.join(repoRoot, relPath);
    const stats = fs.statSync(absPath);
    return {
      path: String(relPath).replace(/\\/g, "/"),
      bytes: stats.size,
      sha256: readFileSha256(absPath),
    };
  });
  const sourceIdentityFileHashes = sourceIdentityFiles.map(({ path: filePath, sha256 }) => ({ path: filePath, sha256 }));
  const schemaSha256 = schemaPath ? readFileSha256(path.join(repoRoot, schemaPath)) : "";
  const sourceIdentitySha256 = sha256Hex(
    JSON.stringify({
      gitHead,
      schemaSha256,
      sourceIdentityFiles: sourceIdentityFiles.map(({ path: filePath, bytes, sha256 }) => ({ path: filePath, bytes, sha256 })),
    })
  );

  return {
    gitHead,
    schemaSha256,
    sourceIdentityFiles,
    sourceIdentityFileHashes,
    sourceIdentitySha256,
  };
}

export function buildSmokeEvidenceIdentity(options = {}) {
  if (options && Object.prototype.hasOwnProperty.call(options, "repoRoot")) {
    return buildCurrentSmokeEvidenceIdentity(options);
  }
  return buildLegacySmokeEvidenceIdentity(options);
}

export function mustSmokeEvidenceIdentity(report, options = {}, label = "smoke report identity") {
  const expected = buildSmokeEvidenceIdentity(options);
  const fail = (message) => {
    throw new Error(`FAIL ${label}: ${message}`);
  };

  if (!report || typeof report !== "object") fail("report missing");
  if (typeof report.generatedAt !== "string" || !report.generatedAt.trim()) fail("generatedAt missing");
  if (String(report.gitHead || "") !== String(expected.gitHead || "")) {
    fail(`gitHead mismatch (expected ${expected.gitHead || "missing"}, got ${report.gitHead || "missing"})`);
  }
  if (String(report.schemaSha256 || "") !== String(expected.schemaSha256 || "")) {
    fail("schemaSha256 mismatch");
  }
  if (!Array.isArray(report.sourceIdentityFiles)) fail("sourceIdentityFiles missing");

  if (expected.sourceIdentityFiles.length > 0 && typeof expected.sourceIdentityFiles[0] === "string") {
    if (JSON.stringify(report.sourceIdentityFiles) !== JSON.stringify(expected.sourceIdentityFiles)) {
      fail("sourceIdentityFiles mismatch");
    }
    if (!Array.isArray(report.sourceIdentityFileHashes)) fail("sourceIdentityFileHashes missing");
    if (JSON.stringify(report.sourceIdentityFileHashes) !== JSON.stringify(expected.sourceIdentityFileHashes)) {
      fail("sourceIdentityFileHashes mismatch");
    }
  } else {
    if (report.sourceIdentityFiles.length !== expected.sourceIdentityFiles.length) {
      fail(`sourceIdentityFiles count mismatch (expected ${expected.sourceIdentityFiles.length}, got ${report.sourceIdentityFiles.length})`);
    }

    for (let i = 0; i < expected.sourceIdentityFiles.length; i += 1) {
      const actual = report.sourceIdentityFiles[i] || {};
      const expectedFile = expected.sourceIdentityFiles[i];
      if (actual.path !== expectedFile.path) fail(`sourceIdentityFiles[${i}].path mismatch for ${expectedFile.path}`);
      if (actual.bytes !== expectedFile.bytes) fail(`sourceIdentityFiles[${i}].bytes mismatch for ${expectedFile.path}`);
      if (actual.sha256 !== expectedFile.sha256) fail(`sourceIdentityFiles[${i}].sha256 mismatch for ${expectedFile.path}`);
    }

    if (Array.isArray(report.sourceIdentityFileHashes)) {
      const expectedFileHashes = expected.sourceIdentityFileHashes;
      if (JSON.stringify(report.sourceIdentityFileHashes) !== JSON.stringify(expectedFileHashes)) {
        fail("sourceIdentityFileHashes mismatch");
      }
    }
  }

  if (String(report.sourceIdentitySha256 || "") !== String(expected.sourceIdentitySha256 || "")) {
    fail("sourceIdentitySha256 mismatch");
  }

  return expected;
}
