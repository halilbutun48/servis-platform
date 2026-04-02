param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== M80.2 AGREEMENTS + SHIFTS GIRIS YUKU PACK ==='
Write-Host ''
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }
node (Join-Path $RepoRoot 'backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host '=== M80.2 AGREEMENTS + SHIFTS GIRIS YUKU PACK PASS ==='
Write-Host 'INFO Agreements giris yukunde esik alti, Shifts ozet/intent yukunde kontrollu daraltma uygulandi.'
