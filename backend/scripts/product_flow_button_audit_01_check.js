#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const reportJsonPath = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01", "report.json");

const expectedStatusCounts = {
  PASS: 18,
  "PASS-": 0,
  "UX-FIX": 0,
  BLOCKER: 0,
  "AUTH-BLOCKED": 0,
  "NOT-FOUND": 0,
};

const expectedRoleCounts = {
  public: 2,
  superadmin: 4,
  company: 4,
  room: 4,
  personel: 2,
  parent: 2,
};

const expectedKindCounts = {
  publicLanding: 2,
  reviewQueue: 2,
  commercialReadOnly: 2,
  convertToAgreement: 2,
  agreementPreview: 2,
  dispatchApproval: 2,
  roomAgreementPreview: 2,
  personelLive: 2,
  parentLive: 2,
};

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function must(cond, label) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
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
  console.log("=== PRODUCT-FLOW-BUTTON-AUDIT-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md");
  const smoke = read("backend/scripts/product_flow_button_audit_01.mjs");

  mustContains(pkg, '"check:productflowbuttonaudit01": "node backend/scripts/product_flow_button_audit_01_check.js"', "package.json exposes product flow button audit check");
  mustContains(pkg, '"smoke:productflowbuttonaudit01": "node backend/scripts/product_flow_button_audit_01.mjs"', "package.json exposes product flow button audit smoke");
  mustContains(runner, "'check:productflowbuttonaudit01'", "product extensions runner includes product flow button audit check");
  mustContains(verify, '"check:productflowbuttonaudit01"', "verify chain exposes product flow button audit check");
  mustContains(harnessCheck, "PRODUCT-FLOW-BUTTON-AUDIT-01", "script harness check knows product flow button audit milestone");
  mustContains(harnessCheck, "check:productflowbuttonaudit01", "script harness check knows product flow button audit alias");
  mustContains(harnessCheck, "smoke:productflowbuttonaudit01", "script harness check knows product flow button audit smoke alias");
  mustContains(harnessCheck, "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md", "script harness check knows product flow button audit doc");
  mustContains(harnessDoc, "PRODUCT-FLOW-BUTTON-AUDIT-01", "script harness doc lists product flow button audit milestone");
  mustContains(harnessDoc, "check:productflowbuttonaudit01", "script harness doc lists product flow button audit alias");
  mustContains(harnessDoc, "smoke:productflowbuttonaudit01", "script harness doc lists product flow button audit smoke alias");
  mustContains(harnessDoc, "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md", "script harness doc lists product flow button audit doc");
  mustContains(guide, "PRODUCT-FLOW-BUTTON-AUDIT-01", "milestone guide mentions product flow button audit milestone");
  mustContains(guide, "check:productflowbuttonaudit01", "milestone guide exposes product flow button audit check");
  mustContains(guide, "node backend\\scripts\\product_flow_button_audit_01_check.js", "milestone guide includes product flow button audit check command");
  mustContains(guide, "node backend\\scripts\\product_flow_button_audit_01.mjs", "milestone guide includes product flow button audit smoke command");
  mustContains(doc, "PRODUCT-FLOW-BUTTON-AUDIT-01", "product flow button audit doc title present");
  mustContains(doc, "check:productflowbuttonaudit01", "product flow button audit doc exposes check alias");
  mustContains(doc, "smoke:productflowbuttonaudit01", "product flow button audit doc exposes smoke alias");
  mustContains(doc, "node backend\\scripts\\product_flow_button_audit_01_check.js", "product flow button audit doc includes check command");
  mustContains(doc, "node backend\\scripts\\product_flow_button_audit_01.mjs", "product flow button audit doc includes smoke command");
  mustContains(doc, "Public lead modal", "product flow button audit doc covers public lead modal");
  mustContains(doc, "review-only", "product flow button audit doc keeps review-only boundary");
  mustContains(doc, "readonly payment", "product flow button audit doc keeps readonly payment boundary");
  mustContains(doc, "no write flows", "product flow button audit doc keeps no-write boundary");
  mustContains(doc, "no settlement execute", "product flow button audit doc keeps settlement execute boundary");
  mustContains(doc, "no invite send", "product flow button audit doc keeps invite send boundary");
  mustContains(doc, "no user create", "product flow button audit doc keeps user create boundary");
  mustContains(doc, "18 routes", "product flow button audit doc keeps route count");
  mustContains(doc, "36 screenshots", "product flow button audit doc keeps screenshot count");
  mustContains(doc, "PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "product flow button audit doc keeps smoke summary");
  mustContains(doc, "UX-FIX 0", "product flow button audit doc keeps UX-FIX target");
  mustContains(doc, "BLOCKER 0", "product flow button audit doc keeps blocker target");
  mustContains(doc, "AUTH-BLOCKED 0", "product flow button audit doc keeps auth-blocked target");
  mustContains(doc, "NOT-FOUND 0", "product flow button audit doc keeps not-found target");

  mustContains(smoke, "trial: true", "smoke runner uses trial clicks for write buttons");
  mustContains(smoke, "Ad soyad gerekli.", "smoke runner keeps validation-only public lead flow");
  mustContains(smoke, "Bu kart readonly kontrol içindir; işlem başlatmaz.", "smoke runner keeps readonly commercial core boundary");
  mustContains(smoke, "Harita / Navigasyon Önizle", "smoke runner covers company preview button");
  mustContains(smoke, "Rota Önizleme", "smoke runner covers route preview button");
  mustContains(smoke, "Navigasyon Aç", "smoke runner covers personel navigation button");
  mustContains(smoke, "Bugün gelmiyor", "smoke runner covers parent no-show button");
  mustContains(smoke, "İncelemeye al", "smoke runner covers review queue action");
  mustContains(smoke, "Tam Rotayı Dış Navigasyonda Aç", "smoke runner keeps route preview external navigation read-only");
  mustNotContains(smoke, "submitPublicLead(", "smoke runner does not call public lead write API");
  mustNotContains(smoke, "updatePublicLeadReviewStatus(", "smoke runner does not call review write API");
  mustNotContains(smoke, "approveShiftAction(", "smoke runner does not call room approve API");
  mustNotContains(smoke, "rejectShiftAction(", "smoke runner does not call room reject API");
  mustNotContains(smoke, "window.open(", "smoke runner does not invoke external navigation directly");

  must(fs.existsSync(reportJsonPath), "product flow smoke report exists");

  const report = readJson(reportJsonPath);
  must(Array.isArray(report.routes), "smoke report keeps routes array");
  must(report.routeCount === report.routes.length, "smoke report route count matches rows");
  must(report.routeCount === 18, "smoke report keeps 18 route checks");
  must(report.screenshotCount === 36, "smoke report keeps 36 screenshots");
  must(report.consoleErrorCount === 0, "smoke report keeps consoleErrorCount at 0");
  must(report.pageErrorCount === 0, "smoke report keeps pageErrorCount at 0");
  must(report.totalLoginFailures === 0, "smoke report keeps login failures at 0");
  must(report.success === true, "smoke report marks success true");
  must(report.statusCounts.PASS === expectedStatusCounts.PASS, "smoke report keeps PASS count");
  must(report.statusCounts["PASS-"] === expectedStatusCounts["PASS-"], "smoke report keeps PASS- count");
  must(report.statusCounts["UX-FIX"] === expectedStatusCounts["UX-FIX"], "smoke report keeps UX-FIX count");
  must(report.statusCounts.BLOCKER === expectedStatusCounts.BLOCKER, "smoke report keeps blocker count");
  must(report.statusCounts["AUTH-BLOCKED"] === expectedStatusCounts["AUTH-BLOCKED"], "smoke report keeps auth-blocked count");
  must(report.statusCounts["NOT-FOUND"] === expectedStatusCounts["NOT-FOUND"], "smoke report keeps not-found count");
  must(report.statusCounts.PASS + report.statusCounts["PASS-"] + report.statusCounts["UX-FIX"] + report.statusCounts.BLOCKER + report.statusCounts["AUTH-BLOCKED"] + report.statusCounts["NOT-FOUND"] === report.routeCount, "smoke report status buckets cover all routes");

  assertExactCounts(countBy(report.routes, "role"), expectedRoleCounts, "smoke report role coverage matrix");
  assertExactCounts(countBy(report.routes, "viewport"), { desktop: 9, mobile: 9 }, "smoke report viewport coverage matrix");
  assertExactCounts(countBy(report.routes, "kind"), expectedKindCounts, "smoke report interaction kind coverage matrix");

  if (Array.isArray(report.viewports)) {
    must(report.viewports.length === 2, "smoke report keeps viewport metadata count");
    must(report.viewports.some((viewport) => viewport.name === "desktop" && viewport.width === 1440 && viewport.height === 900), "smoke report keeps desktop viewport metadata");
    must(report.viewports.some((viewport) => viewport.name === "mobile" && viewport.width === 390 && viewport.height === 844), "smoke report keeps mobile viewport metadata");
  }

  if (Array.isArray(report.coverageSources)) {
    for (const source of [
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
    ]) {
      must(report.coverageSources.includes(source), `smoke report keeps coverage source ${source}`);
    }
  }

  for (const row of report.routes) {
    must(typeof row.role === "string" && row.role.length > 0, `route row keeps role for ${row.route}`);
    must(typeof row.label === "string" && row.label.length > 0, `route row keeps label for ${row.route}`);
    must(typeof row.route === "string" && row.route.startsWith("/#/"), `route row keeps route path for ${row.label}`);
    must(["desktop", "mobile"].includes(row.viewport), `route row keeps viewport for ${row.route}`);
    must(typeof row.status === "string" && row.status.length > 0, `route row keeps status for ${row.route}`);
    must(typeof row.kind === "string" && row.kind.length > 0, `route row keeps kind for ${row.route}`);
    must(Array.isArray(row.screenshots) && row.screenshots.length === 2, `route row keeps before/after screenshots for ${row.route}`);
    must(Array.isArray(row.notes) && row.notes.length >= 1, `route row keeps notes for ${row.route}`);
    must(row.checks && typeof row.checks === "object", `route row keeps checks object for ${row.route}`);
  }

  const publicRows = report.routes.filter((row) => row.kind === "publicLanding");
  must(publicRows.length === 2, "public landing coverage appears in desktop/mobile pairs");
  must(publicRows.every((row) => row.checks.ctaCount === 4), "public landing keeps four CTAs visible");
  must(publicRows.every((row) => row.checks.demoModalOpened === true), "public landing demo CTA opens modal");
  must(publicRows.every((row) => row.checks.validationErrorVisible === true), "public landing blank submit stays in validation only mode");

  const reviewRows = report.routes.filter((row) => row.kind === "reviewQueue");
  must(reviewRows.length === 2, "review queue coverage appears in desktop/mobile pairs");
  const reviewQueueHasActions = reviewRows.every((row) => row.checks.reviewActionVisibleCount === 5);
  const reviewQueueHasEmptyState = reviewRows.every(
    (row) =>
      row.checks.reviewActionVisibleCount === 0 &&
      row.checks.reviewQueueEmptyVisible === true &&
      row.checks.reviewQueueEmptyReasonVisible === true
  );
  must(reviewQueueHasActions || reviewQueueHasEmptyState, "review queue keeps five visible actions or a readable empty-state fallback");
  must(reviewRows.every((row) => row.checks.reviewBoundaryVisible === true), "review queue keeps read-only boundary");
  must(reviewRows.every((row) => row.checks.reviewOnlyPillVisible === true), "review queue keeps review-only pill visible in the visible chrome");

  const commercialRows = report.routes.filter((row) => row.kind === "commercialReadOnly");
  must(commercialRows.length === 2, "commercial core coverage appears in desktop/mobile pairs");
  must(commercialRows.every((row) => row.checks.billingTabVisible === true), "commercial core keeps billing tab visible");
  must(commercialRows.every((row) => row.checks.billingPanelVisible === true), "commercial core billing panel opens");
  must(commercialRows.every((row) => row.checks.readonlyCardVisible === true), "commercial core keeps readonly card boundary");
  must(commercialRows.every((row) => row.checks.readinessPromptVisible === true), "commercial core keeps readiness prompt");

  const companyConvertRows = report.routes.filter((row) => row.kind === "convertToAgreement");
  must(companyConvertRows.length === 2, "company shift conversion coverage appears in desktop/mobile pairs");
  must(companyConvertRows.every((row) => row.checks.previewButtonVisible === true), "company shift keeps preview button visible");
  must(companyConvertRows.every((row) => row.checks.convertButtonVisible === true), "company shift keeps convert button visible");
  must(companyConvertRows.every((row) => row.checks.previewTitleVisible === true), "company shift preview modal opens");
  must(companyConvertRows.every((row) => row.checks.previewMapFrameVisible === true), "company shift preview keeps map frame visible");
  must(companyConvertRows.every((row) => row.checks.previewMiniMapLabelVisible === true), "company shift preview keeps mini map label visible");
  must(companyConvertRows.every((row) => row.checks.previewLeafletHintVisible === true), "company shift preview keeps Leaflet hint visible");

  const companyAgreementRows = report.routes.filter((row) => row.kind === "agreementPreview");
  must(companyAgreementRows.length === 2, "company agreements coverage appears in desktop/mobile pairs");
  must(companyAgreementRows.every((row) => row.checks.detailButtonVisible === true), "company agreements keeps detail button visible");
  must(companyAgreementRows.every((row) => row.checks.previewButtonVisible === false), "company agreements keeps preview button hidden in the current fixture set");
  must(companyAgreementRows.every((row) => row.checks.safeBoundaryVisible === true), "company agreements keeps safe boundary visible");
  must(companyAgreementRows.every((row) => row.checks.detailExpandedVisible === true), "company agreements keeps detail expanded evidence visible");
  must(companyAgreementRows.every((row) => !row.checks.previewTitleVisible), "company agreements preview modal stays closed in the current fixture set");

  const roomShiftRows = report.routes.filter((row) => row.kind === "dispatchApproval");
  must(roomShiftRows.length === 2, "room shift coverage appears in desktop/mobile pairs");
  must(roomShiftRows.every((row) => row.checks.previewButtonVisible === true), "room shifts keeps preview button visible");
  must(roomShiftRows.every((row) => row.checks.pendingEmptyVisible === true), "room shifts keeps pending queue empty boundary visible");
  must(roomShiftRows.every((row) => row.checks.approveButtonVisible === true), "room shifts keeps approve button visible as a disabled placeholder when the pending queue is empty");
  must(roomShiftRows.every((row) => row.checks.rejectButtonVisible === true), "room shifts keeps reject button visible as a disabled placeholder when the pending queue is empty");
  must(roomShiftRows.every((row) => row.checks.previewTitleVisible === true), "room shifts preview modal opens");
  must(roomShiftRows.every((row) => row.checks.previewMapFrameVisible === true), "room shifts preview keeps map frame visible");
  must(roomShiftRows.every((row) => row.checks.previewLeafletHintVisible === true), "room shifts preview keeps Leaflet hint visible");
  must(roomShiftRows.every((row) => row.checks.previewExternalNavVisible === true), "room shifts preview keeps external navigation visible");

  const roomAgreementRows = report.routes.filter((row) => row.kind === "roomAgreementPreview");
  must(roomAgreementRows.length === 2, "room agreements coverage appears in desktop/mobile pairs");
  must(roomAgreementRows.every((row) => row.checks.detailButtonVisible === true), "room agreements keeps detail button visible");
  must(roomAgreementRows.every((row) => row.checks.previewButtonVisible === true), "room agreements keeps preview button visible");
  must(roomAgreementRows.every((row) => row.checks.safeBoundaryVisible === true), "room agreements keeps safe boundary visible");
  must(roomAgreementRows.every((row) => row.checks.previewTitleVisible === true), "room agreements preview modal opens in the current fixture set");
  must(roomAgreementRows.every((row) => row.checks.detailPreviewBoundaryVisible === true), "room agreements keeps detail preview boundary visible");

  const personelRows = report.routes.filter((row) => row.kind === "personelLive");
  must(personelRows.length === 2, "personel live coverage appears in desktop/mobile pairs");
  must(personelRows.every((row) => row.checks.showAllVisible === true), "personel live keeps show-all visible");
  must(personelRows.every((row) => row.checks.navigationButtonVisible === true), "personel live keeps navigation buttons visible");

  const parentRows = report.routes.filter((row) => row.kind === "parentLive");
  must(parentRows.length === 2, "parent live coverage appears in desktop/mobile pairs");
  must(parentRows.every((row) => row.checks.refreshButtonVisible === true), "parent live keeps refresh visible");
  must(parentRows.every((row) => row.checks.locationButtonVisible === true), "parent live keeps location button visible");
  must(parentRows.every((row) => row.checks.requestEntryVisible === true), "parent live keeps boarding change request visible");
  must(parentRows.every((row) => row.checks.requestSubmitVisible === true), "parent live keeps request submit visible");
  must(parentRows.every((row) => row.checks.noVehicleFallbackVisible === true), "parent live keeps no-vehicle fallback visible");
  must(parentRows.every((row) => row.checks.childNavVisible === true), "parent live keeps child navigation visible as a disabled placeholder in fallback mode");
  must(parentRows.every((row) => row.checks.nearestNavVisible === true), "parent live keeps nearest navigation visible as a disabled placeholder in fallback mode");
  must(parentRows.every((row) => row.checks.noShowVisible === true), "parent live keeps no-show button visible as a disabled placeholder in fallback mode");

  console.log("=== PRODUCT-FLOW-BUTTON-AUDIT-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
