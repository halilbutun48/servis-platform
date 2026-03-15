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

Write-Host '=== M49.1 Repo Contract ==='
Write-Host 'INFO Checking M49.1 files'
@(
  'mobile\package.json',
  'mobile\App.js',
  'mobile\src\lib\storage.js',
  'mobile\src\lib\voice.js',
  'mobile\src\screens\TodayScreen.js',
  'mobile\scripts\m49_1_driver_voice_guidance_stop_eta_check.js',
  'tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1',
  'tools\check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1',
  'docs\RUNBOOK_M49_1_DRIVER_VOICE_GUIDANCE_STOP_ETA.md',
  'tools\README.md'
) | ForEach-Object { MustExist $_ }

$pkg = ReadText 'mobile\package.json'
$app = ReadText 'mobile\App.js'
$storage = ReadText 'mobile\src\lib\storage.js'
$voice = ReadText 'mobile\src\lib\voice.js'
$today = ReadText 'mobile\src\screens\TodayScreen.js'
$runbook = ReadText 'docs\RUNBOOK_M49_1_DRIVER_VOICE_GUIDANCE_STOP_ETA.md'
$pack = ReadText 'tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1'
$toolsReadme = ReadText 'tools\README.md'

Write-Host 'INFO Checking mobile voice guidance wiring'
MustContainText $pkg 'expo-speech' 'package includes expo-speech'
MustContainText $pkg 'check:m49.1' 'package includes m49.1 script'
MustContainText $app 'getVoiceGuidanceEnabled' 'app reads voice guidance preference'
MustContainText $app 'saveVoiceGuidanceEnabled' 'app writes voice guidance preference'
MustContainText $app 'speakNextStop' 'app uses next stop speech'
MustContainText $app 'speakStopEta' 'app uses eta speech'
MustContainText $app 'buildVoiceCueKey' 'app dedupes automatic speech cues'
MustContainText $storage 'VOICE_ENABLED_KEY' 'storage has voice preference key'
MustContainText $voice 'expo-speech' 'voice helper imports expo-speech'
MustContainText $voice "tr-TR" 'voice helper speaks Turkish'
MustContainText $today 'Sesli rehber' 'today screen has voice card'
MustContainText $today 'Siradaki duragi oku' 'today screen has next stop read action'
MustContainText $today 'ETA oku' 'today screen has eta action'
MustContainText $today 'Durak ETA' 'today screen shows stop eta'

Write-Host 'INFO Checking pack + runbook'
MustContainText $pack 'pack_m49_mobile_beta_hardening.ps1' 'pack chains m49 first'
MustContainText $pack 'node scripts/m49_1_driver_voice_guidance_stop_eta_check.js' 'pack runs m49.1 static check'
MustContainText $runbook 'voice guidance' 'runbook explains voice guidance goal'
MustContainText $runbook 'stop ETA' 'runbook explains stop eta goal'
MustContainText $runbook 'expo-speech' 'runbook explains expo speech dependency'
MustContainText $runbook 'Surucu Kodu + PIN' 'runbook keeps driver login flow'
MustContainText $toolsReadme 'tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1' 'tools readme lists m49.1 pack'
MustContainText $toolsReadme 'tools\check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1' 'tools readme lists m49.1 repo contract check'

Write-Host 'M49.1 DRIVER VOICE GUIDANCE + STOP ETA REPO CONTRACT PASS'
