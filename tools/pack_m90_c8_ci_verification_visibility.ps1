param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = 'Stop'

powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\check_m90_c8_ci_verification_visibility_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'M90C.8 repo contract failed.' }

Push-Location $RepoRoot
try {
  npm run verify:ci
  if (-not $?) { throw 'npm run verify:ci failed during M90C.8 pack.' }

  node (Join-Path $RepoRoot 'backend\scripts\m90_c8_ci_verification_visibility_check.js')
  if (-not $?) { throw 'M90C.8 CI / verification visibility check failed.' }
} finally {
  Pop-Location
}

Write-Host 'M90C.8 CI / verification visibility PACK PASS'
