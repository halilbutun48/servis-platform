param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $PSCommandPath
$Root = Split-Path -Parent $ScriptDir
$Payload = Join-Path $Root 'payload'
if (!(Test-Path $Payload)) { throw "overlay payload not found: $Payload" }
$Backup = Join-Path $RepoRoot ("tools\_backup\organization_seed_router_fix_" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $Backup | Out-Null
Get-ChildItem -Path $Payload -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($Payload.Length).TrimStart([char]'\',[char]'/')
  $dest = Join-Path $RepoRoot $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  if (Test-Path $dest) {
    $b = Join-Path $Backup $rel
    $bDir = Split-Path -Parent $b
    if (!(Test-Path $bDir)) { New-Item -ItemType Directory -Force -Path $bDir | Out-Null }
    Copy-Item $dest $b -Force
  }
  Copy-Item $_.FullName $dest -Force
  Write-Host "UPDATED $rel"
}
Write-Host "Backup: $Backup" -ForegroundColor Yellow
Write-Host "Organization seed/router fix applied" -ForegroundColor Green
