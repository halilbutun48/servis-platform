# MILESTONE — M57 MOBILE HARDENING

Tarih: 2026-03-18  
Durum: **M57 genel plan acik; M57.1 implementation baseline repoda var**

## Scope
M57, mevcut surucu telefon uygulamasinin
- foreground GPS publish
- offline/online toparlama
- session failure UX
- KVKK blocking gorunurlugu
- Android preview/internal build disiplini
konularinda sertlestirilmesidir.

## Repo gercegi
Repoda mobil temel zaten vardir:
- login
- pin degisimi
- today
- route summary
- voice guidance
- eta
- active refresh
- periodic refresh
- gps permission read
- EAS profiles

Bu nedenle M57 sifirdan mobil uygulama yapimi degildir.

## Alt parcali teslim sirasi
1. `M57.1` Foreground GPS publish + izin kapisi + `Ayarlari ac`
2. `M57.2` Offline/online toparlama + retry dili
3. `M57.3` Session failure + KVKK blocking gorunurlugu
4. `M57.4` Android preview/internal build disiplini + runbook/pack

## M57.1 mevcut repo kapsami
- `/api/gps` publish helper eklendi
- aktif/onayli vardiya + atanmıs arac varsa foreground publish hattı eklendi
- gorev yoksa publish durdurma dili eklendi
- Today ekranina izin karti + `Ayarlari ac` aksiyonu eklendi
- static mobile checker eklendi

## Cikis artefaktlari
- `docs/RUNBOOK_M57_MOBILE_HARDENING.md`
- `tools/pack_m57_mobile_hardening.ps1`
- `tools/check_m57_mobile_hardening_repo_contract.ps1`
- `mobile/scripts/m57_1_foreground_gps_publish_check.js`

## Not
Bu dosya milestone planini temsil eder.
`M57` resmi green ancak kalan alt adimlar ve kanit zinciri tamamlandiginda verilir.
