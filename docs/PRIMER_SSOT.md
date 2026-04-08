# PRIMER SSOT — canonical living route snapshot

Bu primer yaşayan hattın resmi özetidir.

## Güncel baz
- Repo: `servis-platform`
- Branch: `main`
- Güncel doğrulanmış baz: `M0->M89 green`
- Tarihsel temiz anchor: `M0->M79`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`

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
- tek parça script rehberi
- screenshot bağımlılığını azaltan proof reformu
- repo hijyen kapanışı

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
