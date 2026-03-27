param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_repo_contract_common.ps1"

Write-Host "=== M75 Repo Contract ==="
$files = @(
  "backend\scripts\m75_hot_path_phase4_check.js",
  "backend\scripts\company_fetch_storm_check.js",
  "backend\scripts\scale_readiness_check.js",
  "backend\src\routes\offers.js",
  "backend\src\routes\trustQuality.js",
  "backend\src\server.js",
  "web\src\utils\companyDataHub.js",
  "web\src\utils\shiftRoutePreview.js",
  "web\src\panels\company\WorkflowPanel.jsx",
  "web\src\panels\company\GeoReviewPanel.jsx",
  "web\src\panels\company\AgreementsPanel.jsx",
  "web\src\panels\company\MapPanel.jsx",
  "web\src\components\RoutePreviewModal.jsx",
  "web\src\panels\company\ShiftsPanel.jsx",
  "tools\pack_m75_hot_path_phase4.ps1",
  "docs\RUNBOOK_M75_HOT_PATH_PHASE4.md",
  "docs\MILESTONE_M75_HOT_PATH_PHASE4.md"
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }
Write-Host "=== M75 Repo Contract PASS ==="
