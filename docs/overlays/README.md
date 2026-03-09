# docs/overlays

Bu klasör **overlay notları / değişiklik kayıtları / tek seferlik patch geçmişi** içindir.
Runtime veya build için zorunlu kaynak değildir.

## Kural
- Yeni overlay notları repo root yerine **buraya** alınır.
- Aktif seri klasör bazlı tutulur: ör. `M80/`, `M81/`, `M82/`, `STEP06/`.
- Eski root overlay notları `docs/overlays/_archive/root-legacy/` altına arşivlenir.
- Yeni tek seferlik overlay paketleri mümkün olduğunca **tek zip** olarak üretilir.

## Giriş noktaları
- Genel indeks: `docs/overlays/INDEX.md`
- Step 0.6 stabil ekler serisi: `docs/overlays/STEP06/README.md`

## Not
Repo root’ta çok sayıda `OVERLAY_*` / `README_*overlay*` dosyası birikirse,
`tools/apply_overlay_overlay_cleanup_bundle.ps1` ile bu klasör yapısına toplanır.
