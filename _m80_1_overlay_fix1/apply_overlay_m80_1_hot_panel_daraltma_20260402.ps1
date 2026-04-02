param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$OverlayRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" }

$files = @(
  'README.md',
  'docs\\PRIMER_SSOT.md',
  'docs\\STARTPACK_V1.md',
  'docs\\NEXT_BACKLOG_V1.md',
  'docs\\MILESTONE_REGISTRY_V1.md',
  'docs\\CHECKLIST_SSOT.md',
  'docs\\MILESTONE_M80_1_HOT_PANEL_DARALTMA.md',
  'docs\\RUNBOOK_M80_1_HOT_PANEL_DARALTMA.md',
  'tools\\CHECKLIST_SSOT.md',
  'tools\\README.md',
  'tools\\PRIMER_SNAPSHOT.md',
  'tools\\repo_contract_state.json',
  'tools\\milestone_pack_manifest.json',
  'tools\\pack_m80_1_hot_panel_daraltma.ps1',
  'tools\\check_m80_1_hot_panel_daraltma_repo_contract.ps1',
  'backend\\scripts\\m80_1_hot_panel_daraltma_check.js',
  'web\\src\\panels\\company\\GeoReviewPanel.jsx',
  'web\\src\\panels\\company\\MapPanel.jsx',
  'web\\src\\panels\\company\\ShiftsPanel.jsx'
)

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupRoot = Join-Path $RepoRoot ("_overlay_backup_m80_1_hot_panel_daraltma_" + $stamp)
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Write-Host ''
Write-Host '=== APPLY OVERLAY M80.1 HOT PANEL DARALTMA ==='
Write-Host "INFO RepoRoot   : $RepoRoot"
Write-Host "INFO OverlayRoot: $OverlayRoot"
Write-Host "INFO BackupRoot : $backupRoot"

foreach ($rel in $files) {
  $src = Join-Path $OverlayRoot $rel
  $dst = Join-Path $RepoRoot $rel
  if (-not (Test-Path $src)) { throw "Overlay source missing: $rel" }

  $dstDir = Split-Path -Parent $dst
  if ($dstDir -and -not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  }

  if (Test-Path $dst) {
    $bak = Join-Path $backupRoot $rel
    $bakDir = Split-Path -Parent $bak
    if ($bakDir -and -not (Test-Path $bakDir)) {
      New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
    }
    Copy-Item $dst $bak -Force
  }

  Copy-Item $src $dst -Force
  Write-Host "OK applied $rel"
}

Write-Host ''
Write-Host 'DONE overlay applied.'
Write-Host 'NEXT run:'
Write-Host '.\tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform'
Write-Host '.\tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform'
Write-Host '.\tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform'
