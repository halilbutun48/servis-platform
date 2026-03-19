# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir. `M42+` pack script'leri self-only çalışır; tam post-M41 hattı dış runner ile koşturulur.

## Aktif rotalar
- **Step 2.5 (M44):** Telematics resmi green
- **Step 2.6 (M45):** Retention + Backup resmi green
- **Step 3 (M46):** AI Copilot zinciri resmi green
- **Step 4.0 (M47):** KVKK / Capacity / Edge Security / Mobile Web Readiness resmi green
- **Step 4.4–4.8 (M48–M50):** Mobil foundation → tablet readiness → beta hardening → voice ETA → release readiness resmi green
- **Step 4.9–5.1 (M51–M54.4):** backfill verification → dispatch approve/repack → driver route delivery resmi green
- **Hazırlık tarihi:** `M58 — Final Pilot Readiness` teknik pack-green
- **Active track:** M59 -> M65 saha oncesi hatti tamamlandi

## Resmi green kutular
- [x] `M44 — Telematics` pack: `tools\pack_m44_telematics.ps1`
- [x] `M45 — Retention + Backup` pack: `tools\pack_m45_retention_backup.ps1`
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
- [x] `M55 — Reports + No-show`
- [x] `M56 — KVKK Matrix + ETA/Navigation Quality`
- [x] `M57 — Mobile Hardening`
- [x] `Post-M41 External Pack Runner`
- [ ] `M58 — Final Pilot Readiness` pack: `tools\pack_m58_final_pilot_readiness.ps1` (M58 tarihsel pilot readiness kapısıdır; `manuel pilot kabul` ve saha çıkışı artık `M65` altında kapatılacaktır.)
- [x] `M59 — Gözlemleme + Saha Teşhis` pack: `tools\pack_m59_observability_field_diagnostics.ps1`
- [x] `M60 — Saha Acceptance Merkezi` pack: `tools\pack_m60_field_acceptance_center.ps1`
- [x] `M61 — SSOT + Milestone Hizası` pack: `tools\pack_m61_ssot_milestone_alignment.ps1`
- [x] `M62 — Ticari Omurga Güçlendirme` pack: `tools\pack_m62_commercial_core_strengthening.ps1`
- [x] `M63 — Güven + Kalite + Hizmet Değerlendirme` pack: `tools\pack_m63_trust_quality_service_evaluation.ps1`
- [x] `M64 — Doğal Copilot Katmanı` pack: `tools\pack_m64_natural_copilot_layer.ps1`
- [x] `M65 — Pilot Launch Gate` pack: `tools\pack_m65_pilot_launch_gate.ps1`

M58 pilot readiness marker: pack_m58_final_pilot_readiness.ps1
M59 observability marker: pack_m59_observability_field_diagnostics.ps1
M60 acceptance marker: pack_m60_field_acceptance_center.ps1

M61 alignment marker: pack_m61_ssot_milestone_alignment.ps1

M62 commercial marker: pack_m62_commercial_core_strengthening.ps1


M63 trust-quality marker: pack_m63_trust_quality_service_evaluation.ps1


M64 natural copilot marker: pack_m64_natural_copilot_layer.ps1
M65 pilot launch gate marker: pack_m65_pilot_launch_gate.ps1
