param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-T files"
$files = @(
  "backend\scripts\m46_6_t_ai_location_source_guide_check.js",
  "tools\pack_m46_6_t_ai_location_source_guide.ps1",
  "tools\check_m46_6_t_ai_location_source_guide_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_T_AI_LOCATION_SOURCE_GUIDE.md",
  "backend\src\ai\jobGuide\jobs\telematicsDeviceCreate.js",
  "backend\src\ai\jobGuide\jobs\locationSourceGuide.js",
  "backend\src\ai\jobGuide\jobs\gpsSignalDiagnosisGuide.js"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend location guide wiring"
$registry = Join-Path $RepoRoot "backend\src\ai\jobGuide\registry.js"
$index = Join-Path $RepoRoot "backend\src\ai\jobGuide\index.js"
$precheck = Join-Path $RepoRoot "backend\src\ai\jobGuide\precheck.js"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"

MustContain $registry "TELEMATICS_DEVICE_CREATE" "registry has telematics create guide"
MustContain $registry "LOCATION_SOURCE_GUIDE" "registry has location source guide"
MustContain $registry "GPS_SIGNAL_DIAGNOSIS_GUIDE" "registry has gps signal diagnosis guide"
MustContain $index "M46.6-T" "job guide index exposes M46.6-T version"

$preTxt = Get-Content -LiteralPath $precheck -Raw -Encoding UTF8
if (
  ($preTxt -match "sürücünün telefon GPS'i") -or
  ($preTxt -match "telefon GPS") -or
  ($preTxt -match "cihaz GPS'i") -or
  ($preTxt -match "konum kaynağı")
) { Write-Host "OK precheck has phone gps guidance" } else { throw "FAIL precheck has phone gps guidance" }

Write-Host "INFO Checking web location guide wiring"
$panelTxt = Get-Content -LiteralPath $panel -Raw -Encoding UTF8
if (($panelTxt -match "Konum kaynağı rehberi") -or $panelTxt.Contains("LOCATION_SOURCE_GUIDE")) { Write-Host "OK panel renders location source guide" } else { throw "FAIL panel renders location source guide" }
if (($panelTxt -match "Cihaz GPS'i ekleme") -or $panelTxt.Contains("TELEMATICS_DEVICE_CREATE")) { Write-Host "OK panel renders telematics guide" } else { throw "FAIL panel renders telematics guide" }
if (($panelTxt -match "GPS sinyal teşhisi") -or $panelTxt.Contains("GPS_SIGNAL_DIAGNOSIS_GUIDE")) { Write-Host "OK panel renders gps signal guide" } else { throw "FAIL panel renders gps signal guide" }

Write-Host "M46.6-T AI LOCATION SOURCE GUIDE REPO CONTRACT PASS"
