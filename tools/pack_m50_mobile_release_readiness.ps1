param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'

Write-Host '=== M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK ==='
& (Join-Path $PSScriptRoot 'pack_m49_1_driver_voice_guidance_stop_eta.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'm49.1 pack failed' }

Write-Host ''
Write-Host '=== M50 Runtime Check ==='
Push-Location (Join-Path $RepoRoot 'mobile')
try {
  node scripts/m50_mobile_release_readiness_check.js
  if (-not $?) { throw 'm50 runtime check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host '=== M50 Repo Contract ==='
& (Join-Path $PSScriptRoot 'check_m50_mobile_release_readiness_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-Host '=== M50 MOBILE RELEASE READINESS PACK PASS OK ==='
