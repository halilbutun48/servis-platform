param(
  [Parameter(Mandatory=$false)][ValidateRange(0,199)][int]$To = 89,
  [Parameter(Mandatory=$false)][string]$RepoRoot = '',
  [Parameter(Mandatory=$false)][string]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild,
  [Parameter(Mandatory=$false)][switch]$SkipStaticRepoChecks,
  [Parameter(Mandatory=$false)][switch]$SkipRepoAudit
)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '_repo_hygiene_preflight.ps1')
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..')).Path
}

$master = Join-Path $ScriptRoot 'pack.ps1'
& $master -To $To -RepoDir $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild -SkipStaticRepoChecks:$SkipStaticRepoChecks -SkipRepoAudit:$SkipRepoAudit

