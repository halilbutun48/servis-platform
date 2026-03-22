param(
  [Parameter(Mandatory=$false)][ValidateRange(0,41)][int]$To = 41,
  [Parameter(Mandatory=$false)][string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [Parameter(Mandatory=$false)]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_phase_common.ps1')

Set-Location $RepoRoot
Write-Host ''
Write-StatusLine ("=== SUBPACK: M0 -> M{0} ===" -f $To)
Write-StatusLine 'INFO Canonical M0-M41 gate runner.'
Write-Host ''

$resolvedComposeDir = [string](Normalize-ComposeDirValue -Value $ComposeDir)
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\gate.ps1') -To $To -ComposeDir $resolvedComposeDir -RepoDir $RepoRoot -ApiService $ApiService @($(if ($NoBuild) { '-NoBuild' }))
if (-not $?) { throw 'M0-M41 gate runner failed' }
