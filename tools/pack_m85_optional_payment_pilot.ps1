param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M85 OPTIONAL PAYMENT PILOT PACK ==="
Write-StatusLine "INFO Bu pack OPTIONAL moddaki ticari kaynaklarin pilot secim listesine alinmasini ve READY/DORMANT gecisini dogrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m85_optional_payment_pilot_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M85 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m85_optional_payment_pilot_check.js
  if (-not $?) { throw "M85 optional payment pilot check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M85 OPTIONAL PAYMENT PILOT PACK PASS OK ==="
Write-StatusLine "INFO OPTIONAL moddaki ticari kaynaklar pilot listesinde READY/DORMANT akisi ile gorunur; gercek charge/payout hala dormant kalir."
