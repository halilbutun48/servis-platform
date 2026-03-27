param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

@(
  'backend\scripts\m72_hot_endpoint_reduction_check.js',
  'backend\src\routes\reports.js',
  'backend\src\routes\shifts\people.js',
  'backend\src\routes\companyOverview.js',
  'web\src\utils\companyDataHub.js',
  'web\src\panels\company\WorkflowPanel.jsx',
  'web\src\panels\company\AgreementsPanel.jsx',
  'web\src\panels\company\ShiftsPanel.jsx',
  'web\src\panels\company\MapPanel.jsx',
  'web\src\panels\company\ServiceEvaluationPanel.jsx',
  'backend\scripts\company_fetch_storm_check.js',
  'backend\scripts\scale_readiness_check.js',
  'tools\pack_m72_hot_endpoint_reduction.ps1',
  'tools\check_m72_hot_endpoint_reduction_repo_contract.ps1',
  'docs\RUNBOOK_M72_HOT_ENDPOINT_REDUCTION.md',
  'docs\MILESTONE_M72_HOT_ENDPOINT_REDUCTION.md'
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M72_HOT_ENDPOINT_REDUCTION.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M72_HOT_ENDPOINT_REDUCTION.md'
$check = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\scripts\m72_hot_endpoint_reduction_check.js'

Assert-RepoContractContainsAny $runbook @('M72','hot endpoint reduction','route-preview','reports summary cache','rooms take','vehicles take') 'runbook covers m72 scope'
Assert-RepoContractContainsAny $milestone @('M72','hot endpoint','429','route-preview','reports cache') 'milestone reflects m72 target'
Assert-RepoContractContainsAny $check @('companyDataHub lower first-load takes exist','Route preview backend response cache exists','Reports summary uses response cache') 'm72 check covers key signals'

Write-Host 'M72 HOT ENDPOINT REDUCTION REPO CONTRACT PASS'
