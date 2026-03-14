param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK ==='

& (Join-Path $RepoRoot 'tools/pack_m46_6_d4_simple_role_mode.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'm46.6-d4 pack failed' }

$dc = 'docker'
$compose = Join-Path $RepoRoot 'infra/docker-compose.yml'

Write-Host ''
Write-StatusLine '=== M46.7 Prisma Sync ==='
$syncArgs = @(
  'compose', '-f', $compose, 'exec', '-T', 'api',
  'sh', '-lc', 'cd /app/backend && npx prisma db push && npx prisma generate'
)
$syncCode = Invoke-ExternalColor -FilePath $dc -ArgumentList $syncArgs
if ($syncCode -ne 0) { throw "Docker compose command failed: $dc $($syncArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M46.7 Runtime Check ==='
$dcArgs = @(
  'compose', '-f', $compose, 'exec', '-T', 'api',
  'sh', '-lc', 'cd /app/backend && node scripts/m46_7_driver_code_login_rehber_first_check.js'
)
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M46.7 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m46_7_driver_code_login_rehber_first_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-StatusLine '=== M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK PASS OK ==='

