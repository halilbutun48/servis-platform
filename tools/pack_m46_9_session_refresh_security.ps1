param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ScaffoldOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ''
  Write-StatusLine '=== M46.9 SESSION & REFRESH SECURITY PACK (SCAFFOLD/FILES ONLY) ==='
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m46_9_session_refresh_security_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M46.9 SESSION & REFRESH SECURITY FILES READY ==='
  exit 0
}

Write-Host ''
Write-StatusLine '=== M46.9 SESSION & REFRESH SECURITY PACK ==='

& (Join-Path $RepoRoot 'tools/pack_m46_8_driver_access_hardening.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'm46.8 pack failed' }

$dc = 'docker'
$compose = Join-Path $RepoRoot 'infra/docker-compose.yml'

Write-Host ''
Write-StatusLine '=== M46.9 Prisma Sync ==='
$syncArgs = @(
  'compose', '-f', $compose, 'exec', '-T', 'api',
  'sh', '-lc', 'cd /app/backend && npx prisma db push && npx prisma generate'
)
$syncCode = Invoke-ExternalColor -FilePath $dc -ArgumentList $syncArgs
if ($syncCode -ne 0) { throw "Docker compose command failed: $dc $($syncArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M46.9 Runtime Check ==='
$dcArgs = @(
  'compose', '-f', $compose, 'exec', '-T', 'api',
  'sh', '-lc', 'cd /app/backend && node scripts/m46_9_session_refresh_security_check.js'
)
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M46.9 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m46_9_session_refresh_security_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-StatusLine '=== M46.9 SESSION & REFRESH SECURITY PACK PASS OK ==='
