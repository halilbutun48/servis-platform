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
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ($txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  foreach($needle in $needles){
    if ($needle -and $txt.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}

Write-Host 'INFO Checking M47.2 files'
@(
  'backend\src\ops\capacityLoadBaseline.js',
  'backend\src\routes\admin.js',
  'backend\src\server.js',
  'backend\src\bootstrap\rateLimits.js',
  'backend\src\env.js',
  'backend\scripts\m47_2_capacity_load_baseline_check.js',
  'tools\pack_m47_2_capacity_load_baseline.ps1',
  'tools\check_m47_2_capacity_load_baseline_repo_contract.ps1',
  'docs\RUNBOOK_M47_2_CAPACITY_LOAD_BASELINE.md'
) | ForEach-Object { MustExist $_ }

$ops = ReadText 'backend\src\ops\capacityLoadBaseline.js'
$admin = ReadText 'backend\src\routes\admin.js'
$server = ReadText 'backend\src\server.js'
$env = ReadText 'backend\src\env.js'
$runtime = ReadText 'backend\scripts\m47_2_capacity_load_baseline_check.js'
$pack = ReadText 'tools\pack_m47_2_capacity_load_baseline.ps1'
$runbook = ReadText 'docs\RUNBOOK_M47_2_CAPACITY_LOAD_BASELINE.md'

Write-Host 'INFO Checking capacity baseline core'
MustContainAny $ops @('getCapacityPolicySummary','getCapacitySnapshot') 'capacity ops exports summary + snapshot'
MustContainText $ops 'avgRequestsPerMinute' 'capacity snapshot computes avg rpm'
MustContainText $ops 'ratio429Pct' 'capacity snapshot computes 429 ratio'
MustContainText $ops 'eventLoopLagMs' 'capacity snapshot exposes event loop lag'

Write-Host 'INFO Checking admin + server wiring'
MustContainText $admin '/capacity/policy' 'admin exposes capacity policy endpoint'
MustContainText $admin '/capacity/snapshot' 'admin exposes capacity snapshot endpoint'
MustContainAny $server @('capacityRequestStarted','getCapacityHealthSummary') 'server wires request + health capacity hooks'
MustContainText $server 'capacityWsConnected' 'server wires ws capacity hooks'
MustContainText $env 'CAPACITY_BASELINE_WINDOW_MINUTES' 'env exposes capacity baseline vars'

Write-Host 'INFO Checking pack/runtime/runbook'
MustNotContainText $pack 'pack_m47_kvkk_notice_consent_framework.ps1' 'pack is self-only and does not chain m47'
MustContainText $pack 'node scripts/m47_2_capacity_load_baseline_check.js' 'pack runs m47.2 runtime check'
MustContainAny $runtime @('/api/admin/capacity/policy','/api/admin/capacity/snapshot') 'runtime checks capacity endpoints'
MustContainAny $runbook @('capacity','kapasite') 'runbook mentions capacity baseline'
MustContainAny $runbook @('429','p95') 'runbook mentions load indicators'

Write-Host 'M47.2 CAPACITY & LOAD BASELINE REPO CONTRACT PASS'
