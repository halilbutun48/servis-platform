param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

$backend = Join-Path $RepoRoot "backend"
Push-Location $backend
try {
  npm run m89check
  if (-not $?) { throw "M89 repo contract failed." }
} finally {
  Pop-Location
}
