param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M82.9 DORMANT PAYMENT BACKBONE ==="
Write-StatusLine "INFO Bu pack dormant payment/commission omurgasini, ticari kaynak snapshot kablolarini ve super admin readonly ozetini birlikte dogrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m82_9_dormant_payment_backbone_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M82.9 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m82_9_dormant_payment_backbone_check.js
  if (-not $?) { throw "M82.9 dormant payment backbone check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M82.9 DORMANT PAYMENT BACKBONE PACK PASS OK ==="
Write-StatusLine "INFO Agreement ve shift-series ticari kaynaklari icin dormant snapshot + settlement hazirlik omurgasi repo icinde gorunur durumda."
