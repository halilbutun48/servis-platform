# LOAD-TEST-2000-USERS-01

Tarih: 2026-07-22
Repo: `servis-platform`

> Bu belge load-test readiness kaydıdır. Stage/commit/tag/push açmaz; production veya external/public URL’ye load atmaz; write-action, human approval ve Prisma/migration sınırını açmaz.

## 1) Purpose

Bu milestone feature milestone değildir.

Amaç:
- 2000 eşzamanlı kullanıcı hedefini ölçülebilir bir load-test planına çevirmek
- route / panel / role bazlı read-only senaryo matrisi tanımlamak
- dashboard bulk, cache coalescing, request storm ve rate-limit policy ile uyumu denetlemek
- local/dev-safe bir smoke-load harness sağlamak
- kontrolsüz load üretmemek
- gerçek yüksek yükü DB pool / API scaling milestone’una bağlayacak güvenli hazırlığı bırakmak

Bu çalışma:
- production ortamına trafik göndermez
- external/public URL’ye load atmaz
- gerçek write-action çalıştırmaz
- RFQ send, offer accept/reject, agreement execute, dispatch apply, driver/vehicle assign, route apply, payment/hakediş execute, messaging ve user/admin write açmaz
- runtime AI/model execution açmaz
- Prisma schema veya migration değiştirmez
- smoke threshold / PASS kriterini gevşetmez

## 2) Problem statement

2000 eşzamanlı kullanıcı hedefi açıkça planlanmadığında şu sorular belirsiz kalır:
- Hangi roller aynı anda aktif olacak?
- Hangi paneller en çok read yükü üretir?
- Dashboard bulk kaç küçük read isteğini azaltır?
- Cache coalescing duplicate istekleri azaltıyor mu?
- 429 oluşursa test bunu fail sayıyor mu?
- DB pool ve API process sınırları ne zaman yetersiz kalır?
- Smoke ve load test birbirine karışmadan nasıl çalışır?
- Local/dev ortamda load test production’a zarar vermeden nasıl koşturulur?
- Load test write-action boundary’yi nasıl korur?
- İnsan onayı gerektiren aksiyonlar testte nasıl devre dışı kalır?

## 3) 2000-user target

Ana hedef:
- total virtual users target: `2000`
- default local/dev smoke band: `20`
- güvenli üst smoke band: `50`
- `LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true` olmadan 2000 veya üstü çalışmaz
- default run düşük etkili kalır

2000-user hedefi burada gerçek production saldırısı gibi çalıştırılmaz.
Bu milestone hedefi, 2000 kullanıcıyı sayılabilir plan / budget / guard setine çevirmektir.

## 4) Role distribution

Önerilen dağılım:
- 35% personel / parent live-read
- 20% company operations / shifts / agreements read
- 20% room map / vehicles / operation health read
- 10% driver route / map read
- 10% school / organization operations read
- 5% superadmin overview / audit / commercial read

Bu dağılım, tekil endpoint baskısını role sınıfları arasında paylaştırır ve read-heavy koruma zincirini ölçülebilir kılar.

## 5) Endpoint scenario matrix

| Share | Role family | Endpoint class | Representative GET path | Auth | Notes |
| --- | --- | --- | --- | --- | --- |
| 35% | Personel / parent live-read | health / live-read | `/health` | no | Public/dev-safe smoke proxy; auth endpointleri default yük akışında yok. |
| 20% | Company operations / shifts / agreements | dashboard bulk | `/api/dashboard/bulk?bundle=company-operations` | opt-in | Bulk-first read bundle. |
| 20% | Room map / vehicles / operation health | dashboard bulk | `/api/dashboard/bulk?bundle=room-operation-health` | opt-in | Room health and vehicle read bundle. |
| 10% | Driver route / map | route preview read | `/api/shifts?take=1` | opt-in | Read-only route/map proxy; GET-only. |
| 10% | School / organization operations | dashboard bulk | `/api/dashboard/bulk?bundle=school-operations` | opt-in | School and org operations read bundle. |
| 5% | Superadmin overview / audit / commercial | dashboard bulk | `/api/dashboard/bulk?bundle=superadmin-overview` | opt-in | Superadmin read bundle. |

Opt-in not:
- Auth-scope path'ler default smoke-load dışında tutulur.
- Load script default, auth token olmadan yalnız public/dev-safe read yollarını çalıştırır.
- Login/session policy bu milestone’un load script default kapsamı değildir.

## 6) Local-safe harness policy

Kanonik harness:
- `backend/scripts/load_test_2000_users_01_harness.js`
- `check:loadtest2000users01`
- `node backend/scripts/load_test_2000_users_01_check.js`

Default davranış:
- `LOAD_TEST_BASE_URL` default `http://localhost:3000`
- `API_URL` fallback desteklenir
- `LOAD_TEST_USERS` default `20`
- `LOAD_TEST_CONCURRENCY` bounded
- `LOAD_TEST_DURATION_MS` bounded
- `LOAD_TEST_REQUEST_TIMEOUT_MS` bounded
- `LOAD_TEST_PLAN_ONLY=1` ile plan-only dry run yapılabilir
- `LOAD_TEST_WRITE_REPORT=1` ile gitignored report yazılabilir
- default smoke run local/dev-safe kalır

## 7) Explicit high-concurrency flag policy

Yüksek concurrency için açık flag gerekir:
- `LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true`

Bu flag olmadan:
- 2000 kullanıcı çalışmaz
- yüksek kullanıcı bandı çalışmaz
- concurrency üst sınırı dar tutulur
- local/dev smoke düşük etkili kalır

## 8) Read-only boundary

Bu milestone yalnız GET/read-only yükleri kapsar.

İzinli olan:
- GET dashboard bulk read
- GET health/read-only proxy
- GET route preview/read proxy
- GET summary/list/read endpoints

İzinli olmayan:
- POST
- PUT
- PATCH
- DELETE
- write-action dispatcher
- route apply
- dispatch apply
- agreement execute
- payment execute
- provider credential write
- user/admin write

## 9) No write-action / human approval boundary

Bu milestone insan onayı sınırını korur:
- human approval flow açılmaz
- write-action path açılmaz
- dry-run veya smoke load, onay gerektiren aksiyonları çalıştırmaz
- mutasyon endpointleri load senaryosuna dahil edilmez

## 10) Rate-limit / request-storm / dashboard bulk / cache coalescing compatibility

Bu milestone aşağıdaki guard zinciriyle birlikte okunur:
- `DASHBOARD-BULK-ENDPOINT-01`
- `CACHE-COALESCING-AND-BACKOFF-01`
- `REQUEST-STORM-RESILIENCE-01`
- `PRODUCTION-RATE-LIMIT-POLICY-01`

Uyum ilkeleri:
- dashboard bulk read-only kalır
- cache coalescing aynı-key duplicate fetch fan-out’unu azaltır
- request-storm guard 429 console/page error sinyalini maskelemez
- production rate-limit policy 429 ignore list açmaz
- load-test readiness 429’yi kabul edilmiş normal durum yapmaz

## 11) Metrics

Takip edilen metrikler:
- total virtual users target: `2000`
- default local/dev smoke users: `20`
- max concurrency
- request timeout
- p50 latency
- p95 latency
- p99 latency
- error rate
- 429 threshold: `0`
- no write-action count: `0`
- generated report path

Report policy:
- report gitignored bir klasöre yazılır
- generated report commit edilmez
- summary stdout üzerinden de okunur

## 12) What is not tested yet

Bu milestone şunları test etmez:
- gerçek production load
- external/public URL load
- auth/login flood
- POST/PUT/PATCH/DELETE load senaryosu
- write-action yürütme
- DB schema / migration değişikliği
- runtime AI/model execution
- uncontrolled retry storm

## 13) Generated report policy

Report path:
- `backend/artifacts/load-test/load_test_2000_users_01_report.json`

Policy:
- klasör gitignored
- generated report commit dışı
- report yazılmazsa harness yine stdout summary döner
- report yazılsa bile stage/commit targetı değildir

## 14) Smoke expectations

Bu milestone smoke eşiklerini değiştirmez:
- `npm run smoke:productflowbuttonaudit01` -> `PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0`
- `npm run smoke:uxlivepanelpremium01` -> `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0`
- `npm run smoke:uxallpanelsrealityaudit01` -> `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0`
- `npm run smoke:uxmobileallrolespanelaudit01` -> `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0`
- `consoleErrorCount=0`
- `pageErrorCount=0`
- `429=none`

## 15) Validation results

Planned validation:
- `npm run check:loadtest2000users01`
- `npm run check:cachecoalescingandbackoff01`
- `npm run check:dashboardbulkendpoint01`
- `npm run check:productionratelimitpolicy01`
- `npm run check:requeststormresilience01`
- `npm run check:airesponsesemanticqualitygate01`
- `npm run check:testqualityandflakeaudit01`
- `npm run check:product-extensions`
- `npm run verify:repo`
- `npm run verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- Companion redteam milestone: `ROLE-DATA-ISOLATION-REDTEAM-01`
- Security final handoff: `SECURITY-KVKK-FINAL-01`

## 16) Remaining risks

- 2000-user plan, DB pool ve API scaling milestone'una bağlanmadan gerçek production yük gibi kullanılmamalı; `OBSERVABILITY-MONITORING-ALERTING-01` bu hattı alarm/runbook yüzeyine bağlar
- auth opt-in path'ler tekrar genel akışa sızarsa smoke-load ile acceptance load karışabilir
- 429 ignore list açılırsa gerçek kapasite sinyali kaybolur
- generated report gitignored klasörde tutulmazsa commit-external boundary bozulur
- dashboard bulk fallback zayıflarsa read fan-out yeniden büyüyebilir
- cache coalescing/backoff ve request-storm guard'ları gevşerse load readiness yanıltıcı görünür
- `LOAD-TEST-2000-USERS-01` sonrası asıl takip hattı DB / API scaling hazırlığıdır

## 17) Next recommended milestone

`DB-POOL-AND-API-SCALING-01`

Bu milestone, 2000-user readiness planı tamamlandıktan sonra database pool ve API process scaling hazırlığını güvenli şekilde açacak sonraki adım olmalıdır.
