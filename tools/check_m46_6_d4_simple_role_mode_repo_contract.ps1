param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  $norm = [string]$txt
  foreach($needle in $needles){
    if ($needle -and $norm.Contains(([string]$needle).Normalize())) {
      Write-Host "OK $label"
      return
    }
  }
  throw "FAIL $label"
}

Write-Host 'INFO Checking M46.6-D4 files'
@(
  'backend\scripts\m46_6_d4_simple_role_mode_check.js',
  'tools\pack_m46_6_d4_simple_role_mode.ps1',
  'tools\check_m46_6_d4_simple_role_mode_repo_contract.ps1',
  'docs\RUNBOOK_M46_6_D4_SIMPLE_ROLE_MODE.md',
  'backend\src\ai\chat\helpComposer.js',
  'backend\src\ai\chat\intentRouter.js',
  'web\src\components\copilot\ChatMessageBubble.jsx',
  'web\src\panels\shared\CopilotPanel.jsx',
  'web\src\copilot\screenRegistry.js',
  'tools\check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1'
) | ForEach-Object { MustExist $_ }

Write-Host 'INFO Checking backend simple role mode wiring'
$composer = ReadText 'backend\src\ai\chat\helpComposer.js'
$router   = ReadText 'backend\src\ai\chat\intentRouter.js'
MustContainAny $composer @('composeSimpleScreenReply','actionPlanLabel','maxQuickActions = roleMode === ''SIMPLE'' ? 3 : 5','contextSummaryForRoleMode') 'chat composer exposes D-family shell metadata'
MustContainText $composer 'composeSimpleScreenReply' 'chat composer has simple screen reply path'
MustContainText $composer 'actionPlanLabel' 'chat composer exposes simple action plan label'
MustContainText $composer 'maxQuickActions = roleMode === ''SIMPLE'' ? 3 : 5' 'chat composer compacts quick actions for simple mode'
MustContainText $composer 'contextSummaryForRoleMode' 'chat composer compacts simple context summary'
MustContainText $router 'simpleScreenChipsByPath' 'intent router has simple screen chips helper'
MustContainText $router 'slice(0, 4)' 'intent router limits simple chips'

Write-Host 'INFO Checking web simple role mode wiring'
$bubble = ReadText 'web\src\components\copilot\ChatMessageBubble.jsx'
$panel  = ReadText 'web\src\panels\shared\CopilotPanel.jsx'
$registry = ReadText 'web\src\copilot\screenRegistry.js'
MustContainText $bubble 'const isSimpleMode' 'chat bubble detects simple mode'
MustContainAny $bubble @(
  '!isSimpleMode && message?.screenLabel',
  '!isSimpleMode && message?.activeEntityLabel',
  '!isSimpleMode && message?.roleMode'
) 'chat bubble hides verbose metadata in simple mode'
MustContainAny $bubble @(
  'İpucu:',
  'message?.followUpPrompt ? <div>{isSimpleMode ? `İpucu: ${message.followUpPrompt}` : message.followUpPrompt}</div> : null',
  'message?.followUpPrompt'
) 'chat bubble uses simpler follow-up label'
MustContainAny "$panel`n$registry" @('/room/hub') 'panel still includes room hub after D4'
MustContainAny "$panel`n$registry" @('/company/georeview') 'panel still includes company georeview after D4'
MustContainAny "$panel`n$registry" @('/driver/checkin') 'panel includes driver checkin after D4'

Write-Host 'INFO Checking backward compatible runtime scripts'
$dScript  = ReadText 'backend\scripts\m46_6_d_ai_chat_shell_check.js'
$d2Script = ReadText 'backend\scripts\m46_6_d2_ai_context_chat_check.js'
$d3Script = ReadText 'backend\scripts\m46_6_d3_ai_actionable_chat_check.js'
MustContainAny $dScript @('driver shell metadata present','roleMode','actionPlanLabel') 'D runtime keeps D-family shell acceptance'
MustContainAny $d2Script @('room shift shell metadata present','activeEntityLabel','roleMode') 'D2 runtime keeps D-family context acceptance'
MustContainAny $d3Script @('route action exists','quick actions compact','actionPlanLabel') 'D3 runtime keeps D-family action acceptance'

Write-Host 'M46.6-D4 SIMPLE ROLE MODE REPO CONTRACT PASS'
