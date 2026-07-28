# OPERATIONAL-COST-MODEL-01

## Purpose
- Finansal Operasyon ve Maliyet Yönetimi bloğundaki pure deterministic cost model milestone'u.
- `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` ile yaşar.
- Read-only / preview-only karar destek üretir.
- Herhangi bir write-action, DB call, network call veya model/agent execution açmaz.
- Sonraki güvenli aşama: `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`.

## Canonical Files
- Check: `backend/scripts/operational_cost_model_01_check.js`
- Model orchestration: `backend/src/finance/operationalCostModel.js`
- Math / parsing helper: `backend/src/finance/operationalCostMath.js`
- Upstream RBAC / surface owner: `backend/src/finance/financialOperationsScope.js`

## Product Positioning
- Bu milestone, mevcut dynamic savings, hakediş önizleme, kalite kesintisi, teklif analizi, sözleşme fiyatları, kilometre / rota maliyet yardımcıları, araç / sürücü maliyet alanları, dashboard maliyet kartları, Excel / CSV dışa aktarma ve Sefer Abi maliyet cevaplarını ortak bir maliyet motorunda toplar.
- Full muhasebe programı değildir.
- e-Fatura, e-Defter, vergi programı, ödeme yürütme ve fatura oluşturma açmaz.
- Room ve Company yüzeyleri için RBAC sonrası güvenli preview girdisi üretir.

## Existing Capability Reuse Map
- Dynamic Savings
  - `web/src/utils/routePreviewSummary.js`
  - `web/src/panels/shared/DynamicSavingsPreviewCard.jsx`
- Hakediş önizlemesi
  - `backend/src/ops/paymentPreview.js`
  - `backend/src/services/qualityPaymentBridgeService.js`
  - `web/src/components/PaymentPreviewReadonlyCard.jsx`
- Kalite kesintisi
  - `backend/src/ops/qualityReviewDecision.js`
  - `backend/src/ops/qualityDraftScore.js`
- Teklif analizi / teklif önerisi
  - `backend/src/ai/chat/copilotOfferAnalysis.js`
  - `backend/src/ai/chat/copilotOfferRecommendation.js`
- Sözleşme fiyatları
  - `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
  - `backend/src/ai/chat/copilotDispatchActionPrep.js`
  - `web/src/utils/agreementCopilotFacts.js`
- Kilometre ve rota maliyet yardımcıları
  - `web/src/utils/routePreviewSummary.js`
  - `backend/src/ops/operationProof.js`
- Araç / sürücü maliyet alanları
  - `web/src/panels/company/CommercialCorePanel.jsx`
  - `web/src/panels/room/CommercialCorePanel.jsx`
- Dashboard maliyet kartları
  - `web/src/panels/superadmin/CommercialCorePanel.jsx`
  - `web/src/panels/company/CommercialFlowPanel.jsx`
  - `web/src/panels/room/CommercialFlowPanel.jsx`
- Excel / CSV dışa aktarma
  - `backend/src/ops/paymentPreview.js`
  - `backend/src/routes/commercialCore.js`
- Mevcut Sefer Abi maliyet cevapları
  - `backend/src/ai/chat/seferAbiReasoningAssistant.js`
  - `backend/src/ai/chat/helpComposer.js`
  - `backend/src/ai/chat/intentRouterCore.js`

## Input Contract
- Girişler minor-unit veya normal sayısal alanlar olabilir.
- Para birimi `TRY` varsayımlı olabilir; açık para birimi seçimi karışık ise model bloke olur.
- Mesafe üçlüsü `serviceDistanceKm`, `emptyDistanceKm`, `totalDistanceKm` tutarlı şekilde normalize edilir.
- Tahsis alanları `allocationShiftsPerMonth`, `allocationServiceDaysPerMonth` ve `allocationMonthFraction` ile çalışır.
- Harici preview düzeltmeleri yalnızca preview görünümündedir.

## Cost Component Registry
| Key | Role | Formula | Boundary |
| --- | --- | --- | --- |
| `fuel` | Yakıt | `totalDistanceKm × fuelConsumptionLitersPer100Km / 100 × fuelUnitPriceMinor` | Fuel dışındaki km maliyetleriyle çakışmaz |
| `vehicle_fixed_allocated` | Araç sabit maliyet tahsisi | Sabit aylık toplamın shift/day/fraction tahsisi | Tek bir allocation mode kullanılır |
| `vehicle_variable` | Araç değişken maliyet | `maintenance + tire + depreciation + cleaning + wear + other` | Tahmini per-km / monthly double-count guard uygulanır |
| `driver_labor` | Sürücü işçilik maliyeti | `driverBasePerShiftMinor × shiftCount + meal/social/other` veya saat bazlı varyant | Base per shift ile hourly mode ayrıdır |
| `waiting_and_overtime` | Bekleme / fazla süre | `waitingMinutes × waitingRate / 60 + overtimeMinutes × overtimeRate / 60` | Base labor'dan ayrıdır |
| `route_fees` | Rota ücretleri | `toll + bridge + highway + parking + terminal + otherDirectRouteFee` veya aggregate `routeFeeMinor` | Detail/aggregate overlap guard vardır |
| `operations_overhead` | Operasyonel genel gider | `fixed + per_shift + rate_bps(base explicit) + dispatch control + tracking tech + other` | Recursive rate base engellenir |
| `other_direct_cost` | Diğer doğrudan maliyet | `otherDirectCostMinor` | Basit direct bucket |
| `external_preview_adjustments` | Harici preview düzeltmeleri | `quality + hakediş + contractual` preview toplamı | Baseline'a girmez |

## Money / Currency Policy
- Minor-unit akışı korunur.
- Yuvarlama `roundMinor` davranışıyla yapılır.
- `currencyCode` yoksa `TRY` varsayılır.
- Karışık para birimi kabul edilmez.
- Tanımsız para birimi uyarı üretir ama write-action açmaz.

## Output Shape
- `modelVersion`
- `calculationId`
- `status`
- `currencyCode`
- `baselineOperationalCostMinor`
- `includedComponentTotalMinor`
- `externalPreviewAdjustmentsMinor`
- `adjustedPreviewCostMinor`
- `components`
- `componentSummaries`
- `unitCosts`
- `normalizedInput`
- `missingFields`
- `invalidFields`
- `warnings`
- `blockers`
- `doubleCountWarnings`
- `currencyWarnings`
- `dataQuality`
- `confidence`
- `evidence`
- `formulaTrace`
- `summaryText`
- `nextSafeStepText`
- `readOnly`
- `previewOnly`
- `writeAction`
- `notPersisted`
- `notInvoiced`
- `notPaid`
- `notPostedToAccounting`
- `noQuoteFloor`
- `noProfitabilityDecision`

## No Write-Action Boundary
- Dispatch apply yok.
- Route apply yok.
- Driver / vehicle assign yok.
- Agreement execute yok.
- Payment / hakediş execute yok.
- Invoice create / update / delete yok.
- Accounting posting yok.
- Provider credential read/write/use yok.
- Message / email / SMS / push yok.

## Accounting / e-Fatura / e-Defter / Tax Exclusion
- Full muhasebe programı değildir.
- e-Fatura yok.
- e-Defter yok.
- Vergi programı yok.
- ERP live integration yok.
- Muhasebe export contract shell'i bu milestone'da açılmaz.

## Data Quality and Confidence
- Eksik veri varsa `incomplete`.
- Karışık veya geçersiz veri varsa `blocked`.
- Kısmi ama okunabilir önizleme `partial`.
- Tam, deterministic ve readonly hesap `complete`.
- Double-count ve kaynak çakışmaları warning olarak taşınır.

## Validation Contract
- `backend/scripts/operational_cost_model_01_check.js`
- `backend/src/finance/operationalCostModel.js`
- `backend/src/finance/operationalCostMath.js`
- `package.json`
- `backend/scripts/run_product_extensions_check_chain.js`
- `backend/scripts/verify_chain_01_product_extensions_check.js`
- `backend/scripts/script_harness_consolidation_01_check.js`
- `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/PRIMER_SSOT.md`
- `docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- No DB / network / model call
- No write-action
- Stage / commit / tag / push yok
- `debug.log` absent

## Next Milestone
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`
