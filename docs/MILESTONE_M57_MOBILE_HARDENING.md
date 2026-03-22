# MILESTONE — M57 MOBILE HARDENING

Tarih: 2026-03-18  
Durum: **M57 resmi green**

## Scope
M57, mevcut surucu telefon uygulamasinin
- foreground GPS publish
- offline/online toparlama
- session failure UX
- KVKK blocking gorunurlugu
- Android preview/internal build disiplini
konularinda sertlestirilmesidir.

## Alt parcali kapanis
1. `M57.1` Foreground GPS publish + izin kapisi + `Ayarlari ac` ✅
2. `M57.2` Offline/online toparlama + retry dili ✅
3. `M57.3` Session failure + KVKK blocking gorunurlugu ✅
4. `M57.4` Android preview/internal build disiplini + runbook/pack ✅

## M57.4 repo kapsami
- `mobile/app.json` icinde release stage ve build track metadatasi sabitlendi.
- `mobile/eas.json` preview/internal APK ve production AAB ayrimini acik yazar.
- `mobile/.env.example` release stage env ornegini tasir.
- `mobile/package.json` icine `check:m57.4` ve `build:internal:android` alias'i eklendi.
- `Today` ekranindaki release hazirligi karti Android preview / production bundle / env asamasi satirlarini gosterir.
- `tools/pack_m57_mobile_hardening.ps1` artik `M57.1 -> M57.4` zincirini birlikte dogrular.
- `tools/_packs/pack_m42_m58.ps1 -To 57` canonical olarak full M57 phase rerun komutudur.

## Cikis artefaktlari
- `docs/RUNBOOK_M57_MOBILE_HARDENING.md`
- `tools/pack_m57_mobile_hardening.ps1`
- `tools/check_m57_mobile_hardening_repo_contract.ps1`
- `tools/_packs/pack_m42_m58.ps1 -To 57`
- `mobile/scripts/m57_1_foreground_gps_publish_check.js`
- `mobile/scripts/m57_2_offline_online_recovery_check.js`
- `mobile/scripts/m57_3_session_kvkk_blocking_check.js`
- `mobile/scripts/m57_4_android_preview_internal_build_check.js`

## Not
`M57` resmi green olarak checklist'e alinabilir. Sonraki ana resmi rota `M58 — Final Pilot Readiness`.
