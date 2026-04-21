param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host 'INFO Checking M63 files'
@(
 'backend\scripts\m63_trust_quality_service_evaluation_check.js',
 'backend\src\ops\trustQualityManifest.js',
 'backend\src\routes\trustQuality.js',
 'web\src\panels\superadmin\TrustQualityPanel.jsx',
 'docs\RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md',
 'docs\MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md',
 'tools\pack_m63_trust_quality_service_evaluation.ps1',
 'tools\check_m63_trust_quality_service_evaluation_repo_contract.ps1',
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
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md'
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\trustQuality.js'
$manifest = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\ops\trustQualityManifest.js'
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\superadmin\TrustQualityPanel.jsx'
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\pack_m63_trust_quality_service_evaluation.ps1'
$script = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\scripts\m63_trust_quality_service_evaluation_check.js'

# forward-compatible repo state: historical M63-open OR current post-M66/green-base
Assert-RepoContractContainsAny $readme @('README_ROUTE_M63_V1','m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1','post-m66 functional','m66 operasyonel reassignment','m75 green baseline','m76a-1','m77','m82','m82.8','m83','m84','m85','m86','m87','m88','m89') 'root readme reflects M63 route or later official state'
Assert-RepoContractContainsAny $projectSpec @('PROJECT_SPEC_M63_TRUST_LAYER_V1','hizmet alan kurum degerlendirmesi','saglayici kalite','karar destek') 'project spec reflects trust and evaluation layer'
Assert-RepoContractContainsAny $primer @('PRIMER_ROUTE_M63_V1','m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1','post-m66 functional','m66 operasyonel reassignment','m75 green baseline','m76a-1','m77','m82','m82.8','m83','m84','m85','m86','m87','m88','m89') 'primer ssot reflects M63 route or later official state'
Assert-RepoContractContainsAny $startpack @('STARTPACK_ROUTE_M63_V1','m63 - guven + kalite + hizmet degerlendirme','m63 baslangic notu','post-m66 functional','pack_m66_operation_reassignment.ps1','m75 green baseline','m76a-1','m77','m82','m82.8','m83','m84','m85','m86','m87','m88','m89') 'startpack reflects M63 route or later official state'
Assert-RepoContractContainsAny $checklist @('CHECKLIST_ROUTE_M63_V1','[ ] m63 - guven + kalite + hizmet degerlendirme','[x] m63 - guven + kalite + hizmet degerlendirme') 'checklist tracks M63 milestone'
Assert-RepoContractContainsAny $backlog @('BACKLOG_ROUTE_M63_V1','m63 - guven + kalite + hizmet degerlendirme','trust quality service evaluation','post-m66 functional','m75 living baseline','m76a','m77','m78') 'backlog points to M63 or later state'
Assert-RepoContractContainsAny $toolsPrimer @('TOOLS_PRIMER_ROUTE_M63_V1','m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1','post-m66 functional','m66 operasyonel reassignment','m75 green baseline','m76a-1','m77','m82','m82.8','m83','m84','m85','m86','m87','m88','m89') 'tools primer reflects M63 route or later official state'
Assert-RepoContractContainsAny $toolsChecklist @('TOOLS_CHECKLIST_ROUTE_M63_V1','[ ] m63 - guven + kalite + hizmet degerlendirme','[x] m63 - guven + kalite + hizmet degerlendirme') 'tools checklist tracks M63 milestone'
Assert-RepoContractContainsAny $toolsReadme @('TOOLS_README_ROUTE_M63_V1','pack_m63_trust_quality_service_evaluation.ps1','m63 green olmadan m64 acilmaz','post-m66 functional','pack_m66_operation_reassignment.ps1','m75 green baseline','m76a-1','m77','m82','m82.8','m83','m84','m85','m86','m87','m88','m89') 'tools readme reflects M63 route or later official state'
Assert-RepoContractContainsAny $registry @('REGISTRY_ROUTE_M63_M65_V1','m63 - guven + kalite + hizmet degerlendirme - aktif','m63 - guven + kalite + hizmet degerlendirme - green','m63 - guven + kalite + hizmet degerlendirme - green-base','m75 - living baseline','m76a-1 - minimum normalization','m77 - kvkk + uyum katmani') 'registry lists current official M63 state'
Assert-RepoContractContainsAny $runbook @('m63 guven + kalite + hizmet degerlendirme','hizmet alan kurum degerlendirmesi','m63 green olmadan m64') 'runbook defines M63 scope'
Assert-RepoContractContainsAny $milestone @('m63 guven + kalite + hizmet degerlendirme','trustqualitypanel.jsx','pack_m63_trust_quality_service_evaluation.ps1','canli kalite ozeti','roadmap') 'milestone documents live summary and roadmap split'
Assert-RepoContractContainsAny $route @('/manifest','/company/summary','/evaluation-template','/provider-signal-template') 'trust quality route exposes live summary and roadmap templates'
Assert-RepoContractContainsAny $manifest @('trust_quality_dimensions','hizmet alan degerlendirmesi','karar destek yuzeyi') 'manifest defines M63 trust dimensions'
Assert-RepoContractContainsAny $panel @('canli kalite ozeti','tamamlanan hizmet','degerlendirme bekleyen','aktif hizmet','saglayici sayisi','yol haritasi: hizmet alan degerlendirmesi','yol haritasi: saglayici kalite sinyali') 'web panel shows live summary and roadmap cards'
Assert-RepoContractContainsAny $pack @('m63_trust_quality_service_evaluation_check.js','check_m63_trust_quality_service_evaluation_repo_contract.ps1','pack pass ok') 'm63 pack wires runtime and repo contract'
Assert-RepoContractContainsAny $script @('m63 guven + kalite + hizmet degerlendirme check','/api/trust-quality') 'm63 runtime check covers skeleton baseline'

Write-Host 'M63 GUVEN + KALITE + HIZMET DEGERLENDIRME REPO CONTRACT PASS'

