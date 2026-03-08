param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
}
function Backup-File([string]$src, [string]$backupRoot, [string]$repoRoot) {
  if (!(Test-Path $src)) { return }
  $rel = $src.Substring($repoRoot.Length).TrimStart('\','/')
  $dest = Join-Path $backupRoot $rel
  Ensure-Dir (Split-Path -Parent $dest)
  Copy-Item $src $dest -Force
}

$repoRootResolved = (Resolve-Path $RepoRoot).Path
$payloadRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\payload")).Path
$backupRoot = Join-Path $repoRootResolved ("tools\_backup\organization_plans_ui_polish_" + (Get-Date -Format "yyyyMMdd-HHmmss"))
Ensure-Dir $backupRoot

Get-ChildItem -Path $payloadRoot -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($payloadRoot.Length).TrimStart('\','/')
  $dest = Join-Path $repoRootResolved $rel
  Ensure-Dir (Split-Path -Parent $dest)
  Backup-File $dest $backupRoot $repoRootResolved
  Copy-Item $_.FullName $dest -Force
  Write-Host "UPDATED $rel"
}

Write-Host ("Backup: " + $backupRoot)
Write-Host "Organization plans UI polish applied"
