param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ($txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M54.4 files"
@(
  "backend\src\routes\driver.js",
  "backend\scripts\m54_4_driver_route_delivery_check.js",
  "web\src\panels\driver\TodayPanel.jsx",
  "web\src\panels\driver\RoutePanel.jsx",
  "tools\pack_m54_4_driver_route_delivery.ps1",
  "tools\check_m54_4_driver_route_delivery_repo_contract.ps1",
  "docs\RUNBOOK_M54_4_DRIVER_ROUTE_DELIVERY.md",
  "docs\API_SPEC_V1.md",
  "tools\README.md"
) | ForEach-Object { MustExist $_ }

$route = ReadText "backend\src\routes\driver.js"
$runtime = ReadText "backend\scripts\m54_4_driver_route_delivery_check.js"
$today = ReadText "web\src\panels\driver\TodayPanel.jsx"
$routePanel = ReadText "web\src\panels\driver\RoutePanel.jsx"
$pack = ReadText "tools\pack_m54_4_driver_route_delivery.ps1"
$runbook = ReadText "docs\RUNBOOK_M54_4_DRIVER_ROUTE_DELIVERY.md"
$apiSpec = ReadText "docs\API_SPEC_V1.md"
$toolsReadme = ReadText "tools\README.md"

Write-Host "INFO Checking driver route delivery wiring"
MustContainText $route "buildDriverRoutePayload" "driver router uses shared route payload helper"
MustContainText $route 'r.get("/route/active"' "driver active route endpoint exists"
MustContainText $route 'r.get("/shifts/:shiftId/route"' "driver explicit shift route endpoint exists"
MustContainText $route "Shift route not available in this status" "driver route endpoint has status gate"
MustContainText $today '/driver/route?shift=${shiftId}' "today panel deep-links started shift to explicit route"
MustContainText $today '/driver/route?shift=${s.id}' "today list row deep-links to explicit route"
MustContainText $today '/driver/route?shift=${active.id}' "today active card deep-links to explicit route"
MustContainText $routePanel '/api/driver/shifts/${qShift}/route' "route panel supports explicit shift route api"
MustContainText $routePanel "/api/driver/route/active" "route panel still supports active route fallback"

Write-Host "INFO Checking runtime + docs"
MustContainText $runtime '/api/driver/shifts/${shiftId}/route' "runtime checks explicit shift route"
MustContainText $runtime "/api/driver/route/active" "runtime checks active route"
MustContainText $pack "m54_4_driver_route_delivery_check.js" "pack runs m54.4 runtime script"
MustNotContainText $pack "tools/pack.ps1" "pack is self-only and does not run base M41"
MustNotContainText $pack "pack_m54_3_dispatch_approve_repack.ps1" "pack is self-only and does not chain m54.3"
MustContainText $runbook "child shift" "runbook explains child shift focus"
MustContainText $runbook "Today -> Route" "runbook explains deep link"
MustContainText $runbook "GET /api/driver/shifts/:shiftId/route" "runbook documents explicit route endpoint"
MustContainText $apiSpec "GET /api/driver/shifts/:shiftId/route (DRIVER)" "api spec documents explicit route endpoint"
MustContainText $toolsReadme "pack_m54_4_driver_route_delivery.ps1" "tools readme lists m54.4 pack"
MustContainText $toolsReadme "check_m54_4_driver_route_delivery_repo_contract.ps1" "tools readme lists m54.4 repo contract"

Write-Host "M54.4 DRIVER ROUTE DELIVERY REPO CONTRACT PASS"
