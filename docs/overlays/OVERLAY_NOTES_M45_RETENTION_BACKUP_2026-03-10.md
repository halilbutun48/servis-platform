# OVERLAY_NOTES_M45_RETENTION_BACKUP_2026-03-10

Amçı:
- mevcut retention altyapısını resmi M45 araçlarına bağlamak
- backup/restore incanonik ops script’lri eklemek
- admin tarafında retention/backup görünürlüğü sağlamak

Eklenenler:
- `backend/scripts/m45_retention_backup_check.js`
- `backend/src/ops/retentionBackupPolicy.js`
- `tools/pack_m45_retention_backup.ps1`
- `tools/check_m45_retention_backup_repo_contract.ps1`
- `tools/backup_create_m45.ps1`
- `tools/backup_restore_m45.ps1`
- `docs/RUNBOOK_M45_RETENTION_BACKUP.md`

Güncellenenler:
- `backend/src/routes/admin.js`
- `backend/src/env.js`
- `.env.example`
- `infra/docker-compose.yml`
- `tools/README.md`
- SSOT primer/checklist/startpack dosyaları

Not:
- Bu overlay M45 inçin araç ve operasyon hattını kurar.
- Uygulama sonrası resmi green kabulü için `tools/pack_m45_retention_backup.ps1` çilıştırılmalıdır.
