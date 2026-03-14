param(
  [Parameter(Mandatory=$false)]
  [string]$RepoRoot = "D:\servis-platform"
)

$ErrorActionPreference = "Stop"
$overlayRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$files = @(
  "backend\prisma\seed.js",
  "backend\scripts\_harness.js",
  "backend\scripts\m0check.js",
  "backend\scripts\m1check.js",
  "backend\scripts\m3check.js",
  "backend\scripts\m5check.js",
  "backend\scripts\m9check.js",
  "backend\scripts\smoke.js"
)

foreach ($rel in $files) {
  $src = Join-Path $overlayRoot $rel
  $dst = Join-Path $RepoRoot $rel
  if (-not (Test-Path $src)) { throw "Missing overlay file: $src" }
  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item -Force $src $dst
  Write-Host "OK copied $rel"
}

Write-Host "DONE M47.4-R seed reset + driver login fix overlay applied."
