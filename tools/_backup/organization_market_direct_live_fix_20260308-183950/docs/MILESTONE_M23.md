# M23 — WS agreement:update → Agreements Auto-Refresh (UX)

## Hedef
Company/Room Agreements panelleri, backend’den gelen `agreement:update` WS event’i ile otomatik yenilensin.

## Sorun
Backend `agreement:update` event’ini atıyor ama payload çoğu yerde `{ kind: "created" | "approved" | ... }` gibi geliyor.
Web tarafında WS topic tahmini `kind` üzerinden yapıldığı için `"agreement"` kelimesi görülmüyor ve `invalidate("agreements")` tetiklenmiyor.

## Çözüm (M23-A)
Web `ws.js` normalize katmanına gerçek event adını ekledik:
- `msg._event = eventName`
- `guessTopics()` raw string’ine `eventName` eklendi (`agreement:update` içeriyorsa agreements invalidation)
- `shouldInvalidate()` kind yoksa `_event` üzerinden devam eder.

Bu sayede payload `kind:"created"` olsa bile event adı `agreement:update` ile `agreements` topic’i invalidate olur.

## DoD
- Company Agreement create/extend/cancel sonrası Company & Room Agreements listeleri WS ile auto-refresh olur.
- Room approve sonrası Company & Room Agreements listeleri WS ile auto-refresh olur.
- `tools/pack.ps1 -To 23` PASS.

## Doğrulama
- `backend/scripts/m23check.js`:
  - Company + Room WS connect
  - Company create agreement → her iki tarafta `agreement:update` alındı
  - Room approve → her iki tarafta `agreement:update` alındı
  - Company cancel → her iki tarafta `agreement:update` alındı