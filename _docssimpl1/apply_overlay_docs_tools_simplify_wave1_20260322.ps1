param([string]$RepoRoot = 'D:\servis-platform')
$ErrorActionPreference = 'Stop'
function Copy-One([string]$srcRel,[string]$dstRel){
  $src = Join-Path $PSScriptRoot $srcRel
  $dst = Join-Path $RepoRoot $dstRel
  $parent = Split-Path -Parent $dst
  if (!(Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "OK copied $dstRel"
}
Copy-One 'docs/RUNBOOK_DOCS_SSOT_PACK.md' 'docs\RUNBOOK_DOCS_SSOT_PACK.md'
Copy-One 'docs/RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md' 'docs\RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md'
Write-Host 'DONE docs/tools simplify wave 1 overlay applied.'
