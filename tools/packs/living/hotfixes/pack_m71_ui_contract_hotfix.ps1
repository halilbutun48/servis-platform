param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
)
$ErrorActionPreference = 'Stop'

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$backendDir = Join-Path $resolvedRepo 'backend'
$repoContract = Join-Path $resolvedRepo 'tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1'
$hotfixCheck = Join-Path $backendDir 'scripts/m71_ui_contract_hotfix_check.js'

if (-not (Test-Path $repoContract)) { throw 'Missing tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1' }
if (-not (Test-Path $hotfixCheck)) { throw 'Missing backend/scripts/m71_ui_contract_hotfix_check.js' }

Write-Host ''
Write-Host '=== M71 UI + CONTRACT HOTFIX PACK ==='
Push-Location $backendDir
try {
  node .\scripts\m71_ui_contract_hotfix_check.js
  if (-not $?) { throw 'm71 ui contract hotfix check failed' }
}
finally {
  Pop-Location
}
Write-Host ''
Write-Host '=== M71 UI + CONTRACT HOTFIX PACK PASS OK ==='
