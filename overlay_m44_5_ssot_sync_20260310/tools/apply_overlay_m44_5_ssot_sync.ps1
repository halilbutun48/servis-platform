
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Copy-FileWithBackup {
  param(
    [string]$Source,
    [string]$Destination
  )

  $destDir = Split-Path -Parent $Destination
  Ensure-Dir -Path $destDir

  if (Test-Path -LiteralPath $Destination) {
    $backupRoot = Join-Path $RepoRoot 'tools\_backup\overlay_m44_5_ssot_sync_20260310'
    $relative = $Destination.Substring($RepoRoot.Length).TrimStart('\\','/')
    $backupPath = Join-Path $backupRoot $relative
    $backupDir = Split-Path -Parent $backupPath
    Ensure-Dir -Path $backupDir
    Copy-Item -LiteralPath $Destination -Destination $backupPath -Force
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Force
  Write-Host "OK copied $relativePath" -ForegroundColor Green
}

$overlayRoot = Split-Path -Parent $PSScriptRoot
$payloadRoot = Join-Path $overlayRoot 'payload'

if (-not (Test-Path -LiteralPath $RepoRoot)) {
  throw "RepoRoot not found: $RepoRoot"
}
if (-not (Test-Path -LiteralPath $payloadRoot)) {
  throw "Payload root not found: $payloadRoot"
}

$files = @(
  'tools\PRIMER_SNAPSHOT.md',
  'docs\PRIMER_SSOT.md',
  'docs\PRIMER_SNAPSHOT_2026-03-10_FINAL.md',
  'docs\CHECKLIST_SSOT.md',
  'tools\CHECKLIST_SSOT.md',
  'docs\STARTPACK_V1.md',
  'tools\README.md',
  'docs\overlays\OVERLAY_NOTES_M44_5_SSOT_SYNC_2026-03-10.md'
)

foreach ($rel in $files) {
  $src = Join-Path $payloadRoot $rel
  $dst = Join-Path $RepoRoot $rel
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing payload file: $src"
  }

  $destDir = Split-Path -Parent $dst
  Ensure-Dir -Path $destDir

  if (Test-Path -LiteralPath $dst) {
    $backupRoot = Join-Path $RepoRoot 'tools\_backup\overlay_m44_5_ssot_sync_20260310'
    $backupPath = Join-Path $backupRoot $rel
    $backupDir = Split-Path -Parent $backupPath
    Ensure-Dir -Path $backupDir
    Copy-Item -LiteralPath $dst -Destination $backupPath -Force
  }

  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "OK copied $rel" -ForegroundColor Green
}

Write-Host 'DONE M44.5 SSOT sync applied.' -ForegroundColor Cyan
