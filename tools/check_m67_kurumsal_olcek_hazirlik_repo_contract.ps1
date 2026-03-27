param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

Write-Host 'INFO Checking M67 files'
@(
  'backend\scripts\scale_readiness_check.js',
  'backend\scripts\company_fetch_storm_check.js',
  'docs\RUNBOOK_M67_KURUMSAL_OLCEK_HAZIRLIK.md',
  'docs\MILESTONE_M67_KURUMSAL_OLCEK_HAZIRLIK.md',
  'tools\pack_m67_kurumsal_olcek_hazirlik.ps1',
  'tools\check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1'
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M67_KURUMSAL_OLCEK_HAZIRLIK.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M67_KURUMSAL_OLCEK_HAZIRLIK.md'
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\pack_m67_kurumsal_olcek_hazirlik.ps1'
$scale = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\scripts\scale_readiness_check.js'
$storm = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\scripts\company_fetch_storm_check.js'

Assert-RepoContractContainsAny $runbook @('Kurumsal Ölçek Hazırlık','company_fetch_storm_check','scale_readiness_check','100 kullanıcı','300 kullanıcı','1000 kullanıcı') 'runbook covers scope and load-test plan'
Assert-RepoContractContainsAny $milestone @('M67','kurumsal ölçek','fetch storm','visible-only loading','AbortController') 'milestone doc reflects M67 target'
Assert-RepoContractContainsAny $pack @('scale_readiness_check.js','company_fetch_storm_check.js','SkipRuntimeStorm') 'pack runs both M67 checks'
Assert-RepoContractContainsAny $scale @('provider score backend batch endpoint yok','provider score backend batch endpoint is used','company personels endpoint has no pagination','company personels endpoint has q + take','MapPanel route-preview only runs when selected shift exists','company workflow summary helper exists','company overview summary endpoints exist') 'scale check encodes expected risk signals'
Assert-RepoContractContainsAny $storm @('scenario endpoint count','429 detected','READ_RATE_LIMIT_MAX=120/dk','/api/offers/company?status=OPEN,COUNTERED&take=80','/api/company/overview/workflow-summary','virtualUsers=3','M72 profile uses lower first-load takes') 'storm check covers hot paths and limiter pressure'

Write-Host 'M67 KURUMSAL OLCEK HAZIRLIK REPO CONTRACT PASS'
