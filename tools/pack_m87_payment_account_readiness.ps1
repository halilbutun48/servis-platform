param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Write-Host "=== M87 PAYMENT ACCOUNT READINESS PACK ==="
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check_m87_payment_account_readiness_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M87 repo contract failed." }
Push-Location (Join-Path $RepoRoot "backend")
node scripts/m87_payment_account_readiness_check.js
if (-not $?) { throw "M87 payment account readiness check failed." }
Pop-Location
Write-Host "=== M87 PAYMENT ACCOUNT READINESS PACK PASS OK ==="
