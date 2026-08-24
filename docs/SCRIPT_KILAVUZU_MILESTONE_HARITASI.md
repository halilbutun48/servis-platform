# SCRIPT KILAVUZU / MILESTONE HARITASI

Tarih: 2026-04-08  
Repo: `servis-platform`  
Kapsam: Bu doküman, M0'dan güncel latest milestone'a kadar milestone ve script ilişkisini **tek resmi rehberde** toplar.

## 1) Bu dosya nasıl okunmalı?
- Önce `tools/repo_contract_state.json` okunur.
- Sonra bu dosya okunur.
- Tarihsel ve canonical bilgi karıştırılmaz.
- Bir milestone için mümkün olan en güçlü kanıt sırası: state/marker -> pack/check -> runbook -> ilgili ekran/route.

## 2) Kanıt seviyesi sözlüğü
- **[CANONICAL]**: Güncel canlı anlatının parçası.
- **[HISTORICAL]**: Tarihsel anchor veya compatibility alanı.
- **[PACK]**: Resmi pack komutu bulunan alan.
- **[CHECK]**: Repo contract veya node check izi bulunan alan.
- **[RUNBOOK]**: Operasyon veya kabul anlatımı olan alan.

## 3) Tek rehber kuralı
- Bu dosya aktif script rehberidir.
- `docs/_archive/legacy-notes/script-guide-redirects/` altındaki tarihsel yönlendirme dosyaları artık aktif rehber değildir.
- Güncel rota için yalnız bu dosya, `PRIMER_SSOT`, `MILESTONE_REGISTRY` ve `CHECKLIST_SSOT` birlikte okunur.

### Canonical owner map
- `backend/scripts/current_head_scope_policy_01_check.js` -> `backend/scripts/lib/currentHeadScopePolicy.js`
- `backend/scripts/canonical_provenance_registry_01_check.js` -> `backend/scripts/lib/canonicalProvenanceRegistry.js`
- `backend/scripts/lib/guardGitScope.js` -> exact diff/status identity semantics
- `backend/scripts/lib/guardTextIntegrity.js` -> normalized-text identity semantics
- `backend/scripts/lib/guardSmokeEvidence.js` -> smoke evidence identity semantics
- Role/security/audit checkers are consumers of those owners; they are not independent global SSOTs.
- Canonical closure baseline for this guide: `Product Extensions 198/198 GREEN`. See `docs/PRIMER_SSOT.md` for the human-readable closure narrative.

## 4) Master orchestration
### Ana komutlar
- `npm run verify:repo`
- `tools\check-repo.ps1 -Phase all`
- `node backend\scripts\run_repo_check_chain.js --phase all`
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- `node backend\scripts\run_m0_latest.js --static-only --to latest --continue`
- `npm run verify:milestones`
- `node backend\scripts\m94d_admin_payment_security_export_check.js`
- `node backend\scripts\m94e_queue_chaos_alarm_check.js`
- `node backend\scripts\m94e_queue_chaos_alarm_probe.js`
- `node backend\scripts\m95_e25_mobile_field_acceptance_check.js`
- `node backend\scripts\m95_e26_android_emulator_smoke_plan_check.js`
- `node backend\scripts\m95_e27_real_android_device_field_proof_prep_check.js`
- `node backend\scripts\m95_export_01_runtime_check_compat_check.js`
- `node backend\scripts\m97_panel_operations_check.js`
- `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- `node backend\scripts\m98_e2e_code_pin_access_acceptance_check.js`
- `node backend\scripts\m98_e3_code_pin_field_ux_check.js`
- `node backend\scripts\m98_e5_code_pin_manual_acceptance_check.js`
- `node backend\scripts\m99_kvkk_01_mobile_web_plain_text_check.js`
- `node backend\scripts\m99_ux_01_visible_text_hygiene_check.js`
- `node backend\scripts\op_01_operation_proof_service_proof_check.js`
- `node backend\scripts\op_02_manual_operator_proof_note_check.js`
- `node backend\scripts\op_03_web_operation_proof_card_check.js`
- `node backend\scripts\web_01a_flow_summary_polish_check.js`
- `node backend\scripts\web_01b_superadmin_system_mode_summary_check.js`
- `node backend\scripts\qlt_04b_compact_signal_list_check.js`
- `node backend\scripts\pay_01e_payment_readonly_closure_check.js`
- `node backend\scripts\pay_safe_01_payment_write_gate_check.js`
- `node backend\scripts\cop_01e_operational_guide_acceptance_check.js`
- `node backend\scripts\cop_02a_program_ici_genel_rehber_check.js`
- `check:cop03a` -> `node backend\scripts\cop_03a_screen_catalog_parity_check.js`
- `check:cop03afix01` -> `node backend\scripts\cop_03a_fix_global_screen_purpose_check.js`
- `check:cop03afix02` -> `node backend\scripts\cop_03a_fix_02_visible_reply_chip_polish_check.js`
- `check:cop03b` -> `node backend\scripts\cop_03b_workflow_domain_depth_check.js`
- `check:cop03c` -> `node backend\scripts\cop_03c_live_data_action_simulation_check.js`
- `check:cop03cfix01` -> `node backend\scripts\cop_03c_fix_01_live_workflow_answer_quality_check.js`
- `check:cop03cfix02` -> `node backend\scripts\cop_03c_fix_02_live_answer_precision_check.js`
- `check:cop04afix03` -> `node backend\scripts\cop_04a_fix_03_live_company_agreements_context_check.js`
- `check:cop04afix04` -> `node backend\scripts\cop_04a_fix_04_quick_help_contract_answer_route_check.js`
- `check:cop03cfix03` -> `node backend\scripts\cop_03c_fix_03_live_acceptance_polish_check.js`
- `check:cop04a` -> `node backend\scripts\cop_04a_global_answer_quality_check.js`
- `check:cop04afix02` -> `node backend\scripts\cop_04a_fix_02_contract_generation_intent_check.js`
- `check:cop04afix01` -> `node backend\scripts\cop_04a_fix_01_global_live_answer_final_polish_check.js`
- `check:cop04b` -> `node backend\scripts\cop_04b_panel_context_audit_check.js`
- `check:cop04bfix01` -> `node backend\scripts\cop_04b_fix_01_superadmin_room_live_context_check.js`
- `check:cop04bfix02` -> `node backend\scripts\cop_04b_fix_02_company_commercial_context_check.js`
- `check:cop04bfix03` -> `node backend\scripts\cop_04b_fix_03_personel_parent_driver_context_check.js`
- `check:cop04bfix04` -> `node backend\scripts\cop_04b_fix_04_chip_answer_premium_polish_check.js`
- `check:cop04bfix05` -> `node backend\scripts\cop_04b_fix_05_live_room_selected_vehicle_route_check.js`
- `check:cop04bfix06` -> `node backend\scripts\cop_04b_fix_06_free_chat_context_bridge_check.js`
- `check:cop04bfix07` -> `node backend\scripts\cop_04b_fix_07_personel_live_copilot_context_check.js`
- `check:cop04bfix08` -> `node backend\scripts\cop_04b_fix_08_parent_live_context_check.js`
- `check:uxcopilotsmartchips01` -> `node backend\scripts\ux_copilot_smart_chips_01_check.js`
- `check:uxcopilotpersona01` -> `node backend\scripts\ux_copilot_persona_01_check.js`
- `check:uxcopilotterminal01` -> `node backend\scripts\ux_copilot_terminal_01_check.js`
- `check:seferabiterminalhumanize01` -> `node backend\scripts\sefer_abi_terminal_humanize_01_check.js`
- `check:uxnav01` -> `node backend\scripts\ux_nav_01_premium_navdock_check.js`
- `check:uxbrandloginpremium01` -> `node backend\scripts\ux_brand_login_premium_01_check.js`
- `check:uxmobilewebshellclarity01` -> `node backend\scripts\ux_mobile_web_shell_clarity_01_check.js`
- `check:uxmobileallrolespanelfix01` -> `node backend\scripts\ux_mobile_all_roles_panel_fix_01_check.js`
- `check:uxroomcompanyshiftsmobilecardfix01` -> `node backend\scripts\ux_room_company_shifts_mobile_card_fix_01_check.js`
- `check:uxshiftsresponsivelayoutfix01` -> `node backend\scripts\ux_shifts_responsive_layout_fix_01_check.js`
- `check:uxmobileoverflowminimapreadability01` -> `node backend\scripts\ux_mobile_overflow_minimap_readability_01_check.js`
- `check:uxdensity01` -> `node backend\scripts\ux_density_01_panel_card_density_check.js`
- `check:finaluxsmoke01` -> `node backend\scripts\final_ux_smoke_01_check.js`
- `check:uxlivepanelsmokeaudit01` -> `node backend\scripts\ux_live_panel_smoke_audit_01_check.js`
- `check:uxsmokepassminusevidence01` -> `node backend\scripts\ux_smoke_pass_minus_evidence_01_check.js`
- `check:uxsmokepassminuszero01` -> `node backend\scripts\ux_smoke_pass_minus_zero_01_check.js`
- `check:uxroompanelclarity01` -> `node backend\scripts\ux_room_panel_clarity_01_check.js`
- `check:uxroomshiftstabs01` -> `node backend\scripts\ux_room_shifts_tabs_01_check.js`
- `check:uxroomshiftsdensitydedup01` -> `node backend\scripts\ux_room_shifts_density_dedup_01_check.js`
- `check:uxpremiumcriticalfixroom01` -> `node backend\scripts\ux_premium_critical_fix_room_01_check.js`
- `check:uxcompanymobileactionclarity01` -> `node backend\scripts\ux_company_mobile_action_clarity_01_check.js`
- `check:uxcompanypersonelaccessmobileparity01` -> `node backend\scripts\ux_company_personel_access_mobile_parity_01_check.js`
- `check:uxpremiumcriticalfixagreementsdetail01` -> `node backend\scripts\ux_premium_critical_fix_agreements_detail_01_check.js`
- `check:uxcompanyagreementsmobileparity01` -> `node backend\scripts\ux_company_agreements_mobile_parity_01_check.js`
- `check:uxparentpersonelliveerrorclarity01` -> `node backend\scripts\ux_parent_personel_live_error_clarity_01_check.js`
- `check:copliveaccept01` -> `node backend\scripts\cop_live_accept_01_check.js`
- `check:routechangefinal01` -> `node backend\scripts\route_change_final_01_check.js`
- `check:dynamicsavings01` -> `node backend\scripts\dynamic_savings_01_check.js`
- `check:uxcollapsiblepanels01` -> `node backend\scripts\ux_collapsible_panels_01_check.js`
- `check:e2esmoke01` -> `node backend\scripts\e2e_smoke_01_demo_acceptance_check.js`
- `check:fieldlaunch01` -> `node backend\scripts\field_launch_pack_01_readiness_check.js`
- `node backend\scripts\ux_kvkk_01_compact_boundary_check.js`
- `node backend\scripts\qlt_01_quality_provider_readiness_check.js`
- `node backend\scripts\qlt_02_quality_draft_score_check.js`
- `node backend\scripts\qlt_03_quality_review_decision_check.js`
- `node backend\scripts\qlt_04_quality_review_history_check.js`
- `node backend\scripts\docs_state_01_recent_product_closure_check.js`
- `node backend\scripts\run_product_extensions_check_chain.js`
- `node backend\scripts\shift_dispatch_approval_fix_01_check.js`
- `node backend\scripts\lead_capture_01_check.js`
- `node backend\scripts\verify_chain_01_product_extensions_check.js`
- `node backend\scripts\ui_action_wiring_audit_01_check.js`

### Orchestration mantığı
- `npm run verify:repo` guncel tek resmi repo kontrol girisidir.
- `backend/scripts/run_repo_check_chain.js` lint -> docs -> hot -> web-contract -> closure -> milestones sirasini uygular.
- Eski tekil scriptler ve packler kanit olarak kalir; gunluk siralama bu runner uzerinden okunur.
- `pack.ps1` ana üst kapıdır.
- `pack_living.ps1`, master pack'i living girişinden çağırır.
- `verify_living_static.ps1`, statik repo ve alt bant kontrollerini koşturur.
- `verify_living_runtime.ps1`, living runtime doğrulamasını master pack üzerinden yürütür.
- `tools/_packs/pack_m82.ps1`, upper-route bandını M82.1'den M89'a kadar sırayla bağlar.

### UX-COPILOT-SMART-CHIPS-01 [CHECK]
- `check:uxcopilotsmartchips01` drawer starter chips parity check.
- Bu milestone, floating Copilot drawer ilk açılışta ekran/rol/context bazlı akıllı başlangıç çiplerini doğrular.
- Generic fallback chips yalnızca context belirsizse görünür; screen-specific starter chips önceliklidir.

### UX-COPILOT-PERSONA-01 [CHECK]
- `check:uxcopilotpersona01` Sefer Abi persona, tone, label ve brand voice standardını doğrular.
- Drawer ve panel helper dili `Sefer Abi · Operasyon yardımcısı` standardına bağlanır.
- UX-COPILOT-PERSONA-01-FIX-01 ile drawer başlığı `Sefer Abi’ye Sor` ve sesli okuma tonu daha tok/sakin standarda çekilir.
- Sol menü / terminal label standardı `Sefer Abi Terminali` olarak terminal milestone ile ayrıştırılır.
- VOICE-PERSONA-01 ayrı bir milestone olarak bırakılır; bu check mobil canlı kabul iddiası taşımaz.
- Önerilen voice config anahtarları: `VOICE_PERSONA=sefer_abi`, `ASSISTANT_VOICE_PROFILE=driver|copilot|parent`.

### UX-COPILOT-TERMINAL-01 [CHECK]
- `check:uxcopilotterminal01` mevcut CopilotPanel derin analiz yüzeyini `Sefer Abi Terminali` görünür standardına hizalar.
- Yeni terminal component veya yeni route eklemez; mevcut CopilotPanel terminal shell olarak kullanılır.
- Sağ alttaki `Sefer Abi’ye Sor` quick-help drawer ayrıdır; terminal yalnızca geniş analiz yüzeyidir.
- Terminal starter chips readonly analiz sorularını öne çıkarır.

### COPILOT-ROLE-TASK-MATRIX-01 [CHECK]
- `check:copilotroletaskmatrix01` Sefer Abi / Copilot rol/task matrix ve guardrail katmanını statik docs/check olarak kilitler.
- Check script: `node backend\scripts\copilot_role_task_matrix_01_check.js`
- Doküman: `docs/COPILOT_ROLE_TASK_MATRIX_01.md`
- Bu check, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-TERMINAL-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `COPILOT-DEMAND-INTAKE-01` ve `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` guardrail hattıyla birlikte okunur; runtime AI action açmaz.

### COPILOT-AI-ACTION-ROADMAP-01 [CHECK]
- `check:copilotairoadmap01` Sefer Abi için future-only AI action phase modelini docs/check olarak kilitler; runtime AI action açmaz.
- Check script: `node backend\scripts\copilot_ai_action_roadmap_01_check.js`
- Doküman: `docs/COPILOT_AI_ACTION_ROADMAP_01.md`
- Bu check, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-TERMINAL-01`, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-DEMAND-INTAKE-01` ve `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` guardrail hattıyla birlikte okunur; tool execution, write-action dispatcher ve runtime AI action açmaz.

### COPILOT-DEMAND-INTAKE-01 [CHECK]
- `check:copilotdemandintake01` Sefer Abi için draft-only demand intake, sınıflandırma ve netleştirme soruları katmanını docs/check olarak kilitler; runtime AI action, tool execution, write-action dispatcher, production DB, destructive query ve route/service/prisma diff açmaz.
- Check script: `node backend\scripts\copilot_demand_intake_01_check.js`
- Doküman: `docs/COPILOT_DEMAND_INTAKE_01.md`
- Static helper: `backend/src/ai/chat/copilotDemandIntake.js`
- Bu check, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-EXCEL-DEMAND-IMPORT-01` guardrail hattıyla birlikte okunur; draft-only, tool execution, write-action dispatcher ve production DB açmaz.
- Not: runtime-data ve browser-smoke artifaktları commit dışı kalır.

### COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 [CHECK]
- `check:copilotdemandagreement01` Sefer Abi için talep -> teklif -> sözleşme hazırlık yol haritasını docs/check olarak kilitler; runtime AI action açmaz.
- Check script: `node backend\scripts\copilot_demand_to_agreement_roadmap_01_check.js`
- Doküman: `docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md`
- Bu check, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `OFFER-RANKING-QUALITY-01`, `SAFE-DRIVE-01`, `TELEMATICS-PROVIDER-HUB-01`, `VERIFIED-SUPPLIER-01` ve `UX-MARKETPLACE-PANELS-01` guardrail hattıyla birlikte okunur; tool execution, RFQ send, offer accept/reject, agreement/contract execute, dispatch apply ve runtime AI action açmaz.

### COPILOT-RFQ-PREP-01 [CHECK]
- `check:copilotrfqprep01` Sefer Abi için draft-only RFQ prep companion milestone'ını docs/check olarak kilitler; supplier matching, offer collect ve RFQ send açmaz.
- Check script: `node backend\scripts\copilot_rfq_prep_01_check.js`
- Doküman: `docs/COPILOT_RFQ_PREP_01.md`
- Static helper: `backend/src/ai/chat/copilotRfqPrep.js`
- Bu check, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-ROLE-TASK-MATRIX-01` guardrail hattıyla birlikte okunur; supplier matching, offer collect, RFQ send ve runtime AI action açmaz.
- Sonraki güvenli hatlar: `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`.

### SUPPLIER-MATCHING-01 [CHECK]
- `check:suppliermatching01` Sefer Abi için draft-only supplier matching companion milestone'ını docs/check olarak kilitler; RFQ prep çıktısını aday uygunluk matrisi ve shortlist taslağına çevirir ama RFQ send, supplier contact, offer collect ve provider credential kullanımını açmaz.
- Check script: `node backend\scripts\supplier_matching_01_check.js`
- Doküman: `docs/SUPPLIER_MATCHING_01.md`
- Static helper: `backend/src/ai/chat/supplierMatching.js`
- Bu check, `COPILOT-RFQ-PREP-01`, `VERIFIED-SUPPLIER-01`, `COPILOT-HUMAN-APPROVAL-01` ve `UX-MARKETPLACE-PANELS-01` guardrail hattıyla birlikte okunur; supplier matching execution, RFQ send, offer collect, provider credential management ve runtime AI action açmaz.
- Sonraki güvenli hatlar: `COPILOT-HUMAN-APPROVAL-01`, `SUPPLIER-OFFER-COLLECT-01`, `COPILOT-OFFER-ANALYSIS-01`, `COPILOT-OFFER-RECOMMENDATION-01`.

### SUPPLIER-OFFER-COLLECT-01 [CHECK]
- `check:supplieroffercollect01` Sefer Abi için draft-only supplier offer collect companion milestone'ını docs/check olarak kilitler; supplier matching shortlistini offer collection inputuna ve draft-only teklif durum tablosuna çevirir ama supplier contact, RFQ send, offer collect execute, offer accept/reject ve provider credential management açmaz.
- Check script: `node backend\scripts\supplier_offer_collect_01_check.js`
- Doküman: `docs/SUPPLIER_OFFER_COLLECT_01.md`
- Static helper: `backend/src/ai/chat/supplierOfferCollect.js`
- Bu check, `SUPPLIER-MATCHING-01`, `COPILOT-HUMAN-APPROVAL-01` ve `UX-MARKETPLACE-PANELS-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher ve provider credential management açmaz.
- Sonraki güvenli hatlar: `COPILOT-OFFER-ANALYSIS-01`, `COPILOT-OFFER-RECOMMENDATION-01`, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`.

### COPILOT-OFFER-ANALYSIS-01 [CHECK]
- `check:copilotofferanalysis01` Sefer Abi için draft-only offer analysis companion milestone'ını docs/check olarak kilitler; supplier offer collect shortlistini comparison matrix, risk summary ve next safe step draftına çevirir ama supplier selection, offer accept/reject, supplier contact, RFQ send ve provider credential management açmaz.
- Root check: `root:check:copilotofferanalysis01`
- Check script: `node backend\scripts\copilot_offer_analysis_01_check.js`
- Doküman: `docs/COPILOT_OFFER_ANALYSIS_01.md`
- Static helper: `backend/src/ai/chat/copilotOfferAnalysis.js`
- Bu check, `SUPPLIER-OFFER-COLLECT-01`, `COPILOT-HUMAN-APPROVAL-01` ve `UX-MARKETPLACE-PANELS-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, offer selection ve provider credential management açmaz.
- Sonraki güvenli hatlar: `COPILOT-NEGOTIATION-ASSIST-01`, `COPILOT-OFFER-RECOMMENDATION-01`, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`.

### COPILOT-NEGOTIATION-ASSIST-01 [CHECK]
- `check:copilotnegotiationassist01` Sefer Abi için draft-only negotiation prep companion milestone'ını docs/check olarak kilitler; supplier offer collect shortlistini pazarlık hazırlık taslağına, karşı teklif draftına, soru setine ve risk/value özeti katmanına çevirir ama supplier selection, offer accept/reject, supplier contact, RFQ send, agreement execute, dispatch apply, payment execute ve provider credential management açmaz.
- Check script: `node backend\scripts\copilot_negotiation_assist_01_check.js`
- Doküman: `docs/COPILOT_NEGOTIATION_ASSIST_01.md`
- Static helper: `backend/src/ai/chat/copilotNegotiationAssist.js`
- Bu check, `SUPPLIER-OFFER-COLLECT-01`, `COPILOT-OFFER-ANALYSIS-01`, `COPILOT-OFFER-RECOMMENDATION-01` ve `COPILOT-HUMAN-APPROVAL-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, supplier contact ve RFQ send açmaz.
- Sonraki güvenli hatlar: `COPILOT-OFFER-RECOMMENDATION-01`, `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`.

### COPILOT-OFFER-RECOMMENDATION-01 [CHECK]
- `check:copilotofferrecommendation01` Sefer Abi için read-only recommendation companion milestone'ını docs/check olarak kilitler; offer analysis ve negotiation assist sinyallerini öneri taslağına ve onay paketi draftına çevirir ama supplier selection, offer accept/reject, supplier contact, RFQ send, agreement execute, dispatch apply, payment execute ve provider credential management açmaz.
- Root check: `root:check:copilotofferrecommendation01`
- Check script: `node backend\scripts\copilot_offer_recommendation_01_check.js`
- Doküman: `docs/COPILOT_OFFER_RECOMMENDATION_01.md`
- Static helper: `backend/src/ai/chat/copilotOfferRecommendation.js`
- Bu check, `COPILOT-OFFER-ANALYSIS-01`, `COPILOT-NEGOTIATION-ASSIST-01` ve `COPILOT-HUMAN-APPROVAL-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, supplier contact ve RFQ send açmaz.
- Sonraki güvenli hatlar: `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`, `COPILOT-DISPATCH-ACTION-PREP-01`.

### COPILOT-HUMAN-APPROVAL-01 [CHECK]
- `check:copilothumanapproval01` Sefer Abi için kritik işlemlerde insan onayı / confirmation modelini docs/check olarak kilitler; READ / EXPLAIN / RECOMMEND / PREPARE / DRAFT / RISK_SUMMARY / NEXT_STEP sınırını görünür kılar, runtime AI action açmaz.
- Check script: `node backend\scripts\copilot_human_approval_01_check.js`
- Doküman: `docs/COPILOT_HUMAN_APPROVAL_01.md`
- Bu check, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01` ve `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` guardrail hattıyla birlikte okunur; voice command alone critical actions execute ettirmez, tool execution / write-action dispatcher / safe autopilot real action açmaz.

### COPILOT-SHIFT-TO-AGREEMENT-PREP-01 [CHECK]
- `check:copilotshifttoagreementprep01` Sefer Abi için draft-only agreement prep companion milestone'ını docs/check olarak kilitler; offer recommendation sonrası gelen sözleşme ön hazırlığı katmanını hazırlar ama supplier selection, offer accept/reject, supplier contact, RFQ send, agreement/contract execute, dispatch apply, route apply ve provider credential management açmaz.
- Check script: `node backend\scripts\copilot_shift_to_agreement_prep_01_check.js`
- Doküman: `docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md`
- Static helper: `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
- Shift-to-Agreement Input Summary
- Agreement Field Mapping Model
- Agreement Readiness Scorecard
- Agreement Prep Packet Draft
- Missing Field Summary
- Risk Summary
- Question Set
- Safe Next-Step Draft
- Safety / Boundary
- PII / KVKK Safe Handling
- Türkçe Visible Answer
- Audit / Human Approval Handoff
- Bu check, `COPILOT-OFFER-RECOMMENDATION-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, agreement/contract execute, dispatch apply ve route apply açmaz.
- Sonraki güvenli hatlar: `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-DISPATCH-ACTION-PREP-01`, `COPILOT-ACTION-PREP-01`.

### COPILOT-DISPATCH-ACTION-PREP-01 [CHECK]
- `check:copilotdispatchactionprep01` Sefer Abi için read-only dispatch prep companion milestone'ını docs/check olarak kilitler; shift-to-agreement prep sonrası gelen dispatch readiness, driver/vehicle readiness, GPS/safe-drive readiness ve evidence checklist hazırlığını ayrı docs/check katmanı olarak taşır.
- Check script: `node backend\scripts\copilot_dispatch_action_prep_01_check.js`
- Doküman: `docs/COPILOT_DISPATCH_ACTION_PREP_01.md`
- Static helper: `backend/src/ai/chat/copilotDispatchActionPrep.js`
- Bu check, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, dispatch apply, route apply, driver/vehicle assignment ve provider credential management açmaz.
- Sonraki güvenli hatlar: `COPILOT-ACTION-PREP-01`, `UX-MARKETPLACE-PANELS-01`.

### COPILOT-ACTION-PREP-01 [CHECK]
- `check:copilotactionprep01` Sefer Abi için dispatch, shift ve human approval kaynaklarını ortak read-only owner pack altında birleştiren docs/check milestone'ını kilitler; runtime AI action, tool execution, write-action dispatcher, dispatch apply, route apply, driver/vehicle assignment, agreement execute, payment/hakediş ve messaging/email/SMS/push açmaz.
- Check script: `node backend\scripts\copilot_action_prep_01_check.js`
- Doküman: `docs/COPILOT_ACTION_PREP_01.md`
- Static helper: `backend/src/ai/chat/copilotActionPrep.js`
- Bu check, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`, `COPILOT-DISPATCH-ACTION-PREP-01` ve `COPILOT-HUMAN-APPROVAL-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, dispatch apply, route apply, agreement execute, payment/hakediş ve provider credential management açmaz.
- Sonraki güvenli hatlar: `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`, `OPERATIONAL-COST-MODEL-01`, `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`, `COMPANY-BUDGET-AND-SERVICE-COST-01`, `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01`, `COST-SCENARIO-FORECAST-AND-SAVINGS-01`, `SEFER-ABI-COST-ANALYSIS-ASSISTANT-01`, `ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01`.
- Bu finans bloğu mevcut dynamic savings, hakediş önizleme, kalite/payment bridge ve CSV export yüzeylerini yeniden kullanır; full muhasebe/e-Fatura/e-Defter/vergi programı değildir.
- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01` `check:financialoperationssurfaceandrbac01`, `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md`, `node backend\scripts\financial_operations_surface_and_rbac_01_check.js` ve `backend/src/finance/financialOperationsScope.js` ile yaşar; read-only/preview/RBAC sınırını korur.
- `OPERATIONAL-COST-MODEL-01` `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` ile yaşar; pure deterministic read-only cost modeldir, write-action ve muhasebe/ERP açmaz.
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01` `check:roomprofitabilityandquotefloor01`, `docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md` ve `backend/src/finance/roomProfitabilityAndQuoteFloor.js` ile yaşar; oda kârlılığı ve quote floor preview katmanını reuse eder, write-action ve muhasebe/ERP açmaz.
- `COMPANY-BUDGET-AND-SERVICE-COST-01` `check:companybudgetandservicecost01`, `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md` ve `backend/src/finance/companyBudgetAndServiceCost.js` ile yaşar; company budget ve service cost preview katmanını read-only tutar.

### COPILOT-EXCEL-DEMAND-IMPORT-01 [CHECK]
- `check:copilotexceldemandimport01` Sefer Abi için Excel/CSV demand import readiness, column mapping, data quality ve human approval gate docs/check olarak kilitler; runtime import execute, file upload endpoint ve DB write açmaz.
- Check script: `node backend\scripts\copilot_excel_demand_import_01_check.js`
- Doküman: `docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md`
- Bu check, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ve `COPILOT-HUMAN-APPROVAL-01` guardrail hattıyla birlikte okunur; runtime import execute, tool execution, write-action dispatcher ve geocode commit açmaz.
- Handoff hattı: `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-STOP-ROUTE-DRAFT-01`, `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-INTAKE-01`.

### ADDRESS-GEOCODING-CONFIDENCE-01 [CHECK]
- `check:addressgeocodingconfidence01` servis adresi kalite sözlüğü, geocoding readiness modeli, confidence bands, risk kategorileri ve human review gate docs/check olarak kilitler; runtime geocode, map API, OSRM route apply ve lat/lng write açmaz.
- Check script: `node backend\scripts\address_geocoding_confidence_01_check.js`
- Doküman: `docs/ADDRESS_GEOCODING_CONFIDENCE_01.md`
- Static helper: `backend/src/ai/chat/addressGeocodingConfidencePolicy.js`
- Bu check, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ve `COPILOT-ROLE-TASK-MATRIX-01` guardrail hattıyla birlikte okunur; runtime geocode, tool execution, write-action dispatcher, provider credential management, user/account/admin write-action ve KVKK / data safety sınırlarını açmaz.
- Sonraki güvenli hatlar: `COPILOT-STOP-ROUTE-DRAFT-01`, `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-INTAKE-01`.

### COPILOT-STOP-ROUTE-DRAFT-01 [CHECK]
- `check:copilotstoproutedraft01` stop / route draft readiness, inbound / outbound direction model, hub readiness, capacity readiness ve human review gate docs/check olarak kilitler; runtime stop create, route draft apply, OSRM execute ve driver / vehicle assignment açmaz.
- Check script: `node backend\scripts\copilot_stop_route_draft_01_check.js`
- Doküman: `docs/COPILOT_STOP_ROUTE_DRAFT_01.md`
- Static helper: `backend/src/ai/chat/copilotStopRouteDraftPolicy.js`
- Bu check, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-ROLE-TASK-MATRIX-01` guardrail hattıyla birlikte okunur; runtime stop create, route draft apply, route apply, dispatch apply ve runtime AI action açmaz.
- Sonraki güvenli hatlar: `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-INTAKE-01`.

### OSRM-ROUTE-DRAFT-FROM-EXCEL-01 [CHECK]
- `check:osrmroutedraftfromexcel01` Excel / CSV import, address confidence ve stop / route draft hattından gelen veriyi yalnızca OSRM route draft readiness olarak sınıflandırır; runtime OSRM call, route preview, route apply ve DB write açmaz.
- Check script: `node backend\scripts\osrm_route_draft_from_excel_01_check.js`
- Doküman: `docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md`
- Static helper: `backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js`
- Bu check, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-STOP-ROUTE-DRAFT-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-ROLE-TASK-MATRIX-01` guardrail hattıyla birlikte okunur; runtime OSRM call, route preview, route apply, geocode execute, lat/lng write, tool execution ve runtime AI action açmaz.
- Sonraki güvenli hatlar: `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-INTAKE-01`, `COPILOT-RFQ-PREP-01`, `COPILOT-DISPATCH-ACTION-PREP-01`.

### COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01 [CHECK]
- `check:copilotroutereviewhumanapproval01` OSRM sonrası route review readiness'ı insan onaylı review kapısına bağlar; route preview, route apply, dispatch apply ve agreement execute açmaz.
- Check script: `node backend\scripts\copilot_route_review_human_approval_01_check.js`
- Doküman: `docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md`
- Static helper: `backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js`
- Bu check, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-STOP-ROUTE-DRAFT-01`, `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ve `COPILOT-ROLE-TASK-MATRIX-01` guardrail hattıyla birlikte okunur; runtime route preview/apply, OSRM call, dispatch apply, agreement execute ve runtime AI action açmaz.
- Sonraki güvenli hatlar: `COPILOT-DEMAND-INTAKE-01`, `COPILOT-RFQ-PREP-01`, `SUPPLIER-MATCHING-01`, `COPILOT-DISPATCH-ACTION-PREP-01`, `EXCEL-TO-ROUTE-READINESS-REDTEAM-01`.

### EXCEL-TO-ROUTE-READINESS-REDTEAM-01 [CHECK]
- `check:exceltoroutereadinessredteam01` E bloğundaki Excel -> adres confidence -> stop/route draft -> OSRM readiness -> route review hattı için statik red-team / kırma testi kilididir; runtime AI action, tool execution ve write-action açmaz.
- Check script: `node backend\scripts\excel_to_route_readiness_redteam_01_check.js`
- Doküman: `docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md`
- Static helper: `backend/src/ai/chat/excelToRouteReadinessRedteamPack.js`
- Bu check, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-STOP-ROUTE-DRAFT-01`, `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`, `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ve `COPILOT-ROLE-TASK-MATRIX-01` guardrail hattıyla birlikte okunur; fake success, hallucination, KVKK/cross-tenant leke, route apply, geocode execute, OSRM call ve runtime AI action açmaz.
- Sonraki kontrollü hatlar: `COPILOT-DEMAND-INTAKE-01`, `COPILOT-RFQ-PREP-01`, `COPILOT-DISPATCH-ACTION-PREP-01`, `VOICE-AUTOPILOT-SAFETY-REDTEAM-01`, `SEFER-ABI-AI-REDTEAM-STRESS-01`.

### COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01 [CHECK]
- `check:copiloteblockruntimeanswerintegration01` Excel/import, address/geocode, OSRM ve route-review intent'leri için güvenli runtime-answer helper katmanını kilitler; runtime AI action, tool execution, write-action dispatcher, geocode execute, OSRM call, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_e_block_runtime_answer_integration_01_check.js`
- Doküman: `docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md`
- Static helper: `backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js`
- Bu check, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`, `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-EXCEL-DEMAND-IMPORT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-STOP-ROUTE-DRAFT-01`, `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01` ve `EXCEL-TO-ROUTE-READINESS-REDTEAM-01` guardrail hattıyla birlikte okunur; runtime AI action, tool execution, write-action dispatcher, route apply, geocode execute, OSRM call ve fake success açmaz.
- Sonraki güvenli hatlar: `COPILOT-GUIDED-TASK-ENGINE-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### COPILOT-GUIDED-TASK-ENGINE-01 [CHECK]
- `check:copilotguidedtaskengine01` Türkçe semantic intent family, synonym map, typo-tolerant phrase group ve progress-command katmanını kilitler; exact phrase matching'e bağlı kalmaz, ancak runtime AI action, tool execution, write-action dispatcher, OSRM/geocode call ve route apply açmaz.
- Check script: `node backend\scripts\copilot_guided_task_engine_01_check.js`
- Doküman: `docs/COPILOT_GUIDED_TASK_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/copilotGuidedTaskEngine.js`
- Bu check, `COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01`, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; güvenli red / clarification / guided step üretir ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### `COPILOT-DYNAMIC-QUESTION-ENGINE-01` [CHECK]
- `check:copilotdynamicquestionengine01` role + screen + selected record + current reply üzerinden dynamic question assembly katmanını paylaşır; `backend/src/ai/chat/conversationTaskStateResponses.js` üzerinden `Netleştirelim / Devam edelim` formatını helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında paylaşır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_dynamic_question_engine_01_check.js`
- Doküman: `docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationTaskStateResponses.js`
- Bu check, `COPILOT-GUIDED-TASK-ENGINE-01`, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; dynamic clarification / continuation üretir ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### `COPILOT-SMART-DIAGNOSTIC-ENGINE-01` [CHECK]
- `check:copilotsmartdiagnosticengine01` symptom/problem mesajlarında dynamic question ile clarifying question arasında güvenli diagnostic katmanını sağlar; `backend/src/ai/chat/conversationSmartDiagnostics.js` üzerinden helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında `Görünmüyor / çıkmadı / çalışmadı / başlamadı / gelmedi / yok` sinyallerini ayırır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_smart_diagnostic_engine_01_check.js`
- Doküman: `docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationSmartDiagnostics.js`
- Bu check, `COPILOT-GUIDED-TASK-ENGINE-01`, `COPILOT-DYNAMIC-QUESTION-ENGINE-01`, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; symptom / problem sinyalini bağlamlı çözer ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-ROOT-CAUSE-ENGINE-01`, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### COPILOT-ROOT-CAUSE-ENGINE-01 [CHECK]
- `check:copilotrootcauseengine01` root cause sorularında role + screen + selected record + current reply üzerinden güvenli sebep açıklaması ve sonraki kontrol üretir; `backend/src/ai/chat/conversationRootCauseEngine.js` üzerinden helpComposer, Sefer Abi reasoning assistant ve answerQualityPolicy arasında root cause reply/chip önceliğini paylaşır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_root_cause_engine_01_check.js`
- Doküman: `docs/COPILOT_ROOT_CAUSE_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationRootCauseEngine.js`
- Bu check, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; kök neden açıklamasını bağlamlı çözer ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.
### COPILOT-RISK-SCORING-ENGINE-01 [CHECK]
- `check:copilotriskscoringengine01` risk list / risk scoring sorularında role + screen + selected record + current reply üzerinden güvenli risk sıralaması ve yüzey-özel açıklama üretir; `backend/src/ai/chat/conversationRiskScoringEngine.js` üzerinden helpComposer, Sefer Abi reasoning assistant ve answerQualityPolicy arasında risk reply/chip önceliğini paylaşır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_risk_scoring_engine_01_check.js`
- Doküman: `docs/COPILOT_RISK_SCORING_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationRiskScoringEngine.js`
- Bu check, `COPILOT-ROOT-CAUSE-ENGINE-01`, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; riskleri bağlama göre çözer ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.
### COPILOT-CLARIFYING-QUESTION-ENGINE-01 [CHECK]
- `check:copilotclarifyingquestionengine01` role + screen + selected record + conversation state üzerinden clarifying question assembly katmanını tek yerde toplar; `backend/src/ai/chat/conversationTaskStateResponses.js` üzerinden `Netleştirelim / Alternatif` formatını helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında paylaşır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_clarifying_question_engine_01_check.js`
- Doküman: `docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationTaskStateResponses.js`
- Bu check, `COPILOT-GUIDED-TASK-ENGINE-01`, `COPILOT-WORKFLOW-REASONING-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; role-aware clarifying question üretir ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-WORKFLOW-REASONING-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### COPILOT-WORKFLOW-REASONING-ENGINE-01 [CHECK]
- `check:copilotworkflowreasoningengine01` company plan, offers / agreements, shifts, room map / vehicles, driver route, personel live, parent live ve superadmin yüzeylerinde işlem akışı, current stage, next safe control ve human approval points katmanını tek yerde toplar; `backend/src/ai/chat/conversationWorkflowReasoningEngine.js` üzerinden helpComposer ve Sefer Abi reasoning assistant arasında paylaşılır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_workflow_reasoning_engine_01_check.js`
- Doküman: `docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationWorkflowReasoningEngine.js`
- Bu check, `COPILOT-CLARIFYING-QUESTION-ENGINE-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; role-aware workflow reasoning üretir ama runtime execute açmaz.
- Sonraki güvenli hatlar: `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01`, `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01`.

### COPILOT-OPERATION-HEALTH-ENGINE-01 [CHECK]
- `check:copilotoperationhealthengine01` şirket, oda, superadmin, sürücü, personel, veli, okul ve organizasyon operasyon yüzeylerinde canlılık / risk / konum sinyali okumasını tek yerde toplar; `backend/src/ai/chat/conversationOperationHealthEngine.js` üzerinden helpComposer, intentRouter, answerQualityPolicy, screenStateAnalyzer ve Sefer Abi reasoning assistant arasında paylaşılır; read-only kalır, no write-action, tool execution, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_operation_health_engine_01_check.js`
- Doküman: `docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationOperationHealthEngine.js`
- Bu check, `COPILOT-WORKFLOW-REASONING-ENGINE-01`, `COPILOT-NEXT-BEST-ACTION-ENGINE-01`, `COPILOT-PLAN-REVIEW-ENGINE-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; görünür Türkçe reply üretir ama yazma, uygulama ve otomatik kapanış açmaz.

### COPILOT-NEXT-BEST-ACTION-ENGINE-01 [CHECK]
- `check:copilotnextbestactionengine01` şirket, organizasyon, okul, oda, sürücü, personel, veli ve superadmin yüzeylerinde sıradaki en doğru güvenli adım / önce yapılacak güvenli kontrol çizgisini tek yerde toplar; `backend/src/ai/chat/conversationNextBestActionEngine.js` üzerinden helpComposer, intentRouter, conversationTaskStateResponses ve Sefer Abi reasoning assistant arasında paylaşılır; read-only kalır, no write-action, tool execution, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\copilot_next_best_action_engine_01_check.js`
- Doküman: `docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationNextBestActionEngine.js`
- Bu check, `COPILOT-OPERATION-HEALTH-ENGINE-01`, `COPILOT-PLAN-REVIEW-ENGINE-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; görünür Türkçe reply üretir ama yazma, uygulama ve otomatik kapanış açmaz.

### COPILOT-PLAN-REVIEW-ENGINE-01 [CHECK]
- `check:copilotplanreviewengine01` plan kontrolü / önizleme / onay öncesi değerlendirme dilini `Planlama Merkezi` ekseninde kilitler; `Sonraki güvenli kontrol` ve `İnsan onayı` çizgisini korur.
- Check script: `node backend\scripts\copilot_plan_review_engine_01_check.js`
- Doküman: `docs/COPILOT_PLAN_REVIEW_ENGINE_01.md`
- Static helper: `backend/src/ai/chat/conversationPlanReviewEngine.js`
- `write-action` ve `route review` sınırlarını açık tutar; runtime AI action, tool execution, DB write, route apply ve fake success açmaz.
- Sonraki güvenli hatlar: `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01`, `HOT-FILE-SPLIT-WEB-PANELS-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`.

### HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01 [CHECK]
- `check:hotfilesplitaichatcomposers01` helpComposer içindeki güvenli reply-helper yüzeyini `helpComposerSafeReplies.js` ile ayıran acceptance-safe hot-file split kapısıdır; görünür Türkçe reply davranışını korur ama runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\hot_file_split_ai_chat_composers_01_check.js`
- Doküman: `docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md`
- Static helper: `backend/src/ai/chat/helpComposerSafeReplies.js`
- Bu check, `COPILOT-WORKFLOW-REASONING-ENGINE-01` ve `COPILOT-REASONING-ANSWER-COMPOSER-01` hattıyla birlikte okunur; hot-file borcunu azaltır ama smoke policy, threshold, skip veya PASS kriterini gevşetmez.
- Sonraki güvenli hatlar: `HOT-FILE-SPLIT-WEB-PANELS-01`, `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `SEFER-ABI-TERMINAL-HUMANIZE-01`, `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01`, `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01`.

### HOT-FILE-SPLIT-WEB-PANELS-01 [CHECK]
- `check:hotfilesplitwebpanels01` company/room agreements panel helper ve bridge logic'ini ana panel gövdelerinden ayıran acceptance-safe hot-file split kapısıdır; görünür Türkçe panel davranışını korur ama runtime write-action, tool execution, DB write, route apply ve fake success açmaz.
- Check script: `node backend\scripts\hot_file_split_web_panels_01_check.js`
- Doküman: `docs/HOT_FILE_SPLIT_WEB_PANELS_01.md`
- Bridge helper'lar: `web/src/panels/company/companyAgreementsBridgeSection.jsx`, `web/src/panels/company/companyAgreementsPanelHelpers.js`, `web/src/panels/room/roomAgreementsBridgeSection.jsx`, `web/src/panels/room/roomAgreementsPanelHelpers.js`
- Bu check, `COPILOT-PLAN-REVIEW-ENGINE-01`, `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01` ve `COPILOT-REASONING-ANSWER-COMPOSER-01` hattıyla birlikte okunur; main panel gövdelerindeki acceptance-sensitive davranışı daraltır ama smoke policy, threshold, skip veya PASS kriterini gevşetmez.
- Sonraki güvenli hatlar: `COPILOT-REASONING-ANSWER-COMPOSER-01`, `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `SEFER-ABI-TERMINAL-HUMANIZE-01`, `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01`, `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01`.

### COPILOT-REASONING-ANSWER-COMPOSER-01 [CHECK]
- `check:copilotreasoninganswercomposer01` Sefer Abi reasoning replies için final reply composer katmanını kilitler; robotik lead marker'ları, tekrarları ve template benzerliğini temizler; strict A-only acceptance'ta Company shifts preview/convert affordance da gerektiği için bu milestone `core composer + required product acceptance support` scope'u ile okunur, ancak runtime AI action, tool execution, write-action dispatcher ve DB write açmaz.
- Check script: `node backend\scripts\copilot_reasoning_answer_composer_01_check.js`
- Doküman: `docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md`
- Static helper: `backend/src/ai/chat/copilotReasoningAnswerComposer.js`
- Bu check, `COPILOT-GUIDED-TASK-ENGINE-01`, `SEFER-ABI-REASONING-ASSISTANT-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` hattıyla birlikte okunur; final reply'ı role, ekran ve progress-command bağlamında doğal tutar ama runtime execute açmaz.
- Sonraki güvenli hatlar: `SEFER-ABI-REASONING-ASSISTANT-01`, `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`, `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### SEFER-ABI-REASONING-ASSISTANT-01 [CHECK]
- `check:seferabireasoningassistant01` role + screen + selected record + conversation state bağlamını reasoning assistant katmanında birleştirir; golden pack’i reply source olarak kullanmaz, runtime AI action, tool execution, write-action dispatcher ve DB write açmaz.
- Check script: `node backend\scripts\sefer_abi_reasoning_assistant_01_check.js`
- Doküman: `docs/SEFER_ABI_REASONING_ASSISTANT_01.md`
- Static helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Bu check, `COPILOT-GUIDED-TASK-ENGINE-01`, `COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01`, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01` ve `UX-COPILOT-SMART-CHIPS-01` hattıyla birlikte okunur; role-aware strategic / planning / operations / driver / personel / parent / school / organization reasoning üretir ama runtime execute açmaz.
- Sonraki güvenli hatlar: `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01 [CHECK]
- `check:seferabiallrolesreasoningassistant01` role + screen + selected record + conversation state + interactionIntentFamily bağlamını all-roles reasoning assistant katmanında birleştirir; golden pack’i reply source olarak kullanmaz, runtime AI action, tool execution, write-action dispatcher ve DB write açmaz.
- Check script: `node backend\scripts\sefer_abi_all_roles_reasoning_assistant_01_check.js`
- Doküman: `docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md`
- Static helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Bu check, `SEFER-ABI-REASONING-ASSISTANT-01`, `COPILOT-GUIDED-TASK-ENGINE-01`, `COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01`, `COPILOT-ROLE-TASK-MATRIX-01`, `COPILOT-AI-ACTION-ROADMAP-01` ve `UX-COPILOT-SMART-CHIPS-01` hattıyla birlikte okunur; role-aware strategic / planning / operations / driver / personel / parent / school / organization reasoning üretir ama runtime execute açmaz.
- Sonraki güvenli hatlar: `UX-COPILOT-SMART-CHIPS-01`, `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`.

### ETA-SANITY-01 [CHECK]
- `check:etasanity01` canlı takipte GPS stale/offline/unknown durumunda ETA’yı güvenli ve kesin olmayan ifadelerle gösterir.
- Room, Company, Parent, Personel ve Driver canlı yüzeyleri ile Copilot yardım metinleri aynı güvenli ETA / GPS mantığına bağlanır.
- 619 dk gibi ham ve güvenilir görünen ETA gösterimleri yerine `ETA güncel değil`, `ETA hesaplanamıyor` veya `ETA olağan dışı yüksek` gibi güvenli ifadeler kullanılır.

### ETA-OSRM-01 [CHECK]
- `check:etaosrm01` merkezi readonly OSRM ETA helper ve güvenli fallback katmanını doğrular.
- OSRM varsa canlı ETA kaynağı helper üzerinden okunur; OSRM yoksa ya da timeout olursa ekran kırılmaz.
- GPS stale/offline/unknown durumunda ETA kesin gösterim olarak kabul edilmez; ETA-SANITY güvenli görünürlük kuralı korunur.
- Bu adım canlı ETA helperını OSRM'e hazırlayan dar ve readonly basamaktır.

### ETA-OSRM-02 [CHECK]
- `check:etaosrm02` `/api/eta` route bridge katmanını merkezi readonly helper ile doğrular.
- Route contract geriye uyumlu kalır; ek güvenli metadata alanları varsa onları taşır.
- GPS stale/offline/unknown durumunda exact ETA dili kullanılmaz; helper fallback ve ETA-SANITY dili korunur.

### LIVE-TRACKING-FINAL-01 [CHECK]
- `check:livetrackingfinal01` Room / Company / Driver / Parent / Personel / Public canlı yüzeylerinde GPS, ETA ve marker görünürlüğünü final kabul kapısı olarak birlikte doğrular.
- `/api/eta` bridge, ETA-SANITY güvenli wording ve `bus.svg` marker standardı bozulmadan kalır; yeni endpoint veya business flow açılmaz.
- Bu gate acceptance-smoke son kapısıdır; exact ETA, stale/offline GPS ve teknik hata dilini görünür kabul metni haline getirmez.

### DRIVER-FLOW-FINAL-01 [CHECK]
- `check:driverflowfinal01` Driver / Bugün / Rota / Harita / Check-in final kabul kapısıdır.
- Bugünkü görev, rota sırası, güvenli ETA/GPS dili ve check-in görünürlüğü aynı kabul hattında doğrulanır.
- `bus.svg` marker standardı, `Sefer Abi Terminali` ve `Sefer Abi’ye Sor` düzeni bozulmadan kalır; yeni endpoint veya route/shift logic açılmaz.
- Driver cevapları görev başlatma, rota görünmeme ve GPS bekleme durumlarında teknik jargon üretmeden güvenli yönlendirme yapar.

### UX-NAV-01 [CHECK]
- `check:uxnav01` NavDock premium visual polish check.
- Sol menüdeki terminal label `Sefer Abi Terminali` kalır; sağ alttaki `Sefer Abi’ye Sor` drawer bozulmaz.
- Menü kartları, aktif durum, badge hizası ve focus/hover affordance'ları daha premium görünür; route ve davranış değişmez.

### UX-BRAND-LOGIN-PREMIUM-01 [CHECK]
- `check:uxbrandloginpremium01` SeferPakt login ve marka katmanını, kullanıcı tarafından seçilen referans logodan kırpılmış asset’lerle premium hale getirir.
- `seferpakt-lockup.png`, `seferpakt-app-icon.png` ve `seferpakt-favicon.png` kırpılmış assetleri kullanılır; yeni logo çizimi veya pano screenshot'u commit edilmez.
- Login ekranı iki kolon premium shell düzenini korur; demo erişim bilgileri collapsible kalır ve ana giriş aksiyonunu gölgelemez.
- AppShell ve NavDock markalama alanları aynı lockup standardını kullanır; mobile drawer davranışı değişmez.
- Doküman: `docs/UX_BRAND_LOGIN_PREMIUM_01.md`
- Komut: `node backend\scripts\ux_brand_login_premium_01_check.js`

### UX-MOBILE-WEB-SHELL-CLARITY-01 [CHECK]
- `check:uxmobilewebshellclarity01` mobil web shell için off-canvas drawer, backdrop ve content-first yerleşim standardını doğrular.
- Mobilde `shellTopMenu` ile menü açılır; `navDockBackdrop` ve `navDock--mobileOpen` / `navDock--mobileClosed` sınıflarıyla sidebar default kapalı kalır.
- `shell--has-copilot-fab` safe-area padding'i korur; copilot launcher alt CTA'ları örtmez.
- Desktop davranışı değişmez; `Sefer Abi Terminali` ve `Sefer Abi’ye Sor` standardı korunur.
- Doküman: `docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md`
- Komut: `node backend\scripts\ux_mobile_web_shell_clarity_01_check.js`

### UX-MOBILE-ALL-ROLES-PANEL-FIX-01 [CHECK]
- `check:uxmobileallrolespanelfix01` mobil web shell düzeltmesi sonrası tüm rol panellerini first viewport, drawer, launcher, overflow ve sticky tab açıları açısından tek tek daraltır.
- Panel tabları ilk viewport'a çekilir; `first viewport` içeriği, ana CTA tıklanabilirliği ve `Sefer Abi` launcher kapatma riski birlikte okunur.
- Yatay taşma, sticky header / tab yoğunluğu ve empty / loading / error okunabilirliği rol bazında yeniden düzenlenir.
- UX-FIX 0, BLOCKER 0 ve NOT-FOUND 0 korunur; PASS- 19 hedeflenir ve mümkünse azaltılır.
- Doküman: `docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md`
- Komut: `node backend\scripts\ux_mobile_all_roles_panel_fix_01_check.js`

### UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01 [CHECK]
- `check:uxroomcompanyshiftsmobilecardfix01` `Room / Vardiyalar` ve `Company / Vardiyalar` yüzeylerinde mobil tablo baskısını kaldırıp card/list standardına geçer.
- `desktopShiftTable` desktop'ta korunur; `mobileShiftCards` mobilde görünür olur ve `tableWrap` yalnızca masaüstü tablo kabuğu olarak kalır.
- `Vardiya ID`, `Durum badge`, `Şirket / Oda`, `Araç`, `Sürücü`, `Başlangıç`, `Bitiş`, `Teklif / sözleşme özeti`, `Ödeme / hakediş`, `Rota Önizleme`, `İşlem Kaydı`, `Atamayı Değiştir` ve `Süre Uzat` kart içinde okunur kalır.
- `word-break: normal`, `overflow-wrap: anywhere`, body/page `overflow-x: hidden` ve Sefer Abi launcher safe-area padding standardı korunur.
- Bu düzenleme backend route/write-path, schema modeli, Playwright runner policy ve Coverage matrix check'i değiştirmez; browser-smoke scope dışıdır.
- Doküman: `docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md`
- Komut: `node backend\scripts\ux_room_company_shifts_mobile_card_fix_01_check.js`

### UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01 [CHECK]
- `check:uxshiftsresponsivelayoutfix01` `Room / Vardiyalar` ve `Company / Vardiyalar` masaüstü tablolarını responsive genişlik ve mobil card/list standardına hizalar.
- `shiftsDesktopTable` masaüstünde `table-layout: auto` ile geniş kolonları sıkıştırmadan gösterir; `shiftsMobileCards` ise mobilde card/list görünümünü açık tutar.
- Desktop'ta `word-break: normal` ve `overflow-wrap: break-word` korunur; mobilde launcher clearance ve safe-area padding standardı değişmez.
- Bu düzenleme backend route/write-path, schema modeli, Playwright runner policy ve Coverage matrix check'i değiştirmez; yeni business flow eklemez.
- Doküman: `docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md`
- Komut: `node backend\scripts\ux_shifts_responsive_layout_fix_01_check.js`

### UX-DENSITY-01 [CHECK]
- `check:uxdensity01` panel/card density ve premium dashboard polish check.
- Ortak kart, başlık, badge, chip, buton ve tablo yoğunluğu daha tutarlı hale gelir; ürün davranışı değişmez.
- NavDock role/kind IA, `Sefer Abi Terminali` ve `Sefer Abi’ye Sor` standardı korunur.

### UX-PANEL-STANDARD-ARCHITECTURE-01 [CHECK]
- `check:uxpanelstandardarchitecture01` tüm panel yüzeylerini summary-first, KPI / mini kart, ana aksiyon, işlevsel bölüm ve kontrollü detay standardına göre tarar.
- Check script: `node backend\scripts\ux_panel_standard_architecture_01_check.js`
- Doküman: `docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md`
- Bu check ürün/business flow, backend route/write-path, schema sınırı, Playwright runner policy ve coverage matrix fail policy değiştirmez.

### UX-PANEL-STRUCTURE-02 [CHECK]
- `check:uxpanelstructure02` uzun paneller için summary-first + tab/segmented + accordion bölümlenme standardını doğrular.
- Kritik özet, ana filtre, ana tablo ve birincil aksiyonlar açık kalır; eş düzey alt modlar tab/segmented button olarak ayrılır, ikincil detaylar collapsible kalır.
- `Room / Araçlar`, `Room / Sürücüler`, `Room / Ticari Akışım`, `Company / Sözleşmeler`, `Company / Ticari Akış`, `Super Admin / Operasyon Doğrulama`, `Parent / Canlı Takip` ve `Personel / Canlı Takip` ilk hedef yüzeylerdir.

### UX-PANEL-STRUCTURE-02B [CHECK]
- `check:uxpanelstructure02b` kalan P0 uzun panellerin ilk grubunu summary-first + segmented/tab + collapsible follow-up standardı ile daraltır.
- `CommercialCorePanel`, `VehiclesPanel`, `DriversPanel`, `ShiftsPanel` ve `MapPanel` follow-up yüzeyleridir.
- Bu dalga, UX-PANEL-STRUCTURE-02 ve UX-COLLAPSIBLE-PANELS-01 zincirini korur; ürün davranışı değiştirmez.

### UX-PANEL-STRUCTURE-02B-FIX-01 [CHECK]
- `check:uxpaneltabsfix01` PanelSegmentTabs kullanılan yüzeylerde tabların dekoratif kalmamasını, section focus/scroll veya conditional tab davranışı ile işlevsel olmasını doğrular.
- `CommercialCorePanel` için ticari akış sekmeleri ilgili bölüm başlıklarına kaydırılır; `Room / Ticari Akışım`, `Company / Ticari Akış` ve `Sözleşmeler` zaten functional tab standardını korur.
- Bu dalga UX-PANEL-STRUCTURE-02, UX-PANEL-INVENTORY-02A ve UX-PANEL-STRUCTURE-02B zincirini bozmaz; ürün davranışı değiştirmez.

### UX-LIVE-MAP-TABS-FIX-01 [CHECK]
- `check:uxlivemaptabsfix01` `Room / Canlı Takip` sekme mimarisinde dekoratif buton davranışını engeller; aktif sekme içeriği değişir ve Harita / Araçlar ana yüzeyleri olarak korunur.
- Harita sekmesi büyük harita + canlı liste görünümünü ve canlı durum badge'lerini, Araçlar sekmesi canlı araç listesi ve kısa durum kartlarını korur.
- Bu dalga UX-PANEL-REALITY-AUDIT-02C ve UX-PANEL-STRUCTURE-02 / 02B zincirini bozmaz; ürün davranışı değiştirmez.

### UX-LIVE-MAP-TABS-SIMPLIFY-01 [CHECK]
- `check:uxlivemaptabssimplify01` `Room / Canlı Takip` sekmesini Harita / Araçlar'a sadeleştirir; Özet / Rota / GPS / Risk / Geçmiş ayrı tab olmaktan çıkar.
- Kaldırılan bilgiler Harita görünümünde kısa badge, mini özet ve kısa geçmiş satırı olarak korunur.
- Bu dalga UX-PANEL-REALITY-AUDIT-02C, UX-PANEL-REALITY-CLEANUP-02D ve UX-LIVE-MAP-TABS-FIX-01 zincirini bozmaz; ürün davranışı değiştirmez.

### UX-PANEL-LAYOUT-WIDTH-02C-FIX-01 [CHECK]
- `check:uxpanellayoutwidth02cfix01` `Room / Ticari Akışım` panel kabuğunu geniş dashboard clamp'i ve dengeli split grid ile açar.
- Sekme davranışı işlevsel kalır; ana özet, sekmeler, seçili kayıt ve ana tablo daha ferah bir dashboard alanı içinde görünür.
- Bu dalga UX-PANEL-STRUCTURE-02, UX-PANEL-STRUCTURE-02B, UX-PANEL-REALITY-AUDIT-02C ve UX-COLLAPSIBLE-PANELS-01 zincirini bozmaz; ürün davranışı değiştirmez.

### UX-PANEL-REALITY-AUDIT-02C [CHECK]
- `check:uxpanelreality02c` tüm panel yüzeylerinde gerçek functional tab, focus-model, accordion-only ve cosmetic-only risk ayrımını görünür kılar.
- `Room / Araçlar` ve `Room / Sürücüler` reference standard olarak korunur; `CommercialCorePanel`, `Room / Canlı Takip` ve `Company / Vardiyalar` focus-model watchlist yüzeyleri olarak smoke gerektirir.
- Bu audit ürün davranışını değiştirmez; yalnızca panel gerçekliğini ve uzun scroll riskini tekrar sınıflandırır.

### UX-PANEL-INVENTORY-02A [CHECK]
- `check:uxpanelinventory02a` tüm web panel envanterini çıkarır; route/kind listesi, uzun panel riski ve P0/P1/P2 önceliklerini belgeye bağlar.
- Panel / ekran aileleri, route-menu bağlantıları ve `PanelChrome` / container standardı taranır; ürün davranışı değişmez.
- Bu envanter, sonraki panel bölme kararları için ilk 5 düzeltilecek alanı ve sonraya bırakılacak yüzeyleri görünür kılar.

### UX-COLLAPSIBLE-PANELS-01 [CHECK]
- `check:uxcollapsiblepanels01` uzun paneller için summary-first + collapsible secondary details standardını doğrular.
- Kritik özet, ana filtre, ana tablo ve birincil aksiyonlar açık kalır; ikincil bilgiler accordion altında toplanır.
- `Sefer Abi Terminali`, sağ alttaki `Sefer Abi’ye Sor`, NavDock role/kind standardı ve ETA final zinciri korunur.

### FINAL-UX-SMOKE-01 [CHECK]
- `check:finaluxsmoke01` tüm rol panelleri için son static UX smoke kapısıdır.
- Route/panel envanteri, visible label zinciri, functional tab davranışı, raw `Hub` ve yanlış label riskleri tek raporda birleştirilir.
- `Sefer Abi Terminali`, `Sefer Abi’ye Sor`, `Konum` standardı ve `İller ve Bölgeler` label'i korunur; `Yer Planları` gibi legacy guidance notları PASS- seviyesinde raporlanır.
- Bu check ürün/business flow değiştirmez; yalnızca panel ve label gerçekliğini doğrular.

### UX-LIVE-PANEL-COVERAGE-MATRIX-01 [CHECK]
- `check:uxlivepanelsmokeaudit01` tüm ana rol panelleri için canlı UX coverage matrix ve smoke notlarını tek audit kaydında toplar.
- Check script: `node backend\scripts\ux_live_panel_smoke_audit_01_check.js`
- Browser-smoke report'u route, panel, tab, drawer, CTA ve mobile/desktop coverage görünürlüğü sağlar; `PASS`, `PASS-`, `UX-FIX`, `BLOCKER`, `AUTH-BLOCKED` ve `NOT-FOUND` sınıfları görünür kalır.
- `BLOCKER` ve `NOT-FOUND` kapatıcıdır; `AUTH-BLOCKED` report-only auth/session notudur.
- Bu check ürün/business flow değiştirmez; yalnızca coverage görünürlüğü, bucket doğruluğu ve okunabilirlik sorunlarını sınıflandırır.

### UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01 [CHECK]
- `check:uxmobileallrolespanelaudit01` mobil shell düzeltmesi sonrası tüm rol panellerini mobile-first okunabilirlik matrisiyle tekrar gezerek panel bazlı CTA, drawer, launcher, overflow ve tab sinyallerini görünür hale getirir.
- Check script: `node backend\scripts\ux_mobile_all_roles_panel_audit_01_check.js`
- Smoke runner: `node backend\scripts\ux_mobile_all_roles_panel_audit_01.mjs`
- Browser-smoke report'u route, panel, first viewport, drawer, CTA ve mobile/desktop coverage görünürlüğü sağlar; `PASS`, `PASS-`, `UX-FIX`, `BLOCKER`, `AUTH-BLOCKED` ve `NOT-FOUND` sınıfları görünür kalır.
- `BLOCKER` ve `NOT-FOUND` kapatıcıdır; `AUTH-BLOCKED` report-only auth/session notudur.
- Bu check ürün/business flow değiştirmez; yalnızca mobile usability görünürlüğü, bucket doğruluğu ve okunabilirlik sorunlarını sınıflandırır.

### UX-SMOKE-PASS-MINUS-EVIDENCE-01 [CHECK]
- `check:uxsmokepassminusevidence01` PASS- bucket'ını hardcoded launcher-secondary baseline yerine evidence-based kılar.
- PASS- için kabul edilen kanıtlar: review queue action eksikliği, room route preview kısa karar kartı, company vardiya -> sözleşme taslağı geçişi, commercial accepted/applied bucket, uzun live-map yüzeyleri ve parent console noise.
- `Sefer Abi launcher secondary copilot olarak görünür.` tek başına PASS- nedeni değildir; `Harita / canlı takip dili görünür.` tek başına PASS- nedeni değildir.
- Bu check ürün/business flow değiştirmez; yalnızca smoke classification standardını netleştirir.
- Doküman: `docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md`

### UX-SMOKE-PASS-MINUS-ZERO-01 [CHECK]
- `check:uxsmokepassminuszero01` premium smoke raporunda `PASS- 0` hedefini zorunlu kılar.
- Hedef sınıflar: `PASS- 0`, `BLOCKER 0`, `AUTH-BLOCKED 0` ve `NOT-FOUND 0`.
- `UX-FIX` satırları ayrı backlog olarak raporlanabilir; zero snapshot standardı yalnızca `PASS-` sınıfını sıfırlar.
- Bu check ürün/business flow değiştirmez; yalnızca premium smoke PASS- sınıfını sıfıra indiren son kabul standardını doğrular.
- Doküman: `docs/UX_SMOKE_PASS_MINUS_ZERO_01.md`

### UX-LIVE-PANEL-PREMIUM-SMOKE-01 [SMOKE]
- `smoke:uxlivepanelpremium01` Playwright tabanlı canlı tarayıcı smoke runner'ıdır; desktop ve mobile viewport'ta public, room, company, super admin, driver, personel ve parent panellerini screenshot, console error ve page error sinyalleriyle toplar.
- Komut: `node backend\scripts\ux_live_panel_premium_smoke_01.mjs`
- `check:uxlivepanelpremiumsmoke01` bu smoke runner'ın doc / chain / artifact sınırlarını doğrular.
- Smoke çıktıları `backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/` altında `report.json`, `report.md` ve screenshot klasörü olarak oluşur; artefact'ler commit'e girmez.
- Panel sınıfları `PASS`, `PASS-`, `UX-FIX`, `BLOCKER`, `AUTH-BLOCKED` ve `NOT-FOUND` olarak raporlanır.
- Bu milestone yalnızca canlı UX smoke ve premium panel okunabilirlik audit'i yapar; payment / billing / contract execute, invite send, user create, supplier verification auto ve settlement execute açılmaz.

### MOBILE-WEB-FINAL-01 [CHECK]
- `check:mobilewebfinal01` final mobile acceptance audit'idir; mobile shell, all-roles audit ve premium smoke snapshot'larını tek kabul raporunda birleştirir.
- Check script: `node backend\scripts\mobile_web_final_01_check.js`
- Final doc: `docs/MOBILE_WEB_FINAL_01.md`
- Bu check ürün/business flow değiştirmez; yalnızca mevcut mobile kabul sonucunu, PASS- backlog'unu ve commit dışı artifact sınırlarını doğrular.
- Kabul koşulları: `UX-FIX 0`, `BLOCKER 0`, `NOT-FOUND 0`; `AUTH-BLOCKED` yalnızca report-only not olabilir.
- `PASS-` kalan satırlar final risk/backlog olarak raporlanır; Sefer Abi launcher / NavDock / sticky tab / horizontal overflow rulings bu belgede açıkça görünür.
- Browser-smoke commit dışı kalır; backend route / service / schema bu milestone ile değişmez.

### QUALITY-GATE-FINAL-01 [CHECK]
- `check:qualitygatefinal01` all-panels reality audit, mobile all-roles audit, premium smoke ve product-flow button audit snapshot'larını tek release gate raporunda toplar.
- Check script: `node backend\scripts\quality_gate_final_01_check.js`
- Final doc: `docs/QUALITY_GATE_FINAL_01.md`
- `UX-FIX > 0`, `BLOCKER > 0` ve `NOT-FOUND > 0` kapatıcıdır; `AUTH-BLOCKED` report-only not olabilir.
- All-panels reality audit için `PASS- 0` korunur; mobile all-roles audit'teki `PASS- 37`, premium smoke'taki `PASS- 15` ve product-flow button audit'teki `PASS- 10` evidence / coverage notları olarak ayrı belgelenir, tek başına release blocker sayılmaz.
- Browser-smoke ve çalışma alanı artefact'leri commit dışı kalır; backend route / service / schema katmanı bu gate ile değişmez.

### REQUEST-STORM-RESILIENCE-01 [CHECK]
- `check:requeststormresilience01` smoke/check zincirindeki request-storm risklerini, desktop/mobile storageState reuse ve 429 console/page error sınırını deterministic guard ile audit eder.
- Check script: `node backend\scripts\request_storm_resilience_01_check.js`
- Final doc: `docs/REQUEST_STORM_RESILIENCE_01.md`
- Aynı role için desktop→mobile storageState paylaşımı korunur; role isolation bozulmaz.
- `consoleErrorCount=0` ve `pageErrorCount=0` policy'si korunur; 429 ignore list'e alınmaz.
- product-flow, premium, all-panels ve mobile all-roles smoke PASS `18 / 82 / 82 / 82` kalır.
- Browser-smoke, runtime-data, stage ve backend route/service/schema / Prisma sınırları değişmez.

### PRODUCTION-RATE-LIMIT-POLICY-01 [CHECK]
- `check:productionratelimitpolicy01` production ortamında auth/public, read-heavy/live, write-action/human approval ve AI assistant read-only rate-limit sınıflarını merkezi policy/check/doc olarak kilitler.
- Check script: `node backend\scripts\production_rate_limit_policy_01_check.js`
- Final doc: `docs/PRODUCTION_RATE_LIMIT_POLICY_01.md`
- Runtime enforcement açmaz; backend route/service/prisma değiştirmez; smoke threshold / skip / timing / PASS kriterini gevşetmez; 429 ignore list açmaz.
- Request-storm ve smoke deneyimi korunur; 429 görünür kalır ve Türkçe user-facing mesaj korunur.

### TEST-QUALITY-AND-FLAKE-AUDIT-01 [CHECK]
- `check:testqualityandflakeaudit01` smoke/check zincirindeki flake risklerini, false negative sıcak noktalarını ve threshold / skip / timing / PASS gevşetme riskini audit eder.
- Check script: `node backend\scripts\test_quality_and_flake_audit_01_check.js`
- Final doc: `docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md`
- Yeni UI davranışı açmaz; route/service/prisma, broad allowlist, runtime-data ve browser-smoke commit sınırını değiştirmez.
- `QUALITY-GATE-FINAL-01` sonrasındaki son güvence katmanı olarak kalır; smoke eşikleri aynen korunur.

### DASHBOARD-BULK-ENDPOINT-01 [CHECK]
- `check:dashboardbulkendpoint01` dashboard yüzeylerinde read-only bulk aggregation pattern'ini dar kapsamlı guard ile audit eder.
- Check script: `node backend\scripts\dashboard_bulk_endpoint_01_check.js`
- Final doc: `docs/DASHBOARD_BULK_ENDPOINT_01.md`
- Aynı kullanıcı role içinde şirket / okul / oda / superadmin dashboard'larında fan-out azaltılır; read-only bulk endpoint write-action veya human approval sınırını açmaz.
- route/service/prisma ve backend/prisma değişmez; browser-smoke, runtime-data ve debug.log commit sınırı korunur.

### CACHE-COALESCING-AND-BACKOFF-01 [CHECK]
- `check:cachecoalescingandbackoff01` dashboard bulk ve read-heavy read flows için same-key inflight coalescing / bounded backoff guard'ını audit eder.
- Check script: `node backend\scripts\cache_coalescing_and_backoff_01_check.js`
- Final doc: `docs/CACHE_COALESCING_AND_BACKOFF_01.md`
- `backend/src/utils/responseCache.js` aynı-key promise reuse ile duplicate fetch fan-out'u keser; `web/src/utils/uiDataCache.js` bounded request gap / retry-after ile 429 görünürlüğünü korur.
- `REQUEST-STORM-RESILIENCE-01` ve `PRODUCTION-RATE-LIMIT-POLICY-01` aynı read-heavy zincirin companion guard'larıdır; write-action ve human approval sınırı açılmaz.
- route/service/prisma ve backend/prisma değişmez; browser-smoke, runtime-data ve debug.log commit sınırı korunur.

### AI-RESPONSE-SEMANTIC-QUALITY-GATE-01 [CHECK]
- `check:airesponsesemanticqualitygate01` Sefer Abi / Copilot yanıt semantiğinde role/screen fit, intent fit, güvenli adım, insan onayı, terminoloji, belirsizlik, tekrar kontrolü, clarifying ve cross-engine separation çizgisini deterministic case suite ile audit eder.
- Check script: `node backend\scripts\ai_response_semantic_quality_gate_01_check.js`
- Final doc: `docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md`
- Bu milestone yalnızca local deterministic response check'tir; runtime AI action, tool execution, write-action dispatcher, DB write, route apply, fake success, route/service/prisma değişimi, broad allowlist genişletmesi, runtime-data commit veya browser-smoke commit açmaz.

### LOAD-TEST-2000-USERS-01 [CHECK]
- `check:loadtest2000users01` 2000-user load-test readiness guard'ını local/dev-safe smoke bandı, explicit high-concurrency flag ve read-only scenario matrix ile sabitler.
- Check script: `node backend\scripts\load_test_2000_users_01_check.js`
- Final doc: `docs/LOAD_TEST_2000_USERS_01.md`

### DB-POOL-AND-API-SCALING-01 [CHECK]
- `check:dbpoolandapiscaling01` DB pool ve API scaling readiness guard'ını local/dev-safe probe, bounded timeout budget ve read-only companion doc zinciri ile sabitler.
- Check script: `node backend\scripts\db_pool_and_api_scaling_01_check.js`
- Probe helper: `node backend\scripts\db_pool_and_api_scaling_01_probe.js`
- Final doc: `docs/DB_POOL_AND_API_SCALING_01.md`
- Harness: `backend\scripts\load_test_2000_users_01_harness.js`
- 2000-user planı dashboard bulk, cache coalescing, request storm ve production rate-limit companion guard'larından ayrı tutulur; production/public URL load, write-action, human approval ve Prisma sınırı açılmaz.

### OBSERVABILITY-MONITORING-ALERTING-01 [CHECK]
- `check:observabilitymonitoringalerting01` health, metrics, alert ve KVKK-safe logging readiness guard'ını local/dev-safe GET probe, incident runbook yüzeyi ve smoke threshold zinciri ile sabitler.
- Check script: `node backend\scripts\observability_monitoring_alerting_01_check.js`
- Probe helper: `node backend\scripts\observability_monitoring_alerting_01_probe.js`
- Final doc: `docs/OBSERVABILITY_MONITORING_ALERTING_01.md`
- DB pool ve API scaling sonrasında alarm bandı, rate-limit policy, dashboard bulk, cache coalescing ve request storm sinyallerini okunur hale getirir; production/public probe, write-action ve schema/migration sınırı açılmaz.
- `BACKEND-LINT-WARNING-BURNDOWN-01` backend lint warning burndown kabul katmanıdır; `check:backendlintwarningburndown01`, `docs/BACKEND_LINT_WARNING_BURNDOWN_01.md` ve `node backend\scripts\backend_lint_warning_burndown_01_check.js` ile yaşar; runtime davranışı, smoke threshold, lint config ve commit dışı artefakt sınırını açmaz.
- `DATA-INTEGRITY-AND-RECOVERY-01` runtime-data recovery, backup/restore ve corruption detection kabul katmanıdır; `check:dataintegrityandrecovery01`, `docs/DATA_INTEGRITY_AND_RECOVERY_01.md` ve `node backend\scripts\data_integrity_and_recovery_01_check.js` ile yaşar; `backend/artifacts/runtime-data/`, `backend/artifacts/browser-smoke/`, `backend/artifacts/load-test/`, `backend/artifacts/db-scaling/`, `backend/artifacts/observability/` ve `backend/artifacts/data-integrity/` commit dışı kalır, production DB / destructive query / schema değişikliği açmaz.

### ROLE-DATA-ISOLATION-REDTEAM-01 [CHECK]
- `check:roledataisolationredteam01` role ve tenant data isolation redteam guard'ını read-only, local/dev-safe, deterministic statik policy olarak kilitler.
- Check script: `node backend\scripts\role_data_isolation_redteam_01_check.js`
- Doküman: `docs/ROLE_DATA_ISOLATION_REDTEAM_01.md`
- Bu check, data integrity / observability / DB scaling / load-test / request-storm zinciriyle birlikte okunur; production DB, public URL probe, real credential, write-action ve schema/migration açmaz.

### SECURITY-KVKK-FINAL-01 [CHECK]
- `check:securitykvkkfinal01` technical security / KVKK readiness final gate'idir.
- Check script: `node backend\scripts\security_kvkk_final_01_check.js`
- Doküman: `docs/SECURITY_KVKK_FINAL_01.md`
- Bu check, `ROLE-DATA-ISOLATION-REDTEAM-01`, `DATA-INTEGRITY-AND-RECOVERY-01`, `OBSERVABILITY-MONITORING-ALERTING-01`, `DB-POOL-AND-API-SCALING-01`, `LOAD-TEST-2000-USERS-01`, `CACHE-COALESCING-AND-BACKOFF-01`, `REQUEST-STORM-RESILIENCE-01` ve `PRODUCTION-RATE-LIMIT-POLICY-01` hattıyla birlikte okunur; production DB, public URL probe, real credential, write-action ve schema/migration açmaz.
- `AUDIT-LOG-AND-APPROVAL-TRACE-01` human approval trace ve KVKK-safe audit payload readiness gate'idir; `check:auditlogandapprovaltrace01`, `docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md` ve `node backend\scripts\audit_log_and_approval_trace_01_check.js` ile yaşar; approval request/decision, human override, stale context ve scope mismatch sinyallerini görünür kılar; production DB, public URL probe, real credential, write-action ve schema/migration açmaz.
- Runtime-data / generated artifact / debug.log commit dışıdır.

### UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01 [CHECK]
- `check:uxparentpersonelliveerrorclarity01` Parent / Veli ve Personel canlı takip yüzeylerinde hata, yetki, servis görünmüyor, bugün servis yok, konum yok ve fallback mesajlarını sade Türkçe ile güvenli hale getirir.
- `docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md` Parent / Veli ve Personel canlı takip için güvenli fallback ve next-step copy referansıdır.
- Parent / Veli canlı takipte `Bugün için aktif servis görünmüyor.`; Personel / Servisim canlı takipte `Bugün için aktif vardiya görünmüyor.` mesajları kullanılır; ETA / GPS kesin değilse kesin ifade verilmez.
- `Parent / Veli`, `Personel / Servisim` ve shared fallback kartı mobile-safe summary bandı ile kullanıcıyı bir sonraki kontrol adımına yönlendirir; backend auth/business route, schema, SMS/push/notification, route apply ve AI/Copilot capability açılmaz.
- Komut: `node backend\scripts\ux_parent_personel_live_error_clarity_01_check.js`

### BOARDING-OPS-01A [CHECK]
- `check:boardingops01a` günlük biniş değişiklikleri için readonly rota etki önizlemesini doğrular.
- `NO_SERVICE_TODAY`, `ALTERNATE_STOP_TODAY` ve `TEMPORARY_BOARDING_NOTE` change türleri kişi / durak / km / süre / kapasite etkisiyle birlikte görünür; değişiklik uygulanmaz.
- Bu milestone yalnızca önizlemedir; `StopAssignment` değişimi `BOARDING-OPS-01B`, driver route refresh ise `BOARDING-OPS-01C` olarak ayrıştırılır.
- GPS / ETA dili güvenli kalır; kesin ETA yoksa `ETA hesaplanamıyor` veya `ETA güncel değil` standardı korunur.

### BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01 [CHECK]
- `check:bugrouteimpactpreviewbutton01` Company / School / Room operasyon yüzeylerinde `Rota etkisini önizle` butonunu görünür preview akışına bağlar; preview alanı scroll/focus ile görünür kalır.
- Preview alanı readonly kalır; `Rota uygulanmaz`, `Sürücü rotası yenilenmez`, `Bildirim gönderilmez`, yalnızca etki analizi gösterilir.
- Boş, yükleniyor ve temizle akışları kullanıcıya açık feedback verir; Organization yüzeyi Company altyapısını kullanmaya devam eder.

### UX-ROUTE-IMPACT-PREVIEW-COMPACT-01 [CHECK]
- `check:uxrouteimpactpreviewcompact01` Room / Operasyon Sağlığı ve Company yüzeylerindeki rota etkisi önizlemesini kısa karar kartına dönüştürür.
- Check script: `node backend/scripts/ux_route_impact_preview_compact_01_check.js`
- Varsayılan görünüm kompakt özet kartıdır; detay analiz, mini harita ve teknik uyarılar açılır bölümde kalır.
- Preview readonly kalır; rota uygulanmaz, ödeme/fatura/tahsilat/invite/kullanıcı oluşturma/tedarikçi doğrulama açılmaz.

### UX-CONTRACT-CONVERSION-AND-OPS-BRIDGE-CLARITY-01 [CHECK]
- `check:uxcontractconversionopsbridgeclarity01` Company tarafındaki `Vardiyayı sözleşmeye dönüştür` akışını liste ekranına bırakmadan doğrudan sözleşme taslak / yazım ekranına taşır; Room Operasyon Köprüsü'nü summary-first karta dönüştürür ve detayları collapsible altında toplar.
- Check script: `node backend/scripts/ux_contract_conversion_ops_bridge_clarity_01_check.js`
- Ana karar ekranı kısa özet, risk ve sıradaki işlem cümlesi verir; Company tarafı `Sözleşme taslağını gözden geçir`, `Eksik alanları tamamla` ve `Onaya hazırla` yönlendirmesini görünür tutar.
- Detaylar drawer / accordion içinde kalır.
- Preview yalnızca readonly hazırlık düzeyindedir; payment / billing / collection / invite / user create / supplier verification auto / settlement execute açılmaz.

### SHIFT-DISPATCH-APPROVAL-FIX-01 [CHECK]
- `check:shiftdispatchapprovalfix01` Bekleyen Talepler / vardiya onay ekranında bölme önizleme onay butonunu gerçek seçim state'ine bağlar.
- Tüm önerilerde araç + şoför seçiliyse `Önizlemeyi Uygula: Böl & Onayla` aktif olur; eksik seçim, aynı araç/şoför çakışması veya kapasite riski varsa pasif kalır.
- Görünür durum dili `Hazır`, `Araç/şoför seç` ve net uyarı mesajlarıyla okunur; apply payload seçili `splitIndex`, `vehicleId`, `driverId` bilgisini taşır.
- Bu check ödeme / fatura / tahsilat / invite / üyelik / sözleşme akışı açmaz; yalnızca mevcut vardiya onay ve bölme önizleme bağını düzeltir.

### UI-ACTION-WIRING-AUDIT-01 [CHECK]
- `check:uiactionwiringaudit01` panel ve copilot yüzeylerindeki aktif aksiyonların wiring kalitesini, role guard'larını ve readonly sınırlarını denetler.
- Boş handler, `href="#"`, `console.log` / `alert` tabanlı sahte aksiyon ve hedefi olmayan quick-action chip'leri reddeder.
- Visible result, loading/error/empty state ve role/permission görünürlüğü korunur; yeni business flow açılmaz.

### BOARDING-CHANGE-REQUEST-ENTRY-01 [CHECK]
- `check:boardingchangerequestentry01` Personel / Veli talep giriş yüzeylerinde `Bugün binmeyeceğim`, `başka durak` ve `farklı konum/not` request entry akışını doğrular.
- Talep oluşturma mevcut boarding request altyapısına bağlanır; `same-route` ise karar sahibi sürücü, `route-outside` ise hizmet alan taraf olur.
- Room yalnızca operasyonel görünürlük verir; preview readonly kalır, rota uygulanmaz ve driver route refresh tetiklenmez.

### BOARDING-OPS-01B [CHECK]
- `check:boardingops01b` kabul edilmiş boarding change kaydını güvenli ve dar bir uygulama yoluyla günlük `StopAssignment` etkisine bağlar.
- `NO_SERVICE_TODAY`, `ALTERNATE_STOP_TODAY` ve `TEMPORARY_BOARDING_NOTE` desteklenir; `TEMPORARY_BOARDING_NOTE` not/audit olarak kalabilir.
- Uygulama explicit kullanıcı aksiyonu ile yapılır, idempotent çalışır ve audit izi üretir.
- Driver route refresh, SMS / notification ve payment / settlement execute bu milestone kapsamı dışındadır; sürücü route refresh sonraki adımda (`BOARDING-OPS-01C`) ele alınır.

### BOARDING-OPS-01C [CHECK]
- `check:boardingops01c` kabul edilmiş ve günlük atamaya işlenmiş boarding change etkisinin driver `Bugün` / `Rota` yüzeylerinde görünürlüğünü ve kontrollü route refresh sinyalini doğrular.
- `NO_SERVICE_TODAY`, `ALTERNATE_STOP_TODAY` ve `TEMPORARY_BOARDING_NOTE` sürücü ekranında günlük değişiklik olarak görünür; kalıcı rota / durak / personel ataması değişmez.
- SMS / push notification, payment / settlement execute ve şema değişiklikleri bu milestone kapsamı dışındadır; workspace-sensitive artifact write yapılmaz.
- Bu adım mobile route update görünürlüğü içindir; route refresh sinyali idempotent ve readonly gösterim olarak korunur.

### ROUTE-CHANGE-FINAL-01 [CHECK]
- `check:routechangefinal01` sözleşme kaynaklı rota değişikliği final kabul akışını doğrular.
- `Company / Sözleşmeler` tarafında teklif / önizleme ve `Room / Sözleşmeler` tarafında kabul / red / tekrar kontrol görünürlüğü tek rota değişikliği hattında okunur.
- Eski rota / yeni rota, kişi / durak / km / süre farkı ve uygulanan rota geçmişi görünür; driver route refresh bu milestone kapsamı dışındadır.
- SMS / push, payment / settlement ve otomatik kalıcı route apply yoktur.

### DYNAMIC-SAVINGS-01 [CHECK]
- `check:dynamicsavings01` sözleşme / rota değişikliği / boarding deltasından readonly dinamik tasarruf önizlemesi üretir.
- `Company / Sözleşmeler` ile `Room / Sözleşmeler` ve ticari akış yüzeylerinde km tasarrufu, süre tasarrufu, kapasite etkisi ve yaklaşık maliyet etkisi birlikte okunur.
- Veri yoksa `Tasarruf hesabı için yeterli veri yok` güvenli fallback'i kullanılır; route apply, ödeme, settlement, SMS, push ve driver refresh yoktur.
- Bu check ürün davranışını değiştirmez; yalnızca readonly tasarruf görünürlüğünü doğrular.

### COP-LIVE-ACCEPT-01 [CHECK]
- `check:copliveaccept01` Sefer Abi / Copilot canlı kabul matrisi için readonly static gate'tir.
- `ROOM`, `COMPANY`, `DRIVER`, `PARENT`, `PERSONEL` ve `SUPER_ADMIN` canlı yüzeylerinde `Sefer Abi` persona/launcher, context payload köprüsü ve GPS/ETA safe wording korunur.
- `Payment/settlement execute` görünmez; kabul matrisinde 14 ekran ve 15 soru tek referans altında toplanır.
- Bu check ürün/business flow değiştirmez; yalnızca kabul kapsamını görünür kılar.

## 5) Faz haritası
### Faz A — M0→M41 çekirdek temel hat [HISTORICAL]
Bu bant tek tek ayrı pack rehberinden çok `run_m0_latest.js` ve legacy milestone check zinciri ile yaşar. Eski `run_m0_m66.js` yalniz tarihsel wrapper olarak dusunulmelidir; guncel komut `npm run verify:milestones`.
Ana kapsama örnekleri:
- iskelet / auth / role / seed
- temel REST/WS omurgası
- okul, öğrenci, veli ve personel çekirdek veri akışları
- GPS live/history temel ayrımı
- ilk panel ve kayıt omurgası

### Faz B — M42→M58 hazırlık ve mobil ön bant [HISTORICAL + PACK]
Bu bantta milestone bazlı pack komutları görünür hale gelir.

### Faz C — M59→M79 operasyon / SSOT / hot-path / acceptance [HISTORICAL + CANONICAL ANCHOR]
Bu bant tarihsel anchor ve repo karakterini belirleyen orta omurgadır.

### Faz D — M80→M89 upper route [CANONICAL]
Bu bant güncel doğrulanmış üst hattır.

## 6) Milestone haritası — M0→M41
### M0→M5 [HISTORICAL]
- Amaç: repo iskeleti, auth, role ve seed tabanı.
- Ana yürütücü: `backend/scripts/m0check.js` ve ilgili legacy zincir.
- Durum: çekirdek tarihi omurga; ayrı tekil pack değil, faz runner mantığıyla ele alınır.

### M6→M11 [HISTORICAL]
- Amaç: okul/öğrenci/veli çekirdek CRUD ve ilk ekran bağları.
- Ana yürütücü: legacy `mXcheck.js` zinciri.
- Durum: tarihsel temel ürün hattı.

### M12→M17 [HISTORICAL]
- Amaç: GPS, attendance, canlı publish ve temel WS room yapısı.
- Not: bu bant proje hafızasında canlı operasyonun ilk büyük eşiğidir.

### M18→M23 [HISTORICAL]
- Amaç: parent/public erişim, görünürlük ve ürün yüzeyi derinleşmesi.
- Not: güncel Parent Access akışı legacy invite değildir; bu fark daha yeni docs'ta açıklanır.

### M24→M29 [HISTORICAL]
- Amaç: teklif, atama, rota ve organizasyonel akışların genişlemesi.
- Durum: legacy çekirdek.

### M30→M35 [HISTORICAL]
- Amaç: harita, operasyon, görünürlük ve panel birikimi.
- Durum: tek tek değil faz runner ile okunur.

### M36→M41 [HISTORICAL]
- Amaç: M42 öncesi çekirdek kapanış ve pack'li döneme hazırlık.
- Ana komut: `tools/packs/living/pack_phase_m0_m41.ps1`

## 7) Milestone haritası — M42→M58
### M42 — Optional gate [PACK]
- Pack: `tools/pack_m42_optional.ps1`
- Anlam: M42 sonrası paketli doğrulama bandının başlangıcı.

### M43 — Google Auth Invite Gate [PACK]
- Pack: `tools/pack_m43_google_auth_invite_gate.ps1`
- Not: güncel üründe legacy invite davranışı tarihsel bilgi olarak kalır.

### M44 — Telematics [PACK]
- Pack: `tools/pack_m44_telematics.ps1`
- Milestone: `M44-TELEMATICS-T1-T5`
- Amaç: araç GPS/telematics temel omurgası.
- Komut: `node backend\scripts\m44_telematics_t1_t5_check.js`
- Check: `check:m44telematicst1t5`
- Doküman: `docs/M44_TELEMATICS_T1_T5.md`
- Not: `M44-T1/T5` compatibility alias'ı backlog / registry / state tarafında korunur; bu check canonical read-only baseline'ı görünür kılar.

### TELEMATICS-PROVIDER-HUB-01 — provider-agnostic GPS provider hub / readiness UX [CHECK]
- Check: `check:telematicsproviderhub01`
- Komut: `node backend\scripts\telematics_provider_hub_01_check.js`
- Ana konu: M44 baseline sonrası provider-agnostic telematics hub; GPS provider adapter, vehicle tracking software, normalized telematics event, provider registry, user GPS integration flow, test bağlantısı ve cihaz eşleştirme görünürlüğü.
- Not: gerçek provider entegrasyonu, secret/API key/token repo'ya yazımı, backend route/service/schema ve Prisma/schema/migration açılmaz; readonly T1-T5 boundary korunur.
- Doküman: `docs/TELEMATICS_PROVIDER_HUB_01.md`

### SAFE-DRIVE-01 — readonly safe-drive risk summary / recommendation layer [CHECK]
- Check: `check:safedrive01`
- Komut: `node backend\scripts\safe_drive_01_check.js`
- Ana konu: M44-TELEMATICS-T1-T5 ve TELEMATICS-PROVIDER-HUB-01 sonrası GPS güvenilirliği, hız riski, rota ilerleme sinyali, kanıt / check-in durumu ve operasyon kontrol önerisini readonly toplar.
- Copy: `Güvenli sürüş özeti`, `Risk sinyali`, `Kontrol edilmeli`, `İnsan onayı gerekir`
- Not: rota uygulanmaz, sürücü/araç ataması değiştirilmez, ödeme/hakediş başlatılmaz, sözleşme bağlanmaz, otomatik yönlendirme verilmez.
- Doküman: `docs/SAFE_DRIVE_01.md`

### OFFER-RANKING-QUALITY-01 — readonly offer quality comparison / human approval boundary [CHECK]
- Check: `check:offerrankingquality01`
- Komut: `node backend\scripts\offer_ranking_quality_01_check.js`
- Ana konu: Company / Room / Super Admin yüzeylerinde readonly offer quality comparison; kalite, güven, telematics, evidence/check-in ve operasyon riski birlikte okunur.
- Not: auto-selection, auto-accept, contract execute, payment/hakediş execute ve AI runtime action açılmaz; winner otomasyonu yoktur.
- Doküman: `docs/OFFER_RANKING_QUALITY_01.md`

### M45 — Retention + Backup [PACK]
- Pack: `tools/pack_m45_retention_backup.ps1`
- Amaç: retention/backup altyapısı.

### M46 — AI Copilot Foundation [PACK]
- Ana pack: `tools/pack_m46_ai_copilot.ps1`
- Alt packler: `m46.1`...`m46.9`, `m46.6_*`, `m46.7`, `m46.8`, `m46.9`
- Amaç: AI copilot, screen help, job guide, context chat ve role mode bandı.

### M47 — KVKK Notice / Consent Framework [PACK]
- Pack: `tools/pack_m47_kvkk_notice_consent_framework.ps1`
- Amaç: KVKK notice/consent temeli.

### M47.2 — Capacity & Load Baseline [PACK]
- Pack: `tools/pack_m47_2_capacity_load_baseline.ps1`

### M47.3 — Production Resilience + Edge Security [PACK]
- Pack: `tools/pack_m47_3_production_resilience_edge_security.ps1`

### M47.4 — Mobile Readiness Web Pass [PACK]
- Pack: `tools/pack_m47_4_mobile_readiness_web_pass.ps1`

### M48 — Driver Mobile App Foundation [PACK]
- Pack: `tools/pack_m48_driver_mobile_foundation.ps1`

### M48.5 — Room / Company Tablet Readiness [PACK]
- Pack: `tools/pack_m48_5_room_company_tablet_readiness.ps1`

### M49 — Mobile Beta Hardening [PACK]
- Pack: `tools/pack_m49_mobile_beta_hardening.ps1`

### M49.1 — Driver Voice Guidance + Stop ETA [PACK]
- Pack: `tools/pack_m49_1_driver_voice_guidance_stop_eta.ps1`

### M50 — Mobile Release Readiness [PACK]
- Pack: `tools/pack_m50_mobile_release_readiness.ps1`

### M51→M53 — Backfill Verification [PACK]
- Pack: `tools/pack_m51_53_backfill_verification.ps1`
- Amaç: veri/rota/backfill doğrulaması.

### M54.3 — Dispatch Approve + Repack [PACK]
- Pack: `tools/pack_m54_3_dispatch_approve_repack.ps1`

### M54.4 — Driver Route Delivery [PACK]
- Pack: `tools/pack_m54_4_driver_route_delivery.ps1`

### M55 — Reports + No-show [PACK]
- Pack: `tools/pack_m55_reports_no_show.ps1`

### M56 — KVKK Matrix + ETA / Navigation Quality [PACK]
- Pack: `tools/pack_m56_kvkk_eta_quality.ps1`

### M57 — Mobile Hardening [PACK]
- Pack: `tools/pack_m57_mobile_hardening.ps1`

### M58 — Final Pilot Readiness [PACK / HISTORICAL OPEN GATE]
- Pack: `tools/pack_m58_final_pilot_readiness.ps1`
- Durum: tarihsel pilot kapısı; checklistte açık marker olarak yaşar.

## 8) Milestone haritası — M59→M79
### M59 — Gözlemleme + Saha Teşhis [PACK / HISTORICAL OPEN GATE]
- Pack: `tools/pack_m59_observability_field_diagnostics.ps1`
- Rolü: saha öncesi gözlemleme, teşhis ve karar desteği.

### M60 — Saha Acceptance Merkezi [PACK]
- Pack: `tools/pack_m60_field_acceptance_center.ps1`

### M61 — SSOT + Milestone Hizası [PACK]
- Pack: `tools/pack_m61_ssot_milestone_alignment.ps1`
- Rolü: docs ve milestone anlamlarını bir çizgiye oturtmak.

### M62 — Ticari Omurga Güçlendirme [PACK]
- Pack: `tools/pack_m62_commercial_core_strengthening.ps1`

### M63 — Güven + Kalite + Hizmet Değerlendirme [PACK]
- Pack: `tools/pack_m63_trust_quality_service_evaluation.ps1`

### M64 — Doğal Copilot Katmanı [PACK]
- Pack: `tools/pack_m64_natural_copilot_layer.ps1`

### M65 — Pilot Launch Gate [PACK]
- Pack: `tools/pack_m65_pilot_launch_gate.ps1`
- Not: saha açılımı için tarihsel güven kapısıdır.

### M66 — Operasyonel Reassignment [PACK / HISTORICAL COMPAT]
- Pack: `tools/pack_m66_operation_reassignment.ps1`
- Durum: compatibility marker.

### M67 — Kurumsal Ölçek Hazırlık [PACK]
- Pack: `tools/pack_m67_kurumsal_olcek_hazirlik.ps1`

### M68 — Fetch Hardening [PACK]
- Pack: `tools/pack_m68_fetch_hardening.ps1`

### M69 — Fetch Hardening Phase 2 [PACK]
- Pack: `tools/pack_m69_fetch_hardening_phase2.ps1`

### M70 — Checker Sync + Hot Path [PACK]
- Pack: `tools/pack_m70_checker_sync_hot_path.ps1`

### M71 — Summary Hot Path [PACK]
- Pack: `tools/pack_m71_summary_hotpath.ps1`
- Ek hotfix packleri: `pack_m71_room_title_hotfix.ps1`, `pack_m71_ui_contract_hotfix.ps1`, `pack_m71_workflow_loadsummary_hotfix.ps1`

### M72 — Hot Endpoint Reduction [PACK]
- Pack: `tools/pack_m72_hot_endpoint_reduction.ps1`
- Ek hotfix: `tools/pack_m72_georeview_token_hotfix.ps1`

### M73 — Hot Path Phase 2 [PACK]
- Pack: `tools/pack_m73_hot_path_phase2.ps1`

### M74 — Hot Path Phase 3 [PACK]
- Pack: `tools/pack_m74_hot_path_phase3.ps1`

### M75 — Hot Path Phase 4 [PACK]
- Pack: `tools/pack_m75_hot_path_phase4.ps1`
- Ek hotfix: `tools/pack_m75_repo_contract_hotfix.ps1`

### M76A-1 — Minimum Normalization [PACK]
- Pack: `tools/pack_m76a_1_minimum_normalization.ps1`

### M76B — Living Matrix + Tools Consolidation [PACK]
- Pack: `tools/pack_m76b_living_matrix_tools_consolidation.ps1`

### M76A-2 — Final Normalization + Archiving [PACK]
- Pack: `tools/pack_m76a_2_final_normalization_archiving.ps1`

### M77 — KVKK + Uyum Katmanı [PACK]
- Pack: `tools/pack_m77_kvkk_uyum_katmani.ps1`

### M78 — Checklist + Operasyon Doğrulama [PACK]
- Ana pack: `tools/pack_m78_checklist_operasyon_dogrulama.ps1`
- Alt packler: `M78.1`, `M78.2`, `M78.3`
- İlgili rehberler:
  - `docs/SAHA_KABUL_CHECKLISTLERI_V1.md`
  - `docs/ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md`
  - `docs/KANIT_PROOF_KONTROL_OMURGASI_V1.md`
  - `docs/KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md`

### M79 — Copilot Acceptance [PACK]
- Pack: `tools/pack_m79_copilot_acceptance.ps1`
- Rolü: tarihsel tam master anchor öncesi kabul kapısı.

## 9) Milestone haritası — M80→M89 upper route
### M80 — Final sert kabul ve yük güveni [CANONICAL / PACK]
- Pack: `tools/pack_m80_final_sert_kabul_yuk_guveni.ps1`
- Amaç: sıcak paneller, yük davranışı ve sert kabul kapısı.

### M80.1 — Hot panel daraltma [PACK]
- Pack: `tools/pack_m80_1_hot_panel_daraltma.ps1`
- Amaç: sıcak panellerde yük azaltma ve sadeleştirme.

### M80.2 — Agreements + Shifts giriş yükü [PACK]
- Pack: `tools/pack_m80_2_agreements_shifts_giris_yuku.ps1`
- Amaç: ilk giriş yükünü düşürmek.

### M80.3 — GeoReview + Shifts son giriş yükü [PACK]
- Pack: `tools/pack_m80_3_georeview_shifts_son_giris_yuku.ps1`
- Amaç: son kalan giriş yükü sıcak noktalarını kapatmak.

### M81 — Mobil saha sertleştirme [PACK]
- Pack: `tools/pack_m81_mobile_saha_sertlestirme.ps1`
- Amaç: mobil omurgayı resmi tools/docs hattına bağlamak.

### M82 — Saha öncesi çekirdek sertleştirme programı [CANONICAL UMBRELLA]
- Alt görünür kapılar: `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`
- Alt çalışma notları: `M82.2`, `M82.3`, `M82.4`, `M82.5`, `M82.6`, `M82.7`

### M82.1 — Backend correctness kilidi [PACK]
- Pack: `tools/pack_m82_1_backend_correctness.ps1`
- Ana konu: route snapshot, preview cache, error contract ve correctness guard.

### M82.8 — Verification 2.0 [PACK]
- Pack: `tools/pack_m82_8_verification_2_0.ps1`
- Ana konu: mobil acceptance zinciri + company shifts runtime guard.

### M82.9 — Dormant payment backbone [PACK]
- Pack: `tools/pack_m82_9_dormant_payment_backbone.ps1`
- Ana konu: `AGREEMENT | SHIFT_SERIES` ticari kaynak, dormant payment omurgası.

### M82.10 — Super Admin ticari ayarlar [PACK]
- Pack: `tools/pack_m82_10_super_admin_commercial_settings.ps1`
- Ana konu: payment mode / commission / override yönetimi.

### M82.11 — Payment readonly ticari yüzey [PACK]
- Pack: `tools/pack_m82_11_payment_readonly_surface.ps1`
- Ana konu: agreement ve shift series tarafında readonly ticari özet görünürlüğü.

### M83 — Saha hazırlık paketi [PACK]
- Pack: `tools/pack_m83_field_prep_packet.ps1`
- Runbook: `docs/RUNBOOK_M83_FIELD_PREP_PACKET.md`
- Ana konu: operatör sırası, senaryo listesi, role/device checklist.

### M84 — Saha geri bildirim döngüsü [PACK]
- Pack: `tools/pack_m84_field_feedback_loop.ps1`
- Runbook: `docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md`
- Ana konu: saha günü kayıtları, kapanış takibi, Super Admin geri bildirim yüzeyi.

### M85 — Opsiyonel ödeme pilotu [PACK]
- Pack: `tools/pack_m85_optional_payment_pilot.ps1`
- Runbook: `docs/RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md`
- Ana konu: OPTIONAL mod READY/DORMANT pilot listesi.

### M86 — Zorunlu ödeme rollout [PACK]
- Pack: `tools/pack_m86_required_payment_rollout.ps1`
- Runbook: `docs/RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md`
- Ana konu: REQUIRED mod ACTIVE/DISABLED rollout akışı.

### M87 — Ödeme hesabı hazırlığı [PACK]
- Pack: `tools/pack_m87_payment_account_readiness.ps1`
- Runbook: `docs/RUNBOOK_M87_PAYMENT_ACCOUNT_READINESS.md`
- Ana konu: payment account metadata/readiness görünürlüğü.

### M88 — Settlement operasyon masası [PACK]
- Pack: `tools/pack_m88_settlement_operations_console.ps1`
- Runbook: `docs/RUNBOOK_M88_SETTLEMENT_OPERATIONS_CONSOLE.md`
- Ana konu: READY/PLANNED/EXECUTED settlement entry satırlarının operasyon görünürlüğü.

### M89 — Settlement mutabakat masası [PACK]
- Pack: `tools/pack_m89_settlement_reconciliation_desk.ps1`
- Runbook: `docs/RUNBOOK_M89_SETTLEMENT_RECONCILIATION_DESK.md`
- Ana konu: eşleşti / inceleme gerekli / uyuşmazlık / kapandı akışı.

## 10) M90 yönü
### M90 — Canonical Closure / 10-10 kapanış paketi [PLAN]
- Amaç: yeni ürün modülü açmak değil.
- Hedefler:
  - kanonik markdown hizası
  - state/pack/verify convergence
  - proof reformu
  - repo hijyen kapanışı
  - tek rehber kuralı

### M90B.1 — executable closure gate [PACK]
- Pack: `tools/pack_m90_b1_canonical_closure_gate.ps1`
- Runbook: `docs/RUNBOOK_M90B_1_EXECUTABLE_CLOSURE_GATE.md`
- Ana konu: `M0->M89 green` bazı üstünde docs/state/pack/verify convergence hattını çalışan resmi kapıya bağlamak.

### M90C.6 — hot-file queue policy [PACK]
- Pack: `tools/pack_m90_c6_hot_file_queue_policy.ps1`
- Runbook: `docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md`
- Ana konu: large/hot file listesini resmi sınıflı queue'ya çevirmek; justified exception, safe candidate review ve acceptance-sensitive / later sınıflarını repo-audit ile doğrulamak.

### M90C.7 — export / package hygiene closure [PACK]
- Pack: `tools/pack_m90_c7_export_package_hygiene.ps1`
- Runbook: `docs/RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md`
- Shareable export: `tools/export_shareable_repo_bundle.ps1`
- Physical snapshot soft gate: `npm run verify:snapshot`
- Ana konu: env/build/runtime-json/overlay kalıntısı taşımayan temiz shareable repo zip üretmek; fiziksel snapshot yüzeyi export-clean ile karıştırılmaz.

### M90C.8 — CI / verification visibility [PACK]
- Pack: `tools/pack_m90_c8_ci_verification_visibility.ps1`
- Runbook: `docs/RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md`
- Root verify: `npm run verify:ci`
- Web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- Workflow: `.github/workflows/vardis_verification_visibility.yml`
- Ana konu: kanonik doğrulama zincirini repo-native görünür hale getirmek ve repo audit + web lint + sanitized export artifact'larını CI içinde görünür kılmak.

### M90C.9 — güvenli kapanış / final hygiene checklist [PACK]
- Pack: `tools/pack_m90_c9_safe_closure_final_hygiene.ps1`
- Runbook: `docs/RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md`
- Final verify: `npm run verify:final`
- Final verify sonrası web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- Export/hijyen shell tercihi: `pwsh`
- Ana konu: release/shareable/export/verify sırasını tek resmi checklist altında sabitlemek ve PS5 uyum dersini kalıcı kurala çevirmek.

### M91 — shift / agreement route preview [STATIC CHECK BAND]
- Runbook: `docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md`
- Pack: `tools/pack_m91_shift_agreement_route_preview.ps1`
- Backend alias: `npm --prefix backend run m91check`
- Family runner: `node backend/scripts/run_m91_route_preview_checks.js`
- Compatibility milestone alias: `npm --prefix backend run m91:milestones`
- Latest runner: `npm run verify:milestones`
- Ana konu: vardiyadan sozlesmeye gecen akista kaynak vardiya, rota onizleme, operasyon koprusu ve linked-shift guard'larini ayni kontratta tutmak. Benzer M91 marker scriptleri `backend/scripts/_m91_route_preview_checks.js` altinda tek catiya alinmistir; eski `m91*_check.js` dosyalari compatibility wrapper olarak kalir.

### M92 — repo verification spine [CANONICAL CHECK CHAIN]
- Milestone: `docs/MILESTONE_M92_REPO_VERIFICATION_SPINE.md`
- Runbook: `docs/RUNBOOK_M92_REPO_VERIFICATION_SPINE.md`
- Pack: `tools/pack_m92_repo_verification_spine.ps1`
- Backend alias: `npm --prefix backend run m92check`
- Root alias: `npm run verify:repo`
- Ana konu: tum repo kontrollerini tek catiya toplamak; package scriptleri, tools wrapper, manifest, state, runbook ve M0->latest runner baglantisini ayni guard altinda tutmak.


### M93 — queue durability proof [PACK]
- Milestone: `docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md`
- Runbook: `docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md`
- Pack: `tools/pack_m93_queue_durability_proof.ps1`
- Runtime probe: `backend/scripts/m93_queue_durability_runtime_probe.js`
- Ana konu: autoReachedQueue için Redis down/up, worker restart reclaim, dead-letter görünürlüğü ve threshold kanıtını resmi hatta bağlamak.

### M94-D2 / M94-D3 — admin audit + payment export polish + settlement ledger CSV cleanup [CHECK]
- Komut: `node backend\scripts\m94d_admin_payment_security_export_check.js`
- Ana konu: admin write step-up, payment ledger export audit standardı, ledger CSV temizliği ve ticari panel görünürlüğünü küçük bir kapanış check'iyle sabitlemek.

### M94-E — queue chaos / alarm proof [CHECK + PROBE]
- Runbook: `docs/RUNBOOK_M94E_QUEUE_CHAOS_ALARM_PROOF.md`
- Komut: `node backend\scripts\m94e_queue_chaos_alarm_check.js`
- Probe: `node backend\scripts\m94e_queue_chaos_alarm_probe.js`
- Ana konu: autoReachedQueue için Redis unavailable, stale claim reclaim, dead-letter görünürlüğü, dedupe'li alarm ve incident-sync akışını güvenli probe ile görünür kılmak.

### M95-E0 — android apk/aab build readiness [CHECK]
- Runbook: `docs/RUNBOOK_M95E0_ANDROID_BUILD.md`
- Komut: `node mobile\scripts\m95_e0_android_build_readiness_check.js`
- Ana konu: Android APK/AAB build hazırlığını resmi runbook/check altında görünür kılmak; saha kanıtından ayrı tutmak.

### M95-E25 — mobil saha kabul checklist’i [CHECK]
- Komut: `node backend\scripts\m95_e25_mobile_field_acceptance_check.js`
- Ana konu: mobil uygulamanın saha öncesi temel kullanıcı akışlarını sade Türkçe checklist ile doğrulamak.

### M95-E26 — Android emulator smoke planı [CHECK]
- Komut: `node backend\scripts\m95_e26_android_emulator_smoke_plan_check.js`
- Ana konu: local emulator üzerinde APK profili, API base ve temel rol/smoke kanıtını tek plan altında toplamak.

### M95-E27 — Gerçek Android cihaz saha proof hazırlığı [CHECK]
- Komut: `node backend\scripts\m95_e27_real_android_device_field_proof_prep_check.js`
- Ana konu: gerçek cihaz testinden önce izin, ekran, GPS, ağ ve kanıt planını sade Türkçe hazırlık dokümanında kilitlemek.

### M95-EXPORT-01 — export zip / runtime check uyumu [CHECK]
- Komut: `node backend\scripts\m95_export_01_runtime_check_compat_check.js`
- Ana konu: shareable export paketinde runtime JSON yokluğunu INFO/SKIP kabul ederek saha check uyumunu korumak.

### MOBILE-TEXT-01 — mobil aktivasyon copy cleanup [CHECK]
- Komut: `npm --prefix mobile run check:mobiletext01`
- Ana konu: personel, veli ve biniş değişikliği kartlarındaki eski hazırlık dilini sade Türkçeye çevirmek.

### M96-A — driver availability local state [CHECK]
- Komut: `node mobile\scripts\m96_a_driver_availability_check.js`
- Ana konu: sürücü mola / müsaitlik / yeni iş durumunu mobil yerel state olarak görünür kılmak.

### M96-B — mobile notifications foundation [CHECK]
- Komut: `node mobile\scripts\m96_b_notifications_check.js`
- Ana konu: driver, personel, veli ve operasyon bildirim yüzeylerini mobilde tek foundation altında görünür kılmak.

### M96-C — boarding change local model [CHECK]
- Komut: `node mobile\scripts\m96_c_boarding_change_check.js`
- Ana konu: biniş değişikliği taleplerini mobil yerel istek modeli olarak görünür kılmak; backend/panel bind sonraki halkada yaşar.
- Not: operasyon readiness için ayrıca `M96-C2` check'i kullanılır.

### M96-C2 — boarding change operations readiness [CHECK]
- Komut: `node backend\scripts\m96_c2_boarding_change_ops_check.js`
- Ana konu: backend/panel/audit/notification/auto-accept görünürlüğünü doğrulamak.

### M96-D — driver change awareness [CHECK]
- Komut: `node mobile\scripts\m96_d_driver_change_awareness_check.js`
- Ana konu: sürücü değişiklik farkındalığı ve sesli uyarı katmanını mobilde görünür kılmak.

### M97 — check-in panel integrations [CHECK]
- Komut: `node backend\scripts\m97_panel_integration_check.js`
- Ana konu: room/company/school/organization/driver check-in görünürlük ve kısayollarını panel/nav katmanında güvenli biçimde restore etmek.

### M97-A — room operation board [CHECK]
- Komut: `node backend\scripts\m97_a_room_operation_panel_check.js`
- Ana konu: oda operasyon panelinde bugünkü görevler, aktif servisler, sürücü / araç durumu ve biniş değişikliği özetini tek yerde göstermek.

### M98-A — personel activation model [CHECK]
- Komut: `node mobile\scripts\m98_a_personel_activation_model_check.js`
- Ana konu: personel hesabı için kurum daveti, ilk giriş PIN/şifre değişimi ve cihaz eşleşmesi modelini görünür kılmak.

### M98-B — parent activation and link access [CHECK]
- Komut: `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- Ana konu: veli daveti, bağlantı süresi ve takip yetkisini görünür kılmak.

### M98-C — link lifetime and tracking authority [CHECK]
- Komut: `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- Ana konu: bağlantı süresi, aktif servis ve görünürlük kuralını görünür kılmak.

### M98-D — kvkk visibility matrix [CHECK]
- Komut: `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- Ana konu: rol bazlı takip görünürlüğü ve KVKK kapı kurallarını görünür kılmak.

### M98-E5 — kod + PIN gerçek kullanıcı kabul checklist’i [CHECK]
- Komut: `node backend\scripts\m98_e5_code_pin_manual_acceptance_check.js`
- Ana konu: saha/operatör gözüyle kod + PIN erişim paketinin gerçek kullanıcı kabulünü tek checklist altında doğrulamak.

### M99-KVKK-01 — mobil/web KVKK sade metin ve izin dili [CHECK]
- Komut: `node backend\scripts\m99_kvkk_01_mobile_web_plain_text_check.js`
- Ana konu: mobil ve web yüzeylerinde KVKK / izin açıklamalarının sade Türkçe dilini ve görünürlük sınırlarını kabul paketi olarak doğrulamak.

### M99-UX-01 — görünür Türkçe metin hijyeni / teknik terim taraması [CHECK]
- Komut: `node backend\scripts\m99_ux_01_visible_text_hygiene_check.js`
- Ana konu: kullanıcıya görünen metinlerde teknik / İngilizce terim taşmasını sınırlı marker setiyle doğrulamak.

### M99-A — mobile regression pack [CHECK]
- Komut: `node mobile\scripts\m99_a_mobile_regression_pack_check.js`
- Ana konu: login, role routing, token/session, bildirim, biniş değişikliği ve müsaitlik regression pack'ini tek check'te yaşatmak.

### M99-B — real scenario tests [CHECK]
- Komut: `node mobile\scripts\m99_b_real_scenario_tests_check.js`
- Ana konu: sürücü, personel, veli ve operasyon yüzeylerini gerçek senaryo pack'iyle tek check'te yaşatmak.

### M99-C — field launch readiness [CHECK]
- Komut: `node mobile\scripts\m99_c_field_launch_readiness_check.js`
- Ana konu: gerçek cihaz, zayıf ağ ve saha kanıtı hazırlığını tek check'te görünür kılmak.

### OP-01 — operation proof / service proof readonly kanıt omurgası [CHECK]
- Komut: `node backend\scripts\op_01_operation_proof_service_proof_check.js`
- Ana konu: servis kanıtı ve hizmet kanıtı için readonly özet omurgasını doğrulamak.

### OP-02 — manuel operatör kanıt notu [CHECK]
- Komut: `node backend\scripts\op_02_manual_operator_proof_note_check.js`
- Ana konu: servis/hizmet kanıtı özetine manuel not bağlayan küçük yazma katmanını doğrulamak.

### OP-03 — web servis kanıtı / manuel not küçük kartı [CHECK]
- Komut: `node backend\scripts\op_03_web_operation_proof_card_check.js`
- Ana konu: operasyon yüzeylerinde küçük servis kanıtı kartını ve manuel not formunu doğrulamak.

### OP-04 — ticari/kalite readonly köprü [CHECK]
- Komut: `node backend\scripts\op_04_proof_commercial_quality_readonly_bridge_check.js`
- Ana konu: servis kanıtı durumunu ticari ve kalite yüzeylerine readonly köprü olarak doğrulamak.

### QLT-01 — kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası [CHECK]
- Komut: `node backend\scripts\qlt_01_quality_provider_readiness_check.js`
- Ana konu: OP-01 readonly omurga, OP-02 manuel not, OP-03 küçük kart ve OP-04 ticari/kalite readonly köprü üstüne kesin puan üretmeyen kalite hazırlık katmanı kurmak.

### QLT-02 — kontrollü kalite skoru taslak modeli [CHECK]
- Komut: `node backend\scripts\qlt_02_quality_draft_score_check.js`
- Ana konu: OP-01/02/03/04 kanıt hattı ve QLT-01 hazırlığı üstüne kesin puan, ranking ve settlement açmadan taslak kalite skoru üretmek.
- Not: QLT-01 hazırlık, QLT-02 taslak skor, QLT-03 kontrollü kalite inceleme kararı, QLT-04 kalite karar geçmişi / denetim izi olarak ilerler.

### QLT-03 — kontrollü kalite inceleme kararı [CHECK]
- Komut: `node backend\scripts\qlt_03_quality_review_decision_check.js`
- Ana konu: QLT-02 taslak skor üstünde yetkili karar ve tekrar kontrol akışı kurmak; kesin kalite puanı, ranking, settlement ve komisyonu açmamak.

### QLT-04 — kalite karar geçmişi / denetim izi [CHECK]
- Komut: `node backend\scripts\qlt_04_quality_review_history_check.js`
- Ana konu: QLT-03 kararlarının readonly geçmişini görünür yapmak; kesin kalite puanı, ranking, settlement ve komisyon açmamak.

### QLT-PAY-BRIDGE-01 — kalite + kanıt + hakediş readonly köprüsü [CHECK]
- Komut: `node backend\scripts\qlt_pay_bridge_01_check.js`
- Ana konu: kalite sinyali, operasyon kanıtı ve hakediş önizleme etkisini readonly köprüde birleştirmek; ödeme başlatma, tahsilat, fatura, settlement execute ve komisyon/platform fee açmamak.
- Not: yalnızca preview/eskalasyon öncesi hazırlık durumu taşır; SeferPuanı için sinyal zemini oluşturur.

### SEFER-SCORE-01 — readonly SeferPuanı önizlemesi [CHECK]
- Komut: `node backend\scripts\sefer_score_01_check.js`
- Ana konu: QLT-PAY-BRIDGE-01’den gelen kalite/kanıt/hakediş sinyallerini tedarikçi bazlı readonly SeferPuanı önizlemesine çevirmek; ödeme, ceza, teklif sıralaması, komisyon, platform fee ve settlement execute açmamak.
- Not: yalnızca preview/fallback kalır; SeferPuanı için açıklanabilir sinyal zeminini hazırlar.

### ROADMAP-LOCK-AI-MARKETPLACE-01 — AI marketplace / Sefer Abi roadmap lock [DOCS]
- Check script: `check:roadmaplockaimarketplace01`
- Komut: `node backend\scripts\roadmap_lock_ai_marketplace_01_check.js`
- Ana konu: Sefer Abi rol/task/voice/proactive omurgasını docs-only olarak sabitlemek; demand-to-agreement yolunu ve locked roadmap order'ı tek canonical kaynakta yaşatmak; runtime behavior değiştirmemek.
- Not: completed milestones listesi ve locked roadmap order, primer / project spec / copilot roadmap docs ile birlikte okunur.
- Referans dokümanlar:
  - `ROADMAP-LOCK-AI-MARKETPLACE-01` -> `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
  - `COPILOT-ROLE-TASK-MATRIX-01` -> `docs/COPILOT_ROLE_TASK_MATRIX_01.md`
  - `COPILOT-AI-ACTION-STRATEGY-01` -> `docs/COPILOT_AI_ACTION_STRATEGY_01.md`
  - `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` -> `docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md`
  - `VOICE-COPILOT-ROLE-ASSISTANT-01` -> `docs/VOICE_COPILOT_ROLE_ASSISTANT_01.md`
  - `PROACTIVE-COPILOT-NEXT-BEST-ACTION-01` -> `docs/PROACTIVE_COPILOT_NEXT_BEST_ACTION_01.md`
  - `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
  - `docs/COPILOT_ROLE_TASK_MATRIX_01.md`
  - `docs/COPILOT_AI_ACTION_STRATEGY_01.md`
  - `docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md`
  - `docs/VOICE_COPILOT_ROLE_ASSISTANT_01.md`
  - `docs/PROACTIVE_COPILOT_NEXT_BEST_ACTION_01.md`
- Locked roadmap order summary: `ROADMAP-LOCK-AI-MARKETPLACE-01 -> PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01 -> ONBOARDING-REVIEW-01 FINAL AUDIT -> INVITE-BASED-MEMBERSHIP-01 -> VERIFIED-SUPPLIER-01 -> UX-MARKETPLACE-PANELS-01 -> PRODUCT-FLOW-BUTTON-AUDIT-01 -> M44-TELEMATICS-T1-T5 -> TELEMATICS-PROVIDER-HUB-01 -> SAFE-DRIVE-01 -> OFFER-RANKING-QUALITY-01 -> ... -> COPILOT-ACTION-PREP-01 -> FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01 -> OPERATIONAL-COST-MODEL-01 -> ... -> PROACTIVE-COPILOT-01 -> PROACTIVE-COPILOT-NEXT-BEST-ACTION-01 -> ... -> RELEASE-CANDIDATE-01`

### PUBLIC-LANDING-01 — public landing / tanıtım vitrini [DOCS]
- Check script: `check:publiclanding01`
- Komut: `node backend\scripts\public_landing_01_check.js`
- Ana konu: SeferPakt public landing sayfasını kurumsal bir vitrin olarak açmak; lisanssız / pazaryeri / platform-first anlatımı görünür tutmak; Sefer Abi'yi opsiyonel operasyon copilot'u olarak ikincil konumda anlatmak; lisans ücreti yok, mevcut sözleşmeden pay yok ve kritik işlemler kullanıcı onayı olmadan yapılmaz sınırlarını public copy ile görünür tutmak; public CTA'ları kontrollü lead formuna bağlamak.
- Not: route `/#/landing` public vitrindir; CTA'lar otomatik üyelik, ödeme, fatura, tahsilat veya invite göndermeden lead kaydı açar.

### PUBLIC-LANDING-PLATFORM-FIRST-01 — public landing platform-first copy [CHECK]
- Check script: `check:publiclandingplatformfirst01`
- Komut: `node backend\scripts\public_landing_platform_first_01_check.js`
- Ana konu: public landing copy'sini SeferPakt kurumsal servis operasyon ve tedarik platformu olarak konumlamak; Sefer Abi'yi opsiyonel operasyon copilot'u olarak ikincil anlatmak; ana CTA hiyerarşisini platform-first tutmak; AI / autopilot / otomatik karar algısını zayıflatmak; lead capture ve onboarding review akışlarını bozmamak.
- Not: bu milestone sadece public metin / konumlandırma hizasıdır; lead capture ve review akışları ayrı milestone'larda çalışır.

### PUBLIC-LANDING-01 FINAL PROMISE CHECK — public marketing promise guard [CHECK]
- Check script: `check:publiclandingfinalpromise01`
- Komut: `node backend\scripts\public_landing_final_promise_01_check.js`
- Ana konu: public landing için underpromise / overdeliver güven stratejisini kilitlemek; SeferPakt'i platform-first, Sefer Abi'yi premium ve ikincil operasyon copilot'u olarak tutmak; public vaatleri testle kanıtlanmış kabiliyetlerle sınırlamak; human approval, guard ve audit log sınırlarını görünür kılmak; AI / autopilot / her şeyi yapay zekâ yapar algısını zayıflatmak.
- Not: bu check yalnız public marketing claim hizasıdır; lead capture, onboarding review ve runtime davranış açmaz.
- Doküman: `docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md`

### LEAD-CAPTURE-01 — kontrollü public lead toplama [CHECK]
- Check script: `check:leadcapture01`
- Komut: `node backend\scripts\lead_capture_01_check.js`
- Ana konu: public CTA'ları kontrollü lead formuna bağlamak; demo / canlı destek / servis ihtiyacı / tedarikçi başvurusu akışlarını JSON lead kaydı olarak toplamak; KVKK, validation, honeypot ve basit rate limit ile güvenli sınır koymak; otomatik üyelik, ödeme, fatura, tahsilat ve invite göndermeyi açmamak.
- Not: runtime JSON store standardı kullanılır; örnek lead verisi commit'e alınmaz ve Super Admin inceleme kuyruğu sonraki ONBOARDING-REVIEW-01'e bırakılır.

### ONBOARDING-REVIEW-01 — public lead inceleme kuyruğu [CHECK]
- Check script: `check:onboardingreview01`
- Komut: `node backend\scripts\onboarding_review_01_check.js`
- Ana konu: public lead kayıtlarını Super Admin insan inceleme kuyruğuna taşımak; RECEIVED / IN_REVIEW / NEEDS_INFO / APPROVED_FOR_INVITE / REJECTED durumlarıyla ilerlemek; inceleme notu ve operasyon notu eklemek; invite, kullanıcı, ödeme, fatura, sözleşme, settlement ve supplier verification execute akışlarını açmamak.
- Not: `APPROVED_FOR_INVITE` yalnızca sonraki invite adımı için hazırlıktır; bu milestone içinde kullanıcı oluşturma veya davet gönderimi yapılmaz.

### ONBOARDING-REVIEW-01 FINAL AUDIT — human approval ve guard kilidi [CHECK]
- Check script: `check:onboardingreviewfinalaudit01`
- Komut: `node backend\scripts\onboarding_review_final_audit_01_check.js`
- Ana konu: public landing final promise check sonrasında public lead inceleme kuyruğunun güven sınırını son kez sabitlemek; `APPROVED_FOR_INVITE`'ın yalnızca invite hazırlığı olduğunu doğrulamak; human approval, guard ve audit log çizgisini korumak; runtime feature, UI feature, backend route/service/schema düzeyi ve marketing sayfası değişikliği açmamak.
- Not: bu final audit yalnızca docs/check kilididir; invite, kullanıcı, ödeme, fatura, sözleşme, settlement ve supplier verification execute akışlarını genişletmez.
- Doküman: `docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md`

### INVITE-BASED-MEMBERSHIP-01 — insan onaylı davetli üyelik [CHECK]
- Check script: `check:invitebasedmembership01`
- Komut: `node backend\scripts\invite_based_membership_01_check.js`
- Ana konu: `ONBOARDING-REVIEW-01 FINAL AUDIT` sonrasında public lead'i self-service signup açmadan invite draft / pending invite ile insan onaylı üyelik hazırlığına taşımak; public lead'lerin otomatik kullanıcı hesabına dönüşmemesini; automatic company / room membership, payment, contract execute, supplier verification auto ve email / SMS / push akışlarını açmamayı doğrulamak.
- Not: bu check runtime feature açmaz; backend route/service/schema ve marketing sayfası değişikliği yoktur.
- Doküman: `docs/INVITE_BASED_MEMBERSHIP_01.md`

### VERIFIED-SUPPLIER-01 — insan onaylı tedarikçi doğrulama hazırlığı [CHECK]
- Check script: `check:verifiedsupplier01`
- Komut: `node backend\scripts\verified_supplier_01_check.js`
- Ana konu: `INVITE-BASED-MEMBERSHIP-01` sonrasında public lead / supplier application verisini otomatik verified supplier'a çevirmeden insan onaylı ve kanıt-temelli doğrulama hazırlığına taşımak; ticari unvan, yetkili kişi, araç kapasitesi, araç tipi uygunluğu, sürücü uygunluğu, hizmet bölgesi, KVKK / sözleşme / operasyon taahhüdü, geçmiş kalite / saha kanıtı ve eksik bilgi notu üzerinden ilerlemek; payment, contract execute, offer ranking, marketplace auto-selection, email / SMS / push ve schema değişikliği genişlemesi açmamayı doğrulamak.
- Not: bu check runtime feature açmaz; backend route/service/schema, UI feature ve marketing sayfası değişikliği yoktur.
- Doküman: `docs/VERIFIED_SUPPLIER_01.md`

### UX-MARKETPLACE-PANELS-01 — marketplace readiness / supplier review lock [CHECK]
- Check script: `check:uxmarketplacepanels01`
- Komut: `node backend\scripts\ux_marketplace_panels_01_check.js`
- Ana konu: `VERIFIED-SUPPLIER-01` sonrasında marketplace readiness center'ı docs/check kilidi olarak sabitlemek; status-first, human approval, invite/onboarding/verified supplier bağlamını görünür tutmak; super admin / company / room shared readiness card ve empty state ile readonly preview sunmak; marketplace auto-selection, offer ranking, payment/billing, contract/agreement execute, email/SMS/push, AI runtime action, backend route/service/schema ve Prisma genişlemesi açmamak.
- Not: bu milestone docs/check kilididir; runtime flow açmaz, runtime-data/browser-smoke commit dışı kalır.
- Doküman: `docs/UX_MARKETPLACE_PANELS_01.md`

### PRODUCT-FLOW-BUTTON-AUDIT-01 — kritik CTA ve button audit [CHECK]
- Check script: `check:productflowbuttonaudit01`
- Komut: `node backend\scripts\product_flow_button_audit_01_check.js`
- Smoke: `node backend\scripts\product_flow_button_audit_01.mjs`
- Ana konu: public landing CTA'ları, onboarding review action strip, company / room vardiya ve sözleşme preview-butons, parent / personel canlı takip navigasyonları, superadmin commercial-core hakediş hazırlığı ve trust-quality readonly kartları için görünürlük, tıklanabilirlik, disabled-state açıklığı ve preview/detail açılışını audit etmek; API boundary'yi write akışına çevirmemek.
- Not: bu milestone gerçek write flow açmaz; public lead submit validation ile sınırda kalır, review ve live takip butonları sadece görünürlük / tıklanabilirlik açısından kontrol edilir, settlement execute ve ödeme başlatma smoke içinde çalıştırılmaz.

### AGREEMENT-SOURCE-SHIFT-LINEAGE-01 — agreement source lineage preview [CHECK]
- Check script: `check:agreementsourceshiftlineage01`
- Komut: `node backend\scripts\agreement_source_shift_lineage_01_check.js`
- Ana konu: agreement’ın doğrudan ana ticari kaynak olmadığını göstermek; sourceShiftId / marketShift / commercialSource / teklif seçimi zincirini readonly olarak kanıtlamak; mevcut / manuel / pilot / legacy / lineage belirsiz kayıtlar için güvenli fallback ile başarı payını doğurmamak; ödeme, tahsilat, fatura, platform fee ledger ve settlement execute açmamak.
- Not: source lineage kanıtı yoksa `EXISTING_IMPORTED` veya `INSUFFICIENT_LINEAGE` fallback’i ile pay doğmaz; Organization plan tek başına billable kanıt değildir.

### MARKETPLACE-FREE-TO-OPERATE-01 — readonly lisanssız ticari model önizlemesi [CHECK]
- Check script: `check:marketplacefreetooperate01`
- Komut: `node backend\scripts\marketplace_free_to_operate_01_check.js`
- Ana konu: mevcut / manuel / pilot / imported / lineage belirsiz sözleşmelerde lisans ücreti 0 TL ve başarı payı 0 TL güvenli fallback; SeferPakt kaynaklı yeni / yenileme sözleşmelerde kaliteye göre %1-%3 readonly başarı payı önizlemesi; ödeme, tahsilat, fatura, platform fee ledger ve settlement execute açmamak.
- Not: kaynak vardiya / market shift sinyali görünmüyorsa `EXISTING_IMPORTED` veya `INSUFFICIENT_LINEAGE` fallback'i ile pay doğmaz; SeferPuanı eksikse kesin oran verilmez.

### DOCS-STATE-01 — son kapanan ürün hatları görünürlüğü [CHECK]
- Komut: `node backend\scripts\docs_state_01_recent_product_closure_check.js`
- Ana konu: son kapanan ürün hatlarını SSOT / registry / backlog / repo-contract state içinde görünür ve güncel tutmak; ürün davranışı değiştirmez.
- Script alias görünürlüğü:
  - `check:web01a`
  - `check:web01b`
  - `check:qlt04b`
  - `check:qltpaybridge01`
  - `check:seferscore01`
  - `check:pay01e`
  - `check:paysafe01`
  - `check:cop01e`
  - `check:cop02a`
  - `check:cop02b`
  - `check:uxkvkk01`
  - `check:cop03c`
  - `check:cop03cfix01`
  - `check:cop03cfix02`
  - `check:cop04afix03`
  - `check:cop04afix04`
  - `check:cop03cfix03`
  - `check:cop04a`
  - `check:cop04afix02`
  - `check:cop04afix01`
- `check:cop04b`
- `check:cop04bfix03`
- `check:cop04bfix04`
- `check:cop04bfix05`
  - `check:cop04bfix06`
  - `check:cop04bfix07`
  - `check:cop04bfix08`
  - `check:uxcopilotsmartchips01`
  - `check:docsstate01`
  - `check:finaluxsmoke01`

### E2E-SMOKE-01 — demo acceptance pack [CHECK]
- Komut: `node backend\scripts\e2e_smoke_01_demo_acceptance_check.js`
- Ana konu: DEMO Firma / Oda / Araç / Sürücü / Personel / sözleşme / vardiya hazırlığı için manuel acceptance readiness checklist'i görünür kılmak; runtime davranışı değiştirmez.
- Not: bu check docs/static kabul paketi olarak yaşar; runtime API smoke çalıştırmaz.

### FIELD-LAUNCH-PACK-01 — saha/pilot öncesi launch hazırlık paketi [CHECK]
- Komut: `node backend\scripts\field_launch_pack_01_readiness_check.js`
- Ana konu: saha/pilot öncesi health, demo veri, release izi, rollback ve kanıt şablonunu tek resmi dokümanda toplamak; runtime davranışı değiştirmez.
- Not: bu check docs/static launch hazırlık paketi olarak yaşar; runtime/API smoke çalıştırmaz.

### VERIFY-CHAIN-01 — product extensions canonical check chain [CHECK]
- Komut: `node backend\scripts\verify_chain_01_product_extensions_check.js`
- Ana konu: OP/QLT/PAY/COP/WEB son ürün kapanış check’lerini canonical doğrulama zincirinde birleştirmek; ürün davranışı değiştirmez.
- Script alias görünürlüğü:
  - `check:product-extensions`
  - `check:verifychain01`
  - `check:e2esmoke01`
  - `check:fieldlaunch01`
  - `check:qltpaybridge01`
  - `check:seferscore01`
  - `check:uiactionwiringaudit01`
  - `check:cop03cfix03`
  - `check:cop04a`
  - `check:cop04afix02`
  - `check:cop04afix03`
  - `check:cop04afix04`
  - `check:cop04afix01`
- `check:cop04b`
- `check:cop04bfix03`
- `check:cop04bfix04`
- `check:cop04bfix05`
- `check:cop04bfix06`
  - `check:cop04bfix07`
  - `check:cop04bfix08`
  - `check:uxcopilotsmartchips01`
  - `check:shiftdispatchapprovalfix01`
  - Not: Personel / Canlı Harita free-chat submit request selected service context'i de taşır; header quick answer ve free chat aynı live context'i kullanır, visible `FORBIDDEN` dönmez.
  - Not: free-chat submit request ile Room / Canlı Takip selected signal seti de taşınır; header quick answer ve free chat aynı live context'i kullanır.

### SCRIPT-HARNESS-CONSOLIDATION-01 — repo script harness inventory [CHECK]
- Komut: `node backend\scripts\script_harness_consolidation_01_check.js`
- Root alias: `npm run check:scriptharnessconsolidation01`
- Ana konu: root/backend/web/mobile/tools/docs script/check/pack/export/wrapper envanterini tek registry’de sınıflandırmak; active, manual, release-only, legacy ve skip ayrımını görünür kılmak.
- Bu check ürün davranışı değiştirmez; güvenli cleanup adaylarını raporlar ama körlemesine silme yapmaz.

### DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01 — docs/brand/overlay/archive cleanup [CHECK]
- Komut: `node backend\scripts\docs_ssot_brand_artifact_cleanup_01_check.js`
- Root alias: `npm run check:docsbrandcleanup01`
- Ana konu: görünür SeferPakt marka hizası, tarihsel Vardis dosya adları, overlay/archive/backpack-artifact kalıntıları ve docs SSOT referanslarını tek audit raporunda toplamak.
- Bu check ürün davranışı değiştirmez; user-facing label ile historical/internal identifier ayrımını görünür tutar.

### OP-04 — ticari/kalite readonly köprü [CHECK]
- Komut: `node backend\scripts\op_04_proof_commercial_quality_readonly_bridge_check.js`
- Ana konu: servis kanıtı durumunu ticari ve kalite yüzeylerine readonly köprü olarak doğrulamak.

### M0->latest static verification [RUNNER]
- Runbook: `docs/RUNBOOK_M0_LATEST_STATIC_VERIFICATION.md`
- Komut: `node backend/scripts/run_m0_latest.js --static-only --to latest --continue`
- Root alias: `npm run verify:milestones`
- Ana konu: legacy M0-Mxx check hattini repo kokunden, `.js/.cjs/.mjs` kapsamiyla ve latest milestone'a kadar tek zincirde calistirmak.

## 11) Hızlı okuma özeti
- `M0→M41`: çekirdek temel hat
- `M42→M58`: mobil / KVKK / hazırlık ön bant
- `M59→M79`: operasyon / SSOT / hot-path / acceptance anchor
- `M80→M89`: güncel canonical upper route
- `M90`: 10/10 kapanış ve canonical convergence
- `M91`: shift/agreement route preview local acceptance bandi
- `M92`: repo verification spine ve tek cati kontrol zinciri
- `M93`: queue durability proof ve autoReachedQueue görünürlük kanıtı
- `M94-E`: queue chaos/alarm proof ve güvenli runtime probe
- `M95-E0`: android apk/aab build readiness check'i
- `M95-E25`: mobil saha kabul checklist'i
- `M95-E26`: Android emulator smoke planı check'i
- `M95-E27`: gerçek Android cihaz saha proof hazırlığı check'i
- `M95-EXPORT-01`: export zip / runtime check uyumu check'i
- `M96-A`: driver availability local state check'i
- `M96-B`: mobile notifications foundation check'i
- `M96-C`: boarding change local model check'i
- `M96-C2`: boarding change operations readiness check'i
- `M96-D`: driver change awareness check'i
- `M97`: check-in panel integrations ve nav restore check'i
- `M98-A`: personel activation model check'i
- `M98-B`: parent activation and link access check'i
- `M98-C`: link lifetime and tracking authority check'i
- `M98-D`: kvkk visibility matrix check'i
- `M98-E5`: kod + PIN gerçek kullanıcı kabul checklist'i
- `M99-KVKK-01`: mobil/web KVKK sade metin ve izin dili check'i
- `M99-UX-01`: görünür Türkçe metin hijyeni check'i
- `QLT-01`: kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası check'i
- `QLT-02`: kontrollü kalite skoru taslak modeli check'i
- `QLT-03`: kontrollü kalite inceleme kararı check'i
- `QLT-04`: kalite karar geçmişi / denetim izi check'i
- `DOCS-STATE-01`: son kapanan ürün hatları görünürlüğü check'i
- `VERIFY-CHAIN-01`: son ürün check zinciri / canonical verification extension check'i
- `M99-A`: mobile regression pack check'i
- `M99-B`: real scenario tests check'i
- `M99-C`: field launch readiness check'i
- `OP-01`: operation proof / service proof readonly kanıt omurgası check'i
- `OP-02`: manuel operatör kanıt notu katmanı check'i
- `OP-03`: web servis kanıtı / manuel not küçük kartı check'i
- `OP-04`: servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü check'i
- `OP-04`: servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü check'i
- `UX-PANEL-STRUCTURE-02B`: kalan P0 uzun paneller için summary-first + segmented/tab + collapsible follow-up check'i

### UX-PANEL-LAYOUT-WIDTH-02C-FIX-02 [CHECK]
- `check:uxpanellayoutwidth02cfix02` `Room / Ticari Akışım` panel kabuğunu centered max-width yerine gerçek full-width dashboard kabuğuna taşır.
- Sol ana alan `minmax(0, 1fr)` olarak açılır; sağ kolon `clamp(340px, 24vw, 460px)` ile dengede kalır.
- Duplicate KPI/summary bloğu kaldırılır; üstteki ana KPI bandı tek kaynak kalır.
- Bu dalga, full-width kabuğu gerçek iş sekmelerine hazırlayan ara hizalama adımıdır; son durumda `İlk adım` / `Özet` sekmesi kaldırılır ve `Sözleşme & Vardiya` default yüzey olur.
- Bu dalga UX-PANEL-LAYOUT-WIDTH-02C-FIX-01, UX-PANEL-STRUCTURE-02B, UX-PANEL-REALITY-AUDIT-02C ve UX-COLLAPSIBLE-PANELS-01 zincirini bozmaz; ürün davranışı değiştirmez.

### UX-PANEL-LAYOUT-WIDTH-02C-FIX-03 [CHECK]
- `check:uxpanellayoutwidth02cfix03` `Room / Ticari Akışım` içindeki `İlk adım` / `Özet` sekmesini kaldırır.
- Default görünüm `Sözleşme & Vardiya` olur; üst KPI bandı tek ana özet olarak kalır.
- Sağ kolon seçili kayıt, hızlı erişim ve sekme rehberi alanlarını tek kaynak olarak taşır; ana alanda tekrar eden seçili kayıt / hızlı erişim blokları görünmez.
- Bu dalga UX-PANEL-LAYOUT-WIDTH-02C-FIX-02, UX-PANEL-STRUCTURE-02B ve UX-PANEL-REALITY-AUDIT-02C zincirini bozmaz; ürün davranışı değiştirmez.

### UX-PANEL-REALITY-CLEANUP-02D [CHECK]
- `check:uxpanelrealitycleanup02d` Room / Sözleşmeler panelini gerçek tab mimarisine taşır; Operasyon Köprüsü, Rota Talepleri, Uygulanan Rota, Uzatma Talepleri, Bekleyen ve Diğer Sözleşmeler ayrı görünür.
- `check:uxroomagreementstabs01` aynı statik reality gate için kısa alias olarak yaşar; ekip isterse daha kısa komutla aynı kontrolü çalıştırabilir.
- Üst bilgi bandı yalnızca yönlendirme / uyarı amaçlıdır; detay tablosunu veya karar akışını tekrar etmez.
- Bu check summary-first + segmented/tab + collapsible standardını bozmaz; Room / Ticari Akışım ve Room / Canlı Takip tarafındaki önceki UX sınırlarını korur.

### UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01 [CHECK]
- `check:uxroomvehiclestelematicsfix` `Room / Araçlar` içinde `telematicsCounts` TDZ crash fix doğrular; telematics özetinin güvenli fallback ile ve doğru sırada üretildiğini kontrol eder.
- `Room / Araçlar` sekme/segment yapısı korunur; bu düzeltme yalnızca crash fix kapsamındadır ve ürün davranışını değiştirmez.

### UX-ROOM-PANEL-CLARITY-01 [CHECK]
- `check:uxroompanelclarity01` Room panellerinde summary-first görünürlük, ana aksiyon bandı, detay / kanıt alanı ve güvenli ID label standardını doğrular.
- `Room / Vardiyalar`, `Room / Sözleşmeler`, `Room / Ticari Akış`, `Room / Operasyon Sağlığı`, `Room / Araçlar` ve `Room / Sürücüler` yüzeylerinde `Detayı aç`, `Önizlemeyi Uygula`, `Sistem kanıtı` ve `Telematik` gibi güvenli görünen ifadeler korunur.
- Doküman: `docs/UX_ROOM_PANEL_CLARITY_01.md`
- Bu düzeltme route/write-path veya business flow açmaz; yalnızca okunurluk ve premium polish sağlar.

### ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01 [CHECK]
- `check:roomvehicledriveruppercase01` Room araç/sürücü create ve edit akışlarında plaka, ad soyad, cihaz bilgisi ve ilgili güvenli alanların uppercase normalize edildiğini doğrular.
- Komut: `node backend\scripts\room_vehicle_driver_uppercase_normalization_01_check.js`
- Plaka girişi live input ve payload tarafında uppercase tutulur; backend create/update payload'ları mevcut endpoint contract'ını genişletmeden güvenli normalize helper ile işler.
- Bu check, `UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01`, `UX-ROOM-OPS-PANEL-TABS-01`, `UX-ROOM-SHIFTS-TABS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; business flow veya şema değişikliği açmaz.

### UX-ROOM-OPS-PANEL-TABS-01 [CHECK]
- `check:uxroomopspaneltabs01` `Oda Operasyon Paneli` içindeki uzun alt blokları gerçek tab yapısına taşır; `Şartlı Küme`, `Oda Operasyon Özeti`, `Sorunlu Sürücüler` ve `Açık Sorunlar` aynı anda alt alta görünmez.
- Üst mini özet, filtre ve sayaç bandı açık kalır; seçilen sekmenin içeriği tek başına render edilir.
- Bu düzeltme `UX-COLLAPSIBLE-PANELS-01`, `UX-PANEL-STRUCTURE-02`, `UX-PANEL-STRUCTURE-02B` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.

### UX-ROOM-SHIFTS-TABS-01 [CHECK]
- `check:uxroomshiftstabs01` `Room / Vardiyalar` ekranını üç gerçek taba böler: `Bekleyen Talepler`, `Sözleşmeden Üretilen` ve `Diğer Vardiyalar`.
- Üstteki KPI bandı açık kalır; `Bekleyen Talepler` ile `Tüm Vardiyalar` gibi tek uzun akış yerine seçili tabın içeriği tek başına render edilir.
- Bu düzeltme `UX-PANEL-STRUCTURE-02`, `UX-PANEL-STRUCTURE-02B`, `UX-ROOM-OPS-PANEL-TABS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.

### UX-ROOM-SHIFTS-DENSITY-DEDUP-01 [CHECK]
- `check:uxroomshiftsdensitydedup01` `Room / Vardiyalar` ekranındaki üst başlık, summary bandı ve tab row tekrarını sadeleştirir; aktif içerik yine tab'a göre değişir.
- Üst özet tek band olarak kalır; dispatch preview üstte dominant bir kart olarak görünmez ve yalnız alt yüzeyde, seçili akış içinde okunur.
- `Önizlemeyi Uygula: Böl & Onayla` ve bölme önizleme akışı backend dispatch flow'u değiştirmeden alt yüzeyde korunur.
- `no route apply addition`, `no payment/settlement`, `no schema changes` ve `UX-FIX 0 / BLOCKER 0 / NOT-FOUND 0` sınırları korunur.
- Komut: `node backend\scripts\ux_room_shifts_density_dedup_01_check.js`
- Doküman: `docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md`

### UX-PREMIUM-CRITICAL-FIX-ROOM-01 [CHECK]
- `check:uxpremiumcriticalfixroom01` `Room / Vardiyalar`, `Room / Sözleşmeler` ve `Room / Sürücüler` yüzeylerinde kritik smoke satırlarını küçük, kontrol edilebilir bir room dalgasında kapatır.
- `Dispatch apply` CTA görünür kalır; `Detayı aç` CTA okunur ve tıklanabilir olur; sürücü listesinde `Sürücü kaydı`, `Düşük canlılık` ve `Çevrim dışı` gibi güvenli metinler korunur.
- Mobilde `NavDock` ve floating assistant ile çakışmayı azaltmak için `roomCriticalFixScope` / `roomActionCTA` safe-area standardı kullanılır.
- Doküman: `docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md`
- Bu milestone yeni business flow, backend route/write-path, browser-smoke artifact veya runner/coverage policy açmaz.

### UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 [CHECK]
- `check:uxpremiumcriticalfixagreementsdetail01` `Company / Sözleşmeler`, `Organization / Sözleşmeler` ve `School / Sözleşmeler` yüzeylerinde detail CTA ve okunabilirlik satırlarını küçük, kontrollü bir agreements detail dalgasında kapatır.
- `Detayı aç`, `Taslağı incele` ve `Önizlemeyi aç` CTA'ları görünür kalır; operasyon bağlantısı ve okunabilir detay alanı readonly preview sınırını açıkça gösterir.
- Mobilde `NavDock` ve floating assistant ile çakışmayı azaltmak için `companyActionClarityScope` / `AgreementOpsBridgeCard` safe-area ve z-index standardı kullanılır.
- Doküman: `docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md`
- Bu milestone yeni business flow, backend route/write-path, browser-smoke artifact veya runner/coverage policy açmaz.
### UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01 [CHECK]
- `check:uxpremiumcriticaluxfixcleanup01` evidence-based smoke classification sonrası kalan kritik `UX-FIX` satırlarını sıfırlayan cleanup dalgasıdır.
- `node backend\scripts\ux_premium_critical_uxfix_cleanup_01_check.js` bu cleanup dalgasının resmi doğrulama girişidir.
- `Super Admin Audit`, `Room / Vardiyalar`, `Room / Sözleşmeler`, `Room / Araçlar`, `Room / Sürücüler`, `Company / Sözleşmeler`, `School / Sözleşmeler`, `Organization / Sözleşmeler`, `Driver / Rota` ve `Driver / Check-in` yüzeylerinde güvenli wording korunur.
- `Sistem kanıtı`, `Okuma kodu`, `GPS durumu`, `Yeni cihaz erişim kodu`, `Sürücü kaydı`, `Düşük canlılık`, `Çevrim dışı` ve `Önizlemeyi Uygula: Böl & Onayla` metinleri kullanıcı-facing güvenli sınır olarak tutulur.
- Doküman: `docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md`
- Bu milestone yeni business flow, backend route/write-path, browser-smoke artifact veya runner/coverage policy açmaz; PASS-minus evidence standardı korunur.

### UX-COMPANY-SHIFTS-TABS-01 [CHECK]
- `check:uxcompanyshiftstabs01` `Company / Vardiyalar` ekranını track-only yapıda dört gerçek taba böler: `Market`, `Bekleyen`, `Sözleşmeden Üretilen` ve `Diğer Vardiyalar`.
- `Oluşturma`, `Liste` ve `Planlama Merkezi` tekrarları bu ekrandan kaldırılır; üstte yalnızca takip özet bandı ve kompakt filtre kalır.
- Bu düzenleme `UX-ROOM-SHIFTS-TABS-01`, `UX-COMPANY-OPS-PANEL-TABS-01`, `UX-PANEL-STRUCTURE-02B`, `UX-PANEL-REALITY-CLEANUP-02D` ve `UX-LIVE-MAP-TABS-SIMPLIFY-01` zincirini bozmaz; ürün davranışını değiştirmez.

### UX-COMPANY-MOBILE-ACTION-CLARITY-01 [CHECK]
- `check:uxcompanymobileactionclarity01` `Company / Vardiyalar`, `Company / Sözleşmeler`, `Company / Ticari Akış` ve sözleşme taslak / önizleme yüzeylerinde mobile-safe ana aksiyonların görünür ve tıklanabilir kalmasını doğrular.
- `Vardiyayı sözleşmeye dönüştür` akışı görünür primary CTA olarak korunur; `Taslağı incele` ve `Sözleşmeden üretilen vardiyaya git` gibi etiketler readonly preview ile gerçek akış ayrımını netleştirir.
- `NavDock`, floating assistant/drawer ve alt sabit alanlar için safe-area + z-index hizası korunur; bu düzenleme backend route/write-path, schema ve runner policy'yi değiştirmez.

### UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01 [CHECK]
- `check:uxcompanypersonelaccessmobileparity01` `Company / Personel Erişimi` ve `Organization / Personel Erişimi` yüzeylerinde mobilde tek kolon, kart/list ve güvenli kullanıcı kodu görüntüsünü doğrular.
- `PersonelAccessPanel.jsx` erişim listesi kart/list standardını kullanır; ham PIN listede gösterilmez ve desktop iki kolon korunur.
- `Sefer Abi` launcher son kartı kapatmaz; authenticated shell mobile'da kompakt kalır.
- Doküman: `docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md`
- Komut: `node backend\scripts\ux_company_personel_access_mobile_parity_01_check.js`

### UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01 [CHECK]
- `check:uxcompanyagreementsmobileparity01` `Company / Sözleşmeler` yüzeyinde mobile parity sağlar; `desktopShiftTable` masaüstünde korunur, `mobileShiftCards` küçük ekranda aktif olur.
- `Room / Sözleşmeler` yalnızca referans yüzeydir; bu milestone room ekranını değiştirmez ve oradaki tablo / card dili kıyas referansı olarak kalır.
- `Sefer Abi launcher` safe-area ve bottom clearance korunur; sözleşme kart aksiyonları alt sabit alanın altında sıkışmaz.
- Bu düzenleme backend route/write-path, schema ve browser-smoke sınırlarını açmaz.
- Doküman: `docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md`
- Komut: `node backend\scripts\ux_company_agreements_mobile_parity_01_check.js`

### UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01 [CHECK]
- `check:uxmobileoverflowminimapreadability01` `Room / Vardiyalar`, `School / Operasyon Paneli` ve `Organization / Planlama` yüzeylerinde mobil tablo/card taşma parity'sini korurken mini-map okunabilirliğini yükseltir.
- `tableWrap`, `organizationPlansLayout` ve `organizationPlansSidebar` ile school ve organization yüzeyleri küçük ekranda tek kolona iner; boarding route impact ve organization plan mini-map legend/chip dili okunur kalır.
- Bu düzenleme backend route/write-path, schema ve runner policy'yi değiştirmez; `Sefer Abi` launcher / drawer standardı korunur.
- Doküman: `docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md`
- Komut: `node backend\scripts\ux_mobile_overflow_minimap_readability_01_check.js`

### UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02 [CHECK]
- `check:uxmobileoverflowminimappolish02` `Room / Vardiyalar`, `Company / Vardiyalar` ve `Organization / Planlama` yüzeylerinde desktop taşma artıklarını kapatır, mini-map modal açılışını daha net hale getirir.
- `ReadableMiniRouteMap` içinde `Haritayı büyüt` / `Haritayı kapat` akışı korunur; `MapContainer`, `TileLayer`, `fitBounds` ve `tileerror` fallback davranışı görünür kalır.
- `tableWrap`, `organizationPlansLayout` ve `organizationPlansSidebar` küçük ekranda taşmayı kontrollü tutar; sabit genişlikli input ve tablo ayarları responsive hale gelir.
- Bu düzenleme backend route/write-path, schema ve runner policy'yi değiştirmez; `Sefer Abi` görünür dili sade ve operasyon odaklı kalır.
- Doküman: `docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md`
- Komut: `node backend\scripts\ux_mobile_overflow_minimap_polish_02_check.js`

### UX-COMPANY-OPS-PANEL-TABS-01 [CHECK]
- `check:uxcompanyopspaneltabs01` `Company / Operasyon Paneli`'ni summary-first + functional tab standardına taşır; `Özet`, `Servis Kümesi`, `Personel`, `Servis Zamanları`, `İstisnalar / Değişiklikler` ve `Bildirimler` aynı anda alt alta görünmez.
- `check:uxcompanypanelssmoke01` aynı panel için kısa smoke alias'ıdır; üst KPI bandı, kritik bildirim bandı ve bildirim CTA'sı açık kalırken detaylar yalnızca ilgili sekmede render edilir.
- Bu düzenleme `UX-COLLAPSIBLE-PANELS-01`, `UX-PANEL-STRUCTURE-02`, `UX-PANEL-STRUCTURE-02B`, `UX-PANEL-REALITY-CLEANUP-02D` ve `UX-ROOM-SHIFTS-TABS-01` zincirini bozmaz; ürün davranışını değiştirmez.

### UX-COMPANY-QUALITY-PANEL-TABS-01 [CHECK]
- `check:uxcompanyqualitytabs01` `Company / Hizmet Değerlendirme` ekranını summary-first + functional tab standardına taşır; `Özet`, `Kanıt / Hazırlık`, `Taslak Skor`, `İnceleme Kararı`, `Geçmiş` ve `Değerlendirme Alanları` aynı anda alt alta görünmez.
- Üst KPI / durum bandı ve değerlendirme bekleyen bilgi bandı açık kalır; CTA ilgili taba geçirir ve detaylar yalnızca seçili sekmede render edilir.
- Bu düzenleme `UX-COMPANY-OPS-PANEL-TABS-01`, `UX-COMPANY-SHIFTS-TABS-01`, `UX-ROOM-SHIFTS-TABS-01`, `UX-PANEL-REALITY-CLEANUP-02D` ve `UX-PANEL-STRUCTURE-02B` zincirini bozmaz; ürün davranışını değiştirmez.

### UX-SEFER-ABI-LAUNCHER-01 [CHECK]
- `check:uxseferabilauncher01` sağ alttaki `Sefer Abi’ye Sor` launcher’ını branded compact kart yüzeyine taşır; kapalı halde yalnız launcher görünür ve chat içeriği açılmadan rahatsız etmez.
- Drawer açıldığında üç kademe boyut korunur; varsayılan açılış küçük/orta çizgide kalır ve büyük boyut başlangıçta zorlanmaz.
- Bu düzenleme `UX-COPILOT-PERSONA-01`, `UX-COPILOT-TERMINAL-01`, `UX-COPILOT-SMART-CHIPS-01` ve `UX-NAV-01` zincirini bozmaz; ürün davranışını değiştirmez.

### SEFER-ABI-TERMINAL-HUMANIZE-01 [CHECK]
- `check:seferabiterminalhumanize01` Sefer Abi Terminali, sağ alt drawer ve analiz yüzeylerindeki teknik/İngilizce/internal/debug metinleri sade Türkçeye taşır.
- `Sefer Abi Terminali` ana görünümünde rol bazlı, operasyon odaklı, `Durum / Ne anlama geliyor? / Etki / Sıradaki doğru işlem` yapısı korunur; teknik ayrıntılar ikincil `Teknik ayrıntılar` alanında kalır.
- Bu düzenleme `UX-SEFER-ABI-LAUNCHER-01`, `COP-LIVE-ACCEPT-01`, `DYNAMIC-SAVINGS-01` ve `ROUTE-CHANGE-FINAL-01` zincirini bozmaz; runtime karar ve business flow değiştirmez.

### SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01 [CHECK]
- `check:seferabiturkishterminology01` Sefer Abi'nin kullanıcıya görünen cevaplarında İngilizce, teknik ve sistem içi terminolojiyi sade Türkçe kullanıcı diliyle değiştirir; `ETA`, `GPS`, `offline`, `stale`, `fallback`, `selected record`, `root cause`, `diagnostic`, `risk scoring`, `task-state`, `intent`, `chip`, `workflow`, `screen purpose`, `next best action`, `safe alternative`, `active segment`, `completed segment`, `live decision`, `route binding`, `status`, `warning`, `error` ve `blocker` gibi görünür sızıntıları engeller.
- `node backend\scripts\sefer_abi_turkish_user_facing_terminology_01_check.js` bu kontrolü çalıştırır ve 80+ case ile görünür terminoloji hijyenini doğrular.
- `docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md` bu audit’in kanonik açıklama dosyasıdır.
- Bu düzenleme `SEFER-ABI-TERMINAL-HUMANIZE-01`, `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`, `COPILOT-ROOT-CAUSE-ENGINE-01`, `COPILOT-RISK-SCORING-ENGINE-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` zincirini bozmaz; runtime karar ve business flow değiştirmez.

### SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01 [CHECK]
- `check:seferabiturkishuserfacinglanguage01` Sefer Abi'nin tüm rol ve yüzeylerinde kullanıcıya görünen metinleri sade Türkçe tutar; `Free-to-operate`, `root cause`, `diagnostic`, `risk scoring`, `workflow`, `screen purpose`, `next best action`, `current step`, `fallback`, `offline`, `stale`, `ETA`, `warning`, `error` ve `blocker` gibi görünür sızıntıları engeller.
- `node backend\scripts\sefer_abi_turkish_user_facing_language_01_check.js` bu kontrolü çalıştırır ve tüm yüzeylerde Türkçe görünür metinleri doğrular.
- `docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md` bu audit’in kanonik açıklama dosyasıdır.
- `MARKETPLACE_FREE_TO_OPERATE_PREVIEW` görünür label'ı `Başarı payı önizlemesi` olarak kilitlenir; help composer, reasoning assistant, quick action ve chip kopyası Türkçe kalır.
- Bu düzenleme `SEFER-ABI-TERMINAL-HUMANIZE-01`, `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`, `COPILOT-ROOT-CAUSE-ENGINE-01`, `COPILOT-RISK-SCORING-ENGINE-01` ve `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` zincirini bozmaz; runtime karar ve business flow değiştirmez.

### UX-COMPANY-PANELS-FINAL-POLISH-01 [CHECK]
- `check:uxcompanypanelsfinalpolish01` Company / Vardiyalar, Sözleşmeler ve Ticari Akış yüzeylerini son gerçeklik düzeltmesiyle hizalar.
- `Company / Vardiyalar` içinde Market, Bekleyen, Sözleşmeden Üretilen ve Diğer Vardiyalar accordion başlıkları varsayılan açık gelir; takip yüzeyi kapalı blok bırakmadan başlar.
- `Company / Ticari Akış` final satır aksiyonları agreement-bağlı kayıtları doğru takip yüzeyine yönlendirir; misleading `Listeyi aç` dili yerine `Sözleşmeden Üretilen'e git` / `Diğer Vardiyalar'a git` kullanılır.
- Bu final polish, `UX-COMPANY-SHIFTS-TABS-01`, `UX-COMPANY-OPS-PANEL-TABS-01`, `UX-COMPANY-QUALITY-PANEL-TABS-01`, `UX-ROOM-SHIFTS-TABS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.

### UX-SCHOOL-ORGANIZATION-PANELS-01 [CHECK]
- `check:uxschoolorganizationpanels01` School / Okul Operasyon Paneli'ni summary-first + functional tab standardına taşır; `Özet`, `Öğrenci Servisleri`, `Veli & Bildirimler`, `İstisnalar / Günlük Değişiklikler`, `Kanıt / Check-in` ve `Geçmiş` aynı anda alt alta görünmez.
- School vardiya başlığı `Okul Vardiyaları` / `Kurum Vardiyaları` gibi role-aware label'larla görünür; `Shifts (COMPANY)` sızıntısı school scope'a taşınmaz.
- Organization yüzeylerinde `Lokasyon` yerine `Konum` standardı uygulanır; `Kurum Merkezi`, `Toplanma Konumu` ve ilgili plan kopyaları yanlış role etiketi üretmez.
- Bu check, `UX-COMPANY-PANELS-FINAL-POLISH-01`, `UX-COMPANY-SHIFTS-TABS-01`, `UX-ROOM-OPS-RELATIONSHIP-POLISH-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.

## UX-ROOM-OPS-RELATIONSHIP-POLISH-01 note
- `check:uxroomopsrelationshippolish01` Room / Operasyon Sağlığı tek sorun bağlamı altında sadeleşir.
- Room / Operasyon Sağlığı tek sorun bağlamı altında sadeleşir; Sorunlu Sürücüler ve Açık Sorunlar artık ayrı tablar gibi bölünmez.
- Room / Araçlar bağlantı yönetiminin tek sahibi olur; Room / Sürücüler yalnız readonly bağlı araç özetini ve araçlara yönlendiren CTA'yı gösterir.
- Visible Hub copy, ekrana göre Oda Konumu / Toplanma Konumu gibi Türkçe label'lara çevrilir; ürün davranışı değiştirmez.
- `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`:
  - Komut: `node backend\scripts\ux_superadmin_overview_cleanup_01_check.js`
  - Check alias: `check:uxsuperadminoverviewcleanup01`
  - Ana konu: Süper Yönetici Genel Bakış ekranını summary-first dashboard düzenine taşımak; hızlı erişim, özet ve bölüm rehberini üst dashboardta tutarken geri bildirim, demo/debug ve sistem detaylarını alt functional alanlara indirmek.
  - Kritik geri bildirim bandı üstte kompakt kalır ve detay alanını açan CTA ile gelir; ana sayfa uzun listeye dönüşmez.
  - Bu check, `UX-COMPANY-PANELS-FINAL-POLISH-01`, `UX-COMPANY-QUALITY-PANEL-TABS-01`, `UX-COMPANY-SHIFTS-TABS-01`, `UX-ROOM-SHIFTS-TABS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz.

- `UX-SUPERADMIN-PANEL-CLARITY-01`:
  - Komut: `node backend\scripts\ux_superadmin_panel_clarity_01_check.js`
  - Check alias: `check:uxsuperadminpanelclarity01`
  - Ana konu: Süper Admin ekranlarındaki debug/token/null/raw kalıntılarını sade Türkçe ile temizlemek; overview, canlı izleme, onboarding review ve ticari çekirdeği summary-first, premium ve okunur halde tutmak.
  - Teknik kanıt ve detaylar yalnız kontrollü alt alanlarda yaşar; ana dashboard kullanıcıyı teknik dump ile karşılamaz.
  - Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-SUPERADMIN-QUALITY-PANEL-01` ve `UX-SUPERADMIN-COMMERCIAL-FLOW-01` zincirini bozmaz.

- `UX-SUPERADMIN-LIVE-MONITORING-01`:
  - Komut: `node backend\scripts\ux_superadmin_live_monitoring_01_check.js`
  - Check alias: `check:uxsuperadminlivemonitoring01`
  - Ana konu: Süper Admin / Canlı İzleme ekranını summary-first monitoring dashboard düzenine taşımak; canlı akış, alarm/risk, olay tipi, sistem kanıtı ve log detaylarını tablara ayırmak.
  - `KVKK / alarm` bandı üstte kompakt kalır; ana sayfa teknik uzun listeye dönüşmez.
  - Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-COMPANY-PANELS-FINAL-POLISH-01`, `UX-SCHOOL-ORGANIZATION-PANELS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz.

- `UX-SUPERADMIN-AUDIT-PANEL-01`:
  - Komut: `node backend\scripts\ux_superadmin_audit_panel_01_check.js`
  - Check alias: `check:uxsuperadminauditpanel01`
  - Ana konu: Süper Admin / Denetim Paneli'ni summary-first denetim dashboard düzenine taşımak; güvenlik/uyum uyarı bandını, yetki erişim özetini, servis kanıtını, KVKK uyumunu, audit/log kayıtlarını ve risk/karar detaylarını tablara ayırmak.
  - `STEP_UP_REQUIRED` ve `KVKK sınırı aktif` bandı üstte kompakt kalır; ana sayfa uzun listeye dönüşmez.
  - Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-SUPERADMIN-COMMERCIAL-FLOW-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz.

### AUTH-STEPUP-DEV-TOGGLE-01 [CHECK]
- `check:authstepupdevtoggle01` merkezi `STEP_UP_ENABLED` dev/test toggle'ını doğrular; `0` iken tüm step-up kontrollerini kapatır, `1` veya boş iken mevcut step-up davranışını korur.
- Step-up / TOTP sistemi silinmez; yalnızca backend guard ve ilgili TOTP step-up UI, merkezi toggle ile açılıp kapanır.
- Bu check, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-ROOM-OPS-RELATIONSHIP-POLISH-01`, `BOARDING-CHANGE-REQUEST-ENTRY-01` ve diğer step-up korumalı akışları bozmaz; yalnızca local/dev/test kolaylığı sağlar.

### AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01 [CHECK]
- `check:authstepupproviderlocaldefault01` Docker/local default step-up kapalı akışını doğrular; `STEP_UP_ENABLED`, `STEP_UP_PROVIDER` ve `STEP_UP_TOTP_ENABLED` değerleri compose/env zincirinden container içine geçer.
- Local/dev Docker varsayılanında step-up kapalı kalır; `STEP_UP_ENABLED=1` ve `STEP_UP_PROVIDER=totp` ile açık davranış geri gelir.
- `STEP_UP_PROVIDER=sms` seçimi ileride provider seçimi için saklıdır; bu milestone'da SMS gönderimi yoktur ve güvenli fallback korunur.
- Bu check, `AUTH-STEPUP-DEV-TOGGLE-01`, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-ROOM-OPS-RELATIONSHIP-POLISH-01`, `BOARDING-CHANGE-REQUEST-ENTRY-01` ve diğer step-up korumalı akışları bozmaz; yalnızca local/dev Docker varsayılanını netleştirir.

- `UX-SUPERADMIN-QUALITY-PANEL-01`:
  - Komut: `node backend\scripts\ux_superadmin_quality_panel_01_check.js`
  - Check alias: `check:uxsuperadminqualitypanel01`
  - Ana konu: Süper Admin / Güven ve Kalite ekranını summary-first dashboard düzenine taşımak; güven/kanıt bandını, taslak skor, inceleme kararı, kalite geçmişi ve yol haritası/risk detaylarını tablara ayırmak.
  - `Güven ve Kalite Özeti` ile kritik kalite/kanıt bandı üstte kompakt kalır; uzun denetim dökümü ana yüzeyi işgal etmez.
  - Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-SUPERADMIN-COMMERCIAL-FLOW-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz.

- `UX-SUPERADMIN-COMMERCIAL-FLOW-01`:
  - Komut: `node backend\scripts\ux_superadmin_commercial_flow_01_check.js`
  - Check alias: `check:uxsuperadmincommercialflow01`
  - Ana konu: Süper Admin / Ticari Akış ekranını summary-first ticari dashboard düzenine taşımak; hakediş, ödeme hazırlık, komisyon, kalite/kanıt, risk ve geçmiş detaylarını tablara ayırmak.
  - `Ödeme kapalı` ve readonly güvenli sınırı üstte kompakt kalır; execute / settlement başlatma yüzeyi görünür UI’dan kaldırılır.
  - Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-COMPANY-PANELS-FINAL-POLISH-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz.

- `UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01`:
  - Komut: `node backend\scripts\ux_superadmin_field_dispatch_discovery_01_check.js`
  - Check alias: `check:uxsuperadminfielddispatchdiscovery01`
  - Ana konu: Sahaya Çıkış Kontrolü ekranındaki gerçek section envanterini çıkarıp buna göre functional tab gruplaması yapmak; özet, hazırlık, onay, eksikler/riskler, geri bildirimler ve geçmiş/log detaylarını doğru tablarda toplamak.
  - Kritik engel / hazır değil / onay gerekli bandı üstte kompakt kalır; launch checklist, risk kaydı ve saha geri bildirimleri uzun tek sayfada alt alta akmaz.
  - Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-SUPERADMIN-QUALITY-PANEL-01`, `UX-SUPERADMIN-COMMERCIAL-FLOW-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz.

## UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01

- `check:uxsuperadminfieldacceptancecenter01` Saha Kabul Merkezi ekranını summary-first acceptance komuta paneline taşır; canlı oturum, manifest, karar kaydı, oturum bilgisi, checklist güncelleme ve geçmiş/log ayrıntıları gerçek tablarda yaşar.
- Üstte canlı oturum mini bandı ve checklist mini durum özeti kalır; uzun acceptance formu tek sayfa olarak akmaz.
- Bu check, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-SUPERADMIN-QUALITY-PANEL-01`, `UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.
