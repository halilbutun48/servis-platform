# RUNBOOK M76A-2 — Final Normalization + Archiving

> Tarihsel not: Bu runbook M76A-2 anindaki normalize/archiving kararini anlatir. Guncel varsayilanlar daha sonra M89 bazina tasinmistir.

Amaç: living giriş düzenini bozmadan tools kökündeki sıcak hotfix pack/check dosyalarını grouped living altına taşımak ve kökte compatibility alias bırakmaktır.

Bu adımın kapsamı:
- `tools/packs/living/hotfixes/` altında yaşayan hotfix pack dosyaları
- `tools/checks/living/hotfixes/` altında yaşayan hotfix repo-contract/check dosyaları
- kökte eski yol referansları için ince alias wrapper
- M76A-2 anında `pack_living` ve `verify_living_runtime` varsayılanının M76 seviyesine çekilmesi

Bu adım çalışma akışını kırmadan klasör temizliği yapar; runbook ve milestone dokümanları `docs/` altında kalır.
