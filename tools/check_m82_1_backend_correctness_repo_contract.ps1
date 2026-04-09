param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M82.1 Repo Contract ==="
@(
  "backend\scripts\m82_1_correctness_guard_check.js",
  "backend\src\services\shiftRouteState.js",
  "backend\src\errors\http.js",
  "backend\src\middleware\asyncHandler.js",
  "backend\src\routes\organization.js",
  "backend\src\routes\shifts\company.js",
  "backend\src\routes\shifts\people.js",
  "backend\src\routes\shifts\room.js",
  "backend\src\utils\responseCache.js",
  "tools\pack_m82_1_backend_correctness.ps1",
  "tools\check_m82_1_backend_correctness_repo_contract.ps1",
  "docs\RUNBOOK_M82_1_BACKEND_CORRECTNESS.md",
  "docs\PRIMER_SSOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\NEXT_BACKLOG_V1.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$guard = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\scripts\m82_1_correctness_guard_check.js"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m82_1_backend_correctness.ps1"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M82_1_BACKEND_CORRECTNESS.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$responseCache = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\utils\responseCache.js"
$routeState = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\services\shiftRouteState.js"
$room = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\shifts\room.js"
$people = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\shifts\people.js"

Assert-RepoContractContainsAny -Text $guard -Needles @('route-preview auth/scope check runs before cache read','room write flows clear preview cache after mutation','room suggestion stop accept rebuilds route state') -Label 'guard encodes core M82.1 correctness invariants'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m82_1_backend_correctness_repo_contract.ps1','m82_1_correctness_guard_check.js','M82.1 BACKEND CORRECTNESS PACK PASS OK') -Label 'pack wires repo contract and guard'
Assert-RepoContractContainsAny -Text $runbook -Needles @('route-preview auth check cache', 'shift route preview cache', 'tools\\pack.ps1 -To 82', 'M82.1 CORRECTNESS GUARD CHECK PASS') -Label 'runbook captures M82.1 purpose and command path'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m82_1_backend_correctness.ps1','tools\pack.ps1 -To 82','M82.1') -Label 'tools readme exposes M82.1 pack route'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M82.1' -Descriptors @('backend correctness kilidi','pack_m82_1_backend_correctness.ps1','tools\pack.ps1 -To 82') -Label 'tools primer exposes M82.1 route'
$primerHasDirectM821Scope = (Test-RepoContractContainsAny -Text $primer -Needles @('M82.1')) -and (Test-RepoContractContainsAny -Text $primer -Needles @('backend correctness kilidi','merkezi error contract'))
$primerHasLaterLivingRoute = (Test-RepoContractContainsAny -Text $primer -Needles @('M82.8','Verification 2.0')) -or (Test-RepoContractContainsAny -Text $primer -Needles @('M82.9','dormant payment backbone')) -or (Test-RepoContractContainsAny -Text $primer -Needles @('M82.10','super admin ticari ayarlar')) -or (Test-RepoContractContainsAny -Text $primer -Needles @('M82.11','payment readonly')) -or (Test-RepoContractContainsAny -Text $primer -Needles @('M83','saha hazirlik')) -or (Test-RepoContractContainsAny -Text $primer -Needles @('M84','saha geri bildirim')) -or (Test-RepoContractContainsAny -Text $primer -Needles @('M85','opsiyonel odeme pilotu'))
if ($primerHasDirectM821Scope -or $primerHasLaterLivingRoute) {
  Write-Host 'OK primer tracks M82.1 scope or later living route'
} else {
  throw 'FAIL primer tracks M82.1 scope or later living route'
}
Assert-RepoContractContainsAny -Text $registry -Needles @('M82.1','Backend correctness kilidi') -Label 'registry lists M82.1'
Assert-RepoContractContainsAny -Text $backlog -Needles @("M82.1","M82.8","M82.9","M82.10","M82.11","M83","M84","M85","M86","M87","M88","M89","M90","living route") -Label 'backlog still points to M82.1'
Assert-RepoContractContainsAny -Text $responseCache -Needles @('clearResponseCacheExact','clearResponseCacheByPrefix') -Label 'response cache exposes safe invalidation helpers'
Assert-RepoContractContainsAny -Text $routeState -Needles @('clearShiftRoutePreviewCache','rebuildShiftRouteStateBestEffort','rebuildShiftRouteState') -Label 'route state service exposes rebuild and preview invalidation'
Assert-RepoContractContainsAny -Text $room -Needles @('rebuildShiftRouteStateBestEffort','clearShiftRoutePreviewCache','sendErrorResponse') -Label 'room routes use central correctness helpers'
Assert-RepoContractContainsAny -Text $people -Needles @('getShiftAndCheckScopeOrThrow','rememberResponse','clearShiftRoutePreviewCache') -Label 'people preview route keeps auth-before-cache and invalidation hooks'

Write-Host "=== M82.1 Repo Contract PASS ==="

