param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [string]$ManifestFile = "",
  [string]$TargetDatabaseUrl = "",
  [string]$TargetContainer = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
if (-not $Force) { throw "Restore requires an explicitly isolated target and -Force." }
if (-not $TargetDatabaseUrl) { throw "TargetDatabaseUrl is required; canonical DB overwrite is blocked." }
$args = @("backend/scripts/database_backup_retention_and_integrity_01.mjs", "restore", "--backup-file=$BackupFile", "--target-database-url=$TargetDatabaseUrl", "--isolated")
if ($ManifestFile) { $args += "--manifest-file=$ManifestFile" }
if ($TargetContainer) { $args += "--target-container=$TargetContainer" }
Push-Location $RepoRoot
try {
  & node @args
  if ($LASTEXITCODE -ne 0) { throw "Canonical #12 restore owner failed with exitCode=$LASTEXITCODE" }
} finally {
  Pop-Location
}
