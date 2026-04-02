param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== M80.1 HOT PANEL DARALTMA PACK ==='
Write-Host ''
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m80_1_hot_panel_daraltma_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }
node (Join-Path $RepoRoot 'backend/scripts/m80_1_hot_panel_daraltma_check.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host '=== M80.1 HOT PANEL DARALTMA PACK PASS ==='
Write-Host 'INFO GeoReview / Map / Shifts sicak noktalarinda kontrollu daraltma uygulandi.'
