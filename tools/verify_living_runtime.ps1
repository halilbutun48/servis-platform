param(
  [Parameter(Mandatory=$false)][ValidateRange(67,199)][int]$To = 79,
  [Parameter(Mandatory=$false)][string]$RepoRoot = '',
  [Parameter(Mandatory=$false)][string]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)
$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..')).Path
}

& (Join-Path $ScriptRoot 'pack_living.ps1') -To $To -RepoRoot $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild
