# OVERLAY — Update docs/CHECKLIST_SSOT.md from user content (SAFE) (2026-03-06)

Önceki `overlay_update_checklist_ssot_user.ps1` parser hatası veriyordu.
Bu sürüm, temiz kaynak olarak `tools/CHECKLIST_SSOT.md` kullanır ve UTF-8 without BOM yazar.

Apply:
1) Zip'i repo root'a çıkar
2) Run: `./tools/overlay_update_checklist_ssot_user.ps1`
