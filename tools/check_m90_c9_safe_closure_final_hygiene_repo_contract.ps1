function Assert-RepoContractContainsNone {
  param([string]$Text,[string[]]$Needles,[string]$Label)
  foreach ($needle in $Needles) {
    if ($Text -match [regex]::Escape($needle)) {
      throw ("FAIL " + $Label + " should not contain " + $needle)
    }
    Write-Host ("OK " + $Label + " omits " + $needle)
  }
}
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
. (Join-Path $PSScriptRoot '_repo_contract_state.ps1')

Write-Host "=== M90C.9 Repo Contract ==="

$required = @(
  'backend/scripts/m90_c9_safe_closure_final_hygiene_check.js',
  'tools/pack_m90_c9_safe_closure_final_hygiene.ps1',
  'tools/check_m90_c9_safe_closure_final_hygiene_repo_contract.ps1',
  'docs/MILESTONE_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md',
  'docs/RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md',
  'docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md',
  'docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md',
  'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md',
  'docs/PRIMER_SSOT.md',
  'docs/MILESTONE_REGISTRY_V1.md',
  'docs/NEXT_BACKLOG_V1.md',
  'tools/README.md',
  'tools/PRIMER_SNAPSHOT.md',
  'tools/repo_contract_state.json',
  'tools/export_shareable_repo_bundle.ps1',
  'package.json',
  'backend/package.json',
  'backend/scripts/run_repo_check_chain.js',
  'backend/scripts/run_web_lint_with_evidence.js',
  'artifacts/lint/README.md'
)
foreach ($path in $required) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $path }

$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/MILESTONE_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md'
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/PRIMER_SSOT.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/NEXT_BACKLOG_V1.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools/PRIMER_SNAPSHOT.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools/README.md'
$scriptGuide = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'
$rootPackage = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'package.json'
$backendPackage = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend/package.json'
$repoChain = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend/scripts/run_repo_check_chain.js'
$exportTool = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools/export_shareable_repo_bundle.ps1'
$state = Read-RepoContractState -RepoRoot $RepoRoot

Assert-RepoContractContainsAll -Text $rootPackage -Needles @('verify:repo','verify:final','verify:ci','verify:closure','run_repo_check_chain.js --phase all','run_repo_check_chain.js --phase closure','run_web_lint_with_evidence.js') -Label 'root package exposes final verify chain and lint evidence writer'
Assert-RepoContractContainsAll -Text $repoChain -Needles @('m90_c9_safe_closure_final_hygiene_check.js','run_web_lint_with_evidence.js','run_m0_latest.js') -Label 'repo check chain exposes final hygiene and repo-wide checks'
Assert-RepoContractContainsAll -Text $backendPackage -Needles @('m90c9check','m90_c9_safe_closure_final_hygiene_check.js') -Label 'backend package exposes M90C.9 node gate'
Assert-RepoContractContainsAll -Text $milestone -Needles @('M90C.9','verify:final','pwsh','export_shareable_repo_bundle.ps1') -Label 'milestone doc captures final hygiene checklist scope'
Assert-RepoContractContainsAll -Text $runbook -Needles @('npm run verify:final','artifacts\lint\web_lint_latest.txt','artifacts/repo-audit/physical_snapshot_hygiene_latest.json','verify:snapshot','pwsh','pack_m90_c7_export_package_hygiene.ps1','export_shareable_repo_bundle.ps1','git status --short') -Label 'runbook exposes final closure order'
Assert-RepoContractContainsAll -Text $primer -Needles @('M90C.9','safe closure','verify:final') -Label 'primer tracks M90C.9 as current work'
Assert-RepoContractContainsAll -Text $backlog -Needles @('M90C.9','safe closure','verify:final') -Label 'backlog prioritizes M90C.9 route'
Assert-RepoContractContainsAll -Text $toolsPrimer -Needles @('M90C.9','verify:final') -Label 'tools primer exposes M90C.9 route'
Assert-RepoContractContainsAll -Text $toolsReadme -Needles @('pack_m90_c9_safe_closure_final_hygiene.ps1','npm run verify:final','pwsh') -Label 'tools readme exposes M90C.9 pack and shell preference'
Assert-RepoContractContainsAll -Text $scriptGuide -Needles @('M90C.9','RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md') -Label 'script guide exposes M90C.9 pack and runbook'
Assert-RepoContractContainsAll -Text $exportTool -Needles @('tar.exe','CreateFromDirectory','prefer pwsh') -Label 'export tool keeps compatibility fallback and pwsh note'
Assert-RepoContractContainsNone -Text $exportTool -Needles @('GetRelativePath(','ConvertFrom-Json -Depth') -Label 'export tool excludes PowerShell 5.1 breaking APIs'
Assert-RepoContractContainsAll -Text ($state | ConvertTo-Json -Depth 20) -Needles @('M90C.9','safeClosureFinalHygiene','safe-closure-final-hygiene-checklist','verify:final','verify:repo','verify:snapshot','pwsh','artifacts/lint/web_lint_latest.txt','artifacts/repo-audit/physical_snapshot_hygiene_latest.json') -Label 'state includes M90C.9 final hygiene policy'

Write-Host "=== M90C.9 Repo Contract PASS ==="
