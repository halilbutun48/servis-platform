# PRIMER SSOT — canonical living route snapshot

Bu primer yaşayan hattın resmi özetidir.

## Güncel baz
- Repo: `servis-platform`
- Branch: `m90d1_web_lint_inventory`
- Güncel doğrulanmış baz: `M0->M89 green`
- Kapasite/load baz çizgisi tekil infra envelope üzerinde alındı: `1x api + 1x db + 1x redis + 1x osrm + 1x solver`.
- 500 araç cliff'i queue/worker split ile kapatıldı; 1000 araç 120s staggered kısa ve soak yeşil.
- 2 yıllık retention / archive hizada; `GpsPoint`, `ApiRequest`, `AuditLog`, `Notification` aynı sınıf değildir.
- Gelişmiş altında `Geri Bildirim` alt menüsü açıldı; Copilot en alta taşındı; panel içi dağınık geri bildirim butonları kaldırıldı.
- Region/sharding yönü resmi teknik karar + field rollout runbook olarak kapandı.
- Mobil uygulama driver-first kalır; tüm web panellerini mobile taşımak bu aşamada hedef değildir.
- Mobile/App.js ince shell olarak kalır; yeni mobile işler `mobile/src/app/*`, `mobile/src/screens/*` ve helper dosyalarına taşınır.
- Refresh rotasyonu fail-closed; telematics vendor webhook HMAC + timestamp + replay guard ile korunur; `x-greenpack` sadece explicit local-test override olarak kalır.
- 2026-04-19 gece güncellemesi: `verify:repo`, `verify:ci`, `verify:final` ve `tools\pack_living.ps1` yeşildir.
- Repo check chain sonucu: `PASS 21 / FAIL 0`; selected milestone static set: `PASS 92 / FAIL 0 / SKIP 78`.
- `ROADMAP-LOCK-AI-MARKETPLACE-01` docs-only roadmap kilidi alınmıştır; Sefer Abi ürünün ana farkıdır ve runtime davranışı değiştirilmeden yol haritası docs üzerinden sabitlenir. Detay dokümanı: `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`. Public landing ve public vitrin copy'sinde ise SeferPakt platform-first anlatılır, Sefer Abi ikincil operasyon copilot'u olarak konumlanır.
- `PUBLIC-LANDING-01` public vitrin / tanıtım yüzeyi açılmıştır; route `/#/landing` üzerinden çalışır ve public CTA'lar kontrollü lead formuna bağlanır.
- `LEAD-CAPTURE-01` kontrollü public lead toplama akışını açar; otomatik üyelik, ödeme ve davet gönderimi kapalı kalır.
- `PUBLIC-LANDING-01 final promise check` public marketing claim guard'ını kilitler; underpromise/overdeliver ve premium/ikincil operasyon copilot hizasını `docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md` içinde sabitler.
- `ONBOARDING-REVIEW-01` lead başvurularını insan inceleme kuyruğuna taşır; `APPROVED_FOR_INVITE` yalnızca sonraki invite adımı için hazırlıktır.
- `ONBOARDING-REVIEW-01 final audit` bu kuyruğun güven sınırını kilitler; `APPROVED_FOR_INVITE` yalnızca invite hazırlığıdır ve `docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md` içinde yaşar.
- `INVITE-BASED-MEMBERSHIP-01` insan onaylı davetli üyelik kilitler; public lead doğrudan user/account olmaz, self-service signup ve automatic membership açılmaz, invite draft / pending invite sadece güvenli sınırda planlanır. Detay: `docs/INVITE_BASED_MEMBERSHIP_01.md`
- `VERIFIED-SUPPLIER-01` insan onaylı, kanıt-temelli tedarikçi doğrulama hazırlığını kilitler; public lead / supplier application otomatik verified supplier olmaz, detay: `docs/VERIFIED_SUPPLIER_01.md`
- `SUPPLIER-MATCHING-01` RFQ prep çıktısını aday uygunluk matrisi ve kısa liste taslağına çeviren draft-only supplier matching companion milestone'dır; tedarikçi contact, RFQ send, offer collect ve provider credential kullanımı açmaz, detay: `docs/SUPPLIER_MATCHING_01.md`
- `SUPPLIER-OFFER-COLLECT-01` supplier matching taslağını offer collection inputuna ve draft-only teklif durum tablosuna çeviren companion milestone'dır; supplier contact, RFQ send, offer accept/reject ve provider credential kullanımı açmaz, detay: `docs/SUPPLIER_OFFER_COLLECT_01.md`
- `COPILOT-OFFER-ANALYSIS-01` Sefer Abi için draft-only offer analysis companion milestone'dır; `check:copilotofferanalysis01` ve `docs/COPILOT_OFFER_ANALYSIS_01.md` ile yaşar; supplier offer collect shortlistini comparison matrix, risk summary ve next safe step draftına çevirir, supplier selection, offer accept/reject, supplier contact, RFQ send ve provider credential kullanımını açmaz.
- `COPILOT-NEGOTIATION-ASSIST-01` offer analysis sonrası gelen draft-only negotiation prep companion milestone'dır; `check:copilotnegotiationassist01` ve `docs/COPILOT_NEGOTIATION_ASSIST_01.md` ile yaşar; pazarlık hazırlık taslağı, karşı teklif draftı, soru seti ve risk/value özeti üretir, supplier selection, offer accept/reject, supplier contact, RFQ send ve provider credential kullanımını açmaz.
- `COPILOT-OFFER-RECOMMENDATION-01` negotiation assist sonrası gelen read-only recommendation companion milestone'dır; `check:copilotofferrecommendation01` ve `docs/COPILOT_OFFER_RECOMMENDATION_01.md` ile yaşar; supplier selection, offer accept/reject, supplier contact, RFQ send ve provider credential kullanımını açmaz.
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01` offer recommendation sonrası gelen read-only agreement prep companion milestone'dır; `check:copilotshifttoagreementprep01` ve `docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md` ile yaşar; supplier selection, offer accept/reject, supplier contact, RFQ send, agreement/contract execute, dispatch apply, route apply ve provider credential kullanımını açmaz.
- `COPILOT-DISPATCH-ACTION-PREP-01` shift sonrası gelen read-only dispatch prep companion milestone'dır; `check:copilotdispatchactionprep01`, `docs/COPILOT_DISPATCH_ACTION_PREP_01.md` ve `backend/src/ai/chat/copilotDispatchActionPrep.js` ile yaşar; route apply ve dispatch apply öncesi güvenli hazırlık çizgisini taşır.
- `COPILOT-ACTION-PREP-01` dispatch, shift ve human approval kaynaklarını ortak read-only owner pack altında birleştiren companion milestone'dır; `check:copilotactionprep01`, `docs/COPILOT_ACTION_PREP_01.md` ve `backend/src/ai/chat/copilotActionPrep.js` ile yaşar; dispatch apply, route apply, driver/vehicle assignment, agreement execute, payment/hakediş ve messaging/email/SMS/push açmaz.
- FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01, COPILOT-ACTION-PREP-01 sonrasındaki resmi finansal blok başlangıcıdır; mevcut dynamic savings, hakediş önizleme, kalite/payment bridge, payment preview, CSV export ve Sefer Abi cost cevapları yeniden kullanılır; full muhasebe/e-Fatura/e-Defter/vergi programı değildir; ROOM ve COMPANY yüzeyleri RBAC ile bağlanır.
- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01` `check:financialoperationssurfaceandrbac01`, `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md` ve `backend/src/finance/financialOperationsScope.js` ile yaşar; preview/lifecycle/RBAC sınırını korur.
- `OPERATIONAL-COST-MODEL-01` `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` ile yaşar; pure deterministic read-only cost modeldir; write-action, muhasebe/program, payment execute ve provider credential açmaz.
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01` `check:roomprofitabilityandquotefloor01`, `docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md` ve `backend/src/finance/roomProfitabilityAndQuoteFloor.js` ile yaşar; room profitability ve quote floor önizleme katmanını read-only tutar.
- `COMPANY-BUDGET-AND-SERVICE-COST-01` `check:companybudgetandservicecost01`, `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md`, `backend/src/finance/companyBudgetAndServiceCost.js` ve `backend/src/services/financialOperationsLifecycle.js` ile yaşar; company budget lifecycle + service cost preview katmanını bağlar.
- `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01` #3 ürün hattı `docs/HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01.md`, `backend/src/finance/hakedisInvoiceReconciliation.js`, `backend/src/routes/reconciliation.js` ve `check:hakedisinvoicereconciliationpreview01` ile yaşar; teknik, gerçek API/DB ve browser kabulü yeşil olan salt-okunur kanıtlı önizleme olarak immutable closure durumundadır.
- `COMPANY-BUDGET-AND-SERVICE-COST-01` teknik, gerçek API/DB, browser/mobile ve kullanıcıya görünen Türkçe kabul zinciriyle `green/closed` durumundadır; dış maliyet/referans sağlayıcısı bu kapanışın dışındadır ve sonraki kanonik frontier'dır.
- `#2 EXTERNAL-COST-DATA-PROVIDER-AND-FRESHNESS-01` dış maliyet/referans verisi için provider-bağımsız contract, provenance, freshness, cache ve güvenli import/read sınırını kurar; gerçek provider acquisition/freshness entegrasyonu bu milestone'ın kontrollü sonraki aşamasıdır, #1 internal actual verisinin yerine geçmez.
- Static helper: `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
- `UX-MARKETPLACE-PANELS-01` verified supplier ve invite/onboarding sonrasında marketplace readiness center'ı docs/check kilidi olarak sabitler; status-first, human approval ve readiness preview dilini korur, marketplace auto-selection / offer ranking / payment / contract execute açmaz. Detay: `docs/UX_MARKETPLACE_PANELS_01.md`
- `M44-TELEMATICS-T1-T5` read-only telematics / risk / quality baseline'ını kilitler; canonical check `check:m44telematicst1t5`, detay: `docs/M44_TELEMATICS_T1_T5.md`.
- `TELEMATICS-PROVIDER-HUB-01` M44 sonrası provider-agnostic telematics hub / readiness UX kilididir; Ayarlar / Telematik Entegrasyonları, test bağlantısı, cihaz eşleştirme, provider registry ve readonly telematics signals çizgisini korur; gerçek provider entegrasyonu açmaz. Detay: `docs/TELEMATICS_PROVIDER_HUB_01.md`
- `SAFE-DRIVE-01` M44 + telematics provider hub sonrası readonly safe-drive risk summary katmanıdır; `Güvenli sürüş özeti`, `Risk sinyali`, `Kontrol edilmeli` ve `İnsan onayı gerekir` çizgisini korur; rota uygulaması, sürücü/araç ataması, ödeme/hakediş ve otomatik yönlendirme açmaz. Detay: `docs/SAFE_DRIVE_01.md`
- `OFFER-RANKING-QUALITY-01` readonly offer quality comparison katmanıdır; Company / Room / Super Admin yüzeylerinde kalite, güven, telematics, evidence/check-in ve operasyon riski birlikte okunur; auto-selection / auto-accept / contract execute / payment/hakediş execute / AI runtime action açmaz. Detay: `docs/OFFER_RANKING_QUALITY_01.md`
- `COPILOT-ROLE-TASK-MATRIX-01` Sefer Abi / Copilot rol/task matrix ve guardrail katmanını docs/check olarak kilitler; `check:copilotroletaskmatrix01` ve `docs/COPILOT_ROLE_TASK_MATRIX_01.md` ile yaşar.
- `COPILOT-AI-ACTION-ROADMAP-01` Sefer Abi için future-only AI action phase modelini docs/check olarak kilitler; `check:copilotairoadmap01` ve `docs/COPILOT_AI_ACTION_ROADMAP_01.md` ile yaşar.
- `COPILOT-DEMAND-INTAKE-01` Sefer Abi için draft-only demand intake, sınıflandırma ve netleştirme soruları katmanını docs/check olarak kilitler; `check:copilotdemandintake01` ve `docs/COPILOT_DEMAND_INTAKE_01.md` ile yaşar.
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` Sefer Abi için future-only talep -> teklif -> sözleşme hazırlık yol haritasını docs/check olarak kilitler; `check:copilotdemandagreement01` ve `docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md` ile yaşar.
- `COPILOT-RFQ-PREP-01` Sefer Abi için draft-only RFQ prep companion milestone'dır; `check:copilotrfqprep01` ve `docs/COPILOT_RFQ_PREP_01.md` ile yaşar; supplier matching, offer collect ve RFQ send açmaz.
- Canonical sequence: `COPILOT-OFFER-ANALYSIS-01` -> `COPILOT-NEGOTIATION-ASSIST-01` -> `COPILOT-OFFER-RECOMMENDATION-01` -> `COPILOT-SHIFT-TO-AGREEMENT-PREP-01` -> `COPILOT-DISPATCH-ACTION-PREP-01` -> `COPILOT-ACTION-PREP-01` -> `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01` -> `COPILOT-HUMAN-APPROVAL-01` -> `COPILOT-EXCEL-DEMAND-IMPORT-01`
- `COPILOT-HUMAN-APPROVAL-01` Sefer Abi için kritik işlemlerde human approval / confirmation modelini docs/check olarak kilitler; `check:copilothumanapproval01` ve `docs/COPILOT_HUMAN_APPROVAL_01.md` ile yaşar.
- `COPILOT-EXCEL-DEMAND-IMPORT-01` Sefer Abi için Excel/CSV demand import readiness, column mapping, data quality ve human approval gate docs/check kilididir; `check:copilotexceldemandimport01` ve `docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md` ile yaşar.
- `ADDRESS-GEOCODING-CONFIDENCE-01` servis adresi kalite sözlüğü, geocoding readiness modeli, confidence bands, risk sınıfları ve human-review gate docs/check kilididir; `check:addressgeocodingconfidence01` ve `docs/ADDRESS_GEOCODING_CONFIDENCE_01.md` ile yaşar; Excel demand import sonrası stop/route draft hattına güvenli giriş kapısıdır.
- `COPILOT-STOP-ROUTE-DRAFT-01` stop / route draft readiness docs/check kilididir; `check:copilotstoproutedraft01` ve `docs/COPILOT_STOP_ROUTE_DRAFT_01.md` ile yaşar; inbound / outbound direction model, hub readiness, capacity readiness ve human review gate'i kilitler.
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01` Excel/import → address confidence → stop/route draft hattından gelen veriyi gerçek OSRM hazırlık katmanına bağlayan docs/check kilididir; `check:osrmroutedraftfromexcel01` ve `docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md` ile yaşar; runtime OSRM call, route preview ve route apply açmaz.
- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01` OSRM route draft sonrası insan onaylı route review kapısını kilitler; `check:copilotroutereviewhumanapproval01` ve `docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md` ile yaşar; route preview, OSRM call ve route apply açmaz.
- `EXCEL-TO-ROUTE-READINESS-REDTEAM-01` Excel/import → address confidence → stop/route draft → OSRM readiness → route review hattı için statik red-team / kırma testi kilididir; `check:exceltoroutereadinessredteam01`, `docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md` ve `backend/src/ai/chat/excelToRouteReadinessRedteamPack.js` ile yaşar; runtime AI action, tool execution ve write-action açmaz.
- `COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01` Excel/import → address confidence → OSRM → route review sorularını güvenli runtime-answer helper katmanında tutar; `check:copiloteblockruntimeanswerintegration01`, `docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md` ve `backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js` ile yaşar; runtime AI action, tool execution, write-action dispatcher ve fake success açmaz.
- `COPILOT-GUIDED-TASK-ENGINE-01` exact phrase yerine semantic intent family / synonym / typo-tolerant guided task katmanıdır; `check:copilotguidedtaskengine01`, `docs/COPILOT_GUIDED_TASK_ENGINE_01.md` ve `backend/src/ai/chat/copilotGuidedTaskEngine.js` ile yaşar; runtime AI action, tool execution, write-action dispatcher, OSRM/geocode call ve route apply açmaz.
- `COPILOT-DYNAMIC-QUESTION-ENGINE-01` role + screen + selected record + current reply üzerinden dynamic question assembly katmanını paylaşır; `check:copilotdynamicquestionengine01`, `docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md` ve `backend/src/ai/chat/conversationTaskStateResponses.js` ile yaşar; `Netleştirelim / Devam edelim` formatını helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında paylaşır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `COPILOT-SMART-DIAGNOSTIC-ENGINE-01` role + screen + selected record + current reply üzerinden symptom/problem diagnostic katmanını paylaşır; `check:copilotsmartdiagnosticengine01`, `docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md` ve `backend/src/ai/chat/conversationSmartDiagnostics.js` ile yaşar; `Görünmüyor / çıkmadı / çalışmadı / başlamadı / gelmedi / yok` sinyallerini helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında güvenli şekilde çözer; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `COPILOT-ROOT-CAUSE-ENGINE-01` role + screen + selected record + current reply üzerinden root cause reply/chip katmanını paylaşır; `check:copilotrootcauseengine01`, `docs/COPILOT_ROOT_CAUSE_ENGINE_01.md` ve `backend/src/ai/chat/conversationRootCauseEngine.js` ile yaşar; `asıl sebep / neden tekrar ediyor / neden düzelmiyor / neden sürekli görünmüyor` sinyallerini helpComposer, Sefer Abi reasoning assistant ve answerQualityPolicy arasında güvenli şekilde çözer; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `COPILOT-RISK-SCORING-ENGINE-01` role + screen + selected record + current reply üzerinden risk list / risk scoring katmanını paylaşır; `check:copilotriskscoringengine01`, `docs/COPILOT_RISK_SCORING_ENGINE_01.md` ve `backend/src/ai/chat/conversationRiskScoringEngine.js` ile yaşar; `riskleri sırala / risk var mı / en riskli ne / hangi konu acil` sinyallerini helpComposer, Sefer Abi reasoning assistant ve answerQualityPolicy arasında güvenli şekilde çözer; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `COPILOT-CLARIFYING-QUESTION-ENGINE-01` role + screen + selected record + conversation state üzerinden clarifying question assembly katmanını tek yerde toplar; `check:copilotclarifyingquestionengine01`, `docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md` ve `backend/src/ai/chat/conversationTaskStateResponses.js` ile yaşar; `Netleştirelim / Alternatif` formatını helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında paylaşır; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `COPILOT-WORKFLOW-REASONING-ENGINE-01` company plan, offers / agreements, shifts, room map / vehicles, driver route, personel live, parent live ve superadmin yüzeylerinde işlem akışı, current stage, next safe control ve human approval points katmanını tek yerde toplar; `check:copilotworkflowreasoningengine01`, `docs/COPILOT_WORKFLOW_REASONING_ENGINE_01.md`, `backend/src/ai/chat/conversationWorkflowReasoningEngine.js` ve `backend/src/ai/chat/seferAbiReasoningAssistant.js` ile yaşar; görünür Türkçe reply'ı sabitler, surface-aware chip setini korur ve runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `COPILOT-OPERATION-HEALTH-ENGINE-01` şirket, oda, superadmin, sürücü, personel, veli, okul ve organizasyon operasyon yüzeylerinde canlılık / risk / konum sinyali okumasını tek yerde toplar; `check:copilotoperationhealthengine01`, `docs/COPILOT_OPERATION_HEALTH_ENGINE_01.md`, `backend/src/ai/chat/conversationOperationHealthEngine.js` ve `backend/src/ai/chat/screenStateAnalyzer.js` ile yaşar; read-only kalır, no write-action, tool execution, DB write, route apply ve fake success açmaz.
- `COPILOT-NEXT-BEST-ACTION-ENGINE-01` şirket, organizasyon, okul, oda, sürücü, personel, veli ve superadmin yüzeylerinde sıradaki en doğru güvenli adım / önce yapılacak güvenli kontrol çizgisini tek yerde toplar; `check:copilotnextbestactionengine01`, `docs/COPILOT_NEXT_BEST_ACTION_ENGINE_01.md`, `backend/src/ai/chat/conversationNextBestActionEngine.js`, `backend/src/ai/chat/conversationTaskStateResponses.js` ve `backend/src/ai/chat/seferAbiReasoningAssistant.js` ile yaşar; read-only kalır, insan onayı korur, write-action, route apply ve fake success açmaz.
- `COPILOT-PLAN-REVIEW-ENGINE-01` Planlama Merkezi, vardiya, sözleşme, canlı takip, araç ve sürücü rota yüzeylerinde plan kontrolü / önizleme / onay öncesi değerlendirme katmanını tek yerde toplar; `check:copilotplanreviewengine01`, `docs/COPILOT_PLAN_REVIEW_ENGINE_01.md` ve `backend/src/ai/chat/conversationPlanReviewEngine.js` ile yaşar; `Sonraki güvenli kontrol`, `İnsan onayı`, `write-action` ve `route review` çizgisini korur, runtime AI action, tool execution, DB write, route apply ve fake success açmaz.
- `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01` `helpComposer.js` içindeki güvenli reply-helper yüzeyini `helpComposerSafeReplies.js` ile ayıran acceptance-safe hot-file split milestone'udur; `check:hotfilesplitaichatcomposers01`, `docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md`, `backend/src/ai/chat/helpComposer.js` ve `backend/src/ai/chat/helpComposerSafeReplies.js` ile yaşar; görünür davranışı korurken hot-file borcunu azaltır.
- `HOT-FILE-SPLIT-WEB-PANELS-01` company / room agreements panel bridge ve helper yüzeyini ana panel gövdelerinden ayıran acceptance-safe hot-file split milestone'udur; `check:hotfilesplitwebpanels01`, `docs/HOT_FILE_SPLIT_WEB_PANELS_01.md`, `web/src/panels/company/companyAgreementsBridgeSection.jsx`, `web/src/panels/company/companyAgreementsPanelHelpers.js`, `web/src/panels/room/roomAgreementsBridgeSection.jsx` ve `web/src/panels/room/roomAgreementsPanelHelpers.js` ile yaşar; görünür panel davranışını korurken hot-file borcunu azaltır.
- `TEST-QUALITY-AND-FLAKE-AUDIT-01` smoke/check zincirindeki flake risklerini, false negative sıcak noktalarını ve threshold / skip / timing / PASS gevşetme riskini dar kapsamda audit eder; `check:testqualityandflakeaudit01`, `docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md` ve `backend/scripts/test_quality_and_flake_audit_01_check.js` ile yaşar; runtime-data, browser-smoke ve debug.log commit sınırını görünür tutar, yeni ürün davranışı açmaz.
- `DASHBOARD-BULK-ENDPOINT-01` dashboard yüzeylerinde read-only bulk aggregation pattern'ini sabitler; `check:dashboardbulkendpoint01`, `docs/DASHBOARD_BULK_ENDPOINT_01.md` ve `backend/scripts/dashboard_bulk_endpoint_01_check.js` ile yaşar; runtime-data, browser-smoke ve debug.log commit sınırını görünür tutar, yeni write-action veya human approval sınırı açmaz.
- `CACHE-COALESCING-AND-BACKOFF-01` dashboard bulk ve read-heavy read flows için same-key inflight coalescing / bounded backoff companion guard'ıdır; `check:cachecoalescingandbackoff01`, `docs/CACHE_COALESCING_AND_BACKOFF_01.md` ve `backend/scripts/cache_coalescing_and_backoff_01_check.js` ile yaşar; `backend/src/utils/responseCache.js`, `web/src/utils/uiDataCache.js`, `backend/src/services/dashboardBulk.js` ve `web/src/utils/dashboardBulk.js` üzerinden read-only kalır; runtime-data, browser-smoke ve debug.log commit sınırını görünür tutar, yeni write-action veya human approval sınırı açmaz.
- `REQUEST-STORM-RESILIENCE-01` smoke/check zincirindeki request-storm risklerini, desktop/mobile storageState reuse ve 429 console/page error sınırını dar kapsamda audit eder; `check:requeststormresilience01`, `docs/REQUEST_STORM_RESILIENCE_01.md` ve `backend/scripts/request_storm_resilience_01_check.js` ile yaşar; runtime-data, browser-smoke ve debug.log commit sınırını görünür tutar, yeni ürün davranışı açmaz.
- `PRODUCTION-RATE-LIMIT-POLICY-01` production rate-limit davranışını auth/public, read-heavy/live, write-action/human approval ve AI assistant read-only sınıflarıyla merkezi policy/check/doc olarak sabitler; `check:productionratelimitpolicy01`, `docs/PRODUCTION_RATE_LIMIT_POLICY_01.md` ve `backend/scripts/production_rate_limit_policy_01_check.js` ile yaşar; runtime enforcement açmaz, smoke/request-storm deneyimini bozmadan 429 riskini yönetir.
- `AI-RESPONSE-SEMANTIC-QUALITY-GATE-01` Sefer Abi / Copilot yanıt semantiğinde role/screen fit, intent fit, güvenli adım, insan onayı, terminoloji, belirsizlik, tekrar kontrolü, clarifying ve cross-engine separation çizgisini deterministic check ile audit eder; `check:airesponsesemanticqualitygate01`, `docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md` ve `backend/scripts/ai_response_semantic_quality_gate_01_check.js` ile yaşar; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `LOAD-TEST-2000-USERS-01` 2000-user readiness load harness'idir; `check:loadtest2000users01`, `docs/LOAD_TEST_2000_USERS_01.md`, `backend/scripts/load_test_2000_users_01_check.js` ve `backend/scripts/load_test_2000_users_01_harness.js` ile yaşar; default smoke local/dev-safe kalır, `LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true` olmadan 2000 çalışmaz, production/public URL ve write-action sınırını açmaz.
- `DB-POOL-AND-API-SCALING-01` load-test sonrası DB pool ve API scaling readiness katmanıdır; `check:dbpoolandapiscaling01`, `docs/DB_POOL_AND_API_SCALING_01.md`, `backend/scripts/db_pool_and_api_scaling_01_check.js` ve `backend/scripts/db_pool_and_api_scaling_01_probe.js` ile yaşar; local/dev-safe GET probe kullanır, production/public URL ve write-action sınırını açmaz.
- `OBSERVABILITY-MONITORING-ALERTING-01` DB pool ve API scaling sonrası health, metrics, alert ve KVKK-safe logging readiness katmanıdır; `check:observabilitymonitoringalerting01`, `docs/OBSERVABILITY_MONITORING_ALERTING_01.md` ve `backend/scripts/observability_monitoring_alerting_01_check.js` ile yaşar; local/dev-safe probe, production/public URL ve write-action sınırını açmaz.
- `BACKEND-LINT-WARNING-BURNDOWN-01` backend lint warning burndown katmanıdır; `check:backendlintwarningburndown01`, `docs/BACKEND_LINT_WARNING_BURNDOWN_01.md` ve `backend/scripts/backend_lint_warning_burndown_01_check.js` ile yaşar; runtime davranışı değiştirmez, smoke threshold ve lint config sınırlarını açmaz.
- `DATA-INTEGRITY-AND-RECOVERY-01` runtime-data recovery, backup/restore ve corruption detection kabul katmanıdır; `check:dataintegrityandrecovery01`, `docs/DATA_INTEGRITY_AND_RECOVERY_01.md` ve `backend/scripts/data_integrity_and_recovery_01_check.js` ile yaşar; `backend/artifacts/runtime-data/`, `backend/artifacts/browser-smoke/`, `backend/artifacts/load-test/`, `backend/artifacts/db-scaling/`, `backend/artifacts/observability/` ve `backend/artifacts/data-integrity/` commit dışı kalır, production DB / destructive query / schema değişikliği açmaz.
- `ROLE-DATA-ISOLATION-REDTEAM-01` role/tenant data isolation redteam guardıdır; `check:roledataisolationredteam01`, `docs/ROLE_DATA_ISOLATION_REDTEAM_01.md` ve `backend/scripts/role_data_isolation_redteam_01_check.js` ile yaşar; production DB, public URL probe, real credential, write-action ve schema/migration açmaz.
- `SECURITY-KVKK-FINAL-01` teknik security / KVKK final gate'idir; `check:securitykvkkfinal01`, `docs/SECURITY_KVKK_FINAL_01.md` ve `backend/scripts/security_kvkk_final_01_check.js` ile yaşar; data-integrity, observability, DB scaling, load-test, cache, request-storm ve rate-limit hatlarının üstünde final acceptance olarak okunur; production DB, public URL probe, real credential, write-action ve schema/migration açmaz.
- `AUDIT-LOG-AND-APPROVAL-TRACE-01` human approval trace ve KVKK-safe audit payload gate'idir; `check:auditlogandapprovaltrace01`, `docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md` ve `backend/scripts/audit_log_and_approval_trace_01_check.js` ile yaşar; recommendation/approval/action trace boundary'yi görünür kılar ve production DB, public URL probe, real credential, write-action ve schema/migration açmaz.
- `COPILOT-REASONING-ANSWER-COMPOSER-01` reasoning assistant çıkışını robotik lead marker / tekrar / template benzerliğinden temizleyen final reply composer katmanıdır; `check:copilotreasoninganswercomposer01`, `docs/COPILOT_REASONING_ANSWER_COMPOSER_01.md` ve `backend/src/ai/chat/copilotReasoningAnswerComposer.js` ile yaşar; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Acceptance scope notu: bu milestone artık `core composer + required product acceptance support` olarak okunur; strict A-only ürün smoke'unda Company shifts preview/convert yüzeyi zorunlu kaldığı için bu destek de scope içindedir, fakat runtime execute açmaz.
- `SEFER-ABI-REASONING-ASSISTANT-01` role + screen + selected record + conversation state ile reasoning assistant katmanını açar; `check:seferabireasoningassistant01`, `docs/SEFER_ABI_REASONING_ASSISTANT_01.md` ve `backend/src/ai/chat/seferAbiReasoningAssistant.js` ile yaşar; golden pack test/kabul içindir, reply source değildir ve runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` role + screen + selected record + conversation state + interactionIntentFamily ile role-aware reasoning katmanını güçlendirir; `check:seferabiallrolesreasoningassistant01`, `docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md` ve `backend/src/ai/chat/seferAbiReasoningAssistant.js` ile yaşar; golden pack test/kabul içindir, reply source değildir ve runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01` Sefer Abi'nin kullanıcıya görünen cevaplarında İngilizce/teknik/sistem içi terminolojiyi sade Türkçe kullanıcı diliyle değiştirir; `check:seferabiturkishterminology01`, `docs/SEFER_ABI_TURKISH_USER_FACING_TERMINOLOGY_01.md`, `backend/src/ai/chat/helpComposer.js` ve `backend/src/ai/chat/seferAbiReasoningAssistant.js` ile yaşar; `ETA`, `GPS`, `offline`, `stale`, `fallback`, `selected record`, `root cause`, `diagnostic`, `risk scoring`, `task-state`, `intent`, `chip`, `workflow`, `screen purpose`, `next best action`, `safe alternative`, `active segment`, `completed segment`, `live decision`, `route binding`, `status`, `warning`, `error` ve `blocker` gibi görünür sızıntıları engeller; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01` Sefer Abi'nin tüm rol ve yüzeylerinde kullanıcıya görünen metinleri sade Türkçe tutan audit katmanıdır; `check:seferabiturkishuserfacinglanguage01`, `docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md` ve `backend/src/ai/chat/helpComposer.js` ile yaşar; `Free-to-operate`, `root cause`, `diagnostic`, `risk scoring`, `workflow`, `screen purpose`, `next best action`, `current step`, `fallback`, `offline`, `stale`, `ETA`, `warning`, `error` ve `blocker` gibi görünür sızıntıları engeller; runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.
- Tarihsel temiz anchor: `M0->M79`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- İlk yürütülebilir kapanış kapısı: `M90B.1 — executable closure gate`
- M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 / M90C.9 kapanmıştır; `M91`, `M92` ve `M93` ile birlikte green / compatibility çizgisinde korunur.
- M94-D2 / M94-D3 — admin audit + payment export polish ve settlement ledger CSV temizliği görünürlük kaydıdır.
- M96-A — driver availability local state bandıdır.
- M96-B — mobile notifications foundation driver, personel, veli ve operasyon bildirim yüzeylerini tek foundation altında yaşatır.
- M96-C — boarding change local model bandıdır; backend/panel bind sonraki halkadadır.
- M96-C2 — boarding change operations readiness bandıdır; backend/panel/audit/notification/auto-accept görünürlüğü burada yaşar.
- M96-D — driver change awareness ve sesli uyarı mobil yüzeyidir.
- Tek repo kontrol girişi: `npm run verify:repo`
- Local acceptance overlay: `M91 shift/agreement route preview`
- Repo verification spine: `M92 repo verification spine`
- Queue durability proof: `M93 queue durability proof`
- Queue chaos/alarm proof: `M94-E queue chaos/alarm proof` — static check + synthetic runtime probe ile yaşar.
- Android APK/AAB build readiness: `M95-E0 android apk/aab build readiness` — APK/AAB hazırlığı ile saha kanıtı ayrımını resmi runbook/check altında yaşatır.
- Check-in panel integrations: `M97 check-in panel integrations` — nav restore ve panel kısayolları check'i ile yaşar.
- Room operation board: `M97-A room operation board` — oda operasyon özetini, görev/servis sayfalarını ve biniş değişikliği görünümünü yaşatır.
- Company operations panel: `M97-B company operations panel` — personel servis atamaları, biniş değişiklikleri ve bildirim özetini yaşatır.
- School operations panel: `M97-C school operations panel` — öğrenci servis atamaları, veli bağlantıları ve bildirim geçmişini yaşatır.
- Super Admin operations panel: `M97-D super admin operations panel` — rol/yetki denetimi, audit ve tekrar eden işlem özetini yaşatır.
- Personel activation model: `M98-A personel activation model` — kurum daveti ve ilk giriş modeliyle yaşar.
- Parent activation and link access: `M98-B parent activation and link access` — veli daveti, bağlantı süresi ve takip yetkisiyle yaşar.
- Link lifetime and tracking authority: `M98-C link lifetime and tracking authority` — davet süresi, aktif servis ve görünürlük kuralıyla yaşar.
- KVKK visibility matrix: `M98-D kvkk visibility matrix` — rol bazlı takip görünürlüğü ve kapı kurallarıyla yaşar.
- `M98-E2E` code + PIN acceptance gate green; `M98-E3` code + PIN saha / UX kanıt paketi active.
- `M98-E4` code + PIN runtime smoke active.
- `M98-E5` code + PIN gerçek kullanıcı kabul checklist’i active.
- `M99-KVKK-01` mobil/web KVKK sade metin ve izin dili active.
- `M99-UX-01` görünür Türkçe metin hijyeni active.
- `OP-01` OperationProof / ServiceProof merkezi kanıt omurgası closed-readonly; `OP-02` manuel operatör kanıt notu katmanı active; `OP-03` web servis kanıtı / manuel not küçük kartı active; `M99-KVKK-01` ve `M99-UX-01` kararları korunur.
- `M95-E25` mobil saha kabul checklist’i active.
- `M95-E26` Android emulator smoke planı active.
- `M95-E27` Gerçek Android cihaz saha proof hazırlığı active.
- `M95-EXPORT-01` export zip / runtime check uyumu active; shareable export paketinde runtime JSON yokluğu INFO/SKIP kabul edilir.
- `MOBILE-TEXT-01` mobile activation copy cleanup green/closed; personel/veli/biniş değişikliği kartlarındaki eski hazırlık dili sade Türkçeye çekildi.
- Mobile regression pack: `M99-A mobile regression pack` — login, role routing, token/session, bildirim, biniş değişikliği ve müsaitlik regression pack'iyle yaşar.
- Real scenario tests: `M99-B real scenario tests` — sürücü, personel, veli ve operasyon yüzeylerini gerçek senaryo pack'iyle yaşatır.
- Field launch readiness: `M99-C field launch readiness` — gerçek cihaz, zayıf ağ, ekran kapalı GPS ve saha kanıtı hazırlığıyla yaşar.
- Güncel kapanmış ek hatlar: `M91`, `M92`, `M93`, `Tur 1`, `Tur 2`, `Tur 3`.
- Resmi çalışma yönü: `M90` rotası içinde ihtiyaç-temelli kontrollü ilerleme.
- Not: `M90C.9` görünürlüğü compatibility / closure marker olarak korunur; bu satır yeni büyük taşıma veya agresif refactor çağrısı değildir.

## Son kapanan ürün hatları
- `WEB-01A` ve `WEB-01B` flow/system mode akışı green kapandı; `WEB-01-FIX` görünür Türkçe sistem dili düzeltmesiyle kapandı (`8b9c9eb / v2026.05.08-web01-fix-flow-check-system-language`).
- `PAY-01A-E` readonly ödeme/hakediş hazırlık, önizleme, detay, CSV ve kapanış hattı green kapandı; `PAY-01E` kapanış halkası da bu hattın parçasıydı.
- `PAY-SAFE-01` aktif ödeme / settlement write güvenli kapı arkasına alındı (`5722590 / v2026.05.07-paysafe01-payment-write-gate`).
- `OP-04` readonly proof commercial/quality bridge green kapandı.
- `QLT-04B` compact signal list green kapandı.
- `COP-01A-E` operasyon rehberi serisi ve `COP-02A` program-wide guide fallback green kapandı; `COP-01E` kabul halkası da bu serinin parçasıydı.
- `COP-02B` bağlamlı öneri / takip sorusu zinciri green kapandı.
- `COP-03A` Copilot ekran bilgi omurgası / registry-catalog parity green kapandı.
- `UX-KVKK-01` compact boundary hint green kapandı.
- Bu kapanışlar DOCS-STATE-01 ile resmi hafıza katmanına işlenmiş son ürün durumunu temsil eder.

## Kanonik komut hiyerarşisi (Tur 1)
- Tur 1 / Tur 2 / Tur 3 docs-tools-wrapper hizası kapanmıştır; bundan sonraki ilerleme ihtiyaç-temelli ve kontrollü olmalıdır.
- Resmi günlük giriş: `npm run verify:repo`.
- Resmi kapanış girişi: `npm run verify:final`.
- `tools\pack_living.ps1` korunur; ancak compatibility / geniş prova hattıdır ve birincil resmi giriş değildir.
- Wrapper/alias politikası ve hedef klasör düzeni için repo içi kanonik referans: `docs/HEDEF_KLASORLEME_VE_TEST_SIRASI_V1.md`.
- Bu Tur 1 hizalamasında ürün koduna dokunulmaz; yalnız docs/tools anlatımı ve giriş düzeni netleştirilir.
- Sefer Abi ürünün ayırt edici AI katmanıdır; public vitrin copy'sinde opsiyonel operasyon copilot'u olarak anlatılır; rol bazlı, sesli, proaktif ve onay-kapılı çalışır.
- Demand-to-Agreement ve AI marketplace omurgası docs-only roadmap lock ile sabitlenir; kritik write işlemler kullanıcı onayı olmadan yapılmaz. Public landing copy'sinde ise SeferPakt platform-first anlatılır, Sefer Abi ikincil operasyon copilot'u olarak görünür.

## Güncel yaşayan sıra
- `M80` — final sert kabul ve yük güveni
- `M80.1` — hot panel daraltma
- `M80.2` — agreements + shifts giriş yükü
- `M80.3` — georeview + shifts son giriş yükü
- `M81` — mobil saha sertleştirme
- `M82.1` — backend correctness kilidi
- `M82.8` — Verification 2.0
- `M82.9` — dormant payment backbone
- `M82.10` — super admin ticari ayarlar
- `M82.11` — payment readonly ticari yüzey
- `M83` — saha hazırlık paketi
- `M84` — saha geri bildirim döngüsü
- `M85` — opsiyonel ödeme pilotu
- `M86` — zorunlu ödeme rollout
- `M87` — ödeme hesabı hazırlığı
- `M88` — settlement operasyon masası
- `M89` — settlement mutabakat masası

## BATCH-10 provenance & canonical technical closure
- BATCH-09 kapandı; `Product Extensions 198/198 GREEN`.
- Executable SSOT sahipleri: `backend/scripts/lib/currentHeadScopePolicy.js`, `backend/scripts/lib/canonicalProvenanceRegistry.js`, `backend/scripts/lib/guardGitScope.js`, `backend/scripts/lib/guardTextIntegrity.js`, `backend/scripts/lib/guardSmokeEvidence.js`.
- Teknik kapanış ailesi 6 kanonik kayıttan oluşur: beş `CONCURRENT_CANONICAL` route dosyası ve bir `LEGITIMATE_CANONICAL_NEW_FILE` olan `backend/src/lib/requestUrl.js`.
- `CONCURRENT_CANONICAL` route dosyaları: `backend/src/routes/commercialCoreRoutes.js`, `backend/src/routes/commercialCorePaymentRoutes.js`, `backend/src/routes/commercialCorePaymentReportsRoutes.js`, `backend/src/routes/commercialCoreRoomRoutes.js`, `backend/src/routes/commercialCoreRouteData.js`.
- `backend/src/lib/requestUrl.js` için `currentHeadPolicyState = ABSENT` intentional durumdur; eksik registration, stale policy, orphan source veya geçici exception değildir.
- `backend/src/lib/requestUrl.js` canonical request/source-route sanitization helper'ıdır; bilinen consumers: `backend/src/server.js`, `backend/src/bootstrap/rateLimits.js`, `backend/src/middleware/apiRequestLog.js`, `backend/src/routes/public.js`.
- Bu helper missing-input handling, absolute/relative URL parse, query sanitization/redaction, safe pathname/source-route preservation, parse fallback ve token/secret/signature-like leakage prevention sağlar; authorization veya tenant/role access genişletmez.
- RAW file-byte identity ile NORMALIZED text identity farklı modellerdir; current-head policy raw identity kullanır, text-integrity consumers normalized text identity kullanır.
- `commercialCore.js` raw/normalized SHA ayrımı bu modelin kasıtlı örneğidir; iki model birbirinin yerine geçmez.
- Role/security/audit checkers canonical owners'ın consumer'ıdır; ikinci bir global SSOT değildir.
- BATCH-10 teknik provenance closure green'dir; bu dosya insan-okunur kapanış anlatısı ve runbook SSOT coverage referansıdır.

Compatibility aliases for legacy checks:
- `M83` — field prep packet / saha hazırlık paketi
- `M84` — field feedback loop / saha geri bildirim döngüsü
- `M85` — optional payment pilot / opsiyonel ödeme pilotu
- `M87` — payment account readiness / ödeme hesabı hazırlığı

## Ürün çerçevesi
- Platform sadece personel değildir; öğrenci/veli + personel alanlarını birlikte taşır.
- Marka dili: **SeferPakt**
- Ürün tanımı: **SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve operasyon yardımcısı katmanıyla maliyet/saha risklerini önceden görünür kılan kurumsal servis operasyon platformudur.**
- Konumlama: **servis tedariki + sözleşme + operasyon**
- Yazılım şu anda ücretsiz kullanım yönünde kurgulanır; gelir modeli gelecekte ödeme/komisyon aracılığıdır.
- Ödeme omurgası gerçek charge/payout açmadan önce dormant/feature-flag mantığında ilerler.
- Kanonik aktivasyon anahtarı `PAYMENT_BACKBONE_ENABLED=0/1` ile taşınır; `0` hazırlık, `1` canlı kapı için uygun zemin anlamına gelir.
- Kanonik ödeme hazırlık belgesi: `docs/TICARI_ODEME_VE_MUTABAKAT_HAZIRLIK_MODELI_V1.md`.
- Aktivasyon checklist'i ve Super Admin ödeme listesi / CSV export yüzeyi de aynı kanonik belgede tutulur; canlı charge/payout bu turda yine açılmaz.
- Bu aşamada canlı charge / payout açılmaz; banka transferi önce, sanal POS + 3D Secure sonra hazırlanır.

## Kalıcı kurallar
- Adım adım, kontrollü ilerlenir.
- Overlay zip tek kök klasörlü olmalıdır.
- UI dili sade Türkçe ve düşük bilişsel yüklü kalmalıdır.
- “wizard” yerine tek Guided Mode/Stepper yaklaşımı korunur.
- “driver GPS” yerine “sürücünün telefon GPS'i” kullanılır.
- “agreement” yerine “sözleşme” kullanılır.
- Sistem eskiye döndürülmez; script/check/doc yeni canonical gerçeğe göre güncellenir.

## Infra / queue guardrail
- `autoReachedQueue` claim / processing / reclaim / dead-letter katmanlarıyla daha dayanıklı hale getirilmiştir; yine de tam enterprise exactly-once queue değildir.
- Redis down / worker crash / shutdown handoff / stale reclaim / poison job sınırları `docs/RUNBOOK_AUTO_REACHED_QUEUE_DURABILITY_V1.md` ve `docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md` içinde resmi olarak tanımlıdır.
- Operasyonel ölçüm ve yönetim kapısı: `GET /api/admin/queues/auto-reached`, `GET /api/admin/queues/auto-reached/proof`, `GET /api/admin/queues/auto-reached/dead-letter`, `GET /api/admin/queues/auto-reached/thresholds`, `POST /api/admin/queues/auto-reached/dead-letter/:taskId/requeue`, `POST /api/admin/queues/auto-reached/dead-letter/:taskId/resolve`, `POST /api/admin/queues/auto-reached/incident-sync`.
- Incident/alarm kartı ve chaos proof notları `docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md` içinde yaşar; `verify:final` snapshot öncesi generated `web/dist`, `mobile/dist` ve `backend/dist` artığını temizler.
- Clean-clone doğrulama yolu: `tools\verify_clean_clone.ps1`.

## M90 odak noktası
- kanonik markdown hizası
- state/pack/verify uyumu
- ilk yürütülebilir kapanış kapısı: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- tek parça script rehberi
- screenshot bağımlılığını azaltan proof reformu
- repo hijyen kapanışı

## helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- Kör line-count reduction hedefi yoktur; kabul güvenli helper split yalnız `HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01` altında yürür.
- Agresif küçültme/refactor yapılmaz.
- Yalnız acceptance-safe lokal düzeltme ve companion helper split yapılabilir.
- M90C.1, M90C.2 ve M90C.3 kapanmıştır; helpComposer policy canonical docs içine işlenmiştir.
- Latest static milestone chain: `npm run verify:milestones` -> `node backend/scripts/run_m0_latest.js --static-only --to latest --continue`.
- Current live surface pack: `npm --prefix backend run current:surface`.
- Deep surface diagnostic wrapper: `tools/run_all_checks.ps1 -Deep` (current live surface pack + legacy parent/KVKK/retention/ops yüzeyleri).
- M91 local acceptance overlay: shift/agreement route preview ve kaynak vardiya bağlantısı `docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md` ile takip edilir.
- M92 repo verification spine: package scriptleri, tools wrapper, manifest, state ve runbook bağlantısı `npm run verify:repo` altında toplanır.

## schema.prisma decision
- `backend/prisma/schema.prisma` bu M90 hattında **justified exception** olarak korunur.
- Bu dosyada sırf line-count düşsün diye path/split refactor yapılmayacaktır.
- Gerekçe: schema tek dosyada migration + seed + Prisma client + repo-contract check hattının ortak referansıdır.
- M90 kapanış hattında schema split yapmak acceptance değeri üretmez; yüksek araçlama / migration / contract riski üretir.
- İzin verilen değişiklikler: migration-safe alan/model/enumeration ekleri, relation/index/constraint düzeltmeleri, acceptance-safe lokal şema tamiri.
- Bu karar, schema üzerinde çalışma yasağı değildir; yalnız line-count odaklı yapısal bölmeyi M90 dışında bırakır.
- Yeniden değerlendirme tetikleyicisi: M90 sonrası planlı tooling hazırlığı + explicit split ihtiyacı + contract/check hattının buna göre tasarlanması.

## hot-file queue policy
- Hot/large file kuyruğu yalnız sayısal repo-audit çıktısı değildir; resmi sınıflı queue olarak yönetilir.
- Kör line-count düşürme yapılmaz; önce acceptance, sonra kontrollü temizlik uygulanır.
- `backend/src/ai/chat/helpComposer.js` ve `backend/prisma/schema.prisma` queue içinde **justified exception** olarak kalır; `backend/src/ai/chat/helpComposerSafeReplies.js` helpComposer için acceptance-safe companion split yüzeyidir.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js` ve `web/src/panels/shared/CopilotPanel.jsx` **acceptance-sensitive / later** sınıfındadır; `mobile/App.js` shell kalır, yeni mobile iş helper/state/screen dosyalarına taşınır.
- `backend/src/ai/chat/copilotGuidedTaskEngine.js` **safe candidate review** kuyruğundadır.
- `web/src/panels/company/ShiftPeopleTab.jsx` **safe candidate review** kuyruğundadır.
- Bu queue, `tools/repo_contract_state.json` içindeki `hotFileQueuePolicy` alanı ve `repo_audit` çıktısı ile birlikte doğrulanır.
- Sıcak dosya borcu en son ele alınır; önce güvenlik, doğrulama, hygiene ve acceptance odaklı işler tamamlanır.

## export / package hygiene closure
- Satır azaltma en sona bırakılır; bu adım export güveni ve çalışma alanı hijyeni içindir.
- `.env`, build/dist artıkları, `backend/data/*.json` legacy residues, `data/*.json`, `artifacts/runtime-data/*.json` ve overlay/log kalıntıları shareable pakete giremez.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip üretimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.
- Fiziksel snapshot yüzeyi için ayrı soft gate: `npm run verify:snapshot`.
- `verify:snapshot` fiziksel dosya yüzeyini raporlar; ilk turda `verify:final` hattını bloklamaz.

## CI / verification visibility
- Repo-native görünür doğrulama zinciri: `npm run verify:ci`.
- Root verify zinciri backend + web lint çalıştırır; web lint kanonik kanıtı: `artifacts/lint/web_lint_latest.txt`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml` (historical/internal identifier).
- Fresh runner hazırlığı workflow içinde explicit: `npm --prefix backend ci` ve `npm --prefix web ci`.
- `repo-verification` işi root verify chain çalıştırır; `shareable-export` işi M90C.7 export hygiene pack çalıştırır.
- Artifact görünürlüğü: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- Satır azaltma en sona bırakılır; bu adım görünür doğrulama içindir.

## safe closure / final hygiene checklist
- Kanonik final doğrulama girişi: `npm run verify:final`.
- `verify:final`, önce `verify:repo` zincirini çalıştırır; sonra fiziksel snapshot soft gate raporunu yeniler.
- Bu komut web lint kanıtını `artifacts/lint/web_lint_latest.txt` dosyasına ve snapshot raporunu `artifacts/repo-audit/physical_snapshot_hygiene_latest.json` dosyasına yazar.
- Windows tarafında export/hijyen komutlarında tercih edilen kabuk: `pwsh`.
- Final closure sırası: `npm run verify:final` -> `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform` -> `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` içinde `tar.exe` / `.NET ZipFile` fallback korunur; `GetRelativePath` ve `ConvertFrom-Json -Depth` gibi PS5 uyumsuzlukları geri gelmez.
- Satır azaltma en sona bırakılır; bu adım yalnız güvenli kapanış ve hijyen checklist'idir.

## REPO_CONTRACT_MARKERS_V1
- PRIMER_LIVING_ROUTE_M59_M89_V1
- PRIMER_ROUTE_M63_V1
- PRIMER_ROUTE_M64_V1
- PRIMER_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- NO_FIELD_TEST_BEFORE_CONTROLLED_SIGNOFF_V1
- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1

## TTL_PRESETS_PARENT_PUBLIC_LINKS_V1
- Veli erişimi ve personel/öğrenci public link presetleri marker-first okunur.
- Süre presetleri: 1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl.
- Maksimum süre: 365 gün.

## PRIMER_WARN_CLEANUP_M90D_V1
- PRIMER_ROUTE_M45_RETENTION_BACKUP_V1
- PRIMER_ROUTE_M47_4_MOBILE_READINESS_V1
- PRIMER_ROUTE_M60_FIELD_ACCEPTANCE_V1
- PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1

## M47_4_MOBILE_READINESS_ROUTE_V1
- Compatibility note: m47.3 green, m47.4 next route.
- Marker-first route: mobile readiness web pass canonical bridge after m47.3.

## PERFORMANCE_EVIDENCE_20260427
- 2026-04-27 benchmark evidence doc: `docs/PERFORMANCE_EVIDENCE_20260427.md`
- 3000 vehicles, 30 cycles, 120s cadence, publish-only: 90,000 requests, p95 27.66ms, throttled 0.
- 3000 vehicles, 10 cycles, 120s cadence, readstorm: 30,000 GPS requests, 523,405 panel invalidations, p95 27.39ms, throttled 0.

## EVIDENCE_PACK_20260428
- Evidence index: `docs/EVIDENCE_PACK_20260428.md`
- Groups synthetic performance evidence, M93 queue proof, and remaining field checklist in one roof.
- Long soak artifact: `artifacts/benchmarks/gps_auto-reached_3000veh_30cycles_2026-04-29T05-12-16-959Z.json`
- Field capture template: `docs/SAHA_EVIDENCE_PACK_TEMPLATE.md`
- Field capture guide: `docs/MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md`
- Keeps the long-soak / chaos / pilot evidence conversation readable without scattering links across the repo.
- Temiz readstorm kanıtı: 3000 araç, 3 cycle, 9000 / 9000 OK, errors 0, throttled 0, p95 33.21ms.
- Not: `PASSWORD_CHANGE_REQUIRED` seed-user hijyen hatası kapanmıştır; önceki hatalar throughput problemi değildi.
- `OP-04` servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü olarak bağlar; `OP-01` readonly omurga, `OP-02` manuel not ve `OP-03` küçük kart korunur; settlement aktif değildir, komisyon hesaplama aktif değildir.
- `QLT-01` kalite puanı + sağlayıcı karşılaştırması hazırlık omurgasıdır; OP-01→OP-04 evidence chain bu hazırlığın temelidir ve kesin puan üretmez.
- `QLT-02` kontrollü kalite skoru taslak modelidir; `QLT-01` hazırlığı üstünden taslak skor üretir, `QLT-03` kontrollü kalite inceleme kararı sonraki görünür halkadır.
- `QLT-03` kontrollü kalite inceleme kararıdır; `QLT-04` kalite karar geçmişi / denetim izi görünürlük halkasıdır.

## M90C.9 SAFE CLOSURE / FINAL HYGIENE
- M90C.9 görünür closure hygiene milestone kaydıdır.
- Resmi çalışma rotası kontrollü M90 hattında kalır.
- Bu kayıt final hijyen standardını ve `npm run verify:final` kapanışını temsil eder.
## PRIMER_PERFORMANCE_CLEAN_READSTORM_3000_20260427
- 2026-04-27 temiz readstorm kanıtı: 3000 araç, 3 cycle, 120s cadence, 9000 / 9000 OK.
- Sonuç: throttled 0, errors 0, p95 33.21ms, p99 42.1ms.
- Panel yükü: 210 panel request, 179 panel reload, 125282 panel invalidation.
- PASSWORD_CHANGE_REQUIRED seed-user hijyen hatası kapandı; önceki benchmark hataları sistem yükü değil test datası hijyeniydi.

## M93 QUEUE DURABILITY PROOF
- M93, autoReachedQueue için queue dayanıklılık kanıtı ve görünürlük hattıdır.
- Kapsam: Redis down/up, worker restart reclaim, dead-letter görünürlüğü ve threshold kontrolü.
- Komut: `tools\pack_m93_queue_durability_proof.ps1 -RepoRoot D:\servis-platform`.
- Runtime probe: `backend/scripts/m93_queue_durability_runtime_probe.js`.
- Not: Bu proof exactly-once queue iddiası değildir; operasyonel dayanıklılık ve görünürlük kanıtıdır.
