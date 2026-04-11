# M76A-2 â€” Final Normalization + Archiving

> Tarihsel not: Bu belge M76A-2 teslim anini anlatir; guncel living varsayilanlari degil.

Hedef:
- living araÃ§ aÄŸacÄ±nÄ± daha okunur hale getirmek
- kÃ¶kteki hotfix pack/check yoÄŸunluÄŸunu azaltmak
- compatibility alias ile eski komut yollarÄ±nÄ± bozmamak

BaÅŸarÄ± Ã¶lÃ§Ã¼tleri:
- grouped living hotfix pack/check klasÃ¶rleri vardÄ±r
- root hotfix dosyalarÄ± alias wrapper olarak Ã§alÄ±ÅŸÄ±r
- manifest `M76A-2` pack kaydÄ± iÃ§erir
- M76A-2 anÄ±nda `pack_living` ve `verify_living_runtime` varsayÄ±lanÄ± `76` olur

Ek not:
- Root hotfix check wrappers backward compatibility icin yasayabilir.
- Canonical hedef `tools/checks/living/hotfixes/` altidir.
- Explicit compatibility aliases are excluded from the duplicate-check consolidation metric.
