param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== M80.3 GEOREVIEW + SHIFTS SON GIRIS YUKU PACK ==='
Write-Host ''
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }
node (Join-Path $RepoRoot 'backend/scripts/m80_3_georeview_shifts_son_giris_yuku_check.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host '=== M80.3 GEOREVIEW + SHIFTS SON GIRIS YUKU PACK PASS ==='
Write-Host 'INFO GeoReview cagri yogunlugu ve Shifts effect/giris yukunde son kontrollu daraltma uygulandi.'
