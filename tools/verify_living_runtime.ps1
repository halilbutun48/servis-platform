param(
  [Parameter(Mandatory=$false)][ValidateRange(67,199)][int]$To = 76,
  [Parameter(Mandatory=$false)][string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [Parameter(Mandatory=$false)][string]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'pack_living.ps1') -To $To -RepoRoot $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild
