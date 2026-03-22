param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

$files = @(
  'web/index.html',
  'web/src/App.jsx',
  'web/src/layout/NavDock.jsx',
  'web/src/panels/public/AcceptInvitePanel.jsx',
  'web/src/panels/shared/AuthInvitesPanel.jsx'
)

foreach ($rel in $files) {
  $src = Join-Path $PSScriptRoot $rel
  $dst = Join-Path $RepoRoot $rel
  $dir = Split-Path -Parent $dst
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item $src $dst -Force
  Write-Host "OK copied $rel"
}

Write-Host 'DONE Vardis brand wave 1 overlay applied.'
