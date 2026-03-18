param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeDir = 'infra',
  [switch]$NoBuild,
  [switch]$SkipM57Scaffold
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== LEGACY RUNNER NAME (pack_post_m41_to_m54_4.ps1) ==='
Write-StatusLine 'INFO This wrapper now forwards to tools\pack_post_m41_to_m57.ps1 for M55/M56 sync and M57 scaffold coverage.'
Write-Host ''

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\pack_post_m41_to_m57.ps1') `
  -RepoRoot $RepoRoot `
  -ComposeDir $ComposeDir `
  @($(if ($NoBuild) { '-NoBuild' })) `
  @($(if ($SkipM57Scaffold) { '-SkipM57Scaffold' }))

if (-not $?) { throw 'forwarded post-M41 runner failed' }
