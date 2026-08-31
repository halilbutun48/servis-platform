# DATABASE-BACKUP-RETENTION-AND-INTEGRITY-01

## 1) Scope and canonical boundary

This milestone owns provider-independent PostgreSQL backup creation, verification, retention inventory and isolated restore rehearsal. It prepares a trustworthy recovery package; it does not post accounting entries, write business records, make payments or mutate the canonical production database.

Canonical owner:

- backend/src/ops/databaseBackupService.js
- backend/scripts/database_backup_retention_and_integrity_01.mjs
- backend/scripts/database_backup_retention_and_integrity_01_acceptance.mjs
- backend/scripts/database_backup_retention_and_integrity_01_check.js

Compatibility surfaces remain visible for the older M45 names, but they delegate to the #12 owner:

- backend/src/ops/backupArchiveOps.js
- backend/src/ops/retentionBackupPolicy.js
- backend/scripts/m45_backup_create.js
- backend/scripts/m45_backup_restore.js
- tools/backup_create_m45.ps1
- tools/backup_restore_m45.ps1

The compatibility layer contains no placeholder archive and no second backup engine.

## 2) Existing backup-family census

| Family | Current role | Classification | Handling |
|---|---|---|---|
| artifacts/backups/servisdb_backup_* and related historical SQL/manifest/stderr files | historical M45 plain-SQL recovery material | LEGACY / HISTORICAL | retain; do not silently delete or treat as the #12 verified inventory |
| backend/src/ops/backupArchiveOps.js and M45 scripts/tools | existing public names and runbook compatibility | COMPATIBILITY DELEGATE | keep names; delegate behavior to databaseBackupService.js |
| backend/artifacts/runtime-data/*.json | application runtime state, not database backup | PROTECTED RUNTIME-DATA | untouched, unstaged and uncommitted |
| backend/artifacts/data-integrity/ | ignored acceptance evidence | GENERATED EVIDENCE | current-head evidence only; never a backup payload |
| tools/_backup/README.md and M45 runbooks | historical operational documentation | DOCUMENTATION / REFERENCE | retain and point to the canonical owner |

Historical M45 artifacts are not a second canonical source. The #12 inventory is the only authoritative index for #12-generated files.

## 3) Canonical contract

Contract version: ACCOUNTING_BACKUP_INTEGRITY_V1

Format: PostgreSQL custom archive produced by pg_dump with compression level 6, no owner and no privileges. Each accepted archive has:

- backupId, eventIdentity and a stable idempotencyKey derived from source identity, schema identity and logical scope
- contentIdentity, checksumAlgorithm=sha256, checksum and exact fileSize
- source database identity without a password, PostgreSQL and backup-tool versions
- sourceGitHead and canonical Prisma schema identity
- logical scope, retention class, frequency, duration, expiration and restore compatibility policy
- encryptionState=STORAGE_POLICY_DELEGATED; the application never owns or prints a backup key
- status=VERIFIED only after non-empty output, archive inspection and atomic promotion
- auditReference and inventory registration

Passwords, DATABASE_URL credentials and sensitive payloads are not included in metadata or diagnostics.

## 4) Atomic creation and inventory

Creation follows this order:

1. Resolve the configured source identity and canonical schema identity.
2. Check available storage when the platform exposes capacity.
3. Run the canonical pg_dump owner against the configured database.
4. Write to a hidden .partial file with restrictive permissions.
5. Reject zero-byte output, calculate SHA-256, and inspect the custom archive with pg_restore --list.
6. Promote the archive with an atomic rename.
7. Write the manifest and update backup-inventory.json under a bounded inventory lock.

An interrupted or failed operation is never registered as VERIFIED. The inventory stores only safe filenames within its output directory; traversal entries are rejected before deletion.

Concurrent backup invocations receive distinct backupId/eventIdentity values and serialize inventory updates. Same logical scope retains a stable idempotencyKey; a changed logical scope receives a different identity.

## 5) Retention policy

| Retention class | Duration | Frequency | Restore priority |
|---|---:|---|---|
| operational | 7 days | on-demand / 6-hourly | hot |
| daily | 35 days | daily | high |
| weekly | 90 days | weekly | medium |
| monthly | 730 days | monthly | long-term |
| protected | no automatic expiry | manual / pre-migration | highest |
| rehearsal | 2 days | test-only | test |

Pruning is inventory-driven and fail-closed. Protected backups and the last valid retained backup are not deleted. Corrupt expired entries may be removed only from an isolated or explicitly configured backup directory after the inventory identifies them.

## 6) Restore and rehearsal policy

Restore requires an explicit target database URL and isolated=true. The service refuses a target whose masked database identity equals the source identity and verifies the archive checksum and structure before target access.

The real acceptance uses two temporary PostgreSQL 16 containers, restores the custom archive into a separate database, compares row counts and critical Agreement/Hakedis relationships, compares normalized schema/index/FK/enum output, runs read-only Prisma queries, starts the backend against the restored database, checks /health with dbOk=true, authenticates the seeded acceptance user and calls /api/me. Temporary containers, records and files are removed in finally blocks.

Production restore, canonical DB overwrite, migration reset, reseed and blind migration application are outside this milestone.

## 7) RPO, RTO, PITR and failure domain

- Current local-stage RPO target: 24 hours with daily minimum backup; an operational or protected-change backup is required before sensitive changes.
- RTO evidence: the isolated restore rehearsal measures the recovery path; it is not a production SLA.
- PITR/WAL: not implemented in #12. A deployment follow-up must own WAL retention, archive storage and PITR restore policy.
- Same-host storage is a recovery convenience, not a disaster-domain guarantee. Production deployment must place protected copies on a separate host, disk or object-storage boundary.
- Encryption at rest, transport and key custody belong to the deployment/storage owner; no hard-coded application key is permitted.

## 8) CLI and operational commands

- node backend/scripts/database_backup_retention_and_integrity_01.mjs policy --json
- node backend/scripts/database_backup_retention_and_integrity_01.mjs inventory --json
- node backend/scripts/database_backup_retention_and_integrity_01.mjs create
- node backend/scripts/database_backup_retention_and_integrity_01.mjs verify
- node backend/scripts/database_backup_retention_and_integrity_01.mjs prune --dry-run --json
- node backend/scripts/database_backup_retention_and_integrity_01.mjs restore --backup-file=... --target-database-url=... --target-container=... --isolated
- npm --prefix backend run backup:acceptance
- npm run check:databasebackupretentionandintegrity01

Scheduled execution is deployment-owned. #12 provides one deterministic service/CLI owner and does not start a second scheduler or run backup generation on every API startup.

## 9) Acceptance evidence

Current acceptance evidence is written to backend/artifacts/data-integrity/DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01/acceptance.json and is bound to sourceHead. The focused checker rejects missing, stale or failed evidence.

Required proof includes:

- real custom-format archive and complete metadata
- checksum verification and isolated corruption rejection
- transactional consistency during bounded concurrent writes
- stable same-scope and changed-scope identity
- isolated restore with data, schema and relation parity
- post-restore Prisma and authenticated backend health
- retention, protected-backup, low-disk, path-traversal and failure-observability negatives
- no secrets, runtime-data access, backup payload tracking or temporary artifact leak

Observed isolated fixture in the current proof: sourceRows=149, restoredRows=149, PostgreSQL 16.13, and dbOk=true.

## 10) Release gate and non-goals

Run focused #12 check and acceptance before the existing data-integrity, security, lint, product-extensions, verify:repo and verify:final gates. The #12 acceptance does not replace those gates.

Explicit non-goals:

- no accounting posting, payment, invoice finalization or business-data write
- no provider-specific canonical format
- no schema or migration change
- no reset/reseed or canonical DB mutation
- no deletion of historical M45 artifacts or protected runtime-data

Related documentation remains available in docs/DATA_INTEGRITY_AND_RECOVERY_01.md, docs/RUNBOOK_M45_RETENTION_BACKUP.md and docs/REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md.
