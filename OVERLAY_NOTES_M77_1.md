# OVERLAY — M77.1 — Anti-429 / Scale Pack (Patch Lists + Cap Vehicles + In-flight Guard)

Tarih: 2026-03-01 (Europe/Istanbul)

## Amaç
M77.0 ile kırılan **WS spam → HTTP spam** zincirini daha da güçlendirmek:

1) **Listelerde (Map dışı ve bazı Map’ler dahil) `vehicle:status` gibi spam event’lerde HTTP reload yok** → sadece state patch.
2) **UI auto-reload’de “in-flight guard”** → aynı topic art arda invalidate alırsa `load()` concurrent çalışmaz.
3) **`/api/vehicles` hard cap + opsiyonel pagination** → 1200 araç senaryosunda “full liste çekmek” default’ta engellenir.
4) **`vehicle:update` WS event’leri** artık mümkünse *snapshot* taşır → listeler bind/unbind/update/archive gibi değişiklikleri HTTP’siz patch edebilir.

---

## Değişen dosyalar
### Web
- `web/src/live/bus.js`
  - WS invalidate için **sliding debounce** (quiet window sonrası 1 dispatch)
- `web/src/live/useAutoReload.js`
  - **in-flight guard + pending coalesce**
- `web/src/panels/room/VehiclesPanel.jsx`
  - `vehicle:status` => patch (gpsState.lastUiStatus)
  - `vehicle:update` => snapshot varsa upsert/remove; yoksa fallback reload
- `web/src/panels/room/DriversPanel.jsx`
  - `vehicle:status` => patch
  - `vehicle:update` => snapshot varsa patch; archived/deleted remove
- `web/src/panels/room/MapPanel.jsx`
  - `vehicle:status` => patch; diğerlerinde load
- `web/src/panels/company/MapPanel.jsx`
  - `vehicle:status` => patch; diğerlerinde loadVehicles
- `web/src/panels/personel/LivePanel.jsx`
  - `vehicle:status` => sadece myShift.vehicle patch; diğerlerinde loadAll

### Backend
- `backend/src/routes/vehicles.js`
  - `vehicle:update` publish payload’ına **`vehicle` snapshot** eklendi (bind/unbind/update/archive/unarchive/create)
  - `GET /api/vehicles` (ROOM + SUPER_ADMIN):
    - default **hard cap**: 100 (q yoksa), q varsa 200
    - `?take=` ile 1..500
    - `?page=1&limit=50` ile **paged response**: `{items,page,limit,total}`

---

## Beklenen sonuç (DoD)
- `vehicle:status` spam’i artık **Vehicles/Drivers/Map/Personel** ekranlarında **HTTP reload tetiklemez**.
- Aynı topic arka arkaya invalidate olursa, UI’da **load() çakışmaz**; sadece “en son” invalidate ile 1 kez daha çalışır.
- `GET /api/vehicles` yanlışlıkla 1200+ dönmez (default cap).

---

## Notlar
- Pagination response formatı sadece `?page=` ile devreye girer. Mevcut script’ler ve paneller query vermeden **array** almaya devam eder.
- `vehicle:update` snapshot yoksa (beklenmedik bir producer) UI fallback olarak reload yapar.

## Rollback
Bu overlay’i geri almak için bu dosyaları geri çevirmen yeterli:
- `backend/src/routes/vehicles.js`
- `web/src/live/bus.js`
- `web/src/live/useAutoReload.js`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`
