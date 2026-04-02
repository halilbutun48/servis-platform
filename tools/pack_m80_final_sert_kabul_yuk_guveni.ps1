param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== M80 FINAL SERT KABUL VE YUK GUVENI PACK ==='
Write-Host ''
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }
node (Join-Path $RepoRoot 'backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host '=== M80 FINAL SERT KABUL VE YUK GUVENI PACK PASS ==='
Write-Host 'INFO M80 kapisi acildi; resmi final green icin ek yuk/saha signoff gereklidir.'
