# backend/data

Bu klasör legacy compatibility shell'idir.

Kural:
- `*.json` ve `*.json.bak` dosyaları repoda takip edilmez.
- Yeni runtime JSON store'ları varsayılan olarak `artifacts/runtime-data` altında oluşur.
- Bu klasörde yalnızca `.gitkeep`, `.gitignore` ve bu README dosyası kalıcı olarak repoda tutulur.

Not:
- `backend/data` artık ana runtime çalışma alanı değildir.
- Geçici runtime state için kanonik kök `artifacts/runtime-data`'dir.
- Çoklu instance / yatay ölçek senaryolarında kalıcı sistem kaynağı olarak değerlendirilmemelidir.
- `npm run verify:snapshot` legacy `backend/data/*.json` artıkları için soft-gate/guardrail raporu üretir; aktif runtime verisi artık bu klasörde tutulmaz.
- `M90C.7` export/package hygiene hattında runtime JSON store'lar shareable export yüzeyine dahil edilmez.
