param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")

Write-Host "=== M90C.7 Repo Contract ==="
@(
  "backend\scripts\m90_c7_export_package_hygiene_check.js",
  "tools\pack_m90_c7_export_package_hygiene.ps1",
  "tools\check_m90_c7_export_package_hygiene_repo_contract.ps1",
  "tools\export_shareable_repo_bundle.ps1",
  "tools\_repo_hygiene_preflight.ps1",
  "tools\_packs\_repo_hygiene_preflight.ps1",
  "docs\MILESTONE_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md",
  "docs\RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md",
  "docs\MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md",
  "docs\RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md",
  "docs\SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  "docs\PRIMER_SSOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\NEXT_BACKLOG_V1.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "tools\repo_contract_state.json",
  ".gitignore",
  "backend\data\README.md",
  "backend\data\.gitignore"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m90_c7_export_package_hygiene.ps1"
$check = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\scripts\m90_c7_export_package_hygiene_check.js"
$exportTool = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\export_shareable_repo_bundle.ps1"
$preflight = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\_repo_hygiene_preflight.ps1"
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$scriptGuide = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$gitignore = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath ".gitignore"
$state = Read-RepoContractState -RepoRoot $RepoRoot

Assert-RepoContractContainsAny -Text $pack -Needles @(
  'check_m90_c7_export_package_hygiene_repo_contract.ps1',
  'export_shareable_repo_bundle.ps1',
  'npm run m90c7check',
  'M90C.7 export / package hygiene PACK PASS'
) -Label 'pack wires export tool and node gate'
Assert-RepoContractContainsAny -Text $check -Needles @(
  'repo audit runtime json count remains 0',
  'shareable export tool creates sanitized zip output',
  'M90C.7 EXPORT / PACKAGE HYGIENE CHECK PASS'
) -Label 'node check encodes M90C.7 invariants'
Assert-RepoContractContainsAny -Text $exportTool -Needles @(
  'Compress-Archive',
  'backend/data/*.json',
  'README_M*_OVERLAY*.txt',
  'artifacts\shareable-export'
) -Label 'shareable export tool excludes runtime residue and creates zip'
Assert-RepoContractContainsAny -Text $preflight -Needles @(
  'web\dist',
  'mobile\dist',
  'pack_living_final.log',
  'README_M*_OVERLAY*.txt'
) -Label 'repo hygiene preflight removes safe transient residues'
Assert-RepoContractContainsAny -Text $milestone -Needles @(
  'shareable package',
  'runtime JSON',
  'Satır azaltma en sona'
) -Label 'milestone doc captures export hygiene scope'
Assert-RepoContractContainsAny -Text $runbook -Needles @(
  'export_shareable_repo_bundle.ps1',
  'pack_m90_c7_export_package_hygiene.ps1',
  'shareable export zip'
) -Label 'runbook exposes export and validation order'
Assert-RepoContractContainsAny -Text $primer -Needles @(
  'M90C.7',
  'export / package hygiene closure'
) -Label 'primer tracks M90C.7 as current work'
Assert-RepoContractContainsAny -Text $backlog -Needles @(
  'M90C.7',
  'export / package hygiene closure',
  'pack_m90_c7_export_package_hygiene.ps1'
) -Label 'backlog prioritizes M90C.7 route'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @(
  'M90C.7',
  'pack_m90_c7_export_package_hygiene.ps1'
) -Label 'tools primer exposes M90C.7 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @(
  'M90C.7 export / package hygiene closure',
  'pack_m90_c7_export_package_hygiene.ps1'
) -Label 'tools readme exposes M90C.7 command'
Assert-RepoContractContainsAny -Text $scriptGuide -Needles @(
  'M90C.7',
  'RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md'
) -Label 'script guide exposes M90C.7 pack and runbook'
Assert-RepoContractContainsAny -Text $registry -Needles @(
  'M90C.7',
  'export / package hygiene closure'
) -Label 'registry lists M90C.7'
Assert-RepoContractContainsAny -Text $gitignore -Needles @(
  'web/dist/',
  'pack_living_*.log',
  'README_M*_OVERLAY*.txt'
) -Label '.gitignore blocks export residues'
Assert-RepoContractStateArrayContains -State $state -Property activeMilestones -Expected 'M90C.7' -Label 'state active milestones include M90C.7'
if (-not $state.shareablePackageHygiene) { throw 'FAIL state includes shareablePackageHygiene object' }
Write-Host 'OK state includes shareablePackageHygiene object'

Write-Host "=== M90C.7 Repo Contract PASS ==="
