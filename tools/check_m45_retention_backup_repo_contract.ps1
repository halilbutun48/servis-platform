param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if (-not (Test-RepoContractContainsAny -Text $txt -Needles @([string]$needle))) { throw "FAIL $label" }; Ok $label }
function WarnContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if (-not (Test-RepoContractContainsAny -Text $txt -Needles @([string]$needle))) { Info "WARN $label"; return }; Ok $label }

Info 'Checking backend retention/backup files'
@(
  'backend\src\ops\retentionBackupPolicy.js',
  'backend\scripts\m45_retention_backup_check.js',
  'tools\backup_create_m45.ps1',
  'tools\backup_restore_m45.ps1',
  'tools\pack_m45_retention_backup.ps1',
  'tools\check_m45_retention_backup_repo_contract.ps1',
  'docs\RUNBOOK_M45_RETENTION_BACKUP.md'
) | ForEach-Object { MustExist $_ }

Info 'Checking admin/env wiring'
MustContain 'backend\src\routes\admin.js' '/retention/policy' 'admin has retention policy route'
MustContain 'backend\src\routes\admin.js' '/backup/policy' 'admin has backup policy route'
MustContain 'backend\src\routes\admin.js' '/backup/manifest' 'admin has backup manifest route'
MustContain 'backend\src\env.js' 'BACKUP_LOCAL_DIR' 'env has BACKUP_LOCAL_DIR'
MustContain 'backend\src\env.js' 'BACKUP_LOCAL_RETENTION_DAYS' 'env has BACKUP_LOCAL_RETENTION_DAYS'
MustContain 'backend\src\env.js' 'BACKUP_DUMP_FORMAT' 'env has BACKUP_DUMP_FORMAT'
MustContain 'backend\src\env.js' 'LOG_RETENTION_ENABLED' 'env has LOG_RETENTION_ENABLED'
MustContain 'backend\src\env.js' 'API_REQUEST_RETENTION_DAYS' 'env has API_REQUEST_RETENTION_DAYS'
MustContain 'backend\src\env.js' 'AUDIT_LOG_RETENTION_DAYS' 'env has AUDIT_LOG_RETENTION_DAYS'
MustContain 'backend\src\env.js' 'NOTIFICATION_RETENTION_DAYS' 'env has NOTIFICATION_RETENTION_DAYS'
MustContain 'backend\src\env.js' 'CHECKIN_EVENT_RETENTION_DAYS' 'env has CHECKIN_EVENT_RETENTION_DAYS'
MustContain 'backend\src\env.js' 'GPS_POINT_RETENTION_DAYS' 'env has GPS_POINT_RETENTION_DAYS'

Info 'Checking compose/.env/gitignore wiring'
MustContain '.env.example' 'BACKUP_LOCAL_DIR=' '.env example has BACKUP_LOCAL_DIR'
MustContain '.env.example' 'BACKUP_LOCAL_RETENTION_DAYS=' '.env example has BACKUP_LOCAL_RETENTION_DAYS'
MustContain '.env.example' 'BACKUP_DUMP_FORMAT=' '.env example has BACKUP_DUMP_FORMAT'
MustContain '.env.example' 'LOG_RETENTION_ENABLED=' '.env example has LOG_RETENTION_ENABLED'
MustContain '.env.example' 'API_REQUEST_RETENTION_DAYS=' '.env example has API_REQUEST_RETENTION_DAYS'
MustContain '.env.example' 'AUDIT_LOG_RETENTION_DAYS=' '.env example has AUDIT_LOG_RETENTION_DAYS'
MustContain '.env.example' 'NOTIFICATION_RETENTION_DAYS=' '.env example has NOTIFICATION_RETENTION_DAYS'
MustContain '.env.example' 'CHECKIN_EVENT_RETENTION_DAYS=' '.env example has CHECKIN_EVENT_RETENTION_DAYS'
MustContain '.env.example' 'GPS_POINT_RETENTION_DAYS=' '.env example has GPS_POINT_RETENTION_DAYS'
MustContain 'infra\docker-compose.yml' 'BACKUP_LOCAL_DIR' 'docker compose passes BACKUP_LOCAL_DIR'
MustContain 'infra\docker-compose.yml' 'BACKUP_LOCAL_RETENTION_DAYS' 'docker compose passes BACKUP_LOCAL_RETENTION_DAYS'
MustContain 'infra\docker-compose.yml' 'BACKUP_DUMP_FORMAT' 'docker compose passes BACKUP_DUMP_FORMAT'
MustContain 'infra\docker-compose.yml' 'LOG_RETENTION_ENABLED' 'docker compose passes LOG_RETENTION_ENABLED'
MustContain 'infra\docker-compose.yml' 'API_REQUEST_RETENTION_DAYS' 'docker compose passes API_REQUEST_RETENTION_DAYS'
MustContain 'infra\docker-compose.yml' 'AUDIT_LOG_RETENTION_DAYS' 'docker compose passes AUDIT_LOG_RETENTION_DAYS'
MustContain 'infra\docker-compose.yml' 'NOTIFICATION_RETENTION_DAYS' 'docker compose passes NOTIFICATION_RETENTION_DAYS'
MustContain 'infra\docker-compose.yml' 'CHECKIN_EVENT_RETENTION_DAYS' 'docker compose passes CHECKIN_EVENT_RETENTION_DAYS'
MustContain 'infra\docker-compose.yml' 'GPS_POINT_RETENTION_DAYS' 'docker compose passes GPS_POINT_RETENTION_DAYS'
MustContain '.gitignore' 'artifacts/*' '.gitignore protects artifacts outputs'
MustExist 'artifacts\.gitkeep'

Info 'Checking SSOT/tool docs'
MustContain 'tools\README.md' 'TOOLS_README_ROUTE_M45_RETENTION_BACKUP_V1' 'tools readme mentions m45 pack'
MustContain 'tools\README.md' 'TOOLS_README_ROUTE_M45_RETENTION_BACKUP_V1' 'tools readme mentions backup create script'
MustContain 'docs\STARTPACK_V1.md' 'STARTPACK_ROUTE_M45_RETENTION_BACKUP_V1' 'startpack mentions m45 pack'
MustContain 'docs\STARTPACK_V1.md' 'STARTPACK_ROUTE_M45_RETENTION_BACKUP_V1' 'startpack mentions m45 runbook'
MustContain 'docs\PRIMER_SSOT.md' 'PRIMER_ROUTE_M45_RETENTION_BACKUP_V1' 'primer ssot mentions m45 tools'
MustContain 'tools\PRIMER_SNAPSHOT.md' 'TOOLS_PRIMER_ROUTE_M45_RETENTION_BACKUP_V1' 'tools primer mentions m45 tools'
MustContain 'docs\CHECKLIST_SSOT.md' 'CHECKLIST_ROUTE_M45_RETENTION_BACKUP_V1' 'docs checklist mentions backup create tool'
MustContain 'tools\CHECKLIST_SSOT.md' 'TOOLS_CHECKLIST_ROUTE_M45_RETENTION_BACKUP_V1' 'tools checklist mentions backup restore tool'
MustExist 'docs\overlays\OVERLAY_NOTES_M45_RETENTION_BACKUP_2026-03-10.md'

Write-Host 'M45 RETENTION + BACKUP REPO CONTRACT PASS'
