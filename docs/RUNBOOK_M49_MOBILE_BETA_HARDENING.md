# RUNBOOK — M49 MOBILE BETA HARDENING

Tarih: 2026-03-15  
Timezone: Europe/Istanbul

## Amaç
`M49`, mevcut sürücü mobil foundation iskeletini **beta hardening** odağıyla beta kullanıma daha dayanıklı hale getirir.

Bu adımın hedefi:
- login akışını değiştirmeden beta guardrail eklemek
- app `active` olunca otomatik tazeleme yapmak
- 30 sn periyodik yenileme ile veri bayatlamasını azaltmak
- backend `health` pingi ile temel erişim tanısı göstermek
- API tabanı + deviceId + son senkron bilgilerini görünür yapmak
- `Guvenli cikis` ile refresh session revoke denemek

Bu adım henüz şunları tam açmaz:
- arka plan GPS publish
- foreground service / background task
- offline queue ile görev operasyonu
- voice guidance
- stop ETA rafinesi

## Dosyalar
- `mobile/App.js`
- `mobile/src/lib/api.js`
- `mobile/src/screens/TodayScreen.js`
- `mobile/scripts/m49_mobile_beta_hardening_check.js`
- `tools/pack_m49_mobile_beta_hardening.ps1`
- `tools/check_m49_mobile_beta_hardening_repo_contract.ps1`
- `docs/RUNBOOK_M49_MOBILE_BETA_HARDENING.md`

## Ne değişti?
- App active olunca otomatik yenileme vardır.
- 30 sn periyodik kontrol vardır.
- `Today` ekranında `Beta durum` kartı vardır.
- Bu kart API taban, Device ID, son basarili senkron ve son hata bilgisini gosterir.
- `Guvenli cikis` refresh session kapatma denemesi yapar; sonra lokal oturum temizlenir.
- Driver login ana akisi yine `Surucu Kodu + PIN` olarak kalir.

## Kanıt komutu
```powershell
.\tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform
```

## Kapsam sınırı
Bu adım beta sertleştirmesidir.
`M49.1` ve sonraki mobil adımlarda acilacaklar:
- voice guidance
- stop ETA iyilestirmesi
- gorev operasyon butonlari
- daha ileri GPS publish davranisi
