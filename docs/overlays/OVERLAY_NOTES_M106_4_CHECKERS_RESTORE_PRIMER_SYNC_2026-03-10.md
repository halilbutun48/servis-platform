# OVERLAY NOTES — M106.4 Checkers Restore + Primer Sync

Tarih: 2026-03-10

## Amaç
- Eksik kalan kanonik `tools/check_*.ps1` dosyalarını geri koymak
- M104 false-negative kontrolünü düzeltmek
- M106 link TTL + primer hijyen doğrulamasını tek script ile eklemek
- Fazla tarihli primer dosyasını canlı tools kökünden arşive taşımak

## Uygulananlar
- `tools/check_repo_cleanup_m104.ps1` eklendi/güncellendi
- `tools/check_tools_hygiene_m105.ps1` eklendi/güncellendi
- `tools/check_repo_hygiene_m106.ps1` eklendi
- `tools/README.md`, `tools/PRIMER_SNAPSHOT.md`, `docs/PRIMER_SSOT.md`, `docs/STARTPACK_V1.md`, checklist dosyaları güncellendi

## Beklenen doğrulama
- `tools\check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- `tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`
- `tools\check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform`
