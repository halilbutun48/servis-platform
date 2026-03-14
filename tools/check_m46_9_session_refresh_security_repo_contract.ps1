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
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  foreach($needle in $needles){
    if ($needle -and $txt.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M46.9 files'
@(
  'backend\scripts\m46_9_session_refresh_security_check.js',
  'tools\pack_m46_9_session_refresh_security.ps1',
  'tools\check_m46_9_session_refresh_security_repo_contract.ps1',
  'docs\RUNBOOK_M46_9_SESSION_REFRESH_SECURITY.md',
  'backend\src\auth\middleware.js',
  'backend\src\routes\auth.js',
  'backend\src\routes\me.js',
  'backend\src\routes\drivers.js',
  'backend\src\server.js',
  'backend\prisma\schema.prisma'
) | ForEach-Object { MustExist $_ }

$runbook = ReadText 'docs\RUNBOOK_M46_9_SESSION_REFRESH_SECURITY.md'
$schema = ReadText 'backend\prisma\schema.prisma'
$auth = ReadText 'backend\src\routes\auth.js'
$mw = ReadText 'backend\src\auth\middleware.js'
$me = ReadText 'backend\src\routes\me.js'
$drivers = ReadText 'backend\src\routes\drivers.js'
$server = ReadText 'backend\src\server.js'
$pack = ReadText 'tools\pack_m46_9_session_refresh_security.ps1'
$runtime = ReadText 'backend\scripts\m46_9_session_refresh_security_check.js'

Write-Host 'INFO Checking runbook'
MustContainText $runbook 'M46.9' 'runbook references M46.9'
MustContainAny $runbook @('Session','Oturum') 'runbook mentions session'
MustContainAny $runbook @('Refresh','refresh') 'runbook mentions refresh'
MustContainAny $runbook @('sv','sessionVersion') 'runbook mentions sv/sessionVersion'

Write-Host 'INFO Checking schema'
MustContainText $schema 'sessionVersion' 'User has sessionVersion'
MustContainText $schema 'model RefreshSession' 'RefreshSession model exists'

Write-Host 'INFO Checking middleware'
MustContainAny $mw @('SESSION_REVOKED','sessionVersion','decoded?.sv') 'middleware validates sv/sessionVersion'

Write-Host 'INFO Checking auth refresh hardening'
MustContainAny $auth @('authRouter.post("/refresh"','authRouter.post("/refresh"') 'refresh endpoint exists'
MustContainAny $auth @('REFRESH_REUSE_DETECTED','AUTH_REFRESH_REUSE_DETECTED') 'refresh reuse detection is logged'
MustContainAny $auth @('enforceMaxRefreshSessions','MAX_REFRESH_SESSIONS_PER_USER') 'refresh session cap helper exists'

Write-Host 'INFO Checking me sessions endpoints'
MustContainText $me '/sessions' 'me has sessions route'
MustContainText $me 'AUTH_SESSION_REVOKE_ALL' 'me revoke-all is audited'

Write-Host 'INFO Checking driver reset invalidation'
MustContainAny $drivers @('sessionVersion','increment') 'driver reset bumps sessionVersion'
MustContainAny $drivers @('refreshSession.updateMany','revokedAt') 'driver reset revokes refresh sessions'

Write-Host 'INFO Checking ws auth sv enforcement'
MustContainAny $server @('tokenSv','sessionVersion','session revoked') 'ws layer validates sessionVersion'

Write-Host 'INFO Checking pack/runtime wiring'
MustContainText $pack 'pack_m46_8_driver_access_hardening.ps1' 'pack chains m46.8 first'
MustContainText $pack 'node scripts/m46_9_session_refresh_security_check.js' 'pack runs m46.9 runtime check'
MustContainAny $runtime @('AUTH_SESSION_REVOKE_ALL','AUTH_REFRESH_REUSE_DETECTED','AUTH_DRIVER_PIN_RESET') 'runtime checks audit actions'

Write-Host 'M46.9 SESSION & REFRESH SECURITY REPO CONTRACT PASS'
