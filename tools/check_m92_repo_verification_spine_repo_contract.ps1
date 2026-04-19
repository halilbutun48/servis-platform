param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")

Write-Host "=== M92 Repo Verification Spine Contract ==="

$required = @(
  "backend/scripts/run_repo_check_chain.js",
  "backend/scripts/run_m0_latest.js",
  "backend/scripts/m92_repo_verification_spine_check.js",
  "tools/check-repo.ps1",
  "tools/pack_m92_repo_verification_spine.ps1",
  "tools/check_m92_repo_verification_spine_repo_contract.ps1",
  "docs/MILESTONE_M92_REPO_VERIFICATION_SPINE.md",
  "docs/RUNBOOK_M92_REPO_VERIFICATION_SPINE.md",
  "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  "tools/README.md",
  "tools/milestone_pack_manifest.json",
  "tools/repo_contract_state.json",
  "package.json",
  "backend/package.json"
)
foreach ($path in $required) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $path }

$rootPackage = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "package.json"
$backendPackage = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend/package.json"
$chain = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend/scripts/run_repo_check_chain.js"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs/RUNBOOK_M92_REPO_VERIFICATION_SPINE.md"
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs/MILESTONE_M92_REPO_VERIFICATION_SPINE.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools/README.md"
$scriptGuide = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"
$manifest = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools/milestone_pack_manifest.json"
$state = Read-RepoContractState -RepoRoot $RepoRoot

Assert-RepoContractContainsAll -Text $rootPackage -Needles @(
  "verify:repo",
  "run_repo_check_chain.js --phase all",
  "verify:ci",
  "verify:final",
  "verify:milestones"
) -Label "root package exposes single repo verification entry"
Assert-RepoContractContainsAll -Text $backendPackage -Needles @(
  "repo:check",
  "m92check",
  "m92_repo_verification_spine_check.js"
) -Label "backend package exposes M92 aliases"
Assert-RepoContractContainsAll -Text $chain -Needles @(
  "defaultPhaseOrder",
  "lint",
  "docs",
  "hot",
  "web-contract",
  "closure",
  "milestones",
  "repo_audit.js",
  "run_m0_latest.js"
) -Label "repo chain captures ordered verification phases"
Assert-RepoContractContainsAll -Text ($runbook + "`n" + $milestone + "`n" + $toolsReadme + "`n" + $scriptGuide) -Needles @(
  "M92",
  "repo verification spine",
  "npm run verify:repo",
  "run_repo_check_chain.js"
) -Label "docs expose M92 repo verification spine"
Assert-RepoContractContainsAll -Text $manifest -Needles @(
  '"id": "M91"',
  '"id": "M92"',
  "pack_m92_repo_verification_spine.ps1"
) -Label "manifest includes M91 and M92"
Assert-RepoContractContainsAll -Text ($state | ConvertTo-Json -Depth 20) -Needles @(
  "M91",
  "M92",
  "repoVerificationSpine",
  "npm run verify:repo",
  "backend/scripts/run_repo_check_chain.js"
) -Label "state includes repo verification spine policy"

Push-Location (Join-Path $RepoRoot "backend")
try {
  npm run m92check
  if (-not $?) { throw "M92 repo verification spine check failed." }
} finally {
  Pop-Location
}

Write-Host "=== M92 Repo Verification Spine Contract PASS ==="
