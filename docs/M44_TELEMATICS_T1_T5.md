# M44-TELEMATICS-T1-T5

Tarih: 2026-06-10
Repo: `servis-platform`

Bu belge, `M44-TELEMATICS-T1-T5` milestone'unun read-only baseline'ıdır; telematics / risk / quality kapsamını kilitler.

Canonical check:
- `check:m44telematicst1t5`

Legacy compatibility alias:
- `M44-T1/T5`

Legacy runtime pack:
- `check:m44_telematics_check`

## Amaç

Bu milestone ürün davranışı açmaz.

Amaç:
- mevcut telematics omurgasını
- provider-agnostic GPS / araç takip mimarisini
- güvenli GPS / ETA dilini
- room vehicles telematics fallback'ini
- kalite / risk görünürlüğünü
- docs / check / chain hizasını
tek bir readonly baseline altında toplamak.

## Provider-agnostic telematics vizyonu

M44-TELEMATICS-T1-T5, tek bir GPS firmasına bağlı olmayan provider-agnostic telematics mimarisini hedefler. SeferPakt’ın GPS/araç takip altyapısı adapter contract üzerinden farklı GPS firmaları, takip yazılımları ve cihaz kaynaklarından gelen verileri normalized telematics event formatına çevirebilecek şekilde tasarlanır. Bu milestone’da gerçek provider entegrasyonu açılmaz; adapter mimarisi, normalized event sözleşmesi ve readonly T1-T5 risk/quality sınırı kilitlenir.

## Entegrasyon yolları

Farklı provider / vehicle tracking software kaynakları şu yollarla bağlanabilir:
- API polling
- webhook push
- file/CSV/Excel import
- deviceId / IMEI / plate mapping
- gelecekte gerekirse TCP/device protocol bridge

## Normalized telematics event

Hedef alanlar:
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
- sourceType: webhook / polling / file / manual / tcp-bridge
- rawEventRef veya masked raw reference
- confidence
- quality flags
- stale/offline/live status
- error/warning notes

## GPS provider adapter contract

Yeni bir GPS firması için core SeferPakt kodu bozulmadan adapter eklenebilmelidir.
Adapter şu görevleri yapar:
- provider payload'ını okur
- field mapping yapar
- timestamp normalize eder
- lat/lng doğrular
- speed/heading/ignition gibi sinyalleri normalize eder
- plate/device/IMEI eşleşmesini çözer
- hatalı veya eksik eventleri safe fallback ile işaretler
- SeferPakt normalized telematics event formatına çevirir

## Provider registry

İleride sistemde şu bilgiler tutulabilmelidir:
- provider key/name
- supported connection type / desteklenen bağlantı tipi
- connection status: NOT_CONNECTED / READY / ACTIVE / ERROR / DISABLED
- last data time / son veri zamanı
- data delay / veri gecikmesi
- matched vehicle count / eşleşen araç sayısı
- unmatched device count / eşleşmeyen cihaz sayısı
- error count / hata sayısı
- health status

## Kullanıcı GPS entegrasyon akışı

Kullanıcı akışı:
1. Kullanıcı Ayarlar / Telematik Entegrasyonları ekranına girer.
2. GPS sağlayıcısını seçer.
3. Bağlantı tipini seçer:
   - hazır sağlayıcı adapter
   - API polling
   - webhook push
   - Excel/CSV import
   - device ID / IMEI / plate mapping
   - özel entegrasyon talebi
4. Gerekli bağlantı bilgilerini girer.
5. Secret/API key/token repo'ya yazılmaz; güvenli secret/env mantığıyla saklanır.
6. Sistem test bağlantısı yapar.
7. Gelen örnek veri normalize edilir.
8. Cihaz eşleştirme yapılır; araçlar plaka / IMEI / deviceId mapping ile eşleştirilir.
9. Eşleşmeyen cihazlar kullanıcıya gösterilir.
10. Kullanıcı eşleşmeleri onaylar.
11. Entegrasyon aktif edilir.
12. GPS verisi canlı takip, LIVE/STALE/OFFLINE, hız riski, rota ilerleme, kanıt/check-in ve saha kalite sinyallerine readonly telematics signals olarak beslenir.

Entegrasyon durumu:
- NOT_CONNECTED
- CONFIG_REQUIRED
- TESTING
- READY
- ACTIVE
- ERROR
- DISABLED

Araç eşleştirme durumları:
- MATCHED
- NEEDS_REVIEW
- UNMATCHED
- DUPLICATE_MATCH
- DISABLED

Güvenli sınırlar:
- GPS bağlandı diye ödeme/hakediş değişmez.
- GPS bağlandı diye sözleşme değişmez.
- GPS bağlandı diye tedarikçi otomatik elenmez.
- GPS bağlandı diye sürücü/araç ataması otomatik değişmez.
- GPS bağlandı diye SMS/push/e-posta otomatik gönderilmez.
- Tüm kritik aksiyonlar insan onayı, guard ve audit log ile ilerler.
- secret/API key/token repo'ya yazılmaz.

## Güvenlik sınırı

- GPS provider secret, API key, token, bearer key repo'ya yazılmaz.
- Secret yalnızca env/secret manager mantığıyla ele alınır.
- Docs içinde gerçek secret örneği verilmez.
- Provider payload raporlarında hassas veri maskeleme yapılır.
- Device ID / IMEI / plate eşleşmeleri KVKK ve veri minimizasyonu ilkesiyle ele alınır.
- Public endpoint açılacaksa ayrı milestone ve rate limit/signature validation gerekir.
- no provider secret in repo
- no real provider integration in this milestone

## T1

Telematics ingest yüzeyi mevcut ve görünürdür:
- `backend/src/routes/telematics.js`
- `backend/src/telematics/service.js`
- `backend/src/telematics/providers.js`
- `backend/src/telematics/hash.js`

Bu yüzeyler cihaz provisioning, vendor push ve hash / adapter normalizasyonu için canonical reference olarak kalır; provider adapter ve provider registry çalışmalarının readonly referansıdır.

## T2

GPS ve ETA dili güvenli kalır:
- `web/src/utils/etaSanity.js`
- `web/src/utils/gpsSourceVisibility.js`
- `web/src/panels/driver/MapPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`

Güvenli wording:
- `güncel değil`
- `hesaplanamıyor`
- `Sürücünün telefon GPS’i`
- `Araç GPS’i`

## T3

Room araç yüzeyi telematics sayacı ve fallback ile bozulmadan kalır:
- `web/src/panels/room/VehiclesPanel.jsx`
- `backend/scripts/ux_room_vehicles_telematics_counts_fix_check.js`

Bu basamak, telematics özetinin doğru sırada ve güvenli fallback ile üretildiğini doğrulayan mevcut fix hattını temel alır.

## T4

Risk / kalite görünürlüğü docs tarafında canlı tutulur:
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`

Bu belge, te­lematics basamağının SAFE-DRIVE-01 ve OFFER-RANKING-QUALITY-01 öncesi okunabilir kalmasını sağlar.

## T5

Bu milestone sınırları:
- backend route/service/schema değişikliği yok
- Prisma/migration değişikliği yok
- no Prisma/schema/migration
- runtime-data stage edilmez
- browser-smoke artifact stage edilmez
- write path açılmaz
- otomatik kalite sıralaması açılmaz
- otomatik rota apply açılmaz
- readonly T1-T5 boundary korunur
- no provider secret in repo
- no real provider integration in this milestone

## Gelecek milestone'lar

- TELEMATICS-PROVIDER-HUB-01
- TELEMATICS-PROVIDER-ADAPTER-CONTRACT-01
- TELEMATICS-WEBHOOK-INGEST-01
- TELEMATICS-POLLING-CONNECTOR-01
- TELEMATICS-FILE-IMPORT-01
- TELEMATICS-DEVICE-MAPPING-01
- TELEMATICS-PROVIDER-HEALTH-DASHBOARD-01
- TELEMATICS-NORMALIZED-EVENT-QUALITY-01

## Acceptance

Bu baseline için beklenenler:
- `npm run check:m44telematicst1t5`
- `npm run check:product-extensions`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run verify:final`
- `git diff --cached --check`

## Sonraki kontrollü işler

Bu baseline sonrası sıradaki alanlar:
- `SAFE-DRIVE-01`
- `OFFER-RANKING-QUALITY-01`

Bu belge yalnızca canonical görünürlük sağlar; ürün davranışı açmaz.
