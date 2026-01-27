# Sprint 3 Plan — Review UI + Kalite + Check Paketi

## Hedef
- Geocode sorunlarýný operasyonel olarak yönetilebilir yap (NEEDS_REVIEW/FAILED)
- Regression test paketini geniþlet (Excel›Draft akýþý)
- Rota kalitesini artýrmak için minimal iyileþtirmeler

## Kapsam (In)
- Company “NEEDS_REVIEW” listesi + manuel düzeltme
- Manual override korunur
- m-check / fullcheck geniþletme (Sprint 1–2)
- Rota sýralama MVP: nearest-neighbor (+ opsiyonel 2-opt)

## API
- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- `PUT /api/company/personels/:id/location` (lat,lng + geoManualOverride=true)

## DoD
- NEEDS_REVIEW listesi görülebilir
- Manuel düzeltme sonrasý `geoStatus=OK`
- Test pack: import + cache + cluster + draft + approve akýþýný doðrular
