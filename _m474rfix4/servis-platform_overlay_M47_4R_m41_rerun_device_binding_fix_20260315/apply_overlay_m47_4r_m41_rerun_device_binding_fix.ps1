param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

function Copy-IntoRepo {
  param([string]$RelativePath)
  $src = Join-Path $PSScriptRoot $RelativePath
  $dst = Join-Path $RepoRoot $RelativePath
  $dstDir = Split-Path -Parent $dst
  if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item $src $dst -Force
  Write-Host "OK copied $RelativePath"
}

Copy-IntoRepo 'backend/scripts/m41check.js'
Write-Host 'DONE M47.4-R M41 rerun device binding fix overlay applied.'
