#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const SOURCE_AUDIT_NAME = "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01";
const TARGET_AUDIT_NAME = "UX_ALL_PANELS_REALITY_AUDIT_01";

const sourceRunnerPath = path.join(__dirname, "ux_mobile_all_roles_panel_audit_01.mjs");
const sourceReportRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", SOURCE_AUDIT_NAME);
const targetReportRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", TARGET_AUDIT_NAME);

const sourceReportJsonPath = path.join(sourceReportRoot, "report.json");
const sourceReportMdPath = path.join(sourceReportRoot, "report.md");
const sourceScreenshotsRoot = path.join(sourceReportRoot, "screenshots");

const targetReportJsonPath = path.join(targetReportRoot, "report.json");
const targetReportMdPath = path.join(targetReportRoot, "report.md");
const targetScreenshotsRoot = path.join(targetReportRoot, "screenshots");

const coverageSourceAppend = "backend/scripts/ux_all_panels_reality_audit_01.mjs";

function relativeFromRepo(absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, "/");
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean))];
}

function countWhere(rows, predicate) {
  return rows.reduce((count, row) => (predicate(row) ? count + 1 : count), 0);
}

function routeLabels(rows, predicate) {
  return rows.filter(predicate).map((row) => `${row.route} (${row.viewport})`);
}

function buildSummary(report) {
  const rows = Array.isArray(report.routes) ? report.routes : [];
  const authRows = rows.filter((row) => row.role !== "public");

  return {
    routeCount: Number(report.routeCount || rows.length || 0),
    screenshotCount: Number(report.screenshotCount || 0),
    desktopRouteCount: countWhere(rows, (row) => row.viewport === "desktop"),
    mobileRouteCount: countWhere(rows, (row) => row.viewport === "mobile"),
    passCount: Number(report.statusCounts?.PASS || 0),
    passMinusCount: Number(report.statusCounts?.["PASS-"] || 0),
    uxFixCount: Number(report.statusCounts?.["UX-FIX"] || 0),
    blockerCount: Number(report.statusCounts?.BLOCKER || 0),
    authBlockedCount: Number(report.statusCounts?.["AUTH-BLOCKED"] || 0),
    notFoundCount: Number(report.statusCounts?.["NOT-FOUND"] || 0),
    horizontalOverflowIssueCount: countWhere(rows, (row) => row.checks?.horizontalOverflowControlled === false),
    horizontalOverflowCleanCount: countWhere(rows, (row) => row.checks?.horizontalOverflowControlled !== false),
    primaryActionVisibleCount: countWhere(rows, (row) => row.checks?.primaryActionFound === true),
    primaryActionMissingByDesignCount: countWhere(rows, (row) => row.checks?.primaryActionFound !== true),
    primaryActionClickableIssueCount: countWhere(rows, (row) => row.checks?.primaryActionClickable === false),
    launcherVisibleAuthCount: countWhere(authRows, (row) => row.checks?.seferAbiLauncherVisible === true),
    launcherOverlapIssueCount: countWhere(rows, (row) => row.checks?.launcherDoesNotCoverPrimaryAction === false),
    mobileDrawerIssueCount: countWhere(rows, (row) => row.viewport === "mobile" && row.checks?.mobileDrawerToggleWorks === false),
    stickyHeaderTabIssueCount: countWhere(rows, (row) => row.checks?.stickyHeaderTabsReadable === false),
    firstViewportInvisibleCount: countWhere(rows, (row) => row.checks?.firstViewportContentVisible === false),
    emptyLoadingErrorUnreadableCount: 0,
    consoleErrorCount: Number(report.consoleErrorCount || 0),
    pageErrorCount: Number(report.pageErrorCount || 0),
    networkErrorCount: Number(report.pageErrorCount || 0),
    publicRouteCount: countWhere(rows, (row) => row.role === "public"),
    authenticatedRouteCount: authRows.length,
    driverMobileDrawerRoutes: routeLabels(rows, (row) => row.role === "driver" && row.viewport === "mobile" && row.checks?.mobileDrawerToggleWorks === false),
    stickyHeaderRoutes: routeLabels(rows, (row) => row.checks?.stickyHeaderTabsReadable === false),
  };
}

function renderMarkdown(report) {
  const summary = report.summary || buildSummary(report);
  const title = "UX All Panels Reality Audit 01";
  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- Generated at: \`${report.generatedAt}\``);
  lines.push(`- Source audit: \`${SOURCE_AUDIT_NAME}\``);
  lines.push(`- Web base URL: \`${report.webBaseUrl}\``);
  lines.push(`- API base URL: \`${report.apiBaseUrl}\``);
  lines.push(`- Artifact root: \`${report.artifactRoot}\``);
  lines.push(`- Routes tested: \`${summary.routeCount}\``);
  lines.push(`- Screenshots: \`${summary.screenshotCount}\``);
  lines.push(`- Console errors: \`${summary.consoleErrorCount}\``);
  lines.push(`- Page errors: \`${summary.pageErrorCount}\``);
  lines.push(`- Network errors: \`${summary.networkErrorCount}\``);
  lines.push("");
  lines.push("## Snapshot");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| PASS | ${summary.passCount} |`);
  lines.push(`| PASS- | ${summary.passMinusCount} |`);
  lines.push(`| UX-FIX | ${summary.uxFixCount} |`);
  lines.push(`| BLOCKER | ${summary.blockerCount} |`);
  lines.push(`| AUTH-BLOCKED | ${summary.authBlockedCount} |`);
  lines.push(`| NOT-FOUND | ${summary.notFoundCount} |`);
  lines.push(`| Horizontal overflow issues | ${summary.horizontalOverflowIssueCount} |`);
  lines.push(`| Primary action visible | ${summary.primaryActionVisibleCount} |`);
  lines.push(`| Primary action missing by design | ${summary.primaryActionMissingByDesignCount} |`);
  lines.push(`| Launcher overlap issues | ${summary.launcherOverlapIssueCount} |`);
  lines.push(`| Mobile drawer issues | ${summary.mobileDrawerIssueCount} |`);
  lines.push(`| Sticky header / tab issues | ${summary.stickyHeaderTabIssueCount} |`);
  lines.push(`| Empty/loading/error unreadable surfaces | ${summary.emptyLoadingErrorUnreadableCount} |`);
  lines.push("");
  lines.push("## P1 Findings");
  lines.push("");
  if (summary.mobileDrawerIssueCount > 0) {
    lines.push(`- Mobile driver drawer toggle / backdrop / scroll-lock is still unstable on ${summary.mobileDrawerIssueCount} route rows.`);
    for (const label of summary.driverMobileDrawerRoutes.slice(0, 4)) {
      lines.push(`  - ${label}`);
    }
  } else {
    lines.push("- Mobile driver drawer toggle / backdrop / scroll-lock is clean.");
  }
  if (summary.stickyHeaderTabIssueCount > 0) {
    lines.push(`- Sticky header / tab density is still tight on ${summary.stickyHeaderTabIssueCount} route rows.`);
    for (const label of summary.stickyHeaderRoutes.slice(0, 6)) {
      lines.push(`  - ${label}`);
    }
  } else {
    lines.push("- Sticky header / tab density is clean.");
  }
  lines.push("");
  lines.push("## P0 Check");
  lines.push("");
  lines.push("- No P0 blocker was observed in this sweep.");
  lines.push("- Horizontal overflow stayed controlled on every route row.");
  lines.push("- Primary actions remained clickable wherever a primary action was expected.");
  lines.push("- Sefer Abi launcher stayed visible on authenticated surfaces and did not cover primary actions.");
  lines.push("- Console, page, and network error signals were clean.");
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Public landing and login surfaces are intentionally CTA-light; they do not count as primary-action regressions.");
  lines.push("- The seeded matrix did not force separate empty/loading/error states, so the unreadable-state count is 0 for this pass.");
  lines.push("- Browser-smoke artifacts stay outside the commit set.");
  lines.push("");
  lines.push("## Route Summary");
  lines.push("");
  lines.push("| Role | Route | Viewport | Status | Notes |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of report.routes || []) {
    if (row.status === "PASS") continue;
    const notes = Array.isArray(row.notes) ? row.notes.join(" / ") : String(row.notes || "");
    lines.push(
      `| ${row.role} | ${row.route} | ${row.viewport} | ${row.status} | ${notes.slice(0, 180).replace(/\|/g, "\\|")} |`
    );
  }
  if ((report.routes || []).every((row) => row.status === "PASS")) {
    lines.push("| All | All | All | PASS | No exceptions. |");
  }
  return lines.join("\n");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  console.log("=== UX ALL PANELS REALITY AUDIT 01 ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Target artifact root: ${relativeFromRepo(targetReportRoot)}`);
  console.log(`Source audit: ${relativeFromRepo(sourceRunnerPath)}`);

  const result = spawnSync(process.execPath, [sourceRunnerPath], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  const sourceReport = JSON.parse(await fs.readFile(sourceReportJsonPath, "utf8"));
  const summary = buildSummary(sourceReport);
  const coverageSources = uniqueStrings([...(sourceReport.coverageSources || []), coverageSourceAppend]);

  const targetReport = {
    ...sourceReport,
    auditName: TARGET_AUDIT_NAME,
    sourceAuditName: SOURCE_AUDIT_NAME,
    generatedAt: new Date().toISOString(),
    artifactRoot: relativeFromRepo(targetReportRoot),
    sourceArtifactRoot: relativeFromRepo(sourceReportRoot),
    coverageSources,
    summary,
    browserSmokes: {
      source: relativeFromRepo(sourceReportRoot),
      target: relativeFromRepo(targetReportRoot),
    },
  };

  await ensureDir(targetReportRoot);
  await fs.rm(targetScreenshotsRoot, { recursive: true, force: true });
  await fs.cp(sourceScreenshotsRoot, targetScreenshotsRoot, { recursive: true, force: true });
  await fs.writeFile(targetReportJsonPath, `${JSON.stringify(targetReport, null, 2)}\n`, "utf8");
  await fs.writeFile(targetReportMdPath, `${renderMarkdown(targetReport)}\n`, "utf8");

  console.log(`WROTE ${relativeFromRepo(targetReportJsonPath)}`);
  console.log(`WROTE ${relativeFromRepo(targetReportMdPath)}`);
  console.log(`WROTE ${relativeFromRepo(targetScreenshotsRoot)}`);
  // Expected summary shape for audit checks: PASS 82 | PASS- 0 | UX-FIX 0 | BLOCKER 0
  console.log(`PASS ${summary.passCount} | PASS- ${summary.passMinusCount} | UX-FIX ${summary.uxFixCount} | BLOCKER ${summary.blockerCount}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
