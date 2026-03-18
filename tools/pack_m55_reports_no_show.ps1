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
  Write-StatusLine '=== M55 REPORTS + NO_SHOW (SCAFFOLD/FILES ONLY) ==='
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m55_reports_no_show_repo_contract.ps1') -RepoRoot $RepoRoot
  if (-not $?) { throw 'repo contract check failed' }
  Write-Host ''
  Write-StatusLine '=== M55 REPORTS + NO_SHOW FILES READY ==='
  exit 0
}
Write-Host ''
Write-StatusLine '=== M55 REPORTS + NO_SHOW PACK ==='
Write-Host ''
Write-StatusLine '=== M55 Runtime Check ==='
$dockerArgs = @('compose','-f',$ComposeFile,'exec','-T',$ApiService,'sh','-lc','cd /app/backend && node scripts/m55_reports_no_show_check.js')
$code = Invoke-ExternalColor -FilePath 'docker' -ArgumentList $dockerArgs
if ($code -ne 0) { throw 'runtime check failed' }
Write-Host ''
Write-StatusLine '=== M55 Repo Contract ==='
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools/check_m55_reports_no_show_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'repo contract check failed' }
Write-Host ''
Write-StatusLine '=== M55 REPORTS + NO_SHOW PACK PASS OK ==='
