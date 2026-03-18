param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ScaffoldOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

if ($ScaffoldOnly) {
  Write-Host ''
  Write-StatusLine '=== M47.4 MOBILE READINESS WEB PASS PACK (SCAFFOLD/FILES ONLY) ==='
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m47_4_mobile_readiness_web_pass_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M47.4 MOBILE READINESS WEB PASS FILES READY ==='
  exit 0
}

Write-Host ''
Write-StatusLine '=== M47.4 MOBILE READINESS WEB PASS PACK ==='


Write-Host ''
Write-StatusLine '=== M47.4 Runtime Check ==='
$docker = 'docker'
$dockerArgs = @(
  'run', '--rm',
  '-v', "${RepoRoot}:/repo",
  '--mount', 'type=volume,target=/repo/web/node_modules',
  '-e', 'npm_config_cache=/tmp/npm-cache',
  '-w', '/repo/web',
  'node:20-alpine',
  'sh', '-lc',
  'rm -rf node_modules package-lock.cache /tmp/npm-cache/* 2>/dev/null || true; npm ci --no-audit --no-fund && npm run build && node scripts/m47_4_mobile_readiness_web_pass_check.js'
)
$code = Invoke-ExternalColor -FilePath $docker -ArgumentList $dockerArgs
if ($code -ne 0) { throw "Docker command failed: $docker $($dockerArgs -join ' ')" }

Write-Host ''
Write-StatusLine '=== M47.4 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m47_4_mobile_readiness_web_pass_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }

Write-Host ''
Write-StatusLine '=== M47.4 MOBILE READINESS WEB PASS PACK PASS OK ==='
