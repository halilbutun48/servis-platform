param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== M64 DOGAL COPILOT KATMANI ==="
Write-Host "INFO This pack opens M64 with docs, repo-contract, and backend/web skeleton verification."

& (Join-Path $RepoRoot 'tools\check_m64_natural_copilot_layer_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

node (Join-Path $RepoRoot 'backend/scripts/m64_natural_copilot_layer_check.js')
if (-not $?) { throw 'backend m64 check failed' }

Write-Host ""
Write-Host "=== M64 DOGAL COPILOT KATMANI PACK PASS OK ==="
Write-Host "INFO M64 green olmadan M65 acilmaz."
