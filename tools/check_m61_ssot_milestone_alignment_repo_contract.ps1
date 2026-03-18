param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAll([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if (-not $txt.Contains(([string]$n).Normalize())) { throw "FAIL $label" } }; Write-Host "OK $label" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; throw "FAIL $label" }

Write-Host "INFO Checking M61 files"
@(
 'backend\scripts\m61_ssot_milestone_alignment_check.js',
 'backend\src\ops\ssotAlignmentManifest.js',
 'backend\src\routes\ssotAlignment.js',
 'web\src\panels\superadmin\SsotAlignmentPanel.jsx',
 'docs\MILESTONE_REGISTRY_V1.md',
 'docs\RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md',
 'docs\MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md',
 'tools\pack_m61_ssot_milestone_alignment.ps1',
 'tools\check_m61_ssot_milestone_alignment_repo_contract.ps1',
 'README.md',
 'docs\PRIMER_SSOT.md',
 'docs\STARTPACK_V1.md',
 'docs\CHECKLIST_SSOT.md',
 'docs\NEXT_BACKLOG_V1.md',
 'tools\PRIMER_SNAPSHOT.md',
 'tools\CHECKLIST_SSOT.md',
 'tools\README.md'
) | ForEach-Object { MustExist $_ }

$readme = ReadText 'README.md'
$primer = ReadText 'docs\PRIMER_SSOT.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$toolsPrimer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$toolsChecklist = ReadText 'tools\CHECKLIST_SSOT.md'
$toolsReadme = ReadText 'tools\README.md'
$registry = ReadText 'docs\MILESTONE_REGISTRY_V1.md'
$runbook = ReadText 'docs\RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md'
$milestone = ReadText 'docs\MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md'
$route = ReadText 'backend\src\routes\ssotAlignment.js'
$manifest = ReadText 'backend\src\ops\ssotAlignmentManifest.js'
$panel = ReadText 'web\src\panels\superadmin\SsotAlignmentPanel.jsx'
$pack = ReadText 'tools\pack_m61_ssot_milestone_alignment.ps1'
$script = ReadText 'backend\scripts\m61_ssot_milestone_alignment_check.js'

MustContainAll $readme @('M60','green','M61','pack_m61_ssot_milestone_alignment.ps1') 'root readme reflects M61 route'
MustContainAll $primer @('M60','green','M61','pack_m61_ssot_milestone_alignment.ps1') 'primer ssot reflects M60 green and M61 active'
MustContainAll $startpack @('M61','M62') 'startpack reflects M61 opening'
MustContainAll $checklist @('M60','M61','pack_m61_ssot_milestone_alignment.ps1') 'checklist marks M60 green and keeps M61 open'
MustContainAll $backlog @('M60','M61') 'backlog points to M61'
MustContainAll $toolsPrimer @('M60','green','M61','pack_m61_ssot_milestone_alignment.ps1') 'tools primer reflects M61 route'
MustContainAll $toolsChecklist @('M60','M61','pack_m61_ssot_milestone_alignment.ps1') 'tools checklist marks M60 green and keeps M61 open'
MustContainAll $toolsReadme @('pack_m61_ssot_milestone_alignment.ps1','M61','M62') 'tools readme lists M61 pack and sequencing rule'
MustContainAll $registry @('M59','M60','green','M61','aktif','M62') 'registry lists current official route'
MustContainAll $runbook @('M61','registry','M62') 'runbook defines M61 scope'
MustContainAll $milestone @('M61','SsotAlignmentPanel.jsx','pack_m61_ssot_milestone_alignment.ps1') 'milestone documents M61 outputs'
MustContainAny $route @('/manifest','/summary-template','/route') 'ssot alignment route exposes summary endpoints'
MustContainAll $manifest @('SSOT_ALIGNMENT_TARGETS','MILESTONE_ROUTE','activeMilestone') 'manifest defines M61 targets and route'
MustContainAll $panel @('M61','SSOT','Milestone') 'web panel shows M61 cards'
MustContainAll $pack @('m61_ssot_milestone_alignment_check.js','check_m61_ssot_milestone_alignment_repo_contract.ps1','PACK PASS OK') 'm61 pack wires runtime and repo contract'
MustContainAll $script @('M61','/api/ssot-alignment') 'm61 runtime check covers skeleton baseline'

Write-Host 'M61 SSOT + MILESTONE HIZASI REPO CONTRACT PASS'
