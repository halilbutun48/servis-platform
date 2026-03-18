param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== M65 PILOT LAUNCH GATE ==="
Write-Host "INFO This pack opens M65 with docs, repo-contract, and backend/web skeleton verification."

& (Join-Path $RepoRoot 'tools\check_m65_pilot_launch_gate_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

node (Join-Path $RepoRoot 'backend/scripts/m65_pilot_launch_gate_check.js')
if (-not $?) { throw 'backend m65 check failed' }

Write-Host ""
Write-Host "=== M65 PILOT LAUNCH GATE PACK PASS OK ==="
Write-Host "INFO M65 green olmadan sahaya cikilmaz."
