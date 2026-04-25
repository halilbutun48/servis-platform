# REGION ARCHIVE EXPORT MANIFEST RESTORE V1

Bu belge, uzun sureli kanit ve history saklamasi icin archive export / manifest / restore akisinin repo durumunu tanimlar.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- [RUNBOOK_M45_RETENTION_BACKUP](RUNBOOK_M45_RETENTION_BACKUP.md)

## Mevcut repo durumu

Archive omurgasi repo'da zaten mevcut:

- `backend/src/ops/retentionBackupPolicy.js` archive summary uretir
- `backend/src/routes/admin.js` backup policy ve backup manifest endpoint'lerini verir
- `backend/src/routes/admin.js` backup create / restore endpoint'lerini verir
- `backend/src/ops/backupArchiveOps.js` create / restore wrapper'ini toplar
- `backend/scripts/m45_backup_create.js` ve `backend/scripts/m45_backup_restore.js` repo komutlari olarak calisir
- `m45_backup_restore.js` verify/automation akışında backup parametresi yoksa güvenli `SKIP` davranışı verir; gerçek restore yine explicit `--backup-file` ister
- `tools/backup_create_m45.ps1` full-db snapshot + manifest uretir
- `tools/backup_restore_m45.ps1` manifest hash dogrulamasiyla restore yapar
- `docs/RUNBOOK_M45_RETENTION_BACKUP.md` calisma akisini anlatir

Bu yuzden bu belge yeni bir hayali sistem kurmaz; mevcut archive davranisini kanonik hale getirir.

## Archive siniflari

Uzun saklama / kanit / inceleme icin onceki kararlarla uyumlu veri siniflari:

- `ApiRequest`
- `AuditLog`
- `Notification` gecmisi
- `GpsPoint`
- `CheckinEvent`
- `Consent` retain-proof

## Mevcut archive modu

Repo su an:

- archive mode olarak `full-db-snapshot` kullanir
- local backup dir uzerinden manifest tutar
- manifest icine sha256 hash ve retention policy ekler
- restore'da manifest hash dogrulamasini yapar

Bu, hot retention ile archive saklama arasindaki kopugu kapatmak icin yeterli ilk omurgadir.

## Manifest alanlari

Kanonik manifest icinde en az su bilgiler bulunmali:

- schemaVersion
- archiveClass
- archiveMode
- createdAtUtc
- backupFile
- backupSha256
- keepDays
- dumpFormat
- retentionPolicy

## Restore akisi

1. backup dosyasini sec
2. manifest varsa hash'i dogrula
3. `-Force` olmadan restore calistirma
4. restore oncesi staging / inspect ihtiyacini kontrol et
5. restore sonrasinda yeni manifest / log izi al

## Kabul kriterleri

- export manifest olmadan hot delete yapilmaz
- manifest hash ile backup dosyasi teyit edilir
- restore islemi kontrolsuz calismaz
- archive, hot DB'yi sisirmeden inceleme kaniti saklar

## Dokunulmayacak alanlar

- retention policy ile archive policy'yi karistirma
- hot delete ile archive export'u ayirma
- mevcut backup scripts iskeletini bozma

## Bagli dokumanlar

- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)
- [KVKK_RETENTION_ENFORCEMENT_V1](KVKK_RETENTION_ENFORCEMENT_V1.md)
- [KVKK_RETENTION_ANONIMLESTIRME_V1](KVKK_RETENTION_ANONIMLESTIRME_V1.md)
- [REGION_FIELD_ROLLOUT_RUNBOOK_V1](REGION_FIELD_ROLLOUT_RUNBOOK_V1.md)
