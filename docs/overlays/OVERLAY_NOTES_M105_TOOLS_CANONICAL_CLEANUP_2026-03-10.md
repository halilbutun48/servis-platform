# OVERLAY_NOTES_M105_TOOLS_CANONICAL_CLEANUP_2026-03-10

Amaç: `tools/` kökünü sadece kanonik runtime / pack / check alanı olarak bırakmak ve eski overlay/hotfix kalıntılarını arşive almak.

Uygulananlar:
- `tools/README.md` güncellendi ve kanonik script listesi netleştirildi
- Top-level legacy overlay/apply/readme dosyaları `tools/_archive/legacy-overlays/` altına taşınıyor
- Tek seferlik hotfix script’leri `tools/_archive/oneoff-hotfixes/` altına taşınıyor
- Deprecated tools içi metin dosyaları `tools/_archive/legacy-docs/` altına taşınıyor
- `tools/check_tools_hygiene_m105.ps1` eklendi
- `README.md`, `docs/STARTPACK_V1.md`, checklist dosyaları tools düzenine göre senklendi

Notlar:
- `tools/_backup/` yedek klasörü korunur; otomatik backup alanıdır
- Kanonik komut yolları değişmedi; kullanıcı alışkanlığı korunur
- Bu overlay green milestone değiştirmez; repo/tooling hijyen katmanıdır
