param(
  [Parameter(Mandatory=$false)][ValidateRange(82,82)][int]$To = 82,
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
Write-StatusLine ("=== SUBPACK: M82 -> M{0} ===" -f $To)
Write-StatusLine 'INFO Canonical manifest-aligned M82.1 backend correctness kilidi phase.'
Write-Host ''

if ($To -ge 82) {
  & (Join-Path $RepoRoot 'tools\pack_m82_1_backend_correctness.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'm82.1 pack failed' }
}
