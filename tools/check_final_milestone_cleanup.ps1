param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = "Stop"
Write-Host "=== FINAL MILESTONE CLEANUP CHECK ==="
Push-Location $RepoRoot
try {
  $ssotPath = Join-Path $RepoRoot 'web\src\panels\superadmin\SsotAlignmentPanel.jsx'
  $trustPath = Join-Path $RepoRoot 'web\src\panels\superadmin\TrustQualityPanel.jsx'
  $ssot = Get-Content $ssotPath -Raw
  $trust = Get-Content $trustPath -Raw
  if ($ssot -notmatch 'Sistem Standartları') { throw 'ssot title not cleaned' }
  if ($ssot -match 'M61|M59-M65') { throw 'ssot milestone text still visible' }
  if ($trust -notmatch 'Güven ve Kalite') { throw 'trust title not cleaned' }
  if ($trust -match 'M63') { throw 'trust milestone text still visible' }
  Write-Host 'PASS final_milestone_cleanup'
  Write-Host '=== FINAL MILESTONE CLEANUP CHECK PASS ===' 
} finally {
  Pop-Location
}
