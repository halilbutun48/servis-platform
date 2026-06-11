# TELEMATICS-PROVIDER-HUB-01 — Telematik / GPS Sağlayıcıları

Tarih: 2026-06-11
Repo: `servis-platform`

Bu doküman, `SUPERADMIN-ROOM-TELEMATICS-NAV-UX-01` kapsamındaki telematics sınırını kilitler. Amaç; `provider katalogu`, `adapter şablonları`, `security / KVKK` ve `room self-service` çizgisini aynı anda korumak, ama gerçek ingest yolunu bu milestone dışında bırakmaktır.

## Scope
- `provider katalogu`
- `adapter şablonları`
- `security / KVKK`
- `room self-service`

## Super Admin yüzeyi
- `Telematik / GPS Sağlayıcıları` ekranı provider katalogu ve adapter şablonlarını yönetir.
- Platform; provider kataloğu, bağlantı tipi, template readiness, `security / KVKK`, signature requirement, `rate limit`, `IP allowlist`, `KVKK / veri minimizasyonu` ve `raw payload masking` kurallarını görünür tutar.
- `Başvuru İncelemesi` ekranı özel provider veya invite readiness inceleme kuyruğunu yönetir.
- `LIVE / STALE / OFFLINE` görünümü ve provider health sinyalleri açık kalır.

## Room yüzeyi
- `room self-service` akışı yalnızca onaylı provider kataloğu üzerinden çalışır.
- Matching alanları: `plate / IMEI / deviceId / externalDeviceId / serial`.
- Room yüzeyinde `Secret/token/API key` görünmez.
- Son veri zamanı, cihaz eşleştirme durumu ve readiness notu görünür.

## Durum sözlüğü
- `NOT_CONNECTED`
- `CONFIG_REQUIRED`
- `TESTING`
- `READY`
- `ACTIVE`
- `ERROR`
- `DISABLED`

## Eşleşme sözlüğü
- `MATCHED`
- `NEEDS_REVIEW`
- `UNMATCHED`
- `DUPLICATE_MATCH`
- `DISABLED`

## Boundary
- `no real provider integration`
- `no webhook ingest`
- `no polling job`
- `no TCP bridge`
- `no Prisma/schema/migration`
- `no backend route/service/schema`
- `runtime-data/browser-smoke commit dışı`

## Kanonik akış
1. User `Telematik / GPS Sağlayıcıları` ekranında provider katalogu ve adapter şablonlarını görür.
2. Gerekirse `Başvuru İncelemesi` ekranına geçer.
3. Room `room self-service` yüzeyinde `plate / IMEI / deviceId / externalDeviceId / serial` ile araç eşleştirmesi yapar.
4. `LIVE / STALE / OFFLINE` ve son veri zamanı görünür kalır.
5. `Secret/token/API key` hiçbir yerde yüzeye çıkmaz.
6. Bu milestone gerçek ingest açmaz.

## Komutlar
- Check: `node backend\scripts\telematics_provider_hub_01_check.js`
- Alias: `check:telematicsproviderhub01`
