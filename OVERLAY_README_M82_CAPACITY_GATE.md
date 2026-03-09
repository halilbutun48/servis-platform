# OVERLAY — M82 Capacity Gate + Approve Safety

Bu overlay şu problemi kapatır:
- ROOM approve ekranında sadece zaman çakışması kontrol ediliyordu.
- Kapasitesi yetersiz araç, 40 yolculu vardiya için bile "uygun" görünebiliyordu.

## Bu overlay ne yapar?

### Backend
- `GET /api/availability`
  - `shiftId` verildiğinde seçilen aracın kapasitesini vardiyanın gerekli yolcu sayısıyla karşılaştırır.
  - Yetersizse `CAPACITY_INSUFFICIENT` veya `VEHICLE_CAPACITY_MISSING` döner.
- `PUT /api/shifts/:id/approve`
  - Kapasite yetmiyorsa approve işlemini 409 ile bloklar.
- `GET /api/shifts`
  - UI için `assignmentCount`, `peopleCount`, `orgPassengerCount`, `requiredPax` alanlarını ekler.
- `GET /api/offers/inbox`
  - Quick approve modalı için aynı `requiredPax` özetini ekler.

### UI
- `web/src/panels/room/ShiftsPanel.jsx`
  - Yolcu / koltuk / eksik kapasite gösterir.
  - Yetersiz kapasitede Approve butonunu disable eder.
  - "Bu araçla min kaç araç gerekir" bilgisini gösterir.
- `web/src/panels/room/OffersPanel.jsx`
  - Hızlı Onayla modalında kapasite özeti ve blokaj eklenir.

## Not
Bu overlay çoklu araç + çoklu driver atamayı henüz eklemez.
Ama yanlış tek-araç onayını tamamen kapatır ve operatöre net uyarı verir.
Sonraki adımda gerçek çözüm olarak paket/child-shift veya multi-vehicle allocation eklenebilir.
