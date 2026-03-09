
param([string]$RepoRoot)
if(-not $RepoRoot){ throw 'RepoRoot gerekli' }
$payloadRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$payloadRoot = Join-Path $payloadRoot '..'
$payloadRoot = (Resolve-Path $payloadRoot).Path
$backup = Join-Path $RepoRoot ('tools\_backup\organization_market_direct_live_fix_' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Get-ChildItem -Path $payloadRoot -Recurse -File | Where-Object { $_.FullName -notmatch '\tools\' } | ForEach-Object {
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
Write-Host 'Organization market/direct/live overlay applied'
