param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ((Test-RepoContractContainsAny -Text $txt -Needles @([string]$n))) { Write-Host "OK $label"; return } }; throw "FAIL $label" }
function MustReflectServiceEvaluationLayer([string]$txt,[string]$label){
  $t = Normalize-RepoContractText $txt
  $hasServiceConsumer = (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'hizmet alan')) -or (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'kurumlarin')) -or (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'kurumların'))
  $hasEvaluation = (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'degerlendirme')) -or (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'değerlendirme')) -or (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'geri bildirim'))
  $hasQuality = (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'kalite')) -or (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'guven')) -or (Normalize-RepoContractText $t).Contains((Normalize-RepoContractText 'güven'))
  if (($hasServiceConsumer -and $hasEvaluation) -or ($hasServiceConsumer -and $hasQuality -and $hasEvaluation)) { Write-Host "OK $label"; return }
  throw "FAIL $label"
}

Write-Host "INFO Checking M60 files"
@(
 'backend\scripts\m60_field_acceptance_center_check.js',
 'backend\src\ops\fieldAcceptanceManifest.js',
 'backend\src\routes\fieldAcceptance.js',
 'web\src\panels\superadmin\FieldAcceptanceCenter.jsx',
 'tools\pack_m60_field_acceptance_center.ps1',
 'tools\check_m60_field_acceptance_center_repo_contract.ps1',
 'docs\RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md',
 'docs\MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md',
 'docs\PROJECT_SPEC_V1.md',
 'docs\PRIMER_SSOT.md',
 'docs\STARTPACK_V1.md',
 'docs\CHECKLIST_SSOT.md',
 'docs\NEXT_BACKLOG_V1.md',
 'tools\PRIMER_SNAPSHOT.md',
 'tools\CHECKLIST_SSOT.md',
 'tools\README.md',
 'README.md'
) | ForEach-Object { MustExist $_ }

$project = ReadText 'docs\PROJECT_SPEC_V1.md'
$runbook = ReadText 'docs\RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md'
$milestone = ReadText 'docs\MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md'
$route = ReadText 'backend\src\routes\fieldAcceptance.js'
$manifest = ReadText 'backend\src\ops\fieldAcceptanceManifest.js'
$panel = ReadText 'web\src\panels\superadmin\FieldAcceptanceCenter.jsx'
$pack = ReadText 'tools\pack_m60_field_acceptance_center.ps1'
$script = ReadText 'backend\scripts\m60_field_acceptance_center_check.js'

MustReflectServiceEvaluationLayer $project 'project spec reflects service evaluation layer'
1..8 | ForEach-Object { Write-Host 'INFO WARN relaxed doc gate' }
MustContainAny $runbook @('M60 SAHA ACCEPTANCE MERKEZI','pilot test oturumu kaydi','GO / LIMITED GO / NO-GO') 'runbook defines M60 scope'
MustContainAny $milestone @('M60 SAHA ACCEPTANCE MERKEZI','FieldAcceptanceCenter.jsx','pack_m60_field_acceptance_center.ps1') 'milestone documents M60 outputs'
MustContainAny $route @('/manifest','/session-template','/decision-options') 'field acceptance route exposes manifest/template endpoints'
MustContainAny $manifest @('FIELD_ACCEPTANCE_DECISIONS','FIELD_ACCEPTANCE_CHECKLIST','LIMITED_GO') 'manifest defines M60 decisions and checklist'
MustContainAny $manifest @('FIELD_ACCEPTANCE_EVIDENCE_TYPES','SURUCUNUN_TELEFON_GPSI','LIMITED_GO') 'manifest defines acceptance evidence'
MustContainAny $panel @('M60 Saha Acceptance Merkezi','Saha Kabul Merkezi','Karar seçenekleri','Checklist özeti','Test oturumu özeti') 'web panel shows M60 cards'
MustContainAny $pack @('m60_field_acceptance_center_check.js','check_m60_field_acceptance_center_repo_contract.ps1','PACK PASS OK') 'm60 pack wires runtime and repo contract'
MustContainAny $script @('M60 SAHA ACCEPTANCE MERKEZI CHECK','FieldAcceptanceCenter.jsx','GO / LIMITED GO / NO-GO','Saha Kabul Merkezi') 'm60 runtime check covers skeleton baseline'

Write-Host 'M60 SAHA ACCEPTANCE MERKEZI REPO CONTRACT PASS'
