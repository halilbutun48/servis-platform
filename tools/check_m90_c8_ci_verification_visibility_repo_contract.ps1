param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')

Write-Host "=== M90C.8 Repo Contract ==="

$required = @(
  '.github/workflows/vardis_verification_visibility.yml',
  'backend/scripts/m90_c8_ci_verification_visibility_check.js',
  'tools/pack_m90_c8_ci_verification_visibility.ps1',
  'tools/check_m90_c8_ci_verification_visibility_repo_contract.ps1',
  'docs/MILESTONE_M90C_8_CI_VERIFICATION_VISIBILITY.md',
  'docs/RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md',
  'docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md',
  'docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md',
  'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
  'docs/PRIMER_SSOT.md',
  'docs/MILESTONE_REGISTRY_V1.md',
  'docs/NEXT_BACKLOG_V1.md',
  'tools/README.md',
  'tools/PRIMER_SNAPSHOT.md',
  'tools/repo_contract_state.json',
  'package.json',
  'backend/package.json',
  'backend/scripts/run_repo_check_chain.js',
  'backend/scripts/run_web_lint_with_evidence.js',
  'artifacts/lint/README.md'
)
foreach ($path in $required) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $path }

$workflow = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath '.github/workflows/vardis_verification_visibility.yml'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/MILESTONE_M90C_8_CI_VERIFICATION_VISIBILITY.md'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md'
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/PRIMER_SSOT.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/NEXT_BACKLOG_V1.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools/PRIMER_SNAPSHOT.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools/README.md'
$scriptGuide = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'
$rootPackage = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'package.json'
$backendPackage = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend/package.json'
$repoChain = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend/scripts/run_repo_check_chain.js'
$state = Read-RepoContractState -RepoRoot $RepoRoot

Assert-RepoContractContainsAll -Text $workflow -Needles @('repo-verification','shareable-export','npm run verify:ci','pack_m90_c7_export_package_hygiene.ps1','web_lint_latest.txt','upload-artifact@v4') -Label 'workflow wires repo verification, web lint and shareable export evidence'
Assert-RepoContractContainsAll -Text $workflow -Needles @('push','pull_request','workflow_dispatch','ubuntu-latest','windows-latest') -Label 'workflow exposes trigger and runner visibility'
Assert-RepoContractContainsAll -Text $rootPackage -Needles @('verify:repo','verify:ci','verify:closure','run_repo_check_chain.js --phase all','run_repo_check_chain.js --phase closure','run_web_lint_with_evidence.js') -Label 'root package exposes canonical verify chain and web lint evidence writer'
Assert-RepoContractContainsAll -Text $repoChain -Needles @('m90_b1_canonical_closure_gate_check.js','repo_audit.js','m90_c6_hot_file_queue_policy_check.js','m90_c7_export_package_hygiene_check.js','m90_c8_ci_verification_visibility_check.js') -Label 'repo check chain exposes closure gates and repo audit'
Assert-RepoContractContainsAll -Text $backendPackage -Needles @('m90c8check','m90_c8_ci_verification_visibility_check.js') -Label 'backend package exposes M90C.8 node gate'
Assert-RepoContractContainsAll -Text $milestone -Needles @('M90C.8','CI / verification visibility','npm run verify:ci','.github/workflows/vardis_verification_visibility.yml') -Label 'milestone doc captures CI / verification visibility scope'
Assert-RepoContractContainsAll -Text $runbook -Needles @('npm run verify:ci','pack_m90_c8_ci_verification_visibility.ps1','pack_m90_c7_export_package_hygiene.ps1') -Label 'runbook exposes local and CI verification order'
Assert-RepoContractContainsAll -Text $primer -Needles @('M90C.8','CI / verification visibility') -Label 'primer preserves M90C.8 CI visibility record'
Assert-RepoContractContainsAll -Text $backlog -Needles @('M90C.8','CI / verification visibility') -Label 'backlog preserves M90C.8 route record'
Assert-RepoContractContainsAll -Text $toolsPrimer -Needles @('M90C.8','CI / verification visibility') -Label 'tools primer exposes M90C.8 route'
Assert-RepoContractContainsAll -Text $toolsReadme -Needles @('pack_m90_c8_ci_verification_visibility.ps1','npm run verify:ci') -Label 'tools readme exposes M90C.8 pack and root verify command'
Assert-RepoContractContainsAll -Text $scriptGuide -Needles @('M90C.8','RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md') -Label 'script guide exposes M90C.8 pack and runbook'
Assert-RepoContractContainsAll -Text ($state | ConvertTo-Json -Depth 20) -Needles @('M90C.8','ciVerificationVisibility','repo-native-ci-verification-visibility','artifacts/lint/web_lint_latest.txt','npm run lint:web') -Label 'state includes M90C.8 CI visibility policy'

Write-Host "=== M90C.8 Repo Contract PASS ==="
