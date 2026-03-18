# RUNBOOK — M54.4 DRIVER ROUTE DELIVERY

Tarih: 2026-03-18  
Timezone: Europe/Istanbul

## Amaç
`M54.4`, sürücünün Today ekranından seçtiği **kendi child shift** rotasına net şekilde gitmesini sağlar.

Bu adımın hedefi:
- `GET /api/driver/shifts/:shiftId/route` endpoint'ini açmak
- mevcut `GET /api/driver/route/active` davranışını bozmamak
- Today -> Route akışında belirli vardiyaya deep link vermek
- sürücünün sadece kendi atandığı vardiyanın rota detayını görmesini sağlamak

## Ne değişti?
- backend `driver.js` içinde ortak `buildDriverRoutePayload()` helper eklendi
- explicit rota endpoint'i eklendi: `GET /api/driver/shifts/:shiftId/route`
- Today ekranındaki `Göreve Başla` ve `Rota` aksiyonları `?shift=` ile Route ekranına gider
- Route ekranı önce `shift` query param'ına bakar, yoksa `route/active` fallback'ini kullanır

## Kapsam sınırı
Bu adım şunları çözmez:
- turn-by-turn navigasyon motoru
- arka plan saha telemetry politikası
- dispatch planner'ın kendisi

## Dosyalar
- `backend/src/routes/driver.js`
- `backend/scripts/m54_4_driver_route_delivery_check.js`
- `web/src/panels/driver/TodayPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `tools/pack_m54_4_driver_route_delivery.ps1`
- `tools/check_m54_4_driver_route_delivery_repo_contract.ps1`
- `docs/RUNBOOK_M54_4_DRIVER_ROUTE_DELIVERY.md`

## Kanıt komutu
```powershell
.\tools\pack_m54_4_driver_route_delivery.ps1 -RepoRoot D:\servis-platform
```

## Not
`Today -> Route` deep link'i child shift ayrımını sürücü tarafında görünür hale getirir. Bu sayede sürücü, başka yolcuların devamı hissi yerine kendi işini tek rota olarak görür.
