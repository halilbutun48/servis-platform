# RUNBOOK — M50 MOBILE RELEASE READINESS

Tarih: 2026-03-15  
Timezone: Europe/Istanbul

## Amaç
`M50`, mevcut sürücü mobil hattını **mobile release readiness** seviyesine taşır.

Bu adımın hedefi:
- `Surucu Kodu + PIN` akışını koruyarak release öncesi son paketleme hazırlığını toplamak
- `EAS Build` ile preview / production profillerini tanımlamak
- `runtimeVersion` ve `updates` politikasını açık hale getirmek
- `.env.example` ile API tabanı örneğini görünür kılmak
- `Today` ekranında release hazırlığı özetini göstermek
- Android ilk yayin için sade bir checklist bırakmak

## Dosyalar
- `mobile/package.json`
- `mobile/app.json`
- `mobile/eas.json`
- `mobile/.env.example`
- `mobile/App.js`
- `mobile/src/screens/TodayScreen.js`
- `mobile/scripts/m50_mobile_release_readiness_check.js`
- `tools/pack_m50_mobile_release_readiness.ps1`
- `tools/check_m50_mobile_release_readiness_repo_contract.ps1`
- `docs/RUNBOOK_M50_MOBILE_RELEASE_READINESS.md`

## Ne değişti?
- `EAS Build` için `preview` ve `production` profilleri tanımlandı.
- `app.json` içinde `runtimeVersion` ve `updates` politikası eklendi.
- `mobile/.env.example` içinde `EXPO_PUBLIC_API_BASE_URL` örneği eklendi.
- `Today` ekranında `Release hazirligi` kartı görünür.
- Bu kart uygulama sürümü, release hedefi, build profilleri, EAS Build ve Expo Go durumunu özetler.
- Android ilk yayin hedefi net yazılır; ayrı iOS release hattı bu adımda açılmaz.
- Driver login ana akışı yine `Surucu Kodu + PIN` olarak kalır.

## Kanıt komutu
```powershell
.	ools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform
```

## Kapsam sınırı
Bu adım release hazırlığıdır.
Henüz açılmayanlar:
- app store / play console gerçek yayın metadata yükleme
- crash analytics / remote logging entegrasyonu
- arka plan GPS publish politikasının store release seviyesinde sertleştirilmesi
- iOS store dağıtımı
