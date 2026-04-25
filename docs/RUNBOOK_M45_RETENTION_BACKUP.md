# M45 Retention + Backup Runbook

Bu runbook, 2 yıllık saklama ihtiyacını hot Postgres ile archive snapshot arasında bölmek için kullanılır.

## 1) Politika özeti

Hot storage:
- `ApiRequest` -> 730 gün
- `AuditLog` -> 730 gün
- `Notification` -> 180 gün
- `CheckinEvent` -> 180 gün
- `GpsPoint` -> 30 gün

Archive storage:
- `Consent` -> proof / archive snapshot içinde saklanır
- `Notification`, `CheckinEvent`, `GpsPoint` -> hot pencereden sonra archive snapshot ile korunur
- archive snapshot için local dump klasörü kullanılır

Kısa ömürlü state:
- `RefreshSession`
- `Invite`
- `ParentInvite`

Bu kayıtlar retention arşivi değildir; expiry/revoke yaşam döngüsüyle yönetilir.

## 2) Günlük akış

1. Retention policy kontrolü:
   - `GET /api/admin/retention/policy`
2. Archive policy kontrolü:
   - `GET /api/admin/backup/policy`
3. Archive snapshot oluştur:
   - `npm --prefix backend run m45:backup:create`
   - veya `pwsh -ExecutionPolicy Bypass -File .\tools\backup_create_m45.ps1 -RepoRoot D:\servis-platform`
4. Manifest doğrula:
   - `GET /api/admin/backup/manifest`
   - `GET /api/admin/regions/next-phase`
5. Gerekirse hot cleanup dry-run:
   - `POST /api/admin/retention/run` body `{ "dryRun": true }`

## 3) Snapshot üretim ve doğrulama

`tools\backup_create_m45.ps1`:
- `pg_dump` ile full-db snapshot üretir
- manifest içine:
  - dosya adı
  - boyut
  - sha256
  - archive class
  - hot/archive retention snapshot
  - keepDays
  yazar

Bu manifest artık sadece “dosya var mı” kontrolü değil, aynı zamanda bütünlük kanıtıdır.

## 4) Geri yükleme

`tools\backup_restore_m45.ps1`:
- varsayılan olarak restore yapmaz
- `-Force` olmadan çalışmaz
- manifest varsa sha256 hash doğrulaması yapar
- hash uyuşmuyorsa restore etmez

Repo düzeyi restore girişi:
- `npm --prefix backend run m45:backup:restore -- --backup-file <sql> --manifest-file <manifest> --force`

Not:
- `backend/scripts/m45_backup_restore.js` verify/automation akışında `--backup-file` verilmemişse güvenli biçimde `SKIP` eder.
- Gerçek restore için yine `--backup-file` ve `--force` zorunludur; bu davranış PowerShell wrapper ve runbook ile uyumludur.

Örnek:
```powershell
pwsh -ExecutionPolicy Bypass -File .\tools\backup_restore_m45.ps1 `
  -RepoRoot D:\servis-platform `
  -BackupFile D:\servis-platform\artifacts\backups\servisdb_backup_20260423-120000.sql `
  -Force
```

Manifest ile doğrulama:
```powershell
pwsh -ExecutionPolicy Bypass -File .\tools\backup_restore_m45.ps1 `
  -RepoRoot D:\servis-platform `
  -BackupFile D:\servis-platform\artifacts\backups\servisdb_backup_20260423-120000.sql `
  -ManifestFile D:\servis-platform\artifacts\backups\servisdb_backup_20260423-120000_manifest.json `
  -Force
```

## 5) Operasyon notları

- Hot cleanup ile archive snapshot ayrı düşünülür.
- `GpsPoint` için 2 yıl hot saklama yoktur; hot pencere kısa tutulur.
- `AuditLog` ve `ApiRequest` uzun süre hot kalabilir; bunlar performans açısından en güvenli compliance yüzeyidir.
- `Consent` ve check-in kayıtları delil sınıfıdır; export ve hash/manifest olmadan silme yapılmamalıdır.

## 6) Ne zaman alarm?

- Backup manifest oluşmuyor.
- Sha256 doğrulaması geçmiyor.
- Retention run dry-run hesabı politika ile çelişiyor.
- `GpsPoint` / `Notification` hot window düşürülmüş ama archive snapshot alınmamış.
- `GET /api/admin/regions/next-phase` üzerinde archive/restore READY görünmüyor.

## 7) Sonraki kontrol

- `npm --prefix backend run m45check`
- `npm run verify:repo`
- `npm run verify:final`
