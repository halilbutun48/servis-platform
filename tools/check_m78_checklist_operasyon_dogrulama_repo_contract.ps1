param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')
function ChecklistContractSynced([string]$a,[string]$b){ foreach($m in @('REPO_CONTRACT_CHECKLIST_COMPAT_V2','master pack marker','repo audit marker')){ if(((Normalize-RepoContractText $a).Contains((Normalize-RepoContractText $m)) -eq $false) -or ((Normalize-RepoContractText $b).Contains((Normalize-RepoContractText $m)) -eq $false)){ return $false } }; return $true }

$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M78 Repo Contract ==='
$files = @(
  'backend\scripts\m78_checklist_operasyon_dogrulama_check.js',
  'tools\pack_m78_checklist_operasyon_dogrulama.ps1',
  'tools\check_m78_checklist_operasyon_dogrulama_repo_contract.ps1',
  'tools\milestone_pack_manifest.json',
  'tools\STABLE_TO.txt',
  'tools\pack_living.ps1',
  'tools\verify_living_runtime.ps1',
  'tools\checks\living\check_m76_m81_static.ps1',
  'tools\packs\living\pack_phase_m76_m81.ps1',
  'tools\_packs\pack_m76_m81.ps1',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md',
  'tools\CHECKLIST_SSOT.md',
  'docs\RUNBOOK_M78_CHECKLIST_OPERASYON_DOGRULAMA.md',
  'docs\MILESTONE_M78_CHECKLIST_OPERASYON_DOGRULAMA.md',
  'docs\SAHA_KABUL_CHECKLISTLERI_V1.md',
  'docs\ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md',
  'docs\KANIT_PROOF_KONTROL_OMURGASI_V1.md',
  'docs\KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'docs\STARTPACK_V1.md',
  'docs\CHECKLIST_SSOT.md',
  'docs\NEXT_BACKLOG_V1.md',
  'README.md'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }

$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'README.md'
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\STARTPACK_V1.md'
$checklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\CHECKLIST_SSOT.md'
$toolsChecklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\CHECKLIST_SSOT.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\NEXT_BACKLOG_V1.md'
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_REGISTRY_V1.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\README.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\PRIMER_SNAPSHOT.md'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M78_CHECKLIST_OPERASYON_DOGRULAMA.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M78_CHECKLIST_OPERASYON_DOGRULAMA.md'
$roleDoc = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md'
$proofDoc = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\KANIT_PROOF_KONTROL_OMURGASI_V1.md'
$flowDoc = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md'

Assert-RepoContractStateValue -State $state -Property 'latestMasterPack' -Expected 79 -Label 'state latest master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'stableTo' -Expected 78 -Label 'state stable_to remains 78'
Assert-RepoContractStateValue -State $state -Property 'nextMilestone' -Expected 'M80' -Label 'state next milestone is M80'
Assert-RepoContractStateArrayContains -State $state -Property 'activeMilestones' -Expected 'M78' -Label 'state keeps M78 active history'
Assert-RepoContractContainsAny -Text $checklist -Needles @('M78','M79','master pack marker') -Label 'docs checklist reflects M78 route'
if (-not (ChecklistContractSynced $checklist $toolsChecklist)) { throw 'FAIL tools checklist contract markers synced' }
Write-Host 'OK tools checklist contract markers synced'
Assert-RepoContractContainsAny -Text $runbook -Needles @('saha kabul checklistleri','rol bazli operasyon dogrulama','kanit / proof / kontrol','kabul / red / eksik / tekrar kontrol') -Label 'runbook defines M78 scope'
Assert-RepoContractContainsAny -Text $milestone -Needles @('saha kabul checklistleri','rol bazli operasyon dogrulama','kanit / proof / kontrol omurgasi') -Label 'milestone defines M78 outputs'
Assert-RepoContractContainsAny -Text $roleDoc -Needles @('super_admin','room','company','driver','personel','parent') -Label 'role verification doc covers roles'
Assert-RepoContractContainsAny -Text $proofDoc -Needles @('ekran goruntusu','log/export izi','cihaz / build bilgisi','operator notu') -Label 'proof doc covers evidence types'
Assert-RepoContractContainsAny -Text $flowDoc -Needles @('kabul','red','eksik','tekrar kontrol') -Label 'decision flow doc covers statuses'
$state = Read-RepoContractState -RepoRoot $RepoRoot
Write-Host '=== M78 Repo Contract PASS ==='
