param(
  [string]$Phase = 'all',
  [switch]$Continue
)
$ErrorActionPreference = 'Stop'
$ToolsRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& (Join-Path $ToolsRoot 'check-repo.ps1') -Phase $Phase -Continue:$Continue
