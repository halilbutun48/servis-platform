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
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ($txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host '=== M49 Repo Contract ==='
Write-Host 'INFO Checking M49 files'
@(
  'mobile\package.json',
  'mobile\App.js',
  'mobile\src\lib\api.js',
  'mobile\src\lib\storage.js',
  'mobile\src\screens\TodayScreen.js',
  'mobile\scripts\m49_mobile_beta_hardening_check.js',
  'tools\pack_m49_mobile_beta_hardening.ps1',
  'tools\check_m49_mobile_beta_hardening_repo_contract.ps1',
  'docs\RUNBOOK_M49_MOBILE_BETA_HARDENING.md'
) | ForEach-Object { MustExist $_ }

$pkgText = ReadText 'mobile\package.json'
$pkgObj = $pkgText | ConvertFrom-Json
$app = ReadText 'mobile\App.js'
$api = ReadText 'mobile\src\lib\api.js'
$today = ReadText 'mobile\src\screens\TodayScreen.js'
$runbook = ReadText 'docs\RUNBOOK_M49_MOBILE_BETA_HARDENING.md'
$pack = ReadText 'tools\pack_m49_mobile_beta_hardening.ps1'
$toolsReadme = ReadText 'tools\README.md'

Write-Host 'INFO Checking mobile beta hardening wiring'
if (-not ($pkgObj.scripts.PSObject.Properties.Name -contains 'check:m49')) { throw 'FAIL package has m49 script' }
Write-Host 'OK package has m49 script'
if ($pkgObj.scripts.'check:m49' -notmatch 'm49_mobile_beta_hardening_check\.js') { throw 'FAIL package m49 script target' }
Write-Host 'OK package m49 script target'
MustContainText $app 'AppState' 'app listens foreground state'
MustContainText $app '30000' 'app has 30s periodic refresh'
MustContainText $app 'fetchHealth' 'app loads health ping'
MustContainText $app 'logoutDriver' 'app uses secure logout'
MustContainText $api '/health' 'api helper reads backend health'
MustContainText $api '/api/auth/logout' 'api helper revokes refresh session on logout'
MustContainText $today 'Beta durum' 'today screen has beta status card'
MustContainText $today 'API taban' 'today screen shows api base'
MustContainText $today 'Device ID' 'today screen shows device id'
MustContainText $today 'Son basarili senkron' 'today screen shows last sync'
MustContainText $today 'Guvenli cikis' 'today screen has secure logout action'

Write-Host 'INFO Checking pack + runbook'
MustNotContainText $pack 'pack_m48_5_room_company_tablet_readiness.ps1' 'pack is self-only and does not chain m48.5'
MustContainText $pack 'node scripts/m49_mobile_beta_hardening_check.js' 'pack runs m49 static check'
MustContainText $runbook 'beta hardening' 'runbook explains beta hardening goal'
MustContainText $runbook '30 sn' 'runbook explains periodic refresh'
MustContainText $runbook 'active' 'runbook explains foreground refresh'
MustContainText $runbook 'health' 'runbook explains backend health ping'
MustContainText $runbook 'Guvenli cikis' 'runbook explains secure logout'
MustContainText $runbook 'voice guidance' 'runbook keeps voice guidance for next step'
MustContainText $toolsReadme 'tools\pack_m49_mobile_beta_hardening.ps1' 'tools readme lists m49 pack'
MustContainText $toolsReadme 'tools\check_m49_mobile_beta_hardening_repo_contract.ps1' 'tools readme lists m49 repo contract check'

Write-Host 'M49 MOBILE BETA HARDENING REPO CONTRACT PASS'
