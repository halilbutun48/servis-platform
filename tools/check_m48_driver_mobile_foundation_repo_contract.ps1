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
    if($txt.Contains(([string]$needle).Normalize())){
      Write-Host "OK $label"
      return
    }
  }
  throw "FAIL $label"
}

Write-Host 'INFO Checking M48 files'
@(
  'mobile\package.json',
  'mobile\app.json',
  'mobile\babel.config.js',
  'mobile\App.js',
  'mobile\src\lib\api.js',
  'mobile\src\lib\storage.js',
  'mobile\src\screens\LoginScreen.js',
  'mobile\src\screens\PinChangeScreen.js',
  'mobile\src\screens\TodayScreen.js',
  'mobile\scripts\m48_driver_mobile_foundation_check.js',
  'tools\pack_m48_driver_mobile_foundation.ps1',
  'tools\check_m48_driver_mobile_foundation_repo_contract.ps1',
  'docs\RUNBOOK_M48_DRIVER_MOBILE_FOUNDATION.md'
) | ForEach-Object { MustExist $_ }

$pkg = ReadText 'mobile\package.json'
$appJson = ReadText 'mobile\app.json'
$app = ReadText 'mobile\App.js'
$api = ReadText 'mobile\src\lib\api.js'
$today = ReadText 'mobile\src\screens\TodayScreen.js'
$runbook = ReadText 'docs\RUNBOOK_M48_DRIVER_MOBILE_FOUNDATION.md'
$pack = ReadText 'tools\pack_m48_driver_mobile_foundation.ps1'

Write-Host 'INFO Checking mobile foundation wiring'
MustContainText $pkg '"expo": "~54.0.0"' 'package uses sdk 54 base'
MustContainText $pkg 'expo-location' 'package includes expo-location'
MustContainText $pkg 'expo-secure-store' 'package includes secure-store'
MustContainText $appJson 'expo-location' 'app config enables location plugin'
MustContainText $appJson 'expo-secure-store' 'app config enables secure store plugin'
MustContainText $app 'requirePinChange' 'app routes pin change first'
MustContainText $api '/api/auth/refresh' 'api helper supports refresh token'
MustContainText $api '/api/driver/shifts/today' 'api helper uses today endpoint'
MustContainText $api '/api/driver/route/active' 'api helper uses active route endpoint'
MustContainText $today 'GPS hazirligi' 'today screen has gps readiness card'
MustContainText $today 'Haritada ac' 'today screen has external maps action'

Write-Host 'INFO Checking pack + runbook'
MustContainText $pack 'pack_m47_4_mobile_readiness_web_pass.ps1' 'pack chains m47.4 first'
MustContainText $pack 'node scripts/m48_driver_mobile_foundation_check.js' 'pack runs mobile static check'
MustContainText $runbook 'EXPO_PUBLIC_API_BASE_URL' 'runbook explains base url env'
MustContainText $runbook 'PIN' 'runbook explains driver login flow (pin)'
MustContainAny $runbook @('Sürücü Kodu','Surucu Kodu','driver login') 'runbook explains driver login flow (driver code)'
MustContainText $runbook 'Expo Go' 'runbook mentions Expo Go guidance'

Write-Host 'M48 DRIVER MOBILE FOUNDATION REPO CONTRACT PASS'
