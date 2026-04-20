# M76A-2 — Final Normalization + Archiving

> Tarihsel not: Bu belge M76A-2 teslim anını anlatır; güncel living varsayılanları değildir.

Hedef:
- living araç ağacını daha okunur hale getirmek
- kökteki hotfix pack/check yoğunluğunu azaltmak
- compatibility alias ile eski komut yollarını bozmamak

Başarı ölçütleri:
- grouped living hotfix pack/check klasörleri vardır
- root hotfix dosyaları alias wrapper olarak çalışır
- manifest `M76A-2` pack kaydı içerir
- M76A-2 anında `pack_living` ve `verify_living_runtime` varsayılanı `76` olur

Ek not:
- Root hotfix check wrappers backward compatibility için yaşayabilir.
- Canonical hedef `tools/checks/living/hotfixes/` altıdır.
- Explicit compatibility aliases are excluded from the duplicate-check consolidation metric.
