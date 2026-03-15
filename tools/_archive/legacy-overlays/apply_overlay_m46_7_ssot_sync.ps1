param(
  [Parameter(Mandatory = $true)][string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$OverlayRoot = Split-Path -Parent $PSScriptRoot
$files = @(
  'tools/PRIMER_SNAPSHOT.md',
  'docs/PRIMER_SSOT.md',
  'docs/CHECKLIST_SSOT.md',
  'tools/CHECKLIST_SSOT.md',
  'docs/STARTPACK_V1.md',
  'tools/README.md',
  'tools/apply_overlay_m46_7_ssot_sync.ps1'
)

foreach($rel in $files){
  $src = Join-Path $OverlayRoot $rel
  $dst = Join-Path $RepoRoot $rel
  $dir = Split-Path -Parent $dst
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "OK copied $rel"
}

Write-Host 'DONE M46.7 SSOT sync overlay applied.'
