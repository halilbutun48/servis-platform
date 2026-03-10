# Tools (Windows friendly)

Bu klasörün kökü sadece **kanonik runtime / pack / check** script’leri için kullanılır.

## Kökte kalması gereken kanonik script’ler
- `tools\gate.ps1`
- `tools\pack.ps1`
- `tools\pack_m42_optional.ps1`
- `tools\pack_step06_stabil.ps1`
- `tools\pack_step1_security_foundation.ps1`
- `tools\pack_step1_totp_stepup.ps1`
- `tools\check_*.ps1` repo-contract / hygiene check’leri
- `tools\reset-and-pack.ps1`
- `tools\_console_status.ps1`

## Kökte kalan doküman pointer’ları
- `tools\PRIMER_SNAPSHOT.md`
- `tools\CHECKLIST_SSOT.md`
- `tools\README.md`
- `tools\STABLE_TO.txt`

## Arşiv düzeni
- `tools\_archive\legacy-overlays\` → eski `apply_*`, `overlay_*`, `OVERLAY_*` dosyaları
- `tools\_archive\oneoff-hotfixes\` → tek seferlik hotfix yardımcı script’leri
- `tools\_archive\legacy-docs\` → deprecated tools içi metin dosyaları
- `tools\_backup\` → otomatik backup çıktıları

## Kanonik green komutları
- `tools\pack.ps1 -To 41` → ana regresyon
- `tools\pack_m42_optional.ps1` → M42 optional
- `tools\pack_step06_stabil.ps1` → Step 0.6 stabil
- `tools\pack_step1_security_foundation.ps1` → Step 1 foundation
- `tools\pack_step1_totp_stepup.ps1` → Step 1 TOTP
- `tools\pack_m44_telematics.ps1` → Step 2.5 telematics

## Windows ExecutionPolicy
PowerShell imza/ExecutionPolicy engelinde wrapper kullan:
- `tools\gate.cmd`
- `tools\pack.cmd`

## Hijyen kontrolü
- `tools\check_repo_cleanup_m104.ps1` → repo cleanup kontrolü
- `tools\check_tools_hygiene_m105.ps1` → tools kök hijyen kontrolü
- `tools\check_repo_hygiene_m106.ps1` → link TTL + primer/hygiene kontrolü

Kural: yeni tek seferlik overlay/apply script’i repo kalıcı araç setine eklenmez; işi bittikten sonra `tools/_archive/` altında tutulur.
