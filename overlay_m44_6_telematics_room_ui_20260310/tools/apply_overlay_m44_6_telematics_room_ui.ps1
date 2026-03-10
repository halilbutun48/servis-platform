param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

function Get-RepoRelativePath {
  param([string]$AbsolutePath)
  if ($AbsolutePath.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $AbsolutePath.Substring($RepoRoot.Length).TrimStart([char[]]@('\','/'))
  }
  return $AbsolutePath
}

function Copy-FileWithBackup {
  param(
    [string]$Source,
    [string]$Target,
    [string]$BackupRoot
  )

  $targetDir = Split-Path -Parent $Target
  if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  if (Test-Path $Target) {
    $rel = Get-RepoRelativePath -AbsolutePath $Target
    $backupPath = Join-Path $BackupRoot $rel
    $backupDir = Split-Path -Parent $backupPath
    if (!(Test-Path $backupDir)) {
      New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    }
    Copy-Item $Target $backupPath -Force
  }

  Copy-Item $Source $Target -Force
  Write-Host "OK copied $(Get-RepoRelativePath -AbsolutePath $Target)"
}

$OverlayRoot = Split-Path -Parent $PSScriptRoot
$PayloadRoot = Join-Path $OverlayRoot 'payload'
$BackupRoot = Join-Path $RepoRoot 'tools\_backup\overlay_m44_6_telematics_room_ui_20260310'
if (!(Test-Path $BackupRoot)) {
  New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
}

$files = @(
  'web\src\panels\room\VehiclesPanel.jsx',
  'docs\UI_SPEC_V1.md',
  'docs\overlays\OVERLAY_NOTES_M44_6_TELEMATICS_ROOM_UI_2026-03-10.md'
)

foreach ($rel in $files) {
  $src = Join-Path $PayloadRoot $rel
  $dst = Join-Path $RepoRoot $rel
  if (!(Test-Path $src)) {
    throw "Missing payload file: $rel"
  }
  Copy-FileWithBackup -Source $src -Target $dst -BackupRoot $BackupRoot
}

Write-Host 'DONE M44.6 telematics ROOM UI applied.'
