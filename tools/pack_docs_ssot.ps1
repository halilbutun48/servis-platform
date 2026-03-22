param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== DOCS / SSOT PACK ==='
Write-StatusLine 'INFO Runbook + checklist + registry + master pack manifest tek cati altinda dogrulaniyor.'

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_docs_ssot_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'docs ssot repo contract check failed' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  node scripts/docs_ssot_pack_check.js
  if (-not $?) { throw 'docs ssot runtime check failed' }
} finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== DOCS / SSOT PACK PASS OK ==='
