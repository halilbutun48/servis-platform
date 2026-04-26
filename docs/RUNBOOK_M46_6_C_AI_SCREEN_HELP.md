# RUNBOOK — M46.6-C AI SCREEN HELP

> **Uyumluluk notu (M79+):** Bu M46 runbook'u art?k pilot-era exact versiyon etiketi beklemek yerine, ayn? davran???n modern Copilot y?zeyinde h?l? mevcut olup olmad???n? do?rulayan legacy compatibility referans? olarak okunmal?d?r.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Bu paket şunları ekler:
- ekran rehberi
- buton rehberi
- rol bazlı sade yardım
- DRIVER / PERSONEL / PARENT için ekran rehberi erişimi

## Yeni job tipleri
- `SCREEN_MENU_GUIDE`
- `BUTTON_ACTION_GUIDE`
- `ROLE_HELP_GUIDE`

## Hedef
Kullanıcı bir menünün ne işe yaradığını ve o ekrandaki kritik butonların ne yaptığını çok sade Türkçe ile görebilsin.

## Pack
```powershell
.\tools\pack_m46_6_c_ai_screen_help.ps1 -RepoRoot D:\servis-platform
```