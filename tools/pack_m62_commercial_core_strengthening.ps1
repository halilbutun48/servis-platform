param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M62 TICARI OMURGA GUCLENDIRME ==='
Write-StatusLine 'INFO This pack opens M62 with docs, repo-contract, and backend/web skeleton verification.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m62_commercial_core_strengthening_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/m62_commercial_core_strengthening_check.js
  if (-not $?) { throw 'backend m62 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M62 TICARI OMURGA GUCLENDIRME PACK PASS OK ==='
Write-StatusLine 'INFO M62 green olmadan M63 acilmaz.'
