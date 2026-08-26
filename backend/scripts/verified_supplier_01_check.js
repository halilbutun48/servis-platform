#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, gitCachedNames, mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";
import { mustCurrentHeadCommittedState } from "./lib/guardValidationEnvironment.js";

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
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  const cachedNames = gitCachedNames();

  must(pkg, '"check:verifiedsupplier01": "node backend/scripts/verified_supplier_01_check.js"', "package.json exposes check:verifiedsupplier01");
  assertProductExtensionsIncludes("check:verifiedsupplier01", "product extensions registry includes verified supplier check", registryScripts);
  assertProductExtensionsOrder(
    [
      "check:onboardingreviewfinalaudit01",
      "check:invitebasedmembership01",
      "check:verifiedsupplier01",
      "check:productflowbuttonaudit01",
    ],
    "verified supplier sits right after invite-based membership",
    registryScripts,
  );

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

  mustCurrentHeadCommittedState({ label: "verified supplier current head committed state" });
  mustNoDiffExceptWithIdentity(
    ["backend/src/bootstrap", "backend/src/server.js", "web/src/panels/superadmin", "web/src/panels/company", "web/src/panels/room", "web/src/utils"],
    [
      ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
      "web/src/copilot/screenRegistry.js",
      "web/src/layout/NavDock.jsx",
      "web/src/panels/superadmin/SuperAdminPanel.jsx",
      "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
      "web/src/panels/superadmin/TelematicsHubPanel.jsx",
      "web/src/panels/superadmin/TrustQualityPanel.jsx",
      "backend/src/bootstrap/routeMounts.js",
      { path: "backend/src/bootstrap/rateLimits.js", sha256: "92C93F276B04E5B4A3179E5F93D6396A37FA968000AA2FCEAE1E1F51752E0135" },
      "backend/src/server.js",
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
      { path: "web/src/utils/gpsSource.js", sha256: "39B5EC94B2FFC9C95F9312DA277A818AA82CE908C410F6200F916DF144C3958F" },
      { path: "web/src/utils/gpsSourceVisibility.js", sha256: "0270F4C469D502D01D54BB045A9901826B036BEFF2486FF11B11CE87A62FBC8C" },
      "web/src/utils/safeDriveSummary.js",
      "web/src/utils/etaSanity.js",
      "web/src/utils/offerQualityRanking.js",
      "web/src/utils/copilotFacts.js",
      "web/src/utils/uiDataCache.js",
      { path: "web/src/panels/company/AgreementWizard.jsx", sha256: "C4A8E949F5E6D08BBBD4377E4DAC675E157F93AB5E3F14DADC11996C212B5D69" },
      { path: "web/src/panels/company/CompanyShiftsPanelIntro.jsx", sha256: "01287DBE39ABBC9230B6EB8374349D41754E7DA8665ED720CDCAD9F41B3BDB18" },
      { path: "web/src/panels/company/CompanyShiftsPanelTrackView.jsx", sha256: "2776ADDD4CCD64A5B41C636196BE609569A05D3958CFB7997E79FB6D1860C95B" },
      { path: "web/src/panels/company/companyAgreementsOverviewSection.jsx", sha256: "148A6DF5ADC12C6EA41B80165B9A95E6446F3480B03D6FC5D1C25B89945B4DE9" },
      { path: "web/src/panels/company/companyShiftsPanelMobileCards.jsx", sha256: "60187450BB9784FEF006F578E62FEBC73CF397A4C3B54AC6030C80FD443A62A3" },
      { path: "web/src/panels/company/companyShiftsPanelRows.jsx", sha256: "B07A8F54B897DB829E43F51B63CB6B254122504A8B99D9C400A827371D058431" },
      { path: "web/src/panels/company/companyShiftsPanelSummaryCells.jsx", sha256: "9E9A2CBEC80267BA1C26B1D927F9BD0CD52EB4727F42D66316D95D51EB6D10A2" },
      { path: "web/src/panels/room/CheckinPanel.jsx", sha256: "82018D28BD380E16B1A0434A8BF6728FC36BDDC6D43D76FC2640BED3E4354663" },
      { path: "web/src/panels/room/roomAgreementsBridgeSection.jsx", sha256: "E4253C757A7072B1213E44C089B49B47C79EFE05119672D85C01A8FDC3322A5C" },
      { path: "web/src/panels/room/roomAgreementsPanelSections.jsx", sha256: "7D0E6F5D5F9EFC80FCD6F87BC98EB562923714B18F94C1C1DAE72B9A62FCDDB1" },
      { path: "web/src/panels/room/roomOperationsBoard.jsx", sha256: "7E0CBCE7F95BE5C49C9505199F94B04EA5F75211A04C5E4E1E525F959F77C549" },
      { path: "web/src/panels/superadmin/CompaniesPanel.jsx", sha256: "BC811B33D764D56ACC2C0D22ABA6F725A9E65DE824E2180E7CEF840B6E786FF4" },
      { path: "web/src/panels/superadmin/RegionsPanel.jsx", sha256: "3FEA849F097B082E6F57CE5E2F04657738452AA7E8291A3AC83B04161CB1F21B" },
      { path: "web/src/panels/superadmin/RoomsPanel.jsx", sha256: "85A442A7B1E0E82297D3BC91FEB13FF7136466BF930BB7A37BAD590AABA15165" },
      { path: "web/src/panels/superadmin/UsersPanel.jsx", sha256: "903ED1F7B0CA5CA7F20F8823E3ED06EDF5EF271F073DD930B8DEF44FA7538C4B" },
      { path: "web/src/utils/copilotPanelHelpers.js", sha256: "454F51E8450AE9A8F08BC166874EE9458D68AC677B9B2E37D96076600105CF97" },
      { path: "web/src/utils/labels.js", sha256: "EBC0D0470AF8484D4AC5139176B09BAC9CA247D30915B7C30FD81D9BCC063282" },
      { path: "web/src/panels/company/PersonelAccessPanel.jsx", sha256: "EBB8050CBB35330E2A96F7A9321673220FDB87271FB101F737B0A8879CC8600A" },
      { path: "web/src/panels/company/CheckinPanel.jsx", sha256: "EE5AFE21578A32E69AA8748E38A1976329EE98088EDBFA0449625A957B9C9588" },
      { path: "web/src/panels/company/GeoReviewPanel.jsx", sha256: "D283A0EB5722232669AE9D9D63EE77A9A52567751E517ACDB1035C286FBF76F8" },
      { path: "web/src/panels/company/HubPanel.jsx", sha256: "68E237BA03F6DA83A91C49EAE170BEB3D6F398A6882417A17AFAF8376AAE359E" },
      { path: "web/src/panels/company/ServiceEvaluationPanel.jsx", sha256: "BBEA2130687645E8ADE39EC3559F0A9C61E6FAEE8A74E7AEEAB47DBAD641E59C" },
      { path: "web/src/panels/company/ShiftTemplatesPanel.jsx", sha256: "934055EEB7407E6AEA43566302A6FFB9689E445A7771AC1C41F6217689A0673E" },
      { path: "web/src/panels/company/ShiftsPanel.jsx", sha256: "9C37254ACA2907EA15C575BD91D5A020DE27991F0BCC1FC1FA62179165368BF5" },
      { path: "web/src/panels/company/companyAgreementsMobileCards.jsx", sha256: "7C912C134C0E7495D5A4C5970246D310FCE8F64D70F987D8302EC7141D84EA9E" },
      { path: "web/src/panels/company/companyShiftsPanelActions.js", sha256: "BA93A4ADE7F75C6B575A3BCC2B3188CA01166B5746B7F4DCC7CEA9223E34D218" },
      { path: "web/src/panels/company/companyShiftsPanelFilters.jsx", sha256: "2606B60E3524B61287C619D4587CE28E137B4E1FAE0249E5ACCC48FEAC86C9B4" },
      { path: "web/src/panels/company/planBuilderPanelActions.js", sha256: "9897F8A0D0F48AD04E1A188F86E7573B257E3EC3DE44637E92A7E5855F122AB8" },
      { path: "web/src/panels/company/planBuilderPanelSections.jsx", sha256: "B6C0BC2E56DCD8C932F8D7F63BBAE4166E234C13059B7651A8B75D68A380E855" },
      { path: "web/src/panels/company/shiftsPanelOfferUtils.js", sha256: "A4979AD7BD0B3CAFA40D7DF750262CB985B04A589E264967FBF7AEBE41030B88" },
      { path: "web/src/panels/public/PublicLandingPage.jsx", sha256: "0C5C4FA0BD3239D86466BCC032FF693C946040B9940C1606D7F361C977FDBBD2" },
      { path: "web/src/panels/room/HubPanel.jsx", sha256: "5D862BDA535D75AB91F788C63D9AD9B0F33DEB93BC288162D62E3F7845BA0C4E" },
      { path: "web/src/panels/room/roomShiftsMainSections.jsx", sha256: "54492ACB7BDA42CBD10122A5891C6D12E44B271C06CF0B9B7ACD45F37D6FB854" },
      { path: "web/src/panels/room/roomShiftsPanelCards.jsx", sha256: "676EBDF58A97169715581AC857EB51DEA3280BE6DD9CE26D1A363F4C3B059BDF" },
      { path: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", sha256: "012306CE28A65467D41605957CE82006374386301FA82594F32626C7A7F24878" },
      { path: "web/src/panels/room/roomShiftsPanelRows.jsx", sha256: "1A5FF81F47851A7EB44AA20E55BEEDE70F5F5275D68CBB4BFDEF8E87CE702549" },
      { path: "web/src/panels/room/roomShiftsPanelUtils.js", sha256: "F75CE13DF998CEF7C100CD315F9C1196674671B289289D3598B88795077F2078" },
      { path: "web/src/panels/shared/KvkkPanel.jsx", sha256: "DA76C50480A5FE02FD12CDDC34707E2E213831117ED00268AFA31AA2BD60A653" },
      { path: "web/src/panels/shared/NotificationsPanel.jsx", sha256: "99FEA93C853E268B36938E3A16F12E88DCBDAA9D450AF56FDB68870711991BF6" },
      { path: "web/src/panels/shared/PlatformFeePreviewCard.jsx", sha256: "552FCB7B157D01E32E0FF38057097F7D7FD137BF9C11038F107345672DEDC829" },
      { path: "web/src/panels/shared/ReportsPanel.jsx", sha256: "8CA368F89708E556D6571B65269007BD0D152616B6C7642917A0AFC6E3FBCE3B" },
      { path: "web/src/panels/shared/TotpStepUpCard.jsx", sha256: "21ACB25DB2AFF07643D401AC5C1E16F9E3E2AC0CF028610D895AC38786F48998" },
      { path: "web/src/panels/shared/boardingChangeUi.js", sha256: "138D847346375FB8386898D0E782E8C5C842C740965F402C6BC601D4C6A76EDF" },
      { path: "web/src/panels/shared/operationsDigestUtils.js", sha256: "7C5921796E17B9708151EA7954FD9B4438591701962588C9DFE98A9F83383DF8" },
      { path: "web/src/panels/superadmin/AuditLogsPanel.jsx", sha256: "2F839DAB142DAEF2BEC4BDD4E6667F4836CCE6E9A44568AFDC8CE555931634FE" },
      { path: "web/src/panels/superadmin/CommercialCorePanel.jsx", sha256: "3A0392D66E6AF3AAA70DEC456A435B0A78A4828EDB9FF11F1554F1E0FB13E123" },
      { path: "web/src/panels/superadmin/commercialCorePanelShared.jsx", sha256: "9FAE47E7E24DB70A0ADB6F89E41C1BABD8868FDEF9A690CFEAE9D64F8CC9896D" },
      { path: "web/src/utils/agreementCopilotFacts.js", sha256: "8075D1C3974CBA678B825942C0E2521C3DB0B111657191C44A01B6B2F7F9D798" },
      { path: "web/src/utils/agreementPrefill.js", sha256: "E0C991B62E4B2AB6443E81B5DDCBF221704A1AE68C19FB7C0B1DFEFEB0D1E5DC" },
      { path: "web/src/utils/notificationV1.js", sha256: "292F6F0A604F4456C2A4EF6A00079D3DF6B175697D61604B05CE3ABD25876360" },
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
