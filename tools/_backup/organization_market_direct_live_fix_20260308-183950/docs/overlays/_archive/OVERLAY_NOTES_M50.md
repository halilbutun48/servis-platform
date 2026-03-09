# OVERLAY — M50 — Counter fix + PlanBuilder cleanup + Hub auto-fill

Tarih: 2026-02-27 (Europe/Istanbul)

## Neler düzeldi?

1) **ROOM Shifts → Market counter patlaması (noteRoom null)**
- UI artık **noteRoom boşsa `null` göndermiyor** (trim → `undefined` → JSON’da omit).
- Ek olarak backend schema **null/"" toleranslı** (defansif).

2) **Plan Builder — “Taslak Vardiya Zamanı” bloğu**
- `hideDraftTransferUI` prop’u `true` ise bu blok **hiç render edilmez**.
- `rangeOverride` ile Step-1’den gelen zaman aralığı PlanBuilder’da **tek doğru kaynak** olur.
- `directionOverride` / `patternOverride` ile Step-1 template item meta’sı shift create’e yansır.

3) **stops/generate — Hub / INBOUND-OUTBOUND**
- Shift’te `hubLat/hubLng` yoksa, `Company.hubLat/hubLng` varsa **otomatik kopyalanır**.
- Stop adları direction’a göre:
  - INBOUND → `Pickup 1..N`
  - OUTBOUND → `Dropoff 1..N`

4) **Shift Tools → Personel Ekle — “Adresten Bul”**
- Manual personel ekleme formuna **Adresten Bul** butonu eklendi.
- `/api/geocode` çağırıp `lat/lng` alanlarını otomatik doldurur.

5) **NavDock — Sözleşmeler Gelişmiş altında**
- Company ve Room’da **Sözleşmeler** ana menüden alınıp **Gelişmiş** altına taşındı.

## Dokunulan dosyalar

- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `backend/src/routes/shifts/schemas.js`
- `web/src/panels/company/PlanBuilderPanel.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `backend/src/routes/shifts/people.js`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/layout/NavDock.jsx`

