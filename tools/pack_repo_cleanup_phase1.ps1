param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== REPO CLEANUP PHASE 1 PACK ==="

Push-Location $RepoRoot
try {
  node backend/scripts/repo_deep_audit.js
  & (Join-Path $PSScriptRoot 'check_repo_cleanup_phase1_repo_contract.ps1') -RepoRoot $RepoRoot
  Write-Host ""
  Write-Host "=== REPO CLEANUP PHASE 1 PACK PASS OK ==="
} finally {
  Pop-Location
}
