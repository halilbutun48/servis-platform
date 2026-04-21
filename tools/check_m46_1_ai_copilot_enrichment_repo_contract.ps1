param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustMatch($p,$pattern,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if ($txt -notmatch $pattern) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.1 files"
$files = @(
  "backend\scripts\m46_1_ai_copilot_enrichment_check.js",
  "tools\pack_m46_1_ai_copilot_enrichment.ps1",
  "tools\check_m46_1_ai_copilot_enrichment_repo_contract.ps1",
  "docs\RUNBOOK_M46_1_AI_COPILOT_ENRICHMENT.md"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend enrichment wiring"
MustContain (Join-Path $RepoRoot "backend\src\ai\service.js") 'copilotVersion' "service exposes copilot version"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'severity' "tools include severity fields"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'blocks' "tools include blocks fields"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'nextChecks' "tools include nextChecks fields"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'references' "tools include references fields"

Write-Host "INFO Checking web enrichment wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$advancedResult = Join-Path $RepoRoot "web\src\components\copilot\CopilotAdvancedResultCard.jsx"
MustContain $advancedResult 'copyText(result.summary || "")' "advanced result card has copy summary action"
MustContain $advancedResult 'copyText(result.noteDraft || "")' "advanced result card has copy note action"
MustContain $panel 'Son 5 analiz' "panel has recent analyses section"
MustContain $panel 'Blocks' "panel renders blocks section"
MustContain $panel 'Next Checks' "panel renders next checks section"

Write-Host "M46.1 AI COPILOT ENRICHMENT REPO CONTRACT PASS"
