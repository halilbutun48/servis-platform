param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')

$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M80 Repo Contract ==='
$files = @(
  'backend\scripts\m80_final_sert_kabul_yuk_guveni_check.js',
  'backend\scripts\scale_readiness_check.js',
  'tools\pack_m80_final_sert_kabul_yuk_guveni.ps1',
  'tools\check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1',
  'tools\milestone_pack_manifest.json',
  'tools\repo_contract_state.json',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md',
  'docs\RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md',
  'docs\MILESTONE_M80_FINAL_SERT_KABUL_YUK_GUVENI.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'docs\PRIMER_SSOT.md',
  'docs\STARTPACK_V1.md',
  'docs\NEXT_BACKLOG_V1.md',
  'docs\CHECKLIST_SSOT.md',
  'README.md',
  '.gitignore',
  '.dockerignore',
  'docs\RUNBOOK_M34_STEP0.md',
  'infra\docker-compose.yml'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }

$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'README.md'
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\PRIMER_SSOT.md'
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\STARTPACK_V1.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\NEXT_BACKLOG_V1.md'
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_REGISTRY_V1.md'
$checklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\CHECKLIST_SSOT.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\README.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\PRIMER_SNAPSHOT.md'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M80_FINAL_SERT_KABUL_YUK_GUVENI.md'
$gitignore = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath '.gitignore'
$dockerignore = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath '.dockerignore'
$m34 = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M34_STEP0.md'
$compose = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'infra\docker-compose.yml'
$manifest = Get-Content (Join-Path $RepoRoot 'tools\milestone_pack_manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$stageIds = @($manifest.stages | ForEach-Object { [string]$_.id })

Assert-RepoContractStateValue -State $state -Property 'latestMasterPack' -Expected 79 -Label 'state latest master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'stableTo' -Expected 78 -Label 'state stable_to remains 78'
Assert-RepoContractStateValue -State $state -Property 'nextMilestone' -Expected 'M80' -Label 'state next milestone is M80'
Assert-RepoContractStateValue -State $state -Property 'latestManifestStage' -Expected 'M79' -Label 'state latest manifest stage stays M79'
Assert-RepoContractStateArrayContains -State $state -Property 'activeMilestones' -Expected 'M80' -Label 'state marks M80 active'
if (-not ($stageIds -contains 'M80')) { throw 'FAIL manifest contains M80' }
Write-Host 'OK manifest contains M80'

Assert-RepoContractContainsAny -Text $readme -Needles @('pack_m80_final_sert_kabul_yuk_guveni','M80') -Label 'readme mentions M80 pack gate'
Assert-RepoContractContainsAny -Text $primer -Needles @('M80 ilk tur komutu','resmi green degil','M80') -Label 'primer explains M80 first command'
Assert-RepoContractContainsAny -Text $startpack -Needles @('M80 final sert kabul ve yuk guveni kapisi','pack_m80_final_sert_kabul_yuk_guveni','M80.1','M80.2','M80.3','sert kabul','yuk guveni') -Label 'startpack defines M80 gate'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M80 kabul kapisi','M80.1','hot panel') -Label 'backlog points after M80 gate open'
Assert-RepoContractContainsAny -Text $registry -Needles @('M80 — final sert kabul ve yük güveni kapısı','M80 - final sert kabul ve yuk guveni kapisi','resmi green degil') -Label 'registry lists active M80 meaning'
Assert-RepoContractContainsAny -Text $checklist -Needles @('M80','final sert kabul') -Label 'checklist keeps M80 visible'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m80_final_sert_kabul_yuk_guveni','M80') -Label 'tools readme lists M80 command'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @('M80 pack komutu','resmi green degil','M80 final sert kabul yük güveni','M80 final sert kabul yuk guveni','M80.1','M80.2','M80.3','M80 final') -Label 'tools primer mirrors M80 gate'
Assert-RepoContractContainsAny -Text $runbook -Needles @('ShiftsPanel','AgreementsPanel','GeoReviewPanel','MapPanel') -Label 'runbook lists hot panels'
Assert-RepoContractContainsAny -Text $runbook -Needles @('OSRM kodu repoda kalir','osrm-data','default compose modunda fallback') -Label 'runbook documents OSRM optionality'
Assert-RepoContractContainsAny -Text $runbook -Needles @('resmi green degil','yalnizca kapinin acildigini gosterir') -Label 'runbook keeps non-final-green note'
Assert-RepoContractContainsAny -Text $milestone -Needles @('resmi green degil','pack_m80_final_sert_kabul_yuk_guveni.ps1') -Label 'milestone documents command and non-final green note'
Assert-RepoContractContainsAny -Text $gitignore -Needles @('infra/osrm-data/') -Label '.gitignore excludes osrm-data'
Assert-RepoContractContainsAny -Text $dockerignore -Needles @('infra/osrm-data/') -Label '.dockerignore excludes osrm-data'
Assert-RepoContractContainsAny -Text $m34 -Needles @('OSRM/solver opsiyonel','repo’ya girmez','repoya girmez') -Label 'M34 runbook explains OSRM optional profile'
Assert-RepoContractContainsAny -Text $compose -Needles @('profiles: ["osrm"]','OSRM_URL','PLAN_SOLVER_URL') -Label 'compose keeps osrm profile wiring'
Write-Host '=== M80 Repo Contract PASS ==='
