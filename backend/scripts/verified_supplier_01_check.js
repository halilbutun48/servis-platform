#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) fail(`${label}: missing ${needle}`);
    cursor = index + target.length;
  }
  ok(label);
}

function gitDiffNames(paths) {
  const args = ["diff", "--name-only", "--", ...paths];
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCachedNames() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiffExcept(paths, allowedFiles, label) {
  const allowed = new Set(allowedFiles);
  const files = gitDiffNames(paths).filter((file) => !allowed.has(file));
  if (files.length > 0) {
    fail(`${label}: ${files.join(", ")}`);
  }
  ok(label);
}

function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) {
    fail(`${label}: ${hits.join(", ")}`);
  }
  ok(label);
}

function main() {
  console.log("=== VERIFIED-SUPPLIER-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const roadmapCheck = read("backend/scripts/roadmap_lock_ai_marketplace_01_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const finalAuditDoc = read("docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md");
  const inviteDoc = read("docs/INVITE_BASED_MEMBERSHIP_01.md");
  const verifiedDoc = read("docs/VERIFIED_SUPPLIER_01.md");
  const publicLeadService = read("backend/src/services/publicLeadService.js");
  const publicLeadReviewRoute = read("backend/src/routes/publicLeadReview.js");
  const reviewPanel = read("web/src/panels/superadmin/PublicLeadReviewPanel.jsx");
  const statusPalette = read("web/src/utils/statusPalette.js");
  const displayStatus = read("web/src/utils/displayStatus.js");

  const cachedNames = gitCachedNames();

  must(pkg, '"check:verifiedsupplier01": "node backend/scripts/verified_supplier_01_check.js"', "package.json exposes check:verifiedsupplier01");
  must(runner, "check:verifiedsupplier01", "product extensions runner includes verified supplier check");
  must(verifyChain, '"check:verifiedsupplier01": "node backend/scripts/verified_supplier_01_check.js"', "verify chain exposes verified supplier check");
  ordered(runner, [
    "check:onboardingreviewfinalaudit01",
    "check:invitebasedmembership01",
    "check:verifiedsupplier01",
    "check:productflowbuttonaudit01",
  ], "verified supplier sits right after invite-based membership");

  must(guide, "VERIFIED-SUPPLIER-01", "script guide mentions verified supplier milestone");
  must(guide, "check:verifiedsupplier01", "script guide exposes verified supplier check");
  must(guide, "node backend\\scripts\\verified_supplier_01_check.js", "script guide includes verified supplier command");
  must(guide, "docs/VERIFIED_SUPPLIER_01.md", "script guide includes verified supplier doc");
  ordered(guide, [
    "ONBOARDING-REVIEW-01 FINAL AUDIT",
    "INVITE-BASED-MEMBERSHIP-01",
    "VERIFIED-SUPPLIER-01",
    "PRODUCT-FLOW-BUTTON-AUDIT-01",
  ], "milestone guide places verified supplier after invite-based membership");

  must(roadmapCheck, "Verified supplier guard", "roadmap check knows verified supplier guard");
  must(roadmapCheck, "VERIFIED-SUPPLIER-01", "roadmap check knows verified supplier milestone");
  must(roadmapCheck, "docs/VERIFIED_SUPPLIER_01.md", "roadmap check knows verified supplier doc");
  must(roadmapCheck, "public/self-service bir otomasyon olarak açılmaz", "roadmap check keeps public self-service boundary");

  must(harnessCheck, "check:verifiedsupplier01", "script harness check knows verified supplier alias");
  must(harnessCheck, "verified_supplier_01_check.js", "script harness check knows verified supplier file");
  must(harnessCheck, "VERIFIED-SUPPLIER-01", "script harness check knows verified supplier milestone");
  must(harnessDoc, "root:check:verifiedsupplier01", "script harness doc lists verified supplier root check");
  must(harnessDoc, "verified_supplier_01_check.js", "script harness doc lists verified supplier check");
  must(harnessDoc, "docs/VERIFIED_SUPPLIER_01.md", "script harness doc lists verified supplier doc");
  must(harnessDoc, "VERIFIED-SUPPLIER-01", "script harness doc lists verified supplier milestone");

  must(primer, "INVITE-BASED-MEMBERSHIP-01", "primer mentions invite-based membership milestone");
  must(primer, "docs/INVITE_BASED_MEMBERSHIP_01.md", "primer links invite-based membership doc");
  must(primer, "VERIFIED-SUPPLIER-01", "primer mentions verified supplier milestone");
  must(primer, "docs/VERIFIED_SUPPLIER_01.md", "primer links verified supplier doc");

  must(roadmap, "VERIFIED-SUPPLIER-01", "roadmap keeps verified supplier milestone");
  must(roadmap, "Verified supplier guard", "roadmap keeps verified supplier guard section");
  must(roadmap, "docs/VERIFIED_SUPPLIER_01.md", "roadmap links verified supplier doc");
  must(roadmap, "Public/self-service tedarikçi doğrulaması yok", "roadmap keeps public self-service supplier boundary");
  must(roadmap, "public/self-service bir otomasyon olarak açılmaz", "roadmap keeps no auto self-service wording");
  must(roadmap, "Human approval, guard ve audit log zorunludur", "roadmap keeps human approval guard audit wording");

  must(finalAuditDoc, "INVITE-BASED-MEMBERSHIP-01", "final audit doc points to invite-based membership next milestone");
  must(finalAuditDoc, "supplier verification execute açılmaz", "final audit doc keeps supplier verification execute boundary");
  must(finalAuditDoc, "human approval", "final audit doc keeps human approval wording");
  must(finalAuditDoc, "guard", "final audit doc keeps guard wording");
  must(finalAuditDoc, "audit log", "final audit doc keeps audit log wording");

  must(inviteDoc, "VERIFIED-SUPPLIER-01", "invite membership doc points to verified supplier milestone");

  must(verifiedDoc, "# VERIFIED-SUPPLIER-01", "verified supplier doc title present");
  must(verifiedDoc, "Public/self-service doğrulama akışı açılmaz", "verified supplier doc keeps no self-service verification wording");
  must(verifiedDoc, "Public/self-service tedarikçi doğrulaması yok", "verified supplier doc keeps public self-service supplier boundary");
  must(verifiedDoc, "Invite acceptance verified supplier'a otomatik geçmez", "verified supplier doc keeps invite-to-verified boundary");
  must(verifiedDoc, "Tedarikçi seçimi, ödeme ve sözleşme kesinleştirme otomatik değildir", "verified supplier doc keeps no auto selection wording");
  must(verifiedDoc, "Offer ranking, marketplace auto-selection, payment, billing, contract execute, email/SMS/push açılmaz", "verified supplier doc keeps no auto action wording");
  ordered(verifiedDoc, [
    "Ticari unvan / işletme bilgisi",
    "Yetkili kişi / iletişim bilgisi",
    "Araç kapasitesi / araç tipi uygunluğu",
    "Sürücü uygunluğu / belge sinyali",
    "Hizmet bölgesi",
    "KVKK / sözleşme / operasyon taahhüt bilgisi",
    "Geçmiş kalite / kanıt / saha performansı, varsa",
    "Eksik bilgi notu",
    "Review note",
    "Operation note",
    "Human approval log",
  ], "verified supplier checklist order");
  ordered(verifiedDoc, [
    "VERIFICATION_NOT_STARTED",
    "VERIFICATION_IN_REVIEW",
    "VERIFICATION_NEEDS_INFO",
    "VERIFICATION_APPROVED",
    "VERIFICATION_REJECTED",
    "VERIFICATION_REVOKED",
  ], "verified supplier status model order");
  ordered(verifiedDoc, [
    "Public/self-service doğrulama akışı açılmaz",
    "Public/self-service tedarikçi doğrulaması yok",
    "Invite acceptance verified supplier'a otomatik geçmez",
    "Tedarikçi seçimi, ödeme ve sözleşme kesinleştirme otomatik değildir",
    "Offer ranking, marketplace auto-selection, payment, billing, contract execute, email/SMS/push açılmaz",
    "Human approval, guard ve audit log zorunludur",
    "schema değişikliği yok.",
    "Backend route/service/schema genişlemesi yok",
    "no UI feature",
  ], "verified supplier safe boundary order");
  ordered(verifiedDoc, [
    "runtime capability",
    "public marketing page change",
    "auto supplier verification",
    "payment/contract execute",
    "supplier auto-selection",
    "automatic deployment/email/SMS/push",
  ], "verified supplier out-of-scope order");
  must(verifiedDoc, "Human approval, guard ve audit log zorunludur", "verified supplier doc keeps human approval guard audit wording");
  must(verifiedDoc, "schema değişikliği yok.", "verified supplier doc excludes schema change");
  must(verifiedDoc, "Backend route/service/schema genişlemesi yok", "verified supplier doc excludes backend schema expansion");
  must(verifiedDoc, "no UI feature", "verified supplier doc excludes ui feature");
  must(verifiedDoc, "runtime capability", "verified supplier doc excludes runtime capability");
  must(verifiedDoc, "public marketing page change", "verified supplier doc excludes public marketing page change");
  must(verifiedDoc, "auto supplier verification", "verified supplier doc excludes auto supplier verification");
  must(verifiedDoc, "payment/contract execute", "verified supplier doc excludes payment/contract execute");
  must(verifiedDoc, "supplier auto-selection", "verified supplier doc excludes supplier auto-selection");
  must(verifiedDoc, "automatic deployment/email/SMS/push", "verified supplier doc excludes automatic deployment/email/SMS/push");

  must(publicLeadService, "SUPPLIER_APPLICATION", "public lead service keeps supplier application type");
  must(publicLeadService, "supplierInfo", "public lead service keeps supplier info payload");
  must(publicLeadService, "APPROVED_FOR_INVITE", "public lead service keeps invite-ready status");

  must(publicLeadReviewRoute, "superAdminGuard", "public lead review route keeps super admin guard");
  must(publicLeadReviewRoute, 'requireStepUp("SUPER_ADMIN")', "public lead review route keeps step-up guard");
  must(publicLeadReviewRoute, 'requireRole("SUPER_ADMIN")', "public lead review route keeps super admin role guard");
  must(publicLeadReviewRoute, "reviewNote", "public lead review route keeps review note patch");
  must(publicLeadReviewRoute, "operationNote", "public lead review route keeps operation note patch");

  must(reviewPanel, "SUPPLIER_APPLICATION", "review panel keeps supplier application label");
  must(reviewPanel, "APPROVED_FOR_INVITE", "review panel keeps invite-ready status");
  must(reviewPanel, "supplierInfo", "review panel keeps supplier info fields");
  must(reviewPanel, "Davete hazırlık notu", "review panel keeps invite-prep note");
  must(reviewPanel, "Notlar yalnız review amaçlıdır. Bu alanlar invite, ödeme veya sözleşme akışı başlatmaz.", "review panel keeps review-only boundary");

  must(statusPalette, "APPROVED_FOR_INVITE", "status palette supports invite-ready state");
  must(displayStatus, "APPROVED_FOR_INVITE", "display status supports invite-ready state");

  mustNoDiffExcept(
    ["backend/src/routes", "backend/src/services", "backend/src/bootstrap", "backend/src/server.js", "web/src/panels/superadmin", "web/src/panels/company", "web/src/panels/room", "web/src/utils", "backend/prisma", "prisma"],
    [
      "web/src/App.jsx",
      "web/src/copilot/screenRegistry.js",
      "web/src/layout/NavDock.jsx",
      "web/src/panels/superadmin/SuperAdminPanel.jsx",
      "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
      "web/src/panels/superadmin/TelematicsHubPanel.jsx",
      "web/src/panels/superadmin/TrustQualityPanel.jsx",
      "backend/src/bootstrap/routeMounts.js",
      "backend/src/server.js",
      "backend/src/routes/dashboardBulk.js",
      "backend/src/services/dashboardBulk.js",
      "web/src/panels/room/ShiftsPanel.jsx",
      "web/src/panels/room/VehiclesPanel.jsx",
      "web/src/panels/room/DriversPanel.jsx",
      "web/src/panels/room/roomShiftsPanelWorkflow.js",
      "web/src/panels/room/roomShiftsPanelActions.js",
      "web/src/panels/room/roomVehiclesPanelActions.js",
      "web/src/panels/room/roomVehiclesPanelCards.jsx",
      "web/src/panels/room/roomVehiclesPanelRows.jsx",
      "web/src/panels/room/roomVehiclesPanelSections.jsx",
      "web/src/panels/room/useRoomVehicleTelematics.js",
      "web/src/panels/company/MapPanel.jsx",
      "web/src/panels/company/OperationsPanel.jsx",
      "web/src/panels/company/AgreementsPanel.jsx",
      "web/src/panels/company/CommercialFlowPanel.jsx",
      "web/src/panels/company/WorkflowPanel.jsx",
      "web/src/panels/company/GuidedPlanModal.jsx",
      "web/src/panels/company/guidedPlanModalShell.jsx",
      "web/src/panels/company/guidedPlanModalUtils.js",
      "web/src/panels/company/guidedPlanModalActions.js",
      "web/src/panels/company/guidedPlanModalCards.jsx",
      "web/src/panels/company/guidedPlanModalDestinationCards.jsx",
      "web/src/panels/company/guidedPlanModalPeopleStep.jsx",
      "web/src/panels/company/guidedPlanModalPlanCards.jsx",
      "web/src/panels/company/guidedPlanModalSections.jsx",
      "web/src/panels/company/ShiftPeopleTab.jsx",
      "web/src/panels/company/shiftPeopleTabActions.js",
      "web/src/panels/company/shiftPeopleTabSections.jsx",
      "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
      "web/src/panels/company/companyShiftsPanelCards.jsx",
      "web/src/panels/company/companyShiftsPanelSections.jsx",
      "web/src/panels/room/MapPanel.jsx",
      "web/src/panels/room/AgreementsPanel.jsx",
      "web/src/panels/room/CommercialFlowPanel.jsx",
      "web/src/panels/room/OperationHealthPanel.jsx",
      "web/src/panels/room/OffersPanel.jsx",
      "web/src/panels/room/roomShiftsOverviewSection.jsx",
      "web/src/panels/room/roomShiftsPanelSections.jsx",
      "web/src/panels/shared/KvkkConsentGate.jsx",
      "web/src/panels/shared/PanelKvkkHint.jsx",
      "web/src/panels/shared/OfferQualityRankingCard.jsx",
      "web/src/utils/dashboardBulk.js",
      "web/src/utils/safeDriveSummary.js",
      "web/src/utils/etaSanity.js",
      "web/src/utils/offerQualityRanking.js",
      "web/src/utils/copilotFacts.js",
      "web/src/utils/uiDataCache.js",
    ],
    "verified supplier keeps runtime code unchanged"
  );
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== VERIFIED-SUPPLIER-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
