param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeFile = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'infra\docker-compose.yml'),
  [string]$ApiService = 'api',
  [switch]$ScaffoldOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ''
  Write-StatusLine '=== M51-M53 BACKFILL VERIFICATION (SCAFFOLD/FILES ONLY) ==='
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m51_53_backfill_verification_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M51-M53 BACKFILL FILES READY ==='
  exit 0
}

Write-Host ''
Write-StatusLine '=== M51-M53 BACKFILL VERIFICATION PACK ==='
if (-not (Test-Path $ComposeFile)) { throw "compose file not found: $ComposeFile" }

Write-Host ''
Write-StatusLine '=== M51-M53 Runtime Check ==='
$dockerArgs = @(
  'compose', '-f', $ComposeFile,
  'exec', '-T', $ApiService,
  'sh', '-lc',
  'cd /app/backend && node scripts/m51_53_backfill_verification_check.js'
)
$code = Invoke-ExternalColor -FilePath 'docker' -ArgumentList $dockerArgs
if ($code -ne 0) { throw "Docker command failed: docker $($dockerArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M51-M53 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m51_53_backfill_verification_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-StatusLine '=== M51-M53 BACKFILL VERIFICATION PACK PASS OK ==='
