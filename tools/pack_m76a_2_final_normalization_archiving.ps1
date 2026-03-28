param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeDir = 'infra',
  [switch]$NoBuild
)
$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== M76A-2 FINAL NORMALIZATION + ARCHIVING PACK ==='
& (Join-Path $PSScriptRoot 'check_m76a_2_final_normalization_archiving_repo_contract.ps1') -RepoRoot $RepoRoot
Push-Location (Join-Path $RepoRoot 'backend')
try {
  node .\scripts\m76a_2_final_normalization_archiving_check.js
  if (-not $?) { throw 'm76a_2_final_normalization_archiving_check failed' }
}
finally {
  Pop-Location
}
Write-Host ''
Write-Host '=== M76A-2 FINAL NORMALIZATION + ARCHIVING PACK PASS OK ==='
