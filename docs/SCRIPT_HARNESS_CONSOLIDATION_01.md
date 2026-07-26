# SCRIPT HARNESS CONSOLIDATION 01

Tarih: 2026-07-26
Repo: `servis-platform`

## 1) Kısa Özet

- Toplam package script entry: `414`
- Toplam executable tracked file: `1243`
- Combined registry row: `1657`
- Root/backend/web/mobile package dağılımı: root `257`, backend `800`, web `96`, mobile `201`
- Tools executable dağılımı: tools `303`
- Docs indexed: `66`
- Public lead milestones: `PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01 -> ONBOARDING-REVIEW-01 FINAL AUDIT -> INVITE-BASED-MEMBERSHIP-01 -> VERIFIED-SUPPLIER-01 -> UX-MARKETPLACE-PANELS-01 -> PRODUCT-FLOW-BUTTON-AUDIT-01 -> ...`
- UX preview milestones: `UX-ROUTE-IMPACT-PREVIEW-COMPACT-01` -> `UX-LIVE-PANEL-COVERAGE-MATRIX-01` -> `UX-SMOKE-PASS-MINUS-EVIDENCE-01` -> `UX-SMOKE-PASS-MINUS-ZERO-01` -> `UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01` -> `UX-LIVE-PANEL-PREMIUM-SMOKE-01`
- UX preview docs: `docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md`, `docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md`, `docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md`, `docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md`, `docs/UX_SMOKE_PASS_MINUS_ZERO_01.md`, `docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md`
- UX preview check alias: `UX-ROUTE-IMPACT-PREVIEW-COMPACT-01-CHECK`
- Super Admin clarity milestone: `UX-SUPERADMIN-PANEL-CLARITY-01`
- Super Admin clarity docs: `docs/UX_SUPERADMIN_PANEL_CLARITY_01.md`
- Room vehicle/driver uppercase milestone: `ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01`
- Room vehicle/driver uppercase docs: `docs/ROOM_VEHICLE_DRIVER_UPPERCASE_NORMALIZATION_01.md`
- Room panel clarity milestone: `UX-ROOM-PANEL-CLARITY-01`
- Room panel clarity docs: `docs/UX_ROOM_PANEL_CLARITY_01.md`
- Room shifts density dedup milestone: `UX-ROOM-SHIFTS-DENSITY-DEDUP-01`
- Room shifts density dedup docs: `docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md`
- Room shifts density dedup command: `node backend\scripts\ux_room_shifts_density_dedup_01_check.js`
- Room critical fix milestone: `UX-PREMIUM-CRITICAL-FIX-ROOM-01`
- Room critical fix docs: `docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md`
- Room critical fix command: `node backend\scripts\ux_premium_critical_fix_room_01_check.js`
- Company mobile action clarity milestone: `UX-COMPANY-MOBILE-ACTION-CLARITY-01`
- Company mobile action clarity docs: `docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md`
- Company personel access mobile parity milestone: `UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01`
- Company personel access mobile parity alias: `check:uxcompanypersonelaccessmobileparity01`
- Company personel access mobile parity docs: `docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md`
- Company personel access mobile parity command: `node backend\scripts\ux_company_personel_access_mobile_parity_01_check.js`
- Company agreements mobile parity milestone: `UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01`
- Company agreements mobile parity alias: `check:uxcompanyagreementsmobileparity01`
- Company agreements mobile parity docs: `docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md`
- Company agreements mobile parity command: `node backend\scripts\ux_company_agreements_mobile_parity_01_check.js`
- Brand login premium milestone: `UX-BRAND-LOGIN-PREMIUM-01`
- Brand login premium alias: `check:uxbrandloginpremium01`
- Brand login premium docs: `docs/UX_BRAND_LOGIN_PREMIUM_01.md`
- Brand login premium command: `node backend\scripts\ux_brand_login_premium_01_check.js`
- Mobile web shell clarity milestone: `UX-MOBILE-WEB-SHELL-CLARITY-01`
- Mobile web shell clarity docs: `docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md`
- Mobile web shell clarity command: `node backend\scripts\ux_mobile_web_shell_clarity_01_check.js`
- Mobile all roles panel fix milestone: `UX-MOBILE-ALL-ROLES-PANEL-FIX-01`
- Mobile all roles panel fix docs: `docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md`
- Mobile all roles panel fix command: `node backend\scripts\ux_mobile_all_roles_panel_fix_01_check.js`
- Room / Company shifts mobile card fix milestone: `UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01`
- Room / Company shifts mobile card fix docs: `docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md`
- Room / Company shifts mobile card fix command: `node backend\scripts\ux_room_company_shifts_mobile_card_fix_01_check.js`
- Shifts responsive layout fix milestone: `UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01`
- Shifts responsive layout fix docs: `docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md`
- Shifts responsive layout fix command: `node backend\scripts\ux_shifts_responsive_layout_fix_01_check.js`
- Mobile overflow mini-map readability milestone: `UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01`
- Mobile overflow mini-map readability docs: `docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md`
- Mobile overflow mini-map readability command: `node backend\scripts\ux_mobile_overflow_minimap_readability_01_check.js`
- Mobile overflow mini-map polish milestone: `UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02`
- Mobile overflow mini-map polish docs: `docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md`
- Mobile overflow mini-map polish command: `node backend\scripts\ux_mobile_overflow_minimap_polish_02_check.js`
- Mobile all roles panel audit milestone: `UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01`
- Mobile all roles panel audit docs: `docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md`
- Mobile all roles panel audit command: `node backend\scripts\ux_mobile_all_roles_panel_audit_01.mjs`
- Mobile web final acceptance milestone: `MOBILE-WEB-FINAL-01`
- Mobile web final acceptance docs: `docs/MOBILE_WEB_FINAL_01.md`
- Mobile web final acceptance command: `node backend\scripts\mobile_web_final_01_check.js`
- Quality gate final milestone: `QUALITY-GATE-FINAL-01`
- Quality gate final docs: `docs/QUALITY_GATE_FINAL_01.md`
- Quality gate final command: `node backend\scripts\quality_gate_final_01_check.js`
- Test quality and flake audit milestone: `TEST-QUALITY-AND-FLAKE-AUDIT-01`
- Test quality and flake audit docs: `docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md`
- Test quality and flake audit command: `node backend\scripts\test_quality_and_flake_audit_01_check.js`
- Dashboard bulk endpoint milestone: `DASHBOARD-BULK-ENDPOINT-01`
- Dashboard bulk endpoint alias: `check:dashboardbulkendpoint01`
- Dashboard bulk endpoint docs: `docs/DASHBOARD_BULK_ENDPOINT_01.md`
- Dashboard bulk endpoint command: `node backend\scripts\dashboard_bulk_endpoint_01_check.js`
- Cache coalescing and backoff milestone: `CACHE-COALESCING-AND-BACKOFF-01`
- Cache coalescing and backoff alias: `check:cachecoalescingandbackoff01`
- Cache coalescing and backoff docs: `docs/CACHE_COALESCING_AND_BACKOFF_01.md`
- Cache coalescing and backoff command: `node backend\scripts\cache_coalescing_and_backoff_01_check.js`
- Request storm resilience milestone: `REQUEST-STORM-RESILIENCE-01`
- Request storm resilience docs: `docs/REQUEST_STORM_RESILIENCE_01.md`
- Request storm resilience command: `node backend\scripts\request_storm_resilience_01_check.js`
- Production rate limit policy milestone: `PRODUCTION-RATE-LIMIT-POLICY-01`
- Production rate limit policy docs: `docs/PRODUCTION_RATE_LIMIT_POLICY_01.md`
- Production rate limit policy command: `node backend\scripts\production_rate_limit_policy_01_check.js`
- AI response semantic quality gate milestone: `AI-RESPONSE-SEMANTIC-QUALITY-GATE-01`
- AI response semantic quality gate docs: `docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md`
- AI response semantic quality gate command: `node backend\scripts\ai_response_semantic_quality_gate_01_check.js`
- Load test 2000 users milestone: `LOAD-TEST-2000-USERS-01`
- Load test 2000 users alias: `check:loadtest2000users01`
- Load test 2000 users docs: `docs/LOAD_TEST_2000_USERS_01.md`
- Load test 2000 users command: `node backend\scripts\load_test_2000_users_01_check.js`
- DB pool and API scaling milestone: `DB-POOL-AND-API-SCALING-01`
- DB pool and API scaling alias: `check:dbpoolandapiscaling01`
- DB pool and API scaling docs: `docs/DB_POOL_AND_API_SCALING_01.md`
- DB pool and API scaling command: `node backend\scripts\db_pool_and_api_scaling_01_check.js`
- Observability monitoring alerting milestone: `OBSERVABILITY-MONITORING-ALERTING-01`
- Observability monitoring alerting alias: `check:observabilitymonitoringalerting01`
- Observability monitoring alerting docs: `docs/OBSERVABILITY_MONITORING_ALERTING_01.md`
- Observability monitoring alerting command: `node backend\scripts\observability_monitoring_alerting_01_check.js`
- Observability monitoring alerting probe: `node backend\scripts\observability_monitoring_alerting_01_probe.js`
- Backend lint warning burndown milestone: `BACKEND-LINT-WARNING-BURNDOWN-01`
- Backend lint warning burndown alias: `check:backendlintwarningburndown01`
- Backend lint warning burndown docs: `docs/BACKEND_LINT_WARNING_BURNDOWN_01.md`
- Backend lint warning burndown command: `node backend\scripts\backend_lint_warning_burndown_01_check.js`
- Data integrity and recovery milestone: `DATA-INTEGRITY-AND-RECOVERY-01`
- Data integrity and recovery alias: `check:dataintegrityandrecovery01`
- Data integrity and recovery docs: `docs/DATA_INTEGRITY_AND_RECOVERY_01.md`
- Data integrity and recovery command: `node backend\scripts\data_integrity_and_recovery_01_check.js`
- Role data isolation redteam milestone: `ROLE-DATA-ISOLATION-REDTEAM-01`
- Role data isolation redteam alias: `check:roledataisolationredteam01`
- Role data isolation redteam docs: `docs/ROLE_DATA_ISOLATION_REDTEAM_01.md`
- Role data isolation redteam command: `node backend\scripts\role_data_isolation_redteam_01_check.js`
- Security final milestone: `SECURITY-KVKK-FINAL-01`
- Security final alias: `check:securitykvkkfinal01`
- Security final docs: `docs/SECURITY_KVKK_FINAL_01.md`
- Security final command: `node backend\scripts\security_kvkk_final_01_check.js`
- Audit trace milestone: `AUDIT-LOG-AND-APPROVAL-TRACE-01`
- Audit trace alias: `check:auditlogandapprovaltrace01`
- Audit trace docs: `docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md`
- Audit trace command: `node backend\scripts\audit_log_and_approval_trace_01_check.js`
- Agreements detail milestone: `UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01`
- Agreements detail docs: `docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md`
- Agreements detail command: `node backend\scripts\ux_premium_critical_fix_agreements_detail_01_check.js`
- UX cleanup milestone: `UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01`
- UX cleanup docs: `docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md`
- UX cleanup command: `node backend\scripts\ux_premium_critical_uxfix_cleanup_01_check.js`
- Parent / Personel live error clarity milestone: `UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01`
- Parent / Personel live error clarity docs: `docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md`
- Panel standard architecture milestone: `UX-PANEL-STANDARD-ARCHITECTURE-01`
- Panel standard architecture docs: `docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md`
- PASS-minus evidence milestone: `UX-SMOKE-PASS-MINUS-EVIDENCE-01`
- PASS-minus evidence docs: `docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md`
- PASS-minus evidence command: `node backend\scripts\ux_smoke_pass_minus_evidence_01_check.js`
- PASS-minus zero milestone: `UX-SMOKE-PASS-MINUS-ZERO-01`
- PASS-minus zero docs: `docs/UX_SMOKE_PASS_MINUS_ZERO_01.md`
- PASS-minus zero command: `node backend\scripts\ux_smoke_pass_minus_zero_01_check.js`
- Public lead docs: `docs/PUBLIC_LANDING_01.md`, `docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md`, `docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md`, `docs/LEAD_CAPTURE_01.md`, `docs/ONBOARDING_REVIEW_01.md`, `docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md`, `docs/INVITE_BASED_MEMBERSHIP_01.md`, `docs/VERIFIED_SUPPLIER_01.md`, `docs/SUPPLIER_MATCHING_01.md`, `docs/UX_MARKETPLACE_PANELS_01.md`, `docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md`
- Verified supplier milestone: `VERIFIED-SUPPLIER-01`
- Verified supplier check: `check:verifiedsupplier01`
- Verified supplier docs: `docs/VERIFIED_SUPPLIER_01.md`
- Supplier matching milestone: `SUPPLIER-MATCHING-01`
- Supplier matching check: `check:suppliermatching01`
- Supplier matching docs: `docs/SUPPLIER_MATCHING_01.md`
- Supplier matching helper: `backend/src/ai/chat/supplierMatching.js`
- Supplier offer collect milestone: `SUPPLIER-OFFER-COLLECT-01`
- Supplier offer collect check: `check:supplieroffercollect01`
- Supplier offer collect docs: `docs/SUPPLIER_OFFER_COLLECT_01.md`
- Supplier offer collect helper: `backend/src/ai/chat/supplierOfferCollect.js`
- Offer analysis milestone: `COPILOT-OFFER-ANALYSIS-01`
- Offer analysis alias: `check:copilotofferanalysis01`
- Offer analysis docs: `docs/COPILOT_OFFER_ANALYSIS_01.md`
- Offer analysis command: `node backend\scripts\copilot_offer_analysis_01_check.js`
- Offer analysis helper: `backend/src/ai/chat/copilotOfferAnalysis.js`
- Offer analysis root check: `root:check:copilotofferanalysis01`
- Negotiation assist milestone: `COPILOT-NEGOTIATION-ASSIST-01`
- Negotiation assist check: `check:copilotnegotiationassist01`
- Negotiation assist docs: `docs/COPILOT_NEGOTIATION_ASSIST_01.md`
- Negotiation assist command: `node backend\scripts\copilot_negotiation_assist_01_check.js`
- Negotiation assist helper: `backend/src/ai/chat/copilotNegotiationAssist.js`
- Negotiation assist root check: `root:check:copilotnegotiationassist01`
- Offer recommendation milestone: `COPILOT-OFFER-RECOMMENDATION-01`
- Offer recommendation check: `check:copilotofferrecommendation01`
- Offer recommendation docs: `docs/COPILOT_OFFER_RECOMMENDATION_01.md`
- Offer recommendation command: `node backend\scripts\copilot_offer_recommendation_01_check.js`
- Offer recommendation helper: `backend/src/ai/chat/copilotOfferRecommendation.js`
- Offer recommendation root check: `root:check:copilotofferrecommendation01`
- Shift to agreement prep milestone: `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- Shift to agreement prep check: `check:copilotshifttoagreementprep01`
- Shift to agreement prep docs: `docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md`
- Shift to agreement prep command: `node backend\scripts\copilot_shift_to_agreement_prep_01_check.js`
- Shift to agreement prep helper: `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
- Marketplace panels milestone: `UX-MARKETPLACE-PANELS-01`
- Marketplace panels check: `check:uxmarketplacepanels01`
- Marketplace panels docs: `docs/UX_MARKETPLACE_PANELS_01.md`
- Telematics baseline milestone: `M44-TELEMATICS-T1-T5`
- Telematics baseline check: `check:m44telematicst1t5`
- Telematics baseline docs: `docs/M44_TELEMATICS_T1_T5.md`
- Telematics baseline command: `node backend\scripts\m44_telematics_t1_t5_check.js`
- Telematics provider hub milestone: `TELEMATICS-PROVIDER-HUB-01`
- Telematics provider hub check: `check:telematicsproviderhub01`
- Telematics provider hub docs: `docs/TELEMATICS_PROVIDER_HUB_01.md`
- Telematics provider hub command: `node backend\scripts\telematics_provider_hub_01_check.js`
- Safe drive milestone: `SAFE-DRIVE-01`
- Safe drive check: `check:safedrive01`
- Safe drive docs: `docs/SAFE_DRIVE_01.md`
- Safe drive command: `node backend\scripts\safe_drive_01_check.js`
- Offer ranking quality milestone: `OFFER-RANKING-QUALITY-01`
- Offer ranking quality check: `check:offerrankingquality01`
- Offer ranking quality docs: `docs/OFFER_RANKING_QUALITY_01.md`
- Offer ranking quality command: `node backend\scripts\offer_ranking_quality_01_check.js`
- Copilot role/task matrix milestone: `COPILOT-ROLE-TASK-MATRIX-01`
- Copilot role/task matrix check: `check:copilotroletaskmatrix01`
- Copilot role/task matrix docs: `docs/COPILOT_ROLE_TASK_MATRIX_01.md`
- Copilot role/task matrix command: `node backend\scripts\copilot_role_task_matrix_01_check.js`
- Copilot AI action roadmap milestone: `COPILOT-AI-ACTION-ROADMAP-01`
- Copilot AI action roadmap check: `check:copilotairoadmap01`
- Copilot AI action roadmap docs: `docs/COPILOT_AI_ACTION_ROADMAP_01.md`
- Copilot AI action roadmap command: `node backend\scripts\copilot_ai_action_roadmap_01_check.js`
- Copilot demand intake milestone: `COPILOT-DEMAND-INTAKE-01`
- Copilot demand intake check: `check:copilotdemandintake01`
- Copilot demand intake docs: `docs/COPILOT_DEMAND_INTAKE_01.md`
- Copilot demand intake command: `node backend\scripts\copilot_demand_intake_01_check.js`
- Copilot demand intake helper: `backend/src/ai/chat/copilotDemandIntake.js`
- Copilot demand-to-agreement roadmap milestone: `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
- Copilot demand-to-agreement roadmap check: `check:copilotdemandagreement01`
- Copilot demand-to-agreement roadmap docs: `docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md`
- Copilot demand-to-agreement roadmap command: `node backend\scripts\copilot_demand_to_agreement_roadmap_01_check.js`
- Copilot RFQ prep milestone: `COPILOT-RFQ-PREP-01`
- Copilot RFQ prep check: `check:copilotrfqprep01`
- Copilot RFQ prep docs: `docs/COPILOT_RFQ_PREP_01.md`
- Copilot RFQ prep command: `node backend\scripts\copilot_rfq_prep_01_check.js`
- Copilot RFQ prep helper: `backend/src/ai/chat/copilotRfqPrep.js`
- Copilot human approval milestone: `COPILOT-HUMAN-APPROVAL-01`
- Copilot human approval check: `check:copilothumanapproval01`
- Copilot human approval docs: `docs/COPILOT_HUMAN_APPROVAL_01.md`
- Copilot human approval command: `node backend\scripts\copilot_human_approval_01_check.js`
- Copilot Excel demand import milestone: `COPILOT-EXCEL-DEMAND-IMPORT-01`
- Copilot Excel demand import check: `check:copilotexceldemandimport01`
- Copilot Excel demand import docs: `docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md`
- Copilot Excel demand import command: `node backend\scripts\copilot_excel_demand_import_01_check.js`
- Copilot stop/route draft milestone: `COPILOT-STOP-ROUTE-DRAFT-01`
- Copilot stop/route draft check: `check:copilotstoproutedraft01`
- Copilot stop/route draft docs: `docs/COPILOT_STOP_ROUTE_DRAFT_01.md`
- Copilot stop/route draft command: `node backend\scripts\copilot_stop_route_draft_01_check.js`
- Copilot stop/route draft helper: `backend/src/ai/chat/copilotStopRouteDraftPolicy.js`
- Copilot OSRM route draft from Excel milestone: `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- Copilot OSRM route draft from Excel check: `check:osrmroutedraftfromexcel01`
- Copilot OSRM route draft from Excel docs: `docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md`
- Copilot OSRM route draft from Excel command: `node backend\scripts\osrm_route_draft_from_excel_01_check.js`
- Copilot OSRM route draft from Excel helper: `backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js`
- Copilot route review human approval milestone: `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- Copilot route review human approval check: `check:copilotroutereviewhumanapproval01`
- Copilot route review human approval docs: `docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md`
- Copilot route review human approval command: `node backend\scripts\copilot_route_review_human_approval_01_check.js`
- Copilot route review human approval helper: `backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js`
- Excel to route readiness red-team milestone: `EXCEL-TO-ROUTE-READINESS-REDTEAM-01`
- Excel to route readiness red-team check: `check:exceltoroutereadinessredteam01`
- Excel to route readiness red-team docs: `docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md`
- Excel to route readiness red-team command: `node backend\scripts\excel_to_route_readiness_redteam_01_check.js`
- Excel to route readiness red-team helper: `backend/src/ai/chat/excelToRouteReadinessRedteamPack.js`
- Copilot E-block runtime answer integration milestone: `COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01`
- Copilot E-block runtime answer integration check: `check:copiloteblockruntimeanswerintegration01`
- Copilot E-block runtime answer integration docs: `docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md`
- Copilot E-block runtime answer integration command: `node backend\scripts\copilot_e_block_runtime_answer_integration_01_check.js`
- Copilot E-block runtime answer integration helper: `backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js`
- Copilot guided task engine milestone: `COPILOT-GUIDED-TASK-ENGINE-01`
- Copilot guided task engine check: `check:copilotguidedtaskengine01`
- Copilot guided task engine docs: `docs/COPILOT_GUIDED_TASK_ENGINE_01.md`
- Copilot guided task engine command: `node backend\scripts\copilot_guided_task_engine_01_check.js`
- Copilot guided task engine helper: `backend/src/ai/chat/copilotGuidedTaskEngine.js`
- Copilot dynamic question engine milestone: `COPILOT-DYNAMIC-QUESTION-ENGINE-01`
- Copilot dynamic question engine check: `check:copilotdynamicquestionengine01`
- Copilot dynamic question engine docs: `docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md`
- Copilot dynamic question engine command: `node backend\scripts\copilot_dynamic_question_engine_01_check.js`
- Copilot dynamic question engine helper: `backend/src/ai/chat/conversationTaskStateResponses.js`
- Copilot smart diagnostic engine milestone: `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`
- Copilot smart diagnostic engine check: `check:copilotsmartdiagnosticengine01`
- Copilot smart diagnostic engine docs: `docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md`
- Copilot smart diagnostic engine command: `node backend\scripts\copilot_smart_diagnostic_engine_01_check.js`
- Copilot smart diagnostic engine helper: `backend/src/ai/chat/conversationSmartDiagnostics.js`
- Copilot root cause engine milestone: `COPILOT-ROOT-CAUSE-ENGINE-01`
- Copilot root cause engine check: `check:copilotrootcauseengine01`
- Copilot root cause engine docs: `docs/COPILOT_ROOT_CAUSE_ENGINE_01.md`
- Copilot root cause engine command: `node backend\scripts\copilot_root_cause_engine_01_check.js`
- Copilot root cause engine helper: `backend/src/ai/chat/conversationRootCauseEngine.js`
- Copilot risk scoring engine milestone: `COPILOT-RISK-SCORING-ENGINE-01`
- Copilot risk scoring engine check: `check:copilotriskscoringengine01`
- Copilot risk scoring engine docs: `docs/COPILOT_RISK_SCORING_ENGINE_01.md`
- Copilot risk scoring engine command: `node backend\scripts\copilot_risk_scoring_engine_01_check.js`
- Copilot risk scoring engine helper: `backend/src/ai/chat/conversationRiskScoringEngine.js`
- Copilot clarifying question engine milestone: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`
- Copilot clarifying question engine check: `check:copilotclarifyingquestionengine01`
- Copilot clarifying question engine docs: `docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md`
- Copilot clarifying question engine command: `node backend\scripts\copilot_clarifying_question_engine_01_check.js`
- Copilot clarifying question engine helper: `backend/src/ai/chat/conversationTaskStateResponses.js`
- Copilot workflow reasoning engine milestone: `COPILOT-WORKFLOW-REASONING-ENGINE-01`
- Copilot workflow reasoning engine check: `check:copilotworkflowreasoningengine01`
- Copilot workflow reasoning engine docs: `docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md`
- Copilot workflow reasoning engine command: `node backend\scripts\copilot_workflow_reasoning_engine_01_check.js`
- Copilot workflow reasoning engine helper: `backend/src/ai/chat/conversationWorkflowReasoningEngine.js`
- Copilot operation health engine milestone: `COPILOT-OPERATION-HEALTH-ENGINE-01`
- Copilot operation health engine check: `check:copilotoperationhealthengine01`
- Copilot operation health engine docs: `docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md`
- Copilot operation health engine command: `node backend\scripts\copilot_operation_health_engine_01_check.js`
- Copilot operation health engine helper: `backend/src/ai/chat/conversationOperationHealthEngine.js`
- Copilot next best action engine milestone: `COPILOT-NEXT-BEST-ACTION-ENGINE-01`
- Copilot next best action engine check: `check:copilotnextbestactionengine01`
- Copilot next best action engine docs: `docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md`
- Copilot next best action engine command: `node backend\scripts\copilot_next_best_action_engine_01_check.js`
- Copilot next best action engine helper: `backend/src/ai/chat/conversationNextBestActionEngine.js`
- Copilot plan review engine milestone: `COPILOT-PLAN-REVIEW-ENGINE-01`
- Copilot plan review engine check: `check:copilotplanreviewengine01`
- Copilot plan review engine docs: `docs/COPILOT_PLAN_REVIEW_ENGINE_01.md`
- Copilot plan review engine command: `node backend\scripts\copilot_plan_review_engine_01_check.js`
- Copilot plan review engine helper: `backend/src/ai/chat/conversationPlanReviewEngine.js`
- Hot file split AI chat composers milestone: `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01`
- Hot file split AI chat composers check: `check:hotfilesplitaichatcomposers01`
- Hot file split AI chat composers docs: `docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md`
- Hot file split AI chat composers command: `node backend\scripts\hot_file_split_ai_chat_composers_01_check.js`
- Hot file split AI chat composers helper: `backend/src/ai/chat/helpComposerSafeReplies.js`
- Hot file split web panels milestone: `HOT-FILE-SPLIT-WEB-PANELS-01`
- Hot file split web panels check: `check:hotfilesplitwebpanels01`
- Hot file split web panels docs: `docs/HOT_FILE_SPLIT_WEB_PANELS_01.md`
- Hot file split web panels command: `node backend\scripts\hot_file_split_web_panels_01_check.js`
- Hot file split web panels bridge helpers: `web/src/panels/company/companyAgreementsBridgeSection.jsx; web/src/panels/company/companyAgreementsPanelHelpers.js; web/src/panels/room/roomAgreementsBridgeSection.jsx; web/src/panels/room/roomAgreementsPanelHelpers.js`
- Sefer Abi reasoning assistant milestone: `SEFER-ABI-REASONING-ASSISTANT-01`
- Sefer Abi reasoning assistant check: `check:seferabireasoningassistant01`
- Sefer Abi reasoning assistant docs: `docs/SEFER_ABI_REASONING_ASSISTANT_01.md`
- Sefer Abi reasoning assistant command: `node backend\scripts\sefer_abi_reasoning_assistant_01_check.js`
- Sefer Abi reasoning assistant helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Sefer Abi all-roles reasoning assistant milestone: `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`
- Sefer Abi all-roles reasoning assistant check: `check:seferabiallrolesreasoningassistant01`
- Sefer Abi all-roles reasoning assistant docs: `docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md`
- Sefer Abi all-roles reasoning assistant command: `node backend\scripts\sefer_abi_all_roles_reasoning_assistant_01_check.js`
- Sefer Abi all-roles reasoning assistant helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Sefer Abi terminal humanize milestone: `SEFER-ABI-TERMINAL-HUMANIZE-01`
- Sefer Abi terminal humanize check: `check:seferabiterminalhumanize01`
- Sefer Abi terminal humanize docs: `docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md`
- Sefer Abi terminal humanize command: `node backend\scripts\sefer_abi_terminal_humanize_01_check.js`
- Sefer Abi terminal humanize helper: `backend/src/ai/chat/helpComposer.js`
- Sefer Abi Turkish user-facing terminology audit milestone: `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01`
- Sefer Abi Turkish user-facing terminology audit check: `check:seferabiturkishterminology01`
- Sefer Abi Turkish user-facing terminology audit docs: `docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md`
- Sefer Abi Turkish user-facing terminology audit command: `node backend\scripts\sefer_abi_turkish_user_facing_terminology_01_check.js`
- Sefer Abi Turkish user-facing terminology audit helper: `backend/src/ai/chat/helpComposer.js`
- Sefer Abi Turkish user-facing terminology audit reasoning surface: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Sefer Abi Turkish user-facing language audit milestone: `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01`
- Sefer Abi Turkish user-facing language audit check: `check:seferabiturkishuserfacinglanguage01`
- Sefer Abi Turkish user-facing language audit docs: `docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md`
- Sefer Abi Turkish user-facing language audit command: `node backend\scripts\sefer_abi_turkish_user_facing_language_01_check.js`
- Sefer Abi Turkish user-facing language audit helper: `backend/src/ai/chat/helpComposer.js`
- Sefer Abi Turkish user-facing language audit reasoning surface: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Address geocoding confidence milestone: `ADDRESS-GEOCODING-CONFIDENCE-01`
- Address geocoding confidence check: `check:addressgeocodingconfidence01`
- Address geocoding confidence docs: `docs/ADDRESS_GEOCODING_CONFIDENCE_01.md`
- Address geocoding confidence command: `node backend\scripts\address_geocoding_confidence_01_check.js`
- Address geocoding confidence helper: `backend/src/ai/chat/addressGeocodingConfidencePolicy.js`
- Public lead audit check: `check:productflowbuttonaudit01`
- Public lead audit smoke: `smoke:productflowbuttonaudit01`
- Public lead audit commands: `node backend\scripts\product_flow_button_audit_01_check.js`, `node backend\scripts\product_flow_button_audit_01.mjs`
- ACTIVE: `388`
- ACTIVE_CORE: `198`
- ACTIVE_WEB_LINT: `17`
- ACTIVE_BACKEND_LINT: `2`
- MANUAL_SMOKE: `10`
- MANUAL_BROWSER_SMOKE: `0`
- MANUAL_RELEASE_TOOL: `14`
- ACTIVE_RELEASE_ONLY: `275`
- REQUIRES_ENV: `7`
- REQUIRES_BROWSER: `0`
- REQUIRES_AUTH_SESSION: `11`
- REQUIRES_DEVICE: `30`
- LEGACY_COMPAT: `21`
- NEEDS_UPDATE: `0`
- REMOVE_CANDIDATE: `0`
- REMOVED: `3`
- ARCHIVED: `31`
- NEEDS_REVIEW: `653`
- Duplicate/overlap groups: `8`
- Product coverage rows: `23`
- SKIP gerekçesi olan entry: `61`
- Eski sistem term eşleşmesi: `335`
- Browser automation harness bulundu mu: `Hayır`
- Remove candidate bulundu mu: `Hayır`

### Status Breakdown

| status | count |
| --- | --- |
| ACTIVE | 388 |
| ACTIVE_BACKEND_LINT | 2 |
| ACTIVE_CORE | 198 |
| ACTIVE_RELEASE_ONLY | 275 |
| ACTIVE_WEB_LINT | 17 |
| ARCHIVED | 31 |
| LEGACY_COMPAT | 21 |
| MANUAL_RELEASE_TOOL | 14 |
| MANUAL_SMOKE | 10 |
| NEEDS_REVIEW | 653 |
| REQUIRES_AUTH_SESSION | 11 |
| REQUIRES_DEVICE | 30 |
| REQUIRES_ENV | 7 |

### Coverage Status Breakdown

| status | count |
| --- | --- |
| COVERED_ACTIVE | 17 |
| COVERED_RELEASE_ONLY | 2 |
| PARTIAL_COVERAGE | 4 |

## 2) Script Registry Tablosu

### Root Package
| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| root:check | package.json | root | npm run verify:repo | verify-core | ACTIVE_CORE |  | ROOT-CHECK |  | Breaks canonical verification chain |  |
| root:check:brand | package.json | root | node tools/check_brand.js | core | ACTIVE_CORE |  | ROOT-CHECK-BRAND |  | Breaks canonical verification chain |  |
| root:check:m98e2e | package.json | root | node backend/scripts/m98_e2e_code_pin_access_acceptance_check.js | auth-session | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | ROOT-CHECK-M-98-E-2-E |  | Fails without auth/session |  |
| root:check:m98e3 | package.json | root | node backend/scripts/m98_e3_code_pin_field_ux_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-98-E-3 |  | Fails without device/emulator |  |
| root:smoke:m98e4 | package.json | root | node backend/scripts/m98_e4_code_pin_runtime_smoke.js | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | ROOT-SMOKE-M-98-E-4 |  | Loses manual smoke entrypoint |  |
| root:check:m95e23b | package.json | root | node backend/scripts/m95_e23b_gps_source_visibility_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-M-95-E-23-B |  | Owner or chain unclear |  |
| root:check:m95e25 | package.json | root | node backend/scripts/m95_e25_mobile_field_acceptance_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-E-25 |  | Fails without device/emulator |  |
| root:check:m95e26 | package.json | root | node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-E-26 |  | Fails without device/emulator |  |
| root:check:m95e27 | package.json | root | node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-E-27 |  | Fails without device/emulator |  |
| root:check:m95export01 | package.json | root | node backend/scripts/m95_export_01_runtime_check_compat_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-EXPORT-01 |  | Fails without device/emulator |  |
| root:check:m99kvkk01 | package.json | root | node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-M-99-KVKK-01 |  | Owner or chain unclear |  |
| root:check:m99ux01 | package.json | root | node backend/scripts/m99_ux_01_visible_text_hygiene_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-M-99-UX-01 |  | Owner or chain unclear |  |
| root:check:uxkvkk01 | package.json | root | node backend/scripts/ux_kvkk_01_compact_boundary_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXKVKK-01 |  | Owner or chain unclear |  |
| root:check:authstepupdevtoggle01 | package.json | root | node backend/scripts/auth_stepup_dev_toggle_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-AUTHSTEPUPDEVTOGGLE-01 |  | Owner or chain unclear |  |
| root:check:authstepupproviderlocaldefault01 | package.json | root | node backend/scripts/auth_stepup_provider_local_default_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-AUTHSTEPUPPROVIDERLOCALDEFAULT-01 |  | Owner or chain unclear |  |
| root:check:m98e2b | package.json | root | node backend/scripts/m98_e2b_personel_access_backend_check.js | auth-session | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | ROOT-CHECK-M-98-E-2-B |  | Fails without auth/session |  |
| root:check:m98e2d | package.json | root | npm --prefix mobile run check:m98e2d | auth-session | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | ROOT-CHECK-M-98-E-2-D |  | Fails without auth/session |  |
| root:check:m98e2c | package.json | root | npm --prefix web run check:m98e2c | web-lint | ACTIVE_WEB_LINT |  | ROOT-CHECK-M-98-E-2-C |  | Breaks frontend/web lint gate |  |
| root:check:pay01a | package.json | root | node backend/scripts/pay_01a_readonly_payment_readiness_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PAY-01-A |  | Breaks canonical verification chain |  |
| root:check:pay01c | package.json | root | node backend/scripts/pay_01c_payment_preview_detail_filter_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PAY-01-C |  | Breaks canonical verification chain |  |
| root:check:pay01d | package.json | root | node backend/scripts/pay_01d_payment_preview_csv_export_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PAY-01-D |  | Breaks canonical verification chain |  |
| root:check:pay01e | package.json | root | node backend/scripts/pay_01e_payment_readonly_closure_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PAY-01-E |  | Breaks canonical verification chain |  |
| root:check:paysafe01 | package.json | root | node backend/scripts/pay_safe_01_payment_write_gate_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PAYSAFE-01 |  | Breaks canonical verification chain |  |
| root:check:qltpaybridge01 | package.json | root | node backend/scripts/qlt_pay_bridge_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-QLTPAYBRIDGE-01 |  | Owner or chain unclear |  |
| root:check:seferscore01 | package.json | root | node backend/scripts/sefer_score_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-SEFERSCORE-01 |  | Owner or chain unclear |  |
| root:check:roadmaplockaimarketplace01 | package.json | root | node backend/scripts/roadmap_lock_ai_marketplace_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-ROADMAPLOCKAIMARKETPLACE-01 |  | Owner or chain unclear |  |
| root:check:publiclanding01 | package.json | root | node backend/scripts/public_landing_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PUBLICLANDING-01 |  | Breaks canonical verification chain |  |
| root:check:publiclandingplatformfirst01 | package.json | root | node backend/scripts/public_landing_platform_first_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PUBLICLANDINGPLATFORMFIRST-01 |  | Breaks canonical verification chain |  |
| root:check:publiclandingfinalpromise01 | package.json | root | node backend/scripts/public_landing_final_promise_01_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:leadcapture01 | package.json | root | node backend/scripts/lead_capture_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-LEADCAPTURE-01 |  | Breaks canonical verification chain |  |
| root:check:onboardingreview01 | package.json | root | node backend/scripts/onboarding_review_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-ONBOARDINGREVIEW-01 |  | Breaks canonical verification chain |  |
| root:check:onboardingreviewfinal01 | package.json | root | node backend/scripts/onboarding_review_final_audit_01_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:onboardingreviewfinalaudit01 | package.json | root | node backend/scripts/onboarding_review_final_audit_01_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:invitebasedmembership01 | package.json | root | node backend/scripts/invite_based_membership_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-INVITEBASEDMEMBERSHIP-01 |  | Breaks canonical verification chain |  |
| root:check:verifiedsupplier01 | package.json | root | node backend/scripts/verified_supplier_01_check.js | verify-core | ACTIVE_CORE |  | VERIFIED-SUPPLIER-01 |  | Breaks canonical verification chain |  |
| root:check:suppliermatching01 | package.json | root | node backend/scripts/supplier_matching_01_check.js | verify-core | ACTIVE_CORE |  | SUPPLIER-MATCHING-01 |  | Breaks canonical verification chain |  |
| root:check:supplieroffercollect01 | package.json | root | node backend/scripts/supplier_offer_collect_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-SUPPLIEROFFERCOLLECT-01 |  | Owner or chain unclear |  |
| root:check:copilotofferanalysis01 | package.json | root | node backend/scripts/copilot_offer_analysis_01_check.js | review | NEEDS_REVIEW |  | COPILOT-OFFER-ANALYSIS-01 |  | Owner or chain unclear |  |
| root:check:copilotnegotiationassist01 | package.json | root | node backend/scripts/copilot_negotiation_assist_01_check.js | verify-core | ACTIVE_CORE |  | ROOT-CHECK-COPILOTNEGOTIATIONASSIST-01 |  | Breaks canonical verification chain |  |
| root:check:copilotofferrecommendation01 | package.json | root | node backend/scripts/copilot_offer_recommendation_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-OFFER-RECOMMENDATION-01 |  | Breaks canonical verification chain |  |
| root:check:copilotshifttoagreementprep01 | package.json | root | node backend/scripts/copilot_shift_to_agreement_prep_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-SHIFT-TO-AGREEMENT-PREP-01 |  | Breaks canonical verification chain |  |
| root:check:uxmarketplacepanels01 | package.json | root | node backend/scripts/ux_marketplace_panels_01_check.js | verify-core | ACTIVE_CORE |  | UX-MARKETPLACE-PANELS-01 |  | Breaks canonical verification chain |  |
| root:check:productflowbuttonaudit01 | package.json | root | node backend/scripts/product_flow_button_audit_01_check.js | verify-core | ACTIVE_CORE |  | PRODUCT-FLOW-BUTTON-AUDIT-01 |  | Breaks canonical verification chain |  |
| root:check:agreementsourceshiftlineage01 | package.json | root | node backend/scripts/agreement_source_shift_lineage_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-AGREEMENTSOURCESHIFTLINEAGE-01 |  | Owner or chain unclear |  |
| root:check:marketplacefreetooperate01 | package.json | root | node backend/scripts/marketplace_free_to_operate_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-MARKETPLACEFREETOOPERATE-01 |  | Owner or chain unclear |  |
| root:check:m44telematicst1t5 | package.json | root | node backend/scripts/m44_telematics_t1_t5_check.js | core | ACTIVE_CORE |  | M44-TELEMATICS-T1-T5 |  | Breaks canonical verification chain |  |
| root:check:telematicsproviderhub01 | package.json | root | node backend/scripts/telematics_provider_hub_01_check.js | core | ACTIVE_CORE |  | TELEMATICS-PROVIDER-HUB-01 |  | Breaks canonical verification chain |  |
| root:check:safedrive01 | package.json | root | node backend/scripts/safe_drive_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-SAFEDRIVE-01 |  | Breaks canonical verification chain |  |
| root:check:offerrankingquality01 | package.json | root | node backend/scripts/offer_ranking_quality_01_check.js | core | ACTIVE_CORE |  | OFFER-RANKING-QUALITY-01 |  | Breaks canonical verification chain |  |
| root:check:copilotroletaskmatrix01 | package.json | root | node backend/scripts/copilot_role_task_matrix_01_check.js | core | ACTIVE_CORE |  | COPILOT-ROLE-TASK-MATRIX-01 |  | Breaks canonical verification chain |  |
| root:check:copilotairoadmap01 | package.json | root | node backend/scripts/copilot_ai_action_roadmap_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COPILOTAIROADMAP-01 |  | Breaks canonical verification chain |  |
| root:check:copilotdemandintake01 | package.json | root | node backend/scripts/copilot_demand_intake_01_check.js | core | ACTIVE_CORE |  | COPILOT-DEMAND-INTAKE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotdemandagreement01 | package.json | root | node backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js | core | ACTIVE_CORE |  | COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 |  | Breaks canonical verification chain |  |
| root:check:copilotrfqprep01 | package.json | root | node backend/scripts/copilot_rfq_prep_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-RFQ-PREP-01 |  | Breaks canonical verification chain |  |
| root:check:copilothumanapproval01 | package.json | root | node backend/scripts/copilot_human_approval_01_check.js | core | ACTIVE_CORE |  | COPILOT-HUMAN-APPROVAL-01 |  | Breaks canonical verification chain |  |
| root:check:copilotexceldemandimport01 | package.json | root | node backend/scripts/copilot_excel_demand_import_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-EXCEL-DEMAND-IMPORT-01 |  | Breaks canonical verification chain |  |
| root:check:addressgeocodingconfidence01 | package.json | root | node backend/scripts/address_geocoding_confidence_01_check.js | verify-core | ACTIVE_CORE |  | ADDRESS-GEOCODING-CONFIDENCE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotstoproutedraft01 | package.json | root | node backend/scripts/copilot_stop_route_draft_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-STOP-ROUTE-DRAFT-01 |  | Breaks canonical verification chain |  |
| root:check:osrmroutedraftfromexcel01 | package.json | root | node backend/scripts/osrm_route_draft_from_excel_01_check.js | verify-core | ACTIVE_CORE |  | OSRM-ROUTE-DRAFT-FROM-EXCEL-01 |  | Breaks canonical verification chain |  |
| root:check:copilotroutereviewhumanapproval01 | package.json | root | node backend/scripts/copilot_route_review_human_approval_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01 |  | Breaks canonical verification chain |  |
| root:check:exceltoroutereadinessredteam01 | package.json | root | node backend/scripts/excel_to_route_readiness_redteam_01_check.js | verify-core | ACTIVE_CORE |  | EXCEL-TO-ROUTE-READINESS-REDTEAM-01 |  | Breaks canonical verification chain |  |
| root:check:copiloteblockruntimeanswerintegration01 | package.json | root | node backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01 |  | Breaks canonical verification chain |  |
| root:check:ai03bparaphraseintentaudit01 | package.json | root | node backend/scripts/ai03b_paraphrase_intent_audit_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-AI-03-BPARAPHRASEINTENTAUDIT-01 |  | Owner or chain unclear |  |
| root:check:ai03bsemanticvisibleaudit01 | package.json | root | node backend/scripts/ai03b_semantic_visible_audit_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-AI-03-BSEMANTICVISIBLEAUDIT-01 |  | Owner or chain unclear |  |
| root:check:ai03bsemanticvisiblelivematrix01 | package.json | root | node backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-AI-03-BSEMANTICVISIBLELIVEMATRIX-01 |  | Owner or chain unclear |  |
| root:check:copilotguidedtaskengine01 | package.json | root | node backend/scripts/copilot_guided_task_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-GUIDED-TASK-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotdynamicquestionengine01 | package.json | root | node backend/scripts/copilot_dynamic_question_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-DYNAMIC-QUESTION-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotsmartdiagnosticengine01 | package.json | root | node backend/scripts/copilot_smart_diagnostic_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-SMART-DIAGNOSTIC-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotrootcauseengine01 | package.json | root | node backend/scripts/copilot_root_cause_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-ROOT-CAUSE-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotriskscoringengine01 | package.json | root | node backend/scripts/copilot_risk_scoring_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-RISK-SCORING-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotclarifyingquestionengine01 | package.json | root | node backend/scripts/copilot_clarifying_question_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-CLARIFYING-QUESTION-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotworkflowreasoningengine01 | package.json | root | node backend/scripts/copilot_workflow_reasoning_engine_01_check.js | core | ACTIVE_CORE |  | COPILOT-WORKFLOW-REASONING-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotoperationhealthengine01 | package.json | root | node backend/scripts/copilot_operation_health_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-OPERATION-HEALTH-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotnextbestactionengine01 | package.json | root | node backend/scripts/copilot_next_best_action_engine_01_check.js | verify-core | ACTIVE_CORE |  | COPILOT-NEXT-BEST-ACTION-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:copilotplanreviewengine01 | package.json | root | node backend/scripts/copilot_plan_review_engine_01_check.js | core | ACTIVE_CORE |  | COPILOT-PLAN-REVIEW-ENGINE-01 |  | Breaks canonical verification chain |  |
| root:check:hotfilesplitaichatcomposers01 | package.json | root | node backend/scripts/hot_file_split_ai_chat_composers_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-HOTFILESPLITAICHATCOMPOSERS-01 |  | Breaks canonical verification chain |  |
| root:check:hotfilesplitwebpanels01 | package.json | root | node backend/scripts/hot_file_split_web_panels_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-HOTFILESPLITWEBPANELS-01 |  | Owner or chain unclear |  |
| root:check:copilotreasoninganswercomposer01 | package.json | root | node backend/scripts/copilot_reasoning_answer_composer_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-COPILOTREASONINGANSWERCOMPOSER-01 |  | Owner or chain unclear |  |
| root:check:seferabireasoningassistant01 | package.json | root | node backend/scripts/sefer_abi_reasoning_assistant_01_check.js | verify-core | ACTIVE_CORE |  | SEFER-ABI-REASONING-ASSISTANT-01 |  | Breaks canonical verification chain |  |
| root:check:seferabiallrolesreasoningassistant01 | package.json | root | node backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js | review | NEEDS_REVIEW |  | SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01 |  | Owner or chain unclear |  |
| root:check:seferabiturkishterminology01 | package.json | root | node backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js | verify-core | ACTIVE_CORE |  | ROOT-CHECK-SEFERABITURKISHTERMINOLOGY-01 |  | Breaks canonical verification chain |  |
| root:check:seferabiturkishuserfacinglanguage01 | package.json | root | node backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js | core | ACTIVE_CORE |  | SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01 |  | Breaks canonical verification chain |  |
| root:check:copilotcontextmemorytaskstate01 | package.json | root | node backend/scripts/copilot_context_memory_task_state_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-COPILOTCONTEXTMEMORYTASKSTATE-01 |  | Owner or chain unclear |  |
| root:check:plancenterguidedflowpersistence01 | package.json | root | node backend/scripts/plan_center_guided_flow_persistence_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-PLANCENTERGUIDEDFLOWPERSISTENCE-01 |  | Owner or chain unclear |  |
| root:check:mobiletext01 | package.json | root | npm --prefix mobile run check:mobiletext01 | review | NEEDS_REVIEW |  | ROOT-CHECK-MOBILETEXT-01 |  | Owner or chain unclear |  |
| root:check:m95e23c | package.json | root | npm --prefix web run check:m95e23c | web-lint | ACTIVE_WEB_LINT |  | ROOT-CHECK-M-95-E-23-C |  | Breaks frontend/web lint gate |  |
| root:check:m98e4b | package.json | root | node backend/scripts/m98_e4b_personel_invite_router_mount_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-M-98-E-4-B |  | Owner or chain unclear |  |
| root:check:m98e4c | package.json | root | node backend/scripts/m98_e4c_route_mount_compat_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-M-98-E-4-C |  | Owner or chain unclear |  |
| root:check:m98e5 | package.json | root | node backend/scripts/m98_e5_code_pin_manual_acceptance_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-98-E-5 |  | Fails without device/emulator |  |
| root:check:web01a | package.json | root | node backend/scripts/web_01a_flow_summary_polish_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-WEB-01-A |  | Owner or chain unclear |  |
| root:check:web01b | package.json | root | node backend/scripts/web_01b_superadmin_system_mode_summary_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-WEB-01-B |  | Owner or chain unclear |  |
| root:check:uxsuperadminoverviewcleanup01 | package.json | root | node backend/scripts/ux_superadmin_overview_cleanup_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINOVERVIEWCLEANUP-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadminpanelclarity01 | package.json | root | node backend/scripts/ux_superadmin_panel_clarity_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXSUPERADMINPANELCLARITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxsuperadminlabelpolish01 | package.json | root | node backend/scripts/ux_superadmin_label_polish_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINLABELPOLISH-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadminlivemonitoring01 | package.json | root | node backend/scripts/ux_superadmin_live_monitoring_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINLIVEMONITORING-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadminauditpanel01 | package.json | root | node backend/scripts/ux_superadmin_audit_panel_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINAUDITPANEL-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadminqualitypanel01 | package.json | root | node backend/scripts/ux_superadmin_quality_panel_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINQUALITYPANEL-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadmincommercialflow01 | package.json | root | node backend/scripts/ux_superadmin_commercial_flow_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINCOMMERCIALFLOW-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadminfielddispatchdiscovery01 | package.json | root | node backend/scripts/ux_superadmin_field_dispatch_discovery_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINFIELDDISPATCHDISCOVERY-01 |  | Owner or chain unclear |  |
| root:check:uxsuperadminfieldacceptancecenter01 | package.json | root | node backend/scripts/ux_superadmin_field_acceptance_center_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXSUPERADMINFIELDACCEPTANCECENTER-01 |  | Owner or chain unclear |  |
| root:check:cop01a | package.json | root | node backend/scripts/cop_01a_op_qlt_pay_copilot_guide_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-01-A |  | Breaks canonical verification chain |  |
| root:check:cop01b | package.json | root | node backend/scripts/cop_01b_selected_record_diagnostic_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-01-B |  | Breaks canonical verification chain |  |
| root:check:cop01c | package.json | root | node backend/scripts/cop_01c_real_context_bridge_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-01-C |  | Breaks canonical verification chain |  |
| root:check:cop01d | package.json | root | node backend/scripts/cop_01d_visible_diagnostic_signals_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-01-D |  | Breaks canonical verification chain |  |
| root:check:cop01e | package.json | root | node backend/scripts/cop_01e_operational_guide_acceptance_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-01-E |  | Breaks canonical verification chain |  |
| root:check:cop02a | package.json | root | node backend/scripts/cop_02a_program_ici_genel_rehber_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-02-A |  | Breaks canonical verification chain |  |
| root:check:cop02b | package.json | root | node backend/scripts/cop_02b_contextual_suggestion_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-02-B |  | Breaks canonical verification chain |  |
| root:check:cop02bfix01 | package.json | root | node backend/scripts/cop_02b_fix_short_natural_prompt_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-02-BFIX-01 |  | Breaks canonical verification chain |  |
| root:check:cop03a | package.json | root | node backend/scripts/cop_03a_screen_catalog_parity_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-A |  | Breaks canonical verification chain |  |
| root:check:cop03afix01 | package.json | root | node backend/scripts/cop_03a_fix_global_screen_purpose_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-AFIX-01 |  | Breaks canonical verification chain |  |
| root:check:cop03afix02 | package.json | root | node backend/scripts/cop_03a_fix_02_visible_reply_chip_polish_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-AFIX-02 |  | Breaks canonical verification chain |  |
| root:check:cop03b | package.json | root | node backend/scripts/cop_03b_workflow_domain_depth_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-B |  | Breaks canonical verification chain |  |
| root:check:cop03c | package.json | root | node backend/scripts/cop_03c_live_data_action_simulation_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-C |  | Breaks canonical verification chain |  |
| root:check:cop03cfix01 | package.json | root | node backend/scripts/cop_03c_fix_01_live_workflow_answer_quality_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-CFIX-01 |  | Breaks canonical verification chain |  |
| root:check:cop03cfix02 | package.json | root | node backend/scripts/cop_03c_fix_02_live_answer_precision_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-CFIX-02 |  | Breaks canonical verification chain |  |
| root:check:cop03cfix03 | package.json | root | node backend/scripts/cop_03c_fix_03_live_acceptance_polish_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-03-CFIX-03 |  | Breaks canonical verification chain |  |
| root:check:cop04a | package.json | root | node backend/scripts/cop_04a_global_answer_quality_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-A |  | Breaks canonical verification chain |  |
| root:check:cop04afix02 | package.json | root | node backend/scripts/cop_04a_fix_02_contract_generation_intent_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-AFIX-02 |  | Breaks canonical verification chain |  |
| root:check:cop04afix03 | package.json | root | node backend/scripts/cop_04a_fix_03_live_company_agreements_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-AFIX-03 |  | Breaks canonical verification chain |  |
| root:check:cop04afix04 | package.json | root | node backend/scripts/cop_04a_fix_04_quick_help_contract_answer_route_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-AFIX-04 |  | Breaks canonical verification chain |  |
| root:check:cop04afix01 | package.json | root | node backend/scripts/cop_04a_fix_01_global_live_answer_final_polish_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-AFIX-01 |  | Breaks canonical verification chain |  |
| root:check:cop04b | package.json | root | node backend/scripts/cop_04b_panel_context_audit_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-B |  | Breaks canonical verification chain |  |
| root:check:cop04bfix01 | package.json | root | node backend/scripts/cop_04b_fix_01_superadmin_room_live_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-01 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix02 | package.json | root | node backend/scripts/cop_04b_fix_02_company_commercial_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-02 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix03 | package.json | root | node backend/scripts/cop_04b_fix_03_personel_parent_driver_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-03 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix04 | package.json | root | node backend/scripts/cop_04b_fix_04_chip_answer_premium_polish_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-04 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix05 | package.json | root | node backend/scripts/cop_04b_fix_05_live_room_selected_vehicle_route_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-05 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix06 | package.json | root | node backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-06 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix07 | package.json | root | node backend/scripts/cop_04b_fix_07_personel_live_copilot_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-07 |  | Breaks canonical verification chain |  |
| root:check:cop04bfix08 | package.json | root | node backend/scripts/cop_04b_fix_08_parent_live_context_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-COP-04-BFIX-08 |  | Breaks canonical verification chain |  |
| root:check:uxcopilotsmartchips01 | package.json | root | node backend/scripts/ux_copilot_smart_chips_01_check.js | core | ACTIVE_CORE |  | UX-COPILOT-SMART-CHIPS-01 |  | Breaks canonical verification chain |  |
| root:check:uxcopilotpersona01 | package.json | root | node backend/scripts/ux_copilot_persona_01_check.js | core | ACTIVE_CORE |  | UX-COPILOT-PERSONA-01 |  | Breaks canonical verification chain |  |
| root:check:uxcopilotterminal01 | package.json | root | node backend/scripts/ux_copilot_terminal_01_check.js | core | ACTIVE_CORE |  | UX-COPILOT-TERMINAL-01 |  | Breaks canonical verification chain |  |
| root:check:uxseferabilauncher01 | package.json | root | node backend/scripts/ux_sefer_abi_launcher_01_check.js | core | ACTIVE_CORE |  | UX-SEFER-ABI-LAUNCHER-01 |  | Breaks canonical verification chain |  |
| root:check:seferabiterminalhumanize01 | package.json | root | node backend/scripts/sefer_abi_terminal_humanize_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-SEFERABITERMINALHUMANIZE-01 |  | Owner or chain unclear |  |
| root:check:copliveaccept01 | package.json | root | node backend/scripts/cop_live_accept_01_check.js | core | ACTIVE_CORE |  | COP-LIVE-ACCEPT-01 |  | Breaks canonical verification chain |  |
| root:check:boardingops01a | package.json | root | node backend/scripts/boarding_ops_01a_route_impact_preview_check.js | core | ACTIVE_CORE |  | BOARDING-OPS-01A |  | Breaks canonical verification chain |  |
| root:check:bugrouteimpactpreviewbutton01 | package.json | root | node backend/scripts/bug_route_impact_preview_button_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-BUGROUTEIMPACTPREVIEWBUTTON-01 |  | Breaks canonical verification chain |  |
| root:check:uxrouteimpactpreviewcompact01 | package.json | root | node backend/scripts/ux_route_impact_preview_compact_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXROUTEIMPACTPREVIEWCOMPACT-01 |  | Owner or chain unclear |  |
| root:check:uxcontractconversionopsbridgeclarity01 | package.json | root | node backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js | core | ACTIVE_CORE |  | UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01 |  | Breaks canonical verification chain |  |
| root:check:shiftdispatchapprovalfix01 | package.json | root | node backend/scripts/shift_dispatch_approval_fix_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-SHIFTDISPATCHAPPROVALFIX-01 |  | Breaks canonical verification chain |  |
| root:check:boardingchangerequestentry01 | package.json | root | node backend/scripts/boarding_change_request_entry_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-BOARDINGCHANGEREQUESTENTRY-01 |  | Breaks canonical verification chain |  |
| root:check:uiactionwiringaudit01 | package.json | root | node backend/scripts/ui_action_wiring_audit_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UIACTIONWIRINGAUDIT-01 |  | Breaks canonical verification chain |  |
| root:check:boardingops01b | package.json | root | node backend/scripts/boarding_ops_01b_apply_accepted_change_check.js | core | ACTIVE_CORE |  | BOARDING-OPS-01B |  | Breaks canonical verification chain |  |
| root:check:boardingops01c | package.json | root | node backend/scripts/boarding_ops_01c_driver_route_refresh_check.js | core | ACTIVE_CORE |  | BOARDING-OPS-01C |  | Breaks canonical verification chain |  |
| root:check:routechangefinal01 | package.json | root | node backend/scripts/route_change_final_01_check.js | core | ACTIVE_CORE |  | ROUTE-CHANGE-FINAL-01 |  | Breaks canonical verification chain |  |
| root:check:dynamicsavings01 | package.json | root | node backend/scripts/dynamic_savings_01_check.js | verify-core | ACTIVE_CORE |  | ROOT-CHECK-DYNAMICSAVINGS-01 |  | Breaks canonical verification chain |  |
| root:check:scriptharnessconsolidation01 | package.json | root | node backend/scripts/script_harness_consolidation_01_check.js | verify-core | ACTIVE_CORE |  | SCRIPT-HARNESS-CONSOLIDATION-01 |  | Breaks canonical verification chain |  |
| root:check:docsbrandcleanup01 | package.json | root | node backend/scripts/docs_ssot_brand_artifact_cleanup_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-DOCSBRANDCLEANUP-01 |  | Breaks canonical verification chain |  |
| root:check:etasanity01 | package.json | root | node backend/scripts/eta_sanity_01_live_tracking_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-ETASANITY-01 |  | Breaks canonical verification chain |  |
| root:check:etaosrm01 | package.json | root | node backend/scripts/eta_osrm_01_route_eta_service_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-ETAOSRM-01 |  | Breaks canonical verification chain |  |
| root:check:etaosrm02 | package.json | root | node backend/scripts/eta_osrm_02_api_eta_bridge_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-ETAOSRM-02 |  | Breaks canonical verification chain |  |
| root:check:livetrackingfinal01 | package.json | root | node backend/scripts/live_tracking_final_01_acceptance_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:driverflowfinal01 | package.json | root | node backend/scripts/driver_flow_final_01_acceptance_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:uxcollapsiblepanels01 | package.json | root | node backend/scripts/ux_collapsible_panels_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXCOLLAPSIBLEPANELS-01 |  | Breaks canonical verification chain |  |
| root:check:uxpanelstructure02 | package.json | root | node backend/scripts/ux_panel_structure_02_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELSTRUCTURE-02 |  | Breaks canonical verification chain |  |
| root:check:uxpanelinventory02a | package.json | root | node backend/scripts/ux_panel_inventory_02a_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELINVENTORY-02-A |  | Breaks canonical verification chain |  |
| root:check:uxpanelstructure02b | package.json | root | node backend/scripts/ux_panel_structure_02b_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELSTRUCTURE-02-B |  | Breaks canonical verification chain |  |
| root:check:uxroomvehiclestelematicsfix | package.json | root | node backend/scripts/ux_room_vehicles_telematics_counts_fix_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXROOMVEHICLESTELEMATICSFIX |  | Breaks canonical verification chain |  |
| root:check:roomvehicledriveruppercase01 | package.json | root | node backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js | core | ACTIVE_CORE |  | ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01 |  | Breaks canonical verification chain |  |
| root:check:uxroompanelclarity01 | package.json | root | node backend/scripts/ux_room_panel_clarity_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXROOMPANELCLARITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxroomopspaneltabs01 | package.json | root | node backend/scripts/ux_room_ops_panel_tabs_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXROOMOPSPANELTABS-01 |  | Breaks canonical verification chain |  |
| root:check:uxroomopsrelationshippolish01 | package.json | root | node backend/scripts/ux_room_ops_relationship_polish_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXROOMOPSRELATIONSHIPPOLISH-01 |  | Breaks canonical verification chain |  |
| root:check:uxroomdrivervehiclelinkdedup01 | package.json | root | node backend/scripts/ux_room_driver_vehicle_link_dedup_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXROOMDRIVERVEHICLELINKDEDUP-01 |  | Owner or chain unclear |  |
| root:check:uxroomshiftstabs01 | package.json | root | node backend/scripts/ux_room_shifts_tabs_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXROOMSHIFTSTABS-01 |  | Breaks canonical verification chain |  |
| root:check:uxroomshiftsdensitydedup01 | package.json | root | node backend/scripts/ux_room_shifts_density_dedup_01_check.js | core | ACTIVE_CORE |  | UX-ROOM-SHIFTS-DENSITY-DEDUP-01 |  | Breaks canonical verification chain |  |
| root:check:uxpremiumcriticalfixroom01 | package.json | root | node backend/scripts/ux_premium_critical_fix_room_01_check.js | core | ACTIVE_CORE |  | UX-PREMIUM-CRITICAL-FIX-ROOM-01 |  | Breaks canonical verification chain |  |
| root:check:uxpremiumcriticalfixagreementsdetail01 | package.json | root | node backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js | core | ACTIVE_CORE |  | UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 |  | Breaks canonical verification chain |  |
| root:check:uxpremiumcriticaluxfixcleanup01 | package.json | root | node backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js | core | ACTIVE_CORE |  | UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01 |  | Breaks canonical verification chain |  |
| root:check:uxschoolorganizationpanels01 | package.json | root | node backend/scripts/ux_school_organization_panels_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXSCHOOLORGANIZATIONPANELS-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanyshiftstabs01 | package.json | root | node backend/scripts/ux_company_shifts_tabs_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXCOMPANYSHIFTSTABS-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanymobileactionclarity01 | package.json | root | node backend/scripts/ux_company_mobile_action_clarity_01_check.js | core | ACTIVE_CORE |  | UX-COMPANY-MOBILE-ACTION-CLARITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanypersonelaccessmobileparity01 | package.json | root | node backend/scripts/ux_company_personel_access_mobile_parity_01_check.js | core | ACTIVE_CORE |  | UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanyagreementsmobileparity01 | package.json | root | node backend/scripts/ux_company_agreements_mobile_parity_01_check.js | core | ACTIVE_CORE |  | UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxmobilewebshellclarity01 | package.json | root | node backend/scripts/ux_mobile_web_shell_clarity_01_check.js | core | ACTIVE_CORE |  | UX-MOBILE-WEB-SHELL-CLARITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanyopspaneltabs01 | package.json | root | node backend/scripts/ux_company_ops_panel_tabs_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXCOMPANYOPSPANELTABS-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanyqualitytabs01 | package.json | root | node backend/scripts/ux_company_quality_panel_tabs_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXCOMPANYQUALITYTABS-01 |  | Breaks canonical verification chain |  |
| root:check:uxcompanypanelsfinalpolish01 | package.json | root | node backend/scripts/ux_company_panels_final_polish_01_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:uxcompanypanelssmoke01 | package.json | root | node backend/scripts/ux_company_ops_panel_tabs_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXCOMPANYPANELSSMOKE-01 |  | Breaks canonical verification chain |  |
| root:check:uxpaneltabsfix01 | package.json | root | node backend/scripts/ux_panel_tabs_functional_02b_fix_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELTABSFIX-01 |  | Breaks canonical verification chain |  |
| root:check:uxlivemaptabsfix01 | package.json | root | node backend/scripts/ux_live_map_tabs_simplify_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXLIVEMAPTABSFIX-01 |  | Breaks canonical verification chain |  |
| root:check:uxlivemaptabssimplify01 | package.json | root | node backend/scripts/ux_live_map_tabs_simplify_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXLIVEMAPTABSSIMPLIFY-01 |  | Breaks canonical verification chain |  |
| root:check:uxpanelreality02c | package.json | root | node backend/scripts/ux_panel_reality_audit_02c_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELREALITY-02-C |  | Breaks canonical verification chain |  |
| root:check:uxpanelrealitycleanup02d | package.json | root | node backend/scripts/ux_panel_reality_cleanup_02d_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELREALITYCLEANUP-02-D |  | Breaks canonical verification chain |  |
| root:check:uxroomagreementstabs01 | package.json | root | node backend/scripts/ux_panel_reality_cleanup_02d_check.js | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | ROOT-CHECK-UXROOMAGREEMENTSTABS-01 | check:uxpanelrealitycleanup02d | Breaks compatibility alias; canonical replacement exists | compat alias |
| root:check:uxpanellayoutwidth02cfix01 | package.json | root | node backend/scripts/ux_panel_layout_width_02c_fix_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELLAYOUTWIDTH-02-CFIX-01 |  | Breaks canonical verification chain |  |
| root:check:uxpanellayoutwidth02cfix02 | package.json | root | node backend/scripts/ux_panel_layout_width_02c_fix_02_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELLAYOUTWIDTH-02-CFIX-02 |  | Breaks canonical verification chain |  |
| root:check:uxpanellayoutwidth02cfix03 | package.json | root | node backend/scripts/ux_panel_layout_width_02c_fix_03_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXPANELLAYOUTWIDTH-02-CFIX-03 |  | Breaks canonical verification chain |  |
| root:check:uxnav01 | package.json | root | node backend/scripts/ux_nav_01_premium_navdock_check.js | core | ACTIVE_CORE |  | UX-NAV-01 |  | Breaks canonical verification chain |  |
| root:check:uxbrandloginpremium01 | package.json | root | node backend/scripts/ux_brand_login_premium_01_check.js | core | ACTIVE_CORE |  | UX-BRAND-LOGIN-PREMIUM-01 |  | Breaks canonical verification chain |  |
| root:check:uxdensity01 | package.json | root | node backend/scripts/ux_density_01_panel_card_density_check.js | core | ACTIVE_CORE |  | UX-DENSITY-01 |  | Breaks canonical verification chain |  |
| root:check:uxpanelstandardarchitecture01 | package.json | root | node backend/scripts/ux_panel_standard_architecture_01_check.js | core | ACTIVE_CORE |  | UX-PANEL-STANDARD-ARCHITECTURE-01 |  | Breaks canonical verification chain |  |
| root:check:finaluxsmoke01 | package.json | root | node backend/scripts/final_ux_smoke_01_check.js | core | ACTIVE_CORE |  | FINAL-UX-SMOKE-01 |  | Breaks canonical verification chain |  |
| root:check:uxlivepanelsmokeaudit01 | package.json | root | node backend/scripts/ux_live_panel_smoke_audit_01_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-UXLIVEPANELSMOKEAUDIT-01 |  | Breaks canonical verification chain |  |
| root:check:uxmobileallrolespanelfix01 | package.json | root | node backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXMOBILEALLROLESPANELFIX-01 |  | Owner or chain unclear |  |
| root:check:uxroomcompanyshiftsmobilecardfix01 | package.json | root | node backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js | review | NEEDS_REVIEW |  | UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01 |  | Owner or chain unclear |  |
| root:check:uxshiftsresponsivelayoutfix01 | package.json | root | node backend/scripts/ux_shifts_responsive_layout_fix_01_check.js | review | NEEDS_REVIEW |  | UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01 |  | Owner or chain unclear |  |
| root:check:uxmobileoverflowminimapreadability01 | package.json | root | node backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js | review | NEEDS_REVIEW |  | UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01 |  | Owner or chain unclear |  |
| root:check:uxmobileoverflowminimappolish02 | package.json | root | node backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js | review | NEEDS_REVIEW |  | UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02 |  | Owner or chain unclear |  |
| root:check:uxmobileallrolespanelaudit01 | package.json | root | node backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js | core | ACTIVE_CORE |  | UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01 |  | Breaks canonical verification chain |  |
| root:check:uxallpanelsrealityaudit01 | package.json | root | node backend/scripts/ux_all_panels_reality_audit_01_check.js | review | NEEDS_REVIEW |  | ROOT-CHECK-UXALLPANELSREALITYAUDIT-01 |  | Owner or chain unclear |  |
| root:check:uxsmokepassminusevidence01 | package.json | root | node backend/scripts/ux_smoke_pass_minus_evidence_01_check.js | core | ACTIVE_CORE |  | UX-SMOKE-PASS-MINUS-EVIDENCE-01 |  | Breaks canonical verification chain |  |
| root:check:uxsmokepassminuszero01 | package.json | root | node backend/scripts/ux_smoke_pass_minus_zero_01_check.js | core | ACTIVE_CORE |  | UX-SMOKE-PASS-MINUS-ZERO-01 |  | Breaks canonical verification chain |  |
| root:smoke:uxlivepanelpremium01 | package.json | root | node backend/scripts/ux_live_panel_premium_smoke_01.mjs | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | UX-LIVE-PANEL-PREMIUM-SMOKE-01 |  | Loses manual smoke entrypoint |  |
| root:smoke:uxmobileallrolespanelaudit01 | package.json | root | node backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs | review | NEEDS_REVIEW |  | UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01 |  | Owner or chain unclear |  |
| root:smoke:uxallpanelsrealityaudit01 | package.json | root | node backend/scripts/ux_all_panels_reality_audit_01.mjs | review | NEEDS_REVIEW |  | ROOT-SMOKE-UXALLPANELSREALITYAUDIT-01 |  | Owner or chain unclear |  |
| root:smoke:productflowbuttonaudit01 | package.json | root | node backend/scripts/product_flow_button_audit_01.mjs | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | PRODUCT-FLOW-BUTTON-AUDIT-01 |  | Loses manual smoke entrypoint |  |
| root:check:uxlivepanelpremiumsmoke01 | package.json | root | node backend/scripts/ux_live_panel_premium_smoke_01_check.js | core | ACTIVE_CORE |  | UX-LIVE-PANEL-PREMIUM-SMOKE-01 |  | Breaks canonical verification chain |  |
| root:check:mobilewebfinal01 | package.json | root | node backend/scripts/mobile_web_final_01_check.js | core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain |  |
| root:check:uxparentpersonelliveerrorclarity01 | package.json | root | node backend/scripts/ux_parent_personel_live_error_clarity_01_check.js | core | ACTIVE_CORE |  | UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01 |  | Breaks canonical verification chain |  |
| root:check:docsstate01 | package.json | root | node backend/scripts/docs_state_01_recent_product_closure_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-DOCSSTATE-01 |  | Breaks canonical verification chain |  |
| root:check:e2esmoke01 | package.json | root | node backend/scripts/e2e_smoke_01_demo_acceptance_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-E-2-ESMOKE-01 |  | Breaks canonical verification chain |  |
| root:check:fieldlaunch01 | package.json | root | node backend/scripts/field_launch_pack_01_readiness_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-FIELDLAUNCH-01 |  | Breaks canonical verification chain |  |
| root:check:verifychain01 | package.json | root | node backend/scripts/verify_chain_01_product_extensions_check.js | verify-core | ACTIVE_CORE |  | VERIFY-CHAIN-01 |  | Breaks canonical verification chain |  |
| root:check:qualitygatefinal01 | package.json | root | node backend/scripts/quality_gate_final_01_check.js | core | ACTIVE_CORE |  | QUALITY-GATE-FINAL-01 |  | Breaks canonical verification chain |  |
| root:check:testqualityandflakeaudit01 | package.json | root | node backend/scripts/test_quality_and_flake_audit_01_check.js | core | ACTIVE_CORE |  | TEST-QUALITY-AND-FLAKE-AUDIT-01 |  | Breaks canonical verification chain |  |
| root:check:dashboardbulkendpoint01 | package.json | root | node backend/scripts/dashboard_bulk_endpoint_01_check.js | core | ACTIVE_CORE |  | DASHBOARD-BULK-ENDPOINT-01 |  | Breaks canonical verification chain |  |
| root:check:cachecoalescingandbackoff01 | package.json | root | node backend/scripts/cache_coalescing_and_backoff_01_check.js | core | ACTIVE_CORE |  | CACHE-COALESCING-AND-BACKOFF-01 |  | Breaks canonical verification chain |  |
| root:check:productionratelimitpolicy01 | package.json | root | node backend/scripts/production_rate_limit_policy_01_check.js | verify-core | ACTIVE_CORE |  | ROOT-CHECK-PRODUCTIONRATELIMITPOLICY-01 |  | Breaks canonical verification chain |  |
| root:check:requeststormresilience01 | package.json | root | node backend/scripts/request_storm_resilience_01_check.js | verify-core | ACTIVE_CORE |  | REQUEST-STORM-RESILIENCE-01 |  | Breaks canonical verification chain |  |
| root:check:airesponsesemanticqualitygate01 | package.json | root | node backend/scripts/ai_response_semantic_quality_gate_01_check.js | verify-core | ACTIVE_CORE |  | AI-RESPONSE-SEMANTIC-QUALITY-GATE-01 |  | Breaks canonical verification chain |  |
| root:check:loadtest2000users01 | package.json | root | node backend/scripts/load_test_2000_users_01_check.js | review | NEEDS_REVIEW |  | LOAD-TEST-2000-USERS-01 |  | Owner or chain unclear |  |
| root:check:dbpoolandapiscaling01 | package.json | root | node backend/scripts/db_pool_and_api_scaling_01_check.js | review | NEEDS_REVIEW |  | DB-POOL-AND-API-SCALING-01 |  | Owner or chain unclear |  |
| root:check:observabilitymonitoringalerting01 | package.json | root | node backend/scripts/observability_monitoring_alerting_01_check.js | review | NEEDS_REVIEW |  | OBSERVABILITY-MONITORING-ALERTING-01 |  | Owner or chain unclear |  |
| root:check:backendlintwarningburndown01 | package.json | root | node backend/scripts/backend_lint_warning_burndown_01_check.js | review | NEEDS_REVIEW |  | BACKEND-LINT-WARNING-BURNDOWN-01 |  | Owner or chain unclear |  |
| root:check:dataintegrityandrecovery01 | package.json | root | node backend/scripts/data_integrity_and_recovery_01_check.js | core | ACTIVE_CORE |  | DATA-INTEGRITY-AND-RECOVERY-01 |  | Breaks canonical verification chain |  |
| root:check:roledataisolationredteam01 | package.json | root | node backend/scripts/role_data_isolation_redteam_01_check.js | verify-core | ACTIVE_CORE |  | ROLE-DATA-ISOLATION-REDTEAM-01 |  | Breaks canonical verification chain |  |
| root:check:securitykvkkfinal01 | package.json | root | node backend/scripts/security_kvkk_final_01_check.js | review | NEEDS_REVIEW |  | SECURITY-KVKK-FINAL-01 |  | Owner or chain unclear |  |
| root:check:auditlogandapprovaltrace01 | package.json | root | node backend/scripts/audit_log_and_approval_trace_01_check.js | verify-core | ACTIVE_CORE |  | AUDIT-LOG-AND-APPROVAL-TRACE-01 |  | Breaks canonical verification chain |  |
| root:check:op01 | package.json | root | node backend/scripts/op_01_operation_proof_service_proof_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-OP-01 |  | Breaks canonical verification chain |  |
| root:check:op02 | package.json | root | node backend/scripts/op_02_manual_operator_proof_note_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-OP-02 |  | Breaks canonical verification chain |  |
| root:check:op03 | package.json | root | node backend/scripts/op_03_web_operation_proof_card_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-OP-03 |  | Breaks canonical verification chain |  |
| root:check:op04 | package.json | root | node backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-OP-04 |  | Breaks canonical verification chain |  |
| root:check:qlt01 | package.json | root | node backend/scripts/qlt_01_quality_provider_readiness_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-QLT-01 |  | Breaks canonical verification chain |  |
| root:check:qlt02 | package.json | root | node backend/scripts/qlt_02_quality_draft_score_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-QLT-02 |  | Breaks canonical verification chain |  |
| root:check:qlt03 | package.json | root | node backend/scripts/qlt_03_quality_review_decision_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-QLT-03 |  | Breaks canonical verification chain |  |
| root:check:qlt04 | package.json | root | node backend/scripts/qlt_04_quality_review_history_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-QLT-04 |  | Breaks canonical verification chain |  |
| root:check:qlt04a | package.json | root | node backend/scripts/qlt_04a_quality_layout_polish_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-QLT-04-A |  | Breaks canonical verification chain |  |
| root:check:qlt04b | package.json | root | node backend/scripts/qlt_04b_compact_signal_list_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-QLT-04-B |  | Breaks canonical verification chain |  |
| root:check:product-extensions | package.json | root | node backend/scripts/run_product_extensions_check_chain.js | verify-core | ACTIVE_CORE |  | ROOT-CHECK-PRODUCT-EXTENSIONS |  | Breaks canonical verification chain |  |
| root:check:pay01b | package.json | root | node backend/scripts/pay_01b_payment_preview_readonly_check.js | core | ACTIVE_CORE |  | ROOT-CHECK-PAY-01-B |  | Breaks canonical verification chain |  |
| root:check:web-mobile | package.json | root | npm --prefix web run check:web-mobile | web-lint | ACTIVE_WEB_LINT |  | ROOT-CHECK-WEB-MOBILE |  | Breaks frontend/web lint gate |  |
| root:verify:repo | package.json | root | node backend/scripts/run_repo_check_chain.js --phase all | verify-core | ACTIVE_CORE |  | ROOT-VERIFY-REPO |  | Breaks canonical verification chain |  |
| root:verify:snapshot | package.json | root | node backend/scripts/m90_c10_physical_snapshot_hygiene_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | ROOT-VERIFY-SNAPSHOT |  | Breaks release / evidence / closure gate |  |
| root:lint:backend | package.json | root | npm --prefix backend run lint | backend-lint | ACTIVE_BACKEND_LINT |  | ROOT-LINT-BACKEND |  | Breaks backend lint gate |  |
| root:lint:web | package.json | root | node backend/scripts/run_web_lint_with_evidence.js | web-lint | ACTIVE_WEB_LINT |  | ROOT-LINT-WEB |  | Breaks frontend/web lint gate |  |
| root:lint | package.json | root | npm run lint:backend && npm run lint:web | web-lint | ACTIVE_WEB_LINT |  | ROOT-LINT |  | Breaks frontend/web lint gate |  |
| root:dev:reset | package.json | root | powershell -NoProfile -ExecutionPolicy Bypass -File tools/reset-dev.ps1 | review | NEEDS_REVIEW |  | ROOT-DEV-RESET |  | Owner or chain unclear |  |
| root:audit:repo | package.json | root | node backend/scripts/repo_audit.js | core | ACTIVE_CORE |  | ROOT-AUDIT-REPO |  | Breaks canonical verification chain |  |
| root:verify:docs | package.json | root | node backend/scripts/run_repo_check_chain.js --phase docs | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | ROOT-VERIFY-DOCS |  | Breaks release / evidence / closure gate |  |
| root:verify:hot | package.json | root | node backend/scripts/run_repo_check_chain.js --phase hot | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | ROOT-VERIFY-HOT |  | Breaks release / evidence / closure gate |  |
| root:verify:web-contract | package.json | root | node backend/scripts/run_repo_check_chain.js --phase web-contract | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | ROOT-VERIFY-WEB-CONTRACT |  | Breaks release / evidence / closure gate |  |
| root:verify:closure | package.json | root | node backend/scripts/run_repo_check_chain.js --phase closure | verify-core | ACTIVE_CORE |  | ROOT-VERIFY-CLOSURE |  | Breaks canonical verification chain |  |
| root:verify:milestones | package.json | root | node backend/scripts/run_m0_latest.js --static-only --to latest --continue | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | ROOT-VERIFY-MILESTONES |  | Breaks release / evidence / closure gate |  |
| root:verify:milestones:live | package.json | root | node backend/scripts/run_m0_latest.js --integration-only --to latest --continue | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | ROOT-VERIFY-MILESTONES-LIVE |  | Breaks release / evidence / closure gate |  |
| root:verify:ci | package.json | root | npm run verify:repo | verify-core | ACTIVE_CORE |  | ROOT-VERIFY-CI |  | Breaks canonical verification chain |  |
| root:verify:final | package.json | root | npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot | verify-core | ACTIVE_CORE |  | FINAL |  | Breaks canonical verification chain | canonical closure |

### Backend
| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| backend:dev | backend/package.json | backend | nodemon --watch src --ext js,json --signal SIGTERM --exec "node src/server.js" | review | NEEDS_REVIEW |  | BACKEND-DEV |  | Owner or chain unclear |  |
| backend:start | backend/package.json | backend | node src/server.js | review | NEEDS_REVIEW |  | BACKEND-START |  | Owner or chain unclear |  |
| backend:seed | backend/package.json | backend | node prisma/seed.js | review | NEEDS_REVIEW |  | BACKEND-SEED |  | Owner or chain unclear |  |
| backend:lint | backend/package.json | backend | node scripts/run_backend_lint.js | backend-lint | ACTIVE_BACKEND_LINT |  | BACKEND-LINT |  | Breaks backend lint gate | backend lint wrapper |
| backend:smoke | backend/package.json | backend | node scripts/smoke.js | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-SMOKE |  | Loses manual smoke entrypoint |  |
| backend:fullcheck | backend/package.json | backend | node scripts/fullcheck.js | verify-core | ACTIVE_CORE |  | BACKEND-FULLCHECK |  | Breaks canonical verification chain |  |
| backend:repo:check | backend/package.json | backend | node scripts/run_repo_check_chain.js --phase all | verify-core | ACTIVE_CORE |  | BACKEND-REPO-CHECK |  | Breaks canonical verification chain |  |
| backend:repo:check:chain | backend/package.json | backend | node scripts/run_repo_check_chain.js --phase all | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | BACKEND-REPO-CHECK-CHAIN | repo:check | Breaks compatibility alias; canonical replacement exists | compat alias |
| backend:m0check | backend/package.json | backend | node scripts/m0check.js | review | ACTIVE |  | BACKEND-M-0-CHECK |  | Owner or chain unclear |  |
| backend:m1check | backend/package.json | backend | node scripts/m1check.js | review | ACTIVE |  | BACKEND-M-1-CHECK |  | Owner or chain unclear |  |
| backend:m2check | backend/package.json | backend | node scripts/m2check.js | review | ACTIVE |  | BACKEND-M-2-CHECK |  | Owner or chain unclear |  |
| backend:m3check | backend/package.json | backend | node scripts/m3check.js | review | ACTIVE |  | BACKEND-M-3-CHECK |  | Owner or chain unclear |  |
| backend:m4check | backend/package.json | backend | node scripts/m4check.js | review | ACTIVE |  | BACKEND-M-4-CHECK |  | Owner or chain unclear |  |
| backend:m5check | backend/package.json | backend | node scripts/m5check.js | review | ACTIVE |  | BACKEND-M-5-CHECK |  | Owner or chain unclear |  |
| backend:m6check | backend/package.json | backend | node scripts/m6check.js | review | ACTIVE |  | BACKEND-M-6-CHECK |  | Owner or chain unclear |  |
| backend:m7check | backend/package.json | backend | node scripts/m7check.js | review | ACTIVE |  | BACKEND-M-7-CHECK |  | Owner or chain unclear |  |
| backend:m8check | backend/package.json | backend | node scripts/m8check.js | review | ACTIVE |  | BACKEND-M-8-CHECK |  | Owner or chain unclear |  |
| backend:m9check | backend/package.json | backend | node scripts/m9check.js | review | ACTIVE |  | BACKEND-M-9-CHECK |  | Owner or chain unclear |  |
| backend:m10check | backend/package.json | backend | node scripts/m10check.js | review | ACTIVE |  | BACKEND-M-10-CHECK |  | Owner or chain unclear |  |
| backend:m11check | backend/package.json | backend | node scripts/m11check.js | review | ACTIVE |  | BACKEND-M-11-CHECK |  | Owner or chain unclear |  |
| backend:m12check | backend/package.json | backend | node scripts/m12check.js | review | ACTIVE |  | BACKEND-M-12-CHECK |  | Owner or chain unclear |  |
| backend:m63check | backend/package.json | backend | node scripts/m63_trust_quality_service_evaluation_check.js | review | ACTIVE |  | BACKEND-M-63-CHECK |  | Owner or chain unclear |  |
| backend:m60check | backend/package.json | backend | node scripts/m60_field_acceptance_center_check.js | review | ACTIVE |  | BACKEND-M-60-CHECK |  | Owner or chain unclear |  |
| backend:m64check | backend/package.json | backend | node scripts/m64_natural_copilot_layer_check.js | review | ACTIVE |  | BACKEND-M-64-CHECK |  | Owner or chain unclear |  |
| backend:m66check | backend/package.json | backend | node scripts/m66check.js | review | ACTIVE |  | BACKEND-M-66-CHECK |  | Owner or chain unclear |  |
| backend:m82_1check | backend/package.json | backend | node scripts/m82_1_correctness_guard_check.js | review | ACTIVE |  | BACKEND-M-82-1-CHECK |  | Owner or chain unclear |  |
| backend:m82_1accept | backend/package.json | backend | node scripts/m82_1_acceptance_contract_check.js | review | NEEDS_REVIEW |  | BACKEND-M-82-1-ACCEPT |  | Owner or chain unclear |  |
| backend:m82_2check | backend/package.json | backend | node scripts/m82_2_web_contract_cache_check.js | review | ACTIVE |  | BACKEND-M-82-2-CHECK |  | Owner or chain unclear |  |
| backend:m82_9check | backend/package.json | backend | node scripts/m82_9_dormant_payment_backbone_check.js | review | ACTIVE |  | BACKEND-M-82-9-CHECK |  | Owner or chain unclear |  |
| backend:m82_10check | backend/package.json | backend | node scripts/m82_10_super_admin_commercial_settings_check.js | review | ACTIVE |  | BACKEND-M-82-10-CHECK |  | Owner or chain unclear |  |
| backend:m82_11check | backend/package.json | backend | node scripts/m82_11_payment_readonly_surface_check.js | review | ACTIVE |  | BACKEND-M-82-11-CHECK |  | Owner or chain unclear |  |
| backend:m83check | backend/package.json | backend | node scripts/m83_field_prep_packet_check.js | review | ACTIVE |  | BACKEND-M-83-CHECK |  | Owner or chain unclear |  |
| backend:m84check | backend/package.json | backend | node scripts/m84_field_feedback_loop_check.js | review | ACTIVE |  | BACKEND-M-84-CHECK |  | Owner or chain unclear |  |
| backend:m85check | backend/package.json | backend | node scripts/m85_optional_payment_pilot_check.js | review | ACTIVE |  | BACKEND-M-85-CHECK |  | Owner or chain unclear |  |
| backend:m86check | backend/package.json | backend | node scripts/m86_required_payment_rollout_check.js | review | ACTIVE |  | BACKEND-M-86-CHECK |  | Owner or chain unclear |  |
| backend:m87check | backend/package.json | backend | node scripts/m87_payment_account_readiness_check.js | review | ACTIVE |  | BACKEND-M-87-CHECK |  | Owner or chain unclear |  |
| backend:m88check | backend/package.json | backend | node scripts/m88_settlement_operations_console_check.js | review | ACTIVE |  | BACKEND-M-88-CHECK |  | Owner or chain unclear |  |
| backend:m89check | backend/package.json | backend | node scripts/m89_settlement_reconciliation_desk_check.js | review | ACTIVE |  | BACKEND-M-89-CHECK |  | Owner or chain unclear |  |
| backend:m90b1check | backend/package.json | backend | node scripts/m90_b1_canonical_closure_gate_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-90-B-1-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:m90c6check | backend/package.json | backend | node scripts/m90_c6_hot_file_queue_policy_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-90-C-6-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:m90c7check | backend/package.json | backend | node scripts/m90_c7_export_package_hygiene_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-90-C-7-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:m90c8check | backend/package.json | backend | node scripts/m90_c8_ci_verification_visibility_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-90-C-8-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:m90c9check | backend/package.json | backend | node scripts/m90_c9_safe_closure_final_hygiene_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-90-C-9-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:m90c10check | backend/package.json | backend | node scripts/m90_c10_physical_snapshot_hygiene_check.js | review | ACTIVE |  | BACKEND-M-90-C-10-CHECK |  | Owner or chain unclear |  |
| backend:m94dcheck | backend/package.json | backend | node scripts/m94d_admin_payment_security_export_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-94-DCHECK |  | Breaks release / evidence / closure gate |  |
| backend:m96c2check | backend/package.json | backend | node scripts/m96_c2_boarding_change_ops_check.js | review | ACTIVE |  | BACKEND-M-96-C-2-CHECK |  | Owner or chain unclear |  |
| backend:m94echeck | backend/package.json | backend | node scripts/m94e_queue_chaos_alarm_check.js | review | ACTIVE |  | BACKEND-M-94-ECHECK |  | Owner or chain unclear |  |
| backend:m94eprobe | backend/package.json | backend | node scripts/m94e_queue_chaos_alarm_probe.js | review | NEEDS_REVIEW |  | BACKEND-M-94-EPROBE |  | Owner or chain unclear |  |
| backend:m95e20check | backend/package.json | backend | node scripts/m95_e20_driver_phone_gps_fallback_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-95-E-20-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:m97acheck | backend/package.json | backend | node scripts/m97_a_room_operation_panel_check.js | review | ACTIVE |  | BACKEND-M-97-ACHECK |  | Owner or chain unclear |  |
| backend:m97check | backend/package.json | backend | node scripts/m97_panel_integration_check.js | review | ACTIVE |  | BACKEND-M-97-CHECK |  | Owner or chain unclear |  |
| backend:m97opscheck | backend/package.json | backend | node scripts/m97_panel_operations_check.js | review | ACTIVE |  | BACKEND-M-97-OPSCHECK |  | Owner or chain unclear |  |
| backend:m45:backup:create | backend/package.json | backend | node scripts/m45_backup_create.js | release | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-45-BACKUP-CREATE |  | Breaks release / evidence / closure gate |  |
| backend:m45:backup:restore | backend/package.json | backend | node scripts/m45_backup_restore.js | release | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-45-BACKUP-RESTORE |  | Breaks release / evidence / closure gate |  |
| backend:milestones:static | backend/package.json | backend | node scripts/run_m0_latest.js --static-only --to latest --continue | release | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-MILESTONES-STATIC |  | Breaks release / evidence / closure gate |  |
| backend:m91check | backend/package.json | backend | node scripts/run_m91_route_preview_checks.js | review | ACTIVE |  | BACKEND-M-91-CHECK |  | Owner or chain unclear |  |
| backend:m91:smoke:agreement | backend/package.json | backend | node scripts/m91_shift_to_agreement_smoke.js | review | NEEDS_REVIEW |  | BACKEND-M-91-SMOKE-AGREEMENT |  | Owner or chain unclear |  |
| backend:m91:smoke:route-preview | backend/package.json | backend | node scripts/m91_route_preview_fallback_smoke.js | review | NEEDS_REVIEW |  | BACKEND-M-91-SMOKE-ROUTE-PREVIEW |  | Owner or chain unclear |  |
| backend:m91:smoke | backend/package.json | backend | npm run m91:smoke:agreement && npm run m91:smoke:route-preview | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-M-91-SMOKE |  | Loses manual smoke entrypoint |  |
| backend:m91a:smoke | backend/package.json | backend | node scripts/m91a_reservation_conflict_check.js | review | NEEDS_REVIEW |  | BACKEND-M-91-A-SMOKE |  | Owner or chain unclear |  |
| backend:current:surface | backend/package.json | backend | npm run smoke && npm run m91:smoke && npm run m91a:smoke | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-CURRENT-SURFACE |  | Loses manual smoke entrypoint |  |
| backend:m91:milestones | backend/package.json | backend | node scripts/run_m0_latest.js --static-only --from M91 --to M91 --continue | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-91-MILESTONES |  | Breaks release / evidence / closure gate |  |
| backend:m92check | backend/package.json | backend | node scripts/m92_repo_verification_spine_check.js | verify:final | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-M-92-CHECK |  | Breaks release / evidence / closure gate |  |
| backend:bench:gps:100 | backend/package.json | backend | node scripts/bench_gps_publish_only.js --scenario=publish-only | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-GPS-100 |  | Loses manual smoke entrypoint |  |
| backend:bench:gps:100:auto | backend/package.json | backend | node scripts/bench_gps_publish_only.js --scenario=auto-reached | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-GPS-100-AUTO |  | Loses manual smoke entrypoint |  |
| backend:bench:gps:300:auto:panels | backend/package.json | backend | node scripts/bench_gps_publish_only.js --scenario=auto-reached --vehicles=300 --panelProfile=readstorm | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-GPS-300-AUTO-PANELS |  | Loses manual smoke entrypoint |  |
| backend:bench:reset | backend/package.json | backend | node scripts/bench_reset_data.js --force | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-RESET |  | Loses manual smoke entrypoint |  |
| backend:spec16check | backend/package.json | backend | node scripts/project_spec_v1_future_strengthening_coverage_check.js | release | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | BACKEND-SPEC-16-CHECK |  | Breaks release / evidence / closure gate |  |
| eslint.config.js | backend/eslint.config.js | backend |  | review | NEEDS_REVIEW |  | ESLINT-CONFIG |  | Owner or chain unclear |  |
| seed.js | backend/prisma/seed.js | backend | backend:seed | review | NEEDS_REVIEW |  | SEED |  | Owner or chain unclear |  |
| _agreement_source_shift_harness.js | backend/scripts/_agreement_source_shift_harness.js | backend |  | helper | ACTIVE |  | AGREEMENT-SOURCE-SHIFT-HARNESS |  | Owner or chain unclear | internal helper |
| _harness.js | backend/scripts/_harness.js | backend | root:check:scriptharnessconsolidation01 | product-extensions | ACTIVE |  | HARNESS |  | Owner or chain unclear | internal helper |
| _m91_route_preview_checks.js | backend/scripts/_m91_route_preview_checks.js | backend | backend:m91check | helper | ACTIVE |  | M-91-ROUTE-PREVIEW-CHECKS |  | Owner or chain unclear | internal helper |
| _m91_smoke_helpers.js | backend/scripts/_m91_smoke_helpers.js | backend |  | helper | ACTIVE |  | M-91-SMOKE-HELPERS |  | Owner or chain unclear | internal helper |
| _repoContractState.js | backend/scripts/_repoContractState.js | backend |  | helper | ACTIVE |  | REPO-CONTRACT-STATE |  | Owner or chain unclear | internal helper |
| _static_milestone_check.js | backend/scripts/_static_milestone_check.js | backend |  | helper | ACTIVE |  | STATIC-MILESTONE-CHECK |  | Owner or chain unclear | internal helper |
| _totp_harness.js | backend/scripts/_totp_harness.js | backend |  | helper | ACTIVE |  | TOTP-HARNESS |  | Owner or chain unclear | internal helper |
| address_geocoding_confidence_01_check.js | backend/scripts/address_geocoding_confidence_01_check.js | backend | root:check:addressgeocodingconfidence01 | review | NEEDS_REVIEW |  | ADDRESS-GEOCODING-CONFIDENCE-01-CHECK |  | Owner or chain unclear |  |
| agreement_source_shift_lineage_01_check.js | backend/scripts/agreement_source_shift_lineage_01_check.js | backend | root:check:agreementsourceshiftlineage01 | review | NEEDS_REVIEW |  | AGREEMENT-SOURCE-SHIFT-LINEAGE-01-CHECK |  | Owner or chain unclear |  |
| ai03b_paraphrase_intent_audit_01_check.js | backend/scripts/ai03b_paraphrase_intent_audit_01_check.js | backend | root:check:ai03bparaphraseintentaudit01 | review | NEEDS_REVIEW |  | AI-03-B-PARAPHRASE-INTENT-AUDIT-01-CHECK |  | Owner or chain unclear |  |
| ai03b_semantic_visible_audit_01_check.js | backend/scripts/ai03b_semantic_visible_audit_01_check.js | backend | root:check:ai03bsemanticvisibleaudit01 | review | NEEDS_REVIEW |  | AI-03-B-SEMANTIC-VISIBLE-AUDIT-01-CHECK |  | Owner or chain unclear |  |
| ai03b_semantic_visible_live_matrix_01_check.js | backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js | backend | root:check:ai03bsemanticvisiblelivematrix01 | review | NEEDS_REVIEW |  | AI-03-B-SEMANTIC-VISIBLE-LIVE-MATRIX-01-CHECK |  | Owner or chain unclear |  |
| ai_response_semantic_quality_gate_01_check.js | backend/scripts/ai_response_semantic_quality_gate_01_check.js | backend | root:check:airesponsesemanticqualitygate01 | review | NEEDS_REVIEW |  | AI-RESPONSE-SEMANTIC-QUALITY-GATE-01-CHECK |  | Owner or chain unclear |  |
| audit_log_and_approval_trace_01_check.js | backend/scripts/audit_log_and_approval_trace_01_check.js | backend | root:check:auditlogandapprovaltrace01 | review | NEEDS_REVIEW |  | AUDIT-LOG-AND-APPROVAL-TRACE-01 |  | Owner or chain unclear |  |
| audit_logs_session_hotfix_check.mjs | backend/scripts/audit_logs_session_hotfix_check.mjs | backend |  | review | NEEDS_REVIEW |  | AUDIT-LOGS-SESSION-HOTFIX-CHECK |  | Owner or chain unclear |  |
| auth_stepup_dev_toggle_01_check.js | backend/scripts/auth_stepup_dev_toggle_01_check.js | backend | root:check:authstepupdevtoggle01 | review | NEEDS_REVIEW |  | AUTH-STEPUP-DEV-TOGGLE-01-CHECK |  | Owner or chain unclear |  |
| auth_stepup_provider_local_default_01_check.js | backend/scripts/auth_stepup_provider_local_default_01_check.js | backend | root:check:authstepupproviderlocaldefault01 | review | NEEDS_REVIEW |  | AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01-CHECK |  | Owner or chain unclear |  |
| backend_lint_warning_burndown_01_check.js | backend/scripts/backend_lint_warning_burndown_01_check.js | backend | root:check:backendlintwarningburndown01 | review | NEEDS_REVIEW |  | BACKEND-LINT-WARNING-BURNDOWN-01 |  | Owner or chain unclear |  |
| bench_gps_publish_only.js | backend/scripts/bench_gps_publish_only.js | backend | backend:bench:gps:100, backend:bench:gps:100:auto, backend:bench:gps:300:auto:panels | review | NEEDS_REVIEW |  | BENCH-GPS-PUBLISH-ONLY |  | Owner or chain unclear |  |
| bench_reset_data.js | backend/scripts/bench_reset_data.js | backend | backend:bench:reset | review | NEEDS_REVIEW |  | BENCH-RESET-DATA |  | Owner or chain unclear |  |
| boarding_change_request_entry_01_check.js | backend/scripts/boarding_change_request_entry_01_check.js | backend | root:check:boardingchangerequestentry01 | review | NEEDS_REVIEW |  | BOARDING-CHANGE-REQUEST-ENTRY-01-CHECK |  | Owner or chain unclear |  |
| boarding_ops_01a_route_impact_preview_check.js | backend/scripts/boarding_ops_01a_route_impact_preview_check.js | backend | root:check:boardingops01a | review | NEEDS_REVIEW |  | BOARDING-OPS-01-A-ROUTE-IMPACT-PREVIEW-CHECK |  | Owner or chain unclear |  |
| boarding_ops_01b_apply_accepted_change_check.js | backend/scripts/boarding_ops_01b_apply_accepted_change_check.js | backend | root:check:boardingops01b | review | NEEDS_REVIEW |  | BOARDING-OPS-01-B-APPLY-ACCEPTED-CHANGE-CHECK |  | Owner or chain unclear |  |
| boarding_ops_01c_driver_route_refresh_check.js | backend/scripts/boarding_ops_01c_driver_route_refresh_check.js | backend | root:check:boardingops01c | review | NEEDS_REVIEW |  | BOARDING-OPS-01-C-DRIVER-ROUTE-REFRESH-CHECK |  | Owner or chain unclear |  |
| bootstrap_dependencies.js | backend/scripts/bootstrap_dependencies.js | backend |  | review | NEEDS_REVIEW |  | BOOTSTRAP-DEPENDENCIES |  | Owner or chain unclear |  |
| bug_route_impact_preview_button_01_check.js | backend/scripts/bug_route_impact_preview_button_01_check.js | backend | root:check:bugrouteimpactpreviewbutton01 | review | NEEDS_REVIEW |  | BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01-CHECK |  | Owner or chain unclear |  |
| cache_coalescing_and_backoff_01_check.js | backend/scripts/cache_coalescing_and_backoff_01_check.js | backend | root:check:cachecoalescingandbackoff01 | review | NEEDS_REVIEW |  | CACHE-COALESCING-AND-BACKOFF-01-CHECK |  | Owner or chain unclear |  |
| clean_snapshot_artifacts.js | backend/scripts/clean_snapshot_artifacts.js | backend | root:verify:final | verify:final | ACTIVE_CORE |  | CLEAN-SNAPSHOT-ARTIFACTS |  | Owner or chain unclear | canonical runner |
| company_fetch_storm_check.js | backend/scripts/company_fetch_storm_check.js | backend |  | review | NEEDS_REVIEW |  | COMPANY-FETCH-STORM-CHECK |  | Owner or chain unclear |  |
| company_fetch_storm_v2_check.cjs | backend/scripts/company_fetch_storm_v2_check.cjs | backend |  | review | NEEDS_REVIEW |  | COMPANY-FETCH-STORM-V-2-CHECK |  | Owner or chain unclear |  |
| cop_01a_op_qlt_pay_copilot_guide_check.js | backend/scripts/cop_01a_op_qlt_pay_copilot_guide_check.js | backend | root:check:cop01a | product | ACTIVE |  | COP-01-A-OP-QLT-PAY-COPILOT-GUIDE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_01b_selected_record_diagnostic_context_check.js | backend/scripts/cop_01b_selected_record_diagnostic_context_check.js | backend | root:check:cop01b | product | ACTIVE |  | COP-01-B-SELECTED-RECORD-DIAGNOSTIC-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_01c_real_context_bridge_check.js | backend/scripts/cop_01c_real_context_bridge_check.js | backend | root:check:cop01c | product | ACTIVE |  | COP-01-C-REAL-CONTEXT-BRIDGE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_01d_visible_diagnostic_signals_check.js | backend/scripts/cop_01d_visible_diagnostic_signals_check.js | backend | root:check:cop01d | product | ACTIVE |  | COP-01-D-VISIBLE-DIAGNOSTIC-SIGNALS-CHECK |  | Owner or chain unclear | product check/helper |
| cop_01e_operational_guide_acceptance_check.js | backend/scripts/cop_01e_operational_guide_acceptance_check.js | backend | root:check:cop01e | product | ACTIVE |  | COP-01-E-OPERATIONAL-GUIDE-ACCEPTANCE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_02a_program_ici_genel_rehber_check.js | backend/scripts/cop_02a_program_ici_genel_rehber_check.js | backend | root:check:cop02a | product | ACTIVE |  | COP-02-A-PROGRAM-ICI-GENEL-REHBER-CHECK |  | Owner or chain unclear | product check/helper |
| cop_02b_contextual_suggestion_check.js | backend/scripts/cop_02b_contextual_suggestion_check.js | backend | root:check:cop02b | product | ACTIVE |  | COP-02-B-CONTEXTUAL-SUGGESTION-CHECK |  | Owner or chain unclear | product check/helper |
| cop_02b_fix_short_natural_prompt_check.js | backend/scripts/cop_02b_fix_short_natural_prompt_check.js | backend | root:check:cop02bfix01 | product | ACTIVE |  | COP-02-B-FIX-SHORT-NATURAL-PROMPT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03a_fix_02_visible_reply_chip_polish_check.js | backend/scripts/cop_03a_fix_02_visible_reply_chip_polish_check.js | backend | root:check:cop03afix02 | product | ACTIVE |  | COP-03-A-FIX-02-VISIBLE-REPLY-CHIP-POLISH-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03a_fix_global_screen_purpose_check.js | backend/scripts/cop_03a_fix_global_screen_purpose_check.js | backend | root:check:cop03afix01 | product | ACTIVE |  | COP-03-A-FIX-GLOBAL-SCREEN-PURPOSE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03a_screen_catalog_parity_check.js | backend/scripts/cop_03a_screen_catalog_parity_check.js | backend | root:check:cop03a | product | ACTIVE |  | COP-03-A-SCREEN-CATALOG-PARITY-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03b_workflow_domain_depth_check.js | backend/scripts/cop_03b_workflow_domain_depth_check.js | backend | root:check:cop03b | product | ACTIVE |  | COP-03-B-WORKFLOW-DOMAIN-DEPTH-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03c_fix_01_live_workflow_answer_quality_check.js | backend/scripts/cop_03c_fix_01_live_workflow_answer_quality_check.js | backend | root:check:cop03cfix01 | product | ACTIVE |  | COP-03-C-FIX-01-LIVE-WORKFLOW-ANSWER-QUALITY-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03c_fix_02_live_answer_precision_check.js | backend/scripts/cop_03c_fix_02_live_answer_precision_check.js | backend | root:check:cop03cfix02 | product | ACTIVE |  | COP-03-C-FIX-02-LIVE-ANSWER-PRECISION-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03c_fix_03_live_acceptance_polish_check.js | backend/scripts/cop_03c_fix_03_live_acceptance_polish_check.js | backend | root:check:cop03cfix03 | product | ACTIVE |  | COP-03-C-FIX-03-LIVE-ACCEPTANCE-POLISH-CHECK |  | Owner or chain unclear | product check/helper |
| cop_03c_live_data_action_simulation_check.js | backend/scripts/cop_03c_live_data_action_simulation_check.js | backend | root:check:cop03c | product | ACTIVE |  | COP-03-C-LIVE-DATA-ACTION-SIMULATION-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04a_fix_01_global_live_answer_final_polish_check.js | backend/scripts/cop_04a_fix_01_global_live_answer_final_polish_check.js | backend | root:check:cop04afix01 | product | ACTIVE |  | FINAL |  | Owner or chain unclear | product check/helper |
| cop_04a_fix_02_contract_generation_intent_check.js | backend/scripts/cop_04a_fix_02_contract_generation_intent_check.js | backend | root:check:cop04afix02 | product | ACTIVE |  | COP-04-A-FIX-02-CONTRACT-GENERATION-INTENT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04a_fix_03_live_company_agreements_context_check.js | backend/scripts/cop_04a_fix_03_live_company_agreements_context_check.js | backend | root:check:cop04afix03 | product | ACTIVE |  | COP-04-A-FIX-03-LIVE-COMPANY-AGREEMENTS-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04a_fix_04_quick_help_contract_answer_route_check.js | backend/scripts/cop_04a_fix_04_quick_help_contract_answer_route_check.js | backend | root:check:cop04afix04 | product | ACTIVE |  | COP-04-A-FIX-04-QUICK-HELP-CONTRACT-ANSWER-ROUTE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04a_global_answer_quality_check.js | backend/scripts/cop_04a_global_answer_quality_check.js | backend | root:check:cop04a | product | ACTIVE |  | COP-04-A-GLOBAL-ANSWER-QUALITY-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_01_superadmin_room_live_context_check.js | backend/scripts/cop_04b_fix_01_superadmin_room_live_context_check.js | backend | root:check:cop04bfix01 | product | ACTIVE |  | COP-04-B-FIX-01-SUPERADMIN-ROOM-LIVE-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_02_company_commercial_context_check.js | backend/scripts/cop_04b_fix_02_company_commercial_context_check.js | backend | root:check:cop04bfix02 | product | ACTIVE |  | COP-04-B-FIX-02-COMPANY-COMMERCIAL-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_03_personel_parent_driver_context_check.js | backend/scripts/cop_04b_fix_03_personel_parent_driver_context_check.js | backend | root:check:cop04bfix03 | product | ACTIVE |  | COP-04-B-FIX-03-PERSONEL-PARENT-DRIVER-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_04_chip_answer_premium_polish_check.js | backend/scripts/cop_04b_fix_04_chip_answer_premium_polish_check.js | backend | root:check:cop04bfix04 | product | ACTIVE |  | COP-04-B-FIX-04-CHIP-ANSWER-PREMIUM-POLISH-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_05_live_room_selected_vehicle_route_check.js | backend/scripts/cop_04b_fix_05_live_room_selected_vehicle_route_check.js | backend | root:check:cop04bfix05 | product | ACTIVE |  | COP-04-B-FIX-05-LIVE-ROOM-SELECTED-VEHICLE-ROUTE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_06_free_chat_context_bridge_check.js | backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | backend | root:check:cop04bfix06 | product | ACTIVE |  | COP-04-B-FIX-06-FREE-CHAT-CONTEXT-BRIDGE-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_07_personel_live_copilot_context_check.js | backend/scripts/cop_04b_fix_07_personel_live_copilot_context_check.js | backend | root:check:cop04bfix07 | product | ACTIVE |  | COP-04-B-FIX-07-PERSONEL-LIVE-COPILOT-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_fix_08_parent_live_context_check.js | backend/scripts/cop_04b_fix_08_parent_live_context_check.js | backend | root:check:cop04bfix08 | product | ACTIVE |  | COP-04-B-FIX-08-PARENT-LIVE-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_04b_panel_context_audit_check.js | backend/scripts/cop_04b_panel_context_audit_check.js | backend | root:check:cop04b | product | ACTIVE |  | COP-04-B-PANEL-CONTEXT-AUDIT-CHECK |  | Owner or chain unclear | product check/helper |
| cop_live_accept_01_check.js | backend/scripts/cop_live_accept_01_check.js | backend | root:check:copliveaccept01 | product | ACTIVE |  | COP-LIVE-ACCEPT-01-CHECK |  | Owner or chain unclear | product check/helper |
| copilot_ai_action_roadmap_01_check.js | backend/scripts/copilot_ai_action_roadmap_01_check.js | backend | root:check:copilotairoadmap01 | review | NEEDS_REVIEW |  | COPILOT-AI-ACTION-ROADMAP-01-CHECK |  | Owner or chain unclear |  |
| copilot_clarifying_question_engine_01_check.js | backend/scripts/copilot_clarifying_question_engine_01_check.js | backend | root:check:copilotclarifyingquestionengine01 | review | NEEDS_REVIEW |  | COPILOT-CLARIFYING-QUESTION-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_context_memory_task_state_01_check.js | backend/scripts/copilot_context_memory_task_state_01_check.js | backend | root:check:copilotcontextmemorytaskstate01 | review | NEEDS_REVIEW |  | COPILOT-CONTEXT-MEMORY-TASK-STATE-01-CHECK |  | Owner or chain unclear |  |
| copilot_demand_intake_01_check.js | backend/scripts/copilot_demand_intake_01_check.js | backend | root:check:copilotdemandintake01 | review | NEEDS_REVIEW |  | COPILOT-DEMAND-INTAKE-01-CHECK |  | Owner or chain unclear |  |
| copilot_demand_to_agreement_roadmap_01_check.js | backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js | backend | root:check:copilotdemandagreement01 | review | NEEDS_REVIEW |  | COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01-CHECK |  | Owner or chain unclear |  |
| copilot_dynamic_question_engine_01_check.js | backend/scripts/copilot_dynamic_question_engine_01_check.js | backend | root:check:copilotdynamicquestionengine01 | review | NEEDS_REVIEW |  | COPILOT-DYNAMIC-QUESTION-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_e_block_runtime_answer_integration_01_check.js | backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js | backend | root:check:copiloteblockruntimeanswerintegration01 | review | NEEDS_REVIEW |  | COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01-CHECK |  | Owner or chain unclear |  |
| copilot_excel_demand_import_01_check.js | backend/scripts/copilot_excel_demand_import_01_check.js | backend | root:check:copilotexceldemandimport01 | review | NEEDS_REVIEW |  | COPILOT-EXCEL-DEMAND-IMPORT-01-CHECK |  | Owner or chain unclear |  |
| copilot_guided_task_engine_01_check.js | backend/scripts/copilot_guided_task_engine_01_check.js | backend | root:check:copilotguidedtaskengine01 | review | NEEDS_REVIEW |  | COPILOT-GUIDED-TASK-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_human_approval_01_check.js | backend/scripts/copilot_human_approval_01_check.js | backend | root:check:copilothumanapproval01 | review | NEEDS_REVIEW |  | COPILOT-HUMAN-APPROVAL-01-CHECK |  | Owner or chain unclear |  |
| copilot_negotiation_assist_01_check.js | backend/scripts/copilot_negotiation_assist_01_check.js | backend | root:check:copilotnegotiationassist01 | review | NEEDS_REVIEW |  | COPILOT-NEGOTIATION-ASSIST-01-CHECK |  | Owner or chain unclear |  |
| copilot_next_best_action_engine_01_check.js | backend/scripts/copilot_next_best_action_engine_01_check.js | backend | root:check:copilotnextbestactionengine01 | review | NEEDS_REVIEW |  | COPILOT-NEXT-BEST-ACTION-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_offer_analysis_01_check.js | backend/scripts/copilot_offer_analysis_01_check.js | backend | root:check:copilotofferanalysis01 | review | NEEDS_REVIEW |  | COPILOT-OFFER-ANALYSIS-01-CHECK |  | Owner or chain unclear |  |
| copilot_offer_recommendation_01_check.js | backend/scripts/copilot_offer_recommendation_01_check.js | backend | root:check:copilotofferrecommendation01 | review | NEEDS_REVIEW |  | COPILOT-OFFER-RECOMMENDATION-01-CHECK |  | Owner or chain unclear |  |
| copilot_operation_health_engine_01_check.js | backend/scripts/copilot_operation_health_engine_01_check.js | backend | root:check:copilotoperationhealthengine01 | review | NEEDS_REVIEW |  | COPILOT-OPERATION-HEALTH-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_plan_review_engine_01_check.js | backend/scripts/copilot_plan_review_engine_01_check.js | backend | root:check:copilotplanreviewengine01 | review | NEEDS_REVIEW |  | COPILOT-PLAN-REVIEW-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_reasoning_answer_composer_01_check.js | backend/scripts/copilot_reasoning_answer_composer_01_check.js | backend | root:check:copilotreasoninganswercomposer01 | review | NEEDS_REVIEW |  | COPILOT-REASONING-ANSWER-COMPOSER-01-CHECK |  | Owner or chain unclear |  |
| copilot_rfq_prep_01_check.js | backend/scripts/copilot_rfq_prep_01_check.js | backend | root:check:copilotrfqprep01 | review | NEEDS_REVIEW |  | COPILOT-RFQ-PREP-01-CHECK |  | Owner or chain unclear |  |
| copilot_risk_scoring_engine_01_check.js | backend/scripts/copilot_risk_scoring_engine_01_check.js | backend | root:check:copilotriskscoringengine01 | review | NEEDS_REVIEW |  | COPILOT-RISK-SCORING-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_role_task_matrix_01_check.js | backend/scripts/copilot_role_task_matrix_01_check.js | backend | root:check:copilotroletaskmatrix01 | review | NEEDS_REVIEW |  | COPILOT-ROLE-TASK-MATRIX-01-CHECK |  | Owner or chain unclear |  |
| copilot_root_cause_engine_01_check.js | backend/scripts/copilot_root_cause_engine_01_check.js | backend | root:check:copilotrootcauseengine01 | review | NEEDS_REVIEW |  | COPILOT-ROOT-CAUSE-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_route_review_human_approval_01_check.js | backend/scripts/copilot_route_review_human_approval_01_check.js | backend | root:check:copilotroutereviewhumanapproval01 | review | NEEDS_REVIEW |  | COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01-CHECK |  | Owner or chain unclear |  |
| copilot_smart_diagnostic_engine_01_check.js | backend/scripts/copilot_smart_diagnostic_engine_01_check.js | backend | root:check:copilotsmartdiagnosticengine01 | review | NEEDS_REVIEW |  | COPILOT-SMART-DIAGNOSTIC-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| copilot_stop_route_draft_01_check.js | backend/scripts/copilot_stop_route_draft_01_check.js | backend | root:check:copilotstoproutedraft01 | review | NEEDS_REVIEW |  | COPILOT-STOP-ROUTE-DRAFT-01-CHECK |  | Owner or chain unclear |  |
| copilot_workflow_reasoning_engine_01_check.js | backend/scripts/copilot_workflow_reasoning_engine_01_check.js | backend | root:check:copilotworkflowreasoningengine01 | review | NEEDS_REVIEW |  | COPILOT-WORKFLOW-REASONING-ENGINE-01-CHECK |  | Owner or chain unclear |  |
| dashboard_bulk_endpoint_01_check.js | backend/scripts/dashboard_bulk_endpoint_01_check.js | backend | root:check:dashboardbulkendpoint01 | review | NEEDS_REVIEW |  | DASHBOARD-BULK-ENDPOINT-01-CHECK |  | Owner or chain unclear |  |
| data_integrity_and_recovery_01_check.js | backend/scripts/data_integrity_and_recovery_01_check.js | backend | root:check:dataintegrityandrecovery01 | review | NEEDS_REVIEW |  | DATA-INTEGRITY-AND-RECOVERY-01 |  | Owner or chain unclear |  |
| db_pool_and_api_scaling_01_check.js | backend/scripts/db_pool_and_api_scaling_01_check.js | backend | root:check:dbpoolandapiscaling01 | review | NEEDS_REVIEW |  | DB-POOL-AND-API-SCALING-01 |  | Owner or chain unclear |  |
| db_pool_and_api_scaling_01_probe.js | backend/scripts/db_pool_and_api_scaling_01_probe.js | backend |  | review | NEEDS_REVIEW |  | DB-POOL-AND-API-SCALING-01 |  | Owner or chain unclear |  |
| docs_ssot_brand_artifact_cleanup_01_check.js | backend/scripts/docs_ssot_brand_artifact_cleanup_01_check.js | backend | root:check:docsbrandcleanup01 | review | NEEDS_REVIEW |  | DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01-CHECK |  | Owner or chain unclear |  |
| docs_ssot_pack_check.js | backend/scripts/docs_ssot_pack_check.js | backend |  | verify:repo | ACTIVE_CORE |  | DOCS-SSOT-PACK-CHECK |  | Owner or chain unclear | canonical runner |
| docs_state_01_recent_product_closure_check.js | backend/scripts/docs_state_01_recent_product_closure_check.js | backend | root:check:docsstate01 | verify:repo | ACTIVE_CORE |  | DOCS-STATE-01-RECENT-PRODUCT-CLOSURE-CHECK |  | Owner or chain unclear | canonical runner |
| driver_flow_final_01_acceptance_check.js | backend/scripts/driver_flow_final_01_acceptance_check.js | backend | root:check:driverflowfinal01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| dynamic_savings_01_check.js | backend/scripts/dynamic_savings_01_check.js | backend | root:check:dynamicsavings01 | product-extensions | ACTIVE |  | DYNAMIC-SAVINGS-01-CHECK |  | Owner or chain unclear | product check/helper |
| e2e_smoke_01_demo_acceptance_check.js | backend/scripts/e2e_smoke_01_demo_acceptance_check.js | backend | root:check:e2esmoke01 | review | NEEDS_REVIEW |  | E-2-E-SMOKE-01-DEMO-ACCEPTANCE-CHECK |  | Owner or chain unclear |  |
| eta_osrm_01_route_eta_service_check.js | backend/scripts/eta_osrm_01_route_eta_service_check.js | backend | root:check:etaosrm01 | review | NEEDS_REVIEW |  | ETA-OSRM-01-ROUTE-ETA-SERVICE-CHECK |  | Owner or chain unclear |  |
| eta_osrm_02_api_eta_bridge_check.js | backend/scripts/eta_osrm_02_api_eta_bridge_check.js | backend | root:check:etaosrm02 | review | NEEDS_REVIEW |  | ETA-OSRM-02-API-ETA-BRIDGE-CHECK |  | Owner or chain unclear |  |
| eta_sanity_01_live_tracking_check.js | backend/scripts/eta_sanity_01_live_tracking_check.js | backend | root:check:etasanity01 | review | NEEDS_REVIEW |  | ETA-SANITY-01-LIVE-TRACKING-CHECK |  | Owner or chain unclear |  |
| excel_to_route_readiness_redteam_01_check.js | backend/scripts/excel_to_route_readiness_redteam_01_check.js | backend | root:check:exceltoroutereadinessredteam01 | review | NEEDS_REVIEW |  | EXCEL-TO-ROUTE-READINESS-REDTEAM-01-CHECK |  | Owner or chain unclear |  |
| field_launch_pack_01_readiness_check.js | backend/scripts/field_launch_pack_01_readiness_check.js | backend | root:check:fieldlaunch01 | review | NEEDS_REVIEW |  | FIELD-LAUNCH-PACK-01-READINESS-CHECK |  | Owner or chain unclear |  |
| final_ux_smoke_01_check.js | backend/scripts/final_ux_smoke_01_check.js | backend | root:check:finaluxsmoke01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| fullcheck.js | backend/scripts/fullcheck.js | backend | backend:fullcheck | review | NEEDS_REVIEW |  | FULLCHECK |  | Owner or chain unclear |  |
| guided_7x21_and_agreement_contract_check.js | backend/scripts/guided_7x21_and_agreement_contract_check.js | backend |  | review | NEEDS_REVIEW |  | GUIDED-7-X-21-AND-AGREEMENT-CONTRACT-CHECK |  | Owner or chain unclear |  |
| guided_offer_agreement_skip_check.js | backend/scripts/guided_offer_agreement_skip_check.js | backend |  | review | NEEDS_REVIEW |  | GUIDED-OFFER-AGREEMENT-SKIP-CHECK |  | Owner or chain unclear |  |
| hot_file_split_ai_chat_composers_01_check.js | backend/scripts/hot_file_split_ai_chat_composers_01_check.js | backend | root:check:hotfilesplitaichatcomposers01 | review | NEEDS_REVIEW |  | HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01-CHECK |  | Owner or chain unclear |  |
| hot_file_split_web_panels_01_check.js | backend/scripts/hot_file_split_web_panels_01_check.js | backend | root:check:hotfilesplitwebpanels01 | review | NEEDS_REVIEW |  | HOT-FILE-SPLIT-WEB-PANELS-01-CHECK |  | Owner or chain unclear |  |
| invite_based_membership_01_check.js | backend/scripts/invite_based_membership_01_check.js | backend | root:check:invitebasedmembership01 | review | NEEDS_REVIEW |  | INVITE-BASED-MEMBERSHIP-01-CHECK |  | Owner or chain unclear |  |
| lead_capture_01_check.js | backend/scripts/lead_capture_01_check.js | backend | root:check:leadcapture01 | review | NEEDS_REVIEW |  | LEAD-CAPTURE-01-CHECK |  | Owner or chain unclear |  |
| live_gate_readiness_hotfix_check.mjs | backend/scripts/live_gate_readiness_hotfix_check.mjs | backend |  | review | NEEDS_REVIEW |  | LIVE-GATE-READINESS-HOTFIX-CHECK |  | Owner or chain unclear |  |
| live_tracking_final_01_acceptance_check.js | backend/scripts/live_tracking_final_01_acceptance_check.js | backend | root:check:livetrackingfinal01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| load_test_2000_users_01_check.js | backend/scripts/load_test_2000_users_01_check.js | backend | root:check:loadtest2000users01 | review | NEEDS_REVIEW |  | LOAD-TEST-2000-USERS-01 |  | Owner or chain unclear |  |
| load_test_2000_users_01_harness.js | backend/scripts/load_test_2000_users_01_harness.js | backend |  | review | NEEDS_REVIEW |  | LOAD-TEST-2000-USERS-01 |  | Owner or chain unclear |  |
| m0check.js | backend/scripts/m0check.js | backend | backend:m0check | product | ACTIVE_RELEASE_ONLY |  | M-0-CHECK |  | Owner or chain unclear | product check/helper |
| m10check.js | backend/scripts/m10check.js | backend | backend:m10check | product | ACTIVE_RELEASE_ONLY |  | M-10-CHECK |  | Owner or chain unclear | product check/helper |
| m11check.js | backend/scripts/m11check.js | backend | backend:m11check | product | ACTIVE_RELEASE_ONLY |  | M-11-CHECK |  | Owner or chain unclear | product check/helper |
| m12check.js | backend/scripts/m12check.js | backend | backend:m12check | product | ACTIVE_RELEASE_ONLY |  | M-12-CHECK |  | Owner or chain unclear | product check/helper |
| m13check.js | backend/scripts/m13check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-13-CHECK |  | Owner or chain unclear | product check/helper |
| m14check.js | backend/scripts/m14check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-14-CHECK |  | Owner or chain unclear | product check/helper |
| m15check.js | backend/scripts/m15check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-15-CHECK |  | Owner or chain unclear | product check/helper |
| m162check.js | backend/scripts/m162check.js | backend |  | review | NEEDS_REVIEW |  | M-162-CHECK |  | Owner or chain unclear |  |
| m163check.js | backend/scripts/m163check.js | backend |  | review | NEEDS_REVIEW |  | M-163-CHECK |  | Owner or chain unclear |  |
| m16check.js | backend/scripts/m16check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-16-CHECK |  | Owner or chain unclear | product check/helper |
| m17check.js | backend/scripts/m17check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-17-CHECK |  | Owner or chain unclear | product check/helper |
| m18check.js | backend/scripts/m18check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-18-CHECK |  | Owner or chain unclear | product check/helper |
| m19check.js | backend/scripts/m19check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-19-CHECK |  | Owner or chain unclear | product check/helper |
| m1check.js | backend/scripts/m1check.js | backend | backend:m1check | review | NEEDS_REVIEW |  | M-1-CHECK |  | Owner or chain unclear |  |
| m20check.js | backend/scripts/m20check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-20-CHECK |  | Owner or chain unclear | product check/helper |
| m21check.js | backend/scripts/m21check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-21-CHECK |  | Owner or chain unclear | product check/helper |
| m22check.js | backend/scripts/m22check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-22-CHECK |  | Owner or chain unclear | product check/helper |
| m23check.js | backend/scripts/m23check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-23-CHECK |  | Owner or chain unclear | product check/helper |
| m24check.js | backend/scripts/m24check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-24-CHECK |  | Owner or chain unclear | product check/helper |
| m25check.js | backend/scripts/m25check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-25-CHECK |  | Owner or chain unclear | product check/helper |
| m26check.js | backend/scripts/m26check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-26-CHECK |  | Owner or chain unclear | product check/helper |
| m27check.js | backend/scripts/m27check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-27-CHECK |  | Owner or chain unclear | product check/helper |
| m28check.js | backend/scripts/m28check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-28-CHECK |  | Owner or chain unclear | product check/helper |
| m29check.js | backend/scripts/m29check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-29-CHECK |  | Owner or chain unclear | product check/helper |
| m2check.js | backend/scripts/m2check.js | backend | backend:m2check | review | NEEDS_REVIEW |  | M-2-CHECK |  | Owner or chain unclear |  |
| m30check.js | backend/scripts/m30check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-30-CHECK |  | Owner or chain unclear | product check/helper |
| m31check.js | backend/scripts/m31check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-31-CHECK |  | Owner or chain unclear | product check/helper |
| m32check.js | backend/scripts/m32check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-32-CHECK |  | Owner or chain unclear | product check/helper |
| m33check.js | backend/scripts/m33check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-33-CHECK |  | Owner or chain unclear | product check/helper |
| m34check.js | backend/scripts/m34check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-34-CHECK |  | Owner or chain unclear | product check/helper |
| m35check.js | backend/scripts/m35check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-35-CHECK |  | Owner or chain unclear | product check/helper |
| m36check.js | backend/scripts/m36check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-36-CHECK |  | Owner or chain unclear | product check/helper |
| m37check.js | backend/scripts/m37check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-37-CHECK |  | Owner or chain unclear | product check/helper |
| m38check.js | backend/scripts/m38check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-38-CHECK |  | Owner or chain unclear | product check/helper |
| m39check.js | backend/scripts/m39check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-39-CHECK |  | Owner or chain unclear | product check/helper |
| m3check.js | backend/scripts/m3check.js | backend | backend:m3check | review | NEEDS_REVIEW |  | M-3-CHECK |  | Owner or chain unclear |  |
| m40check.js | backend/scripts/m40check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-40-CHECK |  | Owner or chain unclear | product check/helper |
| m41check.js | backend/scripts/m41check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-41-CHECK |  | Owner or chain unclear | product check/helper |
| m42_optional_check.js | backend/scripts/m42_optional_check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-42-OPTIONAL-CHECK |  | Owner or chain unclear | product check/helper |
| m43_google_auth_invite_gate_check.js | backend/scripts/m43_google_auth_invite_gate_check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-43-GOOGLE-AUTH-INVITE-GATE-CHECK |  | Owner or chain unclear | product check/helper |
| m44_telematics_check.js | backend/scripts/m44_telematics_check.js | backend |  | product | ACTIVE_RELEASE_ONLY |  | M-44-TELEMATICS-CHECK |  | Owner or chain unclear | product check/helper |
| m44_telematics_t1_t5_check.js | backend/scripts/m44_telematics_t1_t5_check.js | backend | root:check:m44telematicst1t5 | product | ACTIVE_RELEASE_ONLY |  | M-44-TELEMATICS-T-1-T-5-CHECK |  | Owner or chain unclear | product check/helper |
| m45_backup_create.js | backend/scripts/m45_backup_create.js | backend | backend:m45:backup:create | product | ACTIVE_RELEASE_ONLY |  | M-45-BACKUP-CREATE |  | Owner or chain unclear | product check/helper |
| m45_backup_restore.js | backend/scripts/m45_backup_restore.js | backend | backend:m45:backup:restore | product | ACTIVE_RELEASE_ONLY |  | M-45-BACKUP-RESTORE |  | Owner or chain unclear | product check/helper |
| m45_retention_backup_check.js | backend/scripts/m45_retention_backup_check.js | backend |  | product | ACTIVE |  | M-45-RETENTION-BACKUP-CHECK |  | Owner or chain unclear | product check/helper |
| m46_1_ai_copilot_enrichment_check.js | backend/scripts/m46_1_ai_copilot_enrichment_check.js | backend |  | product | ACTIVE |  | M-46-1-AI-COPILOT-ENRICHMENT-CHECK |  | Owner or chain unclear | product check/helper |
| m46_2_ai_copilot_intent_expansion_check.js | backend/scripts/m46_2_ai_copilot_intent_expansion_check.js | backend |  | product | ACTIVE |  | M-46-2-AI-COPILOT-INTENT-EXPANSION-CHECK |  | Owner or chain unclear | product check/helper |
| m46_3_ai_copilot_quality_evidence_check.js | backend/scripts/m46_3_ai_copilot_quality_evidence_check.js | backend |  | product | ACTIVE |  | M-46-3-AI-COPILOT-QUALITY-EVIDENCE-CHECK |  | Owner or chain unclear | product check/helper |
| m46_4_ai_copilot_decision_consistency_check.js | backend/scripts/m46_4_ai_copilot_decision_consistency_check.js | backend |  | product | ACTIVE |  | M-46-4-AI-COPILOT-DECISION-CONSISTENCY-CHECK |  | Owner or chain unclear | product check/helper |
| m46_5_ai_copilot_action_prioritization_check.js | backend/scripts/m46_5_ai_copilot_action_prioritization_check.js | backend |  | product | ACTIVE |  | M-46-5-AI-COPILOT-ACTION-PRIORITIZATION-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_a_ai_job_guide_check.js | backend/scripts/m46_6_a_ai_job_guide_check.js | backend |  | product | ACTIVE |  | M-46-6-A-AI-JOB-GUIDE-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_b_ai_job_guide_precheck_check.js | backend/scripts/m46_6_b_ai_job_guide_precheck_check.js | backend |  | product | ACTIVE |  | M-46-6-B-AI-JOB-GUIDE-PRECHECK-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_c2_screen_coverage_terminology_check.js | backend/scripts/m46_6_c2_screen_coverage_terminology_check.js | backend |  | product | ACTIVE |  | M-46-6-C-2-SCREEN-COVERAGE-TERMINOLOGY-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_c_ai_screen_help_check.js | backend/scripts/m46_6_c_ai_screen_help_check.js | backend |  | product | ACTIVE |  | M-46-6-C-AI-SCREEN-HELP-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_d2_ai_context_chat_check.js | backend/scripts/m46_6_d2_ai_context_chat_check.js | backend |  | product | ACTIVE |  | M-46-6-D-2-AI-CONTEXT-CHAT-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_d3_ai_actionable_chat_check.js | backend/scripts/m46_6_d3_ai_actionable_chat_check.js | backend |  | product | ACTIVE |  | M-46-6-D-3-AI-ACTIONABLE-CHAT-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_d4_simple_role_mode_check.js | backend/scripts/m46_6_d4_simple_role_mode_check.js | backend |  | product | ACTIVE |  | M-46-6-D-4-SIMPLE-ROLE-MODE-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_d_ai_chat_shell_check.js | backend/scripts/m46_6_d_ai_chat_shell_check.js | backend |  | product | ACTIVE |  | M-46-6-D-AI-CHAT-SHELL-CHECK |  | Owner or chain unclear | product check/helper |
| m46_6_t_ai_location_source_guide_check.js | backend/scripts/m46_6_t_ai_location_source_guide_check.js | backend |  | product | ACTIVE |  | M-46-6-T-AI-LOCATION-SOURCE-GUIDE-CHECK |  | Owner or chain unclear | product check/helper |
| m46_7_driver_code_login_rehber_first_check.js | backend/scripts/m46_7_driver_code_login_rehber_first_check.js | backend |  | product | ACTIVE |  | M-46-7-DRIVER-CODE-LOGIN-REHBER-FIRST-CHECK |  | Owner or chain unclear | product check/helper |
| m46_8_driver_access_hardening_check.js | backend/scripts/m46_8_driver_access_hardening_check.js | backend |  | product | ACTIVE |  | M-46-8-DRIVER-ACCESS-HARDENING-CHECK |  | Owner or chain unclear | product check/helper |
| m46_9_session_refresh_security_check.js | backend/scripts/m46_9_session_refresh_security_check.js | backend |  | product | ACTIVE |  | M-46-9-SESSION-REFRESH-SECURITY-CHECK |  | Owner or chain unclear | product check/helper |
| m46_ai_copilot_check.js | backend/scripts/m46_ai_copilot_check.js | backend |  | product | ACTIVE |  | M-46-AI-COPILOT-CHECK |  | Owner or chain unclear | product check/helper |
| m46_modernized_compatibility_static_check.js | backend/scripts/m46_modernized_compatibility_static_check.js | backend |  | product | ACTIVE |  | M-46-MODERNIZED-COMPATIBILITY-STATIC-CHECK |  | Owner or chain unclear | product check/helper |
| m47_2_capacity_load_baseline_check.js | backend/scripts/m47_2_capacity_load_baseline_check.js | backend |  | product | ACTIVE |  | M-47-2-CAPACITY-LOAD-BASELINE-CHECK |  | Owner or chain unclear | product check/helper |
| m47_3_production_resilience_edge_security_check.js | backend/scripts/m47_3_production_resilience_edge_security_check.js | backend |  | product | ACTIVE |  | M-47-3-PRODUCTION-RESILIENCE-EDGE-SECURITY-CHECK |  | Owner or chain unclear | product check/helper |
| m47_kvkk_notice_consent_framework_check.js | backend/scripts/m47_kvkk_notice_consent_framework_check.js | backend |  | product | ACTIVE |  | M-47-KVKK-NOTICE-CONSENT-FRAMEWORK-CHECK |  | Owner or chain unclear | product check/helper |
| m4check.js | backend/scripts/m4check.js | backend | backend:m4check | review | NEEDS_REVIEW |  | M-4-CHECK |  | Owner or chain unclear |  |
| m51_53_backfill_verification_check.js | backend/scripts/m51_53_backfill_verification_check.js | backend |  | product | ACTIVE |  | M-51-53-BACKFILL-VERIFICATION-CHECK |  | Owner or chain unclear | product check/helper |
| m54_3_dispatch_approve_repack_check.js | backend/scripts/m54_3_dispatch_approve_repack_check.js | backend |  | product | ACTIVE |  | M-54-3-DISPATCH-APPROVE-REPACK-CHECK |  | Owner or chain unclear | product check/helper |
| m54_4_driver_route_delivery_check.js | backend/scripts/m54_4_driver_route_delivery_check.js | backend |  | product | ACTIVE |  | M-54-4-DRIVER-ROUTE-DELIVERY-CHECK |  | Owner or chain unclear | product check/helper |
| m55_reports_no_show_check.js | backend/scripts/m55_reports_no_show_check.js | backend |  | product | ACTIVE |  | M-55-REPORTS-NO-SHOW-CHECK |  | Owner or chain unclear | product check/helper |
| m56_kvkk_eta_quality_check.js | backend/scripts/m56_kvkk_eta_quality_check.js | backend |  | product | ACTIVE |  | M-56-KVKK-ETA-QUALITY-CHECK |  | Owner or chain unclear | product check/helper |
| m58_final_pilot_readiness_check.js | backend/scripts/m58_final_pilot_readiness_check.js | backend |  | product | ACTIVE |  | FINAL |  | Owner or chain unclear | product check/helper |
| m59_observability_field_diagnostics_check.js | backend/scripts/m59_observability_field_diagnostics_check.js | backend |  | product | ACTIVE |  | M-59-OBSERVABILITY-FIELD-DIAGNOSTICS-CHECK |  | Owner or chain unclear | product check/helper |
| m5check.js | backend/scripts/m5check.js | backend | backend:m5check | review | NEEDS_REVIEW |  | M-5-CHECK |  | Owner or chain unclear |  |
| m60_field_acceptance_center_check.js | backend/scripts/m60_field_acceptance_center_check.js | backend | backend:m60check | product | ACTIVE |  | M-60-FIELD-ACCEPTANCE-CENTER-CHECK |  | Owner or chain unclear | product check/helper |
| m61_ssot_milestone_alignment_check.js | backend/scripts/m61_ssot_milestone_alignment_check.js | backend |  | product | ACTIVE |  | M-61-SSOT-MILESTONE-ALIGNMENT-CHECK |  | Owner or chain unclear | product check/helper |
| m62_commercial_core_strengthening_check.js | backend/scripts/m62_commercial_core_strengthening_check.js | backend |  | product | ACTIVE |  | M-62-COMMERCIAL-CORE-STRENGTHENING-CHECK |  | Owner or chain unclear | product check/helper |
| m63_trust_quality_service_evaluation_check.js | backend/scripts/m63_trust_quality_service_evaluation_check.js | backend | backend:m63check | product | ACTIVE |  | M-63-TRUST-QUALITY-SERVICE-EVALUATION-CHECK |  | Owner or chain unclear | product check/helper |
| m64_natural_copilot_layer_check.js | backend/scripts/m64_natural_copilot_layer_check.js | backend | backend:m64check | product | ACTIVE |  | M-64-NATURAL-COPILOT-LAYER-CHECK |  | Owner or chain unclear | product check/helper |
| m65_pilot_launch_gate_check.js | backend/scripts/m65_pilot_launch_gate_check.js | backend |  | product | ACTIVE |  | M-65-PILOT-LAUNCH-GATE-CHECK |  | Owner or chain unclear | product check/helper |
| m66check.js | backend/scripts/m66check.js | backend | backend:m66check | review | NEEDS_REVIEW |  | M-66-CHECK |  | Owner or chain unclear |  |
| m68_fetch_hardening_check.js | backend/scripts/m68_fetch_hardening_check.js | backend |  | product | ACTIVE |  | M-68-FETCH-HARDENING-CHECK |  | Owner or chain unclear | product check/helper |
| m69_fetch_hardening_phase2_check.js | backend/scripts/m69_fetch_hardening_phase2_check.js | backend |  | product | ACTIVE |  | M-69-FETCH-HARDENING-PHASE-2-CHECK |  | Owner or chain unclear | product check/helper |
| m6check.js | backend/scripts/m6check.js | backend | backend:m6check | review | NEEDS_REVIEW |  | M-6-CHECK |  | Owner or chain unclear |  |
| m70_checker_sync_hot_path_check.js | backend/scripts/m70_checker_sync_hot_path_check.js | backend |  | product | ACTIVE |  | M-70-CHECKER-SYNC-HOT-PATH-CHECK |  | Owner or chain unclear | product check/helper |
| m71_10_shift_selection_guard_check.cjs | backend/scripts/m71_10_shift_selection_guard_check.cjs | backend |  | product | ACTIVE |  | M-71-10-SHIFT-SELECTION-GUARD-CHECK |  | Owner or chain unclear | product check/helper |
| m71_2_copilot_route_bridge_smoke_check.js | backend/scripts/m71_2_copilot_route_bridge_smoke_check.js | backend |  | product | ACTIVE |  | M-71-2-COPILOT-ROUTE-BRIDGE-SMOKE-CHECK |  | Owner or chain unclear | product check/helper |
| m71_3_copilot_chat_binding_readiness_check.cjs | backend/scripts/m71_3_copilot_chat_binding_readiness_check.cjs | backend |  | product | ACTIVE |  | M-71-3-COPILOT-CHAT-BINDING-READINESS-CHECK |  | Owner or chain unclear | product check/helper |
| m71_4_copilot_route_context_check.js | backend/scripts/m71_4_copilot_route_context_check.js | backend |  | product | ACTIVE |  | M-71-4-COPILOT-ROUTE-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| m71_5_copilot_route_context_check.js | backend/scripts/m71_5_copilot_route_context_check.js | backend |  | product | ACTIVE |  | M-71-5-COPILOT-ROUTE-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| m71_6_copilot_selected_entity_first_check.js | backend/scripts/m71_6_copilot_selected_entity_first_check.js | backend |  | product | ACTIVE |  | M-71-6-COPILOT-SELECTED-ENTITY-FIRST-CHECK |  | Owner or chain unclear | product check/helper |
| m71_7_copilot_selected_sync_check.js | backend/scripts/m71_7_copilot_selected_sync_check.js | backend |  | product | ACTIVE |  | M-71-7-COPILOT-SELECTED-SYNC-CHECK |  | Owner or chain unclear | product check/helper |
| m71_8_copilot_selected_entity_resolve_check.js | backend/scripts/m71_8_copilot_selected_entity_resolve_check.js | backend |  | product | ACTIVE |  | M-71-8-COPILOT-SELECTED-ENTITY-RESOLVE-CHECK |  | Owner or chain unclear | product check/helper |
| m71_8_hotfix_check.js | backend/scripts/m71_8_hotfix_check.js | backend |  | product | ACTIVE |  | M-71-8-HOTFIX-CHECK |  | Owner or chain unclear | product check/helper |
| m71_9_floating_drawer_selection_carry_check.cjs | backend/scripts/m71_9_floating_drawer_selection_carry_check.cjs | backend |  | product | ACTIVE |  | M-71-9-FLOATING-DRAWER-SELECTION-CARRY-CHECK |  | Owner or chain unclear | product check/helper |
| m71_summary_hotpath_check.js | backend/scripts/m71_summary_hotpath_check.js | backend |  | product | ACTIVE |  | M-71-SUMMARY-HOTPATH-CHECK |  | Owner or chain unclear | product check/helper |
| m71_ui_contract_hotfix_check.js | backend/scripts/m71_ui_contract_hotfix_check.js | backend |  | product | ACTIVE |  | M-71-UI-CONTRACT-HOTFIX-CHECK |  | Owner or chain unclear | product check/helper |
| m72_hot_endpoint_reduction_check.js | backend/scripts/m72_hot_endpoint_reduction_check.js | backend |  | product | ACTIVE |  | M-72-HOT-ENDPOINT-REDUCTION-CHECK |  | Owner or chain unclear | product check/helper |
| m73_hot_path_phase2_check.js | backend/scripts/m73_hot_path_phase2_check.js | backend |  | product | ACTIVE |  | M-73-HOT-PATH-PHASE-2-CHECK |  | Owner or chain unclear | product check/helper |
| m74_hot_path_phase3_check.js | backend/scripts/m74_hot_path_phase3_check.js | backend |  | product | ACTIVE |  | M-74-HOT-PATH-PHASE-3-CHECK |  | Owner or chain unclear | product check/helper |
| m75_hot_path_phase4_check.js | backend/scripts/m75_hot_path_phase4_check.js | backend |  | product | ACTIVE |  | M-75-HOT-PATH-PHASE-4-CHECK |  | Owner or chain unclear | product check/helper |
| m76a_1_minimum_normalization_check.js | backend/scripts/m76a_1_minimum_normalization_check.js | backend |  | review | NEEDS_REVIEW |  | M-76-A-1-MINIMUM-NORMALIZATION-CHECK |  | Owner or chain unclear |  |
| m76a_2_final_normalization_archiving_check.js | backend/scripts/m76a_2_final_normalization_archiving_check.js | backend |  | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| m76b_living_matrix_tools_consolidation_check.js | backend/scripts/m76b_living_matrix_tools_consolidation_check.js | backend |  | review | NEEDS_REVIEW |  | M-76-B-LIVING-MATRIX-TOOLS-CONSOLIDATION-CHECK |  | Owner or chain unclear |  |
| m77_kvkk_uyum_katmani_check.js | backend/scripts/m77_kvkk_uyum_katmani_check.js | backend |  | product | ACTIVE |  | M-77-KVKK-UYUM-KATMANI-CHECK |  | Owner or chain unclear | product check/helper |
| m78_1_operasyon_dogrulama_yuzeyi_check.js | backend/scripts/m78_1_operasyon_dogrulama_yuzeyi_check.js | backend |  | product | ACTIVE |  | M-78-1-OPERASYON-DOGRULAMA-YUZEYI-CHECK |  | Owner or chain unclear | product check/helper |
| m78_2_operasyon_dogrulama_kayit_katmani_check.js | backend/scripts/m78_2_operasyon_dogrulama_kayit_katmani_check.js | backend |  | product | ACTIVE |  | M-78-2-OPERASYON-DOGRULAMA-KAYIT-KATMANI-CHECK |  | Owner or chain unclear | product check/helper |
| m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js | backend/scripts/m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js | backend |  | product | ACTIVE |  | M-78-3-OPERASYON-DOGRULAMA-OZET-FILTRE-KATMANI-CHECK |  | Owner or chain unclear | product check/helper |
| m78_checklist_operasyon_dogrulama_check.js | backend/scripts/m78_checklist_operasyon_dogrulama_check.js | backend |  | product | ACTIVE |  | M-78-CHECKLIST-OPERASYON-DOGRULAMA-CHECK |  | Owner or chain unclear | product check/helper |
| m79_a1_copilot_ssot_scope_check.js | backend/scripts/m79_a1_copilot_ssot_scope_check.js | backend |  | product | ACTIVE |  | M-79-A-1-COPILOT-SSOT-SCOPE-CHECK |  | Owner or chain unclear | product check/helper |
| m79_a2_copilot_intent_quality_check.js | backend/scripts/m79_a2_copilot_intent_quality_check.js | backend |  | product | ACTIVE |  | M-79-A-2-COPILOT-INTENT-QUALITY-CHECK |  | Owner or chain unclear | product check/helper |
| m79_a3_copilot_screen_context_check.js | backend/scripts/m79_a3_copilot_screen_context_check.js | backend |  | product | ACTIVE |  | M-79-A-3-COPILOT-SCREEN-CONTEXT-CHECK |  | Owner or chain unclear | product check/helper |
| m79_a4_copilot_quality_pack_check.js | backend/scripts/m79_a4_copilot_quality_pack_check.js | backend |  | product | ACTIVE |  | M-79-A-4-COPILOT-QUALITY-PACK-CHECK |  | Owner or chain unclear | product check/helper |
| m79_a5_copilot_chat_ux_check.js | backend/scripts/m79_a5_copilot_chat_ux_check.js | backend |  | product | ACTIVE |  | M-79-A-5-COPILOT-CHAT-UX-CHECK |  | Owner or chain unclear | product check/helper |
| m79_a6_copilot_acceptance_score_check.js | backend/scripts/m79_a6_copilot_acceptance_score_check.js | backend |  | product | ACTIVE |  | M-79-A-6-COPILOT-ACCEPTANCE-SCORE-CHECK |  | Owner or chain unclear | product check/helper |
| m79_b1_copilot_edge_cases_check.js | backend/scripts/m79_b1_copilot_edge_cases_check.js | backend |  | product | ACTIVE |  | M-79-B-1-COPILOT-EDGE-CASES-CHECK |  | Owner or chain unclear | product check/helper |
| m79_b2_copilot_followup_memory_check.js | backend/scripts/m79_b2_copilot_followup_memory_check.js | backend |  | product | ACTIVE |  | M-79-B-2-COPILOT-FOLLOWUP-MEMORY-CHECK |  | Owner or chain unclear | product check/helper |
| m79_b3_copilot_uncertainty_check.js | backend/scripts/m79_b3_copilot_uncertainty_check.js | backend |  | product | ACTIVE |  | M-79-B-3-COPILOT-UNCERTAINTY-CHECK |  | Owner or chain unclear | product check/helper |
| m79_b4_copilot_route_chain_check.js | backend/scripts/m79_b4_copilot_route_chain_check.js | backend |  | product | ACTIVE |  | M-79-B-4-COPILOT-ROUTE-CHAIN-CHECK |  | Owner or chain unclear | product check/helper |
| m79_c1_copilot_plain_language_check.js | backend/scripts/m79_c1_copilot_plain_language_check.js | backend |  | product | ACTIVE |  | M-79-C-1-COPILOT-PLAIN-LANGUAGE-CHECK |  | Owner or chain unclear | product check/helper |
| m79_c2_copilot_shorter_first_answer_check.js | backend/scripts/m79_c2_copilot_shorter_first_answer_check.js | backend |  | product | ACTIVE |  | M-79-C-2-COPILOT-SHORTER-FIRST-ANSWER-CHECK |  | Owner or chain unclear | product check/helper |
| m79_c3_copilot_real_user_phrasing_check.js | backend/scripts/m79_c3_copilot_real_user_phrasing_check.js | backend |  | product | ACTIVE |  | M-79-C-3-COPILOT-REAL-USER-PHRASING-CHECK |  | Owner or chain unclear | product check/helper |
| m79_c4_copilot_primary_concern_check.js | backend/scripts/m79_c4_copilot_primary_concern_check.js | backend |  | product | ACTIVE |  | M-79-C-4-COPILOT-PRIMARY-CONCERN-CHECK |  | Owner or chain unclear | product check/helper |
| m79_d1_copilot_acceptance_pack.js | backend/scripts/m79_d1_copilot_acceptance_pack.js | backend |  | product | ACTIVE |  | M-79-D-1-COPILOT-ACCEPTANCE-PACK |  | Owner or chain unclear | product check/helper |
| m7check.js | backend/scripts/m7check.js | backend | backend:m7check | review | NEEDS_REVIEW |  | M-7-CHECK |  | Owner or chain unclear |  |
| m80_1_hot_panel_daraltma_check.js | backend/scripts/m80_1_hot_panel_daraltma_check.js | backend |  | release | ACTIVE |  | M-80-1-HOT-PANEL-DARALTMA-CHECK |  | Owner or chain unclear | product check/helper |
| m80_2_agreements_shifts_giris_yuku_check.js | backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js | backend |  | release | ACTIVE |  | M-80-2-AGREEMENTS-SHIFTS-GIRIS-YUKU-CHECK |  | Owner or chain unclear | product check/helper |
| m80_3_georeview_shifts_son_giris_yuku_check.js | backend/scripts/m80_3_georeview_shifts_son_giris_yuku_check.js | backend |  | release | ACTIVE |  | M-80-3-GEOREVIEW-SHIFTS-SON-GIRIS-YUKU-CHECK |  | Owner or chain unclear | product check/helper |
| m80_final_sert_kabul_yuk_guveni_check.js | backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js | backend |  | release | ACTIVE |  | FINAL |  | Owner or chain unclear | product check/helper |
| m81_3_mobile_gps_flow_smoke.cjs | backend/scripts/m81_3_mobile_gps_flow_smoke.cjs | backend |  | release | ACTIVE |  | M-81-3-MOBILE-GPS-FLOW-SMOKE |  | Owner or chain unclear | product check/helper |
| m82_10_super_admin_commercial_settings_check.js | backend/scripts/m82_10_super_admin_commercial_settings_check.js | backend | backend:m82_10check | release | ACTIVE |  | M-82-10-SUPER-ADMIN-COMMERCIAL-SETTINGS-CHECK |  | Owner or chain unclear | product check/helper |
| m82_11_payment_readonly_surface_check.js | backend/scripts/m82_11_payment_readonly_surface_check.js | backend | backend:m82_11check | release | ACTIVE |  | M-82-11-PAYMENT-READONLY-SURFACE-CHECK |  | Owner or chain unclear | product check/helper |
| m82_1_acceptance_contract_check.js | backend/scripts/m82_1_acceptance_contract_check.js | backend | backend:m82_1accept | release | ACTIVE |  | M-82-1-ACCEPTANCE-CONTRACT-CHECK |  | Owner or chain unclear | product check/helper |
| m82_1_correctness_guard_check.js | backend/scripts/m82_1_correctness_guard_check.js | backend | backend:m82_1check | release | ACTIVE |  | M-82-1-CORRECTNESS-GUARD-CHECK |  | Owner or chain unclear | product check/helper |
| m82_2_web_contract_cache_check.js | backend/scripts/m82_2_web_contract_cache_check.js | backend | backend:m82_2check | release | ACTIVE |  | M-82-2-WEB-CONTRACT-CACHE-CHECK |  | Owner or chain unclear | product check/helper |
| m82_9_dormant_payment_backbone_check.js | backend/scripts/m82_9_dormant_payment_backbone_check.js | backend | backend:m82_9check | release | ACTIVE |  | M-82-9-DORMANT-PAYMENT-BACKBONE-CHECK |  | Owner or chain unclear | product check/helper |
| m83_field_prep_packet_check.js | backend/scripts/m83_field_prep_packet_check.js | backend | backend:m83check | release | ACTIVE |  | M-83-FIELD-PREP-PACKET-CHECK |  | Owner or chain unclear | product check/helper |
| m84_field_feedback_loop_check.js | backend/scripts/m84_field_feedback_loop_check.js | backend | backend:m84check | release | ACTIVE |  | M-84-FIELD-FEEDBACK-LOOP-CHECK |  | Owner or chain unclear | product check/helper |
| m85_optional_payment_pilot_check.js | backend/scripts/m85_optional_payment_pilot_check.js | backend | backend:m85check | release | ACTIVE |  | M-85-OPTIONAL-PAYMENT-PILOT-CHECK |  | Owner or chain unclear | product check/helper |
| m86_required_payment_rollout_check.js | backend/scripts/m86_required_payment_rollout_check.js | backend | backend:m86check | release | ACTIVE |  | M-86-REQUIRED-PAYMENT-ROLLOUT-CHECK |  | Owner or chain unclear | product check/helper |
| m87_payment_account_readiness_check.js | backend/scripts/m87_payment_account_readiness_check.js | backend | backend:m87check | release | ACTIVE |  | M-87-PAYMENT-ACCOUNT-READINESS-CHECK |  | Owner or chain unclear | product check/helper |
| m88_settlement_operations_console_check.js | backend/scripts/m88_settlement_operations_console_check.js | backend | backend:m88check | release | ACTIVE |  | M-88-SETTLEMENT-OPERATIONS-CONSOLE-CHECK |  | Owner or chain unclear | product check/helper |
| m89_settlement_reconciliation_desk_check.js | backend/scripts/m89_settlement_reconciliation_desk_check.js | backend | backend:m89check | release | ACTIVE |  | M-89-SETTLEMENT-RECONCILIATION-DESK-CHECK |  | Owner or chain unclear | product check/helper |
| m8check.js | backend/scripts/m8check.js | backend | backend:m8check | review | NEEDS_REVIEW |  | M-8-CHECK |  | Owner or chain unclear |  |
| m90_b1_canonical_closure_gate_check.js | backend/scripts/m90_b1_canonical_closure_gate_check.js | backend | backend:m90b1check | release | ACTIVE |  | M-90-B-1-CANONICAL-CLOSURE-GATE-CHECK |  | Owner or chain unclear | product check/helper |
| m90_c10_physical_snapshot_hygiene_check.js | backend/scripts/m90_c10_physical_snapshot_hygiene_check.js | backend | backend:m90c10check, root:verify:snapshot | release | ACTIVE |  | M-90-C-10-PHYSICAL-SNAPSHOT-HYGIENE-CHECK |  | Owner or chain unclear | product check/helper |
| m90_c6_hot_file_queue_policy_check.js | backend/scripts/m90_c6_hot_file_queue_policy_check.js | backend | backend:m90c6check | release | ACTIVE |  | M-90-C-6-HOT-FILE-QUEUE-POLICY-CHECK |  | Owner or chain unclear | product check/helper |
| m90_c7_export_package_hygiene_check.js | backend/scripts/m90_c7_export_package_hygiene_check.js | backend | backend:m90c7check | release | ACTIVE |  | M-90-C-7-EXPORT-PACKAGE-HYGIENE-CHECK |  | Owner or chain unclear | product check/helper |
| m90_c8_ci_verification_visibility_check.js | backend/scripts/m90_c8_ci_verification_visibility_check.js | backend | backend:m90c8check | release | ACTIVE |  | M-90-C-8-CI-VERIFICATION-VISIBILITY-CHECK |  | Owner or chain unclear | product check/helper |
| m90_c9_safe_closure_final_hygiene_check.js | backend/scripts/m90_c9_safe_closure_final_hygiene_check.js | backend | backend:m90c9check | release | ACTIVE |  | FINAL |  | Owner or chain unclear | product check/helper |
| m91_company_agreement_from_shift_only_check.js | backend/scripts/m91_company_agreement_from_shift_only_check.js | backend |  | release | ACTIVE |  | M-91-COMPANY-AGREEMENT-FROM-SHIFT-ONLY-CHECK |  | Owner or chain unclear | product check/helper |
| m91_generated_shift_preview_fix_check.js | backend/scripts/m91_generated_shift_preview_fix_check.js | backend |  | release | ACTIVE |  | M-91-GENERATED-SHIFT-PREVIEW-FIX-CHECK |  | Owner or chain unclear | product check/helper |
| m91_generated_shift_preview_orgplan_fix_check.js | backend/scripts/m91_generated_shift_preview_orgplan_fix_check.js | backend |  | release | ACTIVE |  | M-91-GENERATED-SHIFT-PREVIEW-ORGPLAN-FIX-CHECK |  | Owner or chain unclear | product check/helper |
| m91_generated_shift_preview_source_root_fix_check.js | backend/scripts/m91_generated_shift_preview_source_root_fix_check.js | backend |  | release | ACTIVE |  | M-91-GENERATED-SHIFT-PREVIEW-SOURCE-ROOT-FIX-CHECK |  | Owner or chain unclear | product check/helper |
| m91_prefill_route_preview_propagation_check.js | backend/scripts/m91_prefill_route_preview_propagation_check.js | backend |  | release | ACTIVE |  | M-91-PREFILL-ROUTE-PREVIEW-PROPAGATION-CHECK |  | Owner or chain unclear | product check/helper |
| m91_route_preview_fallback_smoke.js | backend/scripts/m91_route_preview_fallback_smoke.js | backend | backend:m91:smoke:route-preview | release | ACTIVE |  | M-91-ROUTE-PREVIEW-FALLBACK-SMOKE |  | Owner or chain unclear | product check/helper |
| m91_route_preview_room_guard_fix_check.js | backend/scripts/m91_route_preview_room_guard_fix_check.js | backend |  | release | ACTIVE |  | M-91-ROUTE-PREVIEW-ROOM-GUARD-FIX-CHECK |  | Owner or chain unclear | product check/helper |
| m91_shift_to_agreement_smoke.js | backend/scripts/m91_shift_to_agreement_smoke.js | backend | backend:m91:smoke:agreement | release | ACTIVE |  | M-91-SHIFT-TO-AGREEMENT-SMOKE |  | Owner or chain unclear | product check/helper |
| m91a_reservation_conflict_check.js | backend/scripts/m91a_reservation_conflict_check.js | backend | backend:m91a:smoke | review | NEEDS_REVIEW |  | M-91-A-RESERVATION-CONFLICT-CHECK |  | Owner or chain unclear |  |
| m91b_agreement_negotiation_parity_check.js | backend/scripts/m91b_agreement_negotiation_parity_check.js | backend |  | review | NEEDS_REVIEW |  | M-91-B-AGREEMENT-NEGOTIATION-PARITY-CHECK |  | Owner or chain unclear |  |
| m91c_linked_shift_disable_convert_check.js | backend/scripts/m91c_linked_shift_disable_convert_check.js | backend |  | review | NEEDS_REVIEW |  | M-91-C-LINKED-SHIFT-DISABLE-CONVERT-CHECK |  | Owner or chain unclear |  |
| m91c_shift_origin_link_check.js | backend/scripts/m91c_shift_origin_link_check.js | backend |  | review | NEEDS_REVIEW |  | M-91-C-SHIFT-ORIGIN-LINK-CHECK |  | Owner or chain unclear |  |
| m91c_shift_to_agreement_prefill_check.js | backend/scripts/m91c_shift_to_agreement_prefill_check.js | backend |  | review | NEEDS_REVIEW |  | M-91-C-SHIFT-TO-AGREEMENT-PREFILL-CHECK |  | Owner or chain unclear |  |
| m91d_agreement_operations_bridge_check.js | backend/scripts/m91d_agreement_operations_bridge_check.js | backend |  | review | NEEDS_REVIEW |  | M-91-D-AGREEMENT-OPERATIONS-BRIDGE-CHECK |  | Owner or chain unclear |  |
| m91ef_draft_slot_hardening_check.js | backend/scripts/m91ef_draft_slot_hardening_check.js | backend |  | review | NEEDS_REVIEW |  | M-91-EF-DRAFT-SLOT-HARDENING-CHECK |  | Owner or chain unclear |  |
| m92_repo_verification_spine_check.js | backend/scripts/m92_repo_verification_spine_check.js | backend | backend:m92check | release | ACTIVE |  | M-92-REPO-VERIFICATION-SPINE-CHECK |  | Owner or chain unclear | product check/helper |
| m93_queue_durability_proof_check.js | backend/scripts/m93_queue_durability_proof_check.js | backend |  | review | NEEDS_REVIEW |  | M-93-QUEUE-DURABILITY-PROOF-CHECK |  | Owner or chain unclear |  |
| m93_queue_durability_runtime_probe.js | backend/scripts/m93_queue_durability_runtime_probe.js | backend |  | review | NEEDS_REVIEW |  | M-93-QUEUE-DURABILITY-RUNTIME-PROBE |  | Owner or chain unclear |  |
| m94d_admin_payment_security_export_check.js | backend/scripts/m94d_admin_payment_security_export_check.js | backend | backend:m94dcheck | review | NEEDS_REVIEW |  | M-94-D-ADMIN-PAYMENT-SECURITY-EXPORT-CHECK |  | Owner or chain unclear |  |
| m94e_queue_chaos_alarm_check.js | backend/scripts/m94e_queue_chaos_alarm_check.js | backend | backend:m94echeck | review | NEEDS_REVIEW |  | M-94-E-QUEUE-CHAOS-ALARM-CHECK |  | Owner or chain unclear |  |
| m94e_queue_chaos_alarm_probe.js | backend/scripts/m94e_queue_chaos_alarm_probe.js | backend | backend:m94eprobe | review | NEEDS_REVIEW |  | M-94-E-QUEUE-CHAOS-ALARM-PROBE |  | Owner or chain unclear |  |
| m95_e20_driver_phone_gps_fallback_check.js | backend/scripts/m95_e20_driver_phone_gps_fallback_check.js | backend | backend:m95e20check | release | ACTIVE |  | M-95-E-20-DRIVER-PHONE-GPS-FALLBACK-CHECK |  | Owner or chain unclear | product check/helper |
| m95_e23b_gps_source_visibility_check.js | backend/scripts/m95_e23b_gps_source_visibility_check.js | backend | root:check:m95e23b | release | ACTIVE |  | M-95-E-23-B-GPS-SOURCE-VISIBILITY-CHECK |  | Owner or chain unclear | product check/helper |
| m95_e25_mobile_field_acceptance_check.js | backend/scripts/m95_e25_mobile_field_acceptance_check.js | backend | root:check:m95e25 | release | ACTIVE |  | M-95-E-25-MOBILE-FIELD-ACCEPTANCE-CHECK |  | Owner or chain unclear | product check/helper |
| m95_e26_android_emulator_smoke_plan_check.js | backend/scripts/m95_e26_android_emulator_smoke_plan_check.js | backend | root:check:m95e26 | release | ACTIVE |  | M-95-E-26-ANDROID-EMULATOR-SMOKE-PLAN-CHECK |  | Owner or chain unclear | product check/helper |
| m95_e27_real_android_device_field_proof_prep_check.js | backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js | backend | root:check:m95e27 | release | ACTIVE |  | M-95-E-27-REAL-ANDROID-DEVICE-FIELD-PROOF-PREP-CHECK |  | Owner or chain unclear | product check/helper |
| m95_export_01_runtime_check_compat_check.js | backend/scripts/m95_export_01_runtime_check_compat_check.js | backend | root:check:m95export01 | release | ACTIVE |  | M-95-EXPORT-01-RUNTIME-CHECK-COMPAT-CHECK |  | Owner or chain unclear | product check/helper |
| m96_c2_boarding_change_ops_check.js | backend/scripts/m96_c2_boarding_change_ops_check.js | backend | backend:m96c2check | release | ACTIVE |  | M-96-C-2-BOARDING-CHANGE-OPS-CHECK |  | Owner or chain unclear | product check/helper |
| m97_a_room_operation_panel_check.js | backend/scripts/m97_a_room_operation_panel_check.js | backend | backend:m97acheck | release | ACTIVE |  | M-97-A-ROOM-OPERATION-PANEL-CHECK |  | Owner or chain unclear | product check/helper |
| m97_panel_integration_check.js | backend/scripts/m97_panel_integration_check.js | backend | backend:m97check | release | ACTIVE |  | M-97-PANEL-INTEGRATION-CHECK |  | Owner or chain unclear | product check/helper |
| m97_panel_operations_check.js | backend/scripts/m97_panel_operations_check.js | backend | backend:m97opscheck | release | ACTIVE |  | M-97-PANEL-OPERATIONS-CHECK |  | Owner or chain unclear | product check/helper |
| m98_e2b_personel_access_backend_check.js | backend/scripts/m98_e2b_personel_access_backend_check.js | backend | root:check:m98e2b | release | ACTIVE |  | M-98-E-2-B-PERSONEL-ACCESS-BACKEND-CHECK |  | Owner or chain unclear | product check/helper |
| m98_e2e_code_pin_access_acceptance_check.js | backend/scripts/m98_e2e_code_pin_access_acceptance_check.js | backend | root:check:m98e2e | release | ACTIVE |  | M-98-E-2-E-CODE-PIN-ACCESS-ACCEPTANCE-CHECK |  | Owner or chain unclear | product check/helper |
| m98_e3_code_pin_field_ux_check.js | backend/scripts/m98_e3_code_pin_field_ux_check.js | backend | root:check:m98e3 | release | ACTIVE |  | M-98-E-3-CODE-PIN-FIELD-UX-CHECK |  | Owner or chain unclear | product check/helper |
| m98_e4_code_pin_runtime_smoke.js | backend/scripts/m98_e4_code_pin_runtime_smoke.js | backend | root:smoke:m98e4 | release | ACTIVE |  | M-98-E-4-CODE-PIN-RUNTIME-SMOKE |  | Owner or chain unclear | product check/helper |
| m98_e4b_personel_invite_router_mount_check.js | backend/scripts/m98_e4b_personel_invite_router_mount_check.js | backend | root:check:m98e4b | release | ACTIVE |  | M-98-E-4-B-PERSONEL-INVITE-ROUTER-MOUNT-CHECK |  | Owner or chain unclear | product check/helper |
| m98_e4c_route_mount_compat_check.js | backend/scripts/m98_e4c_route_mount_compat_check.js | backend | root:check:m98e4c | release | ACTIVE |  | M-98-E-4-C-ROUTE-MOUNT-COMPAT-CHECK |  | Owner or chain unclear | product check/helper |
| m98_e5_code_pin_manual_acceptance_check.js | backend/scripts/m98_e5_code_pin_manual_acceptance_check.js | backend | root:check:m98e5 | release | ACTIVE |  | M-98-E-5-CODE-PIN-MANUAL-ACCEPTANCE-CHECK |  | Owner or chain unclear | product check/helper |
| m99_kvkk_01_mobile_web_plain_text_check.js | backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js | backend | root:check:m99kvkk01 | release | ACTIVE |  | M-99-KVKK-01-MOBILE-WEB-PLAIN-TEXT-CHECK |  | Owner or chain unclear | product check/helper |
| m99_ux_01_visible_text_hygiene_check.js | backend/scripts/m99_ux_01_visible_text_hygiene_check.js | backend | root:check:m99ux01 | release | ACTIVE |  | M-99-UX-01-VISIBLE-TEXT-HYGIENE-CHECK |  | Owner or chain unclear | product check/helper |
| m9check.js | backend/scripts/m9check.js | backend | backend:m9check | review | NEEDS_REVIEW |  | M-9-CHECK |  | Owner or chain unclear |  |
| marketplace_free_to_operate_01_check.js | backend/scripts/marketplace_free_to_operate_01_check.js | backend | root:check:marketplacefreetooperate01 | review | NEEDS_REVIEW |  | MARKETPLACE-FREE-TO-OPERATE-01-CHECK |  | Owner or chain unclear |  |
| menu_readiness_cleanup_check.mjs | backend/scripts/menu_readiness_cleanup_check.mjs | backend |  | review | NEEDS_REVIEW |  | MENU-READINESS-CLEANUP-CHECK |  | Owner or chain unclear |  |
| mobile_web_final_01_check.js | backend/scripts/mobile_web_final_01_check.js | backend | root:check:mobilewebfinal01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| observability_monitoring_alerting_01_check.js | backend/scripts/observability_monitoring_alerting_01_check.js | backend | root:check:observabilitymonitoringalerting01 | review | NEEDS_REVIEW |  | OBSERVABILITY-MONITORING-ALERTING-01 |  | Owner or chain unclear |  |
| observability_monitoring_alerting_01_probe.js | backend/scripts/observability_monitoring_alerting_01_probe.js | backend |  | review | NEEDS_REVIEW |  | OBSERVABILITY-MONITORING-ALERTING-01 |  | Owner or chain unclear |  |
| offer_ranking_quality_01_check.js | backend/scripts/offer_ranking_quality_01_check.js | backend | root:check:offerrankingquality01 | review | NEEDS_REVIEW |  | OFFER-RANKING-QUALITY-01-CHECK |  | Owner or chain unclear |  |
| onboarding_review_01_check.js | backend/scripts/onboarding_review_01_check.js | backend | root:check:onboardingreview01 | review | NEEDS_REVIEW |  | ONBOARDING-REVIEW-01-CHECK |  | Owner or chain unclear |  |
| onboarding_review_final_audit_01_check.js | backend/scripts/onboarding_review_final_audit_01_check.js | backend | root:check:onboardingreviewfinal01, root:check:onboardingreviewfinalaudit01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| op_01_operation_proof_service_proof_check.js | backend/scripts/op_01_operation_proof_service_proof_check.js | backend | root:check:op01 | product | ACTIVE |  | OP-01-OPERATION-PROOF-SERVICE-PROOF-CHECK |  | Owner or chain unclear | product check/helper |
| op_02_manual_operator_proof_note_check.js | backend/scripts/op_02_manual_operator_proof_note_check.js | backend | root:check:op02 | product | ACTIVE |  | OP-02-MANUAL-OPERATOR-PROOF-NOTE-CHECK |  | Owner or chain unclear | product check/helper |
| op_03_web_operation_proof_card_check.js | backend/scripts/op_03_web_operation_proof_card_check.js | backend | root:check:op03 | product | ACTIVE |  | OP-03-WEB-OPERATION-PROOF-CARD-CHECK |  | Owner or chain unclear | product check/helper |
| op_04_proof_commercial_quality_readonly_bridge_check.js | backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js | backend | root:check:op04 | product | ACTIVE |  | OP-04-PROOF-COMMERCIAL-QUALITY-READONLY-BRIDGE-CHECK |  | Owner or chain unclear | product check/helper |
| osrm_route_draft_from_excel_01_check.js | backend/scripts/osrm_route_draft_from_excel_01_check.js | backend | root:check:osrmroutedraftfromexcel01 | product | ACTIVE |  | OSRM-ROUTE-DRAFT-FROM-EXCEL-01-CHECK |  | Owner or chain unclear | product check/helper |
| password_force_change_check.js | backend/scripts/password_force_change_check.js | backend |  | review | NEEDS_REVIEW |  | PASSWORD-FORCE-CHANGE-CHECK |  | Owner or chain unclear |  |
| pay_01a_readonly_payment_readiness_check.js | backend/scripts/pay_01a_readonly_payment_readiness_check.js | backend | root:check:pay01a | product | ACTIVE |  | PAY-01-A-READONLY-PAYMENT-READINESS-CHECK |  | Owner or chain unclear | product check/helper |
| pay_01b_payment_preview_readonly_check.js | backend/scripts/pay_01b_payment_preview_readonly_check.js | backend | root:check:pay01b | product | ACTIVE |  | PAY-01-B-PAYMENT-PREVIEW-READONLY-CHECK |  | Owner or chain unclear | product check/helper |
| pay_01c_payment_preview_detail_filter_check.js | backend/scripts/pay_01c_payment_preview_detail_filter_check.js | backend | root:check:pay01c | product | ACTIVE |  | PAY-01-C-PAYMENT-PREVIEW-DETAIL-FILTER-CHECK |  | Owner or chain unclear | product check/helper |
| pay_01d_payment_preview_csv_export_check.js | backend/scripts/pay_01d_payment_preview_csv_export_check.js | backend | root:check:pay01d | product | ACTIVE |  | PAY-01-D-PAYMENT-PREVIEW-CSV-EXPORT-CHECK |  | Owner or chain unclear | product check/helper |
| pay_01e_payment_readonly_closure_check.js | backend/scripts/pay_01e_payment_readonly_closure_check.js | backend | root:check:pay01e | product | ACTIVE |  | PAY-01-E-PAYMENT-READONLY-CLOSURE-CHECK |  | Owner or chain unclear | product check/helper |
| pay_safe_01_payment_write_gate_check.js | backend/scripts/pay_safe_01_payment_write_gate_check.js | backend | root:check:paysafe01 | product | ACTIVE |  | PAY-SAFE-01-PAYMENT-WRITE-GATE-CHECK |  | Owner or chain unclear | product check/helper |
| plan_center_guided_flow_persistence_01_check.js | backend/scripts/plan_center_guided_flow_persistence_01_check.js | backend | root:check:plancenterguidedflowpersistence01 | review | NEEDS_REVIEW |  | PLAN-CENTER-GUIDED-FLOW-PERSISTENCE-01-CHECK |  | Owner or chain unclear |  |
| product_flow_button_audit_01.mjs | backend/scripts/product_flow_button_audit_01.mjs | backend | root:check:productflowbuttonaudit01, root:smoke:productflowbuttonaudit01 | product-extensions | NEEDS_REVIEW |  | PRODUCT-FLOW-BUTTON-AUDIT-01 |  | Owner or chain unclear |  |
| product_flow_button_audit_01_check.js | backend/scripts/product_flow_button_audit_01_check.js | backend | root:check:productflowbuttonaudit01 | product-extensions | NEEDS_REVIEW |  | PRODUCT-FLOW-BUTTON-AUDIT-01-CHECK |  | Owner or chain unclear |  |
| production_rate_limit_policy_01_check.js | backend/scripts/production_rate_limit_policy_01_check.js | backend | root:check:productionratelimitpolicy01 | product-extensions | NEEDS_REVIEW |  | PRODUCTION-RATE-LIMIT-POLICY-01-CHECK |  | Owner or chain unclear |  |
| project_spec_v1_future_strengthening_coverage_check.js | backend/scripts/project_spec_v1_future_strengthening_coverage_check.js | backend | backend:spec16check | review | NEEDS_REVIEW |  | PROJECT-SPEC-V-1-FUTURE-STRENGTHENING-COVERAGE-CHECK |  | Owner or chain unclear |  |
| public_landing_01_check.js | backend/scripts/public_landing_01_check.js | backend | root:check:publiclanding01 | review | NEEDS_REVIEW |  | PUBLIC-LANDING-01-CHECK |  | Owner or chain unclear |  |
| public_landing_final_promise_01_check.js | backend/scripts/public_landing_final_promise_01_check.js | backend | root:check:publiclandingfinalpromise01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| public_landing_platform_first_01_check.js | backend/scripts/public_landing_platform_first_01_check.js | backend | root:check:publiclandingplatformfirst01 | review | NEEDS_REVIEW |  | PUBLIC-LANDING-PLATFORM-FIRST-01-CHECK |  | Owner or chain unclear |  |
| qlt_01_quality_provider_readiness_check.js | backend/scripts/qlt_01_quality_provider_readiness_check.js | backend | root:check:qlt01 | product | ACTIVE |  | QLT-01-QUALITY-PROVIDER-READINESS-CHECK |  | Owner or chain unclear | product check/helper |
| qlt_02_quality_draft_score_check.js | backend/scripts/qlt_02_quality_draft_score_check.js | backend | root:check:qlt02 | product | ACTIVE |  | QLT-02-QUALITY-DRAFT-SCORE-CHECK |  | Owner or chain unclear | product check/helper |
| qlt_03_quality_review_decision_check.js | backend/scripts/qlt_03_quality_review_decision_check.js | backend | root:check:qlt03 | product | ACTIVE |  | QLT-03-QUALITY-REVIEW-DECISION-CHECK |  | Owner or chain unclear | product check/helper |
| qlt_04_quality_review_history_check.js | backend/scripts/qlt_04_quality_review_history_check.js | backend | root:check:qlt04 | product | ACTIVE |  | QLT-04-QUALITY-REVIEW-HISTORY-CHECK |  | Owner or chain unclear | product check/helper |
| qlt_04a_quality_layout_polish_check.js | backend/scripts/qlt_04a_quality_layout_polish_check.js | backend | root:check:qlt04a | product | ACTIVE |  | QLT-04-A-QUALITY-LAYOUT-POLISH-CHECK |  | Owner or chain unclear | product check/helper |
| qlt_04b_compact_signal_list_check.js | backend/scripts/qlt_04b_compact_signal_list_check.js | backend | root:check:qlt04b | product | ACTIVE |  | QLT-04-B-COMPACT-SIGNAL-LIST-CHECK |  | Owner or chain unclear | product check/helper |
| qlt_pay_bridge_01_check.js | backend/scripts/qlt_pay_bridge_01_check.js | backend | root:check:qltpaybridge01 | product | ACTIVE |  | QLT-PAY-BRIDGE-01-CHECK |  | Owner or chain unclear | product check/helper |
| quality_gate_final_01_check.js | backend/scripts/quality_gate_final_01_check.js | backend | root:check:qualitygatefinal01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| relative_import_integrity_check.js | backend/scripts/relative_import_integrity_check.js | backend |  | verify:repo | ACTIVE_CORE |  | RELATIVE-IMPORT-INTEGRITY-CHECK |  | Owner or chain unclear | canonical runner |
| repo_audit.js | backend/scripts/repo_audit.js | backend | root:audit:repo | verify:repo | ACTIVE_CORE |  | REPO-AUDIT |  | Owner or chain unclear | canonical runner |
| repo_deep_audit.js | backend/scripts/repo_deep_audit.js | backend |  | review | NEEDS_REVIEW |  | REPO-DEEP-AUDIT |  | Owner or chain unclear |  |
| repo_js_syntax_scan.js | backend/scripts/repo_js_syntax_scan.js | backend |  | review | NEEDS_REVIEW |  | REPO-JS-SYNTAX-SCAN |  | Owner or chain unclear |  |
| request_storm_resilience_01_check.js | backend/scripts/request_storm_resilience_01_check.js | backend | root:check:requeststormresilience01 | product-extensions | NEEDS_REVIEW |  | REQUEST-STORM-RESILIENCE-01-CHECK |  | Owner or chain unclear |  |
| roadmap_lock_ai_marketplace_01_check.js | backend/scripts/roadmap_lock_ai_marketplace_01_check.js | backend | root:check:roadmaplockaimarketplace01 | review | NEEDS_REVIEW |  | ROADMAP-LOCK-AI-MARKETPLACE-01-CHECK |  | Owner or chain unclear |  |
| role_data_isolation_redteam_01_check.js | backend/scripts/role_data_isolation_redteam_01_check.js | backend | root:check:roledataisolationredteam01 | review | NEEDS_REVIEW |  | ROLE-DATA-ISOLATION-REDTEAM-01 |  | Owner or chain unclear |  |
| room_vehicle_driver_uppercase_normalization_01_check.js | backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js | backend | root:check:roomvehicledriveruppercase01 | review | NEEDS_REVIEW |  | ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01-CHECK |  | Owner or chain unclear |  |
| route_change_final_01_check.js | backend/scripts/route_change_final_01_check.js | backend | root:check:routechangefinal01 | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |
| run_backend_lint.js | backend/scripts/run_backend_lint.js | backend | backend:lint | backend-lint | ACTIVE_CORE |  | RUN-BACKEND-LINT |  | Owner or chain unclear | canonical runner |
| run_m0_latest.js | backend/scripts/run_m0_latest.js | backend | backend:m91:milestones, backend:milestones:static, root:verify:milestones, root:verify:milestones:live | verify:repo | ACTIVE_CORE |  | RUN-M-0-LATEST |  | Owner or chain unclear | canonical runner |
| run_m0_m66.js | backend/scripts/run_m0_m66.js | backend |  | review | NEEDS_REVIEW |  | RUN-M-0-M-66 |  | Owner or chain unclear |  |
| run_m91_route_preview_checks.js | backend/scripts/run_m91_route_preview_checks.js | backend | backend:m91check | verify:repo | ACTIVE_CORE |  | RUN-M-91-ROUTE-PREVIEW-CHECKS |  | Owner or chain unclear | canonical runner |
| run_product_extensions_check_chain.js | backend/scripts/run_product_extensions_check_chain.js | backend | root:check:product-extensions | product-extensions | ACTIVE_CORE |  | RUN-PRODUCT-EXTENSIONS-CHECK-CHAIN |  | Owner or chain unclear | canonical runner |
| run_repo_check_chain.js | backend/scripts/run_repo_check_chain.js | backend | backend:repo:check, backend:repo:check:chain, root:verify:closure, root:verify:docs, root:verify:hot, root:verify:repo, root:verify:web-contract | verify:repo | ACTIVE_CORE |  | RUN-REPO-CHECK-CHAIN |  | Owner or chain unclear | canonical runner |
| run_web_lint_with_evidence.js | backend/scripts/run_web_lint_with_evidence.js | backend | root:lint:web | web-lint | ACTIVE_CORE |  | RUN-WEB-LINT-WITH-EVIDENCE |  | Owner or chain unclear | canonical runner |
| safe_drive_01_check.js | backend/scripts/safe_drive_01_check.js | backend | root:check:safedrive01 | review | NEEDS_REVIEW |  | SAFE-DRIVE-01-CHECK |  | Owner or chain unclear |  |
| scale_readiness_check.js | backend/scripts/scale_readiness_check.js | backend |  | review | NEEDS_REVIEW |  | SCALE-READINESS-CHECK |  | Owner or chain unclear |  |
| script_harness_consolidation_01_check.js | backend/scripts/script_harness_consolidation_01_check.js | backend | root:check:scriptharnessconsolidation01 | product-extensions | ACTIVE_CORE |  | SCRIPT-HARNESS-CONSOLIDATION-01-CHECK |  | Owner or chain unclear | canonical repo harness inventory |
| security_kvkk_final_01_check.js | backend/scripts/security_kvkk_final_01_check.js | backend | root:check:securitykvkkfinal01 | review | NEEDS_REVIEW |  | SECURITY-KVKK-FINAL-01 |  | Owner or chain unclear |  |
| sefer_abi_all_roles_reasoning_assistant_01_check.js | backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js | backend | root:check:seferabiallrolesreasoningassistant01 | review | NEEDS_REVIEW |  | SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01-CHECK |  | Owner or chain unclear |  |
| sefer_abi_reasoning_assistant_01_check.js | backend/scripts/sefer_abi_reasoning_assistant_01_check.js | backend | root:check:seferabireasoningassistant01 | review | NEEDS_REVIEW |  | SEFER-ABI-REASONING-ASSISTANT-01-CHECK |  | Owner or chain unclear |  |
| sefer_abi_terminal_humanize_01_check.js | backend/scripts/sefer_abi_terminal_humanize_01_check.js | backend | root:check:seferabiterminalhumanize01 | review | NEEDS_REVIEW |  | SEFER-ABI-TERMINAL-HUMANIZE-01-CHECK |  | Owner or chain unclear |  |
| sefer_abi_turkish_user_facing_language_01_check.js | backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js | backend | root:check:seferabiturkishuserfacinglanguage01 | review | NEEDS_REVIEW |  | SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-01-CHECK |  | Owner or chain unclear |  |
| sefer_abi_turkish_user_facing_terminology_01_check.js | backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js | backend | root:check:seferabiturkishterminology01 | review | NEEDS_REVIEW |  | SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-01-CHECK |  | Owner or chain unclear |  |
| sefer_score_01_check.js | backend/scripts/sefer_score_01_check.js | backend | root:check:seferscore01 | review | NEEDS_REVIEW |  | SEFER-SCORE-01-CHECK |  | Owner or chain unclear |  |
| session_safe_panels_cleanup_hotfix_check.mjs | backend/scripts/session_safe_panels_cleanup_hotfix_check.mjs | backend |  | review | NEEDS_REVIEW |  | SESSION-SAFE-PANELS-CLEANUP-HOTFIX-CHECK |  | Owner or chain unclear |  |
| shift_dispatch_approval_fix_01_check.js | backend/scripts/shift_dispatch_approval_fix_01_check.js | backend | root:check:shiftdispatchapprovalfix01 | review | NEEDS_REVIEW |  | SHIFT-DISPATCH-APPROVAL-FIX-01-CHECK |  | Owner or chain unclear |  |
| smoke.js | backend/scripts/smoke.js | backend | backend:current:surface, backend:m91:smoke, backend:m91:smoke:agreement, backend:m91:smoke:route-preview, backend:smoke, root:check:e2esmoke01, root:check:finaluxsmoke01, root:check:m95e26, root:check:uxlivepanelpremiumsmoke01, root:check:uxlivepanelsmokeaudit01, root:check:uxsmokepassminusevidence01, root:check:uxsmokepassminuszero01, root:smoke:m98e4, root:smoke:uxlivepanelpremium01 | review | NEEDS_REVIEW |  | SMOKE |  | Owner or chain unclear |  |
| step06_stabil_check.js | backend/scripts/step06_stabil_check.js | backend |  | review | NEEDS_REVIEW |  | STEP-06-STABIL-CHECK |  | Owner or chain unclear |  |
| step1_security_foundation_check.js | backend/scripts/step1_security_foundation_check.js | backend |  | review | NEEDS_REVIEW |  | STEP-1-SECURITY-FOUNDATION-CHECK |  | Owner or chain unclear |  |
| step1_totp_stepup_check.js | backend/scripts/step1_totp_stepup_check.js | backend |  | review | NEEDS_REVIEW |  | STEP-1-TOTP-STEPUP-CHECK |  | Owner or chain unclear |  |
| superadmin_menu_copilot_sadelestirme_check.js | backend/scripts/superadmin_menu_copilot_sadelestirme_check.js | backend |  | review | NEEDS_REVIEW |  | SUPERADMIN-MENU-COPILOT-SADELESTIRME-CHECK |  | Owner or chain unclear |  |
| superadmin_menu_turkce_hotfix_check.js | backend/scripts/superadmin_menu_turkce_hotfix_check.js | backend |  | review | NEEDS_REVIEW |  | SUPERADMIN-MENU-TURKCE-HOTFIX-CHECK |  | Owner or chain unclear |  |
| supplier_matching_01_check.js | backend/scripts/supplier_matching_01_check.js | backend | root:check:suppliermatching01 | product-extensions | NEEDS_REVIEW |  | SUPPLIER-MATCHING-01-CHECK |  | Owner or chain unclear |  |
| supplier_offer_collect_01_check.js | backend/scripts/supplier_offer_collect_01_check.js | backend | root:check:supplieroffercollect01 | product-extensions | NEEDS_REVIEW |  | SUPPLIER-OFFER-COLLECT-01-CHECK |  | Owner or chain unclear |  |
| telematics_provider_hub_01_check.js | backend/scripts/telematics_provider_hub_01_check.js | backend | root:check:telematicsproviderhub01 | review | NEEDS_REVIEW |  | TELEMATICS-PROVIDER-HUB-01-CHECK |  | Owner or chain unclear |  |
| test_quality_and_flake_audit_01_check.js | backend/scripts/test_quality_and_flake_audit_01_check.js | backend | root:check:testqualityandflakeaudit01 | review | NEEDS_REVIEW |  | TEST-QUALITY-AND-FLAKE-AUDIT-01-CHECK |  | Owner or chain unclear |  |
| ui_action_wiring_audit_01_check.js | backend/scripts/ui_action_wiring_audit_01_check.js | backend | root:check:uiactionwiringaudit01 | review | NEEDS_REVIEW |  | UI-ACTION-WIRING-AUDIT-01-CHECK |  | Owner or chain unclear |  |
| ui_route_resilience_hotfix_check.js | backend/scripts/ui_route_resilience_hotfix_check.js | backend |  | review | NEEDS_REVIEW |  | UI-ROUTE-RESILIENCE-HOTFIX-CHECK |  | Owner or chain unclear |  |
| username_first_login_hotfix_check.js | backend/scripts/username_first_login_hotfix_check.js | backend |  | review | NEEDS_REVIEW |  | USERNAME-FIRST-LOGIN-HOTFIX-CHECK |  | Owner or chain unclear |  |
| ux_all_panels_reality_audit_01.mjs | backend/scripts/ux_all_panels_reality_audit_01.mjs | backend | root:check:uxallpanelsrealityaudit01, root:smoke:uxallpanelsrealityaudit01 | review | NEEDS_REVIEW |  | UX-ALL-PANELS-REALITY-AUDIT-01 |  | Owner or chain unclear |  |
| ux_all_panels_reality_audit_01_check.js | backend/scripts/ux_all_panels_reality_audit_01_check.js | backend | root:check:uxallpanelsrealityaudit01 | product | ACTIVE |  | UX-ALL-PANELS-REALITY-AUDIT-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_brand_login_premium_01_check.js | backend/scripts/ux_brand_login_premium_01_check.js | backend | root:check:uxbrandloginpremium01 | product | ACTIVE |  | UX-BRAND-LOGIN-PREMIUM-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_collapsible_panels_01_check.js | backend/scripts/ux_collapsible_panels_01_check.js | backend | root:check:uxcollapsiblepanels01 | product | ACTIVE |  | UX-COLLAPSIBLE-PANELS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_company_agreements_mobile_parity_01_check.js | backend/scripts/ux_company_agreements_mobile_parity_01_check.js | backend | root:check:uxcompanyagreementsmobileparity01 | product | ACTIVE |  | UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_company_mobile_action_clarity_01_check.js | backend/scripts/ux_company_mobile_action_clarity_01_check.js | backend | root:check:uxcompanymobileactionclarity01 | product | ACTIVE |  | UX-COMPANY-MOBILE-ACTION-CLARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_company_ops_panel_tabs_01_check.js | backend/scripts/ux_company_ops_panel_tabs_01_check.js | backend | root:check:uxcompanyopspaneltabs01, root:check:uxcompanypanelssmoke01 | product | ACTIVE |  | UX-COMPANY-OPS-PANEL-TABS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_company_panels_final_polish_01_check.js | backend/scripts/ux_company_panels_final_polish_01_check.js | backend | root:check:uxcompanypanelsfinalpolish01 | product | ACTIVE |  | FINAL |  | Owner or chain unclear | product check/helper |
| ux_company_personel_access_mobile_parity_01_check.js | backend/scripts/ux_company_personel_access_mobile_parity_01_check.js | backend | root:check:uxcompanypersonelaccessmobileparity01 | product | ACTIVE |  | UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_company_quality_panel_tabs_01_check.js | backend/scripts/ux_company_quality_panel_tabs_01_check.js | backend | root:check:uxcompanyqualitytabs01 | product | ACTIVE |  | UX-COMPANY-QUALITY-PANEL-TABS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_company_shifts_tabs_01_check.js | backend/scripts/ux_company_shifts_tabs_01_check.js | backend | root:check:uxcompanyshiftstabs01 | product | ACTIVE |  | UX-COMPANY-SHIFTS-TABS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_contract_conversion_ops_bridge_clarity_01_check.js | backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js | backend | root:check:uxcontractconversionopsbridgeclarity01 | product | ACTIVE |  | UX-CONTRACT-CONVERSION-OPS-BRIDGE-CLARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_copilot_persona_01_check.js | backend/scripts/ux_copilot_persona_01_check.js | backend | root:check:uxcopilotpersona01 | product | ACTIVE |  | UX-COPILOT-PERSONA-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_copilot_smart_chips_01_check.js | backend/scripts/ux_copilot_smart_chips_01_check.js | backend | root:check:uxcopilotsmartchips01 | product | ACTIVE |  | UX-COPILOT-SMART-CHIPS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_copilot_terminal_01_check.js | backend/scripts/ux_copilot_terminal_01_check.js | backend | root:check:uxcopilotterminal01 | product | ACTIVE |  | UX-COPILOT-TERMINAL-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_density_01_panel_card_density_check.js | backend/scripts/ux_density_01_panel_card_density_check.js | backend | root:check:uxdensity01 | product | ACTIVE |  | UX-DENSITY-01-PANEL-CARD-DENSITY-CHECK |  | Owner or chain unclear | product check/helper |
| ux_kvkk_01_compact_boundary_check.js | backend/scripts/ux_kvkk_01_compact_boundary_check.js | backend | root:check:uxkvkk01 | product | ACTIVE |  | UX-KVKK-01-COMPACT-BOUNDARY-CHECK |  | Owner or chain unclear | product check/helper |
| ux_live_map_tabs_simplify_01_check.js | backend/scripts/ux_live_map_tabs_simplify_01_check.js | backend | root:check:uxlivemaptabsfix01, root:check:uxlivemaptabssimplify01 | product | ACTIVE |  | UX-LIVE-MAP-TABS-SIMPLIFY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_live_panel_premium_smoke_01.mjs | backend/scripts/ux_live_panel_premium_smoke_01.mjs | backend | root:check:uxlivepanelpremiumsmoke01, root:smoke:uxlivepanelpremium01 | review | NEEDS_REVIEW |  | UX-LIVE-PANEL-PREMIUM-SMOKE-01 |  | Owner or chain unclear |  |
| ux_live_panel_premium_smoke_01_check.js | backend/scripts/ux_live_panel_premium_smoke_01_check.js | backend | root:check:uxlivepanelpremiumsmoke01 | product | ACTIVE |  | UX-LIVE-PANEL-PREMIUM-SMOKE-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_live_panel_smoke_audit_01_check.js | backend/scripts/ux_live_panel_smoke_audit_01_check.js | backend | root:check:uxlivepanelsmokeaudit01 | product | ACTIVE |  | UX-LIVE-PANEL-SMOKE-AUDIT-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_marketplace_panels_01_check.js | backend/scripts/ux_marketplace_panels_01_check.js | backend | root:check:uxmarketplacepanels01 | product-extensions | ACTIVE |  | UX-MARKETPLACE-PANELS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_mobile_all_roles_panel_audit_01.mjs | backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs | backend | root:check:uxmobileallrolespanelaudit01, root:smoke:uxmobileallrolespanelaudit01 | review | NEEDS_REVIEW |  | UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01 |  | Owner or chain unclear |  |
| ux_mobile_all_roles_panel_audit_01_check.js | backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js | backend | root:check:uxmobileallrolespanelaudit01 | product | ACTIVE |  | UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_mobile_all_roles_panel_fix_01_check.js | backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js | backend | root:check:uxmobileallrolespanelfix01 | product | ACTIVE |  | UX-MOBILE-ALL-ROLES-PANEL-FIX-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_mobile_overflow_minimap_polish_02_check.js | backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js | backend | root:check:uxmobileoverflowminimappolish02 | product | ACTIVE |  | UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02-CHECK |  | Owner or chain unclear | product check/helper |
| ux_mobile_overflow_minimap_readability_01_check.js | backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js | backend | root:check:uxmobileoverflowminimapreadability01 | product | ACTIVE |  | UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_mobile_web_shell_clarity_01_check.js | backend/scripts/ux_mobile_web_shell_clarity_01_check.js | backend | root:check:uxmobilewebshellclarity01 | product | ACTIVE |  | UX-MOBILE-WEB-SHELL-CLARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_nav_01_premium_navdock_check.js | backend/scripts/ux_nav_01_premium_navdock_check.js | backend | root:check:uxnav01 | product | ACTIVE |  | UX-NAV-01-PREMIUM-NAVDOCK-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_inventory_02a_check.js | backend/scripts/ux_panel_inventory_02a_check.js | backend | root:check:uxpanelinventory02a | product | ACTIVE |  | UX-PANEL-INVENTORY-02-A-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_layout_width_02c_fix_01_check.js | backend/scripts/ux_panel_layout_width_02c_fix_01_check.js | backend | root:check:uxpanellayoutwidth02cfix01 | product | ACTIVE |  | UX-PANEL-LAYOUT-WIDTH-02-C-FIX-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_layout_width_02c_fix_02_check.js | backend/scripts/ux_panel_layout_width_02c_fix_02_check.js | backend | root:check:uxpanellayoutwidth02cfix02 | product | ACTIVE |  | UX-PANEL-LAYOUT-WIDTH-02-C-FIX-02-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_layout_width_02c_fix_03_check.js | backend/scripts/ux_panel_layout_width_02c_fix_03_check.js | backend | root:check:uxpanellayoutwidth02cfix03 | product | ACTIVE |  | UX-PANEL-LAYOUT-WIDTH-02-C-FIX-03-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_reality_audit_02c_check.js | backend/scripts/ux_panel_reality_audit_02c_check.js | backend | root:check:uxpanelreality02c | product | ACTIVE |  | UX-PANEL-REALITY-AUDIT-02-C-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_reality_cleanup_02d_check.js | backend/scripts/ux_panel_reality_cleanup_02d_check.js | backend | root:check:uxpanelrealitycleanup02d, root:check:uxroomagreementstabs01 | product | ACTIVE |  | UX-PANEL-REALITY-CLEANUP-02-D-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_standard_architecture_01_check.js | backend/scripts/ux_panel_standard_architecture_01_check.js | backend | root:check:uxpanelstandardarchitecture01 | product | ACTIVE |  | UX-PANEL-STANDARD-ARCHITECTURE-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_structure_02_check.js | backend/scripts/ux_panel_structure_02_check.js | backend | root:check:uxpanelstructure02 | product | ACTIVE |  | UX-PANEL-STRUCTURE-02-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_structure_02b_check.js | backend/scripts/ux_panel_structure_02b_check.js | backend | root:check:uxpanelstructure02b | product | ACTIVE |  | UX-PANEL-STRUCTURE-02-B-CHECK |  | Owner or chain unclear | product check/helper |
| ux_panel_tabs_functional_02b_fix_01_check.js | backend/scripts/ux_panel_tabs_functional_02b_fix_01_check.js | backend | root:check:uxpaneltabsfix01 | product | ACTIVE |  | UX-PANEL-TABS-FUNCTIONAL-02-B-FIX-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_parent_personel_live_error_clarity_01_check.js | backend/scripts/ux_parent_personel_live_error_clarity_01_check.js | backend | root:check:uxparentpersonelliveerrorclarity01 | product | ACTIVE |  | UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_premium_critical_fix_agreements_detail_01_check.js | backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js | backend | root:check:uxpremiumcriticalfixagreementsdetail01 | product | ACTIVE |  | UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_premium_critical_fix_room_01_check.js | backend/scripts/ux_premium_critical_fix_room_01_check.js | backend | root:check:uxpremiumcriticalfixroom01 | product | ACTIVE |  | UX-PREMIUM-CRITICAL-FIX-ROOM-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_premium_critical_uxfix_cleanup_01_check.js | backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js | backend | root:check:uxpremiumcriticaluxfixcleanup01 | product | ACTIVE |  | UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_company_shifts_mobile_card_fix_01_check.js | backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js | backend | root:check:uxroomcompanyshiftsmobilecardfix01 | product | ACTIVE |  | UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_driver_vehicle_link_dedup_01_check.js | backend/scripts/ux_room_driver_vehicle_link_dedup_01_check.js | backend | root:check:uxroomdrivervehiclelinkdedup01 | product | ACTIVE |  | UX-ROOM-DRIVER-VEHICLE-LINK-DEDUP-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_ops_panel_tabs_01_check.js | backend/scripts/ux_room_ops_panel_tabs_01_check.js | backend | root:check:uxroomopspaneltabs01 | product | ACTIVE |  | UX-ROOM-OPS-PANEL-TABS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_ops_relationship_polish_01_check.js | backend/scripts/ux_room_ops_relationship_polish_01_check.js | backend | root:check:uxroomopsrelationshippolish01 | product | ACTIVE |  | UX-ROOM-OPS-RELATIONSHIP-POLISH-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_panel_clarity_01_check.js | backend/scripts/ux_room_panel_clarity_01_check.js | backend | root:check:uxroompanelclarity01 | product | ACTIVE |  | UX-ROOM-PANEL-CLARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_shifts_density_dedup_01_check.js | backend/scripts/ux_room_shifts_density_dedup_01_check.js | backend | root:check:uxroomshiftsdensitydedup01 | product | ACTIVE |  | UX-ROOM-SHIFTS-DENSITY-DEDUP-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_shifts_tabs_01_check.js | backend/scripts/ux_room_shifts_tabs_01_check.js | backend | root:check:uxroomshiftstabs01 | product | ACTIVE |  | UX-ROOM-SHIFTS-TABS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_room_vehicles_telematics_counts_fix_check.js | backend/scripts/ux_room_vehicles_telematics_counts_fix_check.js | backend | root:check:uxroomvehiclestelematicsfix | product | ACTIVE |  | UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-CHECK |  | Owner or chain unclear | product check/helper |
| ux_route_impact_preview_compact_01_check.js | backend/scripts/ux_route_impact_preview_compact_01_check.js | backend | root:check:uxrouteimpactpreviewcompact01 | product | ACTIVE |  | UX-ROUTE-IMPACT-PREVIEW-COMPACT-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_school_organization_panels_01_check.js | backend/scripts/ux_school_organization_panels_01_check.js | backend | root:check:uxschoolorganizationpanels01 | product | ACTIVE |  | UX-SCHOOL-ORGANIZATION-PANELS-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_sefer_abi_launcher_01_check.js | backend/scripts/ux_sefer_abi_launcher_01_check.js | backend | root:check:uxseferabilauncher01 | product | ACTIVE |  | UX-SEFER-ABI-LAUNCHER-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_shifts_responsive_layout_fix_01_check.js | backend/scripts/ux_shifts_responsive_layout_fix_01_check.js | backend | root:check:uxshiftsresponsivelayoutfix01 | product | ACTIVE |  | UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_smoke_pass_minus_evidence_01_check.js | backend/scripts/ux_smoke_pass_minus_evidence_01_check.js | backend | root:check:uxsmokepassminusevidence01 | product | ACTIVE |  | UX-SMOKE-PASS-MINUS-EVIDENCE-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_smoke_pass_minus_zero_01_check.js | backend/scripts/ux_smoke_pass_minus_zero_01_check.js | backend | root:check:uxsmokepassminuszero01 | product | ACTIVE |  | UX-SMOKE-PASS-MINUS-ZERO-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_audit_panel_01_check.js | backend/scripts/ux_superadmin_audit_panel_01_check.js | backend | root:check:uxsuperadminauditpanel01 | product | ACTIVE |  | UX-SUPERADMIN-AUDIT-PANEL-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_commercial_flow_01_check.js | backend/scripts/ux_superadmin_commercial_flow_01_check.js | backend | root:check:uxsuperadmincommercialflow01 | product | ACTIVE |  | UX-SUPERADMIN-COMMERCIAL-FLOW-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_field_acceptance_center_01_check.js | backend/scripts/ux_superadmin_field_acceptance_center_01_check.js | backend | root:check:uxsuperadminfieldacceptancecenter01 | product | ACTIVE |  | UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_field_dispatch_discovery_01_check.js | backend/scripts/ux_superadmin_field_dispatch_discovery_01_check.js | backend | root:check:uxsuperadminfielddispatchdiscovery01 | product | ACTIVE |  | UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_label_polish_01_check.js | backend/scripts/ux_superadmin_label_polish_01_check.js | backend | root:check:uxsuperadminlabelpolish01 | product | ACTIVE |  | UX-SUPERADMIN-LABEL-POLISH-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_live_monitoring_01_check.js | backend/scripts/ux_superadmin_live_monitoring_01_check.js | backend | root:check:uxsuperadminlivemonitoring01 | product | ACTIVE |  | UX-SUPERADMIN-LIVE-MONITORING-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_overview_cleanup_01_check.js | backend/scripts/ux_superadmin_overview_cleanup_01_check.js | backend | root:check:uxsuperadminoverviewcleanup01 | product | ACTIVE |  | UX-SUPERADMIN-OVERVIEW-CLEANUP-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_panel_clarity_01_check.js | backend/scripts/ux_superadmin_panel_clarity_01_check.js | backend | root:check:uxsuperadminpanelclarity01 | product | ACTIVE |  | UX-SUPERADMIN-PANEL-CLARITY-01-CHECK |  | Owner or chain unclear | product check/helper |
| ux_superadmin_quality_panel_01_check.js | backend/scripts/ux_superadmin_quality_panel_01_check.js | backend | root:check:uxsuperadminqualitypanel01 | product | ACTIVE |  | UX-SUPERADMIN-QUALITY-PANEL-01-CHECK |  | Owner or chain unclear | product check/helper |
| verified_supplier_01_check.js | backend/scripts/verified_supplier_01_check.js | backend | root:check:verifiedsupplier01 | product-extensions | NEEDS_REVIEW |  | VERIFIED-SUPPLIER-01-CHECK |  | Owner or chain unclear |  |
| verify_chain_01_product_extensions_check.js | backend/scripts/verify_chain_01_product_extensions_check.js | backend | root:check:verifychain01 | product-extensions | ACTIVE_CORE |  | VERIFY-CHAIN-01-PRODUCT-EXTENSIONS-CHECK |  | Owner or chain unclear | canonical runner |
| web_01a_flow_summary_polish_check.js | backend/scripts/web_01a_flow_summary_polish_check.js | backend | root:check:web01a | review | NEEDS_REVIEW |  | WEB-01-A-FLOW-SUMMARY-POLISH-CHECK |  | Owner or chain unclear |  |
| web_01b_superadmin_system_mode_summary_check.js | backend/scripts/web_01b_superadmin_system_mode_summary_check.js | backend | root:check:web01b | review | NEEDS_REVIEW |  | WEB-01-B-SUPERADMIN-SYSTEM-MODE-SUMMARY-CHECK |  | Owner or chain unclear |  |
| addressGeocodingConfidencePolicy.js | backend/src/ai/chat/addressGeocodingConfidencePolicy.js | backend |  | review | NEEDS_REVIEW |  | ADDRESS-GEOCODING-CONFIDENCE-POLICY |  | Owner or chain unclear |  |
| answerQualityPolicy.js | backend/src/ai/chat/answerQualityPolicy.js | backend |  | review | NEEDS_REVIEW |  | ANSWER-QUALITY-POLICY |  | Owner or chain unclear |  |
| contextResolver.js | backend/src/ai/chat/contextResolver.js | backend |  | review | NEEDS_REVIEW |  | CONTEXT-RESOLVER |  | Owner or chain unclear |  |
| conversationNextBestActionEngine.js | backend/src/ai/chat/conversationNextBestActionEngine.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-NEXT-BEST-ACTION-ENGINE |  | Owner or chain unclear |  |
| conversationOperationHealthEngine.js | backend/src/ai/chat/conversationOperationHealthEngine.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-OPERATION-HEALTH-ENGINE |  | Owner or chain unclear |  |
| conversationPlanReviewEngine.js | backend/src/ai/chat/conversationPlanReviewEngine.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-PLAN-REVIEW-ENGINE |  | Owner or chain unclear |  |
| conversationRiskScoringEngine.js | backend/src/ai/chat/conversationRiskScoringEngine.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-RISK-SCORING-ENGINE |  | Owner or chain unclear |  |
| conversationRootCauseEngine.js | backend/src/ai/chat/conversationRootCauseEngine.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-ROOT-CAUSE-ENGINE |  | Owner or chain unclear |  |
| conversationSmartDiagnostics.js | backend/src/ai/chat/conversationSmartDiagnostics.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-SMART-DIAGNOSTICS |  | Owner or chain unclear |  |
| conversationTaskState.js | backend/src/ai/chat/conversationTaskState.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE |  | Owner or chain unclear |  |
| conversationTaskStateBuilders.js | backend/src/ai/chat/conversationTaskStateBuilders.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-BUILDERS |  | Owner or chain unclear |  |
| conversationTaskStateClarifiers.js | backend/src/ai/chat/conversationTaskStateClarifiers.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-CLARIFIERS |  | Owner or chain unclear |  |
| conversationTaskStateCompanyReplies.js | backend/src/ai/chat/conversationTaskStateCompanyReplies.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-COMPANY-REPLIES |  | Owner or chain unclear |  |
| conversationTaskStateDynamicQuestions.js | backend/src/ai/chat/conversationTaskStateDynamicQuestions.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-DYNAMIC-QUESTIONS |  | Owner or chain unclear |  |
| conversationTaskStateFollowUps.js | backend/src/ai/chat/conversationTaskStateFollowUps.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-FOLLOW-UPS |  | Owner or chain unclear |  |
| conversationTaskStateResponses.js | backend/src/ai/chat/conversationTaskStateResponses.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-RESPONSES |  | Owner or chain unclear |  |
| conversationTaskStateRoomReplies.js | backend/src/ai/chat/conversationTaskStateRoomReplies.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-ROOM-REPLIES |  | Owner or chain unclear |  |
| conversationTaskStateSelectedRecord.js | backend/src/ai/chat/conversationTaskStateSelectedRecord.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-SELECTED-RECORD |  | Owner or chain unclear |  |
| conversationTaskStateShared.js | backend/src/ai/chat/conversationTaskStateShared.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-TASK-STATE-SHARED |  | Owner or chain unclear |  |
| conversationWorkflowReasoningEngine.js | backend/src/ai/chat/conversationWorkflowReasoningEngine.js | backend |  | review | NEEDS_REVIEW |  | CONVERSATION-WORKFLOW-REASONING-ENGINE |  | Owner or chain unclear |  |
| copilotAiActionRoadmap.js | backend/src/ai/chat/copilotAiActionRoadmap.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-AI-ACTION-ROADMAP |  | Owner or chain unclear |  |
| copilotDemandIntake.js | backend/src/ai/chat/copilotDemandIntake.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-DEMAND-INTAKE |  | Owner or chain unclear |  |
| copilotDemandToAgreementRoadmap.js | backend/src/ai/chat/copilotDemandToAgreementRoadmap.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-DEMAND-TO-AGREEMENT-ROADMAP |  | Owner or chain unclear |  |
| copilotEBlockRuntimeAnswerIntegration.js | backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-EBLOCK-RUNTIME-ANSWER-INTEGRATION |  | Owner or chain unclear |  |
| copilotExcelDemandImportPolicy.js | backend/src/ai/chat/copilotExcelDemandImportPolicy.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-EXCEL-DEMAND-IMPORT-POLICY |  | Owner or chain unclear |  |
| copilotGuidedTaskEngine.js | backend/src/ai/chat/copilotGuidedTaskEngine.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-GUIDED-TASK-ENGINE |  | Owner or chain unclear |  |
| copilotHumanApprovalPolicy.js | backend/src/ai/chat/copilotHumanApprovalPolicy.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-HUMAN-APPROVAL-POLICY |  | Owner or chain unclear |  |
| copilotNegotiationAssist.js | backend/src/ai/chat/copilotNegotiationAssist.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-NEGOTIATION-ASSIST |  | Owner or chain unclear |  |
| copilotOfferAnalysis.js | backend/src/ai/chat/copilotOfferAnalysis.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-OFFER-ANALYSIS |  | Owner or chain unclear |  |
| copilotOfferRecommendation.js | backend/src/ai/chat/copilotOfferRecommendation.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-OFFER-RECOMMENDATION |  | Owner or chain unclear |  |
| copilotReasoningAnswerComposer.js | backend/src/ai/chat/copilotReasoningAnswerComposer.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-REASONING-ANSWER-COMPOSER |  | Owner or chain unclear |  |
| copilotRfqPrep.js | backend/src/ai/chat/copilotRfqPrep.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-RFQ-PREP |  | Owner or chain unclear |  |
| copilotRoleTaskMatrix.js | backend/src/ai/chat/copilotRoleTaskMatrix.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-ROLE-TASK-MATRIX |  | Owner or chain unclear |  |
| copilotRouteReviewHumanApprovalPolicy.js | backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-POLICY |  | Owner or chain unclear |  |
| copilotStopRouteDraftPolicy.js | backend/src/ai/chat/copilotStopRouteDraftPolicy.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-STOP-ROUTE-DRAFT-POLICY |  | Owner or chain unclear |  |
| etaSanity.js | backend/src/ai/chat/etaSanity.js | backend |  | review | NEEDS_REVIEW |  | ETA-SANITY |  | Owner or chain unclear |  |
| excelToRouteReadinessRedteamPack.js | backend/src/ai/chat/excelToRouteReadinessRedteamPack.js | backend |  | review | NEEDS_REVIEW |  | EXCEL-TO-ROUTE-READINESS-REDTEAM-PACK |  | Owner or chain unclear |  |
| goldenQuestionPack.js | backend/src/ai/chat/goldenQuestionPack.js | backend |  | review | NEEDS_REVIEW |  | GOLDEN-QUESTION-PACK |  | Owner or chain unclear |  |
| helpComposer.js | backend/src/ai/chat/helpComposer.js | backend |  | review | NEEDS_REVIEW |  | HELP-COMPOSER |  | Owner or chain unclear |  |
| helpComposerEntityRuntime.js | backend/src/ai/chat/helpComposerEntityRuntime.js | backend |  | review | NEEDS_REVIEW |  | HELP-COMPOSER-ENTITY-RUNTIME |  | Owner or chain unclear |  |
| helpComposerSafeReplies.js | backend/src/ai/chat/helpComposerSafeReplies.js | backend |  | review | NEEDS_REVIEW |  | HELP-COMPOSER-SAFE-REPLIES |  | Owner or chain unclear |  |
| helpComposerSelectedRuntime.js | backend/src/ai/chat/helpComposerSelectedRuntime.js | backend |  | review | NEEDS_REVIEW |  | HELP-COMPOSER-SELECTED-RUNTIME |  | Owner or chain unclear |  |
| intentRouter.js | backend/src/ai/chat/intentRouter.js | backend |  | review | NEEDS_REVIEW |  | INTENT-ROUTER |  | Owner or chain unclear |  |
| intentRouterCore.js | backend/src/ai/chat/intentRouterCore.js | backend |  | review | NEEDS_REVIEW |  | INTENT-ROUTER-CORE |  | Owner or chain unclear |  |
| osrmRouteDraftFromExcelPolicy.js | backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js | backend |  | review | NEEDS_REVIEW |  | OSRM-ROUTE-DRAFT-FROM-EXCEL-POLICY |  | Owner or chain unclear |  |
| qualityScorer.js | backend/src/ai/chat/qualityScorer.js | backend |  | review | NEEDS_REVIEW |  | QUALITY-SCORER |  | Owner or chain unclear |  |
| replyShapes.js | backend/src/ai/chat/replyShapes.js | backend |  | review | NEEDS_REVIEW |  | REPLY-SHAPES |  | Owner or chain unclear |  |
| screenStateAnalyzer.js | backend/src/ai/chat/screenStateAnalyzer.js | backend |  | review | NEEDS_REVIEW |  | SCREEN-STATE-ANALYZER |  | Owner or chain unclear |  |
| seferAbiReasoningAssistant.js | backend/src/ai/chat/seferAbiReasoningAssistant.js | backend |  | review | NEEDS_REVIEW |  | SEFER-ABI-REASONING-ASSISTANT |  | Owner or chain unclear |  |
| supplierMatching.js | backend/src/ai/chat/supplierMatching.js | backend |  | review | NEEDS_REVIEW |  | SUPPLIER-MATCHING |  | Owner or chain unclear |  |
| supplierOfferCollect.js | backend/src/ai/chat/supplierOfferCollect.js | backend |  | review | NEEDS_REVIEW |  | SUPPLIER-OFFER-COLLECT |  | Owner or chain unclear |  |
| copyOutputs.js | backend/src/ai/jobGuide/copyOutputs.js | backend |  | review | NEEDS_REVIEW |  | COPY-OUTPUTS |  | Owner or chain unclear |  |
| glossary.js | backend/src/ai/jobGuide/glossary.js | backend |  | review | NEEDS_REVIEW |  | GLOSSARY |  | Owner or chain unclear |  |
| index.js | backend/src/ai/jobGuide/index.js | backend |  | review | NEEDS_REVIEW |  | INDEX |  | Owner or chain unclear |  |
| assignmentReadinessGuide.js | backend/src/ai/jobGuide/jobs/assignmentReadinessGuide.js | backend |  | review | NEEDS_REVIEW |  | ASSIGNMENT-READINESS-GUIDE |  | Owner or chain unclear |  |
| buttonActionGuide.js | backend/src/ai/jobGuide/jobs/buttonActionGuide.js | backend |  | review | NEEDS_REVIEW |  | BUTTON-ACTION-GUIDE |  | Owner or chain unclear |  |
| gpsSignalDiagnosisGuide.js | backend/src/ai/jobGuide/jobs/gpsSignalDiagnosisGuide.js | backend |  | review | NEEDS_REVIEW |  | GPS-SIGNAL-DIAGNOSIS-GUIDE |  | Owner or chain unclear |  |
| locationSourceGuide.js | backend/src/ai/jobGuide/jobs/locationSourceGuide.js | backend |  | review | NEEDS_REVIEW |  | LOCATION-SOURCE-GUIDE |  | Owner or chain unclear |  |
| offerApproval.js | backend/src/ai/jobGuide/jobs/offerApproval.js | backend |  | review | NEEDS_REVIEW |  | OFFER-APPROVAL |  | Owner or chain unclear |  |
| offerReview.js | backend/src/ai/jobGuide/jobs/offerReview.js | backend |  | review | NEEDS_REVIEW |  | OFFER-REVIEW |  | Owner or chain unclear |  |
| roleHelpGuide.js | backend/src/ai/jobGuide/jobs/roleHelpGuide.js | backend |  | review | NEEDS_REVIEW |  | ROLE-HELP-GUIDE |  | Owner or chain unclear |  |
| screenMenuGuide.js | backend/src/ai/jobGuide/jobs/screenMenuGuide.js | backend |  | review | NEEDS_REVIEW |  | SCREEN-MENU-GUIDE |  | Owner or chain unclear |  |
| telematicsDeviceCreate.js | backend/src/ai/jobGuide/jobs/telematicsDeviceCreate.js | backend |  | review | NEEDS_REVIEW |  | TELEMATICS-DEVICE-CREATE |  | Owner or chain unclear |  |
| vehicleDriverBind.js | backend/src/ai/jobGuide/jobs/vehicleDriverBind.js | backend |  | review | NEEDS_REVIEW |  | VEHICLE-DRIVER-BIND |  | Owner or chain unclear |  |
| levels.js | backend/src/ai/jobGuide/levels.js | backend |  | review | NEEDS_REVIEW |  | LEVELS |  | Owner or chain unclear |  |
| precheck.js | backend/src/ai/jobGuide/precheck.js | backend |  | review | NEEDS_REVIEW |  | PRECHECK |  | Owner or chain unclear |  |
| quickActions.js | backend/src/ai/jobGuide/quickActions.js | backend |  | review | NEEDS_REVIEW |  | QUICK-ACTIONS |  | Owner or chain unclear |  |
| registry.js | backend/src/ai/jobGuide/registry.js | backend |  | review | NEEDS_REVIEW |  | REGISTRY |  | Owner or chain unclear |  |
| screenCatalog.js | backend/src/ai/jobGuide/screenCatalog.js | backend |  | review | NEEDS_REVIEW |  | SCREEN-CATALOG |  | Owner or chain unclear |  |
| screenCatalog.roomCompany.js | backend/src/ai/jobGuide/screenCatalog.roomCompany.js | backend |  | review | NEEDS_REVIEW |  | SCREEN-CATALOG-ROOM-COMPANY |  | Owner or chain unclear |  |
| screenCatalog.shared.js | backend/src/ai/jobGuide/screenCatalog.shared.js | backend |  | review | NEEDS_REVIEW |  | SCREEN-CATALOG-SHARED |  | Owner or chain unclear |  |
| schemas.js | backend/src/ai/schemas.js | backend |  | review | NEEDS_REVIEW |  | SCHEMAS |  | Owner or chain unclear |  |
| service.js | backend/src/ai/service.js | backend | backend:m63check, root:check:etaosrm01, root:check:op01 | review | NEEDS_REVIEW |  | SERVICE |  | Owner or chain unclear |  |
| tools.js | backend/src/ai/tools.js | backend | root:check:brand, root:dev:reset | review | NEEDS_REVIEW |  | TOOLS |  | Owner or chain unclear |  |
| audit.js | backend/src/audit.js | backend | root:audit:repo, root:check:ai03bparaphraseintentaudit01, root:check:ai03bsemanticvisibleaudit01, root:check:auditlogandapprovaltrace01, root:check:cop04b, root:check:onboardingreviewfinal01, root:check:onboardingreviewfinalaudit01, root:check:productflowbuttonaudit01, root:check:testqualityandflakeaudit01, root:check:uiactionwiringaudit01, root:check:uxallpanelsrealityaudit01, root:check:uxlivepanelsmokeaudit01, root:check:uxmobileallrolespanelaudit01, root:check:uxpanelreality02c, root:check:uxsuperadminauditpanel01, root:smoke:productflowbuttonaudit01, root:smoke:uxallpanelsrealityaudit01, root:smoke:uxmobileallrolespanelaudit01 | product-extensions | NEEDS_REVIEW |  | AUDIT |  | Owner or chain unclear |  |
| driverAccessGuard.js | backend/src/auth/driverAccessGuard.js | backend |  | review | NEEDS_REVIEW |  | DRIVER-ACCESS-GUARD |  | Owner or chain unclear |  |
| google.js | backend/src/auth/google.js | backend |  | review | NEEDS_REVIEW |  | GOOGLE |  | Owner or chain unclear |  |
| jwt.js | backend/src/auth/jwt.js | backend |  | review | NEEDS_REVIEW |  | JWT |  | Owner or chain unclear |  |
| middleware.js | backend/src/auth/middleware.js | backend |  | review | NEEDS_REVIEW |  | MIDDLEWARE |  | Owner or chain unclear |  |
| passwordChangeRequirementStore.js | backend/src/auth/passwordChangeRequirementStore.js | backend |  | review | NEEDS_REVIEW |  | PASSWORD-CHANGE-REQUIREMENT-STORE |  | Owner or chain unclear |  |
| passwordPolicy.js | backend/src/auth/passwordPolicy.js | backend |  | review | NEEDS_REVIEW |  | PASSWORD-POLICY |  | Owner or chain unclear |  |
| secretVault.js | backend/src/auth/secretVault.js | backend |  | review | NEEDS_REVIEW |  | SECRET-VAULT |  | Owner or chain unclear |  |
| securityPolicy.js | backend/src/auth/securityPolicy.js | backend |  | review | NEEDS_REVIEW |  | SECURITY-POLICY |  | Owner or chain unclear |  |
| totp.js | backend/src/auth/totp.js | backend |  | review | NEEDS_REVIEW |  | TOTP |  | Owner or chain unclear |  |
| usernameDirectory.js | backend/src/auth/usernameDirectory.js | backend |  | review | NEEDS_REVIEW |  | USERNAME-DIRECTORY |  | Owner or chain unclear |  |
| rateLimits.js | backend/src/bootstrap/rateLimits.js | backend |  | review | NEEDS_REVIEW |  | RATE-LIMITS |  | Owner or chain unclear |  |
| routeFactories.js | backend/src/bootstrap/routeFactories.js | backend |  | review | NEEDS_REVIEW |  | ROUTE-FACTORIES |  | Owner or chain unclear |  |
| routeMounts.js | backend/src/bootstrap/routeMounts.js | backend |  | review | NEEDS_REVIEW |  | ROUTE-MOUNTS |  | Owner or chain unclear |  |
| env.js | backend/src/env.js | backend | mobile:check:m81.4, mobile:check:m82.6 | review | NEEDS_REVIEW |  | ENV |  | Owner or chain unclear |  |
| http.js | backend/src/errors/http.js | backend |  | review | NEEDS_REVIEW |  | HTTP |  | Owner or chain unclear |  |
| geo.js | backend/src/geo.js | backend | root:check:addressgeocodingconfidence01 | review | NEEDS_REVIEW |  | GEO |  | Owner or chain unclear |  |
| gpsStateGate.js | backend/src/gps/gpsStateGate.js | backend |  | review | NEEDS_REVIEW |  | GPS-STATE-GATE |  | Owner or chain unclear |  |
| sourceLabel.js | backend/src/gps/sourceLabel.js | backend |  | review | NEEDS_REVIEW |  | SOURCE-LABEL |  | Owner or chain unclear |  |
| sourceVisibility.js | backend/src/gps/sourceVisibility.js | backend |  | review | NEEDS_REVIEW |  | SOURCE-VISIBILITY |  | Owner or chain unclear |  |
| status.js | backend/src/gps/status.js | backend |  | review | NEEDS_REVIEW |  | STATUS |  | Owner or chain unclear |  |
| agreementMonitor.js | backend/src/jobs/agreementMonitor.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-MONITOR |  | Owner or chain unclear |  |
| agreementShiftGenerator.js | backend/src/jobs/agreementShiftGenerator.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-SHIFT-GENERATOR |  | Owner or chain unclear |  |
| autoReachedQueue.js | backend/src/jobs/autoReachedQueue.js | backend |  | review | NEEDS_REVIEW |  | AUTO-REACHED-QUEUE |  | Owner or chain unclear |  |
| autoReachedQueueAlarm.js | backend/src/jobs/autoReachedQueueAlarm.js | backend |  | review | NEEDS_REVIEW |  | AUTO-REACHED-QUEUE-ALARM |  | Owner or chain unclear |  |
| autoReachedQueueNotification.js | backend/src/jobs/autoReachedQueueNotification.js | backend |  | review | NEEDS_REVIEW |  | AUTO-REACHED-QUEUE-NOTIFICATION |  | Owner or chain unclear |  |
| autoReachedQueueProof.js | backend/src/jobs/autoReachedQueueProof.js | backend |  | review | NEEDS_REVIEW |  | AUTO-REACHED-QUEUE-PROOF |  | Owner or chain unclear |  |
| gpsStaleMonitor.js | backend/src/jobs/gpsStaleMonitor.js | backend |  | review | NEEDS_REVIEW |  | GPS-STALE-MONITOR |  | Owner or chain unclear |  |
| index.js | backend/src/jobs/index.js | backend |  | review | NEEDS_REVIEW |  | INDEX |  | Owner or chain unclear |  |
| maintenanceMonitor.js | backend/src/jobs/maintenanceMonitor.js | backend |  | review | NEEDS_REVIEW |  | MAINTENANCE-MONITOR |  | Owner or chain unclear |  |
| retentionCleanup.js | backend/src/jobs/retentionCleanup.js | backend |  | review | NEEDS_REVIEW |  | RETENTION-CLEANUP |  | Owner or chain unclear |  |
| routeLearnMonitor.js | backend/src/jobs/routeLearnMonitor.js | backend |  | review | NEEDS_REVIEW |  | ROUTE-LEARN-MONITOR |  | Owner or chain unclear |  |
| shiftCompletionMonitor.js | backend/src/jobs/shiftCompletionMonitor.js | backend |  | review | NEEDS_REVIEW |  | SHIFT-COMPLETION-MONITOR |  | Owner or chain unclear |  |
| documents.js | backend/src/kvkk/documents.js | backend |  | review | NEEDS_REVIEW |  | DOCUMENTS |  | Owner or chain unclear |  |
| enforcement.js | backend/src/kvkk/enforcement.js | backend |  | review | NEEDS_REVIEW |  | ENFORCEMENT |  | Owner or chain unclear |  |
| matrix.js | backend/src/kvkk/matrix.js | backend | root:check:ai03bsemanticvisiblelivematrix01, root:check:copilotroletaskmatrix01 | review | NEEDS_REVIEW |  | MATRIX |  | Owner or chain unclear |  |
| retention.js | backend/src/kvkk/retention.js | backend |  | review | NEEDS_REVIEW |  | RETENTION |  | Owner or chain unclear |  |
| jsonFileStore.js | backend/src/lib/jsonFileStore.js | backend |  | review | NEEDS_REVIEW |  | JSON-FILE-STORE |  | Owner or chain unclear |  |
| logger.js | backend/src/lib/logger.js | backend |  | review | NEEDS_REVIEW |  | LOGGER |  | Owner or chain unclear |  |
| penalties.js | backend/src/lib/penalties.js | backend |  | review | NEEDS_REVIEW |  | PENALTIES |  | Owner or chain unclear |  |
| reports.js | backend/src/lib/reports.js | backend |  | review | NEEDS_REVIEW |  | REPORTS |  | Owner or chain unclear |  |
| apiRequestLog.js | backend/src/middleware/apiRequestLog.js | backend |  | review | NEEDS_REVIEW |  | API-REQUEST-LOG |  | Owner or chain unclear |  |
| asyncHandler.js | backend/src/middleware/asyncHandler.js | backend |  | review | NEEDS_REVIEW |  | ASYNC-HANDLER |  | Owner or chain unclear |  |
| consentGate.js | backend/src/middleware/consentGate.js | backend |  | review | NEEDS_REVIEW |  | CONSENT-GATE |  | Owner or chain unclear |  |
| gpsThrottle1200ms.js | backend/src/middleware/gpsThrottle1200ms.js | backend |  | review | NEEDS_REVIEW |  | GPS-THROTTLE-1200-MS |  | Owner or chain unclear |  |
| rateLimitRedisStore.js | backend/src/middleware/rateLimitRedisStore.js | backend |  | review | NEEDS_REVIEW |  | RATE-LIMIT-REDIS-STORE |  | Owner or chain unclear |  |
| payloadV1.js | backend/src/notifications/payloadV1.js | backend |  | review | NEEDS_REVIEW |  | PAYLOAD-V-1 |  | Owner or chain unclear |  |
| service.js | backend/src/notifications/service.js | backend | backend:m63check, root:check:etaosrm01, root:check:op01 | review | NEEDS_REVIEW |  | SERVICE |  | Owner or chain unclear |  |
| stopProgressNotifs.js | backend/src/notifications/stopProgressNotifs.js | backend |  | review | NEEDS_REVIEW |  | STOP-PROGRESS-NOTIFS |  | Owner or chain unclear |  |
| backupArchiveOps.js | backend/src/ops/backupArchiveOps.js | backend |  | review | NEEDS_REVIEW |  | BACKUP-ARCHIVE-OPS |  | Owner or chain unclear |  |
| capacityLoadBaseline.js | backend/src/ops/capacityLoadBaseline.js | backend |  | review | NEEDS_REVIEW |  | CAPACITY-LOAD-BASELINE |  | Owner or chain unclear |  |
| commercialCoreManifest.js | backend/src/ops/commercialCoreManifest.js | backend |  | review | NEEDS_REVIEW |  | COMMERCIAL-CORE-MANIFEST |  | Owner or chain unclear |  |
| edgeSecurityBaseline.js | backend/src/ops/edgeSecurityBaseline.js | backend |  | review | NEEDS_REVIEW |  | EDGE-SECURITY-BASELINE |  | Owner or chain unclear |  |
| fieldAcceptanceManifest.js | backend/src/ops/fieldAcceptanceManifest.js | backend |  | review | NEEDS_REVIEW |  | FIELD-ACCEPTANCE-MANIFEST |  | Owner or chain unclear |  |
| fieldAcceptanceState.js | backend/src/ops/fieldAcceptanceState.js | backend |  | review | NEEDS_REVIEW |  | FIELD-ACCEPTANCE-STATE |  | Owner or chain unclear |  |
| fieldFeedbackLoop.js | backend/src/ops/fieldFeedbackLoop.js | backend |  | review | NEEDS_REVIEW |  | FIELD-FEEDBACK-LOOP |  | Owner or chain unclear |  |
| fieldPrepPacket.js | backend/src/ops/fieldPrepPacket.js | backend |  | review | NEEDS_REVIEW |  | FIELD-PREP-PACKET |  | Owner or chain unclear |  |
| naturalCopilotManifest.js | backend/src/ops/naturalCopilotManifest.js | backend |  | review | NEEDS_REVIEW |  | NATURAL-COPILOT-MANIFEST |  | Owner or chain unclear |  |
| observabilityManifest.js | backend/src/ops/observabilityManifest.js | backend |  | review | NEEDS_REVIEW |  | OBSERVABILITY-MANIFEST |  | Owner or chain unclear |  |
| operationProof.js | backend/src/ops/operationProof.js | backend |  | review | NEEDS_REVIEW |  | OPERATION-PROOF |  | Owner or chain unclear |  |
| operationVerificationManifest.js | backend/src/ops/operationVerificationManifest.js | backend |  | review | NEEDS_REVIEW |  | OPERATION-VERIFICATION-MANIFEST |  | Owner or chain unclear |  |
| operationVerificationRecordStore.js | backend/src/ops/operationVerificationRecordStore.js | backend |  | review | NEEDS_REVIEW |  | OPERATION-VERIFICATION-RECORD-STORE |  | Owner or chain unclear |  |
| paymentPreview.js | backend/src/ops/paymentPreview.js | backend |  | review | NEEDS_REVIEW |  | PAYMENT-PREVIEW |  | Owner or chain unclear |  |
| pilotLaunchGateManifest.js | backend/src/ops/pilotLaunchGateManifest.js | backend |  | review | NEEDS_REVIEW |  | PILOT-LAUNCH-GATE-MANIFEST |  | Owner or chain unclear |  |
| pilotLaunchGateState.js | backend/src/ops/pilotLaunchGateState.js | backend |  | review | NEEDS_REVIEW |  | PILOT-LAUNCH-GATE-STATE |  | Owner or chain unclear |  |
| qualityDraftScore.js | backend/src/ops/qualityDraftScore.js | backend |  | review | NEEDS_REVIEW |  | QUALITY-DRAFT-SCORE |  | Owner or chain unclear |  |
| qualityProofSignals.js | backend/src/ops/qualityProofSignals.js | backend |  | review | NEEDS_REVIEW |  | QUALITY-PROOF-SIGNALS |  | Owner or chain unclear |  |
| qualityReviewDecision.js | backend/src/ops/qualityReviewDecision.js | backend |  | review | NEEDS_REVIEW |  | QUALITY-REVIEW-DECISION |  | Owner or chain unclear |  |
| qualityReviewDecisionStore.js | backend/src/ops/qualityReviewDecisionStore.js | backend |  | review | NEEDS_REVIEW |  | QUALITY-REVIEW-DECISION-STORE |  | Owner or chain unclear |  |
| regionCapacity.js | backend/src/ops/regionCapacity.js | backend |  | review | NEEDS_REVIEW |  | REGION-CAPACITY |  | Owner or chain unclear |  |
| regionCellDeploymentBlueprint.js | backend/src/ops/regionCellDeploymentBlueprint.js | backend |  | review | NEEDS_REVIEW |  | REGION-CELL-DEPLOYMENT-BLUEPRINT |  | Owner or chain unclear |  |
| regionFailoverDrill.js | backend/src/ops/regionFailoverDrill.js | backend |  | review | NEEDS_REVIEW |  | REGION-FAILOVER-DRILL |  | Owner or chain unclear |  |
| regionNextPhasePack.js | backend/src/ops/regionNextPhasePack.js | backend |  | review | NEEDS_REVIEW |  | REGION-NEXT-PHASE-PACK |  | Owner or chain unclear |  |
| retentionBackupPolicy.js | backend/src/ops/retentionBackupPolicy.js | backend |  | review | NEEDS_REVIEW |  | RETENTION-BACKUP-POLICY |  | Owner or chain unclear |  |
| serviceEvaluationStore.js | backend/src/ops/serviceEvaluationStore.js | backend |  | review | NEEDS_REVIEW |  | SERVICE-EVALUATION-STORE |  | Owner or chain unclear |  |
| settlementReconciliationDesk.js | backend/src/ops/settlementReconciliationDesk.js | backend |  | review | NEEDS_REVIEW |  | SETTLEMENT-RECONCILIATION-DESK |  | Owner or chain unclear |  |
| ssotAlignmentManifest.js | backend/src/ops/ssotAlignmentManifest.js | backend |  | review | NEEDS_REVIEW |  | SSOT-ALIGNMENT-MANIFEST |  | Owner or chain unclear |  |
| trustQualityManifest.js | backend/src/ops/trustQualityManifest.js | backend |  | review | NEEDS_REVIEW |  | TRUST-QUALITY-MANIFEST |  | Owner or chain unclear |  |
| prisma.js | backend/src/prisma.js | backend | backend:seed | review | NEEDS_REVIEW |  | PRISMA |  | Owner or chain unclear |  |
| index.js | backend/src/redis/index.js | backend |  | review | NEEDS_REVIEW |  | INDEX |  | Owner or chain unclear |  |
| miniRedis.js | backend/src/redis/miniRedis.js | backend |  | review | NEEDS_REVIEW |  | MINI-REDIS |  | Owner or chain unclear |  |
| index.js | backend/src/region/index.js | backend |  | review | NEEDS_REVIEW |  | INDEX |  | Owner or chain unclear |  |
| ownership.js | backend/src/region/ownership.js | backend |  | review | NEEDS_REVIEW |  | OWNERSHIP |  | Owner or chain unclear |  |
| admin.js | backend/src/routes/admin.js | backend | backend:m82_10check, backend:m94dcheck, root:check:cop04bfix01, root:check:uxsuperadminauditpanel01, root:check:uxsuperadmincommercialflow01, root:check:uxsuperadminfieldacceptancecenter01, root:check:uxsuperadminfielddispatchdiscovery01, root:check:uxsuperadminlabelpolish01, root:check:uxsuperadminlivemonitoring01, root:check:uxsuperadminoverviewcleanup01, root:check:uxsuperadminpanelclarity01, root:check:uxsuperadminqualitypanel01, root:check:web01b | review | NEEDS_REVIEW |  | ADMIN |  | Owner or chain unclear |  |
| admin_logs.js | backend/src/routes/admin_logs.js | backend |  | review | NEEDS_REVIEW |  | ADMIN-LOGS |  | Owner or chain unclear |  |
| agreementExtendNegotiationRouter.js | backend/src/routes/agreementExtendNegotiationRouter.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-EXTEND-NEGOTIATION-ROUTER |  | Owner or chain unclear |  |
| agreementRouteRefreshRouter.js | backend/src/routes/agreementRouteRefreshRouter.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-ROUTE-REFRESH-ROUTER |  | Owner or chain unclear |  |
| agreements.js | backend/src/routes/agreements.js | backend | root:check:cop04afix03, root:check:uxcompanyagreementsmobileparity01, root:check:uxpremiumcriticalfixagreementsdetail01 | review | NEEDS_REVIEW |  | AGREEMENTS |  | Owner or chain unclear |  |
| agreementsHelpers.js | backend/src/routes/agreementsHelpers.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENTS-HELPERS |  | Owner or chain unclear |  |
| ai.js | backend/src/routes/ai.js | backend | backend:repo:check, backend:repo:check:chain, mobile:check:m81.2b, mobile:check:m96a, root:check:ai03bparaphraseintentaudit01, root:check:ai03bsemanticvisibleaudit01, root:check:ai03bsemanticvisiblelivematrix01, root:check:airesponsesemanticqualitygate01, root:check:cop03b, root:check:copilotairoadmap01, root:check:hotfilesplitaichatcomposers01, root:check:m99kvkk01, root:check:pay01c, root:check:product-extensions, root:check:roadmaplockaimarketplace01, root:check:uxpremiumcriticalfixagreementsdetail01, root:check:verifychain01, root:verify:closure, root:verify:docs, root:verify:hot, root:verify:repo, root:verify:web-contract | verify:repo | NEEDS_REVIEW |  | AI |  | Owner or chain unclear |  |
| auth.js | backend/src/routes/auth.js | backend | root:check:authstepupdevtoggle01, root:check:authstepupproviderlocaldefault01 | review | NEEDS_REVIEW |  | AUTH |  | Owner or chain unclear |  |
| auth_step2.js | backend/src/routes/auth_step2.js | backend |  | review | NEEDS_REVIEW |  | AUTH-STEP-2 |  | Owner or chain unclear |  |
| availability.js | backend/src/routes/availability.js | backend | mobile:check:m96a | review | NEEDS_REVIEW |  | AVAILABILITY |  | Owner or chain unclear |  |
| boardingChangeRequestOps.js | backend/src/routes/boardingChangeRequestOps.js | backend |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-REQUEST-OPS |  | Owner or chain unclear |  |
| checkin.js | backend/src/routes/checkin.js | backend |  | review | NEEDS_REVIEW |  | CHECKIN |  | Owner or chain unclear |  |
| commercialCore.js | backend/src/routes/commercialCore.js | backend |  | review | NEEDS_REVIEW |  | COMMERCIAL-CORE |  | Owner or chain unclear |  |
| companies.js | backend/src/routes/companies.js | backend |  | review | NEEDS_REVIEW |  | COMPANIES |  | Owner or chain unclear |  |
| companyHub.js | backend/src/routes/companyHub.js | backend |  | review | NEEDS_REVIEW |  | COMPANY-HUB |  | Owner or chain unclear |  |
| companyOverview.js | backend/src/routes/companyOverview.js | backend |  | review | NEEDS_REVIEW |  | COMPANY-OVERVIEW |  | Owner or chain unclear |  |
| companyPersonels.js | backend/src/routes/companyPersonels.js | backend |  | review | NEEDS_REVIEW |  | COMPANY-PERSONELS |  | Owner or chain unclear |  |
| dashboardBulk.js | backend/src/routes/dashboardBulk.js | backend |  | review | NEEDS_REVIEW |  | DASHBOARD-BULK |  | Owner or chain unclear |  |
| driver.js | backend/src/routes/driver.js | backend | backend:m95e20check, mobile:check:m48, mobile:check:m49.1, mobile:check:m95b, mobile:check:m95c, mobile:check:m95e12, mobile:check:m95e16, mobile:check:m95e19, mobile:check:m95e20, mobile:check:m95e21, mobile:check:m95e22a, mobile:check:m95e22b, mobile:check:m95e22c, mobile:check:m95e23a, mobile:check:m96a, mobile:check:m96d, root:check:boardingops01c, root:check:cop04bfix03, root:check:driverflowfinal01, root:check:roomvehicledriveruppercase01, root:check:uxroomdrivervehiclelinkdedup01 | review | NEEDS_REVIEW |  | DRIVER |  | Owner or chain unclear |  |
| drivers.js | backend/src/routes/drivers.js | backend |  | review | NEEDS_REVIEW |  | DRIVERS |  | Owner or chain unclear |  |
| eta.js | backend/src/routes/eta.js | backend | mobile:check:m49, mobile:check:m49.1, mobile:check:m95b, root:check:etaosrm01, root:check:etaosrm02, root:check:etasanity01, root:check:pay01c, root:check:uxpremiumcriticalfixagreementsdetail01 | review | NEEDS_REVIEW |  | ETA |  | Owner or chain unclear |  |
| fieldAcceptance.js | backend/src/routes/fieldAcceptance.js | backend |  | review | NEEDS_REVIEW |  | FIELD-ACCEPTANCE |  | Owner or chain unclear |  |
| geocode.js | backend/src/routes/geocode.js | backend |  | review | NEEDS_REVIEW |  | GEOCODE |  | Owner or chain unclear |  |
| gps.js | backend/src/routes/gps.js | backend | backend:bench:gps:100, backend:bench:gps:100:auto, backend:bench:gps:300:auto:panels, backend:m95e20check, mobile:check:m57.1, mobile:check:m95c, mobile:check:m95e20, mobile:check:m95e21, mobile:check:m95e23a, root:check:m95e23b, web:check:m95e20, web:check:m95e23c | web-lint | NEEDS_REVIEW |  | GPS |  | Owner or chain unclear |  |
| kvkk.js | backend/src/routes/kvkk.js | backend | mobile:check:m57.3, mobile:check:m98bcd, root:check:m99kvkk01, root:check:securitykvkkfinal01, root:check:uxkvkk01 | review | NEEDS_REVIEW |  | KVKK |  | Owner or chain unclear |  |
| live.js | backend/src/routes/live.js | backend | mobile:check:m82.5, mobile:check:m95d, root:check:ai03bsemanticvisiblelivematrix01, root:check:cop03c, root:check:cop03cfix01, root:check:cop03cfix02, root:check:cop03cfix03, root:check:cop04afix01, root:check:cop04afix03, root:check:cop04bfix01, root:check:cop04bfix05, root:check:cop04bfix07, root:check:cop04bfix08, root:check:copliveaccept01, root:check:etasanity01, root:check:livetrackingfinal01, root:check:uxlivemaptabsfix01, root:check:uxlivemaptabssimplify01, root:check:uxlivepanelpremiumsmoke01, root:check:uxlivepanelsmokeaudit01, root:check:uxparentpersonelliveerrorclarity01, root:check:uxsuperadminlivemonitoring01, root:smoke:uxlivepanelpremium01 | review | NEEDS_REVIEW |  | LIVE |  | Owner or chain unclear |  |
| logs.js | backend/src/routes/logs.js | backend |  | review | NEEDS_REVIEW |  | LOGS |  | Owner or chain unclear |  |
| me.js | backend/src/routes/me.js | backend | backend:m82_10check, backend:m82_11check, backend:m82_9check, backend:m85check, backend:m86check, backend:m87check, backend:m88check, backend:m89check, backend:m91:smoke, backend:m91:smoke:agreement, backend:m94dcheck, mobile:check:m81.2, mobile:check:m95e14, mobile:check:m95e17, mobile:check:m95e18, mobile:check:m95e24c, root:check:agreementsourceshiftlineage01, root:check:cop04afix03, root:check:cop04bfix02, root:check:copilotcontextmemorytaskstate01, root:check:copilotdemandagreement01, root:check:copiloteblockruntimeanswerintegration01, root:check:copilotofferrecommendation01, root:check:copilotshifttoagreementprep01, root:check:invitebasedmembership01, root:check:m95export01, root:check:op04, root:check:pay01a, root:check:pay01b, root:check:pay01c, root:check:pay01d, root:check:pay01e, root:check:paysafe01, root:check:uxcompanyagreementsmobileparity01, root:check:uxpremiumcriticalfixagreementsdetail01, root:check:uxsuperadmincommercialflow01, root:smoke:m98e4 | review | NEEDS_REVIEW |  | ME |  | Owner or chain unclear |  |
| naturalCopilot.js | backend/src/routes/naturalCopilot.js | backend |  | review | NEEDS_REVIEW |  | NATURAL-COPILOT |  | Owner or chain unclear |  |
| notifications.js | backend/src/routes/notifications.js | backend | mobile:check:m96b, mobile:check:m96bnotifications | review | NEEDS_REVIEW |  | NOTIFICATIONS |  | Owner or chain unclear |  |
| observability.js | backend/src/routes/observability.js | backend | root:check:observabilitymonitoringalerting01 | review | NEEDS_REVIEW |  | OBSERVABILITY |  | Owner or chain unclear |  |
| offers.js | backend/src/routes/offers.js | backend |  | review | NEEDS_REVIEW |  | OFFERS |  | Owner or chain unclear |  |
| operationProof.js | backend/src/routes/operationProof.js | backend |  | review | NEEDS_REVIEW |  | OPERATION-PROOF |  | Owner or chain unclear |  |
| operationVerification.js | backend/src/routes/operationVerification.js | backend |  | review | NEEDS_REVIEW |  | OPERATION-VERIFICATION |  | Owner or chain unclear |  |
| organization.js | backend/src/routes/organization.js | backend | root:check:uxschoolorganizationpanels01 | review | NEEDS_REVIEW |  | ORGANIZATION |  | Owner or chain unclear |  |
| parent.js | backend/src/routes/parent.js | backend | mobile:check:m95d, mobile:check:m95e24b, root:check:cop04bfix03, root:check:cop04bfix08, root:check:uxparentpersonelliveerrorclarity01 | review | NEEDS_REVIEW |  | PARENT |  | Owner or chain unclear |  |
| passengerLinks.js | backend/src/routes/passengerLinks.js | backend |  | review | NEEDS_REVIEW |  | PASSENGER-LINKS |  | Owner or chain unclear |  |
| penalties.js | backend/src/routes/penalties.js | backend |  | review | NEEDS_REVIEW |  | PENALTIES |  | Owner or chain unclear |  |
| personelAccess.js | backend/src/routes/personelAccess.js | backend |  | review | NEEDS_REVIEW |  | PERSONEL-ACCESS |  | Owner or chain unclear |  |
| personelShifts.js | backend/src/routes/personelShifts.js | backend |  | review | NEEDS_REVIEW |  | PERSONEL-SHIFTS |  | Owner or chain unclear |  |
| personels.js | backend/src/routes/personels.js | backend |  | review | NEEDS_REVIEW |  | PERSONELS |  | Owner or chain unclear |  |
| pilotLaunchGate.js | backend/src/routes/pilotLaunchGate.js | backend |  | review | NEEDS_REVIEW |  | PILOT-LAUNCH-GATE |  | Owner or chain unclear |  |
| planBuilder.js | backend/src/routes/planBuilder.js | backend |  | review | NEEDS_REVIEW |  | PLAN-BUILDER |  | Owner or chain unclear |  |
| public.js | backend/src/routes/public.js | backend | root:check:publiclanding01, root:check:publiclandingfinalpromise01, root:check:publiclandingplatformfirst01 | review | NEEDS_REVIEW |  | PUBLIC |  | Owner or chain unclear |  |
| publicLeadReview.js | backend/src/routes/publicLeadReview.js | backend |  | review | NEEDS_REVIEW |  | PUBLIC-LEAD-REVIEW |  | Owner or chain unclear |  |
| reports.js | backend/src/routes/reports.js | backend |  | review | NEEDS_REVIEW |  | REPORTS |  | Owner or chain unclear |  |
| requests.js | backend/src/routes/requests.js | backend |  | review | NEEDS_REVIEW |  | REQUESTS |  | Owner or chain unclear |  |
| rooms.js | backend/src/routes/rooms.js | backend |  | review | NEEDS_REVIEW |  | ROOMS |  | Owner or chain unclear |  |
| routeTemplates.js | backend/src/routes/routeTemplates.js | backend |  | review | NEEDS_REVIEW |  | ROUTE-TEMPLATES |  | Owner or chain unclear |  |
| schoolParentInvites.js | backend/src/routes/schoolParentInvites.js | backend |  | review | NEEDS_REVIEW |  | SCHOOL-PARENT-INVITES |  | Owner or chain unclear |  |
| company.js | backend/src/routes/shifts/company.js | backend | root:check:cop04afix03, root:check:cop04bfix02, root:check:uxcompanyagreementsmobileparity01, root:check:uxcompanymobileactionclarity01, root:check:uxcompanyopspaneltabs01, root:check:uxcompanypanelsfinalpolish01, root:check:uxcompanypanelssmoke01, root:check:uxcompanypersonelaccessmobileparity01, root:check:uxcompanyqualitytabs01, root:check:uxcompanyshiftstabs01, root:check:uxroomcompanyshiftsmobilecardfix01 | review | NEEDS_REVIEW |  | COMPANY |  | Owner or chain unclear |  |
| driver.js | backend/src/routes/shifts/driver.js | backend | backend:m95e20check, mobile:check:m48, mobile:check:m49.1, mobile:check:m95b, mobile:check:m95c, mobile:check:m95e12, mobile:check:m95e16, mobile:check:m95e19, mobile:check:m95e20, mobile:check:m95e21, mobile:check:m95e22a, mobile:check:m95e22b, mobile:check:m95e22c, mobile:check:m95e23a, mobile:check:m96a, mobile:check:m96d, root:check:boardingops01c, root:check:cop04bfix03, root:check:driverflowfinal01, root:check:roomvehicledriveruppercase01, root:check:uxroomdrivervehiclelinkdedup01 | review | NEEDS_REVIEW |  | DRIVER |  | Owner or chain unclear |  |
| helpers.js | backend/src/routes/shifts/helpers.js | backend |  | review | NEEDS_REVIEW |  | HELPERS |  | Owner or chain unclear |  |
| index.js | backend/src/routes/shifts/index.js | backend |  | review | NEEDS_REVIEW |  | INDEX |  | Owner or chain unclear |  |
| people.js | backend/src/routes/shifts/people.js | backend |  | review | NEEDS_REVIEW |  | PEOPLE |  | Owner or chain unclear |  |
| room.js | backend/src/routes/shifts/room.js | backend | backend:m97acheck, root:check:cop04bfix01, root:check:cop04bfix05, root:check:roomvehicledriveruppercase01, root:check:uxpremiumcriticalfixroom01, root:check:uxroomcompanyshiftsmobilecardfix01, root:check:uxroomdrivervehiclelinkdedup01, root:check:uxroomopspaneltabs01, root:check:uxroomopsrelationshippolish01, root:check:uxroompanelclarity01, root:check:uxroomshiftsdensitydedup01, root:check:uxroomshiftstabs01, root:check:uxroomvehiclestelematicsfix | review | NEEDS_REVIEW |  | ROOM |  | Owner or chain unclear |  |
| roomReassignNotifications.js | backend/src/routes/shifts/roomReassignNotifications.js | backend |  | review | NEEDS_REVIEW |  | ROOM-REASSIGN-NOTIFICATIONS |  | Owner or chain unclear |  |
| roomShared.js | backend/src/routes/shifts/roomShared.js | backend |  | review | NEEDS_REVIEW |  | ROOM-SHARED |  | Owner or chain unclear |  |
| schemas.js | backend/src/routes/shifts/schemas.js | backend |  | review | NEEDS_REVIEW |  | SCHEMAS |  | Owner or chain unclear |  |
| shared.js | backend/src/routes/shifts/shared.js | backend |  | review | NEEDS_REVIEW |  | SHARED |  | Owner or chain unclear |  |
| shiftsCompanyStopsRouter.js | backend/src/routes/shifts/shiftsCompanyStopsRouter.js | backend |  | review | NEEDS_REVIEW |  | SHIFTS-COMPANY-STOPS-ROUTER |  | Owner or chain unclear |  |
| shiftsRoomDispatchRouter.js | backend/src/routes/shifts/shiftsRoomDispatchRouter.js | backend |  | review | NEEDS_REVIEW |  | SHIFTS-ROOM-DISPATCH-ROUTER |  | Owner or chain unclear |  |
| ssotAlignment.js | backend/src/routes/ssotAlignment.js | backend |  | review | NEEDS_REVIEW |  | SSOT-ALIGNMENT |  | Owner or chain unclear |  |
| telematics.js | backend/src/routes/telematics.js | backend | root:check:m44telematicst1t5, root:check:telematicsproviderhub01, root:check:uxroomvehiclestelematicsfix | review | NEEDS_REVIEW |  | TELEMATICS |  | Owner or chain unclear |  |
| trustQuality.js | backend/src/routes/trustQuality.js | backend |  | review | NEEDS_REVIEW |  | TRUST-QUALITY |  | Owner or chain unclear |  |
| vehicles.js | backend/src/routes/vehicles.js | backend | backend:bench:gps:300:auto:panels, root:check:uxroomvehiclestelematicsfix | review | NEEDS_REVIEW |  | VEHICLES |  | Owner or chain unclear |  |
| server.js | backend/src/server.js | backend | backend:dev, backend:start | review | NEEDS_REVIEW |  | SERVER |  | Owner or chain unclear |  |
| agreementBroadcast.js | backend/src/services/agreementBroadcast.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-BROADCAST |  | Owner or chain unclear |  |
| agreementConflict.js | backend/src/services/agreementConflict.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-CONFLICT |  | Owner or chain unclear |  |
| agreementConflictBatch.js | backend/src/services/agreementConflictBatch.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-CONFLICT-BATCH |  | Owner or chain unclear |  |
| agreementCopy.js | backend/src/services/agreementCopy.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-COPY |  | Owner or chain unclear |  |
| agreementListView.js | backend/src/services/agreementListView.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-LIST-VIEW |  | Owner or chain unclear |  |
| agreementOfferCoverage.js | backend/src/services/agreementOfferCoverage.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-OFFER-COVERAGE |  | Owner or chain unclear |  |
| agreementOpsBridge.js | backend/src/services/agreementOpsBridge.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-OPS-BRIDGE |  | Owner or chain unclear |  |
| agreementRouteRefreshStore.js | backend/src/services/agreementRouteRefreshStore.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-ROUTE-REFRESH-STORE |  | Owner or chain unclear |  |
| agreementShiftStats.js | backend/src/services/agreementShiftStats.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-SHIFT-STATS |  | Owner or chain unclear |  |
| agreementSlots.js | backend/src/services/agreementSlots.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-SLOTS |  | Owner or chain unclear |  |
| agreementSourceLineageService.js | backend/src/services/agreementSourceLineageService.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-SOURCE-LINEAGE-SERVICE |  | Owner or chain unclear |  |
| agreementSourceShift.js | backend/src/services/agreementSourceShift.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-SOURCE-SHIFT |  | Owner or chain unclear |  |
| agreementSourceShiftGate.js | backend/src/services/agreementSourceShiftGate.js | backend |  | review | NEEDS_REVIEW |  | AGREEMENT-SOURCE-SHIFT-GATE |  | Owner or chain unclear |  |
| boardingChangeApplication.js | backend/src/services/boardingChangeApplication.js | backend |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-APPLICATION |  | Owner or chain unclear |  |
| boardingChangeRequestView.js | backend/src/services/boardingChangeRequestView.js | backend |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-REQUEST-VIEW |  | Owner or chain unclear |  |
| boardingChangeRouteRefresh.js | backend/src/services/boardingChangeRouteRefresh.js | backend |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-ROUTE-REFRESH |  | Owner or chain unclear |  |
| boardingRouteImpactPreview.js | backend/src/services/boardingRouteImpactPreview.js | backend |  | review | NEEDS_REVIEW |  | BOARDING-ROUTE-IMPACT-PREVIEW |  | Owner or chain unclear |  |
| clusterStops.js | backend/src/services/clusterStops.js | backend |  | review | NEEDS_REVIEW |  | CLUSTER-STOPS |  | Owner or chain unclear |  |
| companyShiftMutationTail.js | backend/src/services/companyShiftMutationTail.js | backend |  | review | NEEDS_REVIEW |  | COMPANY-SHIFT-MUTATION-TAIL |  | Owner or chain unclear |  |
| companyShiftValidation.js | backend/src/services/companyShiftValidation.js | backend |  | review | NEEDS_REVIEW |  | COMPANY-SHIFT-VALIDATION |  | Owner or chain unclear |  |
| dashboardBulk.js | backend/src/services/dashboardBulk.js | backend |  | review | NEEDS_REVIEW |  | DASHBOARD-BULK |  | Owner or chain unclear |  |
| dispatchRepack.js | backend/src/services/dispatchRepack.js | backend |  | review | NEEDS_REVIEW |  | DISPATCH-REPACK |  | Owner or chain unclear |  |
| geoState.js | backend/src/services/geoState.js | backend |  | review | NEEDS_REVIEW |  | GEO-STATE |  | Owner or chain unclear |  |
| osrmMatch.js | backend/src/services/osrmMatch.js | backend |  | review | NEEDS_REVIEW |  | OSRM-MATCH |  | Owner or chain unclear |  |
| osrmRoute.js | backend/src/services/osrmRoute.js | backend |  | review | NEEDS_REVIEW |  | OSRM-ROUTE |  | Owner or chain unclear |  |
| osrmTable.js | backend/src/services/osrmTable.js | backend |  | review | NEEDS_REVIEW |  | OSRM-TABLE |  | Owner or chain unclear |  |
| paymentBackbone.js | backend/src/services/paymentBackbone.js | backend |  | review | NEEDS_REVIEW |  | PAYMENT-BACKBONE |  | Owner or chain unclear |  |
| paymentBackboneAccounts.js | backend/src/services/paymentBackboneAccounts.js | backend |  | review | NEEDS_REVIEW |  | PAYMENT-BACKBONE-ACCOUNTS |  | Owner or chain unclear |  |
| paymentBackboneWriteGate.js | backend/src/services/paymentBackboneWriteGate.js | backend |  | review | NEEDS_REVIEW |  | PAYMENT-BACKBONE-WRITE-GATE |  | Owner or chain unclear |  |
| planSolve.js | backend/src/services/planSolve.js | backend |  | review | NEEDS_REVIEW |  | PLAN-SOLVE |  | Owner or chain unclear |  |
| platformFeePreviewService.js | backend/src/services/platformFeePreviewService.js | backend |  | review | NEEDS_REVIEW |  | PLATFORM-FEE-PREVIEW-SERVICE |  | Owner or chain unclear |  |
| publicLeadService.js | backend/src/services/publicLeadService.js | backend |  | review | NEEDS_REVIEW |  | PUBLIC-LEAD-SERVICE |  | Owner or chain unclear |  |
| qualityPaymentBridgeService.js | backend/src/services/qualityPaymentBridgeService.js | backend |  | review | NEEDS_REVIEW |  | QUALITY-PAYMENT-BRIDGE-SERVICE |  | Owner or chain unclear |  |
| reservationConflict.js | backend/src/services/reservationConflict.js | backend |  | review | NEEDS_REVIEW |  | RESERVATION-CONFLICT |  | Owner or chain unclear |  |
| roomPoolPlanner.js | backend/src/services/roomPoolPlanner.js | backend |  | review | NEEDS_REVIEW |  | ROOM-POOL-PLANNER |  | Owner or chain unclear |  |
| routeEtaService.js | backend/src/services/routeEtaService.js | backend |  | review | NEEDS_REVIEW |  | ROUTE-ETA-SERVICE |  | Owner or chain unclear |  |
| routeLearning.js | backend/src/services/routeLearning.js | backend |  | review | NEEDS_REVIEW |  | ROUTE-LEARNING |  | Owner or chain unclear |  |
| seferScoreService.js | backend/src/services/seferScoreService.js | backend |  | review | NEEDS_REVIEW |  | SEFER-SCORE-SERVICE |  | Owner or chain unclear |  |
| shiftConflict.js | backend/src/services/shiftConflict.js | backend |  | review | NEEDS_REVIEW |  | SHIFT-CONFLICT |  | Owner or chain unclear |  |
| shiftConflictBatch.js | backend/src/services/shiftConflictBatch.js | backend |  | review | NEEDS_REVIEW |  | SHIFT-CONFLICT-BATCH |  | Owner or chain unclear |  |
| shiftPackage.js | backend/src/services/shiftPackage.js | backend |  | review | NEEDS_REVIEW |  | SHIFT-PACKAGE |  | Owner or chain unclear |  |
| shiftRouteState.js | backend/src/services/shiftRouteState.js | backend |  | review | NEEDS_REVIEW |  | SHIFT-ROUTE-STATE |  | Owner or chain unclear |  |
| hash.js | backend/src/telematics/hash.js | backend |  | review | NEEDS_REVIEW |  | HASH |  | Owner or chain unclear |  |
| providers.js | backend/src/telematics/providers.js | backend |  | review | NEEDS_REVIEW |  | PROVIDERS |  | Owner or chain unclear |  |
| service.js | backend/src/telematics/service.js | backend | backend:m63check, root:check:etaosrm01, root:check:op01 | review | NEEDS_REVIEW |  | SERVICE |  | Owner or chain unclear |  |
| tr.js | backend/src/time/tr.js | backend | backend:m63check, backend:m82_1accept, backend:m82_2check, backend:spec16check, root:check:ai03bsemanticvisiblelivematrix01, root:check:auditlogandapprovaltrace01, root:check:boardingchangerequestentry01, root:check:cop04afix02, root:check:cop04afix04, root:check:copilotroletaskmatrix01, root:check:etasanity01, root:check:livetrackingfinal01, root:check:uxcontractconversionopsbridgeclarity01, root:check:uxpanelstructure02, root:check:uxpanelstructure02b, root:verify:web-contract | review | NEEDS_REVIEW |  | TR |  | Owner or chain unclear |  |
| responseCache.js | backend/src/utils/responseCache.js | backend |  | review | NEEDS_REVIEW |  | RESPONSE-CACHE |  | Owner or chain unclear |  |
| validators.js | backend/src/validators.js | backend |  | review | NEEDS_REVIEW |  | VALIDATORS |  | Owner or chain unclear |  |
| scope.js | backend/src/ws/scope.js | backend |  | review | NEEDS_REVIEW |  | SCOPE |  | Owner or chain unclear |  |
| socketRelay.js | backend/src/ws/socketRelay.js | backend |  | review | NEEDS_REVIEW |  | SOCKET-RELAY |  | Owner or chain unclear |  |
| z.js | backend/src/z.js | backend | root:check:roomvehicledriveruppercase01, root:check:seferabiterminalhumanize01, root:check:uxschoolorganizationpanels01, root:check:uxsmokepassminuszero01 | review | NEEDS_REVIEW |  | Z |  | Owner or chain unclear |  |
| copilot_shift_to_agreement_prep_01_check.js | backend/scripts/copilot_shift_to_agreement_prep_01_check.js | backend | root:check:copilotshifttoagreementprep01 | review | NEEDS_REVIEW |  | COPILOT-SHIFT-TO-AGREEMENT-PREP-01-CHECK |  | Owner or chain unclear |  |
| copilotShiftToAgreementPrep.js | backend/src/ai/chat/copilotShiftToAgreementPrep.js | backend |  | review | NEEDS_REVIEW |  | COPILOT-SHIFT-TO-AGREEMENT-PREP |  | Owner or chain unclear |  |

### Web
| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| web:dev | web/package.json | web | vite | env | REQUIRES_ENV | REQUIRES_ENV | WEB-DEV |  | Fails without env or external service | web package |
| web:build | web/package.json | web | vite build | env | REQUIRES_ENV | REQUIRES_ENV | WEB-BUILD |  | Fails without env or external service | web package |
| web:check:m95e20 | web/package.json | web | node scripts/m95_e20_web_gps_source_badge_check.js | web-lint | ACTIVE_WEB_LINT |  | WEB-CHECK-M-95-E-20 |  | Breaks frontend/web lint gate | web package |
| web:check:m95e23c | web/package.json | web | node scripts/m95_e23c_web_gps_source_visibility_check.js | web-lint | ACTIVE_WEB_LINT |  | WEB-CHECK-M-95-E-23-C |  | Breaks frontend/web lint gate | web package |
| web:check:m98e2c | web/package.json | web | node scripts/m98_e2c_personel_access_web_check.js | web-lint | ACTIVE_WEB_LINT |  | WEB-CHECK-M-98-E-2-C |  | Breaks frontend/web lint gate | web package |
| web:check:web-mobile | web/package.json | web | node scripts/web_mobile_responsive_check.js | web-lint | ACTIVE_WEB_LINT |  | WEB-CHECK-WEB-MOBILE |  | Breaks frontend/web lint gate | web package |
| web:lint | web/package.json | web | eslint . | web-lint | ACTIVE_WEB_LINT |  | WEB-LINT |  | Breaks frontend/web lint gate | web package |
| web:preview | web/package.json | web | vite preview | env | REQUIRES_ENV | REQUIRES_ENV | WEB-PREVIEW |  | Fails without env or external service | web package |
| eslint.config.js | web/eslint.config.js | web |  | review | NEEDS_REVIEW |  | ESLINT-CONFIG |  | Owner or chain unclear |  |
| m47_4_mobile_readiness_web_pass_check.js | web/scripts/m47_4_mobile_readiness_web_pass_check.js | web |  | web-lint | ACTIVE_WEB_LINT |  | M-47-4-MOBILE-READINESS-WEB-PASS-CHECK |  | Owner or chain unclear | frontend/web script |
| m48_5_room_company_tablet_readiness_check.js | web/scripts/m48_5_room_company_tablet_readiness_check.js | web |  | web-lint | ACTIVE_WEB_LINT |  | M-48-5-ROOM-COMPANY-TABLET-READINESS-CHECK |  | Owner or chain unclear | frontend/web script |
| m82_8_company_shifts_runtime_guard_check.cjs | web/scripts/m82_8_company_shifts_runtime_guard_check.cjs | web |  | web-lint | ACTIVE_WEB_LINT |  | M-82-8-COMPANY-SHIFTS-RUNTIME-GUARD-CHECK |  | Owner or chain unclear | frontend/web script |
| m95_e20_web_gps_source_badge_check.js | web/scripts/m95_e20_web_gps_source_badge_check.js | web | web:check:m95e20 | web-lint | ACTIVE_WEB_LINT |  | M-95-E-20-WEB-GPS-SOURCE-BADGE-CHECK |  | Owner or chain unclear | frontend/web script |
| m95_e23c_web_gps_source_visibility_check.js | web/scripts/m95_e23c_web_gps_source_visibility_check.js | web | web:check:m95e23c | web-lint | ACTIVE_WEB_LINT |  | M-95-E-23-C-WEB-GPS-SOURCE-VISIBILITY-CHECK |  | Owner or chain unclear | frontend/web script |
| m98_e2c_personel_access_web_check.js | web/scripts/m98_e2c_personel_access_web_check.js | web | web:check:m98e2c | web-lint | ACTIVE_WEB_LINT |  | M-98-E-2-C-PERSONEL-ACCESS-WEB-CHECK |  | Owner or chain unclear | frontend/web script |
| web_mobile_responsive_check.js | web/scripts/web_mobile_responsive_check.js | web | web:check:web-mobile | web-lint | ACTIVE_WEB_LINT |  | WEB-MOBILE-RESPONSIVE-CHECK |  | Owner or chain unclear | frontend/web script |
| api.js | web/src/api.js | web | mobile:check:m95e2, mobile:check:m95e6, root:check:dbpoolandapiscaling01, root:check:etaosrm02 | review | NEEDS_REVIEW |  | API |  | Owner or chain unclear |  |
| uiSurface.js | web/src/components/copilot/uiSurface.js | web |  | review | NEEDS_REVIEW |  | UI-SURFACE |  | Owner or chain unclear |  |
| stopTimelineUtils.js | web/src/components/stopTimelineUtils.js | web |  | review | NEEDS_REVIEW |  | STOP-TIMELINE-UTILS |  | Owner or chain unclear |  |
| brand.js | web/src/config/brand.js | web | root:check:brand, root:check:docsbrandcleanup01, root:check:uxbrandloginpremium01 | review | NEEDS_REVIEW |  | BRAND |  | Owner or chain unclear |  |
| screenRegistry.js | web/src/copilot/screenRegistry.js | web |  | review | NEEDS_REVIEW |  | SCREEN-REGISTRY |  | Owner or chain unclear |  |
| logger.js | web/src/lib/logger.js | web |  | review | NEEDS_REVIEW |  | LOGGER |  | Owner or chain unclear |  |
| vehicleMarkerC.js | web/src/lib/markers/vehicleMarkerC.js | web |  | review | NEEDS_REVIEW |  | VEHICLE-MARKER-C |  | Owner or chain unclear |  |
| bus.js | web/src/live/bus.js | web |  | review | NEEDS_REVIEW |  | BUS |  | Owner or chain unclear |  |
| useAutoReload.js | web/src/live/useAutoReload.js | web |  | review | NEEDS_REVIEW |  | USE-AUTO-RELOAD |  | Owner or chain unclear |  |
| ws.js | web/src/live/ws.js | web |  | review | NEEDS_REVIEW |  | WS |  | Owner or chain unclear |  |
| agreementWizardPacks.js | web/src/panels/company/agreementWizardPacks.js | web |  | review | NEEDS_REVIEW |  | AGREEMENT-WIZARD-PACKS |  | Owner or chain unclear |  |
| companyAgreementsPanelHelpers.js | web/src/panels/company/companyAgreementsPanelHelpers.js | web |  | review | NEEDS_REVIEW |  | COMPANY-AGREEMENTS-PANEL-HELPERS |  | Owner or chain unclear |  |
| companyShiftsPanelActions.js | web/src/panels/company/companyShiftsPanelActions.js | web |  | review | NEEDS_REVIEW |  | COMPANY-SHIFTS-PANEL-ACTIONS |  | Owner or chain unclear |  |
| companyShiftsPanelSelectors.js | web/src/panels/company/companyShiftsPanelSelectors.js | web |  | review | NEEDS_REVIEW |  | COMPANY-SHIFTS-PANEL-SELECTORS |  | Owner or chain unclear |  |
| companyShiftsPanelStateHelpers.js | web/src/panels/company/companyShiftsPanelStateHelpers.js | web |  | review | NEEDS_REVIEW |  | COMPANY-SHIFTS-PANEL-STATE-HELPERS |  | Owner or chain unclear |  |
| companyShiftsPanelUtils.js | web/src/panels/company/companyShiftsPanelUtils.js | web |  | review | NEEDS_REVIEW |  | COMPANY-SHIFTS-PANEL-UTILS |  | Owner or chain unclear |  |
| guidedPlanModalActions.js | web/src/panels/company/guidedPlanModalActions.js | web |  | review | NEEDS_REVIEW |  | GUIDED-PLAN-MODAL-ACTIONS |  | Owner or chain unclear |  |
| guidedPlanModalDestinationHelpers.js | web/src/panels/company/guidedPlanModalDestinationHelpers.js | web |  | review | NEEDS_REVIEW |  | GUIDED-PLAN-MODAL-DESTINATION-HELPERS |  | Owner or chain unclear |  |
| guidedPlanModalUtils.js | web/src/panels/company/guidedPlanModalUtils.js | web |  | review | NEEDS_REVIEW |  | GUIDED-PLAN-MODAL-UTILS |  | Owner or chain unclear |  |
| planBuilderPanelActions.js | web/src/panels/company/planBuilderPanelActions.js | web |  | review | NEEDS_REVIEW |  | PLAN-BUILDER-PANEL-ACTIONS |  | Owner or chain unclear |  |
| planBuilderPanelUtils.js | web/src/panels/company/planBuilderPanelUtils.js | web |  | review | NEEDS_REVIEW |  | PLAN-BUILDER-PANEL-UTILS |  | Owner or chain unclear |  |
| planBuilderPanelWorkflow.js | web/src/panels/company/planBuilderPanelWorkflow.js | web |  | review | NEEDS_REVIEW |  | PLAN-BUILDER-PANEL-WORKFLOW |  | Owner or chain unclear |  |
| shiftPeopleTabActions.js | web/src/panels/company/shiftPeopleTabActions.js | web |  | review | NEEDS_REVIEW |  | SHIFT-PEOPLE-TAB-ACTIONS |  | Owner or chain unclear |  |
| shiftPeopleTabUtils.js | web/src/panels/company/shiftPeopleTabUtils.js | web |  | review | NEEDS_REVIEW |  | SHIFT-PEOPLE-TAB-UTILS |  | Owner or chain unclear |  |
| shiftsPanelOfferUtils.js | web/src/panels/company/shiftsPanelOfferUtils.js | web |  | review | NEEDS_REVIEW |  | SHIFTS-PANEL-OFFER-UTILS |  | Owner or chain unclear |  |
| roomAgreementsPanelHelpers.js | web/src/panels/room/roomAgreementsPanelHelpers.js | web |  | review | NEEDS_REVIEW |  | ROOM-AGREEMENTS-PANEL-HELPERS |  | Owner or chain unclear |  |
| roomShiftsPanelActions.js | web/src/panels/room/roomShiftsPanelActions.js | web |  | review | NEEDS_REVIEW |  | ROOM-SHIFTS-PANEL-ACTIONS |  | Owner or chain unclear |  |
| roomShiftsPanelHelpers.js | web/src/panels/room/roomShiftsPanelHelpers.js | web |  | review | NEEDS_REVIEW |  | ROOM-SHIFTS-PANEL-HELPERS |  | Owner or chain unclear |  |
| roomShiftsPanelUtils.js | web/src/panels/room/roomShiftsPanelUtils.js | web |  | review | NEEDS_REVIEW |  | ROOM-SHIFTS-PANEL-UTILS |  | Owner or chain unclear |  |
| roomShiftsPanelWorkflow.js | web/src/panels/room/roomShiftsPanelWorkflow.js | web |  | review | NEEDS_REVIEW |  | ROOM-SHIFTS-PANEL-WORKFLOW |  | Owner or chain unclear |  |
| roomVehiclesPanelActions.js | web/src/panels/room/roomVehiclesPanelActions.js | web |  | review | NEEDS_REVIEW |  | ROOM-VEHICLES-PANEL-ACTIONS |  | Owner or chain unclear |  |
| roomVehiclesPanelUtils.js | web/src/panels/room/roomVehiclesPanelUtils.js | web |  | review | NEEDS_REVIEW |  | ROOM-VEHICLES-PANEL-UTILS |  | Owner or chain unclear |  |
| useRoomVehicleTelematics.js | web/src/panels/room/useRoomVehicleTelematics.js | web |  | review | NEEDS_REVIEW |  | USE-ROOM-VEHICLE-TELEMATICS |  | Owner or chain unclear |  |
| boardingChangeUi.js | web/src/panels/shared/boardingChangeUi.js | web |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-UI |  | Owner or chain unclear |  |
| operationsDigestUtils.js | web/src/panels/shared/operationsDigestUtils.js | web |  | review | NEEDS_REVIEW |  | OPERATIONS-DIGEST-UTILS |  | Owner or chain unclear |  |
| commercialCorePanelActions.js | web/src/panels/superadmin/commercialCorePanelActions.js | web |  | review | NEEDS_REVIEW |  | COMMERCIAL-CORE-PANEL-ACTIONS |  | Owner or chain unclear |  |
| commercialCorePanelOptionalStates.js | web/src/panels/superadmin/commercialCorePanelOptionalStates.js | web |  | review | NEEDS_REVIEW |  | COMMERCIAL-CORE-PANEL-OPTIONAL-STATES |  | Owner or chain unclear |  |
| commercialCorePanelUtils.js | web/src/panels/superadmin/commercialCorePanelUtils.js | web |  | review | NEEDS_REVIEW |  | COMMERCIAL-CORE-PANEL-UTILS |  | Owner or chain unclear |  |
| router.js | web/src/router.js | web | root:check:m98e4b | review | NEEDS_REVIEW |  | ROUTER |  | Owner or chain unclear |  |
| sessionContext.js | web/src/state/sessionContext.js | web |  | review | NEEDS_REVIEW |  | SESSION-CONTEXT |  | Owner or chain unclear |  |
| agreementCopilotFacts.js | web/src/utils/agreementCopilotFacts.js | web |  | review | NEEDS_REVIEW |  | AGREEMENT-COPILOT-FACTS |  | Owner or chain unclear |  |
| agreementLabels.js | web/src/utils/agreementLabels.js | web |  | review | NEEDS_REVIEW |  | AGREEMENT-LABELS |  | Owner or chain unclear |  |
| agreementOriginLink.js | web/src/utils/agreementOriginLink.js | web |  | review | NEEDS_REVIEW |  | AGREEMENT-ORIGIN-LINK |  | Owner or chain unclear |  |
| agreementPrefill.js | web/src/utils/agreementPrefill.js | web |  | review | NEEDS_REVIEW |  | AGREEMENT-PREFILL |  | Owner or chain unclear |  |
| agreementUi.js | web/src/utils/agreementUi.js | web |  | review | NEEDS_REVIEW |  | AGREEMENT-UI |  | Owner or chain unclear |  |
| apiContract.js | web/src/utils/apiContract.js | web |  | review | NEEDS_REVIEW |  | API-CONTRACT |  | Owner or chain unclear |  |
| apiFallback.js | web/src/utils/apiFallback.js | web |  | review | NEEDS_REVIEW |  | API-FALLBACK |  | Owner or chain unclear |  |
| checkinToken.js | web/src/utils/checkinToken.js | web |  | review | NEEDS_REVIEW |  | CHECKIN-TOKEN |  | Owner or chain unclear |  |
| companyDataHub.js | web/src/utils/companyDataHub.js | web |  | review | NEEDS_REVIEW |  | COMPANY-DATA-HUB |  | Owner or chain unclear |  |
| copilotFacts.js | web/src/utils/copilotFacts.js | web |  | review | NEEDS_REVIEW |  | COPILOT-FACTS |  | Owner or chain unclear |  |
| copilotPanelHelpers.js | web/src/utils/copilotPanelHelpers.js | web |  | review | NEEDS_REVIEW |  | COPILOT-PANEL-HELPERS |  | Owner or chain unclear |  |
| copilotSelection.js | web/src/utils/copilotSelection.js | web |  | review | NEEDS_REVIEW |  | COPILOT-SELECTION |  | Owner or chain unclear |  |
| dashboardBulk.js | web/src/utils/dashboardBulk.js | web |  | review | NEEDS_REVIEW |  | DASHBOARD-BULK |  | Owner or chain unclear |  |
| displayStatus.js | web/src/utils/displayStatus.js | web |  | review | NEEDS_REVIEW |  | DISPLAY-STATUS |  | Owner or chain unclear |  |
| etaSanity.js | web/src/utils/etaSanity.js | web |  | review | NEEDS_REVIEW |  | ETA-SANITY |  | Owner or chain unclear |  |
| gpsSource.js | web/src/utils/gpsSource.js | web |  | review | NEEDS_REVIEW |  | GPS-SOURCE |  | Owner or chain unclear |  |
| gpsSourceVisibility.js | web/src/utils/gpsSourceVisibility.js | web |  | review | NEEDS_REVIEW |  | GPS-SOURCE-VISIBILITY |  | Owner or chain unclear |  |
| labels.js | web/src/utils/labels.js | web |  | review | NEEDS_REVIEW |  | LABELS |  | Owner or chain unclear |  |
| listUi.js | web/src/utils/listUi.js | web |  | review | NEEDS_REVIEW |  | LIST-UI |  | Owner or chain unclear |  |
| liveTrackingCopy.js | web/src/utils/liveTrackingCopy.js | web |  | review | NEEDS_REVIEW |  | LIVE-TRACKING-COPY |  | Owner or chain unclear |  |
| navigation.js | web/src/utils/navigation.js | web | mobile:check:m95e22b | review | NEEDS_REVIEW |  | NAVIGATION |  | Owner or chain unclear |  |
| notificationV1.js | web/src/utils/notificationV1.js | web |  | review | NEEDS_REVIEW |  | NOTIFICATION-V-1 |  | Owner or chain unclear |  |
| offerQualityRanking.js | web/src/utils/offerQualityRanking.js | web |  | review | NEEDS_REVIEW |  | OFFER-QUALITY-RANKING |  | Owner or chain unclear |  |
| offlineQueue.js | web/src/utils/offlineQueue.js | web |  | review | NEEDS_REVIEW |  | OFFLINE-QUEUE |  | Owner or chain unclear |  |
| paths.js | web/src/utils/paths.js | web |  | review | NEEDS_REVIEW |  | PATHS |  | Owner or chain unclear |  |
| planCenterOverlayLayer.js | web/src/utils/planCenterOverlayLayer.js | web |  | review | NEEDS_REVIEW |  | PLAN-CENTER-OVERLAY-LAYER |  | Owner or chain unclear |  |
| providerScores.js | web/src/utils/providerScores.js | web |  | review | NEEDS_REVIEW |  | PROVIDER-SCORES |  | Owner or chain unclear |  |
| publicBaseUrl.js | web/src/utils/publicBaseUrl.js | web |  | review | NEEDS_REVIEW |  | PUBLIC-BASE-URL |  | Owner or chain unclear |  |
| regionOwnership.js | web/src/utils/regionOwnership.js | web |  | review | NEEDS_REVIEW |  | REGION-OWNERSHIP |  | Owner or chain unclear |  |
| routePreviewSummary.js | web/src/utils/routePreviewSummary.js | web |  | review | NEEDS_REVIEW |  | ROUTE-PREVIEW-SUMMARY |  | Owner or chain unclear |  |
| safeDriveSummary.js | web/src/utils/safeDriveSummary.js | web |  | review | NEEDS_REVIEW |  | SAFE-DRIVE-SUMMARY |  | Owner or chain unclear |  |
| safeParseJson.js | web/src/utils/safeParseJson.js | web |  | review | NEEDS_REVIEW |  | SAFE-PARSE-JSON |  | Owner or chain unclear |  |
| shiftRoutePreview.js | web/src/utils/shiftRoutePreview.js | web |  | review | NEEDS_REVIEW |  | SHIFT-ROUTE-PREVIEW |  | Owner or chain unclear |  |
| statusBadge.js | web/src/utils/statusBadge.js | web |  | review | NEEDS_REVIEW |  | STATUS-BADGE |  | Owner or chain unclear |  |
| statusPalette.js | web/src/utils/statusPalette.js | web |  | review | NEEDS_REVIEW |  | STATUS-PALETTE |  | Owner or chain unclear |  |
| stepUp.js | web/src/utils/stepUp.js | web | root:check:authstepupdevtoggle01, root:check:authstepupproviderlocaldefault01 | review | NEEDS_REVIEW |  | STEP-UP |  | Owner or chain unclear |  |
| time.js | web/src/utils/time.js | web | mobile:check:m81.2, mobile:check:m95e18, root:check:copiloteblockruntimeanswerintegration01, root:check:m95export01, root:smoke:m98e4 | review | NEEDS_REVIEW |  | TIME |  | Owner or chain unclear |  |
| uiDataCache.js | web/src/utils/uiDataCache.js | web |  | review | NEEDS_REVIEW |  | UI-DATA-CACHE |  | Owner or chain unclear |  |
| uiStatus.js | web/src/utils/uiStatus.js | web |  | review | NEEDS_REVIEW |  | UI-STATUS |  | Owner or chain unclear |  |
| vite.config.js | web/vite.config.js | web |  | review | NEEDS_REVIEW |  | VITE-CONFIG |  | Owner or chain unclear |  |

### Mobile
| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile:build:simulator:ios | mobile/package.json | mobile | npx eas-cli build --profile preview-simulator --platform ios | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-SIMULATOR-IOS |  | Fails without device/emulator | mobile package |
| mobile:build:production:ios | mobile/package.json | mobile | npx eas-cli build --profile production --platform ios | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PRODUCTION-IOS |  | Fails without device/emulator | mobile package |
| mobile:build:android:apk | mobile/package.json | mobile | npm run build:preview:android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-ANDROID-APK |  | Fails without device/emulator | mobile package |
| mobile:build:android:local-apk | mobile/package.json | mobile | npx eas-cli build --profile local-apk --platform android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-ANDROID-LOCAL-APK |  | Fails without device/emulator | mobile package |
| mobile:build:android:aab | mobile/package.json | mobile | npm run build:production:android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-ANDROID-AAB |  | Fails without device/emulator | mobile package |
| mobile:doctor:expo | mobile/package.json | mobile | node scripts/run_expo_doctor.js | mobile-release | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | MOBILE-DOCTOR-EXPO |  | Breaks release / evidence / closure gate | mobile package |
| mobile:check:m49 | mobile/package.json | mobile | node scripts/m49_mobile_beta_hardening_check.js | review | ACTIVE |  | MOBILE-CHECK-M-49 |  | Owner or chain unclear | mobile package |
| mobile:check:m95b | mobile/package.json | mobile | node scripts/m95_b_driver_task_route_eta_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-B |  | Owner or chain unclear | mobile package |
| mobile:check:m95e0 | mobile/package.json | mobile | node scripts/m95_e0_android_build_readiness_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-0 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e1 | mobile/package.json | mobile | node scripts/m95_e1_app_styles_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-1 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e2 | mobile/package.json | mobile | node scripts/m95_e2_android_local_api_profile_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-2 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e6 | mobile/package.json | mobile | node scripts/m95_e6_api_base_join_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-6 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e7 | mobile/package.json | mobile | node scripts/m95_e7_android_cleartext_local_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-7 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e8 | mobile/package.json | mobile | node scripts/m95_e8_android_network_security_local_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-8 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e9 | mobile/package.json | mobile | node scripts/m95_e9_android_first_render_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-9 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e12 | mobile/package.json | mobile | node scripts/m95_e12_post_login_driver_shell_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-12 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e13 | mobile/package.json | mobile | node scripts/m95_e13_app_effect_crash_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-13 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e14 | mobile/package.json | mobile | node scripts/m95_e14_lifecycle_named_imports_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-14 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e15 | mobile/package.json | mobile | node scripts/m95_e15_pin_change_layout_submit_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-15 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e16 | mobile/package.json | mobile | node scripts/m95_e16_driver_shell_loading_loop_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-16 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e17 | mobile/package.json | mobile | node scripts/m95_e17_me_request_loop_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-17 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e18 | mobile/package.json | mobile | node scripts/m95_e18_missing_ref_runtime_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-18 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e19 | mobile/package.json | mobile | node scripts/m95_e19_driver_ui_turkish_polish_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-19 |  | Owner or chain unclear | mobile package |
| mobile:check:mobiletext01 | mobile/package.json | mobile | node scripts/mobile_text_01_activation_copy_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-CHECK-MOBILETEXT-01 |  | Fails without device/emulator | mobile package |
| mobile:check:m95e22a | mobile/package.json | mobile | node scripts/m95_e22a_driver_premium_ui_shell_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-22-A |  | Owner or chain unclear | mobile package |
| mobile:check:m95e22b | mobile/package.json | mobile | node scripts/m95_e22b_driver_route_navigation_premium_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-22-B |  | Owner or chain unclear | mobile package |
| mobile:check:m95e22c | mobile/package.json | mobile | node scripts/m95_e22c_driver_premium_ui_shell_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-22-C |  | Owner or chain unclear | mobile package |
| mobile:check:m95e23a | mobile/package.json | mobile | node scripts/m95_e23a_driver_phone_gps_standby_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-23-A |  | Owner or chain unclear | mobile package |
| mobile:check:m95e20 | mobile/package.json | mobile | node scripts/m95_e20_driver_phone_gps_button_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-20 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e21 | mobile/package.json | mobile | node scripts/m95_e21_driver_phone_gps_shift_resolver_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-21 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e24a | mobile/package.json | mobile | node scripts/m95_e24a_common_login_role_resolver_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-24-A |  | Owner or chain unclear | mobile package |
| mobile:check:m95e24b | mobile/package.json | mobile | node scripts/m95_e24b_personel_parent_premium_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-24-B |  | Owner or chain unclear | mobile package |
| mobile:check:m95e24c | mobile/package.json | mobile | node scripts/m95_e24c_management_role_summary_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-24-C |  | Owner or chain unclear | mobile package |
| mobile:check:m95e10 | mobile/package.json | mobile | node scripts/m95_e10_login_403_error_parse_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-10 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e4 | mobile/package.json | mobile | node scripts/m95_e4_login_payload_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-4 |  | Owner or chain unclear | mobile package |
| mobile:check:m95e5 | mobile/package.json | mobile | node scripts/m95_e5_login_diagnostics_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-E-5 |  | Owner or chain unclear | mobile package |
| mobile:check:m96b | mobile/package.json | mobile | node scripts/m96_b_notifications_check.js | review | ACTIVE |  | MOBILE-CHECK-M-96-B |  | Owner or chain unclear | mobile package |
| mobile:check:m96bnotifications | mobile/package.json | mobile | node scripts/m96_b_notifications_check.js | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | MOBILE-CHECK-M-96-BNOTIFICATIONS | check:m96b | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:check:m95c | mobile/package.json | mobile | node scripts/m95_c_driver_phone_gps_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-C |  | Owner or chain unclear | mobile package |
| mobile:check:m95d | mobile/package.json | mobile | node scripts/m95_d_personel_parent_live_check.js | review | ACTIVE |  | MOBILE-CHECK-M-95-D |  | Owner or chain unclear | mobile package |
| mobile:check:m96c | mobile/package.json | mobile | node scripts/m96_c_boarding_change_check.js | review | ACTIVE |  | MOBILE-CHECK-M-96-C |  | Owner or chain unclear | mobile package |
| mobile:check:m96d | mobile/package.json | mobile | node scripts/m96_d_driver_change_awareness_check.js | review | ACTIVE |  | MOBILE-CHECK-M-96-D |  | Owner or chain unclear | mobile package |
| mobile:check:m96a | mobile/package.json | mobile | node scripts/m96_a_driver_availability_check.js | review | ACTIVE |  | MOBILE-CHECK-M-96-A |  | Owner or chain unclear | mobile package |
| mobile:check:m98a | mobile/package.json | mobile | node scripts/m98_a_personel_activation_model_check.js | review | ACTIVE |  | MOBILE-CHECK-M-98-A |  | Owner or chain unclear | mobile package |
| mobile:check:m98e1 | mobile/package.json | mobile | node scripts/m98_e1_mobile_force_password_change_check.js | review | ACTIVE |  | MOBILE-CHECK-M-98-E-1 |  | Owner or chain unclear | mobile package |
| mobile:check:m98e2d | mobile/package.json | mobile | node scripts/m98_e2d_mobile_code_pin_login_check.js | review | ACTIVE |  | MOBILE-CHECK-M-98-E-2-D |  | Owner or chain unclear | mobile package |
| mobile:check:m98bcd | mobile/package.json | mobile | node scripts/m98_bcd_activation_kvkk_check.js | review | ACTIVE |  | MOBILE-CHECK-M-98-BCD |  | Owner or chain unclear | mobile package |
| mobile:check:m99a | mobile/package.json | mobile | node scripts/m99_a_mobile_regression_pack_check.js | review | ACTIVE |  | MOBILE-CHECK-M-99-A |  | Owner or chain unclear | mobile package |
| mobile:check:m99b | mobile/package.json | mobile | node scripts/m99_b_real_scenario_tests_check.js | review | ACTIVE |  | MOBILE-CHECK-M-99-B |  | Owner or chain unclear | mobile package |
| mobile:check:m99c | mobile/package.json | mobile | node scripts/m99_c_field_launch_readiness_check.js | review | ACTIVE |  | MOBILE-CHECK-M-99-C |  | Owner or chain unclear | mobile package |
| mobile:check:m81.4 | mobile/package.json | mobile | node scripts/m81_4_release_env_discipline_check.js | review | ACTIVE |  | MOBILE-CHECK-M-81-4 |  | Owner or chain unclear | mobile package |
| mobile:check:m82.4 | mobile/package.json | mobile | node scripts/m82_4_bg_offline_hardening_check.js | review | ACTIVE |  | MOBILE-CHECK-M-82-4 |  | Owner or chain unclear | mobile package |
| mobile:check:m82.5 | mobile/package.json | mobile | node scripts/m82_5_live_location_source_priority_check.js | review | ACTIVE |  | MOBILE-CHECK-M-82-5 |  | Owner or chain unclear | mobile package |
| mobile:check:m81.2b | mobile/package.json | mobile | node scripts/m81_2b_bundle_chain_check.js | review | ACTIVE |  | MOBILE-CHECK-M-81-2-B |  | Owner or chain unclear | mobile package |
| mobile:check:m81.2 | mobile/package.json | mobile | node scripts/m81_2_background_runtime_check.js | review | ACTIVE |  | MOBILE-CHECK-M-81-2 |  | Owner or chain unclear | mobile package |
| mobile:build:internal:android | mobile/package.json | mobile | npx eas-cli build --profile preview --platform android | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | MOBILE-BUILD-INTERNAL-ANDROID | build:preview:android | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:check:m50 | mobile/package.json | mobile | node scripts/m50_mobile_release_readiness_check.js | review | ACTIVE |  | MOBILE-CHECK-M-50 |  | Owner or chain unclear | mobile package |
| mobile:check:m9 | mobile/package.json | mobile | node scripts/m9_push_decision_gate_check.js | review | ACTIVE |  | MOBILE-CHECK-M-9 |  | Owner or chain unclear | mobile package |
| mobile:build:production:android | mobile/package.json | mobile | npx eas-cli build --profile production --platform android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PRODUCTION-ANDROID |  | Fails without device/emulator | mobile package |
| mobile:android | mobile/package.json | mobile | expo run:android | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-ANDROID |  | Fails without env or external service | mobile package |
| mobile:check:m48 | mobile/package.json | mobile | node scripts/m48_driver_mobile_foundation_check.js | review | ACTIVE |  | MOBILE-CHECK-M-48 |  | Owner or chain unclear | mobile package |
| mobile:start | mobile/package.json | mobile | expo start | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-START |  | Fails without env or external service | mobile package |
| mobile:check:m1 | mobile/package.json | mobile | npm run check:m48 && npm run check:m49 && npm run check:m49.1 && npm run check:m95b && npm run check:m95c && npm run check:m95d && npm run check:m95e0 && npm run check:m95e1 && npm run check:m95e2 && npm run check:m95e4 && npm run check:m95e5 && npm run check:m95e6 && npm run check:m95e7 && npm run check:m95e8 && npm run check:m95e9 && npm run check:m95e10 && npm run check:m95e12 && npm run check:m95e13 && npm run check:m95e14 && npm run check:m95e15 && npm run check:m95e16 && npm run check:m95e17 && npm run check:m95e18 && npm run check:m95e19 && npm run check:m95e22a && npm run check:m95e22b && npm run check:m95e22c && npm run check:m95e23a && npm run check:m95e20 && npm run check:m95e21 && npm run check:m95e24a && npm run check:m95e24b && npm run check:m95e24c && npm run check:m98e1 && npm run check:m98e2d && npm run check:m96a && npm run check:m98a && npm run check:m98bcd && npm run check:m99a && npm run check:m99b && npm run check:m99c && npm run check:m50 && npm run check:m57.1 && npm run check:m57.2 && npm run check:m57.3 && npm run check:m57.4 && npm run doctor:mobile && npm run acceptance:mobile | review | ACTIVE |  | MOBILE-CHECK-M-1 |  | Owner or chain unclear | mobile package |
| mobile:check:m10 | mobile/package.json | mobile | node scripts/m10_mobile_field_acceptance_pack_check.js | review | ACTIVE |  | MOBILE-CHECK-M-10 |  | Owner or chain unclear | mobile package |
| mobile:check:m3 | mobile/package.json | mobile | node scripts/m3_snapshot_local_storage_separation_check.js | review | ACTIVE |  | MOBILE-CHECK-M-3 |  | Owner or chain unclear | mobile package |
| mobile:doctor:mobile | mobile/package.json | mobile | npm run doctor:expo && npm run check:m3 && npm run check:m81.2 && npm run check:m81.2b && npm run check:m81.3 && npm run check:m81.4 && npm run check:m82.4 && npm run check:m82.5 && npm run check:m82.6 && npm run check:m82.7 && npm run check:m82.8 | mobile-release | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | MOBILE-DOCTOR-MOBILE |  | Breaks release / evidence / closure gate | mobile package |
| mobile:check:m81.3 | mobile/package.json | mobile | node scripts/m81_3_ios_readiness_check.js | review | ACTIVE |  | MOBILE-CHECK-M-81-3 |  | Owner or chain unclear | mobile package |
| mobile:check:m57.1 | mobile/package.json | mobile | node scripts/m57_1_foreground_gps_publish_check.js | review | ACTIVE |  | MOBILE-CHECK-M-57-1 |  | Owner or chain unclear | mobile package |
| mobile:check:m57.4 | mobile/package.json | mobile | node scripts/m57_4_android_preview_internal_build_check.js | review | ACTIVE |  | MOBILE-CHECK-M-57-4 |  | Owner or chain unclear | mobile package |
| mobile:build:internal:ios | mobile/package.json | mobile | npx eas-cli build --profile preview --platform ios | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | MOBILE-BUILD-INTERNAL-IOS | build:preview:ios | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:check:m57.3 | mobile/package.json | mobile | node scripts/m57_3_session_kvkk_blocking_check.js | review | ACTIVE |  | MOBILE-CHECK-M-57-3 |  | Owner or chain unclear | mobile package |
| mobile:build:preview:android | mobile/package.json | mobile | npx eas-cli build --profile preview --platform android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PREVIEW-ANDROID |  | Fails without device/emulator | mobile package |
| mobile:web | mobile/package.json | mobile | expo start --web | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-WEB |  | Fails without env or external service | mobile package |
| mobile:check:m49.1 | mobile/package.json | mobile | node scripts/m49_1_driver_voice_guidance_stop_eta_check.js | review | ACTIVE |  | MOBILE-CHECK-M-49-1 |  | Owner or chain unclear | mobile package |
| mobile:build:preview:ios | mobile/package.json | mobile | npx eas-cli build --profile preview --platform ios | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PREVIEW-IOS |  | Fails without device/emulator | mobile package |
| mobile:ios | mobile/package.json | mobile | expo run:ios | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-IOS |  | Fails without env or external service | mobile package |
| mobile:check:m57.2 | mobile/package.json | mobile | node scripts/m57_2_offline_online_recovery_check.js | review | ACTIVE |  | MOBILE-CHECK-M-57-2 |  | Owner or chain unclear | mobile package |
| mobile:check:m82.6 | mobile/package.json | mobile | node scripts/m82_6_release_env_acceptance_check.js | review | ACTIVE |  | MOBILE-CHECK-M-82-6 |  | Owner or chain unclear | mobile package |
| mobile:acceptance:mobile | mobile/package.json | mobile | npm run check:m57.2 && npm run check:m81.2 && npm run check:m82.4 && npm run check:m82.5 && npm run check:m82.6 && npm run check:m82.7 && npm run check:m82.8 && npm run check:m95e0 && npm run check:m95e1 && npm run check:m95e2 && npm run check:m95e4 && npm run check:m95e5 && npm run check:m95e6 && npm run check:m95e7 && npm run check:m95e8 && npm run check:m95e9 && npm run check:m95e10 && npm run check:m95e12 && npm run check:m95e13 && npm run check:m95e14 && npm run check:m95e15 && npm run check:m95e16 && npm run check:m95e17 && npm run check:m95e18 && npm run check:m95e19 && npm run check:m95e22a && npm run check:m95e22b && npm run check:m95e22c && npm run check:m95e23a && npm run check:m95e20 && npm run check:m95e21 && npm run check:m95e24a && npm run check:m95e24b && npm run check:m95e24c && npm run check:m98e1 && npm run check:m98e2d && npm run check:m96b && npm run check:m96c && npm run check:m96d && npm run check:m98a && npm run check:m98bcd && npm run check:m99a && npm run check:m99b && npm run check:m99c && npm run check:mobiletext01 | review | NEEDS_REVIEW |  | MOBILE-ACCEPTANCE-MOBILE |  | Owner or chain unclear | mobile package |
| mobile:check:m82.7 | mobile/package.json | mobile | node scripts/m82_7_repo_hygiene_cleanup_check.js | review | ACTIVE |  | MOBILE-CHECK-M-82-7 |  | Owner or chain unclear | mobile package |
| mobile:check:m82.8 | mobile/package.json | mobile | node scripts/m82_8_verification_2_0_check.js | review | ACTIVE |  | MOBILE-CHECK-M-82-8 |  | Owner or chain unclear | mobile package |
| App.js | mobile/App.js | mobile | mobile:check:m95e1, mobile:check:m95e13, root:check:auditlogandapprovaltrace01, root:check:boardingops01b, root:check:copilothumanapproval01, root:check:copilotroutereviewhumanapproval01, root:check:shiftdispatchapprovalfix01 | review | NEEDS_REVIEW |  | APP |  | Owner or chain unclear |  |
| app.config.js | mobile/app.config.js | mobile |  | review | NEEDS_REVIEW |  | APP-CONFIG |  | Owner or chain unclear |  |
| babel.config.js | mobile/babel.config.js | mobile |  | review | NEEDS_REVIEW |  | BABEL-CONFIG |  | Owner or chain unclear |  |
| metro.config.js | mobile/metro.config.js | mobile |  | review | NEEDS_REVIEW |  | METRO-CONFIG |  | Owner or chain unclear |  |
| withLocalEmulatorNetworkSecurity.js | mobile/plugins/withLocalEmulatorNetworkSecurity.js | mobile |  | review | NEEDS_REVIEW |  | WITH-LOCAL-EMULATOR-NETWORK-SECURITY |  | Owner or chain unclear |  |
| m10_mobile_field_acceptance_pack_check.js | mobile/scripts/m10_mobile_field_acceptance_pack_check.js | mobile | mobile:check:m10 | mobile | ACTIVE |  | M-10-MOBILE-FIELD-ACCEPTANCE-PACK-CHECK |  | Owner or chain unclear | mobile script |
| m3_snapshot_local_storage_separation_check.js | mobile/scripts/m3_snapshot_local_storage_separation_check.js | mobile | mobile:check:m3 | mobile | ACTIVE |  | M-3-SNAPSHOT-LOCAL-STORAGE-SEPARATION-CHECK |  | Owner or chain unclear | mobile script |
| m48_driver_mobile_foundation_check.js | mobile/scripts/m48_driver_mobile_foundation_check.js | mobile | mobile:check:m48 | mobile | ACTIVE |  | M-48-DRIVER-MOBILE-FOUNDATION-CHECK |  | Owner or chain unclear | mobile script |
| m49_1_driver_voice_guidance_stop_eta_check.js | mobile/scripts/m49_1_driver_voice_guidance_stop_eta_check.js | mobile | mobile:check:m49.1 | mobile | ACTIVE |  | M-49-1-DRIVER-VOICE-GUIDANCE-STOP-ETA-CHECK |  | Owner or chain unclear | mobile script |
| m49_1_driver_voice_guidance_stop_eta_check.mjs | mobile/scripts/m49_1_driver_voice_guidance_stop_eta_check.mjs | mobile | mobile:check:m49.1 | mobile | ACTIVE |  | M-49-1-DRIVER-VOICE-GUIDANCE-STOP-ETA-CHECK |  | Owner or chain unclear | mobile script |
| m49_mobile_beta_hardening_check.js | mobile/scripts/m49_mobile_beta_hardening_check.js | mobile | mobile:check:m49 | mobile | ACTIVE |  | M-49-MOBILE-BETA-HARDENING-CHECK |  | Owner or chain unclear | mobile script |
| m50_mobile_release_readiness_check.js | mobile/scripts/m50_mobile_release_readiness_check.js | mobile | mobile:check:m50 | mobile | REQUIRES_DEVICE |  | M-50-MOBILE-RELEASE-READINESS-CHECK |  | Owner or chain unclear | mobile script |
| m57_1_foreground_gps_publish_check.js | mobile/scripts/m57_1_foreground_gps_publish_check.js | mobile | mobile:check:m57.1 | mobile | ACTIVE |  | M-57-1-FOREGROUND-GPS-PUBLISH-CHECK |  | Owner or chain unclear | mobile script |
| m57_2_offline_online_recovery_check.js | mobile/scripts/m57_2_offline_online_recovery_check.js | mobile | mobile:check:m57.2 | mobile | ACTIVE |  | M-57-2-OFFLINE-ONLINE-RECOVERY-CHECK |  | Owner or chain unclear | mobile script |
| m57_3_session_kvkk_blocking_check.js | mobile/scripts/m57_3_session_kvkk_blocking_check.js | mobile | mobile:check:m57.3 | mobile | REQUIRES_AUTH_SESSION |  | M-57-3-SESSION-KVKK-BLOCKING-CHECK |  | Owner or chain unclear | mobile script |
| m57_4_android_preview_internal_build_check.js | mobile/scripts/m57_4_android_preview_internal_build_check.js | mobile | mobile:check:m57.4 | mobile | REQUIRES_DEVICE |  | M-57-4-ANDROID-PREVIEW-INTERNAL-BUILD-CHECK |  | Owner or chain unclear | mobile script |
| m81_2_background_runtime_check.js | mobile/scripts/m81_2_background_runtime_check.js | mobile | mobile:check:m81.2 | mobile | ACTIVE |  | M-81-2-BACKGROUND-RUNTIME-CHECK |  | Owner or chain unclear | mobile script |
| m81_2b_bundle_chain_check.js | mobile/scripts/m81_2b_bundle_chain_check.js | mobile | mobile:check:m81.2b | mobile | ACTIVE |  | M-81-2-B-BUNDLE-CHAIN-CHECK |  | Owner or chain unclear | mobile script |
| m81_2c_appjs_syntax_fix_check.js | mobile/scripts/m81_2c_appjs_syntax_fix_check.js | mobile |  | mobile | ACTIVE |  | M-81-2-C-APPJS-SYNTAX-FIX-CHECK |  | Owner or chain unclear | mobile script |
| m81_3_ios_readiness_check.js | mobile/scripts/m81_3_ios_readiness_check.js | mobile | mobile:check:m81.3 | mobile | REQUIRES_DEVICE |  | M-81-3-IOS-READINESS-CHECK |  | Owner or chain unclear | mobile script |
| m81_4_release_env_discipline_check.js | mobile/scripts/m81_4_release_env_discipline_check.js | mobile | mobile:check:m81.4 | mobile | ACTIVE |  | M-81-4-RELEASE-ENV-DISCIPLINE-CHECK |  | Owner or chain unclear | mobile script |
| m82_4_bg_offline_hardening_check.js | mobile/scripts/m82_4_bg_offline_hardening_check.js | mobile | mobile:check:m82.4 | mobile | ACTIVE |  | M-82-4-BG-OFFLINE-HARDENING-CHECK |  | Owner or chain unclear | mobile script |
| m82_5_live_location_source_priority_check.js | mobile/scripts/m82_5_live_location_source_priority_check.js | mobile | mobile:check:m82.5 | mobile | ACTIVE |  | M-82-5-LIVE-LOCATION-SOURCE-PRIORITY-CHECK |  | Owner or chain unclear | mobile script |
| m82_6_release_env_acceptance_check.js | mobile/scripts/m82_6_release_env_acceptance_check.js | mobile | mobile:check:m82.6 | mobile | REQUIRES_DEVICE |  | M-82-6-RELEASE-ENV-ACCEPTANCE-CHECK |  | Owner or chain unclear | mobile script |
| m82_7_repo_hygiene_cleanup_check.js | mobile/scripts/m82_7_repo_hygiene_cleanup_check.js | mobile | mobile:check:m82.7 | mobile | REQUIRES_DEVICE |  | M-82-7-REPO-HYGIENE-CLEANUP-CHECK |  | Owner or chain unclear | mobile script |
| m82_8_verification_2_0_check.js | mobile/scripts/m82_8_verification_2_0_check.js | mobile | mobile:check:m82.8 | mobile | REQUIRES_DEVICE |  | M-82-8-VERIFICATION-2-0-CHECK |  | Owner or chain unclear | mobile script |
| m95_b_driver_task_route_eta_check.js | mobile/scripts/m95_b_driver_task_route_eta_check.js | mobile | mobile:check:m95b | mobile | ACTIVE |  | M-95-B-DRIVER-TASK-ROUTE-ETA-CHECK |  | Owner or chain unclear | mobile script |
| m95_c_driver_phone_gps_check.js | mobile/scripts/m95_c_driver_phone_gps_check.js | mobile | mobile:check:m95c | mobile | ACTIVE |  | M-95-C-DRIVER-PHONE-GPS-CHECK |  | Owner or chain unclear | mobile script |
| m95_d_personel_parent_live_check.js | mobile/scripts/m95_d_personel_parent_live_check.js | mobile | mobile:check:m95d | mobile | ACTIVE |  | M-95-D-PERSONEL-PARENT-LIVE-CHECK |  | Owner or chain unclear | mobile script |
| m95_e0_android_build_readiness_check.js | mobile/scripts/m95_e0_android_build_readiness_check.js | mobile | mobile:check:m95e0 | mobile | ACTIVE |  | M-95-E-0-ANDROID-BUILD-READINESS-CHECK |  | Owner or chain unclear | mobile script |
| m95_e10_login_403_error_parse_check.js | mobile/scripts/m95_e10_login_403_error_parse_check.js | mobile | mobile:check:m95e10 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-10-LOGIN-403-ERROR-PARSE-CHECK |  | Owner or chain unclear | mobile script |
| m95_e12_post_login_driver_shell_check.js | mobile/scripts/m95_e12_post_login_driver_shell_check.js | mobile | mobile:check:m95e12 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-12-POST-LOGIN-DRIVER-SHELL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e13_app_effect_crash_check.js | mobile/scripts/m95_e13_app_effect_crash_check.js | mobile | mobile:check:m95e13 | mobile | ACTIVE |  | M-95-E-13-APP-EFFECT-CRASH-CHECK |  | Owner or chain unclear | mobile script |
| m95_e14_lifecycle_named_imports_check.js | mobile/scripts/m95_e14_lifecycle_named_imports_check.js | mobile | mobile:check:m95e14 | mobile | ACTIVE |  | M-95-E-14-LIFECYCLE-NAMED-IMPORTS-CHECK |  | Owner or chain unclear | mobile script |
| m95_e15_pin_change_layout_submit_check.js | mobile/scripts/m95_e15_pin_change_layout_submit_check.js | mobile | mobile:check:m95e15 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-15-PIN-CHANGE-LAYOUT-SUBMIT-CHECK |  | Owner or chain unclear | mobile script |
| m95_e16_driver_shell_loading_loop_check.js | mobile/scripts/m95_e16_driver_shell_loading_loop_check.js | mobile | mobile:check:m95e16 | mobile | ACTIVE |  | M-95-E-16-DRIVER-SHELL-LOADING-LOOP-CHECK |  | Owner or chain unclear | mobile script |
| m95_e17_me_request_loop_check.js | mobile/scripts/m95_e17_me_request_loop_check.js | mobile | mobile:check:m95e17 | mobile | ACTIVE |  | M-95-E-17-ME-REQUEST-LOOP-CHECK |  | Owner or chain unclear | mobile script |
| m95_e18_missing_ref_runtime_check.js | mobile/scripts/m95_e18_missing_ref_runtime_check.js | mobile | mobile:check:m95e18 | mobile | ACTIVE |  | M-95-E-18-MISSING-REF-RUNTIME-CHECK |  | Owner or chain unclear | mobile script |
| m95_e19_driver_ui_turkish_polish_check.js | mobile/scripts/m95_e19_driver_ui_turkish_polish_check.js | mobile | mobile:check:m95e19 | mobile | ACTIVE |  | M-95-E-19-DRIVER-UI-TURKISH-POLISH-CHECK |  | Owner or chain unclear | mobile script |
| m95_e1_app_styles_check.js | mobile/scripts/m95_e1_app_styles_check.js | mobile | mobile:check:m95e1 | mobile | ACTIVE |  | M-95-E-1-APP-STYLES-CHECK |  | Owner or chain unclear | mobile script |
| m95_e20_driver_phone_gps_button_check.js | mobile/scripts/m95_e20_driver_phone_gps_button_check.js | mobile | mobile:check:m95e20 | mobile | REQUIRES_DEVICE |  | M-95-E-20-DRIVER-PHONE-GPS-BUTTON-CHECK |  | Owner or chain unclear | mobile script |
| m95_e21_driver_phone_gps_shift_resolver_check.js | mobile/scripts/m95_e21_driver_phone_gps_shift_resolver_check.js | mobile | mobile:check:m95e21 | mobile | REQUIRES_DEVICE |  | M-95-E-21-DRIVER-PHONE-GPS-SHIFT-RESOLVER-CHECK |  | Owner or chain unclear | mobile script |
| m95_e22a_driver_premium_ui_shell_check.js | mobile/scripts/m95_e22a_driver_premium_ui_shell_check.js | mobile | mobile:check:m95e22a | mobile | REQUIRES_DEVICE |  | M-95-E-22-A-DRIVER-PREMIUM-UI-SHELL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e22b_driver_route_navigation_premium_check.js | mobile/scripts/m95_e22b_driver_route_navigation_premium_check.js | mobile | mobile:check:m95e22b | mobile | REQUIRES_DEVICE |  | M-95-E-22-B-DRIVER-ROUTE-NAVIGATION-PREMIUM-CHECK |  | Owner or chain unclear | mobile script |
| m95_e22c_driver_premium_ui_shell_check.js | mobile/scripts/m95_e22c_driver_premium_ui_shell_check.js | mobile | mobile:check:m95e22c | mobile | REQUIRES_DEVICE |  | M-95-E-22-C-DRIVER-PREMIUM-UI-SHELL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e23a_driver_phone_gps_standby_check.js | mobile/scripts/m95_e23a_driver_phone_gps_standby_check.js | mobile | mobile:check:m95e23a | mobile | REQUIRES_DEVICE |  | M-95-E-23-A-DRIVER-PHONE-GPS-STANDBY-CHECK |  | Owner or chain unclear | mobile script |
| m95_e24a_common_login_role_resolver_check.js | mobile/scripts/m95_e24a_common_login_role_resolver_check.js | mobile | mobile:check:m95e24a | mobile | REQUIRES_DEVICE |  | M-95-E-24-A-COMMON-LOGIN-ROLE-RESOLVER-CHECK |  | Owner or chain unclear | mobile script |
| m95_e24b_personel_parent_premium_check.js | mobile/scripts/m95_e24b_personel_parent_premium_check.js | mobile | mobile:check:m95e24b | mobile | REQUIRES_DEVICE |  | M-95-E-24-B-PERSONEL-PARENT-PREMIUM-CHECK |  | Owner or chain unclear | mobile script |
| m95_e24c_management_role_summary_check.js | mobile/scripts/m95_e24c_management_role_summary_check.js | mobile | mobile:check:m95e24c | mobile | REQUIRES_DEVICE |  | M-95-E-24-C-MANAGEMENT-ROLE-SUMMARY-CHECK |  | Owner or chain unclear | mobile script |
| m95_e2_android_local_api_profile_check.js | mobile/scripts/m95_e2_android_local_api_profile_check.js | mobile | mobile:check:m95e2 | mobile | ACTIVE |  | M-95-E-2-ANDROID-LOCAL-API-PROFILE-CHECK |  | Owner or chain unclear | mobile script |
| m95_e4_login_payload_check.js | mobile/scripts/m95_e4_login_payload_check.js | mobile | mobile:check:m95e4 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-4-LOGIN-PAYLOAD-CHECK |  | Owner or chain unclear | mobile script |
| m95_e5_login_diagnostics_check.js | mobile/scripts/m95_e5_login_diagnostics_check.js | mobile | mobile:check:m95e5 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-5-LOGIN-DIAGNOSTICS-CHECK |  | Owner or chain unclear | mobile script |
| m95_e6_api_base_join_check.js | mobile/scripts/m95_e6_api_base_join_check.js | mobile | mobile:check:m95e6 | mobile | ACTIVE |  | M-95-E-6-API-BASE-JOIN-CHECK |  | Owner or chain unclear | mobile script |
| m95_e7_android_cleartext_local_check.js | mobile/scripts/m95_e7_android_cleartext_local_check.js | mobile | mobile:check:m95e7 | mobile | ACTIVE |  | M-95-E-7-ANDROID-CLEARTEXT-LOCAL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e8_android_network_security_local_check.js | mobile/scripts/m95_e8_android_network_security_local_check.js | mobile | mobile:check:m95e8 | mobile | ACTIVE |  | M-95-E-8-ANDROID-NETWORK-SECURITY-LOCAL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e9_android_first_render_check.js | mobile/scripts/m95_e9_android_first_render_check.js | mobile | mobile:check:m95e9 | mobile | ACTIVE |  | M-95-E-9-ANDROID-FIRST-RENDER-CHECK |  | Owner or chain unclear | mobile script |
| m96_a_driver_availability_check.js | mobile/scripts/m96_a_driver_availability_check.js | mobile | mobile:check:m96a | mobile | ACTIVE |  | M-96-A-DRIVER-AVAILABILITY-CHECK |  | Owner or chain unclear | mobile script |
| m96_b_driver_task_route_eta_check.js | mobile/scripts/m96_b_driver_task_route_eta_check.js | mobile |  | mobile | ACTIVE |  | M-96-B-DRIVER-TASK-ROUTE-ETA-CHECK |  | Owner or chain unclear | mobile script |
| m96_b_notifications_check.js | mobile/scripts/m96_b_notifications_check.js | mobile | mobile:check:m96b, mobile:check:m96bnotifications | mobile | ACTIVE |  | M-96-B-NOTIFICATIONS-CHECK |  | Owner or chain unclear | mobile script |
| m96_c_boarding_change_check.js | mobile/scripts/m96_c_boarding_change_check.js | mobile | mobile:check:m96c | mobile | ACTIVE |  | M-96-C-BOARDING-CHANGE-CHECK |  | Owner or chain unclear | mobile script |
| m96_d_driver_change_awareness_check.js | mobile/scripts/m96_d_driver_change_awareness_check.js | mobile | mobile:check:m96d | mobile | ACTIVE |  | M-96-D-DRIVER-CHANGE-AWARENESS-CHECK |  | Owner or chain unclear | mobile script |
| m98_a_personel_activation_model_check.js | mobile/scripts/m98_a_personel_activation_model_check.js | mobile | mobile:check:m98a | mobile | ACTIVE |  | M-98-A-PERSONEL-ACTIVATION-MODEL-CHECK |  | Owner or chain unclear | mobile script |
| m98_bcd_activation_kvkk_check.js | mobile/scripts/m98_bcd_activation_kvkk_check.js | mobile | mobile:check:m98bcd | mobile | REQUIRES_AUTH_SESSION |  | M-98-BCD-ACTIVATION-KVKK-CHECK |  | Owner or chain unclear | mobile script |
| m98_e1_mobile_force_password_change_check.js | mobile/scripts/m98_e1_mobile_force_password_change_check.js | mobile | mobile:check:m98e1 | mobile | ACTIVE |  | M-98-E-1-MOBILE-FORCE-PASSWORD-CHANGE-CHECK |  | Owner or chain unclear | mobile script |
| m98_e2d_mobile_code_pin_login_check.js | mobile/scripts/m98_e2d_mobile_code_pin_login_check.js | mobile | mobile:check:m98e2d | mobile | REQUIRES_AUTH_SESSION |  | M-98-E-2-D-MOBILE-CODE-PIN-LOGIN-CHECK |  | Owner or chain unclear | mobile script |
| m99_a_mobile_regression_pack_check.js | mobile/scripts/m99_a_mobile_regression_pack_check.js | mobile | mobile:check:m99a | mobile | ACTIVE |  | M-99-A-MOBILE-REGRESSION-PACK-CHECK |  | Owner or chain unclear | mobile script |
| m99_b_real_scenario_tests_check.js | mobile/scripts/m99_b_real_scenario_tests_check.js | mobile | mobile:check:m99b | mobile | ACTIVE |  | M-99-B-REAL-SCENARIO-TESTS-CHECK |  | Owner or chain unclear | mobile script |
| m99_c_field_launch_readiness_check.js | mobile/scripts/m99_c_field_launch_readiness_check.js | mobile | mobile:check:m99c | mobile | ACTIVE |  | M-99-C-FIELD-LAUNCH-READINESS-CHECK |  | Owner or chain unclear | mobile script |
| m9_push_decision_gate_check.js | mobile/scripts/m9_push_decision_gate_check.js | mobile | mobile:check:m9 | mobile | ACTIVE |  | M-9-PUSH-DECISION-GATE-CHECK |  | Owner or chain unclear | mobile script |
| mobile_text_01_activation_copy_check.js | mobile/scripts/mobile_text_01_activation_copy_check.js | mobile | mobile:check:mobiletext01 | mobile | ACTIVE |  | MOBILE-TEXT-01-ACTIVATION-COPY-CHECK |  | Owner or chain unclear | mobile script |
| run_expo_doctor.js | mobile/scripts/run_expo_doctor.js | mobile | mobile:doctor:expo | mobile | ACTIVE |  | RUN-EXPO-DOCTOR |  | Owner or chain unclear | mobile script |
| MobileAppContent.js | mobile/src/app/MobileAppContent.js | mobile |  | review | NEEDS_REVIEW |  | MOBILE-APP-CONTENT |  | Owner or chain unclear |  |
| boardingChangeRequestBridge.js | mobile/src/app/boardingChangeRequestBridge.js | mobile |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-REQUEST-BRIDGE |  | Owner or chain unclear |  |
| boardingChangeState.js | mobile/src/app/boardingChangeState.js | mobile |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-STATE |  | Owner or chain unclear |  |
| driverAvailabilityState.js | mobile/src/app/driverAvailabilityState.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-AVAILABILITY-STATE |  | Owner or chain unclear |  |
| driverAwarenessState.js | mobile/src/app/driverAwarenessState.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-AWARENESS-STATE |  | Owner or chain unclear |  |
| kvkkVisibilityMatrixState.js | mobile/src/app/kvkkVisibilityMatrixState.js | mobile |  | review | NEEDS_REVIEW |  | KVKK-VISIBILITY-MATRIX-STATE |  | Owner or chain unclear |  |
| linkAccessState.js | mobile/src/app/linkAccessState.js | mobile |  | review | NEEDS_REVIEW |  | LINK-ACCESS-STATE |  | Owner or chain unclear |  |
| mobileAppFlow.js | mobile/src/app/mobileAppFlow.js | mobile |  | review | NEEDS_REVIEW |  | MOBILE-APP-FLOW |  | Owner or chain unclear |  |
| mobileAppHandlers.js | mobile/src/app/mobileAppHandlers.js | mobile |  | review | NEEDS_REVIEW |  | MOBILE-APP-HANDLERS |  | Owner or chain unclear |  |
| mobileAppState.js | mobile/src/app/mobileAppState.js | mobile |  | review | NEEDS_REVIEW |  | MOBILE-APP-STATE |  | Owner or chain unclear |  |
| notificationState.js | mobile/src/app/notificationState.js | mobile |  | review | NEEDS_REVIEW |  | NOTIFICATION-STATE |  | Owner or chain unclear |  |
| parentActivationState.js | mobile/src/app/parentActivationState.js | mobile |  | review | NEEDS_REVIEW |  | PARENT-ACTIVATION-STATE |  | Owner or chain unclear |  |
| personelActivationState.js | mobile/src/app/personelActivationState.js | mobile |  | review | NEEDS_REVIEW |  | PERSONEL-ACTIVATION-STATE |  | Owner or chain unclear |  |
| roleLiveState.js | mobile/src/app/roleLiveState.js | mobile |  | review | NEEDS_REVIEW |  | ROLE-LIVE-STATE |  | Owner or chain unclear |  |
| useDriverRealtimeResync.js | mobile/src/app/useDriverRealtimeResync.js | mobile |  | review | NEEDS_REVIEW |  | USE-DRIVER-REALTIME-RESYNC |  | Owner or chain unclear |  |
| useMobileAppLifecycle.js | mobile/src/app/useMobileAppLifecycle.js | mobile |  | review | NEEDS_REVIEW |  | USE-MOBILE-APP-LIFECYCLE |  | Owner or chain unclear |  |
| api.js | mobile/src/lib/api.js | mobile | mobile:check:m95e2, mobile:check:m95e6, root:check:dbpoolandapiscaling01, root:check:etaosrm02 | review | NEEDS_REVIEW |  | API |  | Owner or chain unclear |  |
| backgroundGps.js | mobile/src/lib/backgroundGps.js | mobile |  | review | NEEDS_REVIEW |  | BACKGROUND-GPS |  | Owner or chain unclear |  |
| brand.js | mobile/src/lib/brand.js | mobile | root:check:brand, root:check:docsbrandcleanup01, root:check:uxbrandloginpremium01 | review | NEEDS_REVIEW |  | BRAND |  | Owner or chain unclear |  |
| gps.js | mobile/src/lib/gps.js | mobile | backend:bench:gps:100, backend:bench:gps:100:auto, backend:bench:gps:300:auto:panels, backend:m95e20check, mobile:check:m57.1, mobile:check:m95c, mobile:check:m95e20, mobile:check:m95e21, mobile:check:m95e23a, root:check:m95e23b, web:check:m95e20, web:check:m95e23c | web-lint | NEEDS_REVIEW |  | GPS |  | Owner or chain unclear |  |
| logger.js | mobile/src/lib/logger.js | mobile |  | review | NEEDS_REVIEW |  | LOGGER |  | Owner or chain unclear |  |
| navigation.js | mobile/src/lib/navigation.js | mobile | mobile:check:m95e22b | review | NEEDS_REVIEW |  | NAVIGATION |  | Owner or chain unclear |  |
| realtime.js | mobile/src/lib/realtime.js | mobile |  | review | NEEDS_REVIEW |  | REALTIME |  | Owner or chain unclear |  |
| release.js | mobile/src/lib/release.js | mobile | mobile:check:m50, mobile:check:m81.4, mobile:check:m82.6 | review | NEEDS_REVIEW |  | RELEASE |  | Owner or chain unclear |  |
| roleSurface.js | mobile/src/lib/roleSurface.js | mobile |  | review | NEEDS_REVIEW |  | ROLE-SURFACE |  | Owner or chain unclear |  |
| storage.js | mobile/src/lib/storage.js | mobile | mobile:check:m3 | review | NEEDS_REVIEW |  | STORAGE |  | Owner or chain unclear |  |
| voice.js | mobile/src/lib/voice.js | mobile | mobile:check:m49.1 | review | NEEDS_REVIEW |  | VOICE |  | Owner or chain unclear |  |
| BoardingChangeCard.js | mobile/src/screens/BoardingChangeCard.js | mobile |  | review | NEEDS_REVIEW |  | BOARDING-CHANGE-CARD |  | Owner or chain unclear |  |
| DriverAvailabilityCard.js | mobile/src/screens/DriverAvailabilityCard.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-AVAILABILITY-CARD |  | Owner or chain unclear |  |
| DriverChangeAwarenessCard.js | mobile/src/screens/DriverChangeAwarenessCard.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-CHANGE-AWARENESS-CARD |  | Owner or chain unclear |  |
| DriverShellLoadingScreen.js | mobile/src/screens/DriverShellLoadingScreen.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-SHELL-LOADING-SCREEN |  | Owner or chain unclear |  |
| DriverTaskSummaryCard.js | mobile/src/screens/DriverTaskSummaryCard.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-TASK-SUMMARY-CARD |  | Owner or chain unclear |  |
| ForcePasswordChangeScreen.js | mobile/src/screens/ForcePasswordChangeScreen.js | mobile |  | review | NEEDS_REVIEW |  | FORCE-PASSWORD-CHANGE-SCREEN |  | Owner or chain unclear |  |
| KvkkVisibilityMatrixCard.js | mobile/src/screens/KvkkVisibilityMatrixCard.js | mobile |  | review | NEEDS_REVIEW |  | KVKK-VISIBILITY-MATRIX-CARD |  | Owner or chain unclear |  |
| LinkAccessCard.js | mobile/src/screens/LinkAccessCard.js | mobile |  | review | NEEDS_REVIEW |  | LINK-ACCESS-CARD |  | Owner or chain unclear |  |
| LiveScreen.js | mobile/src/screens/LiveScreen.js | mobile |  | review | NEEDS_REVIEW |  | LIVE-SCREEN |  | Owner or chain unclear |  |
| LoginScreen.js | mobile/src/screens/LoginScreen.js | mobile |  | review | NEEDS_REVIEW |  | LOGIN-SCREEN |  | Owner or chain unclear |  |
| NotificationCenterCard.js | mobile/src/screens/NotificationCenterCard.js | mobile |  | review | NEEDS_REVIEW |  | NOTIFICATION-CENTER-CARD |  | Owner or chain unclear |  |
| ParentActivationCard.js | mobile/src/screens/ParentActivationCard.js | mobile |  | review | NEEDS_REVIEW |  | PARENT-ACTIVATION-CARD |  | Owner or chain unclear |  |
| PersonelActivationCard.js | mobile/src/screens/PersonelActivationCard.js | mobile |  | review | NEEDS_REVIEW |  | PERSONEL-ACTIVATION-CARD |  | Owner or chain unclear |  |
| PinChangeScreen.js | mobile/src/screens/PinChangeScreen.js | mobile |  | review | NEEDS_REVIEW |  | PIN-CHANGE-SCREEN |  | Owner or chain unclear |  |
| RoleHomeScreen.js | mobile/src/screens/RoleHomeScreen.js | mobile |  | review | NEEDS_REVIEW |  | ROLE-HOME-SCREEN |  | Owner or chain unclear |  |
| RoleLivePremiumCard.js | mobile/src/screens/RoleLivePremiumCard.js | mobile |  | review | NEEDS_REVIEW |  | ROLE-LIVE-PREMIUM-CARD |  | Owner or chain unclear |  |
| RoleOverviewPremiumCard.js | mobile/src/screens/RoleOverviewPremiumCard.js | mobile |  | review | NEEDS_REVIEW |  | ROLE-OVERVIEW-PREMIUM-CARD |  | Owner or chain unclear |  |
| RouteScreen.js | mobile/src/screens/RouteScreen.js | mobile |  | review | NEEDS_REVIEW |  | ROUTE-SCREEN |  | Owner or chain unclear |  |
| TodayScreen.js | mobile/src/screens/TodayScreen.js | mobile |  | review | NEEDS_REVIEW |  | TODAY-SCREEN |  | Owner or chain unclear |  |
| driverPremiumUi.js | mobile/src/screens/driverPremiumUi.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-PREMIUM-UI |  | Owner or chain unclear |  |
| driverUiText.js | mobile/src/screens/driverUiText.js | mobile |  | review | NEEDS_REVIEW |  | DRIVER-UI-TEXT |  | Owner or chain unclear |  |
| mobileUi.js | mobile/src/screens/mobileUi.js | mobile |  | review | NEEDS_REVIEW |  | MOBILE-UI |  | Owner or chain unclear |  |

### Tools / Wrappers / Packs
| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| apply_m45.ps1 | tools/_archive/legacy-overlays/apply_m45.ps1 | tools |  | archived | ARCHIVED |  | APPLY-M-45 |  | Historical only | archive path |
| apply_organization_plan_relation_fix.ps1 | tools/_archive/legacy-overlays/apply_organization_plan_relation_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-ORGANIZATION-PLAN-RELATION-FIX |  | Historical only | archive path |
| apply_organization_schema_dedupe_hotfix.ps1 | tools/_archive/legacy-overlays/apply_organization_schema_dedupe_hotfix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-ORGANIZATION-SCHEMA-DEDUPE-HOTFIX |  | Historical only | archive path |
| apply_overlay_m42_schema_restore.ps1 | tools/_archive/legacy-overlays/apply_overlay_m42_schema_restore.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-42-SCHEMA-RESTORE |  | Historical only | archive path |
| apply_overlay_m46_6_c2_d4_simple_role_mode.ps1 | tools/_archive/legacy-overlays/apply_overlay_m46_6_c2_d4_simple_role_mode.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-46-6-C-2-D-4-SIMPLE-ROLE-MODE |  | Historical only | archive path |
| apply_overlay_m46_6_c2_screen_coverage_terminology.ps1 | tools/_archive/legacy-overlays/apply_overlay_m46_6_c2_screen_coverage_terminology.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-46-6-C-2-SCREEN-COVERAGE-TERMINOLOGY |  | Historical only | archive path |
| apply_overlay_m46_7_ssot_sync.ps1 | tools/_archive/legacy-overlays/apply_overlay_m46_7_ssot_sync.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-46-7-SSOT-SYNC |  | Historical only | archive path |
| apply_overlay_m96_company_list_click_details.ps1 | tools/_archive/legacy-overlays/apply_overlay_m96_company_list_click_details.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-96-COMPANY-LIST-CLICK-DETAILS |  | Historical only | archive path |
| apply_overlay_organization_enum_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_enum_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-ENUM-FIX |  | Historical only | archive path |
| apply_overlay_organization_market_direct_live_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_market_direct_live_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-MARKET-DIRECT-LIVE-FIX |  | Historical only | archive path |
| apply_overlay_organization_market_direct_live_fix_v2.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_market_direct_live_fix_v2.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-MARKET-DIRECT-LIVE-FIX-V-2 |  | Historical only | archive path |
| apply_overlay_organization_market_first_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_market_first_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-MARKET-FIRST-FIX |  | Historical only | archive path |
| apply_overlay_organization_seed_router_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_seed_router_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-SEED-ROUTER-FIX |  | Historical only | archive path |
| apply_overlay_personel_public_link_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_personel_public_link_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-PERSONEL-PUBLIC-LINK-FIX |  | Historical only | archive path |
| apply_overlay_room_shifts_panel_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_room_shifts_panel_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ROOM-SHIFTS-PANEL-FIX |  | Historical only | archive path |
| build_overlay_bundle.ps1 | tools/_archive/legacy-overlays/build_overlay_bundle.ps1 | tools |  | archived | ARCHIVED |  | BUILD-OVERLAY-BUNDLE |  | Historical only | archive path |
| overlay_M58_3_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_3_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-3-APPLY |  | Historical only | archive path |
| overlay_M58_4_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_4_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-4-APPLY |  | Historical only | archive path |
| overlay_M58_5_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_5_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-5-APPLY |  | Historical only | archive path |
| overlay_M58_6_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_6_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-6-APPLY |  | Historical only | archive path |
| overlay_M59_1_apply.ps1 | tools/_archive/legacy-overlays/overlay_M59_1_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-59-1-APPLY |  | Historical only | archive path |
| overlay_M59_apply.ps1 | tools/_archive/legacy-overlays/overlay_M59_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-59-APPLY |  | Historical only | archive path |
| overlay_fix_driver_completeshift_crash.ps1 | tools/_archive/legacy-overlays/overlay_fix_driver_completeshift_crash.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-FIX-DRIVER-COMPLETESHIFT-CRASH |  | Historical only | archive path |
| overlay_fix_m41_device_binding.ps1 | tools/_archive/legacy-overlays/overlay_fix_m41_device_binding.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-FIX-M-41-DEVICE-BINDING |  | Historical only | archive path |
| overlay_update_checklist_ssot.ps1 | tools/_archive/legacy-overlays/overlay_update_checklist_ssot.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-CHECKLIST-SSOT |  | Historical only | archive path |
| overlay_update_checklist_ssot_safe.ps1 | tools/_archive/legacy-overlays/overlay_update_checklist_ssot_safe.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-CHECKLIST-SSOT-SAFE |  | Historical only | archive path |
| overlay_update_checklist_ssot_user.ps1 | tools/_archive/legacy-overlays/overlay_update_checklist_ssot_user.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-CHECKLIST-SSOT-USER |  | Historical only | archive path |
| overlay_update_primer_snapshot_safe.ps1 | tools/_archive/legacy-overlays/overlay_update_primer_snapshot_safe.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-PRIMER-SNAPSHOT-SAFE |  | Historical only | archive path |
| dedupe-user-notifications.ps1 | tools/_archive/oneoff-hotfixes/dedupe-user-notifications.ps1 | tools |  | archived | ARCHIVED |  | DEDUPE-USER-NOTIFICATIONS |  | Historical only | archive path |
| fix-escaped-import-quotes.ps1 | tools/_archive/oneoff-hotfixes/fix-escaped-import-quotes.ps1 | tools |  | archived | ARCHIVED |  | FIX-ESCAPED-IMPORT-QUOTES |  | Historical only | archive path |
| repair-schema-kind.ps1 | tools/_archive/oneoff-hotfixes/repair-schema-kind.ps1 | tools |  | archived | ARCHIVED |  | REPAIR-SCHEMA-KIND |  | Historical only | archive path |
| _console_status.ps1 | tools/_console_status.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CONSOLE-STATUS |  | Owner or chain unclear | internal helper |
| _manifest_pack_helpers.ps1 | tools/_manifest_pack_helpers.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | MANIFEST-PACK-HELPERS |  | Owner or chain unclear | internal helper |
| _pack_runner.ps1 | tools/_pack_runner.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-RUNNER |  | Owner or chain unclear | internal helper |
| _pack_phase_common.ps1 | tools/_packs/_pack_phase_common.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-PHASE-COMMON |  | Owner or chain unclear | internal pack helper |
| _repo_hygiene_preflight.ps1 | tools/_packs/_repo_hygiene_preflight.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | REPO-HYGIENE-PREFLIGHT |  | Owner or chain unclear | internal pack helper |
| pack_m0_m41.ps1 | tools/_packs/pack_m0_m41.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-0-M-41 |  | Owner or chain unclear | internal pack helper |
| pack_m42_m58.ps1 | tools/_packs/pack_m42_m58.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-42-M-58 |  | Owner or chain unclear | internal pack helper |
| pack_m59_m66.ps1 | tools/_packs/pack_m59_m66.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-59-M-66 |  | Owner or chain unclear | internal pack helper |
| pack_m64_m81.ps1 | tools/_packs/pack_m64_m81.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-64-M-81 |  | Owner or chain unclear | internal pack helper |
| pack_m67_m75.ps1 | tools/_packs/pack_m67_m75.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-67-M-75 |  | Owner or chain unclear | internal pack helper |
| pack_m76_m79.ps1 | tools/_packs/pack_m76_m79.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-76-M-79 |  | Owner or chain unclear | internal pack helper |
| pack_m76_m81.ps1 | tools/_packs/pack_m76_m81.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-76-M-81 |  | Owner or chain unclear | internal pack helper |
| pack_m82.ps1 | tools/_packs/pack_m82.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-82 |  | Owner or chain unclear | internal pack helper |
| _repo_contract_common.ps1 | tools/_repo_contract_common.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | REPO-CONTRACT-COMMON |  | Owner or chain unclear | internal helper |
| _repo_contract_state.ps1 | tools/_repo_contract_state.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | REPO-CONTRACT-STATE |  | Owner or chain unclear | internal helper |
| _repo_hygiene_preflight.ps1 | tools/_repo_hygiene_preflight.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | REPO-HYGIENE-PREFLIGHT |  | Owner or chain unclear | internal helper |
| _shared_functions.ps1 | tools/_shared_functions.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | SHARED-FUNCTIONS |  | Owner or chain unclear | internal helper |
| backup_create_m45.ps1 | tools/backup_create_m45.ps1 | tools |  | review | NEEDS_REVIEW |  | BACKUP-CREATE-M-45 |  | Owner or chain unclear |  |
| backup_restore_m45.ps1 | tools/backup_restore_m45.ps1 | tools |  | review | NEEDS_REVIEW |  | BACKUP-RESTORE-M-45 |  | Owner or chain unclear |  |
| check-repo.ps1 | tools/check-repo.ps1 | tools |  | review | NEEDS_REVIEW |  | CHECK-REPO |  | Owner or chain unclear |  |
| check_audit_logs_session_hotfix.ps1 | tools/check_audit_logs_session_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-AUDIT-LOGS-SESSION-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_brand.js | tools/check_brand.js | tools | root:check:brand | review | NEEDS_REVIEW |  | CHECK-BRAND |  | Owner or chain unclear |  |
| check_docs_ssot_repo_contract.ps1 | tools/check_docs_ssot_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-DOCS-SSOT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_final_milestone_cleanup.ps1 | tools/check_final_milestone_cleanup.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| check_global_ui_polish_hotfix.ps1 | tools/check_global_ui_polish_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-GLOBAL-UI-POLISH-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_live_gate_polish_v2_hotfix.ps1 | tools/check_live_gate_polish_v2_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-LIVE-GATE-POLISH-V-2-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_live_gate_readiness_hotfix.ps1 | tools/check_live_gate_readiness_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-LIVE-GATE-READINESS-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_m36_username_compat_fix.ps1 | tools/check_m36_username_compat_fix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-36-USERNAME-COMPAT-FIX |  | Breaks release / evidence / closure gate | release tool |
| check_m36_username_socket_hangup_fix.ps1 | tools/check_m36_username_socket_hangup_fix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-36-USERNAME-SOCKET-HANGUP-FIX |  | Breaks release / evidence / closure gate | release tool |
| check_m37_pwd_only_greenpack_compat.ps1 | tools/check_m37_pwd_only_greenpack_compat.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-37-PWD-ONLY-GREENPACK-COMPAT |  | Breaks release / evidence / closure gate | release tool |
| check_m43_google_auth_invite_gate_repo_contract.ps1 | tools/check_m43_google_auth_invite_gate_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-43-GOOGLE-AUTH-INVITE-GATE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m44_telematics_repo_contract.ps1 | tools/check_m44_telematics_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-44-TELEMATICS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m45_retention_backup_repo_contract.ps1 | tools/check_m45_retention_backup_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-45-RETENTION-BACKUP-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_1_ai_copilot_enrichment_repo_contract.ps1 | tools/check_m46_1_ai_copilot_enrichment_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-1-AI-COPILOT-ENRICHMENT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1 | tools/check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-2-AI-COPILOT-INTENT-EXPANSION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1 | tools/check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-3-AI-COPILOT-QUALITY-EVIDENCE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1 | tools/check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-4-AI-COPILOT-DECISION-CONSISTENCY-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1 | tools/check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-5-AI-COPILOT-ACTION-PRIORITIZATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_a_ai_job_guide_repo_contract.ps1 | tools/check_m46_6_a_ai_job_guide_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-A-AI-JOB-GUIDE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_b_ai_job_guide_precheck_repo_contract.ps1 | tools/check_m46_6_b_ai_job_guide_precheck_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-B-AI-JOB-GUIDE-PRECHECK-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1 | tools/check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-C-2-SCREEN-COVERAGE-TERMINOLOGY-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_c_ai_screen_help_repo_contract.ps1 | tools/check_m46_6_c_ai_screen_help_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-C-AI-SCREEN-HELP-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_d2_ai_context_chat_repo_contract.ps1 | tools/check_m46_6_d2_ai_context_chat_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-D-2-AI-CONTEXT-CHAT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_d3_ai_actionable_chat_repo_contract.ps1 | tools/check_m46_6_d3_ai_actionable_chat_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-D-3-AI-ACTIONABLE-CHAT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_d4_simple_role_mode_repo_contract.ps1 | tools/check_m46_6_d4_simple_role_mode_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-D-4-SIMPLE-ROLE-MODE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_d_ai_chat_shell_repo_contract.ps1 | tools/check_m46_6_d_ai_chat_shell_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-D-AI-CHAT-SHELL-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_6_t_ai_location_source_guide_repo_contract.ps1 | tools/check_m46_6_t_ai_location_source_guide_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-6-T-AI-LOCATION-SOURCE-GUIDE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_7_driver_code_login_rehber_first_repo_contract.ps1 | tools/check_m46_7_driver_code_login_rehber_first_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-7-DRIVER-CODE-LOGIN-REHBER-FIRST-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_8_driver_access_hardening_repo_contract.ps1 | tools/check_m46_8_driver_access_hardening_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-8-DRIVER-ACCESS-HARDENING-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_9_session_refresh_security_repo_contract.ps1 | tools/check_m46_9_session_refresh_security_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-9-SESSION-REFRESH-SECURITY-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m46_ai_copilot_repo_contract.ps1 | tools/check_m46_ai_copilot_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-46-AI-COPILOT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m47_2_capacity_load_baseline_repo_contract.ps1 | tools/check_m47_2_capacity_load_baseline_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-47-2-CAPACITY-LOAD-BASELINE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m47_3_production_resilience_edge_security_repo_contract.ps1 | tools/check_m47_3_production_resilience_edge_security_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-47-3-PRODUCTION-RESILIENCE-EDGE-SECURITY-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m47_4_mobile_readiness_web_pass_repo_contract.ps1 | tools/check_m47_4_mobile_readiness_web_pass_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-47-4-MOBILE-READINESS-WEB-PASS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m47_kvkk_notice_consent_framework_repo_contract.ps1 | tools/check_m47_kvkk_notice_consent_framework_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-47-KVKK-NOTICE-CONSENT-FRAMEWORK-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m48_5_room_company_tablet_readiness_repo_contract.ps1 | tools/check_m48_5_room_company_tablet_readiness_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-48-5-ROOM-COMPANY-TABLET-READINESS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m48_driver_mobile_foundation_repo_contract.ps1 | tools/check_m48_driver_mobile_foundation_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-48-DRIVER-MOBILE-FOUNDATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1 | tools/check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-49-1-DRIVER-VOICE-GUIDANCE-STOP-ETA-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m49_mobile_beta_hardening_repo_contract.ps1 | tools/check_m49_mobile_beta_hardening_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-49-MOBILE-BETA-HARDENING-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m50_mobile_release_readiness_repo_contract.ps1 | tools/check_m50_mobile_release_readiness_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-50-MOBILE-RELEASE-READINESS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m51_53_backfill_verification_repo_contract.ps1 | tools/check_m51_53_backfill_verification_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-51-53-BACKFILL-VERIFICATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m54_3_dispatch_approve_repack_repo_contract.ps1 | tools/check_m54_3_dispatch_approve_repack_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-54-3-DISPATCH-APPROVE-REPACK-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m54_4_driver_route_delivery_repo_contract.ps1 | tools/check_m54_4_driver_route_delivery_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-54-4-DRIVER-ROUTE-DELIVERY-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m55_reports_no_show_repo_contract.ps1 | tools/check_m55_reports_no_show_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-55-REPORTS-NO-SHOW-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m56_kvkk_eta_quality_repo_contract.ps1 | tools/check_m56_kvkk_eta_quality_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-56-KVKK-ETA-QUALITY-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m57_mobile_hardening_repo_contract.ps1 | tools/check_m57_mobile_hardening_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-57-MOBILE-HARDENING-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m58_final_pilot_readiness_repo_contract.ps1 | tools/check_m58_final_pilot_readiness_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| check_m59_observability_field_diagnostics_repo_contract.ps1 | tools/check_m59_observability_field_diagnostics_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-59-OBSERVABILITY-FIELD-DIAGNOSTICS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m60_field_acceptance_center_repo_contract.ps1 | tools/check_m60_field_acceptance_center_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-60-FIELD-ACCEPTANCE-CENTER-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m61_ssot_milestone_alignment_repo_contract.ps1 | tools/check_m61_ssot_milestone_alignment_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-61-SSOT-MILESTONE-ALIGNMENT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m62_commercial_core_strengthening_repo_contract.ps1 | tools/check_m62_commercial_core_strengthening_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-62-COMMERCIAL-CORE-STRENGTHENING-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m63_trust_quality_service_evaluation_repo_contract.ps1 | tools/check_m63_trust_quality_service_evaluation_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-63-TRUST-QUALITY-SERVICE-EVALUATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m64_natural_copilot_layer_repo_contract.ps1 | tools/check_m64_natural_copilot_layer_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-64-NATURAL-COPILOT-LAYER-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m65_pilot_launch_gate_repo_contract.ps1 | tools/check_m65_pilot_launch_gate_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-65-PILOT-LAUNCH-GATE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m66_operation_reassignment_repo_contract.ps1 | tools/check_m66_operation_reassignment_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-66-OPERATION-REASSIGNMENT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1 | tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-67-KURUMSAL-OLCEK-HAZIRLIK-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m68_fetch_hardening_repo_contract.ps1 | tools/check_m68_fetch_hardening_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-68-FETCH-HARDENING-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m69_fetch_hardening_phase2_repo_contract.ps1 | tools/check_m69_fetch_hardening_phase2_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-69-FETCH-HARDENING-PHASE-2-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m70_checker_sync_hot_path_repo_contract.ps1 | tools/check_m70_checker_sync_hot_path_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-70-CHECKER-SYNC-HOT-PATH-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m71_room_title_hotfix_repo_contract.ps1 | tools/check_m71_room_title_hotfix_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-71-ROOM-TITLE-HOTFIX-REPO-CONTRACT | tools/checks/living/hotfixes/check_m71_room_title_hotfix_repo_contract.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| check_m71_summary_hotpath_repo_contract.ps1 | tools/check_m71_summary_hotpath_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-71-SUMMARY-HOTPATH-REPO-CONTRACT |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | tools/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-71-WORKFLOW-LOADSUMMARY-HOTFIX-REPO-CONTRACT | tools/checks/living/hotfixes/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| check_m72_georeview_token_hotfix_repo_contract.ps1 | tools/check_m72_georeview_token_hotfix_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-72-GEOREVIEW-TOKEN-HOTFIX-REPO-CONTRACT | tools/checks/living/hotfixes/check_m72_georeview_token_hotfix_repo_contract.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| check_m72_hot_endpoint_reduction_repo_contract.ps1 | tools/check_m72_hot_endpoint_reduction_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-72-HOT-ENDPOINT-REDUCTION-REPO-CONTRACT |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| check_m73_hot_path_phase2_repo_contract.ps1 | tools/check_m73_hot_path_phase2_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-73-HOT-PATH-PHASE-2-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m74_hot_path_phase3_repo_contract.ps1 | tools/check_m74_hot_path_phase3_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-74-HOT-PATH-PHASE-3-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m75_hot_path_phase4_repo_contract.ps1 | tools/check_m75_hot_path_phase4_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-75-HOT-PATH-PHASE-4-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m76a_1_minimum_normalization_repo_contract.ps1 | tools/check_m76a_1_minimum_normalization_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-76-A-1-MINIMUM-NORMALIZATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m76a_2_final_normalization_archiving_repo_contract.ps1 | tools/check_m76a_2_final_normalization_archiving_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| check_m76b_living_matrix_tools_consolidation_repo_contract.ps1 | tools/check_m76b_living_matrix_tools_consolidation_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-76-B-LIVING-MATRIX-TOOLS-CONSOLIDATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m77_kvkk_uyum_katmani_repo_contract.ps1 | tools/check_m77_kvkk_uyum_katmani_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-77-KVKK-UYUM-KATMANI-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m78_1_operasyon_dogrulama_yuzeyi_repo_contract.ps1 | tools/check_m78_1_operasyon_dogrulama_yuzeyi_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-78-1-OPERASYON-DOGRULAMA-YUZEYI-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m78_2_operasyon_dogrulama_kayit_katmani_repo_contract.ps1 | tools/check_m78_2_operasyon_dogrulama_kayit_katmani_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-78-2-OPERASYON-DOGRULAMA-KAYIT-KATMANI-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m78_3_operasyon_dogrulama_ozet_filtre_katmani_repo_contract.ps1 | tools/check_m78_3_operasyon_dogrulama_ozet_filtre_katmani_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-78-3-OPERASYON-DOGRULAMA-OZET-FILTRE-KATMANI-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m78_checklist_operasyon_dogrulama_repo_contract.ps1 | tools/check_m78_checklist_operasyon_dogrulama_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-78-CHECKLIST-OPERASYON-DOGRULAMA-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m80_1_hot_panel_daraltma_repo_contract.ps1 | tools/check_m80_1_hot_panel_daraltma_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-80-1-HOT-PANEL-DARALTMA-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1 | tools/check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-80-2-AGREEMENTS-SHIFTS-GIRIS-YUKU-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1 | tools/check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-80-3-GEOREVIEW-SHIFTS-SON-GIRIS-YUKU-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1 | tools/check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| check_m80_m89_contract_sweep.ps1 | tools/check_m80_m89_contract_sweep.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-80-M-89-CONTRACT-SWEEP |  | Breaks release / evidence / closure gate | release tool |
| check_m81_mobile_saha_sertlestirme_repo_contract.ps1 | tools/check_m81_mobile_saha_sertlestirme_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-81-MOBILE-SAHA-SERTLESTIRME-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m82_10_super_admin_commercial_settings_repo_contract.ps1 | tools/check_m82_10_super_admin_commercial_settings_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-82-10-SUPER-ADMIN-COMMERCIAL-SETTINGS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m82_11_payment_readonly_surface_repo_contract.ps1 | tools/check_m82_11_payment_readonly_surface_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-82-11-PAYMENT-READONLY-SURFACE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m82_1_backend_correctness_repo_contract.ps1 | tools/check_m82_1_backend_correctness_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-82-1-BACKEND-CORRECTNESS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m82_8_verification_2_0_repo_contract.ps1 | tools/check_m82_8_verification_2_0_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-82-8-VERIFICATION-2-0-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m82_9_dormant_payment_backbone_repo_contract.ps1 | tools/check_m82_9_dormant_payment_backbone_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-82-9-DORMANT-PAYMENT-BACKBONE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m83_field_prep_packet_repo_contract.ps1 | tools/check_m83_field_prep_packet_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-83-FIELD-PREP-PACKET-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m84_field_feedback_loop_repo_contract.ps1 | tools/check_m84_field_feedback_loop_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-84-FIELD-FEEDBACK-LOOP-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m85_optional_payment_pilot_repo_contract.ps1 | tools/check_m85_optional_payment_pilot_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-85-OPTIONAL-PAYMENT-PILOT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m86_required_payment_rollout_repo_contract.ps1 | tools/check_m86_required_payment_rollout_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-86-REQUIRED-PAYMENT-ROLLOUT-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m87_payment_account_readiness_repo_contract.ps1 | tools/check_m87_payment_account_readiness_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-87-PAYMENT-ACCOUNT-READINESS-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m88_settlement_operations_console_repo_contract.ps1 | tools/check_m88_settlement_operations_console_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-88-SETTLEMENT-OPERATIONS-CONSOLE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m89_settlement_reconciliation_desk_repo_contract.ps1 | tools/check_m89_settlement_reconciliation_desk_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-89-SETTLEMENT-RECONCILIATION-DESK-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m90_b1_canonical_closure_gate_repo_contract.ps1 | tools/check_m90_b1_canonical_closure_gate_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-B-1-CANONICAL-CLOSURE-GATE-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c6_hot_file_queue_policy_repo_contract.ps1 | tools/check_m90_c6_hot_file_queue_policy_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-C-6-HOT-FILE-QUEUE-POLICY-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c7_export_package_hygiene_repo_contract.ps1 | tools/check_m90_c7_export_package_hygiene_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-C-7-EXPORT-PACKAGE-HYGIENE-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c8_ci_verification_visibility_repo_contract.ps1 | tools/check_m90_c8_ci_verification_visibility_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-C-8-CI-VERIFICATION-VISIBILITY-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c9_safe_closure_final_hygiene_repo_contract.ps1 | tools/check_m90_c9_safe_closure_final_hygiene_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | FINAL |  | Loses operator release tool | release tool |
| check_m91_shift_agreement_route_preview_repo_contract.ps1 | tools/check_m91_shift_agreement_route_preview_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-91-SHIFT-AGREEMENT-ROUTE-PREVIEW-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_m92_repo_verification_spine_repo_contract.ps1 | tools/check_m92_repo_verification_spine_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-92-REPO-VERIFICATION-SPINE-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_menu_readiness_cleanup_hotfix.ps1 | tools/check_menu_readiness_cleanup_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-MENU-READINESS-CLEANUP-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_panel_kvkk_context_hotfix.ps1 | tools/check_panel_kvkk_context_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-PANEL-KVKK-CONTEXT-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_password_force_change_hotfix.ps1 | tools/check_password_force_change_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-PASSWORD-FORCE-CHANGE-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_repo_audit_master.ps1 | tools/check_repo_audit_master.ps1 | tools |  | manual | MANUAL_RELEASE_TOOL |  | CHECK-REPO-AUDIT-MASTER |  | Loses operator release tool | release tool |
| check_repo_cleanup_m104.ps1 | tools/check_repo_cleanup_m104.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-REPO-CLEANUP-M-104 |  | Breaks release / evidence / closure gate | release tool |
| check_repo_cleanup_phase1_repo_contract.ps1 | tools/check_repo_cleanup_phase1_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-REPO-CLEANUP-PHASE-1-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_repo_hygiene_m106.ps1 | tools/check_repo_hygiene_m106.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-REPO-HYGIENE-M-106 |  | Breaks release / evidence / closure gate | release tool |
| check_session_safe_panels_cleanup_hotfix.ps1 | tools/check_session_safe_panels_cleanup_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-SESSION-SAFE-PANELS-CLEANUP-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_step06_repo_contract.ps1 | tools/check_step06_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-STEP-06-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_step1_security_foundation_repo_contract.ps1 | tools/check_step1_security_foundation_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-STEP-1-SECURITY-FOUNDATION-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_step1_totp_stepup_repo_contract.ps1 | tools/check_step1_totp_stepup_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-STEP-1-TOTP-STEPUP-REPO-CONTRACT |  | Breaks release / evidence / closure gate | release tool |
| check_superadmin_menu_copilot_sadelestirme.ps1 | tools/check_superadmin_menu_copilot_sadelestirme.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-SUPERADMIN-MENU-COPILOT-SADELESTIRME |  | Breaks release / evidence / closure gate | release tool |
| check_superadmin_menu_turkce_hotfix.ps1 | tools/check_superadmin_menu_turkce_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-SUPERADMIN-MENU-TURKCE-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_system_panels_polish_hotfix.ps1 | tools/check_system_panels_polish_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-SYSTEM-PANELS-POLISH-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_tools_hygiene_m105.ps1 | tools/check_tools_hygiene_m105.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-TOOLS-HYGIENE-M-105 |  | Breaks release / evidence / closure gate | release tool |
| check_ui_route_resilience_hotfix.ps1 | tools/check_ui_route_resilience_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-UI-ROUTE-RESILIENCE-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_username_first_login_hotfix.ps1 | tools/check_username_first_login_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-USERNAME-FIRST-LOGIN-HOTFIX |  | Breaks release / evidence / closure gate | release tool |
| check_living_matrix.ps1 | tools/checks/living/check_living_matrix.ps1 | tools |  | review | NEEDS_REVIEW |  | CHECK-LIVING-MATRIX |  | Owner or chain unclear |  |
| check_m67_m75_static.ps1 | tools/checks/living/check_m67_m75_static.ps1 | tools |  | review | NEEDS_REVIEW |  | CHECK-M-67-M-75-STATIC |  | Owner or chain unclear |  |
| check_m76_m81_static.ps1 | tools/checks/living/check_m76_m81_static.ps1 | tools |  | review | NEEDS_REVIEW |  | CHECK-M-76-M-81-STATIC |  | Owner or chain unclear |  |
| check_static_repo.ps1 | tools/checks/living/check_static_repo.ps1 | tools |  | review | NEEDS_REVIEW |  | CHECK-STATIC-REPO |  | Owner or chain unclear |  |
| check_m71_room_title_hotfix_repo_contract.ps1 | tools/checks/living/hotfixes/check_m71_room_title_hotfix_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-71-ROOM-TITLE-HOTFIX-REPO-CONTRACT |  | Owner or chain unclear | canonical living hotfix |
| check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | tools/checks/living/hotfixes/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-71-WORKFLOW-LOADSUMMARY-HOTFIX-REPO-CONTRACT |  | Owner or chain unclear | canonical living hotfix |
| check_m72_georeview_token_hotfix_repo_contract.ps1 | tools/checks/living/hotfixes/check_m72_georeview_token_hotfix_repo_contract.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | CHECK-M-72-GEOREVIEW-TOKEN-HOTFIX-REPO-CONTRACT |  | Owner or chain unclear | canonical living hotfix |
| export_shareable_repo_bundle.ps1 | tools/export_shareable_repo_bundle.ps1 | tools |  | review | NEEDS_REVIEW |  | EXPORT-SHAREABLE-REPO-BUNDLE |  | Owner or chain unclear |  |
| gate.cmd | tools/gate.cmd | tools | backend:m90b1check, mobile:check:m9, root:check:airesponsesemanticqualitygate01, root:check:paysafe01, root:check:qualitygatefinal01 | review | NEEDS_REVIEW |  | GATE |  | Owner or chain unclear |  |
| gate.ps1 | tools/gate.ps1 | tools | backend:m90b1check, mobile:check:m9, root:check:airesponsesemanticqualitygate01, root:check:paysafe01, root:check:qualitygatefinal01 | review | NEEDS_REVIEW |  | GATE |  | Owner or chain unclear |  |
| pack.cmd | tools/pack.cmd | tools | backend:m83check, backend:m90c7check, mobile:check:m10, mobile:check:m99a, root:check:fieldlaunch01 | review | NEEDS_REVIEW |  | PACK |  | Owner or chain unclear |  |
| pack.ps1 | tools/pack.ps1 | tools | backend:m83check, backend:m90c7check, mobile:check:m10, mobile:check:m99a, root:check:fieldlaunch01 | review | NEEDS_REVIEW |  | PACK |  | Owner or chain unclear |  |
| pack_docs_ssot.ps1 | tools/pack_docs_ssot.ps1 | tools |  | manual | MANUAL_RELEASE_TOOL |  | PACK-DOCS-SSOT |  | Loses operator release tool | release tool |
| pack_living.ps1 | tools/pack_living.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-LIVING | tools/pack.ps1 | Breaks compatibility alias; canonical replacement exists | release tool |
| pack_m42_optional.ps1 | tools/pack_m42_optional.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-42-OPTIONAL |  | Breaks release / evidence / closure gate | release tool |
| pack_m43_google_auth_invite_gate.ps1 | tools/pack_m43_google_auth_invite_gate.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-43-GOOGLE-AUTH-INVITE-GATE |  | Breaks release / evidence / closure gate | release tool |
| pack_m44_telematics.ps1 | tools/pack_m44_telematics.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-44-TELEMATICS |  | Breaks release / evidence / closure gate | release tool |
| pack_m45_retention_backup.ps1 | tools/pack_m45_retention_backup.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-45-RETENTION-BACKUP |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_1_ai_copilot_enrichment.ps1 | tools/pack_m46_1_ai_copilot_enrichment.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-1-AI-COPILOT-ENRICHMENT |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_2_ai_copilot_intent_expansion.ps1 | tools/pack_m46_2_ai_copilot_intent_expansion.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-2-AI-COPILOT-INTENT-EXPANSION |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_3_ai_copilot_quality_evidence.ps1 | tools/pack_m46_3_ai_copilot_quality_evidence.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-3-AI-COPILOT-QUALITY-EVIDENCE |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_4_ai_copilot_decision_consistency.ps1 | tools/pack_m46_4_ai_copilot_decision_consistency.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-4-AI-COPILOT-DECISION-CONSISTENCY |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_5_ai_copilot_action_prioritization.ps1 | tools/pack_m46_5_ai_copilot_action_prioritization.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-5-AI-COPILOT-ACTION-PRIORITIZATION |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_a_ai_job_guide.ps1 | tools/pack_m46_6_a_ai_job_guide.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-A-AI-JOB-GUIDE |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_b_ai_job_guide_precheck.ps1 | tools/pack_m46_6_b_ai_job_guide_precheck.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-B-AI-JOB-GUIDE-PRECHECK |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_c2_screen_coverage_terminology.ps1 | tools/pack_m46_6_c2_screen_coverage_terminology.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-C-2-SCREEN-COVERAGE-TERMINOLOGY |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_c_ai_screen_help.ps1 | tools/pack_m46_6_c_ai_screen_help.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-C-AI-SCREEN-HELP |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_d2_ai_context_chat.ps1 | tools/pack_m46_6_d2_ai_context_chat.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-D-2-AI-CONTEXT-CHAT |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_d3_ai_actionable_chat.ps1 | tools/pack_m46_6_d3_ai_actionable_chat.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-D-3-AI-ACTIONABLE-CHAT |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_d4_simple_role_mode.ps1 | tools/pack_m46_6_d4_simple_role_mode.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-D-4-SIMPLE-ROLE-MODE |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_d_ai_chat_shell.ps1 | tools/pack_m46_6_d_ai_chat_shell.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-D-AI-CHAT-SHELL |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_6_t_ai_location_source_guide.ps1 | tools/pack_m46_6_t_ai_location_source_guide.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-6-T-AI-LOCATION-SOURCE-GUIDE |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_7_driver_code_login_rehber_first.ps1 | tools/pack_m46_7_driver_code_login_rehber_first.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-7-DRIVER-CODE-LOGIN-REHBER-FIRST |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_8_driver_access_hardening.ps1 | tools/pack_m46_8_driver_access_hardening.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-8-DRIVER-ACCESS-HARDENING |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_9_session_refresh_security.ps1 | tools/pack_m46_9_session_refresh_security.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-9-SESSION-REFRESH-SECURITY |  | Breaks release / evidence / closure gate | release tool |
| pack_m46_ai_copilot.ps1 | tools/pack_m46_ai_copilot.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-46-AI-COPILOT |  | Breaks release / evidence / closure gate | release tool |
| pack_m47_2_capacity_load_baseline.ps1 | tools/pack_m47_2_capacity_load_baseline.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-47-2-CAPACITY-LOAD-BASELINE |  | Breaks release / evidence / closure gate | release tool |
| pack_m47_3_production_resilience_edge_security.ps1 | tools/pack_m47_3_production_resilience_edge_security.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-47-3-PRODUCTION-RESILIENCE-EDGE-SECURITY |  | Breaks release / evidence / closure gate | release tool |
| pack_m47_4_mobile_readiness_web_pass.ps1 | tools/pack_m47_4_mobile_readiness_web_pass.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-47-4-MOBILE-READINESS-WEB-PASS |  | Breaks release / evidence / closure gate | release tool |
| pack_m47_kvkk_notice_consent_framework.ps1 | tools/pack_m47_kvkk_notice_consent_framework.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-47-KVKK-NOTICE-CONSENT-FRAMEWORK |  | Breaks release / evidence / closure gate | release tool |
| pack_m48_5_room_company_tablet_readiness.ps1 | tools/pack_m48_5_room_company_tablet_readiness.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-48-5-ROOM-COMPANY-TABLET-READINESS |  | Breaks release / evidence / closure gate | release tool |
| pack_m48_driver_mobile_foundation.ps1 | tools/pack_m48_driver_mobile_foundation.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-48-DRIVER-MOBILE-FOUNDATION |  | Breaks release / evidence / closure gate | release tool |
| pack_m49_1_driver_voice_guidance_stop_eta.ps1 | tools/pack_m49_1_driver_voice_guidance_stop_eta.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-49-1-DRIVER-VOICE-GUIDANCE-STOP-ETA |  | Breaks release / evidence / closure gate | release tool |
| pack_m49_mobile_beta_hardening.ps1 | tools/pack_m49_mobile_beta_hardening.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-49-MOBILE-BETA-HARDENING |  | Breaks release / evidence / closure gate | release tool |
| pack_m50_mobile_release_readiness.ps1 | tools/pack_m50_mobile_release_readiness.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-50-MOBILE-RELEASE-READINESS |  | Breaks release / evidence / closure gate | release tool |
| pack_m51_53_backfill_verification.ps1 | tools/pack_m51_53_backfill_verification.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-51-53-BACKFILL-VERIFICATION |  | Breaks release / evidence / closure gate | release tool |
| pack_m54_3_dispatch_approve_repack.ps1 | tools/pack_m54_3_dispatch_approve_repack.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-54-3-DISPATCH-APPROVE-REPACK |  | Breaks release / evidence / closure gate | release tool |
| pack_m54_4_driver_route_delivery.ps1 | tools/pack_m54_4_driver_route_delivery.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-54-4-DRIVER-ROUTE-DELIVERY |  | Breaks release / evidence / closure gate | release tool |
| pack_m55_reports_no_show.ps1 | tools/pack_m55_reports_no_show.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-55-REPORTS-NO-SHOW |  | Breaks release / evidence / closure gate | release tool |
| pack_m56_kvkk_eta_quality.ps1 | tools/pack_m56_kvkk_eta_quality.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-56-KVKK-ETA-QUALITY |  | Breaks release / evidence / closure gate | release tool |
| pack_m57_mobile_hardening.ps1 | tools/pack_m57_mobile_hardening.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-57-MOBILE-HARDENING |  | Breaks release / evidence / closure gate | release tool |
| pack_m58_final_pilot_readiness.ps1 | tools/pack_m58_final_pilot_readiness.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| pack_m59_observability_field_diagnostics.ps1 | tools/pack_m59_observability_field_diagnostics.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-59-OBSERVABILITY-FIELD-DIAGNOSTICS |  | Breaks release / evidence / closure gate | release tool |
| pack_m60_field_acceptance_center.ps1 | tools/pack_m60_field_acceptance_center.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-60-FIELD-ACCEPTANCE-CENTER |  | Breaks release / evidence / closure gate | release tool |
| pack_m61_ssot_milestone_alignment.ps1 | tools/pack_m61_ssot_milestone_alignment.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-61-SSOT-MILESTONE-ALIGNMENT |  | Breaks release / evidence / closure gate | release tool |
| pack_m62_commercial_core_strengthening.ps1 | tools/pack_m62_commercial_core_strengthening.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-62-COMMERCIAL-CORE-STRENGTHENING |  | Breaks release / evidence / closure gate | release tool |
| pack_m63_trust_quality_service_evaluation.ps1 | tools/pack_m63_trust_quality_service_evaluation.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-63-TRUST-QUALITY-SERVICE-EVALUATION |  | Breaks release / evidence / closure gate | release tool |
| pack_m64_natural_copilot_layer.ps1 | tools/pack_m64_natural_copilot_layer.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-64-NATURAL-COPILOT-LAYER |  | Breaks release / evidence / closure gate | release tool |
| pack_m65_pilot_launch_gate.ps1 | tools/pack_m65_pilot_launch_gate.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-65-PILOT-LAUNCH-GATE |  | Breaks release / evidence / closure gate | release tool |
| pack_m66_operation_reassignment.ps1 | tools/pack_m66_operation_reassignment.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-66-OPERATION-REASSIGNMENT |  | Breaks release / evidence / closure gate | release tool |
| pack_m67_kurumsal_olcek_hazirlik.ps1 | tools/pack_m67_kurumsal_olcek_hazirlik.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-67-KURUMSAL-OLCEK-HAZIRLIK |  | Breaks release / evidence / closure gate | release tool |
| pack_m68_fetch_hardening.ps1 | tools/pack_m68_fetch_hardening.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-68-FETCH-HARDENING |  | Breaks release / evidence / closure gate | release tool |
| pack_m69_fetch_hardening_phase2.ps1 | tools/pack_m69_fetch_hardening_phase2.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-69-FETCH-HARDENING-PHASE-2 |  | Breaks release / evidence / closure gate | release tool |
| pack_m70_checker_sync_hot_path.ps1 | tools/pack_m70_checker_sync_hot_path.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-70-CHECKER-SYNC-HOT-PATH |  | Breaks release / evidence / closure gate | release tool |
| pack_m71_room_title_hotfix.ps1 | tools/pack_m71_room_title_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-ROOM-TITLE-HOTFIX | tools/packs/living/hotfixes/pack_m71_room_title_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m71_summary_hotpath.ps1 | tools/pack_m71_summary_hotpath.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-SUMMARY-HOTPATH |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| pack_m71_ui_contract_hotfix.ps1 | tools/pack_m71_ui_contract_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-UI-CONTRACT-HOTFIX | tools/packs/living/hotfixes/pack_m71_ui_contract_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m71_workflow_loadsummary_hotfix.ps1 | tools/pack_m71_workflow_loadsummary_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-WORKFLOW-LOADSUMMARY-HOTFIX | tools/packs/living/hotfixes/pack_m71_workflow_loadsummary_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m72_georeview_token_hotfix.ps1 | tools/pack_m72_georeview_token_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-72-GEOREVIEW-TOKEN-HOTFIX | tools/packs/living/hotfixes/pack_m72_georeview_token_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m72_hot_endpoint_reduction.ps1 | tools/pack_m72_hot_endpoint_reduction.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-72-HOT-ENDPOINT-REDUCTION |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| pack_m73_hot_path_phase2.ps1 | tools/pack_m73_hot_path_phase2.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-73-HOT-PATH-PHASE-2 |  | Breaks release / evidence / closure gate | release tool |
| pack_m74_hot_path_phase3.ps1 | tools/pack_m74_hot_path_phase3.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-74-HOT-PATH-PHASE-3 |  | Breaks release / evidence / closure gate | release tool |
| pack_m75_hot_path_phase4.ps1 | tools/pack_m75_hot_path_phase4.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-75-HOT-PATH-PHASE-4 |  | Breaks release / evidence / closure gate | release tool |
| pack_m75_repo_contract_hotfix.ps1 | tools/pack_m75_repo_contract_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-75-REPO-CONTRACT-HOTFIX | tools/packs/living/hotfixes/pack_m75_repo_contract_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m76a_1_minimum_normalization.ps1 | tools/pack_m76a_1_minimum_normalization.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-76-A-1-MINIMUM-NORMALIZATION |  | Breaks release / evidence / closure gate | release tool |
| pack_m76a_2_final_normalization_archiving.ps1 | tools/pack_m76a_2_final_normalization_archiving.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| pack_m76b_living_matrix_tools_consolidation.ps1 | tools/pack_m76b_living_matrix_tools_consolidation.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-76-B-LIVING-MATRIX-TOOLS-CONSOLIDATION |  | Breaks release / evidence / closure gate | release tool |
| pack_m77_kvkk_uyum_katmani.ps1 | tools/pack_m77_kvkk_uyum_katmani.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-77-KVKK-UYUM-KATMANI |  | Breaks release / evidence / closure gate | release tool |
| pack_m78_1_operasyon_dogrulama_yuzeyi.ps1 | tools/pack_m78_1_operasyon_dogrulama_yuzeyi.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-78-1-OPERASYON-DOGRULAMA-YUZEYI |  | Breaks release / evidence / closure gate | release tool |
| pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1 | tools/pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-78-2-OPERASYON-DOGRULAMA-KAYIT-KATMANI |  | Breaks release / evidence / closure gate | release tool |
| pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1 | tools/pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-78-3-OPERASYON-DOGRULAMA-OZET-FILTRE-KATMANI |  | Breaks release / evidence / closure gate | release tool |
| pack_m78_checklist_operasyon_dogrulama.ps1 | tools/pack_m78_checklist_operasyon_dogrulama.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-78-CHECKLIST-OPERASYON-DOGRULAMA |  | Breaks release / evidence / closure gate | release tool |
| pack_m79_copilot_acceptance.ps1 | tools/pack_m79_copilot_acceptance.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-79-COPILOT-ACCEPTANCE |  | Breaks release / evidence / closure gate | release tool |
| pack_m80_1_hot_panel_daraltma.ps1 | tools/pack_m80_1_hot_panel_daraltma.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-80-1-HOT-PANEL-DARALTMA |  | Breaks release / evidence / closure gate | release tool |
| pack_m80_2_agreements_shifts_giris_yuku.ps1 | tools/pack_m80_2_agreements_shifts_giris_yuku.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-80-2-AGREEMENTS-SHIFTS-GIRIS-YUKU |  | Breaks release / evidence / closure gate | release tool |
| pack_m80_3_georeview_shifts_son_giris_yuku.ps1 | tools/pack_m80_3_georeview_shifts_son_giris_yuku.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-80-3-GEOREVIEW-SHIFTS-SON-GIRIS-YUKU |  | Breaks release / evidence / closure gate | release tool |
| pack_m80_final_sert_kabul_yuk_guveni.ps1 | tools/pack_m80_final_sert_kabul_yuk_guveni.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | FINAL |  | Breaks release / evidence / closure gate | release tool |
| pack_m81_3_mobile_gps_flow_smoke.ps1 | tools/pack_m81_3_mobile_gps_flow_smoke.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-81-3-MOBILE-GPS-FLOW-SMOKE |  | Breaks release / evidence / closure gate | release tool |
| pack_m81_mobile_saha_sertlestirme.ps1 | tools/pack_m81_mobile_saha_sertlestirme.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-81-MOBILE-SAHA-SERTLESTIRME |  | Breaks release / evidence / closure gate | release tool |
| pack_m82_10_super_admin_commercial_settings.ps1 | tools/pack_m82_10_super_admin_commercial_settings.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-82-10-SUPER-ADMIN-COMMERCIAL-SETTINGS |  | Breaks release / evidence / closure gate | release tool |
| pack_m82_11_payment_readonly_surface.ps1 | tools/pack_m82_11_payment_readonly_surface.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-82-11-PAYMENT-READONLY-SURFACE |  | Breaks release / evidence / closure gate | release tool |
| pack_m82_1_backend_correctness.ps1 | tools/pack_m82_1_backend_correctness.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-82-1-BACKEND-CORRECTNESS |  | Breaks release / evidence / closure gate | release tool |
| pack_m82_8_verification_2_0.ps1 | tools/pack_m82_8_verification_2_0.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-82-8-VERIFICATION-2-0 |  | Breaks release / evidence / closure gate | release tool |
| pack_m82_9_dormant_payment_backbone.ps1 | tools/pack_m82_9_dormant_payment_backbone.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-82-9-DORMANT-PAYMENT-BACKBONE |  | Breaks release / evidence / closure gate | release tool |
| pack_m83_field_prep_packet.ps1 | tools/pack_m83_field_prep_packet.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-83-FIELD-PREP-PACKET |  | Breaks release / evidence / closure gate | release tool |
| pack_m84_field_feedback_loop.ps1 | tools/pack_m84_field_feedback_loop.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-84-FIELD-FEEDBACK-LOOP |  | Breaks release / evidence / closure gate | release tool |
| pack_m85_optional_payment_pilot.ps1 | tools/pack_m85_optional_payment_pilot.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-85-OPTIONAL-PAYMENT-PILOT |  | Breaks release / evidence / closure gate | release tool |
| pack_m86_required_payment_rollout.ps1 | tools/pack_m86_required_payment_rollout.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-86-REQUIRED-PAYMENT-ROLLOUT |  | Breaks release / evidence / closure gate | release tool |
| pack_m87_payment_account_readiness.ps1 | tools/pack_m87_payment_account_readiness.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-87-PAYMENT-ACCOUNT-READINESS |  | Breaks release / evidence / closure gate | release tool |
| pack_m88_settlement_operations_console.ps1 | tools/pack_m88_settlement_operations_console.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-88-SETTLEMENT-OPERATIONS-CONSOLE |  | Breaks release / evidence / closure gate | release tool |
| pack_m89_settlement_reconciliation_desk.ps1 | tools/pack_m89_settlement_reconciliation_desk.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-89-SETTLEMENT-RECONCILIATION-DESK |  | Breaks release / evidence / closure gate | release tool |
| pack_m90_b1_canonical_closure_gate.ps1 | tools/pack_m90_b1_canonical_closure_gate.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-B-1-CANONICAL-CLOSURE-GATE |  | Loses operator release tool | release tool |
| pack_m90_c6_hot_file_queue_policy.ps1 | tools/pack_m90_c6_hot_file_queue_policy.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-C-6-HOT-FILE-QUEUE-POLICY |  | Loses operator release tool | release tool |
| pack_m90_c7_export_package_hygiene.ps1 | tools/pack_m90_c7_export_package_hygiene.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-C-7-EXPORT-PACKAGE-HYGIENE |  | Loses operator release tool | release tool |
| pack_m90_c8_ci_verification_visibility.ps1 | tools/pack_m90_c8_ci_verification_visibility.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-C-8-CI-VERIFICATION-VISIBILITY |  | Loses operator release tool | release tool |
| pack_m90_c9_safe_closure_final_hygiene.ps1 | tools/pack_m90_c9_safe_closure_final_hygiene.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | FINAL |  | Loses operator release tool | release tool |
| pack_m91_shift_agreement_route_preview.ps1 | tools/pack_m91_shift_agreement_route_preview.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-91-SHIFT-AGREEMENT-ROUTE-PREVIEW |  | Breaks release / evidence / closure gate | release tool |
| pack_m92_repo_verification_spine.ps1 | tools/pack_m92_repo_verification_spine.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-92-REPO-VERIFICATION-SPINE |  | Loses operator release tool | release tool |
| pack_m93_queue_durability_proof.ps1 | tools/pack_m93_queue_durability_proof.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-93-QUEUE-DURABILITY-PROOF |  | Loses operator release tool | release tool |
| pack_repo_cleanup_phase1.ps1 | tools/pack_repo_cleanup_phase1.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-REPO-CLEANUP-PHASE-1 |  | Breaks release / evidence / closure gate | release tool |
| pack_step06_stabil.ps1 | tools/pack_step06_stabil.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-STEP-06-STABIL |  | Breaks release / evidence / closure gate | release tool |
| pack_step1_security_foundation.ps1 | tools/pack_step1_security_foundation.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-STEP-1-SECURITY-FOUNDATION |  | Breaks release / evidence / closure gate | release tool |
| pack_step1_totp_stepup.ps1 | tools/pack_step1_totp_stepup.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-STEP-1-TOTP-STEPUP |  | Breaks release / evidence / closure gate | release tool |
| pack_m71_room_title_hotfix.ps1 | tools/packs/living/hotfixes/pack_m71_room_title_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-71-ROOM-TITLE-HOTFIX |  | Owner or chain unclear | canonical living hotfix |
| pack_m71_ui_contract_hotfix.ps1 | tools/packs/living/hotfixes/pack_m71_ui_contract_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-71-UI-CONTRACT-HOTFIX |  | Owner or chain unclear | canonical living hotfix |
| pack_m71_workflow_loadsummary_hotfix.ps1 | tools/packs/living/hotfixes/pack_m71_workflow_loadsummary_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-71-WORKFLOW-LOADSUMMARY-HOTFIX |  | Owner or chain unclear | canonical living hotfix |
| pack_m72_georeview_token_hotfix.ps1 | tools/packs/living/hotfixes/pack_m72_georeview_token_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-72-GEOREVIEW-TOKEN-HOTFIX |  | Owner or chain unclear | canonical living hotfix |
| pack_m75_repo_contract_hotfix.ps1 | tools/packs/living/hotfixes/pack_m75_repo_contract_hotfix.ps1 | tools |  | release | ACTIVE_RELEASE_ONLY |  | PACK-M-75-REPO-CONTRACT-HOTFIX |  | Owner or chain unclear | canonical living hotfix |
| pack_phase_m0_m41.ps1 | tools/packs/living/pack_phase_m0_m41.ps1 | tools |  | review | NEEDS_REVIEW |  | PACK-PHASE-M-0-M-41 |  | Owner or chain unclear |  |
| pack_phase_m42_m58.ps1 | tools/packs/living/pack_phase_m42_m58.ps1 | tools |  | review | NEEDS_REVIEW |  | PACK-PHASE-M-42-M-58 |  | Owner or chain unclear |  |
| pack_phase_m59_m66.ps1 | tools/packs/living/pack_phase_m59_m66.ps1 | tools |  | review | NEEDS_REVIEW |  | PACK-PHASE-M-59-M-66 |  | Owner or chain unclear |  |
| pack_phase_m67_m75.ps1 | tools/packs/living/pack_phase_m67_m75.ps1 | tools |  | review | NEEDS_REVIEW |  | PACK-PHASE-M-67-M-75 |  | Owner or chain unclear |  |
| pack_phase_m76_m81.ps1 | tools/packs/living/pack_phase_m76_m81.ps1 | tools |  | review | NEEDS_REVIEW |  | PACK-PHASE-M-76-M-81 |  | Owner or chain unclear |  |
| reset-and-pack.ps1 | tools/reset-and-pack.ps1 | tools |  | review | NEEDS_REVIEW |  | RESET-AND-PACK |  | Owner or chain unclear |  |
| reset-dev.ps1 | tools/reset-dev.ps1 | tools | root:dev:reset | review | NEEDS_REVIEW |  | RESET-DEV |  | Owner or chain unclear |  |
| run_all_checks.ps1 | tools/run_all_checks.ps1 | tools |  | review | NEEDS_REVIEW |  | RUN-ALL-CHECKS |  | Owner or chain unclear |  |
| verify_clean_clone.ps1 | tools/verify_clean_clone.ps1 | tools |  | review | NEEDS_REVIEW |  | VERIFY-CLEAN-CLONE |  | Owner or chain unclear |  |
| verify_living_runtime.ps1 | tools/verify_living_runtime.ps1 | tools |  | review | NEEDS_REVIEW |  | VERIFY-LIVING-RUNTIME |  | Owner or chain unclear |  |
| verify_living_static.ps1 | tools/verify_living_static.ps1 | tools |  | review | NEEDS_REVIEW |  | VERIFY-LIVING-STATIC |  | Owner or chain unclear |  |
| pack_living.ps1 | tools/wrappers/pack_living.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-LIVING | tools/pack.ps1 | Breaks compatibility alias; canonical replacement exists | compat wrapper |
| verify_final.ps1 | tools/wrappers/verify_final.ps1 | tools |  | verify:final | ACTIVE_CORE |  | FINAL |  | Owner or chain unclear | canonical wrapper |
| verify_living_runtime.ps1 | tools/wrappers/verify_living_runtime.ps1 | tools |  | compat | LEGACY_COMPAT |  | VERIFY-LIVING-RUNTIME | tools/wrappers/verify_final.ps1 | Breaks compatibility alias; canonical replacement exists | compat wrapper |
| verify_living_static.ps1 | tools/wrappers/verify_living_static.ps1 | tools |  | compat | LEGACY_COMPAT |  | VERIFY-LIVING-STATIC | tools/wrappers/verify_final.ps1 | Breaks compatibility alias; canonical replacement exists | compat wrapper |
| verify_repo.ps1 | tools/wrappers/verify_repo.ps1 | tools |  | verify:repo | ACTIVE_CORE |  | VERIFY-REPO |  | Owner or chain unclear | canonical wrapper |
| write_m90_final_release_evidence.ps1 | tools/write_m90_final_release_evidence.ps1 | tools |  | review | NEEDS_REVIEW |  | FINAL |  | Owner or chain unclear |  |

## 3) Duplicate / Overlap Consolidation

- Duplicate / overlap groups found: `8`
- Removed alias wrappers: `3`

| group | duplicateScripts | canonicalScript | action | reason | replacement | refsUpdated | riskIfRemoved |
| --- | --- | --- | --- | --- | --- | --- | --- |
| COP-04B-FIX-06 free-chat bridge | backend/scripts/cop_04b_fix_06_live_drawer_context_bridge_check.js -> backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | removed | The left-side file was a pure import alias wrapper; the canonical file already contains the real check. | backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md, backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | Low; package command still points at the canonical implementation. |
| UX company panel smoke alias | backend/scripts/ux_company_panel_smoke_01_check.js -> backend/scripts/ux_company_ops_panel_tabs_01_check.js | backend/scripts/ux_company_ops_panel_tabs_01_check.js | removed | The left-side file was a pure import alias wrapper; the canonical company tabs check is the real owner. | backend/scripts/ux_company_ops_panel_tabs_01_check.js | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Low; the canonical package command remains unchanged. |
| UX live map tabs fix alias | backend/scripts/ux_live_map_tabs_fix_01_check.js -> backend/scripts/ux_live_map_tabs_simplify_01_check.js | backend/scripts/ux_live_map_tabs_simplify_01_check.js | removed | The left-side file was a pure import alias wrapper; the canonical simplification check is the real owner. | backend/scripts/ux_live_map_tabs_simplify_01_check.js | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Low; the canonical package command remains unchanged. |
| Room agreement tabs compatibility alias | check:uxroomagreementstabs01 -> check:uxpanelrealitycleanup02d | check:uxpanelrealitycleanup02d | alias | Compatibility alias is kept for operator muscle memory while the canonical check already exists. | check:uxpanelrealitycleanup02d | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Breaks compatibility alias; canonical replacement exists. |
| Backend repo check chain compatibility alias | backend:repo:check:chain -> backend:repo:check | backend:repo:check | alias | Compatibility alias remains for legacy operator commands; the canonical repo check is already in use. | backend:repo:check | backend/package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Breaks compatibility alias; canonical replacement exists. |
| Mobile notification and preview build aliases | check:m96bnotifications -> check:m96b; build:internal:android -> build:preview:android; build:internal:ios -> build:preview:ios | check:m96b / build:preview:android / build:preview:ios | alias | Compatibility aliases are kept for mobile operator flows; canonical mobile commands already exist. | check:m96b / build:preview:android / build:preview:ios | mobile/package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Breaks mobile compatibility aliases; canonical replacements exist. |
| Pack / verify living wrapper family | tools/pack_living.ps1; tools/wrappers/pack_living.ps1; tools/wrappers/verify_living_runtime.ps1; tools/wrappers/verify_living_static.ps1 | tools/pack.ps1 / tools/wrappers/verify_final.ps1 | legacy | Legacy compatibility wrappers are retained for operator convenience and release muscle memory. | tools/pack.ps1 / tools/wrappers/verify_final.ps1 | tools/README.md, tools/wrappers/README.md, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Breaks release and verification operator shortcuts. |
| M71/M72 hotfix pack/check family | tools/check_m71_* hotfix wrappers; tools/pack_m71_* hotfix wrappers; tools/check_m72_* hotfix wrappers; tools/pack_m72_* hotfix wrappers | tools/checks/living/hotfixes/* and tools/packs/living/hotfixes/* | legacy | Legacy hotfix wrapper family is retained because the historical release tooling still points at these entrypoints. | tools/checks/living/hotfixes/* and tools/packs/living/hotfixes/* | tools/README.md, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Breaks historical hotfix release tooling. |

## 4) Product Function Coverage Matrix

| function | rolePanel | backendRouteService | frontendSurface | currentCheckScript | checkType | coverageStatus | missingGap | ownerMilestone | requiredNextAction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth / login / role access | Mobile login, step-up, KVKK | backend/src/routes/personelAccess.js; backend/src/routes/live.js; auth / step-up services | mobile/src/screens/LoginScreen.js; mobile/src/screens/ForcePasswordChangeScreen.js; mobile/src/screens/PinChangeScreen.js; web/src/panels/shared/KvkkPanel.jsx; web/src/panels/shared/KvkkConsentGate.jsx; web/src/panels/shared/TotpStepUpCard.jsx | check:m98e2e; check:m98e2b; check:m98e2d; check:m98e5; check:m99kvkk01; check:m99ux01 | static + auth-session + device | PARTIAL_COVERAGE | No single canonical end-to-end login/role smoke; browser/device split stays manual. | M98 / M99 | SECURITY-KVKK-FINAL-01 |
| Super Admin | Super Admin panels | backend/src/routes/live.js; backend/src/routes/company.js; backend/src/routes/organization.js; backend/src/routes/requests.js | web/src/panels/superadmin/SuperAdminPanel.jsx; UsersPanel.jsx; RoomsPanel.jsx; RegionsPanel.jsx; CompaniesPanel.jsx; CommercialCorePanel.jsx; AuditLogsPanel.jsx; LogExportPanel.jsx; TrustQualityPanel.jsx; FieldAcceptanceCenter.jsx | check:web01b; check:uxsuperadminoverviewcleanup01; check:uxsuperadminpanelclarity01; check:uxsuperadminlabelpolish01; check:uxsuperadminlivemonitoring01; check:uxsuperadminauditpanel01; check:uxsuperadminqualitypanel01; check:uxsuperadmincommercialflow01; check:uxsuperadminfielddispatchdiscovery01; check:uxsuperadminfieldacceptancecenter01; check:cop04bfix01; check:cop04bfix04; check:copliveaccept01; check:finaluxsmoke01 | static | COVERED_ACTIVE | None on the current static/product chain. | M97 / M99 / COP-04B | None |
| Room / Oda | Room panels | backend/src/routes/shifts/room.js; backend/src/routes/requests.js; backend/src/routes/live.js; backend/src/routes/agreements.js | web/src/panels/room/roomOperationsBoard.jsx; roomShiftsMainSections.jsx; AgreementsPanel.jsx; ShiftsPanel.jsx; DriversPanel.jsx; MapPanel.jsx; VehiclesPanel.jsx; CommercialFlowPanel.jsx; CheckinPanel.jsx; HubPanel.jsx; OperationHealthPanel.jsx | check:uxroomopspaneltabs01; check:uxroomopsrelationshippolish01; check:uxroomshiftstabs01; check:uxroomvehiclestelematicsfix; check:boardingops01a; check:boardingops01b; check:boardingops01c; check:routechangefinal01; check:finaluxsmoke01 | static + manual boundary | COVERED_ACTIVE | None on the current static/product chain. | BOARDING-OPS / ROUTE-CHANGE-FINAL | None |
| Company / Firma | Company panels | backend/src/routes/shifts/company.js; backend/src/routes/agreements.js; backend/src/routes/company.js; backend/src/routes/requests.js; backend/src/routes/personelAccess.js | web/src/panels/company/OperationsPanel.jsx; ShiftsPanel.jsx; AgreementsPanel.jsx; AgreementWizard.jsx; AgreementWizardModal.jsx; GuidedPlanModal.jsx; guidedPlanModalShell.jsx; CommercialFlowPanel.jsx; ServiceEvaluationPanel.jsx; MapPanel.jsx; WorkflowPanel.jsx; RoutePreviewModal.jsx; AgreementOpsBridgeCard.jsx; PersonelAccessPanel.jsx; PassengerLinksPanel.jsx; HubPanel.jsx; CompanyShiftsPanel* | check:uxcompanyshiftstabs01; check:uxcompanymobileactionclarity01; check:uxcompanypersonelaccessmobileparity01; check:uxcompanyopspaneltabs01; check:uxcompanyqualitytabs01; check:uxcompanypanelssmoke01; check:routechangefinal01; check:boardingops01b; check:boardingops01c | static + manual boundary | COVERED_ACTIVE | None on the current static/product chain. | ROUTE-CHANGE-FINAL / BOARDING-OPS | None |
| School / Okul | School panels | backend/src/routes/schoolParentInvites.js; backend/src/routes/requests.js; backend/src/routes/shifts/room.js | web/src/panels/school/OperationsPanel.jsx; ParentInvitePanel.jsx | check:uxschoolorganizationpanels01; check:boardingops01a; check:boardingops01b; check:boardingops01c; check:finaluxsmoke01 | static + manual boundary | COVERED_ACTIVE | None on the current static/product chain. | BOARDING-OPS / FINAL-UX-SMOKE | None |
| Organization / Kurum | Organization panels | backend/src/routes/organization.js | web/src/panels/organization/PlansPanel.jsx; CenterPanel.jsx; organizationPlansShared.jsx | check:uxnav01; check:routechangefinal01; check:finaluxsmoke01; check:web01b | static | PARTIAL_COVERAGE | Dedicated organization flow smoke is narrower than company/room coverage. | UX-NAV / ROUTE-CHANGE-FINAL | MISSING_FUTURE_MILESTONE: ORG-CONTEXT-FINAL-01 |
| Driver / Sürücü | Driver panels | backend/src/routes/driver.js; backend/src/routes/shifts/driver.js; backend/src/routes/live.js | web/src/panels/driver/TodayPanel.jsx; RoutePanel.jsx; MapPanel.jsx; CheckinPanel.jsx; PinChangePanel.jsx | check:driverflowfinal01; check:boardingops01c; check:etasanity01; check:etaosrm01; check:etaosrm02; check:m95e20; check:m95e23b; check:m98e3; check:m98e4 | static + device + manual | COVERED_ACTIVE | None on the current static/product chain. | BOARDING-OPS-01C / ETA | None |
| Parent / Veli | Parent live panel | backend/src/routes/live.js; backend/src/routes/personelAccess.js; backend/src/routes/schoolParentInvites.js | web/src/panels/parent/LivePanel.jsx; web/src/panels/public/PassengerLivePanel.jsx | check:cop04bfix08; check:m98e2d; check:uxparentpersonelliveerrorclarity01; check:finaluxsmoke01 | static + auth-session | PARTIAL_COVERAGE | Browser/mobile acceptance is now captured by MOBILE-WEB-FINAL-01; PASS- rows remain final risk backlog. | COP-04B / M98 | MOBILE-WEB-FINAL-01 |
| Personel | Personel live panel | backend/src/routes/live.js; backend/src/routes/personelAccess.js; backend/src/routes/personels.js | web/src/panels/personel/LivePanel.jsx; web/src/panels/personel/MyRidePanel.jsx | check:cop04bfix03; check:copliveaccept01; check:m98e2b; check:uxparentpersonelliveerrorclarity01; check:finaluxsmoke01 | static + auth-session | COVERED_ACTIVE | Browser/mobile acceptance is now captured by MOBILE-WEB-FINAL-01; PASS- rows remain final risk backlog. | COP-LIVE-ACCEPT / M98 | MOBILE-WEB-FINAL-01 |
| Public / Passenger | Public passenger live panel | backend/src/routes/live.js; backend/src/routes/personelAccess.js | web/src/panels/public/PassengerLivePanel.jsx; web/src/panels/public/AcceptParentInvitePanel.jsx | check:m98e2d; check:m98e4b; check:m98e4c | auth-session + legacy compat | PARTIAL_COVERAGE | Public live acceptance still depends on compatibility aliases and manual flow; MOBILE-WEB-FINAL-01 reports the browser smoke boundary. | M98 / M99 | MOBILE-WEB-FINAL-01 |
| Live Tracking / GPS / ETA | Driver/room/company live map surfaces | backend/src/services/boardingRouteImpactPreview.js; backend/src/services/boardingChangeRouteRefresh.js; ETA / OSRM helpers | web/src/panels/driver/MapPanel.jsx; web/src/panels/company/MapPanel.jsx; web/src/panels/room/MapPanel.jsx; web/src/lib/markers/vehicleMarkerC.js; web/src/components/map/markers.css | check:etasanity01; check:etaosrm01; check:etaosrm02; check:livetrackingfinal01; check:boardingops01c; check:uxlivemaptabssimplify01; check:m95e23b; check:m95e20 | static + release-only | COVERED_ACTIVE | None on the current static/product chain. | ETA / BOARDING-OPS-01C | None |
| Agreements / Contract / Shift | Company/room agreements and shifts | backend/src/routes/agreements.js; backend/src/routes/shifts/*.js; backend/src/services/agreementRouteChangePreview.js | web/src/panels/company/AgreementsPanel.jsx; web/src/panels/room/AgreementsPanel.jsx; web/src/panels/company/AgreementWizard.jsx; web/src/panels/shared/AgreementRouteChangePreviewCard.jsx | check:routechangefinal01; check:m91c_shift_to_agreement_prefill_check; check:m91c_shift_origin_link_check; check:m91c_linked_shift_disable_convert_check; check:m91d_agreement_operations_bridge_check; check:m91ef_draft_slot_hardening_check; check:m91_route_preview_room_guard_fix_check | static | COVERED_ACTIVE | None on the current static/product chain. | ROUTE-CHANGE-FINAL / M91 | None |
| Boarding Ops | Company/school/room boarding flow | backend/src/services/boardingRouteImpactPreview.js; backend/src/services/boardingChangeApplication.js; backend/src/services/boardingChangeRouteRefresh.js; backend/src/routes/requests.js; backend/src/routes/driver.js | web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx; web/src/panels/shared/boardingChangeUi.js; company/school/room operations panels | check:boardingops01a; check:bugrouteimpactpreviewbutton01; check:uxrouteimpactpreviewcompact01; check:boardingops01b; check:boardingops01c | static + manual boundary | COVERED_ACTIVE | None on the current static/product chain. | BOARDING-OPS-01A/01B/01C | None |
| Dynamic Savings / Readonly Preview | Company/room agreements and commercial flow | backend/src/services/boardingRouteImpactPreview.js; backend/src/services/agreementRouteChangePreview.js; route preview helpers | web/src/panels/shared/DynamicSavingsPreviewCard.jsx; web/src/panels/company/AgreementsPanel.jsx; web/src/panels/room/AgreementsPanel.jsx; web/src/panels/company/companyAgreementsRouteRefreshPendingSection.jsx; web/src/panels/room/roomAgreementsPanelSections.jsx | check:dynamicsavings01; check:routechangefinal01; check:boardingops01a; check:boardingops01b; check:boardingops01c; check:copliveaccept01 | static | COVERED_ACTIVE | None on the current static/product chain. Preview-only by design. | DYNAMIC-SAVINGS-01 | None |
| Commercial / Payment Preview | Company/room commercial panels | backend/src/scripts/pay_*.js; backend/src/scripts/op_04*.js; payment readiness helpers | web/src/panels/company/CommercialFlowPanel.jsx; web/src/panels/room/CommercialFlowPanel.jsx; web/src/panels/superadmin/CommercialCorePanel.jsx | check:pay01a; check:pay01b; check:pay01c; check:pay01d; check:pay01e; check:paysafe01; check:op04; check:qlt01; check:qlt02; check:qlt03; check:qlt04 | static + release-only | COVERED_ACTIVE | Execute/write actions remain deliberately forbidden. | PAY / QLT / OP | None |
| Quality / Evidence | Company/superadmin quality views | backend/src/scripts/qlt_*.js; backend/src/scripts/op_*.js; evidence helpers | web/src/panels/company/ServiceEvaluationPanel.jsx; web/src/panels/superadmin/TrustQualityPanel.jsx; web/src/panels/shared/ReportsPanel.jsx | check:qlt01; check:qlt02; check:qlt03; check:qlt04; check:qlt04a; check:qlt04b; check:op01; check:op02; check:op03; check:op04 | static + release-only | COVERED_ACTIVE | None on the current static/product chain. | QLT / OP | None |
| Sefer Abi / Copilot | Copilot drawer and terminal | backend/src/ai/service.js; backend/src/ai/chat/helpComposer.js; backend/src/ai/chat/intentRouter.js; backend/src/ai/chat/answerQualityPolicy.js; backend/src/ai/chat/copilotRoleTaskMatrix.js; backend/src/ai/chat/copilotHumanApprovalPolicy.js; backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js; backend/src/ai/chat/conversationWorkflowReasoningEngine.js; backend/src/ai/chat/conversationOperationHealthEngine.js; backend/src/ai/chat/conversationNextBestActionEngine.js; backend/src/ai/chat/conversationPlanReviewEngine.js; backend/src/ai/jobGuide/screenCatalog.js | web/src/components/copilot/FloatingCopilotDrawer.jsx; web/src/panels/shared/CopilotPanel.jsx | check:cop01a; check:cop01b; check:cop01c; check:cop01d; check:cop01e; check:cop02a; check:cop02b; check:cop02bfix01; check:cop03a; check:cop03afix01; check:cop03afix02; check:cop03b; check:cop03c; check:cop03cfix01; check:cop03cfix02; check:cop03cfix03; check:cop04a; check:cop04afix01; check:cop04afix02; check:cop04afix03; check:cop04afix04; check:cop04b; check:cop04bfix01; check:cop04bfix02; check:cop04bfix03; check:cop04bfix04; check:cop04bfix05; check:cop04bfix06; check:cop04bfix07; check:cop04bfix08; check:copilotroletaskmatrix01; check:copilotairoadmap01; check:copilotdemandintake01; check:copilotdemandagreement01; check:copilothumanapproval01; check:copilotexceldemandimport01; check:addressgeocodingconfidence01; check:copilotroutereviewhumanapproval01; check:copiloteblockruntimeanswerintegration01; check:copilotguidedtaskengine01; check:copilotdynamicquestionengine01; check:copilotsmartdiagnosticengine01; check:copilotrootcauseengine01; check:copilotworkflowreasoningengine01; check:copilotoperationhealthengine01; check:copilotnextbestactionengine01; check:copilotplanreviewengine01; check:hotfilesplitaichatcomposers01; check:hotfilesplitwebpanels01; check:seferabireasoningassistant01; check:copilotofferrecommendation01; check:copliveaccept01; check:uxcopilotpersona01; check:uxcopilotsmartchips01; check:uxcopilotterminal01; check:uxseferabilauncher01 | static | COVERED_ACTIVE | None on the current static/product chain. | COP-01..04 / COP-LIVE-ACCEPT-01 | None |
| Telematics / Provider Hub | Super Admin GPS readiness / Room vehicle mapping | docs/TELEMATICS_PROVIDER_HUB_01.md; backend/scripts/telematics_provider_hub_01_check.js | web/src/panels/superadmin/SuperAdminPanel.jsx; web/src/panels/room/roomVehiclesPanelSections.jsx | check:telematicsproviderhub01; check:m44telematicst1t5; check:uxroomvehiclestelematicsfix | static | COVERED_ACTIVE | None on the current static/product chain. | TELEMATICS-PROVIDER-HUB-01 | None |
| Telematics / Safe Drive | Driver live map and telematics surfaces | docs/SAFE_DRIVE_01.md; backend/scripts/safe_drive_01_check.js; ETA / OSRM helpers | web/src/utils/safeDriveSummary.js; web/src/panels/shared/SafeDriveSummaryCard.jsx; web/src/panels/driver/RoutePanel.jsx; web/src/panels/driver/MapPanel.jsx; web/src/panels/company/MapPanel.jsx; web/src/panels/room/MapPanel.jsx | check:safedrive01; check:telematicsproviderhub01; check:m44telematicst1t5; check:etaosrm01; check:etaosrm02; check:etasanity01 | static | COVERED_ACTIVE | None on the current static/product chain. | SAFE-DRIVE-01 | None |
| Offer Ranking Quality / Readonly Comparison | Company / room / super admin offer comparison surfaces | docs/OFFER_RANKING_QUALITY_01.md; backend/scripts/offer_ranking_quality_01_check.js | web/src/utils/offerQualityRanking.js; web/src/panels/shared/OfferQualityRankingCard.jsx; web/src/panels/company/WorkflowPanel.jsx; web/src/panels/company/companyShiftsPanelSections.jsx; web/src/panels/room/OffersPanel.jsx; web/src/panels/superadmin/TrustQualityPanel.jsx | check:offerrankingquality01 | static | COVERED_ACTIVE | Readonly comparison only; auto-select and auto-accept stay blocked. | OFFER-RANKING-QUALITY-01 | None |
| Production Rate Limit Policy | Auth / public / read-heavy / write-action / AI assistant rate-limit policy | backend/src/bootstrap/rateLimits.js; backend/src/env.js; backend/src/errors/http.js | backend rate-limit policy, 429 response copy, smoke/request-storm guard | check:requeststormresilience01; check:productionratelimitpolicy01; check:airesponsesemanticqualitygate01; check:testqualityandflakeaudit01 | static + policy | COVERED_ACTIVE | None on the current static/product chain; runtime enforcement already exists and stays unchanged. | PRODUCTION-RATE-LIMIT-POLICY-01 | None |
| Performance / Reliability | Repo audit / hot file hygiene | backend/scripts/repo_audit.js; m90c6-m90c10 repo hygiene gates | none | check:product-extensions; check:verifychain01; check:finaluxsmoke01; verify:final; m90_c6/m90_c7/m90_c8/m90_c9/m90_c10 chain | release-only | COVERED_RELEASE_ONLY | These are intentionally release gates, not commit-time smoke. | M90C / verify:final | None |
| Brand / Docs / Release | Docs, pack/export, closure tooling | tools/pack.ps1; tools/export_shareable_repo_bundle.ps1; docs-state and closure helpers | README.md; docs/*.md; tools/README.md; tools/wrappers/README.md | check:brand; check:docsstate01; check:m99ux01; check:m99kvkk01; check:finaluxsmoke01; verify:final; verify:snapshot | release-only + manual-release | COVERED_RELEASE_ONLY | No safe evidence-free pack/export path is intended. | M90/M99/FINAL | None |

## 5) Frontend / Web Registry

- Web package script sayısı: `8`
- Browser automation harness: `0` adet; bu repo'da Playwright/Cypress tabanlı ayrı bir harness bulunmadı.
- Web lint ve responsive smoke kontrolleri statik dosya/DOM/hizalama check'leri olarak yaşar.
- Manual / env / device / auth yüzeyleri aşağıdaki tabloda ayrıca görünür.

| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| root:check:m98e2e | package.json | root | node backend/scripts/m98_e2e_code_pin_access_acceptance_check.js | auth-session | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | ROOT-CHECK-M-98-E-2-E |  | Fails without auth/session |  |
| root:check:m98e3 | package.json | root | node backend/scripts/m98_e3_code_pin_field_ux_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-98-E-3 |  | Fails without device/emulator |  |
| root:smoke:m98e4 | package.json | root | node backend/scripts/m98_e4_code_pin_runtime_smoke.js | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | ROOT-SMOKE-M-98-E-4 |  | Loses manual smoke entrypoint |  |
| root:check:m95e25 | package.json | root | node backend/scripts/m95_e25_mobile_field_acceptance_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-E-25 |  | Fails without device/emulator |  |
| root:check:m95e26 | package.json | root | node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-E-26 |  | Fails without device/emulator |  |
| root:check:m95e27 | package.json | root | node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-E-27 |  | Fails without device/emulator |  |
| root:check:m95export01 | package.json | root | node backend/scripts/m95_export_01_runtime_check_compat_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-95-EXPORT-01 |  | Fails without device/emulator |  |
| root:check:m98e2b | package.json | root | node backend/scripts/m98_e2b_personel_access_backend_check.js | auth-session | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | ROOT-CHECK-M-98-E-2-B |  | Fails without auth/session |  |
| root:check:m98e2d | package.json | root | npm --prefix mobile run check:m98e2d | auth-session | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | ROOT-CHECK-M-98-E-2-D |  | Fails without auth/session |  |
| root:check:m98e5 | package.json | root | node backend/scripts/m98_e5_code_pin_manual_acceptance_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | ROOT-CHECK-M-98-E-5 |  | Fails without device/emulator |  |
| root:smoke:uxlivepanelpremium01 | package.json | root | node backend/scripts/ux_live_panel_premium_smoke_01.mjs | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | UX-LIVE-PANEL-PREMIUM-SMOKE-01 |  | Loses manual smoke entrypoint |  |
| root:smoke:productflowbuttonaudit01 | package.json | root | node backend/scripts/product_flow_button_audit_01.mjs | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | PRODUCT-FLOW-BUTTON-AUDIT-01 |  | Loses manual smoke entrypoint |  |
| backend:smoke | backend/package.json | backend | node scripts/smoke.js | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-SMOKE |  | Loses manual smoke entrypoint |  |
| backend:m91:smoke | backend/package.json | backend | npm run m91:smoke:agreement && npm run m91:smoke:route-preview | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-M-91-SMOKE |  | Loses manual smoke entrypoint |  |
| backend:current:surface | backend/package.json | backend | npm run smoke && npm run m91:smoke && npm run m91a:smoke | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-CURRENT-SURFACE |  | Loses manual smoke entrypoint |  |
| backend:bench:gps:100 | backend/package.json | backend | node scripts/bench_gps_publish_only.js --scenario=publish-only | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-GPS-100 |  | Loses manual smoke entrypoint |  |
| backend:bench:gps:100:auto | backend/package.json | backend | node scripts/bench_gps_publish_only.js --scenario=auto-reached | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-GPS-100-AUTO |  | Loses manual smoke entrypoint |  |
| backend:bench:gps:300:auto:panels | backend/package.json | backend | node scripts/bench_gps_publish_only.js --scenario=auto-reached --vehicles=300 --panelProfile=readstorm | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-GPS-300-AUTO-PANELS |  | Loses manual smoke entrypoint |  |
| backend:bench:reset | backend/package.json | backend | node scripts/bench_reset_data.js --force | manual-smoke | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | BACKEND-BENCH-RESET |  | Loses manual smoke entrypoint |  |
| web:dev | web/package.json | web | vite | env | REQUIRES_ENV | REQUIRES_ENV | WEB-DEV |  | Fails without env or external service | web package |
| web:build | web/package.json | web | vite build | env | REQUIRES_ENV | REQUIRES_ENV | WEB-BUILD |  | Fails without env or external service | web package |
| web:preview | web/package.json | web | vite preview | env | REQUIRES_ENV | REQUIRES_ENV | WEB-PREVIEW |  | Fails without env or external service | web package |
| mobile:build:simulator:ios | mobile/package.json | mobile | npx eas-cli build --profile preview-simulator --platform ios | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-SIMULATOR-IOS |  | Fails without device/emulator | mobile package |
| mobile:build:production:ios | mobile/package.json | mobile | npx eas-cli build --profile production --platform ios | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PRODUCTION-IOS |  | Fails without device/emulator | mobile package |
| mobile:build:android:apk | mobile/package.json | mobile | npm run build:preview:android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-ANDROID-APK |  | Fails without device/emulator | mobile package |
| mobile:build:android:local-apk | mobile/package.json | mobile | npx eas-cli build --profile local-apk --platform android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-ANDROID-LOCAL-APK |  | Fails without device/emulator | mobile package |
| mobile:build:android:aab | mobile/package.json | mobile | npm run build:production:android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-ANDROID-AAB |  | Fails without device/emulator | mobile package |
| mobile:check:mobiletext01 | mobile/package.json | mobile | node scripts/mobile_text_01_activation_copy_check.js | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-CHECK-MOBILETEXT-01 |  | Fails without device/emulator | mobile package |
| mobile:build:production:android | mobile/package.json | mobile | npx eas-cli build --profile production --platform android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PRODUCTION-ANDROID |  | Fails without device/emulator | mobile package |
| mobile:android | mobile/package.json | mobile | expo run:android | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-ANDROID |  | Fails without env or external service | mobile package |
| mobile:start | mobile/package.json | mobile | expo start | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-START |  | Fails without env or external service | mobile package |
| mobile:build:preview:android | mobile/package.json | mobile | npx eas-cli build --profile preview --platform android | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PREVIEW-ANDROID |  | Fails without device/emulator | mobile package |
| mobile:web | mobile/package.json | mobile | expo start --web | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-WEB |  | Fails without env or external service | mobile package |
| mobile:build:preview:ios | mobile/package.json | mobile | npx eas-cli build --profile preview --platform ios | device | REQUIRES_DEVICE | REQUIRES_DEVICE | MOBILE-BUILD-PREVIEW-IOS |  | Fails without device/emulator | mobile package |
| mobile:ios | mobile/package.json | mobile | expo run:ios | env | REQUIRES_ENV | REQUIRES_ENV | MOBILE-IOS |  | Fails without env or external service | mobile package |
| m50_mobile_release_readiness_check.js | mobile/scripts/m50_mobile_release_readiness_check.js | mobile | mobile:check:m50 | mobile | REQUIRES_DEVICE |  | M-50-MOBILE-RELEASE-READINESS-CHECK |  | Owner or chain unclear | mobile script |
| m57_3_session_kvkk_blocking_check.js | mobile/scripts/m57_3_session_kvkk_blocking_check.js | mobile | mobile:check:m57.3 | mobile | REQUIRES_AUTH_SESSION |  | M-57-3-SESSION-KVKK-BLOCKING-CHECK |  | Owner or chain unclear | mobile script |
| m57_4_android_preview_internal_build_check.js | mobile/scripts/m57_4_android_preview_internal_build_check.js | mobile | mobile:check:m57.4 | mobile | REQUIRES_DEVICE |  | M-57-4-ANDROID-PREVIEW-INTERNAL-BUILD-CHECK |  | Owner or chain unclear | mobile script |
| m81_3_ios_readiness_check.js | mobile/scripts/m81_3_ios_readiness_check.js | mobile | mobile:check:m81.3 | mobile | REQUIRES_DEVICE |  | M-81-3-IOS-READINESS-CHECK |  | Owner or chain unclear | mobile script |
| m82_6_release_env_acceptance_check.js | mobile/scripts/m82_6_release_env_acceptance_check.js | mobile | mobile:check:m82.6 | mobile | REQUIRES_DEVICE |  | M-82-6-RELEASE-ENV-ACCEPTANCE-CHECK |  | Owner or chain unclear | mobile script |
| m82_7_repo_hygiene_cleanup_check.js | mobile/scripts/m82_7_repo_hygiene_cleanup_check.js | mobile | mobile:check:m82.7 | mobile | REQUIRES_DEVICE |  | M-82-7-REPO-HYGIENE-CLEANUP-CHECK |  | Owner or chain unclear | mobile script |
| m82_8_verification_2_0_check.js | mobile/scripts/m82_8_verification_2_0_check.js | mobile | mobile:check:m82.8 | mobile | REQUIRES_DEVICE |  | M-82-8-VERIFICATION-2-0-CHECK |  | Owner or chain unclear | mobile script |
| m95_e10_login_403_error_parse_check.js | mobile/scripts/m95_e10_login_403_error_parse_check.js | mobile | mobile:check:m95e10 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-10-LOGIN-403-ERROR-PARSE-CHECK |  | Owner or chain unclear | mobile script |
| m95_e12_post_login_driver_shell_check.js | mobile/scripts/m95_e12_post_login_driver_shell_check.js | mobile | mobile:check:m95e12 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-12-POST-LOGIN-DRIVER-SHELL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e15_pin_change_layout_submit_check.js | mobile/scripts/m95_e15_pin_change_layout_submit_check.js | mobile | mobile:check:m95e15 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-15-PIN-CHANGE-LAYOUT-SUBMIT-CHECK |  | Owner or chain unclear | mobile script |
| m95_e20_driver_phone_gps_button_check.js | mobile/scripts/m95_e20_driver_phone_gps_button_check.js | mobile | mobile:check:m95e20 | mobile | REQUIRES_DEVICE |  | M-95-E-20-DRIVER-PHONE-GPS-BUTTON-CHECK |  | Owner or chain unclear | mobile script |
| m95_e21_driver_phone_gps_shift_resolver_check.js | mobile/scripts/m95_e21_driver_phone_gps_shift_resolver_check.js | mobile | mobile:check:m95e21 | mobile | REQUIRES_DEVICE |  | M-95-E-21-DRIVER-PHONE-GPS-SHIFT-RESOLVER-CHECK |  | Owner or chain unclear | mobile script |
| m95_e22a_driver_premium_ui_shell_check.js | mobile/scripts/m95_e22a_driver_premium_ui_shell_check.js | mobile | mobile:check:m95e22a | mobile | REQUIRES_DEVICE |  | M-95-E-22-A-DRIVER-PREMIUM-UI-SHELL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e22b_driver_route_navigation_premium_check.js | mobile/scripts/m95_e22b_driver_route_navigation_premium_check.js | mobile | mobile:check:m95e22b | mobile | REQUIRES_DEVICE |  | M-95-E-22-B-DRIVER-ROUTE-NAVIGATION-PREMIUM-CHECK |  | Owner or chain unclear | mobile script |
| m95_e22c_driver_premium_ui_shell_check.js | mobile/scripts/m95_e22c_driver_premium_ui_shell_check.js | mobile | mobile:check:m95e22c | mobile | REQUIRES_DEVICE |  | M-95-E-22-C-DRIVER-PREMIUM-UI-SHELL-CHECK |  | Owner or chain unclear | mobile script |
| m95_e23a_driver_phone_gps_standby_check.js | mobile/scripts/m95_e23a_driver_phone_gps_standby_check.js | mobile | mobile:check:m95e23a | mobile | REQUIRES_DEVICE |  | M-95-E-23-A-DRIVER-PHONE-GPS-STANDBY-CHECK |  | Owner or chain unclear | mobile script |
| m95_e24a_common_login_role_resolver_check.js | mobile/scripts/m95_e24a_common_login_role_resolver_check.js | mobile | mobile:check:m95e24a | mobile | REQUIRES_DEVICE |  | M-95-E-24-A-COMMON-LOGIN-ROLE-RESOLVER-CHECK |  | Owner or chain unclear | mobile script |
| m95_e24b_personel_parent_premium_check.js | mobile/scripts/m95_e24b_personel_parent_premium_check.js | mobile | mobile:check:m95e24b | mobile | REQUIRES_DEVICE |  | M-95-E-24-B-PERSONEL-PARENT-PREMIUM-CHECK |  | Owner or chain unclear | mobile script |
| m95_e24c_management_role_summary_check.js | mobile/scripts/m95_e24c_management_role_summary_check.js | mobile | mobile:check:m95e24c | mobile | REQUIRES_DEVICE |  | M-95-E-24-C-MANAGEMENT-ROLE-SUMMARY-CHECK |  | Owner or chain unclear | mobile script |
| m95_e4_login_payload_check.js | mobile/scripts/m95_e4_login_payload_check.js | mobile | mobile:check:m95e4 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-4-LOGIN-PAYLOAD-CHECK |  | Owner or chain unclear | mobile script |
| m95_e5_login_diagnostics_check.js | mobile/scripts/m95_e5_login_diagnostics_check.js | mobile | mobile:check:m95e5 | mobile | REQUIRES_AUTH_SESSION |  | M-95-E-5-LOGIN-DIAGNOSTICS-CHECK |  | Owner or chain unclear | mobile script |
| m98_bcd_activation_kvkk_check.js | mobile/scripts/m98_bcd_activation_kvkk_check.js | mobile | mobile:check:m98bcd | mobile | REQUIRES_AUTH_SESSION |  | M-98-BCD-ACTIVATION-KVKK-CHECK |  | Owner or chain unclear | mobile script |
| m98_e2d_mobile_code_pin_login_check.js | mobile/scripts/m98_e2d_mobile_code_pin_login_check.js | mobile | mobile:check:m98e2d | mobile | REQUIRES_AUTH_SESSION |  | M-98-E-2-D-MOBILE-CODE-PIN-LOGIN-CHECK |  | Owner or chain unclear | mobile script |
| check_m90_b1_canonical_closure_gate_repo_contract.ps1 | tools/check_m90_b1_canonical_closure_gate_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-B-1-CANONICAL-CLOSURE-GATE-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c6_hot_file_queue_policy_repo_contract.ps1 | tools/check_m90_c6_hot_file_queue_policy_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-C-6-HOT-FILE-QUEUE-POLICY-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c7_export_package_hygiene_repo_contract.ps1 | tools/check_m90_c7_export_package_hygiene_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-C-7-EXPORT-PACKAGE-HYGIENE-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c8_ci_verification_visibility_repo_contract.ps1 | tools/check_m90_c8_ci_verification_visibility_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | CHECK-M-90-C-8-CI-VERIFICATION-VISIBILITY-REPO-CONTRACT |  | Loses operator release tool | release tool |
| check_m90_c9_safe_closure_final_hygiene_repo_contract.ps1 | tools/check_m90_c9_safe_closure_final_hygiene_repo_contract.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | FINAL |  | Loses operator release tool | release tool |
| check_repo_audit_master.ps1 | tools/check_repo_audit_master.ps1 | tools |  | manual | MANUAL_RELEASE_TOOL |  | CHECK-REPO-AUDIT-MASTER |  | Loses operator release tool | release tool |
| pack_docs_ssot.ps1 | tools/pack_docs_ssot.ps1 | tools |  | manual | MANUAL_RELEASE_TOOL |  | PACK-DOCS-SSOT |  | Loses operator release tool | release tool |
| pack_m90_b1_canonical_closure_gate.ps1 | tools/pack_m90_b1_canonical_closure_gate.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-B-1-CANONICAL-CLOSURE-GATE |  | Loses operator release tool | release tool |
| pack_m90_c6_hot_file_queue_policy.ps1 | tools/pack_m90_c6_hot_file_queue_policy.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-C-6-HOT-FILE-QUEUE-POLICY |  | Loses operator release tool | release tool |
| pack_m90_c7_export_package_hygiene.ps1 | tools/pack_m90_c7_export_package_hygiene.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-C-7-EXPORT-PACKAGE-HYGIENE |  | Loses operator release tool | release tool |
| pack_m90_c8_ci_verification_visibility.ps1 | tools/pack_m90_c8_ci_verification_visibility.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-90-C-8-CI-VERIFICATION-VISIBILITY |  | Loses operator release tool | release tool |
| pack_m90_c9_safe_closure_final_hygiene.ps1 | tools/pack_m90_c9_safe_closure_final_hygiene.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | FINAL |  | Loses operator release tool | release tool |
| pack_m92_repo_verification_spine.ps1 | tools/pack_m92_repo_verification_spine.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-92-REPO-VERIFICATION-SPINE |  | Loses operator release tool | release tool |
| pack_m93_queue_durability_proof.ps1 | tools/pack_m93_queue_durability_proof.ps1 | tools |  | release | MANUAL_RELEASE_TOOL |  | PACK-M-93-QUEUE-DURABILITY-PROOF |  | Loses operator release tool | release tool |

## 6) Backend Registry

- Backend script/check yüzeyi canonical repo chain ve product-extensions chain etrafında toparlandı.
- `verify:repo`, `verify:final` ve `check:product-extensions` bu registry'nin ana omurgasıdır.

## 7) Tools / Wrappers / Pack / Export Registry

- `tools/pack.ps1` canonical master pack girişidir.
- `tools/pack_living.ps1`, `tools/wrappers/pack_living.ps1` ve `tools/wrappers/verify_living_*` compat/legacy girişlerdir.
- `tools/export_shareable_repo_bundle.ps1` ve `tools/write_m90_final_release_evidence.ps1` release-only araçlardır.
- `tools/check_repo_audit_master.ps1` repo audit master wrapper'ıdır.

## 8) Skip Gerekçeleri

| script | path | status | skip reason | risk if removed | notes |
| --- | --- | --- | --- | --- | --- |
| root:check:m98e2e | package.json | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | Fails without auth/session |  |
| root:check:m98e3 | package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator |  |
| root:smoke:m98e4 | package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| root:check:m95e25 | package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator |  |
| root:check:m95e26 | package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator |  |
| root:check:m95e27 | package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator |  |
| root:check:m95export01 | package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator |  |
| root:check:m98e2b | package.json | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | Fails without auth/session |  |
| root:check:m98e2d | package.json | REQUIRES_AUTH_SESSION | REQUIRES_AUTH_SESSION | Fails without auth/session |  |
| root:check:m98e5 | package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator |  |
| root:check:uxroomagreementstabs01 | package.json | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | Breaks compatibility alias; canonical replacement exists | compat alias |
| root:smoke:uxlivepanelpremium01 | package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| root:smoke:productflowbuttonaudit01 | package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| root:verify:snapshot | package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| root:verify:docs | package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| root:verify:hot | package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| root:verify:web-contract | package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| root:verify:milestones | package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| root:verify:milestones:live | package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:smoke | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:repo:check:chain | backend/package.json | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | Breaks compatibility alias; canonical replacement exists | compat alias |
| backend:m90b1check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m90c6check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m90c7check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m90c8check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m90c9check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m94dcheck | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m95e20check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m45:backup:create | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m45:backup:restore | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:milestones:static | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m91:smoke | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:current:surface | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:m91:milestones | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:m92check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| backend:bench:gps:100 | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:bench:gps:100:auto | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:bench:gps:300:auto:panels | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:bench:reset | backend/package.json | MANUAL_SMOKE | MANUAL_ACCEPTANCE_ONLY | Loses manual smoke entrypoint |  |
| backend:spec16check | backend/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate |  |
| web:dev | web/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | web package |
| web:build | web/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | web package |
| web:preview | web/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | web package |
| mobile:build:simulator:ios | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:build:production:ios | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:build:android:apk | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:build:android:local-apk | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:build:android:aab | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:doctor:expo | mobile/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate | mobile package |
| mobile:check:mobiletext01 | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:check:m96bnotifications | mobile/package.json | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:build:internal:android | mobile/package.json | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:build:production:android | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:android | mobile/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | mobile package |
| mobile:start | mobile/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | mobile package |
| mobile:doctor:mobile | mobile/package.json | ACTIVE_RELEASE_ONLY | RELEASE_ONLY | Breaks release / evidence / closure gate | mobile package |
| mobile:build:internal:ios | mobile/package.json | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:build:preview:android | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:web | mobile/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | mobile package |
| mobile:build:preview:ios | mobile/package.json | REQUIRES_DEVICE | REQUIRES_DEVICE | Fails without device/emulator | mobile package |
| mobile:ios | mobile/package.json | REQUIRES_ENV | REQUIRES_ENV | Fails without env or external service | mobile package |

## 9) Eksik Gerekli Script/Check Listesi

- MISSING_REQUIRED_NOW: `0`
- MISSING_RELEASE_ONLY: `0`
- MISSING_MANUAL_SMOKE: `0`
- MISSING_FUTURE_MILESTONE: `1`
- NOT_NEEDED: `0`

| candidate | status | why | ownerMilestone | requiredNextAction |
| --- | --- | --- | --- | --- |
| PROACTIVE-COPILOT-01 | MISSING_FUTURE_MILESTONE | Proactive risk badge/drawer behavior is a future product behavior, not a current static consolidation target. | Future Copilot milestone | Wait for the feature milestone, then add a focused static check only if the behavior exists. |

## 10) Eski Sistem Kalıntıları

| path | terms | status |
| --- | --- | --- |
| backend/scripts/_m91_route_preview_checks.js | Hub | ACTIVE |
| backend/scripts/_m91_smoke_helpers.js | Hub | ACTIVE |
| backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js | Hub | NEEDS_REVIEW |
| backend/scripts/audit_log_and_approval_trace_01_check.js | debug payload | NEEDS_REVIEW |
| backend/scripts/audit_logs_session_hotfix_check.mjs | Audit Logs | NEEDS_REVIEW |
| backend/scripts/boarding_ops_01a_route_impact_preview_check.js | OperationProof | NEEDS_REVIEW |
| backend/scripts/boarding_ops_01b_apply_accepted_change_check.js | OperationProof, raw internal | NEEDS_REVIEW |
| backend/scripts/boarding_ops_01c_driver_route_refresh_check.js | OperationProof | NEEDS_REVIEW |
| backend/scripts/cop_01a_op_qlt_pay_copilot_guide_check.js | Yer | ACTIVE |
| backend/scripts/cop_01c_real_context_bridge_check.js | Yer, OperationProof | ACTIVE |
| backend/scripts/cop_03a_fix_02_visible_reply_chip_polish_check.js | Yer | ACTIVE |
| backend/scripts/cop_03a_fix_global_screen_purpose_check.js | Yer | ACTIVE |
| backend/scripts/cop_03a_screen_catalog_parity_check.js | Log Export | ACTIVE |
| backend/scripts/cop_03c_fix_03_live_acceptance_polish_check.js | Hub, OperationProof | ACTIVE |
| backend/scripts/cop_04a_fix_01_global_live_answer_final_polish_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04a_fix_02_contract_generation_intent_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04a_fix_03_live_company_agreements_context_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04a_fix_04_quick_help_contract_answer_route_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04a_global_answer_quality_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_01_superadmin_room_live_context_check.js | Yer, OperationProof, raw internal | ACTIVE |
| backend/scripts/cop_04b_fix_02_company_commercial_context_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_03_personel_parent_driver_context_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_04_chip_answer_premium_polish_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_05_live_room_selected_vehicle_route_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_07_personel_live_copilot_context_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_04b_fix_08_parent_live_context_check.js | OperationProof | ACTIVE |
| backend/scripts/cop_live_accept_01_check.js | OperationProof | ACTIVE |
| backend/scripts/copilot_guided_task_engine_01_check.js | Yer | NEEDS_REVIEW |
| backend/scripts/copilot_reasoning_answer_composer_01_check.js | Yer | NEEDS_REVIEW |
| backend/scripts/copilot_role_task_matrix_01_check.js | Hub | NEEDS_REVIEW |
| backend/scripts/copilot_route_review_human_approval_01_check.js | Vardis, Hub, Yer | NEEDS_REVIEW |
| backend/scripts/copilot_stop_route_draft_01_check.js | Hub | NEEDS_REVIEW |
| backend/scripts/docs_ssot_brand_artifact_cleanup_01_check.js | Vardis, Hub | NEEDS_REVIEW |
| backend/scripts/eta_osrm_01_route_eta_service_check.js | OperationProof | NEEDS_REVIEW |
| backend/scripts/eta_osrm_02_api_eta_bridge_check.js | OperationProof | NEEDS_REVIEW |
| backend/scripts/excel_to_route_readiness_redteam_01_check.js | Hub, Yer | NEEDS_REVIEW |
| backend/scripts/final_ux_smoke_01_check.js | Hub, Yer, Audit Logs, Log Export, personel-access | NEEDS_REVIEW |
| backend/scripts/invite_based_membership_01_check.js | Hub, Yer | NEEDS_REVIEW |
| backend/scripts/m10check.js | Audit Logs | ACTIVE_RELEASE_ONLY |

## 11) Cleanup Raporu

- REMOVED: `3`
- REMOVE_CANDIDATE: `0`
- ARCHIVED candidate: repo içindeki archive rotaları; aktif harness'ten kaldırılmadı.
- NEEDS_UPDATE: `0`
- LEGACY_COMPAT: alias/wrapper girişleri güvenli biçimde tutuldu.

### Legacy / Archive / Update Candidates

| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| root:check:uxroomagreementstabs01 | package.json | root | node backend/scripts/ux_panel_reality_cleanup_02d_check.js | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | ROOT-CHECK-UXROOMAGREEMENTSTABS-01 | check:uxpanelrealitycleanup02d | Breaks compatibility alias; canonical replacement exists | compat alias |
| backend:repo:check:chain | backend/package.json | backend | node scripts/run_repo_check_chain.js --phase all | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | BACKEND-REPO-CHECK-CHAIN | repo:check | Breaks compatibility alias; canonical replacement exists | compat alias |
| mobile:check:m96bnotifications | mobile/package.json | mobile | node scripts/m96_b_notifications_check.js | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | MOBILE-CHECK-M-96-BNOTIFICATIONS | check:m96b | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:build:internal:android | mobile/package.json | mobile | npx eas-cli build --profile preview --platform android | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | MOBILE-BUILD-INTERNAL-ANDROID | build:preview:android | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| mobile:build:internal:ios | mobile/package.json | mobile | npx eas-cli build --profile preview --platform ios | compat | LEGACY_COMPAT | LEGACY_COMPAT_ONLY | MOBILE-BUILD-INTERNAL-IOS | build:preview:ios | Breaks compatibility alias; canonical replacement exists | compat alias; mobile package |
| apply_m45.ps1 | tools/_archive/legacy-overlays/apply_m45.ps1 | tools |  | archived | ARCHIVED |  | APPLY-M-45 |  | Historical only | archive path |
| apply_organization_plan_relation_fix.ps1 | tools/_archive/legacy-overlays/apply_organization_plan_relation_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-ORGANIZATION-PLAN-RELATION-FIX |  | Historical only | archive path |
| apply_organization_schema_dedupe_hotfix.ps1 | tools/_archive/legacy-overlays/apply_organization_schema_dedupe_hotfix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-ORGANIZATION-SCHEMA-DEDUPE-HOTFIX |  | Historical only | archive path |
| apply_overlay_m42_schema_restore.ps1 | tools/_archive/legacy-overlays/apply_overlay_m42_schema_restore.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-42-SCHEMA-RESTORE |  | Historical only | archive path |
| apply_overlay_m46_6_c2_d4_simple_role_mode.ps1 | tools/_archive/legacy-overlays/apply_overlay_m46_6_c2_d4_simple_role_mode.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-46-6-C-2-D-4-SIMPLE-ROLE-MODE |  | Historical only | archive path |
| apply_overlay_m46_6_c2_screen_coverage_terminology.ps1 | tools/_archive/legacy-overlays/apply_overlay_m46_6_c2_screen_coverage_terminology.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-46-6-C-2-SCREEN-COVERAGE-TERMINOLOGY |  | Historical only | archive path |
| apply_overlay_m46_7_ssot_sync.ps1 | tools/_archive/legacy-overlays/apply_overlay_m46_7_ssot_sync.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-46-7-SSOT-SYNC |  | Historical only | archive path |
| apply_overlay_m96_company_list_click_details.ps1 | tools/_archive/legacy-overlays/apply_overlay_m96_company_list_click_details.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-M-96-COMPANY-LIST-CLICK-DETAILS |  | Historical only | archive path |
| apply_overlay_organization_enum_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_enum_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-ENUM-FIX |  | Historical only | archive path |
| apply_overlay_organization_market_direct_live_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_market_direct_live_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-MARKET-DIRECT-LIVE-FIX |  | Historical only | archive path |
| apply_overlay_organization_market_direct_live_fix_v2.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_market_direct_live_fix_v2.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-MARKET-DIRECT-LIVE-FIX-V-2 |  | Historical only | archive path |
| apply_overlay_organization_market_first_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_market_first_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-MARKET-FIRST-FIX |  | Historical only | archive path |
| apply_overlay_organization_seed_router_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_organization_seed_router_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ORGANIZATION-SEED-ROUTER-FIX |  | Historical only | archive path |
| apply_overlay_personel_public_link_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_personel_public_link_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-PERSONEL-PUBLIC-LINK-FIX |  | Historical only | archive path |
| apply_overlay_room_shifts_panel_fix.ps1 | tools/_archive/legacy-overlays/apply_overlay_room_shifts_panel_fix.ps1 | tools |  | archived | ARCHIVED |  | APPLY-OVERLAY-ROOM-SHIFTS-PANEL-FIX |  | Historical only | archive path |
| build_overlay_bundle.ps1 | tools/_archive/legacy-overlays/build_overlay_bundle.ps1 | tools |  | archived | ARCHIVED |  | BUILD-OVERLAY-BUNDLE |  | Historical only | archive path |
| overlay_M58_3_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_3_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-3-APPLY |  | Historical only | archive path |
| overlay_M58_4_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_4_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-4-APPLY |  | Historical only | archive path |
| overlay_M58_5_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_5_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-5-APPLY |  | Historical only | archive path |
| overlay_M58_6_apply.ps1 | tools/_archive/legacy-overlays/overlay_M58_6_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-58-6-APPLY |  | Historical only | archive path |
| overlay_M59_1_apply.ps1 | tools/_archive/legacy-overlays/overlay_M59_1_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-59-1-APPLY |  | Historical only | archive path |
| overlay_M59_apply.ps1 | tools/_archive/legacy-overlays/overlay_M59_apply.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-M-59-APPLY |  | Historical only | archive path |
| overlay_fix_driver_completeshift_crash.ps1 | tools/_archive/legacy-overlays/overlay_fix_driver_completeshift_crash.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-FIX-DRIVER-COMPLETESHIFT-CRASH |  | Historical only | archive path |
| overlay_fix_m41_device_binding.ps1 | tools/_archive/legacy-overlays/overlay_fix_m41_device_binding.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-FIX-M-41-DEVICE-BINDING |  | Historical only | archive path |
| overlay_update_checklist_ssot.ps1 | tools/_archive/legacy-overlays/overlay_update_checklist_ssot.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-CHECKLIST-SSOT |  | Historical only | archive path |
| overlay_update_checklist_ssot_safe.ps1 | tools/_archive/legacy-overlays/overlay_update_checklist_ssot_safe.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-CHECKLIST-SSOT-SAFE |  | Historical only | archive path |
| overlay_update_checklist_ssot_user.ps1 | tools/_archive/legacy-overlays/overlay_update_checklist_ssot_user.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-CHECKLIST-SSOT-USER |  | Historical only | archive path |
| overlay_update_primer_snapshot_safe.ps1 | tools/_archive/legacy-overlays/overlay_update_primer_snapshot_safe.ps1 | tools |  | archived | ARCHIVED |  | OVERLAY-UPDATE-PRIMER-SNAPSHOT-SAFE |  | Historical only | archive path |
| dedupe-user-notifications.ps1 | tools/_archive/oneoff-hotfixes/dedupe-user-notifications.ps1 | tools |  | archived | ARCHIVED |  | DEDUPE-USER-NOTIFICATIONS |  | Historical only | archive path |
| fix-escaped-import-quotes.ps1 | tools/_archive/oneoff-hotfixes/fix-escaped-import-quotes.ps1 | tools |  | archived | ARCHIVED |  | FIX-ESCAPED-IMPORT-QUOTES |  | Historical only | archive path |
| repair-schema-kind.ps1 | tools/_archive/oneoff-hotfixes/repair-schema-kind.ps1 | tools |  | archived | ARCHIVED |  | REPAIR-SCHEMA-KIND |  | Historical only | archive path |
| check_m71_room_title_hotfix_repo_contract.ps1 | tools/check_m71_room_title_hotfix_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-71-ROOM-TITLE-HOTFIX-REPO-CONTRACT | tools/checks/living/hotfixes/check_m71_room_title_hotfix_repo_contract.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| check_m71_summary_hotpath_repo_contract.ps1 | tools/check_m71_summary_hotpath_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-71-SUMMARY-HOTPATH-REPO-CONTRACT |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | tools/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-71-WORKFLOW-LOADSUMMARY-HOTFIX-REPO-CONTRACT | tools/checks/living/hotfixes/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| check_m72_georeview_token_hotfix_repo_contract.ps1 | tools/check_m72_georeview_token_hotfix_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-72-GEOREVIEW-TOKEN-HOTFIX-REPO-CONTRACT | tools/checks/living/hotfixes/check_m72_georeview_token_hotfix_repo_contract.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| check_m72_hot_endpoint_reduction_repo_contract.ps1 | tools/check_m72_hot_endpoint_reduction_repo_contract.ps1 | tools |  | compat | LEGACY_COMPAT |  | CHECK-M-72-HOT-ENDPOINT-REDUCTION-REPO-CONTRACT |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| pack_living.ps1 | tools/pack_living.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-LIVING | tools/pack.ps1 | Breaks compatibility alias; canonical replacement exists | release tool |
| pack_m71_room_title_hotfix.ps1 | tools/pack_m71_room_title_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-ROOM-TITLE-HOTFIX | tools/packs/living/hotfixes/pack_m71_room_title_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m71_summary_hotpath.ps1 | tools/pack_m71_summary_hotpath.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-SUMMARY-HOTPATH |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| pack_m71_ui_contract_hotfix.ps1 | tools/pack_m71_ui_contract_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-UI-CONTRACT-HOTFIX | tools/packs/living/hotfixes/pack_m71_ui_contract_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m71_workflow_loadsummary_hotfix.ps1 | tools/pack_m71_workflow_loadsummary_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-71-WORKFLOW-LOADSUMMARY-HOTFIX | tools/packs/living/hotfixes/pack_m71_workflow_loadsummary_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m72_georeview_token_hotfix.ps1 | tools/pack_m72_georeview_token_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-72-GEOREVIEW-TOKEN-HOTFIX | tools/packs/living/hotfixes/pack_m72_georeview_token_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_m72_hot_endpoint_reduction.ps1 | tools/pack_m72_hot_endpoint_reduction.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-72-HOT-ENDPOINT-REDUCTION |  | Breaks compatibility alias; canonical replacement exists | compat alias; release tool |
| pack_m75_repo_contract_hotfix.ps1 | tools/pack_m75_repo_contract_hotfix.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-M-75-REPO-CONTRACT-HOTFIX | tools/packs/living/hotfixes/pack_m75_repo_contract_hotfix.ps1 | Breaks compatibility alias; canonical replacement exists | compat alias; wrapper alias |
| pack_living.ps1 | tools/wrappers/pack_living.ps1 | tools |  | compat | LEGACY_COMPAT |  | PACK-LIVING | tools/pack.ps1 | Breaks compatibility alias; canonical replacement exists | compat wrapper |
| verify_living_runtime.ps1 | tools/wrappers/verify_living_runtime.ps1 | tools |  | compat | LEGACY_COMPAT |  | VERIFY-LIVING-RUNTIME | tools/wrappers/verify_final.ps1 | Breaks compatibility alias; canonical replacement exists | compat wrapper |
| verify_living_static.ps1 | tools/wrappers/verify_living_static.ps1 | tools |  | compat | LEGACY_COMPAT |  | VERIFY-LIVING-STATIC | tools/wrappers/verify_final.ps1 | Breaks compatibility alias; canonical replacement exists | compat wrapper |

### REMOVED

| group | removed | canonical | action | reason | replacement | refsUpdated | riskIfRemoved |
| --- | --- | --- | --- | --- | --- | --- | --- |
| COP-04B-FIX-06 free-chat bridge alias | backend/scripts/cop_04b_fix_06_live_drawer_context_bridge_check.js | backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | removed | Pure import alias wrapper removed after the package entry was retargeted to the canonical free-chat bridge. | backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md, backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js | Low; the canonical package command still runs the same coverage. |
| UX company panel smoke alias | backend/scripts/ux_company_panel_smoke_01_check.js | backend/scripts/ux_company_ops_panel_tabs_01_check.js | removed | Pure import alias wrapper removed after the package entry was retargeted to the canonical company ops tabs check. | backend/scripts/ux_company_ops_panel_tabs_01_check.js | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Low; canonical company ops check remains in the same chain. |
| UX live map tabs fix alias | backend/scripts/ux_live_map_tabs_fix_01_check.js | backend/scripts/ux_live_map_tabs_simplify_01_check.js | removed | Pure import alias wrapper removed after the package entry was retargeted to the canonical live map simplification check. | backend/scripts/ux_live_map_tabs_simplify_01_check.js | package.json, docs/SCRIPT_HARNESS_CONSOLIDATION_01.md | Low; canonical live map check remains in the same chain. |

### Remove Candidates

| script | path | domain | package command | chain | status | skip reason | owner milestone | replacement | risk if removed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 12) Yeni Verify Standardı

- Her commit: `npm run verify:repo`, `npm run check:product-extensions`, `npm run verify:final`
- Release-only: `verify:snapshot`, pack/export/evidence araçları
- Manual smoke: `smoke:*`, `bench:*`, `current:surface`, `run_all_checks.ps1`
- Env/device gerekenler: Android/iOS build profilleri, Expo / EAS ve cihaz/emülatör yüzeyleri

## 13) M0-M41 Legacy Milestone Family

- `m0-latest-static-milestones` = `node backend/scripts/run_m0_latest.js --static-only --to latest --continue` inside `verify:repo`.
- `run_m0_latest.js` discovers `backend/scripts/m*.{js,cjs,mjs}` and runs the static subset from M0 through latest; the legacy family below is the direct M0-M41 slice of that runner.
- `tools/gate.ps1` and `tools/_packs/pack_m0_m41.ps1` remain the explicit legacy M0→M41 gate; removing any listed file hard-fails that gate even if the modern runner merely loses coverage.
- Exact duplicate with `FINAL-UX-SMOKE-01`, `COP-LIVE-ACCEPT-01`, `BOARDING-OPS-01A/01B/01C`, or `ROUTE-CHANGE-FINAL-01`: none. The only partial overlap is the security / parent-live / KVKK / auth surface that later checks refined.
- Adjacent historical aliases `m162check.js` and `m163check.js` are outside the requested family and are not classified here.

| milestone | script | status | reason | replacement | chain impact |
| --- | --- | --- | --- | --- | --- |
| M0 | backend/scripts/m0check.js | ACTIVE_CORE | Health + /api/me smoke; current-model compatible. | retained canonical family member | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern run_m0_latest runner also loses canonical coverage. |
| M1 | backend/scripts/m1check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M2 | backend/scripts/m2check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M3 | backend/scripts/m3check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M4 | backend/scripts/m4check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M5 | backend/scripts/m5check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M6 | backend/scripts/m6check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M7 | backend/scripts/m7check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M8 | backend/scripts/m8check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M9 | backend/scripts/m9check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M10 | backend/scripts/m10check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M11 | backend/scripts/m11check.js | ARCHIVED | Historical gate only; no longer a product-regression target. | none | Removing it breaks the legacy M0→M41 gate; the modern verify chain only loses historical coverage. |
| M12 | backend/scripts/m12check.js | ARCHIVED | Historical gate only; no longer a product-regression target. | none | Removing it breaks the legacy M0→M41 gate; the modern verify chain only loses historical coverage. |
| M13 | backend/scripts/m13check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M14 | backend/scripts/m14check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M15 | backend/scripts/m15check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M16 | backend/scripts/m16check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M17 | backend/scripts/m17check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M18 | backend/scripts/m18check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M19 | backend/scripts/m19check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M20 | backend/scripts/m20check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M21 | backend/scripts/m21check.js | ACTIVE_CORE | SUPER_ADMIN companies + rooms create/list; current-model compatible. | retained canonical family member | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern run_m0_latest runner also loses canonical coverage. |
| M22 | backend/scripts/m22check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M23 | backend/scripts/m23check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M24 | backend/scripts/m24check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M25 | backend/scripts/m25check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M26 | backend/scripts/m26check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M27 | backend/scripts/m27check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M28 | backend/scripts/m28check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M29 | backend/scripts/m29check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M30 | backend/scripts/m30check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M31 | backend/scripts/m31check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M32 | backend/scripts/m32check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M33 | backend/scripts/m33check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M34 | backend/scripts/m34check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M35 | backend/scripts/m35check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M36 | backend/scripts/m36check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M37 | backend/scripts/m37check.js | ACTIVE_CORE | School + Parent E2E; current security model compatible. | retained canonical family member | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern run_m0_latest runner also loses canonical coverage. |
| M38 | backend/scripts/m38check.js | ACTIVE_CORE | KVKK consent gate + prod guards; current security model compatible. | retained canonical family member | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern run_m0_latest runner also loses canonical coverage. |
| M39 | backend/scripts/m39check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M40 | backend/scripts/m40check.js | NEEDS_UPDATE | Still a real product regression, but the harness assumptions are older than the current SeferPakt security/product model. | Current security / acceptance checks (verify:repo + M98/M99 + FINAL-UX-SMOKE / COP-LIVE-ACCEPT / BOARDING-OPS / ROUTE-CHANGE-FINAL) | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern verify chain only loses coverage and should be modernized first. |
| M41 | backend/scripts/m41check.js | ACTIVE_CORE | Refresh token + device binding + Redis rate-limit; current auth model compatible. | retained canonical family member | Removing it breaks the legacy M0→M41 gate (tools/gate.ps1 and tools/_packs/pack_m0_m41.ps1); the modern run_m0_latest runner also loses canonical coverage. |

## 14) Notes

- Bu doküman repo harness envanterini tek yerde toplar.
- Invite membership doc: `docs/INVITE_BASED_MEMBERSHIP_01.md`
- Safe cleanup bu turda yalnızca saf alias wrapper dosyalarında yapıldı.
- Legacy alias girişleri docs ve chain referansları nedeniyle korunuyor.
