param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$overlayRoot = Split-Path -Parent $PSScriptRoot

$files = @(
  'docs/PRIMER_SSOT.md',
  'docs/PRIMER_SNAPSHOT_2026-03-10_FINAL.md',
  'docs/CHECKLIST_SSOT.md',
  'docs/STARTPACK_V1.md',
  'tools/CHECKLIST_SSOT.md',
  'docs/overlays/OVERLAY_NOTES_M106_5_M43_SSOT_SYNC_2026-03-10.md'
)

foreach ($rel in $files) {
  $src = Join-Path $overlayRoot $rel
  $dst = Join-Path $RepoRoot $rel
  $dstDir = Split-Path -Parent $dst
  if (!(Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
  }
  Copy-Item $src $dst -Force
  Write-Host "OK copied $dst"
}

Write-Host 'DONE M106.5 M43 SSOT sync overlay applied.'
