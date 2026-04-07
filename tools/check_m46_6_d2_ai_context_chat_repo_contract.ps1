param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

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

Write-Host "INFO Checking M46.6-D2 files"
@(
  "backend\scripts\m46_6_d2_ai_context_chat_check.js",
  "tools\pack_m46_6_d2_ai_context_chat.ps1",
  "tools\check_m46_6_d2_ai_context_chat_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_D2_AI_CONTEXT_CHAT.md",
  "backend\src\ai\chat\helpComposer.js",
  "backend\src\ai\chat\contextResolver.js",
  "backend\src\ai\chat\intentRouter.js",
  "backend\src\ai\chat\replyShapes.js",
  "web\src\panels\shared\CopilotPanel.jsx",
  "web\src\components\copilot\ChatMessageBubble.jsx"
) | ForEach-Object { MustExist $_ }

Write-Host "INFO Checking backend context-aware chat wiring"
$composerTxt = ReadText "backend\src\ai\chat\helpComposer.js"
$resolverTxt = ReadText "backend\src\ai\chat\contextResolver.js"
$routerTxt   = ReadText "backend\src\ai\chat\intentRouter.js"

if (($composerTxt -notmatch 'M46\.6-D2') -and ($composerTxt -notmatch 'M46\.6-D3') -and ($composerTxt -notmatch 'M46\.6-D4') -and ($composerTxt -notmatch 'roleMode') -and ($composerTxt -notmatch 'activeEntityLabel')) {
  throw 'FAIL chat composer exposes D-family context metadata'
}
Write-Host 'OK chat composer exposes D-family context metadata'
MustContainText $composerTxt "roleMode" "chat response includes role mode"
MustContainText $composerTxt "activeEntityLabel" "chat response includes active entity label"
MustContainText $resolverTxt "screenDefinition" "context resolver returns screen definition"
MustContainText $resolverTxt "roleMode" "context resolver derives role mode"
MustContainText $routerTxt "screenPath" "intent router uses screen path"
MustContainText $routerTxt "STATUS_HELP" "intent router supports status help"

Write-Host "INFO Checking web context-aware chat shell wiring"
$panelTxt = ReadText "web\src\panels\shared\CopilotPanel.jsx"
if (($panelTxt -match 'chatEntityType') -and (($panelTxt -match 'selectedChatItem') -or ($panelTxt -match 'effectiveChatEntityId'))) {
  Write-Host 'OK panel supports entity chat picker'
} else {
  throw 'FAIL panel supports entity chat picker'
}
if (($panelTxt -match 'effectiveChatEntityId') -and ($panelTxt -match 'selectedChatItem')) {
  Write-Host 'OK panel sends selected chat entity'
} else {
  throw 'FAIL panel sends selected chat entity'
}
if (($panelTxt -match 'Seçili bağlam') -or ($panelTxt -match 'screenOptionLabel') -or ($panelTxt -match 'activeEntityLabel')) {
  Write-Host 'OK panel shows selected chat context'
} else {
  throw 'FAIL panel shows selected chat context'
}

$bubbleTxt = ReadText "web\src\components\copilot\ChatMessageBubble.jsx"
MustContainText $bubbleTxt 'activeEntityLabel' "chat bubble shows active entity label"
MustContainText $bubbleTxt 'roleMode' "chat bubble shows role mode"

Write-Host "M46.6-D2 AI CONTEXT CHAT REPO CONTRACT PASS"
