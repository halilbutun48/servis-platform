# DB-POOL-AND-API-SCALING-01

Tarih: 2026-07-22
Repo: `servis-platform`

> This milestone is a local/dev-safe readiness guard. It does not stage, commit, tag, or push; it does not touch Prisma schema or migrations; it does not open write-action paths; it does not use production or public URLs.

## 1) Purpose

- bridge the `LOAD-TEST-2000-USERS-01` milestone to DB pool and API scaling readiness
- keep the path read-only and local/dev-safe
- make the next infra tuning signals explicit

## 2) Problem statement

- a green load-test can still hide DB pool pressure or API saturation
- the repo needs a small bounded probe and a static guard doc
- no production/public URL load, no schema or migration changes, no write-action

## 3) 2000-user scaling assumptions

- `LOAD-TEST-2000-USERS-01` remains the broader load harness
- this milestone does not re-run the full 2000-user matrix
- it validates the handoff from smoke load to infra scaling
- local/dev-safe GET traffic is enough for the readiness guard

## 4) DB pool policy

- `backend/src/prisma.js` keeps the non-production fallback database URL on `127.0.0.1:5433`
- this milestone does not change pool size, schema, or migrations
- DB pressure is observed through latency and saturation signals
- any pool tuning remains infra-owned

## 5) API concurrency policy

- `backend/scripts/db_pool_and_api_scaling_01_probe.js` only uses GET
- default request budget is small and local/dev-safe
- high concurrency requires `DB_SCALING_ALLOW_HIGH_CONCURRENCY=true`
- auth endpoints require `DB_SCALING_ALLOW_AUTH_ENDPOINTS=true` and a token
- production/public URL load stays closed

## 6) Timeout budget policy

- default request timeout is bounded
- health latency and dashboard bulk latency are printed as percentiles
- 429 and 5xx counts fail the probe
- the probe does not retry forever

## 7) Keep-alive / header timeout / request timeout policy

- this milestone does not change `keepAliveTimeout`
- this milestone does not change `headersTimeout`
- this milestone does not change `requestTimeout`
- those runtime settings remain infra follow-ups if they are needed

## 8) Query latency budget

- `/health` already returns `dbLatencyMs`
- the probe treats health latency as the DB smoke signal
- health latency percentiles are recorded for local comparison
- dashboard bulk latency is tracked as the API companion signal

## 9) Pool saturation signals

- `backend/src/ops/capacityLoadBaseline.js` already tracks inflight, ws clients, event loop lag and 429 ratio
- `backend/src/server.js` exposes `capacity` in `/health`
- saturation is treated as a tuning signal, not as a product behavior change
- the milestone stays read-only

## 10) Rate-limit vs capacity signals

- `backend/src/bootstrap/rateLimits.js` keeps read and write buckets separate
- 429 remains a real signal and is not hidden with ignore lists
- dashboard bulk, request-storm and production policy companions stay compatible
- the probe only reads capacity, it does not relax limits

## 11) Dashboard bulk / cache coalescing / request-storm / rate-limit compatibility

- `DASHBOARD-BULK-ENDPOINT-01` remains the read fan-out companion
- `CACHE-COALESCING-AND-BACKOFF-01` keeps same-key duplicate fetches bounded
- `REQUEST-STORM-RESILIENCE-01` keeps 429 console/page noise visible
- `PRODUCTION-RATE-LIMIT-POLICY-01` keeps the central 429 policy closed
- these milestones now hand off to `DB-POOL-AND-API-SCALING-01`

## 12) Local/dev-safe probe policy

- `DB_SCALING_BASE_URL` defaults to local host URLs only
- `DB_SCALING_PLAN_ONLY=1` prints the plan without sending requests
- `DB_SCALING_WRITE_REPORT=1` is optional and writes to a gitignored path
- report path: `backend/artifacts/db-scaling/db_pool_and_api_scaling_01_report.json`
- the probe refuses non-local URLs

## 13) No write-action / human approval boundary

- no POST, PUT, PATCH or DELETE requests
- no DB writes
- no write-action dispatcher
- no human approval bypass
- auth endpoints stay opt-in only

## 14) What is not changed

- no route or service behavior is changed here
- no Prisma schema or migration is changed here
- no production/public URL load is introduced
- no staged or committed artifact is required
- `debug.log` should remain absent

## 15) What remains for production infra

- DB pool sizing
- API worker and process sizing
- keep-alive and timeout tuning if needed
- pool wait time alerting
- 429 burst alerting
- latency percentile alerting

## 16) Observability metrics to add next

- connection pool wait time
- query latency p50/p95/p99
- health db latency
- dashboard bulk latency
- 429 ratio
- 5xx ratio
- event loop lag
- capacity baseline summary

## 17) Validation results

- planned check: `check:dbpoolandapiscaling01`
- planned command: `node backend/scripts/db_pool_and_api_scaling_01_check.js`
- companion checks: `check:loadtest2000users01`, `check:dashboardbulkendpoint01`, `check:cachecoalescingandbackoff01`, `check:requeststormresilience01`, `check:productionratelimitpolicy01`
- chain checks: `check:scriptharnessconsolidation01`, `check:verifychain01`
- repo checks: `npm run verify:repo`, `npm run verify:final`
- Companion redteam milestone: `ROLE-DATA-ISOLATION-REDTEAM-01`
- Security final handoff: `SECURITY-KVKK-FINAL-01`

## 18) Remaining risks

- if the probe is pointed at a non-local URL, it must fail closed
- if auth is enabled without a token, the probe must fail closed
- if latency or 429 rises, infra tuning is the next step
- if db-scaling artifacts are staged, the commit-external boundary is broken

## 19) Next recommended milestone

`OBSERVABILITY-MONITORING-ALERTING-01`

This next milestone should turn capacity, DB latency, 429 ratio and event loop lag into alerting and dashboard signals.
