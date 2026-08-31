# DATA-INTEGRITY-AND-RECOVERY-01

## 1) Purpose
Bu milestone veri bütünlüğü ve recovery sınırını tek yerde sabitler.
Amaç feature davranışı eklemek değil, mevcut güvenli yüzeyi okumak ve release gate için netleştirmektir.

## 2) Problem statement
- Runtime-data corruption, partial write ve silent drift riski görünür olmalıdır.
- Backup / restore akışı production DB'e dokunmadan okunmalıdır.
- Destructive query, schema değişikliği ve migration değişikliği bu milestone kapsamında açılmaz.
- Generated artefact'lar commit dışı kalmalıdır.

## 3) Data safety model
- JSON store, archive backup, manifest ve recovery path'leri ayrı doğrulanır.
- Idempotent retry, atomic write ve fail-closed fallback çizgisi korunur.
- Recovery, sadece açık izinli ve inspect edilebilir yolda ilerler.

## 4) Backup policy
- Kanonik backup yüzeyi `backend/src/routes/admin.js` içindeki `/backup/policy`, `/backup/manifest` ve `/backup/create` akışlarıdır.
- Host-side wrapper `backend/src/ops/backupArchiveOps.js` içinde toplanır.
- Operasyon komutları `backend/scripts/m45_backup_create.js` ve `backend/scripts/m45_backup_restore.js` ile görünür kalır.
- Runbook referansları `docs/RUNBOOK_M45_RETENTION_BACKUP.md` ve `docs/REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md` içindedir.
- Yeni canonical owner `backend/src/ops/databaseBackupService.js` ve `DATABASE-BACKUP-RETENTION-AND-INTEGRITY-01` sözleşmesidir; M45 adları yalnızca bu owner'a delegasyon uyumluluğudur.
- Gerçek custom-format archive, SHA-256 checksum, inventory, retention ve isolated restore kanıtı `docs/DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01.md` ile yaşar.

## 5) Restore policy
- Restore yalnızca explicit `backupFile` ile açılır.
- `--backup-file` olmadan restore isteği güvenli biçimde SKIP edilmelidir.
- Restore yolu destructive default olamaz.
- Production DB hedefi bu milestone'da yoktur.

## 6) RPO / RTO policy
- RPO / RTO budget release note'a açıkça yazılmadan ship edilmez.
- Bu milestone, sayısal hedef icat etmez; policy'nin görünür ve review edilebilir olmasını ister.
- Backup ve restore evidence gelmeden release gate geçmez.

## 7) Idempotency policy
- Tekrar çalışan backup / restore / recovery akışları aynı girdide yeni zarar üretmemelidir.
- `backend/src/lib/jsonFileStore.js` içindeki `.bak` geri dönüşü idempotent recovery okumasını destekler.
- Retry guard, duplicate write veya yeniden oynatma drift'i açmamalıdır.

## 8) Transaction safety policy
- Atomic write, manifest doğrulama ve rollback benzeri korunma adımları okunur kalmalıdır.
- Transaction safety bu milestone'da code-path olarak genişletilmez.
- Schema / migration değişikliği açılmaz.

## 9) Runtime-data recovery policy
- `backend/src/lib/jsonFileStore.js` runtime-data geri dönüşü için `.bak` fallback sağlar.
- Recovery yüzeyi JSON parse fail, missing file ve partial write durumlarını görünür kılar.
- Runtime-data recovery production DB'ye yazma anlamına gelmez.

## 10) Corruption detection policy
- Manifest mismatch, hash mismatch, parse fail ve missing backup file sinyalleri görünür olmalıdır.
- `backend/src/ops/backupArchiveOps.js` ve `backend/src/ops/retentionBackupPolicy.js` bu sınırı taşır.
- Corruption detection, silent success yerine fail-closed davranmalıdır.

## 11) Release gate
- `node backend\scripts\data_integrity_and_recovery_01_check.js`
- `check:dataintegrityandrecovery01`
- `check:product-extensions`
- `verify:repo`
- `verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- Smoke threshold'lar gevşetilmez.

## 12) Generated artifacts and commit-external boundary
- `backend/artifacts/runtime-data/`
- `backend/artifacts/browser-smoke/`
- `backend/artifacts/load-test/`
- `backend/artifacts/db-scaling/`
- `backend/artifacts/observability/`
- `backend/artifacts/data-integrity/`
- `debug.log`
- Bu yollar commit dışıdır ve stage/commit akışına girmez.

## 13) What is not changed
- Production DB değişmez.
- Destructive query çalıştırılmaz.
- Schema veya migration değişikliği yapılmaz.
- Route / service / prisma koduna dokunulmaz.
- Smoke threshold ve lint config gevşetilmez.
- Stage / commit / tag / push yapılmaz.

## 14) Validation results
- Acceptance zinciri: `check:dataintegrityandrecovery01` -> `check:product-extensions` -> `verify:repo` -> `verify:final`
- Release-ready sayılması için check output, diff safety ve commit-external sınırı birlikte okunur.
- Summary outputs: `dataClassificationSummary`, `integrityRiskSummary`, `transactionBoundarySummary`, `idempotencySummary`, `backupRestoreSummary`, `runtimeDataRecoverySummary`, `kvkkSafeRecoverySummary`, `compatibilitySummary`, `smokeThresholdSummary`, `chainWiringSummary`, `commitExternalSummary`, `prismaSummary`.
- Guard topics: data classification, critical entity matrix, referential integrity policy, transaction boundary policy, idempotency and retry-safety policy, backup policy, restore policy, RPO / RTO targets, recovery runbook, corruption detection policy, partial write / duplicate write / stale write risk matrix, runtime-data commit-external and recovery policy, migration and rollback safety policy, KVKK-safe backup/logging policy, observability handoff, incident severity matrix, release gate checklist, generated artifact policy, runtime-data list, no production DB, no destructive query, no schema/migration, no route/service/prisma diff, smoke threshold 18/82/82/82, consoleErrorCount=0, pageErrorCount=0, 429=none.
- Audit trace handoff: `AUDIT-LOG-AND-APPROVAL-TRACE-01`.
- Companion redteam milestone: `ROLE-DATA-ISOLATION-REDTEAM-01`.
- Security final handoff: `SECURITY-KVKK-FINAL-01`.

## 15) Remaining risks
- Live restore drill olmadan production recovery sonucu sadece policy seviyesindedir.
- RPO / RTO, gerçek operasyonal sayı ile ayrıca doğrulanmalıdır.
- Corruption detection için gerçek veri seti üzerinde tekrar test gerekir.

## 16) Next recommended milestone
- `verify:final`
- Bu gate geçmeden commit-ready kapanış yapılmamalıdır.
