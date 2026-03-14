param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

function Copy-OverlayFile {
  param([string]$RelativePath)
  $src = Join-Path $PSScriptRoot $RelativePath
  $dst = Join-Path $RepoRoot $RelativePath
  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path $src)) { throw "Missing overlay file: $RelativePath" }
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }
  Copy-Item -Force $src $dst
  Write-Host "OK copied $RelativePath"
}

$files = @(
  'backend/scripts/_harness.js',
  'backend/scripts/m0check.js',
  'backend/scripts/m1check.js',
  'backend/scripts/m3check.js',
  'backend/scripts/m5check.js',
  'backend/scripts/m9check.js',
  'backend/scripts/smoke.js'
)

foreach ($f in $files) { Copy-OverlayFile -RelativePath $f }
Write-Host 'DONE M47.4-R clean rerun / repro fix overlay applied.'
