param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = @(
  'web/src/layout/AppShell.jsx',
  'web/src/panels/room/DriversPanel.jsx',
  'web/src/panels/company/WorkflowPanel.jsx',
  'web/src/panels/company/CommercialFlowPanel.jsx',
  'web/src/panels/room/CommercialFlowPanel.jsx'
)
foreach ($rel in $files) {
  $from = Join-Path $src $rel
  $to = Join-Path $RepoRoot $rel
  $dir = Split-Path -Parent $to
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item $from $to -Force
  Write-Host "OK copied $rel"
}
Write-Host 'DONE Vardis brand wave 3 overlay applied.'
