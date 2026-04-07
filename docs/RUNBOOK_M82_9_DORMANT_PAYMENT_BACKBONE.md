# RUNBOOK — M82.9 Dormant payment backbone

## Amaç
Agreement ve agreement dışı shift-series kayıtları için gerçek tahsilat/payout açmadan payment/commission omurgasını kurmak.

## Bu turda eklenenler
- `PaymentMode = OFF | OPTIONAL | REQUIRED`
- `CommissionRule`
- `PaymentAccount`
- `CommercialSource`
- `SettlementPlan`
- `SettlementEntry`
- `providerAdapters.DORMANT`
- agreement create/update -> dormant ticari snapshot
- shift / shift-series create-split -> dormant ticari snapshot
- Super Admin `/superadmin/commercial-core` ekranında readonly backbone özeti

## Repo içi ana dosyalar
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260407103000_m82_9_dormant_payment_backbone/migration.sql`
- `backend/src/services/paymentBackbone.js`
- `backend/src/routes/agreements.js`
- `backend/src/routes/shifts/company.js`
- `backend/src/routes/shifts/room.js`
- `backend/src/routes/commercialCore.js`
- `backend/scripts/m82_9_dormant_payment_backbone_check.js`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `tools/pack_m82_9_dormant_payment_backbone.ps1`

## Doğrulama
1. `cd backend && npm run m82_9check`
2. `tools\pack_m82_9_dormant_payment_backbone.ps1 -RepoRoot D:\servis-platform`
3. Super Admin ile `/superadmin/commercial-core` aç; dormant payment backbone kartlarını gör

## Beklenen davranış
- agreement oluştuğunda ya da ticari terms güncellendiğinde `CommercialSource(sourceType=AGREEMENT)` oluşur/güncellenir
- agreement dışı shift kökü oluştuğunda `CommercialSource(sourceType=SHIFT_SERIES)` oluşur/güncellenir
- aktif komisyon kuralı yoksa sistem `paymentMode=OFF`, `commissionBps=0` ile dormant snapshot üretir
- gerçek charge / payout oluşmaz; yalnız settlement hazırlık kayıtları oluşur

## Sonraki blok
- `M82.10` Super Admin ticari ayarlar
- global payment mode
- global komisyon oranı
- oda bazlı komisyon override
