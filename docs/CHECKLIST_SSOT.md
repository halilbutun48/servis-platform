# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir. `M42+` pack script'leri self-only çalışır; tam zincir için ana giriş artık `tools\pack.ps1 -To 66` komutudur.

## Aktif hat
- `M44 -> M58` teknik readiness hattı green taban olarak duruyor.
- `M59 -> M65` saha öncesi sertleştirme hattı green taban olarak duruyor.
- `M66` fonksiyonel olarak repoya eklendi; tam kapanış için smoke / saha doğrulaması bekliyor.
- Büyük cleanup / duplicate / dead code / performans sadeleştirmesi sonraki ana fazdır.

## Resmi green kutular
- [x] `M44 — Telematics` pack: `tools\pack_m44_telematics.ps1`
- [x] `M45 — Retention + Backup` pack: `tools\pack_m45_retention_backup.ps1`
- [x] `M45 — Backup create helper`: `tools\backup_create_m45.ps1`
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
- [x] `M56 — KVKK Matrix + ETA / Navigation Quality`
- [x] `M57 — Mobile Hardening`
- [ ] `M58 — Final Pilot Readiness` (tarihsel pilot readiness kapısıdır; saha çıkış kararı artık M65/M66 doğrulama hattı ile birlikte değerlendirilir)
- [x] `M59 — Gözlemleme + Saha Teşhis`
- [x] `M60 — Saha Acceptance Merkezi`
- [x] `M61 — SSOT + Milestone Hizası`
- [x] `M62 — Ticari Omurga Güçlendirme`
- [x] `M63 — Güven + Kalite + Hizmet Değerlendirme`
- [x] `M64 — Doğal Copilot Katmanı`
- [x] `M65 — Pilot Launch Gate`
- [ ] `M66 — Operasyonel Reassignment kapanışı` (fonksiyonel çekirdek var; canlı smoke + saha testi + yeniden doğrulama bekliyor)

## Markerlar
- master pack marker: `tools\pack.ps1 -To 66`
- repo audit marker: `tools\check_repo_audit_master.ps1`
- M66 marker: `tools\pack_m66_operation_reassignment.ps1`

## M105 Tools Canonical Cleanup
- tools root kanonik düzen kontrolü tamamlanacak
- tools archive ve backup yapısı doğrulanacak
- tools/docs senkronu korunacak

## M58 pack markerı
- [ ] `M58 — Final Pilot Readiness` pack: `tools\pack_m58_final_pilot_readiness.ps1` (manuel pilot kabul / saha kabul bekliyor)
