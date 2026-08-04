# FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01

## Purpose
- Finansal Operasyon ve Maliyet Yönetimi bloğu için resmi scope registry.
- FINANCIAL OPERATIONS AND COST MANAGEMENT: read-only/preview/karar destek yüzeyi; muhasebe programı değildir.
- Bu milestone maliyet motoru yazmaz, kârlılık hesaplaması yazmaz ve muhasebe programı açmaz.
- Amaç, ROOM ve COMPANY yüzeylerini read-only/preview/RBAC sınırında bağlamaktır.

## Product Positioning
- SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve yapay zekâ ile maliyet/saha risklerini önceden yakalayan kurumsal servis operasyon platformudur.
- Bu blok, ürünün operasyon takip katmanını finansal karar desteğine genişletir.
- "Muhasebe programı değil; finansal operasyon ve maliyet yönetimi" ayrımı korunur.
- "Bu milestone’da hesaplama motoru değil, güvenli yüzey ve yetki sınırı hazırlanmıştır."
- "Veriler read-only/preview olarak gösterilir; fatura, ödeme veya muhasebe kaydı oluşturulmaz."

## Role Access Matrix
| Role | Visible surfaces | Hidden surfaces | Notes |
| --- | --- | --- | --- |
| SUPER_ADMIN | finansal operasyon özeti, room profitability, route/vehicle/agreement preview, company budget preview, supplier price/quality compare, reconciliation preview, scenario forecast/savings, accounting export contract | tenant-sensitive ham payloadlar | policy, readiness ve reuse map görünür |
| ROOM | financial overview, room profitability, quote floor preview, route cost preview, vehicle cost preview, agreement margin preview, supplier compare, reconciliation preview, savings preview | company budget ham detayları, accounting export contract | room-centric read-only önizleme |
| COMPANY | financial overview, company budget, company service cost, cost per person, supplier compare, reconciliation preview, savings preview | room iç marj ve quote floor ham detayları, accounting export contract | company-centric read-only önizleme |
| DRIVER | yok | tüm finansal operasyon yüzeyleri | güvenli denial mesajı |
| PERSONEL | yok | tüm finansal operasyon yüzeyleri | güvenli denial mesajı |
| PARENT | yok | tüm finansal operasyon yüzeyleri | default deny |
| SCHOOL | yok | tüm finansal operasyon yüzeyleri | default deny |
| ORGANIZATION | yok | tüm finansal operasyon yüzeyleri | default deny |

## Surface Registry
| Surface | Visible roles | Phase | Purpose |
| --- | --- | --- | --- |
| `financial_overview` | SUPER_ADMIN, ROOM, COMPANY | current | Blok giriş yüzeyi |
| `room_profitability` | SUPER_ADMIN, ROOM | current | Oda kârlılık önizlemesi |
| `quote_floor_preview` | SUPER_ADMIN, ROOM | future-shell | Teklif tabanı için güvenli shell |
| `route_cost_preview` | SUPER_ADMIN, ROOM | current | Km / süre / rota maliyeti önizlemesi |
| `vehicle_cost_preview` | SUPER_ADMIN, ROOM | current | Araç / sürücü maliyeti önizlemesi |
| `agreement_margin_preview` | SUPER_ADMIN, ROOM | current | Sözleşme fiyatı ve marj önizlemesi |
| `company_budget` | SUPER_ADMIN, COMPANY | current | Şirket bütçesi önizlemesi |
| `company_service_cost` | SUPER_ADMIN, COMPANY | current | Servis maliyeti önizlemesi |
| `cost_per_person` | SUPER_ADMIN, COMPANY | current | Kişi başı maliyet önizlemesi |
| `supplier_price_quality_compare` | SUPER_ADMIN, ROOM, COMPANY | current | Fiyat / kalite karşılaştırma önizlemesi |
| `hakedis_invoice_reconciliation_preview` | SUPER_ADMIN, ROOM, COMPANY | future-shell | Hakediş / invoice reconciliation preview |
| `scenario_forecast_savings` | SUPER_ADMIN, ROOM, COMPANY | future-shell | Tasarruf senaryosu / forecast |
| `accounting_export_contract` | SUPER_ADMIN | future-only | Muhasebe / ERP export kontratı shell |

## Future Milestone Mapping
- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`
- `OPERATIONAL-COST-MODEL-01`
- `OPERATIONAL-COST-MODEL-01`: `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` ile yaşar.
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`
- `COMPANY-BUDGET-AND-SERVICE-COST-01`: `check:companybudgetandservicecost01`, `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md` ve `backend/src/finance/companyBudgetAndServiceCost.js` ile yaşar; company budget ve service cost preview katmanını read-only tutar.
- `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01`
- `COST-SCENARIO-FORECAST-AND-SAVINGS-01`
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
- `senaryo/forecast`
- `muhasebe export formatı`
- `ERP entegrasyonu`
- `e-Fatura`
- `e-Defter`
- `vergi programı`
- `payment/hakediş execute`
- `invoice create/update/delete`
- `accounting posting`
- `DB migration`
- `backend write route`
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
- Senaryo / forecast motoru yok.
- Muhasebe export formatı yok.
- ERP entegrasyonu yok.
- e-Fatura / e-Defter / vergi programı yok.
- Payment / hakediş execute yok.
- Invoice create/update/delete yok.
- Accounting posting yok.
- DB migration yok.
- Backend write route yok.

## No Write-Action Boundary
- Write-action yok.
- payment/hakediş execute yok.
- invoice create/update/delete yok.
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
- Eğer web mimarisi izin verirse ROOM ve COMPANY için yalnızca minimal read-only shell/card açılır.
- Yetkisiz durumda net Türkçe RBAC mesajı gösterilir.
- UI metinleri "Finansal Operasyon ve Maliyet Yönetimi", "muhasebe programı değildir", "read-only/preview/karar destek" çizgisini korur.
- UI hiçbir şekilde işlem yapılmış gibi iddia eden ifadeler kullanmaz.

## Validation Contract
- `check:financialoperationssurfaceandrbac01`
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
- No write-action
- No stage/commit/tag/push
- debug.log absent

## Validation Results
- Read-only scope registry only.
- No cost engine.
- No write route.
- No migration.
- No accounting execution.
- No payment execution.
- Tenant isolation kept.
- RBAC kept.
- ROOM and COMPANY visible surfaces are read-only/preview only.
- SUPER_ADMIN visible surfaces cover the full registry.
- DRIVER / PERSONEL denied surfaces stay empty.

## Next Milestone
- `OPERATIONAL-COST-MODEL-01`: `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js`
