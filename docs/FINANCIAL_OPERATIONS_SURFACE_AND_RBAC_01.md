# FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01

## Purpose
- Finansal Operasyon ve Maliyet Yönetimi bloğu için resmi scope registry.
- FINANCIAL OPERATIONS AND COST MANAGEMENT: ROOM için kendi `roomId` tenant'ında canonical gider defteri lifecycle'ı (taslak, güncelleme, açık onay ve maliyet önizlemesi), COMPANY için kendi lifecycle + preview yüzeyi; muhasebe programı değildir.
- Bu milestone maliyet motoru yazmaz, kârlılık hesaplaması yazmaz ve muhasebe programı açmaz.
- Amaç, ROOM ve COMPANY yüzeylerini preview/lifecycle/RBAC sınırında bağlamak ve #4 maliyet senaryosu önizlemesini güvenli biçimde görünür kılmaktır.

## Product Positioning
- SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve yapay zekâ ile maliyet/saha risklerini önceden yakalayan kurumsal servis operasyon platformudur.
- Bu blok, ürünün operasyon takip katmanını finansal karar desteğine genişletir.
- "Muhasebe programı değil; finansal operasyon ve maliyet yönetimi" ayrımı korunur.
- "Bu milestone’da hesaplama motoru değil, güvenli yüzey ve yetki sınırı hazırlanmıştır."
- "ROOM giderleri ve bu bounded çalışmanın açık onaylı gelir zinciri yalnız aynı `roomId` tenant'ında server-enforced olarak oluşturulur/güncellenir/doğrulanır; COMPANY budget lifecycle kendi tenant sınırında çalışır; Sefer Abi/copilot fatura, ödeme veya muhasebe icrası yapmaz."

## Role Access Matrix
| Role | Visible surfaces | Hidden surfaces | Notes |
| --- | --- | --- | --- |
| SUPER_ADMIN | finansal operasyon özeti, room profitability, route/vehicle/agreement preview, company budget preview, supplier price/quality compare, reconciliation preview, scenario forecast/savings, accounting export contract | tenant-sensitive ham payloadlar | policy, readiness ve reuse map görünür |
| ROOM | financial overview, `Tahsilat Kaydet` against an authorized linked invoice, gider defteri taslak/güncelleme/açık onay, room profitability, quote floor preview, route cost preview, vehicle cost preview, agreement margin preview, supplier compare, reconciliation preview, savings preview | company budget ham detayları, accounting export contract, başka room tenant'ının maaş/gider ayrıntıları | kendi `roomId` tenant'ında rutin finans lifecycle; müşteri ödeme beyanı beklenmez; ayrı maaş grant'i veya TOTP aranmaz |
| COMPANY | financial overview, company budget lifecycle, company service cost, cost per person, supplier compare, reconciliation preview, savings preview | room iç marj ve quote floor ham detayları, accounting export contract | company-centric lifecycle + preview önizleme |
| DRIVER | yok | tüm finansal operasyon yüzeyleri | güvenli denial mesajı |
| PERSONEL | yok | tüm finansal operasyon yüzeyleri | güvenli denial mesajı |
| PARENT | yok | tüm finansal operasyon yüzeyleri | default deny |
| SCHOOL | yalnız `scenario_forecast_savings` planlama önizlemesi | normal finansal operasyon yüzeyleri | planning-only / default deny |
| ORGANIZATION | yalnız `scenario_forecast_savings` planlama önizlemesi | normal finansal operasyon yüzeyleri | planning-only / default deny |

## Surface Registry
| Surface | Visible roles | Phase | Purpose |
| --- | --- | --- | --- |
| `financial_overview` | SUPER_ADMIN, ROOM, COMPANY | current | Blok giriş yüzeyi; ROOM için bağlı fatura üzerinden `Tahsilat Kaydet` |
| `room_profitability` | SUPER_ADMIN, ROOM | current | Oda kârlılık önizlemesi |
| `quote_floor_preview` | SUPER_ADMIN, ROOM | future-shell | Teklif tabanı için güvenli shell |
| `route_cost_preview` | SUPER_ADMIN, ROOM | current | Km / süre / rota maliyeti önizlemesi |
| `vehicle_cost_preview` | SUPER_ADMIN, ROOM | current | Araç / sürücü maliyeti önizlemesi |
| `agreement_margin_preview` | SUPER_ADMIN, ROOM | current | Sözleşme fiyatı ve marj önizlemesi |
| `company_budget` | SUPER_ADMIN, COMPANY | current | Şirket bütçesi yaşam döngüsü ve önizlemesi |
| `company_service_cost` | SUPER_ADMIN, COMPANY | current | Servis maliyeti önizlemesi |
| `cost_per_person` | SUPER_ADMIN, COMPANY | current | Kişi başı maliyet önizlemesi |
| `supplier_price_quality_compare` | SUPER_ADMIN, ROOM, COMPANY | current | Fiyat / kalite karşılaştırma önizlemesi |
| `hakedis_invoice_reconciliation_preview` | SUPER_ADMIN, ROOM, COMPANY | future-shell | Hakediş / invoice reconciliation preview + açık ROOM gelir oluşturma adımı |
| `scenario_forecast_savings` | SUPER_ADMIN, ROOM, COMPANY, SCHOOL, ORGANIZATION | current | Maliyet senaryosu / forecast; SCHOOL ve ORGANIZATION için yalnız planlama bağlamı |
| `accounting_export_contract` | SUPER_ADMIN | future-only | Muhasebe / ERP export kontratı shell |

## Future Milestone Mapping
- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`
- `OPERATIONAL-COST-MODEL-01`
- `OPERATIONAL-COST-MODEL-01`: `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` ile yaşar.
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`
- `COMPANY-BUDGET-AND-SERVICE-COST-01`: `check:companybudgetandservicecost01`, `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md`, `backend/src/finance/companyBudgetAndServiceCost.js` ve `backend/src/services/financialOperationsLifecycle.js` ile yaşar; company budget lifecycle + service cost preview katmanını bağlar.
- `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01`
- `COST-SCENARIO-FORECAST-AND-SAVINGS-01`
- `COST-SCENARIO-FORECAST-AND-SAVINGS-01`: `check:costscenarioforecastandsavings01`, `docs/COST_SCENARIO_FORECAST_AND_SAVINGS_01.md`, `backend/src/finance/costScenarioForecast.js`, `backend/src/routes/costScenario.js` ve `web/src/panels/shared/CostScenarioWorkspacePanel.jsx` ile yaşar; mevcut operasyon maliyet sahibini yeniden yazmaz, ephemeral preview üretir.
- `SEFER-ABI-COST-ANALYSIS-ASSISTANT-01`
- `ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01`

## Existing Capability Reuse Map
- Dynamic Savings
  - `web/src/utils/routePreviewSummary.js`
  - `web/src/panels/shared/DynamicSavingsPreviewCard.jsx`
  - `web/src/utils/agreementCopilotFacts.js`
- Hakediş önizlemesi
  - `backend/src/ops/paymentPreview.js`
  - `web/src/components/PaymentPreviewReadonlyCard.jsx`
  - `web/src/panels/company/CommercialFlowPanel.jsx`
  - `web/src/panels/superadmin/CommercialCorePanel.jsx`
- Kalite kesintisi
  - `backend/src/ops/qualityReviewDecision.js`
  - `backend/src/ops/qualityDraftScore.js`
  - `web/src/components/QualityReviewDecisionCard.jsx`
  - `web/src/components/QualityDraftScoreCard.jsx`
- Payment/quality bridge
  - `backend/src/services/qualityPaymentBridgeService.js`
  - `web/src/panels/shared/QualityPaymentBridgePreviewCard.jsx`
  - `web/src/panels/company/companyAgreementsBridgeSection.jsx`
  - `web/src/panels/room/roomAgreementsBridgeSection.jsx`
- Teklif analizi
  - `backend/src/ai/chat/copilotOfferAnalysis.js`
  - `docs/COPILOT_OFFER_ANALYSIS_01.md`
- Teklif önerisi
  - `backend/src/ai/chat/copilotOfferRecommendation.js`
  - `docs/COPILOT_OFFER_RECOMMENDATION_01.md`
- Pazarlık hazırlığı
  - `backend/src/ai/chat/copilotNegotiationAssist.js`
  - `docs/COPILOT_NEGOTIATION_ASSIST_01.md`
- Sözleşme fiyatları
  - `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
  - `backend/src/ai/chat/copilotDispatchActionPrep.js`
  - `web/src/utils/agreementCopilotFacts.js`
- Kilometre / rota maliyet yardımcıları
  - `web/src/utils/routePreviewSummary.js`
  - `backend/src/ops/operationProof.js`
- Araç / sürücü maliyet alanları
  - `web/src/panels/company/CommercialCorePanel.jsx`
  - `web/src/panels/room/CommercialCorePanel.jsx`
  - `web/src/panels/shared/OfferQualityRankingCard.jsx`
  - `web/src/utils/copilotFacts.js`
- Dashboard maliyet kartları
  - `web/src/panels/superadmin/CommercialCorePanel.jsx`
  - `web/src/panels/company/CommercialFlowPanel.jsx`
  - `web/src/panels/room/CommercialFlowPanel.jsx`
- Excel / CSV dışa aktarma
  - `backend/src/ops/paymentPreview.js`
  - `backend/src/routes/commercialCore.js`
  - `web/src/components/PaymentPreviewReadonlyCard.jsx`
- Sefer Abi maliyet cevapları
  - `backend/src/ai/chat/seferAbiReasoningAssistant.js`
  - `backend/src/ai/chat/helpComposer.js`
  - `backend/src/ai/chat/intentRouterCore.js`
  - `web/src/utils/copilotFacts.js`
  - `web/src/utils/agreementCopilotFacts.js`

## Excluded Scope
- ## Accounting / e-Fatura / e-Defter / tax exclusion
- `maliyet motoru`
- `kârlılık hesaplaması`
- `minimum teklif tabanı`
- `bütçe sapması`
- `hakediş/fatura reconciliation`
- uzun dönem senaryo/forecast geçmişi / otomatik forecast optimizasyonu
- `muhasebe export formatı`
- `ERP entegrasyonu`
- `e-Fatura`
- `e-Defter`
- `vergi programı`
- payment execution veya Sefer Abi/copilot hakediş icrası
- invoice update/delete; gelir zinciri oluşturma yalnız bounded ROOM action ile
- `accounting posting`
- `DB migration`
- Sefer Abi/copilot backend write route (bounded ROOM income route dışında)
- `provider credential read/write/use`
- `dispatch apply`
- `route apply`
- `driver/vehicle assignment`
- `message/email/SMS/push`
- Maliyet motoru yok.
- Kârlılık hesaplaması yok.
- Minimum teklif tabanı yok.
- Bütçe sapması yok.
- Hakediş / invoice reconciliation hesaplaması yok.
- Uzun dönem senaryo geçmişi ve otomatik forecast optimizasyonu yok; #4 ayrı ephemeral preview sahibidir.
- Muhasebe export formatı yok.
- ERP entegrasyonu yok.
- e-Fatura / e-Defter / vergi programı yok.
- Payment execution veya Sefer Abi/copilot hakediş icrası yok.
- Invoice update/delete yok; bounded ROOM gelir zinciri oluşturma action'ı explicit user approval ile sınırlıdır.
- Accounting posting yok.
- DB migration yok.
- Sefer Abi/copilot backend write route yok; bounded ROOM income route explicit onaylıdır.

## No Write-Action Boundary
- Genel finans yüzeyinde genel write-action yoktur; aşağıdaki dar ROOM gider defteri ve bounded gelir zinciri istisnaları kendi canonical action'larıyla sınırlıdır ve sınırı genişletmez.
- Doğrulanmış demo ortamında yetkili `ROOM` kullanıcı, aynı `roomId` kapsamında canonical Gider Yönetimi UI/API'sinden `RoomCostEntry` taslağı oluşturabilir, düzenleyebilir, açık onaylayabilir, audit'li düzeltebilir ve gerçekleşmiş gider için dağıtım kanıtı ekleyebilir. Sefer Abi/copilot bu yazma akışını çalıştıramaz.
- Bu istisna ödeme icrası, bordro icrası, dispatch, route veya cross-tenant yazma yetkisi vermez; tahsilat mevcut ayrı taslak/onay yolunda kalır, ACTUAL/BUDGET/FORECAST/ACCRUAL kovaları ayrı kalır ve KDV UNKNOWN net sonucu doğrulanmış sayılmaz.
- Sefer Abi/copilot hakediş veya fatura business-write yapmaz.
- Invoice update/delete yok; ROOM gelir zinciri ve `Tahsilat Kaydet` yalnız açık onaylı, mevcut canonical fatura/collection kaydına bağlı action'lardır.
- ROOM, COMPANY/SCHOOL/ORGANIZATION ödeme beyanı oluşturmadan, aynı `roomId` kapsamındaki yetkili mevcut fatura için tahsilat kaydedebilir. Müşteri, fatura tutarı, önceki tahsilatlar ve kalan alacak canonical engine'den okunur; ROOM yalnız tutar, tarih, yöntem ve isteğe bağlı dekont/referans girer.
- ROOM'un aynı müşteri altında birden fazla yetkili açık faturası varsa önce müşteri, sonra açık fatura seçilir. Tahsilat yalnız seçilen `invoiceId` kapsamına yazılır; sözleşme, hakediş, dönem ve varsa kabul edilmiş teklif bağı faturadan salt-okunur gösterilir. Teklif bağı yoksa veya belirsizse kullanıcıya bu durum açıkça bildirilir ve teklif numarası üretilmez.
- Kısmi tahsilat, kalan bakiye, fazla ödeme reddi, aynı isteğin replay/çift tıklama koruması, audit ve COMPANY/SCHOOL/ORGANIZATION görünürlüğü bu action'ın zorunlu kabul koşullarıdır. Manuel tahsilat banka tarafından doğrulanmış ödeme değildir.
- Yetkili bağlı fatura yoksa collection oluşturulmaz; dört sekmeli finans yüzeyi korunur ve kullanıcıya sade Türkçe açıklama ile fatura oluşturulması/bağlanması gereken sonraki adım gösterilir. Yeni sekme veya ikinci tahsilat motoru oluşturulmaz.
- accounting posting yok.
- ERP live integration yok.
- dispatch apply yok.
- route apply yok.
- driver/vehicle assignment yok.
- message/email/SMS/push yok.
- provider credential read/write/use yok.

## KVKK / PII / Tenant Isolation Boundary
- Role bazlı daraltma korunur.
- Tenant isolation korunur.
- Ham tedarikçi veya provider credential verisi gösterilmez.
- Hassas finansal veri yalnız yetkili role uygun preview olarak görünür.
- Cross-tenant raw detail açılmaz.

## Sefer Abi Boundary
- Sefer Abi bu milestone’da maliyet motoru çalıştırmaz.
- Yalnızca "Bu finansal operasyon yüzeyi için yetki ve kapsam hazır; hesaplama motoru sonraki milestone’da tamamlanacak." diyebilir.
- "Bu alan karar destek amaçlıdır; muhasebe/fatura/ödeme işlemi yapmaz." diyebilir.
- "Rolünüzün görebileceği finansal yüzeyleri hazırlıyorum; yetkisiz veya hassas alanlar gösterilmez." diyebilir.
- "Bu ay maliyet neden arttı?" gibi sorular sonraki cost assistant milestone’una bırakılır.

## UI / Surface Notes
- Eğer web mimarisi izin verirse ROOM için minimal preview shell/card, COMPANY için lifecycle + preview shell/card açılır.
- Yetkisiz durumda net Türkçe RBAC mesajı gösterilir.
- UI metinleri "Finansal Operasyon ve Maliyet Yönetimi", "muhasebe programı değildir", "preview/lifecycle/karar destek" çizgisini korur.
- UI hiçbir şekilde işlem yapılmış gibi iddia eden ifadeler kullanmaz.

## Validation Contract
- `check:financialoperationssurfaceandrbac01`
- `E2E/FIN3_INVOICE_COLLECTION` and `E2E/FIN5_ROLE_SYNC` remain independently open until this ROOM collection contract is proven on canonical/public Chromium.
- `backend/src/finance/financialOperationsScope.js`
- `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md`
- `package.json`
- `backend/scripts/run_product_extensions_check_chain.js`
- `backend/scripts/verify_chain_01_product_extensions_check.js`
- `backend/scripts/script_harness_consolidation_01_check.js`
- `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/PRIMER_SSOT.md`
- `docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- No DB/network/model/API call
- No assistant/copilot write-action; bounded ROOM income action dışında
- No stage/commit/tag/push
- debug.log absent

## Validation Results
- Read-only scope registry only.
- No cost engine.
- Sefer Abi/copilot write route yok; bounded ROOM gelir route'u vardır.
- No migration.
- No accounting execution.
- No payment execution.
- Tenant isolation kept.
- RBAC kept.
- ROOM visible surfaces are read-only/preview only; COMPANY budget surface includes lifecycle actions.
- SUPER_ADMIN visible surfaces cover the full registry.
- DRIVER / PERSONEL denied surfaces stay empty.

## Next Milestone
- `OPERATIONAL-COST-MODEL-01`: `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js`
