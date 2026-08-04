# COMPANY-BUDGET-AND-SERVICE-COST-01

## Purpose
- Finansal Operasyon ve Maliyet Yönetimi bloğundaki company-centric read-only preview milestone.
- Amaç, COMPANY için bütçe, servis maliyeti, kişi başı maliyet ve tedarikçi karşılaştırmasını güvenli önizleme olarak göstermek.
- Bu milestone muhasebe programı değildir.
- Bu milestone room iç marj, quote floor, dispatch apply, route apply veya write-action açmaz.

## Scope
- COMPANY yüzeyi: budget, service cost, cost per person, supplier compare, empty states.
- ROOM yüzeyi: room profitability ve quote floor özel kalır; COMPANY tarafına taşınmaz.
- Preview sonucu karar destek amaçlıdır.
- Çıktı read-only/preview/karar destek olarak kalır.

## Reuse Map
- `backend/src/finance/companyBudgetAndServiceCost.js`
- `backend/src/finance/financialOperationsScope.js`
- `backend/src/routes/companyOverview.js`
- `web/src/panels/shared/FinancialOperationsPanel.jsx`
- `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- `docs/PRIMER_SSOT.md`
- `docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md`

## No Write-Action Boundary
- Write-action yok.
- payment/hakediş execute yok.
- invoice create/update/delete yok.
- accounting posting yok.
- ERP integration yok.
- provider credential read/write/use yok.
- dispatch apply yok.
- route apply yok.
- driver/vehicle assignment yok.
- message/email/SMS/push yok.

## Hidden From COMPANY
- room internal cost yok.
- room margin yok.
- quote floor ham detayları yok.
- supplier selection yok.
- offer accept/reject yok.
- route/dispatch/write side-effect yok.

## Validation Contract
- `check:companybudgetandservicecost01`
- `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md`
- `backend/src/finance/companyBudgetAndServiceCost.js`
- `backend/src/routes/companyOverview.js`
- `web/src/panels/shared/FinancialOperationsPanel.jsx`
- `package.json`
- `backend/scripts/run_product_extensions_check_chain.js`
- `backend/scripts/verify_chain_01_product_extensions_check.js`
- `backend/scripts/script_harness_consolidation_01_check.js`
- `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md`
- `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/PRIMER_SSOT.md`
- `docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- No DB/network/model call
- No stage/commit/tag/push
- debug.log absent

## Validation Notes
- COMPANY preview read-only olarak çalışır.
- Budget ve service cost birlikte görünür.
- Tedarikçi karşılaştırması otomatik seçim yapmaz.
- Eksik veri varsa empty state gösterilir.
- ROOM iç detaylar COMPANY yüzeyine sızmaz.

## Next Milestone
- `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01`
