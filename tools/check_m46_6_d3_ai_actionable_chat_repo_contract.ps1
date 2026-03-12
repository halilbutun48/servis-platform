param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function ReadText([string]$rel){
  return [IO.File]::ReadAllText((Join-Path $RepoRoot $rel))
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-D3 files"
@(
  "backend\scripts\m46_6_d_ai_chat_shell_check.js",
  "backend\scripts\m46_6_d2_ai_context_chat_check.js",
  "backend\scripts\m46_6_d3_ai_actionable_chat_check.js",
  "tools\pack_m46_6_d3_ai_actionable_chat.ps1",
  "tools\check_m46_6_d3_ai_actionable_chat_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_D3_AI_ACTIONABLE_CHAT.md",
  "backend\src\ai\chat\helpComposer.js",
  "backend\src\ai\chat\replyShapes.js",
  "web\src\components\copilot\ChatQuickActions.jsx",
  "web\src\components\copilot\ChatMessageBubble.jsx",
  "web\src\components\copilot\ChatThread.jsx",
  "web\src\panels\shared\CopilotPanel.jsx"
) | % { MustExist $_ }

Write-Host "INFO Checking backend actionable chat wiring"
$composerTxt = ReadText "backend\src\ai\chat\helpComposer.js"
$shapesTxt   = ReadText "backend\src\ai\chat\replyShapes.js"

if (($composerTxt -notmatch 'M46\.6-D3') -and ($composerTxt -notmatch 'M46\.6-D4')) {
  throw 'FAIL chat composer version is D3/D4'
}
Write-Host 'OK chat composer version is D3/D4'

MustContainText $composerTxt "entityActionPlan" "chat composer builds entity action plan"
MustContainText $composerTxt "actionPlanLabel" "chat response exposes action plan label"
if (($composerTxt -notmatch 'OPEN_GUIDE') -and ($shapesTxt -notmatch 'OPEN_GUIDE')) { throw 'FAIL chat supports guide actions' }
Write-Host 'OK chat supports guide actions'
MustContainText $composerTxt "lastQuickActions" "conversation state stores quick actions"

MustContainText $shapesTxt "OPEN_GUIDE" "reply shapes support guide action"
MustContainText $shapesTxt "COPY_TEXT" "reply shapes support copy action"
MustContainText $shapesTxt "ASK" "reply shapes support ask action"

Write-Host "INFO Checking web actionable chat wiring"
$panelTxt  = ReadText "web\src\panels\shared\CopilotPanel.jsx"
$threadTxt = ReadText "web\src\components\copilot\ChatThread.jsx"
$bubbleTxt = ReadText "web\src\components\copilot\ChatMessageBubble.jsx"
$quickTxt  = ReadText "web\src\components\copilot\ChatQuickActions.jsx"

MustContainText $panelTxt "quickActions" "panel passes quick actions"
MustContainText $bubbleTxt "ChatQuickActions" "chat bubble renders quick actions"
MustContainText $bubbleTxt "actionPlanLabel" "chat bubble shows action plan label"
MustContainText $quickTxt "OPEN_GUIDE" "quick actions support guide action"
MustContainText $quickTxt "COPY_TEXT" "quick actions support copy action"
MustContainText $quickTxt "ASK" "quick actions support ask action"

Write-Host "M46.6-D3 AI ACTIONABLE CHAT REPO CONTRACT PASS"
