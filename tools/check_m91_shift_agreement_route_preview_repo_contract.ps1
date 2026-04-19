param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

$required = @(
  "backend/scripts/m91_company_agreement_from_shift_only_check.js",
  "backend/scripts/m91_prefill_route_preview_propagation_check.js",
  "backend/scripts/m91_generated_shift_preview_source_root_fix_check.js",
  "backend/scripts/m91b_agreement_negotiation_parity_check.js",
  "backend/scripts/m91c_shift_to_agreement_prefill_check.js",
  "backend/scripts/m91c_shift_origin_link_check.js",
  "backend/scripts/m91c_linked_shift_disable_convert_check.js",
  "backend/scripts/m91d_agreement_operations_bridge_check.js",
  "backend/scripts/m91ef_draft_slot_hardening_check.js",
  "backend/scripts/_m91_route_preview_checks.js",
  "backend/scripts/run_m91_route_preview_checks.js",
  "docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md",
  "docs/MILESTONE_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md"
)
foreach ($path in $required) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $path }

$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md"
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs/MILESTONE_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md"
$package = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend/package.json"

Assert-RepoContractContainsAll -Text ($runbook + "`n" + $milestone) -Needles @(
  "M91",
  "Rota Onizleme",
  "vardiya",
  "sozlesme",
  "npm --prefix backend run m91check"
) -Label "M91 docs expose route preview acceptance chain"
Assert-RepoContractContainsAll -Text $package -Needles @("m91check","run_m91_route_preview_checks.js","m91:milestones","--from M91","--to M91") -Label "backend package exposes M91 family aliases"

Push-Location (Join-Path $RepoRoot "backend")
try {
  npm run m91check
  if (-not $?) { throw "M91 repo contract failed." }
} finally {
  Pop-Location
}
