# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir. Yaşayan ana giriş artık `tools\pack.ps1 -To 75` ve `tools\pack_living.ps1 -To 75` komutlarıdır.

## Aktif hat
- `M75` yaşayan teknik taban olarak kabul edilir.
- `M76A-1` minimum normalizasyon adımı açık durumdadır.
- `M76B` living matrix + tools consolidation adımı açık durumdadır.
- Tam güven için living static ve living runtime doğrulaması ayrıca koşulacaktır.

## Resmi green kutular
- [x] `M44 — Telematics`
- [x] `M45 — Retention + Backup`
- [x] `M46 — AI Copilot Foundation`
- [x] `M47 — KVKK Notice / Consent Framework`
- [x] `M47.2 — Capacity & Load Baseline`
- [x] `M47.3 — Production Resilience + Edge Security`
- [x] `M47.4 — Mobile Readiness Web Pass`
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
- [ ] `M58 — Final Pilot Readiness` (`tools\pack_m58_final_pilot_readiness.ps1`, tarihsel pilot kapısı)
- [x] `M59 — Gözlemleme + Saha Teşhis`
- [x] `M60 — Saha Acceptance Merkezi`
- [x] `M61 — SSOT + Milestone Hizası`
- [x] `M62 — Ticari Omurga Güçlendirme`
- [x] `M63 — Güven + Kalite + Hizmet Değerlendirme`
- [x] `M64 — Doğal Copilot Katmanı`
- [x] `M65 — Pilot Launch Gate`
- [ ] `M66 — Operasyonel Reassignment` (yeniden doğrulama bekliyor)
- [x] `M67 — Kurumsal Ölçek Hazırlık`
- [x] `M68 — Fetch Hardening`
- [x] `M69 — Fetch Hardening Phase 2`
- [x] `M70 — Checker Sync + Hot Path`
- [x] `M71 — Summary Hot Path`
- [x] `M72 — Hot Endpoint Reduction`
- [x] `M73 — Hot Path Phase 2`
- [x] `M74 — Hot Path Phase 3`
- [x] `M75 — Hot Path Phase 4`
- [ ] `M76A-1 — Minimum Normalization`
- [ ] `M76B — Living Matrix + Tools Consolidation`

## Markerlar
- master pack marker: `tools\pack.ps1 -To 75`
- living master marker: `tools\pack_living.ps1 -To 75`
- living static marker: `tools\verify_living_static.ps1`
- living runtime marker: `tools\verify_living_runtime.ps1`
- repo audit marker: `tools\check_repo_audit_master.ps1`

## M105 Tools Canonical Cleanup
- tools root kanonik düzen kontrolü korunacak
- tools archive ve backup yapısı doğrulanacak
- tools/docs senkronu korunacak
- living girişler klasör altında toplanacak


- [ ] `M59 — Gözlemleme + Saha Teşhis` (`tools\pack_m59_observability_field_diagnostics.ps1`)

- [ ] `M64 — Doğal Copilot Katmanı` (`tools\pack_m64_natural_copilot_layer.ps1`)
