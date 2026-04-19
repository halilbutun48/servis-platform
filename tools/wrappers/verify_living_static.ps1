param(
  [Parameter(Mandatory=$false)][string]$RepoRoot = ''
)
$ErrorActionPreference = 'Stop'
$ToolsRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& (Join-Path $ToolsRoot 'verify_living_static.ps1') -RepoRoot $RepoRoot
