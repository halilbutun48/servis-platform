# OVERLAY_NOTES_M44_TELEMATICS_2026-03-10

Amaç: mevcut `driver -> /api/gps` hattını bozmadan, araç üstü cihaz / vendor cloud kaynaklı konum akışını ayrı bir telematics katmanı olarak eklemek.

## Eklenenler
- `GpsDevice` modeli (`vehicleId`, `vendor`, `serial`, `authTokenHash`, `status`, `lastSeenAt`)
- `POST /api/telematics/push` → cihazın doğrudan HTTP push endpoint'i
- `POST /api/telematics/vendor/:provider` → vendor cloud webhook endpoint'i
- `GET/POST/PATCH /api/telematics/devices` + `POST /api/telematics/devices/:id/rotate`
- normalize core + provider adapter (`generic`, `traccar`)
- telematics ayrı rate-limit bucket
- `m44_telematics_check.js` + `pack_m44_telematics.ps1` + repo-contract checker

## Davranış
- Cihaz akışı `GpsLast` / `GpsPoint` tablolarına yazar ve mevcut live map/WS hattını kullanır.
- `gps:update` yanında `telematics:update` event'i de yayınlanır.
- History write için varsayılan gate: `30 sn / 50 m` (env ile ayarlanabilir).
- Vendor endpoint shared secret ile korunur.
- Device provisioning token'ı sadece create / rotate cevabında ham olarak gösterilir; DB'de hash saklanır.

## Yeni env
- `TELEMATICS_ENABLED=1`
- `TELEMATICS_VENDOR_SHARED_SECRET=...`
- `TELEMATICS_RATE_LIMIT_WINDOW_MS=60000`
- `TELEMATICS_RATE_LIMIT_MAX=240`
- `TELEMATICS_HISTORY_MIN_SEC=30`
- `TELEMATICS_HISTORY_MIN_METERS=50`

## Kanıt komutu
- `./tools/pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`
