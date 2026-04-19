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
$rootTools = Split-Path -Parent $PSScriptRoot
& (Join-Path $rootTools 'pack_living.ps1') -To $To -RepoRoot $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild -SkipStaticRepoChecks:$SkipStaticRepoChecks -SkipRepoAudit:$SkipRepoAudit
