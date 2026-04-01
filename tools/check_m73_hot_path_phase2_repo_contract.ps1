param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
function Ok([string]$m){ Write-Host "OK $m" }
function Fail([string]$m){ throw "FAIL $m" }
$files = @(
  'backend\scripts\m73_hot_path_phase2_check.js',
  'backend\scripts\company_fetch_storm_check.js',
  'backend\scripts\scale_readiness_check.js',
  'backend\src\server.js',
  'backend\src\bootstrap\rateLimits.js',
  'backend\src\routes\companyOverview.js',
  'backend\src\routes\reports.js',
  'backend\src\routes\trustQuality.js',
  'backend\src\routes\shifts\people.js',
  'web\src\utils\companyDataHub.js',
  'web\src\utils\providerScores.js',
  'web\src\panels\company\WorkflowPanel.jsx',
  'web\src\panels\company\ShiftsPanel.jsx',
  'web\src\panels\company\AgreementsPanel.jsx',
  'web\src\panels\company\MapPanel.jsx',
  'web\src\panels\company\GeoReviewPanel.jsx',
  'web\src\panels\company\ServiceEvaluationPanel.jsx',
  'tools\pack_m73_hot_path_phase2.ps1',
  'docs\RUNBOOK_M73_HOT_PATH_PHASE2.md',
  'docs\MILESTONE_M73_HOT_PATH_PHASE2.md'
)
foreach ($rel in $files) {
  $path = Join-Path $RepoRoot $rel
  if (!(Test-Path $path)) { Fail "$rel exists" }
  Ok "$rel exists"
}
Write-Host '=== M73 REPO CONTRACT PASS ==='
