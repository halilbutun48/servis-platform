param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host 'INFO Checking M64 files'
@(
 'backend\scripts\m64_natural_copilot_layer_check.js',
 'backend\src\ops\naturalCopilotManifest.js',
 'backend\src\routes\naturalCopilot.js',
 'web\src\panels\superadmin\NaturalCopilotPanel.jsx',
 'docs\RUNBOOK_M64_NATURAL_COPILOT_LAYER.md',
 'docs\MILESTONE_M64_NATURAL_COPILOT_LAYER.md',
 'tools\pack_m64_natural_copilot_layer.ps1',
 'tools\check_m64_natural_copilot_layer_repo_contract.ps1',
 'README.md',
 'docs\PROJECT_SPEC_V1.md',
 'docs\PRIMER_SSOT.md',
 'docs\STARTPACK_V1.md',
 'docs\CHECKLIST_SSOT.md',
 'docs\NEXT_BACKLOG_V1.md',
 'tools\PRIMER_SNAPSHOT.md',
 'tools\CHECKLIST_SSOT.md',
 'tools\README.md',
 'docs\MILESTONE_REGISTRY_V1.md'
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
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M64_NATURAL_COPILOT_LAYER.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M64_NATURAL_COPILOT_LAYER.md'
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\naturalCopilot.js'
$manifest = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\ops\naturalCopilotManifest.js'
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\superadmin\NaturalCopilotPanel.jsx'
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\pack_m64_natural_copilot_layer.ps1'
$script = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\scripts\m64_natural_copilot_layer_check.js'

Assert-RepoContractContainsAny $readme @('m63 green','m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1','post-m66 functional') 'root readme reflects M64 route or later official state'
Assert-RepoContractContainsAny $projectSpec @('daha dogal turkce cevap katmani','kisa konusma hafizasi','daha basit anlat') 'project spec reflects natural copilot layer'
Assert-RepoContractContainsAny $primer @('m63 - guven + kalite + hizmet degerlendirme','m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1','post-m66 functional') 'primer ssot reflects M64 route or later official state'
Assert-RepoContractContainsAny $startpack @('m64 - dogal copilot katmani','m64 baslangic notu','m64 bitmeden m65','post-m66 functional','m75 green baseline','m76a-1') 'startpack reflects M64 opening or later official state'
Assert-RepoContractContainsAny $checklist @('[ ] m64 - dogal copilot katmani','[x] m64 - dogal copilot katmani','m66 - operasyonel reassignment kapanisi') 'checklist tracks M64 milestone or later official state'
Assert-RepoContractContainsAny $backlog @('m64 - dogal copilot katmani','dogal turkce cevap katmani','pack_m64_natural_copilot_layer.ps1','post-m66 functional') 'backlog points to M64 or later state'
Assert-RepoContractContainsAny $toolsPrimer @('m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1','post-m66 functional','m75 green baseline','m76a-1') 'tools primer reflects M64 route or later official state'
Assert-RepoContractContainsAny $toolsChecklist @('[ ] m64 - dogal copilot katmani','[x] m64 - dogal copilot katmani','m66 - operasyonel reassignment kapanisi') 'tools checklist tracks M64 milestone or later official state'
Assert-RepoContractContainsAny $toolsReadme @('m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1','post-m66 functional','m75 green baseline','m76a-1') 'tools readme reflects M64 route or later official state'
Assert-RepoContractContainsAny $registry @('m64 - dogal copilot katmani - green-base','m64 - dogal copilot katmani','m66 - operasyonel reassignment - functional-open') 'registry lists current official M64 state'
Assert-RepoContractContainsAny $runbook @('dogal copilot katmani','kisa konusma hafizasi','m64 green olmadan m65') 'runbook defines M64 scope'
Assert-RepoContractContainsAny $milestone @('dogal copilot katmani','manifest','feedback-template') 'milestone documents M64 outputs'
Assert-RepoContractContainsAny $route @('/manifest','/reply-template','/feedback-template') 'natural copilot route exposes manifest and templates'
Assert-RepoContractContainsAny $manifest @('natural_copilot_capabilities','dogal turkce cevap katmani','copilot geri bildirim zemini') 'manifest defines M64 natural capabilities'
Assert-RepoContractContainsAny $panel @('m64 dogal copilot katmani','dogal cevap','geri bildirim') 'web panel shows M64 cards'
Assert-RepoContractContainsAny $pack @('m64_natural_copilot_layer_check.js','check_m64_natural_copilot_layer_repo_contract.ps1') 'm64 pack wires runtime and repo contract'
Assert-RepoContractContainsAny $script @('m64 dogal copilot katmani check','naturalcopilot.js','feedback-template') 'm64 runtime check covers updated route baseline'

Write-Host 'M64 DOGAL COPILOT KATMANI REPO CONTRACT PASS'
