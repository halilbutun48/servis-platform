import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  gitExec,
  gitLines,
  repoRoot,
} from "./guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const documentationRegistryRepoRoot = path.resolve(__dirname, "../../..");
export const DOCUMENTATION_REGISTRY_V1_SCHEMA_VERSION = "docs-registry-v1";
export const DOCUMENTATION_REGISTRY_V1_GENERATED_AT = "2026-08-20T14:53:21.500Z";
export const DOCUMENTATION_REGISTRY_V1_PATH = "backend/indexes/documentation_registry_v1.json";

const DOCUMENTATION_DISCOVERY_EXTENSIONS = new Set([".md", ".mdx", ".markdown", ".rst", ".txt"]);
const DOCUMENTATION_DISCOVERY_EXACT_FALSE_POSITIVES = new Set([
  "web/src/panels/superadmin/SsotAlignmentPanel.jsx",
  "web/src/panels/shared/ReportsPanel.jsx",
  "backend/src/routes/ssotAlignment.js",
  "backend/src/routes/reports.js",
  "backend/src/lib/reports.js",
  "backend/src/ops/ssotAlignmentManifest.js",
  "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
]);

const CANONICAL_SSOT_PATHS = new Set([
  "README.md",
  "docs/CHECKLIST_SSOT.md",
  "docs/MILESTONE_REGISTRY_V1.md",
  "docs/PRIMER_SSOT.md",
  "tools/CHECKLIST_SSOT.md",
]);

const STALE_CONTRADICTORY_PATHS = new Set();

const REFERENCE_POINTER_PATHS = new Set([
  "web/README.md",
  "tools/packs/living/README.md",
  "backend/indexes/README.md",
  "tools/_packs/README.md",
  "tools/_backup/README.md",
  "docs/CONVERSATION_CLOSURE_INDEX_V1.md",
  "docs/BACKEND_REGION_OWNERSHIP_AND_ROUTING_TASKS_V1.md",
  "tools/README.md",
  "tools/PRIMER_SNAPSHOT.md",
  "tools/STABLE_TO.txt",
  "docs/architecture/README.md",
  "docs/HEDEF_KLASORLEME_VE_TEST_SIRASI_V1.md",
  "tools/wrappers/README.md",
  "docs/REGION_ZONE_ALT_SHARD_V1.md",
  "docs/REGION_SHARDING_STATUS_V1.md",
  "docs/REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md",
  "docs/REGION_SHARDING_READINESS_CHECKLIST_V1.md",
  "docs/REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md",
  "docs/REGION_SHARDING_DONE_NEXT_PHASE_CHECKLIST_V1.md",
  "docs/REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md",
  "docs/REGION_NEXT_PHASE_EXECUTION_PACK_V1.md",
  "docs/REGION_FAILOVER_REBALANCING_DRILL_V1.md",
  "docs/REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md",
  "docs/README.md",
  "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
  "docs/STATUS_STANDARD.md",
]);

const PRIMER_CANONICAL_OWNER_EXACT_PATHS = new Set([
  "web/README.md",
  "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
  "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
  "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
  "docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md",
  "docs/KVKK_AUDIT_ERISIM_IZI_V1.md",
  "docs/FINAL_RELEASE_EVIDENCE_M90.md",
  "docs/FIELD_LAUNCH_PACK_01_EVIDENCE_TEMPLATE.md",
  "docs/EVIDENCE_PACK_20260428.md",
  "docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md",
  "docs/MILESTONE_M51_PRE_PILOT_GAP_CLOSURE.md",
  "docs/MILESTONE_M90B_1_EXECUTABLE_CLOSURE_GATE.md",
  "docs/MILESTONE_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md",
  "docs/MILESTONE_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md",
  "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
  "docs/PERFORMANCE_EVIDENCE_20260427.md",
  "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md",
  "docs/REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md",
  "docs/REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md",
  "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
  "docs/SAHA_EVIDENCE_PACK_TEMPLATE.md",
  "docs/UX_ALL_PANELS_REALITY_AUDIT_01.md",
  "docs/UI_ACTION_WIRING_AUDIT_01.md",
  "docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md",
  "docs/UX_COLLAPSIBLE_PANELS_AUDIT_V1.md",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
  "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md",
  "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
  "docs/UX_PANEL_REALITY_AUDIT_02C.md",
  "docs/UX_PANEL_STRUCTURE_02_AUDIT.md",
  "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
  "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
  "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
]);

const ZERO_CONSUMER_ARCHIVE_BLOCKED_PATHS = new Set([
  "web/scripts/ui-smoke.md",
  "web/README.md",
  "backend/indexes/README.md",
  "tools/_packs/README.md",
  "docs/CONVERSATION_CLOSURE_INDEX_V1.md",
  "docs/OVERLAY_NOTES_M90G_M82_1_PRIMER_LIVING_ROUTE_FIX_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90F_M80_TOOLS_PRIMER_GATE_FIX_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90D_M65_PRIMER_GATE_FIX_2026-04-08.md",
  "docs/REGION_FIELD_ROLLOUT_RUNBOOK_V1.md",
  "docs/RUNBOOK_M34.md",
  "docs/RUNBOOK_CLEAN_CLONE_VERIFICATION_V1.md",
  "docs/RUNBOOK_M53_STOP_ROUTE_PRODUCTIZATION.md",
  "docs/RUNBOOK_M53_3_PLAN_BUILDER_STAGE3.md",
  "docs/RUNBOOK_M52_IMPORT_CONTRACT.md",
  "docs/RUNBOOK_M56_KVKK_ETA_QUALITY.md",
  "docs/RUNBOOK_M56_3_ETA_SKIP_REROUTE.md",
  "docs/RUNBOOK_M56_2_KVKK_VISIBILITY_ETA_QUALITY.md",
  "docs/RUNBOOK_M81_3_MOBILE_GPS_FLOW_SMOKE.md",
  "docs/RUNBOOK_M75_REPO_CONTRACT_HOTFIX.md",
  "docs/RUNBOOK_M72_GEOREVIEW_TOKEN_HOTFIX.md",
  "docs/RUNBOOK_M71_WORKFLOW_LOADSUMMARY_HOTFIX.md",
  "docs/RUNBOOK_M71_UI_CONTRACT_HOTFIX.md",
  "docs/RUNBOOK_M71_ROOM_TITLE_HOTFIX.md",
  "docs/RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md",
  "docs/STATUS_STANDARD.md",
]);

const GENERATED_BACKUP_OWNER_PREFIX = "artifacts/backups/";
const GENERATED_LINT_OWNER_PREFIX = "artifacts/lint/";
const GENERATED_REPO_AUDIT_PREFIX = "artifacts/encoding_";
const GENERATED_BROWSER_SMOKE_PREFIX = "backend/artifacts/browser-smoke/";
const GENERATED_ARTIFACTS_PREFIX = "artifacts/";
const VOLATILE_BACKUP_EVIDENCE_BASENAME_RE = /^servisdb_backup_\d{8}-\d{6}_(?:stderr\.txt|sql|manifest\.json)$/i;

const HISTORICAL_DIRECTORY_PREFIXES = [
  "docs/_archive/",
  "docs/overlays/",
  "tools/_archive/",
  "mobile/",
];

const HISTORICAL_PATH_PREFIXES = [
  "docs/MILESTONE_",
  "docs/RUNBOOK_",
  "docs/BOARDING_",
  "docs/FINAL_RELEASE_",
  "docs/VERIFY_LEGACY_",
  "docs/M44_",
  "docs/M90",
  "docs/M95_",
  "docs/M98_",
  "docs/M99_",
  "docs/M16_",
  "docs/SPRINT_",
  "docs/EPIC_",
  "docs/PHASE_",
  "docs/STEP1_",
];

const ACTIVE_COPILOT_V1_PATHS = new Set([
  "docs/COPILOT_BAGLAMLI_ONERI_V1.md",
  "docs/COPILOT_GLOBAL_ANSWER_QUALITY_V1.md",
  "docs/COPILOT_LIVE_DATA_ACTION_SIMULATION_V1.md",
  "docs/COPILOT_OPERASYON_REHBERI_KABUL_V1.md",
  "docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md",
  "docs/COPILOT_PERSONA_SEFER_ABI_V1.md",
  "docs/COPILOT_PROGRAM_ICI_GENEL_REHBER_V1.md",
  "docs/COPILOT_SCREEN_KNOWLEDGE_PARITY_V1.md",
  "docs/COPILOT_WORKFLOW_DOMAIN_DEPTH_V1.md",
]);

const ACTIVE_UX_HISTORICAL_PATHS = new Set([
  "docs/UX_ALL_PANELS_REALITY_AUDIT_01.md",
  "docs/UX_COLLAPSIBLE_PANELS_AUDIT_V1.md",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
  "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md",
  "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
  "docs/UX_PANEL_REALITY_AUDIT_02C.md",
  "docs/UX_PANEL_STRUCTURE_02_AUDIT.md",
  "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
  "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
]);

const ACTIVE_DOMAIN_EXACT_PATHS = new Set([
  "docs/AGENTS.md",
  "docs/API_QUICK_TEST.md",
  "docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md",
  "docs/AGREEMENT_SOURCE_SHIFT_LINEAGE_01.md",
  "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
  "docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md",
  "docs/CACHE_COALESCING_AND_BACKOFF_01.md",
  "docs/BUG_ROUTE_IMPACT_PREVIEW_BUTTON_01.md",
  "docs/AUTH_STEPUP_PROVIDER_LOCAL_DEFAULT_01.md",
  "docs/AUTH_STEPUP_DEV_TOGGLE_01.md",
  "docs/DB_SCHEMA_V1.md",
  "docs/DASHBOARD_BULK_ENDPOINT_01.md",
  "docs/COP_LIVE_ACCEPT_01_MATRIX.md",
  "docs/LIVING_BASELINE_M75.md",
  "docs/LEAD_CAPTURE_01.md",
  "docs/KVKK_VERI_GORUNURLUK_MATRISI_V1.md",
  "docs/KVKK_ROLE_PAYLOAD_DARALTMA_V1.md",
  "docs/KVKK_RETENTION_ENFORCEMENT_V1.md",
  "docs/KVKK_RETENTION_ANONIMLESTIRME_V1.md",
  "docs/KVKK_REDACTION_ENFORCEMENT_V1.md",
  "docs/KVKK_EXPORT_ERISIM_IZI_V1.md",
  "docs/KVKK_ENFORCEMENT_YUZEYI_V1.md",
  "docs/KVKK_AYDINLATMA_ENVANTERI_V1.md",
  "docs/KANIT_PROOF_KONTROL_OMURGASI_V1.md",
  "docs/KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md",
  "docs/KABUL_KRITERLERI_10_10_VARDIS.md",
  "docs/INVITE_BASED_MEMBERSHIP_01.md",
  "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md",
  "docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md",
  "docs/HEDEF_KLASORLEME_VE_TEST_SIRASI_V1.md",
  "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md",
  "docs/FINAL_UX_SMOKE_01_CHECKLIST.md",
  "docs/FIELD_LAUNCH_PACK_01_RUNBOOK.md",
  "docs/FIELD_LAUNCH_PACK_01_ROLLBACK_NO_GO.md",
  "docs/FIELD_LAUNCH_PACK_01_EVIDENCE_TEMPLATE.md",
  "docs/EVIDENCE_PACK_20260428.md",
  "docs/E2E_SMOKE_01_DEMO_ACCEPTANCE.md",
  "docs/DYNAMIC_SAVINGS_01.md",
  "docs/MARKETPLACE_FREE_TO_OPERATE_01.md",
  "docs/MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md",
  "docs/MOBILE_SCOPE_BOUNDARY_V1.md",
  "docs/PROJECT_SPEC_V1.md",
  "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
  "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
  "docs/PROACTIVE_COPILOT_NEXT_BEST_ACTION_01.md",
  "docs/PERFORMANCE_EVIDENCE_20260427.md",
  "docs/PARENT_ACCESS_FLOW.md",
  "docs/OVERLAY_ORGANIZATION_PLAN_OPS.md",
  "docs/OVERLAY_ORGANIZATION_MARKET_DIRECT_LIVE_FIX.md",
  "docs/OVERLAY_NOTES_M90H_FIX_M82_11_M83_M84_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90G_M82_1_PRIMER_LIVING_ROUTE_FIX_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90F_M80_TOOLS_PRIMER_GATE_FIX_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90E_M64_M89_SCAN_HARDENING_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90D_M65_PRIMER_GATE_FIX_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90C_M58_STATE_LOADER_FIX_2026-04-08.md",
  "docs/OVERLAY_NOTES_M90B_RUNTIME_REPO_CONTRACT_FIX_2026-04-08.md",
  "docs/REGION_FIELD_ROLLOUT_RUNBOOK_V1.md",
  "docs/QLT_PAY_BRIDGE_01.md",
  "docs/QLT_04_KALITE_KARAR_GECMISI_DENETIM_IZI.md",
  "docs/QLT_03_DENETIMLI_KALITE_ONAYI_TEKRAR_KONTROL.md",
  "docs/QLT_02_KONTROLLU_KALITE_SKORU_TASLAK_MODELI.md",
  "docs/QLT_01_KALITE_PUANI_SAGLAYICI_KARSILASTIRMA_HAZIRLIK.md",
  "docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md",
  "docs/ROOM_VEHICLE_DRIVER_UPPERCASE_NORMALIZATION_01.md",
  "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md",
  "docs/ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md",
  "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
  "docs/REQUEST_STORM_RESILIENCE_01.md",
  "docs/REPO_CONTRACT_MARKER_POLITIKASI_V1.md",
  "docs/SEED_USERS.md",
  "docs/SAHA_KABUL_CHECKLISTLERI_V1.md",
  "docs/SAHA_EVIDENCE_PACK_TEMPLATE.md",
  "docs/SAFE_DRIVE_01.md",
  "docs/STARTPACK_V1.md",
  "docs/SEFER_SCORE_01.md",
  "docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md",
  "docs/SUPPLIER_MATCHING_01.md",
  "docs/STATUS_20260322_BASELINE_GREEN.md",
  "docs/SYSTEM_ARCHITECTURE_V1.md",
  "docs/SUPPLIER_OFFER_COLLECT_01.md",
  "docs/TECHNICAL_DECISION_REGION_SHARDING_V1.md",
  "docs/TELEMATICS_PROVIDER_HUB_01.md",
  "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
  "docs/USAGE_ROOM.md",
  "docs/USAGE_PERSONEL.md",
  "docs/USAGE_GUIDE_V1.md",
  "docs/USAGE_DRIVER.md",
  "docs/USAGE_COMPANY.md",
  "docs/UI_SPEC_V1.md",
  "docs/UI_ACTION_WIRING_AUDIT_01.md",
  "docs/TURKIYE_GENELI_OLCEK_PLANI_3500_ARAC.md",
  "docs/TICARI_ODEME_VE_MUTABAKAT_HAZIRLIK_MODELI_V1.md",
  "docs/UX_CONTRACT_CONVERSION_OPS_BRIDGE_CLARITY_01.md",
  "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
  "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
  "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
  "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
  "docs/UX_MARKETPLACE_PANELS_01.md",
  "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
  "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
  "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
  "docs/OPTIONAL_CHECKIN_QR_NFC.md",
  "docs/OPERATIONAL_COST_MODEL_01.md",
  "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
  "docs/ONBOARDING_REVIEW_01.md",
  "docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md",
  "docs/OFFER_RANKING_QUALITY_01.md",
  "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
  "docs/OBSERVABILITY_MONITORING_ALERTING_01.md",
  "docs/UX_ROOM_PANEL_CLARITY_01.md",
  "docs/NOTIFICATION_PAYLOAD_STANDARD.md",
  "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
  "docs/NEXT_BACKLOG_V1.md",
  "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
  "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
  "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
  "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
  "docs/UX_SUPERADMIN_PANEL_CLARITY_01.md",
  "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
  "docs/VERIFIED_SUPPLIER_01.md",
  "docs/VOICE_COPILOT_ROLE_ASSISTANT_01.md",
]);

const HISTORICAL_EXACT_PATHS = new Set([
  "docs/QUALITY_GATE_FINAL_01.md",
  "docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md",
  "docs/BACKEND_LINT_WARNING_BURNDOWN_01.md",
  "docs/DATA_INTEGRITY_AND_RECOVERY_01.md",
  "docs/SECURITY_KVKK_FINAL_01.md",
  "docs/ROLE_DATA_ISOLATION_REDTEAM_01.md",
  "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md",
  "docs/OBSERVABILITY_MONITORING_ALERTING_01.md",
  "docs/DB_POOL_AND_API_SCALING_01.md",
  "docs/LOAD_TEST_2000_USERS_01.md",
  "docs/CACHE_COALESCING_AND_BACKOFF_01.md",
  "docs/REQUEST_STORM_RESILIENCE_01.md",
  "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md",
  "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md",
  "docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md",
  "docs/FINAL_RELEASE_EVIDENCE_M90.md",
  "docs/UX_ALL_PANELS_REALITY_AUDIT_01.md",
  "docs/UX_COLLAPSIBLE_PANELS_AUDIT_V1.md",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
  "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md",
  "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
  "docs/UX_PANEL_REALITY_AUDIT_02C.md",
  "docs/UX_PANEL_STRUCTURE_02_AUDIT.md",
  "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
  "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
  "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
  "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
  "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
  "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
  "docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md",
  "docs/COPILOT_DISPATCH_ACTION_PREP_01.md",
  "docs/COPILOT_DEMAND_INTAKE_01.md",
  "docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md",
  "docs/COPILOT_AI_ACTION_STRATEGY_01.md",
  "docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md",
  "docs/COPILOT_OFFER_ANALYSIS_01.md",
  "docs/COPILOT_NEGOTIATION_ASSIST_01.md",
  "docs/COPILOT_OFFER_RECOMMENDATION_01.md",
  "docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md",
  "docs/COPILOT_DISPATCH_ACTION_PREP_01.md",
  "docs/COPILOT_ACTION_PREP_01.md",
  "docs/COPILOT_RFQ_PREP_01.md",
  "docs/COPILOT_HUMAN_APPROVAL_01.md",
  "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
  "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
  "docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md",
  "docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md",
  "docs/COPILOT_PLAN_REVIEW_ENGINE_01.md",
  "docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md",
  "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
  "docs/COPILOT_RISK_SCORING_ENGINE_01.md",
  "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
  "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
  "docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md",
  "docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md",
  "docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md",
  "docs/COPILOT_ROOT_CAUSE_ENGINE_01.md",
  "docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md",
  "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
  "docs/COPILOT_LIVE_DATA_ACTION_SIMULATION_V1.md",
  "docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md",
  "docs/COPILOT_WORKFLOW_DOMAIN_DEPTH_V1.md",
  "docs/COPILOT_SCREEN_KNOWLEDGE_PARITY_V1.md",
  "docs/COPILOT_PROGRAM_ICI_GENEL_REHBER_V1.md",
  "docs/COPILOT_PERSONA_SEFER_ABI_V1.md",
  "docs/COPILOT_GLOBAL_ANSWER_QUALITY_V1.md",
  "docs/COPILOT_BAGLAMLI_ONERI_V1.md",
]);

const HISTORICAL_UX_PREFIXES = [
  "docs/UX_ALL_",
  "docs/UX_COLLAPSIBLE_",
  "docs/UX_LIVE_",
  "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
  "docs/UX_PANEL_INVENTORY_",
  "docs/UX_PANEL_REALITY_",
  "docs/UX_PANEL_STRUCTURE_",
  "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
  "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
];

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function comparePaths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function collectFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(abs, results);
      continue;
    }
    results.push(path.relative(repoRoot, abs).replace(/\\/g, "/"));
  }
  return results;
}

function isDocumentationLikePath(relPath) {
  const normalized = normalizePath(relPath);
  if (!normalized || normalized === DOCUMENTATION_REGISTRY_V1_PATH) {
    return false;
  }
  if (DOCUMENTATION_DISCOVERY_EXACT_FALSE_POSITIVES.has(normalized)) {
    return false;
  }
  if (/^backend\/artifacts\/browser-smoke\/[^/]+\/report\.json$/i.test(normalized)) {
    return true;
  }
  const base = path.posix.basename(normalized);
  return DOCUMENTATION_DISCOVERY_EXTENSIONS.has(path.posix.extname(base).toLowerCase());
}

export function discoverDocumentationRegistryV1Paths() {
  return collectFiles(repoRoot)
    .filter(isDocumentationLikePath)
    .sort(comparePaths);
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`FAIL ${label}: expected array`);
  }
  return value;
}

function collectDuplicatePathDiffs(entries, scopeLabel, diffType) {
  const counts = new Map();
  for (const entry of ensureArray(entries, `${scopeLabel}.entries`)) {
    const normalizedPath = normalizePath(entry?.path);
    counts.set(normalizedPath, (counts.get(normalizedPath) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort(([a], [b]) => comparePaths(a, b))
    .map(([pathText, count]) => ({
      type: diffType,
      path: pathText,
      count,
      scope: scopeLabel,
    }));
}

function bucketForPath(relPath) {
  const normalized = normalizePath(relPath);
  if (normalized === "README.md") {
    return "README.md";
  }
  const top = normalized.split("/")[0];
  return top || "README.md";
}

function buildConsumerIndex(paths) {
  const byBucket = new Map();
  for (const target of paths) {
    const bucket = bucketForPath(target);
    if (!byBucket.has(bucket)) {
      byBucket.set(bucket, []);
    }
    byBucket.get(bucket).push(target);
  }
  return byBucket;
}

function readTextIfPossible(relPath) {
  try {
    return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
  } catch {
    return null;
  }
}

function collectConsumerFiles() {
  const files = collectFiles(repoRoot).filter((relPath) => {
    const normalized = normalizePath(relPath);
    if (
      normalized === "README.md" ||
      normalized === "package.json" ||
      normalized === "backend/package.json"
    ) {
      return true;
    }
    if (normalized.startsWith("docs/")) {
      return true;
    }
    if (normalized.startsWith("backend/scripts/")) {
      return true;
    }
    if (normalized.startsWith("backend/data/")) {
      return true;
    }
    if (normalized.startsWith("backend/indexes/")) {
      return true;
    }
    if (normalized === "web/README.md") {
      return true;
    }
    if (
      normalized === "tools/README.md" ||
      normalized === "tools/PRIMER_SNAPSHOT.md" ||
      normalized === "tools/STABLE_TO.txt" ||
      normalized === "tools/_packs/README.md" ||
      normalized === "tools/_backup/README.md" ||
      normalized === "tools/packs/living/README.md" ||
      normalized === "tools/wrappers/README.md"
    ) {
      return true;
    }
    if (normalized === "infra/docker-compose.yml") {
      return true;
    }
    return false;
  });
  return files
    .filter((relPath) => !relPath.startsWith("node_modules/"))
    .filter((relPath) => relPath !== DOCUMENTATION_REGISTRY_V1_PATH)
    .filter((relPath) => !relPath.startsWith("backend/scripts/lib/documentationRegistryV1.js"))
    .filter((relPath) => !relPath.startsWith("backend/scripts/generate_documentation_registry_v1.js"))
    .filter((relPath) => !relPath.startsWith("backend/scripts/documentation_registry_v1_check.js"))
    .sort(comparePaths);
}

function isCheckerConsumerPath(relPath) {
  const normalized = normalizePath(relPath);
  if (normalized === "package.json" || normalized === "backend/package.json") {
    return true;
  }
  if (/(\.m?js|\.cjs|\.ps1|\.sh)$/i.test(normalized)) {
    return true;
  }
  return normalized.includes("/scripts/");
}

function buildConsumerGraph(targetPaths) {
  const consumerSets = new Map(targetPaths.map((targetPath) => [targetPath, new Set()]));
  const bucketedTargets = buildConsumerIndex(targetPaths);
  const consumerFiles = collectConsumerFiles();

  for (const consumerFile of consumerFiles) {
    const content = readTextIfPossible(consumerFile);
    if (content == null) {
      continue;
    }

    for (const [bucket, targets] of bucketedTargets.entries()) {
      const bucketNeedle = bucket === "README.md" ? "README.md" : `${bucket}/`;
      if (!content.includes(bucketNeedle)) {
        continue;
      }

      for (const target of targets) {
        if (content.includes(target)) {
          consumerSets.get(target).add(consumerFile);
        }
      }
    }
  }

  return { consumerSets, consumerFiles };
}

function isHistoricalDocumentationPath(relPath) {
  const normalized = normalizePath(relPath);
  if (normalized === "docs/MILESTONE_REGISTRY_V1.md") {
    return false;
  }
  if (HISTORICAL_DIRECTORY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  if (HISTORICAL_EXACT_PATHS.has(normalized)) {
    return true;
  }
  if (HISTORICAL_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  if (normalized.startsWith("docs/COPILOT_") && !normalized.endsWith("_V1.md")) {
    return true;
  }
  if (ACTIVE_COPILOT_V1_PATHS.has(normalized)) {
    return false;
  }
  if (normalized.startsWith("docs/UX_") && HISTORICAL_UX_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  return false;
}

function isReferencePointerPath(relPath) {
  const normalized = normalizePath(relPath);
  return REFERENCE_POINTER_PATHS.has(normalized);
}

function isCanonicalPath(relPath) {
  return CANONICAL_SSOT_PATHS.has(normalizePath(relPath));
}

function isStalePath(relPath) {
  return STALE_CONTRADICTORY_PATHS.has(normalizePath(relPath));
}

function isGeneratedArtifactPath(relPath) {
  const normalized = normalizePath(relPath);
  if (normalized.startsWith(GENERATED_ARTIFACTS_PREFIX) || normalized.startsWith("backend/artifacts/")) {
    return true;
  }
  return false;
}

function isVolatileBackupEvidencePath(relPath) {
  const normalized = normalizePath(relPath);
  return normalized.startsWith(GENERATED_BACKUP_OWNER_PREFIX) && VOLATILE_BACKUP_EVIDENCE_BASENAME_RE.test(path.posix.basename(normalized));
}

function canonicalOwnerForPath(relPath) {
  const normalized = normalizePath(relPath);

  if (normalized === "README.md" || normalized === "docs/PRIMER_SSOT.md" || normalized === "docs/CHECKLIST_SSOT.md" || normalized === "docs/MILESTONE_REGISTRY_V1.md" || normalized === "tools/CHECKLIST_SSOT.md") {
    return normalized;
  }
  if (PRIMER_CANONICAL_OWNER_EXACT_PATHS.has(normalized)) {
    return "docs/PRIMER_SSOT.md";
  }
  if (normalized.startsWith("docs/overlays/") || normalized.startsWith("docs/_archive/") || normalized.startsWith("tools/_archive/")) {
    return "docs/PRIMER_SSOT.md";
  }
  if (normalized.startsWith(GENERATED_BACKUP_OWNER_PREFIX)) {
    return "backend/src/ops/backupArchiveOps.js";
  }
  if (normalized.startsWith(GENERATED_LINT_OWNER_PREFIX)) {
    return "backend/scripts/backendlintwarningburndown01_check.js";
  }
  if (normalized.startsWith(GENERATED_REPO_AUDIT_PREFIX)) {
    return normalized === "artifacts/repo_deep_audit_latest.md"
      ? "artifacts/repo_deep_audit_latest.md"
      : "artifacts/repo_deep_audit_latest.md";
  }
  if (normalized.startsWith(GENERATED_BROWSER_SMOKE_PREFIX)) {
    return "backend/scripts/final_ux_smoke_01_check.js";
  }
  if (normalized === "web/README.md") {
    return "docs/PRIMER_SSOT.md";
  }
  return normalized;
}

function ownerDomainForPath(relPath, classification) {
  const normalized = normalizePath(relPath);

  if (normalized === "README.md") {
    return "ROOT";
  }
  if (normalized.startsWith("backend/artifacts/")) {
    return "BACKEND";
  }
  if (normalized.startsWith("artifacts/")) {
    return "ARTIFACTS";
  }
  if (normalized.startsWith("backend/")) {
    if (normalized.startsWith("backend/indexes/") || normalized === "backend/indexes/README.md") {
      return "BACKEND";
    }
    return "BACKEND";
  }
  if (normalized.startsWith("web/")) {
    return "WEB";
  }
  if (normalized.startsWith("mobile/")) {
    return "MOBILE";
  }
  if (normalized.startsWith("tools/")) {
    if (classification === "REFERENCE_POINTER" && normalized === "tools/STABLE_TO.txt") {
      return "TOOLING";
    }
    if (classification === "REFERENCE_POINTER" || normalized === "tools/README.md" || normalized === "tools/PRIMER_SNAPSHOT.md") {
      return "TOOLS";
    }
    return "TOOLS";
  }
  if (classification === "REFERENCE_POINTER" && normalized.startsWith("docs/architecture/")) {
    return "DOCUMENTATION";
  }
  if (classification === "REFERENCE_POINTER" && (normalized === "docs/README.md" || normalized === "docs/STATUS_STANDARD.md" || normalized === "docs/CONVERSATION_CLOSURE_INDEX_V1.md")) {
    return "DOCS";
  }
  if (normalized === "docs/AGENTS.md") {
    return "DOCS";
  }
  return "DOCUMENTATION";
}

function classificationForPath(relPath) {
  const normalized = normalizePath(relPath);
  if (isCanonicalPath(normalized)) {
    return "CANONICAL_SSOT";
  }
  if (isStalePath(normalized)) {
    return "STALE_CONTRADICTORY";
  }
  if (isGeneratedArtifactPath(normalized)) {
    return "DERIVED_GENERATED";
  }
  if (isReferencePointerPath(normalized)) {
    return "REFERENCE_POINTER";
  }
  if (isHistoricalDocumentationPath(normalized)) {
    return "HISTORICAL_EVIDENCE";
  }
  return "ACTIVE_DOMAIN_DOC";
}

function notesStatusReasonForEntry(entry) {
  switch (entry.classification) {
    case "CANONICAL_SSOT":
      return `canonical anchor; consumerCount=${entry.consumerCount}`;
    case "REFERENCE_POINTER":
      return `reference pointer; consumerCount=${entry.consumerCount}`;
    case "HISTORICAL_EVIDENCE":
      return `historical evidence artifact; consumerCount=${entry.consumerCount}`;
    case "DERIVED_GENERATED":
      return `generated evidence artifact; consumerCount=${entry.consumerCount}`;
    case "STALE_CONTRADICTORY":
      return `stale contradictory artifact; replacement=${entry.replacement || "null"}`;
    case "ACTIVE_DOMAIN_DOC":
    default:
      return `active domain doc; consumerCount=${entry.consumerCount}`;
  }
}

function archiveDispositionForClassification(classification) {
  switch (classification) {
    case "CANONICAL_SSOT":
    case "ACTIVE_DOMAIN_DOC":
      return "KEEP_ACTIVE";
    case "REFERENCE_POINTER":
      return "KEEP_POINTER";
    case "HISTORICAL_EVIDENCE":
      return "KEEP_IN_ARCHIVE";
    case "DERIVED_GENERATED":
      return "KEEP_GENERATED_EVIDENCE";
    case "STALE_CONTRADICTORY":
      return "REVIEW_OR_REPLACE";
    default:
      return "REVIEW_OR_REPLACE";
  }
}

function archiveBlockedForEntry(entry) {
  if (entry.consumerCount > 0) {
    return true;
  }
  return ZERO_CONSUMER_ARCHIVE_BLOCKED_PATHS.has(normalizePath(entry.path));
}

function replacementForEntry(relPath, classification) {
  return null;
}

function isValidGitCommitSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || "").trim());
}

function gitCommitExists(commitSha) {
  const normalized = String(commitSha || "").trim();
  if (!isValidGitCommitSha(normalized)) {
    return false;
  }
  try {
    gitExec(["cat-file", "-e", `${normalized}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function validateRepoHeadProvenance(registry, currentHead, label) {
  const diffs = [];
  const repoHead = String(registry?.repo?.head || "").trim();
  if (!isValidGitCommitSha(repoHead)) {
    diffs.push({
      type: "REPO_HEAD_FORMAT_MISMATCH",
      label,
      value: registry?.repo?.head,
    });
    return diffs;
  }
  if (!gitCommitExists(repoHead)) {
    diffs.push({
      type: "REPO_HEAD_UNKNOWN_COMMIT",
      label,
      value: repoHead,
    });
    return diffs;
  }

  // repo.head is generation provenance, not a live current-HEAD drift field.
  // We still require it to name a real commit that is on or behind the current HEAD.
  if (repoHead !== currentHead) {
    try {
      gitExec(["merge-base", "--is-ancestor", repoHead, currentHead]);
    } catch {
      diffs.push({
        type: "REPO_HEAD_NOT_ANCESTOR",
        label,
        expectedAncestor: repoHead,
        actualHead: currentHead,
      });
    }
  }

  return diffs;
}

function canonicalizationSort(entries) {
  return [...entries].sort((a, b) => comparePaths(normalizePath(a.path), normalizePath(b.path)));
}

function projectDocumentationRegistryForComparison(registry) {
  const projectedEntries = canonicalizationSort(
    ensureArray(registry?.entries, "registry.entries").filter((entry) => !isVolatileBackupEvidencePath(entry?.path)),
  ).map((entry) => ({
    path: normalizePath(entry.path),
    tracked: Boolean(entry.tracked),
    classification: entry.classification,
    ownerDomain: entry.ownerDomain,
    canonicalOwner: entry.canonicalOwner,
    consumerCount: entry.consumerCount,
    checkerDependent: Boolean(entry.checkerDependent),
    archiveDisposition: entry.archiveDisposition,
    archiveBlocked: Boolean(entry.archiveBlocked),
    replacement: entry.replacement ?? null,
    notesStatusReason: entry.notesStatusReason ?? "",
  }));

  const classificationCounts = Object.create(null);
  const archiveDispositionCounts = Object.create(null);
  let trackedCount = 0;
  let checkerDependentCount = 0;
  let archiveBlockedCount = 0;
  let generatedCount = 0;
  let activeCanonicalCount = 0;

  for (const entry of projectedEntries) {
    classificationCounts[entry.classification] = (classificationCounts[entry.classification] || 0) + 1;
    archiveDispositionCounts[entry.archiveDisposition] = (archiveDispositionCounts[entry.archiveDisposition] || 0) + 1;
    if (entry.tracked) {
      trackedCount += 1;
    }
    if (entry.checkerDependent) {
      checkerDependentCount += 1;
    }
    if (entry.archiveBlocked) {
      archiveBlockedCount += 1;
    }
    if (entry.classification === "DERIVED_GENERATED") {
      generatedCount += 1;
    }
    if (entry.classification === "CANONICAL_SSOT" || (entry.classification === "ACTIVE_DOMAIN_DOC" && entry.archiveDisposition === "KEEP_ACTIVE")) {
      activeCanonicalCount += 1;
    }
  }

  return {
    ...registry,
    entries: projectedEntries,
    census: {
      total: projectedEntries.length,
      tracked: trackedCount,
      untracked: projectedEntries.length - trackedCount,
    },
    summaryCounts: {
      classificationCounts: {
        CANONICAL_SSOT: classificationCounts.CANONICAL_SSOT || 0,
        ACTIVE_DOMAIN_DOC: classificationCounts.ACTIVE_DOMAIN_DOC || 0,
        REFERENCE_POINTER: classificationCounts.REFERENCE_POINTER || 0,
        HISTORICAL_EVIDENCE: classificationCounts.HISTORICAL_EVIDENCE || 0,
        DERIVED_GENERATED: classificationCounts.DERIVED_GENERATED || 0,
        STALE_CONTRADICTORY: classificationCounts.STALE_CONTRADICTORY || 0,
        UNKNOWN_NEEDS_REVIEW: classificationCounts.UNKNOWN_NEEDS_REVIEW || 0,
        CHECKER_DEPENDENT: classificationCounts.CHECKER_DEPENDENT || 0,
        ARCHIVE_CANDIDATE: classificationCounts.ARCHIVE_CANDIDATE || 0,
        DUPLICATE: classificationCounts.DUPLICATE || 0,
        ORPHAN: classificationCounts.ORPHAN || 0,
      },
      archiveBlocked: archiveBlockedCount,
      checkerDependent: checkerDependentCount,
      generated: generatedCount,
      activeCanonical: activeCanonicalCount,
      archiveDispositionCounts,
    },
  };
}

export function buildDocumentationRegistryV1() {
  const discoveryPaths = discoverDocumentationRegistryV1Paths();
  const { consumerSets } = buildConsumerGraph(discoveryPaths);
  const trackedSet = new Set(gitLines(["ls-files"]).map(normalizePath));

  const entries = [];
  for (const relPath of discoveryPaths) {
    const normalized = normalizePath(relPath);
    const classification = classificationForPath(normalized);
    const consumerFilesForPath = ensureArray([...consumerSets.get(normalized) || []].sort(comparePaths), normalized);
    const consumerCount = consumerFilesForPath.length;
    const entry = {
      path: normalized,
      tracked: trackedSet.has(normalized),
      classification,
      ownerDomain: ownerDomainForPath(normalized, classification),
      canonicalOwner: canonicalOwnerForPath(normalized),
      consumerCount,
      checkerDependent: consumerFilesForPath.some(isCheckerConsumerPath),
      archiveDisposition: archiveDispositionForClassification(classification),
      archiveBlocked: false,
      replacement: replacementForEntry(normalized, classification),
      notesStatusReason: "",
    };
    entry.archiveBlocked = archiveBlockedForEntry(entry);
    entry.notesStatusReason = notesStatusReasonForEntry(entry);
    entries.push(entry);
  }

  const canonicalizedEntries = canonicalizationSort(entries).map((entry) => ({
    path: entry.path,
    tracked: entry.tracked,
    classification: entry.classification,
    ownerDomain: entry.ownerDomain,
    canonicalOwner: entry.canonicalOwner,
    consumerCount: entry.consumerCount,
    checkerDependent: entry.checkerDependent,
    archiveDisposition: entry.archiveDisposition,
    archiveBlocked: entry.archiveBlocked,
    replacement: entry.replacement,
    notesStatusReason: entry.notesStatusReason,
  }));

  const classificationCounts = Object.create(null);
  const archiveDispositionCounts = Object.create(null);
  let trackedCount = 0;
  let checkerDependentCount = 0;
  let archiveBlockedCount = 0;
  let generatedCount = 0;
  let activeCanonicalCount = 0;

  for (const entry of canonicalizedEntries) {
    classificationCounts[entry.classification] = (classificationCounts[entry.classification] || 0) + 1;
    archiveDispositionCounts[entry.archiveDisposition] = (archiveDispositionCounts[entry.archiveDisposition] || 0) + 1;
    if (entry.tracked) {
      trackedCount += 1;
    }
    if (entry.checkerDependent) {
      checkerDependentCount += 1;
    }
    if (entry.archiveBlocked) {
      archiveBlockedCount += 1;
    }
    if (entry.classification === "DERIVED_GENERATED") {
      generatedCount += 1;
    }
    if (entry.classification === "CANONICAL_SSOT" || (entry.classification === "ACTIVE_DOMAIN_DOC" && entry.archiveDisposition === "KEEP_ACTIVE")) {
      activeCanonicalCount += 1;
    }
  }

  const untrackedCount = canonicalizedEntries.length - trackedCount;
  const registry = {
    schemaVersion: DOCUMENTATION_REGISTRY_V1_SCHEMA_VERSION,
    generatedAt: DOCUMENTATION_REGISTRY_V1_GENERATED_AT,
    repo: {
      head: gitExec(["rev-parse", "HEAD"]).trim(),
      branch: gitExec(["branch", "--show-current"]).trim(),
    },
    census: {
      total: canonicalizedEntries.length,
      tracked: trackedCount,
      untracked: untrackedCount,
    },
    discovery: {
      description: "Repository documentation-like artifact census, path-exact and deterministic.",
      excludeFalsePositives: [...DOCUMENTATION_DISCOVERY_EXACT_FALSE_POSITIVES],
      includes: [
        ".md",
        ".mdx",
        ".markdown",
        ".rst",
        ".txt",
        "backend/artifacts/browser-smoke/**/report.json",
      ],
    },
    summaryCounts: {
      classificationCounts: {
        CANONICAL_SSOT: classificationCounts.CANONICAL_SSOT || 0,
        ACTIVE_DOMAIN_DOC: classificationCounts.ACTIVE_DOMAIN_DOC || 0,
        REFERENCE_POINTER: classificationCounts.REFERENCE_POINTER || 0,
        HISTORICAL_EVIDENCE: classificationCounts.HISTORICAL_EVIDENCE || 0,
        DERIVED_GENERATED: classificationCounts.DERIVED_GENERATED || 0,
        STALE_CONTRADICTORY: classificationCounts.STALE_CONTRADICTORY || 0,
        UNKNOWN_NEEDS_REVIEW: classificationCounts.UNKNOWN_NEEDS_REVIEW || 0,
        CHECKER_DEPENDENT: classificationCounts.CHECKER_DEPENDENT || 0,
        ARCHIVE_CANDIDATE: classificationCounts.ARCHIVE_CANDIDATE || 0,
        DUPLICATE: classificationCounts.DUPLICATE || 0,
        ORPHAN: classificationCounts.ORPHAN || 0,
      },
      archiveBlocked: archiveBlockedCount,
      checkerDependent: checkerDependentCount,
      generated: generatedCount,
      activeCanonical: activeCanonicalCount,
      archiveDispositionCounts,
    },
    entries: canonicalizedEntries,
  };

  return registry;
}

function isScriptLikeConsumerPath(relPath) {
  const normalized = normalizePath(relPath);
  return (
    normalized === "package.json" ||
    normalized === "backend/package.json" ||
    normalized.startsWith("backend/scripts/") ||
    normalized.startsWith("web/scripts/") ||
    normalized.endsWith(".js") ||
    normalized.endsWith(".mjs") ||
    normalized.endsWith(".cjs") ||
    normalized.endsWith(".ps1") ||
    normalized.endsWith(".sh")
  );
}

export function compareDocumentationRegistryV1(expected, actual) {
  const currentHead = gitExec(["rev-parse", "HEAD"]).trim();
  const projectedExpected = projectDocumentationRegistryForComparison(expected);
  const projectedActual = projectDocumentationRegistryForComparison(actual);

  const diffs = [
    ...collectDuplicatePathDiffs(projectedExpected.entries, "expected", "DUPLICATE_EXPECTED_PATH"),
    ...collectDuplicatePathDiffs(projectedActual.entries, "actual", "DUPLICATE_ACTUAL_PATH"),
    ...validateRepoHeadProvenance(expected, currentHead, "expected"),
    ...validateRepoHeadProvenance(actual, currentHead, "actual"),
  ];

  const expectedEntries = new Map(projectedExpected.entries.map((entry) => [normalizePath(entry.path), entry]));
  const actualEntries = new Map(projectedActual.entries.map((entry) => [normalizePath(entry.path), entry]));

  const allPaths = [...new Set([...expectedEntries.keys(), ...actualEntries.keys()])].sort(comparePaths);

  for (const pathText of allPaths) {
    const expectedEntry = expectedEntries.get(pathText);
    const actualEntry = actualEntries.get(pathText);
    if (!expectedEntry) {
      diffs.push({ type: "EXTRA_IN_REGISTRY", path: pathText });
      continue;
    }
    if (!actualEntry) {
      diffs.push({ type: "MISSING_FROM_REGISTRY", path: pathText });
      continue;
    }

    const fields = [
      "tracked",
      "classification",
      "ownerDomain",
      "canonicalOwner",
      "consumerCount",
      "checkerDependent",
      "archiveDisposition",
      "archiveBlocked",
      "replacement",
      "notesStatusReason",
    ];
    for (const field of fields) {
      if (JSON.stringify(expectedEntry[field]) !== JSON.stringify(actualEntry[field])) {
        diffs.push({
          type: `${field.toUpperCase()}_MISMATCH`,
          path: pathText,
          expected: expectedEntry[field],
          actual: actualEntry[field],
        });
      }
    }
  }

  const summaryMismatchFields = [
    ["schemaVersion", projectedExpected.schemaVersion, projectedActual.schemaVersion],
    ["generatedAt", projectedExpected.generatedAt, projectedActual.generatedAt],
    ["repo.branch", projectedExpected?.repo?.branch, projectedActual?.repo?.branch],
    ["census.total", projectedExpected?.census?.total, projectedActual?.census?.total],
    ["census.tracked", projectedExpected?.census?.tracked, projectedActual?.census?.tracked],
    ["census.untracked", projectedExpected?.census?.untracked, projectedActual?.census?.untracked],
  ];
  for (const [field, expectedValue, actualValue] of summaryMismatchFields) {
    if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
      diffs.push({ type: "SUMMARY_MISMATCH", field, expected: expectedValue, actual: actualValue });
    }
  }

  const expectedSummaryCounts = projectedExpected?.summaryCounts || {};
  const actualSummaryCounts = projectedActual?.summaryCounts || {};
  const classificationKeys = [
    "CANONICAL_SSOT",
    "ACTIVE_DOMAIN_DOC",
    "REFERENCE_POINTER",
    "HISTORICAL_EVIDENCE",
    "DERIVED_GENERATED",
    "STALE_CONTRADICTORY",
    "UNKNOWN_NEEDS_REVIEW",
    "CHECKER_DEPENDENT",
    "ARCHIVE_CANDIDATE",
    "DUPLICATE",
    "ORPHAN",
  ];

  for (const key of classificationKeys) {
    const expectedValue = expectedSummaryCounts.classificationCounts?.[key] ?? 0;
    const actualValue = actualSummaryCounts.classificationCounts?.[key] ?? 0;
    if (expectedValue !== actualValue) {
      diffs.push({
        type: "CLASSIFICATION_COUNT_MISMATCH",
        key,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  }

  const scalarSummaryFields = [
    "archiveBlocked",
    "checkerDependent",
    "generated",
    "activeCanonical",
  ];
  for (const key of scalarSummaryFields) {
    const expectedValue = expectedSummaryCounts[key];
    const actualValue = actualSummaryCounts[key];
    if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
      diffs.push({
        type: "SUMMARY_FIELD_MISMATCH",
        key,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  }

  return diffs;
}

export function serializeDocumentationRegistryV1(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

export function writeDocumentationRegistryV1(targetPath = DOCUMENTATION_REGISTRY_V1_PATH) {
  const registry = buildDocumentationRegistryV1();
  const serialized = serializeDocumentationRegistryV1(registry);
  const absPath = path.isAbsolute(targetPath) ? targetPath : path.join(repoRoot, targetPath);
  fs.writeFileSync(absPath, serialized, "utf8");
  return { registry, serialized, absPath };
}

export function consumerFilesForRegistryEntry(entry, consumerGraph) {
  return [...(consumerGraph.consumerSets.get(normalizePath(entry.path)) || [])].sort(comparePaths);
}

export function currentGitStateSummaryForRegistry(paths = discoverDocumentationRegistryV1Paths()) {
  const trackedSet = new Set(gitLines(["ls-files"]).map(normalizePath));
  const statusLines = String(gitExec(["status", "--porcelain=v1", "--untracked-files=all"]) || "")
    .split(/\r?\n/)
    .filter(Boolean);
  const untrackedSet = new Set(
    statusLines
      .filter((line) => line.startsWith("?? "))
      .map((line) => normalizePath(line.slice(3))),
  );
  const rows = paths.map((relPath) => {
    const normalized = normalizePath(relPath);
    return {
      path: normalized,
      tracked: trackedSet.has(normalized),
      ignored: !trackedSet.has(normalized) && !untrackedSet.has(normalized),
      gitStatusUntracked: untrackedSet.has(normalized),
      filesystemExists: fs.existsSync(path.join(repoRoot, normalized)),
    };
  });
  return {
    rows,
    trackedCount: rows.filter((row) => row.tracked).length,
    ignoredCount: rows.filter((row) => !row.tracked && row.ignored).length,
    actualUntrackedCount: rows.filter((row) => row.gitStatusUntracked).length,
  };
}
