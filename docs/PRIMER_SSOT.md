# VARDIS / PERSONEL SERVİS V1 — PRIMER SSOT

Tarih: 2026-04-02
Timezone: Europe/Istanbul

## Repo / baz
- Repo: `D:\servis-platform`
- Branch: `main`
- Baz alınacak durum: kullanıcının verdiği en güncel patch uygulanmış repo
- Son temiz durum: `MASTER PACK PASS OK (M0->M79)`
- Repo audit durumu: `REPO AUDIT MASTER PASS`
- Aktif çalışma kuralı: ürün kodu geri alınmaz; pack/check/runbook/doc yeni gerçeğe uydurulur

## Güncel ürün tanımı
Bu ürün sadece personel servisi değildir.
Bu ürün sadece okul/öğrenci/veli sistemi de değildir.
Doğru tanım:
- okul + öğrenci + veli alanını taşıyan
- company + organization + personel alanını taşıyan
- teklif + sözleşme + atama + canlı operasyon süreçlerini tek omurgada birleştiren
- GPS tabanlı karma taşıma platformu

Marka adı dış anlatımda **Vardis** olarak kullanılır.

## Bu turda kapanan ana işler
### 1) Parent Access / Veli Erişimi
- legacy auth invite mantığı ürün yüzeyinden kaldırıldı
- yeni akış: öğrenci + süre + erişim linki + erişim kodu + PIN
- email / phone / ad soyad gereksiz toplama yok
- linkten girişte `/parent/live` akışı korunuyor
- fallback: `Kod + PIN`
- revoke / süre / deneme limiti / hash mantığı korunuyor

### 2) Parent live / public live
- parent canlı ekranı çalışır durumda
- personel/public live tarafındaki doğru işler korunmuş durumda
- görünürlük ve canlı akış bozulmadı

### 3) Repo hijyeni
- legacy invite kalıntıları temizlendi
- env ve osrm data git tracking dışına alındı
- `.gitignore` güncellendi
- exact duplicate groups: `0`
- repo audit green

### 4) OSRM / module hygiene
- OSRM kodu repoda kalır
- OSRM data git’e gitmez
- default compose modunda:
  - `OSRM_URL=<empty>`
  - `PLAN_SOLVER_URL=<empty>`
  - `ROUTE_LEARN_ENABLED=0`
- normal mod sade/fallback davranır
- OSRM bilinçli açılınca aktif olur

### 5) Bootstrap / server cleanup
- `server.js` sadeleştirildi
- route factory / route mounts bootstrap dosyalarına ayrıldı
- rate limit/helper blokları ayrıştırıldı
- davranış korunarak merkez dosya sadeleştirildi

## Kritik öğrenim
- Bu repo’da pack geçen her şey ürün güvenliği garantisi değildir.
- Bazı kırıklar check/runbook/script exact-string beklentisinden çıktı.
- Özellikle bootstrap refactor sonrası önce şu yeni kökler kontrol edilmelidir:
  - `backend/src/bootstrap/routeMounts.js`
  - `backend/src/bootstrap/rateLimits.js`
- Yeni kural:
  - önce kırılan milestone/pack çözülür
  - full `M0->M79` en sonda tekrar alınır

## Teknik gerçekler
- `main` branch temiz ve güncel kabul edilir
- pack green
- repo audit green
- bootstrap refactor + check hizaları oturmuş durumda
- Parent Access akışı repo kodunda güncel haliyle vardır
- `tools/STABLE_TO.txt = 78` değeri M78.x compatibility kontrolleri için korunur
- bu marker’ın `78` kalması, son tam master pack doğrulamasının `M79` olduğu gerçeğiyle çelişmez

## Kanonik komutlar
- Son tam master doğrulama: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M79 acceptance: `tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform`

## Milestone hizası
### Doğrulanmış güncel durum
- `M75` yaşayan teknik taban kavramı olarak sürer
- `M76A-1`, `M76B`, `M76A-2` normalizasyon/konsolidasyon hattı kapalıdır
- `M77` KVKK/uyum hattı kapalıdır
- `M78`, `M78.1`, `M78.2`, `M78.3` operasyon doğrulama omurgası kapalıdır
- `M79` Copilot acceptance turu kapalı kabul edilir

### Bundan sonraki aktif anlam
- `M80`: final sert kabul ve yük güveni
- `M81`: mobil saha sertleştirme
- `M82`: controlled cleanup + consolidation + profesyonelleştirme

## Tarihsel overlay notu
`docs/overlays/M80`, `M81`, `M82` klasörleri Mart 2026 tarihli tarihsel overlay serisidir.
Buralardaki numaralar güncel aktif milestone anlamı değildir.
Aktif anlam için sadece:
- `docs/PRIMER_SSOT.md`
- `docs/MILESTONE_REGISTRY_V1.md`

baz alınır.

## Çalışma kuralı
- en güncel repo snapshot’ını baz al
- ürün davranışını bozma
- geniş refactor yapma
- güvenli, küçük, kontrollü ilerle
- önce kırık milestone/pack’i çöz
- full `M0->M79` sadece final teyitte koş
- md/docs/runbook/check hiza bozuksa yeni gerçeğe uydur

## M80 aktif kapı notu
- `M80` artık final sert kabul ve yük güveni kapısı olarak repo içinde resmi dosya setine sahiptir.
- M80 ilk tur komutu: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- Bu ilk tur PASS, **kapının açıldığını** gösterir; **resmi green değildir**.
- Resmi green için hot panel daraltma, son kullanıcı/saha signoff ve final kanıt hijyeni ayrıca tamamlanmalıdır.
- M80.1 komutu: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.1 odak: `GeoReviewPanel`, `MapPanel`, `ShiftsPanel` sıcak noktalarını daraltmak.
- M80.2 komutu: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80.2 odak: `AgreementsPanel` giriş yükünü ve `ShiftsPanel` tekrar eden özet/intent yüklerini daraltmak.
- M80.3 komutu: `tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80.3 odak: `GeoReviewPanel` çağrı yoğunluğunu ve `ShiftsPanel` effect/giriş yükünü son kontrollü turda daraltmak; bu tur tamamlandı.

## Kısa karar cümlesi
Repo şu anda “M79’a kadar doğrulanmış, M80 kabul kapısı açılmış ve `M80.1` / `M80.2` / `M80.3` daraltma turları pack-pass ile görünür” durumdadır. Teknik state markerları compatibility için M80 tarafında kalabilir; iş sırası olarak sonraki ana faz `M81` mobil saha sertleştirmedir. `M82` controlled cleanup sonrası saha testi kullanıcı tarafından yapılacaktır.

<!-- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1 -->
- Veli Erişimi ve public link presetleri: 1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl
- Parent/veli erişiminde üst sınır: 365 gün
- Personel/öğrenci public canlı link presetleri: 1 hafta / 1 ay / 6 ay / 1 yıl
- Public canlı linklerde üst sınır: 365 gün

<!-- REPO_CONTRACT_COMPAT_PRIMER_V2
pack_m58_final_pilot_readiness.ps1
M58 hazirlik komutu
Final Pilot Readiness
Tarihsel M58 kabul notu
resmi green
M59
pack_m59_observability_field_diagnostics.ps1
M59 -> M65
M61 — SSOT + Milestone Hizası
M62 — Ticari Omurga Güçlendirme
pack_m62_commercial_core_strengthening.ps1
M63 — Güven + Kalite + Hizmet Değerlendirme
pack_m63_trust_quality_service_evaluation.ps1
M64 — Doğal Copilot Katmanı
pack_m64_natural_copilot_layer.ps1
M65 — Pilot Launch Gate
M66
pack_m66_operation_reassignment.ps1
post-M66 functional
M75 green baseline
M76A-1
M77
M78
DB anonymize
fonksiyonel
REPO_CONTRACT_COMPAT_PRIMER_V2 -->


## Repo contract state
- Makine-okur durum özeti: `tools\repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.
