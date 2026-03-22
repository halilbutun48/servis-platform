param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function Copy-IntoRepo([string]$RelPath) {
  $src = Join-Path $PSScriptRoot $RelPath
  $dst = Join-Path $RepoRoot $RelPath
  $dstDir = Split-Path -Parent $dst
  if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item $src $dst -Force
  Write-Host "OK copied $RelPath"
}

@(
  'backend/scripts/_static_milestone_check.js',
  'backend/scripts/m63_trust_quality_service_evaluation_check.js',
  'backend/scripts/m64_natural_copilot_layer_check.js',
  'tools/check_m64_natural_copilot_layer_repo_contract.ps1'
) | ForEach-Object { Copy-IntoRepo $_ }

Write-Host 'DONE pack refactor wave 4 (M63/M64 helper consolidation) overlay applied.'
