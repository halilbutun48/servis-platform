# TELEMATICS-PROVIDER-HUB-01 — provider-agnostic GPS provider hub / readiness UX

Tarih: 2026-06-10
Repo: `servis-platform`

Bu doküman, `M44-TELEMATICS-T1-T5` baseline sonrasında provider-agnostic GPS provider hub ve kullanıcı GPS entegrasyon readiness UX'ini docs/check kilidi olarak sabitler. Gerçek provider entegrasyonu açmaz; adapter contract, normalized telematics event sözleşmesi, provider registry görünürlüğü ve readonly telematics signals sınırını korur.

## Amaç
- `provider-agnostic` telematics mimarisini görünür kılmak.
- Her yeni GPS sağlayıcısı için core kodu bozmadan `GPS provider adapter` eklenebilmesini hedeflemek.
- `vehicle tracking software` kaynaklarını da aynı normalized sözleşmeye çevirebilmek.
- `normalized telematics event` hedef alanlarını ve provider registry görünürlüğünü kilitlemek.
- Kullanıcının kendi GPS sistemini güvenli şekilde bağlama akışını görünür kılmak.
- Bu milestone docs/check kilididir; runtime ingest açmaz.

## Provider registry
- provider key/name
- supported connection type
- connection status: `NOT_CONNECTED / CONFIG_REQUIRED / TESTING / READY / ACTIVE / ERROR / DISABLED`
- last data time
- data delay
- matched vehicle count
- unmatched device count
- error count
- health status

## Normalized telematics event
- providerId
- providerName
- externalDeviceId
- imei, varsa
- plate, varsa
- vehicleId, eşleşmişse
- driverId, eşleşmişse
- lat
- lng
- speed
- speedLimit, varsa
- heading, varsa
- altitude, varsa
- ignition, varsa
- odometer, varsa
- eventTime
- receivedAt
- sourceType: `webhook / polling / file / manual / tcp-bridge`
- rawEventRef veya masked raw reference
- confidence
- quality flags
- stale/offline/live status
- error/warning notes

## Adapter contract
- provider payload'ını okur.
- field mapping yapar.
- timestamp normalize eder.
- lat/lng doğrular.
- speed/heading/ignition gibi sinyalleri normalize eder.
- plate/device/IMEI eşleşmesini çözer.
- hatalı veya eksik eventleri safe fallback ile işaretler.
- SeferPakt normalized telematics event formatına çevirir.

## Kullanıcı GPS entegrasyon akışı
1. Kullanıcı `Ayarlar / Telematik Entegrasyonları` ekranına girer.
2. GPS sağlayıcısını seçer.
3. Bağlantı tipini seçer: hazır sağlayıcı adapter, API polling, webhook push, file/CSV/Excel import, deviceId / IMEI / plate mapping veya özel entegrasyon talebi.
4. Gerekli bağlantı bilgilerini girer.
5. `secret/API key/token repo'ya yazılmaz`; güvenli secret/env mantığı kullanılır.
6. Sistem `test bağlantısı` yapar.
7. Gelen örnek veri normalize edilir.
8. Araçlar `plaka / IMEI / deviceId mapping` ile eşleştirilir.
9. `eşleşmeyen cihazlar` kullanıcıya gösterilir.
10. Kullanıcı eşleşmeleri onaylar.
11. Entegrasyon aktif edilir.
12. GPS verisi canlı takip, LIVE/STALE/OFFLINE, hız riski, rota ilerleme, kanıt/check-in ve saha kalite sinyallerine `readonly telematics signals` olarak beslenir.

## Entegrasyon durumu
- `NOT_CONNECTED`
- `CONFIG_REQUIRED`
- `TESTING`
- `READY`
- `ACTIVE`
- `ERROR`
- `DISABLED`

## Araç eşleştirme durumu
- `MATCHED`
- `NEEDS_REVIEW`
- `UNMATCHED`
- `DUPLICATE_MATCH`
- `DISABLED`

## Super Admin readiness UX
- `Telematik / GPS Sağlayıcıları` kartı provider registry görünürlüğü verir.
- `provider registry` alanları, connection status, last data time, data delay ve health status tek bakışta görünür.
- `Ayarlar / Telematik Entegrasyonları` akışı, test bağlantısı ve cihaz eşleştirme adımlarını açıklar.
- `readonly telematics signals` ve integration status vocabulary görünür kalır.

## Room / Vehicles mapping UX
- `GPS Eşleştirme / Telematik Bağlantısı` kartı araç bazlı eşleşme durumunu gösterir.
- `cihaz eşleştirme`, `plaka / IMEI / deviceId mapping` ve `eşleşmeyen cihazlar` burada okunur.
- ROOM yüzeyi, provider-hub readiness bilgisini operasyonel görünürlük olarak kullanır; write aksiyonu açmaz.

## Güvenli sınır
- `no provider secret in repo`
- `no real provider integration in this milestone`
- `no Prisma/schema/migration`
- `backend route/service/schema yok`
- `Prisma/schema/migration yok`
- `runtime-data/browser-smoke commit dışı`
- `readonly T1-T5 boundary`
- GPS provider secret, API key, token repo'ya yazılmaz.
- Public endpoint, rate limit ve signature validation ayrı milestone'a bırakılır.

## Kanonik bağlantılar
- `M44-TELEMATICS-T1-T5`
- `TELEMATICS-PROVIDER-HUB-01`
- `SAFE-DRIVE-01`
- `OFFER-RANKING-QUALITY-01`

## Komutlar
- Check: `node backend\scripts\telematics_provider_hub_01_check.js`
- Script alias: `check:telematicsproviderhub01`
- Bu milestone runtime ingest veya backend write-path açmaz.
