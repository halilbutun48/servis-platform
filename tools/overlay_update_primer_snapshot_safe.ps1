# tools/overlay_update_primer_snapshot_safe.ps1
# Safe overlay applier: copies bundled primer payload files to canonical targets (UTF-8 no BOM)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$payload = Join-Path $PSScriptRoot "_overlay_payload\primer_refresh"
if (!(Test-Path $payload)) { throw "Missing payload folder: $payload" }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root ("tools\_backup\primer_refresh_" + $timestamp)
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$map = @(
  @{ Src = (Join-Path $payload "PRIMER_SNAPSHOT.md");         Dst = (Join-Path $root "tools\PRIMER_SNAPSHOT.md") },
  @{ Src = (Join-Path $payload "PRIMER_SSOT.md");             Dst = (Join-Path $root "docs\PRIMER_SSOT.md") },
  @{ Src = (Join-Path $payload "STARTPACK_V1.md");            Dst = (Join-Path $root "docs\STARTPACK_V1.md") },
  @{ Src = (Join-Path $payload "PRIMER SNAPSHOT (Yeni).md");  Dst = (Join-Path $root "tools\PRIMER SNAPSHOT (Yeni).md") }
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($item in $map) {
  if (!(Test-Path $item.Src)) { throw "Missing source file: $($item.Src)" }

  $dstDir = Split-Path -Parent $item.Dst
  if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }

  if (Test-Path $item.Dst) {
    $leaf = Split-Path -Leaf $item.Dst
    Copy-Item $item.Dst (Join-Path $backupDir $leaf) -Force
  }

  $raw = [System.IO.File]::ReadAllText($item.Src, [System.Text.Encoding]::UTF8)
  [System.IO.File]::WriteAllText($item.Dst, $raw, $utf8NoBom)
  Write-Host ("✅ Updated: {0}" -f $item.Dst) -ForegroundColor Green
}

Write-Host ("✅ Backup: {0}" -f $backupDir) -ForegroundColor Yellow
Write-Host "Primer refresh overlay applied." -ForegroundColor Cyan
