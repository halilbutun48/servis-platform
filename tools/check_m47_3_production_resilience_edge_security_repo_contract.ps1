param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'

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
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  foreach($needle in $needles){
    if ($needle -and $txt.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}

Write-Host 'INFO Checking M47.3 files'
@(
  'backend\src\ops\edgeSecurityBaseline.js',
  'backend\src\routes\admin.js',
  'backend\src\server.js',
  'backend\src\env.js',
  'backend\src\middleware\apiRequestLog.js',
  'backend\scripts\m47_3_production_resilience_edge_security_check.js',
  'tools\pack_m47_3_production_resilience_edge_security.ps1',
  'tools\check_m47_3_production_resilience_edge_security_repo_contract.ps1',
  'docs\RUNBOOK_M47_3_PRODUCTION_RESILIENCE_EDGE_SECURITY.md',
  '.env.example',
  'infra\docker-compose.yml'
) | ForEach-Object { MustExist $_ }

$ops = ReadText 'backend\src\ops\edgeSecurityBaseline.js'
$admin = ReadText 'backend\src\routes\admin.js'
$server = ReadText 'backend\src\server.js'
$env = ReadText 'backend\src\env.js'
$reqlog = ReadText 'backend\src\middleware\apiRequestLog.js'
$runtime = ReadText 'backend\scripts\m47_3_production_resilience_edge_security_check.js'
$pack = ReadText 'tools\pack_m47_3_production_resilience_edge_security.ps1'
$runbook = ReadText 'docs\RUNBOOK_M47_3_PRODUCTION_RESILIENCE_EDGE_SECURITY.md'
$envExample = ReadText '.env.example'
$compose = ReadText 'infra\docker-compose.yml'

Write-Host 'INFO Checking edge security core'
MustContainAny $ops @('edgeRequestContext','edgeSecurityGuard') 'edge ops exports request context + guard'
MustContainText $ops 'x-request-id' 'edge ops sets request id header'
MustContainText $ops 'TRACE_METHOD_BLOCKED' 'edge ops blocks TRACE'
MustContainText $ops 'SUSPICIOUS_USER_AGENT' 'edge ops blocks suspicious user agents'

Write-Host 'INFO Checking admin + server wiring'
MustContainText $admin '/edge-security/policy' 'admin exposes edge security policy endpoint'
MustContainText $admin '/edge-security/snapshot' 'admin exposes edge security snapshot endpoint'
MustContainText $server 'edgeRequestContext' 'server wires edge request context'
MustContainText $server 'edgeSecurityGuard' 'server wires edge security guard'
MustContainText $server 'edgeSecurity: getEdgeSecurityHealthSummary()' 'health exposes edge security summary'
MustContainText $reqlog 'req.edgeClientIp' 'api request log uses edge client ip'
MustContainText $env 'EDGE_SECURITY_ENABLED' 'env exposes edge security vars'
MustContainText $env 'TRUST_PROXY_HOPS' 'env exposes trust proxy hops'
MustContainText $envExample 'EDGE_SECURITY_ENABLED=1' 'env example documents edge vars'
MustContainText $compose 'EDGE_SECURITY_ENABLED' 'docker compose passes edge vars'

Write-Host 'INFO Checking pack/runtime/runbook'
MustContainText $pack 'pack_m47_2_capacity_load_baseline.ps1' 'pack chains m47.2 first'
MustContainText $pack 'node scripts/m47_3_production_resilience_edge_security_check.js' 'pack runs m47.3 runtime check'
MustContainAny $runtime @('/api/admin/edge-security/policy','/api/admin/edge-security/snapshot') 'runtime checks edge security endpoints'
MustContainText $runtime 'sqlmap/1.7' 'runtime checks suspicious ua block'
MustContainText $runtime 'TRACE' 'runtime checks trace method block'
MustContainAny $runbook @('request id','x-request-id') 'runbook mentions request id'
MustContainAny $runbook @('TRACE','sqlmap') 'runbook mentions edge blocking behavior'

Write-Host 'M47.3 PRODUCTION RESILIENCE + EDGE SECURITY REPO CONTRACT PASS'
