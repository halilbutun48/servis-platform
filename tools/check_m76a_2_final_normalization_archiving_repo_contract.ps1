param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function Ok([string]$m){ Write-Host "OK $m" }
function Fail([string]$m){ throw "FAIL $m" }
function MustExist([string]$rel){ if(Test-Path (Join-Path $RepoRoot $rel)){ Ok "$rel exists" } else { Fail "$rel missing" } }

Write-Host '=== M76A-2 Repo Contract ==='
@(
  'backend\scripts\m76a_2_final_normalization_archiving_check.js',
  'tools\pack_m76a_2_final_normalization_archiving.ps1',
  'tools\check_m76a_2_final_normalization_archiving_repo_contract.ps1',
  'tools\packs\living\pack_phase_m76_m81.ps1',
  'tools\checks\living\check_m76_m81_static.ps1',
  'tools\packs\living\hotfixes\pack_m71_room_title_hotfix.ps1',
  'tools\packs\living\hotfixes\pack_m71_ui_contract_hotfix.ps1',
  'tools\packs\living\hotfixes\pack_m71_workflow_loadsummary_hotfix.ps1',
  'tools\packs\living\hotfixes\pack_m72_georeview_token_hotfix.ps1',
  'tools\packs\living\hotfixes\pack_m75_repo_contract_hotfix.ps1',
  'tools\checks\living\hotfixes\check_m71_room_title_hotfix_repo_contract.ps1',
  'tools\checks\living\hotfixes\check_m71_workflow_loadsummary_hotfix_repo_contract.ps1',
  'tools\checks\living\hotfixes\check_m72_georeview_token_hotfix_repo_contract.ps1',
  'docs\RUNBOOK_M76A_2_FINAL_NORMALIZATION_ARCHIVING.md',
  'docs\MILESTONE_M76A_2_FINAL_NORMALIZATION_ARCHIVING.md'
) | ForEach-Object { MustExist $_ }
Write-Host '=== M76A-2 Repo Contract PASS ==='
