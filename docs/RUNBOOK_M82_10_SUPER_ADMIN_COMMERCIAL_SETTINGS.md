# RUNBOOK — M82.10 Super Admin ticari ayarlar

## Amaç
M82.9 ile kurulan dormant payment backbone üzerine Super Admin yönetim yüzeyi açılır.

Bu fazda hedef:
- global `paymentMode` yönetimi
- global komisyon oranı (`bps`) yönetimi
- oda bazlı komisyon / payment mode override
- override kapatma

Gerçek charge / payout yine kapalıdır. Bu faz yalnız ayar omurgasını ve yönetim yüzeyini açar.

## Repo yüzeyi
- Backend servis: `backend/src/services/paymentBackbone.js`
- Backend route: `backend/src/routes/commercialCore.js`
- Backend check: `backend/scripts/m82_10_super_admin_commercial_settings_check.js`
- Web yüzeyi: `web/src/panels/superadmin/CommercialCorePanel.jsx`
- Pack: `tools/pack_m82_10_super_admin_commercial_settings.ps1`

## Açılan endpointler
- `GET /api/commercial-core/payment-backbone/settings`
- `POST /api/commercial-core/payment-backbone/settings/global`
- `POST /api/commercial-core/payment-backbone/settings/room`
- `DELETE /api/commercial-core/payment-backbone/settings/room/:roomId`

## Beklenen davranış
1. Super Admin global mode ve komisyonu kaydeder.
2. Yeni ticari kaynaklar bu global ayarı snapshot olarak alır.
3. Belirli bir oda için override tanımlanırsa, o odaya ait yeni kaynaklar override ayarını snapshot olarak alır.
4. Override kapatılırsa oda tekrar global ayara döner.
5. Eski commercial source kayıtları geçmiş snapshot olduğu için geriye dönük değişmez.

## Doğrulama
```powershell
cd D:\servis-platform\backend
npm run m82_10check
powershell -ExecutionPolicy Bypass -File ..\tools\pack_m82_10_super_admin_commercial_settings.ps1 -RepoRoot D:\servis-platform
```

## UI rota
- `/superadmin/commercial-core`

Bu ekranda artık:
- readonly ticari omurga özeti
- global ayar kartı
- oda bazlı override kartı
- aktif oda override listesi

birlikte görünür.

## Sonraki blok
- `M82.11` Payment readonly ticari yüzey
