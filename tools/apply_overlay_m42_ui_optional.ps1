$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$payloadRoot = Join-Path $repoRoot 'overlay_m42_ui_optional_payload'
if (!(Test-Path $payloadRoot)) { throw "overlay payload not found: $payloadRoot" }

$files = @(
  'backend/src/routes/me.js',
  'web/src/App.jsx',
  'web/src/layout/NavDock.jsx',
  'web/src/live/ws.js',
  'web/src/panels/shared/FeatureFlagNotice.jsx',
  'web/src/panels/company/CheckinPanel.jsx',
  'web/src/panels/room/CheckinPanel.jsx',
  'web/src/panels/driver/CheckinPanel.jsx',
  'docs/OPTIONAL_CHECKIN_QR_NFC.md'
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $repoRoot ("tools/_backup/m42_ui_optional_" + $stamp)
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($rel in $files) {
  $src = Join-Path $payloadRoot $rel
  if (!(Test-Path $src)) { throw "payload file missing: $rel" }

  $dst = Join-Path $repoRoot $rel
  $dstDir = Split-Path -Parent $dst
  if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }

  $bak = Join-Path $backupRoot $rel
  $bakDir = Split-Path -Parent $bak
  if (!(Test-Path $bakDir)) { New-Item -ItemType Directory -Force -Path $bakDir | Out-Null }

  if (Test-Path $dst) {
    [System.IO.File]::WriteAllText($bak, [System.IO.File]::ReadAllText($dst, [System.Text.Encoding]::UTF8), $utf8NoBom)
  }

  [System.IO.File]::WriteAllText($dst, [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8), $utf8NoBom)
  Write-Host "Updated: $rel" -ForegroundColor Green
}

Write-Host "`n✅ M42 UI optional overlay applied." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Yellow
