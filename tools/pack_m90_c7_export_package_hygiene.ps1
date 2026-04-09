param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
& (Join-Path $RepoRoot "tools\check_m90_c7_export_package_hygiene_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M90C.7 repo contract failed." }

& (Join-Path $RepoRoot "tools\_repo_hygiene_preflight.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M90C.7 repo hygiene preflight failed." }

$backend = Join-Path $RepoRoot "backend"
Push-Location $RepoRoot
try {
  node backend/scripts/repo_audit.js
  if (-not $?) { throw "repo audit rerun failed before M90C.7 check." }
} finally {
  Pop-Location
}

$zipPath = & (Join-Path $RepoRoot "tools\export_shareable_repo_bundle.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "shareable export tool failed during M90C.7 pack." }
if (-not (Test-Path $zipPath)) { throw "shareable export zip not found: $zipPath" }

Push-Location $backend
try {
  npm run m90c7check
  if (-not $?) { throw "M90C.7 export / package hygiene check failed." }
} finally {
  Pop-Location
}

Write-Host ("INFO shareable export zip verified at: " + $zipPath)
Write-Host "M90C.7 export / package hygiene PACK PASS"
