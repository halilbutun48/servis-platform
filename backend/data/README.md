# backend/data

Bu klasör runtime JSON store dosyaları için çalışma alanıdır.

Kural:
- `*.json` ve `*.json.bak` dosyaları repoda takip edilmez.
- Gerekli dosyalar uygulama çalışırken otomatik üretilir.
- Bu klasörde yalnızca `.gitkeep`, `.gitignore` ve bu README dosyası kalıcı olarak repoda tutulur.

Not:
- Bu yapı geçici runtime state içindir.
- Çoklu instance / yatay ölçek senaryolarında kalıcı sistem kaynağı olarak değerlendirilmemelidir.
