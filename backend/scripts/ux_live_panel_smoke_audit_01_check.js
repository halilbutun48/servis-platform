#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const reportJsonPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

const expectedStatusCounts = {
  PASS: 9,
  "PASS-": 35,
  "UX-FIX": 38,
  BLOCKER: 0,
  "NOT-FOUND": 0,
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

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
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
  console.log("=== UX-LIVE-PANEL-COVERAGE-MATRIX-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md");
  const finalSmokeChecklist = read("docs/FINAL_UX_SMOKE_01_CHECKLIST.md");
  const inventoryAudit = read("docs/UX_PANEL_INVENTORY_02A_AUDIT.md");

  mustContains(pkg, '"check:uxlivepanelsmokeaudit01"', "package.json exposes check:uxlivepanelsmokeaudit01");
  mustContains(runner, "'check:uxlivepanelsmokeaudit01'", "product extensions runner includes live panel smoke audit check");
  mustContains(verify, '"check:uxlivepanelsmokeaudit01"', "verify chain exposes live panel smoke audit check");
  mustContains(harnessCheck, "check:uxlivepanelsmokeaudit01", "script harness check knows live panel smoke audit alias");
  mustContains(harnessCheck, "UX-LIVE-PANEL-COVERAGE-MATRIX-01", "script harness check knows coverage matrix milestone");
  mustContains(harnessCheck, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "script harness check knows live panel smoke audit doc");
  mustContains(harnessDoc, "check:uxlivepanelsmokeaudit01", "script harness doc exposes live panel smoke audit root alias");
  mustContains(harnessDoc, "UX-LIVE-PANEL-COVERAGE-MATRIX-01", "script harness doc names coverage matrix milestone");
  mustContains(harnessDoc, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "script harness doc registers live panel smoke audit doc");
  mustContains(guide, "UX-LIVE-PANEL-COVERAGE-MATRIX-01", "milestone guide mentions coverage matrix milestone");
  mustContains(guide, "check:uxlivepanelsmokeaudit01", "milestone guide exposes live panel smoke audit check");
  mustContains(guide, "node backend\\scripts\\ux_live_panel_smoke_audit_01_check.js", "milestone guide includes coverage matrix command");

  mustContains(doc, "UX-LIVE-PANEL-COVERAGE-MATRIX-01", "coverage matrix doc title present");
  mustContains(doc, "Coverage matrix", "coverage matrix doc keeps title phrase");
  mustContains(doc, "Route coverage", "coverage matrix doc explains route coverage");
  mustContains(doc, "Panel coverage", "coverage matrix doc explains panel coverage");
  mustContains(doc, "Interaction coverage", "coverage matrix doc explains interaction coverage");
  mustContains(doc, "Gap classes", "coverage matrix doc explains gap classes");
  mustContains(doc, "route-covered", "coverage matrix doc keeps route-covered class");
  mustContains(doc, "panel-visible", "coverage matrix doc keeps panel-visible class");
  mustContains(doc, "mobile-covered", "coverage matrix doc keeps mobile-covered class");
  mustContains(doc, "desktop-covered", "coverage matrix doc keeps desktop-covered class");
  mustContains(doc, "cta-not-covered", "coverage matrix doc keeps cta-not-covered class");
  mustContains(doc, "tab-not-covered", "coverage matrix doc keeps tab-not-covered class");
  mustContains(doc, "drawer-not-covered", "coverage matrix doc keeps drawer-not-covered class");
  mustContains(doc, "needs-manual-review", "coverage matrix doc keeps needs-manual-review class");
  mustContains(doc, "BLOCKER / NOT-FOUND", "coverage matrix doc keeps hard-fail policy");
  mustContains(doc, "AUTH-BLOCKED", "coverage matrix doc keeps auth-blocked policy");
  mustContains(doc, "Browser-smoke artifacts commit dışı kalır", "coverage matrix doc keeps browser-smoke boundary");
  mustContains(doc, "runtime-data commit dışı kalır", "coverage matrix doc keeps runtime-data boundary");
  mustContains(doc, "Public / Landing / public başvuru", "coverage matrix doc covers public landing");
  mustContains(doc, "Super Admin / Ticari Akış", "coverage matrix doc covers super admin commercial flow");
  mustContains(doc, "Room / Operasyon Sağlığı", "coverage matrix doc covers room operation health");
  mustContains(doc, "Room / Vardiyalar / Bekleyen Talepler", "coverage matrix doc covers room shifts");
  mustContains(doc, "Room / Ticari Akış", "coverage matrix doc covers room commercial flow");
  mustContains(doc, "Room / Sözleşmeler", "coverage matrix doc covers room agreements");
  mustContains(doc, "Room / Araçlar", "coverage matrix doc covers room vehicles");
  mustContains(doc, "Room / Sürücüler", "coverage matrix doc covers room drivers");
  mustContains(doc, "Company / Ticari Akış", "coverage matrix doc covers company commercial flow");
  mustContains(doc, "Company / Sözleşmeler", "coverage matrix doc covers company agreements");
  mustContains(doc, "Personel / Canlı Takip + Benim Servisim", "coverage matrix doc covers personel live surfaces");
  mustContains(doc, "Parent / Canlı Takip", "coverage matrix doc covers parent live");
  mustContains(doc, "Sefer Abi / Copilot drawer", "coverage matrix doc covers copilot drawer");
  mustContains(doc, "Mobil dar görünüm", "coverage matrix doc covers mobile narrow view");
  mustContains(doc, "CommercialCorePanel.jsx", "coverage matrix doc includes commercial core fix area");
  mustContains(doc, "CommercialFlowPanel.jsx", "coverage matrix doc includes commercial flow fix area");
  mustContains(doc, "AgreementsPanel.jsx", "coverage matrix doc includes agreements fix area");
  mustContains(doc, "VehiclesPanel.jsx", "coverage matrix doc includes vehicles fix area");
  mustContains(doc, "DriversPanel.jsx", "coverage matrix doc includes drivers fix area");
  mustContains(doc, "Manual smoke checklist", "coverage matrix doc keeps manual smoke checklist");

  mustContains(doc, "payment execute", "coverage matrix doc lists forbidden payment execute boundary");
  mustContains(doc, "billing execute", "coverage matrix doc lists forbidden billing execute boundary");
  mustContains(doc, "contract execute", "coverage matrix doc lists forbidden contract execute boundary");
  mustContains(doc, "invite send", "coverage matrix doc lists forbidden invite send boundary");
  mustContains(doc, "user create", "coverage matrix doc lists forbidden user create boundary");
  mustContains(doc, "supplier verification auto", "coverage matrix doc lists forbidden supplier verification boundary");
  mustContains(doc, "settlement execute", "coverage matrix doc lists forbidden settlement execute boundary");

  mustContains(finalSmokeChecklist, "Sefer Abi Terminali", "final smoke checklist remains referenced");
  mustContains(inventoryAudit, "Room / Oda", "panel inventory remains referenced");

  mustNotContains(doc, "payment execute açma", "coverage matrix doc avoids execute wording as an action");
  mustNotContains(doc, "billing execute açma", "coverage matrix doc avoids billing execute action wording");
  mustNotContains(doc, "invite send açma", "coverage matrix doc avoids invite send action wording");

  if (fs.existsSync(reportJsonPath)) {
    const report = readJson(reportJsonPath);
    must(Array.isArray(report.routes), "smoke report keeps routes array");
    must(report.routeCount === report.routes.length, "smoke report route count matches rows");
    must(report.routeCount === 82, "smoke report keeps 82 route checks");
    must(report.screenshotCount === 164, "smoke report keeps 164 screenshots");
    must(report.pageErrorCount === 0, "smoke report keeps pageErrorCount at 0");
    must(report.statusCounts.BLOCKER === 0, "smoke report keeps blocker count at 0");
    must(report.statusCounts["NOT-FOUND"] === 0, "smoke report keeps not-found count at 0");
    must(report.statusCounts.PASS === expectedStatusCounts.PASS, "smoke report keeps PASS count");
    must(report.statusCounts["PASS-"] === expectedStatusCounts["PASS-"], "smoke report keeps PASS- count");
    must(report.statusCounts["UX-FIX"] === expectedStatusCounts["UX-FIX"], "smoke report keeps UX-FIX count");
    must(
      report.statusCounts.PASS + report.statusCounts["PASS-"] + report.statusCounts["UX-FIX"] + (report.statusCounts["AUTH-BLOCKED"] || 0) ===
        report.routeCount,
      "smoke report status buckets cover all routes"
    );

    const byRole = countBy(report.routes, "role");
    const byViewport = countBy(report.routes, "viewport");
    const byKind = countBy(report.routes, "kind");

    assertExactCounts(byRole, expectedRoleCounts, "smoke report role coverage matrix");
    assertExactCounts(byViewport, { desktop: 41, mobile: 41 }, "smoke report viewport coverage matrix");
    assertExactCounts(byKind, expectedKindCounts, "smoke report interaction kind coverage matrix");

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
    }

    const publicLandingRows = report.routes.filter((row) => row.kind === "publicLanding");
    must(publicLandingRows.length === 4, "public landing coverage appears in desktop/mobile pairs");
    must(publicLandingRows.every((row) => row.checks.publicCtaCount === 4), "public landing keeps four CTAs visible");
    must(publicLandingRows.every((row) => row.checks.demoModalOpened === true), "public landing demo CTA opens modal");

    const convertRows = report.routes.filter((row) => row.kind === "convertToAgreement");
    must(convertRows.length === 2, "company shift -> agreement coverage appears in desktop/mobile pairs");
    must(convertRows.every((row) => row.checks.convertButtonEnabled === true), "company shift conversion button remains enabled");
    must(convertRows.every((row) => row.checks.convertedToAgreementDraft === true), "company shift conversion reaches draft screen");

    const routePreviewRows = report.routes.filter((row) => row.kind === "routePreview");
    must(routePreviewRows.length === 4, "route preview coverage appears across room/company surfaces");
    const compactRoutePreviewRows = routePreviewRows.filter((row) => row.checks.compactRoutePreview === true);
    if (compactRoutePreviewRows.length !== routePreviewRows.length) {
      console.log(
        `WARN route preview compact summary gap rows: ${routePreviewRows.length - compactRoutePreviewRows.length}`
      );
    } else {
      console.log("OK route preview keeps compact summary");
    }

    const reviewRows = report.routes.filter((row) => row.kind === "reviewQueue");
    must(reviewRows.length === 2, "review queue coverage appears in both viewports");
    must(reviewRows.every((row) => typeof row.checks.reviewActionCount === "number"), "review queue keeps action count signal");

    const agreementRows = report.routes.filter((row) => row.kind === "agreementPreview");
    must(agreementRows.length === 8, "agreement preview coverage spans room/company/school/organization");
    must(agreementRows.some((row) => row.notes.some((note) => note.includes("Detayı aç butonu görünmüyor."))), "agreement preview gap is documented");

    const dispatchRows = report.routes.filter((row) => row.kind === "dispatch");
    must(dispatchRows.length === 2, "dispatch coverage appears in both viewports");
    must(dispatchRows.some((row) => row.notes.some((note) => note.includes("Dispatch apply button not visible."))), "dispatch gap is documented");

    const launcherVisible = report.routes.filter((row) => row.checks?.seferAbiLauncherVisible);
    must(launcherVisible.length > 0, "authenticated routes keep Sefer Abi launcher visible");

    const liveMapRows = report.routes.filter((row) => row.kind === "liveMap");
    must(liveMapRows.length === 12, "live map coverage spans room/company/driver/personel/parent surfaces");
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
    console.log("WARN smoke report missing; run npm run smoke:uxlivepanelpremium01 to refresh the coverage matrix snapshot.");
  }

  console.log("=== UX-LIVE-PANEL-COVERAGE-MATRIX-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
