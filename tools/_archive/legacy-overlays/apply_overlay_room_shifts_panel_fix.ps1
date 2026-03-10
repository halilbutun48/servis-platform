param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $RepoRoot)) {
  throw "RepoRoot not found: $RepoRoot"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$overlayRoot = Split-Path -Parent $scriptDir
$payloadRoot = Join-Path $overlayRoot 'web'

$backup = Join-Path $RepoRoot ("tools\_backup\room_shifts_panel_fix_" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null

Get-ChildItem -Path $payloadRoot -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($payloadRoot.Length).TrimStart('\','/')
  $dest = Join-Path (Join-Path $RepoRoot 'web') $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  if (Test-Path $dest) {
    $b = Join-Path $backup $rel
    $bDir = Split-Path -Parent $b
    if (!(Test-Path $bDir)) {
      New-Item -ItemType Directory -Force -Path $bDir | Out-Null
    }
    Copy-Item $dest $b -Force
  }
  Copy-Item $_.FullName $dest -Force
  Write-Host "UPDATED web\\$rel"
}

Write-Host "Backup: $backup"
Write-Host "RoomShiftsPanel fix applied"
