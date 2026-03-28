param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
)
$ErrorActionPreference = 'Stop'
Write-Host '=== M72 GEOREVIEW TOKEN HOTFIX PACK ==='
& (Join-Path $PSScriptRoot '..\..\..\checks\living\hotfixes\check_m72_georeview_token_hotfix_repo_contract.ps1') -RepoRoot $RepoRoot
Write-Host '=== M72 GEOREVIEW TOKEN HOTFIX PACK PASS OK ==='
