param(
  [Parameter(Mandatory=$false)][ValidateRange(76,81)][int]$To = 79,
  [Parameter(Mandatory=$false)][string]$RepoRoot = '',
  [Parameter(Mandatory=$false)]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..')).Path
}
. (Join-Path $ScriptRoot '_pack_phase_common.ps1')

Set-Location $RepoRoot
Write-Host ''
Write-StatusLine ("=== SUBPACK: M76 -> M{0} ===" -f $To)
Write-StatusLine 'INFO Canonical manifest-driven M76+ living forward phase (normalization -> compliance -> checklist/operations verification).'
Write-Host ''

$manifestPath = Join-Path $RepoRoot 'tools\milestone_pack_manifest.json'
$resolvedComposeDir = [string](Normalize-ComposeDirValue -Value $ComposeDir)
Invoke-PhaseManifestRange -RepoRoot $RepoRoot -ComposeDir $resolvedComposeDir -ManifestPath $manifestPath -FromExclusive 75 -ToInclusive $To -NoBuild:$NoBuild
