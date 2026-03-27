param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)
$ErrorActionPreference = "Stop"
function Assert-Exists($rel) {
  $p = Join-Path $RepoRoot $rel
  if (!(Test-Path $p)) { throw "Missing: $rel" }
  Write-Host "OK $rel exists"
}
Write-Host "=== M70 Repo Contract ==="
Assert-Exists "backend\scripts\m70_checker_sync_hot_path_check.js"
Assert-Exists "backend\scripts\scale_readiness_check.js"
Assert-Exists "backend\scripts\company_fetch_storm_check.js"
Assert-Exists "backend\src\routes\agreements.js"
Assert-Exists "backend\src\routes\offers.js"
Assert-Exists "web\src\utils\companyDataHub.js"
Assert-Exists "web\src\panels\company\WorkflowPanel.jsx"
Assert-Exists "web\src\panels\company\ServiceEvaluationPanel.jsx"
Assert-Exists "tools\pack_m70_checker_sync_hot_path.ps1"
Assert-Exists "docs\RUNBOOK_M70_CHECKER_SYNC_HOT_PATH.md"
Assert-Exists "docs\MILESTONE_M70_CHECKER_SYNC_HOT_PATH.md"
Write-Host "=== M70 Repo Contract PASS ==="
