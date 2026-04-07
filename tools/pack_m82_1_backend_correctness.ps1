param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$ScaffoldOnly
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ""
  Write-StatusLine "=== M82.1 BACKEND CORRECTNESS (SCAFFOLD/FILES ONLY) ==="
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m82_1_backend_correctness_repo_contract.ps1") -RepoRoot $RepoRoot
  if (-not $?) { throw "repo contract check failed" }
  Write-Host ""
  Write-StatusLine "=== M82.1 BACKEND CORRECTNESS FILES READY ==="
  return
}

Write-Host ""
Write-StatusLine "=== M82.1 BACKEND CORRECTNESS ==="
Write-StatusLine "INFO Bu pack M82.1 backend correctness guard ve repo contract omurgasini resmi tools/docs hattina baglar."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m82_1_backend_correctness_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "repo contract check failed" }

node (Join-Path $RepoRoot "backend/scripts/m82_1_correctness_guard_check.js")
if (-not $?) { throw "m82.1 correctness guard failed" }

Write-Host ""
Write-StatusLine "=== M82.1 BACKEND CORRECTNESS PACK PASS OK ==="
Write-StatusLine "INFO M82.1 route snapshot/preview cache/error-contract correctness kilidi resmi pack hattina baglandi."
