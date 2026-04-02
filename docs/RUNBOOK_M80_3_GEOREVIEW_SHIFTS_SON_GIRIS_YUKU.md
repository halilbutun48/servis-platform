# RUNBOOK — M80.3 GEOREVIEW + SHIFTS SON GİRİŞ YÜKÜ

## Amaç
`GeoReviewPanel` ve `ShiftsPanel` için kalan giriş yükü baskısını küçük ve kontrollü şekilde bir kademe daha daraltmak.

## Kapsam
- `GeoReviewPanel` içinde bağımsız küçük state/effect akışlarını birleştirmek
- `ShiftsPanel` içinde düşük riskli effect doğrulamalarını birleştirmek
- Ürün davranışını değiştirmeden scale-readiness görünürlüğünü iyileştirmek

## Dışarıda kalanlar
- Yeni özellik yok
- Büyük refactor yok
- Resmi final green kararı yok
- Mobil saha sertleştirme yok

## Beklenen çıktı
- `GeoReviewPanel` giriş yükü önceki duruma göre daha düşük görünür
- `ShiftsPanel` giriş yükü önceki duruma göre daha düşük görünür
- `AgreementsPanel` eşiğin altında kalmaya devam eder
- M80 / M80.1 / M80.2 zinciri bozulmaz

## Komut
`tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1 -RepoRoot D:\servis-platform`
