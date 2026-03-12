param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-D2 files"
$files = @(
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
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend context-aware chat wiring"
$composer = Join-Path $RepoRoot "backend\src\ai\chat\helpComposer.js"
$resolver = Join-Path $RepoRoot "backend\src\ai\chat\contextResolver.js"
$router = Join-Path $RepoRoot "backend\src\ai\chat\intentRouter.js"
MustContain $composer "M46.6-D2" "chat composer version is D2"
MustContain $composer "roleMode" "chat response includes role mode"
MustContain $composer "activeEntityLabel" "chat response includes active entity label"
MustContain $resolver "screenDefinition" "context resolver returns screen definition"
MustContain $resolver "roleMode" "context resolver derives role mode"
MustContain $router "screenPath" "intent router uses screen path"
MustContain $router "STATUS_HELP" "intent router supports status help"

Write-Host "INFO Checking web context-aware chat shell wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$panelTxt = Get-Content -LiteralPath $panel -Raw -Encoding UTF8
if (($panelTxt -match 'chatEntityType') -and ($panelTxt -match 'Hangi kayıtla konuşalım')) { Write-Host 'OK panel supports entity chat picker' } else { throw 'FAIL panel supports entity chat picker' }
if (($panelTxt -match 'effectiveChatEntityId') -and ($panelTxt -match 'selectedChatItem')) { Write-Host 'OK panel sends selected chat entity' } else { throw 'FAIL panel sends selected chat entity' }
if (($panelTxt -match 'Seçili bağlam') -and ($panelTxt -match 'screenOptionLabel')) { Write-Host 'OK panel shows selected chat context' } else { throw 'FAIL panel shows selected chat context' }

$bubble = Join-Path $RepoRoot "web\src\components\copilot\ChatMessageBubble.jsx"
MustContain $bubble 'Seçili kayıt' "chat bubble shows active entity label"
MustContain $bubble 'Mod:' "chat bubble shows role mode"

Write-Host "M46.6-D2 AI CONTEXT CHAT REPO CONTRACT PASS"
