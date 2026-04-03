param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$ScaffoldOnly
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ""
  Write-StatusLine "=== M81 MOBILE SAHA SERTLESTIRME (SCAFFOLD/FILES ONLY) ==="
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m81_mobile_saha_sertlestirme_repo_contract.ps1") -RepoRoot $RepoRoot
  if (-not $?) { throw "repo contract check failed" }
  Write-Host ""
  Write-StatusLine "=== M81 MOBILE SAHA SERTLESTIRME FILES READY ==="
  return
}

Write-Host ""
Write-StatusLine "=== M81 MOBILE SAHA SERTLESTIRME ==="
Write-StatusLine "INFO Bu pack mevcut mobil M81 parcalaari resmi tools/docs hattina baglar."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m81_mobile_saha_sertlestirme_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "repo contract check failed" }

Push-Location (Join-Path $RepoRoot "mobile")
try {
  node scripts/m81_2_background_runtime_check.js
  if (-not $?) { throw "mobile m81.2 check failed" }
  node scripts/m81_2b_bundle_chain_check.js
  if (-not $?) { throw "mobile m81.2b check failed" }
  node scripts/m81_2c_appjs_syntax_fix_check.js
  if (-not $?) { throw "mobile m81.2c check failed" }
  node scripts/m81_3_ios_readiness_check.js
  if (-not $?) { throw "mobile m81.3 check failed" }
  node scripts/m81_4_release_env_discipline_check.js
  if (-not $?) { throw "mobile m81.4 check failed" }
}
finally {
  Pop-Location
}

Write-Host ""
Write-StatusLine "=== M81 MOBILE SAHA SERTLESTIRME PACK PASS OK ==="
Write-StatusLine "INFO M81 mobil config, runtime, iOS ve release/env disiplini resmi pack hattina baglandi."
