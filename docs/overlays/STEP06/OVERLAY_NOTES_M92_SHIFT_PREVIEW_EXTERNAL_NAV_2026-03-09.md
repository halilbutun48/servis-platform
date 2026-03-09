# M92 — Shift Harita Önizleme: Tam Rotayı Dış Navigasyonda Aç

Bu overlay `web/src/components/RoutePreviewModal.jsx` içine tam rota dış navigasyon butonunu ekler.

## Ne değişti?
- Shift harita önizleme modalında üst bilgi alanına `Tam Rotayı Dış Navigasyonda Aç` butonu eklendi.
- Buton, shift preview içindeki koordinatlı durakları rota sırasıyla Google Maps dış navigasyonunda açar.
- Araç canlı GPS başlangıcı şart değildir; duraklar üzerinden tam rota açılır.

## Etkilenen ekranlar
Bu modalı kullanan tüm ekranlar:
- ROOM shift harita önizleme
- COMPANY shift harita önizleme
- ShiftPeopleTab route preview

## Not
- Koordinatlı durak yoksa buton pasif kalır.
- Mevcut `openFullRouteNavigation` util'i kullanılır; yeni backend gerektirmez.
