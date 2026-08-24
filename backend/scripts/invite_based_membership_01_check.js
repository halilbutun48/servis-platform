#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";

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

function mustNoDiffExcept(paths, allowedFiles, label) {
  const allowed = new Set(allowedFiles);
  const files = gitDiffNames(paths).filter((file) => !allowed.has(file));
  if (files.length > 0) {
    fail(`${label}: ${files.join(", ")}`);
  }
  ok(label);
}

function main() {
  console.log("=== INVITE-BASED-MEMBERSHIP-01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const finalAuditDoc = read("docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md");
  const inviteDoc = read("docs/INVITE_BASED_MEMBERSHIP_01.md");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:invitebasedmembership01": "node backend/scripts/invite_based_membership_01_check.js"', "package.json exposes check:invitebasedmembership01");
  assertProductExtensionsIncludes("check:invitebasedmembership01", "product extensions registry includes invite-based membership check", registryScripts);
  assertProductExtensionsOrder(
    [
      "check:onboardingreviewfinalaudit01",
      "check:invitebasedmembership01",
      "check:verifiedsupplier01",
      "check:productflowbuttonaudit01",
    ],
    "invite-based membership sits right after onboarding review final audit",
    registryScripts,
  );

  must(guide, "INVITE-BASED-MEMBERSHIP-01", "script guide mentions invite-based membership milestone");
  must(guide, "check:invitebasedmembership01", "script guide exposes invite-based membership check");
  must(guide, "node backend\\scripts\\invite_based_membership_01_check.js", "script guide includes invite-based membership command");
  must(guide, "docs/INVITE_BASED_MEMBERSHIP_01.md", "script guide includes invite-based membership doc");
  ordered(guide, [
    "ONBOARDING-REVIEW-01 FINAL AUDIT",
    "INVITE-BASED-MEMBERSHIP-01",
    "PRODUCT-FLOW-BUTTON-AUDIT-01",
  ], "milestone guide places invite-based membership after final audit");

  must(harnessCheck, "check:invitebasedmembership01", "script harness check knows invite-based membership alias");
  must(harnessCheck, "invite_based_membership_01_check.js", "script harness check knows invite-based membership file");
  must(harnessCheck, "INVITE-BASED-MEMBERSHIP-01", "script harness check knows invite-based membership milestone");

  must(harnessDoc, "root:check:invitebasedmembership01", "script harness doc lists invite-based membership root check");
  must(harnessDoc, "invite_based_membership_01_check.js", "script harness doc lists invite-based membership check");
  must(harnessDoc, "INVITE-BASED-MEMBERSHIP-01", "script harness doc lists invite-based membership milestone");

  must(primer, "INVITE-BASED-MEMBERSHIP-01", "primer mentions invite-based membership milestone");
  must(primer, "docs/INVITE_BASED_MEMBERSHIP_01.md", "primer links invite-based membership doc");
  must(primer, "insan onaylı davetli üyelik", "primer keeps invite-based membership summary");

  must(roadmap, "INVITE-BASED-MEMBERSHIP-01", "roadmap keeps invite-based membership milestone");
  must(roadmap, "Invite-based membership guard", "roadmap keeps invite-based membership guard section");
  must(roadmap, "Public lead'ler otomatik olarak kullanıcı hesabına dönüşmez", "roadmap keeps public lead account boundary");
  must(roadmap, "İnsan onayı olmadan kullanıcı oluşturma yok", "roadmap excludes user creation without human approval");
  must(roadmap, "invite draft", "roadmap keeps invite draft wording");
  must(roadmap, "pending invite", "roadmap keeps pending invite wording");
  must(roadmap, "human approval", "roadmap keeps human approval wording for invite membership");
  must(roadmap, "guard", "roadmap keeps guard wording for invite membership");
  must(roadmap, "audit log", "roadmap keeps audit log wording for invite membership");
  must(roadmap, "Self-service signup veya automatic membership açılmaz", "roadmap excludes self-service signup and automatic membership");
  must(roadmap, "Automatic company / room membership açılmaz", "roadmap excludes automatic company and room membership");
  must(roadmap, "Payment, billing, collection, settlement ve contract execute açılmaz", "roadmap excludes payment and contract execute");
  must(roadmap, "Verified supplier veya supplier verification auto akışı açılmaz", "roadmap excludes supplier verification auto");
  must(roadmap, "Email, SMS ve push açılmaz", "roadmap excludes email sms and push");

  must(finalAuditDoc, "INVITE-BASED-MEMBERSHIP-01", "final audit doc points to invite-based membership next milestone");
  must(finalAuditDoc, "public lead otomatik kullanıcı / account olmaz", "final audit doc keeps public lead account boundary");
  must(finalAuditDoc, "invite draft", "final audit doc mentions invite draft boundary");
  must(finalAuditDoc, "pending invite", "final audit doc mentions pending invite boundary");
  must(finalAuditDoc, "human approval", "final audit doc keeps human approval wording");
  must(finalAuditDoc, "guard", "final audit doc keeps guard wording");
  must(finalAuditDoc, "audit log", "final audit doc keeps audit log wording");

  must(inviteDoc, "INVITE-BASED-MEMBERSHIP-01", "invite membership doc title present");
  must(inviteDoc, "insan onaylı davetli üyelik", "invite membership doc describes human-approved invite flow");
  must(inviteDoc, "ONBOARDING-REVIEW-01 FINAL AUDIT", "invite membership doc anchors after onboarding final audit");
  must(inviteDoc, "invite draft", "invite membership doc mentions invite draft");
  must(inviteDoc, "pending invite", "invite membership doc mentions pending invite");
  must(inviteDoc, "public leads do not automatically become users/accounts", "invite membership doc keeps public lead boundary");
  must(inviteDoc, "no self-service signup", "invite membership doc excludes self-service signup");
  must(inviteDoc, "no automatic membership", "invite membership doc excludes automatic membership");
  must(inviteDoc, "no automatic company / room membership", "invite membership doc excludes automatic company/room membership");
  must(inviteDoc, "no user creation without human approval", "invite membership doc requires human approval for user creation");
  must(inviteDoc, "no payment", "invite membership doc excludes payment");
  must(inviteDoc, "no contract execute", "invite membership doc excludes contract execute");
  must(inviteDoc, "no supplier verification auto", "invite membership doc excludes supplier verification auto");
  must(inviteDoc, "no email", "invite membership doc excludes email");
  must(inviteDoc, "no SMS", "invite membership doc excludes SMS");
  must(inviteDoc, "no push", "invite membership doc excludes push");
  must(inviteDoc, "no schema change", "invite membership doc excludes schema change");
  must(inviteDoc, "no runtime feature", "invite membership doc excludes runtime feature");
  must(inviteDoc, "human approval", "invite membership doc keeps human approval wording");
  must(inviteDoc, "guard", "invite membership doc keeps guard wording");
  must(inviteDoc, "audit log", "invite membership doc keeps audit log wording");

  mustNoDiffExceptWithIdentity(
    ["backend/src/routes", "backend/src/services", "prisma", "web/src"],
    [
      "backend/src/routes/companyOverview.js",
      "backend/src/routes/commercialCore.js",
      "backend/src/routes/operationProof.js",
      "backend/src/routes/trustQuality.js",
      "backend/src/services/qualityPaymentBridgeService.js",
      ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
      "web/src/copilot/screenRegistry.js",
      "web/src/layout/NavDock.jsx",
      "backend/src/routes/dashboardBulk.js",
      "backend/src/services/dashboardBulk.js",
      "web/src/panels/superadmin/SuperAdminPanel.jsx",
      "web/src/panels/superadmin/TelematicsHubPanel.jsx",
      "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
      "web/src/panels/room/ShiftsPanel.jsx",
      "web/src/panels/room/roomShiftsOverviewSection.jsx",
      "web/src/panels/room/VehiclesPanel.jsx",
      "web/src/panels/room/DriversPanel.jsx",
      "web/src/panels/room/roomShiftsPanelWorkflow.js",
      "web/src/panels/room/roomShiftsPanelActions.js",
      "web/src/panels/room/roomVehiclesPanelActions.js",
      "web/src/panels/room/roomVehiclesPanelCards.jsx",
      "web/src/panels/room/roomVehiclesPanelRows.jsx",
      "web/src/panels/room/roomVehiclesPanelSections.jsx",
      "web/src/panels/room/useRoomVehicleTelematics.js",
      "web/src/components/RoutePreviewModal.jsx",
      "web/src/components/geo/GeoLocationPicker.jsx",
      "web/src/components/geo/HubMapPicker.jsx",
      "web/src/components/map/MapView.jsx",
      "web/src/components/map/ReadableMiniRouteMap.jsx",
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
      "web/src/components/copilot/FloatingCopilotDrawer.jsx",
      "web/src/components/copilot/uiSurface.js",
      "web/src/utils/planCenterOverlayLayer.js",
      "web/src/utils/etaSanity.js",
      "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
      "web/src/panels/company/companyShiftsPanelCards.jsx",
      "web/src/panels/company/companyShiftsPanelSections.jsx",
      "web/src/panels/driver/MapPanel.jsx",
      "web/src/panels/driver/RoutePanel.jsx",
      "web/src/panels/room/MapPanel.jsx",
      "web/src/panels/room/AgreementsPanel.jsx",
      "web/src/panels/room/CommercialFlowPanel.jsx",
      "web/src/panels/room/OperationHealthPanel.jsx",
      "web/src/panels/room/OffersPanel.jsx",
      "web/src/panels/room/roomShiftsPanelSections.jsx",
      "web/src/panels/shared/KvkkConsentGate.jsx",
      "web/src/panels/shared/PanelKvkkHint.jsx",
      "web/src/panels/parent/LivePanel.jsx",
      "web/src/panels/personel/LivePanel.jsx",
      "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
      "web/src/components/AgreementOpsBridgeCard.jsx",
      "web/src/panels/shared/SafeDriveSummaryCard.jsx",
      "web/src/panels/shared/OfferQualityRankingCard.jsx",
      "web/src/panels/school/OperationsPanel.jsx",
      "web/src/utils/dashboardBulk.js",
      "web/src/utils/safeDriveSummary.js",
      "web/src/utils/offerQualityRanking.js",
      "web/src/utils/copilotFacts.js",
      "web/src/utils/uiDataCache.js",
      "web/src/panels/superadmin/TrustQualityPanel.jsx",
      "backend/src/routes/companyOverview.js",
      "web/src/panels/shared/FinancialOperationsPanel.jsx",
      { path: "backend/src/routes/commercialCore.js", sha256: "14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F" },
      { path: "backend/src/routes/operationProof.js", sha256: "E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0" },
      { path: "backend/src/routes/trustQuality.js", sha256: "FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD" },
      { path: "backend/src/services/qualityPaymentBridgeService.js", sha256: "935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83" },
      { path: "backend/src/routes/admin.js", sha256: "61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4" },
      { path: "backend/src/routes/agreements.js", sha256: "90CED5678F26B47AE69CE985D6D436B70DF8886B523ECA8988E51BE53ECD2B9A" },
      { path: "backend/src/routes/auth.js", sha256: "A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3" },
      { path: "backend/src/routes/offers.js", sha256: "40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649" },
      { path: "backend/src/routes/public.js", sha256: "5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23" },
      { path: "backend/src/routes/shifts/company.js", sha256: "19A7C7C96A86438CDE36345274D8EC8E363C889CABF4C440FE8529DBAA1534A0" },
      { path: "backend/src/services/companyShiftMutationTail.js", sha256: "FE0F1F30AD2F5BC893FF631F26D19EDDDE2060246ED129087104BFDD69D88C78" },
    ],
    "invite-based membership keeps runtime code unchanged"
  );

  console.log("=== INVITE-BASED-MEMBERSHIP-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
