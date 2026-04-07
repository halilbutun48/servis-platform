# M82.11 — Payment readonly ticari yüzey

Amaç: dormant payment backbone verisini agreement ve vardiya/vardiya serisi ekranlarında görünür kılmak.

## Bu fazda açılan görünür alanlar
- agreement satırlarında readonly ticari özet
- company vardiya satırlarında readonly ticari özet
- room vardiya satırlarında readonly ticari özet
- payment mode snapshot
- komisyon snapshot
- settlement hazırlık durumu
- dormant adapter görünürlüğü

## Teknik omurga
- `backend/src/services/paymentBackbone.js`
  - `buildAgreementCommercialBackboneMap`
  - `buildShiftCommercialBackboneMap`
- `backend/src/routes/agreements.js`
- `backend/src/routes/shifts/shared.js`
- `web/src/components/CommercialReadonlySummary.jsx`

## Kanonik kontrol
- `cd backend && npm run m82_11check`

## Resmi pack
- `tools\pack_m82_11_payment_readonly_surface.ps1 -RepoRoot D:\servis-platform`

## Beklenen davranış
- agreement kaydında dormant ticari snapshot görünür
- agreement kaynaklı shiftte aynı snapshot readonly görünür
- agreement dışı kısa iş / vardiya serisinde shift series snapshot görünür
- gerçek charge / payout yine kapalı kalır
