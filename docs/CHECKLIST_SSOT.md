# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul
Last updated: **2026-03-15**
Current GREEN ref:
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
- **M46.1 AI COPILOT ENRICHMENT PACK PASS OK**
- **M46.2 AI COPILOT INTENT EXPANSION PACK PASS OK**
- **M46.3 AI COPILOT QUALITY + EVIDENCE PACK PASS OK**
- **M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK**
- **M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION PACK PASS OK**
- **M46.6-A AI JOB GUIDE PACK PASS OK**
- **M46.6-B AI JOB GUIDE PRECHECK PACK PASS OK**
- **M46.6-T AI LOCATION SOURCE GUIDE PACK PASS OK**
- **M46.6-C AI SCREEN HELP PACK PASS OK**
- **M46.6-D AI CHAT SHELL PACK PASS OK**
- **M46.6-D2 AI CONTEXT CHAT PACK PASS OK**
- **M46.6-D3 AI ACTIONABLE CHAT PACK PASS OK**
- **M46.6-C2 SCREEN COVERAGE + TERMINOLOGY PACK PASS OK**
- **M46.6-D4 SIMPLE ROLE MODE PACK PASS OK**
- **M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK PASS OK**
- **M46.8 DRIVER ACCESS HARDENING PACK PASS OK**
- **M46.9 SESSION & REFRESH SECURITY PACK PASS OK**
- **M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK**
- **M47.2 CAPACITY & LOAD BASELINE PACK PASS OK**
- **M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK**
- **M47.4 MOBILE READINESS WEB PASS PACK PASS OK**
- **M47.4-R CLEAN RERUN / REPRO FIX VERIFIED**

Bu dosya iki amaç taşır:
1) **V1 Release/Regression Manuel Checklist** (M0→M41 ana regresyon)
2) **M42 Optional + Step 0.6 + Step 1 + M43→M47.4-R üst katmanları** (ana regresyonu bozmadan ayrı doğrulanır)

## Yol Haritası (Sıralı)
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü tamam, optional release olarak doğrulandı
- **Step 0.6:** Stabil ekler ayrı pack ile resmi green
- **Step 1:** Minimum Security + TOTP Step-up resmi green
- **Step 2 (M43):** Google Auth + Invite Gate resmi green
- **Step 2.5 (M44):** Telematics resmi green
- **Step 2.6 (M45):** Retention + Backup resmi green
- **Step 3 (M46):** AI Copilot Foundation resmi green
- **Step 3.9:** Session & Refresh Security resmi green
- **Step 4.0:** KVKK Notice / Consent resmi green
- **Step 4.1:** Capacity & Load Baseline resmi green
- **Step 4.2:** Production Resilience + Edge Security resmi green
- **Step 4.3:** M47.4 — Mobile Readiness Web Pass resmi green
- **Step 4.3-R:** M47.4-R — Clean Rerun / Repro Fix doğrulandı
- **Step 4.4:** M48 — Driver Mobile App Foundation (planlı)
- **Step 4.5:** M48.5 — Room / Company Tablet Readiness (planlı)
- **Step 4.6:** M49 — Mobile Beta Hardening (planlı)
- **Step 4.7:** M49.1 — Driver Voice Guidance + Stop ETA (planlı)
- **Step 4.8:** M50 — Mobile Release Readiness (planlı)

> Kural: `tools/pack.ps1 -To 41` ana kanıttır.
> Üst katmanlar ayrı resmi pack/check hatlarıyla doğrulanır.
> `M47.4-R` için ayrı pack yoktur; aynı `tools/pack_m47_4_mobile_readiness_web_pass.ps1` hattının clean rerun PASS vermesi kanıttır.
> Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
> Üst milestone’lar alt milestone check uyumluluğunu bozmaz.

## Resmi durum kutuları
- [x] `M47 — KVKK Notice/Consent Framework`
- [x] `M47.2 — Capacity & Load Baseline`
- [x] `M47.3 — Production Resilience + Edge Security`
- [x] `M47.4 — Mobile Readiness Web Pass`
- [x] `M47.4-R — Clean Rerun / Repro Fix`
- [ ] `M48 — Driver Mobile App Foundation`
- [ ] `M48.5 — Room / Company Tablet Readiness`
- [ ] `M49 — Mobile Beta Hardening`
- [ ] `M49.1 — Driver Voice Guidance + Stop ETA`
- [ ] `M50 — Mobile Release Readiness`
- Kanonik route token: `M48 DRIVER MOBILE APP FOUNDATION`

## Tool / SSOT notları
- M45 backup create tool: `tools\backup_create_m45.ps1`
- M45 backup restore tool: `tools\backup_restore_m45.ps1`
- M105 Tools Canonical Cleanup korunur.
- M47.4 MOBILE READINESS WEB PASS PACK PASS OK resmi green kanıtıdır.
- M47.4-R teknik olarak ürün özelliği değil, clean rerun / repro uyum düzeltmesidir.
- `driver@demo.com / demo123` hızlı panel kontrol hesabı olarak korunur; ana driver ürün akışı değildir.
