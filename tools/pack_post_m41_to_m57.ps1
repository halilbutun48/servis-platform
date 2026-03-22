# Repo-contract compatibility markers
# M57 MOBILE HARDENING
# pack_m57_mobile_hardening.ps1
# This legacy wrapper still represents the full M57 pack entrypoint while forwarding to the canonical subpack.

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
Write-StatusLine '=== LEGACY WRAPPER (pack_post_m41_to_m57.ps1) ==='
Write-StatusLine 'INFO Forwarding to canonical subpack tools\_packs\pack_m42_m58.ps1 with -To 57.'
Write-Host ''

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\_packs\pack_m42_m58.ps1') -To 57 -RepoRoot $RepoRoot -ComposeDir $ComposeDir @($(if ($NoBuild) { '-NoBuild' }))
if (-not $?) { throw 'legacy wrapper failed' }
