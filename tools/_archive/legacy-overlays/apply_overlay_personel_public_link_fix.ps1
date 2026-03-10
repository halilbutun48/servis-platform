param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

function Copy-FileSafe {
  param(
    [string]$Source,
    [string]$Destination
  )
  $destDir = Split-Path -Parent $Destination
  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
  Write-Host "OK copied $Destination"
}

$OverlayRoot = Split-Path -Parent $PSScriptRoot

Copy-FileSafe -Source (Join-Path $OverlayRoot 'web/src/panels/company/PassengerLinksPanel.jsx') -Destination (Join-Path $RepoRoot 'web/src/panels/company/PassengerLinksPanel.jsx')
Copy-FileSafe -Source (Join-Path $OverlayRoot 'docs/overlays/OVERLAY_NOTES_M103_PERSONEL_PUBLIC_LINK_FIX_2026-03-10.md') -Destination (Join-Path $RepoRoot 'docs/overlays/OVERLAY_NOTES_M103_PERSONEL_PUBLIC_LINK_FIX_2026-03-10.md')

Write-Host 'DONE overlay applied.'
