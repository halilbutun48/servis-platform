param(
  [Parameter(Mandatory=$false)][ValidateRange(67,199)][int]$To = 89,
  [Parameter(Mandatory=$false)][string]$RepoRoot = '',
  [Parameter(Mandatory=$false)][string]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)
$ErrorActionPreference = 'Stop'
$ToolsRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& (Join-Path $ToolsRoot 'verify_living_runtime.ps1') -To $To -RepoRoot $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild
