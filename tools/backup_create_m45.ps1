param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputDir = "",
  [int]$KeepDays = 0
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")

function Read-DotEnvValue {
  param([string]$EnvFile, [string]$Key)
  if (!(Test-Path -LiteralPath $EnvFile)) { return $null }
  foreach ($line in Get-Content -LiteralPath $EnvFile -Encoding UTF8) {
    $t = [string]$line
    if ([string]::IsNullOrWhiteSpace($t)) { continue }
    if ($t.TrimStart().StartsWith('#')) { continue }
    $prefix = "$Key="
    if ($t.StartsWith($prefix)) {
      return $t.Substring($prefix.Length).Trim().Trim('"')
    }
  }
  return $null
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $RepoRoot "artifacts\backups"
}
if ($KeepDays -le 0) {
  $rawKeep = Read-DotEnvValue -EnvFile (Join-Path $RepoRoot ".env") -Key "BACKUP_LOCAL_RETENTION_DAYS"
  $parsedKeep = 0
  if ([int]::TryParse([string]$rawKeep, [ref]$parsedKeep)) {
    $KeepDays = $parsedKeep
  } else {
    $KeepDays = 14
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sqlPath = Join-Path $OutputDir ("servisdb_backup_{0}.sql" -f $stamp)
$manifestPath = Join-Path $OutputDir ("servisdb_backup_{0}_manifest.json" -f $stamp)
$stderrPath = Join-Path $OutputDir ("servisdb_backup_{0}_stderr.txt" -f $stamp)

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @(
  "compose", "-f", $compose, "exec", "-T", "db",
  "sh", "-lc", 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges'
)

Write-Host ""
Write-StatusLine "=== M45 BACKUP CREATE ==="
& $dc @dcArgs 1> $sqlPath 2> $stderrPath
if ($LASTEXITCODE -ne 0) {
  if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath -Force -ErrorAction SilentlyContinue }
  $err = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw -Encoding UTF8 } else { '' }
  throw "pg_dump failed. $err"
}
if ((Test-Path -LiteralPath $stderrPath) -and ((Get-Item -LiteralPath $stderrPath).Length -eq 0)) {
  Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
}

$meta = [ordered]@{
  schemaVersion = 'm45-backup-manifest-v1'
  createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
  repoRoot = $RepoRoot
  backupFile = $sqlPath
  sizeBytes = (Get-Item -LiteralPath $sqlPath).Length
  keepDays = $KeepDays
  dumpFormat = 'plain-sql'
  notes = @(
    'Created from docker compose db service with pg_dump',
    'Flags: --clean --if-exists --no-owner --no-privileges'
  )
}
$meta | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if ($KeepDays -gt 0) {
  $cutoff = (Get-Date).AddDays(-1 * $KeepDays)
  Get-ChildItem -LiteralPath $OutputDir -File | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "OK Backup file: $sqlPath"
Write-Host "OK Manifest: $manifestPath"
