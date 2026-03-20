param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== M66 OPERATION REASSIGNMENT ==="
Write-Host "INFO This pack verifies M66 repo contract and feature skeleton."

& (Join-Path $RepoRoot 'tools\check_m66_operation_reassignment_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

node (Join-Path $RepoRoot 'backend/scripts/m66check.js')
if (-not $?) { throw 'backend m66 check failed' }

Write-Host ""
Write-Host "=== M66 OPERATION REASSIGNMENT PACK PASS OK ==="
Write-Host "INFO M66 verification/smoke can run after broader repo cleanup if desired."
