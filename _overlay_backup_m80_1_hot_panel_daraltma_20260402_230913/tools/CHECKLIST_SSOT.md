# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir.
> Son tam master doğrulama referansı `tools\pack.ps1 -To 79` ve `MASTER PACK PASS OK (M0->M79)` olarak okunmalıdır.
> `tools/STABLE_TO.txt = 78` değeri M78.x compatibility marker olarak içeride korunur.

## Aktif hat
- `M75` yaşayan teknik taban kavramı olarak sürer.
- `M76A-1`, `M76B`, `M76A-2`, `M77`, `M78`, `M78.1`, `M78.2`, `M78.3` green doğrulandı.
- `M79` acceptance turu green doğrulandı.
- Tam güven için living static ve living runtime doğrulaması ayrıca koşulabilir.

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
- [ ] `M58 — Final Pilot Readiness` (tarihsel pilot kapısı)
- [x] `M59 — Gözlemleme + Saha Teşhis`
- [x] `M60 — Saha Acceptance Merkezi`
- [x] `M61 — SSOT + Milestone Hizası`
- [x] `M62 — Ticari Omurga Güçlendirme`
- [x] `M63 — Güven + Kalite + Hizmet Değerlendirme`
- [x] `M64 — Doğal Copilot Katmanı`
- [x] `M65 — Pilot Launch Gate`
- [ ] `M66 — Operasyonel Reassignment` (tarihsel compatibility marker)
- [x] `M67 — Kurumsal Ölçek Hazırlık`
- [x] `M68 — Fetch Hardening`
- [x] `M69 — Fetch Hardening Phase 2`
- [x] `M70 — Checker Sync + Hot Path`
- [x] `M71 — Summary Hot Path`
- [x] `M72 — Hot Endpoint Reduction`
- [x] `M73 — Hot Path Phase 2`
- [x] `M74 — Hot Path Phase 3`
- [x] `M75 — Hot Path Phase 4`
- [x] `M76A-1 — Minimum Normalization`
- [x] `M76B — Living Matrix + Tools Consolidation`
- [x] `M76A-2 — Final Normalization + Archiving`
- [x] `M77 — KVKK + Uyum Katmanı`
- [x] `M78 — Checklist + Operasyon Doğrulama`
- [x] `M79 — Copilot Acceptance`

## Markerlar
- master pack marker: `tools\pack.ps1 -To 79`
- living master marker: `tools\pack_living.ps1 -To 79`
- living static marker: `tools\verify_living_static.ps1`
- living runtime marker: `tools\verify_living_runtime.ps1 -To 79`
- repo audit marker: `tools\check_repo_audit_master.ps1`

## Sonraki aktif iş
- [ ] `M80` — final sert kabul ve yük güveni kapısı
- `M81` — mobil saha sertleştirme
- `M82` — controlled cleanup + consolidation

## Tools canonical cleanup
- TOOLS_CANONICAL_CLEANUP_M105_V1
- M105 Tools Canonical Cleanup
- Kanonik tools düzeni korunur; tools root altında yalnızca aktif kanonik dosyalar tutulur.
- legacy overlay/apply/readme kalıntıları tools\_archive altına taşınır; tools root temiz kalır.

<!-- REPO_CONTRACT_CHECKLIST_COMPAT_V2
- [ ] `M57 — Mobile Hardening`
- [ ] `M58 — Final Pilot Readiness`
- `tools\pack_m58_final_pilot_readiness.ps1`
- [ ] `M59 — Gözlemleme + Saha Teşhis`
- `tools\pack_m59_observability_field_diagnostics.ps1`
- [x] `M61 — SSOT + Milestone Hizası`
- [ ] `M62 — Ticari Omurga Güçlendirme`
- [x] `M62 — Ticari Omurga Güçlendirme`
- [ ] `M63 — Güven + Kalite + Hizmet Değerlendirme`
- [x] `M63 — Güven + Kalite + Hizmet Değerlendirme`
- [ ] `M64 — Doğal Copilot Katmanı`
- [x] `M64 — Doğal Copilot Katmanı`
- [x] `M65 — Pilot Launch Gate`
- [ ] `M66 — Operasyonel Reassignment`
- [ ] `M66 — Operasyonel Reassignment kapanışı`
- M57 green
REPO_CONTRACT_CHECKLIST_COMPAT_V2 -->

<!-- REPO_CONTRACT_COMPAT_M78_CHECKLIST_V1
m0 -> m78
[x] m78 - checklist + operasyon dogrulama
pack.ps1 -to 78
REPO_CONTRACT_COMPAT_M78_CHECKLIST_V1 -->

<!-- REPO_CONTRACT_COMPAT_M78_CHECKLIST_V2
M0 -> M78
[x] `M78 — Checklist + Operasyon Doğrulama`
REPO_CONTRACT_COMPAT_M78_CHECKLIST_V2 -->
