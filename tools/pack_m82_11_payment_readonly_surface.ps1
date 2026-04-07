param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M82.11 PAYMENT READONLY SURFACE ==="
Write-StatusLine "INFO Bu pack agreement ve vardiya serisi ekranlarinda dormant payment snapshot gorunurlugunu dogrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m82_11_payment_readonly_surface_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M82.11 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m82_11_payment_readonly_surface_check.js
  if (-not $?) { throw "M82.11 payment readonly surface check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M82.11 PAYMENT READONLY SURFACE PACK PASS OK ==="
Write-StatusLine "INFO Dormant payment backbone artik agreement ve vardiya/vardiya serisi yuzeylerinde readonly olarak gorunur."
