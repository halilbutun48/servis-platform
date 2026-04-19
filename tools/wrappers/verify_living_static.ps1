param(
  [Parameter(Mandatory=$false)][string]$RepoRoot = ''
)
$ErrorActionPreference = 'Stop'
$rootTools = Split-Path -Parent $PSScriptRoot
& (Join-Path $rootTools 'verify_living_static.ps1') -RepoRoot $RepoRoot
