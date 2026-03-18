param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainText([string]$txt,[string]$needle,[string]$label){ if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }; Write-Host "OK $label" }
Write-Host "INFO Checking M55 files"
@(
 'backend\src\routes\reports.js',
 'backend\src\routes\penalties.js',
 'backend\src\lib\reports.js',
 'backend\src\lib\penalties.js',
 'backend\scripts\m55_reports_no_show_check.js',
 'web\src\panels\shared\ReportsPanel.jsx',
 'web\src\components\driver\DriverPenaltyBadge.jsx',
 'web\src\components\driver\DriverPenaltyForm.jsx',
 'tools\pack_m55_reports_no_show.ps1',
 'tools\check_m55_reports_no_show_repo_contract.ps1',
 'docs\RUNBOOK_M55_REPORTS_NO_SHOW.md'
) | ForEach-Object { MustExist $_ }
$server = ReadText 'backend\src\server.js'
$room = ReadText 'backend\src\routes\shifts\room.js'
$app = ReadText 'web\src\App.jsx'
$nav = ReadText 'web\src\layout\NavDock.jsx'
$api = ReadText 'docs\API_SPEC_V1.md'
$tools = ReadText 'tools\README.md'
MustContainText $server '/api/reports' 'server mounts reports route'
MustContainText $server '/api/penalties' 'server mounts penalties route'
MustContainText $room 'ACTIVE_NO_SHOW_PENALTY' 'room route has no-show block code'
MustContainText $app '/room/reports' 'app room reports route exists'
MustContainText $app '/company/reports' 'app company reports route exists'
MustContainText $nav 'Raporlar' 'nav includes reports label'
MustContainText $api 'M55' 'api spec mentions M55 milestone'
MustContainText $api '/api/reports/shifts/summary' 'api spec lists reports summary endpoint'
MustContainText $api '/api/penalties/no-show' 'api spec lists no-show endpoint'
MustContainText $tools 'pack_m55_reports_no_show.ps1' 'tools readme lists M55 pack'
Write-Host 'M55 REPORTS + NO_SHOW REPO CONTRACT PASS'
