# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul
Last updated: **2026-03-18**

## Current official green ref
- **M41 PACK PASS**
- **M42 OPTIONAL PACK PASS**
- **STEP 0.6 STABIL PACK PASS**
- **STEP 1 SECURITY FOUNDATION PACK PASS**
- **STEP 1 TOTP STEP-UP PACK PASS**
- **M104 REPO CLEANUP CHECK PASS**
- **M105 TOOLS HYGIENE CHECK PASS**
- **M106 REPO HYGIENE + LINK TTL CHECK PASS**
- **M43 GOOGLE AUTH + INVITE GATE PACK PASS OK**
- **M44 TELEMATICS PACK PASS OK**
- **M45 RETENTION + BACKUP PACK PASS OK**
- **M46 AI COPILOT FOUNDATION PACK PASS OK**
- **M46.1–M46.9 zinciri green**
- **M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK**
- **M47.2 CAPACITY & LOAD BASELINE PACK PASS OK**
- **M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK**
- **M47.4 MOBILE READINESS WEB PASS PACK PASS OK**
- **M47.4-R CLEAN RERUN / REPRO FIX VERIFIED**
- **M48 DRIVER MOBILE FOUNDATION PACK PASS OK**
- **M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK**
- **M49 MOBILE BETA HARDENING PACK PASS OK**
- **M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK**
- **M50 MOBILE RELEASE READINESS PACK PASS OK**
- **M51–M53 BACKFILL VERIFICATION PACK PASS OK**
- **M54.3 DISPATCH APPROVE + REPACK PACK PASS OK**
- **M54.4 DRIVER ROUTE DELIVERY PACK PASS OK**
- **M55 REPORTS + NO_SHOW PACK PASS OK**
- **M56 KVKK MATRIX + ETA QUALITY PACK PASS OK**
- **POST-M41 EXTERNAL PACK RUNNER PASS OK**

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir. `M42+` pack script'leri self-only çalışır; tam post-M41 hattı dış runner ile koşturulur.

## Yol haritası
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü optional release olarak doğrulandı
- **Step 0.6:** Stabil ekler resmi green
- **Step 1:** Minimum Security + TOTP Step-up resmi green
- **Step 2 (M43):** Google Auth + Invite Gate resmi green
- **Step 2.5 (M44):** Telematics resmi green
- **Step 2.6 (M45):** Retention + Backup resmi green
- **Step 3 (M46):** AI Copilot zinciri resmi green
- **Step 4.0 (M47):** KVKK / Capacity / Edge Security / Mobile Web Readiness resmi green
- **Step 4.4–4.8 (M48–M50):** Mobil foundation → tablet readiness → beta hardening → voice ETA → release readiness resmi green
- **Step 4.9–5.1 (M51–M54.4):** backfill verification → dispatch approve/repack → driver route delivery resmi green
- **Active track (M57–M58):** mobile hardening → final pilot readiness

## Resmi green kutular
- [x] `M47 — KVKK Notice / Consent Framework`
- [x] `M47.2 — Capacity & Load Baseline`
- [x] `M47.3 — Production Resilience + Edge Security`
- [x] `M47.4 — Mobile Readiness Web Pass`
- [x] `M47.4-R — Clean Rerun / Repro Fix`
- [x] `M48 — Driver Mobile App Foundation`
- [x] `M48.5 — Room / Company Tablet Readiness`
- [x] `M49 — Mobile Beta Hardening`
- [x] `M49.1 — Driver Voice Guidance + Stop ETA`
- [x] `M50 — Mobile Release Readiness`
- [x] `M51–M53 — Backfill Verification`
- [x] `M54.3 — Dispatch Approve + Repack`
- [x] `M54.4 — Driver Route Delivery`
- [x] `Post-M41 External Pack Runner`
- [x] `M55 — Reports + No-show` pack: `tools\pack_m55_reports_no_show.ps1`

## Aktif rota notları
- [x] `M54.1 — Dispatch Preview` M54.3 green hattı içinde fiilen doğrulanmış kabul edilir
- [x] `M54.2 — Editable Dispatch Preview` M54.3 green hattı içinde fiilen doğrulanmış kabul edilir
- [x] `M55 — Reports + No-show` resmi pack-green doğrulandı
- [x] `M56 — KVKK Matrix + ETA/Navigation Quality` pack: `tools\pack_m56_kvkk_eta_quality.ps1`
- [ ] `M57 — Mobile Hardening` sıradaki ana ürün işi
- [ ] `M58 — Final Pilot Readiness` son checklist / saha testi öncesi güncellenecek

## M45 kanıt araçları
- `tools\pack_m45_retention_backup.ps1`
- `tools\backup_create_m45.ps1`
- `tools\backup_restore_m45.ps1`
- `docs\RUNBOOK_M45_RETENTION_BACKUP.md`



## M55 — Reports + Gelmedi Kaydı
- Reports endpointleri ve ROOM/COMPANY rapor ekranı iskeleti eklendi.
- Gelmedi kaydı (NO_SHOW) veri modeli ve backend guard açıldı.
- Aktif kayıtlı sürücü approve/apply aşamasında `ACTIVE_NO_SHOW_PENALTY` ile bloklanır.


M56 milestone marker: pack_m56_kvkk_eta_quality.ps1
