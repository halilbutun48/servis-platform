# RUNBOOK M76A-2 — Final Normalization + Archiving

Amaç: living giriş düzenini bozmadan tools kökündeki sıcak hotfix pack/check dosyalarını grouped living altına taşımak ve kökte compatibility alias bırakmaktır.

Bu adımın kapsamı:
- `tools/packs/living/hotfixes/` altında yaşayan hotfix pack dosyaları
- `tools/checks/living/hotfixes/` altında yaşayan hotfix repo-contract/check dosyaları
- kökte eski yol referansları için ince alias wrapper
- `pack_living` ve `verify_living_runtime` varsayılanının M76 seviyesine çekilmesi

Bu adım çalışma akışını kırmadan klasör temizliği yapar; runbook ve milestone dokümanları `docs/` altında kalır.
