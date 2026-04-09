# PRIMER SSOT — canonical living route snapshot

Bu primer yaşayan hattın resmi özetidir.

## Güncel baz
- Repo: `servis-platform`
- Branch: `main`
- Güncel doğrulanmış baz: `M0->M89 green`
- Tarihsel temiz anchor: `M0->M79`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- İlk yürütülebilir kapanış kapısı: `M90B.1 — executable closure gate`
- M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 kapanmıştır; sıradaki resmi iş: `M90C.9 — güvenli kapanış / final hygiene checklist`

## Güncel yaşayan sıra
- `M80` — final sert kabul ve yük güveni
- `M80.1` — hot panel daraltma
- `M80.2` — agreements + shifts giriş yükü
- `M80.3` — georeview + shifts son giriş yükü
- `M81` — mobil saha sertleştirme
- `M82.1` — backend correctness kilidi
- `M82.8` — Verification 2.0
- `M82.9` — dormant payment backbone
- `M82.10` — super admin ticari ayarlar
- `M82.11` — payment readonly ticari yüzey
- `M83` — saha hazırlık paketi
- `M84` — saha geri bildirim döngüsü
- `M85` — opsiyonel ödeme pilotu
- `M86` — zorunlu ödeme rollout
- `M87` — ödeme hesabı hazırlığı
- `M88` — settlement operasyon masası
- `M89` — settlement mutabakat masası

## Ürün çerçevesi
- Platform sadece personel değildir; öğrenci/veli + personel alanlarını birlikte taşır.
- Marka dili: **Vardis**
- Konumlama: **pazar + sözleşme + operasyon**
- Yazılım şu anda ücretsiz kullanım yönünde kurgulanır; gelir modeli gelecekte ödeme/komisyon aracılığıdır.
- Ödeme omurgası gerçek charge/payout açmadan önce dormant/feature-flag mantığında ilerler.

## Kalıcı kurallar
- Adım adım, kontrollü ilerlenir.
- Overlay zip tek kök klasörlü olmalıdır.
- UI dili sade Türkçe ve düşük bilişsel yüklü kalmalıdır.
- “wizard” yerine tek Guided Mode/Stepper yaklaşımı korunur.
- “driver GPS” yerine “sürücünün telefon GPS'i” kullanılır.
- “agreement” yerine “sözleşme” kullanılır.
- Sistem eskiye döndürülmez; script/check/doc yeni canonical gerçeğe göre güncellenir.

## M90 odak noktası
- kanonik markdown hizası
- state/pack/verify uyumu
- ilk yürütülebilir kapanış kapısı: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- tek parça script rehberi
- screenshot bağımlılığını azaltan proof reformu
- repo hijyen kapanışı

## helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif küçültme/refactor yapılmaz.
- Yalnız acceptance-safe lokal düzeltme yapılabilir.
- M90C.1, M90C.2 ve M90C.3 kapanmıştır; helpComposer policy canonical docs içine işlenmiştir.

## schema.prisma decision
- `backend/prisma/schema.prisma` bu M90 hattında **justified exception** olarak korunur.
- Bu dosyada sırf line-count düşsün diye path/split refactor yapılmayacaktır.
- Gerekçe: schema tek dosyada migration + seed + Prisma client + repo-contract check hattının ortak referansıdır.
- M90 kapanış hattında schema split yapmak acceptance değeri üretmez; yüksek araçlama / migration / contract riski üretir.
- İzin verilen değişiklikler: migration-safe alan/model/enumeration ekleri, relation/index/constraint düzeltmeleri, acceptance-safe lokal şema tamiri.
- Bu karar, schema üzerinde çalışma yasağı değildir; yalnız line-count odaklı yapısal bölmeyi M90 dışında bırakır.
- Yeniden değerlendirme tetikleyicisi: M90 sonrası planlı tooling hazırlığı + explicit split ihtiyacı + contract/check hattının buna göre tasarlanması.

## hot-file queue policy
- Hot/large file kuyruğu yalnız sayısal repo-audit çıktısı değildir; resmi sınıflı queue olarak yönetilir.
- Kör line-count düşürme yapılmaz; önce acceptance, sonra kontrollü temizlik uygulanır.
- `backend/src/ai/chat/helpComposer.js` ve `backend/prisma/schema.prisma` queue içinde **justified exception** olarak kalır.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` **acceptance-sensitive / later** sınıfındadır.
- `backend/src/ai/jobGuide/screenCatalog.js`, `web/src/panels/company/ShiftsPanel.jsx`, `web/src/panels/room/ShiftsPanel.jsx`, `web/src/panels/company/GuidedPlanModal.jsx`, `web/src/panels/room/DriversPanel.jsx`, `web/src/panels/room/VehiclesPanel.jsx`, `web/src/panels/company/ShiftPeopleTab.jsx`, `web/src/panels/organization/PlansPanel.jsx` **safe candidate review** kuyruğundadır.
- Bu queue, `tools/repo_contract_state.json` içindeki `hotFileQueuePolicy` alanı ve `repo_audit` çıktısı ile birlikte doğrulanır.

## export / package hygiene closure
- Satır azaltma en sona bırakılır; bu adım export güveni ve çalışma alanı hijyeni içindir.
- `.env`, build/dist artıkları, runtime JSON store dosyaları ve overlay/log kalıntıları shareable pakete giremez.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip üretimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.

## CI / verification visibility
- Repo-native görünür doğrulama zinciri: `npm run verify:ci`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml`.
- `repo-verification` işi root verify chain çalıştırır; `shareable-export` işi M90C.7 export hygiene pack çalıştırır.
- Artifact görünürlüğü: `artifacts/repo-audit/repo_audit_latest.json` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- Satır azaltma en sona bırakılır; bu adım görünür doğrulama içindir.


## safe closure / final hygiene checklist
- Kanonik final doğrulama girişi: `npm run verify:final`.
- Windows tarafında export/hijyen komutlarında tercih edilen kabuk: `pwsh`.
- Final closure sırası: `npm run verify:final` -> `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform` -> `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` içinde `tar.exe` / `.NET ZipFile` fallback korunur; `GetRelativePath` ve `ConvertFrom-Json -Depth` gibi PS5 uyumsuzlukları geri gelmez.
- Satır azaltma en sona bırakılır; bu adım yalnız güvenli kapanış ve hijyen checklist'idir.

## REPO_CONTRACT_MARKERS_V1
- PRIMER_LIVING_ROUTE_M59_M89_V1
- PRIMER_ROUTE_M63_V1
- PRIMER_ROUTE_M64_V1
- PRIMER_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- NO_FIELD_TEST_BEFORE_CONTROLLED_SIGNOFF_V1
- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1

## TTL_PRESETS_PARENT_PUBLIC_LINKS_V1
- Veli erişimi ve personel/öğrenci public link presetleri marker-first okunur.
- Süre presetleri: 1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl.
- Maksimum süre: 365 gün.

## PRIMER_WARN_CLEANUP_M90D_V1
- PRIMER_ROUTE_M45_RETENTION_BACKUP_V1
- PRIMER_ROUTE_M47_4_MOBILE_READINESS_V1
- PRIMER_ROUTE_M60_FIELD_ACCEPTANCE_V1
- PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1

## M47_4_MOBILE_READINESS_ROUTE_V1
- Compatibility note: m47.3 green, m47.4 next route.
- Marker-first route: mobile readiness web pass canonical bridge after m47.3.

