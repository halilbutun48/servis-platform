param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.3 files"
$files = @(
  "backend\scripts\m46_3_ai_copilot_quality_evidence_check.js",
  "tools\pack_m46_3_ai_copilot_quality_evidence.ps1",
  "tools\check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1",
  "docs\RUNBOOK_M46_3_AI_COPILOT_QUALITY_EVIDENCE.md"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking compatibility updates"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_1_ai_copilot_enrichment_check.js") 'typeof roomSummary.json?.copilotVersion === "string"' "m46.1 check accepts forward versions"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_2_ai_copilot_intent_expansion_check.js") 'typeof readiness.json?.copilotVersion === "string"' "m46.2 check accepts forward versions"
MustContain (Join-Path $RepoRoot "tools\check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1") 'copilotVersion' "m46.2 repo-contract accepts forward versions"

Write-Host "INFO Checking backend quality/evidence wiring"
MustContain (Join-Path $RepoRoot "backend\src\ai\service.js") 'copilotVersion' "service exposes >= m46.3 version"
MustContain (Join-Path $RepoRoot "backend\src\ai\service.js") 'providerSummary' "service exposes provider summary"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'confidence' "tools include confidence field"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'explanation' "tools include explanation field"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'evidence' "tools include evidence field"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'decisionSignals' "tools include decision signals field"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'buildShiftExplanation' "tools include shift explanation builder"
MustContain (Join-Path $RepoRoot "backend\src\ai\tools.js") 'buildVehicleExplanation' "tools include vehicle explanation builder"

Write-Host "INFO Checking web quality/evidence wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$advancedResult = Join-Path $RepoRoot "web\src\components\copilot\CopilotAdvancedResultCard.jsx"
MustContain $advancedResult 'confidencePct' "advanced result card renders confidence"
MustContain $advancedResult 'result.explanation' "advanced result card renders explanation section"
MustContain $advancedResult 'result.evidence' "advanced result card renders evidence section"
MustContain $advancedResult 'decisionSignals' "advanced result card renders decision signals section"

Write-Host "M46.3 AI COPILOT QUALITY + EVIDENCE REPO CONTRACT PASS"
