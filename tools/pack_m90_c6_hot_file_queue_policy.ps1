param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
& (Join-Path $RepoRoot "tools\check_m90_c6_hot_file_queue_policy_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M90C.6 repo contract failed." }

$backend = Join-Path $RepoRoot "backend"
Push-Location $RepoRoot
try {
  node backend/scripts/repo_audit.js
  if (-not $?) { throw "repo audit rerun failed before M90C.6 check." }
} finally {
  Pop-Location
}

Push-Location $backend
try {
  npm run m90c6check
  if (-not $?) { throw "M90C.6 hot-file queue policy check failed." }
} finally {
  Pop-Location
}

Write-Host "M90C.6 hot-file queue policy PACK PASS"
