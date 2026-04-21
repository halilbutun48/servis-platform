# backend/data

Bu klasör runtime JSON store dosyaları için çalışma alanıdır.

Kural:
- `*.json` ve `*.json.bak` dosyaları repoda takip edilmez.
- Gerekli dosyalar uygulama çalışırken otomatik üretilir.
- Bu klasörde yalnızca `.gitkeep`, `.gitignore` ve bu README dosyası kalıcı olarak repoda tutulur.

Not:
- Bu yapı geçici runtime state içindir.
- Çoklu instance / yatay ölçek senaryolarında kalıcı sistem kaynağı olarak değerlendirilmemelidir.
- `npm run verify:snapshot` bu klasördeki runtime JSON dosyalarını hard-fail değil warning/review-needed olarak raporlar.
- `M90C.7` export/package hygiene hattında ise bu dosyalar shareable export yüzeyine dahil edilmez.
