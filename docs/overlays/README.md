# docs/overlays

Bu klasör **overlay notları / değişiklik kayıtları / tek seferlik patch geçmişi** içindir.
Runtime veya build için zorunlu kaynak değildir.

## Kritik not
- Buradaki `M80 / M81 / M82` klasörleri Mart 2026 tarihli tarihsel overlay serisidir.
- Bunlar güncel aktif milestone anlamı değildir.
- Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.

## Kural
- Yeni overlay notları repo root yerine **buraya** alınır.
- Eski root overlay notları `docs/overlays/_archive/root-legacy/` altına arşivlenir.
- Yeni tek seferlik overlay paketleri mümkün olduğunca **tek zip** olarak üretilir.

## Giriş noktaları
- Genel indeks: `docs/overlays/INDEX.md`
- Step 0.6 stabil ekler serisi: `docs/overlays/STEP06/README.md`
