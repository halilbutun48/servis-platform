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
Write-StatusLine '=== LEGACY WRAPPER (pack_post_m41_to_m54_4.ps1) ==='
Write-StatusLine 'INFO Forwarding to canonical subpack tools\_packs\pack_m42_m58.ps1 with -To 54.'
Write-Host ''

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\_packs\pack_m42_m58.ps1') -To 54 -RepoRoot $RepoRoot -ComposeDir $ComposeDir @($(if ($NoBuild) { '-NoBuild' }))
if (-not $?) { throw 'legacy wrapper failed' }
