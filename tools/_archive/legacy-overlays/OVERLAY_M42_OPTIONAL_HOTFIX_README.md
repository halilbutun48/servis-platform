# M42 Optional Hotfix

Bu hotfix sadece `backend/scripts/m42_optional_check.js` dosyasını düzeltir.

## Düzeltilenler
- `_harness.js` ile uyumsuz `loginAs` importu kaldırıldı
- doğru helper: `loginFirst`
- hardcoded `personelId=1` kaldırıldı
- test için shift üstünden kendi personel kaydını oluşturup ID'yi dinamik alır
- scan testi seeded driver kullanıcısının gerçek `driverId`si ile çalışır

## Sonra çalıştır
```powershell
.\tools\pack_m42_optional.ps1
```
