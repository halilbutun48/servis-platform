# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca tarihsel full master veya ayrı milestone pack/check ile repo içinde açıkça doğrulanmış işler içindir.
> Tarihsel son tam master doğrulama referansı `tools\pack.ps1 -To 79` ve `MASTER PACK PASS OK (M0->M79)` olarak korunur.
> Yaşayan repo hattı bunun üstüne `M80→M89` genişlemesini taşır; bu hat için living/static/runtime doğrulaması ayrıca koşturulur.

## Aktif hat
- Tarihsel full master referansı: `M79`
- Yaşayan repo hattı: `M80`, `M80.1`, `M80.2`, `M80.3`, `M81`, `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`, `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Tam güven için `tools\verify_living_static.ps1` ve `tools\verify_living_runtime.ps1 -To 89` birlikte okunmalıdır.

## Tarihsel resmi green kutular
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
- [ ] `M59 — Gözlemleme + Saha Teşhis` (`pack_m59_observability_field_diagnostics.ps1`)
- [x] `M60 — Saha Acceptance Merkezi`
- [x] `M61 — SSOT + Milestone Hizası`
- [x] `M62 — Ticari Omurga Güçlendirme`
- [x] `M63 — Güven + Kalite + Hizmet Değerlendirme`
- [x] `M64 — Doğal Copilot Katmanı`
- [x] `M65 — Pilot Launch Gate`
- [ ] `M66 — Operasyonel Reassignment` (tarihsel compatibility marker)
<!-- compatibility marker: [x] M65 — Pilot Launch Gate -->
<!-- compatibility marker: [ ] M66 — Operasyonel Reassignment -->
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

## Yaşayan repo üst hattı
- `M80`, `M80.1`, `M80.2`, `M80.3`
- `M81`
- `M82.1`
- `M82.8`
- `M82.9`, `M82.10`, `M82.11`
- `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`

## Repo contract compatibility markers
- REPO_CONTRACT_CHECKLIST_COMPAT_V2
- master pack marker
- repo audit marker

## Markerlar
- tarihsel master pack marker: `tools\pack.ps1 -To 79`
- yaşayan master pack marker: `tools\pack.ps1 -To 89`
- yaşayan living master marker: `tools\pack_living.ps1 -To 89`
- living static marker: `tools\verify_living_static.ps1`
- living runtime marker: `tools\verify_living_runtime.ps1 -To 89`
- repo audit marker: `tools\check_repo_audit_master.ps1`

## Tools canonical cleanup
- `TOOLS_CANONICAL_CLEANUP_M105_V1`
- `M105 Tools Canonical Cleanup`
- Kanonik tools düzeni korunur; tools root altında yalnızca aktif kanonik dosyalar tutulur.
- legacy overlay/apply/readme kalıntıları `tools\_archive` altına taşınır; tools root temiz kalır.
- Repo hijyen hattı denetim hattıdır; kendi başına yeni oluşturduğun resmi dosyaları silmez.
