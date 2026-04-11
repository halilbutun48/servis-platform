# RUNBOOK M76A-2 â€” Final Normalization + Archiving

> Tarihsel not: Bu runbook M76A-2 anindaki normalize/archiving kararini anlatir. Guncel varsayilanlar daha sonra M89 bazina tasinmistir.

AmaÃ§: living giriÅŸ dÃ¼zenini bozmadan tools kÃ¶kÃ¼ndeki sÄ±cak hotfix pack/check dosyalarÄ±nÄ± grouped living altÄ±na taÅŸÄ±mak ve kÃ¶kte compatibility alias bÄ±rakmaktÄ±r.

Bu adÄ±mÄ±n kapsamÄ±:
- `tools/packs/living/hotfixes/` altÄ±nda yaÅŸayan hotfix pack dosyalarÄ±
- `tools/checks/living/hotfixes/` altÄ±nda yaÅŸayan hotfix repo-contract/check dosyalarÄ±
- kÃ¶kte eski yol referanslarÄ± iÃ§in ince alias wrapper
- M76A-2 anÄ±nda `pack_living` ve `verify_living_runtime` varsayÄ±lanÄ±nÄ±n M76 seviyesine Ã§ekilmesi

Bu adÄ±m Ã§alÄ±ÅŸma akÄ±ÅŸÄ±nÄ± kÄ±rmadan klasÃ¶r temizliÄŸi yapar; runbook ve milestone dokÃ¼manlarÄ± `docs/` altÄ±nda kalÄ±r.

Compatibility alias note:
- Root hotfix check wrappers may remain for backward compatibility.
- Canonical implementations live under `tools/checks/living/hotfixes/`.
- Explicit compatibility aliases are excluded from the duplicate-check consolidation metric in `backend/scripts/repo_audit.js`.
