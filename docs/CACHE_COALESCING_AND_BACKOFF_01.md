# CACHE-COALESCING-AND-BACKOFF-01

Milestone: `CACHE-COALESCING-AND-BACKOFF-01`

Bu milestone, dashboard bulk ve read-heavy read flows için aynı-key inflight coalescing ile bounded backoff disiplinini görünür hale getirir. Amaç, duplicate fetch fan-out'unu azaltırken read-only / human approval sınırını değiştirmemektir.

## 1) Purpose

- Aynı cache anahtarı için birden fazla istek açıldığında tek inflight promise paylaşılır.
- 429 response geldiğinde bounded request gap korunur ve tekrar denemeler yönetilir.
- Read-only helper'lar write-action, route apply ve human approval açmaz.

## 2) Problem statement

- Dashboard bulk akışları aynı ekran / filtre kombinasyonunda gereksiz tekrar fetch üretebilir.
- Cache invalidation ile aktif istekler yarıştığında stale write riski oluşabilir.
- Frontend read helper ile backend cache helper arasında scope ayrımı net değilse cross-role contamination görülebilir.

## 3) Coalescing policy

- `backend/src/utils/responseCache.js` aynı composite key için inflight promise reuse yapar.
- Invalidation sonrası eski version'dan gelen response cache'e geri yazılmaz.
- `clearResponseCache(...)` ve `clearResponseCacheExact(...)` cache kadar inflight kayıtlarını da temizler.

## 4) Cache key isolation model

- `backend/src/services/dashboardBulk.js` cache key'i bundle + sorted query + role + companyId + roomId + userId ile kurar.
- `web/src/utils/dashboardBulk.js` bundle/query ayrımını korur ve read-only bulk fetch'i tek helper üzerinden taşır.
- `web/src/utils/uiDataCache.js` token scope + URL kombinasyonu ile company / tenant / user izolasyonunu korur.

## 5) Backoff / retry policy

- `web/src/utils/uiDataCache.js` `MAX_CONCURRENT = 1` ve `AUTH_REQUEST_GAP_MS = 500` ile bounded request gap uygular.
- 429 response geldiğinde `Retry-After` / `retryAfterSec` okunur ve `nextNetworkAt` ileri alınır.
- 429 ignore list yoktur, infinite retry yoktur ve user-facing rate-limit davranışı maskelenmez.

## 6) Backend implementation

- `backend/src/services/dashboardBulk.js` `rememberResponse(...)` ile read-only bundle yüklerini coalesce eder.
- `scopeOf(user)` rol, company, room ve user sınırlarını korur.
- `backend/src/routes/dashboardBulk.js` GET-only kalır; authRequired dışında yeni write surface açmaz.

## 7) Frontend integration

- `web/src/utils/dashboardBulk.js` bulk-first akışı korur ve `cachedGet(...)` fallback'ini read-only tutar.
- Signal, ttl, delay ve force seçenekleri sadece read fetch davranışını etkiler.
- `web/src/utils/uiDataCache.js` read helper olarak kalır; write-action, human approval veya fake success açmaz.

## 8) New guard script

- `check:cachecoalescingandbackoff01`
- `node backend\scripts\cache_coalescing_and_backoff_01_check.js`
- Bu guard docs/check chain, coalescing, bounded backoff, smoke eşikleri ve diff / stage / debug.log sınırlarını deterministic olarak kontrol eder.

## 9) Validation

- `check:product-extensions`
- `verify:repo`
- `verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- smoke raporları product-flow, premium, all-panels ve mobile all-roles için PASS sınırını korur.

## 10) Diff / boundary safety

- `backend/src/routes`, `backend/src/services`, `prisma` ve `backend/prisma` değişmez.
- `runtime-data` commit dışı kalır.
- `browser-smoke` commit dışı kalır.
- `debug.log` absent kalır.
- write-action / human approval boundary açılmaz.

## 11) Remaining risks

- Yeni bundle eklenirken cache key scope zayıflatılırsa cross-role contamination oluşabilir.
- Request gap kaldırılırsa duplicate fetch fan-out geri dönebilir.
- 429 retry görünürlüğü kapatılırsa bounded backoff, gerçek rate-limit sinyalini gizler.
- `REQUEST-STORM-RESILIENCE-01` ve `PRODUCTION-RATE-LIMIT-POLICY-01` companion guard'lar olarak korunmalıdır.

`LOAD-TEST-2000-USERS-01` 2000-user readiness hazırlığını ayrı tutar; `DB-POOL-AND-API-SCALING-01` local/dev-safe probe ile DB pool ve API scaling takibini devralır; `OBSERVABILITY-MONITORING-ALERTING-01` coalesced read/backoff sinyallerini alert/runbook yüzeyine taşır; explicit high-concurrency flag sınırı korunur.

## 12) Next recommended milestone

`REQUEST-STORM-RESILIENCE-01`

Bu milestone, cache coalescing/backoff companion guard'ından sonra request-storm resilience check'i takip eden güvenli adımdır. `PRODUCTION-RATE-LIMIT-POLICY-01` ise aynı zincirdeki companion policy katmanı olarak okunur.
