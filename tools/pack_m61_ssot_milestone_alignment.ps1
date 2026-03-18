param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M61 SSOT + MILESTONE HIZASI ==='
Write-StatusLine 'INFO This pack opens M61 with docs, repo-contract, and backend/web skeleton verification.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m61_ssot_milestone_alignment_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/m61_ssot_milestone_alignment_check.js
  if (-not $?) { throw 'backend m61 check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M61 SSOT + MILESTONE HIZASI PACK PASS OK ==='
Write-StatusLine 'INFO M61 green olmadan M62 acilmaz.'
