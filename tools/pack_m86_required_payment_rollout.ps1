param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M86 REQUIRED PAYMENT ROLLOUT PACK ==="
Write-StatusLine "INFO Bu pack REQUIRED moddaki ticari kaynaklarin ACTIVE/DISABLED akisi ile rollout kapsaminda yonetilmesini dogrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m86_required_payment_rollout_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M86 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m86_required_payment_rollout_check.js
  if (-not $?) { throw "M86 required payment rollout check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M86 REQUIRED PAYMENT ROLLOUT PACK PASS OK ==="
Write-StatusLine "INFO REQUIRED moddaki ticari kaynaklar rollout listesinde ACTIVE/DISABLED akisi ile gorunur; settlement plani ACTIVE oldugunda entry satirlari READY izlenir."
