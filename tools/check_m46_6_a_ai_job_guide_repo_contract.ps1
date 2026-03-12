param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-A files"
$files = @(
  "backend\scripts\m46_6_a_ai_job_guide_check.js",
  "tools\pack_m46_6_a_ai_job_guide.ps1",
  "tools\check_m46_6_a_ai_job_guide_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_A_AI_JOB_GUIDE.md",
  "backend\src\ai\jobGuide\registry.js",
  "backend\src\ai\jobGuide\levels.js",
  "backend\src\ai\jobGuide\glossary.js",
  "backend\src\ai\jobGuide\jobs\offerReview.js",
  "backend\src\ai\jobGuide\jobs\offerApproval.js",
  "backend\src\ai\jobGuide\jobs\assignmentReadinessGuide.js",
  "backend\src\ai\jobGuide\jobs\vehicleDriverBind.js",
  "web\src\components\copilot\JobGuideHeader.jsx",
  "web\src\components\copilot\StepByStepCard.jsx",
  "web\src\components\copilot\CommonMistakesCard.jsx",
  "web\src\components\copilot\DoneChecklistCard.jsx",
  "web\src\components\copilot\SimpleTermsCard.jsx",
  "backend\src\ai\jobGuide\index.js"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend job guide wiring"
$schema = Join-Path $RepoRoot "backend\src\ai\schemas.js"
$service = Join-Path $RepoRoot "backend\src\ai\service.js"
$jobGuideIndex = Join-Path $RepoRoot "backend\src\ai\jobGuide\index.js"
$router = Join-Path $RepoRoot "backend\src\routes\ai.js"
MustContain $schema '"JOB_GUIDE"' "schema accepts JOB_GUIDE intent"
MustContain $schema 'jobType:' "schema accepts jobType"
MustContain $schema 'guideLevel:' "schema accepts guideLevel"
MustContain $service 'buildJobGuideResponse' "service imports job guide builder"
MustContain $jobGuideIndex "copilotVersion:" "job guide index exposes guide version"
MustContain $jobGuideIndex "jobTitle" "job guide index exposes jobTitle"
MustContain $router 'jobType:' "route audits jobType"
MustContain $router 'guideLevel:' "route audits guideLevel"

Write-Host "INFO Checking web guide mode wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$panelTxt = Get-Content -LiteralPath $panel -Raw -Encoding UTF8

if ($panelTxt -match 'Rehber') { Write-Host 'OK panel renders guide tab' } else { throw 'FAIL panel renders guide tab' }
if (($panelTxt -match 'Geli..mi.') -or ($panelTxt.Contains('ADVANCED'))) { Write-Host 'OK panel keeps advanced tab' } else { throw 'FAIL panel keeps advanced tab' }

$jobSelectionOk =
  ($panelTxt -match 'Hangi işi yapıyorsun\?') -or
  $panelTxt.Contains('JOB_GUIDE_OPTIONS') -or
  $panelTxt.Contains('selectedJobType') -or
  $panelTxt.Contains('selectedGuideJob') -or
  ($panelTxt -match 'Teklifi inceleme') -or
  ($panelTxt -match 'Teklifi onaylama') -or
  ($panelTxt -match 'Araç ile sürücüyü bağlama')
if ($jobSelectionOk) { Write-Host 'OK panel renders job selection' } else { throw 'FAIL panel renders job selection' }

if ($panelTxt.Contains('JobGuideHeader')) { Write-Host 'OK panel uses job guide header' } else { throw 'FAIL panel uses job guide header' }
if (($panelTxt -match 'İş Rehberi') -or ($panelTxt -match 'Rehber Sonucu') -or ($panelTxt -match 'Rehber')) { Write-Host 'OK panel renders Turkish guide label' } else { throw 'FAIL panel renders Turkish guide label' }

Write-Host "M46.6-A AI JOB GUIDE REPO CONTRACT PASS"
