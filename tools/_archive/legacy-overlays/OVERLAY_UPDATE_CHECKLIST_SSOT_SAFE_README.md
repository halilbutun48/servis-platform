# OVERLAY — Update docs/CHECKLIST_SSOT.md (SAFE) (2026-03-06)

Previous scripts failed because markdown was appended into the `.ps1` and PowerShell tried to parse it.
Bu sürümde markdown ayrı dosyadadır ve güvenli şekilde kopyalanır.

Apply:
1) Zip'i repo root'a çıkar
2) Run: `./tools/overlay_update_checklist_ssot_safe.ps1`
