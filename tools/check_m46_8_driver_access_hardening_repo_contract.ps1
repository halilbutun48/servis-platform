param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'

function Ok([string]$m){ Write-Host "OK $m" }
function NeedExists([string]$file){ $p = Join-Path $RepoRoot $file; if (-not (Test-Path -LiteralPath $p)) { throw "FAIL $file exists" }; Ok "$file exists" }
function NeedContains([string]$file, [string]$needle, [string]$label){ $p = Join-Path $RepoRoot $file; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if (-not $txt.Contains($needle)) { throw "FAIL $label" }; Ok $label }
function NeedAnyFileContains([string[]]$files, [string[]]$needles, [string]$label){
  foreach ($file in $files) {
    $p = Join-Path $RepoRoot $file
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
    foreach ($needle in $needles) { if ($txt.Contains($needle)) { Ok $label; return } }
  }
  throw "FAIL $label"
}

Write-Host "INFO Checking M46.8 files"
@(
  'backend\scripts\m46_8_driver_access_hardening_check.js',
  'tools\pack_m46_8_driver_access_hardening.ps1',
  'tools\check_m46_8_driver_access_hardening_repo_contract.ps1',
  'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md',
  'backend\src\auth\driverAccessGuard.js',
  'backend\src\routes\auth.js',
  'backend\src\routes\drivers.js',
  'backend\src\server.js',
  'backend\src\bootstrap\rateLimits.js',
  'web\src\api.js'
) | ForEach-Object { NeedExists $_ }

Write-Host "INFO Checking runbook"
NeedContains 'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md' 'A' 'runbook has sub-scope A'
NeedContains 'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md' 'B' 'runbook has sub-scope B'
NeedContains 'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md' 'C' 'runbook has sub-scope C'
NeedContains 'docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md' 'D' 'runbook has sub-scope D'
NeedAnyFileContains @('docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md') @('pin locked','locked') 'runbook mentions lock response'

Write-Host "INFO Checking access guard helper"
NeedAnyFileContains @('backend\src\auth\driverAccessGuard.js') @('register','failure') 'guard can register failures'
NeedAnyFileContains @('backend\src\auth\driverAccessGuard.js') @('lock state','getDriverPinLockState','readLockState','isLocked','lockedUntil') 'guard can read lock state'
NeedAnyFileContains @('backend\src\auth\driverAccessGuard.js') @('clear','reset') 'guard can clear failure state'
NeedAnyFileContains @('backend\src\auth\driverAccessGuard.js') @('validate','pin') 'guard validates new pin'
NeedAnyFileContains @('backend\src\auth\driverAccessGuard.js') @('min','length','too short') 'guard enforces min pin length'

Write-Host "INFO Checking auth route hardening"
NeedAnyFileContains @('backend\src\routes\auth.js') @('PIN_LOCKED','pin_locked') 'auth logs pin locked'
NeedAnyFileContains @('backend\src\routes\auth.js') @('getDriverPinLockState','readLockState','isLocked','lockedUntil') 'auth reads lock state'
NeedAnyFileContains @('backend\src\routes\auth.js') @('registerDriverPinFailure','registerFailure','incrementFailure','failCount') 'auth registers failure count'
NeedAnyFileContains @('backend\src\routes\auth.js') @('clearDriverPinFailureState','clearFailureState','clearFailures','resetFailure','clearLockState','unlock') 'auth clears failure state'
NeedAnyFileContains @('backend\src\routes\auth.js') @('validateNewDriverPin','validateNewPin','validatePin','pin policy') 'auth uses pin policy validation'
NeedAnyFileContains @('backend\src\routes\auth.js') @('PIN_LOCKED','pin locked') 'auth returns pin locked code'
NeedAnyFileContains @('backend\src\routes\auth.js') @('geçersiz','invalid') 'auth returns user friendly invalid message'

Write-Host "INFO Checking driver reset hygiene"
NeedAnyFileContains @('backend\src\routes\drivers.js') @('PIN_RESET','pin reset') 'drivers route audits pin reset'
NeedAnyFileContains @('backend\src\routes\drivers.js') @('clearDriverPinFailureState','clearFailureState','clearFailures','resetFailure','clearLockState','unlock') 'drivers route clears failure state on reset'

Write-Host "INFO Checking server limiter wiring"
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\rateLimits.js') @('driverCode','username','identifier','loginLimiter') 'login limiter keyed by identifier'
Write-Host 'M46.8 DRIVER ACCESS HARDENING REPO CONTRACT PASS'
