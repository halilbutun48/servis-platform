param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M63 GUVEN + KALITE + HIZMET DEGERLENDIRME ==='
Write-StatusLine 'INFO This pack opens M63 with docs, repo-contract, and backend/web skeleton verification.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m63_trust_quality_service_evaluation_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/m63_trust_quality_service_evaluation_check.js
  if (-not $?) { throw 'backend m63 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M63 GUVEN + KALITE + HIZMET DEGERLENDIRME PACK PASS OK ==='
Write-StatusLine 'INFO M63 green olmadan M64 acilmaz.'
