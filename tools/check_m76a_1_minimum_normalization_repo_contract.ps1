param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

Write-Host '=== M76A-1 Repo Contract ==='
$files = @(
  'backend\scripts\m76a_1_minimum_normalization_check.js',
  'tools\pack.ps1',
  'tools\_packs\pack_m67_m75.ps1',
  'tools\_packs\pack_m76_m81.ps1',
  'tools\pack_m76a_1_minimum_normalization.ps1',
  'tools\check_m76a_1_minimum_normalization_repo_contract.ps1',
  'tools\milestone_pack_manifest.json',
  'tools\PRIMER_SNAPSHOT.md',
  'tools\README.md',
  'docs\LIVING_BASELINE_M75.md',
  'docs\RUNBOOK_M76A_1_MINIMUM_NORMALIZATION.md',
  'docs\MILESTONE_M76A_1_MINIMUM_NORMALIZATION.md',
  'docs\STARTPACK_V1.md',
  'docs\NEXT_BACKLOG_V1.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'README.md',
  'tools\pack_m71_workflow_loadsummary_hotfix.ps1',
  'tools\check_m71_workflow_loadsummary_hotfix_repo_contract.ps1'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }
Write-Host '=== M76A-1 Repo Contract PASS ==='
