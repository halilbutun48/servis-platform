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
  -ScaffoldTitle 'M56 KVKK MATRIX + ETA QUALITY (SCAFFOLD/FILES ONLY)' `
  -FilesReadyTitle 'M56 KVKK MATRIX + ETA QUALITY FILES READY' `
  -PackTitle 'M56 KVKK MATRIX + ETA QUALITY PACK' `
  -RuntimeTitle 'M56 Runtime Check' `
  -RepoContractTitle 'M56 Repo Contract' `
  -SuccessTitle 'M56 KVKK MATRIX + ETA QUALITY' `
  -NodeScript 'backend/scripts/m56_kvkk_eta_quality_check.js' `
  -RepoContractScript 'tools/check_m56_kvkk_eta_quality_repo_contract.ps1' `
  -ComposeFile $ComposeFile `
  -ApiService $ApiService
