param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.5 files"
$files = @(
  "backend\scripts\m46_5_ai_copilot_action_prioritization_check.js",
  "tools\pack_m46_5_ai_copilot_action_prioritization.ps1",
  "tools\check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1",
  "docs\RUNBOOK_M46_5_AI_COPILOT_ACTION_PRIORITIZATION.md"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking compatibility updates"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_1_ai_copilot_enrichment_check.js") 'typeof roomSummary.json?.copilotVersion === "string"' "m46.1 check accepts forward versions"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_2_ai_copilot_intent_expansion_check.js") 'typeof readiness.json?.copilotVersion === "string"' "m46.2 check accepts forward versions"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_3_ai_copilot_quality_evidence_check.js") 'typeof shiftSummary.json?.copilotVersion === "string"' "m46.3 check accepts forward versions"
MustContain (Join-Path $RepoRoot "backend\scripts\m46_4_ai_copilot_decision_consistency_check.js") 'typeof summary.json?.copilotVersion === "string"' "m46.4 check accepts forward versions"
MustContain (Join-Path $RepoRoot "tools\check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1") 'copilotVersion' "m46.4 repo-contract accepts forward versions"

Write-Host "INFO Checking backend prioritization/calibration wiring"
$service = Join-Path $RepoRoot "backend\src\ai\service.js"
MustContain $service 'copilotVersion' "service exposes m46.5 version"
MustContain $service 'recommendedFirstAction' "service exposes recommended first action"
MustContain $service 'actionPlanSummary' "service exposes action plan summary"
MustContain $service 'calibrationNotes' "service exposes calibration notes"
MustContain $service 'priorityScore' "service exposes priority score"
MustContain $service 'whyNow' "service exposes whyNow"
MustContain $service 'evidenceLinks' "service exposes evidence links"
MustContain $service 'referenceLinks' "service exposes reference links"
MustContain $service 'blockedBy' "service exposes blockedBy"
MustContain $service 'dependsOn' "service exposes dependsOn"

Write-Host "INFO Checking web prioritization/calibration wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
MustContain $panel 'First Action' "panel renders first action section"
MustContain $panel 'Calibration Notes' "panel renders calibration notes section"
MustContain $panel 'priorityTone' "panel renders action priority tone"
MustContain $panel 'priorityScore' "panel renders priority score"
MustContain $panel 'whyNow' "panel renders whyNow"
MustContain $panel 'Evidence links' "panel renders evidence links"
MustContain $panel 'Reference links' "panel renders reference links"

Write-Host "M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION REPO CONTRACT PASS"
