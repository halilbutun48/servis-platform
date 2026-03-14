param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'

$files = @(
  'backend/prisma/seed.js',
  'backend/scripts/_harness.js',
  'backend/scripts/m0check.js',
  'backend/scripts/m1check.js',
  'backend/scripts/m3check.js',
  'backend/scripts/m5check.js',
  'backend/scripts/m9check.js',
  'backend/scripts/smoke.js'
)

foreach ($rel in $files) {
  $src = Join-Path $PSScriptRoot $rel
  $dst = Join-Path $RepoRoot $rel
  $dir = Split-Path $dst -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item $src $dst -Force
  Write-Host "OK copied $rel"
}

Write-Host 'DONE M47.4-R deviceId reuse fix overlay applied.'
