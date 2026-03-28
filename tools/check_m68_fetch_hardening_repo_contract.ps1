param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)
$ErrorActionPreference = "Stop"
function Assert-Exists($rel) {
  $p = Join-Path $RepoRoot $rel
  if (!(Test-Path $p)) { throw "Missing: $rel" }
  Write-Host "OK $rel exists"
}
Write-Host "=== M68 Repo Contract ==="
Assert-Exists "backend\scripts\m68_fetch_hardening_check.js"
Assert-Exists "backend\src\routes\companyPersonels.js"
Assert-Exists "backend\src\routes\trustQuality.js"
Assert-Exists "backend\src\ops\trustQualityManifest.js"
Assert-Exists "backend\src\utils\responseCache.js"
Assert-Exists "web\src\utils\companyDataHub.js"
Assert-Exists "web\src\utils\providerScores.js"
Assert-Exists "web\src\panels\company\WorkflowPanel.jsx"
Assert-Exists "web\src\panels\company\ShiftsPanel.jsx"
Assert-Exists "web\src\panels\company\AgreementsPanel.jsx"
Assert-Exists "web\src\panels\company\CommercialFlowPanel.jsx"
Assert-Exists "web\src\panels\company\GeoReviewPanel.jsx"
Assert-Exists "web\src\panels\company\ServiceEvaluationPanel.jsx"
Assert-Exists "web\src\panels\company\MapPanel.jsx"
Assert-Exists "tools\pack_m68_fetch_hardening.ps1"
Assert-Exists "docs\RUNBOOK_M68_FETCH_HARDENING.md"
Assert-Exists "docs\MILESTONE_M68_FETCH_HARDENING.md"
Write-Host "=== M68 Repo Contract PASS ==="


