param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
function Copy-OverlayFile([string]$RelativePath) {
  $src = Join-Path $PSScriptRoot $RelativePath
  $dst = Join-Path $RepoRoot $RelativePath
  $dir = Split-Path $dst -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item $src $dst -Force
  Write-Host "OK copied $RelativePath"
}
$files = @(
  'web/index.html',
  'web/src/App.jsx',
  'web/src/layout/NavDock.jsx',
  'web/src/panels/public/AcceptInvitePanel.jsx',
  'web/src/panels/shared/AuthInvitesPanel.jsx',
  'web/public/vardis-favicon.svg'
)
foreach ($f in $files) { Copy-OverlayFile $f }
Write-Host 'DONE Vardis brand wave 2 overlay applied.'
