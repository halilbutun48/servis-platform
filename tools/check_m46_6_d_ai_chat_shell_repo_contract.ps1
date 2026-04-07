param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-D files"
$files = @(
  "backend\scripts\m46_6_d_ai_chat_shell_check.js",
  "tools\pack_m46_6_d_ai_chat_shell.ps1",
  "tools\check_m46_6_d_ai_chat_shell_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_D_AI_CHAT_SHELL.md",
  "backend\src\ai\chat\helpComposer.js",
  "backend\src\ai\chat\contextResolver.js",
  "backend\src\ai\chat\intentRouter.js",
  "backend\src\ai\chat\replyShapes.js",
  "web\src\components\copilot\ChatThread.jsx",
  "web\src\components\copilot\ChatInputBox.jsx",
  "web\src\components\copilot\ChatMessageBubble.jsx",
  "web\src\components\copilot\SuggestedChips.jsx",
  "web\src\components\copilot\ChatQuickActions.jsx"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend chat wiring"
$schema = Join-Path $RepoRoot "backend\src\ai\schemas.js"
$service = Join-Path $RepoRoot "backend\src\ai\service.js"
$router = Join-Path $RepoRoot "backend\src\routes\ai.js"
MustContain $schema '"CHAT_HELP"' "schema accepts CHAT_HELP"
MustContain $schema 'message:' "schema accepts chat message"
MustContain $service 'buildChatHelpResponse' "service imports chat composer"
MustContain $service 'resolveChatContext' "service resolves chat context"
MustContain $router 'isSimpleChatRole' "route allows simple chat role"
MustContain $router 'CHAT_HELP' "route handles chat intent"

Write-Host "INFO Checking web chat shell wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$panelTxt = Get-Content -LiteralPath $panel -Raw -Encoding UTF8
if (($panelTxt -match 'Sohbet') -and ($panelTxt -match 'CHAT_HELP')) { Write-Host 'OK panel supports sohbet tab' } else { throw 'FAIL panel supports sohbet tab' }
if (($panelTxt -match 'ChatThread') -and ($panelTxt -match 'ChatInputBox')) { Write-Host 'OK panel renders chat shell' } else { throw 'FAIL panel renders chat shell' }
if (($panelTxt -match 'SuggestedChips') -and ($panelTxt -match 'openChatGuide')) { Write-Host 'OK panel renders chips and guide switching' } else { throw 'FAIL panel renders chips and guide switching' }

Write-Host "M46.6-D AI CHAT SHELL REPO CONTRACT PASS"
