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

Write-Host '=== M50 Repo Contract ==='
Write-Host 'INFO Checking M50 files'
@(
  'mobile\package.json',
  'mobile\app.json',
  'mobile\eas.json',
  'mobile\.env.example',
  'mobile\App.js',
  'mobile\src\screens\TodayScreen.js',
  'mobile\scripts\m50_mobile_release_readiness_check.js',
  'tools\pack_m50_mobile_release_readiness.ps1',
  'tools\check_m50_mobile_release_readiness_repo_contract.ps1',
  'docs\RUNBOOK_M50_MOBILE_RELEASE_READINESS.md',
  'tools\README.md'
) | ForEach-Object { MustExist $_ }

$pkg = ReadText 'mobile\package.json'
$appJson = ReadText 'mobile\app.json'
$eas = ReadText 'mobile\eas.json'
$app = ReadText 'mobile\App.js'
$today = ReadText 'mobile\src\screens\TodayScreen.js'
$pack = ReadText 'tools\pack_m50_mobile_release_readiness.ps1'
$runbook = ReadText 'docs\RUNBOOK_M50_MOBILE_RELEASE_READINESS.md'
$toolsReadme = ReadText 'tools\README.md'

Write-Host 'INFO Checking mobile release readiness wiring'
MustContainText $pkg 'check:m50' 'package includes m50 script'
MustContainText $pkg 'doctor:expo' 'package includes expo doctor script'
MustContainText $pkg 'build:preview:android' 'package includes preview build script'
MustContainText $pkg 'build:production:android' 'package includes production build script'
MustContainText $appJson 'runtimeVersion' 'app config has runtime version policy'
MustContainText $appJson 'updates' 'app config has updates policy'
MustContainText $eas 'preview' 'eas config has preview profile'
MustContainText $eas 'production' 'eas config has production profile'
MustContainText $eas 'app-bundle' 'eas production uses app bundle'
MustContainText $app 'RELEASE_INFO' 'app defines release info'
MustContainText $app 'releaseInfo={RELEASE_INFO}' 'app passes release info'
MustContainText $today 'Release hazirligi' 'today screen has release readiness card'
MustContainText $today 'Uygulama surumu' 'today screen shows app version'
MustContainText $today 'Build profilleri' 'today screen shows build profiles'
MustContainText $today 'EAS Build' 'today screen mentions EAS Build'

Write-Host 'INFO Checking pack + runbook'
MustNotContainText $pack 'pack_m49_1_driver_voice_guidance_stop_eta.ps1' 'pack is self-only and does not chain m49.1'
MustContainText $pack 'node scripts/m50_mobile_release_readiness_check.js' 'pack runs m50 static check'
MustContainText $runbook 'mobile release readiness' 'runbook explains release readiness goal'
MustContainText $runbook 'EAS Build' 'runbook explains EAS build'
MustContainText $runbook '.env.example' 'runbook explains env example'
MustContainText $runbook 'Android ilk yayin' 'runbook explains android-first target'
MustContainText $runbook 'Surucu Kodu + PIN' 'runbook keeps driver login flow'
MustContainText $toolsReadme 'tools\pack_m50_mobile_release_readiness.ps1' 'tools readme lists m50 pack'
MustContainText $toolsReadme 'tools\check_m50_mobile_release_readiness_repo_contract.ps1' 'tools readme lists m50 repo contract check'

Write-Host 'M50 MOBILE RELEASE READINESS REPO CONTRACT PASS'
