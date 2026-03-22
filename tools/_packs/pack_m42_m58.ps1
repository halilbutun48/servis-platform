param(
  [Parameter(Mandatory=$false)][ValidateRange(42,58)][int]$To = 58,
  [Parameter(Mandatory=$false)][string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [Parameter(Mandatory=$false)]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_phase_common.ps1')

Set-Location $RepoRoot
Write-Host ''
Write-StatusLine ("=== SUBPACK: M42 -> M{0} ===" -f $To)
Write-StatusLine 'INFO Canonical manifest-driven M42-M58 phase.'
Write-Host ''

$manifestPath = Join-Path $RepoRoot 'tools\milestone_pack_manifest.json'
$resolvedComposeDir = [string](Normalize-ComposeDirValue -Value $ComposeDir)

# M42 OPTIONAL is the only stage in this range that needs ComposeDir/RepoDir wiring.
# Run it directly to avoid manifest argument-binding drift.
if ($To -ge 42) {
  Write-Host ''
  Write-StatusLine '=== RUNNING: M42 OPTIONAL ==='
  & (Join-Path $RepoRoot 'tools\pack_m42_optional.ps1') -RepoDir $RepoRoot -ComposeDir $resolvedComposeDir -ApiService $ApiService -NoBuild:$NoBuild
  if (-not $?) { throw 'Tool script failed: tools\pack_m42_optional.ps1' }
}

if ($To -ge 43) {
  Invoke-PhaseManifestRange -RepoRoot $RepoRoot -ComposeDir $resolvedComposeDir -ManifestPath $manifestPath -FromExclusive 42 -ToInclusive $To -NoBuild:$NoBuild
}
