param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"
$removed = @()

$bak = Join-Path $RepoRoot 'backend\data\*.bak'
$dist = Join-Path $RepoRoot 'mobile\dist'
$transient = @(
  (Join-Path $RepoRoot 'apply_overlay.ps1'),
  (Join-Path $RepoRoot '_m81_ssot_wireup.ps1')
)

Get-ChildItem $bak -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
  $removed += $_.Name
}

if (Test-Path $dist) {
  Remove-Item $dist -Recurse -Force -ErrorAction SilentlyContinue
  $removed += 'mobile/dist'
}

foreach ($p in $transient) {
  if (Test-Path $p) {
    Remove-Item $p -Force -ErrorAction SilentlyContinue
    $removed += (Split-Path $p -Leaf)
  }
}

if ($removed.Count -gt 0) {
  Write-Host ("INFO repo hygiene preflight removed: " + ($removed -join ', '))
} else {
  Write-Host "INFO repo hygiene preflight found nothing to clean"
}
