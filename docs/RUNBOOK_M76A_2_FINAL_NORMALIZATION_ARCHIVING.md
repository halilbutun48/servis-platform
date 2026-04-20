# RUNBOOK M76A-2 — Final Normalization + Archiving

> Tarihsel not: Bu runbook M76A-2 anındaki normalize/archiving kararını anlatır. Güncel varsayılanlar daha sonra M89 bazına taşınmıştır.

Amaç: living giriş düzenini bozmadan tools kökündeki sıcak hotfix pack/check dosyalarını grouped living altına taşımak ve kökte compatibility alias bırakmaktır.

Bu adımın kapsamı:
- `tools/packs/living/hotfixes/` altında yaşayan hotfix pack dosyaları
- `tools/checks/living/hotfixes/` altında yaşayan hotfix repo-contract/check dosyaları
- kökte eski yol referansları için ince alias wrapper
- M76A-2 anında `pack_living` ve `verify_living_runtime` varsayılanının M76 seviyesine çekilmesi

Bu adım çalışma akışını kırmadan klasör temizliği yapar; runbook ve milestone dokümanları `docs/` altında kalır.

Compatibility alias note:
- Root hotfix check wrappers may remain for backward compatibility.
- Canonical implementations live under `tools/checks/living/hotfixes/`.
- Explicit compatibility aliases are excluded from the duplicate-check consolidation metric in `backend/scripts/repo_audit.js`.
