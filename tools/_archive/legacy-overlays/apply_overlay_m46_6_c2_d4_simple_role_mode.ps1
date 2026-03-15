param(
  [Parameter(Mandatory = $true)][string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$OverlayRoot = Split-Path -Parent $PSScriptRoot
$files = @(
  'backend/src/ai/chat/helpComposer.js',
  'backend/src/ai/chat/intentRouter.js',
  'backend/scripts/m46_6_d_ai_chat_shell_check.js',
  'backend/scripts/m46_6_d2_ai_context_chat_check.js',
  'backend/scripts/m46_6_d3_ai_actionable_chat_check.js',
  'backend/scripts/m46_6_d4_simple_role_mode_check.js',
  'web/src/panels/shared/CopilotPanel.jsx',
  'web/src/components/copilot/ChatMessageBubble.jsx',
  'tools/check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1',
  'tools/check_m46_6_d4_simple_role_mode_repo_contract.ps1',
  'tools/pack_m46_6_d4_simple_role_mode.ps1',
  'tools/apply_overlay_m46_6_c2_d4_simple_role_mode.ps1',
  'docs/RUNBOOK_M46_6_D4_SIMPLE_ROLE_MODE.md'
)

foreach($rel in $files){
  $src = Join-Path $OverlayRoot $rel
  $dst = Join-Path $RepoRoot $rel
  $dir = Split-Path -Parent $dst
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "OK copied $rel"
}

Write-Host 'DONE M46.6-C2+D4 simple role mode overlay applied.'
