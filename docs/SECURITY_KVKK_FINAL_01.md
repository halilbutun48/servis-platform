# SECURITY-KVKK-FINAL-01

Tarih: 2026-07-23
Repo: `servis-platform`

## 1) Purpose
This is a technical security / KVKK readiness gate; it is not legal advice.
Bu doküman teknik security / KVKK readiness final gate'idir; hukuki danışmanlık değildir.
Canonical check: `check:securitykvkkfinal01`
Check script: `node backend\scripts\security_kvkk_final_01_check.js`
Probe gerekli değildir; bu milestone static policy/doc/code inventory ile yaşar.

## 2) Problem statement
- PII, token, cookie, password, provider credential ve raw GPS trace yüzeyleri görünür ve ölçülebilir kalmalıdır.
- Public lead, personel, parent, school, organization ve driver verileri tenant/scope sınırını aşmamalıdır.
- Route, stop, shift, agreement ve payment preview yüzeyleri read-only kalmalıdır.
- Runtime-data, generated artifact ve debug log commit dışı kalmalıdır.

## 3) Security / KVKK data classification
- Data classification katmanı açık kalır.
- Critical entity matrix tenant, assignment ve linkage ile birlikte okunur.
- Referential integrity policy, cross-tenant sızıntı riskine karşı read-only kalır.
- `SUPER_ADMIN`, `ROOM`, `COMPANY`, `DRIVER`, `PERSONEL`, `PARENT`, `SCHOOL` ve `ORGANIZATION` yüzeyleri ayrışır.

## 4) Sensitive field matrix
- token
- cookie
- password
- provider credential
- TCKN
- raw GPS
- full name
- phone
- address
- email
- child data
- personel data
- public lead

## 5) Never-log / never-store matrix
- Never-log ve never-store sınırı korunur.
- Raw token, cookie, password, provider credential ve raw GPS trace commit-evidence içine girmez.
- `debug.log` commit dışıdır ve final kabulde absent kalır.
- Ham PII, ham export ve ham credential payload'ı yazılmaz.

## 6) Public lead / personel / parent / school / organization safety
- Public lead, personel, parent, school ve organization yüzeyleri birbirine karışmaz.
- Cross-company, cross-room, cross-school ve cross-organization sızıntı olmaz.
- Driver, room, company ve super admin rollerinin erişim sınırı ayrı okunur.
- Public listeler read-only ve privacy-safe kalır.

## 7) Live GPS / route / stop / shift / agreement / payment preview safety
- Live GPS raw trace görünmez.
- Route, stop, shift ve agreement preview read-only kalır.
- Payment/hakediş preview execute etmez.
- Route apply, stop create, dispatch apply ve agreement execute kapalı kalır.

## 8) Retention / deletion / anonymization readiness
- Retention, deletion ve anonymization readiness görünür kalır.
- Saklama süresi dolan kayıtlar ayrı batch/cleanup akışıyla yönetilir.
- `docs/RUNBOOK_M45_RETENTION_BACKUP.md` ve `docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md` bu güvenliği destekler.
- Export trail ve audit trail ayrı tutulur.

## 9) Backup / restore handoff
- Backup policy ve restore policy görünür kalır.
- `backend/src/ops/retentionBackupPolicy.js`, `backend/src/ops/backupArchiveOps.js` ve `backend/src/lib/jsonFileStore.js` bu hattın teknik dayanaklarıdır.
- `GET /api/admin/backup/policy`, `GET /api/admin/backup/manifest`, `POST /api/admin/backup/create` ve `POST /api/admin/backup/restore` okunur.
- Gerçek restore bu check içinde çalıştırılmaz; sadece güvenli handoff ve policy okunur.

## 10) Role-data isolation handoff
- `ROLE-DATA-ISOLATION-REDTEAM-01` bu gate'in rol / tenant izolasyon companion'ıdır.
- Cross-tenant read/write ve cache contamination riskleri ayrı okunur.
- Role-data redteam başarısı olmadan security final tamamlanmış sayılmaz.

## 11) Observability / security alert handoff
- `OBSERVABILITY-MONITORING-ALERTING-01` bu gate'in observability companion'ıdır.
- consoleErrorCount ve pageErrorCount sıfır kalır.
- 429 sinyali maskelenmez; `429=none` beklentisi korunur.
- Security alert bandı ve audit/monitoring handoff ayrı tutulur.

## 12) Data integrity / recovery handoff
- `DATA-INTEGRITY-AND-RECOVERY-01` bu gate'in recovery companion'ıdır.
- `docs/PHASE_12_KVKK_SECURITY.md` phase 12 checklist'i ve KVKK/security DoD için referans source of truth olarak kalır.
- Corruption detection, runtime-data recovery ve backup/restore policy birlikte okunur.
- Partial write / duplicate write / stale write riskleri cross-tenant leak'e dönüşmez.
- Restore sonrası izolasyon gate'leri tekrar doğrulanır.

## 13) No write-action / human approval boundary
- No write-action sınırı korunur.
- RFQ send yok.
- offer accept/reject yok.
- agreement execute yok.
- dispatch apply yok.
- driver/vehicle assign yok.
- route apply yok.
- payment/hakediş execute yok.
- messaging yok.
- provider credential write yok.
- user/admin write yok.
- Human approval boundary açık kalır.

## 14) Runtime-data / generated artifact / commit-external boundary
- `backend/artifacts/runtime-data/` commit dışıdır.
- Runtime-data list:
  - `backend/artifacts/runtime-data/password-change-requirements.json`
  - `backend/artifacts/runtime-data/username-directory.json`
  - `backend/artifacts/runtime-data/agreement-route-refresh-requests.json`
  - `backend/artifacts/runtime-data/public-leads.json`
  - `backend/artifacts/runtime-data/quality-review-decisions.json`
  - `backend/artifacts/runtime-data/region-failover-drill-state.json`
- `backend/artifacts/browser-smoke/`, `backend/artifacts/load-test/`, `backend/artifacts/db-scaling/`, `backend/artifacts/observability/`, `backend/artifacts/data-integrity/` ve `backend/artifacts/role-redteam/` commit dışıdır.
- `backend/artifacts/security-kvkk/` bu check tarafından üretilmez; gerekirse ileride ayrı bir artifact policy altında açılır.
- `No stage/commit/tag/push` sınırı korunur.

### Supporting references
- Data classification
- Critical entity matrix
- Referential integrity policy
- Transaction boundary policy
- Idempotency and retry-safety policy
- Backup policy
- Restore policy
- RPO / RTO targets
- Recovery runbook
- Corruption detection policy
- Partial write / duplicate write / stale write risk matrix
- Runtime-data commit-external and recovery policy
- Migration and rollback safety policy
- KVKK-safe backup/logging policy
- Observability handoff
- Incident severity matrix
- Release gate checklist
- Generated artifact policy
- Runtime-data list
- No production DB
- No destructive query
- No schema/migration
- No route/service/prisma diff
- smoke threshold 18/82/82/82
- consoleErrorCount=0
- pageErrorCount=0
- 429=none
- No public URL
- No real token/credential generation
- No stage/commit/tag/push
- No runtime AI/model execution

## 15) Release gate checklist
- `check:securitykvkkfinal01`
- `check:roledataisolationredteam01`
- `check:dataintegrityandrecovery01`
- `check:observabilitymonitoringalerting01`
- `check:dbpoolandapiscaling01`
- `check:loadtest2000users01`
- `check:cachecoalescingandbackoff01`
- `check:requeststormresilience01`
- `check:productionratelimitpolicy01`
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
- No public URL probe.
- No real token/credential generation.
- No destructive query.
- No schema/migration.
- No route/service/prisma diff.
- No smoke threshold loosening.
- No 429 allowlist.
- No backup/restore real run.
- No runtime AI/model execution.
- No stage/commit/tag/push.

## 17) Validation results
- `dataClassificationSummary`
- `sensitiveFieldSummary`
- `neverLogSummary`
- `publicSurfaceSummary`
- `liveOpsSummary`
- `retentionSummary`
- `backupRestoreSummary`
- `roleDataHandoffSummary`
- `observabilitySecuritySummary`
- `dataIntegrityHandoffSummary`
- `humanApprovalBoundarySummary`
- `runtimeDataBoundarySummary`
- `compatibilitySummary`
- `smokeThresholdSummary`
- `chainWiringSummary`
- `commitExternalSummary`
- `prismaSummary`
- `dataClassificationSummary=data classification, critical entity matrix and referential integrity policy stay visible`
- `sensitiveFieldSummary=token, cookie, password, provider credential, raw GPS and TCKN stay blocked`
- `neverLogSummary=never-log and never-store matrix stays visible`
- `publicSurfaceSummary=public lead, personel, parent, school, organization and driver surfaces stay separated`
- `liveOpsSummary=live GPS, route, stop, shift, agreement and payment preview stay read-only`
- `retentionSummary=retention, deletion and anonymization readiness stay visible`
- `backupRestoreSummary=backup policy, restore policy and M45 handoff stay visible`
- `roleDataHandoffSummary=role-data isolation handoff stays visible`
- `observabilitySecuritySummary=observability and security alert handoff stays visible`
- `dataIntegrityHandoffSummary=data integrity and recovery handoff stays visible`
- `humanApprovalBoundarySummary=no write-action / human approval boundary stays visible`
- `runtimeDataBoundarySummary=runtime-data and generated artifact boundary stays visible`
- `compatibilitySummary=ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01`
- `smokeThresholdSummary=product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none`
- `chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer`
- `commitExternalSummary=runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk are commit-external; stage stays empty`
- `prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only`
- `PASS SECURITY-KVKK-FINAL-01`

## 18) Remaining risks
- Live production probe absent olduğundan bu gate policy-level kalır.
- Future artifact writer commit-external boundary'yi bozabilir.
- KVKK yorumu ve legal final insan review gerektirir.

## 19) Next recommended milestone
`UX-SUPERADMIN-AUDIT-PANEL-01`
