param(
  [Parameter(Mandatory=$false)][ValidateRange(59,66)][int]$To = 66,
  [Parameter(Mandatory=$false)][string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [Parameter(Mandatory=$false)]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_phase_common.ps1')

Set-Location $RepoRoot
Write-Host ''
Write-StatusLine ("=== SUBPACK: M59 -> M{0} ===" -f $To)
Write-StatusLine 'INFO Canonical manifest-driven M59-M66 phase.'
Write-Host ''

$manifestPath = Join-Path $RepoRoot 'tools\milestone_pack_manifest.json'
$resolvedComposeDir = [string](Normalize-ComposeDirValue -Value $ComposeDir)
Invoke-PhaseManifestRange -RepoRoot $RepoRoot -ComposeDir $resolvedComposeDir -ManifestPath $manifestPath -FromExclusive 58 -ToInclusive $To -NoBuild:$NoBuild
