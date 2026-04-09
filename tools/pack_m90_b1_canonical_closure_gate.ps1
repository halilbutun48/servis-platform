param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
& (Join-Path $RepoRoot "tools\check_m90_b1_canonical_closure_gate_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M90B.1 repo contract failed." }

$backend = Join-Path $RepoRoot "backend"
Push-Location $backend
try {
  npm run m90b1check
  if (-not $?) { throw "M90B.1 canonical closure gate check failed." }
} finally {
  Pop-Location
}

Write-Host "M90B.1 canonical closure gate PACK PASS"
