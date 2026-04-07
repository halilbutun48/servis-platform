param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M82.10 SUPER ADMIN COMMERCIAL SETTINGS ==="
Write-StatusLine "INFO Bu pack global payment mode, global komisyon ve oda bazlı override yüzeyini birlikte doğrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m82_10_super_admin_commercial_settings_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M82.10 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m82_10_super_admin_commercial_settings_check.js
  if (-not $?) { throw "M82.10 super admin commercial settings check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M82.10 SUPER ADMIN COMMERCIAL SETTINGS PACK PASS OK ==="
Write-StatusLine "INFO Super Admin artik dormant payment backbone icin global ayar ve oda bazli override yonetebilir."
