# docs/overlays
Buradaki dosyalar **overlay notları / değişiklik kayıtları** içindir.

## Kural
- Yeni overlay notlarını `docs/overlays/M80+/*` altında tut.
- Repo root’ta eski alışkanlıktan kalan overlay notları varsa arşive alınır.

## Geriye dönük uyumluluk
Repo root’ta görünen `OVERLAY*.md` ve `README_M*.md` dosyaları artık **stub**:
- Eski referanslar kırılmasın diye tutulur
- Asıl içerik: `docs/overlays/_archive/`

Giriş noktası: `docs/overlays/INDEX.md`
