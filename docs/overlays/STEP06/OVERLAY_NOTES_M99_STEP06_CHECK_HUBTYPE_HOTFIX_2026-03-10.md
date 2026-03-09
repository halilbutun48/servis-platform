# M99 — STEP06 CHECK HUB TYPE HOTFIX (2026-03-10)

## Sorun
`backend/scripts/step06_stabil_check.js` içindeki test helper, `/api/shifts` create contract’ına aykırı şekilde stop listesine `type: "HUB"` gönderiyordu.

Ancak `createShiftSchema` sadece `COMMON | MANUAL` kabul eder.
Bu nedenle Step 0.6 mini-check, gerçek ürün davranışı bozuk olmadığı halde shift create adımında fail oluyordu.

## Düzeltme
- Hub artık stop olarak gönderilmiyor.
- Hub koordinatı `hubLat/hubLng` alanlarıyla taşınıyor.
- Stoplar `COMMON` olarak 1..N sırasıyla kalıyor.

## Etki
- `tools/pack_step06_stabil.ps1` içindeki runtime mini-check, repo contract ile uyumlu hale gelir.
- Ana M41/M42 davranışı etkilenmez.