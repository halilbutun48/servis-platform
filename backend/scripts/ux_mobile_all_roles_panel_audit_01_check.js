#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, isAppJsxRoleTenantScopePath } from "./lib/guardGitScope.js";
import { mustSmokeEvidenceIdentity } from "./lib/guardSmokeEvidence.js";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const reportJsonPath = path.join(
  root,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01",
  "report.json"
);

const expectedStatusCounts = {
  BLOCKER: 0,
  "NOT-FOUND": 0,
  "UX-FIX": 0,
};

const expectedRoleCounts = {
  public: 6,
  superadmin: 12,
  room: 16,
  company: 12,
  school: 10,
  organization: 10,
  driver: 8,
  personel: 4,
  parent: 4,
};

const expectedKindCounts = {
  publicLanding: 4,
  loginRoot: 2,
  reviewQueue: 2,
  ops: 6,
  audit: 2,
  quality: 2,
  commercial: 2,
  commercialFlow: 8,
  dispatch: 2,
  agreementPreview: 8,
  routePreview: 4,
  density: 4,
  liveMap: 12,
  overview: 8,
  shifts: 4,
  convertToAgreement: 2,
  driverToday: 2,
  driverRoute: 2,
  driverCheckin: 2,
  personelMy: 2,
  parentOverview: 2,
};

const expectedViewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 844, name: "mobile", width: 390 },
];

const expectedCoverageSources = [
  APP_JSX_ROLE_TENANT_SCOPE_PATHS[0],
  "web/src/layout/NavDock.jsx",
  "web/src/copilot/screenRegistry.js",
  "backend/src/ai/jobGuide/screenCatalog.js",
  "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
  "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
];
const expectedIdentitySources = ["backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs", ...expectedCoverageSources];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function must(cond, label) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function mustNotContains(text, needle, label) {
  must(!String(text).includes(needle), label);
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
  }
  return counts;
}

function assertExactCounts(actual, expected, label) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  must(
    actualKeys.length === expectedKeys.length &&
      actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]),
    label
  );
}

function main() {
  console.log("=== UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01 CHECK ===");

  const pkg = read("package.json");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md");

  mustContains(pkg, '"check:uxmobileallrolespanelaudit01"', "package.json exposes mobile all roles panel audit check");
  mustContains(pkg, '"smoke:uxmobileallrolespanelaudit01": "node backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs"', "package.json exposes mobile all roles panel audit smoke");
  mustContains(verify, '"check:uxmobileallrolespanelaudit01"', "verify chain exposes mobile all roles panel audit check");
  assertProductExtensionsIncludes("check:uxmobileallrolespanelaudit01", "product extensions registry includes mobile all roles panel audit check");
  mustContains(harnessCheck, "check:uxmobileallrolespanelaudit01", "script harness check knows mobile all roles panel audit alias");
  mustContains(harnessCheck, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "script harness check knows mobile all roles panel audit milestone");
  mustContains(harnessCheck, "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md", "script harness check knows mobile all roles panel audit doc");
  mustContains(harnessDoc, "check:uxmobileallrolespanelaudit01", "script harness doc exposes mobile all roles panel audit root alias");
  mustContains(harnessDoc, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "script harness doc names mobile all roles panel audit milestone");
  mustContains(harnessDoc, "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md", "script harness doc registers mobile all roles panel audit doc");
  mustContains(guide, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "milestone guide mentions mobile all roles panel audit milestone");
  mustContains(guide, "check:uxmobileallrolespanelaudit01", "milestone guide exposes mobile all roles panel audit check");
  mustContains(guide, "node backend\\scripts\\ux_mobile_all_roles_panel_audit_01.mjs", "milestone guide includes mobile all roles panel audit command");

  mustContains(doc, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "mobile all roles panel audit doc title present");
  mustContains(doc, "mobile-first", "mobile all roles panel audit doc keeps mobile-first wording");
  mustContains(doc, "drawer", "mobile all roles panel audit doc keeps drawer wording");
  mustContains(doc, "backdrop", "mobile all roles panel audit doc keeps backdrop wording");
  mustContains(doc, "first viewport", "mobile all roles panel audit doc keeps first viewport wording");
  mustContains(doc, "Sefer Abi", "mobile all roles panel audit doc keeps launcher wording");
  mustContains(doc, "PASS- 37", "mobile all roles panel audit doc keeps current PASS- framing");
  mustContains(doc, "PASS- 19", "mobile all roles panel audit doc keeps premium smoke baseline framing");
  mustContains(doc, "Premium smoke comparison", "mobile all roles panel audit doc keeps premium comparison section");
  mustContains(doc, "birebir", "mobile all roles panel audit doc keeps non-1:1 comparison wording");
  mustContains(doc, "/#/room/reports", "mobile all roles panel audit doc keeps audit-only room reports route");
  mustContains(doc, "/#/room/live", "mobile all roles panel audit doc keeps premium-only room live route");
  mustContains(doc, "Mobile drawer toggle / overlay / scroll-lock", "mobile all roles panel audit doc keeps shell bucket wording");
  mustContains(doc, "Horizontal overflow", "mobile all roles panel audit doc keeps overflow bucket wording");
  mustContains(doc, "Sticky header / tab yoğunluğu", "mobile all roles panel audit doc keeps density bucket wording");
  mustContains(doc, "Launcher / primary action overlap", "mobile all roles panel audit doc keeps launcher bucket wording");
  mustContains(doc, "Console noise", "mobile all roles panel audit doc keeps console-noise bucket wording");
  mustContains(doc, "UX-MOBILE-ALL-ROLES-PANEL-FIX-01", "mobile all roles panel audit doc keeps next fix milestone");
  mustContains(doc, "UX-FIX 0", "mobile all roles panel audit doc keeps UX-FIX framing");
  mustContains(doc, "BLOCKER 0", "mobile all roles panel audit doc keeps blocker framing");
  mustContains(doc, "NOT-FOUND 0", "mobile all roles panel audit doc keeps not-found framing");
  mustContains(doc, "1440x900", "mobile all roles panel audit doc keeps desktop viewport framing");
  mustContains(doc, "390x844", "mobile all roles panel audit doc keeps current mobile viewport framing");
  mustContains(doc, "414x896", "mobile all roles panel audit doc keeps next mobile viewport candidate framing");
  mustContains(doc, "360x800", "mobile all roles panel audit doc keeps next compact viewport candidate framing");
  mustContains(doc, "browser-smoke", "mobile all roles panel audit doc keeps browser-smoke boundary");
  mustContains(doc, "runtime-data", "mobile all roles panel audit doc keeps runtime-data boundary");
  mustContains(
    doc,
    APP_JSX_ROLE_TENANT_SCOPE_PATHS[0],
    "mobile all roles panel audit doc keeps app route source",
  );
  mustContains(doc, "web/src/layout/NavDock.jsx", "mobile all roles panel audit doc keeps NavDock source");
  mustContains(doc, "web/src/copilot/screenRegistry.js", "mobile all roles panel audit doc keeps screen registry source");
  mustContains(doc, "backend/src/ai/jobGuide/screenCatalog.js", "mobile all roles panel audit doc keeps screen catalog source");
  mustContains(doc, "backend/src/ai/jobGuide/screenCatalog.roomCompany.js", "mobile all roles panel audit doc keeps room/company screen catalog source");
  mustContains(doc, "backend/scripts/ux_live_panel_premium_smoke_01.mjs", "mobile all roles panel audit doc keeps premium smoke route source");
  must(
    isAppJsxRoleTenantScopePath(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]),
    "mobile all roles panel audit App.jsx path delegates to canonical owner",
  );
  must(
    !isAppJsxRoleTenantScopePath("web/src/AppShell.jsx"),
    "mobile all roles panel audit rejects unrelated App shell source",
  );

  mustNotContains(doc, "force push", "mobile all roles panel audit doc avoids force push wording");
  mustNotContains(doc, "tag taşıma", "mobile all roles panel audit doc avoids tag rewrite wording");

  if (fs.existsSync(reportJsonPath)) {
    const report = readJson(reportJsonPath);
    mustSmokeEvidenceIdentity(report, {
      repoRoot: root,
      sourceFiles: expectedIdentitySources,
      schemaPath: "backend/prisma/schema.prisma",
      label: "mobile all roles panel audit report",
    });
    must(Array.isArray(report.routes), "mobile all roles panel audit report keeps routes array");
    must(report.routeCount === report.routes.length, "mobile all roles panel audit report route count matches rows");
    must(report.routeCount === 82, "mobile all roles panel audit report keeps 82 route checks");
    must(report.screenshotCount === 164, "mobile all roles panel audit report keeps 164 screenshots");
    must(report.pageErrorCount === 0, "mobile all roles panel audit report keeps pageErrorCount at 0");
    must(report.statusCounts.BLOCKER === expectedStatusCounts.BLOCKER, "mobile all roles panel audit report keeps blocker count at 0");
    must(report.statusCounts["NOT-FOUND"] === expectedStatusCounts["NOT-FOUND"], "mobile all roles panel audit report keeps not-found count at 0");
    must(report.statusCounts["UX-FIX"] === expectedStatusCounts["UX-FIX"], "mobile all roles panel audit report keeps UX-FIX count at 0");
    must(report.statusCounts.PASS > 0, "mobile all roles panel audit report keeps PASS count");
    must(report.statusCounts["PASS-"] >= 0, "mobile all roles panel audit report keeps PASS- count");
    must(
      report.statusCounts.PASS + report.statusCounts["PASS-"] + report.statusCounts["UX-FIX"] + (report.statusCounts["AUTH-BLOCKED"] || 0) ===
        report.routeCount,
      "mobile all roles panel audit report status buckets cover all routes"
    );

    const byRole = countBy(report.routes, "role");
    const byViewport = countBy(report.routes, "viewport");
    const byKind = countBy(report.routes, "kind");

    assertExactCounts(byRole, expectedRoleCounts, "mobile all roles panel audit report role coverage matrix");
    assertExactCounts(byViewport, { desktop: 41, mobile: 41 }, "mobile all roles panel audit report viewport coverage matrix");
    assertExactCounts(byKind, expectedKindCounts, "mobile all roles panel audit report interaction kind coverage matrix");

    if (Array.isArray(report.viewports)) {
      assertExactCounts(countBy(report.viewports, "name"), { desktop: 1, mobile: 1 }, "mobile all roles panel audit report viewport metadata matrix");
      must(report.viewports.length === expectedViewports.length, "mobile all roles panel audit report keeps viewport metadata count");
      must(
        report.viewports.some((viewport) => viewport.name === expectedViewports[0].name && viewport.width === expectedViewports[0].width && viewport.height === expectedViewports[0].height),
        "mobile all roles panel audit report keeps desktop viewport metadata"
      );
      must(
        report.viewports.some((viewport) => viewport.name === expectedViewports[1].name && viewport.width === expectedViewports[1].width && viewport.height === expectedViewports[1].height),
        "mobile all roles panel audit report keeps mobile viewport metadata"
      );
    }

    if (Array.isArray(report.coverageSources)) {
      for (const source of expectedCoverageSources) {
        must(report.coverageSources.includes(source), `mobile all roles panel audit report keeps coverage source ${source}`);
      }
    }

    for (const row of report.routes) {
      must(typeof row.role === "string" && row.role.length > 0, `route row keeps role for ${row.route}`);
      must(typeof row.label === "string" && row.label.length > 0, `route row keeps label for ${row.route}`);
      must(typeof row.route === "string" && row.route.startsWith("/#/"), `route row keeps route path for ${row.label}`);
      must(["desktop", "mobile"].includes(row.viewport), `route row keeps viewport for ${row.route}`);
      must(typeof row.status === "string" && row.status.length > 0, `route row keeps status for ${row.route}`);
      must(typeof row.kind === "string" && row.kind.length > 0, `route row keeps kind for ${row.route}`);
      must(Array.isArray(row.screenshots) && row.screenshots.length >= 1, `route row keeps screenshots for ${row.route}`);
      must(Array.isArray(row.notes) && row.notes.length >= 1, `route row keeps notes for ${row.route}`);
      must(row.checks && typeof row.checks === "object", `route row keeps checks object for ${row.route}`);
      must("primaryActionClickable" in row.checks, `route row keeps primary action check for ${row.route}`);
      must("mobileDrawerToggleWorks" in row.checks, `route row keeps drawer toggle check for ${row.route}`);
      must("horizontalOverflowControlled" in row.checks, `route row keeps overflow check for ${row.route}`);
      must("firstViewportContentVisible" in row.checks, `route row keeps first viewport check for ${row.route}`);
      must("launcherDoesNotCoverPrimaryAction" in row.checks, `route row keeps launcher overlap check for ${row.route}`);
    }

    const publicLandingRows = report.routes.filter((row) => row.kind === "publicLanding");
    must(publicLandingRows.length === 4, "mobile all roles panel audit public landing coverage appears in desktop/mobile pairs");
    must(publicLandingRows.every((row) => row.checks.publicCtaCount === 4), "mobile all roles panel audit public landing keeps four CTAs visible");
    must(publicLandingRows.every((row) => row.checks.demoModalOpened === true), "mobile all roles panel audit public landing demo CTA opens modal");

    const convertRows = report.routes.filter((row) => row.kind === "convertToAgreement");
    must(convertRows.length === 2, "mobile all roles panel audit company shift -> agreement coverage appears in desktop/mobile pairs");
    must(convertRows.every((row) => row.checks.convertButtonEnabled === true), "mobile all roles panel audit company shift conversion button remains enabled");
    must(convertRows.every((row) => row.checks.convertedToAgreementDraft === true), "mobile all roles panel audit company shift conversion reaches draft screen");

    const routePreviewRows = report.routes.filter((row) => row.kind === "routePreview");
    must(routePreviewRows.length === 4, "mobile all roles panel audit route preview coverage appears across room/company surfaces");
    const roomRoutePreviewRows = routePreviewRows.filter((row) => row.role === "room");
    const companyRoutePreviewRows = routePreviewRows.filter((row) => row.role === "company");
    must(roomRoutePreviewRows.length === 2, "mobile all roles panel audit room route preview coverage appears in both viewports");
    must(roomRoutePreviewRows.every((row) => row.checks.compactRoutePreview === true), "mobile all roles panel audit room route preview keeps compact summary evidence");
    must(companyRoutePreviewRows.length === 2, "mobile all roles panel audit company route preview coverage appears in both viewports");
    must(companyRoutePreviewRows.every((row) => row.status === "PASS"), "mobile all roles panel audit company route preview remains non-blocking");

    const reviewRows = report.routes.filter((row) => row.kind === "reviewQueue");
    must(reviewRows.length === 2, "mobile all roles panel audit review queue coverage appears in both viewports");
    must(reviewRows.every((row) => typeof row.checks.reviewActionCount === "number"), "mobile all roles panel audit review queue keeps action count signal");

    const agreementRows = report.routes.filter((row) => row.kind === "agreementPreview");
    must(agreementRows.length === 8, "mobile all roles panel audit agreement preview coverage spans room/company/school/organization");
    must(
      agreementRows.every((row) => row.status === "PASS" || row.status === "PASS-"),
      "mobile all roles panel audit agreement preview rows resolve to non-blocking status"
    );
    must(
      agreementRows.every((row) => Array.isArray(row.notes) && row.notes.some((note) => {
        const hay = normalize(note);
        return (
          hay.includes("detayi kapat") ||
          hay.includes("collapse icinde aciliyor") ||
          hay.includes("bos/fallback durumda okunur")
        );
      })),
      "mobile all roles panel audit agreement preview rows keep open or fallback evidence"
    );

    const dispatchRows = report.routes.filter((row) => row.kind === "dispatch");
    must(dispatchRows.length === 2, "mobile all roles panel audit dispatch coverage appears in both viewports");
    must(
      dispatchRows.every((row) => Array.isArray(row.notes) && row.notes.some((note) => normalize(note).includes("dispatch apply button enabled on seeded selection"))),
      "mobile all roles panel audit dispatch rows keep enabled evidence"
    );

    const launcherVisible = report.routes.filter((row) => row.checks?.seferAbiLauncherVisible);
    must(launcherVisible.length > 0, "mobile all roles panel audit authenticated routes keep Sefer Abi launcher visible");

    const liveMapRows = report.routes.filter((row) => row.kind === "liveMap");
    must(liveMapRows.length === 12, "mobile all roles panel audit live map coverage spans room/company/driver/personel/parent surfaces");
    const nonBlockingLiveMapRows = liveMapRows.filter((row) => row.status === "PASS" || row.status === "PASS-");
    if (nonBlockingLiveMapRows.length !== liveMapRows.length) {
      console.log(`WARN live map coverage gap rows: ${liveMapRows.length - nonBlockingLiveMapRows.length}`);
    } else {
      console.log("OK live map coverage stays non-blocking");
    }

    console.log(
      `OK coverage snapshot: ${report.routeCount} routes / ${report.screenshotCount} screenshots / desktop ${byViewport.desktop} / mobile ${byViewport.mobile}`
    );
    console.log(
      `OK coverage status snapshot: PASS ${report.statusCounts.PASS} / PASS- ${report.statusCounts["PASS-"]} / UX-FIX ${report.statusCounts["UX-FIX"]}`
    );
  } else {
    console.log("WARN audit report missing; run npm run smoke:uxmobileallrolespanelaudit01 to refresh the coverage matrix snapshot.");
  }

  console.log("=== UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
