param(
  [Parameter(Mandatory=$false)][string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'checks\living\check_static_repo.ps1') -RepoRoot $RepoRoot
Push-Location $RepoRoot
try {
  node .\backend\scripts\run_m0_m66.js --static-only --to M66 --continue
  if ($LASTEXITCODE -ne 0) { throw 'run_m0_m66 static-only failed' }
}
finally { Pop-Location }

& (Join-Path $PSScriptRoot 'checks\living\check_m67_m75_static.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot 'checks\living\check_living_matrix.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot 'checks\living\check_m76_m81_static.ps1') -RepoRoot $RepoRoot
Write-Host 'LIVING STATIC VERIFY PASS'
