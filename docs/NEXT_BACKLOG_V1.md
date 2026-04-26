# NEXT BACKLOG V1

Tarih: 2026-04-19
Timezone: Europe/Istanbul

Current direction: **servis-platform m90d1_web_lint_inventory -> M0->M89 green -> M90C.6 / M90C.7 / M90C.8 / M90C.9 closure görünürlüğü -> M91 / M92 repo-native verification spine -> ihtiyaç-temelli kontrollü ilerleme**

Single-roof verification update: `M91` route preview local acceptance bandı ve `M92` repo verification spine eklendi. Günlük resmi kontrol girişi `npm run verify:repo`.

## 0) 2026-04-19 Gece Kontrol Notu
- `verify:repo` PASS, `verify:ci` PASS, `verify:final` PASS.
- Repo check chain sonucu: `PASS 20 / FAIL 0`; selected static milestone set: `PASS 88 / FAIL 0 / SKIP 74`.
- `M91` route preview / source shift hattı ve `M92` repo verification spine doğrulanmıştır.
- docs/tools reorganizasyonu `Tur 1`, `Tur 2`, `Tur 3` kapanmıştır.
- CI fresh runner hazırlığı workflow içinde explicit: `npm --prefix backend ci` ve `npm --prefix web ci`.
- Bu backlog içinde `M90` closure referansları compatibility / görünür kapanış hattı olarak korunur.
- Gerçek çalışma yönü: büyük reorganizasyon değil, ihtiyaç-temelli kontrollü ilerleme.
- Kalan son çizgi sırası: runtime JSON soft-gate'leri -> queue dayanıklılığı -> sıcak dosya borcu (en son).

## 1) Resmi Durum
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`.
- Tarihsel tam master referansı korunur: `MASTER PACK PASS OK (M0->M79)`.
- Repo audit: `REPO AUDIT MASTER PASS`.
- `tools/STABLE_TO.txt = 78` M78.x compatibility marker olarak korunur.
- Parent Access akışı legacy invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
- OSRM kodu repoda vardır ama default compose modu fallback davranır.
- M58, M77, M78, M79, M80-M89 ve M90 hattı yaşayan compatibility görünürlüğü içinde korunur; bu yeni ürün modülü açma çağrısı değildir.
- Üst ticari kapanış marker'ları explicit korunur: `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`.

## 2) Hemen Sonraki Ana Faz
1. `M90` — kapanmış closure / verification marker'larını green görünürlükte tutarak ihtiyaç-temelli kontrollü ilerlemeyi koru.
2. `M90A` — canonical markdown hizasını yalnız gerçek ihtiyaç çıktığında düzelt.
3. `M90B` — `repo_contract_state` + pack/verify convergence çizgisini state-first tut.
4. `M90C` — screenshot bağımlılığını azaltan proof reformunu ürün davranışı açmadan sürdür.
5. `M90D` — `SCRIPT_KILAVUZU_MILESTONE_HARITASI` tek dosya standardını bozma.
6. `M90E` — repo hijyen kapanışını shareable export disipliniyle koru.

## 2.0) Closure Gate Visibility
- `M90B.1` executable closure gate kanonik kapanış hattının immediate gate'i olarak korunur.
- `M90C.3` kapanmıştır; M90B.1 görünürlüğü backlog içinde devam eder.
- `M90C.5` schema için resmi karar kapısıdır.
- `M90C.6` hot-file queue policy, `M90C.7` export/package hygiene closure ve `M90C.8` CI / verification visibility kapanmıştır.
- `M90C.9`, `M91` ve `M92` green / compatibility görünürlüğü olarak korunur; resmi çalışma yönü `M90` rotası içinde kontrollü ilerlemedir.

## 2.1) helpComposer Exception Policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif küçültme/refactor yapılmayacaktır.
- Sadece acceptance-safe lokal düzeltme yapılabilir.
- M90C.1, M90C.2 ve M90C.3 kapanmıştır; helpComposer policy canonical docs içine işlenmiştir.

## 2.2) schema.prisma Decision
- `backend/prisma/schema.prisma` M90 hattında **justified exception** olarak korunur.
- Bu dosya line-count nedeniyle bölünmeyecektir.
- Gerekçe: migration, seed, Prisma client ve repo-contract/check yüzeyleri tek path üzerinden bağlanmıştır.
- M90 kapanış hattında split refactor acceptance değeri üretmez; yapısal risk üretir.
- İzin verilen değişiklikler: migration-safe alan/model/enum ekleri, relation/index/constraint tamiri, acceptance-safe lokal düzeltme.
- Bu karar kapanmıştır; hot-file queue policy, export/package hygiene closure, safe closure/final hygiene ve repo verification spine green çizgide korunur; resmi çalışma yönü `M90` rotası içinde ihtiyaç-temelli kontrollü ilerlemedir.

## 2.3) M90C.6 — Hot-File Queue Policy
- Hot/large file listesi artık sadece rapor değildir; resmi sınıflı queue olarak takip edilir.
- Kör refactor yapılmaz; önce acceptance, sonra kontrollü temizlik uygulanır.
- `helpComposer.js` ve `schema.prisma` **justified exception** olarak korunur.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` **acceptance-sensitive / later** sınıfındadır.
- `web/src/panels/company/ShiftPeopleTab.jsx` **safe candidate review** kuyruğundadır.
- `web/src/panels/company/AgreementWizard.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- `web/src/panels/company/ShiftsPanel.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- `web/src/panels/company/AgreementsPanel.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- `web/src/panels/room/ShiftsPanel.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- Kanonik komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.

## 2.4) M90C.7 — Export / Package Hygiene Closure
- Shareable repo paketi çalışma alanı artığı taşımayacaktır.
- `.env`, `web/dist`, `mobile/dist`, `backend/data/*.json`, overlay readme/log kalıntıları ve mevcut zip arşivleri export dışında kalır.
- Satır azaltma en sona bırakılır; bu adım davranış refactor'u değildir.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip komutu: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.

## 2.5) M90C.8 — CI / Verification Visibility
- Yerelde çalışan verify hattı repo-native görünür hale getirilmiştir.
- Kök komut: `npm run verify:ci`.
- Fresh runner kurulum kapısı: `npm --prefix backend ci` ve `npm --prefix web ci`.
- Kök zincir backend + web lint çalıştırır; web lint kanonik kanıt dosyası: `artifacts/lint/web_lint_latest.txt`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml`.
- `repo-verification` işi root verify chain'i, `shareable-export` işi M90C.7 export hygiene pack'i çalıştırır.
- Artifact görünürlüğü: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- Satır azaltma en sona bırakılır; bu adım görünür doğrulama içindir.

## 2.6) M90C.9 — Güvenli Kapanış / Final Hygiene Checklist
- Kanonik final giriş komutu: `npm run verify:final`.
- `verify:final`, önce `verify:repo` zincirini çalıştırır; sonra `verify:snapshot` soft gate raporunu yeniler.
- Final giriş bu yüzden hem `artifacts/lint/web_lint_latest.txt` hem `artifacts/repo-audit/physical_snapshot_hygiene_latest.json` üretir/günceller.
- Windows tarafında export/hijyen kapanışı için tercih edilen kabuk `pwsh` olacaktır.
- Final closure sırası: `verify:final` -> `type artifacts\lint\web_lint_latest.txt` -> `pack_m90_c7_export_package_hygiene` -> `export_shareable_repo_bundle` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` PS5 uyumsuz API çağrılarını geri getirmeyecek; `tar.exe` / `.NET ZipFile` fallback korunacaktır.
- Sat?r azaltma h?l? en sona b?rak?l?r; bu ad?m release/shareable/export/verify kapan?? emniyetidir.

## 3) Bu Turun Çalışma Kuralı
- Ürün davranışını bozma.
- Yeni özellik açma.
- Önce `npm run verify:repo` ile green baz korunur.
- Gerekirse `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform` ile closure gate doğrulanır.
- Önce canonical docs/state hizasını düzelt.
- Script/check sistemini yeni canonical duruma göre güncelle.
- Screenshot metin bağımlılığını azalt.
- Master rerun ve repo audit sona yakın çalıştır.
- Agreement artık direct açılmaz; doğru akış önce shift/vardiya, sonra `Sözleşmeye Dönüştür`.
- `sourceShiftId` zorunlu mantık korunur.

## 4) Kanonik Komutlar
- `npm run verify:repo`
- `npm run verify:ci`
- `npm run verify:final`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`

## 5) Açık Hizalama Notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel milestone anlamı değildir.
- Tek aktif script rehberi: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`.
- Eski V1/V2/V3 script guide dosyaları tarihsel yönlendirme notudur.
- M90, yeni ürün modülü değildir; repo gerçeğinin tekleştirilmesi işidir.

## 6) İlk Cümle
Güncel baz: `servis-platform` branch `m90d1_web_lint_inventory`, master pack `M0->M89` green. `M90C.1`, `M90C.2`, `M90C.3`, `M90C.4`, `M90C.5`, `M90C.6`, `M90C.7`, `M90C.8`, `M90C.9`, `M91`, `M92` ve docs/tools Tur 1-2-3 kapanmıştır; sonraki resmi yön büyük reorganizasyon değil, ihtiyaç-temelli kontrollü ilerlemedir.

## Repo Contract State
- Makine-okur durum özeti: `tools/repo_contract_state.json`.
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

## M90C.6 Historical Closure Chain
- M90C.1-M90C.5 closed before M90C.6 hot-file queue policy.
- M90C.7 export/package hygiene, M90C.8 CI/verification visibility, and M90C.9 safe closure/final hygiene follow after M90C.6.

## M90C.6 Exact Closure Chain Markers
- M90C.1-M90C.5 closure before M90C.6
- M90C.7 export/package hygiene after M90C.6
- M90C.8 CI/verification visibility after M90C.6
- M90C.9 safe closure/final hygiene after M90C.6

M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 kapandi
