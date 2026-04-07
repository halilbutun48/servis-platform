param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustContainRegex([string]$txt,[string]$pattern,[string]$label){
  $opts = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline
  if (-not [System.Text.RegularExpressions.Regex]::IsMatch($txt, $pattern, $opts)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M54.3 files'
@(
  'backend\src\services\dispatchRepack.js',
  'backend\src\routes\shifts\room.js',
  'backend\scripts\m54_3_dispatch_approve_repack_check.js',
  'tools\pack_m54_3_dispatch_approve_repack.ps1',
  'tools\check_m54_3_dispatch_approve_repack_repo_contract.ps1',
  'docs\RUNBOOK_M54_3_DISPATCH_APPROVE_REPACK.md'
) | ForEach-Object { MustExist $_ }

$svc = ReadText 'backend\src\services\dispatchRepack.js'
$route = ReadText 'backend\src\routes\shifts\room.js'
$check = ReadText 'backend\scripts\m54_3_dispatch_approve_repack_check.js'
$pack = ReadText 'tools\pack_m54_3_dispatch_approve_repack.ps1'
$runbook = ReadText 'docs\RUNBOOK_M54_3_DISPATCH_APPROVE_REPACK.md'

Write-Host 'INFO Checking dispatch repack helper wiring'
MustContainText $svc 'export async function buildChildPlanFromSlice' 'service exports buildChildPlanFromSlice'
MustContainText $svc 'export async function persistChildPlan' 'service exports persistChildPlan'
MustContainText $svc 'export async function loadFullChildShift' 'service exports loadFullChildShift'
MustContainText $svc 'osrmRoute' 'service uses osrmRoute for path generation'
MustContainText $svc 'estimateOrderedRouteMetrics' 'service computes fallback metrics'

Write-Host 'INFO Checking room route uses shared child plan pipeline'
MustContainText $route 'from "../../services/dispatchRepack.js"' 'room route imports dispatchRepack service'
MustContainText $route 'return buildChildPlanFromSlice({ slice, shift, coordMap });' 'preview uses shared child plan builder'
MustContainText $route 'await persistChildPlan(tx, { childShiftId: child.id, plan });' 'approve persists preview plan'
MustContainText $route 'return loadFullChildShift(tx, child.id);' 'approve reloads full child shift'
MustContainText $route 'const groupKey = splitPlan?.[0]?.groupKey || buildSplitGroupKey(shift.id);' 'groupKey bug fixed'
MustContainRegex $route 'splitPlan:\s*splitPlan\.map\(' 'approve response includes splitPlan mapping'
MustContainText $route 'totalDistanceM: x?.preview?.totalDistanceM ?? null' 'approve response carries preview metrics'

Write-Host 'INFO Checking runtime/pack docs'
MustContainText $check 'dispatch preview ok' 'runtime check validates preview'
MustContainText $check 'auto split approve ok' 'runtime check validates approve'
MustContainText $check 'stop coord matches preview' 'runtime check compares preview vs persisted child stops'
MustContainText $pack 'm54_3_dispatch_approve_repack_check.js' 'pack runs m54.3 runtime script'
MustContainText $runbook 'dispatch-preview' 'runbook explains shared plan goal'; MustContainText $runbook 'auto-split-approve' 'runbook explains shared plan goal'; MustContainText $runbook 'persistChildPlan()' 'runbook explains shared plan goal'

Write-Host 'M54.3 DISPATCH APPROVE + REPACK REPO CONTRACT PASS'
