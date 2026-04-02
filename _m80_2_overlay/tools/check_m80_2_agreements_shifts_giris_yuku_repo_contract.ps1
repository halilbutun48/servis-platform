param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')

$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M80.2 Repo Contract ==='
$files = @(
  'tools\pack_m80_2_agreements_shifts_giris_yuku.ps1',
  'tools\check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1',
  'backend\scripts\m80_2_agreements_shifts_giris_yuku_check.js',
  'docs\RUNBOOK_M80_2_AGREEMENTS_SHIFTS_GIRIS_YUKU.md',
  'docs\MILESTONE_M80_2_AGREEMENTS_SHIFTS_GIRIS_YUKU.md',
  'web\src\panels\company\AgreementsPanel.jsx',
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

Assert-RepoContractStateValue -State $state -Property 'latestMasterPack' -Expected 79 -Label 'state latest master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'stableTo' -Expected 78 -Label 'state stable_to remains 78'
Assert-RepoContractStateValue -State $state -Property 'nextMilestone' -Expected 'M80' -Label 'state next milestone stays M80 main gate'
Assert-RepoContractStateArrayContains -State $state -Property 'activeMilestones' -Expected 'M80.2' -Label 'state marks M80.2 active'
if (-not ($stageIds -contains 'M80.2')) { throw 'FAIL manifest contains M80.2' }
Write-Host 'OK manifest contains M80.2'

Assert-RepoContractContainsAny -Text $readme -Needles @('pack_m80_2_agreements_shifts_giris_yuku','M80.2') -Label 'readme mentions M80.2 command'
Assert-RepoContractContainsAny -Text $primer -Needles @('M80.2','AgreementsPanel','ShiftsPanel') -Label 'primer mentions M80.2 daraltma'
Assert-RepoContractContainsAny -Text $startpack -Needles @('M80.2','AgreementsPanel','ShiftsPanel') -Label 'startpack lists M80.2 scope'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M80.2','AgreementsPanel','ShiftsPanel') -Label 'backlog points to M80.2 hot panels'
Assert-RepoContractContainsAny -Text $registry -Needles @('M80.2','agreements + shifts giriş yükü') -Label 'registry lists M80.2 active substep'
Assert-RepoContractContainsAny -Text $checklist -Needles @('M80.2','agreements + shifts giriş yükü') -Label 'checklist keeps M80.2 visible'
Assert-RepoContractContainsAny -Text $toolsChecklist -Needles @('M80.2','agreements + shifts giriş yükü') -Label 'tools checklist keeps M80.2 visible'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m80_2_agreements_shifts_giris_yuku','M80.2') -Label 'tools readme lists M80.2 command'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @('M80.2','Agreements/Shifts') -Label 'tools primer mirrors M80.2'
Write-Host '=== M80.2 Repo Contract PASS ==='
