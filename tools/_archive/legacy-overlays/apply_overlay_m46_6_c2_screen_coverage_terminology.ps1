param(
  [Parameter(Mandatory = $true)][string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$OverlayRoot = Split-Path -Parent $PSScriptRoot
$files = @(
  'backend/src/ai/jobGuide/glossary.js',
  'backend/src/ai/jobGuide/screenCatalog.js',
  'backend/src/ai/chat/helpComposer.js',
  'backend/src/ai/chat/intentRouter.js',
  'backend/scripts/m46_6_c2_screen_coverage_terminology_check.js',
  'tools/check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1',
  'tools/pack_m46_6_c2_screen_coverage_terminology.ps1',
  'tools/apply_overlay_m46_6_c2_screen_coverage_terminology.ps1',
  'docs/RUNBOOK_M46_6_C2_SCREEN_COVERAGE_TERMINOLOGY.md'
)

foreach($rel in $files){
  $src = Join-Path $OverlayRoot $rel
  $dst = Join-Path $RepoRoot $rel
  $dir = Split-Path -Parent $dst
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "OK copied $rel"
}

Write-Host 'DONE M46.6-C2 screen coverage + terminology overlay applied.'
