param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host "=== MENU READINESS CLEANUP HOTFIX CHECK ==="
Push-Location $RepoRoot
try {
  $script = Join-Path $RepoRoot 'backend\scripts\menu_readiness_cleanup_check.mjs'
  if (Test-Path $script) {
    node $script
    if ($LASTEXITCODE -ne 0) { throw "menu_readiness_cleanup_check failed" }
  } else {
    $nav = Get-Content (Join-Path $RepoRoot 'web\src\layout\NavDock.jsx') -Raw
    $super = Get-Content (Join-Path $RepoRoot 'web\src\panels\superadmin\SuperAdminPanel.jsx') -Raw
    foreach ($needle in @('Sistem Standartları','Ticari Akış','Güven ve Kalite','Yardımcı')) {
      if ($nav -notmatch [regex]::Escape($needle) -and $super -notmatch [regex]::Escape($needle)) { throw "missing readiness label: $needle" }
      Write-Host "OK readiness label $needle"
    }
  }
  Write-Host "=== MENU READINESS CLEANUP HOTFIX CHECK PASS ==="
} finally {
  Pop-Location
}
