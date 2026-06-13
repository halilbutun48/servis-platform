#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(cond, label) {
  if (!cond) fail(label);
  ok(label);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function mustNotContains(text, needle, label) {
  must(!String(text).includes(needle), label);
}

function ordered(text, needles, label) {
  const source = String(text || "");
  let cursor = 0;
  for (const needle of needles) {
    const idx = source.indexOf(needle, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + needle.length;
  }
  ok(label);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusNames() {
  const out = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.slice(3).replace(/\\/g, "/").trim())
    .filter(Boolean);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function mustNotList(files, needle, label) {
  const normalizedNeedle = String(needle || "").replace(/\\/g, "/");
  if (files.some((file) => file.includes(normalizedNeedle))) fail(label);
  ok(label);
}

function main() {
  console.log("=== UX-BRAND-LOGIN-PREMIUM-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_BRAND_LOGIN_PREMIUM_01.md");
  const app = read("web/src/App.jsx");
  const appShell = read("web/src/layout/AppShell.jsx");
  const navDock = read("web/src/layout/NavDock.jsx");
  const brandMark = read("web/src/components/BrandMark.jsx");
  const brandComponent = read("web/src/components/brand/SeferPaktLogo.jsx");
  const css = read("web/src/index.css");
  const favicon = read("web/public/vardis-favicon.svg");
  const logoSvg = read("web/public/vardis-logo.svg");
  const indexHtml = read("web/index.html");

  must(exists("backend/scripts/ux_brand_login_premium_01_check.js"), "brand/login premium check exists");
  must(exists("docs/UX_BRAND_LOGIN_PREMIUM_01.md"), "brand/login premium doc exists");
  must(exists("web/public/seferpakt-lockup.png"), "lockup asset exists");
  must(exists("web/public/seferpakt-app-icon.png"), "app icon asset exists");
  must(exists("web/public/seferpakt-favicon.png"), "favicon asset exists");

  must(pkg.includes('"check:uxbrandloginpremium01": "node backend/scripts/ux_brand_login_premium_01_check.js"'), "package.json exposes brand/login premium check");
  ordered(
    runner,
    ["check:uxnav01", "check:uxbrandloginpremium01", "check:uxmobilewebshellclarity01"],
    "product extensions runner keeps brand/login premium between nav and mobile shell clarity"
  );
  ordered(
    verify,
    ["check:uxnav01", "check:uxbrandloginpremium01", "check:uxmobilewebshellclarity01"],
    "verify chain keeps brand/login premium between nav and mobile shell clarity"
  );

  mustContains(harnessCheck, "UX-BRAND-LOGIN-PREMIUM-01", "script harness check knows brand/login premium milestone");
  mustContains(harnessCheck, "check:uxbrandloginpremium01", "script harness check knows brand/login premium alias");
  mustContains(harnessCheck, "docs/UX_BRAND_LOGIN_PREMIUM_01.md", "script harness check knows brand/login premium doc");
  mustContains(harnessDoc, "UX-BRAND-LOGIN-PREMIUM-01", "script harness doc lists brand/login premium milestone");
  mustContains(harnessDoc, "check:uxbrandloginpremium01", "script harness doc lists brand/login premium alias");
  mustContains(harnessDoc, "docs/UX_BRAND_LOGIN_PREMIUM_01.md", "script harness doc lists brand/login premium doc");
  mustContains(guide, "UX-BRAND-LOGIN-PREMIUM-01", "milestone guide mentions brand/login premium milestone");
  mustContains(guide, "check:uxbrandloginpremium01", "milestone guide exposes brand/login premium check");
  mustContains(guide, "node backend\\scripts\\ux_brand_login_premium_01_check.js", "milestone guide includes brand/login premium command");
  mustContains(guide, "docs/UX_BRAND_LOGIN_PREMIUM_01.md", "milestone guide includes brand/login premium doc");

  mustContains(doc, "UX-BRAND-LOGIN-PREMIUM-01", "brand/login premium doc title present");
  mustContains(doc, "SeferPaktLogo", "brand/login premium doc mentions SeferPaktLogo");
  mustContains(doc, "authDemoDetails", "brand/login premium doc keeps demo details wording");
  mustContains(doc, "authHeroCard", "brand/login premium doc keeps hero card wording");
  mustContains(doc, "authPanelCard", "brand/login premium doc keeps panel card wording");
  mustContains(doc, "SP + kalkan + iş birliği", "brand/login premium doc keeps logo direction wording");
  mustContains(doc, "sağ yukarı ok", "brand/login premium doc keeps arrow direction wording");
  mustContains(doc, "Demo erişim bilgileri", "brand/login premium doc keeps demo details wording");
  mustContains(doc, "brand component", "brand/login premium doc keeps brand component wording");
  mustContains(doc, "favicon", "brand/login premium doc keeps favicon wording");
  mustContains(doc, "desktop", "brand/login premium doc keeps desktop wording");
  mustContains(doc, "mobile", "brand/login premium doc keeps mobile wording");
  mustContains(doc, "seferpakt-lockup.png", "brand/login premium doc mentions lockup asset");
  mustContains(doc, "seferpakt-app-icon.png", "brand/login premium doc mentions app icon asset");
  mustContains(doc, "seferpakt-favicon.png", "brand/login premium doc mentions favicon asset");
  mustContains(doc, "kırpılmış gerçek asset", "brand/login premium doc keeps cropped asset wording");
  mustContains(doc, "runtime-data", "brand/login premium doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "brand/login premium doc keeps browser-smoke boundary");
  mustContains(doc, "Backend route/service davranışı değiştirilmez", "brand/login premium doc keeps backend boundary wording");
  mustContains(doc, "Prisma", "brand/login premium doc keeps prisma boundary wording");

  mustContains(brandComponent, "seferpakt-lockup.png", "brand component file uses lockup asset");
  mustContains(brandComponent, "seferpakt-app-icon.png", "brand component file uses app icon asset");
  mustContains(brandComponent, "variant === \"mark\"", "brand component file keeps mark variant");
  mustContains(brandComponent, "variant === \"login\"", "brand component file keeps login variant");
  mustContains(brandComponent, "variant === \"compact\"", "brand component file keeps compact variant");
  mustContains(brandComponent, "variant === \"full\"", "brand component file keeps full variant");
  mustNotContains(brandComponent, "ShieldMark", "brand component no longer hand-draws shield mark");
  mustNotContains(brandComponent, "linearGradient", "brand component no longer defines gradients");
  mustNotContains(brandComponent, "strokeWidth=\"11\"", "brand component no longer hand-draws the old arrow/handshake paths");

  mustContains(brandMark, "SeferPaktLogo", "brand mark wrapper uses SeferPaktLogo");
  mustNotContains(brandMark, "/vardis-logo.svg", "brand mark wrapper no longer uses legacy raster wrapper directly");

  mustContains(app, 'variant="login"', "login screen uses login brand variant");
  mustContains(app, "authShell", "login screen keeps auth shell layout");
  mustContains(app, "authHeroCard", "login screen keeps hero card");
  mustContains(app, "authPanelCard", "login screen keeps panel card");
  mustContains(app, "authHighlightsGrid", "login screen keeps hero highlights grid");
  mustContains(app, "authDemoDetails", "login screen keeps collapsible demo details");
  mustContains(app, "Demo erişim bilgileri", "login screen keeps demo summary");
  mustContains(app, "LOGIN_HIGHLIGHTS", "login screen keeps value proposition copy");
  mustContains(app, "SeferPakt", "login screen keeps SeferPakt copy");

  mustContains(appShell, "BrandMark compact", "app shell keeps compact brand block");
  mustContains(appShell, "shellTopBrand", "app shell keeps top brand area");
  mustContains(navDock, "BrandMark compact", "nav dock keeps compact brand block");
  mustContains(navDock, "navDockBrand", "nav dock keeps brand area");

  mustContains(css, ".seferpaktLogo", "index.css defines brand container");
  mustContains(css, ".seferpaktLogoAsset", "index.css defines brand asset class");
  mustContains(css, ".seferpaktLogoSubtitle", "index.css defines brand subtitle class");
  mustContains(css, ".authShell", "index.css defines auth shell");
  mustContains(css, ".authHeroCard", "index.css defines auth hero card");
  mustContains(css, ".authPanelCard", "index.css defines auth panel card");
  mustContains(css, ".authHeroTitle", "index.css defines auth hero title");
  mustContains(css, ".authHighlightsGrid", "index.css defines auth highlights grid");
  mustContains(css, ".authDemoDetails", "index.css defines auth demo details");
  mustContains(css, ".authSubmit", "index.css defines auth submit button");
  mustContains(css, ".authError", "index.css defines auth error block");

  mustContains(favicon, "seferpakt-favicon.png", "favicon wrapper uses cropped favicon asset");
  mustContains(logoSvg, "seferpakt-lockup.png", "logo wrapper uses cropped lockup asset");
  mustContains(indexHtml, "/vardis-favicon.svg", "index html keeps favicon reference");

  const status = statusNames();
  const exactAllowed = new Set([
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "package.json",
    "web/src/App.jsx",
    "web/src/components/BrandMark.jsx",
    "web/src/components/brand/SeferPaktLogo.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/index.css",
    "web/public/vardis-favicon.svg",
    "web/public/vardis-logo.svg",
    "web/public/seferpakt-lockup.png",
    "web/public/seferpakt-app-icon.png",
    "web/public/seferpakt-favicon.png",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/SAFE_DRIVE_01.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "web/src/copilot/screenRegistry.js",
    "web/src/layout/NavDock.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/utils/safeDriveSummary.js",
    "web/src/utils/offerQualityRanking.js",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotRoleTaskMatrix.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  ]);

  allWithin(status, exactAllowed, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "working tree stays within brand/login premium scope");
  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "prisma/", "schema/migration files are untouched");
  mustNotList(status, "backend/prisma/", "backend schema/migration files are untouched");
  mustNotList(status, "debug.log", "debug.log is untouched");
  must(!status.some((file) => file.includes("24152(4).png")), "reference screenshot is not committed");

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"]);
  must(routeDiff.length === 0, "backend route/service/schema diff stays empty");

  console.log("=== UX-BRAND-LOGIN-PREMIUM-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
