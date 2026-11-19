# CHECKLIST SSOT

> Not: Bu checklistte `[x]` yalnızca master pack, ayrı milestone pack/check veya repo içi doğrulama izi ile açıkça bağlanan işler içindir.
> Güncel doğrulanmış baz `tools\pack.ps1 -To 89` ve `MASTER PACK PASS OK (M0->M89)` çizgisidir.
> Tarihsel tam master anchor `tools\pack.ps1 -To 79` olarak korunur; bu anchor güncel üst hattı inkâr etmez.

## Aktif hat
- #3 `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01` aktif ürün hattıdır; canonical contract: `docs/HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01.md`.
- #3 saf kontrolü: `npm run check:hakedisinvoicereconciliationpreview01`; gerçek API/DB kabulü: `npm run accept:hakedisinvoicereconciliationpreview01`.
- #4 `COST-SCENARIO-FORECAST-AND-SAVINGS-01` current ürün hattıdır; canonical contract: `docs/COST_SCENARIO_FORECAST_AND_SAVINGS_01.md`.
- #4 saf kontrolü: `npm run check:costscenarioforecastandsavings01`; gerçek API/DB kabulü: `npm run accept:costscenarioforecastandsavings01`; browser kabulü: `npm run smoke:costscenarioforecastandsavings01`.
- #4 senaryo çıktısı ephemeral preview'dır; DB/audit/live shift/route/vehicle assignment/bütçe/hakediş/fatura/ödeme/muhasebe yazmaz.
- Güncel doğrulanmış baz: `M89`
- Tarihsel tam master anchor: `M79`
- Yaşayan repo hattı: `M80`, `M80.1`, `M80.2`, `M80.3`, `M81`, `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`, `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Sonraki kontrollü iş: `M90`
- Tam güven için `tools\verify_living_static.ps1` ve `tools\verify_living_runtime.ps1 -To 89` birlikte okunmalıdır.

## PRE-#18 current foundation state

### Immutable closure stage (2026-09-25)

- Combined PRE-#18 acceptance and No-Surprise Repository Exit: GREEN (`487/487` classified, `0` unexplained).
- Final terminology / Sefer Abi residual and bounded public-runtime current-source recheck: PASS.
- PRE-#18 baseline records `#18_STARTED = NO`; the active branch now starts #18 only after that immutable tag. Proven-closed work reopens only for concrete newer regression evidence.
- Current HEAD: `e3bec6177f32263325bd14e876502faacac7a5b0` on `m90d1_web_lint_inventory`.
- `verify:repo` `PASS 32/32`; `verify:final` `PASS`; KVKK `262/262`; role/data isolation `216/216`.
- Presentation provenance has one authority; active/product unowned is `0`; the package ownership delta is `0/0`.
- M79 D1 `199/199` and AI semantic quality `122/122` are current accepted evidence. Copilot Context 14/21 is `PROVEN_SUPERSEDED_BY_CURRENT_ACCEPTANCE`.
- `PREMIUM_UI = 72_OF_72_PROVEN`; Foundation Exit is `GREEN PRESERVED`, ROOM/OTHER423 is `PROVEN_CLOSED`, and No-Surprise Repository Exit is the immutable PRE-#18 baseline. #18 is active in its bounded screen-grounding package; #19+ and closure commit/tag/push remain `NO`.

## #18 current bounded implementation

- #18 starts only after the immutable PRE-#18 tag `v2026.09.25-pre18-immutable-closure` and consumes the already-proven role/screen/tenant interaction grounding.
- Current owner: `backend/src/ai/chat/copilotUiElementAnchor.js` + `web/src/components/copilot/GuidedTargetOverlay.jsx`; focused checks: `npm run check:copilotuielementanchor01` and `npm run smoke:copilotuielementanchor01`.
- Boundary: semantic target resolution, bounded highlight/scroll/focus and safe navigation guidance only. No business write, approval, dispatch, authorization mutation, force-click or #19+ capability.

## #18 final acceptance / pre-commit closure preparation (2026-09-26)

- Accepted evidence: 8/8 roles, 109/109 current menu/route targets, representative local and same-build public guidance, desktop/tablet/mobile coverage, desktop resize, mobile compact drawer, suggestions, modal stacking, current-screen help, continuation/recovery/back, offer navigation and nonexistent-target rejection.
- Safety result: fake navigation `0`, business write execution `0`, unauthorized/nonexistent guidance `0`, product defects remaining `0`.
- Governance result: package ownership/current-head, M90C.6, onboarding audit, smart-chips audit, `verify:repo 32/32`, `verify:final PASS`, and `git diff --check PASS`.
- This is final pre-staging evidence, not a commit/tag/push. M18 broad guided/menu acceptance remains distinct from the exhaustive integrated #39 E2E owner. #19 is not started.

### M18 final frontend / brand / premium UX closure gate (additive)

This gate is part of the existing #18 final acceptance and does not create a new
milestone. It does not restart or split B-04 or the subsequent role-based tests;
their current owner and order remain unchanged. Existing M18 functional, Finans
11 and closed B/C evidence remains preserved.

| Final gate area | Required acceptance evidence | Status |
|---|---|---|
| Brand source and visibility | Approved logo/emblem/favicon/app-icon provenance and current-build visibility in Login, AppShell, NavDock and mobile menu; internal #18 descriptions kept separate | NOT_PROVEN |
| Eight-role UX | ROOM, COMPANY, SCHOOL, ORGANIZATION, DRIVER, PERSONEL, PARENT and SUPER_ADMIN task clarity and density | NOT_PROVEN |
| Shared surfaces | Forms, tables, charts, maps, modals, drawers, notifications, keyboard and safe-area behavior | NOT_PROVEN |
| Role-specific flows | ROOM finance/operations; `D-FIN-01` authorized request/offer selection in both `Araç Karşılaştır` and `Teklif ve Kârlılık`, cross-tab selection/vehicle synchronization, stale-context isolation, missing-data correction and Sefer Abi context; COMPANY/SCHOOL/ORGANIZATION budget/offer/service; DRIVER/PERSONEL/PARENT mobile | NOT_PROVEN |
| Sefer Abi | Accepted character, placement, readability, states, suggestions and screen interaction | NOT_PROVEN |
| Measured usability | Success, steps/clicks, manual entry, duration, errors/recovery and five-second comprehension | NOT_PROVEN |
| Same-build safety | 1440/1024/390/320 Chromium, source/runtime parity, tenant/RBAC/KVKK and no unexpected business writes | NOT_PROVEN |

Until every mandatory row has current real-browser evidence and regression
reconciliation, the closure flags remain explicitly:

```text
M18_FRONTEND_BRAND_UX_FINAL_GATE = NOT_PROVEN
FULL_D_LEVEL_CLOSED = FALSE
SAFE_TO_PROMOTE = FALSE
```

No visual test is promoted to PASS by this documentation entry. This gate is a
final closure dependency, not a reason to pause B-04, reopen closed acceptance,
or start #19.

`D-FIN-01` remains `NOT_PROVEN` until real Chromium demonstrates at least two
authorized ROOM/tenant offers across both finance tabs, selection persistence,
vehicle carry-over, complete replacement of the prior price/cost/period/vehicle
context, clear separation of offer price/planning estimate/realized expense/
proven profit, one-click missing-data correction, Sefer Abi awareness, tenant
and RBAC negatives, audit behavior, responsive coverage, and a durable
regression. A technical test PASS by itself does not close this user-acceptance
criterion. The existing Finans 11 engine and canonical ledger remain unchanged.

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
- CHECKLIST_ROUTE_DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01_V1
- CHECKLIST_ROUTE_M47_4_MOBILE_READINESS_V1
- CHECKLIST_ROUTE_M60_FIELD_ACCEPTANCE_V1
- CHECKLIST_ROUTE_M62_COMMERCIAL_CORE_V1
