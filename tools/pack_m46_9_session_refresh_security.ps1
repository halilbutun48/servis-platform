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
  -ScaffoldTitle 'M46.9 SESSION & REFRESH SECURITY PACK (SCAFFOLD/FILES ONLY)' `
  -FilesReadyTitle 'M46.9 SESSION & REFRESH SECURITY FILES READY' `
  -PackTitle 'M46.9 SESSION & REFRESH SECURITY PACK' `
  -PreRuntimeTitle 'M46.9 Prisma Sync' `
  -PreRuntimeShell 'npx prisma db push && npx prisma generate' `
  -RuntimeTitle 'M46.9 Runtime Check' `
  -RepoContractTitle 'M46.9 Repo Contract' `
  -SuccessTitle 'M46.9 SESSION & REFRESH SECURITY' `
  -NodeScript 'backend/scripts/m46_9_session_refresh_security_check.js' `
  -RepoContractScript 'tools/check_m46_9_session_refresh_security_repo_contract.ps1' `
  -ComposeFile $ComposeFile `
  -ApiService $ApiService
