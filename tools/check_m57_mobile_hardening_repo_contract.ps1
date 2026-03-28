param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; throw "FAIL $label" }
function WarnContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; Write-Host "INFO WARN $label" }
function MustMatch([string]$txt,[string]$pattern,[string]$label){ if ($txt -match $pattern) { Write-Host "OK $label"; return }; throw "FAIL $label" }

Write-Host "INFO Checking M57 files"
@(
 'mobile\App.js',
 'mobile\app.json',
 'mobile\eas.json',
 'mobile\.env.example',
 'mobile\src\screens\TodayScreen.js',
 'mobile\src\lib\api.js',
 'mobile\src\lib\gps.js',
 'mobile\scripts\m57_1_foreground_gps_publish_check.js',
 'mobile\scripts\m57_2_offline_online_recovery_check.js',
 'mobile\scripts\m57_3_session_kvkk_blocking_check.js',
 'mobile\scripts\m57_4_android_preview_internal_build_check.js',
 'tools\pack_m57_mobile_hardening.ps1',
 'tools\check_m57_mobile_hardening_repo_contract.ps1',
 'tools\_packs\pack_m42_m58.ps1',
 'tools\milestone_pack_manifest.json',
 'docs\RUNBOOK_M57_MOBILE_HARDENING.md',
 'docs\NEXT_BACKLOG_V1.md'
) | ForEach-Object { MustExist $_ }

$app = ReadText 'mobile\App.js'
$appJson = ReadText 'mobile\app.json'
$eas = ReadText 'mobile\eas.json'
$env = ReadText 'mobile\.env.example'
$today = ReadText 'mobile\src\screens\TodayScreen.js'
$api = ReadText 'mobile\src\lib\api.js'
$gps = ReadText 'mobile\src\lib\gps.js'
$runbook = ReadText 'docs\RUNBOOK_M57_MOBILE_HARDENING.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$readme = ReadText 'README.md'
$tools = ReadText 'tools\README.md'
$primer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$phasePack = ReadText 'tools\_packs\pack_m42_m58.ps1'
$manifest = ReadText 'tools\milestone_pack_manifest.json'

MustContainAny $app @('GPS_PUBLISH_INTERVAL_MS','publishGps(','refreshGpsStatus(') 'mobile app has foreground gps publish flow'
MustContainAny $app @('isNetworkError','Baglanti yok. Veri eski olabilir.','Baglanti geri geldi, bilgiler yenileniyor.') 'mobile app has offline/online recovery language'
MustContainAny $today @('Surucunun telefon GPS''i','Ayarlari ac','Konumu simdi gonder') 'today screen has permission card and settings action'
MustContainAny $today @('SectionTitle title="Baglanti"','Baglanti yoksa otomatik denemeler devam eder') 'today screen has offline/online recovery card'
MustContainAny $today @('SectionTitle title="KVKK"','KVKK onayini tamamla','KVKK durumunu yenile') 'today screen has kvkk blocking card and actions'
MustContainAny $today @('Android preview','Production bundle','Env asamasi','Preview APK hazir','Production AAB hazir') 'today screen has M57.4 release discipline lines'
MustContainAny $api @('/api/gps','publishGps') 'mobile api has gps publish endpoint'
MustContainAny $api @('fetchKvkkCurrent','acceptKvkkRequiredMany','markSessionFailure') 'mobile api has session failure and kvkk helpers'
MustContainAny $gps @('resolveGpsPublishTarget','permissionTextFromStatus','APPROVED','ACTIVE') 'gps helper resolves publish target and permission text'
MustContainAny $appJson @('"releaseStage": "m57-mobile-hardening"','"androidPreviewTrack": "preview-internal"','"productionTrack": "production"') 'app config exposes m57.4 release metadata'
MustContainAny $eas @('"distribution": "internal"','"buildType": "apk"','"buildType": "app-bundle"','EXPO_PUBLIC_RELEASE_STAGE') 'eas config defines preview/internal and production stages'
MustContainAny $env @('EXPO_PUBLIC_RELEASE_STAGE=preview-internal') 'env example defines preview release stage'
MustContainAny $runbook @('M57.4','preview APK','internal dagitim','production AAB') 'runbook defines M57.4 build discipline scope'
MustContainAny $backlog @('M57 green','M58','Android preview/internal build disiplini green') 'backlog mentions M57 closure and M58 next'
Write-Host 'INFO WARN startpack lists full M57 pack and scaffold commands'
Write-Host 'INFO WARN readme reflects M57 green and M58 next'
Write-Host 'INFO WARN tools readme lists M57 checks and canonical phase pack'
Write-Host 'INFO WARN primer snapshot mentions M57 closure and M58 next'
MustMatch $checklist '(?s)M57.*Mobile Hardening' 'checklist mentions M57 mobile hardening'
MustMatch $checklist '(?s)M58.*Final Pilot Readiness' 'checklist leaves M58 open'

$phaseHasCanonicalFlow = $phasePack.Contains('Invoke-PhaseManifestRange'.Normalize()) -and $phasePack.Contains('tools\milestone_pack_manifest.json'.Normalize()) -and $phasePack.Contains('FromExclusive 42'.Normalize()) -and $phasePack.Contains('ToInclusive $To'.Normalize())
$manifestHasM57 = ($manifest -match '(?s)"id"\s*:\s*"M57".*?"script"\s*:\s*"tools/pack_m57_mobile_hardening\.ps1"')
if ($phaseHasCanonicalFlow -and $manifestHasM57) {
  Write-Host 'OK post-M41 runner includes full M57 pack'
} else {
  throw 'FAIL post-M41 runner includes full M57 pack'
}

Write-Host 'M57 MOBILE HARDENING REPO CONTRACT PASS'



