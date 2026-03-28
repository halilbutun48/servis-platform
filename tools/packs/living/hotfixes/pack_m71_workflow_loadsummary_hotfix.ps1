param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\..\..\_console_status.ps1')

$resolvedRepo = (Resolve-Path $RepoRoot).Path
Write-Host ''
Write-StatusLine '=== M71 WORKFLOW LOADSUMMARY HOTFIX PACK ==='
& (Join-Path $PSScriptRoot '..\..\..\checks\living\hotfixes\check_m71_workflow_loadsummary_hotfix_repo_contract.ps1') -RepoRoot $resolvedRepo
Write-Host ''
Write-StatusLine '=== M71 WORKFLOW LOADSUMMARY HOTFIX PACK PASS OK ==='
