param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M58 FINAL PILOT READINESS ==='
Write-StatusLine 'INFO This pack validates repo readiness for final pilot and leaves official green to field acceptance.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m58_final_pilot_readiness_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/m58_final_pilot_readiness_check.js
  if (-not $?) { throw 'backend m58 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M58 FINAL PILOT READINESS PACK PASS OK ==='
Write-StatusLine 'INFO Official M58 green still requires manual pilot acceptance / field signoff.'
