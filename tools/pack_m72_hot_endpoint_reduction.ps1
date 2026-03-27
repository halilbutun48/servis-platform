param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$repoContract = Join-Path $resolvedRepo 'tools/check_m72_hot_endpoint_reduction_repo_contract.ps1'
$backendDir = Join-Path $resolvedRepo 'backend'
$checkScript = Join-Path $backendDir 'scripts/m72_hot_endpoint_reduction_check.js'

if (-not (Test-Path $repoContract)) { throw 'Missing repo contract script: tools/check_m72_hot_endpoint_reduction_repo_contract.ps1' }
if (-not (Test-Path $checkScript)) { throw 'Missing backend script: backend/scripts/m72_hot_endpoint_reduction_check.js' }

& $repoContract -RepoRoot $resolvedRepo
if (-not $?) { throw 'repo contract check failed' }

Push-Location $backendDir
try {
  Write-Host ''
  Write-StatusLine '=== M72 HOT ENDPOINT REDUCTION CHECK ==='
  node .\scripts\m72_hot_endpoint_reduction_check.js
  if (-not $?) { throw 'm72 check failed' }
}
finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M72 HOT ENDPOINT REDUCTION PACK PASS OK ==='
