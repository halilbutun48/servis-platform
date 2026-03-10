param([string]$RepoRoot)
if(-not $RepoRoot){ throw 'RepoRoot gerekli' }
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$overlayRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
$payloadRoot = Join-Path $overlayRoot 'payload'
if(!(Test-Path $payloadRoot)){ throw "overlay payload not found: $payloadRoot" }
$backup = Join-Path $RepoRoot ('tools\_backup\organization_market_direct_live_fix_v2_' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Get-ChildItem -Path $payloadRoot -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($payloadRoot.Length).TrimStart([char]'\',[char]'/')
  $dest = Join-Path $RepoRoot $rel
  $destDir = Split-Path -Parent $dest
  if(!(Test-Path $destDir)){ New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  if(Test-Path $dest){
    $b = Join-Path $backup $rel
    $bDir = Split-Path -Parent $b
    if(!(Test-Path $bDir)){ New-Item -ItemType Directory -Force -Path $bDir | Out-Null }
    Copy-Item $dest $b -Force
  }
  Copy-Item $_.FullName $dest -Force
  Write-Host ('UPDATED ' + $rel)
}
Write-Host ('Backup: ' + $backup)
Write-Host 'Organization market/direct/live overlay v2 applied'
