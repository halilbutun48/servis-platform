# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca master pack, ayrı milestone pack/check veya repo içi doğrulama izi ile açıkça bağlanan işler içindir.
> Güncel doğrulanmış baz `tools\pack.ps1 -To 89` ve `MASTER PACK PASS OK (M0->M89)` çizgisidir.
> Tarihsel tam master anchor `tools\pack.ps1 -To 79` olarak korunur; bu anchor güncel üst hattı inkâr etmez.

## Aktif hat
- Güncel doğrulanmış baz: `M89`
- Tarihsel tam master anchor: `M79`
- Yaşayan repo hattı: `M80`, `M80.1`, `M80.2`, `M80.3`, `M81`, `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`, `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Sonraki kontrollü iş: `M90`
- Tam güven için `tools\verify_living_static.ps1` ve `tools\verify_living_runtime.ps1 -To 89` birlikte okunmalıdır.

## Kanonik komut hiyerarşisi (Tur 1)
- Resmi günlük giriş: `npm run verify:repo`
- Resmi kapanış girişi: `npm run verify:final`
- Compatibility / geniş prova hattı: `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `pack_living`, resmi ilk giriş değildir; living/historical geniş kapsama hattıdır.
- Wrapper/alias politikası ve hedef klasör düzeni referansı: `docs/HEDEF_KLASORLEME_VE_TEST_SIRASI_V1.md`

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

## Güncel upper-route green kutular
- [x] `M80 — Final sert kabul ve yük güveni`
- [x] `M80.1 — Hot panel daraltma`
- [x] `M80.2 — Agreements + shifts giriş yükü`
- [x] `M80.3 — GeoReview + shifts son giriş yükü`
- [x] `M81 — Mobil saha sertleştirme`
- [x] `M82.1 — Backend correctness kilidi`
- [x] `M82.8 — Verification 2.0`
- [x] `M82.9 — Dormant payment backbone`
- [x] `M82.10 — Super Admin ticari ayarlar`
- [x] `M82.11 — Payment readonly ticari yüzey`
- [x] `M83 — Saha hazırlık paketi`
- [x] `M84 — Saha geri bildirim döngüsü`
- [x] `M85 — Opsiyonel ödeme pilotu`
- [x] `M86 — Zorunlu ödeme rollout`
- [x] `M87 — Ödeme hesabı hazırlığı`
- [x] `M88 — Settlement operasyon masası`
- [x] `M89 — Settlement mutabakat masası`

## M82 alt notu
- `M82.2`, `M82.3`, `M82.4`, `M82.5`, `M82.6`, `M82.7` M82 programı içindeki alt sertleştirme işleri olarak yaşar.
- Resmi pack hattında kapatılan görünür kapılar `M82.1` ve `M82.8` olarak korunur.

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

## REPO_CONTRACT_MARKERS_V1
- CHECKLIST_M57_M58_COMPAT_V1
- CHECKLIST_ROUTE_M59_V1
- CHECKLIST_ROUTE_M63_V1
- CHECKLIST_ROUTE_M64_V1
- CHECKLIST_ROUTE_M65_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1

## CHECKLIST_WARN_CLEANUP_M90D_V1
- CHECKLIST_ROUTE_M45_RETENTION_BACKUP_V1
- CHECKLIST_ROUTE_M47_4_MOBILE_READINESS_V1
- CHECKLIST_ROUTE_M60_FIELD_ACCEPTANCE_V1
- CHECKLIST_ROUTE_M62_COMMERCIAL_CORE_V1
