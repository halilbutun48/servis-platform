param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeDir = 'infra',
  [switch]$NoBuild,
  [switch]$SkipM57Scaffold,
  [switch]$SkipM58
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== POST-M41 EXTERNAL PACK RUNNER WRAPPER (legacy -> M58) ==='
Write-StatusLine 'INFO Legacy command forwards to tools\pack_post_m41_to_m58.ps1.'
Write-Host ''

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\pack_post_m41_to_m58.ps1') `
  -RepoRoot $RepoRoot `
  -ComposeDir $ComposeDir `
  @($(if ($NoBuild) { '-NoBuild' })) `
  @($(if ($SkipM57Scaffold) { '-SkipM57Scaffold' })) `
  @($(if ($SkipM58) { '-SkipM58' }))

if (-not $?) { throw 'legacy wrapper failed' }
