# ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01

## Purpose
- room profitability and quote floor preview milestone; Finansal Operasyon ve Maliyet Yönetimi bloğundaki room profitability ve quote floor preview milestone'u.
- `check:roomprofitabilityandquotefloor01`, `docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md`, `backend/src/finance/roomProfitabilityAndQuoteFloor.js` ve `web/src/panels/shared/FinancialOperationsPanel.jsx` ile yaşar.
- Read-only / preview-only karar destek üretir.
- Herhangi bir write-action, DB call, network call veya model/agent execution açmaz.

## Canonical Files
- Check: `backend/scripts/room_profitability_and_quote_floor_01_check.js`
- Helper: `backend/src/finance/roomProfitabilityAndQuoteFloor.js`
- Shared panel: `web/src/panels/shared/FinancialOperationsPanel.jsx`
- Route wiring: `backend/src/routes/commercialCore.js`, `backend/src/routes/companyOverview.js`
- Frontend wiring: `web/src/api.js`, `web/src/App.jsx`, `web/src/layout/NavDock.jsx`, `web/src/copilot/screenRegistry.js`

## Product Positioning
- Oda tarafında kârlılık önizlemesini ve quote floor sınırını şeffaf biçimde gösterir.
- Company tarafında bütçe ve servis maliyeti önizlemesini aynı safety boundary içinde sunar.
- ROOM ve COMPANY yüzeyleri RBAC ile bağlanır.
- Yetkisiz COMPANY alt kimlikleri için güvenli denial mesajı döner.

## Existing Capability Reuse Map
- Dynamic Savings
  - `web/src/utils/routePreviewSummary.js`
  - `web/src/panels/shared/DynamicSavingsPreviewCard.jsx`
  - `web/src/utils/agreementCopilotFacts.js`
- Hakediş önizlemesi
  - `backend/src/ops/paymentPreview.js`
  - `backend/src/services/qualityPaymentBridgeService.js`
  - `web/src/components/PaymentPreviewReadonlyCard.jsx`
- Kalite kesintisi
  - `backend/src/ops/qualityReviewDecision.js`
  - `backend/src/ops/qualityDraftScore.js`
- Teklif analizi
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
- Sefer Abi maliyet cevapları
  - `backend/src/ai/chat/seferAbiReasoningAssistant.js`
  - `backend/src/ai/chat/helpComposer.js`
  - `backend/src/ai/chat/intentRouterCore.js`

## Surface Summary
- ROOM: room profitability, quote floor, route cost, vehicle cost, agreement margin preview.
- COMPANY: company budget, service cost, cost per person, room-specific denial.
- SUPER_ADMIN: full read-only preview ve RBAC açıklaması.

## Output Shape
- `allowed`
- `deniedByCompanyKind`
- `scope`
- `surfaceId`
- `snapshot`
- `operationalCostModel`
- `baselineOperationalCostMinor`
- `roomProfitability`
- `companyBudget`
- `quoteFloor`

## No Write-Action Boundary
- Dispatch application kapalı.
- Route application kapalı.
- Driver / vehicle assignment kapalı.
- Agreement execution kapalı.
- Payment / hakediş execution kapalı.
- Invoice create / update / delete kapalı.
- Accounting posting kapalı.
- Provider credential read/write/use kapalı.
- Message / email / SMS / push kapalı.
- Backend write route kapalı.
- DB migration kapalı.

## Validation Contract
- `check:roomprofitabilityandquotefloor01`
- `backend/src/finance/roomProfitabilityAndQuoteFloor.js`
- `web/src/panels/shared/FinancialOperationsPanel.jsx`
- `backend/src/routes/commercialCore.js`
- `backend/src/routes/companyOverview.js`
- `web/src/api.js`
- `web/src/App.jsx`
- `web/src/layout/NavDock.jsx`
- `web/src/copilot/screenRegistry.js`
- `package.json`
- `backend/scripts/run_product_extensions_check_chain.js`
- `backend/scripts/verify_chain_01_product_extensions_check.js`
- `backend/scripts/script_harness_consolidation_01_check.js`
- `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/PRIMER_SSOT.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- `docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md`
- No DB / network / model call
- No write-action
- Stage / commit / tag / push yok
- `debug.log` absent

## Next Milestone
- `COMPANY-BUDGET-AND-SERVICE-COST-01`
