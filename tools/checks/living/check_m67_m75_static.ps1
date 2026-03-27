param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path)
$ErrorActionPreference = 'Stop'
$checks = @(
  'check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1',
  'check_m68_fetch_hardening_repo_contract.ps1',
  'check_m69_fetch_hardening_phase2_repo_contract.ps1',
  'check_m70_checker_sync_hot_path_repo_contract.ps1',
  'check_m71_summary_hotpath_repo_contract.ps1',
  'check_m72_hot_endpoint_reduction_repo_contract.ps1',
  'check_m73_hot_path_phase2_repo_contract.ps1',
  'check_m74_hot_path_phase3_repo_contract.ps1',
  'check_m75_hot_path_phase4_repo_contract.ps1',
  'check_m71_room_title_hotfix_repo_contract.ps1',
  'check_m71_workflow_loadsummary_hotfix_repo_contract.ps1',
  'check_m72_georeview_token_hotfix_repo_contract.ps1'
)
foreach ($name in $checks) {
  & (Join-Path $PSScriptRoot ('..\..\' + $name)) -RepoRoot $RepoRoot
}
Write-Host 'M67-M75 LIVING STATIC CHECK PASS'
