param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ScaffoldOnly
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ''
  Write-StatusLine '=== M57 MOBILE HARDENING (SCAFFOLD/FILES ONLY) ==='
  Write-StatusLine 'INFO This step validates the documented scope and current mobile baseline only.'
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m57_mobile_hardening_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M57 MOBILE HARDENING FILES READY ==='
  return
}

Write-Host ''
Write-StatusLine '=== M57.1 FOREGROUND GPS PUBLISH + IZIN KAPISI ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m57_mobile_hardening_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'mobile')
try {
  node scripts/m57_1_foreground_gps_publish_check.js
  if (-not $?) { throw 'mobile m57.1 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M57.1 FOREGROUND GPS PUBLISH PACK PASS OK ==='
