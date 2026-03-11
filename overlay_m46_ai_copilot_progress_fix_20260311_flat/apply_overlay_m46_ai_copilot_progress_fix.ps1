param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'

function Copy-FileRel([string]$RelPath) {
  $src = Join-Path $PSScriptRoot $RelPath
  $dst = Join-Path $RepoRoot $RelPath
  $dstDir = Split-Path $dst -Parent
  if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }
  Copy-Item -Force $src $dst
  Write-Host "OK copied $dst"
}

Copy-FileRel 'backend/src/ai/tools.js'
Write-Host 'DONE M46 AI copilot ShiftProgress schema fix applied.'
