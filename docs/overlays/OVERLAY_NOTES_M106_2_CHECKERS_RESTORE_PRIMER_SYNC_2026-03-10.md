# OVERLAY NOTES — M106.2 Checkers Restore + Primer Sync

Tarih: 2026-03-10

Bu overlay şu işleri yapar:
- eksik kalmış `tools/check_repo_cleanup_m104.ps1` geri yüklenir
- eksik kalmış `tools/check_tools_hygiene_m105.ps1` geri yüklenir
- yeni `tools/check_repo_hygiene_m106.ps1` eklenir
- stray `tools/PRIMER_SNAPSHOT_2026-03-10_M106_1.md` arşive taşınır
- `tools/PRIMER_SNAPSHOT.md`, `docs/PRIMER_SSOT.md`, `docs/STARTPACK_V1.md`, `tools/README.md` M106 çizgisine hizalanır

Beklenen sonuç:
- tools kökünde yeniden kanonik check script hattı görünür
- primer/SSOT dosyaları link TTL politikasını ve login’siz personel link modelini doğru anlatır
- repo tarafında aktif stale iz olarak M106.1’den kalan extra primer dosyası temizlenir
