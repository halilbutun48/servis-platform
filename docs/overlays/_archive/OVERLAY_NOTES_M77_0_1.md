# OVERLAY M77.0.1 — Pack/Gate 429 Fix (M3CHECK)

## Problem
M77.0 ile route-bazlı rate-limit devreye girdiği için `backend/scripts/m3check.js` içindeki **brute-force complete endpoint denemeleri** kısa sürede çok sayıda `/api/*` isteği atıyor.

Rate-limit middleware `/api/*` seviyesinde bağlandığı için, route 404 olsa bile limiter 429 döndürebiliyor. Bu da M3CHECK’in cleanup aşamasında **shift complete** çağrısını 429’a düşürüp M3CHECK FAIL üretiyor.

## Fix
`backend/scripts/m3check.js` HTTP isteklerine aşağıdaki header eklendi:
- `x-greenpack: 1` (veya `GREENPACK_HEADER` env override)

Server tarafında (NODE_ENV=development iken) `x-greenpack` taşıyan istekler rate-limit’ten **skip** edilir (`greenpackSkip`).

Bu sadece **local Gate/Pack** çalıştırmalarında geçerlidir; prod ortamda skip yoktur.

## Files
- `backend/scripts/m3check.js`

## DoD
- `tools/pack.ps1 -To 17` içinde M3CHECK tekrar **PASS** olmalı (429 görülmemeli).
