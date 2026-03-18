# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir. `M42+` pack script'leri self-only çalışır; tam post-M41 hattı dış runner ile koşturulur.

## Aktif rotalar
- **Step 2.5 (M44):** Telematics resmi green
- **Step 2.6 (M45):** Retention + Backup resmi green
- **Step 3 (M46):** AI Copilot zinciri resmi green
- **Step 4.0 (M47):** KVKK / Capacity / Edge Security / Mobile Web Readiness resmi green
- **Step 4.4–4.8 (M48–M50):** Mobil foundation → tablet readiness → beta hardening → voice ETA → release readiness resmi green
- **Step 4.9–5.1 (M51–M54.4):** backfill verification → dispatch approve/repack → driver route delivery resmi green
- **Active track (M58):** final pilot readiness

## Resmi green kutular
- [x] `M44 — Telematics` pack: `tools\pack_m44_telematics.ps1`
- [x] `M45 — Retention + Backup` pack: `tools\pack_m45_retention_backup.ps1` backup: `tools\backup_create_m45.ps1` restore: `tools\backup_restore_m45.ps1`
- [x] `M46 — AI Copilot Foundation` pack: `tools\pack_m46_ai_copilot.ps1`
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
- [x] `M55 — Reports + No-show` pack: `tools\pack_m55_reports_no_show.ps1`
- [x] `M56 — KVKK Matrix + ETA/Navigation Quality` pack: `tools\pack_m56_kvkk_eta_quality.ps1`
- [x] `M57 — Mobile Hardening`
- [x] `M57 scaffold pack` : `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- [x] `Post-M41 External Pack Runner`
- [ ] `M58 — Final Pilot Readiness` pack: `tools\pack_m58_final_pilot_readiness.ps1` (resmi green icin ek olarak saha kabul / manuel pilot signoff gerekir)

M56 milestone marker: pack_m56_kvkk_eta_quality.ps1
M57 full pack marker: pack_m57_mobile_hardening.ps1
M58 pilot readiness marker: pack_m58_final_pilot_readiness.ps1
