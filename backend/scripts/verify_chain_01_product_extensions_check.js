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
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const dashboardBulkDoc = read('docs/DASHBOARD_BULK_ENDPOINT_01.md');
  const cacheDoc = read('docs/CACHE_COALESCING_AND_BACKOFF_01.md');
  const requestStormDoc = read('docs/REQUEST_STORM_RESILIENCE_01.md');
  const policyDoc = read('docs/PRODUCTION_RATE_LIMIT_POLICY_01.md');
  const loadTestDoc = read('docs/LOAD_TEST_2000_USERS_01.md');
  const dbScalingDoc = read('docs/DB_POOL_AND_API_SCALING_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiRoadmap = read('docs/COPILOT_AI_ACTION_ROADMAP_01.md');
  const guidedDoc = read('docs/COPILOT_GUIDED_TASK_ENGINE_01.md');
  const dynamicDoc = read('docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md');
  const smartDiagnosticDoc = read('docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md');
  const rootCauseDoc = read('docs/COPILOT_ROOT_CAUSE_ENGINE_01.md');
  const riskScoringDoc = read('docs/COPILOT_RISK_SCORING_ENGINE_01.md');
  const clarifyingDoc = read('docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md');
  const reasoningDoc = read('docs/SEFER_ABI_REASONING_ASSISTANT_01.md');
  const planReviewDoc = read('docs/COPILOT_PLAN_REVIEW_ENGINE_01.md');
  const allRolesDoc = read('docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md');
  const terminologyDoc = read('docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md');
  const finalAuditDoc = read('docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md');
  const inviteDoc = read('docs/INVITE_BASED_MEMBERSHIP_01.md');
  const verifiedDoc = read('docs/VERIFIED_SUPPLIER_01.md');
  const backlog = read('docs/NEXT_BACKLOG_V1.md');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const companyAgreementsMobileParityDoc = read('docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md');
  const companyAgreementsPanel = read('web/src/panels/company/AgreementsPanel.jsx');
  const companyAgreementsMobileCards = read('web/src/panels/company/companyAgreementsMobileCards.jsx');
  const css = read('web/src/index.css');
  const observabilityDoc = read('docs/OBSERVABILITY_MONITORING_ALERTING_01.md');
  const observabilityProbe = read('backend/scripts/observability_monitoring_alerting_01_probe.js');
  const backendLintDoc = read('docs/BACKEND_LINT_WARNING_BURNDOWN_01.md');
  const dataIntegrityDoc = read('docs/DATA_INTEGRITY_AND_RECOVERY_01.md');
  const securityDoc = read('docs/SECURITY_KVKK_FINAL_01.md');

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
  must(pkg, '"check:qltpaybridge01": "node backend/scripts/qlt_pay_bridge_01_check.js"', 'package.json exposes check:qltpaybridge01');
  must(pkg, '"check:seferscore01": "node backend/scripts/sefer_score_01_check.js"', 'package.json exposes check:seferscore01');
  must(pkg, '"check:roadmaplockaimarketplace01": "node backend/scripts/roadmap_lock_ai_marketplace_01_check.js"', 'package.json exposes check:roadmaplockaimarketplace01');
  must(pkg, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', 'package.json exposes check:publiclanding01');
  must(pkg, '"check:publiclandingplatformfirst01": "node backend/scripts/public_landing_platform_first_01_check.js"', 'package.json exposes check:publiclandingplatformfirst01');
  must(pkg, '"check:publiclandingfinalpromise01": "node backend/scripts/public_landing_final_promise_01_check.js"', 'package.json exposes check:publiclandingfinalpromise01');
  must(pkg, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', 'package.json exposes check:leadcapture01');
  must(pkg, '"check:onboardingreview01": "node backend/scripts/onboarding_review_01_check.js"', 'package.json exposes check:onboardingreview01');
  must(pkg, '"check:onboardingreviewfinalaudit01": "node backend/scripts/onboarding_review_final_audit_01_check.js"', 'package.json exposes check:onboardingreviewfinalaudit01');
  must(pkg, '"check:invitebasedmembership01": "node backend/scripts/invite_based_membership_01_check.js"', 'package.json exposes check:invitebasedmembership01');
  must(pkg, '"check:verifiedsupplier01": "node backend/scripts/verified_supplier_01_check.js"', 'package.json exposes check:verifiedsupplier01');
  must(pkg, '"check:uxmarketplacepanels01": "node backend/scripts/ux_marketplace_panels_01_check.js"', 'package.json exposes check:uxmarketplacepanels01');
  must(pkg, '"check:productflowbuttonaudit01": "node backend/scripts/product_flow_button_audit_01_check.js"', 'package.json exposes check:productflowbuttonaudit01');
  must(pkg, '"check:agreementsourceshiftlineage01": "node backend/scripts/agreement_source_shift_lineage_01_check.js"', 'package.json exposes check:agreementsourceshiftlineage01');
  must(pkg, '"check:marketplacefreetooperate01": "node backend/scripts/marketplace_free_to_operate_01_check.js"', 'package.json exposes check:marketplacefreetooperate01');
  must(pkg, '"check:m44telematicst1t5": "node backend/scripts/m44_telematics_t1_t5_check.js"', 'package.json exposes check:m44telematicst1t5');
  must(pkg, '"check:telematicsproviderhub01": "node backend/scripts/telematics_provider_hub_01_check.js"', 'package.json exposes check:telematicsproviderhub01');
  must(pkg, '"check:safedrive01": "node backend/scripts/safe_drive_01_check.js"', 'package.json exposes check:safedrive01');
  must(pkg, '"check:offerrankingquality01": "node backend/scripts/offer_ranking_quality_01_check.js"', 'package.json exposes check:offerrankingquality01');
  must(pkg, '"check:pay01e": "node backend/scripts/pay_01e_payment_readonly_closure_check.js"', 'package.json exposes check:pay01e');
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
  must(pkg, '"check:exceltoroutereadinessredteam01": "node backend/scripts/excel_to_route_readiness_redteam_01_check.js"', 'package.json keeps check:exceltoroutereadinessredteam01');
  must(pkg, '"check:copiloteblockruntimeanswerintegration01": "node backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js"', 'package.json keeps check:copiloteblockruntimeanswerintegration01');
  must(pkg, '"check:copilotguidedtaskengine01": "node backend/scripts/copilot_guided_task_engine_01_check.js"', 'package.json keeps check:copilotguidedtaskengine01');
  must(pkg, '"check:copilotdynamicquestionengine01": "node backend/scripts/copilot_dynamic_question_engine_01_check.js"', 'package.json keeps check:copilotdynamicquestionengine01');
  must(pkg, '"check:copilotsmartdiagnosticengine01": "node backend/scripts/copilot_smart_diagnostic_engine_01_check.js"', 'package.json keeps check:copilotsmartdiagnosticengine01');
  must(pkg, '"check:copilotrootcauseengine01": "node backend/scripts/copilot_root_cause_engine_01_check.js"', 'package.json keeps check:copilotrootcauseengine01');
  must(pkg, '"check:copilotriskscoringengine01": "node backend/scripts/copilot_risk_scoring_engine_01_check.js"', 'package.json exposes check:copilotriskscoringengine01');
  must(pkg, '"check:copilotclarifyingquestionengine01": "node backend/scripts/copilot_clarifying_question_engine_01_check.js"', 'package.json keeps check:copilotclarifyingquestionengine01');
  must(pkg, '"check:copilotworkflowreasoningengine01": "node backend/scripts/copilot_workflow_reasoning_engine_01_check.js"', 'package.json exposes check:copilotworkflowreasoningengine01');
  must(pkg, '"check:copilotoperationhealthengine01": "node backend/scripts/copilot_operation_health_engine_01_check.js"', 'package.json exposes check:copilotoperationhealthengine01');
  must(pkg, '"check:copilotplanreviewengine01": "node backend/scripts/copilot_plan_review_engine_01_check.js"', 'package.json exposes check:copilotplanreviewengine01');
  must(pkg, '"check:hotfilesplitaichatcomposers01": "node backend/scripts/hot_file_split_ai_chat_composers_01_check.js"', 'package.json exposes check:hotfilesplitaichatcomposers01');
  must(pkg, '"check:hotfilesplitwebpanels01": "node backend/scripts/hot_file_split_web_panels_01_check.js"', 'package.json exposes check:hotfilesplitwebpanels01');
  must(pkg, '"check:copilotreasoninganswercomposer01": "node backend/scripts/copilot_reasoning_answer_composer_01_check.js"', 'package.json keeps check:copilotreasoninganswercomposer01');
  must(pkg, '"check:ai03bparaphraseintentaudit01": "node backend/scripts/ai03b_paraphrase_intent_audit_01_check.js"', 'package.json keeps check:ai03bparaphraseintentaudit01');
  must(pkg, '"check:ai03bsemanticvisibleaudit01": "node backend/scripts/ai03b_semantic_visible_audit_01_check.js"', 'package.json keeps check:ai03bsemanticvisibleaudit01');
  must(pkg, '"check:ai03bsemanticvisiblelivematrix01": "node backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js"', 'package.json keeps check:ai03bsemanticvisiblelivematrix01');
  must(pkg, '"check:seferabireasoningassistant01": "node backend/scripts/sefer_abi_reasoning_assistant_01_check.js"', 'package.json keeps check:seferabireasoningassistant01');
  must(pkg, '"check:seferabiallrolesreasoningassistant01": "node backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js"', 'package.json keeps check:seferabiallrolesreasoningassistant01');
  must(pkg, '"check:seferabiturkishterminology01": "node backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js"', 'package.json exposes check:seferabiturkishterminology01');
  must(pkg, '"check:seferabiturkishuserfacinglanguage01": "node backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js"', 'package.json exposes check:seferabiturkishuserfacinglanguage01');
  must(pkg, '"check:copilotcontextmemorytaskstate01": "node backend/scripts/copilot_context_memory_task_state_01_check.js"', 'package.json exposes check:copilotcontextmemorytaskstate01');
  must(runner, 'check:copilotcontextmemorytaskstate01', 'product extensions chain includes check:copilotcontextmemorytaskstate01');
  must(runner, 'check:copilotrootcauseengine01', 'product extensions chain includes check:copilotrootcauseengine01');
  must(runner, 'check:copilotriskscoringengine01', 'product extensions chain includes check:copilotriskscoringengine01');
  must(runner, 'check:copilotworkflowreasoningengine01', 'product extensions chain includes check:copilotworkflowreasoningengine01');
  must(runner, 'check:copilotoperationhealthengine01', 'product extensions chain includes check:copilotoperationhealthengine01');
  must(runner, 'check:copilotplanreviewengine01', 'product extensions chain includes check:copilotplanreviewengine01');
  must(runner, 'check:testqualityandflakeaudit01', 'product extensions chain includes check:testqualityandflakeaudit01');
  must(runner, 'check:cachecoalescingandbackoff01', 'product extensions chain includes check:cachecoalescingandbackoff01');
  must(runner, 'check:requeststormresilience01', 'product extensions chain includes check:requeststormresilience01');
  must(runner, 'check:productionratelimitpolicy01', 'product extensions chain includes check:productionratelimitpolicy01');
  must(runner, 'check:airesponsesemanticqualitygate01', 'product extensions chain includes check:airesponsesemanticqualitygate01');
  must(runner, 'check:loadtest2000users01', 'product extensions chain includes check:loadtest2000users01');
  must(runner, 'check:observabilitymonitoringalerting01', 'product extensions chain includes check:observabilitymonitoringalerting01');
  must(runner, 'check:backendlintwarningburndown01', 'product extensions chain includes check:backendlintwarningburndown01');
  must(runner, 'check:dataintegrityandrecovery01', 'product extensions chain includes check:dataintegrityandrecovery01');
  must(runner, 'check:roledataisolationredteam01', 'product extensions chain includes check:roledataisolationredteam01');
  must(runner, 'check:securitykvkkfinal01', 'product extensions chain includes check:securitykvkkfinal01');
  must(runner, 'check:seferabiturkishterminology01', 'product extensions chain includes check:seferabiturkishterminology01');
  must(runner, 'check:seferabiturkishuserfacinglanguage01', 'product extensions chain includes check:seferabiturkishuserfacinglanguage01');
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
  must(pkg, '"check:uxsmokepassminuszero01": "node backend/scripts/ux_smoke_pass_minus_zero_01_check.js"', 'package.json exposes check:uxsmokepassminuszero01');
  must(pkg, '"smoke:uxlivepanelpremium01": "node backend/scripts/ux_live_panel_premium_smoke_01.mjs"', 'package.json exposes smoke:uxlivepanelpremium01');
  must(pkg, '"smoke:uxmobileallrolespanelaudit01": "node backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs"', 'package.json exposes smoke:uxmobileallrolespanelaudit01');
  must(pkg, '"check:uxlivepanelpremiumsmoke01": "node backend/scripts/ux_live_panel_premium_smoke_01_check.js"', 'package.json exposes check:uxlivepanelpremiumsmoke01');
  must(pkg, '"check:mobilewebfinal01": "node backend/scripts/mobile_web_final_01_check.js"', 'package.json exposes check:mobilewebfinal01');
  must(pkg, '"check:uxparentpersonelliveerrorclarity01": "node backend/scripts/ux_parent_personel_live_error_clarity_01_check.js"', 'package.json exposes check:uxparentpersonelliveerrorclarity01');
  must(pkg, '"check:e2esmoke01"', 'package.json keeps check:e2esmoke01');
  must(pkg, '"check:fieldlaunch01"', 'package.json keeps check:fieldlaunch01');
  must(pkg, '"check:qualitygatefinal01": "node backend/scripts/quality_gate_final_01_check.js"', 'package.json exposes check:qualitygatefinal01');
  must(pkg, '"check:testqualityandflakeaudit01": "node backend/scripts/test_quality_and_flake_audit_01_check.js"', 'package.json exposes check:testqualityandflakeaudit01');
  must(pkg, '"check:dashboardbulkendpoint01": "node backend/scripts/dashboard_bulk_endpoint_01_check.js"', 'package.json exposes check:dashboardbulkendpoint01');
  must(pkg, '"check:cachecoalescingandbackoff01": "node backend/scripts/cache_coalescing_and_backoff_01_check.js"', 'package.json exposes check:cachecoalescingandbackoff01');
  must(pkg, '"check:requeststormresilience01": "node backend/scripts/request_storm_resilience_01_check.js"', 'package.json exposes check:requeststormresilience01');
  must(pkg, '"check:productionratelimitpolicy01": "node backend/scripts/production_rate_limit_policy_01_check.js"', 'package.json exposes check:productionratelimitpolicy01');
  must(pkg, '"check:airesponsesemanticqualitygate01": "node backend/scripts/ai_response_semantic_quality_gate_01_check.js"', 'package.json exposes check:airesponsesemanticqualitygate01');
  must(pkg, '"check:loadtest2000users01": "node backend/scripts/load_test_2000_users_01_check.js"', 'package.json exposes check:loadtest2000users01');
  must(pkg, '"check:observabilitymonitoringalerting01": "node backend/scripts/observability_monitoring_alerting_01_check.js"', 'package.json exposes check:observabilitymonitoringalerting01');
  must(pkg, '"check:backendlintwarningburndown01": "node backend/scripts/backend_lint_warning_burndown_01_check.js"', 'package.json exposes check:backendlintwarningburndown01');
  must(pkg, '"check:dataintegrityandrecovery01": "node backend/scripts/data_integrity_and_recovery_01_check.js"', 'package.json exposes check:dataintegrityandrecovery01');
  must(pkg, '"check:securitykvkkfinal01": "node backend/scripts/security_kvkk_final_01_check.js"', 'package.json exposes check:securitykvkkfinal01');
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
    'check:invitebasedmembership01',
    'check:verifiedsupplier01',
    'check:uxmarketplacepanels01',
    'check:productflowbuttonaudit01',
    'check:agreementsourceshiftlineage01',
    'check:marketplacefreetooperate01',
    'check:m44telematicst1t5',
    'check:telematicsproviderhub01',
    'check:safedrive01',
    'check:offerrankingquality01',
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
  'check:copilotroletaskmatrix01',
  'check:copilotairoadmap01',
  'check:copilotdemandagreement01',
  'check:copilothumanapproval01',
  'check:copilotexceldemandimport01',
  'check:addressgeocodingconfidence01',
  'check:copilotstoproutedraft01',
  'check:osrmroutedraftfromexcel01',
  'check:copilotroutereviewhumanapproval01',
  'check:exceltoroutereadinessredteam01',
  'check:copiloteblockruntimeanswerintegration01',
  'check:copilotguidedtaskengine01',
  'check:copilotdynamicquestionengine01',
  'check:copilotsmartdiagnosticengine01',
  'check:copilotrootcauseengine01',
  'check:copilotriskscoringengine01',
  'check:copilotclarifyingquestionengine01',
  'check:copilotworkflowreasoningengine01',
  'check:copilotreasoninganswercomposer01',
  'check:ai03bparaphraseintentaudit01',
  'check:ai03bsemanticvisibleaudit01',
  'check:ai03bsemanticvisiblelivematrix01',
    'check:seferabireasoningassistant01',
    'check:seferabiallrolesreasoningassistant01',
    'check:seferabiturkishuserfacinglanguage01',
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
    'check:uxsmokepassminuszero01',
    'check:mobilewebfinal01',
    'check:uxparentpersonelliveerrorclarity01',
    'check:livetrackingfinal01',
    'check:driverflowfinal01',
    'check:qualitygatefinal01',
    'check:testqualityandflakeaudit01',
    'check:dashboardbulkendpoint01',
    'check:cachecoalescingandbackoff01',
    'check:requeststormresilience01',
    'check:productionratelimitpolicy01',
    'check:airesponsesemanticqualitygate01',
    'check:securitykvkkfinal01',
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
  must(guide, 'INVITE-BASED-MEMBERSHIP-01', 'script guide mentions invite-based membership milestone');
  must(guide, 'check:invitebasedmembership01', 'script guide exposes invite-based membership check');
  must(guide, 'node backend\\scripts\\invite_based_membership_01_check.js', 'script guide includes invite-based membership command');
  must(guide, 'docs/INVITE_BASED_MEMBERSHIP_01.md', 'script guide includes invite-based membership doc');
  must(guide, 'VERIFIED-SUPPLIER-01', 'script guide mentions verified supplier milestone');
  must(guide, 'check:verifiedsupplier01', 'script guide exposes verified supplier check');
  must(guide, 'node backend\\scripts\\verified_supplier_01_check.js', 'script guide includes verified supplier command');
  must(guide, 'docs/VERIFIED_SUPPLIER_01.md', 'script guide includes verified supplier doc');
  must(guide, 'UX-MARKETPLACE-PANELS-01', 'script guide mentions marketplace panels milestone');
  must(guide, 'check:uxmarketplacepanels01', 'script guide exposes marketplace panels check');
  must(guide, 'node backend\\scripts\\ux_marketplace_panels_01_check.js', 'script guide includes marketplace panels command');
  must(guide, 'docs/UX_MARKETPLACE_PANELS_01.md', 'script guide includes marketplace panels doc');
  must(guide, 'PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01 -> ONBOARDING-REVIEW-01 FINAL AUDIT -> INVITE-BASED-MEMBERSHIP-01 -> VERIFIED-SUPPLIER-01 -> UX-MARKETPLACE-PANELS-01 -> PRODUCT-FLOW-BUTTON-AUDIT-01', 'script guide keeps public lead order');
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
  must(guide, 'M44-TELEMATICS-T1-T5', 'script guide mentions M44 telematics T1/T5 milestone');
  must(guide, 'check:m44telematicst1t5', 'script guide exposes M44 telematics T1/T5 check');
  must(guide, 'node backend\\scripts\\m44_telematics_t1_t5_check.js', 'script guide includes M44 telematics T1/T5 command');
  must(guide, 'docs/M44_TELEMATICS_T1_T5.md', 'script guide includes M44 telematics T1/T5 doc');
  must(guide, 'TELEMATICS-PROVIDER-HUB-01', 'script guide mentions telematics provider hub milestone');
  must(guide, 'check:telematicsproviderhub01', 'script guide exposes telematics provider hub check');
  must(guide, 'node backend\\scripts\\telematics_provider_hub_01_check.js', 'script guide includes telematics provider hub command');
  must(guide, 'docs/TELEMATICS_PROVIDER_HUB_01.md', 'script guide includes telematics provider hub doc');
  must(guide, 'SAFE-DRIVE-01', 'script guide mentions safe drive milestone');
  must(guide, 'check:safedrive01', 'script guide exposes safe drive check');
  must(guide, 'node backend\\scripts\\safe_drive_01_check.js', 'script guide includes safe drive command');
  must(guide, 'docs/SAFE_DRIVE_01.md', 'script guide includes safe drive doc');
  must(guide, 'Güvenli sürüş özeti', 'script guide keeps safe drive copy');
  must(guide, 'Risk sinyali', 'script guide keeps risk signal wording');
  must(guide, 'İnsan onayı gerekir', 'script guide keeps human approval wording');
  ordered(guide, ['M44-TELEMATICS-T1-T5', 'TELEMATICS-PROVIDER-HUB-01', 'SAFE-DRIVE-01'], 'script guide keeps telematics provider hub after M44 before safe drive');
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
  must(guide, 'EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'script guide mentions EXCEL-TO-ROUTE-READINESS-REDTEAM-01');
  must(guide, 'check:exceltoroutereadinessredteam01', 'script guide exposes check:exceltoroutereadinessredteam01');
  must(guide, 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'script guide mentions COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01');
  must(guide, 'check:copiloteblockruntimeanswerintegration01', 'script guide exposes check:copiloteblockruntimeanswerintegration01');
  must(guide, 'node backend\\scripts\\copilot_e_block_runtime_answer_integration_01_check.js', 'script guide includes e-block runtime answer integration command');
  must(guide, 'docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md', 'script guide includes e-block runtime answer integration doc');
  must(guide, 'COPILOT-GUIDED-TASK-ENGINE-01', 'script guide mentions COPILOT-GUIDED-TASK-ENGINE-01');
  must(guide, 'check:copilotguidedtaskengine01', 'script guide exposes check:copilotguidedtaskengine01');
  must(guide, 'node backend\\scripts\\copilot_guided_task_engine_01_check.js', 'script guide includes guided task engine command');
  must(guide, 'docs/COPILOT_GUIDED_TASK_ENGINE_01.md', 'script guide includes guided task engine doc');
  must(guide, 'COPILOT-DYNAMIC-QUESTION-ENGINE-01', 'script guide mentions COPILOT-DYNAMIC-QUESTION-ENGINE-01');
  must(guide, 'check:copilotdynamicquestionengine01', 'script guide exposes check:copilotdynamicquestionengine01');
  must(guide, 'node backend\\scripts\\copilot_dynamic_question_engine_01_check.js', 'script guide includes dynamic question engine command');
  must(guide, 'docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md', 'script guide includes dynamic question engine doc');
  must(guide, 'COPILOT-SMART-DIAGNOSTIC-ENGINE-01', 'script guide mentions COPILOT-SMART-DIAGNOSTIC-ENGINE-01');
  must(guide, 'check:copilotsmartdiagnosticengine01', 'script guide exposes check:copilotsmartdiagnosticengine01');
  must(guide, 'node backend\\scripts\\copilot_smart_diagnostic_engine_01_check.js', 'script guide includes smart diagnostic engine command');
  must(guide, 'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md', 'script guide includes smart diagnostic engine doc');
  must(guide, 'COPILOT-ROOT-CAUSE-ENGINE-01', 'script guide mentions COPILOT-ROOT-CAUSE-ENGINE-01');
  must(guide, 'check:copilotrootcauseengine01', 'script guide exposes check:copilotrootcauseengine01');
  must(guide, 'node backend\\scripts\\copilot_root_cause_engine_01_check.js', 'script guide includes root cause engine command');
  must(guide, 'docs/COPILOT_ROOT_CAUSE_ENGINE_01.md', 'script guide includes root cause engine doc');
  must(guide, 'COPILOT-RISK-SCORING-ENGINE-01', 'script guide mentions COPILOT-RISK-SCORING-ENGINE-01');
  must(guide, 'check:copilotriskscoringengine01', 'script guide exposes check:copilotriskscoringengine01');
  must(guide, 'node backend\\scripts\\copilot_risk_scoring_engine_01_check.js', 'script guide includes risk scoring engine command');
  must(guide, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'script guide includes risk scoring engine doc');
  must(guide, 'COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'script guide mentions COPILOT-CLARIFYING-QUESTION-ENGINE-01');
  must(guide, 'check:copilotclarifyingquestionengine01', 'script guide exposes check:copilotclarifyingquestionengine01');
  must(guide, 'node backend\\scripts\\copilot_clarifying_question_engine_01_check.js', 'script guide includes clarifying question engine command');
  must(guide, 'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md', 'script guide includes clarifying question engine doc');
  must(guide, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'script guide mentions COPILOT-WORKFLOW-REASONING-ENGINE-01');
  must(guide, 'check:copilotworkflowreasoningengine01', 'script guide exposes check:copilotworkflowreasoningengine01');
  must(guide, 'node backend\\scripts\\copilot_workflow_reasoning_engine_01_check.js', 'script guide includes workflow reasoning engine command');
  must(guide, 'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md', 'script guide includes workflow reasoning engine doc');
  must(guide, 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'script guide mentions COPILOT-OPERATION-HEALTH-ENGINE-01');
  must(guide, 'check:copilotoperationhealthengine01', 'script guide exposes check:copilotoperationhealthengine01');
  must(guide, 'node backend\\scripts\\copilot_operation_health_engine_01_check.js', 'script guide includes operation health engine command');
  must(guide, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'script guide includes operation health engine doc');
  must(guide, 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'script guide mentions COPILOT-NEXT-BEST-ACTION-ENGINE-01');
  must(guide, 'check:copilotnextbestactionengine01', 'script guide exposes check:copilotnextbestactionengine01');
  must(guide, 'node backend\\scripts\\copilot_next_best_action_engine_01_check.js', 'script guide includes next best action engine command');
  must(guide, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'script guide includes next best action engine doc');
  must(guide, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'script guide mentions COPILOT-PLAN-REVIEW-ENGINE-01');
  must(guide, 'check:copilotplanreviewengine01', 'script guide exposes check:copilotplanreviewengine01');
  must(guide, 'node backend\\scripts\\copilot_plan_review_engine_01_check.js', 'script guide includes plan review engine command');
  must(guide, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'script guide includes plan review engine doc');
  must(guide, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'script guide mentions hot file split milestone');
  must(guide, 'check:hotfilesplitaichatcomposers01', 'script guide exposes hot file split check');
  must(guide, 'node backend\\scripts\\hot_file_split_ai_chat_composers_01_check.js', 'script guide includes hot file split command');
  must(guide, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'script guide includes hot file split doc');
  must(guide, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'script guide includes helpComposer safe replies helper');
  must(guide, 'HOT-FILE-SPLIT-WEB-PANELS-01', 'script guide mentions hot file split web panels milestone');
  must(guide, 'check:hotfilesplitwebpanels01', 'script guide exposes hot file split web panels check');
  must(guide, 'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md', 'script guide includes hot file split web panels doc');
  must(guide, 'web/src/panels/company/companyAgreementsBridgeSection.jsx', 'script guide includes company bridge split file');
  must(guide, 'web/src/panels/room/roomAgreementsBridgeSection.jsx', 'script guide includes room bridge split file');
  must(guide, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'script guide mentions COPILOT-REASONING-ANSWER-COMPOSER-01');
  must(guide, 'check:copilotreasoninganswercomposer01', 'script guide exposes check:copilotreasoninganswercomposer01');
  must(guide, 'node backend\\scripts\\copilot_reasoning_answer_composer_01_check.js', 'script guide includes reasoning answer composer command');
  must(guide, 'docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md', 'script guide includes reasoning answer composer doc');
  must(guide, 'SEFER-ABI-REASONING-ASSISTANT-01', 'script guide mentions SEFER-ABI-REASONING-ASSISTANT-01');
  must(guide, 'check:seferabireasoningassistant01', 'script guide exposes check:seferabireasoningassistant01');
  must(guide, 'node backend\\scripts\\sefer_abi_reasoning_assistant_01_check.js', 'script guide includes reasoning assistant command');
  must(guide, 'docs/SEFER_ABI_REASONING_ASSISTANT_01.md', 'script guide includes reasoning assistant doc');
  must(guide, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'script guide mentions SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01');
  must(guide, 'check:seferabiallrolesreasoningassistant01', 'script guide exposes check:seferabiallrolesreasoningassistant01');
  must(guide, 'node backend\\scripts\\sefer_abi_all_roles_reasoning_assistant_01_check.js', 'script guide includes all-roles reasoning assistant command');
  must(guide, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'script guide includes all-roles reasoning assistant doc');
  ordered(guide, ['EXCEL-TO-ROUTE-READINESS-REDTEAM-01', 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01', 'COPILOT-GUIDED-TASK-ENGINE-01', 'COPILOT-DYNAMIC-QUESTION-ENGINE-01', 'COPILOT-SMART-DIAGNOSTIC-ENGINE-01', 'COPILOT-ROOT-CAUSE-ENGINE-01', 'COPILOT-RISK-SCORING-ENGINE-01', 'COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'HOT-FILE-SPLIT-WEB-PANELS-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'SEFER-ABI-REASONING-ASSISTANT-01', 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'ETA-SANITY-01', 'SEFER-ABI-TERMINAL-HUMANIZE-01', 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01'], 'script guide keeps next best action between operation health and plan review');
  must(guide, 'node backend\\scripts\\excel_to_route_readiness_redteam_01_check.js', 'script guide includes redteam command');
  must(guide, 'docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md', 'script guide includes redteam doc');
  must(guide, 'check:uxcopilotpersona01', 'script guide exposes check:uxcopilotpersona01');
  must(guide, 'check:uxcopilotterminal01', 'script guide exposes check:uxcopilotterminal01');
  must(guide, 'UX-SEFER-ABI-LAUNCHER-01', 'script guide mentions UX-SEFER-ABI-LAUNCHER-01');
  must(guide, 'check:uxseferabilauncher01', 'script guide exposes check:uxseferabilauncher01');
  must(guide, 'SEFER-ABI-TERMINAL-HUMANIZE-01', 'script guide mentions SEFER-ABI-TERMINAL-HUMANIZE-01');
  must(guide, 'check:seferabiterminalhumanize01', 'script guide exposes check:seferabiterminalhumanize01');
  must(guide, 'node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js', 'script guide includes Sefer Abi terminal humanize command');
  must(guide, 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01', 'script guide mentions SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01');
  must(guide, 'check:seferabiturkishuserfacinglanguage01', 'script guide exposes check:seferabiturkishuserfacinglanguage01');
  must(guide, 'node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js', 'script guide includes Turkish user-facing language audit command');
  must(guide, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'script guide includes Turkish user-facing language audit doc');
  must(guide, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'script guide mentions SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01');
  must(guide, 'check:seferabiturkishterminology01', 'script guide exposes check:seferabiturkishterminology01');
  must(guide, 'node backend\\scripts\\sefer_abi_turkish_user_facing_terminology_01_check.js', 'script guide includes Turkish user-facing terminology audit command');
  must(guide, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'script guide includes Turkish user-facing terminology audit doc');
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
  must(harnessCheck, 'check:invitebasedmembership01', 'script harness check knows invite-based membership alias');
  must(harnessCheck, 'invite_based_membership_01_check.js', 'script harness check knows invite-based membership file');
  must(harnessCheck, 'INVITE-BASED-MEMBERSHIP-01', 'script harness check knows invite-based membership milestone');
  must(harnessDoc, 'root:check:invitebasedmembership01', 'script harness doc lists invite-based membership root check');
  must(harnessDoc, 'invite_based_membership_01_check.js', 'script harness doc lists invite-based membership check');
  must(harnessDoc, 'INVITE-BASED-MEMBERSHIP-01', 'script harness doc lists invite-based membership milestone');
  must(harnessCheck, 'check:verifiedsupplier01', 'script harness check knows verified supplier alias');
  must(harnessCheck, 'verified_supplier_01_check.js', 'script harness check knows verified supplier file');
  must(harnessCheck, 'VERIFIED-SUPPLIER-01', 'script harness check knows verified supplier milestone');
  must(harnessDoc, 'root:check:verifiedsupplier01', 'script harness doc lists verified supplier root check');
  must(harnessDoc, 'verified_supplier_01_check.js', 'script harness doc lists verified supplier check');
  must(harnessDoc, 'docs/VERIFIED_SUPPLIER_01.md', 'script harness doc lists verified supplier doc');
  must(harnessDoc, 'VERIFIED-SUPPLIER-01', 'script harness doc lists verified supplier milestone');
  must(harnessCheck, 'check:uxmarketplacepanels01', 'script harness check knows marketplace panels alias');
  must(harnessCheck, 'ux_marketplace_panels_01_check.js', 'script harness check knows marketplace panels file');
  must(harnessCheck, 'UX-MARKETPLACE-PANELS-01', 'script harness check knows marketplace panels milestone');
  must(harnessDoc, 'root:check:uxmarketplacepanels01', 'script harness doc lists marketplace panels root check');
  must(harnessDoc, 'ux_marketplace_panels_01_check.js', 'script harness doc lists marketplace panels check');
  must(harnessDoc, 'docs/UX_MARKETPLACE_PANELS_01.md', 'script harness doc lists marketplace panels doc');
  must(harnessDoc, 'UX-MARKETPLACE-PANELS-01', 'script harness doc lists marketplace panels milestone');
  must(harnessCheck, 'check:m44telematicst1t5', 'script harness check knows M44 telematics T1/T5 alias');
  must(harnessCheck, 'm44_telematics_t1_t5_check.js', 'script harness check knows M44 telematics T1/T5 file');
  must(harnessCheck, 'docs/M44_TELEMATICS_T1_T5.md', 'script harness check knows M44 telematics T1/T5 doc');
  must(harnessCheck, 'M44-TELEMATICS-T1-T5', 'script harness check knows M44 telematics T1/T5 milestone');
  must(harnessDoc, 'root:check:m44telematicst1t5', 'script harness doc lists M44 telematics T1/T5 root check');
  must(harnessDoc, 'm44_telematics_t1_t5_check.js', 'script harness doc lists M44 telematics T1/T5 check');
  must(harnessDoc, 'docs/M44_TELEMATICS_T1_T5.md', 'script harness doc lists M44 telematics T1/T5 doc');
  must(harnessDoc, 'M44-TELEMATICS-T1-T5', 'script harness doc lists M44 telematics T1/T5 milestone');
  must(harnessCheck, 'check:telematicsproviderhub01', 'script harness check knows telematics provider hub alias');
  must(harnessCheck, 'telematics_provider_hub_01_check.js', 'script harness check knows telematics provider hub file');
  must(harnessCheck, 'TELEMATICS-PROVIDER-HUB-01', 'script harness check knows telematics provider hub milestone');
  must(harnessCheck, 'check:safedrive01', 'script harness check knows safe drive alias');
  must(harnessCheck, 'safe_drive_01_check.js', 'script harness check knows safe drive file');
  must(harnessCheck, 'SAFE-DRIVE-01', 'script harness check knows safe drive milestone');
  must(harnessCheck, 'docs/SAFE_DRIVE_01.md', 'script harness check knows safe drive doc');
  must(harnessCheck, 'web/src/utils/safeDriveSummary.js', 'script harness check knows safe drive helper');
  must(harnessCheck, 'web/src/panels/shared/SafeDriveSummaryCard.jsx', 'script harness check knows safe drive card');
  must(harnessDoc, 'root:check:telematicsproviderhub01', 'script harness doc lists telematics provider hub root check');
  must(harnessDoc, 'telematics_provider_hub_01_check.js', 'script harness doc lists telematics provider hub check');
  must(harnessDoc, 'docs/TELEMATICS_PROVIDER_HUB_01.md', 'script harness doc lists telematics provider hub doc');
  must(harnessDoc, 'TELEMATICS-PROVIDER-HUB-01', 'script harness doc lists telematics provider hub milestone');
  must(harnessDoc, 'root:check:safedrive01', 'script harness doc lists safe drive root check');
  must(harnessDoc, 'safe_drive_01_check.js', 'script harness doc lists safe drive check');
  must(harnessDoc, 'docs/SAFE_DRIVE_01.md', 'script harness doc lists safe drive doc');
  must(harnessDoc, 'SAFE-DRIVE-01', 'script harness doc lists safe drive milestone');
  must(harnessDoc, 'web/src/utils/safeDriveSummary.js', 'script harness doc lists safe drive helper');
  must(harnessDoc, 'web/src/panels/shared/SafeDriveSummaryCard.jsx', 'script harness doc lists safe drive card');
  must(primer, 'INVITE-BASED-MEMBERSHIP-01', 'primer mentions invite-based membership milestone');
  must(primer, 'docs/INVITE_BASED_MEMBERSHIP_01.md', 'primer links invite-based membership doc');
  must(primer, 'insan onaylı davetli üyelik', 'primer keeps invite-based membership summary');
  must(primer, 'VERIFIED-SUPPLIER-01', 'primer mentions verified supplier milestone');
  must(primer, 'docs/VERIFIED_SUPPLIER_01.md', 'primer links verified supplier doc');
  must(primer, 'UX-MARKETPLACE-PANELS-01', 'primer mentions marketplace panels milestone');
  must(primer, 'docs/UX_MARKETPLACE_PANELS_01.md', 'primer links marketplace panels doc');
  must(primer, 'marketplace readiness center', 'primer keeps marketplace readiness wording');
  must(primer, 'M44-TELEMATICS-T1-T5', 'primer mentions M44 telematics T1/T5 milestone');
  must(primer, 'check:m44telematicst1t5', 'primer exposes M44 telematics T1/T5 canonical check');
  must(primer, 'docs/M44_TELEMATICS_T1_T5.md', 'primer links M44 telematics T1/T5 doc');
  must(primer, 'TELEMATICS-PROVIDER-HUB-01', 'primer mentions telematics provider hub milestone');
  must(primer, 'docs/TELEMATICS_PROVIDER_HUB_01.md', 'primer links telematics provider hub doc');
  must(primer, 'provider-agnostic telematics hub', 'primer keeps telematics provider hub wording');
  must(primer, 'SAFE-DRIVE-01', 'primer mentions safe drive milestone');
  must(primer, 'docs/SAFE_DRIVE_01.md', 'primer links safe drive doc');
  must(primer, 'readonly safe-drive risk summary', 'primer keeps safe drive wording');
  must(primer, 'Güvenli sürüş özeti', 'primer keeps safe drive copy');
  must(primer, 'SEFER-ABI-REASONING-ASSISTANT-01', 'primer mentions reasoning assistant milestone');
  must(primer, 'check:seferabireasoningassistant01', 'primer exposes reasoning assistant check');
  must(primer, 'docs/SEFER_ABI_REASONING_ASSISTANT_01.md', 'primer links reasoning assistant doc');
  must(primer, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'primer links reasoning assistant helper');
  must(primer, 'COPILOT-DYNAMIC-QUESTION-ENGINE-01', 'primer mentions dynamic question engine milestone');
  must(primer, 'check:copilotdynamicquestionengine01', 'primer exposes dynamic question engine check');
  must(primer, 'docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md', 'primer links dynamic question engine doc');
  must(primer, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'primer links dynamic question engine helper');
  must(primer, 'COPILOT-SMART-DIAGNOSTIC-ENGINE-01', 'primer mentions smart diagnostic engine milestone');
  must(primer, 'check:copilotsmartdiagnosticengine01', 'primer exposes smart diagnostic engine check');
  must(primer, 'docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md', 'primer links smart diagnostic engine doc');
  must(primer, 'backend/src/ai/chat/conversationSmartDiagnostics.js', 'primer links smart diagnostic engine helper');
  must(primer, 'COPILOT-ROOT-CAUSE-ENGINE-01', 'primer mentions root cause engine milestone');
  must(primer, 'check:copilotrootcauseengine01', 'primer exposes root cause engine check');
  must(primer, 'docs/COPILOT_ROOT_CAUSE_ENGINE_01.md', 'primer links root cause engine doc');
  must(primer, 'backend/src/ai/chat/conversationRootCauseEngine.js', 'primer links root cause engine helper');
  must(primer, 'COPILOT-RISK-SCORING-ENGINE-01', 'primer mentions risk scoring engine milestone');
  must(primer, 'check:copilotriskscoringengine01', 'primer exposes risk scoring engine check');
  must(primer, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'primer links risk scoring engine doc');
  must(primer, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'primer links risk scoring engine helper');
  must(primer, 'COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'primer mentions clarifying question engine milestone');
  must(primer, 'check:copilotclarifyingquestionengine01', 'primer exposes clarifying question engine check');
  must(primer, 'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md', 'primer links clarifying question engine doc');
  must(primer, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'primer links clarifying question engine helper');
  must(primer, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'primer mentions workflow reasoning engine milestone');
  must(primer, 'check:copilotworkflowreasoningengine01', 'primer exposes workflow reasoning engine check');
  must(primer, 'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md', 'primer links workflow reasoning engine doc');
  must(primer, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'primer links workflow reasoning engine helper');
  must(primer, 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'primer mentions operation health engine milestone');
  must(primer, 'check:copilotoperationhealthengine01', 'primer exposes operation health engine check');
  must(primer, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'primer links operation health engine doc');
  must(primer, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'primer links operation health engine helper');
  must(primer, 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'primer mentions next best action engine milestone');
  must(primer, 'check:copilotnextbestactionengine01', 'primer exposes next best action engine check');
  must(primer, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'primer links next best action engine doc');
  must(primer, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'primer links next best action engine helper');
  must(primer, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'primer mentions plan review engine milestone');
  must(primer, 'check:copilotplanreviewengine01', 'primer exposes plan review engine check');
  must(primer, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'primer links plan review engine doc');
  must(primer, 'backend/src/ai/chat/conversationPlanReviewEngine.js', 'primer links plan review engine helper');
  must(primer, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'primer mentions hot file split milestone');
  must(primer, 'check:hotfilesplitaichatcomposers01', 'primer exposes hot file split check');
  must(primer, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'primer links hot file split doc');
  must(primer, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'primer links helpComposer safe replies helper');
  must(primer, 'HOT-FILE-SPLIT-WEB-PANELS-01', 'primer mentions hot file split web panels milestone');
  must(primer, 'check:hotfilesplitwebpanels01', 'primer exposes hot file split web panels check');
  must(primer, 'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md', 'primer links hot file split web panels doc');
  must(primer, 'web/src/panels/company/companyAgreementsBridgeSection.jsx', 'primer lists company bridge split file');
  must(primer, 'web/src/panels/room/roomAgreementsBridgeSection.jsx', 'primer lists room bridge split file');
  must(primer, 'TEST-QUALITY-AND-FLAKE-AUDIT-01', 'primer mentions test quality and flake audit milestone');
  must(primer, 'check:testqualityandflakeaudit01', 'primer exposes test quality and flake audit check');
  must(primer, 'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md', 'primer links test quality and flake audit doc');
  must(primer, 'backend/scripts/test_quality_and_flake_audit_01_check.js', 'primer links test quality and flake audit command');
  must(primer, 'DASHBOARD-BULK-ENDPOINT-01', 'primer mentions dashboard bulk endpoint milestone');
  must(primer, 'check:dashboardbulkendpoint01', 'primer exposes dashboard bulk endpoint check');
  must(primer, 'docs/DASHBOARD_BULK_ENDPOINT_01.md', 'primer links dashboard bulk endpoint doc');
  must(primer, 'backend/scripts/dashboard_bulk_endpoint_01_check.js', 'primer links dashboard bulk endpoint command');
  must(primer, 'CACHE-COALESCING-AND-BACKOFF-01', 'primer mentions cache coalescing and backoff milestone');
  must(primer, 'check:cachecoalescingandbackoff01', 'primer exposes cache coalescing and backoff check');
  must(primer, 'docs/CACHE_COALESCING_AND_BACKOFF_01.md', 'primer links cache coalescing and backoff doc');
  must(primer, 'backend/scripts/cache_coalescing_and_backoff_01_check.js', 'primer links cache coalescing and backoff command');
  must(primer, 'REQUEST-STORM-RESILIENCE-01', 'primer mentions request storm resilience milestone');
  must(primer, 'check:requeststormresilience01', 'primer exposes request storm resilience check');
  must(primer, 'docs/REQUEST_STORM_RESILIENCE_01.md', 'primer links request storm resilience doc');
  must(primer, 'backend/scripts/request_storm_resilience_01_check.js', 'primer links request storm resilience command');
  must(primer, 'PRODUCTION-RATE-LIMIT-POLICY-01', 'primer mentions production rate limit policy milestone');
  must(primer, 'check:productionratelimitpolicy01', 'primer exposes production rate limit policy check');
  must(primer, 'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md', 'primer links production rate limit policy doc');
  must(primer, 'backend/scripts/production_rate_limit_policy_01_check.js', 'primer links production rate limit policy command');
  must(primer, 'AI-RESPONSE-SEMANTIC-QUALITY-GATE-01', 'primer mentions AI response semantic quality gate milestone');
  must(primer, 'check:airesponsesemanticqualitygate01', 'primer exposes AI response semantic quality gate check');
  must(primer, 'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md', 'primer links AI response semantic quality gate doc');
  must(primer, 'backend/scripts/ai_response_semantic_quality_gate_01_check.js', 'primer links AI response semantic quality gate command');
  must(primer, 'LOAD-TEST-2000-USERS-01', 'primer mentions load-test milestone');
  must(primer, 'check:loadtest2000users01', 'primer exposes load-test check');
  must(primer, 'docs/LOAD_TEST_2000_USERS_01.md', 'primer links load-test doc');
  must(primer, 'backend/scripts/load_test_2000_users_01_check.js', 'primer links load-test command');
  must(primer, 'DB-POOL-AND-API-SCALING-01', 'primer mentions db scaling milestone');
  must(primer, 'check:dbpoolandapiscaling01', 'primer exposes db scaling check');
  must(primer, 'docs/DB_POOL_AND_API_SCALING_01.md', 'primer links db scaling doc');
  must(primer, 'backend/scripts/db_pool_and_api_scaling_01_check.js', 'primer links db scaling command');
  must(primer, 'OBSERVABILITY-MONITORING-ALERTING-01', 'primer mentions observability milestone');
  must(primer, 'check:observabilitymonitoringalerting01', 'primer exposes observability check');
  must(primer, 'docs/OBSERVABILITY_MONITORING_ALERTING_01.md', 'primer links observability doc');
  must(primer, 'backend/scripts/observability_monitoring_alerting_01_check.js', 'primer links observability command');
  must(primer, 'BACKEND-LINT-WARNING-BURNDOWN-01', 'primer mentions backend lint burndown milestone');
  must(primer, 'check:backendlintwarningburndown01', 'primer exposes backend lint burndown check');
  must(primer, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md', 'primer links backend lint burndown doc');
  must(primer, 'backend/scripts/backend_lint_warning_burndown_01_check.js', 'primer links backend lint burndown command');
  must(primer, 'DATA-INTEGRITY-AND-RECOVERY-01', 'primer mentions data integrity milestone');
  must(primer, 'check:dataintegrityandrecovery01', 'primer exposes data integrity check');
  must(primer, 'docs/DATA_INTEGRITY_AND_RECOVERY_01.md', 'primer links data integrity doc');
  must(primer, 'backend/scripts/data_integrity_and_recovery_01_check.js', 'primer links data integrity command');
  must(primer, 'SECURITY-KVKK-FINAL-01', 'primer mentions security final milestone');
  must(primer, 'check:securitykvkkfinal01', 'primer exposes security final check');
  must(primer, 'docs/SECURITY_KVKK_FINAL_01.md', 'primer links security final doc');
  must(primer, 'backend/scripts/security_kvkk_final_01_check.js', 'primer links security final command');
  ordered(primer, ['TEST-QUALITY-AND-FLAKE-AUDIT-01', 'DASHBOARD-BULK-ENDPOINT-01', 'CACHE-COALESCING-AND-BACKOFF-01', 'REQUEST-STORM-RESILIENCE-01', 'PRODUCTION-RATE-LIMIT-POLICY-01', 'AI-RESPONSE-SEMANTIC-QUALITY-GATE-01', 'LOAD-TEST-2000-USERS-01', 'DB-POOL-AND-API-SCALING-01', 'OBSERVABILITY-MONITORING-ALERTING-01', 'BACKEND-LINT-WARNING-BURNDOWN-01', 'DATA-INTEGRITY-AND-RECOVERY-01', 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01'], 'primer keeps dashboard bulk endpoint, cache coalescing and backoff, request storm resilience, production rate limit policy, AI response semantic quality gate, load-test, db scaling, observability, backend lint burndown and data integrity in order');
  must(loadTestDoc, '# LOAD-TEST-2000-USERS-01', 'load-test doc title present');
  must(loadTestDoc, '## 1) Purpose', 'load-test doc purpose heading present');
  must(loadTestDoc, '## 6) Local-safe harness policy', 'load-test doc harness heading present');
  must(loadTestDoc, '## 7) Explicit high-concurrency flag policy', 'load-test doc high concurrency heading present');
  must(loadTestDoc, '## 13) Generated report policy', 'load-test doc report heading present');
  must(loadTestDoc, '## 17) Next recommended milestone', 'load-test doc next milestone heading present');
  must(loadTestDoc, 'check:loadtest2000users01', 'load-test doc mentions canonical check alias');
  must(loadTestDoc, 'node backend/scripts/load_test_2000_users_01_check.js', 'load-test doc mentions canonical check command');
  must(loadTestDoc, 'backend/scripts/load_test_2000_users_01_harness.js', 'load-test doc mentions canonical harness');
  must(loadTestDoc, 'LOAD_TEST_ALLOW_HIGH_CONCURRENCY', 'load-test doc mentions high concurrency flag');
  must(loadTestDoc, 'backend/artifacts/load-test/load_test_2000_users_01_report.json', 'load-test doc mentions generated report path');
  must(loadTestDoc, 'DB-POOL-AND-API-SCALING-01', 'load-test doc mentions next milestone');
  must(loadTestDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'load-test doc mentions observability handoff');
  must(dashboardBulkDoc, 'DB-POOL-AND-API-SCALING-01', 'dashboard bulk doc references db scaling milestone');
  must(dashboardBulkDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'dashboard bulk doc references observability milestone');
  must(cacheDoc, 'DB-POOL-AND-API-SCALING-01', 'cache coalescing doc references db scaling milestone');
  must(cacheDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'cache coalescing doc references observability milestone');
  must(requestStormDoc, 'DB-POOL-AND-API-SCALING-01', 'request storm doc references db scaling milestone');
  must(requestStormDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'request storm doc references observability milestone');
  must(policyDoc, 'DB-POOL-AND-API-SCALING-01', 'production policy doc references db scaling milestone');
  must(policyDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'production policy doc references observability milestone');
  must(dbScalingDoc, '# DB-POOL-AND-API-SCALING-01', 'db scaling doc title present');
  must(dbScalingDoc, '## 1) Purpose', 'db scaling doc purpose heading present');
  must(dbScalingDoc, '## 5) API concurrency policy', 'db scaling doc api concurrency heading present');
  must(dbScalingDoc, '## 12) Local/dev-safe probe policy', 'db scaling doc probe heading present');
  must(dbScalingDoc, '## 19) Next recommended milestone', 'db scaling doc next milestone heading present');
  must(dbScalingDoc, 'check:dbpoolandapiscaling01', 'db scaling doc mentions canonical check alias');
  must(dbScalingDoc, 'node backend/scripts/db_pool_and_api_scaling_01_check.js', 'db scaling doc mentions canonical check command');
  must(dbScalingDoc, 'backend/scripts/db_pool_and_api_scaling_01_probe.js', 'db scaling doc mentions probe helper');
  must(dbScalingDoc, 'DB_SCALING_ALLOW_HIGH_CONCURRENCY', 'db scaling doc mentions high concurrency flag');
  must(dbScalingDoc, 'DB_SCALING_ALLOW_AUTH_ENDPOINTS', 'db scaling doc mentions auth opt-in flag');
  must(dbScalingDoc, 'DB_SCALING_WRITE_REPORT', 'db scaling doc mentions report write flag');
  must(dbScalingDoc, 'backend/artifacts/db-scaling/db_pool_and_api_scaling_01_report.json', 'db scaling doc mentions report path');
  must(dbScalingDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'db scaling doc mentions observability milestone');
  must(observabilityDoc, '# OBSERVABILITY-MONITORING-ALERTING-01', 'observability doc title present');
  must(observabilityDoc, '## 3) Observability signal model', 'observability doc signal model heading present');
  must(observabilityDoc, '## 6) Alert matrix', 'observability doc alert matrix heading present');
  must(observabilityDoc, '## 10) Local/dev-safe probe policy', 'observability doc probe policy heading present');
  must(observabilityDoc, '## 16) Next recommended milestone', 'observability doc next milestone heading present');
  must(observabilityDoc, 'check:observabilitymonitoringalerting01', 'observability doc mentions canonical check alias');
  must(observabilityDoc, 'node backend/scripts/observability_monitoring_alerting_01_check.js', 'observability doc mentions canonical check command');
  must(observabilityDoc, 'backend/scripts/observability_monitoring_alerting_01_probe.js', 'observability doc mentions probe helper');
  must(observabilityDoc, 'backend/artifacts/observability/observability_monitoring_alerting_01_report.json', 'observability doc mentions generated report path');
  must(observabilityDoc, 'UX-SUPERADMIN-LIVE-MONITORING-01', 'observability doc mentions next milestone');
  must(backendLintDoc, '# BACKEND-LINT-WARNING-BURNDOWN-01', 'backend lint burndown doc title present');
  must(backendLintDoc, 'check:backendlintwarningburndown01', 'backend lint burndown doc mentions canonical check alias');
  must(backendLintDoc, 'node backend/scripts/backend_lint_warning_burndown_01_check.js', 'backend lint burndown doc mentions canonical check command');
  must(backendLintDoc, '0 error / 0 warning', 'backend lint burndown doc mentions final zero-warning state');
  must(backendLintDoc, 'DATA-INTEGRITY-AND-RECOVERY-01', 'backend lint burndown doc mentions next milestone');
  must(dataIntegrityDoc, '# DATA-INTEGRITY-AND-RECOVERY-01', 'data integrity doc title present');
  must(dataIntegrityDoc, 'check:dataintegrityandrecovery01', 'data integrity doc mentions canonical check alias');
  must(dataIntegrityDoc, 'node backend/scripts/data_integrity_and_recovery_01_check.js', 'data integrity doc mentions canonical check command');
  must(dataIntegrityDoc, 'backend/src/lib/jsonFileStore.js', 'data integrity doc mentions jsonFileStore');
  must(dataIntegrityDoc, 'backend/src/routes/admin.js', 'data integrity doc mentions admin route');
  must(dataIntegrityDoc, 'backend/src/ops/backupArchiveOps.js', 'data integrity doc mentions backup archive ops');
  must(dataIntegrityDoc, 'backend/scripts/m45_backup_create.js', 'data integrity doc mentions backup create script');
  must(dataIntegrityDoc, 'backend/scripts/m45_backup_restore.js', 'data integrity doc mentions backup restore script');
  must(dataIntegrityDoc, 'backend/artifacts/runtime-data/', 'data integrity doc mentions runtime-data artifact path');
  must(dataIntegrityDoc, 'backend/artifacts/browser-smoke/', 'data integrity doc mentions browser-smoke artifact path');
  must(dataIntegrityDoc, 'backend/artifacts/load-test/', 'data integrity doc mentions load-test artifact path');
  must(dataIntegrityDoc, 'backend/artifacts/db-scaling/', 'data integrity doc mentions db-scaling artifact path');
  must(dataIntegrityDoc, 'backend/artifacts/observability/', 'data integrity doc mentions observability artifact path');
  must(dataIntegrityDoc, 'backend/artifacts/data-integrity/', 'data integrity doc mentions data-integrity artifact path');
  must(dataIntegrityDoc, 'verify:repo', 'data integrity doc mentions verify repo');
  must(dataIntegrityDoc, 'verify:final', 'data integrity doc mentions verify final');
  must(dataIntegrityDoc, 'npm --prefix backend run lint', 'data integrity doc mentions backend lint');
  must(dataIntegrityDoc, 'npm --prefix web run lint', 'data integrity doc mentions web lint');
  must(dataIntegrityDoc, 'RUNBOOK_M45_RETENTION_BACKUP.md', 'data integrity doc mentions retention backup runbook');
  must(dataIntegrityDoc, 'REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md', 'data integrity doc mentions archive export restore doc');
  must(dataIntegrityDoc, 'SECURITY-KVKK-FINAL-01', 'data integrity doc mentions security final');
  must(securityDoc, '# SECURITY-KVKK-FINAL-01', 'security doc title present');
  must(securityDoc, 'check:securitykvkkfinal01', 'security doc mentions canonical check alias');
  must(securityDoc, 'node backend/scripts/security_kvkk_final_01_check.js', 'security doc mentions canonical check command');
  must(observabilityProbe, 'OBSERVABILITY_BASE_URL must stay local/dev-safe', 'observability probe mentions local-only base url');
  must(observabilityProbe, 'OBSERVABILITY_ALLOW_AUTH_ENDPOINTS=true requires OBSERVABILITY_AUTH_TOKEN', 'observability probe mentions auth opt-in');
  must(observabilityProbe, '/api/observability/health-summary', 'observability probe mentions health summary endpoint');
  must(observabilityProbe, '/api/observability/event-types', 'observability probe mentions event types endpoint');
  must(observabilityProbe, 'method: "GET"', 'observability probe uses GET');
  must(observabilityProbe, 'PASS OBSERVABILITY-MONITORING-ALERTING-01 PROBE', 'observability probe success marker present');
  must(dashboardBulkDoc, '# DASHBOARD-BULK-ENDPOINT-01', 'dashboard bulk doc title present');
  must(dashboardBulkDoc, '## 1) Purpose', 'dashboard bulk doc purpose heading present');
  must(dashboardBulkDoc, '## 2) Problem statement', 'dashboard bulk doc problem statement heading present');
  must(dashboardBulkDoc, '## 3) Bulk policy', 'dashboard bulk doc bulk policy heading present');
  must(dashboardBulkDoc, '## 4) Backend implementation', 'dashboard bulk doc backend implementation heading present');
  must(dashboardBulkDoc, '## 5) Frontend integration', 'dashboard bulk doc frontend integration heading present');
  must(dashboardBulkDoc, '## 6) New guard script', 'dashboard bulk doc new guard script heading present');
  must(dashboardBulkDoc, '## 7) Validation', 'dashboard bulk doc validation heading present');
  must(dashboardBulkDoc, '## 8) Smoke expectations', 'dashboard bulk doc smoke expectations heading present');
  must(dashboardBulkDoc, '## 9) Diff / boundary safety', 'dashboard bulk doc diff safety heading present');
  must(dashboardBulkDoc, '## 10) Remaining risks', 'dashboard bulk doc remaining risks heading present');
  must(dashboardBulkDoc, '## 11) Next recommended milestone', 'dashboard bulk doc next milestone heading present');
  must(dashboardBulkDoc, 'check:dashboardbulkendpoint01', 'dashboard bulk doc canonical check present');
  must(dashboardBulkDoc, 'backend/scripts/dashboard_bulk_endpoint_01_check.js', 'dashboard bulk doc command present');
  must(dashboardBulkDoc, 'read-only bulk endpoint', 'dashboard bulk doc read-only wording present');
  must(dashboardBulkDoc, 'write-action', 'dashboard bulk doc write-action boundary present');
  must(dashboardBulkDoc, 'human approval', 'dashboard bulk doc human approval boundary present');
  must(dashboardBulkDoc, 'backend/src/routes', 'dashboard bulk doc route boundary present');
  must(dashboardBulkDoc, 'backend/src/services', 'dashboard bulk doc service boundary present');
  must(dashboardBulkDoc, 'prisma', 'dashboard bulk doc prisma boundary present');
  must(dashboardBulkDoc, 'backend/prisma', 'dashboard bulk doc backend prisma boundary present');
  must(dashboardBulkDoc, 'browser-smoke', 'dashboard bulk doc browser-smoke boundary present');
  must(dashboardBulkDoc, 'runtime-data', 'dashboard bulk doc runtime-data boundary present');
  must(dashboardBulkDoc, 'debug.log', 'dashboard bulk doc debug.log boundary present');
  must(dashboardBulkDoc, 'CACHE-COALESCING-AND-BACKOFF-01', 'dashboard bulk doc references cache coalescing and backoff milestone');
  must(dashboardBulkDoc, 'REQUEST-STORM-RESILIENCE-01', 'dashboard bulk doc references request storm resilience milestone');
  must(dashboardBulkDoc, 'PRODUCTION-RATE-LIMIT-POLICY-01', 'dashboard bulk doc references production rate limit policy milestone');
  must(dashboardBulkDoc, 'LOAD-TEST-2000-USERS-01', 'dashboard bulk doc references load-test milestone');
  must(cacheDoc, '# CACHE-COALESCING-AND-BACKOFF-01', 'cache coalescing doc title present');
  must(cacheDoc, '## 1) Purpose', 'cache coalescing doc purpose heading present');
  must(cacheDoc, '## 2) Problem statement', 'cache coalescing doc problem statement heading present');
  must(cacheDoc, '## 3) Coalescing policy', 'cache coalescing doc coalescing policy heading present');
  must(cacheDoc, '## 4) Cache key isolation model', 'cache coalescing doc cache key isolation heading present');
  must(cacheDoc, '## 5) Backoff / retry policy', 'cache coalescing doc backoff heading present');
  must(cacheDoc, '## 6) Backend implementation', 'cache coalescing doc backend implementation heading present');
  must(cacheDoc, '## 7) Frontend integration', 'cache coalescing doc frontend integration heading present');
  must(cacheDoc, '## 8) New guard script', 'cache coalescing doc guard script heading present');
  must(cacheDoc, '## 9) Validation', 'cache coalescing doc validation heading present');
  must(cacheDoc, '## 10) Diff / boundary safety', 'cache coalescing doc diff safety heading present');
  must(cacheDoc, '## 11) Remaining risks', 'cache coalescing doc remaining risks heading present');
  must(cacheDoc, '## 12) Next recommended milestone', 'cache coalescing doc next milestone heading present');
  must(cacheDoc, 'backend/src/utils/responseCache.js', 'cache coalescing doc response cache source present');
  must(cacheDoc, 'web/src/utils/uiDataCache.js', 'cache coalescing doc ui cache source present');
  must(cacheDoc, 'backend/src/services/dashboardBulk.js', 'cache coalescing doc dashboard bulk service source present');
  must(cacheDoc, 'web/src/utils/dashboardBulk.js', 'cache coalescing doc dashboard bulk helper source present');
  must(cacheDoc, 'REQUEST-STORM-RESILIENCE-01', 'cache coalescing doc references request storm resilience milestone');
  must(cacheDoc, 'PRODUCTION-RATE-LIMIT-POLICY-01', 'cache coalescing doc references production rate limit policy milestone');
  must(cacheDoc, 'LOAD-TEST-2000-USERS-01', 'cache coalescing doc references load-test milestone');
  must(requestStormDoc, 'CACHE-COALESCING-AND-BACKOFF-01', 'request storm doc references cache coalescing and backoff milestone');
  must(requestStormDoc, 'LOAD-TEST-2000-USERS-01', 'request storm doc references load-test milestone');
  must(policyDoc, 'CACHE-COALESCING-AND-BACKOFF-01', 'production policy doc references cache coalescing and backoff milestone');
  must(policyDoc, 'LOAD-TEST-2000-USERS-01', 'production policy doc references load-test milestone');
  ordered(primer, ['COPILOT-DYNAMIC-QUESTION-ENGINE-01', 'COPILOT-SMART-DIAGNOSTIC-ENGINE-01', 'COPILOT-ROOT-CAUSE-ENGINE-01', 'COPILOT-RISK-SCORING-ENGINE-01', 'COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'COPILOT-PLAN-REVIEW-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'HOT-FILE-SPLIT-WEB-PANELS-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'SEFER-ABI-REASONING-ASSISTANT-01', 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01'], 'primer keeps next best action between operation health and hot file split');
  must(primer, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'primer mentions reasoning answer composer milestone');
  must(primer, 'check:copilotreasoninganswercomposer01', 'primer exposes reasoning answer composer check');
  must(primer, 'docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md', 'primer links reasoning answer composer doc');
  must(primer, 'backend/src/ai/chat/copilotReasoningAnswerComposer.js', 'primer links reasoning answer composer helper');
  must(primer, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'primer mentions all-roles reasoning assistant milestone');
  must(primer, 'check:seferabiallrolesreasoningassistant01', 'primer exposes all-roles reasoning assistant check');
  must(primer, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'primer links all-roles reasoning assistant doc');
  must(primer, 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01', 'primer mentions Turkish user-facing language audit milestone');
  must(primer, 'check:seferabiturkishuserfacinglanguage01', 'primer exposes Turkish user-facing language audit check');
  must(primer, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'primer links Turkish user-facing language audit doc');
  must(primer, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'primer mentions Turkish user-facing terminology audit milestone');
  must(primer, 'check:seferabiturkishterminology01', 'primer exposes Turkish user-facing terminology audit check');
  must(primer, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'primer links Turkish user-facing terminology audit doc');
  must(roleMatrix, 'SEFER-ABI-REASONING-ASSISTANT-01', 'role/task matrix references reasoning assistant milestone');
  must(roleMatrix, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'role/task matrix references all-roles reasoning assistant milestone');
  must(roleMatrix, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'role/task matrix references reasoning answer composer milestone');
  must(aiRoadmap, 'SEFER-ABI-REASONING-ASSISTANT-01', 'AI action roadmap references reasoning assistant milestone');
  must(aiRoadmap, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'AI action roadmap references all-roles reasoning assistant milestone');
  must(aiRoadmap, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'AI action roadmap references reasoning answer composer milestone');
  must(guidedDoc, 'SEFER-ABI-REASONING-ASSISTANT-01', 'guided task engine doc references reasoning assistant milestone');
  must(guidedDoc, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'guided task engine doc references all-roles reasoning assistant milestone');
  must(guidedDoc, 'Golden pack test/kabul içindir', 'guided task engine doc keeps golden pack test-only wording');
  must(dynamicDoc, '# COPILOT DYNAMIC QUESTION ENGINE 01', 'dynamic question engine doc title present');
  must(dynamicDoc, 'Canonical check: `check:copilotdynamicquestionengine01`', 'dynamic question engine doc keeps canonical check wording');
  must(dynamicDoc, 'conversationTaskStateResponses.js', 'dynamic question engine doc mentions canonical helper');
  must(dynamicDoc, 'conversationTaskStateDynamicQuestions.js', 'dynamic question engine doc mentions dynamic helper');
  must(dynamicDoc, 'helpComposer.js', 'dynamic question engine doc mentions help composer');
  must(dynamicDoc, 'seferAbiReasoningAssistant.js', 'dynamic question engine doc mentions reasoning assistant');
  must(dynamicDoc, 'copilotGuidedTaskEngine.js', 'dynamic question engine doc mentions guided task engine');
  must(dynamicDoc, 'Netleştirelim', 'dynamic question engine doc keeps clarifying phrasing');
  must(dynamicDoc, 'Devam edelim', 'dynamic question engine doc keeps continue phrasing');
  must(smartDiagnosticDoc, '# COPILOT SMART DIAGNOSTIC ENGINE 01', 'smart diagnostic engine doc title present');
  must(smartDiagnosticDoc, 'Canonical check: `check:copilotsmartdiagnosticengine01`', 'smart diagnostic engine doc keeps canonical check wording');
  must(smartDiagnosticDoc, 'conversationSmartDiagnostics.js', 'smart diagnostic engine doc mentions canonical helper');
  must(smartDiagnosticDoc, 'conversationTaskStateDynamicQuestions.js', 'smart diagnostic engine doc mentions dynamic helper');
  must(smartDiagnosticDoc, 'helpComposer.js', 'smart diagnostic engine doc mentions help composer');
  must(smartDiagnosticDoc, 'seferAbiReasoningAssistant.js', 'smart diagnostic engine doc mentions reasoning assistant');
  must(smartDiagnosticDoc, 'Netleştirelim', 'smart diagnostic engine doc keeps diagnostic clarification phrasing');
  must(smartDiagnosticDoc, 'Devam edelim', 'smart diagnostic engine doc keeps diagnostic continuation phrasing');
  must(harnessCheck, 'check:copilotrootcauseengine01', 'script harness check knows root cause engine alias');
  must(harnessCheck, 'root:check:copilotrootcauseengine01', 'script harness check knows root cause engine root check');
  must(harnessCheck, 'COPILOT-ROOT-CAUSE-ENGINE-01', 'script harness check knows root cause engine milestone');
  must(harnessCheck, 'docs/COPILOT_ROOT_CAUSE_ENGINE_01.md', 'script harness check knows root cause engine doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationRootCauseEngine.js', 'script harness check knows root cause engine helper');
  must(harnessCheck, 'check:copilotriskscoringengine01', 'script harness check knows risk scoring engine alias');
  must(harnessCheck, 'root:check:copilotriskscoringengine01', 'script harness check knows risk scoring engine root check');
  must(harnessCheck, 'COPILOT-RISK-SCORING-ENGINE-01', 'script harness check knows risk scoring engine milestone');
  must(harnessCheck, 'docs/COPILOT_RISK_SCORING_ENGINE_01.md', 'script harness check knows risk scoring engine doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'script harness check knows risk scoring engine helper');
  must(harnessCheck, 'check:copilotworkflowreasoningengine01', 'script harness check knows workflow reasoning engine alias');
  must(harnessCheck, 'root:check:copilotworkflowreasoningengine01', 'script harness check knows workflow reasoning engine root check');
  must(harnessCheck, 'COPILOT-WORKFLOW-REASONING-ENGINE-01', 'script harness check knows workflow reasoning engine milestone');
  must(harnessCheck, 'docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md', 'script harness check knows workflow reasoning engine doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'script harness check knows workflow reasoning engine helper');
  must(harnessCheck, 'check:copilotoperationhealthengine01', 'script harness check knows operation health alias');
  must(harnessCheck, 'root:check:copilotoperationhealthengine01', 'script harness check knows operation health root check');
  must(harnessCheck, 'COPILOT-OPERATION-HEALTH-ENGINE-01', 'script harness check knows operation health milestone');
  must(harnessCheck, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'script harness check knows operation health doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'script harness check knows operation health helper');
  must(harnessCheck, 'check:copilotnextbestactionengine01', 'script harness check knows next best action alias');
  must(harnessCheck, 'root:check:copilotnextbestactionengine01', 'script harness check knows next best action root check');
  must(harnessCheck, 'COPILOT-NEXT-BEST-ACTION-ENGINE-01', 'script harness check knows next best action milestone');
  must(harnessCheck, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'script harness check knows next best action doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'script harness check knows next best action helper');
  must(harnessCheck, 'check:copilotplanreviewengine01', 'script harness check knows plan review alias');
  must(harnessCheck, 'root:check:copilotplanreviewengine01', 'script harness check knows plan review root check');
  must(harnessCheck, 'COPILOT-PLAN-REVIEW-ENGINE-01', 'script harness check knows plan review milestone');
  must(harnessCheck, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'script harness check knows plan review doc');
  must(harnessCheck, 'backend/src/ai/chat/conversationPlanReviewEngine.js', 'script harness check knows plan review helper');
  must(harnessCheck, 'check:hotfilesplitaichatcomposers01', 'script harness check knows hot file split alias');
  must(harnessCheck, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'script harness check knows hot file split milestone');
  must(harnessCheck, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'script harness check knows hot file split doc');
  must(harnessCheck, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'script harness check knows helpComposer safe replies helper');
  must(harnessCheck, 'check:hotfilesplitwebpanels01', 'script harness check knows hot file split web panels alias');
  must(harnessCheck, 'HOT-FILE-SPLIT-WEB-PANELS-01', 'script harness check knows hot file split web panels milestone');
  must(harnessCheck, 'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md', 'script harness check knows hot file split web panels doc');
  must(harnessCheck, 'web/src/panels/company/companyAgreementsBridgeSection.jsx', 'script harness check knows company bridge split file');
  must(harnessCheck, 'web/src/panels/room/roomAgreementsBridgeSection.jsx', 'script harness check knows room bridge split file');
  must(harnessCheck, 'check:seferabiturkishterminology01', 'script harness check knows terminology audit alias');
  must(harnessCheck, 'root:check:seferabiturkishterminology01', 'script harness check knows terminology audit root check');
  must(harnessCheck, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'script harness check knows terminology audit milestone');
  must(harnessCheck, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'script harness check knows terminology audit doc');
  must(harnessCheck, 'backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js', 'script harness check knows terminology audit file');
  must(rootCauseDoc, '# COPILOT ROOT CAUSE ENGINE 01', 'root cause engine doc title present');
  must(rootCauseDoc, 'Canonical check: `check:copilotrootcauseengine01`', 'root cause engine doc keeps canonical check wording');
  must(rootCauseDoc, 'conversationRootCauseEngine.js', 'root cause engine doc mentions canonical helper');
  must(rootCauseDoc, 'helpComposer.js', 'root cause engine doc mentions help composer');
  must(rootCauseDoc, 'seferAbiReasoningAssistant.js', 'root cause engine doc mentions reasoning assistant');
  must(rootCauseDoc, 'answerQualityPolicy.js', 'root cause engine doc mentions answer quality policy');
  must(riskScoringDoc, '# COPILOT RISK SCORING ENGINE 01', 'risk scoring engine doc title present');
  must(riskScoringDoc, 'Canonical check: `check:copilotriskscoringengine01`', 'risk scoring engine doc keeps canonical check wording');
  must(riskScoringDoc, 'conversationRiskScoringEngine.js', 'risk scoring engine doc mentions canonical helper');
  must(riskScoringDoc, 'helpComposer.js', 'risk scoring engine doc mentions help composer');
  must(riskScoringDoc, 'seferAbiReasoningAssistant.js', 'risk scoring engine doc mentions reasoning assistant');
  must(clarifyingDoc, '# COPILOT CLARIFYING QUESTION ENGINE 01', 'clarifying question engine doc title present');
  must(clarifyingDoc, 'Canonical check: `check:copilotclarifyingquestionengine01`', 'clarifying question engine doc keeps canonical check wording');
  must(clarifyingDoc, 'conversationTaskStateResponses.js', 'clarifying question engine doc keeps canonical helper wording');
  must(clarifyingDoc, 'helpComposer.js', 'clarifying question engine doc mentions help composer');
  must(clarifyingDoc, 'seferAbiReasoningAssistant.js', 'clarifying question engine doc mentions reasoning assistant');
  must(clarifyingDoc, 'copilotGuidedTaskEngine.js', 'clarifying question engine doc mentions guided task engine');
  must(clarifyingDoc, 'Netleştirelim', 'clarifying question engine doc keeps clarifying phrasing');
  must(clarifyingDoc, 'Alternatif', 'clarifying question engine doc keeps alternative phrasing');
  must(reasoningDoc, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'reasoning assistant doc references reasoning answer composer milestone');
  must(reasoningDoc, 'backend/src/ai/chat/copilotReasoningAnswerComposer.js', 'reasoning assistant doc links reasoning answer composer helper');
  must(planReviewDoc, '# COPILOT PLAN REVIEW ENGINE 01', 'plan review doc title present');
  must(planReviewDoc, 'Canonical check: `check:copilotplanreviewengine01`', 'plan review doc keeps canonical check wording');
  must(planReviewDoc, 'Planlama Merkezi', 'plan review doc mentions planlama merkezi');
  must(planReviewDoc, 'Sonraki güvenli kontrol', 'plan review doc mentions next safe control');
  must(planReviewDoc, 'İnsan onayı', 'plan review doc mentions human approval');
  must(planReviewDoc, 'write-action', 'plan review doc keeps write-action boundary wording');
  must(planReviewDoc, 'route review', 'plan review doc keeps route review boundary wording');
  must(allRolesDoc, 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'all-roles reasoning assistant doc references reasoning answer composer milestone');
  must(allRolesDoc, '# SEFER ABI ALL ROLES REASONING ASSISTANT 01', 'all-roles reasoning assistant doc title present');
  must(allRolesDoc, 'Canonical check: `check:seferabiallrolesreasoningassistant01`', 'all-roles reasoning assistant doc keeps canonical check wording');
  must(allRolesDoc, 'interactionIntentFamily', 'all-roles reasoning assistant doc mentions intent family');
  must(allRolesDoc, 'Golden pack test/kabul içindir', 'all-roles reasoning assistant doc keeps golden pack test-only wording');
  must(allRolesDoc, 'reply source değildir', 'all-roles reasoning assistant doc keeps reply-source boundary');
  must(allRolesDoc, 'Runtime AI action açmaz', 'all-roles reasoning assistant doc keeps runtime boundary');
  must(allRolesDoc, 'Tool execution açmaz', 'all-roles reasoning assistant doc keeps tool boundary');
  must(allRolesDoc, 'Write-action dispatcher açmaz', 'all-roles reasoning assistant doc keeps dispatcher boundary');
  must(allRolesDoc, 'DB write açmaz', 'all-roles reasoning assistant doc keeps db boundary');
  must(allRolesDoc, 'Route apply açmaz', 'all-roles reasoning assistant doc keeps route apply boundary');
  must(allRolesDoc, 'Fake success açmaz', 'all-roles reasoning assistant doc keeps fake success boundary');
  for (const role of ['SUPER_ADMIN', 'COMPANY', 'ROOM', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
    must(allRolesDoc, role, `all-roles reasoning assistant doc covers role ${role}`);
  }
  must(terminologyDoc, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'terminology audit doc mentions canonical milestone');
  must(terminologyDoc, 'check:seferabiturkishterminology01', 'terminology audit doc exposes canonical check');
  must(terminologyDoc, 'ETA → tahmini varış süresi', 'terminology audit doc documents ETA replacement');
  must(terminologyDoc, 'GPS → konum sinyali / konum bilgisi', 'terminology audit doc documents GPS replacement');
  must(harnessDoc, 'Copilot dynamic question engine milestone: `COPILOT-DYNAMIC-QUESTION-ENGINE-01`', 'script harness doc lists dynamic question engine milestone');
  must(harnessDoc, 'root:check:copilotdynamicquestionengine01', 'script harness doc lists dynamic question engine root check');
  must(harnessDoc, 'copilot_dynamic_question_engine_01_check.js', 'script harness doc lists dynamic question engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'script harness doc lists dynamic question engine helper');
  must(harnessDoc, 'Copilot smart diagnostic engine milestone: `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`', 'script harness doc lists smart diagnostic engine milestone');
  must(harnessDoc, 'root:check:copilotsmartdiagnosticengine01', 'script harness doc lists smart diagnostic engine root check');
  must(harnessDoc, 'copilot_smart_diagnostic_engine_01_check.js', 'script harness doc lists smart diagnostic engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationSmartDiagnostics.js', 'script harness doc lists smart diagnostic engine helper');
  must(harnessDoc, 'Copilot root cause engine milestone: `COPILOT-ROOT-CAUSE-ENGINE-01`', 'script harness doc lists root cause engine milestone');
  must(harnessDoc, 'root:check:copilotrootcauseengine01', 'script harness doc lists root cause engine root check');
  must(harnessDoc, 'copilot_root_cause_engine_01_check.js', 'script harness doc lists root cause engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationRootCauseEngine.js', 'script harness doc lists root cause engine helper');
  must(harnessDoc, 'Copilot risk scoring engine milestone: `COPILOT-RISK-SCORING-ENGINE-01`', 'script harness doc lists risk scoring engine milestone');
  must(harnessDoc, 'root:check:copilotriskscoringengine01', 'script harness doc lists risk scoring engine root check');
  must(harnessDoc, 'copilot_risk_scoring_engine_01_check.js', 'script harness doc lists risk scoring engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationRiskScoringEngine.js', 'script harness doc lists risk scoring engine helper');
  must(harnessDoc, 'Copilot clarifying question engine milestone: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`', 'script harness doc lists clarifying question engine milestone');
  must(harnessDoc, 'root:check:copilotclarifyingquestionengine01', 'script harness doc lists clarifying question engine root check');
  must(harnessDoc, 'copilot_clarifying_question_engine_01_check.js', 'script harness doc lists clarifying question engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'script harness doc lists clarifying question engine helper');
  must(harnessDoc, 'Copilot workflow reasoning engine milestone: `COPILOT-WORKFLOW-REASONING-ENGINE-01`', 'script harness doc lists workflow reasoning engine milestone');
  must(harnessDoc, 'root:check:copilotworkflowreasoningengine01', 'script harness doc lists workflow reasoning engine root check');
  must(harnessDoc, 'copilot_workflow_reasoning_engine_01_check.js', 'script harness doc lists workflow reasoning engine command');
  must(harnessDoc, 'backend/src/ai/chat/conversationWorkflowReasoningEngine.js', 'script harness doc lists workflow reasoning engine helper');
  must(harnessDoc, 'Copilot operation health engine milestone: `COPILOT-OPERATION-HEALTH-ENGINE-01`', 'script harness doc lists operation health milestone');
  must(harnessDoc, 'root:check:copilotoperationhealthengine01', 'script harness doc lists operation health root check');
  must(harnessDoc, 'copilot_operation_health_engine_01_check.js', 'script harness doc lists operation health command');
  must(harnessDoc, 'backend/src/ai/chat/conversationOperationHealthEngine.js', 'script harness doc lists operation health helper');
  must(harnessDoc, 'docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md', 'script harness doc lists operation health doc');
  must(harnessDoc, 'Copilot next best action engine milestone: `COPILOT-NEXT-BEST-ACTION-ENGINE-01`', 'script harness doc lists next best action milestone');
  must(harnessDoc, 'root:check:copilotnextbestactionengine01', 'script harness doc lists next best action root check');
  must(harnessDoc, 'copilot_next_best_action_engine_01_check.js', 'script harness doc lists next best action command');
  must(harnessDoc, 'backend/src/ai/chat/conversationNextBestActionEngine.js', 'script harness doc lists next best action helper');
  must(harnessDoc, 'docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md', 'script harness doc lists next best action doc');
  must(harnessDoc, 'Copilot plan review engine milestone: `COPILOT-PLAN-REVIEW-ENGINE-01`', 'script harness doc lists plan review milestone');
  must(harnessDoc, 'root:check:copilotplanreviewengine01', 'script harness doc lists plan review root check');
  must(harnessDoc, 'copilot_plan_review_engine_01_check.js', 'script harness doc lists plan review command');
  must(harnessDoc, 'backend/src/ai/chat/conversationPlanReviewEngine.js', 'script harness doc lists plan review helper');
  must(harnessDoc, 'docs/COPILOT_PLAN_REVIEW_ENGINE_01.md', 'script harness doc lists plan review doc');
  must(harnessDoc, 'Hot file split AI chat composers milestone: `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01`', 'script harness doc lists hot file split milestone');
  must(harnessDoc, 'check:hotfilesplitaichatcomposers01', 'script harness doc lists hot file split check');
  must(harnessDoc, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'script harness doc lists hot file split doc');
  must(harnessDoc, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'script harness doc lists helpComposer safe replies helper');
  must(harnessDoc, 'Hot file split web panels milestone: `HOT-FILE-SPLIT-WEB-PANELS-01`', 'script harness doc lists hot file split web panels milestone');
  must(harnessDoc, 'check:hotfilesplitwebpanels01', 'script harness doc lists hot file split web panels check');
  must(harnessDoc, 'docs/HOT_FILE_SPLIT_WEB_PANELS_01.md', 'script harness doc lists hot file split web panels doc');
  must(harnessDoc, 'web/src/panels/company/companyAgreementsBridgeSection.jsx', 'script harness doc lists company bridge split file');
  must(harnessDoc, 'web/src/panels/room/roomAgreementsBridgeSection.jsx', 'script harness doc lists room bridge split file');
  must(harnessDoc, 'Sefer Abi reasoning assistant milestone: `SEFER-ABI-REASONING-ASSISTANT-01`', 'script harness doc lists reasoning assistant milestone');
  must(harnessDoc, 'check:seferabireasoningassistant01', 'script harness doc lists reasoning assistant check');
  must(harnessDoc, 'docs/SEFER_ABI_REASONING_ASSISTANT_01.md', 'script harness doc lists reasoning assistant doc');
  must(harnessDoc, 'node backend\\scripts\\sefer_abi_reasoning_assistant_01_check.js', 'script harness doc lists reasoning assistant command');
  must(harnessDoc, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'script harness doc lists reasoning assistant helper');
  must(harnessDoc, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'script harness doc lists all-roles reasoning assistant milestone');
  must(harnessDoc, 'check:seferabiallrolesreasoningassistant01', 'script harness doc lists all-roles reasoning assistant check');
  must(harnessDoc, 'docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md', 'script harness doc lists all-roles reasoning assistant doc');
  must(harnessDoc, 'node backend\\scripts\\sefer_abi_all_roles_reasoning_assistant_01_check.js', 'script harness doc lists all-roles reasoning assistant command');
  must(harnessDoc, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'script harness doc lists all-roles reasoning assistant helper');
  must(harnessDoc, 'SEFER-ABI-TERMINAL-HUMANIZE-01', 'script harness doc lists terminal humanize milestone');
  must(harnessDoc, 'check:seferabiterminalhumanize01', 'script harness doc lists terminal humanize check');
  must(harnessDoc, 'docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md', 'script harness doc lists terminal humanize doc');
  must(harnessDoc, 'node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js', 'script harness doc lists terminal humanize command');
  must(harnessDoc, 'backend/src/ai/chat/helpComposer.js', 'script harness doc lists terminal humanize helper');
  must(harnessDoc, 'SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01', 'script harness doc lists Turkish user-facing terminology audit milestone');
  must(harnessDoc, 'check:seferabiturkishterminology01', 'script harness doc lists Turkish user-facing terminology audit check');
  must(harnessDoc, 'docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md', 'script harness doc lists Turkish user-facing terminology audit doc');
  must(harnessDoc, 'node backend\\scripts\\sefer_abi_turkish_user_facing_terminology_01_check.js', 'script harness doc lists Turkish user-facing terminology audit command');
  must(harnessDoc, 'backend/src/ai/chat/helpComposer.js', 'script harness doc lists Turkish user-facing terminology audit helper');
  must(harnessDoc, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'script harness doc lists Turkish user-facing terminology audit reasoning surface');
  must(harnessDoc, 'SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01', 'script harness doc lists Turkish user-facing language audit milestone');
  must(harnessDoc, 'check:seferabiturkishuserfacinglanguage01', 'script harness doc lists Turkish user-facing language audit check');
  must(harnessDoc, 'docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md', 'script harness doc lists Turkish user-facing language audit doc');
  must(harnessDoc, 'node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js', 'script harness doc lists Turkish user-facing language audit command');
  must(harnessDoc, 'backend/src/ai/chat/helpComposer.js', 'script harness doc lists Turkish user-facing language audit helper');
  must(harnessDoc, 'backend/src/ai/chat/seferAbiReasoningAssistant.js', 'script harness doc lists Turkish user-facing language audit reasoning surface');
  ordered(harnessDoc, ['Copilot guided task engine milestone: `COPILOT-GUIDED-TASK-ENGINE-01`', 'Copilot dynamic question engine milestone: `COPILOT-DYNAMIC-QUESTION-ENGINE-01`', 'Copilot smart diagnostic engine milestone: `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`', 'Copilot root cause engine milestone: `COPILOT-ROOT-CAUSE-ENGINE-01`', 'Copilot risk scoring engine milestone: `COPILOT-RISK-SCORING-ENGINE-01`', 'Copilot clarifying question engine milestone: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`', 'Copilot workflow reasoning engine milestone: `COPILOT-WORKFLOW-REASONING-ENGINE-01`', 'Copilot operation health engine milestone: `COPILOT-OPERATION-HEALTH-ENGINE-01`', 'Copilot next best action engine milestone: `COPILOT-NEXT-BEST-ACTION-ENGINE-01`', 'Copilot plan review engine milestone: `COPILOT-PLAN-REVIEW-ENGINE-01`', 'Hot file split AI chat composers milestone: `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01`', 'Hot file split web panels milestone: `HOT-FILE-SPLIT-WEB-PANELS-01`', 'Sefer Abi reasoning assistant milestone: `SEFER-ABI-REASONING-ASSISTANT-01`', 'Sefer Abi all-roles reasoning assistant milestone: `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`', 'Sefer Abi terminal humanize milestone: `SEFER-ABI-TERMINAL-HUMANIZE-01`', 'Sefer Abi Turkish user-facing terminology audit milestone: `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01`', 'Sefer Abi Turkish user-facing language audit milestone: `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01`'], 'script harness doc keeps next best action between operation health and plan review');
  must(roadmap, 'VERIFIED-SUPPLIER-01', 'roadmap keeps verified supplier milestone');
  must(roadmap, 'Verified supplier guard', 'roadmap keeps verified supplier guard section');
  must(roadmap, 'docs/VERIFIED_SUPPLIER_01.md', 'roadmap links verified supplier doc');
  must(roadmap, 'human approval', 'roadmap keeps human approval wording for verified supplier');
  must(roadmap, 'guard', 'roadmap keeps guard wording for verified supplier');
  must(roadmap, 'audit log', 'roadmap keeps audit log wording for verified supplier');
  must(roadmap, 'Marketplace panels guard', 'roadmap keeps marketplace panels guard section');
  must(roadmap, 'UX-MARKETPLACE-PANELS-01', 'roadmap keeps marketplace panels milestone');
  must(roadmap, 'marketplace readiness center', 'roadmap keeps marketplace readiness wording');
  must(roadmap, 'Hazırla, İncele, Önizle, Onaya sun', 'roadmap keeps human approval wording for marketplace panels');
  must(roadmap, 'Marketplace auto-selection yok', 'roadmap excludes marketplace auto-selection');
  must(roadmap, 'offer ranking', 'roadmap excludes offer ranking for marketplace panels');
  must(roadmap, 'payment/billing', 'roadmap excludes payment/billing for marketplace panels');
  must(roadmap, 'contract/agreement execute', 'roadmap excludes contract execute for marketplace panels');
  must(roadmap, 'email/SMS/push', 'roadmap excludes email/SMS/push for marketplace panels');
  must(roadmap, 'AI runtime action', 'roadmap excludes AI runtime action for marketplace panels');
  must(roadmap, 'backend route/service/schema', 'roadmap excludes backend route/service/schema for marketplace panels');
  must(roadmap, 'Prisma/schema/migration', 'roadmap excludes Prisma/schema/migration for marketplace panels');
  must(roadmap, 'runtime-data/browser-smoke commit dışı', 'roadmap keeps runtime-data/browser-smoke out of scope for marketplace panels');
  must(roadmap, 'docs/UX_MARKETPLACE_PANELS_01.md', 'roadmap links marketplace panels doc');
  must(roadmap, 'M44-TELEMATICS-T1-T5', 'roadmap keeps M44 telematics T1/T5 milestone');
  must(roadmap, 'TELEMATICS-PROVIDER-HUB-01', 'roadmap keeps telematics provider hub milestone');
  must(roadmap, 'provider-agnostic GPS provider hub', 'roadmap keeps provider-agnostic telematics hub wording');
  must(roadmap, 'readonly safe-drive risk summary', 'roadmap keeps safe drive summary wording');
  must(roadmap, 'İnsan onayı gerekir', 'roadmap keeps human approval wording');
  must(roadmap, 'SEFER-ABI-REASONING-ASSISTANT-01', 'roadmap keeps reasoning assistant milestone');
  must(roadmap, 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01', 'roadmap keeps all-roles reasoning assistant milestone');
  ordered(roadmap, ['SEFER-ABI-REASONING-ASSISTANT-01', 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01'], 'roadmap keeps all-roles milestone after base reasoning assistant');
  ordered(roadmap, ['M44-TELEMATICS-T1-T5', 'TELEMATICS-PROVIDER-HUB-01', 'SAFE-DRIVE-01', 'OFFER-RANKING-QUALITY-01'], 'roadmap keeps telematics provider hub before safe drive and offer ranking');
  must(finalAuditDoc, 'INVITE-BASED-MEMBERSHIP-01', 'final audit doc points to invite-based membership next milestone');
  must(finalAuditDoc, 'public lead otomatik kullanıcı / account olmaz', 'final audit doc keeps public lead account boundary');
  must(finalAuditDoc, 'invite draft', 'final audit doc mentions invite draft boundary');
  must(finalAuditDoc, 'pending invite', 'final audit doc mentions pending invite boundary');
  must(finalAuditDoc, 'human approval', 'final audit doc keeps human approval wording');
  must(finalAuditDoc, 'guard', 'final audit doc keeps guard wording');
  must(finalAuditDoc, 'audit log', 'final audit doc keeps audit log wording');
  must(finalAuditDoc, 'supplier verification execute açılmaz', 'final audit doc keeps supplier verification execute boundary');
  must(inviteDoc, 'INVITE-BASED-MEMBERSHIP-01', 'invite membership doc title present');
  must(inviteDoc, 'insan onaylı davetli üyelik', 'invite membership doc describes human-approved invite flow');
  must(inviteDoc, 'ONBOARDING-REVIEW-01 FINAL AUDIT', 'invite membership doc anchors after onboarding final audit');
  must(inviteDoc, 'invite draft', 'invite membership doc mentions invite draft');
  must(inviteDoc, 'pending invite', 'invite membership doc mentions pending invite');
  must(inviteDoc, 'public leads do not automatically become users/accounts', 'invite membership doc keeps public lead boundary');
  must(inviteDoc, 'no self-service signup', 'invite membership doc excludes self-service signup');
  must(inviteDoc, 'no automatic membership', 'invite membership doc excludes automatic membership');
  must(inviteDoc, 'no automatic company / room membership', 'invite membership doc excludes automatic company/room membership');
  must(inviteDoc, 'no user creation without human approval', 'invite membership doc requires human approval for user creation');
  must(inviteDoc, 'no payment', 'invite membership doc excludes payment');
  must(inviteDoc, 'no contract execute', 'invite membership doc excludes contract execute');
  must(inviteDoc, 'no supplier verification auto', 'invite membership doc excludes supplier verification auto');
  must(inviteDoc, 'no email', 'invite membership doc excludes email');
  must(inviteDoc, 'no SMS', 'invite membership doc excludes SMS');
  must(inviteDoc, 'no push', 'invite membership doc excludes push');
  must(inviteDoc, 'no schema change', 'invite membership doc excludes schema change');
  must(inviteDoc, 'no runtime feature', 'invite membership doc excludes runtime feature');
  must(inviteDoc, 'human approval', 'invite membership doc keeps human approval wording');
  must(inviteDoc, 'guard', 'invite membership doc keeps guard wording');
  must(inviteDoc, 'audit log', 'invite membership doc keeps audit log wording');
  must(inviteDoc, 'VERIFIED-SUPPLIER-01', 'invite membership doc points to verified supplier milestone');
  must(verifiedDoc, '# VERIFIED-SUPPLIER-01', 'verified supplier doc title present');
  must(verifiedDoc, 'insan onaylı tedarikçi doğrulama hazırlığı', 'verified supplier doc describes human-approved verification prep');
  must(verifiedDoc, 'checklist', 'verified supplier doc contains checklist section');
  must(verifiedDoc, 'VERIFICATION_NOT_STARTED', 'verified supplier doc contains status vocabulary');
  must(verifiedDoc, 'VERIFICATION_APPROVED', 'verified supplier doc contains approval status vocabulary');
  must(verifiedDoc, 'VERIFICATION_REVOKED', 'verified supplier doc contains revoked status vocabulary');
  must(verifiedDoc, 'human approval', 'verified supplier doc keeps human approval wording');
  must(verifiedDoc, 'guard', 'verified supplier doc keeps guard wording');
  must(verifiedDoc, 'audit log', 'verified supplier doc keeps audit log wording');
  must(verifiedDoc, 'no runtime feature', 'verified supplier doc excludes runtime feature');
  must(verifiedDoc, 'no UI feature', 'verified supplier doc excludes UI feature');
  must(verifiedDoc, 'schema değişikliği yok.', 'verified supplier doc excludes schema change');
  must(verifiedDoc, 'no payment/billing', 'verified supplier doc excludes payment/billing');
  must(verifiedDoc, 'no contract execute', 'verified supplier doc excludes contract execute');
  must(verifiedDoc, 'no offer ranking', 'verified supplier doc excludes offer ranking');
  must(verifiedDoc, 'no marketplace auto-selection', 'verified supplier doc excludes marketplace auto-selection');
  must(verifiedDoc, 'no email/SMS/push', 'verified supplier doc excludes email/sms/push');
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
  must(harnessCheck, 'TEST-QUALITY-AND-FLAKE-AUDIT-01', 'script harness check knows test quality and flake audit milestone');
  must(harnessCheck, 'check:testqualityandflakeaudit01', 'script harness check knows test quality and flake audit alias');
  must(harnessCheck, 'root:check:testqualityandflakeaudit01', 'script harness check knows test quality and flake audit root check');
  must(harnessCheck, 'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md', 'script harness check knows test quality and flake audit doc');
  must(harnessCheck, 'backend/scripts/test_quality_and_flake_audit_01_check.js', 'script harness check knows test quality and flake audit command');
  must(harnessCheck, 'DASHBOARD-BULK-ENDPOINT-01', 'script harness check knows dashboard bulk endpoint milestone');
  must(harnessCheck, 'check:dashboardbulkendpoint01', 'script harness check knows dashboard bulk endpoint alias');
  must(harnessCheck, 'docs/DASHBOARD_BULK_ENDPOINT_01.md', 'script harness check knows dashboard bulk endpoint doc');
  must(harnessCheck, 'backend/scripts/dashboard_bulk_endpoint_01_check.js', 'script harness check knows dashboard bulk endpoint command');
  must(harnessCheck, 'CACHE-COALESCING-AND-BACKOFF-01', 'script harness check knows cache coalescing and backoff milestone');
  must(harnessCheck, 'check:cachecoalescingandbackoff01', 'script harness check knows cache coalescing and backoff alias');
  must(harnessCheck, 'docs/CACHE_COALESCING_AND_BACKOFF_01.md', 'script harness check knows cache coalescing and backoff doc');
  must(harnessCheck, 'backend/scripts/cache_coalescing_and_backoff_01_check.js', 'script harness check knows cache coalescing and backoff command');
  must(harnessCheck, 'REQUEST-STORM-RESILIENCE-01', 'script harness check knows request storm resilience milestone');
  must(harnessCheck, 'check:requeststormresilience01', 'script harness check knows request storm resilience alias');
  must(harnessCheck, 'root:check:requeststormresilience01', 'script harness check knows request storm resilience root check');
  must(harnessCheck, 'docs/REQUEST_STORM_RESILIENCE_01.md', 'script harness check knows request storm resilience doc');
  must(harnessCheck, 'backend/scripts/request_storm_resilience_01_check.js', 'script harness check knows request storm resilience command');
  must(harnessCheck, 'PRODUCTION-RATE-LIMIT-POLICY-01', 'script harness check knows production rate limit policy milestone');
  must(harnessCheck, 'check:productionratelimitpolicy01', 'script harness check knows production rate limit policy alias');
  must(harnessCheck, 'root:check:productionratelimitpolicy01', 'script harness check knows production rate limit policy root check');
  must(harnessCheck, 'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md', 'script harness check knows production rate limit policy doc');
  must(harnessCheck, 'backend/scripts/production_rate_limit_policy_01_check.js', 'script harness check knows production rate limit policy command');
  must(harnessCheck, 'AI-RESPONSE-SEMANTIC-QUALITY-GATE-01', 'script harness check knows AI response semantic quality gate milestone');
  must(harnessCheck, 'check:airesponsesemanticqualitygate01', 'script harness check knows AI response semantic quality gate alias');
  must(harnessCheck, 'root:check:airesponsesemanticqualitygate01', 'script harness check knows AI response semantic quality gate root check');
  must(harnessCheck, 'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md', 'script harness check knows AI response semantic quality gate doc');
  must(harnessCheck, 'backend/scripts/ai_response_semantic_quality_gate_01_check.js', 'script harness check knows AI response semantic quality gate command');
  must(harnessCheck, 'LOAD-TEST-2000-USERS-01', 'script harness check knows load-test milestone');
  must(harnessCheck, 'check:loadtest2000users01', 'script harness check knows load-test alias');
  must(harnessCheck, 'docs/LOAD_TEST_2000_USERS_01.md', 'script harness check knows load-test doc');
  must(harnessCheck, 'node backend\\scripts\\load_test_2000_users_01_check.js', 'script harness check knows load-test command');
  must(harnessCheck, 'DB-POOL-AND-API-SCALING-01', 'script harness check knows db scaling milestone');
  must(harnessCheck, 'check:dbpoolandapiscaling01', 'script harness check knows db scaling alias');
  must(harnessCheck, 'docs/DB_POOL_AND_API_SCALING_01.md', 'script harness check knows db scaling doc');
  must(harnessCheck, 'node backend\\scripts\\db_pool_and_api_scaling_01_check.js', 'script harness check knows db scaling command');
  must(harnessCheck, 'OBSERVABILITY-MONITORING-ALERTING-01', 'script harness check knows observability milestone');
  must(harnessCheck, 'check:observabilitymonitoringalerting01', 'script harness check knows observability alias');
  must(harnessCheck, 'docs/OBSERVABILITY_MONITORING_ALERTING_01.md', 'script harness check knows observability doc');
  must(harnessCheck, 'node backend\\scripts\\observability_monitoring_alerting_01_check.js', 'script harness check knows observability command');
  must(harnessCheck, 'backend\\scripts\\observability_monitoring_alerting_01_probe.js', 'script harness check knows observability probe');
  must(harnessCheck, 'BACKEND-LINT-WARNING-BURNDOWN-01', 'script harness check knows backend lint burndown milestone');
  must(harnessCheck, 'check:backendlintwarningburndown01', 'script harness check knows backend lint burndown alias');
  must(harnessCheck, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md', 'script harness check knows backend lint burndown doc');
  must(harnessCheck, 'backend\\scripts\\backend_lint_warning_burndown_01_check.js', 'script harness check knows backend lint burndown command');
  must(harnessCheck, 'DATA-INTEGRITY-AND-RECOVERY-01', 'script harness check knows data integrity milestone');
  must(harnessCheck, 'check:dataintegrityandrecovery01', 'script harness check knows data integrity alias');
  must(harnessCheck, 'docs/DATA_INTEGRITY_AND_RECOVERY_01.md', 'script harness check knows data integrity doc');
  must(harnessCheck, 'backend\\scripts\\data_integrity_and_recovery_01_check.js', 'script harness check knows data integrity command');
  must(harnessCheck, 'SECURITY-KVKK-FINAL-01', 'script harness check knows security milestone');
  must(harnessCheck, 'check:securitykvkkfinal01', 'script harness check knows security alias');
  must(harnessCheck, 'docs/SECURITY_KVKK_FINAL_01.md', 'script harness check knows security doc');
  must(harnessCheck, 'backend\\scripts\\security_kvkk_final_01_check.js', 'script harness check knows security command');
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
  must(harnessDoc, 'TEST-QUALITY-AND-FLAKE-AUDIT-01', 'script harness doc lists test quality and flake audit milestone');
  must(harnessDoc, 'check:testqualityandflakeaudit01', 'script harness doc lists test quality and flake audit alias');
  must(harnessDoc, 'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md', 'script harness doc lists test quality and flake audit doc');
  must(harnessDoc, 'node backend\\scripts\\test_quality_and_flake_audit_01_check.js', 'script harness doc lists test quality and flake audit command');
  must(harnessDoc, 'DASHBOARD-BULK-ENDPOINT-01', 'script harness doc lists dashboard bulk endpoint milestone');
  must(harnessDoc, 'check:dashboardbulkendpoint01', 'script harness doc lists dashboard bulk endpoint alias');
  must(harnessDoc, 'docs/DASHBOARD_BULK_ENDPOINT_01.md', 'script harness doc lists dashboard bulk endpoint doc');
  must(harnessDoc, 'node backend\\scripts\\dashboard_bulk_endpoint_01_check.js', 'script harness doc lists dashboard bulk endpoint command');
  must(harnessDoc, 'CACHE-COALESCING-AND-BACKOFF-01', 'script harness doc lists cache coalescing and backoff milestone');
  must(harnessDoc, 'check:cachecoalescingandbackoff01', 'script harness doc lists cache coalescing and backoff alias');
  must(harnessDoc, 'docs/CACHE_COALESCING_AND_BACKOFF_01.md', 'script harness doc lists cache coalescing and backoff doc');
  must(harnessDoc, 'node backend\\scripts\\cache_coalescing_and_backoff_01_check.js', 'script harness doc lists cache coalescing and backoff command');
  must(harnessDoc, 'REQUEST-STORM-RESILIENCE-01', 'script harness doc lists request storm resilience milestone');
  must(harnessDoc, 'check:requeststormresilience01', 'script harness doc lists request storm resilience alias');
  must(harnessDoc, 'root:check:requeststormresilience01', 'script harness doc lists request storm resilience root alias');
  must(harnessDoc, 'docs/REQUEST_STORM_RESILIENCE_01.md', 'script harness doc lists request storm resilience doc');
  must(harnessDoc, 'node backend\\scripts\\request_storm_resilience_01_check.js', 'script harness doc lists request storm resilience command');
  must(harnessDoc, 'PRODUCTION-RATE-LIMIT-POLICY-01', 'script harness doc lists production rate limit policy milestone');
  must(harnessDoc, 'check:productionratelimitpolicy01', 'script harness doc lists production rate limit policy alias');
  must(harnessDoc, 'root:check:productionratelimitpolicy01', 'script harness doc lists production rate limit policy root alias');
  must(harnessDoc, 'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md', 'script harness doc lists production rate limit policy doc');
  must(harnessDoc, 'node backend\\scripts\\production_rate_limit_policy_01_check.js', 'script harness doc lists production rate limit policy command');
  must(harnessDoc, 'AI-RESPONSE-SEMANTIC-QUALITY-GATE-01', 'script harness doc lists AI response semantic quality gate milestone');
  must(harnessDoc, 'check:airesponsesemanticqualitygate01', 'script harness doc lists AI response semantic quality gate alias');
  must(harnessDoc, 'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md', 'script harness doc lists AI response semantic quality gate doc');
  must(harnessDoc, 'node backend\\scripts\\ai_response_semantic_quality_gate_01_check.js', 'script harness doc lists AI response semantic quality gate command');
  must(harnessDoc, 'LOAD-TEST-2000-USERS-01', 'script harness doc lists load-test milestone');
  must(harnessDoc, 'check:loadtest2000users01', 'script harness doc lists load-test alias');
  must(harnessDoc, 'docs/LOAD_TEST_2000_USERS_01.md', 'script harness doc lists load-test doc');
  must(harnessDoc, 'node backend\\scripts\\load_test_2000_users_01_check.js', 'script harness doc lists load-test command');
  must(harnessDoc, 'DB-POOL-AND-API-SCALING-01', 'script harness doc lists db scaling milestone');
  must(harnessDoc, 'check:dbpoolandapiscaling01', 'script harness doc lists db scaling alias');
  must(harnessDoc, 'docs/DB_POOL_AND_API_SCALING_01.md', 'script harness doc lists db scaling doc');
  must(harnessDoc, 'node backend\\scripts\\db_pool_and_api_scaling_01_check.js', 'script harness doc lists db scaling command');
  must(harnessDoc, 'OBSERVABILITY-MONITORING-ALERTING-01', 'script harness doc lists observability milestone');
  must(harnessDoc, 'check:observabilitymonitoringalerting01', 'script harness doc lists observability alias');
  must(harnessDoc, 'docs/OBSERVABILITY_MONITORING_ALERTING_01.md', 'script harness doc lists observability doc');
  must(harnessDoc, 'node backend\\scripts\\observability_monitoring_alerting_01_check.js', 'script harness doc lists observability command');
  must(harnessDoc, 'node backend\\scripts\\observability_monitoring_alerting_01_probe.js', 'script harness doc lists observability probe');
  must(harnessDoc, 'BACKEND-LINT-WARNING-BURNDOWN-01', 'script harness doc lists backend lint burndown milestone');
  must(harnessDoc, 'check:backendlintwarningburndown01', 'script harness doc lists backend lint burndown alias');
  must(harnessDoc, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md', 'script harness doc lists backend lint burndown doc');
  must(harnessDoc, 'node backend\\scripts\\backend_lint_warning_burndown_01_check.js', 'script harness doc lists backend lint burndown command');
  must(harnessDoc, 'DATA-INTEGRITY-AND-RECOVERY-01', 'script harness doc lists data integrity milestone');
  must(harnessDoc, 'check:dataintegrityandrecovery01', 'script harness doc lists data integrity alias');
  must(harnessDoc, 'docs/DATA_INTEGRITY_AND_RECOVERY_01.md', 'script harness doc lists data integrity doc');
  must(harnessDoc, 'node backend\\scripts\\data_integrity_and_recovery_01_check.js', 'script harness doc lists data integrity command');
  must(harnessDoc, 'SECURITY-KVKK-FINAL-01', 'script harness doc lists security milestone');
  must(harnessDoc, 'check:securitykvkkfinal01', 'script harness doc lists security alias');
  must(harnessDoc, 'docs/SECURITY_KVKK_FINAL_01.md', 'script harness doc lists security doc');
  must(harnessDoc, 'node backend\\scripts\\security_kvkk_final_01_check.js', 'script harness doc lists security command');
  ordered(harnessDoc, ['Test quality and flake audit milestone: `TEST-QUALITY-AND-FLAKE-AUDIT-01`', 'Dashboard bulk endpoint milestone: `DASHBOARD-BULK-ENDPOINT-01`', 'Cache coalescing and backoff milestone: `CACHE-COALESCING-AND-BACKOFF-01`', 'Request storm resilience milestone: `REQUEST-STORM-RESILIENCE-01`', 'Production rate limit policy milestone: `PRODUCTION-RATE-LIMIT-POLICY-01`', 'AI response semantic quality gate milestone: `AI-RESPONSE-SEMANTIC-QUALITY-GATE-01`', 'Load test 2000 users milestone: `LOAD-TEST-2000-USERS-01`', 'DB pool and API scaling milestone: `DB-POOL-AND-API-SCALING-01`', 'Observability monitoring alerting milestone: `OBSERVABILITY-MONITORING-ALERTING-01`', 'Backend lint warning burndown milestone: `BACKEND-LINT-WARNING-BURNDOWN-01`', 'DATA-INTEGRITY-AND-RECOVERY-01', 'Agreements detail milestone: `UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01`'], 'script harness doc keeps dashboard bulk endpoint, cache coalescing and backoff, request storm resilience, production rate limit policy, AI response semantic quality gate, load-test, db scaling, observability, backend lint burndown and data integrity in order');
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
  must(guide, 'UX-SMOKE-PASS-MINUS-ZERO-01', 'script guide mentions PASS-minus zero milestone');
  must(guide, 'check:uxsmokepassminuszero01', 'script guide exposes PASS-minus zero check');
  must(guide, 'node backend\\scripts\\ux_smoke_pass_minus_zero_01_check.js', 'script guide includes PASS-minus zero command');
  must(guide, 'docs/UX_SMOKE_PASS_MINUS_ZERO_01.md', 'script guide includes PASS-minus zero doc');
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
  must(guide, 'TEST-QUALITY-AND-FLAKE-AUDIT-01', 'script guide mentions test quality and flake audit milestone');
  must(guide, 'check:testqualityandflakeaudit01', 'script guide exposes check:testqualityandflakeaudit01');
  must(guide, 'node backend\\scripts\\test_quality_and_flake_audit_01_check.js', 'script guide includes test quality and flake audit command');
  must(guide, 'docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md', 'script guide includes test quality and flake audit doc');
  must(guide, 'DASHBOARD-BULK-ENDPOINT-01', 'script guide mentions dashboard bulk endpoint milestone');
  must(guide, 'check:dashboardbulkendpoint01', 'script guide exposes dashboard bulk endpoint check');
  must(guide, 'node backend\\scripts\\dashboard_bulk_endpoint_01_check.js', 'script guide includes dashboard bulk endpoint command');
  must(guide, 'docs/DASHBOARD_BULK_ENDPOINT_01.md', 'script guide includes dashboard bulk endpoint doc');
  must(guide, 'CACHE-COALESCING-AND-BACKOFF-01', 'script guide mentions cache coalescing and backoff milestone');
  must(guide, 'check:cachecoalescingandbackoff01', 'script guide exposes cache coalescing and backoff check');
  must(guide, 'node backend\\scripts\\cache_coalescing_and_backoff_01_check.js', 'script guide includes cache coalescing and backoff command');
  must(guide, 'docs/CACHE_COALESCING_AND_BACKOFF_01.md', 'script guide includes cache coalescing and backoff doc');
  must(guide, 'REQUEST-STORM-RESILIENCE-01', 'script guide mentions request storm resilience milestone');
  must(guide, 'check:requeststormresilience01', 'script guide exposes request storm resilience check');
  must(guide, 'node backend\\scripts\\request_storm_resilience_01_check.js', 'script guide includes request storm resilience command');
  must(guide, 'docs/REQUEST_STORM_RESILIENCE_01.md', 'script guide includes request storm resilience doc');
  must(guide, 'PRODUCTION-RATE-LIMIT-POLICY-01', 'script guide mentions production rate limit policy milestone');
  must(guide, 'check:productionratelimitpolicy01', 'script guide exposes production rate limit policy check');
  must(guide, 'node backend\\scripts\\production_rate_limit_policy_01_check.js', 'script guide includes production rate limit policy command');
  must(guide, 'docs/PRODUCTION_RATE_LIMIT_POLICY_01.md', 'script guide includes production rate limit policy doc');
  must(guide, 'AI-RESPONSE-SEMANTIC-QUALITY-GATE-01', 'script guide mentions AI response semantic quality gate milestone');
  must(guide, 'check:airesponsesemanticqualitygate01', 'script guide exposes AI response semantic quality gate check');
  must(guide, 'node backend\\scripts\\ai_response_semantic_quality_gate_01_check.js', 'script guide includes AI response semantic quality gate command');
  must(guide, 'docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md', 'script guide includes AI response semantic quality gate doc');
  must(guide, 'LOAD-TEST-2000-USERS-01', 'script guide mentions load-test milestone');
  must(guide, 'check:loadtest2000users01', 'script guide exposes load-test check');
  must(guide, 'node backend\\scripts\\load_test_2000_users_01_check.js', 'script guide includes load-test command');
  must(guide, 'docs/LOAD_TEST_2000_USERS_01.md', 'script guide includes load-test doc');
  must(guide, 'DB-POOL-AND-API-SCALING-01', 'script guide mentions db scaling milestone');
  must(guide, 'check:dbpoolandapiscaling01', 'script guide exposes db scaling check');
  must(guide, 'node backend\\scripts\\db_pool_and_api_scaling_01_check.js', 'script guide includes db scaling command');
  must(guide, 'docs/DB_POOL_AND_API_SCALING_01.md', 'script guide includes db scaling doc');
  must(guide, 'OBSERVABILITY-MONITORING-ALERTING-01', 'script guide mentions observability milestone');
  must(guide, 'check:observabilitymonitoringalerting01', 'script guide exposes observability check');
  must(guide, 'node backend\\scripts\\observability_monitoring_alerting_01_check.js', 'script guide includes observability command');
  must(guide, 'node backend\\scripts\\observability_monitoring_alerting_01_probe.js', 'script guide includes observability probe');
  must(guide, 'docs/OBSERVABILITY_MONITORING_ALERTING_01.md', 'script guide includes observability doc');
  must(guide, 'BACKEND-LINT-WARNING-BURNDOWN-01', 'script guide mentions backend lint burndown milestone');
  must(guide, 'check:backendlintwarningburndown01', 'script guide exposes backend lint burndown check');
  must(guide, 'node backend\\scripts\\backend_lint_warning_burndown_01_check.js', 'script guide includes backend lint burndown command');
  must(guide, 'docs/BACKEND_LINT_WARNING_BURNDOWN_01.md', 'script guide includes backend lint burndown doc');
  must(guide, 'DATA-INTEGRITY-AND-RECOVERY-01', 'script guide mentions data integrity milestone');
  must(guide, 'check:dataintegrityandrecovery01', 'script guide exposes data integrity check');
  must(guide, 'node backend\\scripts\\data_integrity_and_recovery_01_check.js', 'script guide includes data integrity command');
  must(guide, 'docs/DATA_INTEGRITY_AND_RECOVERY_01.md', 'script guide includes data integrity doc');
  must(guide, 'SECURITY-KVKK-FINAL-01', 'script guide mentions security final milestone');
  must(guide, 'check:securitykvkkfinal01', 'script guide exposes security final check');
  must(guide, 'node backend\\scripts\\security_kvkk_final_01_check.js', 'script guide includes security final command');
  must(guide, 'docs/SECURITY_KVKK_FINAL_01.md', 'script guide includes security final doc');
  ordered(guide, ['TEST-QUALITY-AND-FLAKE-AUDIT-01', 'DASHBOARD-BULK-ENDPOINT-01', 'CACHE-COALESCING-AND-BACKOFF-01', 'REQUEST-STORM-RESILIENCE-01', 'PRODUCTION-RATE-LIMIT-POLICY-01', 'AI-RESPONSE-SEMANTIC-QUALITY-GATE-01', 'LOAD-TEST-2000-USERS-01', 'DB-POOL-AND-API-SCALING-01', 'OBSERVABILITY-MONITORING-ALERTING-01', 'BACKEND-LINT-WARNING-BURNDOWN-01', 'DATA-INTEGRITY-AND-RECOVERY-01', 'UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01'], 'script guide keeps dashboard bulk endpoint, cache coalescing and backoff, request storm resilience, production rate limit policy, AI response semantic quality gate, load-test, db scaling, observability, backend lint burndown and data integrity in order');
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
