# RUNBOOK — M81 MOBILE SAHA SERTLESTIRME

Tarih: 2026-04-03
Timezone: Europe/Istanbul
Durum: aktif / resmilestirme turu

Bu runbook, mobil saha sertlestirme kapsamini resmi tools ve docs hattina baglar.

## 1) M81 amac cumlesi
M81 ile tek mobil uygulama Android + iOS icin saha oncesi guvenli, kontrollu ve okunur hale getirilir.

## 2) Kapsam
- Android background GPS sertlestirme
- offline / retry / oturum dayanıkliligi
- iOS build readiness
- release / env / version disiplini
- mobil runtime yuzeyi ve saha okunurlugu
- checker + pack + SSOT hatti

## 3) Bu turda neyi sifirdan yapmiyoruz
- yeni mobil mimari kurmuyoruz
- Flutter veya baska stack acmiyoruz
- buyuk backend refactor yapmiyoruz
- M82 cleanup islerini M81 icine doldurmuyoruz

## 4) Repo gercegi
Bu repo icinde M81'in teknik parcalaari zaten vardir:
- mobile/scripts/m81_2_background_runtime_check.js
- mobile/scripts/m81_2b_bundle_chain_check.js
- mobile/scripts/m81_2c_appjs_syntax_fix_check.js
- mobile/scripts/m81_3_ios_readiness_check.js
- mobile/scripts/m81_4_release_env_discipline_check.js
- mobile/M81_RELEASE_ENV_RUNBOOK.md

Bu tur, bu parcalaari resmi milestone hattina baglar.

## 5) Kanonik komut
tools\pack_m81_mobile_saha_sertlestirme.ps1 -RepoRoot D:\servis-platform

## 6) Green yorumu
M81 green sayilabilmesi icin:
- repo-contract gecmeli
- background runtime check gecmeli
- bundle/app zinciri checki gecmeli
- iOS readiness check gecmeli
- release/env discipline check gecmeli
- runbook ve tools hatti repo gercegi ile uyumlu olmalidir

## 7) Sonraki dogru adim
Bu pack green olduktan sonra:
- SSOT / registry / backlog hizasi guncellenir
- M81 resmi olarak kapatma adayina gelir
- saha testi yine M82 sonrasi kullanici tarafindan yapilir
