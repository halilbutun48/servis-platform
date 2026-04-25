# PRIMER SNAPSHOT

## Güncel baz
- Repo: `servis-platform`
- Branch: `m90d1_web_lint_inventory`
- Güncel doğrulanmış baz: `M0->M89 green`
- Kapasite/load baz cizgisi tekil infra envelope üzerinde alındı: `1x api + 1x db + 1x redis + 1x osrm + 1x solver`.
- 500 araç cliff'i queue/worker split ile kapatıldı; 1000 araç 120s staggered kısa ve soak yeşil.
- 2 yıllık retention / archive hizada; `GpsPoint`, `ApiRequest`, `AuditLog`, `Notification` aynı sınıf değildir.
- Gelişmiş altında `Geri Bildirim` alt menüsü açıldı; Copilot en alta taşındı; eski panel feedback butonları kaldırıldı.
- Region/sharding yönü resmi teknik karar + field rollout runbook olarak kapandı.
- Refresh rotasyonu fail-closed; telematics vendor webhook HMAC + timestamp + replay guard ile korunur; `x-greenpack` sadece local-test override olarak kalır.
- 2026-04-19 gece güncellemesi: `verify:repo`, `verify:ci`, `verify:final` ve `pack_living` yeşildir.
- Repo check chain: `PASS 20 / FAIL 0`; selected milestone static set: `PASS 88 / FAIL 0 / SKIP 74`.
- Tarihsel anchor: `M0->M79`
- M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 / M90C.9 kapanmıştır; `M91` ve `M92` ile birlikte green / compatibility çizgisinde korunur.
- İlk yürütülebilir kapanış kapısı: `M90B.1 executable closure gate`
- Tek repo kontrol girisi: `npm run verify:repo`
- Repo verification spine: `M92`
- Kapanmış ek hatlar: `M91`, `M92`, `Tur 1`, `Tur 2`, `Tur 3`.
- Resmi çalışma yönü: `M90` rotası içinde ihtiyaç-temelli kontrollü ilerleme.
- Not: `M90C.9` satiri closure compatibility gorunurlugu icin korunur.

## Kanonik komut hiyerarşisi (Tur 1)
- Tur 1 / Tur 2 / Tur 3 docs-tools-wrapper hizasi kapanmistir.
- Resmi günlük giriş: `npm run verify:repo`.
- Resmi kapanış girişi: `npm run verify:final`.
- `tools\pack_living.ps1`, compatibility / geniş prova hattı olarak korunur; birincil resmi giriş değildir.
- Wrapper/alias politikası ve hedef klasör düzeni referansı: `docs/HEDEF_KLASORLEME_VE_TEST_SIRASI_V1.md`.

## Repo üstünde yaşayan hat
- `M80 -> M89`

## Kısa ürün çerçevesi
- Vardis, okul/öğrenci/veli ile şirket/personel taşıma alanlarını aynı omurgada taşır.
- Konumlama: pazar + sözleşme + operasyon.
- Ödeme omurgası dormant/feature-flag mantığında ilerler.

## Infra / queue truth
- `autoReachedQueue` claim / processing / reclaim / dead-letter katmanlariyla daha dayanıklıdır; tam enterprise exactly-once queue değildir.
- Redis down / worker crash / shutdown handoff / stale reclaim sınırları `docs/RUNBOOK_AUTO_REACHED_QUEUE_DURABILITY_V1.md` içinde açıkça yazılıdır.
- Clean-clone doğrulama yolu: `tools\verify_clean_clone.ps1`.

## Resmi üst hat
1. `M82.1` Backend correctness kilidi
2. `M82.8` Verification 2.0
3. `M82.9` Dormant payment backbone
4. `M82.10` Super Admin ticari ayarlar
5. `M82.11` Payment readonly yüzey
6. `M83` Saha hazırlık paketi
7. `M84` Saha geri bildirim döngüsü
8. `M85` Opsiyonel ödeme pilotu
9. `M86` Zorunlu ödeme rollout
10. `M87` Ödeme hesabı hazırlığı
11. `M88` Settlement operasyon masası
12. `M89` Settlement mutabakat masası

## M82.1 resmi pack yolu
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack.ps1 -To 82 -RepoDir D:\servis-platform -NoBuild`

## M80-M89 yaşayan komut notu
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`

## M90 yönü
- canonical markdown hizası
- state/pack/verify convergence
- ilk yürütülebilir kapanış kapısı: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- tek parça script rehberi
- screenshot bağımlılığını azaltan proof reformu
- repo hijyen kapanışı

## helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif küçültme/refactor yapılmayacaktır.
- Sadece acceptance-safe lokal düzeltme yapılabilir.
- M90C.1, M90C.2 ve M90C.3 kapanmıştır; helpComposer policy canonical docs içine işlenmiştir.

## schema.prisma decision
- `backend/prisma/schema.prisma` M90 hattında justified exception olarak korunur.
- Bu dosya sırf satır sayısı için bölünmeyecektir.
- Migration + seed + Prisma client + repo-contract yüzeyleri tek path üzerinden bağlı kaldığı için split refactor bu hatta alınmaz.
- İzin verilen değişiklikler: migration-safe alan/model/enum ekleri ve acceptance-safe lokal tamirler.
- Hot/large file queue resmi sınıflıdır; doğrulama komutu: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.
- Satır azaltma en sona bırakılır; önce export/package hijyeni kapanır.
- Yeni resmi hijyen komutu: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Fiziksel snapshot soft gate komutu: `npm run verify:snapshot`.
- Yeni resmi CI görünürlük komutu: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`.
- Yeni resmi final closure komutu: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Root verify chain: `npm run verify:ci`.
- Single-roof repo check: `npm run verify:repo`.
- M92 repo verification spine check: `npm --prefix backend run m92check`.
- CI fresh runner hazırlığı: `npm --prefix backend ci` ve `npm --prefix web ci`.
- Root verify zinciri web lint kanıtını `artifacts/lint/web_lint_latest.txt` dosyasına yazar.
- Kanonik final verify girişi: `npm run verify:final`.
- `verify:final`, `verify:repo` zincirinden sonra `verify:snapshot` soft gate raporunu da yeniler.
- Final verify çıktıları: `artifacts/lint/web_lint_latest.txt` ve `artifacts/repo-audit/physical_snapshot_hygiene_latest.json`.

## hot-file queue policy
- `backend/src/ai/chat/helpComposer.js` ve `backend/prisma/schema.prisma` justified exception olarak korunur.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` acceptance-sensitive / later sınıfındadır.
- `web/src/panels/company/ShiftPeopleTab.jsx` safe candidate review kuyruğundadır.
- Kör line-count düşürme yoktur; önce acceptance, sonra kontrollü temizlik uygulanır.

## REPO_CONTRACT_MARKERS_V1
- TOOLS_PRIMER_LIVING_ROUTE_M59_M89_V1
- TOOLS_PRIMER_ROUTE_M63_V1
- TOOLS_PRIMER_ROUTE_M64_V1
- TOOLS_PRIMER_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1

## TTL_PRESETS_PARENT_PUBLIC_LINKS_V1
- Veli erişimi ve personel/öğrenci public link presetleri marker-first okunur.
- Süre presetleri: 1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl.
- Maksimum süre: 365 gün.

## TOOLS_PRIMER_WARN_CLEANUP_M90D_V1
- TOOLS_PRIMER_ROUTE_M45_RETENTION_BACKUP_V1
- TOOLS_PRIMER_ROUTE_M57_MOBILE_HARDENING_V1
- TOOLS_PRIMER_ROUTE_M60_FIELD_ACCEPTANCE_V1
- TOOLS_PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1

## M47_4_MOBILE_READINESS_ROUTE_V1
- M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK
- M47.4 MOBILE READINESS WEB PASS
- Marker-first route: mobile readiness web pass canonical bridge after m47.3.



## safe closure / final hygiene checklist
- Windows tarafında export/hijyen kapanışı için tercih edilen shell `pwsh` olur.
- Final sıra: `npm run verify:final` -> `type artifacts\lint\web_lint_latest.txt` -> `pack_m90_c7_export_package_hygiene` -> `export_shareable_repo_bundle` -> `git status --short`.
- `verify:snapshot`, fiziksel dosya yüzeyini soft gate olarak raporlar; `verify:final` bu raporu yeniler ama hard blocker gibi davranmaz.
- `tools/export_shareable_repo_bundle.ps1` PS5 uyumlu fallback mantığını korur; `GetRelativePath` ve `ConvertFrom-Json -Depth` gibi kırıklar geri gelmez.
- Satır azaltma en sona bırakılır.
