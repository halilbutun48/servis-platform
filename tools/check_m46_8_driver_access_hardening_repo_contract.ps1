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
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ($txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M46.8 files'
@(
  'backend\scripts\m46_8_driver_access_hardening_check.js',
  'tools\pack_m46_8_driver_access_hardening.ps1',
  'tools\check_m46_8_driver_access_hardening_repo_contract.ps1',
  'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md',
  'backend\src\auth\driverAccessGuard.js',
  'backend\src\routes\auth.js',
  'backend\src\routes\drivers.js',
  'backend\src\server.js',
  'web\src\api.js'
) | ForEach-Object { MustExist $_ }

$runbook = ReadText 'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md'
$guard = ReadText 'backend\src\auth\driverAccessGuard.js'
$auth = ReadText 'backend\src\routes\auth.js'
$drivers = ReadText 'backend\src\routes\drivers.js'
$server = ReadText 'backend\src\server.js'
$api = ReadText 'web\src\api.js'
$pack = ReadText 'tools\pack_m46_8_driver_access_hardening.ps1'
$runtime = ReadText 'backend\scripts\m46_8_driver_access_hardening_check.js'

Write-Host 'INFO Checking runbook'
MustContainAny $runbook @('M46.8-A','Login / PIN Abuse Guard') 'runbook has sub-scope A'
MustContainAny $runbook @('M46.8-B','PIN Policy + Reset Hygiene') 'runbook has sub-scope B'
MustContainAny $runbook @('M46.8-C','Auth Audit Strengthening') 'runbook has sub-scope C'
MustContainAny $runbook @('M46.8-D','Device Trust Lite') 'runbook has sub-scope D'
MustContainAny $runbook @('PIN_LOCKED','cooldownSec') 'runbook mentions lock response'

Write-Host 'INFO Checking access guard helper'
MustContainText $guard 'registerDriverPinFailure' 'guard can register failures'
MustContainText $guard 'getDriverPinLockState' 'guard can read lock state'
MustContainText $guard 'clearDriverPinFailureState' 'guard can clear failure state'
MustContainText $guard 'validateNewDriverPin' 'guard validates new pin'
MustContainAny $guard @('minLength: 6','minLength = 6') 'guard enforces min pin length'

Write-Host 'INFO Checking auth route hardening'
MustContainText $auth 'AUTH_DRIVER_PIN_LOCKED' 'auth logs pin locked'
MustContainText $auth 'getDriverPinLockState' 'auth reads lock state'
MustContainText $auth 'registerDriverPinFailure' 'auth registers failure count'
MustContainText $auth 'clearDriverPinFailureState' 'auth clears failure state'
MustContainText $auth 'validateNewDriverPin' 'auth uses pin policy validation'
MustContainAny $auth @('code: "PIN_LOCKED"','code: ''PIN_LOCKED''') 'auth returns pin locked code'
MustContainAny $auth @('INVALID_CREDENTIALS','Kimlik bilgileri hatalı','Invalid credentials') 'auth returns user friendly invalid message'

Write-Host 'INFO Checking driver reset hygiene'
MustContainText $drivers 'AUTH_DRIVER_PIN_RESET' 'drivers route audits pin reset'
MustContainText $drivers 'clearDriverPinFailureState' 'drivers route clears failure state on reset'

Write-Host 'INFO Checking server limiter wiring'
MustContainAny $server @('identifier:${identifier}','identifier:${ identifier }') 'login limiter keyed by identifier'
MustContainText $server 'app.use("/api/auth/refresh", authActionLimiter);' 'refresh uses auth action limiter'
MustContainText $server 'app.use("/api/auth/logout", authActionLimiter);' 'logout uses auth action limiter'
MustContainText $server 'app.use("/api/auth/driver/change-pin", authActionLimiter);' 'change-pin uses auth action limiter'

Write-Host 'INFO Checking web login deviceId'
MustContainText $api 'getOrCreateBrowserDeviceId' 'web api creates browser device id'
MustContainText $api 'deviceId: getOrCreateBrowserDeviceId()' 'web login sends deviceId'

Write-Host 'INFO Checking pack/runtime wiring'
MustContainText $pack 'node scripts/m46_8_driver_access_hardening_check.js' 'pack runs m46.8 runtime check'
MustNotContainText $pack 'pack_m46_7_driver_code_login_rehber_first.ps1' 'pack is self-only and does not chain m46.7'
MustContainText $runtime 'AUTH_DRIVER_PIN_RESET' 'runtime verifies reset audit'
MustContainText $runtime 'AUTH_DRIVER_PIN_LOCKED' 'runtime verifies lock audit'
MustContainText $runtime 'PIN_TOO_WEAK' 'runtime verifies weak pin rejection'

Write-Host 'M46.8 DRIVER ACCESS HARDENING REPO CONTRACT PASS'


