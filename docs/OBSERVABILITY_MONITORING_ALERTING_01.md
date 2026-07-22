# OBSERVABILITY-MONITORING-ALERTING-01

Tarih: 2026-07-22
Repo: `servis-platform`

> Bu belge observability / monitoring / alerting readiness kaydıdır. Stage/commit/tag/push açmaz; production veya external/public URL’ye probe/load atmaz; write-action, human approval, SQL/schema/migration ve dış alert sink sınırını açmaz.

## 1) Purpose

Bu milestone feature milestone değildir.

Amaç:
- `/health` ve observability router yüzeylerini tek readiness guard altında toplamak
- health, metrics, alert ve KVKK-safe logging sinyallerini görünür kılmak
- load-test, DB scaling, request-storm ve rate-limit policy sonuçlarını alarm/runbook zincirine bağlamak
- local/dev-safe probe ile yalnız GET/read-only okuma yapmak
- production/public URL, external SaaS, webhook ve write-action sınırını kapalı tutmak

Bu çalışma:
- yeni write davranışı eklemez
- Prisma schema / migration değiştirmez
- backend/prisma altında migration açmaz
- external alerting SDK / webhook / SaaS gönderimi eklemez
- smoke threshold / PASS kriterini gevşetmez

## 2) Problem statement

Observability sinyalleri ayrı ayrı yaşadığında şu sorular bulanık kalır:
- `/health` hangi kapasite ve DB sinyalini taşır?
- `observability` router hangi summary, event type ve room issue verisini verir?
- 429, p95, event loop lag ve inflight artışı hangi alert bandına girer?
- KVKK-safe wording ile ham debug / raw parse çıktısı nasıl ayrılır?
- load-test ve DB scaling sonuçları alarm ve runbook’a nasıl bağlanır?
- local/dev-safe probe production/public yüzeylere kaymadan nasıl çalışır?

Bu milestone, bu soruları tek bir acceptance guard içine sabitler.

## 3) Observability signal model

Resmi sinyal yüzeyleri:
- `backend/src/server.js`
- `backend/src/routes/observability.js`
- `backend/src/ops/capacityLoadBaseline.js`
- `backend/src/ops/observabilityManifest.js`
- `backend/src/bootstrap/rateLimits.js`

Modelin omurgası:
- `/health` route `ok`, `ts`, `uptimeSec`, `dbOk`, `dbLatencyMs`, `version`, `capacity`, `edgeSecurity` döner
- `capacity` sinyali inflight, peak inflight, ws client, peak ws client ve event loop lag taşır
- observability manifest M59 observability widget ve mobile health event type listesini taşır
- room observability summary/drivers/issues görünür ama read-only kalır

## 4) Health surface policy

- `/health` health check olarak kalır
- DB ping read-only kalır
- `dbLatencyMs` sağlık sinyalinin bir parçası olarak görünür
- `capacity` health payload içinde taşınır
- `edgeSecurity` health payload içinde taşınır
- health route production/public load için kullanılmaz

## 5) Metrics taxonomy

Takip edilen metrikler:
- `dbLatencyMs`
- `inflight`
- `peakInflight`
- `wsClients`
- `peakWsClients`
- `eventLoopLagMs`
- `eventLoopLagPeakMs`
- `ratio429Pct`
- `p95Ms`
- `avgRequestsPerMinute`
- `consoleErrorCount`
- `pageErrorCount`
- `429=none`

Kapasite ve alarm bandı:
- `avgRequestsPerMinute` warn eşiği kapasite policy’den okunur
- `p95Ms` warn eşiği kapasite policy’den okunur
- `ratio429Pct` warn eşiği kapasite policy’den okunur
- inflight, ws connection ve event loop lag ayrı alarm sinyalleridir

## 6) Alert matrix

Alert ilkeleri:
- 429 gerçek sinyal olarak kalır, ignore list açılmaz
- `RATE_LIMITED` ve `retryAfterSec` kullanıcıya görünür
- yüksek p95, yüksek inflight veya event loop lag alert üretir
- capacity warning ile critical signal ayrı tutulur
- alert matrix dışarıya webhook basmadan da okunabilir

Referans policy kaynakları:
- `backend/src/bootstrap/rateLimits.js`
- `backend/src/ops/capacityLoadBaseline.js`
- `docs/PRODUCTION_RATE_LIMIT_POLICY_01.md`

## 7) KVKK-safe logging and wording

Korunan görünür dil:
- `SURUCUNUN_TELEFON_GPSI`
- `plain-tr`
- `Kayıt ayrıştırılamadı`
- `Kanıt anahtarı`
- `Sistem kanıtı`

Korunan sınırlar:
- ham claims hash görünmez
- raw parse error görünmez
- debug payload görünmez
- cross-tenant / internal token sızıntısı görünmez
- KVKK-safe wording sade Türkçe kalır

## 8) Smoke / load-test / DB-scaling linkage

Bu milestone aşağıdaki guard zinciriyle birlikte okunur:
- `LOAD-TEST-2000-USERS-01`
- `DB-POOL-AND-API-SCALING-01`
- `REQUEST-STORM-RESILIENCE-01`
- `PRODUCTION-RATE-LIMIT-POLICY-01`
- `DASHBOARD-BULK-ENDPOINT-01`
- `CACHE-COALESCING-AND-BACKOFF-01`

Uyum ilkeleri:
- 2000-user yükü önce local/dev-safe harness olarak kalır
- DB scaling local/dev-safe GET probe ile ölçülür
- request-storm smoke 429 sinyalini maskelenmeden bırakır
- dashboard bulk ve cache coalescing read-only kalır
- observability guard bu sinyalleri runbook ve alarm bandına bağlar

## 9) Dashboard and rate-limit compatibility

Bu milestone aşağıdaki read-heavy yüzeylerle uyumludur:
- `DASHBOARD-BULK-ENDPOINT-01`
- `CACHE-COALESCING-AND-BACKOFF-01`
- `REQUEST-STORM-RESILIENCE-01`
- `PRODUCTION-RATE-LIMIT-POLICY-01`

Uyum ilkeleri:
- read-only bulk kalır
- same-key inflight coalescing bozulmaz
- bounded backoff görünür kalır
- 429 ignore list açılmaz
- route/service/prisma diff beklenmez

## 10) Local/dev-safe probe policy

Kanonik probe:
- `backend/scripts/observability_monitoring_alerting_01_probe.js`

Yerel/dev-safe ortam:
- `OBSERVABILITY_BASE_URL`
- `DB_SCALING_BASE_URL`
- `LOAD_TEST_BASE_URL`
- `API_URL`

Opt-in / safety flag'leri:
- `OBSERVABILITY_ALLOW_AUTH_ENDPOINTS=true`
- `OBSERVABILITY_AUTH_TOKEN`
- `OBSERVABILITY_PLAN_ONLY=1`
- `OBSERVABILITY_WRITE_REPORT=1`
- `OBSERVABILITY_REQUEST_TIMEOUT_MS`

Probe ilkeleri:
- yalnız GET kullanır
- localhost / 127.0.0.1 / ::1 dışına çıkmaz
- production/public URL reddeder
- write-action açmaz
- auth endpointleri opt-in tutar
- report default olarak disabled kalır

Report yolu:
- `backend/artifacts/observability/observability_monitoring_alerting_01_report.json`

## 11) Incident runbook

Runbook yüzeyleri:
- `/health`
- `/api/observability/manifest`
- `/api/observability/health-summary`
- `/api/observability/event-types`
- `/api/observability/recent-events`
- `/api/observability/room/summary`
- `/api/observability/room/drivers`
- `/api/observability/room/issues`

İlk bakılacak sinyaller:
- `dbOk`
- `dbLatencyMs`
- `ratio429Pct`
- `eventLoopLagMs`
- `warnings`
- `assessment`
- `openIssues`
- `riskyDevices`

## 12) What is not changed

Bu milestone şunları değiştirmez:
- Prisma schema
- migration
- route apply
- dispatch apply
- payment / agreement execute
- external SaaS alert sink
- webhook delivery
- production/public probe/load
- 429 ignore list
- smoke threshold
- route/service/prisma diff sınırı
- debug.log üretme beklentisi

## 13) What remains for production infra

Üretimde ayrı bir adım olarak:
- gerçek alarm teslimi
- dashboard görselleştirmesi
- SLO / error-budget politikası
- log aggregation / alert sink
- incident paging

Bu milestone bunları planlar, fakat doğrudan açmaz.

## 14) Validation results

Planned validation:
- `npm run check:observabilitymonitoringalerting01`
- `npm run check:dbpoolandapiscaling01`
- `npm run check:loadtest2000users01`
- `npm run check:cachecoalescingandbackoff01`
- `npm run check:dashboardbulkendpoint01`
- `npm run check:productionratelimitpolicy01`
- `npm run check:requeststormresilience01`
- `npm run check:airesponsesemanticqualitygate01`
- `npm run check:testqualityandflakeaudit01`
- `npm run check:hotfilesplitwebpanels01`
- `npm run check:hotfilesplitaichatcomposers01`
- `npm run check:copilotnextbestactionengine01`
- `npm run check:copilotoperationhealthengine01`
- `npm run check:copilotplanreviewengine01`
- `npm run check:copilotworkflowreasoningengine01`
- `npm run check:seferabiturkishterminology01`
- `npm run check:seferabiturkishuserfacinglanguage01`
- `npm run check:copilotriskscoringengine01`
- `npm run check:copilotrootcauseengine01`
- `npm run check:copilotsmartdiagnosticengine01`
- `npm run check:copilotdynamicquestionengine01`
- `npm run check:copilotclarifyingquestionengine01`
- `npm run check:copilotroutereviewhumanapproval01`
- `npm run check:exceltoroutereadinessredteam01`
- `npm run check:cop03afix01`
- `npm run check:cop03afix02`
- `npm run check:copilotcontextmemorytaskstate01`
- `npm run check:ai03bsemanticvisiblelivematrix01`
- `npm run check:ai03bsemanticvisibleaudit01`
- `npm run check:ai03bparaphraseintentaudit01`
- `npm run check:plancenterguidedflowpersistence01`
- `npm run check:seferabiallrolesreasoningassistant01`
- `npm run check:product-extensions`
- `npm run verify:repo`
- `npm run verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`

## 15) Remaining risks

- probe local dışına çıkarılırsa safety boundary bozulur
- auth endpointleri opt-in dışına taşarsa read-only sınır bulanıklaşır
- alert sink production’da ayrıca kurulum gerektirir
- request-storm veya rate-limit policy gevşetilirse 429 sinyali maskelenebilir
- `backend/artifacts/observability/` gitignore dışında kalırsa commit-external boundary bozulur
- `DB-POOL-AND-API-SCALING-01` ve `LOAD-TEST-2000-USERS-01` ile aynı sinyaller farklı amaçlarla kullanıldığı için dokümanlar karıştırılmamalı

## 16) Next recommended milestone

`UX-SUPERADMIN-LIVE-MONITORING-01`

Bu milestone, health / capacity / alert sinyallerini Süper Admin canlı izleme yüzeyinde summary-first bir dashboard olarak görünür hale getiren sonraki güvenli adımdır.
