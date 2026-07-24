# AUDIT-LOG-AND-APPROVAL-TRACE-01

Tarih: 2026-07-23
Repo: `servis-platform`

## 1) Purpose
Bu doküman kritik aksiyonlar için audit log ve human approval trace readiness gate'idir; hukuki danışmanlık değildir.
Canonical check: `check:auditlogandapprovaltrace01`
Check script: `node backend\scripts\audit_log_and_approval_trace_01_check.js`
Probe gerekli değildir; bu milestone static policy / doc / code inventory ile yaşar.

## 2) Problem statement
- Recommendation ile execution ayrımı görünür olmalıdır.
- Human approval trace append-only ve deterministic kalmalıdır.
- Role / tenant / scope bilgisi trace içinde ölçülebilir kalmalıdır.
- KVKK-safe payload şarttır; raw PII, token, credential ve raw GPS trace yazılamaz.
- Generated artifact ve debug log commit dışı kalmalıdır.

## 3) Auditability principles
- Trace append-only kalır.
- Recommendation, approval request, approval decision ve execution-block sinyalleri ayrı event type'larla okunur.
- Action-prep ile execution boundary net kalır.
- correlationId ve requestId ilişkisi raw secret taşımadan korunur.
- Companion references: `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-AI-ACTION-ROADMAP-01`, `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`, `SECURITY-KVKK-FINAL-01`, `ROLE-DATA-ISOLATION-REDTEAM-01`, `DATA-INTEGRITY-AND-RECOVERY-01`, `OBSERVABILITY-MONITORING-ALERTING-01`, `DB-POOL-AND-API-SCALING-01`, `LOAD-TEST-2000-USERS-01`, `CACHE-COALESCING-AND-BACKOFF-01`, `REQUEST-STORM-RESILIENCE-01`, `PRODUCTION-RATE-LIMIT-POLICY-01`

## 4) Event taxonomy
- `recommendation_prepared`
- `approval_requested`
- `approval_granted`
- `approval_rejected`
- `approval_cancelled`
- `approval_expired`
- `action_blocked`
- `action_not_executed`
- `human_override`
- `safety_policy_blocked`
- `stale_context_blocked`
- `scope_mismatch_blocked`

## 5) Approval trace lifecycle
1. `recommendation_prepared`
2. `approval_requested`
3. `approval_granted`, `approval_rejected`, `approval_cancelled` veya `approval_expired`
4. `action_blocked` ya da `action_not_executed`
5. `human_override` yalnızca açık manuel onay ile mümkündür
6. `safety_policy_blocked`, `stale_context_blocked` ve `scope_mismatch_blocked` trace'i kapatır

## 6) Action-prep vs execution boundary
- PREPARE ve DRAFT mümkündür.
- EXECUTE açık insan onayı olmadan ilerlemez.
- Proaktif Copilot yalnız önerir, özetler ve hazırlık yapar.
- Hidden background action yoktur.
- Silent write-action yoktur.
- Write-action dispatcher yoktur.

## 7) Approval-required action matrix
- RFQ send
- offer accept/reject
- agreement execute
- dispatch apply
- driver/vehicle assign
- route apply
- payment/hakediş execute
- messaging/SMS/email/push
- provider credential read/write/use
- user/admin write
- public lead conversion
- quality decision apply
- agreement route refresh apply

## 8) KVKK-safe audit payload policy
- `eventType`
- `actorRole`
- `actorScopeType`
- `actorScopeIdHashOrOpaqueRef`
- `targetType`
- `targetScopeType`
- `targetScopeIdHashOrOpaqueRef`
- `actionType`
- `approvalState`
- `policyVersion`
- `reasonCode`
- `timestamp`
- `correlationId`
- `requestId`
- `sourceSurface`
- Raw PII, token, credential ve raw GPS trace yoktur.
- Opaque ref veya hash kullanılır.

## 9) Never-log / never-store matrix
- full name
- phone
- address
- email
- TCKN
- token
- refresh token
- cookie
- password
- provider credential
- raw GPS
- debug payload
- secret header
- raw access token
- raw session token

## 10) Role / tenant / scope audit policy
- `SUPER_ADMIN`
- `COMPANY`
- `ROOM`
- `DRIVER`
- `PERSONEL`
- `PARENT`
- `SCHOOL`
- `ORGANIZATION`
- `actorScopeType` ve `targetScopeType` görünür kalır.
- `actorScopeIdHashOrOpaqueRef` ve `targetScopeIdHashOrOpaqueRef` opaque kalır.
- Cross-tenant veya cross-org veri sızıntısı trace içinde görünmez.
- Scope mismatch blocked kalır.

## 11) Rejection / cancel / timeout / stale approval policy
- `approval_rejected`
- `approval_cancelled`
- `approval_expired`
- `stale_context_blocked`
- `scope_mismatch_blocked`
- `safety_policy_blocked`
- `action_not_executed`
- Silent fallback to execution yoktur.

## 12) Runtime-data / generated artifact / commit-external boundary
- `backend/artifacts/runtime-data/password-change-requirements.json`
- `backend/artifacts/runtime-data/username-directory.json`
- `backend/artifacts/runtime-data/agreement-route-refresh-requests.json`
- `backend/artifacts/runtime-data/public-leads.json`
- `backend/artifacts/runtime-data/quality-review-decisions.json`
- `backend/artifacts/runtime-data/region-failover-drill-state.json`
- `backend/artifacts/browser-smoke/`
- `backend/artifacts/load-test/`
- `backend/artifacts/db-scaling/`
- `backend/artifacts/observability/`
- `backend/artifacts/data-integrity/`
- `backend/artifacts/role-redteam/`
- `backend/artifacts/security-kvkk/`
- `backend/artifacts/audit-trace/` ileride local/dev-safe report için ayrılabilir; bu check burada üretmez.
- `debug.log` absent kalır.
- `No stage/commit/tag/push` sınırı korunur.

## 13) AI / Copilot recommendation trace policy
- Copilot öneri, hazırlık ve risk özeti üretebilir.
- `recommendation_prepared` ve `approval_requested` trace'i görünür kalır.
- `COPILOT-HUMAN-APPROVAL-01`, `COPILOT-AI-ACTION-ROADMAP-01` ve `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` companion referanslarıdır.
- Runtime AI/model execution açılmaz.
- Tool execution açılmaz.
- Write-action açılmaz.
- Human approval explicit ve auditable kalır.

## 14) No write-action / human approval boundary
- No production DB.
- No public URL.
- No real token/credential generation.
- No destructive query.
- No schema/migration.
- No route/service/prisma diff.
- No runtime AI/model execution.
- No stage/commit/tag/push.
- No smoke threshold loosening.
- No 429 allowlist.
- No hidden auto-execute.
- No admin/user write.

## 15) Release gate checklist
- `check:auditlogandapprovaltrace01`
- `check:securitykvkkfinal01`
- `check:roledataisolationredteam01`
- `check:dataintegrityandrecovery01`
- `check:backendlintwarningburndown01`
- `check:observabilitymonitoringalerting01`
- `check:dbpoolandapiscaling01`
- `check:loadtest2000users01`
- `check:cachecoalescingandbackoff01`
- `check:dashboardbulkendpoint01`
- `check:productionratelimitpolicy01`
- `check:requeststormresilience01`
- `check:airesponsesemanticqualitygate01`
- `check:testqualityandflakeaudit01`
- `check:hotfilesplitwebpanels01`
- `check:hotfilesplitaichatcomposers01`
- `check:copilotnextbestactionengine01`
- `check:copilotoperationhealthengine01`
- `check:copilotplanreviewengine01`
- `check:copilotworkflowreasoningengine01`
- `check:seferabiturkishterminology01`
- `check:seferabiturkishuserfacinglanguage01`
- `check:copilotriskscoringengine01`
- `check:copilotrootcauseengine01`
- `check:copilotsmartdiagnosticengine01`
- `check:copilotdynamicquestionengine01`
- `check:copilotclarifyingquestionengine01`
- `check:copilotroutereviewhumanapproval01`
- `check:exceltoroutereadinessredteam01`
- `check:product-extensions`
- `verify:repo`
- `verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- Smoke threshold: `18/82/82/82`
- `consoleErrorCount=0`
- `pageErrorCount=0`
- `429=none`

## 16) What is not changed
- No production DB.
- No public URL probe/load.
- No real token/credential generation.
- No destructive query.
- No schema/migration.
- No route/service/prisma diff.
- No runtime AI/model execution.
- No stage/commit/tag/push.
- No smoke threshold loosening.
- No 429 allowlist.
- No write-action dispatcher.
- No hidden background action.

## 17) Validation results
- `auditabilitySummary`
- `approvalMatrixSummary`
- `eventTaxonomySummary`
- `traceLifecycleSummary`
- `kvkkSafeAuditPayloadSummary`
- `runtimeGeneratedArtifactSummary`
- `humanApprovalBoundarySummary`
- `compatibilitySummary`
- `smokeThresholdSummary`
- `chainWiringSummary`
- `commitExternalSummary`
- `prismaSummary`
- `auditabilitySummary=append-only audit and approval trace stays visible`
- `approvalMatrixSummary=approval-required action matrix stays blocked until explicit human approval`
- `eventTaxonomySummary=recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked`
- `traceLifecycleSummary=trace moves from recommendation to request to approval or block, then stops without silent execution`
- `kvkkSafeAuditPayloadSummary=eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS`
- `runtimeGeneratedArtifactSummary=runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external`
- `humanApprovalBoundarySummary=no write-action / human approval boundary stays visible`
- `compatibilitySummary=SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01`
- `smokeThresholdSummary=product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none`
- `chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer`
- `commitExternalSummary=runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty`
- `prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only`
- `PASS AUDIT-LOG-AND-APPROVAL-TRACE-01`

## 18) Remaining risks
- Future audit sink writer may blur the read-only trace boundary.
- Stale approval decisions can age out without a visible expiry block if future logic regresses.
- Human override must stay explicit and auditable.
- Generated artifact stage leakage would break the commit-external boundary.

## 19) Next recommended milestone
`UX-SUPERADMIN-AUDIT-PANEL-01`
