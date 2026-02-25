# Sprint 3 Plan — Review UI + Kalite + Check Paketi

## Hedef
- Geocode sorunlarını operasyonel olarak yönetilebilir yap (NEEDS_REVIEW/FAILED)
- Regression test paketini genişlet (Excel → Draft akışı)
- Rota kalitesini artırmak için minimal iyileştirmeler

## Kapsam (In)
- Company “NEEDS_REVIEW” listesi + manuel düzeltme
- Manual override korunur
- m-check / fullcheck genişletme (Sprint 1–2)
- Rota sıralama MVP: nearest-neighbor (+ opsiyonel 2-opt)

## API
- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- `PUT /api/company/personels/:id/location` (lat,lng + geoManualOverride=true)

## DoD
- NEEDS_REVIEW listesi görülebilir
- Manuel düzeltme sonrası `geoStatus=OK`
- Test pack: import + cache + cluster + draft + approve akışını doğrular
