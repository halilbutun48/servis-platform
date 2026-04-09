param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"
$removed = @()

$bak = Join-Path $RepoRoot 'backend\data\*.bak'
$distTargets = @(
  (Join-Path $RepoRoot 'mobile\dist'),
  (Join-Path $RepoRoot 'web\dist')
)
$transientExact = @(
  (Join-Path $RepoRoot 'apply_overlay.ps1'),
  (Join-Path $RepoRoot '_m81_ssot_wireup.ps1'),
  (Join-Path $RepoRoot 'pack_living_final.log'),
  (Join-Path $RepoRoot 'pack_living_latest.log')
)
$transientGlobs = @(
  (Join-Path $RepoRoot 'README_M*_OVERLAY*.txt')
)

Get-ChildItem $bak -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
  $removed += $_.Name
}

foreach ($dist in $distTargets) {
  if (Test-Path $dist) {
    Remove-Item $dist -Recurse -Force -ErrorAction SilentlyContinue
    $removed += ($dist.Substring($RepoRoot.Length + 1) -replace '/', '\')
  }
}

foreach ($p in $transientExact) {
  if (Test-Path $p) {
    Remove-Item $p -Force -ErrorAction SilentlyContinue
    $removed += (Split-Path $p -Leaf)
  }
}

foreach ($glob in $transientGlobs) {
  Get-ChildItem $glob -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    $removed += $_.Name
  }
}

if ($removed.Count -gt 0) {
  Write-Host ("INFO repo hygiene preflight removed: " + (($removed | Sort-Object -Unique) -join ', '))
} else {
  Write-Host "INFO repo hygiene preflight found nothing to clean"
}
