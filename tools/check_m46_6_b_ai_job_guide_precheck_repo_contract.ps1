param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-B files"
$files = @(
  "backend\scripts\m46_6_b_ai_job_guide_precheck_check.js",
  "tools\pack_m46_6_b_ai_job_guide_precheck.ps1",
  "tools\check_m46_6_b_ai_job_guide_precheck_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_B_AI_JOB_GUIDE_PRECHECK.md",
  "backend\src\ai\jobGuide\precheck.js",
  "backend\src\ai\jobGuide\quickActions.js",
  "backend\src\ai\jobGuide\copyOutputs.js",
  "web\src\components\copilot\BeforeYouStartCard.jsx",
  "web\src\components\copilot\LockedReasonCard.jsx",
  "web\src\components\copilot\QuickActionsCard.jsx",
  "web\src\components\copilot\IfStuckCard.jsx",
  "web\src\components\copilot\CopyOutputsCard.jsx"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend precheck wiring"
$jobGuideIndex = Join-Path $RepoRoot "backend\src\ai\jobGuide\index.js"
$precheck = Join-Path $RepoRoot "backend\src\ai\jobGuide\precheck.js"
$quickActions = Join-Path $RepoRoot "backend\src\ai\jobGuide\quickActions.js"
$preTxt = Get-Content -LiteralPath $precheck -Raw -Encoding UTF8
MustContain $jobGuideIndex "copilotVersion:" "job guide index exposes guide version"
MustContain $jobGuideIndex "beforeYouStart" "job guide index exposes beforeYouStart"
MustContain $jobGuideIndex "quickActions" "job guide index exposes quickActions"
MustContain $jobGuideIndex "copyOutputs" "job guide index exposes copyOutputs"
if (($preTxt -match 'Başlamadan önce kontrol') -or $preTxt.Contains('precheckLabel') -or $preTxt.Contains('summarizeState')) { Write-Host 'OK precheck file exposes precheck label' } else { throw 'FAIL precheck file exposes precheck label' }
MustContain $quickActions "/room/agreements" "quick actions include room agreements route"

Write-Host "INFO Checking web precheck wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$panelTxt = Get-Content -LiteralPath $panel -Raw -Encoding UTF8
if (($panelTxt -match 'Başlamadan önce kontrol') -or $panelTxt.Contains('BeforeYouStartCard')) { Write-Host 'OK panel renders before you start section' } else { throw 'FAIL panel renders before you start section' }
if (($panelTxt -match 'Bu neden kapalı\?') -or $panelTxt.Contains('LockedReasonCard')) { Write-Host 'OK panel renders locked reason section' } else { throw 'FAIL panel renders locked reason section' }
if (($panelTxt -match 'Buradan aç') -or $panelTxt.Contains('QuickActionsCard')) { Write-Host 'OK panel renders quick actions section' } else { throw 'FAIL panel renders quick actions section' }
if (($panelTxt -match 'Takıldıysan buraya git') -or $panelTxt.Contains('IfStuckCard')) { Write-Host 'OK panel renders if stuck section' } else { throw 'FAIL panel renders if stuck section' }
if (($panelTxt -match 'Hazır metin') -or $panelTxt.Contains('CopyOutputsCard')) { Write-Host 'OK panel renders copy outputs section' } else { throw 'FAIL panel renders copy outputs section' }

Write-Host "M46.6-B AI JOB GUIDE PRECHECK REPO CONTRACT PASS"
