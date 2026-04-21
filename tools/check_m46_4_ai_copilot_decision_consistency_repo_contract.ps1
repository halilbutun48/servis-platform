param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.4 files"
$files = @(
  "backend\scripts\m46_4_ai_copilot_decision_consistency_check.js",
  "tools\pack_m46_4_ai_copilot_decision_consistency.ps1",
  "tools\check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1",
  "docs\RUNBOOK_M46_4_AI_COPILOT_DECISION_CONSISTENCY.md"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking compatibility updates"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_1_ai_copilot_enrichment_check.js") 'typeof roomSummary.json?.copilotVersion === "string"' "m46.1 check accepts forward versions"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_2_ai_copilot_intent_expansion_check.js") 'typeof readiness.json?.copilotVersion === "string"' "m46.2 check accepts forward versions"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_3_ai_copilot_quality_evidence_check.js") 'typeof shiftSummary.json?.copilotVersion === "string"' "m46.3 check accepts forward versions"
MustContain (Join-Path $RepoRoot "tools\check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1") 'copilotVersion' "m46.3 repo-contract accepts forward versions"

Write-Host "INFO Checking backend decision consistency wiring"
$service = Join-Path $RepoRoot "backend\src\ai\service.js"
MustContain $service 'copilotVersion' "service exposes >= m46.4 version"
MustContain $service 'overallStatus' "service exposes overall status"
MustContain $service 'actionability' "service exposes actionability"
MustContain $service 'dataFreshness' "service exposes data freshness"
MustContain $service 'coverage' "service exposes coverage"
MustContain $service 'recommendedActions' "service exposes recommended actions"
MustContain $service 'consistencyChecks' "service exposes consistency checks"
MustContain $service 'missingData' "service exposes missing data"
MustContain $service 'blockers' "service exposes blocker descriptions"

Write-Host "INFO Checking web decision consistency wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$advancedResult = Join-Path $RepoRoot "web\src\components\copilot\CopilotAdvancedResultCard.jsx"
MustContain $advancedResult 'recommendedActions' "advanced result card renders recommended actions section"
MustContain $advancedResult 'consistencyChecks' "advanced result card renders consistency checks section"
MustContain $advancedResult 'missingData' "advanced result card renders missing data section"
MustContain $advancedResult 'DecisionBadge' "advanced result card renders decision badges"
MustContain $advancedResult 'overallStatus' "advanced result card renders overall status"
MustContain $advancedResult 'actionability' "advanced result card renders actionability"
MustContain $advancedResult 'dataFreshness' "advanced result card renders data freshness"
MustContain $advancedResult 'coverage' "advanced result card renders coverage"

Write-Host "M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN REPO CONTRACT PASS"
