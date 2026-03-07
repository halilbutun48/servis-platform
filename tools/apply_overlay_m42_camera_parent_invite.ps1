$ErrorActionPreference = "Stop"

function Resolve-PayloadRoot {
  param([string]$RepoRoot, [string]$ScriptRoot)
  $candidates = @(
    (Join-Path $RepoRoot "overlay_m42_camera_parent_invite_payload"),
    (Join-Path $ScriptRoot "overlay_m42_camera_parent_invite_payload"),
    (Join-Path (Split-Path $ScriptRoot -Parent) "overlay_m42_camera_parent_invite_payload"),
    (Join-Path $RepoRoot "tools\overlay_m42_camera_parent_invite_payload")
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return (Resolve-Path $c).Path }
  }
  $found = Get-ChildItem -Path $RepoRoot -Directory -Recurse -Filter "overlay_m42_camera_parent_invite_payload" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }
  throw "overlay payload not found"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path
$payloadRoot = Resolve-PayloadRoot -RepoRoot $repoRoot -ScriptRoot $PSScriptRoot
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $repoRoot ("tools\_backup\m42_camera_parent_invite_" + $ts)
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$files = Get-ChildItem -Path $payloadRoot -File -Recurse
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($f in $files) {
  $rel = $f.FullName.Substring($payloadRoot.Length).TrimStart('\','/')
  $target = Join-Path $repoRoot $rel
  $targetDir = Split-Path $target -Parent
  if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }

  $backupTarget = Join-Path $backupRoot $rel
  $backupDir = Split-Path $backupTarget -Parent
  if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Force -Path $backupDir | Out-Null }
  if (Test-Path $target) { Copy-Item $target $backupTarget -Force }

  $raw = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  [System.IO.File]::WriteAllText($target, $raw, $utf8NoBom)
  Write-Host "UPDATED $rel" -ForegroundColor Green
}

Write-Host "`nBackup: $backupRoot" -ForegroundColor Yellow
Write-Host "Overlay applied: M42 Camera QR + SCHOOL Parent Invite" -ForegroundColor Green
