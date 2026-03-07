param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-PayloadRoot {
  $candidates = @(
    (Join-Path (Get-Location) 'repo_audit_fix_payload'),
    (Join-Path (Get-Location) 'overlay_repo_audit_fix_2026-03-07\repo_audit_fix_payload'),
    (Join-Path $PSScriptRoot '..\repo_audit_fix_payload'),
    (Join-Path $PSScriptRoot '..\overlay_repo_audit_fix_2026-03-07\repo_audit_fix_payload')
  )
  foreach ($c in $candidates) {
    try {
      $full = [System.IO.Path]::GetFullPath($c)
      if (Test-Path $full) { return $full }
    } catch {}
  }
  $found = Get-ChildItem -Path (Get-Location) -Directory -Recurse -Filter repo_audit_fix_payload -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }
  throw 'overlay payload not found: repo_audit_fix_payload'
}

$payloadRoot = Find-PayloadRoot
$repoRoot = (Get-Location).Path
$backupRoot = Join-Path $repoRoot ('tools\_backup\repo_audit_fix_' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$files = @(
  'backend\prisma\schema.prisma',
  'backend\src\gps\status.js',
  'backend\scripts\m4check.js',
  'backend\scripts\fullcheck.js',
  'OVERLAY_REPO_AUDIT_FIX_2026-03-07.md'
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($rel in $files) {
  $src = Join-Path $payloadRoot $rel
  $dst = Join-Path $repoRoot $rel
  if (!(Test-Path $src)) { throw "payload file missing: $src" }
  if (Test-Path $dst) {
    $bak = Join-Path $backupRoot $rel
    $bakDir = Split-Path $bak -Parent
    New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
    Copy-Item $dst $bak -Force
  }
  $content = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)
  $dstDir = Split-Path $dst -Parent
  if ($dstDir) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }
  [System.IO.File]::WriteAllText($dst, $content, $utf8NoBom)
  Write-Host "UPDATED $rel" -ForegroundColor Green
}

Write-Host ''
Write-Host "Backup: $backupRoot" -ForegroundColor Yellow
Write-Host 'Overlay applied: Repo audit fix (ParentInvite schema + GPS threshold sync)' -ForegroundColor Cyan
