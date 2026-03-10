param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$OutZip = ''
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

if ([string]::IsNullOrWhiteSpace($OutZip)) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $OutZip = Join-Path $RepoRoot "artifacts/overlays/overlay_bundle_$stamp.zip"
}

$stage = Join-Path $env:TEMP ("overlay_bundle_stage_" + [guid]::NewGuid().ToString('N'))
Ensure-Dir $stage
Ensure-Dir (Split-Path -Parent $OutZip)

$includePaths = @(
  'docs/overlays',
  'tools/apply_overlay_m96_company_list_click_details.ps1',
  'tools/apply_overlay_organization_enum_fix.ps1',
  'tools/apply_overlay_organization_market_direct_live_fix.ps1',
  'tools/apply_overlay_organization_market_direct_live_fix_v2.ps1',
  'tools/apply_overlay_organization_market_first_fix.ps1',
  'tools/apply_overlay_organization_seed_router_fix.ps1',
  'tools/apply_overlay_room_shifts_panel_fix.ps1',
  'tools/build_overlay_bundle.ps1'
)

foreach ($rel in $includePaths) {
  $src = Join-Path $RepoRoot $rel
  if (-not (Test-Path $src)) { continue }
  $dst = Join-Path $stage $rel
  Ensure-Dir (Split-Path -Parent $dst)
  if (Test-Path $src -PathType Container) {
    Copy-Item $src $dst -Recurse -Force
  } else {
    Copy-Item $src $dst -Force
  }
}

if (Test-Path $OutZip) {
  Remove-Item $OutZip -Force
}
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $OutZip -Force
Remove-Item $stage -Recurse -Force
Write-Host "Overlay bundle created: $OutZip"
