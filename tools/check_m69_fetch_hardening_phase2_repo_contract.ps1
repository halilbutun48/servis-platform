param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)
$ErrorActionPreference = "Stop"
function Assert-Exists($rel) {
  $p = Join-Path $RepoRoot $rel
  if (!(Test-Path $p)) { throw "Missing: $rel" }
  Write-Host "OK $rel exists"
}
Write-Host "=== M69 Repo Contract ==="
Assert-Exists "backend\scripts\m69_fetch_hardening_phase2_check.js"
Assert-Exists "backend\src\routes\vehicles.js"
Assert-Exists "backend\src\routes\trustQuality.js"
Assert-Exists "web\src\utils\companyDataHub.js"
Assert-Exists "web\src\panels\company\ShiftsPanel.jsx"
Assert-Exists "web\src\panels\company\AgreementsPanel.jsx"
Assert-Exists "web\src\panels\company\ServiceEvaluationPanel.jsx"
Assert-Exists "web\src\components\RoutePreviewModal.jsx"
Assert-Exists "tools\pack_m69_fetch_hardening_phase2.ps1"
Assert-Exists "docs\RUNBOOK_M69_FETCH_HARDENING_PHASE2.md"
Assert-Exists "docs\MILESTONE_M69_FETCH_HARDENING_PHASE2.md"
Write-Host "=== M69 Repo Contract PASS ==="
