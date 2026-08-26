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
      "backend/src/routes/commercialCoreRoomRoutes.js",
      "backend/src/routes/operationProof.js",
      "backend/src/routes/trustQuality.js",
      "backend/src/services/qualityPaymentBridgeService.js",
      ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
      "web/src/copilot/screenRegistry.js",
      "web/src/layout/NavDock.jsx",
      { path: "web/src/api.js", sha256: "0380257F2583AAC4532D119EE16D0182B20FC75B54D8830092C38E45AE2F4893" },
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
      { path: "web/src/lib/markers/vehicleMarkerC.js", sha256: "8C7EA82D00D4E0C9A8D823855629292B894937D60545FBC1C428D0373550B964" },
      { path: "web/src/panels/driver/MapPanel.jsx", sha256: "7F03F8C6DB49518CD06B67DB75AB8AC0419747D0806C3C39548133B06E2AD67E" },
      { path: "web/src/panels/driver/RoutePanel.jsx", sha256: "D0C8902F2E44354C4384E4C0BE80670DF27B6A76589AFF971F283D208C381F10" },
      { path: "web/src/panels/driver/TodayPanel.jsx", sha256: "ACB5EB64D24F958A725D751EBE2F1DDAA2F6818D50605B0849F55CB828E11F02" },
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
      { path: "web/src/utils/gpsSource.js", sha256: "39B5EC94B2FFC9C95F9312DA277A818AA82CE908C410F6200F916DF144C3958F" },
      { path: "web/src/utils/gpsSourceVisibility.js", sha256: "0270F4C469D502D01D54BB045A9901826B036BEFF2486FF11B11CE87A62FBC8C" },
      "web/src/utils/safeDriveSummary.js",
      "web/src/utils/offerQualityRanking.js",
      "web/src/utils/copilotFacts.js",
      "web/src/utils/uiDataCache.js",
      "web/src/panels/superadmin/TrustQualityPanel.jsx",
      "backend/src/routes/companyOverview.js",
      "web/src/panels/shared/FinancialOperationsPanel.jsx",
      { path: "web/src/panels/public/PassengerLivePanel.jsx", sha256: "79E4AEAF56B106F966E923701CD07B85A97C8959A47F477872426B60F91944DF" },
      { path: "web/src/components/PanelFeedbackEntryCard.jsx", sha256: "9A12E8D2AF97F597C5E20A1D0D5C4451D23B94BDE6C5D8F5059FCA9554C185AA" },
      { path: "web/src/components/PaymentPreviewReadonlyCard.jsx", sha256: "DF1B97A17E3AD95AA9C4211979D5ED599A53F9B9B22F8F313C3AAEB4120D4EB7" },
      { path: "web/src/components/ProviderScoreBadge.jsx", sha256: "D6D6040C8F32F2878D58AA4C70C0076668D34DFAB251220E13280A3F7FB0FA29" },
      { path: "web/src/components/ShiftReassignModal.jsx", sha256: "39E7175C89660CAAC5B38E01FF34C92B7BE0A894653B5DC11BFA754EA48EA06A" },
      { path: "web/src/components/TabletOpsQuickBar.jsx", sha256: "75EC308D8EFBDA0968836B65314424E0550C5531BE74994D7F252739F87FDEE7" },
      { path: "web/src/layout/AppShell.jsx", sha256: "0F5FACA46B7B87B1EE02B977C17CE1B215B261CB2AE46A7DB93C9467EBDE7642" },
      { path: "web/src/panels/company/AgreementWizard.jsx", sha256: "C4A8E949F5E6D08BBBD4377E4DAC675E157F93AB5E3F14DADC11996C212B5D69" },
      { path: "web/src/panels/company/CompanyShiftsPanelIntro.jsx", sha256: "01287DBE39ABBC9230B6EB8374349D41754E7DA8665ED720CDCAD9F41B3BDB18" },
      { path: "web/src/panels/company/CompanyShiftsPanelTrackView.jsx", sha256: "2776ADDD4CCD64A5B41C636196BE609569A05D3958CFB7997E79FB6D1860C95B" },
      { path: "web/src/panels/company/companyAgreementsOverviewSection.jsx", sha256: "148A6DF5ADC12C6EA41B80165B9A95E6446F3480B03D6FC5D1C25B89945B4DE9" },
      { path: "web/src/panels/company/companyShiftsPanelMobileCards.jsx", sha256: "60187450BB9784FEF006F578E62FEBC73CF397A4C3B54AC6030C80FD443A62A3" },
      { path: "web/src/panels/company/companyShiftsPanelRows.jsx", sha256: "B07A8F54B897DB829E43F51B63CB6B254122504A8B99D9C400A827371D058431" },
      { path: "web/src/panels/company/companyShiftsPanelSummaryCells.jsx", sha256: "9E9A2CBEC80267BA1C26B1D927F9BD0CD52EB4727F42D66316D95D51EB6D10A2" },
      { path: "web/src/panels/personel/MyRidePanel.jsx", sha256: "32F6236954D5A600FFD56A5D80BF83B61373AB5756CB2516F50D24156E876429" },
      { path: "web/src/panels/room/CheckinPanel.jsx", sha256: "82018D28BD380E16B1A0434A8BF6728FC36BDDC6D43D76FC2640BED3E4354663" },
      { path: "web/src/panels/room/roomAgreementsBridgeSection.jsx", sha256: "E4253C757A7072B1213E44C089B49B47C79EFE05119672D85C01A8FDC3322A5C" },
      { path: "web/src/panels/room/roomAgreementsPanelSections.jsx", sha256: "7D0E6F5D5F9EFC80FCD6F87BC98EB562923714B18F94C1C1DAE72B9A62FCDDB1" },
      { path: "web/src/panels/room/roomOperationsBoard.jsx", sha256: "7E0CBCE7F95BE5C49C9505199F94B04EA5F75211A04C5E4E1E525F959F77C549" },
      { path: "web/src/panels/shared/AgreementRouteChangePreviewCard.jsx", sha256: "B0E4C08F73A539847163509D67528B2136835F76C66A1C2C2F9E81C316979447" },
      { path: "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx", sha256: "29E8187256F8E92A46D0828FF2F483CB8CEDA47492671D92A102AF5DDFC843A6" },
      { path: "web/src/panels/shared/CopilotPanel.jsx", sha256: "E49964BF976DFEAC565ECF080098B86318FD122C79E93F4770455E4D2139D72D" },
      { path: "web/src/panels/superadmin/CompaniesPanel.jsx", sha256: "BC811B33D764D56ACC2C0D22ABA6F725A9E65DE824E2180E7CEF840B6E786FF4" },
      { path: "web/src/panels/company/PersonelAccessPanel.jsx", sha256: "EBB8050CBB35330E2A96F7A9321673220FDB87271FB101F737B0A8879CC8600A" },
      { path: "web/src/panels/company/ServiceEvaluationPanel.jsx", sha256: "BBEA2130687645E8ADE39EC3559F0A9C61E6FAEE8A74E7AEEAB47DBAD641E59C" },
      { path: "web/src/panels/company/ShiftTemplatesPanel.jsx", sha256: "934055EEB7407E6AEA43566302A6FFB9689E445A7771AC1C41F6217689A0673E" },
      { path: "web/src/panels/company/ShiftsPanel.jsx", sha256: "9C37254ACA2907EA15C575BD91D5A020DE27991F0BCC1FC1FA62179165368BF5" },
      { path: "web/src/panels/company/companyAgreementsMobileCards.jsx", sha256: "7C912C134C0E7495D5A4C5970246D310FCE8F64D70F987D8302EC7141D84EA9E" },
      { path: "web/src/panels/company/companyShiftsPanelActions.js", sha256: "BA93A4ADE7F75C6B575A3BCC2B3188CA01166B5746B7F4DCC7CEA9223E34D218" },
      { path: "web/src/panels/company/companyShiftsPanelFilters.jsx", sha256: "2606B60E3524B61287C619D4587CE28E137B4E1FAE0249E5ACCC48FEAC86C9B4" },
      { path: "web/src/panels/company/planBuilderPanelActions.js", sha256: "9897F8A0D0F48AD04E1A188F86E7573B257E3EC3DE44637E92A7E5855F122AB8" },
      { path: "web/src/panels/company/planBuilderPanelSections.jsx", sha256: "B6C0BC2E56DCD8C932F8D7F63BBAE4166E234C13059B7651A8B75D68A380E855" },
      { path: "web/src/panels/company/shiftsPanelOfferUtils.js", sha256: "A4979AD7BD0B3CAFA40D7DF750262CB985B04A589E264967FBF7AEBE41030B88" },
      { path: "web/src/panels/organization/CenterPanel.jsx", sha256: "AA242BEB3D7E8B4CC64EE2685E0014832288E4EDE4EE931D63BDC405C8427DE0" },
      { path: "web/src/panels/public/PublicLandingPage.jsx", sha256: "0C5C4FA0BD3239D86466BCC032FF693C946040B9940C1606D7F361C977FDBBD2" },
      { path: "web/src/panels/room/HubPanel.jsx", sha256: "5D862BDA535D75AB91F788C63D9AD9B0F33DEB93BC288162D62E3F7845BA0C4E" },
      { path: "web/src/panels/room/roomShiftsMainSections.jsx", sha256: "54492ACB7BDA42CBD10122A5891C6D12E44B271C06CF0B9B7ACD45F37D6FB854" },
      { path: "web/src/panels/room/roomShiftsPanelCards.jsx", sha256: "676EBDF58A97169715581AC857EB51DEA3280BE6DD9CE26D1A363F4C3B059BDF" },
      { path: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", sha256: "012306CE28A65467D41605957CE82006374386301FA82594F32626C7A7F24878" },
      { path: "web/src/panels/room/roomShiftsPanelRows.jsx", sha256: "1A5FF81F47851A7EB44AA20E55BEEDE70F5F5275D68CBB4BFDEF8E87CE702549" },
      { path: "web/src/panels/room/roomShiftsPanelUtils.js", sha256: "F75CE13DF998CEF7C100CD315F9C1196674671B289289D3598B88795077F2078" },
      { path: "web/src/panels/driver/CheckinPanel.jsx", sha256: "7737404647D0FCE22198BFA3A143DC185702E98FEC5AAEA00DBFBFA13C357FDB" },
      { path: "web/src/panels/organization/PlansPanel.jsx", sha256: "EF3A8A027E833B6534FCA788F274B96CB2A367688FA059E6F42D0512E40F4D8A" },
      { path: "web/src/panels/organization/organizationPlansShared.jsx", sha256: "4BC15C534A9399FFBB56C31AE256DAA5339D792CCB37A3211519DCE9E19D572C" },
      { path: "web/src/panels/shared/KvkkPanel.jsx", sha256: "DA76C50480A5FE02FD12CDDC34707E2E213831117ED00268AFA31AA2BD60A653" },
      { path: "web/src/panels/shared/NotificationsPanel.jsx", sha256: "99FEA93C853E268B36938E3A16F12E88DCBDAA9D450AF56FDB68870711991BF6" },
      { path: "web/src/panels/shared/PlatformFeePreviewCard.jsx", sha256: "552FCB7B157D01E32E0FF38057097F7D7FD137BF9C11038F107345672DEDC829" },
      { path: "web/src/panels/shared/ReportsPanel.jsx", sha256: "1C887505BA91EDA5310D70A71B3CA50B9952F22D42F08C0318142717740BB9C4" },
      { path: "web/src/panels/shared/TotpStepUpCard.jsx", sha256: "21ACB25DB2AFF07643D401AC5C1E16F9E3E2AC0CF028610D895AC38786F48998" },
      { path: "web/src/panels/shared/boardingChangeUi.js", sha256: "01A06C914530EFE950F9FA0E22BE39A411D69C065C226416E4B73E426FF3D175" },
      { path: "web/src/panels/shared/operationsDigestUtils.js", sha256: "7C5921796E17B9708151EA7954FD9B4438591701962588C9DFE98A9F83383DF8" },
      { path: "web/src/panels/superadmin/AuditLogsPanel.jsx", sha256: "2F839DAB142DAEF2BEC4BDD4E6667F4836CCE6E9A44568AFDC8CE555931634FE" },
      { path: "web/src/panels/superadmin/CommercialCorePanel.jsx", sha256: "3A0392D66E6AF3AAA70DEC456A435B0A78A4828EDB9FF11F1554F1E0FB13E123" },
      { path: "web/src/panels/superadmin/commercialCorePanelShared.jsx", sha256: "9FAE47E7E24DB70A0ADB6F89E41C1BABD8868FDEF9A690CFEAE9D64F8CC9896D" },
      { path: "web/src/utils/agreementCopilotFacts.js", sha256: "8075D1C3974CBA678B825942C0E2521C3DB0B111657191C44A01B6B2F7F9D798" },
      { path: "web/src/utils/agreementPrefill.js", sha256: "E0C991B62E4B2AB6443E81B5DDCBF221704A1AE68C19FB7C0B1DFEFEB0D1E5DC" },
      { path: "web/src/utils/notificationV1.js", sha256: "292F6F0A604F4456C2A4EF6A00079D3DF6B175697D61604B05CE3ABD25876360" },
      { path: "web/src/panels/superadmin/RegionsPanel.jsx", sha256: "3FEA849F097B082E6F57CE5E2F04657738452AA7E8291A3AC83B04161CB1F21B" },
      { path: "web/src/panels/superadmin/RoomsPanel.jsx", sha256: "85A442A7B1E0E82297D3BC91FEB13FF7136466BF930BB7A37BAD590AABA15165" },
      { path: "web/src/utils/copilotPanelHelpers.js", sha256: "454F51E8450AE9A8F08BC166874EE9458D68AC677B9B2E37D96076600105CF97" },
      { path: "web/src/utils/labels.js", sha256: "EBC0D0470AF8484D4AC5139176B09BAC9CA247D30915B7C30FD81D9BCC063282" },
      { path: "web/src/components/PaymentReadinessReadonlyCard.jsx", sha256: "DCFA5652EF4B23A2E4BDA052EB1492FCBD4001DFC5CEF53F43BE9F2063D237EC" },
      { path: "web/src/panels/company/CheckinPanel.jsx", sha256: "EE5AFE21578A32E69AA8748E38A1976329EE98088EDBFA0449625A957B9C9588" },
      { path: "web/src/panels/company/GeoReviewPanel.jsx", sha256: "D283A0EB5722232669AE9D9D63EE77A9A52567751E517ACDB1035C286FBF76F8" },
      { path: "web/src/panels/company/HubPanel.jsx", sha256: "68E237BA03F6DA83A91C49EAE170BEB3D6F398A6882417A17AFAF8376AAE359E" },
      { path: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx", sha256: "1628CAB5AFF5F1DC0FCECA34CBF6C701808FA1289675A99C35343B11FD0D234B" },
      { path: "web/src/components/public/PublicLeadCaptureModal.jsx", sha256: "CDEA6F178FADE481C7493D7120D09A8473941277F7A5A416789D94A9C52C008E" },
      { path: "web/src/panels/superadmin/UsersPanel.jsx", sha256: "903ED1F7B0CA5CA7F20F8823E3ED06EDF5EF271F073DD930B8DEF44FA7538C4B" },
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
