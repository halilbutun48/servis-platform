param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustAbsent($rel){ $p = Join-Path $RepoRoot $rel; if (Test-Path -LiteralPath $p) { throw "FAIL $rel still live" }; Ok "$rel archived/removed" }
function MustContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if ($txt -notlike "*$needle*") { throw "FAIL $label" }; Ok $label }
Info 'Checking stale live paths removed'
@(
  'backend\src\routes\organizationPlans.js',
  'web\src\panels\room\RoomShiftsPanel.jsx',
  'web\src\panels\company\GuidedPlanModal.jsx.bak',
  'src',
  'scripts',
  'rlays'
) | ForEach-Object { MustAbsent $_ }
Info 'Checking canonical files kept'
@(
  'README.md',
  'backend\src\server.js',
  'web\src\panels\room\ShiftsPanel.jsx',
  'docs\overlays\OVERLAY_NOTES_M104_REPO_AUDIT_CLEANUP_2026-03-10.md'
) | ForEach-Object { MustExist $_ }
Info 'Checking content sync'
MustContain 'backend\src\server.js' 'organizationRouter' 'organizationRouter import kept'
MustContain 'backend\src\server.js' '/api/organization' 'organization router mount kept'
MustContain 'docs\API_SPEC_V1.md' '/api/company/passenger-links' 'API spec passenger links sync'
MustContain 'docs\DB_SCHEMA_V1.md' 'PassengerLiveLink' 'DB spec passenger live link sync'
MustContain 'docs\UI_SPEC_V1.md' '/public/passenger-live?token=...' 'UI spec public live route sync'
MustContain 'docs\PROJECT_SPEC_V1.md' '1 hafta / 1 ay / 6 ay / 1 yıl' 'project spec personel/public ttl sync'
Write-Host 'REPO CLEANUP M104 CHECK PASS'
