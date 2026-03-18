param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; throw "FAIL $label" }

Write-Host "INFO Checking M57 files"
@(
 'mobile\App.js',
 'mobile\src\screens\TodayScreen.js',
 'mobile\src\lib\api.js',
 'mobile\src\lib\gps.js',
 'mobile\scripts\m57_1_foreground_gps_publish_check.js',
 'tools\pack_m57_mobile_hardening.ps1',
 'tools\check_m57_mobile_hardening_repo_contract.ps1',
 'docs\RUNBOOK_M57_MOBILE_HARDENING.md',
 'docs\NEXT_BACKLOG_V1.md'
) | ForEach-Object { MustExist $_ }

$app = ReadText 'mobile\App.js'
$today = ReadText 'mobile\src\screens\TodayScreen.js'
$api = ReadText 'mobile\src\lib\api.js'
$gps = ReadText 'mobile\src\lib\gps.js'
$runbook = ReadText 'docs\RUNBOOK_M57_MOBILE_HARDENING.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$tools = ReadText 'tools\README.md'
$primer = ReadText 'tools\PRIMER_SNAPSHOT.md'

MustContainAny $app @('GPS_PUBLISH_INTERVAL_MS','publishGps(','refreshGpsStatus(') 'mobile app has foreground gps publish flow'
MustContainAny $today @('Surucunun telefon GPS''i','Ayarlari ac','Konumu simdi gonder') 'today screen has permission card and settings action'
MustContainAny $api @('/api/gps','publishGps') 'mobile api has gps publish endpoint'
MustContainAny $gps @('resolveGpsPublishTarget','permissionTextFromStatus','APPROVED','ACTIVE') 'gps helper resolves publish target and permission text'
MustContainAny $runbook @('M57.1','Foreground GPS publish + izin kapisi','/api/gps') 'runbook defines M57.1 implementation scope'
MustContainAny $backlog @('M57.1','Foreground GPS publish + izin karti + Ayarlara Git','M57.2') 'backlog mentions M57.1 and next steps'
MustContainAny $startpack @('pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform','ScaffoldOnly') 'startpack lists M57 implementation and scaffold commands'
MustContainAny $tools @('check:m57.1','pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform') 'tools readme lists M57.1 check and pack'
MustContainAny $primer @('M57.1 foreground GPS publish','Ayarlari ac','ScaffoldOnly') 'primer snapshot mentions M57.1 implementation and scaffold mode'

Write-Host 'M57 MOBILE HARDENING REPO CONTRACT PASS'
