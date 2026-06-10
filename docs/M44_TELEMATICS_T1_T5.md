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
- güvenli GPS / ETA dilini
- room vehicles telematics fallback'ini
- kalite / risk görünürlüğünü
- docs / check / chain hizasını
tek bir readonly baseline altında toplamak.

## T1

Telematics ingest yüzeyi mevcut ve görünürdür:
- `backend/src/routes/telematics.js`
- `backend/src/telematics/service.js`
- `backend/src/telematics/providers.js`
- `backend/src/telematics/hash.js`

Bu yüzeyler cihaz provisioning, vendor push ve hash / adapter normalizasyonu için canonical reference olarak kalır.

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
- runtime-data stage edilmez
- browser-smoke artifact stage edilmez
- write path açılmaz
- otomatik kalite sıralaması açılmaz
- otomatik rota apply açılmaz

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
