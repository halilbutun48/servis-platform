# OVERLAY M74.3 — Timeline polish + Personel/Company Live Map enrich

Bu overlay şunları yapar:

## Personel (MyRidePanel) — M74.2.2 + M74.2.3
- Mini Timeline artık **Şu anki durum** kartında
- NEXT seçimi: **remainingKm en düşük** (yoksa etaMin, yoksa order)
- Timeline chip'e tıklayınca ETA tablosunda ilgili satıra scroll + highlight
- ETA tablosunda NEXT satırı badge

## Company (RoutePreviewModal) — M74.3
- Mini Timeline eklenir
- Chip'e tıkla → Durak Listesi'nde o satıra scroll + highlight

## Live Maps
- Personel Canlı (/personel/live): sadece kendi shift aracı + (varsa) duraklar/ETA + timeline
- Company Harita (/company/map): seçili aracın ACTIVE/APPROVED shift durakları + timeline (varsa)

Uygulama (max 1-2 komut):
1) Zip'i repo root'a aç (overwrite)
2) Vite açıksa Ctrl+F5, değilse web'de npm run dev
