param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputDir = "",
  [int]$KeepDays = 0
)

$ErrorActionPreference = "Stop"
$args = @("backend/scripts/database_backup_retention_and_integrity_01.mjs", "create")
if ($OutputDir) { $args += "--output-dir=$OutputDir" }
if ($KeepDays -gt 0) { $args += "--retention-class=operational" }
Push-Location $RepoRoot
try {
  & node @args
  if ($LASTEXITCODE -ne 0) { throw "Canonical #12 backup owner failed with exitCode=$LASTEXITCODE" }
} finally {
  Pop-Location
}
