param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

function MustExist([string]$Rel) {
  $p = Join-Path $RepoRoot $Rel
  if (!(Test-Path $p)) { throw "Missing required file: $Rel" }
  Write-Host "OK $Rel exists"
}

function MustNotExist([string]$Rel) {
  $p = Join-Path $RepoRoot $Rel
  if (Test-Path $p) { throw "Expected deleted file still exists: $Rel" }
  Write-Host "OK $Rel removed"
}

function MustContain([string]$Rel, [string]$Needle) {
  $p = Join-Path $RepoRoot $Rel
  $text = Get-Content -Raw -LiteralPath $p -Encoding UTF8
  if ($text -notmatch [regex]::Escape($Needle)) { throw "Expected text not found in $Rel -> $Needle" }
  Write-Host "OK $Rel contains $Needle"
}

Write-Host ""
Write-Host "=== REPO CLEANUP PHASE 1 REPO CONTRACT ==="

MustExist '.gitignore'
MustExist 'backend\scripts\repo_deep_audit.js'
MustExist 'tools\pack_repo_cleanup_phase1.ps1'
MustExist 'docs\RUNBOOK_REPO_CLEANUP_PHASE1.md'

MustNotExist 'backend\_dmmf_shift_offer.cjs'
MustNotExist 'backend\_shift_offer_fields.cjs'
MustNotExist 'web\src\socket.js'
MustNotExist 'web\src\panels\room\LiveProgressPanel.jsx'

MustContain '.gitignore' 'web/dist/'
MustContain '.gitignore' 'artifacts/'

Write-Host ""
Write-Host "REPO CLEANUP PHASE 1 REPO CONTRACT PASS"
