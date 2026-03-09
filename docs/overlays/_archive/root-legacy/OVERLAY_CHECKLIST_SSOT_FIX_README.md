# OVERLAY — CHECKLIST SSOT parser fix + content restore (2026-03-06)

Bu paket şunları düzeltir:
- `overlay_update_checklist_ssot*.ps1` parser hatası giderildi
- `docs/CHECKLIST_SSOT.md` içindeki bozuk script artıkları temizlendi
- `tools/CHECKLIST_SSOT.md` temiz kaynak olarak eklendi/güncellendi
- Yazım UTF-8 **without BOM** olacak şekilde sabitlendi

## Değişen dosyalar
- `docs/CHECKLIST_SSOT.md`
- `tools/CHECKLIST_SSOT.md`
- `tools/overlay_update_checklist_ssot.ps1`
- `tools/overlay_update_checklist_ssot_user.ps1`
- `tools/overlay_update_checklist_ssot_safe.ps1`
- `tools/OVERLAY_UPDATE_CHECKLIST_SSOT_README.md`
- `tools/OVERLAY_UPDATE_CHECKLIST_SSOT_USER_README.md`
- `tools/OVERLAY_UPDATE_CHECKLIST_SSOT_SAFE_README.md`

## Uygulama
1. Zip'i repo root'a çıkar (`D:\servis-platform`)
2. Aşağıdakilerden birini çalıştır:
   - `./tools/overlay_update_checklist_ssot.ps1`
   - `./tools/overlay_update_checklist_ssot_user.ps1`
   - `./tools/overlay_update_checklist_ssot_safe.ps1`

Üçü de aynı temiz markdown kaynağını `docs/CHECKLIST_SSOT.md` içine yazar.
