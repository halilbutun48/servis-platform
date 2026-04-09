param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M82.8 Repo Contract ==="
@(
  "mobile\package.json",
  "mobile\scripts\m82_8_verification_2_0_check.js",
  "web\scripts\m82_8_company_shifts_runtime_guard_check.cjs",
  "tools\pack_m82_8_verification_2_0.ps1",
  "tools\check_m82_8_verification_2_0_repo_contract.ps1",
  "docs\RUNBOOK_M82_8_VERIFICATION_2_0.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$pkg = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\package.json"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M82_8_VERIFICATION_2_0.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m82_8_verification_2_0.ps1"

Assert-RepoContractContainsAny -Text $pkg -Needles @('check:m82.8','acceptance:mobile','doctor:mobile') -Label 'mobile package exposes M82.8 verification entrypoints'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M82.8','acceptance:mobile','m82_8_company_shifts_runtime_guard_check.cjs','pack_m82_8_verification_2_0.ps1') -Label 'runbook captures M82.8 command route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m82_8_verification_2_0.ps1','M82.8') -Label 'tools readme exposes M82.8 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M82.8' -Descriptors @('verification 2.0','pack_m82_8_verification_2_0.ps1') -Label 'tools primer exposes M82.8 route'
Assert-RepoContractContainsAny -Text $registry -Needles @('M82.8','Verification 2.0','verification 2.0') -Label 'registry lists M82.8'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M82.8' -Descriptors @('verification 2.0') -Label 'primer lists M82.8'
Assert-RepoContractContainsAny -Text $backlog -Needles @("M82.8","M82.9","M82.10","M82.11","M83","M84","M85","M86","M87","M88","M89","M90","living route") -Label 'backlog lists M82.8'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m82_8_verification_2_0_repo_contract.ps1','m82_8_verification_2_0_check.js','m82_8_company_shifts_runtime_guard_check.cjs','M82.8 VERIFICATION 2.0 PACK PASS OK') -Label 'pack wires repo contract and verification guards'

Write-Host "=== M82.8 Repo Contract PASS ==="

