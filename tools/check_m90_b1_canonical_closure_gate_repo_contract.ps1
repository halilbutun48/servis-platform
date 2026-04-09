param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")

Write-Host "=== M90B.1 Repo Contract ==="
@(
  "backend\scripts\m90_b1_canonical_closure_gate_check.js",
  "tools\pack_m90_b1_canonical_closure_gate.ps1",
  "tools\check_m90_b1_canonical_closure_gate_repo_contract.ps1",
  "docs\MILESTONE_M90B_1_EXECUTABLE_CLOSURE_GATE.md",
  "docs\RUNBOOK_M90B_1_EXECUTABLE_CLOSURE_GATE.md",
  "docs\MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md",
  "docs\RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md",
  "docs\SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  "docs\PRIMER_SSOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\NEXT_BACKLOG_V1.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "tools\repo_contract_state.json"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m90_b1_canonical_closure_gate.ps1"
$check = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\scripts\m90_b1_canonical_closure_gate_check.js"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md"
$milestoneB1 = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_M90B_1_EXECUTABLE_CLOSURE_GATE.md"
$runbookB1 = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M90B_1_EXECUTABLE_CLOSURE_GATE.md"
$scriptGuide = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"
$state = Read-RepoContractState -RepoRoot $RepoRoot

Assert-RepoContractContainsAny -Text $pack -Needles @('check_m90_b1_canonical_closure_gate_repo_contract.ps1','npm run m90b1check','M90B.1 canonical closure gate PACK PASS') -Label 'pack wires repo contract and node gate'
Assert-RepoContractContainsAny -Text $check -Needles @('repo audit keeps hot file warning threshold','dead helpComposer split remnants are absent','M90B.1 CANONICAL CLOSURE GATE CHECK PASS') -Label 'node check encodes M90B.1 invariants'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m90_b1_canonical_closure_gate.ps1','M90B.1') -Label 'tools readme exposes M90B.1 route'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @('M90B.1','pack_m90_b1_canonical_closure_gate.ps1') -Label 'tools primer exposes M90B.1 route'
Assert-RepoContractContainsAny -Text $primer -Needles @('M90B.1','closure gate') -Label 'primer tracks M90B.1 closure gate'
Assert-RepoContractContainsAny -Text $registry -Needles @('M90B.1','executable closure gate') -Label 'registry lists M90B.1'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M90B.1','executable closure gate') -Label 'backlog prioritizes M90B.1'
Assert-RepoContractContainsAny -Text $milestone -Needles @('M90B.1','pack_m90_b1_canonical_closure_gate.ps1') -Label 'M90 milestone doc binds M90B.1 command'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M90B.1','pack_m90_b1_canonical_closure_gate.ps1') -Label 'M90 runbook binds M90B.1 command'
Assert-RepoContractContainsAny -Text $milestoneB1 -Needles @('M90B.1','docs/state/pack/verify convergence','M0->M89 green') -Label 'M90B.1 milestone doc captures purpose'
Assert-RepoContractContainsAny -Text $runbookB1 -Needles @('tools\pack.ps1 -To 89','tools\pack_m90_b1_canonical_closure_gate.ps1','REPO AUDIT MASTER PASS') -Label 'M90B.1 runbook exposes command order'
Assert-RepoContractContainsAny -Text $scriptGuide -Needles @('M90B.1','pack_m90_b1_canonical_closure_gate.ps1') -Label 'script guide exposes M90B.1 command'
Assert-RepoContractStateValue -State $state -Property latestMasterPack -Expected 89 -Label 'state latestMasterPack remains 89'
Assert-RepoContractStateArrayContains -State $state -Property activeMilestones -Expected 'M90B.1' -Label 'state active milestones include M90B.1'

$deadFiles = @(
  'backend\src\ai\chat\helpComposerFlowSupport.js',
  'backend\src\ai\chat\helpComposerEntitySupport.js',
  'backend\src\ai\chat\helpComposerSelectedSupport.js'
)
foreach ($rel in $deadFiles) {
  if (Test-Path (Join-Path $RepoRoot $rel)) { throw "FAIL dead split remnant still exists: $rel" }
}
Write-Host 'OK dead helpComposer split remnants stay deleted'

Write-Host "=== M90B.1 Repo Contract PASS ==="
