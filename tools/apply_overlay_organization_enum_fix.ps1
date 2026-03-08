param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath
$payloadRoot = Join-Path (Split-Path -Parent $scriptDir) 'payload'
if (!(Test-Path $payloadRoot)) { throw "overlay payload not found: $payloadRoot" }
$backup = Join-Path $RepoRoot ("tools\_backup\organization_enum_fix_" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Get-ChildItem -Path $payloadRoot -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($payloadRoot.Length).TrimStart([char]'\',[char]'/')
  $dest = Join-Path $RepoRoot $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  if (Test-Path $dest) {
    $bak = Join-Path $backup $rel
    $bakDir = Split-Path -Parent $bak
    if (!(Test-Path $bakDir)) { New-Item -ItemType Directory -Force -Path $bakDir | Out-Null }
    Copy-Item $dest $bak -Force
  }
  Copy-Item $_.FullName $dest -Force
  Write-Host "UPDATED $rel"
}
Write-Host "Backup: $backup" -ForegroundColor Yellow
Write-Host "Organization enum fix applied" -ForegroundColor Green
