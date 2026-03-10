# OVERLAY — Primer Snapshot / Primer SSOT / StartPack refresh (2026-03-06)

Bu overlay şunları günceller:
- `tools/PRIMER_SNAPSHOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER SNAPSHOT (Yeni).md` (deprecated note)

Özet:
- M36 referansları **M41** olarak güncellendi
- V1/V2 sıralı yol haritası primer dosyalarına işlendi
- Hesap/üyelik yetki politikası primer seviyesinde netleştirildi
- Tek Guided Mode / Stepper, tek overlay (zip), max 3 PowerShell komutu kuralı işlendi
- V1.5 / M43 / M44 / M45 / V2 hattı primer ve startpack’e taşındı

Apply:
1) Zip’i repo root’a çıkar
2) Çalıştır: `./tools/overlay_update_primer_snapshot_safe.ps1`

Not:
- Script overwrite öncesi hedef dosyaları `tools/_backup/...` altına timestamp’li yedekler
- Yazım biçimi UTF-8 without BOM
