param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

& (Join-Path $RepoRoot "tools\check_m92_repo_verification_spine_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M92 repo verification spine contract failed." }

Push-Location $RepoRoot
try {
  npm run verify:repo
  if (-not $?) { throw "npm run verify:repo failed during M92 pack." }
} finally {
  Pop-Location
}

Write-Host "M92 repo verification spine PACK PASS"
