param(
  [string]$RepoRoot = 'D:\servis-platform'
)
$ErrorActionPreference = 'Stop'

function Copy-OverlayFile([string]$RelativePath) {
  $source = Join-Path $PSScriptRoot $RelativePath
  $target = Join-Path $RepoRoot $RelativePath
  $targetDir = Split-Path -Parent $target
  if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }
  Copy-Item -Path $source -Destination $target -Force
  Write-Host "OK copied $RelativePath"
}

@(
  'mobile\App.js',
  'mobile\package.json',
  'mobile\src\lib\api.js',
  'mobile\src\lib\gps.js',
  'mobile\src\screens\TodayScreen.js',
  'mobile\scripts\m57_1_foreground_gps_publish_check.js',
  'tools\pack_m57_mobile_hardening.ps1',
  'tools\check_m57_mobile_hardening_repo_contract.ps1',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md',
  'docs\RUNBOOK_M57_MOBILE_HARDENING.md',
  'docs\MILESTONE_M57_MOBILE_HARDENING.md',
  'docs\NEXT_BACKLOG_V1.md',
  'docs\PRIMER_SSOT.md',
  'docs\STARTPACK_V1.md'
) | ForEach-Object { Copy-OverlayFile $_ }

Write-Host 'DONE M57.1 foreground GPS publish overlay applied.'
