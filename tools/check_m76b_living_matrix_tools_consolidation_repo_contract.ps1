param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

Write-Host '=== M76B Repo Contract ==='
$files = @(
  'backend\scripts\m76b_living_matrix_tools_consolidation_check.js',
  'tools\pack_living.ps1',
  'tools\verify_living_static.ps1',
  'tools\verify_living_runtime.ps1',
  'tools\packs\living\pack_phase_m0_m41.ps1',
  'tools\packs\living\pack_phase_m42_m58.ps1',
  'tools\packs\living\pack_phase_m59_m66.ps1',
  'tools\packs\living\pack_phase_m67_m75.ps1',
  'tools\checks\living\check_static_repo.ps1',
  'tools\checks\living\check_m67_m75_static.ps1',
  'tools\checks\living\check_living_matrix.ps1',
  'tools\pack_m76b_living_matrix_tools_consolidation.ps1',
  'tools\check_m76b_living_matrix_tools_consolidation_repo_contract.ps1',
  'docs\RUNBOOK_M76B_LIVING_MATRIX_TOOLS_CONSOLIDATION.md',
  'docs\MILESTONE_M76B_LIVING_MATRIX_TOOLS_CONSOLIDATION.md',
  'tools\README.md',
  'README.md'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }
Write-Host '=== M76B Repo Contract PASS ==='
