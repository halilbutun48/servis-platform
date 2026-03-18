param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M59 GOZLEMLEME + SAHA TESHis ==='
Write-StatusLine 'INFO This pack opens M59 with docs, repo-contract, and backend/mobile/web skeleton verification.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m59_observability_field_diagnostics_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/m59_observability_field_diagnostics_check.js
  if (-not $?) { throw 'backend m59 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M59 GOZLEMLEME + SAHA TESHis PACK PASS OK ==='
Write-StatusLine 'INFO M59 green olmadan M60 acilmaz.'
