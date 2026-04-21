param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.2 files"
$files = @(
  "backend\scripts\m46_2_ai_copilot_intent_expansion_check.js",
  "tools\pack_m46_2_ai_copilot_intent_expansion.ps1",
  "tools\check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1",
  "docs\RUNBOOK_M46_2_AI_COPILOT_INTENT_EXPANSION.md"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend intent expansion wiring"
MustContain (Join-Path $RepoRoot "backend\src\ai\schemas.js") 'ASSIGNMENT_READINESS' "schemas include assignment readiness intent"
MustContain (Join-Path $RepoRoot "backend\src\ai\schemas.js") 'OFFER_DECISION_HELP' "schemas include offer decision intent"
MustContain (Join-Path $RepoRoot "backend\src\ai\schemas.js") 'GPS_SIGNAL_DIAGNOSIS' "schemas include gps signal intent"
MustContain (Join-Path $RepoRoot "backend\src\ai\service.js") 'copilotVersion:' "service exposes >= m46.2 version"
MustContain (Join-Path $RepoRoot "backend\src\ai\service.js") 'intentLabel' "service exposes intent label"
MustContain (Join-Path $RepoRoot "backend\src\ai\service.js") 'entityLabel' "service exposes entity label"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'highlights' "tools include highlights field"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'buildShiftReferences' "tools include richer shift references"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'buildVehicleReferences' "tools include richer vehicle references"

Write-Host "INFO Checking web intent expansion wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$advancedResult = Join-Path $RepoRoot "web\src\components\copilot\CopilotAdvancedResultCard.jsx"
MustContain $panel 'ASSIGNMENT_READINESS' "panel exposes assignment readiness option"
MustContain $panel 'OFFER_DECISION_HELP' "panel exposes offer decision option"
MustContain $panel 'GPS_SIGNAL_DIAGNOSIS' "panel exposes gps diagnosis option"
MustContain $panel 'pickerSearch' "panel has quick search state"
MustContain $advancedResult 'result.highlights' "advanced result card renders highlights section"
MustContain $advancedResult 'scope?.summary' "advanced result card renders scope summary"

Write-Host "M46.2 AI COPILOT INTENT EXPANSION REPO CONTRACT PASS"
