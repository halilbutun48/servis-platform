param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")

Write-Host "=== M61 SSOT + MILESTONE HIZASI REPO CONTRACT CHECK ==="

@(
  "backend\scripts\m61_ssot_milestone_alignment_check.js",
  "backend\src\ops\ssotAlignmentManifest.js",
  "backend\src\routes\ssotAlignment.js",
  "web\src\panels\superadmin\SsotAlignmentPanel.jsx",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md",
  "docs\MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md",
  "docs\REPO_CONTRACT_MARKER_POLITIKASI_V1.md",
  "tools\pack_m61_ssot_milestone_alignment.ps1",
  "tools\check_m61_ssot_milestone_alignment_repo_contract.ps1",
  "tools\pack_docs_ssot.ps1",
  "tools\check_docs_ssot_repo_contract.ps1",
  "tools\check_m80_m89_contract_sweep.ps1",
  "tools\milestone_pack_manifest.json",
  "README.md",
  "docs\PRIMER_SSOT.md",
  "docs\STARTPACK_V1.md",
  "docs\CHECKLIST_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md",
  "tools\PRIMER_SNAPSHOT.md",
  "tools\CHECKLIST_SSOT.md",
  "tools\README.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$state = Read-RepoContractState -RepoRoot $RepoRoot
Assert-RepoContractStateValue -State $state -Property 'latestMasterPack' -Expected 89 -Label 'state latest master pack is 89'
Assert-RepoContractStateValue -State $state -Property 'latestHistoricalMasterPack' -Expected 79 -Label 'state latest historical master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'stableTo' -Expected 78 -Label 'state stable_to remains 78'
if (-not ([string]$state.nextMilestone).StartsWith('M90')) { throw 'FAIL state next milestone stays inside M90 route' }
Write-Host 'OK state next milestone stays inside M90 route'
Assert-RepoContractStateValue -State $state -Property 'historicalNextMilestone' -Expected 'M80' -Label 'state historical next milestone is M80'
Assert-RepoContractStateValue -State $state -Property 'livingUpperRouteFrom' -Expected 80 -Label 'state living upper route starts at M80'
Assert-RepoContractStateValue -State $state -Property 'livingUpperRouteTo' -Expected 89 -Label 'state living upper route ends at M89'

$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "README.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\STARTPACK_V1.md"
$checklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\CHECKLIST_SSOT.md"
$toolsChecklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\CHECKLIST_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md"
$manifest = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\milestone_pack_manifest.json"
$markerPolicy = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\REPO_CONTRACT_MARKER_POLITIKASI_V1.md"

Assert-RepoContractContainsAny -Text ($readme + "`n" + $primer + "`n" + $startpack) -Needles @("M89","M90","canonical closure","10-10 kapanış") -Label "root docs reflect living M89 to M90 route"
Assert-RepoContractContainsAny -Text ($readme + "`n" + $primer + "`n" + $startpack + "`n" + $registry) -Needles @("M0->M79","historical master","tarihsel tam master anchor") -Label "root docs preserve historical anchor"
Assert-RepoContractContainsAny -Text $checklist -Needles @("M61","M80","M81","M82","M89") -Label "checklist carries active verification markers"
Assert-RepoContractContainsAny -Text $toolsChecklist -Needles @("M61","M80","M81","M82","M89") -Label "tools checklist carries active verification markers"
Assert-RepoContractContainsAny -Text $backlog -Needles @("M90A","M90B","M90C","M90D","M90E") -Label "backlog points to M90 route"
Assert-RepoContractContainsAny -Text $registry -Needles @("M61","M80","M81","M82","M89","M90") -Label "registry lists current official route"
Assert-RepoContractContainsAny -Text $runbook -Needles @("M61","SSOT","milestone","pack") -Label "docs pack runbook defines same roof"
Assert-RepoContractContainsAny -Text $markerPolicy -Needles @("latestHistoricalMasterPack","historicalNextMilestone","docsContractMode","state-first-canonical-history-split") -Label "marker policy defines state-first split"

if (($manifest -match 'pack_docs_ssot\.ps1') -and ($manifest -match 'pack_m80_final_sert_kabul_yuk_guveni\.ps1') -and ($manifest -match 'pack_m81_mobile_saha_sertlestirme\.ps1') -and ($manifest -match 'pack_m82_1_backend_correctness\.ps1') -and ($manifest -match 'pack_m89_settlement_reconciliation_desk\.ps1')) {
  Write-Host "OK manifest contains docs pack and latest stages"
} else {
  throw "FAIL manifest contains docs pack and latest stages"
}

Write-Host "M61 SSOT + MILESTONE HIZASI REPO CONTRACT PASS"

