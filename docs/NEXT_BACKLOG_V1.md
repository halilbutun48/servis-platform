# NEXT BACKLOG V1

Tarih: 2026-04-09
Timezone: Europe/Istanbul

Current direction: **servis-platform main -> M0->M89 green -> M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 kapandi -> siradaki resmi is M90C.7 export / package hygiene closure**

## 1) Resmi durum
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel tam master referansı korunur: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- `tools/STABLE_TO.txt = 78` M78.x compatibility marker olarak korunur
- Parent Access akışı legacy invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır
- OSRM kodu repoda vardır ama default compose modu fallback davranır

## 2) Hemen sonraki ana faz
1. `M90C.7` — export / package hygiene closure
2. `M90A` — canonical markdown hizası
3. `M90B` — `repo_contract_state` + pack/verify convergence
4. `M90C` — screenshot bağımlılığını azaltan proof reformu
5. `M90D` — `SCRIPT_KILAVUZU_MILESTONE_HARITASI` tek dosya standardı
6. `M90E` — repo hijyen kapanışı

## 2.0) Closure gate visibility
- `M90B.1` executable closure gate kanonik kapanis hattinin immediate gate'i olarak korunur.
- `M90C.3` kapanmistir; M90B.1 gorunurlugu backlog icinde devam eder.
- `M90C.5` schema için resmi karar kapisidir; `M90C.6` hot-file queue policy kapanmıştır ve `M90C.7` export/package hijyen kapısını açar.

## 2.1) helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif küçültme/refactor yapılmayacaktır.
- Sadece acceptance-safe lokal düzeltme yapılabilir.
- M90C.1, M90C.2 ve M90C.3 kapanmıştır; helpComposer policy canonical docs içine işlenmiştir.


## 2.2) schema.prisma decision
- `backend/prisma/schema.prisma` M90 hattında **justified exception** olarak korunur.
- Bu dosya line-count nedeniyle bölünmeyecektir.
- Gerekçe: migration, seed, Prisma client ve repo-contract/check yüzeyleri tek path üzerinden bağlanmıştır.
- M90 kapanış hattında split refactor acceptance değeri üretmez; yapısal risk üretir.
- İzin verilen değişiklikler: migration-safe alan/model/enum ekleri, relation/index/constraint tamiri, acceptance-safe lokal düzeltme.
- Bu karar kapanmıştır; hot-file queue policy de kapanmıştır; sıradaki gerçek iş: `M90C.7 — export / package hygiene closure`.

## 2.3) M90C.6 — hot-file queue policy
- Hot/large file listesi artık sadece rapor değildir; resmi sınıflı queue olarak takip edilir.
- Kör refactor yapılmaz; önce acceptance, sonra kontrollü temizlik uygulanır.
- `helpComposer.js` ve `schema.prisma` **justified exception** olarak korunur.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` **acceptance-sensitive / later** sınıfındadır.
- `backend/src/ai/jobGuide/screenCatalog.js`, `web/src/panels/company/ShiftsPanel.jsx`, `web/src/panels/room/ShiftsPanel.jsx`, `web/src/panels/company/GuidedPlanModal.jsx`, `web/src/panels/room/DriversPanel.jsx`, `web/src/panels/room/VehiclesPanel.jsx`, `web/src/panels/company/ShiftPeopleTab.jsx`, `web/src/panels/organization/PlansPanel.jsx` **safe candidate review** kuyruğundadır.
- Kanonik komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.

## 2.4) M90C.7 — export / package hygiene closure
- Shareable repo paketi çalışma alanı artığı taşımayacaktır.
- `.env`, `web/dist`, `mobile/dist`, `backend/data/*.json`, overlay readme/log kalıntıları ve mevcut zip arşivleri export dışında kalır.
- Satır azaltma en sona bırakılır; bu adım davranış refactor'u değildir.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip komutu: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.

## 3) Bu turun çalışma kuralı
- ürün davranışını bozma
- yeni özellik açma
- önce `tools\pack.ps1 -To 89` ile green baz korunur
- sonra `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform` ile closure gate doğrulanır
- önce canonical docs/state hizasını düzelt
- script/check sistemini yeni canonical duruma göre güncelle
- screenshot metin bağımlılığını azalt
- master rerun ve repo audit sona yakın çalıştır

## 4) Kanonik komutlar
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`

## 5) Açık hizalama notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel milestone anlamı değildir.
- Tek aktif script rehberi: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- Eski V1/V2/V3 script guide dosyaları tarihsel yönlendirme notudur.
- M90, yeni ürün modülü değil; repo gerçeğinin tekleştirilmesi işidir.

## 6) İlk cümle
Güncel baz: `servis-platform` main, master pack `M0->M89` green. `M90C.1`, `M90C.2`, `M90C.3`, `M90C.4`, `M90C.5` ve `M90C.6` kapanmıştır; bu turdaki resmi iş `M90C.7 export / package hygiene closure`dir.

## Repo contract state
- Makine-okur durum özeti: `tools/repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.

## REPO_CONTRACT_MARKERS_V1
- BACKLOG_LIVING_ROUTE_M57_M65_V1
- BACKLOG_ROUTE_M59_V1
- BACKLOG_ROUTE_M63_V1
- BACKLOG_ROUTE_M64_V1
- BACKLOG_ROUTE_M65_V1
- DB_ANONYMIZE_BACKLOG_MARKER_V1

## BACKLOG_WARN_CLEANUP_M90D_V1
- BACKLOG_ROUTE_M60_FIELD_ACCEPTANCE_V1
- BACKLOG_ROUTE_M62_COMMERCIAL_CORE_V1
