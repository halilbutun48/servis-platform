param(
  [string]$RepoRoot = "D:\servis-platform"
)

$src = Split-Path -Parent $PSScriptRoot
Copy-Item -Path (Join-Path $src 'backend\src\routes\shifts\shared.js') -Destination (Join-Path $RepoRoot 'backend\src\routes\shifts\shared.js') -Force
Copy-Item -Path (Join-Path $src 'web\src\panels\company\ShiftsPanel.jsx') -Destination (Join-Path $RepoRoot 'web\src\panels\company\ShiftsPanel.jsx') -Force
Write-Host 'M96 overlay applied.' -ForegroundColor Green
