# OVERLAY_NOTES_M81_4 — Parent Live: Sonraki Durak + Kalan Durak Sayısı

## Amaç
Parent ekranında bildirim spam yapmadan canlı durak ilerleme bilgisini göstermek:
- Sonraki durak
- Toplam kalan durak
- Çocuğun durağına kalan durak

## Backend
`GET /api/parent/live/vehicles?childId=` artık her araç için ek alanlar döndürür:
- `nextStop` { id, name, order, type }
- `remainingStopsTotal` (PENDING stop sayısı)
- `childStop` { id, name, order }
- `remainingStopsToChild` (çocuğun durağına kalan PENDING stop sayısı)
- `childStopReached` (boolean)

Hesap:
- Shift stopları: `Stop` tablosu (`state=PENDING/REACHED/SKIPPED`, `order`)
- Sonraki durak = ilk `PENDING` stop
- Kalan (toplam) = `PENDING` sayısı
- Kalan (çocuğa) = sonrakinden başlayıp çocuğun stop order'ına kadar `PENDING` sayısı

## Web
`/parent/live` ekranında "Canlı durum (ETA + durak)" kartında gösterilir.

## Not
Bu overlay sadece live view içindir; bildirim tetikleri M81.3'te.
