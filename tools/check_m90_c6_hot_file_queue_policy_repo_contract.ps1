param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")

Write-Host "=== M90C.6 Repo Contract ==="
@(
  "backend\scripts\m90_c6_hot_file_queue_policy_check.js",
  "tools\pack_m90_c6_hot_file_queue_policy.ps1",
  "tools\check_m90_c6_hot_file_queue_policy_repo_contract.ps1",
  "docs\MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md",
  "docs\RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md",
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

$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m90_c6_hot_file_queue_policy.ps1"
$check = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\scripts\m90_c6_hot_file_queue_policy_check.js"
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$scriptGuide = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$state = Read-RepoContractState -RepoRoot $RepoRoot

Assert-RepoContractContainsAny -Text $pack -Needles @(
  'check_m90_c6_hot_file_queue_policy_repo_contract.ps1',
  'node backend/scripts/repo_audit.js',
  'npm run m90c6check',
  'M90C.6 hot-file queue policy PACK PASS'
) -Label 'pack wires repo audit rerun and node gate'
Assert-RepoContractContainsAny -Text $check -Needles @(
  'repo audit large file count remains 3',
  'policy classification set matches repo audit hot/large file set exactly',
  'M90C.6 HOT-FILE QUEUE POLICY CHECK PASS'
) -Label 'node check encodes M90C.6 invariants'
Assert-RepoContractContainsAny -Text $milestone -Needles @(
  'justified exception',
  'safe candidate review',
  'acceptance-sensitive / later'
) -Label 'milestone doc captures the three queue classes'
Assert-RepoContractContainsAny -Text $runbook -Needles @(
  'repo_audit.js',
  'pack_m90_c6_hot_file_queue_policy.ps1',
  'Policy siniflari'
) -Label 'runbook exposes audit and policy command order'
Assert-RepoContractContainsAny -Text $primer -Needles @(
  'M90C.6',
  'hot-file queue policy'
) -Label 'primer preserves M90C.6 hot-file queue policy record'
Assert-RepoContractContainsAny -Text $backlog -Needles @(
  'M90C.6',
  'hot-file queue policy',
  'pack_m90_c6_hot_file_queue_policy.ps1'
) -Label 'backlog preserves M90C.6 route record'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @(
  'M90C.6',
  'pack_m90_c6_hot_file_queue_policy.ps1'
) -Label 'tools primer exposes M90C.6 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @(
  'M90C.6 hot-file queue policy',
  'pack_m90_c6_hot_file_queue_policy.ps1'
) -Label 'tools readme exposes M90C.6 command'
Assert-RepoContractContainsAny -Text $scriptGuide -Needles @(
  'M90C.6',
  'RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md'
) -Label 'script guide exposes M90C.6 pack and runbook'
Assert-RepoContractContainsAny -Text $registry -Needles @(
  'M90C.6',
  'hot-file queue policy'
) -Label 'registry lists M90C.6'
Assert-RepoContractStateArrayContains -State $state -Property activeMilestones -Expected 'M90C.6' -Label 'state active milestones include M90C.6'
if (-not $state.hotFileQueuePolicy) { throw 'FAIL state includes hotFileQueuePolicy object' }
Write-Host 'OK state includes hotFileQueuePolicy object'

Write-Host "=== M90C.6 Repo Contract PASS ==="
