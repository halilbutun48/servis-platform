param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $RepoRoot 'tools/_console_status.ps1')

Write-StatusLine '=== M48.5 ROOM / COMPANY TABLET READINESS PACK ==='

& (Join-Path $RepoRoot 'tools/pack_m48_driver_mobile_foundation.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'm48 prerequisite pack failed' }

Write-StatusLine '=== M48.5 Runtime Check ==='
$dc = 'docker'
$cmd = @(
  'run','--rm',
  '-v', "${RepoRoot}:/repo",
  '-w', '/repo/web',
  'node:20-alpine',
  'sh','-lc',
  'node scripts/m48_5_room_company_tablet_readiness_check.js'
)
& $dc @cmd
if (-not $?) { throw 'm48.5 runtime/static check failed' }

Write-StatusLine '=== M48.5 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m48_5_room_company_tablet_readiness_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'm48.5 repo contract check failed' }

Write-StatusLine '=== M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK ==='
