param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ScaffoldOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ''
  Write-StatusLine '=== M47 KVKK NOTICE / CONSENT FRAMEWORK PACK (SCAFFOLD/FILES ONLY) ==='
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m47_kvkk_notice_consent_framework_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M47 KVKK NOTICE / CONSENT FRAMEWORK FILES READY ==='
  exit 0
}

Write-Host ''
Write-StatusLine '=== M47 KVKK NOTICE / CONSENT FRAMEWORK PACK ==='

& (Join-Path $RepoRoot 'tools/pack_m46_9_session_refresh_security.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'm46.9 pack failed' }

$dc = 'docker'
$compose = Join-Path $RepoRoot 'infra/docker-compose.yml'

Write-Host ''
Write-StatusLine '=== M47 Runtime Check ==='
$dcArgs = @(
  'compose', '-f', $compose, 'exec', '-T', 'api',
  'sh', '-lc', 'cd /app/backend && node scripts/m47_kvkk_notice_consent_framework_check.js'
)
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M47 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m47_kvkk_notice_consent_framework_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-StatusLine '=== M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK ==='
