param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ScaffoldOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ''
  Write-StatusLine '=== M49 MOBILE BETA HARDENING PACK (SCAFFOLD/FILES ONLY) ==='
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m49_mobile_beta_hardening_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M49 MOBILE BETA HARDENING FILES READY ==='
  exit 0
}

Write-Host ''
Write-StatusLine '=== M49 MOBILE BETA HARDENING PACK ==='


Write-Host ''
Write-StatusLine '=== M49 Runtime Check ==='
$docker = 'docker'
$dockerArgs = @(
  'run', '--rm',
  '-v', "${RepoRoot}:/repo",
  '-w', '/repo/mobile',
  'node:20-alpine',
  'sh', '-lc',
  'node scripts/m49_mobile_beta_hardening_check.js'
)
$code = Invoke-ExternalColor -FilePath $docker -ArgumentList $dockerArgs
if ($code -ne 0) { throw "Docker command failed: $docker $($dockerArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M49 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m49_mobile_beta_hardening_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-StatusLine '=== M49 MOBILE BETA HARDENING PACK PASS OK ==='
