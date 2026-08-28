#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, isAppJsxRoleTenantScopePath } from "./lib/guardGitScope.js";
import { mustSmokeEvidenceIdentity } from "./lib/guardSmokeEvidence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const reportJsonPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_ALL_PANELS_REALITY_AUDIT_01",
  "report.json"
);
const expectedCoverageSources = [
  APP_JSX_ROLE_TENANT_SCOPE_PATHS[0],
  "web/src/layout/NavDock.jsx",
  "web/src/copilot/screenRegistry.js",
  "backend/src/ai/jobGuide/screenCatalog.js",
  "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
  "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
];
const expectedIdentitySources = [
  "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
  ...expectedCoverageSources,
  "backend/scripts/ux_all_panels_reality_audit_01.mjs",
];

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => (predicate(item) ? count + 1 : count), 0);
}

function main() {
  console.log("=== UX ALL PANELS REALITY AUDIT 01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/ux_all_panels_reality_audit_01.mjs");
  const doc = read("docs/UX_ALL_PANELS_REALITY_AUDIT_01.md");
  const docLower = doc.toLowerCase();

  mustContains(pkg, '"check:uxallpanelsrealityaudit01"', "package.json exposes ux all panels reality audit check");
  mustContains(pkg, '"smoke:uxallpanelsrealityaudit01": "node backend/scripts/ux_all_panels_reality_audit_01.mjs"', "package.json exposes ux all panels reality audit smoke");
  mustContains(runner, "UX_ALL_PANELS_REALITY_AUDIT_01", "runner names the new audit milestone");
  mustContains(runner, "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "runner keeps the source audit dependency visible");
  mustContains(runner, "summary", "runner writes derived summary metrics");
  mustContains(runner, "mobileDrawerIssueCount", "runner tracks mobile drawer issues");
  mustContains(runner, "stickyHeaderTabIssueCount", "runner tracks sticky header / tab issues");
  mustContains(runner, "emptyLoadingErrorUnreadableCount", "runner tracks empty/loading/error readability");

  mustContains(doc, "UX-ALL-PANELS-REALITY-AUDIT-01", "doc title present");
  mustContains(doc, "P0 Check", "doc keeps P0 check section");
  mustContains(doc, "P1 Findings", "doc keeps P1 findings section");
  mustContains(docLower, "horizontal overflow", "doc covers horizontal overflow");
  mustContains(docLower, "primary action", "doc covers primary action visibility");
  mustContains(docLower, "launcher", "doc covers launcher overlap");
  mustContains(docLower, "empty/loading/error", "doc covers empty/loading/error readability");
  mustContains(docLower, "console, page, and network error signals were clean", "doc covers error-free browser signals");
  mustContains(docLower, "browser-smoke artifacts stay outside the commit set", "doc keeps commit-outside boundary");
  must(
    isAppJsxRoleTenantScopePath(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]),
    "all panels reality audit App.jsx path delegates to canonical owner",
  );
  must(
    !isAppJsxRoleTenantScopePath("web/src/AppShell.jsx"),
    "all panels reality audit rejects unrelated App shell source",
  );

  if (fs.existsSync(reportJsonPath)) {
    const report = readJson(reportJsonPath);
    const rows = Array.isArray(report.routes) ? report.routes : [];
    const summary = report.summary || {};

    must(report.auditName === "UX_ALL_PANELS_REALITY_AUDIT_01", "report uses the new audit name");
    must(report.sourceAuditName === "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "report tracks the source audit");
    mustSmokeEvidenceIdentity(
      report,
      {
        repoRoot,
        sourceFiles: expectedIdentitySources,
        schemaPath: "backend/prisma/schema.prisma",
      },
      "all panels smoke report identity"
    );
    must(
      Array.isArray(report.coverageSources) &&
        expectedCoverageSources.every((source) => report.coverageSources.includes(source)) &&
        report.coverageSources.includes("backend/scripts/ux_all_panels_reality_audit_01.mjs"),
      "report coverage includes the source audit sources and the new runner"
    );
    must(report.routeCount === 82, "report keeps 82 route checks");
    must(report.screenshotCount === 164, "report keeps 164 screenshots");
    must(report.statusCounts.PASS === 82, "report keeps PASS 82");
    must(report.statusCounts["PASS-"] === 0, "report keeps PASS- 0");
    must(report.statusCounts["UX-FIX"] === 0, "report keeps UX-FIX 0");
    must(report.statusCounts.BLOCKER === 0, "report keeps BLOCKER 0");
    must(report.statusCounts["AUTH-BLOCKED"] === 0, "report keeps AUTH-BLOCKED 0");
    must(report.statusCounts["NOT-FOUND"] === 0, "report keeps NOT-FOUND 0");
    must(report.consoleErrorCount === 0, "report keeps consoleErrorCount 0");
    must(report.pageErrorCount === 0, "report keeps pageErrorCount 0");
    must(summary.horizontalOverflowIssueCount === 0, "summary keeps horizontal overflow at 0");
    must(summary.primaryActionClickableIssueCount === 0, "summary keeps primary action clickable issues at 0");
    must(summary.launcherOverlapIssueCount === 0, "summary keeps launcher overlap at 0");
    must(summary.mobileDrawerIssueCount === 0, "summary keeps mobile drawer issues at 0");
    must(summary.stickyHeaderTabIssueCount === 0, "summary keeps sticky header / tab issues at 0");
    must(summary.emptyLoadingErrorUnreadableCount === 0, "summary keeps unreadable empty/loading/error surfaces at 0");
    must(summary.networkErrorCount === 0, "summary keeps network errors at 0");
    must(summary.primaryActionVisibleCount === 76, "summary keeps 76 visible primary-action rows");
    must(summary.primaryActionMissingByDesignCount === 6, "summary keeps 6 by-design CTA-light rows");
    must(summary.launcherVisibleAuthCount === 76, "summary keeps launcher visible on all authenticated rows");
    must(summary.driverMobileDrawerRoutes?.length === 0, "summary lists no driver mobile drawer issue rows");
    must(summary.stickyHeaderRoutes?.length === 0, "summary lists no sticky-header rows");
    must(countWhere(rows, (row) => row.checks?.horizontalOverflowControlled === false) === 0, "rows keep horizontal overflow clean");
    must(countWhere(rows, (row) => row.checks?.launcherDoesNotCoverPrimaryAction === false) === 0, "rows keep launcher overlap clean");
    must(countWhere(rows, (row) => row.checks?.primaryActionClickable === false) === 0, "rows keep primary action clickable");

    const nonPassRows = rows.filter((row) => row.status !== "PASS");
    must(nonPassRows.length === 0, "report keeps 0 non-PASS rows");
    must(nonPassRows.every((row) => row.status === "UX-FIX"), "report keeps only UX-FIX non-PASS rows");
  } else {
    console.warn(`WARN audit report missing; run npm run smoke:uxallpanelsrealityaudit01 to refresh ${reportJsonPath}.`);
  }
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
