#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const allPanelsReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_ALL_PANELS_REALITY_AUDIT_01",
  "report.json"
);

const mobileAllRolesReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01",
  "report.json"
);

const premiumSmokeReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

const productFlowReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "PRODUCT_FLOW_BUTTON_AUDIT_01",
  "report.json"
);

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function gitSaysYes(args) {
  try {
    execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
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

function must(cond, label) {
  if (!cond) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function expectStatusCounts(report, expected, label) {
  must(report.routeCount === expected.routeCount, `${label} route count`);
  if (expected.screenshotCount !== undefined) {
    must(report.screenshotCount === expected.screenshotCount, `${label} screenshot count`);
  }
  if (expected.success !== undefined) {
    must(report.success === expected.success, `${label} success flag`);
  }
  if (expected.consoleErrorCount !== undefined) {
    must(report.consoleErrorCount === expected.consoleErrorCount, `${label} console error count`);
  }
  if (expected.pageErrorCount !== undefined) {
    must(report.pageErrorCount === expected.pageErrorCount, `${label} page error count`);
  }
  if (expected.totalLoginFailures !== undefined) {
    must(report.totalLoginFailures === expected.totalLoginFailures, `${label} login failure count`);
  }

  const actual = report.statusCounts || {};
  for (const [status, value] of Object.entries(expected.statusCounts || {})) {
    must(actual[status] === value, `${label} keeps ${status} count`);
  }
}

function expectSummary(report, expected, label) {
  const summary = report.summary || {};
  for (const [key, value] of Object.entries(expected)) {
    must(summary[key] === value, `${label} summary ${key}`);
  }
}

function main() {
  console.log("=== QUALITY-GATE-FINAL-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/QUALITY_GATE_FINAL_01.md");
  const roadmapLock = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");

  mustContains(pkg, '"check:qualitygatefinal01": "node backend/scripts/quality_gate_final_01_check.js"', "package.json exposes quality gate final check");
  mustContains(runner, "'check:qualitygatefinal01'", "product extensions runner includes quality gate final check");
  mustContains(verify, '"check:qualitygatefinal01"', "verify chain exposes quality gate final check");
  mustContains(harnessCheck, "QUALITY-GATE-FINAL-01", "script harness check knows quality gate final milestone");
  mustContains(harnessCheck, "check:qualitygatefinal01", "script harness check knows quality gate final alias");
  mustContains(harnessCheck, "docs/QUALITY_GATE_FINAL_01.md", "script harness check knows quality gate final doc");
  mustContains(harnessDoc, "QUALITY-GATE-FINAL-01", "script harness doc lists quality gate final milestone");
  mustContains(harnessDoc, "check:qualitygatefinal01", "script harness doc lists quality gate final alias");
  mustContains(harnessDoc, "docs/QUALITY_GATE_FINAL_01.md", "script harness doc lists quality gate final doc");
  mustContains(guide, "QUALITY-GATE-FINAL-01", "milestone guide mentions quality gate final milestone");
  mustContains(guide, "check:qualitygatefinal01", "milestone guide exposes quality gate final check");
  mustContains(guide, "node backend\\scripts\\quality_gate_final_01_check.js", "milestone guide includes quality gate final command");
  mustContains(guide, "docs/QUALITY_GATE_FINAL_01.md", "milestone guide includes quality gate final doc");
  mustContains(roadmapLock, "QUALITY-GATE-FINAL-01", "roadmap lock keeps quality gate final milestone");

  mustContains(doc, "QUALITY-GATE-FINAL-01", "quality gate final doc title present");
  mustContains(doc, "check:qualitygatefinal01", "quality gate final doc exposes the alias");
  mustContains(doc, "node backend\\scripts\\quality_gate_final_01_check.js", "quality gate final doc exposes the command");
  mustContains(doc, "all-panels reality audit", "quality gate final doc names all-panels audit");
  mustContains(doc, "mobile all-roles audit", "quality gate final doc names mobile all-roles audit");
  mustContains(doc, "premium smoke", "quality gate final doc names premium smoke");
  mustContains(doc, "product-flow button audit", "quality gate final doc names product-flow audit");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps all-panels summary");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps mobile all-roles summary");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps premium summary");
  mustContains(doc, "PASS 14 / PASS- 4 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps product-flow summary");
  mustContains(doc, "UX-SMOKE-PASS-MINUS-EVIDENCE-01", "quality gate final doc references PASS-minus evidence doc");
  mustContains(doc, "PRODUCT-FLOW-BUTTON-AUDIT-01", "quality gate final doc references product flow audit doc");
  mustContains(doc, "runtime-data", "quality gate final doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "quality gate final doc keeps browser-smoke boundary");
  mustContains(doc, "backend/src/routes", "quality gate final doc keeps backend routes boundary");
  mustContains(doc, "backend/src/services", "quality gate final doc keeps backend services boundary");
  mustContains(doc, "prisma", "quality gate final doc keeps prisma boundary");
  mustContains(doc, "backend/prisma", "quality gate final doc keeps backend prisma boundary");
  mustContains(doc, "no route/service/schema", "quality gate final doc keeps route/service/schema wording");
  mustContains(doc, "no Prisma/schema/migration", "quality gate final doc keeps prisma/schema/migration wording");
  mustContains(doc, "commit-ready", "quality gate final doc keeps commit-ready wording");
  mustContains(doc, "release blocker", "quality gate final doc keeps release blocker wording");
  mustContains(doc, "stage empty", "quality gate final doc keeps stage-empty wording");
  mustNotContains(doc, "force push", "quality gate final doc avoids force-push wording");
  mustNotContains(doc, "tag taşıma", "quality gate final doc avoids tag-move wording");

  if (!fs.existsSync(allPanelsReportPath)) {
    throw new Error("FAIL quality gate final missing all-panels report");
  }
  if (!fs.existsSync(mobileAllRolesReportPath)) {
    throw new Error("FAIL quality gate final missing mobile all-roles report");
  }
  if (!fs.existsSync(premiumSmokeReportPath)) {
    throw new Error("FAIL quality gate final missing premium smoke report");
  }
  if (!fs.existsSync(productFlowReportPath)) {
    throw new Error("FAIL quality gate final missing product-flow report");
  }

  const allPanelsReport = readJson(allPanelsReportPath);
  const mobileAllRolesReport = readJson(mobileAllRolesReportPath);
  const premiumSmokeReport = readJson(premiumSmokeReportPath);
  const productFlowReport = readJson(productFlowReportPath);

  expectStatusCounts(
    allPanelsReport,
    {
      routeCount: 82,
      screenshotCount: 164,
      statusCounts: {
        PASS: 82,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
    },
    "all-panels reality audit"
  );
  expectSummary(
    allPanelsReport,
    {
      desktopRouteCount: 41,
      mobileRouteCount: 41,
      passCount: 82,
      passMinusCount: 0,
      uxFixCount: 0,
      blockerCount: 0,
      authBlockedCount: 0,
      notFoundCount: 0,
      horizontalOverflowIssueCount: 0,
      primaryActionClickableIssueCount: 0,
      launcherOverlapIssueCount: 0,
      mobileDrawerIssueCount: 0,
      stickyHeaderTabIssueCount: 0,
      emptyLoadingErrorUnreadableCount: 0,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      networkErrorCount: 0,
    },
    "all-panels reality audit"
  );

  expectStatusCounts(
    mobileAllRolesReport,
    {
      routeCount: 82,
      screenshotCount: 164,
      statusCounts: {
        PASS: 82,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      totalLoginFailures: 0,
    },
    "mobile all-roles audit"
  );

  expectStatusCounts(
    premiumSmokeReport,
    {
      routeCount: 82,
      screenshotCount: 164,
      statusCounts: {
        PASS: 82,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      totalLoginFailures: 0,
    },
    "premium smoke"
  );

  expectStatusCounts(
    productFlowReport,
    {
      routeCount: 18,
      screenshotCount: 36,
      statusCounts: {
        PASS: 14,
        "PASS-": 4,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      totalLoginFailures: 0,
    },
    "product-flow button audit"
  );

  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  must(!normalize(staged).includes("backend/artifacts/runtime-data"), "runtime-data is not staged");
  must(!normalize(staged).includes("backend/artifacts/browser-smoke"), "browser-smoke artifacts are not staged");

  const routeDiff = execFileSync("git", ["diff", "--name-only", "--", "backend/src/routes"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const serviceDiff = execFileSync("git", ["diff", "--name-only", "--", "backend/src/services"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const prismaDiff = execFileSync("git", ["diff", "--name-only", "--", "prisma"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const backendPrismaDiff = execFileSync("git", ["diff", "--name-only", "--", "backend/prisma"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  must(routeDiff === "", "backend routes stay unchanged");
  must(serviceDiff === "", "backend services stay unchanged");
  must(prismaDiff === "", "prisma stay unchanged");
  must(backendPrismaDiff === "", "backend prisma stay unchanged");

  const requiredTags = [
    "v2026.06.08-quality-gate-final-01",
    "v2026.06.08-quality-gate-final-01b-premium-smoke-fix",
    "v2026.06.08-ux-all-panels-p1-burndown-01",
    "v2026.06.08-roadmap-lock-ai-marketplace-01",
  ];
  for (const tag of requiredTags) {
    must(gitLines(["tag", "--list", tag]).includes(tag), `quality gate tag exists: ${tag}`);
  }

  const reachableTags = [
    "v2026.06.08-quality-gate-final-01b-premium-smoke-fix",
    "v2026.06.08-ux-all-panels-p1-burndown-01",
  ];
  for (const tag of reachableTags) {
    const tagCommit = gitLines(["rev-parse", "--verify", `${tag}^{commit}`])[0];
    must(Boolean(tagCommit), `quality gate tag resolves to a commit: ${tag}`);
    must(
      gitSaysYes(["merge-base", "--is-ancestor", tagCommit, "HEAD"]),
      `current HEAD keeps reachable quality gate history for ${tag}`
    );
  }

  console.log("=== QUALITY-GATE-FINAL-01 CHECK PASS ===");
}

main();
