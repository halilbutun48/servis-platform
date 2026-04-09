param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')

$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M80.1 Repo Contract ==='
$files = @(
  'tools\pack_m80_1_hot_panel_daraltma.ps1',
  'tools\check_m80_1_hot_panel_daraltma_repo_contract.ps1',
  'backend\scripts\m80_1_hot_panel_daraltma_check.js',
  'docs\RUNBOOK_M80_1_HOT_PANEL_DARALTMA.md',
  'docs\MILESTONE_M80_1_HOT_PANEL_DARALTMA.md',
  'web\src\panels\company\GeoReviewPanel.jsx',
  'web\src\panels\company\MapPanel.jsx',
  'web\src\panels\company\ShiftsPanel.jsx',
  'tools\milestone_pack_manifest.json',
  'tools\repo_contract_state.json',
  'README.md',
  'docs\PRIMER_SSOT.md',
  'docs\STARTPACK_V1.md',
  'docs\NEXT_BACKLOG_V1.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'docs\CHECKLIST_SSOT.md',
  'tools\CHECKLIST_SSOT.md',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }

$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'README.md'
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\PRIMER_SSOT.md'
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\STARTPACK_V1.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\NEXT_BACKLOG_V1.md'
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_REGISTRY_V1.md'
$checklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\CHECKLIST_SSOT.md'
$toolsChecklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\CHECKLIST_SSOT.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\README.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\PRIMER_SNAPSHOT.md'
$manifest = Get-Content (Join-Path $RepoRoot 'tools\milestone_pack_manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$stageIds = @($manifest.stages | ForEach-Object { [string]$_.id })

Assert-RepoContractStateValue -State $state -Property 'latestHistoricalMasterPack' -Expected 79 -Label 'state latest historical master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'stableTo' -Expected 78 -Label 'state stable_to remains 78'
Assert-RepoContractStateValue -State $state -Property 'historicalNextMilestone' -Expected 'M80' -Label 'state historical next milestone stays M80 main gate'
Assert-RepoContractStateArrayContains -State $state -Property 'activeMilestones' -Expected 'M80.1' -Label 'state marks M80.1 active'
if (-not ($stageIds -contains 'M80.1')) { throw 'FAIL manifest contains M80.1' }
Write-Host 'OK manifest contains M80.1'

Assert-RepoContractContainsAny -Text $readme -Needles @('pack_m80_1_hot_panel_daraltma','M80.1') -Label 'readme mentions M80.1 command'
Assert-RepoContractContainsAny -Text $primer -Needles @('M80.1','hot panel daraltma') -Label 'primer mentions M80.1 daraltma'
Assert-RepoContractContainsAny -Text $startpack -Needles @('M80.1','GeoReview','MapPanel') -Label 'startpack lists M80.1 scope'
Assert-RepoContractContainsAny -Text $backlog -Needles @("M80.1","M80.2","M80.3","M81","M82.1","M82.8","M82.9","M82.10","M82.11","M83","M84","M85","M86","M87","M88","M89","M90","living route") -Label 'backlog points to M80.1 hot panels'
Assert-RepoContractContainsAny -Text $registry -Needles @('M80.1','hot panel daraltma') -Label 'registry lists M80.1 active substep'
Assert-RepoContractContainsAny -Text $checklist -Needles @('M80.1','hot panel') -Label 'checklist keeps M80.1 visible'
Assert-RepoContractContainsAny -Text $toolsChecklist -Needles @('M80.1','hot panel') -Label 'tools checklist keeps M80.1 visible'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m80_1_hot_panel_daraltma','M80.1') -Label 'tools readme lists M80.1 command'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @("M80.1","M80.2","M80.3","hot panel","daraltma","GeoReview","MapPanel","ShiftsPanel","M81","M82.1","living route") -Label 'tools primer mirrors M80.1'
Write-Host '=== M80.1 Repo Contract PASS ==='



