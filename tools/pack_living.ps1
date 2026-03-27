param(
  [Parameter(Mandatory=$false)][ValidateRange(0,199)][int]$To = 75,
  [Parameter(Mandatory=$false)][string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [Parameter(Mandatory=$false)][string]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild,
  [Parameter(Mandatory=$false)][switch]$SkipStaticRepoChecks,
  [Parameter(Mandatory=$false)][switch]$SkipRepoAudit
)
$ErrorActionPreference = 'Stop'
$master = Join-Path $PSScriptRoot 'pack.ps1'
& $master -To $To -RepoDir $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild -SkipStaticRepoChecks:$SkipStaticRepoChecks -SkipRepoAudit:$SkipRepoAudit
