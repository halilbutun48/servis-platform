param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'

function Copy-IntoRepo {
  param([string]$RelativePath)
  $src = Join-Path $PSScriptRoot $RelativePath
  $dst = Join-Path $RepoRoot $RelativePath
  $dir = Split-Path $dst -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -Force $src $dst
  Write-Host "OK copied $RelativePath"
}

$files = @(
  'README.md',
  'tools/PRIMER_SNAPSHOT.md',
  'docs/PRIMER_SSOT.md',
  'docs/CHECKLIST_SSOT.md',
  'tools/CHECKLIST_SSOT.md',
  'docs/STARTPACK_V1.md',
  'tools/README.md'
)

foreach ($f in $files) { Copy-IntoRepo -RelativePath $f }
Write-Host 'DONE SSOT snapshot sync overlay applied.'
