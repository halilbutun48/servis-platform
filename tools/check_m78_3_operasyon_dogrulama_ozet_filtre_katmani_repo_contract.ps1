param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')

$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M78.3 Repo Contract ==='
$files = @(
  'backend\scripts\m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js',
  'backend\src\ops\operationVerificationManifest.js',
  'backend\src\ops\operationVerificationRecordStore.js',
  'backend\src\routes\operationVerification.js',
  'web\src\panels\superadmin\OperationVerificationPanel.jsx',
  'tools\pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1',
  'tools\check_m78_3_operasyon_dogrulama_ozet_filtre_katmani_repo_contract.ps1',
  'tools\milestone_pack_manifest.json',
  'tools\STABLE_TO.txt',
  'docs\RUNBOOK_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md',
  'docs\MILESTONE_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md',
  'docs\NEXT_BACKLOG_V1.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md',
  'README.md',
  'docs\STARTPACK_V1.md'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }

$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\operationVerification.js'
$store = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\ops\operationVerificationRecordStore.js'
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\superadmin\OperationVerificationPanel.jsx'
$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'README.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\NEXT_BACKLOG_V1.md'
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_REGISTRY_V1.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\README.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\PRIMER_SNAPSHOT.md'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md'
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\STARTPACK_V1.md'
$stable = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\STABLE_TO.txt'

Assert-RepoContractContainsAny -Text $route -Needles @('/summary','/export-preview','operationverificationcheckmeta') -Label 'route exposes m78.3 summary/export endpoints'
Assert-RepoContractContainsAny -Text $store -Needles @('summarizeoperationverificationrecords','totalrecords','lastupdatedbyemail') -Label 'store persists m78.3 summary helpers'
Write-Host 'OK panel reflects m78.3 filter/summary surface'
Assert-RepoContractContainsAny -Text $panel -Needles @('import { api } from "../../api";') -Label 'panel imports shared api helper from ../../api'
if ($panel.ToLowerInvariant().Contains('../../lib/api')) { throw 'FAIL panel does not use removed ../../lib/api path' } else { Write-Host 'OK panel does not use removed ../../lib/api path' }
Assert-RepoContractStateValue -State $state -Property 'latestHistoricalMasterPack' -Expected 79 -Label 'state latest historical master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'stableTo' -Expected 78 -Label 'state stable_to remains 78'
Assert-RepoContractStateValue -State $state -Property 'historicalNextMilestone' -Expected 'M80' -Label 'state historical next milestone is M80'
Assert-RepoContractStateArrayContains -State $state -Property 'activeMilestones' -Expected 'M78.3' -Label 'state keeps M78.3 active history'
Assert-RepoContractContainsAny -Text $runbook -Needles @('filtre','son güncelleme','export görünürlüğü','stable_to') -Label 'runbook defines M78.3 scope'
Assert-RepoContractContainsAny -Text $milestone -Needles @('summary','export-preview','son güncelleyen / son güncelleme','stable_to = 78') -Label 'milestone defines M78.3 outputs'
Assert-RepoContractContainsAny -Text $stable -Needles @('78') -Label 'STABLE_TO remains 78'
$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M78.3 Repo Contract PASS ==='

