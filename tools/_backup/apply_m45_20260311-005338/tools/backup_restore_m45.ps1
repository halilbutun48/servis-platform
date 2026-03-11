param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")

if (-not $Force) {
  throw "Restore destructive operation. Re-run with -Force."
}

if (!(Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @(
  "compose", "-f", $compose, "exec", "-T", "db",
  "sh", "-lc", 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
)

Write-Host ""
Write-StatusLine "=== M45 BACKUP RESTORE ==="
$sql = Get-Content -LiteralPath $BackupFile -Raw -Encoding UTF8
$sql | & $dc @dcArgs
if ($LASTEXITCODE -ne 0) {
  throw "psql restore failed"
}

Write-Host "OK Restore completed from: $BackupFile"
