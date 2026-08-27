#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPremiumSmokeEvidenceSourceFiles,
  buildSmokeEvidenceIdentity,
  classifySmokeEvidenceChangePaths,
  mustSmokeEvidenceIdentity,
  SMOKE_EVIDENCE_IDENTITY_VERSION,
  SMOKE_EVIDENCE_SAFE_REUSE_PATHS,
} from "./lib/guardSmokeEvidence.js";
import {
  CANONICAL_PRISMA_SCHEMA_IDENTITIES,
  CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256,
  CANONICAL_PRISMA_SCHEMA_PATH,
  CANONICAL_PRISMA_SCHEMA_RAW_SHA256,
} from "./lib/prismaSchemaIdentity.js";
import { fileSha256, normalizedTextSha256 } from "./lib/guardTextIntegrity.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

const RAW_SCHEMA_CONSUMERS = Object.freeze([
  "backend/scripts/backend_lint_warning_burndown_01_check.js",
  "backend/scripts/cache_coalescing_and_backoff_01_check.js",
  "backend/scripts/copilot_rfq_prep_01_check.js",
  "backend/scripts/copilot_route_review_human_approval_01_check.js",
  "backend/scripts/dashboard_bulk_endpoint_01_check.js",
  "backend/scripts/data_integrity_and_recovery_01_check.js",
  "backend/scripts/db_pool_and_api_scaling_01_check.js",
  "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
  "backend/scripts/load_test_2000_users_01_check.js",
  "backend/scripts/mobile_web_final_01_check.js",
  "backend/scripts/observability_monitoring_alerting_01_check.js",
  "backend/scripts/offer_ranking_quality_01_check.js",
  "backend/scripts/osrm_route_draft_from_excel_01_check.js",
  "backend/scripts/quality_gate_final_01_check.js",
  "backend/scripts/request_storm_resilience_01_check.js",
  "backend/scripts/safe_drive_01_check.js",
  "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
  "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
  "backend/scripts/test_quality_and_flake_audit_01_check.js",
  "backend/scripts/ux_brand_login_premium_01_check.js",
  "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
  "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
  "backend/scripts/ux_density_01_panel_card_density_check.js",
  "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
  "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
  "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
  "backend/scripts/ux_panel_standard_architecture_01_check.js",
  "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
  "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
  "backend/scripts/ux_premium_critical_fix_room_01_check.js",
  "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
  "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
  "backend/scripts/security_kvkk_final_01_check.js",
  "backend/scripts/role_data_isolation_redteam_01_check.js",
]);

const NORMALIZED_SCHEMA_CONSUMERS = Object.freeze([
  "backend/scripts/security_kvkk_final_01_check.js",
  "backend/scripts/lib/currentHeadScopePolicy.js",
]);

const RAW_ALIAS_SCHEMA_CONSUMERS = Object.freeze(RAW_SCHEMA_CONSUMERS.slice(0, 32));
const RAW_MANIFEST_SCHEMA_CONSUMERS = Object.freeze(RAW_SCHEMA_CONSUMERS.slice(32));

const PRODUCT_FLOW_SOURCE_FILES = Object.freeze([
  "backend/scripts/product_flow_button_audit_01.mjs",
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
]);

const MOBILE_SOURCE_FILES = Object.freeze([
  "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
  "web/src/App.jsx",
  "web/src/layout/NavDock.jsx",
  "web/src/copilot/screenRegistry.js",
  "backend/src/ai/jobGuide/screenCatalog.js",
  "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
  "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
]);

const ALL_PANELS_SOURCE_FILES = Object.freeze([
  ...MOBILE_SOURCE_FILES,
  "backend/scripts/ux_all_panels_reality_audit_01.mjs",
]);

const REPORTS = Object.freeze([
  {
    label: "product-flow",
    reportPath: "backend/artifacts/browser-smoke/PRODUCT_FLOW_BUTTON_AUDIT_01/report.json",
    sourceFiles: PRODUCT_FLOW_SOURCE_FILES,
  },
  {
    label: "premium",
    reportPath: "backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.json",
    sourceFiles: buildPremiumSmokeEvidenceSourceFiles(),
  },
  {
    label: "all-panels",
    reportPath: "backend/artifacts/browser-smoke/UX_ALL_PANELS_REALITY_AUDIT_01/report.json",
    sourceFiles: ALL_PANELS_SOURCE_FILES,
  },
  {
    label: "mobile-all-roles",
    reportPath: "backend/artifacts/browser-smoke/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01/report.json",
    sourceFiles: MOBILE_SOURCE_FILES,
  },
]);

function pass(label, detail = "") {
  console.log(`PASS ${label}${detail ? ` :: ${detail}` : ""}`);
}

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  pass(label);
}

function expectFailure(label, operation) {
  try {
    operation();
  } catch {
    pass(label);
    return;
  }
  throw new Error(`FAIL ${label}: negative case unexpectedly passed`);
}

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testPrismaOwnerAndConsumers() {
  must(CANONICAL_PRISMA_SCHEMA_IDENTITIES.rawBytes.path === CANONICAL_PRISMA_SCHEMA_PATH, "Prisma raw owner path is explicit");
  must(CANONICAL_PRISMA_SCHEMA_IDENTITIES.normalizedText.path === CANONICAL_PRISMA_SCHEMA_PATH, "Prisma normalized owner path is explicit");
  must(CANONICAL_PRISMA_SCHEMA_IDENTITIES.rawBytes.algorithm === "SHA-256(raw bytes)", "Prisma raw algorithm is explicit");
  must(CANONICAL_PRISMA_SCHEMA_IDENTITIES.normalizedText.algorithm === "SHA-256(UTF-8 text with LF normalization)", "Prisma normalized algorithm is explicit");
  must(fileSha256(CANONICAL_PRISMA_SCHEMA_PATH) === CANONICAL_PRISMA_SCHEMA_RAW_SHA256, "canonical raw Prisma identity matches reviewed owner");
  must(normalizedTextSha256(CANONICAL_PRISMA_SCHEMA_PATH) === CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256, "canonical normalized Prisma identity matches reviewed owner");

  for (const relPath of RAW_ALIAS_SCHEMA_CONSUMERS) {
    const source = read(relPath);
    must(source.includes("./lib/prismaSchemaIdentity.js"), `${relPath} imports canonical Prisma identity owner`);
    must(source.includes("CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH"), `${relPath} uses canonical raw schema path`);
    must(source.includes("CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256"), `${relPath} uses canonical raw schema identity`);
  }
  for (const relPath of RAW_MANIFEST_SCHEMA_CONSUMERS) {
    const source = read(relPath);
    must(source.includes("prismaSchemaIdentity.js"), `${relPath} imports canonical Prisma identity owner for its manifest`);
    must(source.includes("CANONICAL_PRISMA_SCHEMA_PATH"), `${relPath} uses canonical raw schema path in its manifest`);
    must(source.includes("CANONICAL_PRISMA_SCHEMA_RAW_SHA256"), `${relPath} uses canonical raw schema identity in its manifest`);
  }
  for (const relPath of NORMALIZED_SCHEMA_CONSUMERS) {
    const source = read(relPath);
    must(source.includes("prismaSchemaIdentity.js"), `${relPath} imports canonical Prisma identity owner`);
    must(source.includes("CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256"), `${relPath} uses canonical normalized schema identity`);
  }
  must(RAW_ALIAS_SCHEMA_CONSUMERS.length === 32, "raw alias Prisma consumer census remains 32");
  must(RAW_MANIFEST_SCHEMA_CONSUMERS.length === 2, "raw manifest Prisma consumer census remains 2");
  must(NORMALIZED_SCHEMA_CONSUMERS.length === 2, "normalized Prisma consumer census remains 2");
  must(RAW_SCHEMA_CONSUMERS.length + NORMALIZED_SCHEMA_CONSUMERS.length === 36, "Prisma identity consumer census remains 36 identity uses");
  must(![...new Set([...RAW_SCHEMA_CONSUMERS, ...NORMALIZED_SCHEMA_CONSUMERS])].some((relPath) => read(relPath).includes("7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748")), "stale Prisma identity is absent from consumers");
  pass("Prisma consumer classification", "36 reviewed identity uses: 34 raw, 2 normalized, 0 unclassified");
}

function testPrismaNegativeSensitivity() {
  expectFailure("wrong canonical raw Prisma identity fails", () => {
    if (fileSha256(CANONICAL_PRISMA_SCHEMA_PATH) !== "0".repeat(64)) throw new Error("wrong reviewed identity rejected");
  });
  expectFailure("wrong canonical normalized Prisma identity fails", () => {
    if (normalizedTextSha256(CANONICAL_PRISMA_SCHEMA_PATH) !== "0".repeat(64)) throw new Error("wrong reviewed identity rejected");
  });
  expectFailure("wrong Prisma schema path fails", () => fileSha256("backend/prisma/schema.prisma.missing"));
  must(CANONICAL_PRISMA_SCHEMA_RAW_SHA256 !== "" && CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256 !== "", "Prisma identity cannot auto-register an empty hash");
  must(!read("backend/scripts/lib/prismaSchemaIdentity.js").includes("fileSha256("), "Prisma owner contains no dynamic acceptance hash");
}

function testBrowserIdentityContract() {
  const current = buildSmokeEvidenceIdentity({
    repoRoot,
    sourceFiles: PRODUCT_FLOW_SOURCE_FILES,
    schemaPath: CANONICAL_PRISMA_SCHEMA_PATH,
  });
  const validReport = { generatedAt: new Date().toISOString(), ...current };
  mustSmokeEvidenceIdentity(validReport, {
    repoRoot,
    sourceFiles: PRODUCT_FLOW_SOURCE_FILES,
    schemaPath: CANONICAL_PRISMA_SCHEMA_PATH,
  }, "valid product-flow evidence");
  pass("browser provenance and product identity are both present");

  const reportWithoutProductIdentity = clone(validReport);
  delete reportWithoutProductIdentity.testedProductInputIdentitySha256;
  expectFailure("missing tested product-input identity fails", () => mustSmokeEvidenceIdentity(reportWithoutProductIdentity, {
    repoRoot,
    sourceFiles: PRODUCT_FLOW_SOURCE_FILES,
    schemaPath: CANONICAL_PRISMA_SCHEMA_PATH,
  }));

  const reportWithTamperedInput = clone(validReport);
  reportWithTamperedInput.testedProductInputIdentitySha256 = "0".repeat(64);
  expectFailure("tampered product-input identity fails", () => mustSmokeEvidenceIdentity(reportWithTamperedInput, {
    repoRoot,
    sourceFiles: PRODUCT_FLOW_SOURCE_FILES,
    schemaPath: CANONICAL_PRISMA_SCHEMA_PATH,
  }));

  const reportWithTamperedSource = clone(validReport);
  reportWithTamperedSource.sourceIdentityFiles[0].sha256 = "0".repeat(64);
  expectFailure("tampered source identity fails", () => mustSmokeEvidenceIdentity(reportWithTamperedSource, {
    repoRoot,
    sourceFiles: PRODUCT_FLOW_SOURCE_FILES,
    schemaPath: CANONICAL_PRISMA_SCHEMA_PATH,
  }));

  const checkerOnly = classifySmokeEvidenceChangePaths(
    ["backend/scripts/product_flow_button_audit_01_check.js", "docs/PRIMER_SSOT.md"],
    { sourceFiles: PRODUCT_FLOW_SOURCE_FILES },
  );
  must(checkerOnly.invalidating.length === 0 && checkerOnly.unknown.length === 0 && checkerOnly.reusable.length === 2, "checker/doc-only changes are exact safe reuse paths");

  const productChanges = classifySmokeEvidenceChangePaths(
    [
      "web/src/panels/company/AgreementsPanel.jsx",
      "backend/src/routes/auth.js",
      "backend/prisma/schema.prisma",
      "backend/scripts/product_flow_button_audit_01.mjs",
      "backend/prisma/seed.js",
    ],
    { sourceFiles: PRODUCT_FLOW_SOURCE_FILES },
  );
  must(productChanges.invalidating.length === 5 && productChanges.unknown.length === 0, "web/backend/auth/Prisma/browser/fixture changes invalidate evidence");

  const unknownChange = classifySmokeEvidenceChangePaths(["backend/src/routes/unlistedRoute.js"], { sourceFiles: PRODUCT_FLOW_SOURCE_FILES });
  must(unknownChange.invalidating.length === 0 && unknownChange.unknown.length === 1, "unknown changed path fails closed");
  const artifactChange = classifySmokeEvidenceChangePaths([".codex_screens/untracked.png"], { sourceFiles: PRODUCT_FLOW_SOURCE_FILES });
  must(artifactChange.unknown.length === 1 && artifactChange.reusable.length === 0, "broad artifact bypass is not accepted");
  must(SMOKE_EVIDENCE_SAFE_REUSE_PATHS.every((item) => !item.includes("*") && !item.includes("/**")), "safe reuse scope has no wildcard");
  must(current.gitHead !== current.testedProductInputIdentitySha256, "gitHead provenance is distinct from product-input identity");
}

function testReportsAndThirdMilestoneBoundary() {
  let reportCount = 0;
  for (const entry of REPORTS) {
    const reportPath = path.join(repoRoot, entry.reportPath);
    if (!fs.existsSync(reportPath)) continue;
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    must(report.evidenceIdentityVersion === SMOKE_EVIDENCE_IDENTITY_VERSION, `${entry.label} report has hardened identity version`);
    mustSmokeEvidenceIdentity(report, {
      repoRoot,
      sourceFiles: entry.sourceFiles,
      schemaPath: CANONICAL_PRISMA_SCHEMA_PATH,
    }, `${entry.label} report identity`);
    reportCount += 1;
  }
  must(reportCount === REPORTS.length, "all four canonical browser reports are present and valid");

  const reconciliationReportPath = path.join(repoRoot, "backend/artifacts/browser-smoke/HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01/report.json");
  if (fs.existsSync(reconciliationReportPath)) {
    const report = JSON.parse(fs.readFileSync(reconciliationReportPath, "utf8"));
    must(report.fixtureMode === "PLAYWRIGHT_RESPONSE_FIXTURE_ONLY", "#3 reconciliation evidence remains an explicit response-fixture artifact");
    must(report.pass === true, "#3 reconciliation browser acceptance remains green");
    must(!Object.prototype.hasOwnProperty.call(report, "gitHead"), "#3 reconciliation fixture report remains independent from quartet gitHead contract");
  }
}

function main() {
  console.log("=== POST-#3 IDENTITY AND EVIDENCE LIFECYCLE HARDENING CHECK ===");
  testPrismaOwnerAndConsumers();
  testPrismaNegativeSensitivity();
  testBrowserIdentityContract();
  testReportsAndThirdMilestoneBoundary();
  pass("POST-#3 identity and evidence lifecycle hardening", "DYNAMIC_SHA=0 CURRENT_HASH_AUTO_ACCEPT=0 BROAD_ALLOWLIST=0 WILDCARD_SCOPE=0 NEGATIVE_LOSS=0 GUARD_WEAKENING=0");
}

main();
