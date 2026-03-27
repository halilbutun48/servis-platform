param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$SkipRuntimeStorm
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$repoContract = Join-Path $resolvedRepo 'tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1'
$backendDir = Join-Path $resolvedRepo 'backend'
$scaleScript = Join-Path $backendDir 'scripts/scale_readiness_check.js'
$stormScript = Join-Path $backendDir 'scripts/company_fetch_storm_check.js'

if (-not (Test-Path $repoContract)) { throw 'Missing repo contract script: tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1' }
if (-not (Test-Path $scaleScript)) { throw 'Missing backend script: backend/scripts/scale_readiness_check.js' }
if (-not (Test-Path $stormScript)) { throw 'Missing backend script: backend/scripts/company_fetch_storm_check.js' }
if (-not (Test-Path $backendDir)) { throw 'Missing backend directory' }

Write-Host ''
Write-StatusLine '=== M67 KURUMSAL OLCEK HAZIRLIK PAKETI ==='
Write-StatusLine 'INFO Bu pack once statik fetch mimarisini tarar, sonra istenirse runtime storm senaryosu kosar.'

& $repoContract -RepoRoot $resolvedRepo
if (-not $?) { throw 'repo contract check failed' }

Push-Location $backendDir
try {
  Write-Host ''
  Write-StatusLine '=== M67 SCALE READINESS CHECK ==='
  node .\scripts\scale_readiness_check.js
  if (-not $?) { throw 'scale readiness check failed' }

  if (-not $SkipRuntimeStorm) {
    Write-Host ''
    Write-StatusLine '=== M67 COMPANY FETCH STORM CHECK ==='
    node .\scripts\company_fetch_storm_check.js
    if (-not $?) { throw 'company fetch storm check failed' }
  }
  else {
    Write-Host ''
    Write-StatusLine 'INFO Runtime storm check atlandi (SkipRuntimeStorm).' 
  }
}
finally {
  Pop-Location
}

Write-Host ''
Write-StatusLine '=== M67 KURUMSAL OLCEK HAZIRLIK PAKETI PACK PASS OK ==='
Write-StatusLine 'INFO Bu adim duzeltme degil; hotspotlari gorunur hale getirir ve sonraki sertlestirme overlayi icin baz olusturur.'
