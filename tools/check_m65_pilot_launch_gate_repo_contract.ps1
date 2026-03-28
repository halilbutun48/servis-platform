param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host 'INFO Checking M65 files'
@(
 'backend\scripts\m65_pilot_launch_gate_check.js',
 'backend\src\ops\pilotLaunchGateManifest.js',
 'backend\src\routes\pilotLaunchGate.js',
 'web\src\panels\superadmin\PilotLaunchGatePanel.jsx',
 'docs\RUNBOOK_M65_PILOT_LAUNCH_GATE.md',
 'docs\MILESTONE_M65_PILOT_LAUNCH_GATE.md',
 'tools\pack_m65_pilot_launch_gate.ps1',
 'tools\check_m65_pilot_launch_gate_repo_contract.ps1',
 'README.md', 'docs\PROJECT_SPEC_V1.md', 'docs\PRIMER_SSOT.md', 'docs\STARTPACK_V1.md', 'docs\CHECKLIST_SSOT.md', 'docs\NEXT_BACKLOG_V1.md', 'tools\PRIMER_SNAPSHOT.md', 'tools\CHECKLIST_SSOT.md', 'tools\README.md', 'docs\MILESTONE_REGISTRY_V1.md'
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'README.md'
$projectSpec = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\PROJECT_SPEC_V1.md'
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\PRIMER_SSOT.md'
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\STARTPACK_V1.md'
$checklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\CHECKLIST_SSOT.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\NEXT_BACKLOG_V1.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\PRIMER_SNAPSHOT.md'
$toolsChecklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\CHECKLIST_SSOT.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\README.md'
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_REGISTRY_V1.md'
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\pilotLaunchGate.js'
$manifest = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\ops\pilotLaunchGateManifest.js'
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\superadmin\PilotLaunchGatePanel.jsx'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M65_PILOT_LAUNCH_GATE.md'

Assert-RepoContractContainsAny $readme @('M65 — Pilot Launch Gate','M66','tools\pack.ps1 -To 66','tools\pack.ps1 -To 76','M75 green baseline') 'root readme reflects M65/M66 route'
Assert-RepoContractContainsAny $projectSpec @('Pilot Launch Gate','GO / LIMITED GO / NO-GO','M59 → M65') 'project spec reflects launch gate layer'
Assert-RepoContractContainsAny $primer @('M65 — Pilot Launch Gate','M66','pack_m66_operation_reassignment.ps1') 'primer ssot reflects M65 green and M66 functional'
Assert-RepoContractContainsAny $startpack @('M65 — Pilot Launch Gate','M66','tools\pack_docs_ssot.ps1','tools\pack.ps1 -To 76','M75 green baseline') 'startpack reflects post-M65/M66 state'
Assert-RepoContractContainsAny $checklist @('[x] `M65 — Pilot Launch Gate`','[ ] `M66 — Operasyonel Reassignment`') 'checklist marks M65 green and keeps M66 open'
Assert-RepoContractContainsAny $backlog @('M0-M66','cleanup','saha testi','M76A-1','minimum normalizasyon') 'backlog points to rerun after M65'
Assert-RepoContractContainsAny $toolsPrimer @('M65 — Pilot Launch Gate','M66','fonksiyonel') 'tools primer reflects M65 green and M66 functional'
if ((Normalize-RepoContractText $checklist) -ne (Normalize-RepoContractText $toolsChecklist)) { throw 'FAIL tools checklist mirrors docs checklist' } else { Write-Host 'OK tools checklist mirrors docs checklist' }
Assert-RepoContractContainsAny $toolsReadme @('tools\pack.ps1 -To 66','tools\pack.ps1 -To 76','tools\pack_docs_ssot.ps1') 'tools readme lists master/docs pack'
Assert-RepoContractContainsAny $registry @('M65 - Pilot Launch Gate - green-base','M65 - Pilot Launch Gate - green','M66 - Operasyonel Reassignment - functional-open','M66 - Operasyonel Reassignment - fonksiyonel / tekrar test acik','M75 - green-baseline','M76A-1 - minimum-normalization - active') 'registry includes M65 green and M66 open'

Assert-RepoContractContainsAny $route @('/manifest','/decision-template','/summary') 'pilot launch gate route exposes summary endpoints'
Assert-RepoContractContainsAny $manifest @('PILOT_LAUNCH_GATE_CAPABILITIES','GO / LIMITED GO / NO-GO','riskMatrix') 'manifest defines M65 gate capabilities'
Assert-RepoContractContainsAny $panel @('M65 Pilot Launch Gate','Launch checklist','GO / LIMITED GO / NO-GO') 'web panel shows M65 cards'
Assert-RepoContractContainsAny $runbook @('Pilot Launch Gate','kritik risk listesi','M65 green olmadan sahaya çıkılmaz') 'runbook defines M65 scope'

Write-Host 'M65 PILOT LAUNCH GATE REPO CONTRACT PASS'

