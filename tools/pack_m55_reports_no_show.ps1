param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeFile = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'infra\docker-compose.yml'),
  [string]$ApiService = 'api',
  [switch]$ScaffoldOnly
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')
Set-Location $RepoRoot

Invoke-ComposeNodePackWithScaffold `
  -RepoRoot $RepoRoot `
  -ScaffoldOnly $ScaffoldOnly.IsPresent `
  -ScaffoldTitle 'M55 REPORTS + NO_SHOW (SCAFFOLD/FILES ONLY)' `
  -FilesReadyTitle 'M55 REPORTS + NO_SHOW FILES READY' `
  -PackTitle 'M55 REPORTS + NO_SHOW PACK' `
  -RuntimeTitle 'M55 Runtime Check' `
  -RepoContractTitle 'M55 Repo Contract' `
  -SuccessTitle 'M55 REPORTS + NO_SHOW' `
  -NodeScript 'backend/scripts/m55_reports_no_show_check.js' `
  -RepoContractScript 'tools/check_m55_reports_no_show_repo_contract.ps1' `
  -ComposeFile $ComposeFile `
  -ApiService $ApiService
