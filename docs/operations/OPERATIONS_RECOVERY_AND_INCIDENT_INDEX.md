# Operations, recovery and incident index

This is a navigation index to current owners. It does not claim production DR or observability capabilities that belong to #38.

## Deployment topology

The local canonical topology is defined by `infra/docker-compose.yml`: PostgreSQL 16, Redis 7, API, and optional OSRM/solver profiles. The API image/build owner is `backend/Dockerfile`; health and readiness are served by the backend server/health owner. Environment values and credentials are supplied outside source-controlled docs.

| Surface | Owner | Current boundary |
|---|---|---|
| API | `backend/src/server.js` | Express/Socket.IO process and `/health` |
| PostgreSQL | `infra/docker-compose.yml`, Prisma schema | Canonical local persistence |
| Redis | `backend/src/redis/`, compose | Cache/queue/rate-limit support; not business SSOT |
| OSRM | `backend/src/services/osrmRoute.js`, compose optional profile | Routing provider/fallback boundary |
| Solver | `infra/solver/app.py`, compose optional profile | Optional planning service; #20 optimizer is future |
| Migrations | `backend/scripts/database_migration_baseline_and_live_adoption_01_owner.mjs` | Explicit approval/change-control boundary |
| Backups | `backend/src/ops/databaseBackupService.js`, #12 scripts | PostgreSQL custom archive, checksum, inventory, isolated restore |
| Evidence/checks | `backend/scripts/`, `artifacts/` owners | Current-head proof; generated artifacts are not source truth |

## Recovery/runbook index

| Scenario | First check | Current owner | Safe scope | Future/operational boundary |
|---|---|---|---|---|
| DB restore | backup inventory/checksum and isolated restore | [#12 backup contract](../DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01.md) | isolated target only | Production overwrite/PITR/storage belongs to deployment/#38 |
| Migration incident | migration status, backup prerequisite, audit | [#13 migration contract](../DATABASE_MIGRATION_BASELINE_AND_LIVE_ADOPTION_01.md) | stop and preserve evidence | No automatic down-migration claim |
| API rollback | health, current release evidence, deployment logs | `backend/src/server.js`, deployment owner | controlled deployment rollback | Production rollout hardening #38 |
| Provider outage | provider status/provenance/fallback state | `backend/src/externalCost/`, `backend/src/telematics/`, routing services | use explicit no-data/fallback semantics | Provider resilience #38 |
| Redis/cache issue | Redis health and cache/queue diagnostics | `backend/src/redis/`, `backend/src/jobs/` | fail safely; cache is not business truth | Production observability #38 |
| Routing/OSRM issue | route provider response and fallback | `backend/src/services/osrmRoute.js` | preserve route uncertainty | #20 intelligence and #38 resilience |
| Protected runtime-data change | git status and exact path census | NEW-01 guard owners | stop; do not restore or stage blindly | Never treat as disposable evidence |

Existing detailed references include `RUNBOOK_CLEAN_CLONE_VERIFICATION_V1.md`, `RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md`, `RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md`, `FIELD_LAUNCH_PACK_01_RUNBOOK.md`, and the #12/#13 documents above. They remain links to their own owners; this index does not duplicate their procedures.

## Incident decision pattern

`symptom` → first check → owner evidence → safe bounded action → audit/approval → escalation. Do not hide a dependency failure behind a fabricated green status. Do not print secrets, database URLs, tokens, or private financial payloads.

## Backup and migration boundaries

#12 owns backup creation, checksum, retention inventory, and isolated restore rehearsal. Production encryption/key custody, offsite failure-domain storage, WAL/PITR and production RPO/RTO are deployment-owned gaps. #13 owns the 56-entry migration baseline currently represented by the repository, explicit schema entrypoint, status/deploy/resolve policy and safe isolated rehearsal. Never reset or reseed the canonical database as an incident shortcut.

## Future security policy

MFA layering (TOTP, risk-permitted SMS fallback, WebAuthn/passkey readiness, trusted-device expiry/revocation, re-authentication and step-up policy) is documented as future policy owned by #35/#38. A trusted device reduces repeated prompts after strong verification; it does not replace initial MFA. No provider or secret is selected by this documentation milestone.
