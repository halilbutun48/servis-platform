param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M60 SAHA ACCEPTANCE MERKEZI ==='
Write-StatusLine 'INFO This pack opens M60 with docs, repo-contract, and backend/mobile/web skeleton verification.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m60_field_acceptance_center_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/m60_field_acceptance_center_check.js
  if (-not $?) { throw 'backend m60 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M60 SAHA ACCEPTANCE MERKEZI PACK PASS OK ==='
Write-StatusLine 'INFO M60 green olmadan M61 acilmaz.'
