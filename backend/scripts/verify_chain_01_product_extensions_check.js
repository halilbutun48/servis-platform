import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
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
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== VERIFY-CHAIN-01 PRODUCT EXTENSIONS CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const backlog = read('docs/NEXT_BACKLOG_V1.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const companyAgreementsMobileParityDoc = read('docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md');
  const companyAgreementsPanel = read('web/src/panels/company/AgreementsPanel.jsx');
  const companyAgreementsMobileCards = read('web/src/panels/company/companyAgreementsMobileCards.jsx');
  const css = read('web/src/index.css');

  must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json exposes check:product-extensions');
  must(pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', 'package.json exposes check:verifychain01');
  must(pkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', 'package.json keeps verify:final product extension step');
  must(pkg, '"check:web01a"', 'package.json keeps check:web01a');
  must(pkg, '"check:web01b"', 'package.json keeps check:web01b');
  must(pkg, '"check:uxsuperadminoverviewcleanup01"', 'package.json exposes check:uxsuperadminoverviewcleanup01');
  must(pkg, '"check:uxsuperadminpanelclarity01"', 'package.json exposes check:uxsuperadminpanelclarity01');
  must(pkg, '"check:uxsuperadminlivemonitoring01"', 'package.json exposes check:uxsuperadminlivemonitoring01');
  must(pkg, '"check:uxsuperadminauditpanel01"', 'package.json exposes check:uxsuperadminauditpanel01');
  must(pkg, '"check:uxsuperadminqualitypanel01"', 'package.json exposes check:uxsuperadminqualitypanel01');
  must(pkg, '"check:uxsuperadmincommercialflow01"', 'package.json exposes check:uxsuperadmincommercialflow01');
  must(pkg, '"check:uxsuperadminfielddispatchdiscovery01"', 'package.json exposes check:uxsuperadminfielddispatchdiscovery01');
  must(pkg, '"check:uxsuperadminfieldacceptancecenter01"', 'package.json exposes check:uxsuperadminfieldacceptancecenter01');
  must(pkg, '"check:paysafe01"', 'package.json keeps check:paysafe01');
  must(pkg, '"check:pay01e"', 'package.json keeps check:pay01e');
  must(pkg, '"check:qltpaybridge01": "node backend/scripts/qlt_pay_bridge_01_check.js"', 'package.json exposes check:qltpaybridge01');
  must(pkg, '"check:seferscore01": "node backend/scripts/sefer_score_01_check.js"', 'package.json exposes check:seferscore01');
  must(pkg, '"check:roadmaplockaimarketplace01": "node backend/scripts/roadmap_lock_ai_marketplace_01_check.js"', 'package.json exposes check:roadmaplockaimarketplace01');
  must(pkg, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', 'package.json exposes check:publiclanding01');
  must(pkg, '"check:publiclandingplatformfirst01": "node backend/scripts/public_landing_platform_first_01_check.js"', 'package.json exposes check:publiclandingplatformfirst01');
  must(pkg, '"check:publiclandingfinalpromise01": "node backend/scripts/public_landing_final_promise_01_check.js"', 'package.json exposes check:publiclandingfinalpromise01');
  must(pkg, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', 'package.json exposes check:leadcapture01');
  must(pkg, '"check:onboardingreview01": "node backend/scripts/onboarding_review_01_check.js"', 'package.json exposes check:onboardingreview01');
  must(pkg, '"check:onboardingreviewfinalaudit01": "node backend/scripts/onboarding_review_final_audit_01_check.js"', 'package.json exposes check:onboardingreviewfinalaudit01');
  must(pkg, '"check:productflowbuttonaudit01": "node backend/scripts/product_flow_button_audit_01_check.js"', 'package.json exposes check:productflowbuttonaudit01');
  must(pkg, '"check:agreementsourceshiftlineage01": "node backend/scripts/agreement_source_shift_lineage_01_check.js"', 'package.json exposes check:agreementsourceshiftlineage01');
  must(pkg, '"check:marketplacefreetooperate01": "node backend/scripts/marketplace_free_to_operate_01_check.js"', 'package.json exposes check:marketplacefreetooperate01');
  must(pkg, '"smoke:productflowbuttonaudit01": "node backend/scripts/product_flow_button_audit_01.mjs"', 'package.json exposes smoke:productflowbuttonaudit01');
  must(pkg, '"check:cop02a"', 'package.json keeps check:cop02a');
  must(pkg, '"check:docsstate01"', 'package.json keeps check:docsstate01');
  must(pkg, '"check:op04"', 'package.json keeps check:op04');
  must(pkg, '"check:qlt04b"', 'package.json keeps check:qlt04b');
  must(pkg, '"check:cop01e"', 'package.json keeps check:cop01e');
  must(pkg, '"check:uxkvkk01"', 'package.json keeps check:uxkvkk01');
  must(pkg, '"check:cop02b"', 'package.json keeps check:cop02b');
  must(pkg, '"check:cop03a"', 'package.json keeps check:cop03a');
  must(pkg, '"check:cop03afix01"', 'package.json keeps check:cop03afix01');
  must(pkg, '"check:cop03afix02"', 'package.json keeps check:cop03afix02');
  must(pkg, '"check:cop03b"', 'package.json keeps check:cop03b');
  must(pkg, '"check:cop03c"', 'package.json keeps check:cop03c');
  must(pkg, '"check:cop03cfix01"', 'package.json keeps check:cop03cfix01');
  must(pkg, '"check:cop03cfix02"', 'package.json keeps check:cop03cfix02');
  must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
  must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
  must(pkg, '"check:cop03cfix03"', 'package.json keeps check:cop03cfix03');
  must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');
  must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
  must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
  must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
  must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
  must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
  must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
  must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
  must(pkg, '"check:cop04bfix05"', 'package.json keeps check:cop04bfix05');
  must(pkg, '"check:cop04bfix06"', 'package.json keeps check:cop04bfix06');
  must(pkg, '"check:cop04bfix07"', 'package.json keeps check:cop04bfix07');
  must(pkg, '"check:cop04bfix08"', 'package.json keeps check:cop04bfix08');
  must(pkg, '"check:uxcopilotsmartchips01"', 'package.json keeps check:uxcopilotsmartchips01');
  must(pkg, '"check:uxcopilotpersona01"', 'package.json keeps check:uxcopilotpersona01');
  must(pkg, '"check:uxcopilotterminal01"', 'package.json keeps check:uxcopilotterminal01');
  must(pkg, '"check:uxseferabilauncher01"', 'package.json exposes check:uxseferabilauncher01');
  must(pkg, '"check:seferabiterminalhumanize01": "node backend/scripts/sefer_abi_terminal_humanize_01_check.js"', 'package.json exposes check:seferabiterminalhumanize01');
  must(pkg, '"check:copliveaccept01": "node backend/scripts/cop_live_accept_01_check.js"', 'package.json exposes check:copliveaccept01');
  must(pkg, '"check:boardingops01a": "node backend/scripts/boarding_ops_01a_route_impact_preview_check.js"', 'package.json exposes check:boardingops01a');
  must(pkg, '"check:bugrouteimpactpreviewbutton01": "node backend/scripts/bug_route_impact_preview_button_01_check.js"', 'package.json exposes check:bugrouteimpactpreviewbutton01');
  must(pkg, '"check:uxrouteimpactpreviewcompact01": "node backend/scripts/ux_route_impact_preview_compact_01_check.js"', 'package.json exposes check:uxrouteimpactpreviewcompact01');
  must(pkg, '"check:uxcontractconversionopsbridgeclarity01": "node backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js"', 'package.json exposes check:uxcontractconversionopsbridgeclarity01');
  must(pkg, '"check:boardingchangerequestentry01": "node backend/scripts/boarding_change_request_entry_01_check.js"', 'package.json exposes check:boardingchangerequestentry01');
  must(pkg, '"check:shiftdispatchapprovalfix01": "node backend/scripts/shift_dispatch_approval_fix_01_check.js"', 'package.json exposes check:shiftdispatchapprovalfix01');
  must(pkg, '"check:uiactionwiringaudit01": "node backend/scripts/ui_action_wiring_audit_01_check.js"', 'package.json exposes check:uiactionwiringaudit01');
  must(pkg, '"check:boardingops01b": "node backend/scripts/boarding_ops_01b_apply_accepted_change_check.js"', 'package.json exposes check:boardingops01b');
  must(pkg, '"check:boardingops01c": "node backend/scripts/boarding_ops_01c_driver_route_refresh_check.js"', 'package.json exposes check:boardingops01c');
  must(pkg, '"check:routechangefinal01": "node backend/scripts/route_change_final_01_check.js"', 'package.json exposes check:routechangefinal01');
  must(pkg, '"check:dynamicsavings01": "node backend/scripts/dynamic_savings_01_check.js"', 'package.json exposes check:dynamicsavings01');
  must(pkg, '"check:scriptharnessconsolidation01": "node backend/scripts/script_harness_consolidation_01_check.js"', 'package.json exposes check:scriptharnessconsolidation01');
  must(pkg, '"check:authstepupdevtoggle01": "node backend/scripts/auth_stepup_dev_toggle_01_check.js"', 'package.json exposes check:authstepupdevtoggle01');
  must(pkg, '"check:authstepupproviderlocaldefault01": "node backend/scripts/auth_stepup_provider_local_default_01_check.js"', 'package.json exposes check:authstepupproviderlocaldefault01');
  must(pkg, '"check:docsbrandcleanup01": "node backend/scripts/docs_ssot_brand_artifact_cleanup_01_check.js"', 'package.json exposes check:docsbrandcleanup01');
  must(pkg, '"check:etasanity01"', 'package.json keeps check:etasanity01');
  must(pkg, '"check:etaosrm01"', 'package.json keeps check:etaosrm01');
  must(pkg, '"check:etaosrm02"', 'package.json keeps check:etaosrm02');
  must(pkg, '"check:livetrackingfinal01"', 'package.json keeps check:livetrackingfinal01');
  must(pkg, '"check:driverflowfinal01"', 'package.json keeps check:driverflowfinal01');
  must(pkg, '"check:uxcollapsiblepanels01"', 'package.json keeps check:uxcollapsiblepanels01');
  must(pkg, '"check:uxpanelstructure02"', 'package.json keeps check:uxpanelstructure02');
  must(pkg, '"check:uxpanelinventory02a"', 'package.json keeps check:uxpanelinventory02a');
  must(pkg, '"check:uxpanelstructure02b"', 'package.json keeps check:uxpanelstructure02b');
  must(pkg, '"check:uxroomvehiclestelematicsfix"', 'package.json exposes check:uxroomvehiclestelematicsfix');
  must(pkg, '"check:roomvehicledriveruppercase01": "node backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js"', 'package.json exposes check:roomvehicledriveruppercase01');
  must(pkg, '"check:uxroompanelclarity01": "node backend/scripts/ux_room_panel_clarity_01_check.js"', 'package.json exposes check:uxroompanelclarity01');
  must(pkg, '"check:uxroomopspaneltabs01"', 'package.json exposes check:uxroomopspaneltabs01');
  must(pkg, '"check:uxroomopsrelationshippolish01"', 'package.json exposes check:uxroomopsrelationshippolish01');
  must(pkg, '"check:uxroomshiftstabs01"', 'package.json exposes check:uxroomshiftstabs01');
  must(pkg, '"check:uxroomshiftsdensitydedup01": "node backend/scripts/ux_room_shifts_density_dedup_01_check.js"', 'package.json exposes check:uxroomshiftsdensitydedup01');
  must(pkg, '"check:uxpremiumcriticalfixroom01": "node backend/scripts/ux_premium_critical_fix_room_01_check.js"', 'package.json exposes check:uxpremiumcriticalfixroom01');
  must(pkg, '"check:uxpremiumcriticalfixagreementsdetail01": "node backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js"', 'package.json exposes check:uxpremiumcriticalfixagreementsdetail01');
  must(pkg, '"check:uxpremiumcriticaluxfixcleanup01": "node backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js"', 'package.json exposes check:uxpremiumcriticaluxfixcleanup01');
  must(pkg, '"check:uxschoolorganizationpanels01"', 'package.json exposes check:uxschoolorganizationpanels01');
  must(pkg, '"check:uxcompanyshiftstabs01"', 'package.json exposes check:uxcompanyshiftstabs01');
  must(pkg, '"check:uxcompanymobileactionclarity01": "node backend/scripts/ux_company_mobile_action_clarity_01_check.js"', 'package.json exposes check:uxcompanymobileactionclarity01');
  must(pkg, '"check:uxcompanypersonelaccessmobileparity01": "node backend/scripts/ux_company_personel_access_mobile_parity_01_check.js"', 'package.json exposes check:uxcompanypersonelaccessmobileparity01');
  must(pkg, '"check:uxcompanyagreementsmobileparity01": "node backend/scripts/ux_company_agreements_mobile_parity_01_check.js"', 'package.json exposes check:uxcompanyagreementsmobileparity01');
  must(pkg, '"check:uxcompanyopspaneltabs01"', 'package.json exposes check:uxcompanyopspaneltabs01');
  must(pkg, '"check:uxcompanyqualitytabs01"', 'package.json exposes check:uxcompanyqualitytabs01');
  must(pkg, '"check:uxcompanypanelsfinalpolish01"', 'package.json exposes check:uxcompanypanelsfinalpolish01');
  must(pkg, '"check:uxcompanypanelssmoke01"', 'package.json exposes check:uxcompanypanelssmoke01');
  must(pkg, '"check:uxpaneltabsfix01"', 'package.json keeps check:uxpaneltabsfix01');
  must(pkg, '"check:uxlivemaptabsfix01"', 'package.json exposes check:uxlivemaptabsfix01');
  must(pkg, '"check:uxlivemaptabssimplify01"', 'package.json exposes check:uxlivemaptabssimplify01');
  must(pkg, '"check:uxpanelreality02c"', 'package.json keeps check:uxpanelreality02c');
  must(pkg, '"check:uxpanelrealitycleanup02d"', 'package.json exposes check:uxpanelrealitycleanup02d');
  must(pkg, '"check:uxroomagreementstabs01"', 'package.json exposes check:uxroomagreementstabs01');
  must(pkg, '"check:uxpanellayoutwidth02cfix01"', 'package.json exposes check:uxpanellayoutwidth02cfix01');
  must(pkg, '"check:uxpanellayoutwidth02cfix02"', 'package.json exposes check:uxpanellayoutwidth02cfix02');
  must(pkg, '"check:uxpanellayoutwidth02cfix03"', 'package.json exposes check:uxpanellayoutwidth02cfix03');
  must(pkg, '"check:uxnav01"', 'package.json keeps check:uxnav01');
  must(pkg, '"check:uxbrandloginpremium01": "node backend/scripts/ux_brand_login_premium_01_check.js"', 'package.json exposes check:uxbrandloginpremium01');
  must(pkg, '"check:uxmobilewebshellclarity01": "node backend/scripts/ux_mobile_web_shell_clarity_01_check.js"', 'package.json exposes check:uxmobilewebshellclarity01');
  must(pkg, '"check:uxmobileallrolespanelfix01": "node backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js"', 'package.json exposes check:uxmobileallrolespanelfix01');
  must(pkg, '"check:uxroomcompanyshiftsmobilecardfix01": "node backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js"', 'package.json exposes check:uxroomcompanyshiftsmobilecardfix01');
  must(pkg, '"check:uxshiftsresponsivelayoutfix01": "node backend/scripts/ux_shifts_responsive_layout_fix_01_check.js"', 'package.json exposes check:uxshiftsresponsivelayoutfix01');
  must(pkg, '"check:uxmobileoverflowminimapreadability01": "node backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js"', 'package.json exposes check:uxmobileoverflowminimapreadability01');
  must(pkg, '"check:uxmobileoverflowminimappolish02": "node backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js"', 'package.json exposes check:uxmobileoverflowminimappolish02');
  must(pkg, '"check:uxdensity01"', 'package.json keeps check:uxdensity01');
  must(pkg, '"check:uxpanelstandardarchitecture01": "node backend/scripts/ux_panel_standard_architecture_01_check.js"', 'package.json exposes check:uxpanelstandardarchitecture01');
  must(pkg, '"check:finaluxsmoke01": "node backend/scripts/final_ux_smoke_01_check.js"', 'package.json exposes check:finaluxsmoke01');
  must(pkg, '"check:uxlivepanelsmokeaudit01": "node backend/scripts/ux_live_panel_smoke_audit_01_check.js"', 'package.json exposes check:uxlivepanelsmokeaudit01');
  must(pkg, '"check:uxmobileallrolespanelaudit01": "node backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js"', 'package.json exposes check:uxmobileallrolespanelaudit01');
  must(pkg, '"check:uxsmokepassminusevidence01": "node backend/scripts/ux_smoke_pass_minus_evidence_01_check.js"', 'package.json exposes check:uxsmokepassminusevidence01');
  must(pkg, '"smoke:uxlivepanelpremium01": "node backend/scripts/ux_live_panel_premium_smoke_01.mjs"', 'package.json exposes smoke:uxlivepanelpremium01');
  must(pkg, '"smoke:uxmobileallrolespanelaudit01": "node backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs"', 'package.json exposes smoke:uxmobileallrolespanelaudit01');
  must(pkg, '"check:uxlivepanelpremiumsmoke01": "node backend/scripts/ux_live_panel_premium_smoke_01_check.js"', 'package.json exposes check:uxlivepanelpremiumsmoke01');
  must(pkg, '"check:mobilewebfinal01": "node backend/scripts/mobile_web_final_01_check.js"', 'package.json exposes check:mobilewebfinal01');
  must(pkg, '"check:uxparentpersonelliveerrorclarity01": "node backend/scripts/ux_parent_personel_live_error_clarity_01_check.js"', 'package.json exposes check:uxparentpersonelliveerrorclarity01');
  must(pkg, '"check:e2esmoke01"', 'package.json keeps check:e2esmoke01');
  must(pkg, '"check:fieldlaunch01"', 'package.json keeps check:fieldlaunch01');
  must(pkg, '"check:qualitygatefinal01": "node backend/scripts/quality_gate_final_01_check.js"', 'package.json exposes check:qualitygatefinal01');
  must(companyAgreementsPanel, 'CompanyAgreementsMobileCards', 'company agreements panel wires mobile cards');
  must(companyAgreementsPanel, 'desktopShiftTable companyAgreementsDesktopList', 'company agreements panel keeps desktop table wrapper');
  must(companyAgreementsMobileCards, 'CompanyAgreementMobileCard', 'company agreements mobile cards file exports card');
  must(companyAgreementsMobileCards, 'Teklif özeti', 'company agreements mobile cards file keeps offer summary section');
  must(companyAgreementsMobileCards, 'Operasyon / uzatma', 'company agreements mobile cards file keeps operation section');
  must(css, '.companyAgreementsMobileCards', 'global css defines company agreements mobile cards');
  must(css, '.companyAgreementsDesktopList', 'global css defines company agreements desktop list');
  must(css, '.companyAgreementsMobileCard', 'global css defines company agreements mobile card');
  must(companyAgreementsMobileParityDoc, 'UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01', 'company agreements mobile parity doc title present');
  must(companyAgreementsMobileParityDoc, 'Company / Sözleşmeler', 'company agreements mobile parity doc mentions company agreements scope');
  must(companyAgreementsMobileParityDoc, 'Room / Sözleşmeler', 'company agreements mobile parity doc mentions room reference scope');
  must(companyAgreementsMobileParityDoc, 'mobileShiftCards', 'company agreements mobile parity doc mentions mobile cards');
  must(companyAgreementsMobileParityDoc, 'desktopShiftTable', 'company agreements mobile parity doc keeps desktop table wording');
  must(companyAgreementsMobileParityDoc, 'Sefer Abi launcher', 'company agreements mobile parity doc keeps launcher clearance wording');

  ordered(runner, [
    'check:op04',
    'check:qlt04b',
    'check:qltpaybridge01',
    'check:seferscore01',
    'check:roadmaplockaimarketplace01',
    'check:publiclanding01',
    'check:publiclandingplatformfirst01',
    'check:publiclandingfinalpromise01',
    'check:leadcapture01',
    'check:onboardingreview01',
    'check:onboardingreviewfinalaudit01',
    'check:productflowbuttonaudit01',
    'check:agreementsourceshiftlineage01',
    'check:marketplacefreetooperate01',
    'check:pay01e',
    'check:paysafe01',
    'check:web01a',
    'check:web01b',
    'check:uxsuperadminoverviewcleanup01',
    'check:uxsuperadminpanelclarity01',
    'check:uxsuperadminlivemonitoring01',
    'check:uxsuperadminauditpanel01',
    'check:uxsuperadminqualitypanel01',
    'check:uxsuperadmincommercialflow01',
    'check:uxsuperadminfielddispatchdiscovery01',
    'check:uxsuperadminfieldacceptancecenter01',
    'check:cop01e',
    'check:cop02a',
    'check:cop02b',
    'check:cop03a',
    'check:cop03afix01',
    'check:cop03afix02',
    'check:cop03b',
    'check:cop03c',
    'check:cop03cfix01',
    'check:uxkvkk01',
    'check:docsstate01',
  'check:e2esmoke01',
  'check:fieldlaunch01',
  'check:cop03cfix02',
  'check:cop04afix03',
  'check:cop04afix04',
  'check:cop03cfix03',
    'check:cop04a',
    'check:cop04afix02',
    'check:cop04afix01',
    'check:cop04b',
    'check:cop04bfix01',
    'check:cop04bfix02',
    'check:cop04bfix03',
    'check:cop04bfix04',
    'check:cop04bfix05',
    'check:cop04bfix06',
    'check:cop04bfix07',
    'check:cop04bfix08',
    'check:uxcopilotsmartchips01',
    'check:uxcopilotpersona01',
    'check:uxcopilotterminal01',
    'check:uxseferabilauncher01',
    'check:seferabiterminalhumanize01',
    'check:copliveaccept01',
    'check:boardingops01a',
    'check:bugrouteimpactpreviewbutton01',
    'check:uxrouteimpactpreviewcompact01',
    'check:uxcontractconversionopsbridgeclarity01',
    'check:shiftdispatchapprovalfix01',
    'check:boardingchangerequestentry01',
    'check:uiactionwiringaudit01',
    'check:boardingops01b',
    'check:boardingops01c',
    'check:routechangefinal01',
    'check:dynamicsavings01',
    'check:scriptharnessconsolidation01',
    'check:authstepupdevtoggle01',
    'check:authstepupproviderlocaldefault01',
    'check:etasanity01',
    'check:etaosrm01',
    'check:etaosrm02',
    'check:uxcollapsiblepanels01',
    'check:uxpanelstructure02',
    'check:uxpanelinventory02a',
    'check:uxpanelstructure02b',
    'check:uxroomvehiclestelematicsfix',
    'check:roomvehicledriveruppercase01',
    'check:uxroompanelclarity01',
    'check:uxroomopspaneltabs01',
    'check:uxroomopsrelationshippolish01',
    'check:uxroomshiftstabs01',
    'check:uxroomshiftsdensitydedup01',
    'check:uxpremiumcriticalfixroom01',
    'check:uxschoolorganizationpanels01',
    'check:uxcompanyshiftstabs01',
    'check:uxcompanymobileactionclarity01',
    'check:uxcompanypersonelaccessmobileparity01',
    'check:uxpremiumcriticalfixagreementsdetail01',
    'check:uxcompanyagreementsmobileparity01',
    'check:uxcompanyopspaneltabs01',
    'check:uxcompanyqualitytabs01',
    'check:uxcompanypanelssmoke01',
    'check:uxpaneltabsfix01',
    'check:uxlivemaptabsfix01',
    'check:uxlivemaptabssimplify01',
    'check:uxpanelreality02c',
    'check:uxpanelrealitycleanup02d',
    'check:uxpanellayoutwidth02cfix01',
    'check:uxpanellayoutwidth02cfix02',
    'check:uxpanellayoutwidth02cfix03',
    'check:uxnav01',
    'check:uxbrandloginpremium01',
    'check:uxmobilewebshellclarity01',
    'check:uxmobileallrolespanelfix01',
    'check:uxroomcompanyshiftsmobilecardfix01',
    'check:uxshiftsresponsivelayoutfix01',
    'check:uxmobileoverflowminimapreadability01',
    'check:uxmobileoverflowminimappolish02',
    'check:uxdensity01',
    'check:uxpanelstandardarchitecture01',
    'check:finaluxsmoke01',
    'check:uxlivepanelsmokeaudit01',
    'check:uxmobileallrolespanelaudit01',
    'check:uxpremiumcriticaluxfixcleanup01',
    'check:uxsmokepassminusevidence01',
    'check:uxlivepanelpremiumsmoke01',
    'check:mobilewebfinal01',
    'check:uxparentpersonelliveerrorclarity01',
    'check:livetrackingfinal01',
    'check:driverflowfinal01',
    'check:qualitygatefinal01',
], 'product extensions runner order');

  must(guide, 'check:product-extensions', 'script guide exposes check:product-extensions');
  must(guide, 'check:verifychain01', 'script guide exposes check:verifychain01');
  must(guide, 'PUBLIC-LANDING-01', 'script guide mentions public landing milestone');
  must(guide, 'check:publiclanding01', 'script guide exposes public landing check');
  must(guide, 'node backend\\scripts\\public_landing_01_check.js', 'script guide includes public landing command');
  must(guide, 'PUBLIC-LANDING-PLATFORM-FIRST-01', 'script guide mentions public landing platform-first milestone');
  must(guide, 'check:publiclandingplatformfirst01', 'script guide exposes public landing platform-first check');
  must(guide, 'node backend\\scripts\\public_landing_platform_first_01_check.js', 'script guide includes public landing platform-first command');
  must(guide, 'PUBLIC-LANDING-01 FINAL PROMISE CHECK', 'script guide mentions public landing final promise milestone');
  must(guide, 'check:publiclandingfinalpromise01', 'script guide exposes public landing final promise check');
  must(guide, 'node backend\\scripts\\public_landing_final_promise_01_check.js', 'script guide includes public landing final promise command');
  must(guide, 'LEAD-CAPTURE-01', 'script guide mentions lead capture milestone');
  must(guide, 'check:leadcapture01', 'script guide exposes lead capture check');
  must(guide, 'node backend\\scripts\\lead_capture_01_check.js', 'script guide includes lead capture command');
  must(guide, 'ONBOARDING-REVIEW-01', 'script guide mentions onboarding review milestone');
  must(guide, 'check:onboardingreview01', 'script guide exposes onboarding review check');
  must(guide, 'node backend\\scripts\\onboarding_review_01_check.js', 'script guide includes onboarding review command');
  must(guide, 'ONBOARDING-REVIEW-01 FINAL AUDIT', 'script guide mentions onboarding review final audit milestone');
  must(guide, 'check:onboardingreviewfinalaudit01', 'script guide exposes onboarding review final audit check');
  must(guide, 'node backend\\scripts\\onboarding_review_final_audit_01_check.js', 'script guide includes onboarding review final audit command');
  must(guide, 'docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md', 'script guide includes onboarding review final audit doc');
  must(guide, 'PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01 -> ONBOARDING-REVIEW-01 FINAL AUDIT -> PRODUCT-FLOW-BUTTON-AUDIT-01', 'script guide keeps public lead order');
  must(guide, 'PRODUCT-FLOW-BUTTON-AUDIT-01', 'script guide mentions product flow button audit milestone');
  must(guide, 'check:productflowbuttonaudit01', 'script guide exposes product flow button audit check');
  must(guide, 'node backend\\scripts\\product_flow_button_audit_01_check.js', 'script guide includes product flow button audit command');
  must(guide, 'QLT-PAY-BRIDGE-01', 'script guide mentions QLT-PAY-BRIDGE-01');
  must(guide, 'check:qltpaybridge01', 'script guide exposes check:qltpaybridge01');
  must(guide, 'check:seferscore01', 'script guide exposes check:seferscore01');
  must(guide, 'AGREEMENT-SOURCE-SHIFT-LINEAGE-01', 'script guide mentions AGREEMENT-SOURCE-SHIFT-LINEAGE-01');
  must(guide, 'check:agreementsourceshiftlineage01', 'script guide exposes check:agreementsourceshiftlineage01');
  must(guide, 'MARKETPLACE-FREE-TO-OPERATE-01', 'script guide mentions MARKETPLACE-FREE-TO-OPERATE-01');
  must(guide, 'check:marketplacefreetooperate01', 'script guide exposes check:marketplacefreetooperate01');
  must(guide, 'UI-ACTION-WIRING-AUDIT-01', 'script guide mentions UI-ACTION-WIRING-AUDIT-01');
  must(guide, 'BOARDING-CHANGE-REQUEST-ENTRY-01', 'script guide mentions BOARDING-CHANGE-REQUEST-ENTRY-01');
  must(guide, 'check:boardingchangerequestentry01', 'script guide exposes check:boardingchangerequestentry01');
  must(guide, 'check:uiactionwiringaudit01', 'script guide exposes check:uiactionwiringaudit01');
  must(guide, 'AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01', 'script guide mentions AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01');
  must(guide, 'check:authstepupproviderlocaldefault01', 'script guide exposes check:authstepupproviderlocaldefault01');
  must(guide, 'check:cop03a', 'script guide exposes check:cop03a');
  must(guide, 'check:cop03afix01', 'script guide exposes check:cop03afix01');
  must(guide, 'check:cop03afix02', 'script guide exposes check:cop03afix02');
  must(guide, 'check:cop03b', 'script guide exposes check:cop03b');
  must(guide, 'check:cop03c', 'script guide exposes check:cop03c');
  must(guide, 'check:cop03cfix01', 'script guide exposes check:cop03cfix01');
  must(guide, 'check:cop03cfix02', 'script guide exposes check:cop03cfix02');
  must(guide, 'check:cop04afix03', 'script guide exposes check:cop04afix03');
  must(guide, 'check:cop04afix04', 'script guide exposes check:cop04afix04');
  must(guide, 'check:cop03cfix03', 'script guide exposes check:cop03cfix03');
  must(guide, 'check:cop04a', 'script guide exposes check:cop04a');
  must(guide, 'check:cop04afix02', 'script guide exposes check:cop04afix02');
  must(guide, 'check:cop04afix01', 'script guide exposes check:cop04afix01');
  must(guide, 'check:cop04b', 'script guide exposes check:cop04b');
  must(guide, 'check:cop04bfix01', 'script guide exposes check:cop04bfix01');
  must(guide, 'check:cop04bfix02', 'script guide exposes check:cop04bfix02');
  must(guide, 'check:cop04bfix03', 'script guide exposes check:cop04bfix03');
  must(guide, 'check:cop04bfix04', 'script guide exposes check:cop04bfix04');
  must(guide, 'check:cop04bfix05', 'script guide exposes check:cop04bfix05');
  must(guide, 'check:cop04bfix06', 'script guide exposes check:cop04bfix06');
  must(guide, 'check:cop04bfix07', 'script guide exposes check:cop04bfix07');
  must(guide, 'check:cop04bfix08', 'script guide exposes check:cop04bfix08');
  must(guide, 'check:uxcopilotsmartchips01', 'script guide exposes check:uxcopilotsmartchips01');
  must(guide, 'check:uxcopilotpersona01', 'script guide exposes check:uxcopilotpersona01');
  must(guide, 'check:uxcopilotterminal01', 'script guide exposes check:uxcopilotterminal01');
  must(guide, 'UX-SEFER-ABI-LAUNCHER-01', 'script guide mentions UX-SEFER-ABI-LAUNCHER-01');
  must(guide, 'check:uxseferabilauncher01', 'script guide exposes check:uxseferabilauncher01');
  must(guide, 'SEFER-ABI-TERMINAL-HUMANIZE-01', 'script guide mentions SEFER-ABI-TERMINAL-HUMANIZE-01');
  must(guide, 'check:seferabiterminalhumanize01', 'script guide exposes check:seferabiterminalhumanize01');
  must(guide, 'node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js', 'script guide includes Sefer Abi terminal humanize command');
  must(guide, 'COP-LIVE-ACCEPT-01', 'script guide mentions COP-LIVE-ACCEPT-01');
  must(guide, 'check:copliveaccept01', 'script guide exposes check:copliveaccept01');
  must(guide, 'UX-SUPERADMIN-OVERVIEW-CLEANUP-01', 'script guide mentions UX-SUPERADMIN-OVERVIEW-CLEANUP-01');
  must(guide, 'check:uxsuperadminoverviewcleanup01', 'script guide exposes check:uxsuperadminoverviewcleanup01');
  must(guide, 'UX-SUPERADMIN-PANEL-CLARITY-01', 'script guide mentions UX-SUPERADMIN-PANEL-CLARITY-01');
  must(guide, 'check:uxsuperadminpanelclarity01', 'script guide exposes check:uxsuperadminpanelclarity01');
  must(guide, 'node backend\\scripts\\ux_superadmin_panel_clarity_01_check.js', 'script guide includes Super Admin clarity command');
  must(guide, 'UX-SUPERADMIN-LIVE-MONITORING-01', 'script guide mentions UX-SUPERADMIN-LIVE-MONITORING-01');
  must(guide, 'check:uxsuperadminlivemonitoring01', 'script guide exposes check:uxsuperadminlivemonitoring01');
  must(guide, 'UX-SUPERADMIN-AUDIT-PANEL-01', 'script guide mentions UX-SUPERADMIN-AUDIT-PANEL-01');
  must(guide, 'check:uxsuperadminauditpanel01', 'script guide exposes check:uxsuperadminauditpanel01');
  must(guide, 'UX-SUPERADMIN-QUALITY-PANEL-01', 'script guide mentions UX-SUPERADMIN-QUALITY-PANEL-01');
  must(guide, 'check:uxsuperadminqualitypanel01', 'script guide exposes check:uxsuperadminqualitypanel01');
  must(guide, 'UX-SUPERADMIN-COMMERCIAL-FLOW-01', 'script guide mentions UX-SUPERADMIN-COMMERCIAL-FLOW-01');
  must(guide, 'check:uxsuperadmincommercialflow01', 'script guide exposes check:uxsuperadmincommercialflow01');
  must(guide, 'UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01', 'script guide mentions UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01');
  must(guide, 'check:uxsuperadminfielddispatchdiscovery01', 'script guide exposes check:uxsuperadminfielddispatchdiscovery01');
  must(guide, 'UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01', 'script guide mentions UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01');
  must(guide, 'check:uxsuperadminfieldacceptancecenter01', 'script guide exposes check:uxsuperadminfieldacceptancecenter01');
  must(guide, 'check:etasanity01', 'script guide exposes check:etasanity01');
  must(guide, 'check:etaosrm01', 'script guide exposes check:etaosrm01');
  must(guide, 'check:etaosrm02', 'script guide exposes check:etaosrm02');
  must(guide, 'check:livetrackingfinal01', 'script guide exposes check:livetrackingfinal01');
  must(guide, 'check:driverflowfinal01', 'script guide exposes check:driverflowfinal01');
  must(guide, 'check:uxcollapsiblepanels01', 'script guide exposes check:uxcollapsiblepanels01');
  must(guide, 'check:uxpanelstructure02', 'script guide exposes check:uxpanelstructure02');
  must(guide, 'check:uxpanelinventory02a', 'script guide exposes check:uxpanelinventory02a');
  must(guide, 'check:uxpanelstructure02b', 'script guide exposes check:uxpanelstructure02b');
  must(guide, 'check:uxroomvehiclestelematicsfix', 'script guide exposes check:uxroomvehiclestelematicsfix');
  must(guide, 'ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01', 'script guide mentions room uppercase normalization milestone');
  must(guide, 'check:roomvehicledriveruppercase01', 'script guide exposes check:roomvehicledriveruppercase01');
  must(guide, 'node backend\\scripts\\room_vehicle_driver_uppercase_normalization_01_check.js', 'script guide includes room vehicle driver uppercase normalization command');
  must(guide, 'UX-ROOM-PANEL-CLARITY-01', 'script guide mentions UX-ROOM-PANEL-CLARITY-01');
  must(guide, 'check:uxroompanelclarity01', 'script guide exposes check:uxroompanelclarity01');
  must(guide, 'node backend\\scripts\\ux_room_panel_clarity_01_check.js', 'script guide includes room panel clarity command');
  must(guide, 'docs/UX_ROOM_PANEL_CLARITY_01.md', 'script guide includes room panel clarity doc');
  must(guide, 'UX-ROOM-OPS-PANEL-TABS-01', 'script guide mentions UX-ROOM-OPS-PANEL-TABS-01');
  must(guide, 'check:uxroomopspaneltabs01', 'script guide exposes check:uxroomopspaneltabs01');
  must(guide, 'UX-ROOM-OPS-RELATIONSHIP-POLISH-01', 'script guide mentions UX-ROOM-OPS-RELATIONSHIP-POLISH-01');
  must(guide, 'check:uxroomopsrelationshippolish01', 'script guide exposes check:uxroomopsrelationshippolish01');
  must(guide, 'UX-ROOM-SHIFTS-TABS-01', 'script guide mentions UX-ROOM-SHIFTS-TABS-01');
  must(guide, 'check:uxroomshiftstabs01', 'script guide exposes check:uxroomshiftstabs01');
  must(guide, 'UX-ROOM-SHIFTS-DENSITY-DEDUP-01', 'script guide mentions UX-ROOM-SHIFTS-DENSITY-DEDUP-01');
  must(guide, 'check:uxroomshiftsdensitydedup01', 'script guide exposes check:uxroomshiftsdensitydedup01');
  must(guide, 'node backend\\scripts\\ux_room_shifts_density_dedup_01_check.js', 'script guide includes room shifts density dedup command');
  must(guide, 'UX-PREMIUM-CRITICAL-FIX-ROOM-01', 'script guide mentions UX-PREMIUM-CRITICAL-FIX-ROOM-01');
  must(guide, 'check:uxpremiumcriticalfixroom01', 'script guide exposes check:uxpremiumcriticalfixroom01');
  must(guide, 'node backend\\scripts\\ux_premium_critical_fix_room_01_check.js', 'script guide includes room critical fix command');
  must(guide, 'docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md', 'script guide includes room critical fix doc');
  must(guide, 'UX-SCHOOL-ORGANIZATION-PANELS-01', 'script guide mentions UX-SCHOOL-ORGANIZATION-PANELS-01');
  must(guide, 'check:uxschoolorganizationpanels01', 'script guide exposes check:uxschoolorganizationpanels01');
  must(guide, 'UX-COMPANY-SHIFTS-TABS-01', 'script guide mentions UX-COMPANY-SHIFTS-TABS-01');
  must(guide, 'check:uxcompanyshiftstabs01', 'script guide exposes check:uxcompanyshiftstabs01');
  must(guide, 'UX-COMPANY-MOBILE-ACTION-CLARITY-01', 'script guide mentions UX-COMPANY-MOBILE-ACTION-CLARITY-01');
  must(guide, 'check:uxcompanymobileactionclarity01', 'script guide exposes check:uxcompanymobileactionclarity01');
  must(guide, 'node backend\\scripts\\ux_company_mobile_action_clarity_01_check.js', 'script guide includes company mobile action clarity command');
  must(guide, 'UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01', 'script guide mentions UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01');
  must(guide, 'check:uxcompanypersonelaccessmobileparity01', 'script guide exposes check:uxcompanypersonelaccessmobileparity01');
  must(guide, 'node backend\\scripts\\ux_company_personel_access_mobile_parity_01_check.js', 'script guide includes company personel access command');
  must(guide, 'docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md', 'script guide includes company personel access doc');
  must(guide, 'UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01', 'script guide mentions UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01');
  must(guide, 'check:uxcompanyagreementsmobileparity01', 'script guide exposes check:uxcompanyagreementsmobileparity01');
  must(guide, 'node backend\\scripts\\ux_company_agreements_mobile_parity_01_check.js', 'script guide includes company agreements mobile parity command');
  must(guide, 'docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md', 'script guide includes company agreements mobile parity doc');
  must(guide, 'UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01', 'script guide mentions UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01');
  must(guide, 'check:uxroomcompanyshiftsmobilecardfix01', 'script guide exposes check:uxroomcompanyshiftsmobilecardfix01');
  must(guide, 'node backend\\scripts\\ux_room_company_shifts_mobile_card_fix_01_check.js', 'script guide includes room/company shifts mobile card fix command');
  must(guide, 'docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md', 'script guide includes room/company shifts mobile card fix doc');
  must(guide, 'UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01', 'script guide mentions UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01');
  must(guide, 'check:uxshiftsresponsivelayoutfix01', 'script guide exposes check:uxshiftsresponsivelayoutfix01');
  must(guide, 'node backend\\scripts\\ux_shifts_responsive_layout_fix_01_check.js', 'script guide includes shifts responsive layout fix command');
  must(guide, 'docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md', 'script guide includes shifts responsive layout fix doc');
  must(guide, 'UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01', 'script guide mentions UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01');
  must(guide, 'check:uxmobileoverflowminimapreadability01', 'script guide exposes check:uxmobileoverflowminimapreadability01');
  must(guide, 'node backend\\scripts\\ux_mobile_overflow_minimap_readability_01_check.js', 'script guide includes mobile overflow mini-map readability command');
  must(guide, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md', 'script guide includes mobile overflow mini-map readability doc');
  must(guide, 'UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02', 'script guide mentions UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02');
  must(guide, 'check:uxmobileoverflowminimappolish02', 'script guide exposes check:uxmobileoverflowminimappolish02');
  must(guide, 'node backend\\scripts\\ux_mobile_overflow_minimap_polish_02_check.js', 'script guide includes mobile overflow mini-map polish command');
  must(guide, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md', 'script guide includes mobile overflow mini-map polish doc');
  must(guide, 'UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01', 'script guide mentions cleanup milestone');
  must(guide, 'check:uxpremiumcriticaluxfixcleanup01', 'script guide exposes cleanup check');
  must(guide, 'node backend\\scripts\\ux_premium_critical_uxfix_cleanup_01_check.js', 'script guide includes cleanup command');
  must(guide, 'docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md', 'script guide includes cleanup doc');
  must(harnessCheck, 'docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md', 'script harness check knows public landing final promise doc');
  must(harnessCheck, 'check:publiclandingfinalpromise01', 'script harness check knows public landing final promise alias');
  must(harnessCheck, 'PUBLIC-LANDING-01 FINAL PROMISE CHECK', 'script harness check knows public landing final promise milestone');
  must(harnessDoc, 'public_landing_final_promise_01_check.js', 'script harness doc lists public landing final promise check');
  must(harnessDoc, 'docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md', 'script harness doc lists public landing final promise doc');
  must(harnessCheck, 'check:onboardingreviewfinalaudit01', 'script harness check knows onboarding review final audit alias');
  must(harnessCheck, 'docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md', 'script harness check knows onboarding review final audit doc');
  must(harnessCheck, 'ONBOARDING-REVIEW-01 FINAL AUDIT', 'script harness check knows onboarding review final audit milestone');
  must(harnessDoc, 'onboarding_review_final_audit_01_check.js', 'script harness doc lists onboarding review final audit check');
  must(harnessDoc, 'docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md', 'script harness doc lists onboarding review final audit doc');
  must(harnessCheck, 'UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01', 'script harness check knows parent/personel live error clarity milestone');
  must(harnessCheck, 'check:uxparentpersonelliveerrorclarity01', 'script harness check knows parent/personel live error clarity alias');
  must(harnessCheck, 'docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md', 'script harness check knows parent/personel live error clarity doc');
  must(harnessCheck, 'UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01', 'script harness check knows mobile all roles panel audit milestone');
  must(harnessCheck, 'check:uxmobileallrolespanelaudit01', 'script harness check knows mobile all roles panel audit alias');
  must(harnessCheck, 'docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md', 'script harness check knows mobile all roles panel audit doc');
  must(harnessCheck, 'MOBILE-WEB-FINAL-01', 'script harness check knows mobile web final milestone');
  must(harnessCheck, 'check:mobilewebfinal01', 'script harness check knows mobile web final alias');
  must(harnessCheck, 'docs/MOBILE_WEB_FINAL_01.md', 'script harness check knows mobile web final doc');
  must(harnessCheck, 'QUALITY-GATE-FINAL-01', 'script harness check knows quality gate final milestone');
  must(harnessCheck, 'check:qualitygatefinal01', 'script harness check knows quality gate final alias');
  must(harnessCheck, 'docs/QUALITY_GATE_FINAL_01.md', 'script harness check knows quality gate final doc');
  must(harnessCheck, 'UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01', 'script harness check knows cleanup milestone');
  must(harnessCheck, 'check:uxpremiumcriticaluxfixcleanup01', 'script harness check knows cleanup alias');
  must(harnessCheck, 'docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md', 'script harness check knows cleanup doc');
  must(harnessCheck, 'UX-BRAND-LOGIN-PREMIUM-01', 'script harness check knows brand/login premium milestone');
  must(harnessCheck, 'check:uxbrandloginpremium01', 'script harness check knows brand/login premium alias');
  must(harnessCheck, 'docs/UX_BRAND_LOGIN_PREMIUM_01.md', 'script harness check knows brand/login premium doc');
  must(harnessCheck, 'UX-MOBILE-WEB-SHELL-CLARITY-01', 'script harness check knows mobile web shell clarity milestone');
  must(harnessCheck, 'check:uxmobilewebshellclarity01', 'script harness check knows mobile web shell clarity alias');
  must(harnessCheck, 'docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md', 'script harness check knows mobile web shell clarity doc');
  must(harnessCheck, 'UX-MOBILE-ALL-ROLES-PANEL-FIX-01', 'script harness check knows mobile all roles panel fix milestone');
  must(harnessCheck, 'check:uxmobileallrolespanelfix01', 'script harness check knows mobile all roles panel fix alias');
  must(harnessCheck, 'docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md', 'script harness check knows mobile all roles panel fix doc');
  must(harnessCheck, 'UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01', 'script harness check knows room/company shifts mobile card fix milestone');
  must(harnessCheck, 'check:uxroomcompanyshiftsmobilecardfix01', 'script harness check knows room/company shifts mobile card fix alias');
  must(harnessCheck, 'docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md', 'script harness check knows room/company shifts mobile card fix doc');
  must(harnessCheck, 'UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01', 'script harness check knows shifts responsive layout fix milestone');
  must(harnessCheck, 'check:uxshiftsresponsivelayoutfix01', 'script harness check knows shifts responsive layout fix alias');
  must(harnessCheck, 'docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md', 'script harness check knows shifts responsive layout fix doc');
  must(harnessCheck, 'UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01', 'script harness check knows mobile overflow mini-map readability milestone');
  must(harnessCheck, 'check:uxmobileoverflowminimapreadability01', 'script harness check knows mobile overflow mini-map readability alias');
  must(harnessCheck, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md', 'script harness check knows mobile overflow mini-map readability doc');
  must(harnessCheck, 'UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02', 'script harness check knows mobile overflow mini-map polish milestone');
  must(harnessCheck, 'check:uxmobileoverflowminimappolish02', 'script harness check knows mobile overflow mini-map polish alias');
  must(harnessCheck, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md', 'script harness check knows mobile overflow mini-map polish doc');
  must(harnessCheck, 'UX-ROOM-SHIFTS-DENSITY-DEDUP-01', 'script harness check knows room shifts density dedup milestone');
  must(harnessCheck, 'check:uxroomshiftsdensitydedup01', 'script harness check knows room shifts density dedup alias');
  must(harnessCheck, 'docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md', 'script harness check knows room shifts density dedup doc');
  must(harnessDoc, 'UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01', 'script harness doc lists parent/personel live error clarity milestone');
  must(harnessDoc, 'check:uxparentpersonelliveerrorclarity01', 'script harness doc lists parent/personel live error clarity alias');
  must(harnessDoc, 'docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md', 'script harness doc lists parent/personel live error clarity doc');
  must(harnessDoc, 'UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01', 'script harness doc lists mobile all roles panel audit milestone');
  must(harnessDoc, 'check:uxmobileallrolespanelaudit01', 'script harness doc lists mobile all roles panel audit alias');
  must(harnessDoc, 'docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md', 'script harness doc lists mobile all roles panel audit doc');
  must(harnessDoc, 'MOBILE-WEB-FINAL-01', 'script harness doc lists mobile web final milestone');
  must(harnessDoc, 'check:mobilewebfinal01', 'script harness doc lists mobile web final alias');
  must(harnessDoc, 'docs/MOBILE_WEB_FINAL_01.md', 'script harness doc lists mobile web final doc');
  must(harnessDoc, 'QUALITY-GATE-FINAL-01', 'script harness doc lists quality gate final milestone');
  must(harnessDoc, 'check:qualitygatefinal01', 'script harness doc lists quality gate final alias');
  must(harnessDoc, 'docs/QUALITY_GATE_FINAL_01.md', 'script harness doc lists quality gate final doc');
  must(harnessDoc, 'UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01', 'script harness doc lists cleanup milestone');
  must(harnessDoc, 'check:uxpremiumcriticaluxfixcleanup01', 'script harness doc lists cleanup alias');
  must(harnessDoc, 'docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md', 'script harness doc lists cleanup doc');
  must(harnessDoc, 'UX-BRAND-LOGIN-PREMIUM-01', 'script harness doc lists brand/login premium milestone');
  must(harnessDoc, 'check:uxbrandloginpremium01', 'script harness doc lists brand/login premium alias');
  must(harnessDoc, 'docs/UX_BRAND_LOGIN_PREMIUM_01.md', 'script harness doc lists brand/login premium doc');
  must(harnessDoc, 'UX-MOBILE-WEB-SHELL-CLARITY-01', 'script harness doc lists mobile web shell clarity milestone');
  must(harnessDoc, 'check:uxmobilewebshellclarity01', 'script harness doc lists mobile web shell clarity alias');
  must(harnessDoc, 'docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md', 'script harness doc lists mobile web shell clarity doc');
  must(harnessDoc, 'UX-MOBILE-ALL-ROLES-PANEL-FIX-01', 'script harness doc lists mobile all roles panel fix milestone');
  must(harnessDoc, 'check:uxmobileallrolespanelfix01', 'script harness doc lists mobile all roles panel fix alias');
  must(harnessDoc, 'docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md', 'script harness doc lists mobile all roles panel fix doc');
  must(harnessDoc, 'UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01', 'script harness doc lists room/company shifts mobile card fix milestone');
  must(harnessDoc, 'check:uxroomcompanyshiftsmobilecardfix01', 'script harness doc lists room/company shifts mobile card fix alias');
  must(harnessDoc, 'docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md', 'script harness doc lists room/company shifts mobile card fix doc');
  must(harnessDoc, 'UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01', 'script harness doc lists shifts responsive layout fix milestone');
  must(harnessDoc, 'check:uxshiftsresponsivelayoutfix01', 'script harness doc lists shifts responsive layout fix alias');
  must(harnessDoc, 'docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md', 'script harness doc lists shifts responsive layout fix doc');
  must(harnessDoc, 'UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01', 'script harness doc lists mobile overflow mini-map readability milestone');
  must(harnessDoc, 'check:uxmobileoverflowminimapreadability01', 'script harness doc lists mobile overflow mini-map readability alias');
  must(harnessDoc, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md', 'script harness doc lists mobile overflow mini-map readability doc');
  must(harnessDoc, 'UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02', 'script harness doc lists mobile overflow mini-map polish milestone');
  must(harnessDoc, 'check:uxmobileoverflowminimappolish02', 'script harness doc lists mobile overflow mini-map polish alias');
  must(harnessDoc, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md', 'script harness doc lists mobile overflow mini-map polish doc');
  must(harnessDoc, 'UX-ROOM-SHIFTS-DENSITY-DEDUP-01', 'script harness doc lists room shifts density dedup milestone');
  must(harnessDoc, 'check:uxroomshiftsdensitydedup01', 'script harness doc lists room shifts density dedup alias');
  must(harnessDoc, 'docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md', 'script harness doc lists room shifts density dedup doc');
  must(guide, 'UX-COMPANY-OPS-PANEL-TABS-01', 'script guide mentions UX-COMPANY-OPS-PANEL-TABS-01');
  must(guide, 'check:uxcompanyopspaneltabs01', 'script guide exposes check:uxcompanyopspaneltabs01');
  must(guide, 'UX-COMPANY-QUALITY-PANEL-TABS-01', 'script guide mentions UX-COMPANY-QUALITY-PANEL-TABS-01');
  must(guide, 'check:uxcompanyqualitytabs01', 'script guide exposes check:uxcompanyqualitytabs01');
  must(guide, 'UX-COMPANY-PANELS-FINAL-POLISH-01', 'script guide mentions UX-COMPANY-PANELS-FINAL-POLISH-01');
  must(guide, 'check:uxcompanypanelsfinalpolish01', 'script guide exposes check:uxcompanypanelsfinalpolish01');
  must(guide, 'check:uxcompanypanelssmoke01', 'script guide exposes check:uxcompanypanelssmoke01');
  must(guide, 'check:uxpaneltabsfix01', 'script guide exposes check:uxpaneltabsfix01');
  must(guide, 'check:uxlivemaptabsfix01', 'script guide exposes check:uxlivemaptabsfix01');
  must(guide, 'UX-LIVE-MAP-TABS-SIMPLIFY-01', 'script guide mentions UX-LIVE-MAP-TABS-SIMPLIFY-01');
  must(guide, 'check:uxlivemaptabssimplify01', 'script guide exposes check:uxlivemaptabssimplify01');
  must(guide, 'UX-PANEL-REALITY-CLEANUP-02D', 'script guide mentions UX-PANEL-REALITY-CLEANUP-02D');
  must(guide, 'check:uxpanelreality02c', 'script guide exposes check:uxpanelreality02c');
  must(guide, 'check:uxpanelrealitycleanup02d', 'script guide exposes check:uxpanelrealitycleanup02d');
  must(guide, 'check:uxroomagreementstabs01', 'script guide exposes check:uxroomagreementstabs01');
  must(guide, 'check:uxpanellayoutwidth02cfix01', 'script guide exposes check:uxpanellayoutwidth02cfix01');
  must(guide, 'check:uxpanellayoutwidth02cfix02', 'script guide exposes check:uxpanellayoutwidth02cfix02');
  must(guide, 'check:uxpanellayoutwidth02cfix03', 'script guide exposes check:uxpanellayoutwidth02cfix03');
  must(guide, 'check:uxnav01', 'script guide exposes check:uxnav01');
  must(guide, 'UX-BRAND-LOGIN-PREMIUM-01', 'script guide mentions brand/login premium milestone');
  must(guide, 'check:uxbrandloginpremium01', 'script guide exposes brand/login premium check');
  must(guide, 'node backend\\scripts\\ux_brand_login_premium_01_check.js', 'script guide includes brand/login premium command');
  must(guide, 'docs/UX_BRAND_LOGIN_PREMIUM_01.md', 'script guide includes brand/login premium doc');
  must(guide, 'UX-MOBILE-WEB-SHELL-CLARITY-01', 'script guide mentions mobile web shell clarity milestone');
  must(guide, 'check:uxmobilewebshellclarity01', 'script guide exposes check:uxmobilewebshellclarity01');
  must(guide, 'node backend\\scripts\\ux_mobile_web_shell_clarity_01_check.js', 'script guide includes mobile web shell clarity command');
  must(guide, 'docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md', 'script guide includes mobile web shell clarity doc');
  must(guide, 'UX-MOBILE-ALL-ROLES-PANEL-FIX-01', 'script guide mentions mobile all roles panel fix milestone');
  must(guide, 'check:uxmobileallrolespanelfix01', 'script guide exposes check:uxmobileallrolespanelfix01');
  must(guide, 'node backend\\scripts\\ux_mobile_all_roles_panel_fix_01_check.js', 'script guide includes mobile all roles panel fix command');
  must(guide, 'docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md', 'script guide includes mobile all roles panel fix doc');
  must(guide, 'UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01', 'script guide mentions room/company shifts mobile card fix milestone');
  must(guide, 'check:uxroomcompanyshiftsmobilecardfix01', 'script guide exposes check:uxroomcompanyshiftsmobilecardfix01');
  must(guide, 'node backend\\scripts\\ux_room_company_shifts_mobile_card_fix_01_check.js', 'script guide includes room/company shifts mobile card fix command');
  must(guide, 'docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md', 'script guide includes room/company shifts mobile card fix doc');
  must(guide, 'UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01', 'script guide mentions mobile overflow mini-map readability milestone');
  must(guide, 'check:uxmobileoverflowminimapreadability01', 'script guide exposes check:uxmobileoverflowminimapreadability01');
  must(guide, 'node backend\\scripts\\ux_mobile_overflow_minimap_readability_01_check.js', 'script guide includes mobile overflow mini-map readability command');
  must(guide, 'docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md', 'script guide includes mobile overflow mini-map readability doc');
  must(guide, 'check:uxdensity01', 'script guide exposes check:uxdensity01');
  must(guide, 'FINAL-UX-SMOKE-01', 'script guide mentions FINAL-UX-SMOKE-01');
  must(guide, 'check:finaluxsmoke01', 'script guide exposes check:finaluxsmoke01');
  must(guide, 'UX-LIVE-PANEL-COVERAGE-MATRIX-01', 'script guide mentions UX-LIVE-PANEL-COVERAGE-MATRIX-01');
  must(guide, 'check:uxlivepanelsmokeaudit01', 'script guide exposes check:uxlivepanelsmokeaudit01');
  must(guide, 'node backend\\scripts\\ux_live_panel_smoke_audit_01_check.js', 'script guide includes live panel smoke audit command');
  must(guide, 'UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01', 'script guide mentions UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01');
  must(guide, 'check:uxmobileallrolespanelaudit01', 'script guide exposes check:uxmobileallrolespanelaudit01');
  must(guide, 'node backend\\scripts\\ux_mobile_all_roles_panel_audit_01.mjs', 'script guide includes mobile all roles panel audit command');
  must(guide, 'UX-SMOKE-PASS-MINUS-EVIDENCE-01', 'script guide mentions UX-SMOKE-PASS-MINUS-EVIDENCE-01');
  must(guide, 'check:uxsmokepassminusevidence01', 'script guide exposes check:uxsmokepassminusevidence01');
  must(guide, 'node backend\\scripts\\ux_smoke_pass_minus_evidence_01_check.js', 'script guide includes PASS-minus evidence command');
  must(guide, 'docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md', 'script guide includes PASS-minus evidence doc');
  must(guide, 'UX-LIVE-PANEL-PREMIUM-SMOKE-01', 'script guide mentions UX-LIVE-PANEL-PREMIUM-SMOKE-01');
  must(guide, 'check:uxlivepanelpremiumsmoke01', 'script guide exposes check:uxlivepanelpremiumsmoke01');
  must(guide, 'node backend\\scripts\\ux_live_panel_premium_smoke_01.mjs', 'script guide includes premium smoke command');
  must(guide, 'MOBILE-WEB-FINAL-01', 'script guide mentions MOBILE-WEB-FINAL-01');
  must(guide, 'check:mobilewebfinal01', 'script guide exposes check:mobilewebfinal01');
  must(guide, 'node backend\\scripts\\mobile_web_final_01_check.js', 'script guide includes mobile web final command');
  must(guide, 'docs/MOBILE_WEB_FINAL_01.md', 'script guide includes mobile web final doc');
  must(guide, 'QUALITY-GATE-FINAL-01', 'script guide mentions QUALITY-GATE-FINAL-01');
  must(guide, 'check:qualitygatefinal01', 'script guide exposes check:qualitygatefinal01');
  must(guide, 'node backend\\scripts\\quality_gate_final_01_check.js', 'script guide includes quality gate final command');
  must(guide, 'docs/QUALITY_GATE_FINAL_01.md', 'script guide includes quality gate final doc');
  must(guide, 'UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01', 'script guide mentions UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01');
  must(guide, 'check:uxparentpersonelliveerrorclarity01', 'script guide exposes check:uxparentpersonelliveerrorclarity01');
  must(guide, 'node backend\\scripts\\ux_parent_personel_live_error_clarity_01_check.js', 'script guide includes parent/personel live error clarity command');
  must(guide, 'docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md', 'script guide includes parent/personel live error clarity doc');
  must(guide, 'BOARDING-OPS-01A', 'script guide mentions BOARDING-OPS-01A');
  must(guide, 'check:boardingops01a', 'script guide exposes check:boardingops01a');
  must(guide, 'BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01', 'script guide mentions BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01');
  must(guide, 'check:bugrouteimpactpreviewbutton01', 'script guide exposes check:bugrouteimpactpreviewbutton01');
  must(guide, 'UX-ROUTE-IMPACT-PREVIEW-COMPACT-01', 'script guide mentions UX-ROUTE-IMPACT-PREVIEW-COMPACT-01');
  must(guide, 'check:uxrouteimpactpreviewcompact01', 'script guide exposes check:uxrouteimpactpreviewcompact01');
  must(guide, 'node backend\\scripts\\ux_route_impact_preview_compact_01_check.js', 'script guide includes compact preview check command');
  must(guide, 'BOARDING-OPS-01B', 'script guide mentions BOARDING-OPS-01B');
  must(guide, 'check:boardingops01b', 'script guide exposes check:boardingops01b');
  must(guide, 'BOARDING-OPS-01C', 'script guide mentions BOARDING-OPS-01C');
  must(guide, 'check:boardingops01c', 'script guide exposes check:boardingops01c');
  must(guide, 'ROUTE-CHANGE-FINAL-01', 'script guide mentions ROUTE-CHANGE-FINAL-01');
  must(guide, 'check:routechangefinal01', 'script guide exposes check:routechangefinal01');
  must(guide, 'DYNAMIC-SAVINGS-01', 'script guide mentions DYNAMIC-SAVINGS-01');
  must(guide, 'check:dynamicsavings01', 'script guide exposes check:dynamicsavings01');
  must(guide, 'SCRIPT-HARNESS-CONSOLIDATION-01', 'script guide mentions SCRIPT-HARNESS-CONSOLIDATION-01');
  must(guide, 'check:scriptharnessconsolidation01', 'script guide exposes check:scriptharnessconsolidation01');
  must(guide, 'DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01', 'script guide mentions DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01');
  must(guide, 'check:docsbrandcleanup01', 'script guide exposes check:docsbrandcleanup01');
  must(guide, 'UX-COPILOT-TERMINAL-01', 'script guide mentions UX-COPILOT-TERMINAL-01');
  must(guide, 'UX-COPILOT-PERSONA-01', 'script guide mentions UX-COPILOT-PERSONA-01');
  must(guide, 'ETA-SANITY-01', 'script guide mentions ETA-SANITY-01');
  must(guide, 'ETA-OSRM-01', 'script guide mentions ETA-OSRM-01');
  must(guide, 'ETA-OSRM-02', 'script guide mentions ETA-OSRM-02');
  must(guide, 'LIVE-TRACKING-FINAL-01', 'script guide mentions LIVE-TRACKING-FINAL-01');
  must(guide, 'DRIVER-FLOW-FINAL-01', 'script guide mentions DRIVER-FLOW-FINAL-01');
  must(guide, 'UX-COLLAPSIBLE-PANELS-01', 'script guide mentions UX-COLLAPSIBLE-PANELS-01');
  must(guide, 'UX-PANEL-STRUCTURE-02', 'script guide mentions UX-PANEL-STRUCTURE-02');
  must(guide, 'UX-PANEL-INVENTORY-02A', 'script guide mentions UX-PANEL-INVENTORY-02A');
  must(guide, 'UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01', 'script guide mentions UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01');
  must(guide, 'UX-NAV-01', 'script guide mentions UX-NAV-01');
  must(guide, 'UX-DENSITY-01', 'script guide mentions UX-DENSITY-01');
  must(guide, 'check:e2esmoke01', 'script guide exposes check:e2esmoke01');
  must(guide, 'check:fieldlaunch01', 'script guide exposes check:fieldlaunch01');
  must(guide, 'VERIFY-CHAIN-01', 'script guide mentions VERIFY-CHAIN-01');
  must(backlog, 'VERIFY-CHAIN-01', 'backlog keeps VERIFY-CHAIN-01 visible');
  must(backlog, 'P0:', 'backlog keeps P0 section');
  must(backlog, 'DOCS-STATE-01 sonrası resmi sonraki ürün sırası', 'backlog keeps next-product wording');

  console.log('=== VERIFY-CHAIN-01 PRODUCT EXTENSIONS CHECK PASS ===');
}

main();
