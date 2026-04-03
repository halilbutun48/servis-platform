param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M61 SSOT + MILESTONE HIZASI REPO CONTRACT CHECK ==="

@(
  "backend\scripts\m61_ssot_milestone_alignment_check.js",
  "backend\src\ops\ssotAlignmentManifest.js",
  "backend\src\routes\ssotAlignment.js",
  "web\src\panels\superadmin\SsotAlignmentPanel.jsx",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md",
  "docs\MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md",
  "tools\pack_m61_ssot_milestone_alignment.ps1",
  "tools\check_m61_ssot_milestone_alignment_repo_contract.ps1",
  "tools\pack_docs_ssot.ps1",
  "tools\check_docs_ssot_repo_contract.ps1",
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

$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "README.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$startpack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\STARTPACK_V1.md"
$checklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\CHECKLIST_SSOT.md"
$toolsChecklist = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\CHECKLIST_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md"
$manifest = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\milestone_pack_manifest.json"

Assert-RepoContractContainsAny -Text $readme -Needles @("M61","M80","M81","M82") -Label "root readme reflects living route"
Assert-RepoContractContainsAny -Text $primer -Needles @("M61","M80","M81","M82","mobil saha sertle") -Label "primer reflects living route"
Assert-RepoContractContainsAny -Text $startpack -Needles @("M61","M80","M81","M82","mobil saha sertle") -Label "startpack reflects living route"
Assert-RepoContractContainsAny -Text $checklist -Needles @("M61","M80","M81") -Label "checklist carries compatible route markers"
Assert-RepoContractContainsAny -Text $toolsChecklist -Needles @("M61","M80","M81") -Label "tools checklist carries compatible route markers"
Assert-RepoContractContainsAny -Text $backlog -Needles @("M80","M81","M82","mobil saha sertle") -Label "backlog points to living route"
Assert-RepoContractContainsAny -Text $registry -Needles @("M61","M80","M81","M82","mobil saha sertle") -Label "registry lists current official route"
Assert-RepoContractContainsAny -Text $runbook -Needles @("M61","SSOT","milestone","pack") -Label "docs pack runbook defines same roof"

if (($manifest -match 'pack_docs_ssot\.ps1') -and ($manifest -match 'pack_m80_final_sert_kabul_yuk_guveni\.ps1') -and ($manifest -match 'pack_m81_mobile_saha_sertlestirme\.ps1')) {
  Write-Host "OK manifest contains docs pack and latest stages"
} else {
  throw "FAIL manifest contains docs pack and latest stages"
}

Write-Host "M61 SSOT + MILESTONE HIZASI REPO CONTRACT PASS"
