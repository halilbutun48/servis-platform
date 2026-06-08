# PRIMER SSOT — canonical living route snapshot

Bu primer yaşayan hattın resmi özetidir.

## Güncel baz
- Repo: `servis-platform`
- Branch: `m90d1_web_lint_inventory`
- Güncel doğrulanmış baz: `M0->M89 green`
- Kapasite/load baz çizgisi tekil infra envelope üzerinde alındı: `1x api + 1x db + 1x redis + 1x osrm + 1x solver`.
- 500 araç cliff'i queue/worker split ile kapatıldı; 1000 araç 120s staggered kısa ve soak yeşil.
- 2 yıllık retention / archive hizada; `GpsPoint`, `ApiRequest`, `AuditLog`, `Notification` aynı sınıf değildir.
- Gelişmiş altında `Geri Bildirim` alt menüsü açıldı; Copilot en alta taşındı; panel içi dağınık geri bildirim butonları kaldırıldı.
- Region/sharding yönü resmi teknik karar + field rollout runbook olarak kapandı.
- Mobil uygulama driver-first kalır; tüm web panellerini mobile taşımak bu aşamada hedef değildir.
- Mobile/App.js ince shell olarak kalır; yeni mobile işler `mobile/src/app/*`, `mobile/src/screens/*` ve helper dosyalarına taşınır.
- Refresh rotasyonu fail-closed; telematics vendor webhook HMAC + timestamp + replay guard ile korunur; `x-greenpack` sadece explicit local-test override olarak kalır.
- 2026-04-19 gece güncellemesi: `verify:repo`, `verify:ci`, `verify:final` ve `tools\pack_living.ps1` yeşildir.
- Repo check chain sonucu: `PASS 21 / FAIL 0`; selected milestone static set: `PASS 92 / FAIL 0 / SKIP 78`.
- `ROADMAP-LOCK-AI-MARKETPLACE-01` docs-only roadmap kilidi alınmıştır; Sefer Abi ürünün ana farkıdır ve runtime davranışı değiştirilmeden yol haritası docs üzerinden sabitlenir. Detay dokümanı: `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`. Public landing ve public vitrin copy'sinde ise SeferPakt platform-first anlatılır, Sefer Abi ikincil operasyon copilot'u olarak konumlanır.
- `PUBLIC-LANDING-01` public vitrin / tanıtım yüzeyi açılmıştır; route `/#/landing` üzerinden çalışır ve public CTA'lar kontrollü lead formuna bağlanır.
- `LEAD-CAPTURE-01` kontrollü public lead toplama akışını açar; otomatik üyelik, ödeme ve davet gönderimi kapalı kalır.
- `PUBLIC-LANDING-01 final promise check` public marketing claim guard'ını kilitler; underpromise/overdeliver ve premium/ikincil operasyon copilot hizasını `docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md` içinde sabitler.
- `ONBOARDING-REVIEW-01` lead başvurularını insan inceleme kuyruğuna taşır; `APPROVED_FOR_INVITE` yalnızca sonraki invite adımı için hazırlıktır.
- `ONBOARDING-REVIEW-01 final audit` bu kuyruğun güven sınırını kilitler; `APPROVED_FOR_INVITE` yalnızca invite hazırlığıdır ve `docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md` içinde yaşar.
- `INVITE-BASED-MEMBERSHIP-01` insan onaylı davetli üyelik kilitler; public lead doğrudan user/account olmaz, self-service signup ve automatic membership açılmaz, invite draft / pending invite sadece güvenli sınırda planlanır. Detay: `docs/INVITE_BASED_MEMBERSHIP_01.md`
- Tarihsel temiz anchor: `M0->M79`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- İlk yürütülebilir kapanış kapısı: `M90B.1 — executable closure gate`
- M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 / M90C.9 kapanmıştır; `M91`, `M92` ve `M93` ile birlikte green / compatibility çizgisinde korunur.
- M94-D2 / M94-D3 — admin audit + payment export polish ve settlement ledger CSV temizliği görünürlük kaydıdır.
- M96-A — driver availability local state bandıdır.
- M96-B — mobile notifications foundation driver, personel, veli ve operasyon bildirim yüzeylerini tek foundation altında yaşatır.
- M96-C — boarding change local model bandıdır; backend/panel bind sonraki halkadadır.
- M96-C2 — boarding change operations readiness bandıdır; backend/panel/audit/notification/auto-accept görünürlüğü burada yaşar.
- M96-D — driver change awareness ve sesli uyarı mobil yüzeyidir.
- Tek repo kontrol girişi: `npm run verify:repo`
- Local acceptance overlay: `M91 shift/agreement route preview`
- Repo verification spine: `M92 repo verification spine`
- Queue durability proof: `M93 queue durability proof`
- Queue chaos/alarm proof: `M94-E queue chaos/alarm proof` — static check + synthetic runtime probe ile yaşar.
- Android APK/AAB build readiness: `M95-E0 android apk/aab build readiness` — APK/AAB hazırlığı ile saha kanıtı ayrımını resmi runbook/check altında yaşatır.
- Check-in panel integrations: `M97 check-in panel integrations` — nav restore ve panel kısayolları check'i ile yaşar.
- Room operation board: `M97-A room operation board` — oda operasyon özetini, görev/servis sayfalarını ve biniş değişikliği görünümünü yaşatır.
- Company operations panel: `M97-B company operations panel` — personel servis atamaları, biniş değişiklikleri ve bildirim özetini yaşatır.
- School operations panel: `M97-C school operations panel` — öğrenci servis atamaları, veli bağlantıları ve bildirim geçmişini yaşatır.
- Super Admin operations panel: `M97-D super admin operations panel` — rol/yetki denetimi, audit ve tekrar eden işlem özetini yaşatır.
- Personel activation model: `M98-A personel activation model` — kurum daveti ve ilk giriş modeliyle yaşar.
- Parent activation and link access: `M98-B parent activation and link access` — veli daveti, bağlantı süresi ve takip yetkisiyle yaşar.
- Link lifetime and tracking authority: `M98-C link lifetime and tracking authority` — davet süresi, aktif servis ve görünürlük kuralıyla yaşar.
- KVKK visibility matrix: `M98-D kvkk visibility matrix` — rol bazlı takip görünürlüğü ve kapı kurallarıyla yaşar.
- `M98-E2E` code + PIN acceptance gate green; `M98-E3` code + PIN saha / UX kanıt paketi active.
- `M98-E4` code + PIN runtime smoke active.
- `M98-E5` code + PIN gerçek kullanıcı kabul checklist’i active.
- `M99-KVKK-01` mobil/web KVKK sade metin ve izin dili active.
- `M99-UX-01` görünür Türkçe metin hijyeni active.
- `OP-01` OperationProof / ServiceProof merkezi kanıt omurgası closed-readonly; `OP-02` manuel operatör kanıt notu katmanı active; `OP-03` web servis kanıtı / manuel not küçük kartı active; `M99-KVKK-01` ve `M99-UX-01` kararları korunur.
- `M95-E25` mobil saha kabul checklist’i active.
- `M95-E26` Android emulator smoke planı active.
- `M95-E27` Gerçek Android cihaz saha proof hazırlığı active.
- `M95-EXPORT-01` export zip / runtime check uyumu active; shareable export paketinde runtime JSON yokluğu INFO/SKIP kabul edilir.
- `MOBILE-TEXT-01` mobile activation copy cleanup green/closed; personel/veli/biniş değişikliği kartlarındaki eski hazırlık dili sade Türkçeye çekildi.
- Mobile regression pack: `M99-A mobile regression pack` — login, role routing, token/session, bildirim, biniş değişikliği ve müsaitlik regression pack'iyle yaşar.
- Real scenario tests: `M99-B real scenario tests` — sürücü, personel, veli ve operasyon yüzeylerini gerçek senaryo pack'iyle yaşatır.
- Field launch readiness: `M99-C field launch readiness` — gerçek cihaz, zayıf ağ, ekran kapalı GPS ve saha kanıtı hazırlığıyla yaşar.
- Güncel kapanmış ek hatlar: `M91`, `M92`, `M93`, `Tur 1`, `Tur 2`, `Tur 3`.
- Resmi çalışma yönü: `M90` rotası içinde ihtiyaç-temelli kontrollü ilerleme.
- Not: `M90C.9` görünürlüğü compatibility / closure marker olarak korunur; bu satır yeni büyük taşıma veya agresif refactor çağrısı değildir.

## Son kapanan ürün hatları
- `WEB-01A` ve `WEB-01B` flow/system mode akışı green kapandı; `WEB-01-FIX` görünür Türkçe sistem dili düzeltmesiyle kapandı (`8b9c9eb / v2026.05.08-web01-fix-flow-check-system-language`).
- `PAY-01A-E` readonly ödeme/hakediş hazırlık, önizleme, detay, CSV ve kapanış hattı green kapandı; `PAY-01E` kapanış halkası da bu hattın parçasıydı.
- `PAY-SAFE-01` aktif ödeme / settlement write güvenli kapı arkasına alındı (`5722590 / v2026.05.07-paysafe01-payment-write-gate`).
- `OP-04` readonly proof commercial/quality bridge green kapandı.
- `QLT-04B` compact signal list green kapandı.
- `COP-01A-E` operasyon rehberi serisi ve `COP-02A` program-wide guide fallback green kapandı; `COP-01E` kabul halkası da bu serinin parçasıydı.
- `COP-02B` bağlamlı öneri / takip sorusu zinciri green kapandı.
- `COP-03A` Copilot ekran bilgi omurgası / registry-catalog parity green kapandı.
- `UX-KVKK-01` compact boundary hint green kapandı.
- Bu kapanışlar DOCS-STATE-01 ile resmi hafıza katmanına işlenmiş son ürün durumunu temsil eder.

## Kanonik komut hiyerarşisi (Tur 1)
- Tur 1 / Tur 2 / Tur 3 docs-tools-wrapper hizası kapanmıştır; bundan sonraki ilerleme ihtiyaç-temelli ve kontrollü olmalıdır.
- Resmi günlük giriş: `npm run verify:repo`.
- Resmi kapanış girişi: `npm run verify:final`.
- `tools\pack_living.ps1` korunur; ancak compatibility / geniş prova hattıdır ve birincil resmi giriş değildir.
- Wrapper/alias politikası ve hedef klasör düzeni için repo içi kanonik referans: `docs/HEDEF_KLASORLEME_VE_TEST_SIRASI_V1.md`.
- Bu Tur 1 hizalamasında ürün koduna dokunulmaz; yalnız docs/tools anlatımı ve giriş düzeni netleştirilir.
- Sefer Abi ürünün ayırt edici AI katmanıdır; public vitrin copy'sinde opsiyonel operasyon copilot'u olarak anlatılır; rol bazlı, sesli, proaktif ve onay-kapılı çalışır.
- Demand-to-Agreement ve AI marketplace omurgası docs-only roadmap lock ile sabitlenir; kritik write işlemler kullanıcı onayı olmadan yapılmaz. Public landing copy'sinde ise SeferPakt platform-first anlatılır, Sefer Abi ikincil operasyon copilot'u olarak görünür.

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

Compatibility aliases for legacy checks:
- `M83` — field prep packet / saha hazırlık paketi
- `M84` — field feedback loop / saha geri bildirim döngüsü
- `M85` — optional payment pilot / opsiyonel ödeme pilotu
- `M87` — payment account readiness / ödeme hesabı hazırlığı

## Ürün çerçevesi
- Platform sadece personel değildir; öğrenci/veli + personel alanlarını birlikte taşır.
- Marka dili: **SeferPakt**
- Ürün tanımı: **SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve operasyon yardımcısı katmanıyla maliyet/saha risklerini önceden görünür kılan kurumsal servis operasyon platformudur.**
- Konumlama: **servis tedariki + sözleşme + operasyon**
- Yazılım şu anda ücretsiz kullanım yönünde kurgulanır; gelir modeli gelecekte ödeme/komisyon aracılığıdır.
- Ödeme omurgası gerçek charge/payout açmadan önce dormant/feature-flag mantığında ilerler.
- Kanonik aktivasyon anahtarı `PAYMENT_BACKBONE_ENABLED=0/1` ile taşınır; `0` hazırlık, `1` canlı kapı için uygun zemin anlamına gelir.
- Kanonik ödeme hazırlık belgesi: `docs/TICARI_ODEME_VE_MUTABAKAT_HAZIRLIK_MODELI_V1.md`.
- Aktivasyon checklist'i ve Super Admin ödeme listesi / CSV export yüzeyi de aynı kanonik belgede tutulur; canlı charge/payout bu turda yine açılmaz.
- Bu aşamada canlı charge / payout açılmaz; banka transferi önce, sanal POS + 3D Secure sonra hazırlanır.

## Kalıcı kurallar
- Adım adım, kontrollü ilerlenir.
- Overlay zip tek kök klasörlü olmalıdır.
- UI dili sade Türkçe ve düşük bilişsel yüklü kalmalıdır.
- “wizard” yerine tek Guided Mode/Stepper yaklaşımı korunur.
- “driver GPS” yerine “sürücünün telefon GPS'i” kullanılır.
- “agreement” yerine “sözleşme” kullanılır.
- Sistem eskiye döndürülmez; script/check/doc yeni canonical gerçeğe göre güncellenir.

## Infra / queue guardrail
- `autoReachedQueue` claim / processing / reclaim / dead-letter katmanlarıyla daha dayanıklı hale getirilmiştir; yine de tam enterprise exactly-once queue değildir.
- Redis down / worker crash / shutdown handoff / stale reclaim / poison job sınırları `docs/RUNBOOK_AUTO_REACHED_QUEUE_DURABILITY_V1.md` ve `docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md` içinde resmi olarak tanımlıdır.
- Operasyonel ölçüm ve yönetim kapısı: `GET /api/admin/queues/auto-reached`, `GET /api/admin/queues/auto-reached/proof`, `GET /api/admin/queues/auto-reached/dead-letter`, `GET /api/admin/queues/auto-reached/thresholds`, `POST /api/admin/queues/auto-reached/dead-letter/:taskId/requeue`, `POST /api/admin/queues/auto-reached/dead-letter/:taskId/resolve`, `POST /api/admin/queues/auto-reached/incident-sync`.
- Incident/alarm kartı ve chaos proof notları `docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md` içinde yaşar; `verify:final` snapshot öncesi generated `web/dist`, `mobile/dist` ve `backend/dist` artığını temizler.
- Clean-clone doğrulama yolu: `tools\verify_clean_clone.ps1`.

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
- Latest static milestone chain: `npm run verify:milestones` -> `node backend/scripts/run_m0_latest.js --static-only --to latest --continue`.
- Current live surface pack: `npm --prefix backend run current:surface`.
- Deep surface diagnostic wrapper: `tools/run_all_checks.ps1 -Deep` (current live surface pack + legacy parent/KVKK/retention/ops yüzeyleri).
- M91 local acceptance overlay: shift/agreement route preview ve kaynak vardiya bağlantısı `docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md` ile takip edilir.
- M92 repo verification spine: package scriptleri, tools wrapper, manifest, state ve runbook bağlantısı `npm run verify:repo` altında toplanır.

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
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js` ve `web/src/panels/shared/CopilotPanel.jsx` **acceptance-sensitive / later** sınıfındadır; `mobile/App.js` shell kalır, yeni mobile iş helper/state/screen dosyalarına taşınır.
- `web/src/panels/company/ShiftPeopleTab.jsx` **safe candidate review** kuyruğundadır.
- Bu queue, `tools/repo_contract_state.json` içindeki `hotFileQueuePolicy` alanı ve `repo_audit` çıktısı ile birlikte doğrulanır.
- Sıcak dosya borcu en son ele alınır; önce güvenlik, doğrulama, hygiene ve acceptance odaklı işler tamamlanır.

## export / package hygiene closure
- Satır azaltma en sona bırakılır; bu adım export güveni ve çalışma alanı hijyeni içindir.
- `.env`, build/dist artıkları, `backend/data/*.json` legacy residues, `data/*.json`, `artifacts/runtime-data/*.json` ve overlay/log kalıntıları shareable pakete giremez.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip üretimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.
- Fiziksel snapshot yüzeyi için ayrı soft gate: `npm run verify:snapshot`.
- `verify:snapshot` fiziksel dosya yüzeyini raporlar; ilk turda `verify:final` hattını bloklamaz.

## CI / verification visibility
- Repo-native görünür doğrulama zinciri: `npm run verify:ci`.
- Root verify zinciri backend + web lint çalıştırır; web lint kanonik kanıtı: `artifacts/lint/web_lint_latest.txt`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml` (historical/internal identifier).
- Fresh runner hazırlığı workflow içinde explicit: `npm --prefix backend ci` ve `npm --prefix web ci`.
- `repo-verification` işi root verify chain çalıştırır; `shareable-export` işi M90C.7 export hygiene pack çalıştırır.
- Artifact görünürlüğü: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- Satır azaltma en sona bırakılır; bu adım görünür doğrulama içindir.

## safe closure / final hygiene checklist
- Kanonik final doğrulama girişi: `npm run verify:final`.
- `verify:final`, önce `verify:repo` zincirini çalıştırır; sonra fiziksel snapshot soft gate raporunu yeniler.
- Bu komut web lint kanıtını `artifacts/lint/web_lint_latest.txt` dosyasına ve snapshot raporunu `artifacts/repo-audit/physical_snapshot_hygiene_latest.json` dosyasına yazar.
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

## PERFORMANCE_EVIDENCE_20260427
- 2026-04-27 benchmark evidence doc: `docs/PERFORMANCE_EVIDENCE_20260427.md`
- 3000 vehicles, 30 cycles, 120s cadence, publish-only: 90,000 requests, p95 27.66ms, throttled 0.
- 3000 vehicles, 10 cycles, 120s cadence, readstorm: 30,000 GPS requests, 523,405 panel invalidations, p95 27.39ms, throttled 0.

## EVIDENCE_PACK_20260428
- Evidence index: `docs/EVIDENCE_PACK_20260428.md`
- Groups synthetic performance evidence, M93 queue proof, and remaining field checklist in one roof.
- Long soak artifact: `artifacts/benchmarks/gps_auto-reached_3000veh_30cycles_2026-04-29T05-12-16-959Z.json`
- Field capture template: `docs/SAHA_EVIDENCE_PACK_TEMPLATE.md`
- Field capture guide: `docs/MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md`
- Keeps the long-soak / chaos / pilot evidence conversation readable without scattering links across the repo.
- Temiz readstorm kanıtı: 3000 araç, 3 cycle, 9000 / 9000 OK, errors 0, throttled 0, p95 33.21ms.
- Not: `PASSWORD_CHANGE_REQUIRED` seed-user hijyen hatası kapanmıştır; önceki hatalar throughput problemi değildi.
- `OP-04` servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü olarak bağlar; `OP-01` readonly omurga, `OP-02` manuel not ve `OP-03` küçük kart korunur; settlement aktif değildir, komisyon hesaplama aktif değildir.
- `QLT-01` kalite puanı + sağlayıcı karşılaştırması hazırlık omurgasıdır; OP-01→OP-04 evidence chain bu hazırlığın temelidir ve kesin puan üretmez.
- `QLT-02` kontrollü kalite skoru taslak modelidir; `QLT-01` hazırlığı üstünden taslak skor üretir, `QLT-03` kontrollü kalite inceleme kararı sonraki görünür halkadır.
- `QLT-03` kontrollü kalite inceleme kararıdır; `QLT-04` kalite karar geçmişi / denetim izi görünürlük halkasıdır.

## M90C.9 SAFE CLOSURE / FINAL HYGIENE
- M90C.9 görünür closure hygiene milestone kaydıdır.
- Resmi çalışma rotası kontrollü M90 hattında kalır.
- Bu kayıt final hijyen standardını ve `npm run verify:final` kapanışını temsil eder.
## PRIMER_PERFORMANCE_CLEAN_READSTORM_3000_20260427
- 2026-04-27 temiz readstorm kanıtı: 3000 araç, 3 cycle, 120s cadence, 9000 / 9000 OK.
- Sonuç: throttled 0, errors 0, p95 33.21ms, p99 42.1ms.
- Panel yükü: 210 panel request, 179 panel reload, 125282 panel invalidation.
- PASSWORD_CHANGE_REQUIRED seed-user hijyen hatası kapandı; önceki benchmark hataları sistem yükü değil test datası hijyeniydi.

## M93 QUEUE DURABILITY PROOF
- M93, autoReachedQueue için queue dayanıklılık kanıtı ve görünürlük hattıdır.
- Kapsam: Redis down/up, worker restart reclaim, dead-letter görünürlüğü ve threshold kontrolü.
- Komut: `tools\pack_m93_queue_durability_proof.ps1 -RepoRoot D:\servis-platform`.
- Runtime probe: `backend/scripts/m93_queue_durability_runtime_probe.js`.
- Not: Bu proof exactly-once queue iddiası değildir; operasyonel dayanıklılık ve görünürlük kanıtıdır.
