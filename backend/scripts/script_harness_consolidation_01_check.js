#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const docPath = path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md");
const args = process.argv.slice(2);
const shouldWriteDoc = args.includes("--write-doc");
const workingTreeCompatFiles = [
  "backend/scripts/ux_panel_standard_architecture_01_check.js",
  "backend/scripts/ux_premium_critical_fix_room_01_check.js",
  "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
  "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
  "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
  "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
  "backend/scripts/copilot_excel_demand_import_01_check.js",
  "backend/scripts/address_geocoding_confidence_01_check.js",
  "backend/scripts/copilot_stop_route_draft_01_check.js",
  "backend/scripts/osrm_route_draft_from_excel_01_check.js",
  "backend/scripts/copilot_route_review_human_approval_01_check.js",
  "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
  "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
  "backend/scripts/copilot_guided_task_engine_01_check.js",
  "backend/scripts/copilot_root_cause_engine_01_check.js",
  "backend/scripts/copilot_risk_scoring_engine_01_check.js",
  "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
  "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
  "backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js",
  "backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js",
  "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
  "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
  "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
  "docs/SEFER_ABI_REASONING_ASSISTANT_01.md",
  "docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md",
  "docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md",
  "docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md",
  "backend/scripts/product_flow_button_audit_01_check.js",
  "backend/scripts/product_flow_button_audit_01.mjs",
  "backend/scripts/invite_based_membership_01_check.js",
  "backend/scripts/verified_supplier_01_check.js",
  "backend/scripts/ux_marketplace_panels_01_check.js",
  "backend/scripts/m44_telematics_t1_t5_check.js",
  "backend/scripts/telematics_provider_hub_01_check.js",
  "backend/scripts/safe_drive_01_check.js",
  "backend/scripts/offer_ranking_quality_01_check.js",
  "backend/scripts/copilot_role_task_matrix_01_check.js",
  "backend/scripts/copilot_ai_action_roadmap_01_check.js",
  "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
  "backend/scripts/copilot_human_approval_01_check.js",
  "backend/src/ai/chat/copilotRoleTaskMatrix.js",
  "backend/src/ai/chat/copilotAiActionRoadmap.js",
  "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
  "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
  "backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js",
  "backend/src/ai/chat/excelToRouteReadinessRedteamPack.js",
  "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
  "backend/src/ai/chat/copilotGuidedTaskEngine.js",
  "backend/src/ai/chat/conversationRootCauseEngine.js",
  "backend/src/ai/chat/conversationRiskScoringEngine.js",
  "backend/src/ai/chat/seferAbiReasoningAssistant.js",
  "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
  "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
  "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
  "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
  "backend/src/ai/chat/conversationPlanReviewEngine.js",
  "backend/src/ai/chat/conversationNextBestActionEngine.js",
  "backend/src/ai/chat/helpComposerSafeReplies.js",
  "backend/scripts/copilot_plan_review_engine_01_check.js",
  "backend/scripts/copilot_next_best_action_engine_01_check.js",
  "backend/scripts/hot_file_split_ai_chat_composers_01_check.js",
  "backend/scripts/hot_file_split_web_panels_01_check.js",
  "docs/COPILOT_PLAN_REVIEW_ENGINE_01.md",
  "docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md",
  "docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md",
  "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md",
  "web/src/panels/company/companyAgreementsBridgeSection.jsx",
  "web/src/panels/company/companyAgreementsPanelHelpers.js",
  "web/src/panels/room/roomAgreementsBridgeSection.jsx",
  "web/src/panels/room/roomAgreementsPanelHelpers.js",
  "web/src/utils/safeDriveSummary.js",
  "web/src/utils/offerQualityRanking.js",
  "web/src/panels/shared/SafeDriveSummaryCard.jsx",
  "web/src/panels/shared/OfferQualityRankingCard.jsx",
  "docs/INVITE_BASED_MEMBERSHIP_01.md",
  "docs/VERIFIED_SUPPLIER_01.md",
  "docs/UX_MARKETPLACE_PANELS_01.md",
  "docs/M44_TELEMATICS_T1_T5.md",
  "docs/TELEMATICS_PROVIDER_HUB_01.md",
  "docs/SAFE_DRIVE_01.md",
  "docs/OFFER_RANKING_QUALITY_01.md",
  "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
  "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
  "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
  "docs/COPILOT_HUMAN_APPROVAL_01.md",
  "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
  "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
  "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
  "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
  "docs/COPILOT_ROOT_CAUSE_ENGINE_01.md",
    "docs/COPILOT_RISK_SCORING_ENGINE_01.md",
    "docs/SEFER_ABI_REASONING_ASSISTANT_01.md",
    "docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md",
    "SEFER-ABI-TERMINAL-HUMANIZE-01",
    "check:seferabiterminalhumanize01",
    "docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md",
    "node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js",
    "SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01",
    "check:seferabiturkishterminology01",
    "docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md",
    "node backend\\scripts\\sefer_abi_turkish_user_facing_terminology_01_check.js",
    "SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01",
    "check:seferabiturkishuserfacinglanguage01",
    "docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md",
    "node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/seferAbiReasoningAssistant.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
  "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
  "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
  "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
  "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
  "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
  "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
  "backend/scripts/quality_gate_final_01_check.js",
  "backend/scripts/test_quality_and_flake_audit_01_check.js",
  "backend/scripts/public_landing_final_promise_01_check.js",
  "backend/scripts/onboarding_review_final_audit_01_check.js",
  "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
  "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
  "web/src/panels/company/companyAgreementsMobileCards.jsx",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
  "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
  "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
  "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
  "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
  "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
  "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
  "docs/QUALITY_GATE_FINAL_01.md",
  "docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md",
  "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
  "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
  "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
  "docs/VERIFIED_SUPPLIER_01.md",
  "docs/UX_MARKETPLACE_PANELS_01.md",
  "docs/M44_TELEMATICS_T1_T5.md",
  "docs/TELEMATICS_PROVIDER_HUB_01.md",
  "docs/SAFE_DRIVE_01.md",
  "docs/OFFER_RANKING_QUALITY_01.md",
];

const selectedDocs = [
  "README.md",
  "docs/AGENTS.md",
  "docs/CHECKLIST_SSOT.md",
  "docs/NEXT_BACKLOG_V1.md",
  "docs/PRIMER_SSOT.md",
  "docs/FINAL_RELEASE_EVIDENCE_M90.md",
  "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  "docs/COPILOT_PLAN_REVIEW_ENGINE_01.md",
  "docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md",
  "docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md",
  "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md",
  // PUBLIC-LANDING-01 / PUBLIC-LANDING-PLATFORM-FIRST-01 / PUBLIC-LANDING-01 FINAL PROMISE CHECK / LEAD-CAPTURE-01 public vitrin docs/check coverage
  "docs/PUBLIC_LANDING_01.md",
  "docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md",
  "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
  "docs/LEAD_CAPTURE_01.md",
  "docs/ONBOARDING_REVIEW_01.md",
  "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
  "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
  "docs/AGREEMENT_SOURCE_SHIFT_LINEAGE_01.md",
  "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
  "docs/BOARDING_OPS_01A_ROUTE_IMPACT_PREVIEW.md",
  "docs/BOARDING_CHANGE_REQUEST_ENTRY_01.md",
  "docs/SHIFT_DISPATCH_APPROVAL_FIX_01.md",
  "docs/BOARDING_OPS_01B_ACCEPTED_CHANGE_APPLICATION.md",
  "docs/BOARDING_OPS_01C_DRIVER_ROUTE_REFRESH.md",
  "docs/ROUTE_CHANGE_FINAL_01.md",
  "docs/DYNAMIC_SAVINGS_01.md",
  "docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md",
  "docs/UX_CONTRACT_CONVERSION_OPS_BRIDGE_CLARITY_01.md",
  "docs/FINAL_UX_SMOKE_01_CHECKLIST.md",
  "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md",
  "docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md",
  "docs/UX_SUPERADMIN_PANEL_CLARITY_01.md",
  "docs/ROOM_VEHICLE_DRIVER_UPPERCASE_NORMALIZATION_01.md",
  "docs/UX_ROOM_PANEL_CLARITY_01.md",
  "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
  "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
  "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
  "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
  "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
  "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
  "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
  "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
  "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
  "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
  "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
  "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
  "docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md",
  "docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md",
  "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
  "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
  "docs/COP_LIVE_ACCEPT_01_MATRIX.md",
  "tools/README.md",
  "tools/wrappers/README.md",
  "tools/packs/living/README.md",
];

const legacyTerms = [
  "Vardis",
  "Hub",
  "Yer",
  "Audit Logs",
  "Log Export",
  "OperationProof",
  "personel-access",
  "raw internal",
  "debug payload",
];

function rel(p) {
  return p.replace(/\\/g, "/");
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

function readText(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function gitTrackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const tracked = String(out || "")
    .split("\0")
    .filter(Boolean)
    .map(rel);
  for (const relPath of workingTreeCompatFiles) {
    if (exists(relPath) && !tracked.includes(relPath)) tracked.push(relPath);
  }
  return tracked;
}

function isExecLike(relPath) {
  return /^(backend|web|mobile|tools|scripts|test|tests)(?:\/|$)/i.test(relPath) &&
    /\.(?:js|cjs|mjs|ps1|cmd|sh)$/i.test(relPath);
}

function getPackageScripts(relPath) {
  if (!exists(relPath)) return {};
  const json = readJson(relPath);
  return json.scripts || {};
}

function slugToMilestone(slug) {
  const raw = String(slug || "")
    .replace(/^check:/, "")
    .replace(/^smoke:/, "")
    .replace(/^verify:/, "")
    .replace(/^lint:/, "")
    .replace(/^audit:/, "");

  const special = [
    [/boardingops0?1a/i, "BOARDING-OPS-01A"],
    [/boardingops0?1b/i, "BOARDING-OPS-01B"],
    [/boardingops0?1c/i, "BOARDING-OPS-01C"],
    [/routechangefinal0?1/i, "ROUTE-CHANGE-FINAL-01"],
    [/finaluxsmoke0?1/i, "FINAL-UX-SMOKE-01"],
    [/copliveaccept0?1/i, "COP-LIVE-ACCEPT-01"],
    [/scriptharnessconsolidation0?1/i, "SCRIPT-HARNESS-CONSOLIDATION-01"],
    [/uxseferabilauncher0?1/i, "UX-SEFER-ABI-LAUNCHER-01"],
    [/uxcopilotterminal0?1/i, "UX-COPILOT-TERMINAL-01"],
    [/uxcopilotpersona0?1/i, "UX-COPILOT-PERSONA-01"],
    [/uxcopilotsmartchips0?1/i, "UX-COPILOT-SMART-CHIPS-01"],
    [/uxnav0?1/i, "UX-NAV-01"],
    [/uxbrandloginpremium0?1/i, "UX-BRAND-LOGIN-PREMIUM-01"],
    [/uxmobilewebshellclarity0?1/i, "UX-MOBILE-WEB-SHELL-CLARITY-01"],
    [/m44telematicst1t5/i, "M44-TELEMATICS-T1-T5"],
    [/telematicsproviderhub0?1/i, "TELEMATICS-PROVIDER-HUB-01"],
    [/offerrankingquality0?1/i, "OFFER-RANKING-QUALITY-01"], // check:offerrankingquality01
    [/copilotroletaskmatrix0?1/i, "COPILOT-ROLE-TASK-MATRIX-01"], // check:copilotroletaskmatrix01
    [/verifiedsupplier0?1/i, "VERIFIED-SUPPLIER-01"],
    [/uxmarketplacepanels0?1/i, "UX-MARKETPLACE-PANELS-01"], // check:uxmarketplacepanels01
    [/productflowbuttonaudit0?1/i, "PRODUCT-FLOW-BUTTON-AUDIT-01"], // check:productflowbuttonaudit01
    [/uxroomcompanyshiftsmobilecardfix0?1/i, "UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01"], // check:uxroomcompanyshiftsmobilecardfix01
    [/uxshiftsresponsivelayoutfix0?1/i, "UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01"], // check:uxshiftsresponsivelayoutfix01
    [/uxmobileoverflowminimapreadability0?1/i, "UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01"], // check:uxmobileoverflowminimapreadability01
    [/uxmobileoverflowminimappolish0?2/i, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02"], // check:uxmobileoverflowminimappolish02
    [/uxmobileallrolespanelaudit0?1/i, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01"],
    [/uxdensity0?1/i, "UX-DENSITY-01"],
    [/uxroomshiftsdensitydedup0?1/i, "UX-ROOM-SHIFTS-DENSITY-DEDUP-01"],
    [/uxpanelstandardarchitecture0?1/i, "UX-PANEL-STANDARD-ARCHITECTURE-01"],
    [/uxpremiumcriticalfixroom0?1/i, "UX-PREMIUM-CRITICAL-FIX-ROOM-01"],
    [/uxpremiumcriticalfixagreementsdetail0?1/i, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01"],
    [/exceltoroutereadinessredteam0?1/i, "EXCEL-TO-ROUTE-READINESS-REDTEAM-01"], // check:exceltoroutereadinessredteam01
    [/uxcompanyagreementsmobileparity0?1/i, "UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01"], // check:uxcompanyagreementsmobileparity01
    [/uxcompanypersonelaccessmobileparity0?1/i, "UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01"], // check:uxcompanypersonelaccessmobileparity01
  [/uxpremiumcriticaluxfixcleanup0?1/i, "UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01"],
    [/uxlivepanelpremiumsmoke0?1/i, "UX-LIVE-PANEL-PREMIUM-SMOKE-01"],
    [/uxlivepanelpremium0?1/i, "UX-LIVE-PANEL-PREMIUM-SMOKE-01"],
    [/qualitygatefinal0?1/i, "QUALITY-GATE-FINAL-01"],
    [/testqualityandflakeaudit0?1/i, "TEST-QUALITY-AND-FLAKE-AUDIT-01"], // check:testqualityandflakeaudit01
    [/airesponsesemanticqualitygate0?1/i, "AI-RESPONSE-SEMANTIC-QUALITY-GATE-01"], // check:airesponsesemanticqualitygate01
    [/uxsmokepassminusevidence0?1/i, "UX-SMOKE-PASS-MINUS-EVIDENCE-01"],
    [/uxsmokepassminuszero0?1/i, "UX-SMOKE-PASS-MINUS-ZERO-01"],
    [/uxcompanymobileactionclarity0?1/i, "UX-COMPANY-MOBILE-ACTION-CLARITY-01"],
    [/uxparentpersonelliveerrorclarity0?1/i, "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01"],
    [/roomvehicledriveruppercase0?1/i, "ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01"],
    [/uxcontractconversionopsbridgeclarity0?1/i, "UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01"],
    [/copilotaiactionroadmap0?1/i, "COPILOT-AI-ACTION-ROADMAP-01"], // check:copilotairoadmap01
    [/copilotdemand(?:to)?agreement0?1/i, "COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01"], // check:copilotdemandagreement01
    [/copilothumanapproval0?1/i, "COPILOT-HUMAN-APPROVAL-01"], // check:copilothumanapproval01
    [/copilotroutereviewhumanapproval0?1/i, "COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01"], // check:copilotroutereviewhumanapproval01
    [/copilotexceldemandimport0?1/i, "COPILOT-EXCEL-DEMAND-IMPORT-01"], // check:copilotexceldemandimport01
    [/addressgeocodingconfidence0?1/i, "ADDRESS-GEOCODING-CONFIDENCE-01"], // check:addressgeocodingconfidence01
    [/copilotstoproutedraft0?1/i, "COPILOT-STOP-ROUTE-DRAFT-01"], // check:copilotstoproutedraft01
    [/osrmroutedraftfromexcel0?1/i, "OSRM-ROUTE-DRAFT-FROM-EXCEL-01"], // check:osrmroutedraftfromexcel01
    [/copilot[_-]?e[_-]?block[_-]?runtime[_-]?answer[_-]?integration0?1/i, "COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01"], // check:copiloteblockruntimeanswerintegration01
    [/copilot[_-]?guided[_-]?task[_-]?engine0?1/i, "COPILOT-GUIDED-TASK-ENGINE-01"], // check:copilotguidedtaskengine01
    [/copilot[_-]?dynamic[_-]?question[_-]?engine0?1/i, "COPILOT-DYNAMIC-QUESTION-ENGINE-01"], // check:copilotdynamicquestionengine01
    [/copilot[_-]?smart[_-]?diagnostic[_-]?engine0?1/i, "COPILOT-SMART-DIAGNOSTIC-ENGINE-01"], // check:copilotsmartdiagnosticengine01
    [/copilot[_-]?root[_-]?cause[_-]?engine0?1/i, "COPILOT-ROOT-CAUSE-ENGINE-01"], // check:copilotrootcauseengine01
    [/copilot[_-]?risk[_-]?scoring[_-]?engine0?1/i, "COPILOT-RISK-SCORING-ENGINE-01"], // check:copilotriskscoringengine01
    [/copilot[_-]?clarifying[_-]?question[_-]?engine0?1/i, "COPILOT-CLARIFYING-QUESTION-ENGINE-01"], // check:copilotclarifyingquestionengine01
    [/copilot[_-]?workflow[_-]?reasoning[_-]?engine0?1/i, "COPILOT-WORKFLOW-REASONING-ENGINE-01"], // check:copilotworkflowreasoningengine01
    [/copilot[_-]?operation[_-]?health[_-]?engine0?1/i, "COPILOT-OPERATION-HEALTH-ENGINE-01"], // check:copilotoperationhealthengine01
    [/copilot[_-]?next[_-]?best[_-]?action[_-]?engine0?1/i, "COPILOT-NEXT-BEST-ACTION-ENGINE-01"], // check:copilotnextbestactionengine01
    [/copilot[_-]?plan[_-]?review[_-]?engine0?1/i, "COPILOT-PLAN-REVIEW-ENGINE-01"], // check:copilotplanreviewengine01
    [/sefer[_-]?abi[_-]?reasoning[_-]?assistant0?1/i, "SEFER-ABI-REASONING-ASSISTANT-01"], // check:seferabireasoningassistant01
    [/sefer[_-]?abi[_-]?all[_-]?roles[_-]?reasoning[_-]?assistant0?1/i, "SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01"], // check:seferabiallrolesreasoningassistant01
    [/sefer[_-]?abi[_-]?turkish[_-]?user[_-]?facing[_-]?language(?:[_-]?audit)?0?1/i, "SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01"], // check:seferabiturkishuserfacinglanguage01
    [/final/i, "FINAL"],
    [/verifychain0?1/i, "VERIFY-CHAIN-01"],
    [/productextensions/i, "PRODUCT-EXTENSIONS"],
  ];
  for (const [rx, label] of special) {
    if (rx.test(raw)) return label;
  }

  const withDashes = raw
    .replace(/([a-z])(\d)/gi, "$1-$2")
    .replace(/(\d)([a-z])/gi, "$1-$2")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_:.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toUpperCase();

  return withDashes || raw.toUpperCase();
}

function statusFromPackage(pkg, name) {
  if (pkg === "root") {
    if (["check", "verify:repo", "check:copilotairoadmap01", "check:copilotdemandagreement01", "check:copilothumanapproval01", "check:copilotexceldemandimport01", "check:addressgeocodingconfidence01", "check:copilotstoproutedraft01", "check:osrmroutedraftfromexcel01", "check:copilotroutereviewhumanapproval01", "check:exceltoroutereadinessredteam01", "check:copiloteblockruntimeanswerintegration01", "check:copilotguidedtaskengine01", "check:copilotdynamicquestionengine01", "check:copilotsmartdiagnosticengine01", "check:copilotrootcauseengine01", "check:copilotriskscoringengine01", "check:copilotclarifyingquestionengine01", "check:copilotworkflowreasoningengine01", "check:copilotoperationhealthengine01", "check:copilotnextbestactionengine01", "check:copilotplanreviewengine01", "check:hotfilesplitaichatcomposers01", "check:seferabireasoningassistant01", "check:seferabiturkishterminology01", "check:seferabiturkishuserfacinglanguage01", "verify:ci", "verify:closure", "verify:final", "check:product-extensions", "check:verifychain01", "check:scriptharnessconsolidation01", "check:docsbrandcleanup01", "check:dynamicsavings01", "check:uiactionwiringaudit01", "check:boardingchangerequestentry01", "check:shiftdispatchapprovalfix01", "check:uxcontractconversionopsbridgeclarity01", "check:publiclanding01", "check:publiclandingplatformfirst01", "check:publiclandingfinalpromise01", "check:leadcapture01", "check:onboardingreview01", "check:onboardingreviewfinal01", "check:onboardingreviewfinalaudit01", "check:invitebasedmembership01", "check:verifiedsupplier01", "check:uxmarketplacepanels01", "check:m44telematicst1t5", "check:telematicsproviderhub01", "check:safedrive01", "check:offerrankingquality01", "check:copilotroletaskmatrix01", "check:productflowbuttonaudit01", "check:qualitygatefinal01", "check:testqualityandflakeaudit01", "check:airesponsesemanticqualitygate01"].includes(name)) {
      return "ACTIVE_CORE";
    }
    if (["lint:backend"].includes(name)) return "ACTIVE_BACKEND_LINT";
    if (["lint:web", "lint", "check:web-mobile", "check:m95e23c", "check:m98e2c", "check:m95e20"].includes(name)) return "ACTIVE_WEB_LINT";
    if (["verify:snapshot", "verify:docs", "verify:hot", "verify:web-contract", "verify:milestones", "verify:milestones:live"].includes(name)) {
      return "ACTIVE_RELEASE_ONLY";
    }
    if (["audit:repo", "check:brand", "check:docsstate01", "check:docsbrandcleanup01", "check:e2esmoke01", "check:fieldlaunch01", "check:op01", "check:op02", "check:op03", "check:op04", "check:qlt01", "check:qlt02", "check:qlt03", "check:qlt04", "check:qlt04a", "check:qlt04b", "check:pay01a", "check:pay01b", "check:pay01c", "check:pay01d", "check:pay01e", "check:paysafe01", "check:uxcollapsiblepanels01", "check:uxpanelstructure02", "check:uxpanelinventory02a", "check:uxpanelstructure02b", "check:uxroomvehiclestelematicsfix", "check:roomvehicledriveruppercase01", "check:uxroompanelclarity01", "check:uxroomopspaneltabs01", "check:uxroomopsrelationshippolish01", "check:uxroomshiftstabs01", "check:uxroomshiftsdensitydedup01", "check:uxpremiumcriticalfixroom01", "check:uxschoolorganizationpanels01", "check:uxcompanyshiftstabs01", "check:uxcompanymobileactionclarity01", "check:uxcompanypersonelaccessmobileparity01", "check:uxcompanyagreementsmobileparity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxmarketplacepanels01", "check:productflowbuttonaudit01", "check:uxpremiumcriticaluxfixcleanup01", "check:uxcompanyopspaneltabs01", "check:uxcompanyqualitytabs01", "check:uxcompanypanelsfinalpolish01", "check:uxcompanypanelssmoke01", "check:uxpaneltabsfix01", "check:uxlivemaptabsfix01", "check:uxlivemaptabssimplify01", "check:uxpanelreality02c", "check:uxpanelrealitycleanup02d", "check:uxpanellayoutwidth02cfix01", "check:uxpanellayoutwidth02cfix02", "check:uxpanellayoutwidth02cfix03", "check:uxnav01", "check:uxbrandloginpremium01", "check:uxmobilewebshellclarity01", "check:uxdensity01", "check:uxpanelstandardarchitecture01", "check:finaluxsmoke01", "check:uxlivepanelsmokeaudit01", "check:uxmobileallrolespanelaudit01", "check:uxsmokepassminusevidence01", "check:uxsmokepassminuszero01", "check:uxlivepanelpremiumsmoke01", "check:mobilewebfinal01", "check:uxparentpersonelliveerrorclarity01", "check:copliveaccept01", "check:boardingops01a", "check:bugrouteimpactpreviewbutton01", "check:boardingops01b", "check:boardingops01c", "check:routechangefinal01", "check:dynamicsavings01", "check:etasanity01", "check:etaosrm01", "check:etaosrm02", "check:livetrackingfinal01", "check:driverflowfinal01", "check:cop01a", "check:cop01b", "check:cop01c", "check:cop01d", "check:cop01e", "check:cop02a", "check:cop02b", "check:cop02bfix01", "check:cop03a", "check:cop03afix01", "check:cop03afix02", "check:cop03b", "check:cop03c", "check:cop03cfix01", "check:cop03cfix02", "check:cop03cfix03", "check:cop04a", "check:cop04afix01", "check:cop04afix02", "check:cop04afix03", "check:cop04afix04", "check:cop04b", "check:cop04bfix01", "check:cop04bfix02", "check:cop04bfix03", "check:cop04bfix04", "check:cop04bfix05", "check:cop04bfix06", "check:cop04bfix07", "check:cop04bfix08", "check:copiloteblockruntimeanswerintegration01", "check:copilotguidedtaskengine01", "check:copilotdynamicquestionengine01", "check:copilotsmartdiagnosticengine01", "check:copilotrootcauseengine01", "check:copilotriskscoringengine01", "check:copilotclarifyingquestionengine01", "check:copilotworkflowreasoningengine01", "check:copilotoperationhealthengine01", "check:copilotnextbestactionengine01", "check:copilotplanreviewengine01", "check:uxcopilotsmartchips01", "check:uxcopilotpersona01", "check:uxcopilotterminal01", "check:uxseferabilauncher01", "check:uxsuperadminpanelclarity01", "check:uxcontractconversionopsbridgeclarity01", "check:shiftdispatchapprovalfix01", "check:publiclanding01", "check:publiclandingplatformfirst01", "check:publiclandingfinalpromise01", "check:onboardingreviewfinal01", "check:onboardingreviewfinalaudit01"].includes(name)) {
      return "ACTIVE_CORE";
    }
    if (["smoke:m98e4", "smoke:uxlivepanelpremium01", "smoke:productflowbuttonaudit01"].includes(name)) return "MANUAL_SMOKE";
    if (/^check:m95e2[567]$/.test(name) || /^check:m95export01$/.test(name) || /^check:m98e[35]$/.test(name)) return "REQUIRES_DEVICE";
    if (/^check:m98e2[bde]$/.test(name) || /^check:m98e5$/.test(name)) return "REQUIRES_AUTH_SESSION";
    if (name === "check:uxroomagreementstabs01") return "LEGACY_COMPAT";
    return "NEEDS_REVIEW";
  }

  if (pkg === "backend") {
    if (name === "lint") return "ACTIVE_BACKEND_LINT";
    if (["repo:check", "repo:check:chain", "fullcheck"].includes(name)) return name === "repo:check:chain" ? "LEGACY_COMPAT" : "ACTIVE_CORE";
    if (["smoke", "m91:smoke", "current:surface"].includes(name)) return "MANUAL_SMOKE";
    if (name.startsWith("bench:")) return "MANUAL_SMOKE";
    if (["milestones:static", "m91:milestones", "m92check", "spec16check", "m90b1check", "m90c6check", "m90c7check", "m90c8check", "m90c9check", "m94dcheck", "m95e20check", "m95e23bcheck"].includes(name)) {
      return "ACTIVE_RELEASE_ONLY";
    }
    if (/^m\d/.test(name) && /check$/.test(name)) return "ACTIVE";
    if (["m45:backup:create", "m45:backup:restore"].includes(name)) return "ACTIVE_RELEASE_ONLY";
    return "NEEDS_REVIEW";
  }

  if (pkg === "web") {
    if (name === "lint") return "ACTIVE_WEB_LINT";
    if (["dev", "build", "preview"].includes(name)) return "REQUIRES_ENV";
    if (name.startsWith("check:")) return "ACTIVE_WEB_LINT";
    return "NEEDS_REVIEW";
  }

  if (pkg === "mobile") {
    if (name.startsWith("build:")) {
      return name.startsWith("build:internal:") ? "LEGACY_COMPAT" : "REQUIRES_DEVICE";
    }
    if (["android", "ios", "start", "web"].includes(name)) return "REQUIRES_ENV";
    if (name === "doctor:expo") return "ACTIVE_RELEASE_ONLY";
    if (name === "doctor:mobile") return "ACTIVE_RELEASE_ONLY";
    if (name === "check:m96bnotifications") return "LEGACY_COMPAT";
    if (name.startsWith("check:")) {
      if (/(login|session|auth|invite|pin|kvkk)/i.test(name)) return "REQUIRES_AUTH_SESSION";
      if (/(android|ios|emulator|device|release|preview|build|gps|mobile|field|acceptance|harden|hardening|bundle|ship)/i.test(name)) return "REQUIRES_DEVICE";
      return "ACTIVE";
    }
    return "NEEDS_REVIEW";
  }

  return "NEEDS_REVIEW";
}

function skipReasonForStatus(status) {
  if (status === "REQUIRES_ENV") return "REQUIRES_ENV";
  if (status === "REQUIRES_BROWSER") return "REQUIRES_BROWSER";
  if (status === "REQUIRES_AUTH_SESSION") return "REQUIRES_AUTH_SESSION";
  if (status === "REQUIRES_DEVICE") return "REQUIRES_DEVICE";
  if (status === "ACTIVE_RELEASE_ONLY") return "RELEASE_ONLY";
  if (status === "MANUAL_SMOKE") return "MANUAL_ACCEPTANCE_ONLY";
  if (status === "MANUAL_BROWSER_SMOKE") return "REQUIRES_BROWSER";
  if (status === "MANUAL_RELEASE_TOOL") return "MANUAL_ACCEPTANCE_ONLY";
  if (status === "LEGACY_COMPAT") return "LEGACY_COMPAT_ONLY";
  return "";
}

function riskIfRemoved(status) {
  switch (status) {
    case "ACTIVE_CORE":
      return "Breaks canonical verification chain";
    case "ACTIVE_BACKEND_LINT":
      return "Breaks backend lint gate";
    case "ACTIVE_WEB_LINT":
      return "Breaks frontend/web lint gate";
    case "ACTIVE_RELEASE_ONLY":
      return "Breaks release / evidence / closure gate";
    case "MANUAL_SMOKE":
      return "Loses manual smoke entrypoint";
    case "MANUAL_BROWSER_SMOKE":
      return "Loses browser/manual smoke entrypoint";
    case "MANUAL_RELEASE_TOOL":
      return "Loses operator release tool";
    case "REQUIRES_ENV":
      return "Fails without env or external service";
    case "REQUIRES_BROWSER":
      return "Fails without browser harness";
    case "REQUIRES_AUTH_SESSION":
      return "Fails without auth/session";
    case "REQUIRES_DEVICE":
      return "Fails without device/emulator";
    case "LEGACY_COMPAT":
      return "Breaks compatibility alias; canonical replacement exists";
    case "ARCHIVED":
      return "Historical only";
    case "NEEDS_UPDATE":
      return "Still encodes old system language or routing";
    case "REMOVE_CANDIDATE":
      return "No visible consumer found";
    default:
      return "Owner or chain unclear";
  }
}

const removedAliasRecords = [
  {
    group: "COP-04B-FIX-06 free-chat bridge alias",
    removed: "backend/scripts/cop_04b_fix_06_live_drawer_context_bridge_check.js",
    canonical: "backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    action: "removed",
    reason: "Pure import alias wrapper removed after the package entry was retargeted to the canonical free-chat bridge.",
    replacement: "backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md, backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    riskIfRemoved: "Low; the canonical package command still runs the same coverage.",
  },
  {
    group: "UX company panel smoke alias",
    removed: "backend/scripts/ux_company_panel_smoke_01_check.js",
    canonical: "backend/scripts/ux_company_ops_panel_tabs_01_check.js",
    action: "removed",
    reason: "Pure import alias wrapper removed after the package entry was retargeted to the canonical company ops tabs check.",
    replacement: "backend/scripts/ux_company_ops_panel_tabs_01_check.js",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Low; canonical company ops check remains in the same chain.",
  },
  {
    group: "UX live map tabs fix alias",
    removed: "backend/scripts/ux_live_map_tabs_fix_01_check.js",
    canonical: "backend/scripts/ux_live_map_tabs_simplify_01_check.js",
    action: "removed",
    reason: "Pure import alias wrapper removed after the package entry was retargeted to the canonical live map simplification check.",
    replacement: "backend/scripts/ux_live_map_tabs_simplify_01_check.js",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Low; canonical live map check remains in the same chain.",
  },
];

const duplicateOverlapGroups = [
  {
    group: "COP-04B-FIX-06 free-chat bridge",
    duplicateScripts: "backend/scripts/cop_04b_fix_06_live_drawer_context_bridge_check.js -> backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    canonicalScript: "backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    action: "removed",
    reason: "The left-side file was a pure import alias wrapper; the canonical file already contains the real check.",
    replacement: "backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md, backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js",
    riskIfRemoved: "Low; package command still points at the canonical implementation.",
  },
  {
    group: "UX company panel smoke alias",
    duplicateScripts: "backend/scripts/ux_company_panel_smoke_01_check.js -> backend/scripts/ux_company_ops_panel_tabs_01_check.js",
    canonicalScript: "backend/scripts/ux_company_ops_panel_tabs_01_check.js",
    action: "removed",
    reason: "The left-side file was a pure import alias wrapper; the canonical company tabs check is the real owner.",
    replacement: "backend/scripts/ux_company_ops_panel_tabs_01_check.js",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Low; the canonical package command remains unchanged.",
  },
  {
    group: "UX live map tabs fix alias",
    duplicateScripts: "backend/scripts/ux_live_map_tabs_fix_01_check.js -> backend/scripts/ux_live_map_tabs_simplify_01_check.js",
    canonicalScript: "backend/scripts/ux_live_map_tabs_simplify_01_check.js",
    action: "removed",
    reason: "The left-side file was a pure import alias wrapper; the canonical simplification check is the real owner.",
    replacement: "backend/scripts/ux_live_map_tabs_simplify_01_check.js",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Low; the canonical package command remains unchanged.",
  },
  {
    group: "Room agreement tabs compatibility alias",
    duplicateScripts: "check:uxroomagreementstabs01 -> check:uxpanelrealitycleanup02d",
    canonicalScript: "check:uxpanelrealitycleanup02d",
    action: "alias",
    reason: "Compatibility alias is kept for operator muscle memory while the canonical check already exists.",
    replacement: "check:uxpanelrealitycleanup02d",
    refsUpdated: "package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Breaks compatibility alias; canonical replacement exists.",
  },
  {
    group: "Backend repo check chain compatibility alias",
    duplicateScripts: "backend:repo:check:chain -> backend:repo:check",
    canonicalScript: "backend:repo:check",
    action: "alias",
    reason: "Compatibility alias remains for legacy operator commands; the canonical repo check is already in use.",
    replacement: "backend:repo:check",
    refsUpdated: "backend/package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Breaks compatibility alias; canonical replacement exists.",
  },
  {
    group: "Mobile notification and preview build aliases",
    duplicateScripts: "check:m96bnotifications -> check:m96b; build:internal:android -> build:preview:android; build:internal:ios -> build:preview:ios",
    canonicalScript: "check:m96b / build:preview:android / build:preview:ios",
    action: "alias",
    reason: "Compatibility aliases are kept for mobile operator flows; canonical mobile commands already exist.",
    replacement: "check:m96b / build:preview:android / build:preview:ios",
    refsUpdated: "mobile/package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Breaks mobile compatibility aliases; canonical replacements exist.",
  },
  {
    group: "Pack / verify living wrapper family",
    duplicateScripts: "tools/pack_living.ps1; tools/wrappers/pack_living.ps1; tools/wrappers/verify_living_runtime.ps1; tools/wrappers/verify_living_static.ps1",
    canonicalScript: "tools/pack.ps1 / tools/wrappers/verify_final.ps1",
    action: "legacy",
    reason: "Legacy compatibility wrappers are retained for operator convenience and release muscle memory.",
    replacement: "tools/pack.ps1 / tools/wrappers/verify_final.ps1",
    refsUpdated: "tools/README.md, tools/wrappers/README.md, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Breaks release and verification operator shortcuts.",
  },
  {
    group: "M71/M72 hotfix pack/check family",
    duplicateScripts: "tools/check_m71_* hotfix wrappers; tools/pack_m71_* hotfix wrappers; tools/check_m72_* hotfix wrappers; tools/pack_m72_* hotfix wrappers",
    canonicalScript: "tools/checks/living/hotfixes/* and tools/packs/living/hotfixes/*",
    action: "legacy",
    reason: "Legacy hotfix wrapper family is retained because the historical release tooling still points at these entrypoints.",
    replacement: "tools/checks/living/hotfixes/* and tools/packs/living/hotfixes/*",
    refsUpdated: "tools/README.md, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    riskIfRemoved: "Breaks historical hotfix release tooling.",
  },
];

const coverageMatrix = [
  {
    function: "Auth / login / role access",
    rolePanel: "Mobile login, step-up, KVKK",
    backendRouteService: "backend/src/routes/personelAccess.js; backend/src/routes/live.js; auth / step-up services",
    frontendSurface: "mobile/src/screens/LoginScreen.js; mobile/src/screens/ForcePasswordChangeScreen.js; mobile/src/screens/PinChangeScreen.js; web/src/panels/shared/KvkkPanel.jsx; web/src/panels/shared/KvkkConsentGate.jsx; web/src/panels/shared/TotpStepUpCard.jsx",
    currentCheckScript: "check:m98e2e; check:m98e2b; check:m98e2d; check:m98e5; check:m99kvkk01; check:m99ux01",
    checkType: "static + auth-session + device",
    coverageStatus: "PARTIAL_COVERAGE",
    missingGap: "No single canonical end-to-end login/role smoke; browser/device split stays manual.",
    ownerMilestone: "M98 / M99",
    requiredNextAction: "MISSING_FUTURE_MILESTONE: SECURITY-KVKK-FINAL-01",
  },
  {
    function: "Super Admin",
    rolePanel: "Super Admin panels",
    backendRouteService: "backend/src/routes/live.js; backend/src/routes/company.js; backend/src/routes/organization.js; backend/src/routes/requests.js",
    frontendSurface: "web/src/panels/superadmin/SuperAdminPanel.jsx; UsersPanel.jsx; RoomsPanel.jsx; RegionsPanel.jsx; CompaniesPanel.jsx; CommercialCorePanel.jsx; AuditLogsPanel.jsx; LogExportPanel.jsx; TrustQualityPanel.jsx; FieldAcceptanceCenter.jsx",
    currentCheckScript: "check:web01b; check:uxsuperadminoverviewcleanup01; check:uxsuperadminpanelclarity01; check:uxsuperadminlabelpolish01; check:uxsuperadminlivemonitoring01; check:uxsuperadminauditpanel01; check:uxsuperadminqualitypanel01; check:uxsuperadmincommercialflow01; check:uxsuperadminfielddispatchdiscovery01; check:uxsuperadminfieldacceptancecenter01; check:cop04bfix01; check:cop04bfix04; check:copliveaccept01; check:finaluxsmoke01",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "M97 / M99 / COP-04B",
    requiredNextAction: "None",
  },
  {
    function: "Room / Oda",
    rolePanel: "Room panels",
    backendRouteService: "backend/src/routes/shifts/room.js; backend/src/routes/requests.js; backend/src/routes/live.js; backend/src/routes/agreements.js",
    frontendSurface: "web/src/panels/room/roomOperationsBoard.jsx; roomShiftsMainSections.jsx; AgreementsPanel.jsx; ShiftsPanel.jsx; DriversPanel.jsx; MapPanel.jsx; VehiclesPanel.jsx; CommercialFlowPanel.jsx; CheckinPanel.jsx; HubPanel.jsx; OperationHealthPanel.jsx",
    currentCheckScript: "check:uxroomopspaneltabs01; check:uxroomopsrelationshippolish01; check:uxroomshiftstabs01; check:uxroomvehiclestelematicsfix; check:boardingops01a; check:boardingops01b; check:boardingops01c; check:routechangefinal01; check:finaluxsmoke01",
    checkType: "static + manual boundary",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "BOARDING-OPS / ROUTE-CHANGE-FINAL",
    requiredNextAction: "None",
  },
  {
    function: "Company / Firma",
    rolePanel: "Company panels",
    backendRouteService: "backend/src/routes/shifts/company.js; backend/src/routes/agreements.js; backend/src/routes/company.js; backend/src/routes/requests.js; backend/src/routes/personelAccess.js",
    frontendSurface: "web/src/panels/company/OperationsPanel.jsx; ShiftsPanel.jsx; AgreementsPanel.jsx; AgreementWizard.jsx; AgreementWizardModal.jsx; GuidedPlanModal.jsx; guidedPlanModalShell.jsx; CommercialFlowPanel.jsx; ServiceEvaluationPanel.jsx; MapPanel.jsx; WorkflowPanel.jsx; RoutePreviewModal.jsx; AgreementOpsBridgeCard.jsx; PersonelAccessPanel.jsx; PassengerLinksPanel.jsx; HubPanel.jsx; CompanyShiftsPanel*",
    currentCheckScript: "check:uxcompanyshiftstabs01; check:uxcompanymobileactionclarity01; check:uxcompanypersonelaccessmobileparity01; check:uxcompanyopspaneltabs01; check:uxcompanyqualitytabs01; check:uxcompanypanelssmoke01; check:routechangefinal01; check:boardingops01b; check:boardingops01c",
    checkType: "static + manual boundary",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "ROUTE-CHANGE-FINAL / BOARDING-OPS",
    requiredNextAction: "None",
  },
  {
    function: "School / Okul",
    rolePanel: "School panels",
    backendRouteService: "backend/src/routes/schoolParentInvites.js; backend/src/routes/requests.js; backend/src/routes/shifts/room.js",
    frontendSurface: "web/src/panels/school/OperationsPanel.jsx; ParentInvitePanel.jsx",
    currentCheckScript: "check:uxschoolorganizationpanels01; check:boardingops01a; check:boardingops01b; check:boardingops01c; check:finaluxsmoke01",
    checkType: "static + manual boundary",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "BOARDING-OPS / FINAL-UX-SMOKE",
    requiredNextAction: "None",
  },
  {
    function: "Organization / Kurum",
    rolePanel: "Organization panels",
    backendRouteService: "backend/src/routes/organization.js",
    frontendSurface: "web/src/panels/organization/PlansPanel.jsx; CenterPanel.jsx; organizationPlansShared.jsx",
    currentCheckScript: "check:uxnav01; check:routechangefinal01; check:finaluxsmoke01; check:web01b",
    checkType: "static",
    coverageStatus: "PARTIAL_COVERAGE",
    missingGap: "Dedicated organization flow smoke is narrower than company/room coverage.",
    ownerMilestone: "UX-NAV / ROUTE-CHANGE-FINAL",
    requiredNextAction: "MISSING_FUTURE_MILESTONE: ORG-CONTEXT-FINAL-01",
  },
  {
    function: "Driver / Sürücü",
    rolePanel: "Driver panels",
    backendRouteService: "backend/src/routes/driver.js; backend/src/routes/shifts/driver.js; backend/src/routes/live.js",
    frontendSurface: "web/src/panels/driver/TodayPanel.jsx; RoutePanel.jsx; MapPanel.jsx; CheckinPanel.jsx; PinChangePanel.jsx",
    currentCheckScript: "check:driverflowfinal01; check:boardingops01c; check:etasanity01; check:etaosrm01; check:etaosrm02; check:m95e20; check:m95e23b; check:m98e3; check:m98e4",
    checkType: "static + device + manual",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "BOARDING-OPS-01C / ETA",
    requiredNextAction: "None",
  },
  {
    function: "Parent / Veli",
    rolePanel: "Parent live panel",
    backendRouteService: "backend/src/routes/live.js; backend/src/routes/personelAccess.js; backend/src/routes/schoolParentInvites.js",
    frontendSurface: "web/src/panels/parent/LivePanel.jsx; web/src/panels/public/PassengerLivePanel.jsx",
    currentCheckScript: "check:cop04bfix08; check:m98e2d; check:uxparentpersonelliveerrorclarity01; check:finaluxsmoke01",
    checkType: "static + auth-session",
    coverageStatus: "PARTIAL_COVERAGE",
    missingGap: "Browser/mobile acceptance is now captured by MOBILE-WEB-FINAL-01; PASS- rows remain final risk backlog.",
    ownerMilestone: "COP-04B / M98",
    requiredNextAction: "MOBILE-WEB-FINAL-01",
  },
  {
    function: "Personel",
    rolePanel: "Personel live panel",
    backendRouteService: "backend/src/routes/live.js; backend/src/routes/personelAccess.js; backend/src/routes/personels.js",
    frontendSurface: "web/src/panels/personel/LivePanel.jsx; web/src/panels/personel/MyRidePanel.jsx",
    currentCheckScript: "check:cop04bfix03; check:copliveaccept01; check:m98e2b; check:uxparentpersonelliveerrorclarity01; check:finaluxsmoke01",
    checkType: "static + auth-session",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "Browser/mobile acceptance is now captured by MOBILE-WEB-FINAL-01; PASS- rows remain final risk backlog.",
    ownerMilestone: "COP-LIVE-ACCEPT / M98",
    requiredNextAction: "MOBILE-WEB-FINAL-01",
  },
  {
    function: "Public / Passenger",
    rolePanel: "Public passenger live panel",
    backendRouteService: "backend/src/routes/live.js; backend/src/routes/personelAccess.js",
    frontendSurface: "web/src/panels/public/PassengerLivePanel.jsx; web/src/panels/public/AcceptParentInvitePanel.jsx",
    currentCheckScript: "check:m98e2d; check:m98e4b; check:m98e4c",
    checkType: "auth-session + legacy compat",
    coverageStatus: "PARTIAL_COVERAGE",
    missingGap: "Public live acceptance still depends on compatibility aliases and manual flow; MOBILE-WEB-FINAL-01 reports the browser smoke boundary.",
    ownerMilestone: "M98 / M99",
    requiredNextAction: "MOBILE-WEB-FINAL-01",
  },
  {
    function: "Live Tracking / GPS / ETA",
    rolePanel: "Driver/room/company live map surfaces",
    backendRouteService: "backend/src/services/boardingRouteImpactPreview.js; backend/src/services/boardingChangeRouteRefresh.js; ETA / OSRM helpers",
    frontendSurface: "web/src/panels/driver/MapPanel.jsx; web/src/panels/company/MapPanel.jsx; web/src/panels/room/MapPanel.jsx; web/src/lib/markers/vehicleMarkerC.js; web/src/components/map/markers.css",
    currentCheckScript: "check:etasanity01; check:etaosrm01; check:etaosrm02; check:livetrackingfinal01; check:boardingops01c; check:uxlivemaptabssimplify01; check:m95e23b; check:m95e20",
    checkType: "static + release-only",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "ETA / BOARDING-OPS-01C",
    requiredNextAction: "None",
  },
  {
    function: "Agreements / Contract / Shift",
    rolePanel: "Company/room agreements and shifts",
    backendRouteService: "backend/src/routes/agreements.js; backend/src/routes/shifts/*.js; backend/src/services/agreementRouteChangePreview.js",
    frontendSurface: "web/src/panels/company/AgreementsPanel.jsx; web/src/panels/room/AgreementsPanel.jsx; web/src/panels/company/AgreementWizard.jsx; web/src/panels/shared/AgreementRouteChangePreviewCard.jsx",
    currentCheckScript: "check:routechangefinal01; check:m91c_shift_to_agreement_prefill_check; check:m91c_shift_origin_link_check; check:m91c_linked_shift_disable_convert_check; check:m91d_agreement_operations_bridge_check; check:m91ef_draft_slot_hardening_check; check:m91_route_preview_room_guard_fix_check",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "ROUTE-CHANGE-FINAL / M91",
    requiredNextAction: "None",
  },
  {
    function: "Boarding Ops",
    rolePanel: "Company/school/room boarding flow",
    backendRouteService: "backend/src/services/boardingRouteImpactPreview.js; backend/src/services/boardingChangeApplication.js; backend/src/services/boardingChangeRouteRefresh.js; backend/src/routes/requests.js; backend/src/routes/driver.js",
    frontendSurface: "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx; web/src/panels/shared/boardingChangeUi.js; company/school/room operations panels",
    currentCheckScript: "check:boardingops01a; check:bugrouteimpactpreviewbutton01; check:uxrouteimpactpreviewcompact01; check:boardingops01b; check:boardingops01c",
    checkType: "static + manual boundary",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "BOARDING-OPS-01A/01B/01C",
    requiredNextAction: "None",
  },
  {
    function: "Dynamic Savings / Readonly Preview",
    rolePanel: "Company/room agreements and commercial flow",
    backendRouteService: "backend/src/services/boardingRouteImpactPreview.js; backend/src/services/agreementRouteChangePreview.js; route preview helpers",
    frontendSurface: "web/src/panels/shared/DynamicSavingsPreviewCard.jsx; web/src/panels/company/AgreementsPanel.jsx; web/src/panels/room/AgreementsPanel.jsx; web/src/panels/company/companyAgreementsRouteRefreshPendingSection.jsx; web/src/panels/room/roomAgreementsPanelSections.jsx",
    currentCheckScript: "check:dynamicsavings01; check:routechangefinal01; check:boardingops01a; check:boardingops01b; check:boardingops01c; check:copliveaccept01",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain. Preview-only by design.",
    ownerMilestone: "DYNAMIC-SAVINGS-01",
    requiredNextAction: "None",
  },
  {
    function: "Commercial / Payment Preview",
    rolePanel: "Company/room commercial panels",
    backendRouteService: "backend/src/scripts/pay_*.js; backend/src/scripts/op_04*.js; payment readiness helpers",
    frontendSurface: "web/src/panels/company/CommercialFlowPanel.jsx; web/src/panels/room/CommercialFlowPanel.jsx; web/src/panels/superadmin/CommercialCorePanel.jsx",
    currentCheckScript: "check:pay01a; check:pay01b; check:pay01c; check:pay01d; check:pay01e; check:paysafe01; check:op04; check:qlt01; check:qlt02; check:qlt03; check:qlt04",
    checkType: "static + release-only",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "Execute/write actions remain deliberately forbidden.",
    ownerMilestone: "PAY / QLT / OP",
    requiredNextAction: "None",
  },
  {
    function: "Quality / Evidence",
    rolePanel: "Company/superadmin quality views",
    backendRouteService: "backend/src/scripts/qlt_*.js; backend/src/scripts/op_*.js; evidence helpers",
    frontendSurface: "web/src/panels/company/ServiceEvaluationPanel.jsx; web/src/panels/superadmin/TrustQualityPanel.jsx; web/src/panels/shared/ReportsPanel.jsx",
    currentCheckScript: "check:qlt01; check:qlt02; check:qlt03; check:qlt04; check:qlt04a; check:qlt04b; check:op01; check:op02; check:op03; check:op04",
    checkType: "static + release-only",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "QLT / OP",
    requiredNextAction: "None",
  },
  {
    function: "Sefer Abi / Copilot",
    rolePanel: "Copilot drawer and terminal",
    backendRouteService: "backend/src/ai/service.js; backend/src/ai/chat/helpComposer.js; backend/src/ai/chat/intentRouter.js; backend/src/ai/chat/answerQualityPolicy.js; backend/src/ai/chat/copilotRoleTaskMatrix.js; backend/src/ai/chat/copilotHumanApprovalPolicy.js; backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js; backend/src/ai/chat/conversationWorkflowReasoningEngine.js; backend/src/ai/chat/conversationOperationHealthEngine.js; backend/src/ai/chat/conversationNextBestActionEngine.js; backend/src/ai/chat/conversationPlanReviewEngine.js; backend/src/ai/jobGuide/screenCatalog.js",
    frontendSurface: "web/src/components/copilot/FloatingCopilotDrawer.jsx; web/src/panels/shared/CopilotPanel.jsx",
    currentCheckScript: "check:cop01a; check:cop01b; check:cop01c; check:cop01d; check:cop01e; check:cop02a; check:cop02b; check:cop02bfix01; check:cop03a; check:cop03afix01; check:cop03afix02; check:cop03b; check:cop03c; check:cop03cfix01; check:cop03cfix02; check:cop03cfix03; check:cop04a; check:cop04afix01; check:cop04afix02; check:cop04afix03; check:cop04afix04; check:cop04b; check:cop04bfix01; check:cop04bfix02; check:cop04bfix03; check:cop04bfix04; check:cop04bfix05; check:cop04bfix06; check:cop04bfix07; check:cop04bfix08; check:copilotroletaskmatrix01; check:copilotairoadmap01; check:copilotdemandagreement01; check:copilothumanapproval01; check:copilotexceldemandimport01; check:addressgeocodingconfidence01; check:copilotroutereviewhumanapproval01; check:copiloteblockruntimeanswerintegration01; check:copilotguidedtaskengine01; check:copilotdynamicquestionengine01; check:copilotsmartdiagnosticengine01; check:copilotrootcauseengine01; check:copilotworkflowreasoningengine01; check:copilotoperationhealthengine01; check:copilotnextbestactionengine01; check:copilotplanreviewengine01; check:hotfilesplitaichatcomposers01; check:hotfilesplitwebpanels01; check:seferabireasoningassistant01; check:copliveaccept01; check:uxcopilotpersona01; check:uxcopilotsmartchips01; check:uxcopilotterminal01; check:uxseferabilauncher01",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "COP-01..04 / COP-LIVE-ACCEPT-01",
    requiredNextAction: "None",
  },
  {
    function: "Telematics / Provider Hub",
    rolePanel: "Super Admin GPS readiness / Room vehicle mapping",
    backendRouteService: "docs/TELEMATICS_PROVIDER_HUB_01.md; backend/scripts/telematics_provider_hub_01_check.js",
    frontendSurface: "web/src/panels/superadmin/SuperAdminPanel.jsx; web/src/panels/room/roomVehiclesPanelSections.jsx",
    currentCheckScript: "check:telematicsproviderhub01; check:m44telematicst1t5; check:uxroomvehiclestelematicsfix",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "TELEMATICS-PROVIDER-HUB-01",
    requiredNextAction: "None",
  },
  {
    function: "Telematics / Safe Drive",
    rolePanel: "Driver live map and telematics surfaces",
    backendRouteService: "docs/SAFE_DRIVE_01.md; backend/scripts/safe_drive_01_check.js; ETA / OSRM helpers",
    frontendSurface: "web/src/utils/safeDriveSummary.js; web/src/panels/shared/SafeDriveSummaryCard.jsx; web/src/panels/driver/RoutePanel.jsx; web/src/panels/driver/MapPanel.jsx; web/src/panels/company/MapPanel.jsx; web/src/panels/room/MapPanel.jsx",
    currentCheckScript: "check:safedrive01; check:telematicsproviderhub01; check:m44telematicst1t5; check:etaosrm01; check:etaosrm02; check:etasanity01",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "None on the current static/product chain.",
    ownerMilestone: "SAFE-DRIVE-01",
    requiredNextAction: "None",
  },
  {
    function: "Offer Ranking Quality / Readonly Comparison",
    rolePanel: "Company / room / super admin offer comparison surfaces",
    backendRouteService: "docs/OFFER_RANKING_QUALITY_01.md; backend/scripts/offer_ranking_quality_01_check.js",
    frontendSurface: "web/src/utils/offerQualityRanking.js; web/src/panels/shared/OfferQualityRankingCard.jsx; web/src/panels/company/WorkflowPanel.jsx; web/src/panels/company/companyShiftsPanelSections.jsx; web/src/panels/room/OffersPanel.jsx; web/src/panels/superadmin/TrustQualityPanel.jsx",
    currentCheckScript: "check:offerrankingquality01",
    checkType: "static",
    coverageStatus: "COVERED_ACTIVE",
    missingGap: "Readonly comparison only; auto-select and auto-accept stay blocked.",
    ownerMilestone: "OFFER-RANKING-QUALITY-01",
    requiredNextAction: "None",
  },
  {
    function: "Performance / Reliability",
    rolePanel: "Repo audit / hot file hygiene",
    backendRouteService: "backend/scripts/repo_audit.js; m90c6-m90c10 repo hygiene gates",
    frontendSurface: "none",
    currentCheckScript: "check:product-extensions; check:verifychain01; check:finaluxsmoke01; verify:final; m90_c6/m90_c7/m90_c8/m90_c9/m90_c10 chain",
    checkType: "release-only",
    coverageStatus: "COVERED_RELEASE_ONLY",
    missingGap: "These are intentionally release gates, not commit-time smoke.",
    ownerMilestone: "M90C / verify:final",
    requiredNextAction: "None",
  },
  {
    function: "Brand / Docs / Release",
    rolePanel: "Docs, pack/export, closure tooling",
    backendRouteService: "tools/pack.ps1; tools/export_shareable_repo_bundle.ps1; docs-state and closure helpers",
    frontendSurface: "README.md; docs/*.md; tools/README.md; tools/wrappers/README.md",
    currentCheckScript: "check:brand; check:docsstate01; check:m99ux01; check:m99kvkk01; check:finaluxsmoke01; verify:final; verify:snapshot",
    checkType: "release-only + manual-release",
    coverageStatus: "COVERED_RELEASE_ONLY",
    missingGap: "No safe evidence-free pack/export path is intended.",
    ownerMilestone: "M90/M99/FINAL",
    requiredNextAction: "None",
  },
];

const missingCheckRows = [
  {
    candidate: "PROACTIVE-COPILOT-01",
    status: "MISSING_FUTURE_MILESTONE",
    why: "Proactive risk badge/drawer behavior is a future product behavior, not a current static consolidation target.",
    ownerMilestone: "Future Copilot milestone",
    requiredNextAction: "Wait for the feature milestone, then add a focused static check only if the behavior exists.",
  },
];

function buildM0M41LegacyFamilyRows() {
  const activeCore = new Set([0, 21, 37, 38, 41]);
  const archived = new Set([11, 12]);
  const rows = [];

  for (let milestoneNumber = 0; milestoneNumber <= 41; milestoneNumber += 1) {
    const milestone = `M${milestoneNumber}`;
    const script = `backend/scripts/m${milestoneNumber}check.js`;
    let status = "NEEDS_UPDATE";
    let reason = "Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model.";
    let replacement = "Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL)";
    let chainImpact = "Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first.";

    if (activeCore.has(milestoneNumber)) {
      status = "ACTIVE_CORE";
      replacement = "retained canonical family member";
      chainImpact = "Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern run_m0_latest runner also loses canonical coverage.";
      if (milestoneNumber === 0) {
        reason = "Health + /api/me smoke; current-model compatible.";
      } else if (milestoneNumber === 21) {
        reason = "SUPER_ADMIN companies + rooms create/list; current-model compatible.";
      } else if (milestoneNumber === 37) {
        reason = "School + Parent E2E; current security model compatible.";
      } else if (milestoneNumber === 38) {
        reason = "KVKK consent gate + prod guards; current security model compatible.";
      } else if (milestoneNumber === 41) {
        reason = "Refresh token + device binding + Redis rate-limit; current auth model compatible.";
      }
    } else if (archived.has(milestoneNumber)) {
      status = "ARCHIVED";
      reason = "Historical gate only; no longer a product-regression target.";
      replacement = "none";
      chainImpact = "Removing it breaks the legacy M0→M41 gate; the modern verify chain only loses historical coverage.";
    }

    rows.push({
      milestone,
      script,
      status,
      reason,
      replacement,
      "chain impact": chainImpact,
    });
  }

  return rows;
}

function replacementFor(entry, duplicateMap) {
  if (entry.status !== "LEGACY_COMPAT") return "";
  if (duplicateMap.has(entry.fullKey)) return duplicateMap.get(entry.fullKey);
  if (entry.path.endsWith("ux_company_panel_smoke_01_check.js")) return "backend/scripts/ux_company_ops_panel_tabs_01_check.js";
  if (entry.path.endsWith("ux_live_map_tabs_fix_01_check.js")) return "backend/scripts/ux_live_map_tabs_simplify_01_check.js";
  if (entry.path.endsWith("cop_04b_fix_06_live_drawer_context_bridge_check.js")) return "backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js";
  if (entry.path.endsWith("pack_living.ps1")) return "tools/pack.ps1";
  if (entry.path.endsWith("verify_living_static.ps1")) return "tools/verify_repo.ps1";
  if (entry.path.endsWith("verify_living_runtime.ps1")) return "tools/verify_final.ps1";
  if (entry.path.endsWith("pack_m71_room_title_hotfix.ps1")) return "tools/packs/living/hotfixes/pack_m71_room_title_hotfix.ps1";
  if (entry.path.endsWith("pack_m71_ui_contract_hotfix.ps1")) return "tools/packs/living/hotfixes/pack_m71_ui_contract_hotfix.ps1";
  if (entry.path.endsWith("pack_m71_workflow_loadsummary_hotfix.ps1")) return "tools/packs/living/hotfixes/pack_m71_workflow_loadsummary_hotfix.ps1";
  if (entry.path.endsWith("pack_m72_georeview_token.ps1")) return "tools/packs/living/hotfixes/pack_m72_georeview_token.ps1";
  if (entry.path.endsWith("pack_m75_repo_contract_hotfix.ps1")) return "tools/packs/living/hotfixes/pack_m75_repo_contract_hotfix.ps1";
  if (entry.path.endsWith("check_m71_room_title_hotfix_repo_contract.ps1")) return "tools/checks/living/hotfixes/check_m71_room_title_hotfix_repo_contract.ps1";
  if (entry.path.endsWith("check_m71_workflow_loadsummary_hotfix_repo_contract.ps1")) return "tools/checks/living/hotfixes/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1";
  if (entry.path.endsWith("check_m72_georeview_token_hotfix_repo_contract.ps1")) return "tools/checks/living/hotfixes/check_m72_georeview_token_hotfix_repo_contract.ps1";
  if (entry.fullKey === "root:check") return "verify:repo";
  if (entry.fullKey === "root:verify:ci") return "verify:repo";
  if (entry.fullKey === "backend:repo:check:chain") return "repo:check";
  if (entry.fullKey === "mobile:build:internal:android") return "build:preview:android";
  if (entry.fullKey === "mobile:build:internal:ios") return "build:preview:ios";
  if (entry.fullKey === "mobile:check:m96bnotifications") return "check:m96b";
  if (entry.fullKey === "root:check:osrmroutedraftfromexcel01") return "verify-core";
  if (entry.fullKey === "root:check:copilotroutereviewhumanapproval01") return "verify-core";
  if (entry.fullKey === "root:check:copiloteblockruntimeanswerintegration01") return "verify-core";
  if (entry.fullKey === "root:check:copilotguidedtaskengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotdynamicquestionengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotsmartdiagnosticengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotrootcauseengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotriskscoringengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotclarifyingquestionengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotworkflowreasoningengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotoperationhealthengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotnextbestactionengine01") return "verify-core";
  if (entry.fullKey === "root:check:copilotplanreviewengine01") return "verify-core";
  if (entry.fullKey === "root:check:hotfilesplitaichatcomposers01") return "verify-core";
  if (entry.fullKey === "root:check:hotfilesplitwebpanels01") return "verify-core";
  if (entry.fullKey === "root:check:seferabireasoningassistant01") return "verify-core";
  if (entry.fullKey === "root:check:seferabiturkishterminology01") return "verify-core";
  if (entry.fullKey === "root:check:seferabiturkishuserfacinglanguage01") return "verify-core";
  if (entry.fullKey === "root:check:uxroomagreementstabs01") return "check:uxpanelrealitycleanup02d";
  return "";
}

function chainForPackageEntry(pkg, name, status) {
  const full = `${pkg}:${name}`;
  if (status === "ACTIVE_CORE") {
    if (["root:check", "root:verify:repo", "root:verify:ci", "root:verify:closure", "root:verify:final", "root:check:product-extensions", "root:check:verifychain01", "root:check:scriptharnessconsolidation01", "root:check:dynamicsavings01", "root:check:verifiedsupplier01", "root:check:uxmarketplacepanels01", "root:check:productflowbuttonaudit01", "root:check:copilotexceldemandimport01", "root:check:addressgeocodingconfidence01", "root:check:copilotstoproutedraft01", "root:check:osrmroutedraftfromexcel01", "root:check:copilotroutereviewhumanapproval01", "root:check:copiloteblockruntimeanswerintegration01", "root:check:copilotguidedtaskengine01", "root:check:copilotdynamicquestionengine01", "root:check:copilotsmartdiagnosticengine01", "root:check:copilotrootcauseengine01", "root:check:copilotriskscoringengine01", "root:check:copilotclarifyingquestionengine01", "root:check:copilotoperationhealthengine01", "root:check:copilotnextbestactionengine01", "root:check:seferabireasoningassistant01", "root:check:seferabiturkishterminology01", "root:check:exceltoroutereadinessredteam01", "backend:repo:check", "backend:fullcheck"].includes(full)) return "verify-core";
    return "core";
  }
  if (status === "ACTIVE_BACKEND_LINT") return "backend-lint";
  if (status === "ACTIVE_WEB_LINT") return "web-lint";
  if (status === "ACTIVE_RELEASE_ONLY") {
    if (pkg === "backend" && /m90|m91|m92|m94|m95|m96|m97|m98|m99|op_|qlt_|pay_/.test(name)) return "verify:final";
    if (pkg === "root" && /verify|audit|lint|docsstate|e2e|fieldlaunch|op|qlt|pay|eta|live|driver|routechange|boardingops|ux/.test(name)) return "verify:final";
    if (pkg === "mobile" && /build|doctor/.test(name)) return "mobile-release";
    return "release";
  }
  if (status === "MANUAL_SMOKE") return "manual-smoke";
  if (status === "MANUAL_RELEASE_TOOL") return "manual-release";
  if (status === "REQUIRES_DEVICE") return "device";
  if (status === "REQUIRES_AUTH_SESSION") return "auth-session";
  if (status === "REQUIRES_ENV") return "env";
  if (status === "LEGACY_COMPAT") return "compat";
  if (status === "NEEDS_UPDATE") return "update";
  if (status === "REMOVE_CANDIDATE") return "cleanup";
  return "review";
}

function ownerFromName(name, pkg) {
  return slugToMilestone(`${pkg}-${name}`);
}

function makeDocsIndex() {
  const map = new Map();
  for (const relPath of selectedDocs) {
    if (!exists(relPath)) continue;
    map.set(relPath, normalize(readText(relPath)));
  }
  return map;
}

function countDocsRefs(textIndex, needleParts) {
  let count = 0;
  for (const txt of textIndex.values()) {
    let hit = false;
    for (const needle of needleParts) {
      if (txt.includes(normalize(needle))) {
        hit = true;
        break;
      }
    }
    if (hit) count += 1;
  }
  return count;
}

function collectOldSystemHits(fileEntries, docsIndex) {
  const hits = [];
  for (const entry of fileEntries) {
    const text = entry.textNorm;
    const matched = legacyTerms.filter((term) => text.includes(normalize(term)));
    if (matched.length > 0) {
      hits.push({
        path: entry.path,
        terms: matched,
        status: entry.status,
      });
    }
  }
  for (const [docRel, txt] of docsIndex.entries()) {
    const matched = legacyTerms.filter((term) => txt.includes(normalize(term)));
    if (matched.length > 0) {
      hits.push({
        path: docRel,
        terms: matched,
        status: "DOC",
      });
    }
  }
  return hits;
}

function makePackageRegistry(packageScripts, docsIndex) {
  const all = [];
  for (const [pkg, scriptMap] of Object.entries(packageScripts)) {
    for (const [name, cmd] of Object.entries(scriptMap)) {
      const fullKey = `${pkg}:${name}`;
      const entry = {
        kind: "package",
        pkg,
        name,
        fullKey,
        path: pkg === "root" ? "package.json" : `${pkg}/package.json`,
        command: cmd,
      };
      entry.status = statusFromPackage(pkg, name);
      entry.chain = chainForPackageEntry(pkg, name, entry.status);
      entry.skipReason = skipReasonForStatus(entry.status);
      entry.ownerMilestone = ownerFromName(name, pkg);
      entry.replacement = replacementFor(entry, new Map());
      entry.riskIfRemoved = riskIfRemoved(entry.status);
      entry.docsRefs = countDocsRefs(docsIndex, [name, cmd, path.basename(cmd), path.basename(cmd).replace(/\.(js|cjs|mjs|ps1|cmd|sh)$/i, "")]);
      entry.notes = [];
      if (entry.status === "LEGACY_COMPAT") entry.notes.push("compat alias");
      if (entry.status === "ACTIVE_CORE" && fullKey === "root:verify:final") entry.notes.push("canonical closure");
      if (pkg === "web" || pkg === "mobile") entry.notes.push(`${pkg} package`);
      if (pkg === "backend" && name === "lint") entry.notes.push("backend lint wrapper");
      all.push(entry);
    }
  }
  return all;
}

function aliasFromFileText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const cleaned = lines.filter((line) => !line.startsWith("//") && !line.startsWith("#") && !line.startsWith("/*") && !line.startsWith("*/") && !line.startsWith("#!"));
  if (cleaned.length === 1) {
    const line = cleaned[0];
    const jsImport = line.match(/^import\s+["'](.+?)["'];?$/);
    if (jsImport) return jsImport[1];
    const ps1Dot = line.match(/^\.\s*\((?:Join-Path\s+\$PSScriptRoot\s+)?["'](.+?)["']\)\s*$/i);
    if (ps1Dot) return ps1Dot[1];
  }
  const compatAlias = text.match(/^\s*#\s*compatibility_alias\s*:\s*(?:true|1|yes)\s*$/im);
  if (compatAlias) {
    const target = text.match(/^\s*#\s*canonical_target\s*:\s*(.+?)\s*$/im);
    return target ? target[1].trim() : "";
  }
  return "";
}

function makeFileRegistry(trackedFiles, packageRegistry, docsIndex) {
  const packageCommands = packageRegistry.filter((x) => x.kind === "package");
  const fileEntries = [];

  for (const relPath of trackedFiles) {
    if (!isExecLike(relPath)) continue;
    if (!fs.existsSync(path.join(repoRoot, relPath))) continue;
    const text = readText(relPath);
    const textNorm = normalize(text);
    const base = path.basename(relPath);
    const entry = {
      kind: "file",
      path: relPath,
      base,
      textNorm,
      commandRefs: [],
      docsRefs: 0,
      status: "NEEDS_REVIEW",
      chain: "review",
      skipReason: "",
      ownerMilestone: slugToMilestone(base.replace(/\.(js|cjs|mjs|ps1|cmd|sh)$/i, "")),
      replacement: "",
      riskIfRemoved: riskIfRemoved("NEEDS_REVIEW"),
      notes: [],
    };

    for (const pkgEntry of packageCommands) {
      const cmdNorm = normalize(pkgEntry.command);
      if (cmdNorm.includes(normalize(relPath)) || cmdNorm.includes(normalize(base)) || cmdNorm.includes(normalize(path.basename(base, path.extname(base))))) {
        entry.commandRefs.push(`${pkgEntry.pkg}:${pkgEntry.name}`);
      }
    }

    entry.docsRefs = countDocsRefs(docsIndex, [relPath, base, path.basename(base, path.extname(base))]);

    const aliasTarget = aliasFromFileText(text);
    const isArchive = /(^|\/)_archive(\/|$)/.test(relPath) || /(^|\/)legacy-docs(\/|$)/.test(relPath);

    if (isArchive) {
      entry.status = "ARCHIVED";
      entry.chain = "archived";
      entry.skipReason = "";
      entry.riskIfRemoved = riskIfRemoved(entry.status);
      entry.notes.push("archive path");
      fileEntries.push(entry);
      continue;
    }

    if (/^tools\/wrappers\/verify_repo\.ps1$/i.test(relPath) || /^tools\/wrappers\/verify_final\.ps1$/i.test(relPath)) {
      entry.status = "ACTIVE_CORE";
      entry.chain = relPath.includes("verify_final") ? "verify:final" : "verify:repo";
      entry.notes.push("canonical wrapper");
      fileEntries.push(entry);
      continue;
    }
    if (/^tools\/wrappers\/verify_living_(static|runtime)\.ps1$/i.test(relPath) || /^tools\/wrappers\/pack_living\.ps1$/i.test(relPath)) {
      entry.status = "LEGACY_COMPAT";
      entry.chain = "compat";
      entry.replacement = relPath.includes("pack_living") ? "tools/pack.ps1" : "tools/wrappers/verify_final.ps1";
      entry.notes.push("compat wrapper");
      entry.riskIfRemoved = riskIfRemoved(entry.status);
      fileEntries.push(entry);
      continue;
    }
    if (/^tools\/checks\/living\/hotfixes\//i.test(relPath) || /^tools\/packs\/living\/hotfixes\//i.test(relPath)) {
      entry.status = "ACTIVE_RELEASE_ONLY";
      entry.chain = "release";
      entry.notes.push("canonical living hotfix");
      fileEntries.push(entry);
      continue;
    }
    if (/^tools\/check_[a-z0-9_]+\.ps1$/i.test(relPath) || /^tools\/pack_[a-z0-9_]+\.ps1$/i.test(relPath)) {
      if (/check_m7[12]_|check_m72_|pack_m7[12]_/.test(relPath) || /pack_m75_repo_contract_hotfix|check_m71_room_title_hotfix_repo_contract|check_m71_workflow_loadsummary_hotfix_repo_contract|check_m72_georeview_token_hotfix_repo_contract/.test(relPath)) {
        entry.status = "LEGACY_COMPAT";
        entry.chain = "compat";
        entry.notes.push("compat alias");
        entry.replacement = aliasTarget || "";
      } else if (/check_repo_audit_master|pack_m90_|check_m90_|pack_m92_|pack_m93_|pack_docs_ssot|export_shareable_repo_bundle|write_m90_final_release_evidence|run_all_checks|verify_clean_clone|reset-and-pack|reset-dev/.test(relPath)) {
        entry.status = /export_shareable_repo_bundle|write_m90_final_release_evidence/.test(relPath) ? "ACTIVE_RELEASE_ONLY" : "MANUAL_RELEASE_TOOL";
        entry.chain = /m90_|m92_|m93_/.test(relPath) ? "release" : "manual";
      } else if (/^tools\/check_repo_audit_master\.ps1$/i.test(relPath)) {
        entry.status = "ACTIVE_RELEASE_ONLY";
        entry.chain = "release";
      } else if (/^tools\/check-repo\.ps1$/i.test(relPath)) {
        entry.status = "ACTIVE_CORE";
        entry.chain = "verify:repo";
      } else if (/^tools\/pack\.ps1$/i.test(relPath)) {
        entry.status = "ACTIVE_RELEASE_ONLY";
        entry.chain = "release";
      } else if (/^tools\/pack_living\.ps1$/i.test(relPath)) {
        entry.status = "LEGACY_COMPAT";
        entry.chain = "compat";
        entry.replacement = "tools/pack.ps1";
      } else if (/^tools\/verify_living_/.test(relPath)) {
        entry.status = "LEGACY_COMPAT";
        entry.chain = "compat";
      } else {
        entry.status = aliasTarget ? "LEGACY_COMPAT" : "ACTIVE_RELEASE_ONLY";
        entry.chain = aliasTarget ? "compat" : "release";
      }
      entry.replacement = entry.replacement || aliasTarget || "";
      entry.notes.push(aliasTarget ? "wrapper alias" : "release tool");
      entry.riskIfRemoved = riskIfRemoved(entry.status);
      fileEntries.push(entry);
      continue;
    }
    if (/^tools\/_packs\//i.test(relPath)) {
      entry.status = "ACTIVE_RELEASE_ONLY";
      entry.chain = "release";
      entry.notes.push("internal pack helper");
      fileEntries.push(entry);
      continue;
    }
    if (/^tools\/(?:_shared_functions|_console_status|_manifest_pack_helpers|_pack_runner|_repo_contract_common|_repo_contract_state|_repo_hygiene_preflight)\.ps1$/i.test(relPath)) {
      entry.status = "ACTIVE_RELEASE_ONLY";
      entry.chain = "release";
      entry.notes.push("internal helper");
      fileEntries.push(entry);
      continue;
    }

    if (/^backend\/scripts\/(?:run_repo_check_chain|run_product_extensions_check_chain|verify_chain_01_product_extensions_check|repo_audit|run_backend_lint|run_web_lint_with_evidence|clean_snapshot_artifacts|run_m0_latest|run_m91_route_preview_checks|relative_import_integrity_check|docs_ssot_pack_check|docs_state_01_recent_product_closure_check)\./i.test(relPath)) {
      entry.status = "ACTIVE_CORE";
      entry.chain = /run_web_lint_with_evidence|run_backend_lint/.test(relPath) ? "lint" : "verify:repo";
      entry.notes.push("canonical runner");
      fileEntries.push(entry);
      continue;
    }
    if (/^backend\/scripts\/script_harness_consolidation_01_check\.js$/i.test(relPath)) {
      entry.status = "ACTIVE_CORE";
      entry.chain = "product-extensions";
      entry.notes.push("canonical repo harness inventory");
      fileEntries.push(entry);
      continue;
    }
    if (/^backend\/scripts\/(?:boarding_ops_01a|boarding_ops_01b|boarding_ops_01c|route_change_final_01|dynamic_savings_01_check|cop_live_accept_01|final_ux_smoke_01|driver_flow_final_01|live_tracking_final_01|eta_sanity_01|eta_osrm_01|eta_osrm_02|e2e_smoke_01|field_launch_pack_01|ux_.*_check|cop_.*_check|osrm_.*_check|m9\d|m8\d|m7\d|m6\d|m5\d|m4\d|m3\d|m2\d|m1\d|m0check|m10check|m11check|m12check|m13check|m14check|m15check|m16check|m17check|m18check|m19check|m20check|m21check|m22check|m23check|m24check|m25check|m26check|m27check|m28check|m29check|m30check|m31check|m32check|m33check|m34check|m35check|m36check|m37check|m38check|m39check|m40check|m41check|m42_optional_check|m43_google_auth_invite_gate_check|m44_telematics_check|m44_telematics_t1_t5_check|m45_backup_create|m45_backup_restore|m45_retention_backup_check|m46_.*|m47_.*|m48_.*|m49_.*|m50_.*|m51_53_.*|m54_.*|m55_.*|m56_.*|m57_.*|m58_.*|m59_.*|m60_.*|m61_.*|m62_.*|m63_.*|m64_.*|m65_.*|m66_.*|m67_.*|m68_.*|m69_.*|m70_.*|m71_.*|m72_.*|m73_.*|m74_.*|m75_.*|m76_.*|m77_.*|m78_.*|m79_.*|m80_.*|m81_.*|m82_.*|m83_.*|m84_.*|m85_.*|m86_.*|m87_.*|m88_.*|m89_.*|m90_.*|m91_.*|m92_.*|m94_.*|m95_.*|m96_.*|m97_.*|m98_.*|m99_.*|op_.*|pay_.*|qlt_.*)\./i.test(relPath)) {
      entry.status = "ACTIVE";
      entry.chain = "product";
      entry.notes.push("product check/helper");
      if (/^backend\/scripts\/m9\d/.test(relPath) || /^backend\/scripts\/m8\d/.test(relPath)) {
        entry.chain = "release";
      }
      if (/^backend\/scripts\/m0check|m1check|m2check|m3check|m4check|m5check|m6check|m7check|m8check|m9check|m10check|m11check|m12check|m13check|m14check|m15check|m16check|m17check|m18check|m19check|m20check|m21check|m22check|m23check|m24check|m25check|m26check|m27check|m28check|m29check|m30check|m31check|m32check|m33check|m34check|m35check|m36check|m37check|m38check|m39check|m40check|m41check|m42_optional_check|m43_google_auth_invite_gate_check|m44_telematics_check|m44_telematics_t1_t5_check|m45_backup_create|m45_backup_restore/i.test(relPath)) {
        entry.status = "ACTIVE_RELEASE_ONLY";
      }
      fileEntries.push(entry);
      continue;
    }
    if (/^backend\/scripts\/(?:_harness|_agreement_source_shift_harness|_m91_route_preview_checks|_m91_smoke_helpers|_repoContractState|_static_milestone_check|_totp_harness)\.js$/i.test(relPath)) {
      entry.status = "ACTIVE";
      entry.chain = "helper";
      entry.notes.push("internal helper");
      fileEntries.push(entry);
      continue;
    }
    if (/^web\/scripts\//i.test(relPath)) {
      entry.status = "ACTIVE_WEB_LINT";
      entry.chain = "web-lint";
      entry.notes.push("frontend/web script");
      fileEntries.push(entry);
      continue;
    }
    if (/^mobile\/scripts\//i.test(relPath)) {
      if (/(m81_3_ios_readiness_check|m95_e26|m95_e27|m95_e20|m95_e21|m95_e22|m95_e23|m95_e24|m82_6|m82_7|m82_8|m57_4|m50)/i.test(relPath)) {
        entry.status = "REQUIRES_DEVICE";
      } else if (/(login|session|auth|invite|pin|kvkk)/i.test(relPath)) {
        entry.status = "REQUIRES_AUTH_SESSION";
      } else {
        entry.status = "ACTIVE";
      }
      entry.chain = "mobile";
      entry.notes.push("mobile script");
      fileEntries.push(entry);
      continue;
    }

    entry.status = aliasTarget ? "LEGACY_COMPAT" : "NEEDS_REVIEW";
    entry.chain = aliasTarget ? "compat" : "review";
    entry.replacement = aliasTarget || "";
    if (aliasTarget) entry.notes.push("simple alias wrapper");
    fileEntries.push(entry);
  }

  for (const entry of fileEntries) {
    if (!entry.commandRefs.length) continue;
    entry.commandRefs = [...new Set(entry.commandRefs)].sort();
    if (entry.commandRefs.some((ref) => ref.startsWith("root:verify:repo") || ref.startsWith("backend:repo:check"))) {
      entry.chain = "verify:repo";
    } else if (entry.commandRefs.some((ref) => ref.startsWith("root:check:product-extensions") || ref.startsWith("root:check:verifychain01") || ref.startsWith("root:check:dynamicsavings01") || ref.startsWith("root:check:verifiedsupplier01") || ref.startsWith("root:check:uxmarketplacepanels01") || ref.startsWith("root:check:productflowbuttonaudit01"))) {
      entry.chain = "product-extensions";
    } else if (entry.commandRefs.some((ref) => ref.startsWith("root:check:scriptharnessconsolidation01"))) {
      entry.chain = "product-extensions";
    } else if (entry.commandRefs.some((ref) => ref.startsWith("root:verify:final"))) {
      entry.chain = "verify:final";
    } else if (entry.commandRefs.some((ref) => ref.startsWith("root:lint:web") || ref.startsWith("web:lint") || ref.startsWith("web:check:"))) {
      entry.chain = "web-lint";
    } else if (entry.commandRefs.some((ref) => ref.startsWith("root:lint:backend") || ref.startsWith("backend:lint"))) {
      entry.chain = "backend-lint";
    }
  }

  return fileEntries;
}

function renderTable(rows, columns) {
  const header = `| ${columns.join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const lines = [header, separator];
  for (const row of rows) {
    lines.push(`| ${columns.map((col) => String(row[col] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  }
  return lines.join("\n");
}

function buildSummary(packageEntries, fileEntries, oldSystemHits, docsIndex) {
  const summary = {
    totalPackageScripts: packageEntries.length,
    totalExecutableFiles: fileEntries.length,
    totalRegistryEntries: packageEntries.length + fileEntries.length,
    byDomain: {
      root: packageEntries.filter((x) => x.pkg === "root").length,
      backend: packageEntries.filter((x) => x.pkg === "backend").length + fileEntries.filter((x) => x.path.startsWith("backend/")).length,
      web: packageEntries.filter((x) => x.pkg === "web").length + fileEntries.filter((x) => x.path.startsWith("web/")).length,
      mobile: packageEntries.filter((x) => x.pkg === "mobile").length + fileEntries.filter((x) => x.path.startsWith("mobile/")).length,
      tools: fileEntries.filter((x) => x.path.startsWith("tools/")).length,
      docs: docsIndex.size,
    },
  };

  const counts = new Map();
  for (const entry of [...packageEntries, ...fileEntries]) {
    counts.set(entry.status, (counts.get(entry.status) || 0) + 1);
  }
  summary.statusCounts = Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  summary.removedCount = removedAliasRecords.length;
  summary.duplicateOverlapGroupCount = duplicateOverlapGroups.length;
  summary.coverageRowCount = coverageMatrix.length;
  summary.missingCheckCount = missingCheckRows.length;
  const coverageCounts = new Map();
  for (const row of coverageMatrix) {
    coverageCounts.set(row.coverageStatus, (coverageCounts.get(row.coverageStatus) || 0) + 1);
  }
  summary.coverageStatusCounts = Object.fromEntries([...coverageCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  summary.docsUsed = docsIndex.size;
  summary.oldSystemHitCount = oldSystemHits.length;
  summary.browserHarnessCount = [...packageEntries, ...fileEntries].filter((x) => x.status === "REQUIRES_BROWSER" || x.status === "MANUAL_BROWSER_SMOKE").length;
  summary.removeCandidateCount = [...packageEntries, ...fileEntries].filter((x) => x.status === "REMOVE_CANDIDATE").length;
  return summary;
}

function buildDoc(summary, packageEntries, fileEntries, oldSystemHits) {
  const statusRows = Object.entries(summary.statusCounts).map(([status, count]) => ({ status, count }));
  const coverageRows = coverageMatrix.map((row) => ({ ...row }));
  const duplicateRows = duplicateOverlapGroups.map((row) => ({ ...row }));
  const missingRows = missingCheckRows.map((row) => ({ ...row }));
  const m0m41LegacyRows = buildM0M41LegacyFamilyRows();
  const removedRows = removedAliasRecords.map((row) => ({ ...row }));

  const packageRows = packageEntries.map((entry) => ({
    script: `${entry.pkg}:${entry.name}`,
    path: entry.path,
    domain: entry.pkg,
    "package command": entry.command,
    chain: entry.chain,
    status: entry.status,
    "skip reason": entry.skipReason,
    "owner milestone": entry.ownerMilestone,
    replacement: entry.replacement,
    "risk if removed": entry.riskIfRemoved,
    notes: entry.notes.join("; "),
  }));
  const fileRows = fileEntries.map((entry) => ({
    script: entry.base,
    path: entry.path,
    domain: entry.path.startsWith("backend/") ? "backend" : entry.path.startsWith("web/") ? "web" : entry.path.startsWith("mobile/") ? "mobile" : "tools",
    "package command": entry.commandRefs.join(", "),
    chain: entry.chain,
    status: entry.status,
    "skip reason": entry.skipReason,
    "owner milestone": entry.ownerMilestone,
    replacement: entry.replacement,
    "risk if removed": entry.riskIfRemoved,
    notes: entry.notes.join("; "),
  }));

  const rowsByDomain = {
    root: packageRows.filter((row) => row.domain === "root"),
    backend: packageRows.filter((row) => row.domain === "backend").concat(fileRows.filter((row) => row.domain === "backend")),
    web: packageRows.filter((row) => row.domain === "web").concat(fileRows.filter((row) => row.domain === "web")),
    mobile: packageRows.filter((row) => row.domain === "mobile").concat(fileRows.filter((row) => row.domain === "mobile")),
    tools: fileRows.filter((row) => row.domain === "tools"),
  };

  const skipRows = [...packageRows, ...fileRows].filter((row) => row["skip reason"]);
  const legacyRows = [...packageRows, ...fileRows].filter((row) => row.status === "LEGACY_COMPAT" || row.status === "ARCHIVED" || row.status === "NEEDS_UPDATE");
  const removeRows = [...packageRows, ...fileRows].filter((row) => row.status === "REMOVE_CANDIDATE");
  const manualRows = [...packageRows, ...fileRows].filter((row) => ["MANUAL_SMOKE", "MANUAL_BROWSER_SMOKE", "MANUAL_RELEASE_TOOL", "REQUIRES_ENV", "REQUIRES_BROWSER", "REQUIRES_AUTH_SESSION", "REQUIRES_DEVICE"].includes(row.status));
  const webPackageCount = packageRows.filter((row) => row.domain === "web").length;
  const coverageStatusRows = Object.entries(summary.coverageStatusCounts).map(([status, count]) => ({ status, count }));

  const out = [];
  out.push("# SCRIPT HARNESS CONSOLIDATION 01");
  out.push("");
  out.push(`Tarih: ${new Date().toISOString().slice(0, 10)}`);
  out.push(`Repo: \`servis-platform\``);
  out.push("");
  out.push("## 1) Kısa Özet");
  out.push("");
  out.push(`- Toplam package script entry: \`${summary.totalPackageScripts}\``);
  out.push(`- Toplam executable tracked file: \`${summary.totalExecutableFiles}\``);
  out.push(`- Combined registry row: \`${summary.totalRegistryEntries}\``);
  out.push(`- Root/backend/web/mobile package dağılımı: root \`${summary.byDomain.root}\`, backend \`${summary.byDomain.backend}\`, web \`${summary.byDomain.web}\`, mobile \`${summary.byDomain.mobile}\``);
  out.push(`- Tools executable dağılımı: tools \`${summary.byDomain.tools}\``);
  out.push(`- Docs indexed: \`${summary.byDomain.docs}\``);
  out.push(`- Public lead milestones: \`PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01 -> ONBOARDING-REVIEW-01 FINAL AUDIT -> INVITE-BASED-MEMBERSHIP-01 -> VERIFIED-SUPPLIER-01 -> UX-MARKETPLACE-PANELS-01 -> PRODUCT-FLOW-BUTTON-AUDIT-01 -> ...\``);
  out.push(`- UX preview milestones: \`UX-ROUTE-IMPACT-PREVIEW-COMPACT-01\` -> \`UX-LIVE-PANEL-COVERAGE-MATRIX-01\` -> \`UX-SMOKE-PASS-MINUS-EVIDENCE-01\` -> \`UX-SMOKE-PASS-MINUS-ZERO-01\` -> \`UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01\` -> \`UX-LIVE-PANEL-PREMIUM-SMOKE-01\``);
  out.push(`- UX preview docs: \`docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md\`, \`docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md\`, \`docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md\`, \`docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md\`, \`docs/UX_SMOKE_PASS_MINUS_ZERO_01.md\`, \`docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md\``);
  out.push(`- UX preview check alias: \`UX-ROUTE-IMPACT-PREVIEW-COMPACT-01-CHECK\``);
  out.push(`- Super Admin clarity milestone: \`UX-SUPERADMIN-PANEL-CLARITY-01\``);
  out.push(`- Super Admin clarity docs: \`docs/UX_SUPERADMIN_PANEL_CLARITY_01.md\``);
  out.push(`- Room vehicle/driver uppercase milestone: \`ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01\``);
  out.push(`- Room vehicle/driver uppercase docs: \`docs/ROOM_VEHICLE_DRIVER_UPPERCASE_NORMALIZATION_01.md\``);
  out.push(`- Room panel clarity milestone: \`UX-ROOM-PANEL-CLARITY-01\``);
  out.push(`- Room panel clarity docs: \`docs/UX_ROOM_PANEL_CLARITY_01.md\``);
  out.push(`- Room shifts density dedup milestone: \`UX-ROOM-SHIFTS-DENSITY-DEDUP-01\``);
  out.push(`- Room shifts density dedup docs: \`docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md\``);
  out.push(`- Room shifts density dedup command: \`node backend\\scripts\\ux_room_shifts_density_dedup_01_check.js\``);
  out.push(`- Room critical fix milestone: \`UX-PREMIUM-CRITICAL-FIX-ROOM-01\``);
  out.push(`- Room critical fix docs: \`docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md\``);
  out.push(`- Room critical fix command: \`node backend\\scripts\\ux_premium_critical_fix_room_01_check.js\``);
  out.push(`- Company mobile action clarity milestone: \`UX-COMPANY-MOBILE-ACTION-CLARITY-01\``);
  out.push(`- Company mobile action clarity docs: \`docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md\``);
  out.push(`- Company personel access mobile parity milestone: \`UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01\``);
  out.push(`- Company personel access mobile parity alias: \`check:uxcompanypersonelaccessmobileparity01\``);
  out.push(`- Company personel access mobile parity docs: \`docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md\``);
  out.push(`- Company personel access mobile parity command: \`node backend\\scripts\\ux_company_personel_access_mobile_parity_01_check.js\``);
  out.push(`- Company agreements mobile parity milestone: \`UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01\``);
  out.push(`- Company agreements mobile parity alias: \`check:uxcompanyagreementsmobileparity01\``);
  out.push(`- Company agreements mobile parity docs: \`docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md\``);
  out.push(`- Company agreements mobile parity command: \`node backend\\scripts\\ux_company_agreements_mobile_parity_01_check.js\``);
  out.push(`- Brand login premium milestone: \`UX-BRAND-LOGIN-PREMIUM-01\``);
  out.push(`- Brand login premium alias: \`check:uxbrandloginpremium01\``);
  out.push(`- Brand login premium docs: \`docs/UX_BRAND_LOGIN_PREMIUM_01.md\``);
  out.push(`- Brand login premium command: \`node backend\\scripts\\ux_brand_login_premium_01_check.js\``);
  out.push(`- Mobile web shell clarity milestone: \`UX-MOBILE-WEB-SHELL-CLARITY-01\``);
  out.push(`- Mobile web shell clarity docs: \`docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md\``);
  out.push(`- Mobile web shell clarity command: \`node backend\\scripts\\ux_mobile_web_shell_clarity_01_check.js\``);
  out.push(`- Mobile all roles panel fix milestone: \`UX-MOBILE-ALL-ROLES-PANEL-FIX-01\``);
  out.push(`- Mobile all roles panel fix docs: \`docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md\``);
  out.push(`- Mobile all roles panel fix command: \`node backend\\scripts\\ux_mobile_all_roles_panel_fix_01_check.js\``);
  out.push(`- Room / Company shifts mobile card fix milestone: \`UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01\``);
  out.push(`- Room / Company shifts mobile card fix docs: \`docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md\``);
  out.push(`- Room / Company shifts mobile card fix command: \`node backend\\scripts\\ux_room_company_shifts_mobile_card_fix_01_check.js\``);
  out.push(`- Shifts responsive layout fix milestone: \`UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01\``);
  out.push(`- Shifts responsive layout fix docs: \`docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md\``);
  out.push(`- Shifts responsive layout fix command: \`node backend\\scripts\\ux_shifts_responsive_layout_fix_01_check.js\``);
  out.push(`- Mobile overflow mini-map readability milestone: \`UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01\``);
  out.push(`- Mobile overflow mini-map readability docs: \`docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md\``);
  out.push(`- Mobile overflow mini-map readability command: \`node backend\\scripts\\ux_mobile_overflow_minimap_readability_01_check.js\``);
  out.push(`- Mobile overflow mini-map polish milestone: \`UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02\``);
  out.push(`- Mobile overflow mini-map polish docs: \`docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md\``);
  out.push(`- Mobile overflow mini-map polish command: \`node backend\\scripts\\ux_mobile_overflow_minimap_polish_02_check.js\``);
  out.push(`- Mobile all roles panel audit milestone: \`UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01\``);
  out.push(`- Mobile all roles panel audit docs: \`docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md\``);
  out.push(`- Mobile all roles panel audit command: \`node backend\\scripts\\ux_mobile_all_roles_panel_audit_01.mjs\``);
  out.push(`- Mobile web final acceptance milestone: \`MOBILE-WEB-FINAL-01\``);
  out.push(`- Mobile web final acceptance docs: \`docs/MOBILE_WEB_FINAL_01.md\``);
  out.push(`- Mobile web final acceptance command: \`node backend\\scripts\\mobile_web_final_01_check.js\``);
  out.push(`- Quality gate final milestone: \`QUALITY-GATE-FINAL-01\``);
  out.push(`- Quality gate final docs: \`docs/QUALITY_GATE_FINAL_01.md\``);
  out.push(`- Quality gate final command: \`node backend\\scripts\\quality_gate_final_01_check.js\``);
  out.push(`- Test quality and flake audit milestone: \`TEST-QUALITY-AND-FLAKE-AUDIT-01\``);
  out.push(`- Test quality and flake audit docs: \`docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md\``);
  out.push(`- Test quality and flake audit command: \`node backend\\scripts\\test_quality_and_flake_audit_01_check.js\``);
  out.push(`- AI response semantic quality gate milestone: \`AI-RESPONSE-SEMANTIC-QUALITY-GATE-01\``);
  out.push(`- AI response semantic quality gate docs: \`docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md\``);
  out.push(`- AI response semantic quality gate command: \`node backend\\scripts\\ai_response_semantic_quality_gate_01_check.js\``);
  out.push(`- Agreements detail milestone: \`UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01\``);
  out.push(`- Agreements detail docs: \`docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md\``);
  out.push(`- Agreements detail command: \`node backend\\scripts\\ux_premium_critical_fix_agreements_detail_01_check.js\``);
  out.push(`- UX cleanup milestone: \`UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01\``);
  out.push(`- UX cleanup docs: \`docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md\``);
  out.push(`- UX cleanup command: \`node backend\\scripts\\ux_premium_critical_uxfix_cleanup_01_check.js\``);
  out.push(`- Parent / Personel live error clarity milestone: \`UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01\``);
  out.push(`- Parent / Personel live error clarity docs: \`docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md\``);
  out.push(`- Panel standard architecture milestone: \`UX-PANEL-STANDARD-ARCHITECTURE-01\``);
  out.push(`- Panel standard architecture docs: \`docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md\``);
  out.push(`- PASS-minus evidence milestone: \`UX-SMOKE-PASS-MINUS-EVIDENCE-01\``);
  out.push(`- PASS-minus evidence docs: \`docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md\``);
  out.push(`- PASS-minus evidence command: \`node backend\\scripts\\ux_smoke_pass_minus_evidence_01_check.js\``);
  out.push(`- PASS-minus zero milestone: \`UX-SMOKE-PASS-MINUS-ZERO-01\``);
  out.push(`- PASS-minus zero docs: \`docs/UX_SMOKE_PASS_MINUS_ZERO_01.md\``);
  out.push(`- PASS-minus zero command: \`node backend\\scripts\\ux_smoke_pass_minus_zero_01_check.js\``);
  out.push(`- Public lead docs: \`docs/PUBLIC_LANDING_01.md\`, \`docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md\`, \`docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md\`, \`docs/LEAD_CAPTURE_01.md\`, \`docs/ONBOARDING_REVIEW_01.md\`, \`docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md\`, \`docs/INVITE_BASED_MEMBERSHIP_01.md\`, \`docs/VERIFIED_SUPPLIER_01.md\`, \`docs/UX_MARKETPLACE_PANELS_01.md\`, \`docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md\``);
  out.push(`- Verified supplier milestone: \`VERIFIED-SUPPLIER-01\``);
  out.push(`- Verified supplier check: \`check:verifiedsupplier01\``);
  out.push(`- Verified supplier docs: \`docs/VERIFIED_SUPPLIER_01.md\``);
  out.push(`- Marketplace panels milestone: \`UX-MARKETPLACE-PANELS-01\``);
  out.push(`- Marketplace panels check: \`check:uxmarketplacepanels01\``);
  out.push(`- Marketplace panels docs: \`docs/UX_MARKETPLACE_PANELS_01.md\``);
  out.push(`- Telematics baseline milestone: \`M44-TELEMATICS-T1-T5\``);
  out.push(`- Telematics baseline check: \`check:m44telematicst1t5\``);
  out.push(`- Telematics baseline docs: \`docs/M44_TELEMATICS_T1_T5.md\``);
  out.push(`- Telematics baseline command: \`node backend\\scripts\\m44_telematics_t1_t5_check.js\``);
  out.push(`- Telematics provider hub milestone: \`TELEMATICS-PROVIDER-HUB-01\``);
  out.push(`- Telematics provider hub check: \`check:telematicsproviderhub01\``);
  out.push(`- Telematics provider hub docs: \`docs/TELEMATICS_PROVIDER_HUB_01.md\``);
  out.push(`- Telematics provider hub command: \`node backend\\scripts\\telematics_provider_hub_01_check.js\``);
  out.push(`- Safe drive milestone: \`SAFE-DRIVE-01\``);
  out.push(`- Safe drive check: \`check:safedrive01\``);
  out.push(`- Safe drive docs: \`docs/SAFE_DRIVE_01.md\``);
  out.push(`- Safe drive command: \`node backend\\scripts\\safe_drive_01_check.js\``);
  out.push(`- Offer ranking quality milestone: \`OFFER-RANKING-QUALITY-01\``);
  out.push(`- Offer ranking quality check: \`check:offerrankingquality01\``);
  out.push(`- Offer ranking quality docs: \`docs/OFFER_RANKING_QUALITY_01.md\``);
  out.push(`- Offer ranking quality command: \`node backend\\scripts\\offer_ranking_quality_01_check.js\``);
  out.push(`- Copilot role/task matrix milestone: \`COPILOT-ROLE-TASK-MATRIX-01\``);
  out.push(`- Copilot role/task matrix check: \`check:copilotroletaskmatrix01\``);
  out.push(`- Copilot role/task matrix docs: \`docs/COPILOT_ROLE_TASK_MATRIX_01.md\``);
  out.push(`- Copilot role/task matrix command: \`node backend\\scripts\\copilot_role_task_matrix_01_check.js\``);
  out.push(`- Copilot AI action roadmap milestone: \`COPILOT-AI-ACTION-ROADMAP-01\``);
  out.push(`- Copilot AI action roadmap check: \`check:copilotairoadmap01\``);
  out.push(`- Copilot AI action roadmap docs: \`docs/COPILOT_AI_ACTION_ROADMAP_01.md\``);
  out.push(`- Copilot AI action roadmap command: \`node backend\\scripts\\copilot_ai_action_roadmap_01_check.js\``);
  out.push(`- Copilot demand-to-agreement roadmap milestone: \`COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01\``);
  out.push(`- Copilot demand-to-agreement roadmap check: \`check:copilotdemandagreement01\``);
  out.push(`- Copilot demand-to-agreement roadmap docs: \`docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md\``);
  out.push(`- Copilot demand-to-agreement roadmap command: \`node backend\\scripts\\copilot_demand_to_agreement_roadmap_01_check.js\``);
  out.push(`- Copilot human approval milestone: \`COPILOT-HUMAN-APPROVAL-01\``);
  out.push(`- Copilot human approval check: \`check:copilothumanapproval01\``);
  out.push(`- Copilot human approval docs: \`docs/COPILOT_HUMAN_APPROVAL_01.md\``);
  out.push(`- Copilot human approval command: \`node backend\\scripts\\copilot_human_approval_01_check.js\``);
  out.push(`- Copilot Excel demand import milestone: \`COPILOT-EXCEL-DEMAND-IMPORT-01\``);
  out.push(`- Copilot Excel demand import check: \`check:copilotexceldemandimport01\``);
  out.push(`- Copilot Excel demand import docs: \`docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md\``);
  out.push(`- Copilot Excel demand import command: \`node backend\\scripts\\copilot_excel_demand_import_01_check.js\``);
  out.push(`- Copilot stop/route draft milestone: \`COPILOT-STOP-ROUTE-DRAFT-01\``);
  out.push(`- Copilot stop/route draft check: \`check:copilotstoproutedraft01\``);
  out.push(`- Copilot stop/route draft docs: \`docs/COPILOT_STOP_ROUTE_DRAFT_01.md\``);
  out.push(`- Copilot stop/route draft command: \`node backend\\scripts\\copilot_stop_route_draft_01_check.js\``);
  out.push(`- Copilot stop/route draft helper: \`backend/src/ai/chat/copilotStopRouteDraftPolicy.js\``);
  out.push(`- Copilot OSRM route draft from Excel milestone: \`OSRM-ROUTE-DRAFT-FROM-EXCEL-01\``);
  out.push(`- Copilot OSRM route draft from Excel check: \`check:osrmroutedraftfromexcel01\``);
  out.push(`- Copilot OSRM route draft from Excel docs: \`docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md\``);
  out.push(`- Copilot OSRM route draft from Excel command: \`node backend\\scripts\\osrm_route_draft_from_excel_01_check.js\``);
  out.push(`- Copilot OSRM route draft from Excel helper: \`backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js\``);
  out.push(`- Copilot route review human approval milestone: \`COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01\``);
  out.push(`- Copilot route review human approval check: \`check:copilotroutereviewhumanapproval01\``);
  out.push(`- Copilot route review human approval docs: \`docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md\``);
  out.push(`- Copilot route review human approval command: \`node backend\\scripts\\copilot_route_review_human_approval_01_check.js\``);
  out.push(`- Copilot route review human approval helper: \`backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js\``);
  out.push(`- Excel to route readiness red-team milestone: \`EXCEL-TO-ROUTE-READINESS-REDTEAM-01\``);
  out.push(`- Excel to route readiness red-team check: \`check:exceltoroutereadinessredteam01\``);
  out.push(`- Excel to route readiness red-team docs: \`docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md\``);
  out.push(`- Excel to route readiness red-team command: \`node backend\\scripts\\excel_to_route_readiness_redteam_01_check.js\``);
  out.push(`- Excel to route readiness red-team helper: \`backend/src/ai/chat/excelToRouteReadinessRedteamPack.js\``);
  out.push(`- Copilot E-block runtime answer integration milestone: \`COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01\``);
  out.push(`- Copilot E-block runtime answer integration check: \`check:copiloteblockruntimeanswerintegration01\``);
  out.push(`- Copilot E-block runtime answer integration docs: \`docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md\``);
  out.push(`- Copilot E-block runtime answer integration command: \`node backend\\scripts\\copilot_e_block_runtime_answer_integration_01_check.js\``);
  out.push(`- Copilot E-block runtime answer integration helper: \`backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js\``);
  out.push(`- Copilot guided task engine milestone: \`COPILOT-GUIDED-TASK-ENGINE-01\``);
  out.push(`- Copilot guided task engine check: \`check:copilotguidedtaskengine01\``);
  out.push(`- Copilot guided task engine docs: \`docs/COPILOT_GUIDED_TASK_ENGINE_01.md\``);
  out.push(`- Copilot guided task engine command: \`node backend\\scripts\\copilot_guided_task_engine_01_check.js\``);
  out.push(`- Copilot guided task engine helper: \`backend/src/ai/chat/copilotGuidedTaskEngine.js\``);
  out.push(`- Copilot dynamic question engine milestone: \`COPILOT-DYNAMIC-QUESTION-ENGINE-01\``);
  out.push(`- Copilot dynamic question engine check: \`check:copilotdynamicquestionengine01\``);
  out.push(`- Copilot dynamic question engine docs: \`docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md\``);
  out.push(`- Copilot dynamic question engine command: \`node backend\\scripts\\copilot_dynamic_question_engine_01_check.js\``);
  out.push(`- Copilot dynamic question engine helper: \`backend/src/ai/chat/conversationTaskStateResponses.js\``);
  out.push(`- Copilot smart diagnostic engine milestone: \`COPILOT-SMART-DIAGNOSTIC-ENGINE-01\``);
  out.push(`- Copilot smart diagnostic engine check: \`check:copilotsmartdiagnosticengine01\``);
  out.push(`- Copilot smart diagnostic engine docs: \`docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md\``);
  out.push(`- Copilot smart diagnostic engine command: \`node backend\\scripts\\copilot_smart_diagnostic_engine_01_check.js\``);
  out.push(`- Copilot smart diagnostic engine helper: \`backend/src/ai/chat/conversationSmartDiagnostics.js\``);
  out.push(`- Copilot root cause engine milestone: \`COPILOT-ROOT-CAUSE-ENGINE-01\``);
  out.push(`- Copilot root cause engine check: \`check:copilotrootcauseengine01\``);
  out.push(`- Copilot root cause engine docs: \`docs/COPILOT_ROOT_CAUSE_ENGINE_01.md\``);
  out.push(`- Copilot root cause engine command: \`node backend\\scripts\\copilot_root_cause_engine_01_check.js\``);
  out.push(`- Copilot root cause engine helper: \`backend/src/ai/chat/conversationRootCauseEngine.js\``);
  out.push(`- Copilot risk scoring engine milestone: \`COPILOT-RISK-SCORING-ENGINE-01\``);
  out.push(`- Copilot risk scoring engine check: \`check:copilotriskscoringengine01\``);
  out.push(`- Copilot risk scoring engine docs: \`docs/COPILOT_RISK_SCORING_ENGINE_01.md\``);
  out.push(`- Copilot risk scoring engine command: \`node backend\\scripts\\copilot_risk_scoring_engine_01_check.js\``);
  out.push(`- Copilot risk scoring engine helper: \`backend/src/ai/chat/conversationRiskScoringEngine.js\``);
  out.push(`- Copilot clarifying question engine milestone: \`COPILOT-CLARIFYING-QUESTION-ENGINE-01\``);
  out.push(`- Copilot clarifying question engine check: \`check:copilotclarifyingquestionengine01\``);
  out.push(`- Copilot clarifying question engine docs: \`docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md\``);
  out.push(`- Copilot clarifying question engine command: \`node backend\\scripts\\copilot_clarifying_question_engine_01_check.js\``);
  out.push(`- Copilot clarifying question engine helper: \`backend/src/ai/chat/conversationTaskStateResponses.js\``);
  out.push(`- Copilot workflow reasoning engine milestone: \`COPILOT-WORKFLOW-REASONING-ENGINE-01\``);
  out.push(`- Copilot workflow reasoning engine check: \`check:copilotworkflowreasoningengine01\``);
  out.push(`- Copilot workflow reasoning engine docs: \`docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md\``);
  out.push(`- Copilot workflow reasoning engine command: \`node backend\\scripts\\copilot_workflow_reasoning_engine_01_check.js\``);
  out.push(`- Copilot workflow reasoning engine helper: \`backend/src/ai/chat/conversationWorkflowReasoningEngine.js\``);
  out.push(`- Copilot operation health engine milestone: \`COPILOT-OPERATION-HEALTH-ENGINE-01\``);
  out.push(`- Copilot operation health engine check: \`check:copilotoperationhealthengine01\``);
  out.push(`- Copilot operation health engine docs: \`docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md\``);
  out.push(`- Copilot operation health engine command: \`node backend\\scripts\\copilot_operation_health_engine_01_check.js\``);
  out.push(`- Copilot operation health engine helper: \`backend/src/ai/chat/conversationOperationHealthEngine.js\``);
  out.push(`- Copilot next best action engine milestone: \`COPILOT-NEXT-BEST-ACTION-ENGINE-01\``);
  out.push(`- Copilot next best action engine check: \`check:copilotnextbestactionengine01\``);
  out.push(`- Copilot next best action engine docs: \`docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md\``);
  out.push(`- Copilot next best action engine command: \`node backend\\scripts\\copilot_next_best_action_engine_01_check.js\``);
  out.push(`- Copilot next best action engine helper: \`backend/src/ai/chat/conversationNextBestActionEngine.js\``);
  out.push(`- Copilot plan review engine milestone: \`COPILOT-PLAN-REVIEW-ENGINE-01\``);
  out.push(`- Copilot plan review engine check: \`check:copilotplanreviewengine01\``);
  out.push(`- Copilot plan review engine docs: \`docs/COPILOT_PLAN_REVIEW_ENGINE_01.md\``);
  out.push(`- Copilot plan review engine command: \`node backend\\scripts\\copilot_plan_review_engine_01_check.js\``);
  out.push(`- Copilot plan review engine helper: \`backend/src/ai/chat/conversationPlanReviewEngine.js\``);
  out.push(`- Hot file split AI chat composers milestone: \`HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01\``);
  out.push(`- Hot file split AI chat composers check: \`check:hotfilesplitaichatcomposers01\``);
  out.push(`- Hot file split AI chat composers docs: \`docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md\``);
  out.push(`- Hot file split AI chat composers command: \`node backend\\scripts\\hot_file_split_ai_chat_composers_01_check.js\``);
  out.push(`- Hot file split AI chat composers helper: \`backend/src/ai/chat/helpComposerSafeReplies.js\``);
  out.push(`- Hot file split web panels milestone: \`HOT-FILE-SPLIT-WEB-PANELS-01\``);
  out.push(`- Hot file split web panels check: \`check:hotfilesplitwebpanels01\``);
  out.push(`- Hot file split web panels docs: \`docs/HOT_FILE_SPLIT_WEB_PANELS_01.md\``);
  out.push(`- Hot file split web panels command: \`node backend\\scripts\\hot_file_split_web_panels_01_check.js\``);
  out.push(`- Hot file split web panels bridge helpers: \`web/src/panels/company/companyAgreementsBridgeSection.jsx; web/src/panels/company/companyAgreementsPanelHelpers.js; web/src/panels/room/roomAgreementsBridgeSection.jsx; web/src/panels/room/roomAgreementsPanelHelpers.js\``);
  out.push(`- Sefer Abi reasoning assistant milestone: \`SEFER-ABI-REASONING-ASSISTANT-01\``);
  out.push(`- Sefer Abi reasoning assistant check: \`check:seferabireasoningassistant01\``);
  out.push(`- Sefer Abi reasoning assistant docs: \`docs/SEFER_ABI_REASONING_ASSISTANT_01.md\``);
  out.push(`- Sefer Abi reasoning assistant command: \`node backend\\scripts\\sefer_abi_reasoning_assistant_01_check.js\``);
  out.push(`- Sefer Abi reasoning assistant helper: \`backend/src/ai/chat/seferAbiReasoningAssistant.js\``);
  out.push(`- Sefer Abi all-roles reasoning assistant milestone: \`SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01\``);
  out.push(`- Sefer Abi all-roles reasoning assistant check: \`check:seferabiallrolesreasoningassistant01\``);
  out.push(`- Sefer Abi all-roles reasoning assistant docs: \`docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md\``);
  out.push(`- Sefer Abi all-roles reasoning assistant command: \`node backend\\scripts\\sefer_abi_all_roles_reasoning_assistant_01_check.js\``);
  out.push(`- Sefer Abi all-roles reasoning assistant helper: \`backend/src/ai/chat/seferAbiReasoningAssistant.js\``);
  out.push(`- Sefer Abi terminal humanize milestone: \`SEFER-ABI-TERMINAL-HUMANIZE-01\``);
  out.push(`- Sefer Abi terminal humanize check: \`check:seferabiterminalhumanize01\``);
  out.push(`- Sefer Abi terminal humanize docs: \`docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md\``);
  out.push(`- Sefer Abi terminal humanize command: \`node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js\``);
  out.push(`- Sefer Abi terminal humanize helper: \`backend/src/ai/chat/helpComposer.js\``);
  out.push(`- Sefer Abi Turkish user-facing terminology audit milestone: \`SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01\``);
  out.push(`- Sefer Abi Turkish user-facing terminology audit check: \`check:seferabiturkishterminology01\``);
  out.push(`- Sefer Abi Turkish user-facing terminology audit docs: \`docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md\``);
  out.push(`- Sefer Abi Turkish user-facing terminology audit command: \`node backend\\scripts\\sefer_abi_turkish_user_facing_terminology_01_check.js\``);
  out.push(`- Sefer Abi Turkish user-facing terminology audit helper: \`backend/src/ai/chat/helpComposer.js\``);
  out.push(`- Sefer Abi Turkish user-facing terminology audit reasoning surface: \`backend/src/ai/chat/seferAbiReasoningAssistant.js\``);
  out.push(`- Sefer Abi Turkish user-facing language audit milestone: \`SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01\``);
  out.push(`- Sefer Abi Turkish user-facing language audit check: \`check:seferabiturkishuserfacinglanguage01\``);
  out.push(`- Sefer Abi Turkish user-facing language audit docs: \`docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md\``);
  out.push(`- Sefer Abi Turkish user-facing language audit command: \`node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js\``);
  out.push(`- Sefer Abi Turkish user-facing language audit helper: \`backend/src/ai/chat/helpComposer.js\``);
  out.push(`- Sefer Abi Turkish user-facing language audit reasoning surface: \`backend/src/ai/chat/seferAbiReasoningAssistant.js\``);
  out.push(`- Address geocoding confidence milestone: \`ADDRESS-GEOCODING-CONFIDENCE-01\``);
  out.push(`- Address geocoding confidence check: \`check:addressgeocodingconfidence01\``);
  out.push(`- Address geocoding confidence docs: \`docs/ADDRESS_GEOCODING_CONFIDENCE_01.md\``);
  out.push(`- Address geocoding confidence command: \`node backend\\scripts\\address_geocoding_confidence_01_check.js\``);
  out.push(`- Address geocoding confidence helper: \`backend/src/ai/chat/addressGeocodingConfidencePolicy.js\``);
  out.push(`- Public lead audit check: \`check:productflowbuttonaudit01\``);
  out.push(`- Public lead audit smoke: \`smoke:productflowbuttonaudit01\``);
  out.push(`- Public lead audit commands: \`node backend\\scripts\\product_flow_button_audit_01_check.js\`, \`node backend\\scripts\\product_flow_button_audit_01.mjs\``);
  out.push(`- ACTIVE: \`${summary.statusCounts.ACTIVE || 0}\``);
  out.push(`- ACTIVE_CORE: \`${summary.statusCounts.ACTIVE_CORE || 0}\``);
  out.push(`- ACTIVE_WEB_LINT: \`${summary.statusCounts.ACTIVE_WEB_LINT || 0}\``);
  out.push(`- ACTIVE_BACKEND_LINT: \`${summary.statusCounts.ACTIVE_BACKEND_LINT || 0}\``);
  out.push(`- MANUAL_SMOKE: \`${summary.statusCounts.MANUAL_SMOKE || 0}\``);
  out.push(`- MANUAL_BROWSER_SMOKE: \`${summary.statusCounts.MANUAL_BROWSER_SMOKE || 0}\``);
  out.push(`- MANUAL_RELEASE_TOOL: \`${summary.statusCounts.MANUAL_RELEASE_TOOL || 0}\``);
  out.push(`- ACTIVE_RELEASE_ONLY: \`${summary.statusCounts.ACTIVE_RELEASE_ONLY || 0}\``);
  out.push(`- REQUIRES_ENV: \`${summary.statusCounts.REQUIRES_ENV || 0}\``);
  out.push(`- REQUIRES_BROWSER: \`${summary.statusCounts.REQUIRES_BROWSER || 0}\``);
  out.push(`- REQUIRES_AUTH_SESSION: \`${summary.statusCounts.REQUIRES_AUTH_SESSION || 0}\``);
  out.push(`- REQUIRES_DEVICE: \`${summary.statusCounts.REQUIRES_DEVICE || 0}\``);
  out.push(`- LEGACY_COMPAT: \`${summary.statusCounts.LEGACY_COMPAT || 0}\``);
  out.push(`- NEEDS_UPDATE: \`${summary.statusCounts.NEEDS_UPDATE || 0}\``);
  out.push(`- REMOVE_CANDIDATE: \`${summary.statusCounts.REMOVE_CANDIDATE || 0}\``);
  out.push(`- REMOVED: \`${summary.removedCount}\``);
  out.push(`- ARCHIVED: \`${summary.statusCounts.ARCHIVED || 0}\``);
  out.push(`- NEEDS_REVIEW: \`${summary.statusCounts.NEEDS_REVIEW || 0}\``);
  out.push(`- Duplicate/overlap groups: \`${summary.duplicateOverlapGroupCount}\``);
  out.push(`- Product coverage rows: \`${summary.coverageRowCount}\``);
  out.push(`- SKIP gerekçesi olan entry: \`${skipRows.length}\``);
  out.push(`- Eski sistem term eşleşmesi: \`${summary.oldSystemHitCount}\``);
  out.push(`- Browser automation harness bulundu mu: \`${summary.browserHarnessCount > 0 ? "Evet" : "Hayır"}\``);
  out.push(`- Remove candidate bulundu mu: \`${summary.removeCandidateCount > 0 ? "Evet" : "Hayır"}\``);
  out.push("");
  out.push("### Status Breakdown");
  out.push("");
  out.push(renderTable(statusRows, ["status", "count"]));
  out.push("");
  out.push("### Coverage Status Breakdown");
  out.push("");
  out.push(renderTable(coverageStatusRows, ["status", "count"]));
  out.push("");
  out.push("## 2) Script Registry Tablosu");
  out.push("");
  out.push("### Root Package");
  out.push(renderTable(rowsByDomain.root, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("### Backend");
  out.push(renderTable(rowsByDomain.backend, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("### Web");
  out.push(renderTable(rowsByDomain.web, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("### Mobile");
  out.push(renderTable(rowsByDomain.mobile, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("### Tools / Wrappers / Packs");
  out.push(renderTable(rowsByDomain.tools, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("## 3) Duplicate / Overlap Consolidation");
  out.push("");
  out.push(`- Duplicate / overlap groups found: \`${duplicateRows.length}\``);
  out.push(`- Removed alias wrappers: \`${removedRows.length}\``);
  out.push("");
  out.push(renderTable(duplicateRows, ["group", "duplicateScripts", "canonicalScript", "action", "reason", "replacement", "refsUpdated", "riskIfRemoved"]));
  out.push("");
  out.push("## 4) Product Function Coverage Matrix");
  out.push("");
  out.push(renderTable(coverageRows, ["function", "rolePanel", "backendRouteService", "frontendSurface", "currentCheckScript", "checkType", "coverageStatus", "missingGap", "ownerMilestone", "requiredNextAction"]));
  out.push("");
  out.push("## 5) Frontend / Web Registry");
  out.push("");
  out.push(`- Web package script sayısı: \`${webPackageCount}\``);
  out.push("- Browser automation harness: `0` adet; bu repo'da Playwright/Cypress tabanlı ayrı bir harness bulunmadı.");
  out.push("- Web lint ve responsive smoke kontrolleri statik dosya/DOM/hizalama check'leri olarak yaşar.");
  out.push("- Manual / env / device / auth yüzeyleri aşağıdaki tabloda ayrıca görünür.");
  out.push("");
  out.push(renderTable(manualRows, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("## 6) Backend Registry");
  out.push("");
  out.push("- Backend script/check yüzeyi canonical repo chain ve product-extensions chain etrafında toparlandı.");
  out.push("- `verify:repo`, `verify:final` ve `check:product-extensions` bu registry'nin ana omurgasıdır.");
  out.push("");
  out.push("## 7) Tools / Wrappers / Pack / Export Registry");
  out.push("");
  out.push("- `tools/pack.ps1` canonical master pack girişidir.");
  out.push("- `tools/pack_living.ps1`, `tools/wrappers/pack_living.ps1` ve `tools/wrappers/verify_living_*` compat/legacy girişlerdir.");
  out.push("- `tools/export_shareable_repo_bundle.ps1` ve `tools/write_m90_final_release_evidence.ps1` release-only araçlardır.");
  out.push("- `tools/check_repo_audit_master.ps1` repo audit master wrapper'ıdır.");
  out.push("");
  out.push("## 8) Skip Gerekçeleri");
  out.push("");
  out.push(renderTable(skipRows, ["script", "path", "status", "skip reason", "risk if removed", "notes"]));
  out.push("");
  out.push("## 9) Eksik Gerekli Script/Check Listesi");
  out.push("");
  out.push(`- MISSING_REQUIRED_NOW: \`${missingRows.filter((row) => row.status === "MISSING_REQUIRED_NOW").length}\``);
  out.push(`- MISSING_RELEASE_ONLY: \`${missingRows.filter((row) => row.status === "MISSING_RELEASE_ONLY").length}\``);
  out.push(`- MISSING_MANUAL_SMOKE: \`${missingRows.filter((row) => row.status === "MISSING_MANUAL_SMOKE").length}\``);
  out.push(`- MISSING_FUTURE_MILESTONE: \`${missingRows.filter((row) => row.status === "MISSING_FUTURE_MILESTONE").length}\``);
  out.push(`- NOT_NEEDED: \`${missingRows.filter((row) => row.status === "NOT_NEEDED").length}\``);
  out.push("");
  out.push(renderTable(missingRows, ["candidate", "status", "why", "ownerMilestone", "requiredNextAction"]));
  out.push("");
  out.push("## 10) Eski Sistem Kalıntıları");
  out.push("");
  if (oldSystemHits.length === 0) {
    out.push("- Eski sistem kelime kalıntısı bulunmadı.");
  } else {
    out.push(renderTable(oldSystemHits.slice(0, 40).map((row) => ({
      path: row.path,
      terms: row.terms.join(", "),
      status: row.status,
    })), ["path", "terms", "status"]));
  }
  out.push("");
  out.push("## 11) Cleanup Raporu");
  out.push("");
  out.push(`- REMOVED: \`${summary.removedCount}\``);
  out.push(`- REMOVE_CANDIDATE: \`${removeRows.length}\``);
  out.push("- ARCHIVED candidate: repo içindeki archive rotaları; aktif harness'ten kaldırılmadı.");
  out.push(`- NEEDS_UPDATE: \`${legacyRows.filter((row) => row.status === "NEEDS_UPDATE").length}\``);
  out.push("- LEGACY_COMPAT: alias/wrapper girişleri güvenli biçimde tutuldu.");
  out.push("");
  out.push("### Legacy / Archive / Update Candidates");
  out.push("");
  out.push(renderTable(legacyRows, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("### REMOVED");
  out.push("");
  out.push(renderTable(removedRows, ["group", "removed", "canonical", "action", "reason", "replacement", "refsUpdated", "riskIfRemoved"]));
  out.push("");
  out.push("### Remove Candidates");
  out.push("");
  out.push(renderTable(removeRows, ["script", "path", "domain", "package command", "chain", "status", "skip reason", "owner milestone", "replacement", "risk if removed", "notes"]));
  out.push("");
  out.push("## 12) Yeni Verify Standardı");
  out.push("");
  out.push("- Her commit: `npm run verify:repo`, `npm run check:product-extensions`, `npm run verify:final`");
  out.push("- Release-only: `verify:snapshot`, pack/export/evidence araçları");
  out.push("- Manual smoke: `smoke:*`, `bench:*`, `current:surface`, `run_all_checks.ps1`");
  out.push("- Env/device gerekenler: Android/iOS build profilleri, Expo / EAS ve cihaz/emülatör yüzeyleri");
  out.push("");
  out.push("## 13) M0-M41 Legacy Milestone Family");
  out.push("");
  out.push("- `m0-latest-static-milestones` = `node backend/scripts/run_m0_latest.js --static-only --to latest --continue` inside `verify:repo`.");
  out.push("- `run_m0_latest.js` discovers `backend/scripts/m*.{js,cjs,mjs}` and runs the static subset from M0 through latest; the legacy family below is the direct M0-M41 slice of that runner.");
  out.push("- `tools/gate.ps1` and `tools/_packs/pack_m0_m41.ps1` remain the explicit legacy M0→M41 gate; removing any listed file hard-fails that gate even if the modern runner merely loses coverage.");
  out.push("- Exact duplicate with `FINAL-UX-SMOKE-01`, `COP-LIVE-ACCEPT-01`, `BOARDING-OPS-01A/01B/01C`, or `ROUTE-CHANGE-FINAL-01`: none. The only partial overlap is the security / parent-live / KVKK / auth surface that later checks refined.");
  out.push("- Adjacent historical aliases `m162check.js` and `m163check.js` are outside the requested family and are not classified here.");
  out.push("");
  out.push(renderTable(m0m41LegacyRows, ["milestone", "script", "status", "reason", "replacement", "chain impact"]));
  out.push("");
  out.push("## 14) Notes");
  out.push("");
  out.push("- Bu doküman repo harness envanterini tek yerde toplar.");
  out.push("- Invite membership doc: `docs/INVITE_BASED_MEMBERSHIP_01.md`");
  out.push("- Safe cleanup bu turda yalnızca saf alias wrapper dosyalarında yapıldı.");
  out.push("- Legacy alias girişleri docs ve chain referansları nedeniyle korunuyor.");
  out.push("");
  return out.join("\n");
}

function verifyDoc(docText, summary) {
  const mustContain = [
    "# SCRIPT HARNESS CONSOLIDATION 01",
    "## 1) Kısa Özet",
    "## 2) Script Registry Tablosu",
    "## 3) Duplicate / Overlap Consolidation",
    "## 4) Product Function Coverage Matrix",
    "## 5) Frontend / Web Registry",
    "## 6) Backend Registry",
    "## 7) Tools / Wrappers / Pack / Export Registry",
    "## 8) Skip Gerekçeleri",
    "## 9) Eksik Gerekli Script/Check Listesi",
    "## 10) Eski Sistem Kalıntıları",
    "## 11) Cleanup Raporu",
    "## 12) Yeni Verify Standardı",
    "## 13) M0-M41 Legacy Milestone Family",
    "DYNAMIC-SAVINGS-01",
    "m0-latest-static-milestones",
    "tools/gate.ps1",
    "pack_m0_m41.ps1",
    "verify:final",
    "check:product-extensions",
    "check:publiclanding01",
    "check:publiclandingplatformfirst01",
    "check:leadcapture01",
    "check:onboardingreview01",
    "check:onboardingreviewfinalaudit01",
    "check:invitebasedmembership01",
    "check:uxmarketplacepanels01",
    "check:productflowbuttonaudit01",
    "smoke:productflowbuttonaudit01",
    "check:uxrouteimpactpreviewcompact01",
    "check:uxlivepanelsmokeaudit01",
    "check:uxsmokepassminusevidence01",
    "check:uxsmokepassminuszero01",
    "check:uxlivepanelpremiumsmoke01",
    "check:dynamicsavings01",
    "check:scriptharnessconsolidation01",
    "SEFER-ABI-TERMINAL-HUMANIZE-01",
    "check:seferabiterminalhumanize01",
    "docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md",
    "node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js",
    "SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01",
    "check:seferabiturkishuserfacinglanguage01",
    "docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md",
    "node backend\\scripts\\sefer_abi_turkish_user_facing_language_01_check.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/seferAbiReasoningAssistant.js",
    "SCRIPT-HARNESS-CONSOLIDATION-01",
    "PUBLIC-LANDING-01",
    "PUBLIC-LANDING-PLATFORM-FIRST-01",
    "LEAD-CAPTURE-01",
    "ONBOARDING-REVIEW-01",
    "ONBOARDING-REVIEW-01 FINAL AUDIT",
    "INVITE-BASED-MEMBERSHIP-01",
    "PRODUCT-FLOW-BUTTON-AUDIT-01",
    "UX-ROUTE-IMPACT-PREVIEW-COMPACT-01",
    "UX-LIVE-PANEL-COVERAGE-MATRIX-01",
    "UX-SMOKE-PASS-MINUS-EVIDENCE-01",
    "UX-SMOKE-PASS-MINUS-ZERO-01",
    "UX-LIVE-PANEL-PREMIUM-SMOKE-01",
    "ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01",
    "run_repo_check_chain.js",
    "run_product_extensions_check_chain.js",
    "verify_chain_01_product_extensions_check.js",
    "public_landing_platform_first_01_check.js",
    "onboarding_review_final_audit_01_check.js",
    "invite_based_membership_01_check.js",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "check:invitebasedmembership01",
    "INVITE-BASED-MEMBERSHIP-01",
    "verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "OFFER-RANKING-QUALITY-01",
    "check:offerrankingquality01",
    "offer_ranking_quality_01_check.js",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "web/src/utils/offerQualityRanking.js",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "check:verifiedsupplier01",
    "VERIFIED-SUPPLIER-01",
    "root:check:uxmarketplacepanels01",
    "root:check:verifiedsupplier01",
    "root:check:offerrankingquality01",
    "node backend\\scripts\\ux_marketplace_panels_01_check.js",
    "node backend\\scripts\\verified_supplier_01_check.js",
    "node backend\\scripts\\offer_ranking_quality_01_check.js",
    "Verified supplier milestone",
    "Verified supplier check",
    "Verified supplier docs",
    "UX-MARKETPLACE-PANELS-01",
    "node backend\\scripts\\product_flow_button_audit_01_check.js",
    "node backend\\scripts\\product_flow_button_audit_01.mjs",
    "product_flow_button_audit_01_check.js",
    "product_flow_button_audit_01.mjs",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md",
    "docs/LEAD_CAPTURE_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md",
  "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md",
  "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
  "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
    "docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md",
    "docs/UX_SUPERADMIN_PANEL_CLARITY_01.md",
  "docs/ROOM_VEHICLE_DRIVER_UPPERCASE_NORMALIZATION_01.md",
  "docs/UX_ROOM_PANEL_CLARITY_01.md",
  "UX-ROOM-SHIFTS-DENSITY-DEDUP-01",
  "check:uxroomshiftsdensitydedup01",
  "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
  "node backend\\scripts\\ux_room_shifts_density_dedup_01_check.js",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "UX-BRAND-LOGIN-PREMIUM-01",
    "check:uxbrandloginpremium01",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
  "UX-MOBILE-WEB-SHELL-CLARITY-01",
  "check:uxmobilewebshellclarity01",
  "node backend\\scripts\\ux_mobile_web_shell_clarity_01_check.js",
  "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
  "UX-MOBILE-ALL-ROLES-PANEL-FIX-01",
  "check:uxmobileallrolespanelfix01",
  "node backend\\scripts\\ux_mobile_all_roles_panel_fix_01_check.js",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
  "UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01",
  "check:uxroomcompanyshiftsmobilecardfix01",
  "node backend\\scripts\\ux_room_company_shifts_mobile_card_fix_01_check.js",
  "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
  "UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01",
    "check:uxmobileoverflowminimapreadability01",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02",
    "check:uxmobileoverflowminimappolish02",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
    "node backend\\scripts\\ux_mobile_overflow_minimap_polish_02_check.js",
    "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01",
    "check:uxmobileallrolespanelaudit01",
    "node backend\\scripts\\ux_mobile_all_roles_panel_audit_01.mjs",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "MOBILE-WEB-FINAL-01",
    "check:mobilewebfinal01",
    "node backend\\scripts\\mobile_web_final_01_check.js",
    "docs/MOBILE_WEB_FINAL_01.md",
    "QUALITY-GATE-FINAL-01",
    "check:qualitygatefinal01",
    "node backend\\scripts\\quality_gate_final_01_check.js",
    "docs/QUALITY_GATE_FINAL_01.md",
    "TEST-QUALITY-AND-FLAKE-AUDIT-01",
    "check:testqualityandflakeaudit01",
    "root:check:testqualityandflakeaudit01",
    "docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md",
    "node backend\\scripts\\test_quality_and_flake_audit_01_check.js",
    "AI-RESPONSE-SEMANTIC-QUALITY-GATE-01",
    "check:airesponsesemanticqualitygate01",
    "root:check:airesponsesemanticqualitygate01",
    "docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md",
    "node backend\\scripts\\ai_response_semantic_quality_gate_01_check.js",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "UX-PANEL-STANDARD-ARCHITECTURE-01",
    "check:uxpanelstandardarchitecture01",
    "node backend\\scripts\\ux_panel_standard_architecture_01_check.js",
    "UX-PREMIUM-CRITICAL-FIX-ROOM-01",
    "check:uxpremiumcriticalfixroom01",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "node backend\\scripts\\ux_premium_critical_fix_room_01_check.js",
    "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01",
    "check:uxpremiumcriticalfixagreementsdetail01",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "node backend\\scripts\\ux_premium_critical_fix_agreements_detail_01_check.js",
    "UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01",
    "check:uxpremiumcriticaluxfixcleanup01",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "node backend\\scripts\\ux_premium_critical_uxfix_cleanup_01_check.js",
    "node backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "node backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "node backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "node backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "node backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "node backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "node backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "UX-SUPERADMIN-PANEL-CLARITY-01",
    "Super Admin clarity docs",
    "UX-COMPANY-MOBILE-ACTION-CLARITY-01",
    "check:uxcompanymobileactionclarity01",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01",
    "check:uxcompanypersonelaccessmobileparity01",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "node backend\\scripts\\ux_company_personel_access_mobile_parity_01_check.js",
    "UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01",
    "check:uxcompanyagreementsmobileparity01",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "node backend\\scripts\\ux_company_agreements_mobile_parity_01_check.js",
    "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01",
    "check:uxparentpersonelliveerrorclarity01",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "COPILOT-AI-ACTION-ROADMAP-01",
    "check:copilotairoadmap01",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "node backend\\scripts\\copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01",
    "check:copilotdemandagreement01",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "node backend\\scripts\\copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "COPILOT-HUMAN-APPROVAL-01",
    "check:copilothumanapproval01",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "node backend\\scripts\\copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01",
    "check:copilotroutereviewhumanapproval01",
    "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
    "node backend\\scripts\\copilot_route_review_human_approval_01_check.js",
    "backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js",
    "EXCEL-TO-ROUTE-READINESS-REDTEAM-01",
    "check:exceltoroutereadinessredteam01",
    "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
    "node backend\\scripts\\excel_to_route_readiness_redteam_01_check.js",
    "backend/src/ai/chat/excelToRouteReadinessRedteamPack.js",
    "COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01",
    "check:copiloteblockruntimeanswerintegration01",
    "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
    "node backend\\scripts\\copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
    "COPILOT-EXCEL-DEMAND-IMPORT-01",
    "check:copilotexceldemandimport01",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "node backend\\scripts\\copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "COPILOT-STOP-ROUTE-DRAFT-01",
    "check:copilotstoproutedraft01",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "node backend\\scripts\\copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "OSRM-ROUTE-DRAFT-FROM-EXCEL-01",
    "check:osrmroutedraftfromexcel01",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "node backend\\scripts\\osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "ADDRESS-GEOCODING-CONFIDENCE-01",
    "check:addressgeocodingconfidence01",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "node backend\\scripts\\address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "Duplicate / overlap groups",
    "Product coverage rows",
    "REMOVED:",
    "MISSING_FUTURE_MILESTONE",
  ];
  for (const needle of mustContain) {
    if (!normalize(docText).includes(normalize(needle))) {
      throw new Error(`FAIL doc missing: ${needle}`);
    }
  }
  if (!normalize(docText).includes(normalize(String(summary.totalRegistryEntries)))) {
    throw new Error("FAIL doc summary total registry count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.totalPackageScripts)))) {
    throw new Error("FAIL doc summary package count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.totalExecutableFiles)))) {
    throw new Error("FAIL doc summary executable count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.removedCount)))) {
    throw new Error("FAIL doc summary removed count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.coverageRowCount)))) {
    throw new Error("FAIL doc summary coverage count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.duplicateOverlapGroupCount)))) {
    throw new Error("FAIL doc summary duplicate overlap count mismatch");
  }
}

function main() {
  const packageScripts = {
    root: getPackageScripts("package.json"),
    backend: getPackageScripts("backend/package.json"),
    web: getPackageScripts("web/package.json"),
    mobile: getPackageScripts("mobile/package.json"),
  };

  const docsIndex = makeDocsIndex();
  const tracked = gitTrackedFiles();
  const packageRegistry = makePackageRegistry(packageScripts, docsIndex);
  const fileRegistry = makeFileRegistry(tracked, packageRegistry, docsIndex);
  const oldSystemHits = collectOldSystemHits(fileRegistry, docsIndex);
  const summary = buildSummary(packageRegistry, fileRegistry, oldSystemHits, docsIndex);
  const docText = buildDoc(summary, packageRegistry, fileRegistry, oldSystemHits);

  if (shouldWriteDoc) {
    fs.writeFileSync(docPath, docText, "utf8");
    console.log(`WROTE ${path.relative(repoRoot, docPath).replace(/\\/g, "/")}`);
  }

  if (!exists(path.relative(repoRoot, docPath))) {
    throw new Error("FAIL docs/SCRIPT_HARNESS_CONSOLIDATION_01.md is missing; run with --write-doc first.");
  }

  const currentDoc = readText(path.relative(repoRoot, docPath));
  verifyDoc(currentDoc, summary);

  console.log("=== SCRIPT HARNESS CONSOLIDATION 01 CHECK ===");
  console.log(`Package scripts: ${summary.totalPackageScripts}`);
  console.log(`Executable files: ${summary.totalExecutableFiles}`);
  console.log(`Combined registry rows: ${summary.totalRegistryEntries}`);
  console.log(`ACTIVE_CORE: ${summary.statusCounts.ACTIVE_CORE || 0}`);
  console.log(`ACTIVE_WEB_LINT: ${summary.statusCounts.ACTIVE_WEB_LINT || 0}`);
  console.log(`ACTIVE_BACKEND_LINT: ${summary.statusCounts.ACTIVE_BACKEND_LINT || 0}`);
  console.log(`MANUAL_SMOKE: ${summary.statusCounts.MANUAL_SMOKE || 0}`);
  console.log(`MANUAL_RELEASE_TOOL: ${summary.statusCounts.MANUAL_RELEASE_TOOL || 0}`);
  console.log(`ACTIVE_RELEASE_ONLY: ${summary.statusCounts.ACTIVE_RELEASE_ONLY || 0}`);
  console.log(`REQUIRES_ENV: ${summary.statusCounts.REQUIRES_ENV || 0}`);
  console.log(`REQUIRES_AUTH_SESSION: ${summary.statusCounts.REQUIRES_AUTH_SESSION || 0}`);
  console.log(`REQUIRES_DEVICE: ${summary.statusCounts.REQUIRES_DEVICE || 0}`);
  console.log(`LEGACY_COMPAT: ${summary.statusCounts.LEGACY_COMPAT || 0}`);
  console.log(`NEEDS_UPDATE: ${summary.statusCounts.NEEDS_UPDATE || 0}`);
  console.log(`REMOVE_CANDIDATE: ${summary.statusCounts.REMOVE_CANDIDATE || 0}`);
  console.log(`REMOVED: ${summary.removedCount}`);
  console.log(`Duplicate/overlap groups: ${summary.duplicateOverlapGroupCount}`);
  console.log(`Product coverage rows: ${summary.coverageRowCount}`);
  console.log(`Coverage PARTIAL_COVERAGE: ${summary.coverageStatusCounts.PARTIAL_COVERAGE || 0}`);
  console.log(`Coverage COVERED_ACTIVE: ${summary.coverageStatusCounts.COVERED_ACTIVE || 0}`);
  console.log(`Coverage COVERED_RELEASE_ONLY: ${summary.coverageStatusCounts.COVERED_RELEASE_ONLY || 0}`);
  console.log("=== SCRIPT HARNESS CONSOLIDATION 01 CHECK PASS ===");
}

main();
