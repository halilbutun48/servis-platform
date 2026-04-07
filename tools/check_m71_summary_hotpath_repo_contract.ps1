param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function Ok($m){ Write-Host "OK $m" }
function Fail($m){ throw "FAIL $m" }

Write-Host "=== M71 Repo Contract ==="
$files = @(
  "backend\src\routes\companyOverview.js",
  "backend\scripts\m71_summary_hotpath_check.js",
  "backend\scripts\company_fetch_storm_check.js",
  "backend\scripts\scale_readiness_check.js",
  "web\src\utils\companyDataHub.js",
  "web\src\panels\company\WorkflowPanel.jsx",
  "web\src\panels\company\CommercialFlowPanel.jsx",
  "web\src\components\RoutePreviewModal.jsx",
  "tools\pack_m71_summary_hotpath.ps1",
  "docs\RUNBOOK_M71_SUMMARY_HOTPATH.md",
  "docs\MILESTONE_M71_SUMMARY_HOTPATH.md"
)
foreach($rel in $files){
  $full = Join-Path $RepoRoot $rel
  if(-not (Test-Path $full)){ Fail "$rel exists" }
  Ok "$rel exists"
}
Write-Host "=== M71 Repo Contract PASS ==="
