# ROLE-DATA-ISOLATION-REDTEAM-01

Tarih: 2026-07-23
Repo: `servis-platform`

## 1) Purpose
Bu doküman roller ve tenant sınırları arasında veri sızıntısı riskini ölçen read-only, local/dev-safe, deterministic redteam readiness kilididir.
Canonical check: `check:roledataisolationredteam01`
Check script: `node backend\scripts\role_data_isolation_redteam_01_check.js`
Probe gerekli değildir; bu milestone static policy / doc / code inventory ile yaşar.

## 2) Problem statement
- SUPER_ADMIN, ROOM, COMPANY, DRIVER, PERSONEL, PARENT, SCHOOL ve ORGANIZATION veri sınırları net olmalıdır.
- Cross-company, cross-room, cross-school, cross-organization ve cross-personel sızıntı riskleri görünür olmalıdır.
- Route, shift, agreement, live GPS, stop, request, payment/hakediş preview, quality decision, public lead ve user/account yüzeyleri isolation açısından okunabilir kalmalıdır.
- KVKK öncesi role-data isolation acceptance gate, PII-safe raporlama ve human approval boundary ile birlikte çalışmalıdır.

## 3) Role inventory
- SUPER_ADMIN
- ROOM
- COMPANY
- DRIVER
- PERSONEL
- PARENT
- SCHOOL
- ORGANIZATION

## 4) Tenant/data scope model
- company scope only owned company data.
- room scope only assigned room data.
- school scope only school-bound students/routes/operations.
- organization scope only own organization data.
- driver scope only assigned shift/route/stop/live state.
- personel scope only own ride/live/request/profile-safe data.
- parent scope only linked child/student ride-safe data.
- super admin broad read/admin visibility may exist, but no unsafe write-action from Copilot/AI.

## 5) Role-to-data access matrix
- SUPER_ADMIN: broad read/admin visibility, but no automated unsafe write-action from Copilot/AI.
- ROOM: only owned/assigned room operations, drivers, vehicles, shifts, routes and related companies.
- COMPANY: only own company operations, agreements, shifts, personnel and route previews.
- DRIVER: only own assigned shifts/routes/stops/live task state.
- PERSONEL: only own ride/live/request/profile-safe data.
- PARENT: only linked child/student ride/live-safe data.
- SCHOOL: only own school scoped students/routes/operations.
- ORGANIZATION: only own organization scoped operations/providers/contracts.

## 6) Cross-tenant redteam matrix
- company vs company: same-role users cannot read another company.
- room vs room: another room's shift, vehicle, route and live state cannot leak.
- school vs school: another school's students, routes and operations cannot leak.
- organization vs organization: provider, contract and ops scope cannot leak.
- personel vs personel: another personel's ride/request/profile-safe data cannot leak.
- driver vs driver: another driver's shift/route/live task state cannot leak.
- parent vs parent: another family's linked child/student data cannot leak.
- super admin: broad read is allowed, but Copilot/AI write-action must still stay blocked.

## 7) Endpoint/data surface risk matrix
- route: route preview only, no apply.
- shift: own shift scope only.
- agreement: preview/read only.
- live GPS: raw trace never logs.
- stop: assigned scope only.
- request: foreign request/support data never leaks.
- payment/hakediş preview: read-only.
- quality decision: review signal only.
- public lead: no cross-tenant lead list.
- user/account: no scope-breaking export.

## 8) Critical entity isolation policy
- Critical entity matrix must preserve tenant, assignment and linkage together.
- Referential integrity is read alongside tenant boundaries.
- Partial write, duplicate write and stale write risks must not produce a cross-tenant leak.

## 9) Company isolation policy
- Only own company operations are visible.
- Agreement, shift, personnel and route preview stay within company scope.
- Foreign company data needs explicit approval and must not leak through Copilot.

## 10) Room isolation policy
- Room scope only covers assigned room operations.
- Vehicles, drivers, shifts, routes and related companies stay inside the room boundary.
- Foreign room live/stop/route data must not appear.

## 11) School/organization isolation policy
- School scope covers own students/routes/operations only.
- Organization scope covers own providers/contracts/ops only.
- Cross-school and cross-organization query paths fail closed.

## 12) Driver isolation policy
- Driver sees only own assigned shift/route/stop/live task state.
- Another driver's task state, vehicle assignment or history must not appear.
- Route apply and dispatch apply stay blocked.

## 13) Personel isolation policy
- Personel sees only own ride/live/request/profile-safe data.
- Another personel's child, ride, request or payment detail must not appear.
- Admin write-action stays blocked.

## 14) Parent isolation policy
- Parent sees only linked child/student ride-safe data.
- Sibling, school-wide and raw GPS trace access stays blocked.
- Public lead and user/account exports stay blocked.

## 15) Super admin boundary policy
- SUPER_ADMIN may have broader read/admin visibility.
- Copilot/AI runtime cannot turn that into an unsafe write-action.
- Human approval boundary stays intact.

## 16) Dashboard bulk isolation policy
- `backend/src/services/dashboardBulk.js` uses `scopeOf(user)` with role/companyId/roomId/userId.
- Dashboard bulk cache keys stay scoped by role/company/room/user.
- Cross-role cache contamination is a redteam fail-closed case.

## 17) Cache key isolation policy
- `backend/src/utils/responseCache.js` keys on role/companyId/roomId/userId.
- Reads and writes stay scope-aware.
- Stale read / cache contamination cannot become a cross-tenant leak.

## 18) Runtime-data isolation policy
- `backend/artifacts/runtime-data/` is commit-external.
- Current runtime-data list: `password-change-requirements.json`, `username-directory.json`, `agreement-route-refresh-requests.json`, `public-leads.json`, `quality-review-decisions.json`, `region-failover-drill-state.json`.
- `backend/artifacts/role-redteam/` is reserved for future local/dev-safe aggregates; this check does not generate reports there.

## 19) Public lead isolation policy
- Public lead visibility stays within tenant boundary and privacy policy.
- Cross-company public lead lists stay blocked.
- PII-safe aggregate only, never raw sensitive export.

## 20) Payment/hakediş preview isolation policy
- Payment/hakediş preview stays read-only.
- Execute / settlement / contract / agreement write paths stay blocked.
- Preview must not carry foreign tenant payment data.

## 21) Live GPS / route / stop isolation policy
- Live GPS raw trace never logs.
- Route and stop data stay within assigned scope.
- Route apply, stop create and dispatch apply stay blocked.

## 22) Agreement / shift isolation policy
- Agreement and shift remain preview-only.
- Foreign company / room / school agreement and shift data stay blocked.
- Apply / execute / acceptance decision never writes here.

## 23) KVKK-safe redteam reporting policy
- Reports use only aggregate / path / role / scope labels.
- Never log full name, phone, address, email, TCKN, child/personel sensitive data, raw GPS trace, provider credential, token, cookie or password.
- Fake success and hallucinated capability are report failures, not acceptable outcomes.

## 24) No write-action / human approval boundary
- RFQ send yok.
- offer accept/reject yok.
- agreement execute yok.
- dispatch apply yok.
- driver/vehicle assign yok.
- route apply yok.
- payment/hakediş execute yok.
- messaging/SMS/email/push yok.
- provider credential yok.
- user/admin write yok.
- human approval boundary korunur.

## 25) Observability handoff
- Observability handoff only uses aggregate and privacy-safe signals.
- Alerts and runbooks must not leak PII.
- Monitoring evidence must not weaken tenant isolation.

## 26) Data integrity handoff
- Data integrity handoff stays aligned with runtime-data recovery.
- Corruption detection is separate from cross-tenant leak detection.
- Recovery after corruption must re-validate isolation gates.
- Companion milestones: `DATA-INTEGRITY-AND-RECOVERY-01`, `OBSERVABILITY-MONITORING-ALERTING-01`, `DB-POOL-AND-API-SCALING-01`, `LOAD-TEST-2000-USERS-01`, `CACHE-COALESCING-AND-BACKOFF-01`, `REQUEST-STORM-RESILIENCE-01`, `PRODUCTION-RATE-LIMIT-POLICY-01`.

## 27) Release gate checklist
- `check:roledataisolationredteam01`
- `check:product-extensions`
- `verify:repo`
- `verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- Smoke thresholds stay at 18/82/82/82 with zero console/page errors and `429=none`.
- `consoleErrorCount=0`
- `pageErrorCount=0`
- `429=none`

## 28) What is not changed
- No production DB.
- No public URL probe.
- No real credential or token generation.
- no real credentials.
- No destructive query.
- No schema/migration.
- No route/service/prisma diff.
- No runtime AI/model execution.
- No runtime/model/API execution.
- no runtime/model execution.
- No stage/commit/tag/push.

## 29) Validation results
- roleInventorySummary
- tenantScopeSummary
- accessMatrixSummary
- redteamMatrixSummary
- criticalSurfaceSummary
- cacheIsolationSummary
- runtimeDataIsolationSummary
- kvkkSafeRedteamSummary
- humanApprovalBoundarySummary
- compatibilitySummary
- smokeThresholdSummary
- chainWiringSummary
- commitExternalSummary
- prismaSummary
- roleInventorySummary=roles=8; SUPER_ADMIN, ROOM, COMPANY, DRIVER, PERSONEL, PARENT, SCHOOL, ORGANIZATION
- tenantScopeSummary=company / room / school / organization / personel / driver / parent / super admin
- accessMatrixSummary=roles=8; criticalSurfaces=10
- redteamMatrixSummary=cross-tenant cases=8; no fake success; no hallucinated capability
- criticalSurfaceSummary=route, shift, agreement, live GPS, stop, request, payment/hakediş preview, quality decision, public lead, user/account
- cacheIsolationSummary=responseCache scope key uses role/companyId/roomId/userId; dashboardBulk scopeOf(user) feeds scoped cache keys
- runtimeDataIsolationSummary=backend/artifacts/runtime-data remains commit-external; backend/artifacts/role-redteam is reserved and not generated by this check
- kvkkSafeRedteamSummary=No PII/token/cookie/password/provider credential/raw GPS logs; aggregate/path/role/scope labels only
- humanApprovalBoundarySummary=No RFQ send, offer accept/reject, agreement execute, dispatch apply, driver/vehicle assign, route apply, payment/hakediş execute, messaging, provider credential or user/admin write
- compatibilitySummary=DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01
- smokeThresholdSummary=product-flow 18/0/0/0; premium 82/0/0/0; all-panels 82/0/0/0; mobile all-roles 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none
- chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer
- commitExternalSummary=runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam are commit-external; stage stays empty
- prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only

## 30) Remaining risks
- Without a live production probe, this gate stays policy-level.
- If any future artifact is produced, commit-external boundary must remain intact.
- Cross-tenant leakage still needs ongoing review when code changes touch these surfaces.

## 31) Next recommended milestone
`SECURITY-KVKK-FINAL-01`
