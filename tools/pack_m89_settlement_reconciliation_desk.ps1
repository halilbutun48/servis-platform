param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
& (Join-Path $RepoRoot "tools\check_m89_settlement_reconciliation_desk_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M89 repo contract failed." }
Write-Host "M89 settlement mutabakat masasi PACK PASS"
