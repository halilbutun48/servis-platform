param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
function Ok([string]$m){ Write-Host "OK $m" }
function Fail([string]$m){ throw "FAIL $m" }
$files = @(
  'backend\scripts\m74_hot_path_phase3_check.js',
  'backend\scripts\company_fetch_storm_check.js',
  'backend\scripts\scale_readiness_check.js',
  'backend\src\server.js',
  'backend\src\routes\companyPersonels.js',
  'backend\src\routes\offers.js',
  'backend\src\routes\reports.js',
  'backend\src\routes\trustQuality.js',
  'web\src\utils\companyDataHub.js',
  'web\src\utils\providerScores.js',
  'web\src\panels\company\WorkflowPanel.jsx',
  'web\src\panels\company\ShiftsPanel.jsx',
  'web\src\panels\company\AgreementsPanel.jsx',
  'web\src\panels\company\GeoReviewPanel.jsx',
  'web\src\panels\company\MapPanel.jsx',
  'web\src\panels\shared\ReportsPanel.jsx',
  'tools\pack_m74_hot_path_phase3.ps1',
  'docs\RUNBOOK_M74_HOT_PATH_PHASE3.md',
  'docs\MILESTONE_M74_HOT_PATH_PHASE3.md'
)
foreach ($rel in $files) {
  $path = Join-Path $RepoRoot $rel
  if (!(Test-Path $path)) { Fail "$rel exists" }
  Ok "$rel exists"
}
Write-Host '=== M74 REPO CONTRACT PASS ==='
