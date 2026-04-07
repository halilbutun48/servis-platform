param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
Write-Host "=== M88 SETTLEMENT OPERATIONS CONSOLE PACK ==="
& (Join-Path $RepoRoot "tools\check_m88_settlement_operations_console_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M88 repo contract failed." }
Push-Location (Join-Path $RepoRoot "backend")
try {
  node scripts/m88_settlement_operations_console_check.js
  if (-not $?) { throw "M88 settlement operations console check failed." }
} finally {
  Pop-Location
}
Write-Host "=== M88 SETTLEMENT OPERATIONS CONSOLE PACK PASS OK ==="
