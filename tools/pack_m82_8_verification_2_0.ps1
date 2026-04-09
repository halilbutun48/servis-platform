param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot '_repo_hygiene_preflight.ps1')
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M82.8 VERIFICATION 2.0 ==="
Write-StatusLine "INFO Bu pack mobil acceptance zincirini ve company vardiyalar runtime guard'ini tekrar edilebilir tek hat halinde toplar."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m82_8_verification_2_0_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M82.8 repo contract failed." }

Push-Location (Join-Path $RepoRoot "mobile")
try {
  node .\scripts\m82_8_verification_2_0_check.js
  if (-not $?) { throw "M82.8 mobile verification check failed." }
  npm run acceptance:mobile
  if (-not $?) { throw "M82.8 mobile acceptance chain failed." }
}
finally {
  Pop-Location
}

node (Join-Path $RepoRoot "web/scripts/m82_8_company_shifts_runtime_guard_check.cjs")
if (-not $?) { throw "M82.8 company shifts runtime guard failed." }

Write-StatusLine "=== M82.8 VERIFICATION 2.0 PACK PASS OK ==="
Write-StatusLine "INFO M82.4->M82.8 mobil acceptance zinciri ve company vardiyalar runtime guard'i tek resmi verification hattinda toplandi."

