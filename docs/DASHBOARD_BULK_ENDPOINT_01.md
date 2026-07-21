# DASHBOARD-BULK-ENDPOINT-01

Milestone: `DASHBOARD-BULK-ENDPOINT-01`

Tarih: 2026-07-21
Repo: `servis-platform`

> Bu belge read-only dashboard bulk endpoint/pattern kaydıdır. Stage/commit/tag/push açmaz; runtime enforcement açmaz; Prisma schema veya migration değiştirmez.

## 1) Purpose

Bu milestone feature milestone değildir.

Amaç:
- company, school, room ve superadmin dashboard yüzeylerinde read-only bulk aggregation pattern'ini tek bir endpoint altında toplamak
- panel başına tekrarlanan read fan-out'u azaltmak
- mevcut user-facing davranışı fallback ile korumak
- runtime-data, browser-smoke ve debug.log commit sınırını görünür tutmak
- write-action ve human approval boundary'yi bozmadan verimli dashboard okuması sağlamak

Bu çalışma:
- yeni write davranışı eklemez
- Prisma schema / migration değiştirmez
- `backend/prisma` altında migration açmaz
- human approval veya route review akışı başlatmaz
- smoke threshold / PASS kriterini gevşetmez

## 2) Problem statement

Dashboard yüzeyleri çoğu zaman aynı kullanıcı rolü için birden fazla küçük GET isteği üretir.

Bu model:
- personels / shifts / requests / notifications gibi veri kümelerini ayrı ayrı çağırır
- gecikmeyi ve request fan-out'u büyütür
- fallback mantığını birden fazla panel dosyasına yayar
- read-heavy yüzeylerde gereksiz tekrar yaratır

Read-only bulk endpoint bu sorunu tek bir bundle katmanına indirir; ancak davranış yalnızca okuma odaklı kalır ve mevcut panel fallback'leri korunur.

## 3) Bulk policy

- endpoint yalnızca `GET /api/dashboard/bulk` olarak çalışır
- bundle seçimi `bundle` query parametresiyle yapılır
- role ve scope sınırı bundle bazında uygulanır
- bundle response yalnızca read-only payload taşır
- `rememberResponse` ile kısa süreli cache kullanılır
- fallback, mevcut panel bazlı GET akışlarını bozmadan devreye girer
- POST / PUT / PATCH / DELETE yoktur
- write-action dispatcher yoktur
- human approval flow yoktur
- Prisma schema / migration yoktur
- backend/prisma değişikliği yoktur

Desteklenen bundle'lar:
- `company-operations`
- `school-operations`
- `room-operation-health`
- `room-commercial-flow`
- `superadmin-overview`

## 4) Backend implementation

Backend tarafında şu dosyalar devreye girer:
- `backend/src/routes/dashboardBulk.js`
- `backend/src/services/dashboardBulk.js`
- `backend/src/server.js`
- `backend/src/bootstrap/routeMounts.js`

Route davranışı:
- `authRequired()` kullanır
- `buildDashboardBulkBundle()` çağırır
- `getDashboardBulkBundleNames()` ile geçerli bundle listesini döner
- unknown bundle için kontrollü hata üretir

Service davranışı:
- `company-operations` bundle'ı `personels`, `shifts`, `requests`, `notifications`, `shiftSummary` üretir
- `school-operations` bundle'ı `students`, `invites`, `requests`, `notifications` üretir
- `room-operation-health` bundle'ı `summary`, `drivers`, `issues`, `roomOperations` üretir
- `room-commercial-flow` bundle'ı `summary`, `items` üretir
- `superadmin-overview` bundle'ı `stats`, `feedbackRecords`, `feedbackSummary` üretir
- `rememberResponse` ile cache'lenen read-only cevap döndürür
- role isolation ve scope kontrolünü bundle seviyesinde korur

## 5) Frontend integration

Frontend tarafında şu yardımcı dosya kullanılır:
- `web/src/utils/dashboardBulk.js`

Bu helper:
- `/api/dashboard/bulk` endpoint'ine tek bir cachedGet çağrısı yapar
- bundle bazlı helper fonksiyonları dışa verir
- response içindeki array alanlarını normalize eder

Bulk-first akışa geçirilen yüzeyler:
- `web/src/panels/company/OperationsPanel.jsx`
- `web/src/panels/school/OperationsPanel.jsx`
- `web/src/panels/room/OperationHealthPanel.jsx`
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/superadmin/SuperAdminPanel.jsx`

Bu paneller:
- önce bulk helper dener
- bulk yoksa mevcut panel bazlı GET akışına geri döner
- user-facing davranışı bozmaz
- görünür copy ve role sınırını değiştirmez

## 6) New guard script

Yeni deterministic guard:
- `backend/scripts/dashboard_bulk_endpoint_01_check.js`

Guard kapsamı:
- `check:dashboardbulkendpoint01` package alias'ı
- product-extensions chain wiring
- verify chain wiring
- script harness wiring
- milestone guide wiring
- primer wiring
- doc title / section coverage
- backend route / service / mount wiring
- frontend helper / panel wiring
- Prisma schema ve migration boundary
- debug.log boundary

## 7) Validation

Bu milestone için temel doğrulama seti:
- `npm run check:dashboardbulkendpoint01`
- `npm run check:requeststormresilience01`
- `npm run check:productionratelimitpolicy01`
- `npm run check:product-extensions`
- `npm run verify:repo`
- `npm run verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`

## 8) Smoke expectations

Bu milestone smoke sayılarını değiştirmemelidir:
- `npm run smoke:productflowbuttonaudit01` -> `PASS 18 / 0 / 0 / 0`
- `npm run smoke:uxlivepanelpremium01` -> `PASS 82 / 0 / 0 / 0`
- `npm run smoke:uxallpanelsrealityaudit01` -> `PASS 82 / 0 / 0 / 0`
- `npm run smoke:uxmobileallrolespanelaudit01` -> `PASS 82 / 0 / 0 / 0`

Ek sınırlar:
- consoleErrorCount `0` kalır
- pageErrorCount `0` kalır
- loginFailures artmaz
- browser-smoke artifacts commit dışı kalır

## 9) Diff / boundary safety

Korunması gereken sınırlar:
- `backend/src/routes` dışındaki route katmanı değişmez
- `backend/src/services` dışındaki service katmanı değişmez
- `prisma` ve `backend/prisma` değişmez
- `runtime-data` commit dışı kalır
- `browser-smoke` commit dışı kalır
- `debug.log` commit dışı ve absent kalır
- write-action / human approval boundary açılmaz
- Turkish terminology ve user-facing language standardı bozulmaz
- büyük behavior rewrite yapılmaz

## 10) Remaining risks

- fallback path'ler yeniden azaltılırsa request fan-out artabilir
- yeni bundle eklenirken role isolation veya scope kontrolü gevşeyebilir
- cache TTL yanlış ayarlanırsa dashboard freshness ile fan-out arasında dengesizlik oluşabilir
- browser-smoke ve runtime-data commit sınırı korunmazsa milestonenin amacı bulanıklaşır

## 11) Next recommended milestone

`REQUEST-STORM-RESILIENCE-01`

Bu milestone, dashboard fan-out'u azaltan read-only bulk katmanının ardından request-storm resilience guard'ını takip eden güvenli adımdır.

`PRODUCTION-RATE-LIMIT-POLICY-01` bu read-only bulk yaklaşımıyla birlikte okunur; dashboard fan-out azaltma, request-storm ve policy katmanları aynı read-heavy koruma zincirinin parçalarıdır.
