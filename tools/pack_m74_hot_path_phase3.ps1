param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$repoContract = Join-Path $resolvedRepo 'tools/check_m74_hot_path_phase3_repo_contract.ps1'
$backendDir = Join-Path $resolvedRepo 'backend'
$checkScript = Join-Path $backendDir 'scripts/m74_hot_path_phase3_check.js'

if (-not (Test-Path $repoContract)) { throw 'Missing repo contract script: tools/check_m74_hot_path_phase3_repo_contract.ps1' }
if (-not (Test-Path $checkScript)) { throw 'Missing backend script: backend/scripts/m74_hot_path_phase3_check.js' }

& $repoContract -RepoRoot $resolvedRepo
if (-not $?) { throw 'repo contract check failed' }

Push-Location $backendDir
try {
  Write-Host ''
  Write-StatusLine '=== M74 HOT PATH PHASE 3 CHECK ==='
  node .\scripts\m74_hot_path_phase3_check.js
  if (-not $?) { throw 'm74 check failed' }

  Write-Host ''
  Write-StatusLine '=== SCALE READINESS CHECK ==='
  node .\scripts\scale_readiness_check.js
  if (-not $?) { throw 'scale readiness check failed' }
}
finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M74 HOT PATH PHASE 3 PACK PASS OK ==='
