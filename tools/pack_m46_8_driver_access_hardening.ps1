param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeFile = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'infra\docker-compose.yml'),
  [string]$ApiService = 'api',
  [switch]$ScaffoldOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')
Set-Location $RepoRoot

Invoke-ComposeNodePackWithScaffoldAndPreShell `
  -RepoRoot $RepoRoot `
  -ScaffoldOnly $ScaffoldOnly.IsPresent `
  -ScaffoldTitle 'M46.8 DRIVER ACCESS HARDENING PACK (SCAFFOLD/FILES ONLY)' `
  -FilesReadyTitle 'M46.8 DRIVER ACCESS HARDENING FILES READY' `
  -PackTitle 'M46.8 DRIVER ACCESS HARDENING PACK' `
  -PreRuntimeTitle 'M46.8 Prisma Sync' `
  -PreRuntimeShell 'npx prisma db push && npx prisma generate' `
  -RuntimeTitle 'M46.8 Runtime Check' `
  -RepoContractTitle 'M46.8 Repo Contract' `
  -SuccessTitle 'M46.8 DRIVER ACCESS HARDENING' `
  -NodeScript 'backend/scripts/m46_8_driver_access_hardening_check.js' `
  -RepoContractScript 'tools/check_m46_8_driver_access_hardening_repo_contract.ps1' `
  -ComposeFile $ComposeFile `
  -ApiService $ApiService
